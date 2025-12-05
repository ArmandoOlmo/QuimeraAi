/**
 * useOnboarding Hook
 * Manages onboarding state, persistence, and AI generation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useEditor } from '../../../contexts/EditorContext';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';

// Development mode check for conditional logging
const isDev = import.meta.env.DEV;

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
            .replace(/```[\s\S]*?```/g, '') // Remove all code blocks
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
import {
    OnboardingProgress,
    OnboardingStep,
    OnboardingService,
    OnboardingContactInfo,
    TemplateRecommendation,
    GenerationProgress,
    ImageGenerationItem,
    getIndustryComponentDefaults,
    ONBOARDING_STEPS,
} from '../../../types/onboarding';
import { PageSection, Project } from '../../../types';

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialProgress = (language: string): OnboardingProgress => ({
    step: ONBOARDING_STEPS.BUSINESS_INFO,
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
        setIsOnboardingOpen,
    } = useEditor();

    // State (isOpen is managed by EditorContext, not here)
    const [progress, setProgress] = useState<OnboardingProgress | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Templates from Firestore (loaded from EditorContext projects with status 'Template')
    const templates = projects.filter((p: Project) => p.status === 'Template');

    // Ref to track if we've loaded progress
    const hasLoadedProgress = useRef(false);

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

    // =============================================================================
    // MODAL CONTROL
    // =============================================================================

    const openOnboarding = useCallback(() => {
        if (!progress) {
            setProgress(createInitialProgress(i18n.language));
        }
    }, [progress, i18n.language]);

    const resetOnboarding = useCallback(async () => {
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

    const nextStep = useCallback(() => {
        if (!progress || progress.step >= 6) return;
        goToStep((progress.step + 1) as OnboardingStep);
    }, [progress, goToStep]);

    const previousStep = useCallback(() => {
        if (!progress || progress.step <= 1) return;
        goToStep((progress.step - 1) as OnboardingStep);
    }, [progress, goToStep]);

    const canGoNext = useCallback(() => {
        if (!progress) return false;
        switch (progress.step) {
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
                return false; // Generation step doesn't have next
            default:
                return false;
        }
    }, [progress]);

    const canGoPrevious = useCallback(() => {
        if (!progress) return false;
        return progress.step > 1;
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
    // AI ASSISTANCE
    // =============================================================================

    const generateDescription = useCallback(async (): Promise<string> => {
        if (!progress?.businessName || !progress?.industry) {
            throw new Error('Business name and industry are required');
        }

        const prompt = `You are a professional copywriter. Generate a compelling business description for:

Business Name: ${progress.businessName}
Industry: ${progress.industry}
Language: ${progress.language === 'es' ? 'Spanish' : 'English'}

Requirements:
- Write 2-3 paragraphs
- Be professional but engaging
- Highlight unique value propositions
- Include a call to action
- Output ONLY the description text, no JSON or markdown

Generate the description:`;

        try {
            const response = await generateContentViaProxy(
                'onboarding-gen',
                prompt,
                'gemini-2.5-flash',
                {},
                user?.uid
            );
            const text = extractTextFromResponse(response);
            return text.trim();
        } catch (err) {
            console.error('Failed to generate description:', err);
            throw err;
        }
    }, [progress, user]);

    const generateServices = useCallback(async (): Promise<OnboardingService[]> => {
        if (!progress?.businessName || !progress?.industry) {
            throw new Error('Business name and industry are required');
        }

        const prompt = `You are a business consultant. Generate a list of services/products for:

Business Name: ${progress.businessName}
Industry: ${progress.industry}
Description: ${progress.description || 'Not provided'}
Language: ${progress.language === 'es' ? 'Spanish' : 'English'}

Requirements:
- Generate 4-6 relevant services or products
- Each should have a name and brief description
- Be specific to the industry
- Output as JSON array with format: [{"name": "Service Name", "description": "Brief description"}]

Generate the services:`;

        try {
            const response = await generateContentViaProxy(
                'onboarding-gen',
                prompt,
                'gemini-2.5-flash',
                {},
                user?.uid
            );
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
    }, [progress, user]);

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
            const theme = t.theme || {};
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

        const prompt = `You are a web design expert selecting the PERFECT template for a specific business.

IMPORTANT: Carefully analyze ALL ${templates.length} templates before deciding. Do NOT default to the first option.

BUSINESS DETAILS:
- Name: "${progress.businessName}"
- Industry: ${progress.industry}
- Description: ${progress.description || 'General business'}
- Services: ${progress.services?.map(s => s.name).join(', ') || 'Various services'}

IDEAL COLOR PALETTE for ${progress.industry} businesses: ${colorPref}

ANALYZE ALL ${templates.length} TEMPLATES:
${shuffledSummary.map(t => `
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
`).join('')}

SELECTION RULES:
1. PRIORITIZE templates that list "${progress.industry}" in their industries
2. Match color mood to business personality (${colorPref})
3. Ensure template has the components this business needs
4. Consider visual style appropriate for the industry

DO NOT always pick the same template. Each business is unique.

Return ONLY valid JSON:
{
  "templateId": "the-exact-template-id",
  "templateName": "Template Name",
  "matchScore": 75-95,
  "matchReasons": ["industry reason", "color reason", "component reason"]
}`;

        try {
            const response = await generateContentViaProxy(
                user?.uid || 'onboarding-gen',
                'onboarding-gen',
                prompt,
                { temperature: 0.7, maxTokens: 600 } // Higher temp for variety
            );
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
    }, [progress, templates, user]);

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
    const generateImagePrompts = useCallback((
        templateData: any, 
        businessName: string, 
        industry: string, 
        enabledComponents: string[]
    ): Record<string, { prompt: string; aspectRatio: string; style: string }> => {
        const prompts: Record<string, { prompt: string; aspectRatio: string; style: string }> = {};
        const ind = industry?.replace(/-/g, ' ') || 'business';
        
        // Consistent style for ALL images in this project
        const visualStyle = getIndustryStyle(industry);
        const noText = 'no text, no words, no letters, no watermark, no logos';
        const consistency = `consistent style, ${visualStyle}, cohesive visual identity`;
        
        // Helper to check if component is enabled
        const isEnabled = (comp: string) => enabledComponents.includes(comp);
        
        // HERO - main image (16:9 wide)
        if (templateData.hero && isEnabled('hero')) {
            prompts['hero.imageUrl'] = {
                prompt: `${ind} business hero scene, ${consistency}, professional photography, ${noText}`,
                aspectRatio: IMAGE_CONFIG['hero'].aspectRatio,
                style: 'Photorealistic'
            };
        }
        
        // HERO SPLIT (3:4 vertical)
        if (templateData.heroSplit && isEnabled('heroSplit')) {
            prompts['heroSplit.imageUrl'] = {
                prompt: `${ind} vertical composition, ${consistency}, modern professional, ${noText}`,
                aspectRatio: IMAGE_CONFIG['heroSplit'].aspectRatio,
                style: 'Photorealistic'
            };
        }
        
        // BANNER (21:9 ultra-wide)
        if (templateData.banner && isEnabled('banner')) {
            prompts['banner.backgroundImageUrl'] = {
                prompt: `${ind} panoramic scene, ${consistency}, elegant wide view, ${noText}`,
                aspectRatio: IMAGE_CONFIG['banner'].aspectRatio,
                style: 'Photorealistic'
            };
        }
        
        // CTA background (16:9)
        if (templateData.cta?.backgroundImage !== undefined && isEnabled('cta')) {
            prompts['cta.backgroundImage'] = {
                prompt: `Abstract ${ind} background, ${consistency}, subtle elegant, ${noText}`,
                aspectRatio: IMAGE_CONFIG['cta'].aspectRatio,
                style: 'Photorealistic'
            };
        }
        
        // FEATURES items (1:1 square)
        if (templateData.features?.items && isEnabled('features')) {
            const count = Math.min(templateData.features.items.length, 6);
            for (let i = 0; i < count; i++) {
                prompts[`features.items[${i}].imageUrl`] = {
                    prompt: `${ind} concept illustration ${i + 1}, ${consistency}, clean minimal, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['features'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }
        
        // TEAM members (1:1 square portraits) - INDUSTRY-SPECIFIC
        if (templateData.team?.items && isEnabled('team')) {
            // Define team member descriptions based on industry
            const getTeamPrompt = (industry: string, memberIndex: number): string => {
                const teamStyles: Record<string, string[]> = {
                    'beauty-spa': [
                        'Female hair stylist with elegant makeup, holding scissors, salon setting',
                        'Female makeup artist with beauty tools, glamorous professional',
                        'Female esthetician in spa uniform, serene expression',
                        'Male hair colorist with modern style, creative professional',
                        'Female nail technician, artistic and friendly',
                        'Spa therapist in white uniform, calming presence'
                    ],
                    'restaurant': [
                        'Professional chef in white uniform and chef hat, kitchen background',
                        'Sous chef with cooking utensils, passionate about food',
                        'Restaurant manager in elegant attire, welcoming smile',
                        'Sommelier with wine glass, sophisticated',
                        'Pastry chef with desserts, creative culinary artist',
                        'Head waiter in formal uniform, professional service'
                    ],
                    'cafe': [
                        'Barista with coffee cup, artistic latte, friendly smile',
                        'Coffee shop owner, casual professional, warm personality',
                        'Baker with fresh pastries, artisan style',
                        'Cafe manager, welcoming and approachable',
                    ],
                    'fitness-gym': [
                        'Athletic personal trainer in sportswear, muscular and fit',
                        'Female fitness coach with workout gear, energetic',
                        'Yoga instructor in athletic wear, zen and balanced',
                        'CrossFit coach, strong and motivating',
                        'Nutritionist in gym attire, healthy and vibrant',
                        'Gym manager, athletic and professional'
                    ],
                    'healthcare': [
                        'Doctor in white coat with stethoscope, caring expression',
                        'Female nurse in medical scrubs, compassionate',
                        'Medical specialist, professional and trustworthy',
                        'Healthcare administrator, organized and friendly',
                    ],
                    'technology': [
                        'Software engineer, casual tech attire, modern office',
                        'Female developer with laptop, innovative and smart',
                        'Tech lead, confident and knowledgeable',
                        'UX designer, creative and thoughtful',
                        'Data scientist, analytical and focused',
                        'CTO in smart casual, visionary leader'
                    ],
                    'legal': [
                        'Attorney in formal suit, authoritative and trustworthy',
                        'Female lawyer in business attire, confident professional',
                        'Senior partner in elegant office, experienced',
                        'Legal consultant, approachable yet professional',
                    ],
                    'real-estate': [
                        'Real estate agent in business attire, friendly and successful',
                        'Female realtor with house keys, warm and professional',
                        'Property manager, organized and reliable',
                        'Broker in upscale attire, experienced professional',
                    ],
                    'photography': [
                        'Photographer with camera, artistic and creative',
                        'Female photographer in casual style, passionate',
                        'Photo editor, creative professional',
                        'Studio manager, organized and artistic',
                    ],
                    'construction': [
                        'Construction manager with hard hat, experienced leader',
                        'Architect with blueprints, creative professional',
                        'Engineer with safety vest, technical expert',
                        'Project supervisor, reliable and strong',
                    ],
                    'education': [
                        'Teacher with books, friendly and knowledgeable',
                        'Female professor, approachable educator',
                        'School administrator, organized and caring',
                        'Tutor, patient and helpful',
                    ],
                    'consulting': [
                        'Business consultant in formal suit, confident advisor',
                        'Female consultant with tablet, strategic thinker',
                        'Senior consultant, experienced mentor',
                        'Management advisor, professional and insightful',
                    ],
                };
                
                const industryKey = industry?.toLowerCase().replace(/\s+/g, '-') || 'default';
                const teamDescriptions = teamStyles[industryKey] || [
                    'Professional team member, business casual attire, friendly',
                    'Company employee, approachable and competent',
                    'Team specialist, dedicated professional',
                    'Staff member, helpful and skilled',
                ];
                
                return teamDescriptions[memberIndex % teamDescriptions.length];
            };
            
            const count = Math.min(templateData.team.items.length, 6);
            for (let i = 0; i < count; i++) {
                const teamDescription = getTeamPrompt(industry, i);
                prompts[`team.items[${i}].imageUrl`] = {
                    prompt: `Professional headshot portrait: ${teamDescription}, ${consistency}, neutral studio background, natural lighting, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['team'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }
        
        // PORTFOLIO items (4:3 landscape)
        if (templateData.portfolio?.items && isEnabled('portfolio')) {
            const count = Math.min(templateData.portfolio.items.length, 6);
            for (let i = 0; i < count; i++) {
                prompts[`portfolio.items[${i}].imageUrl`] = {
                    prompt: `${ind} project showcase ${i + 1}, ${consistency}, professional work, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['portfolio'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }
        
        // MENU items (1:1 food photos)
        if (templateData.menu?.items && isEnabled('menu')) {
            const count = Math.min(templateData.menu.items.length, 8);
            for (let i = 0; i < count; i++) {
                prompts[`menu.items[${i}].imageUrl`] = {
                    prompt: `Delicious dish, ${consistency}, professional food photography, appetizing, ${noText}`,
                    aspectRatio: IMAGE_CONFIG['menu'].aspectRatio,
                    style: 'Photorealistic'
                };
            }
        }
        
        // SLIDESHOW slides (16:9 wide)
        if (templateData.slideshow?.slides && isEnabled('slideshow')) {
            const count = Math.min(templateData.slideshow.slides.length, 5);
            for (let i = 0; i < count; i++) {
                prompts[`slideshow.slides[${i}].imageUrl`] = {
                    prompt: `${ind} showcase scene ${i + 1}, ${consistency}, professional quality, ${noText}`,
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

    const generateWebsiteContent = useCallback(async (): Promise<{
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

        // Generate image prompts only for enabled components
        const imagePrompts = generateImagePrompts(
            selectedTemplate.data,
            progress.businessName,
            progress.industry,
            enabledComponents
        );
        
        if (isDev) console.log('📸 Image prompts to generate:', Object.keys(imagePrompts).length);

        return {
            content: {},
            imagePrompts,
        };
    }, [progress, templates, generateImagePrompts]);

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
        const needsGeneration = ['testimonials', 'team', 'portfolio', 'pricing', 'howItWorks', 'menu'];
        const toGenerate = needsGeneration.filter(c => enabledComponents.includes(c));
        
        if (toGenerate.length === 0) {
            if (isDev) console.log('📝 No components need AI content generation');
            return content;
        }
        
        if (isDev) console.log('📝 Generating AI content for:', toGenerate);
        
        const prompt = `Generate realistic content for a ${ind} business called "${businessName}".
Business description: ${description}
Language: ${isSpanish ? 'Spanish' : 'English'}

Generate ONLY for these sections: ${toGenerate.join(', ')}

Return JSON with this exact structure (only include sections that were requested):
{
  ${toGenerate.includes('testimonials') ? `"testimonials": [
    { "quote": "short testimonial 1", "name": "Customer Name", "title": "Role/Company" },
    { "quote": "short testimonial 2", "name": "Customer Name", "title": "Role/Company" },
    { "quote": "short testimonial 3", "name": "Customer Name", "title": "Role/Company" }
  ],` : ''}
  ${toGenerate.includes('team') ? `"team": [
    { "name": "Team Member 1", "role": "Position" },
    { "name": "Team Member 2", "role": "Position" },
    { "name": "Team Member 3", "role": "Position" }
  ],` : ''}
  ${toGenerate.includes('portfolio') ? `"portfolio": [
    { "title": "Project 1", "description": "Brief description", "category": "Category" },
    { "title": "Project 2", "description": "Brief description", "category": "Category" },
    { "title": "Project 3", "description": "Brief description", "category": "Category" }
  ],` : ''}
  ${toGenerate.includes('pricing') ? `"pricing": [
    { "name": "Basic", "price": "$XX", "frequency": "/month", "features": ["Feature 1", "Feature 2", "Feature 3"], "featured": false },
    { "name": "Pro", "price": "$XX", "frequency": "/month", "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"], "featured": true },
    { "name": "Enterprise", "price": "$XX", "frequency": "/month", "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"], "featured": false }
  ],` : ''}
  ${toGenerate.includes('howItWorks') ? `"howItWorks": [
    { "title": "Step 1", "description": "Brief description" },
    { "title": "Step 2", "description": "Brief description" },
    { "title": "Step 3", "description": "Brief description" }
  ],` : ''}
  ${toGenerate.includes('menu') ? `"menu": [
    { "name": "Item 1", "description": "Description", "price": "$X.XX", "category": "Category" },
    { "name": "Item 2", "description": "Description", "price": "$X.XX", "category": "Category" },
    { "name": "Item 3", "description": "Description", "price": "$X.XX", "category": "Category" },
    { "name": "Item 4", "description": "Description", "price": "$X.XX", "category": "Category" }
  ],` : ''}
}

Keep all text SHORT and CONCISE. Return ONLY valid JSON.`;

        try {
            const response = await generateContentViaProxy(
                user?.uid || 'onboarding-gen',
                'onboarding-gen',
                prompt,
                { temperature: 0.7, maxTokens: 2000 }
            );
            
            const text = extractTextFromResponse(response);
            const parsed = safeJsonParse(text, {});
            
            if (isDev) console.log('📝 AI generated content:', Object.keys(parsed));
            return parsed;
        } catch (err) {
            console.error('❌ Failed to generate component content:', err);
            return {};
        }
    }, [user]);

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
        
        // ============ FEATURES (default: classic) ============
        if (data.features && isOn('features')) {
            data.features.featuresVariant = 'classic'; // Default style: Classic
            data.features.title = t('Características', 'Features');
            data.features.description = t('Por qué elegirnos', 'Why choose us');
            if (data.features.items && services.length > 0) {
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
        
        // ============ FAQ (default: classic) ============
        if (data.faq && isOn('faq')) {
            data.faq.faqVariant = 'classic'; // Default style: Classic
            // Keep template FAQ content as-is, user can edit later
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
            // Apply AI-generated menu items with generated images
            if (aiContent.menu && aiContent.menu.length > 0) {
                const maxItems = Math.min(aiContent.menu.length, data.menu.items?.length || 8);
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
        
        // ============ SLIDESHOW ============
        if (data.slideshow && data.slideshow.slides) {
            data.slideshow.slides.forEach((slide: any, idx: number) => {
                if (generatedImages[`slideshow.slides[${idx}].imageUrl`]) {
                    slide.imageUrl = generatedImages[`slideshow.slides[${idx}].imageUrl`];
                }
            });
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
        }
        
        return data;
    }, []);

    // =============================================================================
    // FINAL GENERATION
    // =============================================================================

    // Ref to prevent duplicate generation
    const isGeneratingRef = useRef(false);

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
            // Phase 1: Generate prompts
            generationProgress.contentProgress = 50;
            updateProgress({ generationProgress: { ...generationProgress } });

            const { imagePrompts } = await generateWebsiteContent();
            
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
                    if (isDev) console.log(`⏳ Waiting ${DELAY_BETWEEN/1000}s...`);
                    await delay(DELAY_BETWEEN);
                }

                let success = false;
                let attempts = 0;

                while (!success && attempts < 2) {
                    attempts++;
                    try {
                        if (isDev) console.log(`🎨 [${i + 1}/${imageItems.length}] ${item.promptKey} (${item.aspectRatio})`);
                        
                        // Use the correct aspect ratio for this component
                        const imageUrl = await generateImage(item.prompt, {
                            aspectRatio: item.aspectRatio,
                            style: item.style,
                            resolution: '1K',
                        });

                        if (imageUrl) {
                            item.status = 'completed';
                            item.imageUrl = imageUrl;
                            item.completedAt = Date.now();
                            generatedImages[item.promptKey] = imageUrl;
                            if (isDev) console.log(`✅ [${i + 1}/${imageItems.length}] Done: ${item.promptKey}`);
                            success = true;
                        } else {
                            throw new Error('No URL');
                        }
                    } catch (err: any) {
                        const msg = err.message || String(err);
                        console.error(`❌ Attempt ${attempts} failed:`, msg);
                        
                        if (msg.includes('429') || msg.includes('exceeded') || msg.includes('rate')) {
                            if (attempts < 2) {
                                if (isDev) console.log(`⏳ Rate limited. Waiting ${RATE_LIMIT_WAIT/1000}s...`);
                                await delay(RATE_LIMIT_WAIT);
                            } else {
                                item.status = 'failed';
                                item.error = 'Rate limited';
                            }
                        } else {
                            item.status = 'failed';
                            item.error = msg;
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

            // Phase 3: Generate AI content for components
            generationProgress.phase = 'finalizing';
            updateProgress({ generationProgress: { ...generationProgress } });

            // Get enabled components
            const enabledComponents = progress.enabledComponents || 
                Object.keys(selectedTemplate.sectionVisibility || {}).filter(
                    k => selectedTemplate.sectionVisibility?.[k as keyof typeof selectedTemplate.sectionVisibility]
                );

            // Generate AI content for components that need it
            console.log('📝 Generating AI content for components...');
            const aiContent = await generateComponentContent(
                enabledComponents,
                progress.businessName,
                progress.industry,
                progress.description || '',
                progress.language
            );
            console.log('📝 AI content generated for:', Object.keys(aiContent));

            // Apply all business data + AI content + images to template
            const mergedData = applyBusinessDataToTemplate(selectedTemplate.data, progress, generatedImages, aiContent);
            
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
                sourceTemplateId: selectedTemplate.id,
                imagePrompts: simpleImagePrompts,
            };

            await addNewProject(newProject);

            // Complete
            generationProgress.phase = 'completed';
            generationProgress.completedAt = Date.now();
            updateProgress({ 
                generationProgress: { ...generationProgress },
                generatedProjectId: newProject.id,
            });

            // Clear onboarding progress and load the new project
            await clearProgress();
            await loadProject(newProject.id, false, false);
            setIsOnboardingOpen(false);
            
            // Unlock generation
            isGeneratingRef.current = false;

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

        // AI Assistance
        generateDescription,
        generateServices,
        getTemplateRecommendation,

        // Final Generation
        startGeneration,

        // Persistence
        saveProgress,
        loadProgress,
        clearProgress,
    };
};

export default useOnboarding;
