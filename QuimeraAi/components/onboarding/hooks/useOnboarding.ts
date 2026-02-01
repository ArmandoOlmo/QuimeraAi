/**
 * useOnboarding Hook
 * Manages onboarding state, persistence, and AI generation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useEditor } from '../../../contexts/EditorContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { generateComponentColorMappings } from '../../ui/GlobalStylesControl';
import { getDefaultGlobalColors } from '../../../data/colorPalettes';
import { logApiCall } from '../../../services/apiLoggingService';
import {
    OnboardingProgress,
    OnboardingWizardStep,
    OnboardingService,
    OnboardingContactInfo,
    OnboardingStoreSetup,
    EcommerceType,
    TemplateRecommendation,
    GenerationProgress,
    ImageGenerationItem,
    getIndustryComponentDefaults,
    ONBOARDING_STEPS,
} from '../../../types/onboarding';
import { PageSection, Project, SitePage } from '../../../types';
import { generateAiAssistantConfig, GlobalColors } from '../../../utils/chatbotConfigGenerator';
import { generatePagesFromLegacyProject } from '../../../utils/legacyMigration';

// Alias for backward compatibility
type OnboardingStep = OnboardingWizardStep;

// Development mode check for conditional logging
const isDev = import.meta.env.DEV;

/**
 * Helper to log onboarding AI API calls
 */
const logOnboardingApiCall = (
    userId: string | undefined,
    model: string,
    feature: string,
    success: boolean,
    errorMessage?: string
) => {
    if (userId) {
        logApiCall({
            userId,
            model,
            feature: `onboarding-${feature}`,
            success,
            errorMessage
        });
    }
};

// Helper to clean JSON from markdown code blocks and fix common issues
const cleanJsonResponse = (text: string): string => {
    if (!text) return '{}';

    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
    // Trim whitespace
    cleaned = cleaned.trim();

    // Find JSON array or object
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    // Fix common JSON issues from LLM
    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    // Fix bad escape sequences - replace \n, \t etc with spaces
    cleaned = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '$1');
    // Remove literal newlines inside strings (replace with space)
    cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
    // Remove any control characters except tab, newline, carriage return
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    return cleaned;
};

// Geocode address using Nominatim (OpenStreetMap - free, no API key needed)
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address || address.trim() === '') return null;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'QuimeraAI/1.0'
                }
            }
        );
        const results = await response.json();

        if (results && results.length > 0) {
            const { lat, lon } = results[0];
            if (isDev) console.log('📍 Geocoded address:', address, '→', lat, lon);
            return { lat: parseFloat(lat), lng: parseFloat(lon) };
        }

        if (isDev) console.warn('📍 Could not geocode address:', address);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Safe JSON parse with fallback
const safeJsonParse = (text: string, fallback: any = {}): any => {
    if (!text || text.trim() === '') return fallback;

    // First attempt with cleaned text
    try {
        const cleaned = cleanJsonResponse(text);
        return JSON.parse(cleaned);
    } catch (e1) {
        console.warn('JSON parse attempt 1 failed:', e1);
    }

    // Second attempt: more aggressive cleaning
    try {
        let cleaned = text
            .replace(/```json\s*/gi, '') // Remove json code block start
            .replace(/```\s*/g, '') // Remove code block end markers
            .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove ALL control chars
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .replace(/\r/g, ' ') // Replace carriage returns
            .replace(/\t/g, ' ') // Replace tabs
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim();

        const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
        if (jsonMatch) {
            let jsonStr = jsonMatch[0]
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/\\([^"\\\/bfnrtu])/g, '$1'); // Fix bad escapes
            return JSON.parse(jsonStr);
        }
    } catch (e2) {
        console.warn('JSON parse attempt 2 failed:', e2);
    }

    // Third attempt: try to manually extract array items for services
    try {
        if (text.includes('"name"') && text.includes('"description"')) {
            const items: any[] = [];
            const nameMatches = text.matchAll(/"name"\s*:\s*"([^"]+)"/g);
            const descMatches = text.matchAll(/"description"\s*:\s*"([^"]+)"/g);
            const names = Array.from(nameMatches).map(m => m[1]);
            const descs = Array.from(descMatches).map(m => m[1]);

            for (let i = 0; i < names.length; i++) {
                items.push({
                    name: names[i],
                    description: descs[i] || ''
                });
            }

            if (items.length > 0) {
                if (isDev) console.log('Extracted items manually:', items);
                return items;
            }
        }
    } catch (e3) {
        console.warn('Manual extraction failed:', e3);
    }

    return fallback;
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialProgress = (language: string): OnboardingProgress => ({
    step: ONBOARDING_STEPS.WEBSITE_ANALYZER,
    businessName: '',
    industry: '',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    language,
});

// =============================================================================
// HOOK
// =============================================================================

export const useOnboarding = () => {
    const { t, i18n } = useTranslation();
    const {
        user,
        projects,
        getPrompt,
        addNewProject,
        loadProject,
        generateImage,
    } = useEditor();

    // Get setIsOnboardingOpen from UIContext (same context that OnboardingModal uses)
    const { setIsOnboardingOpen } = useUI();

    // State
    const [progress, setProgress] = useState<OnboardingProgress | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ecommerce state
    const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Templates from Firestore (loaded from EditorContext projects with status 'Template')
    const templates = projects.filter((p: Project) => p.status === 'Template');

    // Ref to track if we've loaded progress
    const hasLoadedProgress = useRef(false);

    // Ref to prevent duplicate generation (declared here so resetOnboarding can access it)
    const isGeneratingRef = useRef(false);

    // =============================================================================
    // PERSISTENCE
    // =============================================================================

    const getProgressDocRef = useCallback(() => {
        if (!user) return null;
        return doc(db, 'users', user.uid, 'onboardingProgress', 'current');
    }, [user]);

    const loadProgress = useCallback(async () => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        try {
            setIsLoading(true);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as OnboardingProgress;
                setProgress(data);
            }
        } catch (err) {
            console.error('Failed to load onboarding progress:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getProgressDocRef]);

    const saveProgress = useCallback(async (newProgress?: OnboardingProgress) => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        const dataToSave = newProgress || progress;
        if (!dataToSave) return;

        try {
            setIsSaving(true);

            // Remove undefined values (Firestore doesn't allow them)
            const cleanData = JSON.parse(JSON.stringify({
                ...dataToSave,
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            }));

            await setDoc(docRef, cleanData);
            if (!newProgress) {
                setProgress(cleanData);
            }
        } catch (err) {
            console.error('Failed to save onboarding progress:', err);
            setError(t('onboarding.errorSaving'));
        } finally {
            setIsSaving(false);
        }
    }, [getProgressDocRef, progress, t]);

    const clearProgress = useCallback(async () => {
        const docRef = getProgressDocRef();
        if (!docRef) return;

        try {
            await deleteDoc(docRef);
            setProgress(null);
        } catch (err) {
            console.error('Failed to clear onboarding progress:', err);
        }
    }, [getProgressDocRef]);

    // Load progress on mount
    useEffect(() => {
        if (user && !hasLoadedProgress.current) {
            hasLoadedProgress.current = true;
            loadProgress();
        }
    }, [user, loadProgress]);

    // Sync progress.language with current i18n.language when system language changes
    // This ensures AI-generated content uses the current UI language
    useEffect(() => {
        if (progress && progress.language !== i18n.language) {
            const updatedProgress = { ...progress, language: i18n.language };
            setProgress(updatedProgress);
            // Don't auto-save here to avoid unnecessary writes
            // Language will be saved when user navigates steps
        }
    }, [i18n.language, progress?.language]);

    // =============================================================================
    // MODAL CONTROL
    // =============================================================================

    const openOnboarding = useCallback(() => {
        if (!progress) {
            setProgress(createInitialProgress(i18n.language));
        }
    }, [progress, i18n.language]);

    const resetOnboarding = useCallback(async () => {
        // Reset the generation lock to allow new generation after cancel
        isGeneratingRef.current = false;
        await clearProgress();
        setProgress(createInitialProgress(i18n.language));
    }, [clearProgress, i18n.language]);

    // =============================================================================
    // NAVIGATION
    // =============================================================================

    const goToStep = useCallback((step: OnboardingStep) => {
        if (!progress) return;
        const newProgress = { ...progress, step };
        setProgress(newProgress);
        saveProgress(newProgress);
    }, [progress, saveProgress]);

    // Determine max step based on whether ecommerce is enabled
    const getMaxStep = useCallback(() => {
        return progress?.hasEcommerce ? 7 : 6;
    }, [progress?.hasEcommerce]);

    const nextStep = useCallback(() => {
        if (!progress) return;
        const maxStep = getMaxStep();
        if (progress.step >= maxStep) return;

        let nextStepNum = progress.step + 1;

        // Skip step 6 (Store Setup) if ecommerce is not enabled
        // When hasEcommerce is false, step 5 goes directly to step 6 (which shows Generation)
        // When hasEcommerce is true, step 5 goes to step 6 (Store Setup), then to step 7 (Generation)

        goToStep(nextStepNum as OnboardingStep);
    }, [progress, goToStep, getMaxStep]);

    const previousStep = useCallback(() => {
        if (!progress || progress.step <= 0) return;

        let prevStepNum = progress.step - 1;

        goToStep(prevStepNum as OnboardingStep);
    }, [progress, goToStep]);

    const canGoNext = useCallback(() => {
        if (!progress) return false;
        const maxStep = getMaxStep();
        const generationStep = maxStep; // 6 or 7

        switch (progress.step) {
            case 0:
                return true; // Can always skip to step 1
            case 1:
                return !!(progress.businessName?.trim() && progress.industry);
            case 2:
                return !!(progress.description?.trim());
            case 3:
                return !!(progress.services && progress.services.length > 0);
            case 4:
                return !!progress.selectedTemplateId;
            case 5:
                return true; // Contact info is optional
            case 6:
                // Step 6 is either Store Setup (if hasEcommerce) or Generation (if no ecommerce)
                if (progress.hasEcommerce) {
                    // Store Setup: require at least one category selected
                    return !!(progress.storeSetup?.selectedCategories && progress.storeSetup.selectedCategories.length > 0);
                }
                return false; // Generation step doesn't have next
            case 7:
                return false; // Generation step doesn't have next
            default:
                return false;
        }
    }, [progress, getMaxStep]);

    const canGoPrevious = useCallback(() => {
        if (!progress) return false;
        return progress.step > 0;
    }, [progress]);

    // =============================================================================
    // DATA UPDATES
    // =============================================================================

    const updateProgress = useCallback((updates: Partial<OnboardingProgress>) => {
        if (!progress) return;
        const newProgress = { ...progress, ...updates };
        setProgress(newProgress);
        // Auto-save after update
        saveProgress(newProgress);
    }, [progress, saveProgress]);

    const updateBusinessInfo = useCallback((name: string, industry: string, subIndustry?: string) => {
        updateProgress({ businessName: name, industry, subIndustry });
    }, [updateProgress]);

    const updateDescription = useCallback((description: string, tagline?: string) => {
        updateProgress({ description, tagline });
    }, [updateProgress]);

    const updateServices = useCallback((services: OnboardingService[]) => {
        updateProgress({ services });
    }, [updateProgress]);

    const updateTemplateSelection = useCallback((
        templateId: string,
        templateName: string,
        enabledComponents: PageSection[],
        disabledComponents: PageSection[]
    ) => {
        updateProgress({
            selectedTemplateId: templateId,
            selectedTemplateName: templateName,
            enabledComponents,
            disabledComponents,
        });
    }, [updateProgress]);

    const updateContactInfo = useCallback((contactInfo: OnboardingContactInfo) => {
        updateProgress({ contactInfo });
    }, [updateProgress]);

    // =============================================================================
    // ECOMMERCE UPDATES
    // =============================================================================

    const updateEcommerceSettings = useCallback((hasEcommerce: boolean, ecommerceType?: EcommerceType) => {
        updateProgress({ hasEcommerce, ecommerceType });
        // Clear suggested categories when disabling ecommerce
        if (!hasEcommerce) {
            setSuggestedCategories([]);
        }
    }, [updateProgress]);

    const updateStoreSetup = useCallback((storeSetup: OnboardingStoreSetup) => {
        updateProgress({ storeSetup });
    }, [updateProgress]);

    const generateSuggestedCategories = useCallback(async (): Promise<void> => {
        if (!progress?.businessName || !progress?.industry) {
            return;
        }

        setIsLoadingCategories(true);
        setError(null);

        try {
            // Get prompt from centralized system
            const promptConfig = getPrompt('onboarding-generate-categories');
            if (!promptConfig) {
                // Fallback categories based on industry
                const fallbackCategories = getFallbackCategories(progress.industry);
                setSuggestedCategories(fallbackCategories);
                return;
            }

            const prompt = promptConfig.template
                .replace(/\{\{businessName\}\}/g, progress.businessName)
                .replace(/\{\{industry\}\}/g, progress.industry)
                .replace(/\{\{description\}\}/g, progress.description || '')
                .replace(/\{\{ecommerceType\}\}/g, progress.ecommerceType || 'physical')
                .replace(/\{\{language\}\}/g, progress.language === 'es' ? 'Spanish' : 'English');

            const response = await generateContentViaProxy(
                'onboarding-categories',
                prompt,
                promptConfig.model,
                { temperature: 0.7, maxOutputTokens: 500 },
                user?.uid
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'categories', true);

            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, []);

            if (Array.isArray(parsed) && parsed.length > 0) {
                // Extract category names if they are objects
                const categories = parsed.map((item: any) =>
                    typeof item === 'string' ? item : item.name || item.category || String(item)
                );
                setSuggestedCategories(categories);
                if (isDev) console.log('🏷️ Generated categories:', categories);
            } else {
                // Fallback to industry defaults
                const fallbackCategories = getFallbackCategories(progress.industry);
                setSuggestedCategories(fallbackCategories);
            }
        } catch (err) {
            console.error('Failed to generate categories:', err);
            // Use fallback categories
            const fallbackCategories = getFallbackCategories(progress.industry);
            setSuggestedCategories(fallbackCategories);
        } finally {
            setIsLoadingCategories(false);
        }
    }, [progress, user, getPrompt]);

    // Helper function for fallback categories
    const getFallbackCategories = (industry: string): string[] => {
        const categoryMap: Record<string, string[]> = {
            'fashion': ['Ropa de Mujer', 'Ropa de Hombre', 'Accesorios', 'Calzado', 'Bolsos'],
            'retail': ['Productos Destacados', 'Ofertas', 'Nuevos Productos', 'Categoría Principal'],
            'jewelry': ['Anillos', 'Collares', 'Aretes', 'Pulseras', 'Relojes'],
            'electronics': ['Smartphones', 'Laptops', 'Accesorios', 'Audio', 'Gaming'],
            'home-decor': ['Sala', 'Dormitorio', 'Cocina', 'Baño', 'Decoración'],
            'beauty-products': ['Skincare', 'Maquillaje', 'Cabello', 'Fragancias', 'Sets'],
            'food-products': ['Alimentos', 'Bebidas', 'Snacks', 'Orgánicos', 'Gourmet'],
            'crafts': ['Artesanías', 'Manualidades', 'Arte', 'Decorativo', 'Personalizado'],
            'sports-equipment': ['Fitness', 'Deportes', 'Outdoor', 'Accesorios', 'Ropa Deportiva'],
        };
        return categoryMap[industry] || ['Categoría 1', 'Categoría 2', 'Categoría 3', 'Categoría 4'];
    };

    // =============================================================================
    // WEBSITE ANALYSIS (Step 0)
    // =============================================================================

    const [isAnalyzingWebsite, setIsAnalyzingWebsite] = useState(false);

    const analyzeWebsite = useCallback(async (url: string) => {
        if (!user) {
            throw new Error('User must be authenticated');
        }

        setIsAnalyzingWebsite(true);
        setError(null);

        try {
            // Import Firebase functions
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const analyzeWebsiteFn = httpsCallable(functions, 'agencyOnboarding-analyzeWebsite');

            const response = await analyzeWebsiteFn({ url });
            const data = response.data as { success: boolean; result: any };

            if (!data.success || !data.result) {
                throw new Error('Analysis failed');
            }

            const result = data.result;

            // Auto-populate onboarding progress with analyzed data
            const updates: Partial<OnboardingProgress> = {
                businessName: result.businessName || '',
                industry: result.industry || '',
                description: result.description || '',
                tagline: result.tagline || '',
            };

            // Add services if available
            if (result.services && Array.isArray(result.services)) {
                updates.services = result.services.map((s: any, idx: number) => ({
                    id: `service-analyzed-${Date.now()}-${idx}`,
                    name: s.name || '',
                    description: s.description || '',
                    isAIGenerated: true,
                }));
            }

            // Add contact info if available
            if (result.contactInfo) {
                updates.contactInfo = {
                    email: result.contactInfo.email,
                    phone: result.contactInfo.phone,
                    address: result.contactInfo.address,
                    facebook: result.contactInfo.facebook,
                    instagram: result.contactInfo.instagram,
                    twitter: result.contactInfo.twitter,
                    linkedin: result.contactInfo.linkedin,
                    youtube: result.contactInfo.youtube,
                };
            }

            // Update progress with analyzed data
            updateProgress(updates);

            // Log successful analysis
            logOnboardingApiCall(user.uid, 'gemini-2.5-flash', 'website_analysis', true);

            return result;
        } catch (err: any) {
            console.error('Website analysis failed:', err);
            logOnboardingApiCall(user?.uid, 'gemini-2.5-flash', 'website_analysis', false, err.message);
            setError(err.message || 'Failed to analyze website');
            throw err;
        } finally {
            setIsAnalyzingWebsite(false);
        }
    }, [user, updateProgress]);

    const skipWebsiteAnalysis = useCallback(() => {
        goToStep(ONBOARDING_STEPS.BUSINESS_INFO);
    }, [goToStep]);

    // =============================================================================
    // AI ASSISTANCE
    // =============================================================================

    const generateDescription = useCallback(async (): Promise<{ description: string; tagline: string }> => {
        if (!progress?.businessName || !progress?.industry) {
            throw new Error('Business name and industry are required');
        }

        // Get prompt from centralized system (editable in Super Admin)
        const promptConfig = getPrompt('onboarding-generate-description');
        if (!promptConfig) {
            throw new Error('Description generation prompt not found');
        }

        const prompt = promptConfig.template
            .replace('{{businessName}}', progress.businessName)
            .replace('{{industry}}', progress.industry)
            .replace('{{language}}', progress.language === 'es' ? 'Spanish' : 'English');

        try {
            const response = await generateContentViaProxy(
                'onboarding-gen',
                prompt,
                promptConfig.model,
                {},
                user?.uid
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'description', true);

            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, null);

            // If parsing succeeded and we have a description object
            if (parsed && typeof parsed === 'object' && parsed.description) {
                return {
                    description: parsed.description,
                    tagline: parsed.tagline || '',
                };
            }

            // Fallback: try to extract just the text content (remove JSON formatting)
            let cleanText = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .replace(/^\s*\{\s*"description"\s*:\s*"/i, '')
                .replace(/"\s*,?\s*"tagline"\s*:\s*"[^"]*"\s*\}\s*$/i, '')
                .replace(/"\s*\}\s*$/i, '')
                .trim();

            return {
                description: cleanText || text.trim(),
                tagline: '',
            };
        } catch (err) {
            console.error('Failed to generate description:', err);
            throw err;
        }
    }, [progress, user, getPrompt]);

    const generateServices = useCallback(async (): Promise<OnboardingService[]> => {
        if (!progress?.businessName || !progress?.industry) {
            throw new Error('Business name and industry are required');
        }

        // Get prompt from centralized system (editable in Super Admin)
        const promptConfig = getPrompt('onboarding-generate-services');
        if (!promptConfig) {
            throw new Error('Services generation prompt not found');
        }

        const prompt = promptConfig.template
            .replace('{{businessName}}', progress.businessName)
            .replace('{{industry}}', progress.industry)
            .replace('{{description}}', progress.description || 'Not provided')
            .replace('{{language}}', progress.language === 'es' ? 'Spanish' : 'English');

        try {
            const response = await generateContentViaProxy(
                'onboarding-gen',
                prompt,
                promptConfig.model,
                {},
                user?.uid
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'services', true);

            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, []);

            if (!Array.isArray(parsed)) {
                console.warn('Services response is not an array, returning empty');
                return [];
            }

            return parsed.map((item: any, index: number) => ({
                id: `service-${Date.now()}-${index}`,
                name: item.name || `Service ${index + 1}`,
                description: item.description || '',
                isAIGenerated: true,
            }));
        } catch (err) {
            console.error('Failed to generate services:', err);
            // Return default services instead of throwing
            return [
                { id: `service-${Date.now()}-0`, name: 'Service 1', description: 'Main service', isAIGenerated: true },
                { id: `service-${Date.now()}-1`, name: 'Service 2', description: 'Additional service', isAIGenerated: true },
            ];
        }
    }, [progress, user, getPrompt]);

    const getTemplateRecommendation = useCallback(async (): Promise<TemplateRecommendation> => {
        if (!progress?.businessName || !progress?.industry) {
            throw new Error('Business name and industry are required');
        }

        if (templates.length === 0) {
            throw new Error('No templates available');
        }

        // Get component defaults for industry
        const componentDefaults = getIndustryComponentDefaults(progress.industry);

        // Helper to extract main colors from theme
        const getTemplateColors = (t: Project): string => {
            const theme = t.theme as any || {};
            const colors: string[] = [];
            if (theme.primaryColor) colors.push(`primary: ${theme.primaryColor}`);
            if (theme.secondaryColor) colors.push(`secondary: ${theme.secondaryColor}`);
            if (theme.backgroundColor) colors.push(`background: ${theme.backgroundColor}`);
            if (theme.accentColor) colors.push(`accent: ${theme.accentColor}`);

            // Also check hero colors if available
            const heroColors = t.data?.hero?.colors;
            if (heroColors?.primary) colors.push(`hero: ${heroColors.primary}`);

            return colors.length > 0 ? colors.join(', ') : 'default colors';
        };

        // Helper to describe color mood
        const describeColorMood = (colors: string): string => {
            const lowerColors = colors.toLowerCase();
            if (lowerColors.includes('#000') || lowerColors.includes('black') || lowerColors.includes('#1') || lowerColors.includes('#2')) {
                return 'dark, elegant, sophisticated';
            }
            if (lowerColors.includes('#fff') || lowerColors.includes('white') || lowerColors.includes('#f')) {
                return 'clean, minimal, bright';
            }
            if (lowerColors.includes('blue') || lowerColors.includes('#0')) {
                return 'professional, trustworthy, corporate';
            }
            if (lowerColors.includes('green') || lowerColors.includes('#2e') || lowerColors.includes('#3')) {
                return 'natural, fresh, growth';
            }
            if (lowerColors.includes('red') || lowerColors.includes('#e') || lowerColors.includes('#c')) {
                return 'bold, energetic, passionate';
            }
            if (lowerColors.includes('orange') || lowerColors.includes('#f9') || lowerColors.includes('#ff7')) {
                return 'warm, friendly, creative';
            }
            if (lowerColors.includes('purple') || lowerColors.includes('#9') || lowerColors.includes('#7')) {
                return 'luxurious, creative, premium';
            }
            return 'balanced, versatile';
        };

        // Create detailed template summary for LLM
        const templateSummary = templates.map((t: Project, index: number) => {
            const colors = getTemplateColors(t);
            const mood = describeColorMood(colors);
            const sections = Object.keys(t.sectionVisibility || {}).filter(
                k => t.sectionVisibility?.[k as keyof typeof t.sectionVisibility]
            );

            return {
                index: index + 1,
                id: t.id,
                name: t.name,
                industries: t.industries || [],
                tags: t.tags || [],
                colorScheme: colors,
                colorMood: mood,
                activeSections: sections.slice(0, 8),
                hasHero: !!t.data?.hero,
                hasServices: !!t.data?.services,
                hasTeam: !!t.data?.team,
                hasPortfolio: !!t.data?.portfolio,
                hasPricing: !!t.data?.pricing,
                hasMenu: !!t.data?.menu,
            };
        });

        // Industry color preferences
        const industryColorPrefs: Record<string, string> = {
            'restaurant': 'warm colors (orange, red, brown), appetizing, cozy',
            'technology': 'blue, dark themes, modern, sleek',
            'healthcare': 'blue, white, green, clean, trustworthy',
            'consulting': 'blue, dark, professional, corporate',
            'fitness-gym': 'bold colors (red, orange, black), energetic, dynamic',
            'photography': 'dark, minimal, artistic, elegant',
            'real-estate': 'blue, green, luxurious, trustworthy',
            'beauty-spa': 'soft pastels, pink, purple, elegant, relaxing',
            'automotive': 'dark, red, metallic, powerful, premium',
            'legal': 'dark blue, gold, traditional, authoritative',
            'finance': 'blue, green, stable, trustworthy',
            'construction': 'orange, yellow, strong, industrial',
            'education': 'bright, friendly, approachable, blue/green',
            'travel': 'blue, vibrant, adventurous, inspiring',
            'event-planning': 'elegant, festive, purple, gold',
        };

        const colorPref = industryColorPrefs[progress.industry] || 'professional, balanced';

        // Shuffle templates to avoid always picking the first one
        const shuffledSummary = [...templateSummary].sort(() => Math.random() - 0.5);

        // Format template summary for the prompt
        const templateSummaryText = shuffledSummary.map(t => `
TEMPLATE #${t.index}: "${t.name}"
  ID: ${t.id}
  Industries: ${t.industries.length > 0 ? t.industries.join(', ') : 'General/All'}
  Color Mood: ${t.colorMood}
  Color Scheme: ${t.colorScheme}
  Components: ${[
                t.hasHero ? 'Hero' : '',
                t.hasServices ? 'Services' : '',
                t.hasTeam ? 'Team' : '',
                t.hasPortfolio ? 'Portfolio' : '',
                t.hasPricing ? 'Pricing' : '',
                t.hasMenu ? 'Menu' : ''
            ].filter(Boolean).join(', ') || 'Basic'}
`).join('');

        // Get prompt from centralized system (editable in Super Admin)
        const promptConfig = getPrompt('onboarding-template-recommendation');
        if (!promptConfig) {
            console.error('Template recommendation prompt not found');
            // Fallback to first template
            return {
                templateId: templates[0]?.id || 'default',
                templateName: templates[0]?.name || 'Template',
                matchScore: 70,
                matchReasons: ['Default recommendation'],
                suggestedComponents: componentDefaults.recommended,
                disabledComponents: componentDefaults.disabled,
            };
        }

        const prompt = promptConfig.template
            .replace('{{businessName}}', progress.businessName)
            .replace(/\{\{industry\}\}/g, progress.industry)
            .replace('{{description}}', progress.description || 'General business')
            .replace('{{services}}', progress.services?.map(s => s.name).join(', ') || 'Various services')
            .replace(/\{\{colorPreference\}\}/g, colorPref)
            .replace('{{templateSummary}}', templateSummaryText);

        try {
            const response = await generateContentViaProxy(
                'onboarding-template-rec',  // projectId (must start with 'onboarding-')
                prompt,                      // prompt text
                promptConfig.model,          // model from prompt config
                { temperature: 0.7, maxOutputTokens: 600 },
                user?.uid                    // userId (optional)
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'template-rec', true);

            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, {});

            if (isDev) console.log('🎯 LLM chose template:', parsed.templateId, 'from', templates.length, 'options');

            // Verify the template exists
            const selectedTemplate = templates.find((t: Project) => t.id === parsed.templateId);

            if (selectedTemplate) {
                if (isDev) console.log('🎨 AI recommended template:', parsed.templateName, 'Score:', parsed.matchScore);
                return {
                    templateId: parsed.templateId,
                    templateName: parsed.templateName || selectedTemplate.name,
                    matchScore: parsed.matchScore || 80,
                    matchReasons: Array.isArray(parsed.matchReasons) ? parsed.matchReasons : ['Best match for your industry'],
                    suggestedComponents: componentDefaults.recommended,
                    disabledComponents: componentDefaults.disabled,
                };
            }

            // Fallback to first matching industry or first template
            const industryMatch = templates.find((t: Project) =>
                t.industries?.some((i: string) => i.toLowerCase().includes(progress.industry.toLowerCase()))
            );
            const fallbackTemplate = industryMatch || templates[0];

            if (isDev) console.log('⚠️ Using fallback template:', fallbackTemplate?.name);
            return {
                templateId: fallbackTemplate?.id || 'default',
                templateName: fallbackTemplate?.name || 'Template',
                matchScore: 70,
                matchReasons: ['Best available match'],
                suggestedComponents: componentDefaults.recommended,
                disabledComponents: componentDefaults.disabled,
            };
        } catch (err) {
            console.error('Failed to get template recommendation:', err);
            // Return first template as fallback
            return {
                templateId: templates[0]?.id || 'default',
                templateName: templates[0]?.name || 'Template',
                matchScore: 70,
                matchReasons: ['Default recommendation'],
                suggestedComponents: componentDefaults.recommended,
                disabledComponents: componentDefaults.disabled,
            };
        }
    }, [progress, templates, user, getPrompt]);

    // =============================================================================
    // CONTENT GENERATION
    // =============================================================================

    // Image config by component type (aspect ratio based on component area)
    const IMAGE_CONFIG: Record<string, { aspectRatio: string }> = {
        'hero': { aspectRatio: '16:9' },           // Wide banner
        'heroSplit': { aspectRatio: '3:4' },       // Vertical split
        'banner': { aspectRatio: '21:9' },         // Ultra-wide
        'cta': { aspectRatio: '16:9' },            // Wide background
        'features': { aspectRatio: '1:1' },        // Square cards
        'team': { aspectRatio: '1:1' },            // Square portraits
        'portfolio': { aspectRatio: '4:3' },       // Project showcase
        'menu': { aspectRatio: '1:1' },            // Food photos
        'slideshow': { aspectRatio: '16:9' },      // Slides
    };

    // Visual style presets by industry for consistency
    const getIndustryStyle = (industry: string): string => {
        const styles: Record<string, string> = {
            'restaurant': 'warm lighting, cozy atmosphere, rich colors, appetizing, inviting ambiance',
            'technology': 'clean minimalist, blue tones, modern sleek, futuristic, cool lighting',
            'healthcare': 'clean white, soft blue accents, calm serene, professional medical, trustworthy',
            'consulting': 'corporate professional, neutral tones, sophisticated, elegant business',
            'fitness-gym': 'dynamic energetic, high contrast, motivational, athletic, bold colors',
            'photography': 'artistic creative, dramatic lighting, professional portfolio style',
            'real-estate': 'bright airy, natural light, luxurious, aspirational, warm welcoming',
            'education': 'bright cheerful, friendly colors, inclusive, inspiring, approachable',
            'beauty-spa': 'soft pastel, relaxing serene, luxurious elegant, calming, feminine',
            'automotive': 'sleek metallic, dramatic lighting, powerful dynamic, premium quality',
            'legal': 'formal traditional, dark wood tones, authoritative, trustworthy, professional',
            'finance': 'corporate blue, clean professional, trustworthy, sophisticated, stable',
            'construction': 'industrial strong, earthy tones, solid reliable, professional craft',
            'retail': 'bright vibrant, appealing display, inviting, commercial quality',
            'travel': 'vibrant scenic, adventure inspiring, wanderlust, natural beauty',
            'event-planning': 'elegant celebration, festive glamorous, joyful, memorable moments',
        };

        const key = industry?.toLowerCase().replace(/\s+/g, '-') || 'default';
        return styles[key] || 'professional modern, clean aesthetic, high quality, balanced lighting';
    };

    // Generate image prompts for ALL enabled components with consistent style
    // aiContent contains AI-generated data (menu items, team members, portfolio projects, etc.)
    // This is the FALLBACK method - now more specific with full business context
    const generateImagePrompts = useCallback((
        templateData: any,
        businessName: string,
        industry: string,
        enabledComponents: string[],
        aiContent: Record<string, any> = {},
        businessDescription: string = ''
    ): Record<string, { prompt: string; aspectRatio: string; style: string }> => {
        const prompts: Record<string, { prompt: string; aspectRatio: string; style: string }> = {};
        const ind = industry?.replace(/-/g, ' ') || 'business';

        // Use FULL description for more specific images (up to 300 chars)
        const businessContext = businessDescription
            ? `, representing "${businessName}" - ${businessDescription.substring(0, 300)}`
            : `, for "${businessName}"`;

        // Consistent style for ALL images in this project
        const visualStyle = getIndustryStyle(industry);
        const noText = 'no text, no words, no letters, no watermark, no logos';
        const consistency = `consistent style, ${visualStyle}, cohesive visual identity`;

        // Specific business identifier for all prompts
        const businessId = `"${businessName}" ${ind} business`;

        // Helper to check if component is enabled
        const isEnabled = (comp: string) => enabledComponents.includes(comp);

        // HERO - main image (16:9 wide) - SPECIFIC to business
        if (templateData.hero && isEnabled('hero')) {
            prompts['hero.imageUrl'] = {
                prompt: `${businessId} hero scene showing their main products or services${businessContext}, ${consistency}, professional photography, high quality, ${noText}`,
                aspectRatio: IMAGE_CONFIG['hero'].aspectRatio,
                style: 'Photorealistic'
            };
        }

        // HERO SPLIT (3:4 vertical) - SPECIFIC to business
        if (templateData.heroSplit && isEnabled('heroSplit')) {
            prompts['heroSplit.imageUrl'] = {
                prompt: `${businessId} vertical showcase${businessContext}, ${consistency}, modern professional, ${noText}`,
                aspectRatio: IMAGE_CONFIG['heroSplit'].aspectRatio,
                style: 'Photorealistic'
            };
        }

        // BANNER (21:9 ultra-wide) - SPECIFIC to business
        if (templateData.banner && isEnabled('banner')) {
            prompts['banner.backgroundImageUrl'] = {
                prompt: `${businessId} panoramic scene${businessContext}, ${consistency}, elegant wide view, ${noText}`,
                aspectRatio: IMAGE_CONFIG['banner'].aspectRatio,
                style: 'Photorealistic'
            };
        }

        // CTA background (16:9)
        if (templateData.cta?.backgroundImage !== undefined && isEnabled('cta')) {
            prompts['cta.backgroundImage'] = {
                prompt: `Abstract background representing ${businessId}, ${consistency}, subtle elegant, ${noText}`,
                aspectRatio: IMAGE_CONFIG['cta'].aspectRatio,
                style: 'Photorealistic'
            };
        }

        // FEATURES items (1:1 square) - Use AI-generated feature titles for context
        if (templateData.features?.items && isEnabled('features')) {
            const featuresItems = aiContent.features || [];
            const count = Math.min(featuresItems.length > 0 ? featuresItems.length : templateData.features.items.length, 6);
            for (let i = 0; i < count; i++) {
                const featureItem = featuresItems[i];
                const featureTitle = featureItem?.title || `concept ${i + 1}`;
                const featureDesc = featureItem?.description ? `, ${featureItem.description}` : '';
                prompts[`features.items[${i}].imageUrl`] = {
                    prompt: `${ind} ${featureTitle}${featureDesc}, ${consistency}, clean minimal illustration, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['features'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }

        // TEAM members - SKIP image generation for faster onboarding
        // Team images will use SVG placeholders by default. Users can generate images later if needed.
        if (templateData.team?.items && isEnabled('team') && isDev) {
            console.log('📝 Team images: Using SVG placeholders (skipping generation for speed)');
        }

        // PORTFOLIO items (4:3 landscape) - Use AI-generated portfolio titles and descriptions
        if (templateData.portfolio?.items && isEnabled('portfolio')) {
            const portfolioItems = aiContent.portfolio || [];
            const count = Math.min(portfolioItems.length > 0 ? portfolioItems.length : templateData.portfolio.items.length, 6);
            for (let i = 0; i < count; i++) {
                const portfolioItem = portfolioItems[i];
                const projectTitle = portfolioItem?.title || `project ${i + 1}`;
                const projectDesc = portfolioItem?.description ? `, ${portfolioItem.description}` : '';
                const projectCategory = portfolioItem?.category ? `, ${portfolioItem.category}` : '';
                prompts[`portfolio.items[${i}].imageUrl`] = {
                    prompt: `${ind} ${projectTitle}${projectDesc}${projectCategory}, ${consistency}, professional work showcase, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['portfolio'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }

        // MENU items (1:1 food photos) - Use AI-generated menu item names and descriptions
        // Limited to 3 images for faster onboarding (users can generate more later)
        if (templateData.menu?.items && isEnabled('menu')) {
            const menuItems = aiContent.menu || [];
            const count = Math.min(menuItems.length > 0 ? menuItems.length : templateData.menu.items.length, 3); // Max 3 for faster generation
            for (let i = 0; i < count; i++) {
                const menuItem = menuItems[i];
                const dishName = menuItem?.name || 'delicious dish';
                const dishDesc = menuItem?.description ? `, ${menuItem.description}` : '';
                const dishCategory = menuItem?.category ? `, ${menuItem.category} cuisine` : '';
                prompts[`menu.items[${i}].imageUrl`] = {
                    prompt: `${dishName}${dishDesc}${dishCategory}, ${ind} restaurant style, ${consistency}, professional food photography, appetizing, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['menu'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }

        // SLIDESHOW/GALLERY items (16:9 wide) - Use AI-generated slide titles for context
        // Limited to 1 image for faster onboarding (users can generate more later)
        if ((templateData.slideshow?.items || templateData.slideshow?.slides) && isEnabled('slideshow')) {
            const slideshowItems = aiContent.slideshow || [];
            const templateItems = templateData.slideshow.items || templateData.slideshow.slides || [];
            const count = Math.min(slideshowItems.length > 0 ? slideshowItems.length : templateItems.length, 1); // Max 1 for faster generation
            for (let i = 0; i < count; i++) {
                const slideItem = slideshowItems[i];
                const slideTitle = slideItem?.title || `showcase scene ${i + 1}`;
                const slideSubtitle = slideItem?.subtitle ? `, ${slideItem.subtitle}` : '';
                prompts[`slideshow.items[${i}].imageUrl`] = {
                    prompt: `${ind} ${slideTitle}${slideSubtitle}, ${consistency}, professional quality, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['slideshow'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }

        // Ensure at least hero
        if (Object.keys(prompts).length === 0) {
            prompts['hero.imageUrl'] = {
                prompt: `${ind} business hero, ${consistency}, professional modern, ${noText}`,
                aspectRatio: IMAGE_CONFIG['hero'].aspectRatio,
                style: 'Photorealistic'
            };
        }

        if (isDev) {
            console.log('📝 Image prompts with consistent style:', Object.keys(prompts).length);
            console.log('   Visual style:', visualStyle);
        }
        return prompts;
    }, []);

    // NEW: Generate image prompts using LLM for better context understanding
    const generateImagePromptsWithLLM = useCallback(async (
        templateData: any,
        businessName: string,
        industry: string,
        description: string,
        enabledComponents: string[],
        aiContent: Record<string, any>,
        language: string,
        tagline: string = '',
        services: string[] = [],
        storeCategories: string[] = []
    ): Promise<Record<string, { prompt: string; aspectRatio: string; style: string }>> => {

        // Helper to check if component is enabled
        const isEnabled = (comp: string) => enabledComponents.includes(comp);

        // Build the list of images needed with their aspect ratios
        const imagesToGenerate: { key: string; aspectRatio: string; description: string }[] = [];

        // HERO
        if (templateData.hero && isEnabled('hero')) {
            imagesToGenerate.push({ key: 'hero.imageUrl', aspectRatio: '16:9', description: 'Main hero banner image' });
        }

        // HERO SPLIT
        if (templateData.heroSplit && isEnabled('heroSplit')) {
            imagesToGenerate.push({ key: 'heroSplit.imageUrl', aspectRatio: '3:4', description: 'Vertical split hero image' });
        }

        // BANNER
        if (templateData.banner && isEnabled('banner')) {
            imagesToGenerate.push({ key: 'banner.backgroundImageUrl', aspectRatio: '21:9', description: 'Wide panoramic banner' });
        }

        // CTA
        if (templateData.cta?.backgroundImage !== undefined && isEnabled('cta')) {
            imagesToGenerate.push({ key: 'cta.backgroundImage', aspectRatio: '16:9', description: 'Call to action background' });
        }

        // FEATURES
        if (templateData.features?.items && isEnabled('features')) {
            const featuresItems = aiContent.features || [];
            const count = Math.min(featuresItems.length > 0 ? featuresItems.length : templateData.features.items.length, 6);
            for (let i = 0; i < count; i++) {
                const feature = featuresItems[i];
                imagesToGenerate.push({
                    key: `features.items[${i}].imageUrl`,
                    aspectRatio: '1:1',
                    description: `Feature: ${feature?.title || `Feature ${i + 1}`}`
                });
            }
        }

        // TEAM - SKIP image generation for faster onboarding
        // Team images will use SVG placeholders. Users can generate images later if needed.
        if (templateData.team?.items && isEnabled('team')) {
            if (isDev) console.log('📝 Team images: Using SVG placeholders (skipping generation for speed)');
        }

        // PORTFOLIO
        if (templateData.portfolio?.items && isEnabled('portfolio')) {
            const portfolioItems = aiContent.portfolio || [];
            const count = Math.min(portfolioItems.length > 0 ? portfolioItems.length : templateData.portfolio.items.length, 6);
            for (let i = 0; i < count; i++) {
                const project = portfolioItems[i];
                imagesToGenerate.push({
                    key: `portfolio.items[${i}].imageUrl`,
                    aspectRatio: '4:3',
                    description: `Portfolio: ${project?.title || `Project ${i + 1}`} - ${project?.description || ''}`
                });
            }
        }

        // MENU - Limited to 3 images for faster onboarding
        if (templateData.menu?.items && isEnabled('menu')) {
            const menuItems = aiContent.menu || [];
            const count = Math.min(menuItems.length > 0 ? menuItems.length : templateData.menu.items.length, 3); // Max 3 for faster generation
            for (let i = 0; i < count; i++) {
                const dish = menuItems[i];
                imagesToGenerate.push({
                    key: `menu.items[${i}].imageUrl`,
                    aspectRatio: '1:1',
                    description: `Menu dish: ${dish?.name || 'Dish'} - ${dish?.description || ''}`
                });
            }
        }

        // SLIDESHOW/GALLERY - Limited to 1 image for faster onboarding
        if ((templateData.slideshow?.items || templateData.slideshow?.slides) && isEnabled('slideshow')) {
            const slideshowItems = aiContent.slideshow || [];
            const templateItems = templateData.slideshow.items || templateData.slideshow.slides || [];
            const count = Math.min(slideshowItems.length > 0 ? slideshowItems.length : templateItems.length, 1); // Max 1 for faster generation
            for (let i = 0; i < count; i++) {
                const slide = slideshowItems[i];
                imagesToGenerate.push({
                    key: `slideshow.items[${i}].imageUrl`,
                    aspectRatio: '16:9',
                    description: `Gallery/Slideshow: ${slide?.title || `Image ${i + 1}`} - ${slide?.subtitle || ''}`
                });
            }
        }

        if (imagesToGenerate.length === 0) {
            // Fallback to at least hero
            imagesToGenerate.push({ key: 'hero.imageUrl', aspectRatio: '16:9', description: 'Main hero banner image' });
        }

        // Get the LLM prompt
        const promptConfig = getPrompt('onboarding-generate-image-prompts');
        if (!promptConfig) {
            console.warn('⚠️ LLM image prompt not found, falling back to static generation');
            return generateImagePrompts(templateData, businessName, industry, enabledComponents, aiContent, description);
        }

        // Format generated content for the prompt
        const generatedContentStr = JSON.stringify(aiContent, null, 2);

        // Format images needed for the prompt
        const imagesNeededStr = imagesToGenerate.map(img =>
            `- ${img.key} (${img.aspectRatio}): ${img.description}`
        ).join('\n');

        // Format services list
        const servicesStr = services.length > 0
            ? services.map(s => typeof s === 'object' ? (s as any).name || JSON.stringify(s) : s).join(', ')
            : 'Not specified';

        // Format store categories
        const storeCategoriesStr = storeCategories.length > 0
            ? storeCategories.join(', ')
            : 'Not applicable';

        // Build the prompt with all business context
        const prompt = promptConfig.template
            .replace(/\{\{businessName\}\}/g, businessName)
            .replace(/\{\{tagline\}\}/g, tagline || 'Professional quality and service')
            .replace(/\{\{industry\}\}/g, industry?.replace(/-/g, ' ') || 'business')
            .replace(/\{\{description\}\}/g, description || 'A professional business offering quality products and services')
            .replace(/\{\{services\}\}/g, servicesStr)
            .replace(/\{\{storeCategories\}\}/g, storeCategoriesStr)
            .replace('{{language}}', language === 'es' ? 'Spanish' : 'English')
            .replace('{{generatedContent}}', generatedContentStr)
            .replace('{{imagesToGenerate}}', imagesNeededStr);

        try {
            if (isDev) console.log('🎨 Generating image prompts with LLM...');
            if (isDev) console.log('   Images needed:', imagesToGenerate.length);

            const response = await generateContentViaProxy(
                'onboarding-image-prompts',  // projectId (must start with 'onboarding-')
                prompt,                       // prompt text
                promptConfig.model,           // model from prompt config
                { temperature: 0.7, maxOutputTokens: 4000 },
                user?.uid                     // userId (optional)
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'image-prompts', true);

            const text = extractTextFromResponse(response);
            const llmPrompts = safeJsonParse(text, null);

            if (!llmPrompts || typeof llmPrompts !== 'object') {
                console.warn('⚠️ LLM returned invalid response, falling back to static generation');
                return generateImagePrompts(templateData, businessName, industry, enabledComponents, aiContent, description);
            }

            // Convert LLM response to our format with aspect ratios
            const result: Record<string, { prompt: string; aspectRatio: string; style: string }> = {};

            for (const img of imagesToGenerate) {
                const llmPrompt = llmPrompts[img.key];
                if (llmPrompt && typeof llmPrompt === 'string') {
                    result[img.key] = {
                        prompt: llmPrompt,
                        aspectRatio: img.aspectRatio,
                        style: 'Photorealistic'
                    };
                } else {
                    // Fallback for missing prompts
                    result[img.key] = {
                        prompt: `${industry?.replace(/-/g, ' ')} ${img.description}, professional photography, high quality, no text, no watermarks`,
                        aspectRatio: img.aspectRatio,
                        style: 'Photorealistic'
                    };
                }
            }

            if (isDev) console.log('✅ LLM generated', Object.keys(result).length, 'image prompts');
            return result;

        } catch (error) {
            console.error('❌ LLM image prompt generation failed:', error);
            console.warn('⚠️ Falling back to static generation');
            return generateImagePrompts(templateData, businessName, industry, enabledComponents, aiContent, description);
        }
    }, [user, getPrompt, generateImagePrompts]);

    const generateWebsiteContent = useCallback(async (
        aiContent: Record<string, any> = {}
    ): Promise<{
        content: Record<string, any>;
        imagePrompts: Record<string, { prompt: string; aspectRatio: string; style: string }>;
    }> => {
        if (!progress?.selectedTemplateId) {
            throw new Error('Template must be selected');
        }

        const selectedTemplate = templates.find((t: Project) => t.id === progress.selectedTemplateId);
        if (!selectedTemplate) {
            throw new Error('Selected template not found');
        }

        // Get enabled components (use template defaults if not set)
        const enabledComponents = progress.enabledComponents ||
            Object.keys(selectedTemplate.sectionVisibility || {}).filter(
                k => selectedTemplate.sectionVisibility?.[k as keyof typeof selectedTemplate.sectionVisibility]
            );

        if (isDev) console.log('📋 Enabled components for generation:', enabledComponents);

        // Generate image prompts using LLM for better context understanding
        // The LLM understands the full business context and generates specific, relevant prompts
        // Now includes tagline, services, and store categories for more specific images
        const serviceNames = progress.services?.map(s => s.name) || [];
        const storeCategories = progress.storeSetup?.selectedCategories || [];

        const imagePrompts = await generateImagePromptsWithLLM(
            selectedTemplate.data,
            progress.businessName,
            progress.industry,
            progress.description || '',
            enabledComponents,
            aiContent,
            progress.language,
            progress.tagline || '',
            serviceNames,
            storeCategories
        );

        if (isDev) console.log('📸 Image prompts to generate:', Object.keys(imagePrompts).length);

        return {
            content: {},
            imagePrompts,
        };
    }, [progress, templates, generateImagePromptsWithLLM]);

    // Generate content for components that need AI-generated data
    const generateComponentContent = useCallback(async (
        enabledComponents: string[],
        businessName: string,
        industry: string,
        description: string,
        language: string
    ): Promise<Record<string, any>> => {
        const content: Record<string, any> = {};
        const isSpanish = language === 'es';
        const ind = industry?.replace(/-/g, ' ') || 'business';

        // Only generate for enabled components that need content
        const needsGeneration = ['testimonials', 'team', 'portfolio', 'pricing', 'howItWorks', 'menu', 'faq', 'slideshow', 'features'];
        const toGenerate = needsGeneration.filter(c => enabledComponents.includes(c));

        if (toGenerate.length === 0) {
            if (isDev) console.log('📝 No components need AI content generation');
            return content;
        }

        if (isDev) console.log('📝 Generating AI content for:', toGenerate);

        // Get prompt from centralized system (editable in Super Admin)
        const promptConfig = getPrompt('onboarding-generate-component-content');
        if (!promptConfig) {
            console.error('Component content generation prompt not found');
            return {};
        }

        const prompt = promptConfig.template
            .replace('{{industry}}', ind)
            .replace('{{businessName}}', businessName)
            .replace('{{description}}', description)
            .replace('{{language}}', isSpanish ? 'Spanish' : 'English')
            .replace('{{sectionsToGenerate}}', toGenerate.join(', '));

        try {
            const response = await generateContentViaProxy(
                'onboarding-content-gen',    // projectId (must start with 'onboarding-')
                prompt,                       // prompt text
                promptConfig.model,           // model from prompt config
                { temperature: 0.7, maxOutputTokens: 2000 },
                user?.uid                     // userId (optional)
            );

            // Log successful API call
            logOnboardingApiCall(user?.uid, promptConfig.model, 'content-gen', true);

            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, {});

            if (isDev) console.log('📝 AI generated content:', Object.keys(parsed));
            return parsed;
        } catch (err) {
            console.error('❌ Failed to generate component content:', err);
            return {};
        }
    }, [user, getPrompt]);

    // =============================================================================
    // APPLY BUSINESS DATA TO TEMPLATE (only enabled components)
    // =============================================================================

    const applyBusinessDataToTemplate = useCallback((
        templateData: any,
        prog: OnboardingProgress,
        generatedImages: Record<string, string>,
        aiContent: Record<string, any> = {}
    ) => {
        const data = JSON.parse(JSON.stringify(templateData));
        const es = prog.language === 'es';
        const name = prog.businessName;
        const desc = prog.description || '';
        const tag = prog.tagline || desc.substring(0, 80);
        const services = prog.services || [];
        const contact = prog.contactInfo || {};
        const enabled = prog.enabledComponents || [];

        // Helper for bilingual text
        const t = (spanish: string, english: string) => es ? spanish : english;

        // Check if component is enabled
        const isOn = (comp: string) => enabled.length === 0 || enabled.includes(comp as any);

        // ============ HEADER (always apply - keep template colors) ============
        if (data.header) {
            data.header.companyName = name;
            if (data.header.logoText !== undefined) data.header.logoText = name;
            // Keep template colors and style - don't override
            // Logo not in onboarding - keep template logo

            // Build simple navigation links (using anchor scroll format /#section)
            data.header.links = [
                { text: t('Inicio', 'Home'), href: '/' },
                { text: t('Servicios', 'Services'), href: '/#services' },
                { text: t('Nosotros', 'About'), href: '/#about' },
                { text: t('Contacto', 'Contact'), href: '/#contact' },
            ];
        }

        // ============ HERO (default: modern) ============
        if (data.hero && isOn('hero')) {
            data.hero.heroVariant = 'modern'; // Default style: Modern
            data.hero.headline = name;
            data.hero.subheadline = tag;
            if (data.hero.primaryCta !== undefined) data.hero.primaryCta = t('Comenzar', 'Get Started');
            if (data.hero.secondaryCta !== undefined) data.hero.secondaryCta = t('Más Info', 'Learn More');
            if (data.hero.badgeText !== undefined) data.hero.badgeText = '';
            if (generatedImages['hero.imageUrl']) data.hero.imageUrl = generatedImages['hero.imageUrl'];
        }

        // ============ HERO SPLIT ============
        if (data.heroSplit && isOn('heroSplit')) {
            data.heroSplit.headline = name;
            data.heroSplit.subheadline = tag;
            if (data.heroSplit.buttonText !== undefined) data.heroSplit.buttonText = t('Contactar', 'Contact');
            if (generatedImages['heroSplit.imageUrl']) data.heroSplit.imageUrl = generatedImages['heroSplit.imageUrl'];
        }

        // ============ SERVICES (default: minimal) ============
        if (data.services && isOn('services') && services.length > 0) {
            data.services.servicesVariant = 'minimal'; // Default style: Minimal
            data.services.title = t('Servicios', 'Services');
            data.services.description = t('Lo que ofrecemos', 'What we offer');
            const max = Math.min(services.length, data.services.items?.length || 6);
            data.services.items = services.slice(0, max).map((svc, i) => ({
                title: svc.name,
                description: svc.description || '',
                icon: data.services.items?.[i]?.icon || 'star',
            }));
        }

        // ============ FEATURES (default: classic) - AI Generated ============
        if (data.features && isOn('features')) {
            data.features.featuresVariant = 'classic'; // Default style: Classic
            data.features.title = t('Características', 'Features');
            data.features.description = t('Por qué elegirnos', 'Why choose us');
            // Prefer AI-generated features, fallback to services from onboarding
            if (aiContent.features && aiContent.features.length > 0) {
                const maxItems = Math.min(aiContent.features.length, data.features.items?.length || 6);
                data.features.items = aiContent.features.slice(0, maxItems).map((item: any, i: number) => ({
                    ...data.features.items?.[i],
                    title: item.title || '',
                    description: item.description || '',
                    imageUrl: generatedImages[`features.items[${i}].imageUrl`] || data.features.items?.[i]?.imageUrl || '',
                }));
            } else if (data.features.items && services.length > 0) {
                // Fallback to services from onboarding Step 3
                const max = Math.min(services.length, data.features.items.length);
                data.features.items = services.slice(0, max).map((svc, i) => ({
                    title: svc.name,
                    description: svc.description || '',
                    imageUrl: generatedImages[`features.items[${i}].imageUrl`] || data.features.items?.[i]?.imageUrl || '',
                }));
            }
        }

        // ============ TESTIMONIALS (AI Generated) ============
        if (data.testimonials && isOn('testimonials')) {
            data.testimonials.title = t('Testimonios', 'Testimonials');
            data.testimonials.description = t('Opiniones de clientes', 'Customer reviews');
            // Apply AI-generated testimonials
            if (aiContent.testimonials && aiContent.testimonials.length > 0) {
                const maxItems = Math.min(aiContent.testimonials.length, data.testimonials.items?.length || 3);
                data.testimonials.items = aiContent.testimonials.slice(0, maxItems).map((item: any, i: number) => ({
                    ...data.testimonials.items?.[i],
                    quote: item.quote || '',
                    name: item.name || '',
                    title: item.title || '',
                }));
            }
        }

        // ============ TEAM (AI Generated) ============
        if (data.team && isOn('team')) {
            data.team.title = t('Equipo', 'Team');
            data.team.description = t('Nuestro equipo', 'Our team');
            // Apply AI-generated team members with generated images
            if (aiContent.team && aiContent.team.length > 0) {
                const maxItems = Math.min(aiContent.team.length, data.team.items?.length || 4);
                data.team.items = aiContent.team.slice(0, maxItems).map((member: any, i: number) => ({
                    ...data.team.items?.[i],
                    name: member.name || '',
                    role: member.role || '',
                    imageUrl: generatedImages[`team.items[${i}].imageUrl`] || data.team.items?.[i]?.imageUrl || '',
                }));
            } else if (data.team.items) {
                data.team.items.forEach((member: any, i: number) => {
                    if (generatedImages[`team.items[${i}].imageUrl`]) {
                        member.imageUrl = generatedImages[`team.items[${i}].imageUrl`];
                    }
                });
            }
        }

        // ============ PORTFOLIO (AI Generated) ============
        if (data.portfolio && isOn('portfolio')) {
            data.portfolio.title = t('Portafolio', 'Portfolio');
            data.portfolio.description = t('Nuestros trabajos', 'Our work');
            // Apply AI-generated portfolio items with generated images
            if (aiContent.portfolio && aiContent.portfolio.length > 0) {
                const maxItems = Math.min(aiContent.portfolio.length, data.portfolio.items?.length || 6);
                data.portfolio.items = aiContent.portfolio.slice(0, maxItems).map((item: any, i: number) => ({
                    ...data.portfolio.items?.[i],
                    title: item.title || '',
                    description: item.description || '',
                    category: item.category || '',
                    imageUrl: generatedImages[`portfolio.items[${i}].imageUrl`] || data.portfolio.items?.[i]?.imageUrl || '',
                }));
            } else if (data.portfolio.items) {
                data.portfolio.items.forEach((item: any, i: number) => {
                    if (generatedImages[`portfolio.items[${i}].imageUrl`]) {
                        item.imageUrl = generatedImages[`portfolio.items[${i}].imageUrl`];
                    }
                });
            }
        }

        // ============ HOW IT WORKS (AI Generated) ============
        if (data.howItWorks && isOn('howItWorks')) {
            data.howItWorks.title = t('Cómo Funciona', 'How It Works');
            data.howItWorks.description = t('Proceso simple', 'Simple process');
            // Apply AI-generated steps
            if (aiContent.howItWorks && aiContent.howItWorks.length > 0) {
                const maxItems = Math.min(aiContent.howItWorks.length, data.howItWorks.items?.length || 4);
                data.howItWorks.items = aiContent.howItWorks.slice(0, maxItems).map((step: any, i: number) => ({
                    ...data.howItWorks.items?.[i],
                    title: step.title || '',
                    description: step.description || '',
                    icon: data.howItWorks.items?.[i]?.icon || 'process',
                }));
            }
        }

        // ============ PRICING (default: classic) ============
        if (data.pricing && isOn('pricing')) {
            data.pricing.pricingVariant = 'classic'; // Default style: Classic
            data.pricing.title = t('Precios', 'Pricing');
            data.pricing.description = t('Planes disponibles', 'Available plans');
            // Apply AI-generated pricing tiers
            if (aiContent.pricing && aiContent.pricing.length > 0) {
                const maxItems = Math.min(aiContent.pricing.length, data.pricing.tiers?.length || 3);
                data.pricing.tiers = aiContent.pricing.slice(0, maxItems).map((tier: any, i: number) => ({
                    ...data.pricing.tiers?.[i],
                    name: tier.name || '',
                    price: tier.price || '',
                    frequency: tier.frequency || '/mes',
                    description: tier.description || '',
                    features: tier.features || [],
                    featured: tier.featured || false,
                    buttonText: t('Elegir', 'Choose'),
                    buttonLink: '#contact',
                }));
            }
        }

        // ============ FAQ (default: classic) - AI Generated ============
        if (data.faq && isOn('faq')) {
            data.faq.faqVariant = 'classic'; // Default style: Classic
            data.faq.title = t('Preguntas Frecuentes', 'FAQ');
            data.faq.description = t('Respuestas a tus dudas', 'Answers to your questions');
            // Apply AI-generated FAQ items
            if (aiContent.faq && aiContent.faq.length > 0) {
                const maxItems = Math.min(aiContent.faq.length, data.faq.items?.length || 6);
                data.faq.items = aiContent.faq.slice(0, maxItems).map((item: any, i: number) => ({
                    ...data.faq.items?.[i],
                    question: item.question || '',
                    answer: item.answer || '',
                }));
            }
        }

        // ============ CTA ============
        if (data.cta && isOn('cta')) {
            data.cta.headline = t('¿Listo para empezar?', 'Ready to start?');
            data.cta.subheadline = t('Contáctanos hoy', 'Contact us today');
            if (data.cta.buttonText !== undefined) data.cta.buttonText = t('Comenzar', 'Get Started');
            if (generatedImages['cta.backgroundImage']) data.cta.backgroundImage = generatedImages['cta.backgroundImage'];
        }

        // ============ BANNER ============
        if (data.banner && isOn('banner')) {
            data.banner.headline = name;
            data.banner.subheadline = tag;
            if (data.banner.buttonText !== undefined) data.banner.buttonText = t('Ver Más', 'Learn More');
            if (generatedImages['banner.backgroundImageUrl']) data.banner.backgroundImageUrl = generatedImages['banner.backgroundImageUrl'];
        }

        // ============ LEADS (default: floating-glass / Vidrio Flotante) ============
        if (data.leads && isOn('leads')) {
            data.leads.leadsVariant = 'floating-glass'; // Default style: Vidrio Flotante
            data.leads.title = t('Contacto', 'Contact');
            data.leads.description = t('Escríbenos', 'Write to us');
        }

        // ============ NEWSLETTER ============
        if (data.newsletter && isOn('newsletter')) {
            data.newsletter.title = t('Newsletter', 'Newsletter');
            data.newsletter.description = t('Suscríbete', 'Subscribe');
        }

        // ============ MAP ============
        if (data.map && isOn('map') && contact.address) {
            data.map.title = t('Ubicación', 'Location');
            data.map.description = t('Visítanos', 'Visit us');
            data.map.address = [contact.address, contact.city, contact.state].filter(Boolean).join(', ');
        }

        // ============ MENU (default: classic) ============
        if (data.menu && isOn('menu')) {
            data.menu.menuVariant = 'classic'; // Default style: Classic
            data.menu.title = t('Menú', 'Menu');
            data.menu.description = t('Nuestros platos', 'Our dishes');
            // Apply AI-generated menu items with generated images (6 dishes)
            if (aiContent.menu && aiContent.menu.length > 0) {
                const maxItems = Math.min(aiContent.menu.length, data.menu.items?.length || 6, 6);
                data.menu.items = aiContent.menu.slice(0, maxItems).map((item: any, i: number) => ({
                    ...data.menu.items?.[i],
                    name: item.name || '',
                    description: item.description || '',
                    price: item.price || '',
                    category: item.category || '',
                    imageUrl: generatedImages[`menu.items[${i}].imageUrl`] || data.menu.items?.[i]?.imageUrl || '',
                }));
            } else if (data.menu.items) {
                data.menu.items.forEach((item: any, i: number) => {
                    if (generatedImages[`menu.items[${i}].imageUrl`]) {
                        item.imageUrl = generatedImages[`menu.items[${i}].imageUrl`];
                    }
                });
            }
        }

        // ============ SLIDESHOW/GALLERY - AI Generated ============
        if (data.slideshow && isOn('slideshow')) {
            // Use items (correct property name) or slides as fallback
            const existingItems = data.slideshow.items || data.slideshow.slides || [];

            // Apply AI-generated slideshow content with images
            if (aiContent.slideshow && aiContent.slideshow.length > 0) {
                const maxSlides = Math.min(aiContent.slideshow.length, existingItems.length || 5, 5);
                data.slideshow.items = aiContent.slideshow.slice(0, maxSlides).map((slide: any, idx: number) => ({
                    ...existingItems[idx],
                    title: slide.title || '',
                    subtitle: slide.subtitle || '',
                    altText: slide.title || `Gallery image ${idx + 1}`,
                    caption: slide.subtitle || '',
                    ctaText: slide.ctaText || t('Ver Más', 'Learn More'),
                    imageUrl: generatedImages[`slideshow.items[${idx}].imageUrl`] || existingItems[idx]?.imageUrl || '',
                }));
            } else if (existingItems.length > 0) {
                // Just apply images if no AI content
                data.slideshow.items = existingItems.map((item: any, idx: number) => ({
                    ...item,
                    imageUrl: generatedImages[`slideshow.items[${idx}].imageUrl`] || item.imageUrl || '',
                }));
            }
            // Remove slides if it exists (use items instead)
            if (data.slideshow.slides) {
                delete data.slideshow.slides;
            }
        }

        // ============ FOOTER (keep template colors) ============
        if (data.footer) {
            // Keep template colors and style - don't override colors
            data.footer.title = name;
            data.footer.description = desc.substring(0, 150);
            data.footer.copyrightText = `© ${new Date().getFullYear()} ${name}`;

            // Social links
            if (data.footer.socialLinks && contact) {
                const socialLinks: any[] = [];
                if (contact.facebook) socialLinks.push({ platform: 'facebook', href: contact.facebook });
                if (contact.instagram) socialLinks.push({ platform: 'instagram', href: contact.instagram });
                if (contact.twitter) socialLinks.push({ platform: 'twitter', href: contact.twitter });
                if (contact.linkedin) socialLinks.push({ platform: 'linkedin', href: contact.linkedin });
                if (socialLinks.length > 0) data.footer.socialLinks = socialLinks;
            }

            // Contact information (address, phone, email, business hours)
            // Use empty strings instead of undefined to avoid Firestore errors
            if (contact) {
                data.footer.contactInfo = {
                    address: contact.address || '',
                    city: contact.city || '',
                    state: contact.state || '',
                    zipCode: contact.zipCode || '',
                    country: contact.country || '',
                    phone: contact.phone || '',
                    email: contact.email || '',
                    businessHours: contact.businessHours || '',
                };
            }
        }

        return data;
    }, []);

    // =============================================================================
    // FINAL GENERATION
    // =============================================================================

    const startGeneration = useCallback(async () => {
        // Prevent duplicate calls
        if (isGeneratingRef.current) {
            console.warn('⚠️ Generation already in progress, ignoring duplicate call');
            return;
        }

        if (!progress?.selectedTemplateId) {
            setError(t('onboarding.errorNoTemplate'));
            return;
        }

        const selectedTemplate = templates.find((t: Project) => t.id === progress.selectedTemplateId);
        if (!selectedTemplate) {
            setError(t('onboarding.errorTemplateNotFound'));
            return;
        }

        // Lock generation
        isGeneratingRef.current = true;

        if (isDev) {
            console.log('🚀 Starting website generation...');
            console.log('   Business:', progress.businessName);
            console.log('   Industry:', progress.industry);
            console.log('   Template:', selectedTemplate.name);
            console.log('   Enabled components:', progress.enabledComponents);
        }

        // Initialize generation progress
        const generationProgress: GenerationProgress = {
            phase: 'content',
            contentProgress: 0,
            imagesTotal: 0,
            imagesCompleted: 0,
            allImages: [],
            startedAt: Date.now(),
        };

        updateProgress({ generationProgress });

        try {
            // Get enabled components
            const enabledComponents = progress.enabledComponents ||
                Object.keys(selectedTemplate.sectionVisibility || {}).filter(
                    k => selectedTemplate.sectionVisibility?.[k as keyof typeof selectedTemplate.sectionVisibility]
                );

            // Phase 1: Generate AI content FIRST (menu items, team members, portfolio projects, etc.)
            // This content will be used to create contextual image prompts
            if (isDev) console.log('📝 Phase 1: Generating AI content for components...');
            generationProgress.contentProgress = 25;
            updateProgress({ generationProgress: { ...generationProgress } });

            const aiContent = await generateComponentContent(
                enabledComponents,
                progress.businessName,
                progress.industry,
                progress.description || '',
                progress.language
            );
            if (isDev) console.log('📝 AI content generated for:', Object.keys(aiContent));

            generationProgress.contentProgress = 50;
            updateProgress({ generationProgress: { ...generationProgress } });

            // Phase 2: Generate image prompts using AI content for context
            // Now prompts will include specific dish names, project titles, team roles, etc.
            if (isDev) console.log('🖼️ Phase 2: Generating contextual image prompts...');
            const { imagePrompts } = await generateWebsiteContent(aiContent);

            if (isDev) console.log('🖼️ Image prompts:', Object.keys(imagePrompts).length);

            if (Object.keys(imagePrompts).length === 0) {
                console.warn('⚠️ No image prompts! Sections:', Object.keys(selectedTemplate.data || {}));
            }

            generationProgress.contentProgress = 100;
            updateProgress({ generationProgress: { ...generationProgress } });

            // Phase 2: Generate ALL images with correct aspect ratios
            generationProgress.phase = 'images';

            // Create image items with their specific aspect ratios
            const priorityOrder = ['hero', 'heroSplit', 'banner', 'cta'];
            const imageItems: (ImageGenerationItem & { aspectRatio: string; style: string })[] = Object.entries(imagePrompts)
                .map(([key, config], index) => ({
                    id: `img-${index}`,
                    promptKey: key,
                    prompt: config.prompt,
                    aspectRatio: config.aspectRatio,
                    style: config.style,
                    status: 'pending' as const,
                    estimatedTime: 20,
                }))
                .sort((a, b) => {
                    const aIdx = priorityOrder.findIndex(p => a.promptKey.startsWith(p));
                    const bIdx = priorityOrder.findIndex(p => b.promptKey.startsWith(p));
                    if (aIdx === -1 && bIdx === -1) return 0;
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                });

            if (isDev) console.log(`📸 Generating ${imageItems.length} images...`);

            generationProgress.imagesTotal = imageItems.length;
            generationProgress.allImages = imageItems;
            updateProgress({ generationProgress: { ...generationProgress } });

            const generatedImages: Record<string, string> = {};
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const DELAY_BETWEEN = 8000;
            const RATE_LIMIT_WAIT = 40000;

            // Generate ALL images one by one
            for (let i = 0; i < imageItems.length; i++) {
                const item = imageItems[i];
                item.status = 'generating';
                item.startedAt = Date.now();
                generationProgress.currentImage = item;
                updateProgress({ generationProgress: { ...generationProgress } });

                if (i > 0) {
                    if (isDev) console.log(`⏳ Waiting ${DELAY_BETWEEN / 1000}s...`);
                    await delay(DELAY_BETWEEN);
                }

                let success = false;
                let attempts = 0;

                while (!success && attempts < 2) {
                    attempts++;
                    try {
                        console.log(`🎨 [Onboarding] [${i + 1}/${imageItems.length}] Generating: ${item.promptKey} (${item.aspectRatio})`);

                        // Use Imagen 3.0 for onboarding - it's more reliable for pure image generation
                        // Also specify model explicitly to avoid issues with default model
                        const imageUrl = await generateImage(item.prompt, {
                            aspectRatio: item.aspectRatio,
                            style: item.style,
                            resolution: '1K',
                            model: 'gemini-3-pro-image-preview', // Use dedicated image model for reliability
                            personGeneration: 'allow_adult', // Allow people in generated images
                        });

                        if (imageUrl) {
                            item.status = 'completed';
                            item.imageUrl = imageUrl;
                            item.completedAt = Date.now();
                            generatedImages[item.promptKey] = imageUrl;
                            console.log(`✅ [Onboarding] [${i + 1}/${imageItems.length}] Done: ${item.promptKey}`);
                            success = true;
                        } else {
                            throw new Error('No image URL returned from generation');
                        }
                    } catch (err: any) {
                        const msg = err.message || String(err);
                        console.error(`❌ [Onboarding] Attempt ${attempts} failed for ${item.promptKey}:`, msg);

                        if (msg.includes('429') || msg.includes('exceeded') || msg.includes('rate') || msg.includes('quota')) {
                            if (attempts < 2) {
                                console.log(`⏳ [Onboarding] Rate limited. Waiting ${RATE_LIMIT_WAIT / 1000}s before retry...`);
                                await delay(RATE_LIMIT_WAIT);
                            } else {
                                item.status = 'failed';
                                item.error = 'Rate limit exceeded - please try again later';
                                console.warn(`⚠️ [Onboarding] ${item.promptKey} failed after rate limit retries`);
                            }
                        } else {
                            item.status = 'failed';
                            item.error = msg;
                            console.warn(`⚠️ [Onboarding] ${item.promptKey} failed: ${msg}`);
                            break;
                        }
                    }
                }

                generationProgress.imagesCompleted = i + 1;
                generationProgress.allImages = [...imageItems];
                updateProgress({ generationProgress: { ...generationProgress } });
            }

            const successCount = imageItems.filter(img => img.status === 'completed').length;
            if (isDev) console.log(`📊 Images: ${successCount}/${imageItems.length} generated`);

            if (isDev) console.log('📸 All generated images:', Object.keys(generatedImages).length);
            Object.entries(generatedImages).forEach(([key, url]) => {
                console.log(`   ${key}: ${url.substring(0, 60)}...`);
            });

            // Phase 3: Finalize - Apply all data to template
            // AI content was already generated in Phase 1 and used for contextual image prompts
            generationProgress.phase = 'finalizing';
            updateProgress({ generationProgress: { ...generationProgress } });

            if (isDev) console.log('📝 Phase 3: Finalizing with AI content:', Object.keys(aiContent));

            // Apply all business data + AI content + images to template
            const mergedData = applyBusinessDataToTemplate(selectedTemplate.data, progress, generatedImages, aiContent);

            // Apply global colors to ALL components (including ecommerce and chatbot)
            // This ensures consistent styling across the entire project
            const globalColors = selectedTemplate.theme?.globalColors || getDefaultGlobalColors();
            const componentColorMappings = generateComponentColorMappings(globalColors);

            // Apply color mappings to each component in mergedData
            for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
                if (mergedData[componentId] && typeof mergedData[componentId] === 'object') {
                    // Merge colors into existing component data
                    mergedData[componentId] = {
                        ...mergedData[componentId],
                        colors: {
                            ...(mergedData[componentId].colors || {}),
                            ...componentColors
                        }
                    };
                } else if (['chatbot', 'featuredProducts', 'categoryGrid', 'productHero', 'trustBadges',
                    'saleCountdown', 'announcementBar', 'collectionBanner', 'recentlyViewed',
                    'productReviews', 'productBundle', 'storeSettings', 'productDetailPage'].includes(componentId)) {
                    // Create component with colors even if not in template (important for ecommerce and chatbot)
                    mergedData[componentId] = {
                        colors: componentColors
                    };
                }
            }

            if (isDev) console.log('🎨 Applied global colors to all components including ecommerce and chatbot');

            // Geocode the map address if map is enabled and has an address
            if (mergedData.map && mergedData.map.address) {
                if (isDev) console.log('📍 Geocoding map address:', mergedData.map.address);
                const coords = await geocodeAddress(mergedData.map.address);
                if (coords) {
                    mergedData.map.lat = coords.lat;
                    mergedData.map.lng = coords.lng;
                    if (isDev) console.log('📍 Map coordinates set:', coords.lat, coords.lng);
                }
            }

            console.log('✅ All data applied. Images:', Object.keys(generatedImages).length, 'AI sections:', Object.keys(aiContent).length);

            // Create section visibility based on enabled/disabled components
            const sectionVisibility: Record<PageSection, boolean> = { ...selectedTemplate.sectionVisibility };
            progress.enabledComponents?.forEach(comp => {
                sectionVisibility[comp] = true;
            });
            progress.disabledComponents?.forEach(comp => {
                sectionVisibility[comp] = false;
            });

            // Convert image prompts to simple strings for storage
            const simpleImagePrompts: Record<string, string> = {};
            Object.entries(imagePrompts).forEach(([key, config]) => {
                simpleImagePrompts[key] = config.prompt;
            });

            // Build simple navigation menus (using anchor scroll format /#section)
            const isSpanish = progress.language === 'es';
            const projectMenus = [
                {
                    id: 'main', title: 'Main Menu', handle: 'main-menu', items: [
                        { id: 'nav-1', text: isSpanish ? 'Inicio' : 'Home', href: '/', type: 'section' as const },
                        { id: 'nav-2', text: isSpanish ? 'Servicios' : 'Services', href: '/#services', type: 'section' as const },
                        { id: 'nav-3', text: isSpanish ? 'Nosotros' : 'About', href: '/#about', type: 'section' as const },
                        { id: 'nav-4', text: isSpanish ? 'Contacto' : 'Contact', href: '/#contact', type: 'section' as const },
                    ]
                },
                {
                    id: 'footer', title: 'Footer Menu', handle: 'footer-menu', items: [
                        { id: 'f-1', text: isSpanish ? 'Inicio' : 'Home', href: '/', type: 'section' as const },
                        { id: 'f-2', text: isSpanish ? 'Contacto' : 'Contact', href: '/#contact', type: 'section' as const },
                    ]
                }
            ];

            // Generate AI Assistant Configuration based on industry and business data
            if (isDev) console.log('🤖 Generating AI Assistant configuration...');
            const chatbotGlobalColors: GlobalColors = {
                primary: globalColors.primary,
                secondary: globalColors.secondary,
                accent: globalColors.accent,
                background: globalColors.background,
                surface: globalColors.surface,
                text: globalColors.text,
                border: globalColors.border,
            };
            const aiAssistantConfig = generateAiAssistantConfig(progress, chatbotGlobalColors);
            if (isDev) console.log('✅ AI Assistant config generated:', aiAssistantConfig.agentName);

            // Generate pages for multi-page architecture
            const projectPages: SitePage[] = generatePagesFromLegacyProject(
                selectedTemplate.componentOrder,
                sectionVisibility,
                mergedData
            );
            if (isDev) console.log('📄 Generated pages for multi-page architecture:', projectPages.length);

            // Create the new project
            const newProject = {
                id: `proj_${Date.now()}`,
                name: progress.businessName,
                thumbnailUrl: generatedImages['hero.imageUrl'] || selectedTemplate.thumbnailUrl,
                status: 'Draft' as const,
                lastUpdated: new Date().toISOString(),
                data: mergedData,
                theme: selectedTemplate.theme,
                brandIdentity: {
                    name: progress.businessName,
                    industry: progress.industry,
                    targetAudience: 'General',
                    toneOfVoice: 'Professional' as const,
                    coreValues: progress.description?.substring(0, 100) || '',
                    language: progress.language === 'es' ? 'Spanish' : 'English',
                },
                componentOrder: selectedTemplate.componentOrder,
                sectionVisibility,
                pages: projectPages, // Multi-page architecture
                sourceTemplateId: selectedTemplate.id,
                imagePrompts: simpleImagePrompts,
                menus: projectMenus,
                aiAssistantConfig, // Add the generated AI Assistant configuration
            };

            await addNewProject(newProject);

            // Setup ecommerce if enabled
            if (progress.hasEcommerce && progress.storeSetup && user?.uid) {
                if (isDev) console.log('🛒 Setting up ecommerce store...');

                try {
                    // Enable ecommerce for the project (correct path: users/{userId}/projects/{projectId}/ecommerce/config)
                    const ecommerceConfigRef = doc(db, 'users', user.uid, 'projects', newProject.id, 'ecommerce', 'config');
                    await setDoc(ecommerceConfigRef, {
                        projectId: newProject.id,
                        projectName: newProject.name,
                        ecommerceEnabled: true,
                        storeId: newProject.id, // Use projectId as storeId
                        storeName: progress.storeSetup.storeName || progress.businessName,
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    });

                    // Create the main store document (required by useProjectEcommerce)
                    const storeRef = doc(db, 'users', user.uid, 'stores', newProject.id);
                    await setDoc(storeRef, {
                        name: progress.storeSetup.storeName || `Tienda - ${progress.businessName}`,
                        projectId: newProject.id,
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                        isActive: true,
                        ownerId: user.uid,
                    });
                    if (isDev) console.log('🏪 Created main store document');

                    // Build storefrontTheme from project's globalColors
                    const storefrontTheme = {
                        // Core Colors - from project's globalColors
                        primaryColor: globalColors.primary,
                        secondaryColor: globalColors.secondary,
                        accentColor: globalColors.accent,
                        // Background Colors
                        backgroundColor: globalColors.background,
                        cardBackground: globalColors.surface,
                        headerBackground: globalColors.primary,
                        footerBackground: globalColors.surface,
                        // Text Colors
                        textColor: globalColors.text,
                        headingColor: globalColors.heading,
                        mutedTextColor: globalColors.textMuted,
                        linkColor: globalColors.primary,
                        // Button Colors
                        buttonBackground: globalColors.primary,
                        buttonText: '#ffffff',
                        buttonSecondaryBackground: globalColors.surface,
                        buttonSecondaryText: globalColors.text,
                        buttonHoverBackground: globalColors.secondary,
                        // Badge Colors
                        badgeBackground: globalColors.primary,
                        badgeText: '#ffffff',
                        saleBadgeBackground: globalColors.error,
                        saleBadgeText: '#ffffff',
                        // Price Colors
                        priceColor: globalColors.heading,
                        salePriceColor: globalColors.error,
                        originalPriceColor: globalColors.textMuted,
                        // Overlay Colors
                        overlayStart: 'transparent',
                        overlayEnd: 'rgba(0,0,0,0.7)',
                        // Border Colors
                        borderColor: globalColors.border,
                        dividerColor: globalColors.border,
                        inputBorderColor: globalColors.border,
                        // State Colors
                        successColor: globalColors.success,
                        warningColor: globalColors.accent,
                        errorColor: globalColors.error,
                        infoColor: globalColors.primary,
                        // Cart & Checkout
                        cartBadgeBackground: globalColors.error,
                        cartBadgeText: '#ffffff',
                        checkoutAccent: globalColors.primary,
                        // Typography - from template theme
                        fontFamily: selectedTemplate.theme?.fontFamilyBody || 'Inter, system-ui, sans-serif',
                        headingFontFamily: selectedTemplate.theme?.fontFamilyHeader || 'Inter, system-ui, sans-serif',
                    };

                    // Initialize store settings with storefrontTheme
                    const storeSettingsRef = doc(db, 'users', user.uid, 'stores', newProject.id, 'settings', 'store');
                    await setDoc(storeSettingsRef, {
                        storeName: progress.storeSetup.storeName || progress.businessName,
                        storeEmail: progress.contactInfo?.email || '',
                        currency: progress.storeSetup.currency,
                        currencySymbol: progress.storeSetup.currencySymbol,
                        taxEnabled: false,
                        taxRate: 0,
                        taxName: 'IVA',
                        taxIncluded: false,
                        shippingZones: [],
                        freeShippingThreshold: 0,
                        stripeEnabled: false,
                        paypalEnabled: false,
                        cashOnDeliveryEnabled: true,
                        lowStockNotifications: true,
                        lowStockThreshold: 5,
                        notifyOnNewOrder: true,
                        notifyOnLowStock: true,
                        sendOrderConfirmation: true,
                        sendShippingNotification: true,
                        requirePhone: false,
                        requireShippingAddress: progress.storeSetup.shippingType !== 'digital_only',
                        storefrontTheme, // Include the theme from project's globalColors
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    });

                    // Create categories
                    if (progress.storeSetup.selectedCategories && progress.storeSetup.selectedCategories.length > 0) {
                        for (let i = 0; i < progress.storeSetup.selectedCategories.length; i++) {
                            const categoryName = progress.storeSetup.selectedCategories[i];
                            const categoryId = `cat-${Date.now()}-${i}`;
                            const categoryRef = doc(db, 'users', user.uid, 'stores', newProject.id, 'categories', categoryId);
                            await setDoc(categoryRef, {
                                id: categoryId,
                                name: categoryName,
                                slug: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                                description: '',
                                imageUrl: '',
                                order: i,
                                isActive: true,
                                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                            });
                        }
                        if (isDev) console.log(`🏷️ Created ${progress.storeSetup.selectedCategories.length} categories`);
                    }

                    // Create publicStores document with storefrontTheme from project's globalColors
                    // This enables the storefront to use the same colors as the project
                    const publicStoreRef = doc(db, 'publicStores', newProject.id);
                    await setDoc(publicStoreRef, {
                        storeId: newProject.id,
                        storeName: progress.storeSetup.storeName || progress.businessName,
                        ownerId: user.uid,
                        isActive: true,
                        storefrontTheme,
                        theme: {
                            primaryColor: globalColors.primary,
                            secondaryColor: globalColors.secondary,
                            accentColor: globalColors.accent,
                            backgroundColor: globalColors.background,
                            textColor: globalColors.text,
                            headingColor: globalColors.heading,
                            fontFamily: selectedTemplate.theme?.fontFamilyBody || 'Inter, system-ui, sans-serif',
                        },
                        currencySymbol: progress.storeSetup.currencySymbol,
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                    });

                    if (isDev) console.log('🎨 Created publicStores document with storefrontTheme from project globalColors');

                    if (isDev) console.log('✅ Ecommerce store setup complete');
                } catch (ecommerceErr) {
                    console.error('❌ Failed to setup ecommerce:', ecommerceErr);
                    // Don't fail the whole generation, just log the error
                }
            }

            // Complete
            generationProgress.phase = 'completed';
            generationProgress.completedAt = Date.now();
            updateProgress({
                generationProgress: { ...generationProgress },
                generatedProjectId: newProject.id,
            });

            // Unlock generation
            isGeneratingRef.current = false;

            // Wait a bit so the user can see the "Success" state
            await new Promise(resolve => setTimeout(resolve, 2500));

            // Close onboarding modal first to prevent re-renders when progress is cleared
            setIsOnboardingOpen(false);

            // Clear onboarding progress
            await clearProgress();

            // The project is already loaded and navigated to by addNewProject()
            // but we call it again just to be absolutely sure and handle any edge cases
            await loadProject(newProject.id, false, true);
        } catch (err: any) {
            console.error('Generation failed:', err);
            generationProgress.phase = 'error';
            generationProgress.error = err.message || 'Generation failed';
            updateProgress({ generationProgress: { ...generationProgress } });
            setError(t('onboarding.errorGeneration'));

            // Unlock generation on error
            isGeneratingRef.current = false;
        }
    }, [progress, templates, user, generateWebsiteContent, generateComponentContent, generateImage, addNewProject, loadProject, clearProgress, updateProgress, setIsOnboardingOpen, applyBusinessDataToTemplate, t]);

    // =============================================================================
    // RETURN
    // =============================================================================

    return {
        // State
        progress,
        isLoading,
        isSaving,
        error,
        templates,

        // Ecommerce State
        suggestedCategories,
        isLoadingCategories,

        // Website Analysis State
        isAnalyzingWebsite,

        // Actions
        openOnboarding,
        resetOnboarding,

        // Navigation
        goToStep,
        nextStep,
        previousStep,
        canGoNext,
        canGoPrevious,

        // Data Updates
        updateBusinessInfo,
        updateDescription,
        updateServices,
        updateTemplateSelection,
        updateContactInfo,
        updateLanguage: (language: string) => updateProgress({ language }),

        // Ecommerce Updates
        updateEcommerceSettings,
        updateStoreSetup,

        // Website Analysis (Step 0)
        analyzeWebsite,
        skipWebsiteAnalysis,

        // AI Assistance
        generateDescription,
        generateServices,
        getTemplateRecommendation,
        generateSuggestedCategories,

        // Final Generation
        startGeneration,

        // Persistence
        saveProgress,
        loadProgress,
        clearProgress,
    };

};

export default useOnboarding;
