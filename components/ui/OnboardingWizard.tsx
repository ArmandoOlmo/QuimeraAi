
import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import Modal from './Modal';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { Sparkles, ArrowRight, Wand2, Palette, Type, Layout, Loader2, X, Briefcase, Target, Layers, Gem, Monitor, PenTool, Leaf, Megaphone, Smile, Building2, Package, Phone, Image as ImageIcon, Star, Plus, Trash2, Rocket, CheckCircle } from 'lucide-react';
import GeneratingState from './GeneratingState';
import GuidedTour from './GuidedTour';
import { initialData } from '../../data/initialData';
import { OnboardingStep, AestheticType, ProductInfo, TestimonialInfo, ContactInfo } from '../../types';
import { trackOnboardingStarted, trackOnboardingCompleted, trackProjectCreated } from '../../utils/analytics';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- UI Helper Components ---

interface InputLabelProps {
    label: string;
    onAiAssist?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
}

const InputLabel = ({ label, onAiAssist, isLoading, disabled }: InputLabelProps) => (
    <div className="flex justify-between items-center mb-1.5">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        {onAiAssist && (
            <button 
                onClick={onAiAssist}
                disabled={disabled || isLoading}
                className="text-[10px] flex items-center text-yellow-400 hover:text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? <Loader2 size={10} className="animate-spin mr-1"/> : <Sparkles size={10} className="mr-1"/>}
                AI Assist
            </button>
        )}
    </div>
);

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className="w-full bg-[#130a1d] border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
    />
);

const TextAreaField = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea 
        {...props} 
        className="w-full bg-[#130a1d] border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all resize-none"
    />
);

// Explicit styles mapping for aesthetic cards to ensure reliability
const AESTHETIC_STYLES: Record<AestheticType, { border: string, bg: string, iconBg: string, iconColor: string }> = {
    'Minimalist': { border: 'border-gray-500/50', bg: 'bg-gray-500/10', iconBg: 'bg-gray-500', iconColor: 'text-white' },
    'Bold': { border: 'border-red-500/50', bg: 'bg-red-900/20', iconBg: 'bg-red-500', iconColor: 'text-white' },
    'Elegant': { border: 'border-purple-400/50', bg: 'bg-purple-900/20', iconBg: 'bg-purple-400', iconColor: 'text-white' },
    'Playful': { border: 'border-yellow-400/50', bg: 'bg-yellow-900/20', iconBg: 'bg-yellow-400', iconColor: 'text-black' },
    'Tech': { border: 'border-cyan-400/50', bg: 'bg-cyan-900/20', iconBg: 'bg-cyan-400', iconColor: 'text-black' },
    'Organic': { border: 'border-green-500/50', bg: 'bg-green-900/20', iconBg: 'bg-green-500', iconColor: 'text-white' },
};

const OptionCard = ({ 
    selected, 
    onClick, 
    title, 
    description, 
    icon: Icon,
    aestheticType 
}: { 
    selected: boolean, 
    onClick: () => void, 
    title: string, 
    description: string, 
    icon: any,
    aestheticType: AestheticType 
}) => {
    const styles = AESTHETIC_STYLES[aestheticType];
    
    return (
        <button 
            onClick={onClick}
            className={`
                relative p-4 rounded-xl border text-left transition-all duration-300 group h-full flex flex-col
                ${selected 
                    ? `${styles.bg} ${styles.border} ring-1 ring-white/20` 
                    : 'bg-[#130a1d] border-white/10 hover:border-white/30'
                }
            `}
        >
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors
                ${selected ? styles.iconBg : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'}
            `}>
                <Icon size={20} className={selected ? styles.iconColor : ''} />
            </div>
            <h3 className="text-white font-bold mb-1">{title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
            
            {selected && (
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${styles.iconBg} shadow-[0_0_10px_currentColor]`}></div>
            )}
        </button>
    );
};

// --- Main Component ---

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose }) => {
    const { addNewProject, handleApiError, hasApiKey, promptForKeySelection, getPrompt, onboardingState, setOnboardingState, componentStatus, componentStyles, customComponents, setView, uploadImageAndGetURL, loadProject, user } = useEditor();
    
    // Local UI state for transient loading/status
    const [isLoading, setIsLoading] = useState(false);
    const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const onboardingStartTime = useRef<number | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    // Debug state
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebugPanel, setShowDebugPanel] = useState(false);
    
    // Track onboarding start
    useEffect(() => {
        if (isOpen && !onboardingStartTime.current) {
            onboardingStartTime.current = Date.now();
            trackOnboardingStarted();
        }
    }, [isOpen]);
    const [generatingStatus, setGeneratingStatus] = useState('Initializing...');
    const [fieldLoading, setFieldLoading] = useState<string | null>(null);
    
    // Helper to update context state
    const updateState = (key: string, value: any) => {
        setOnboardingState(prev => ({ ...prev, [key]: value }));
    };

    const cleanJson = (text: string) => {
        let cleaned = text.replace(/```json\n?|```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
    };

    // Remove undefined values from object (Firebase doesn't accept undefined)
    const removeUndefinedFields = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(removeUndefinedFields);
        
        const cleaned: any = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                cleaned[key] = removeUndefinedFields(obj[key]);
            }
        }
        return cleaned;
    };

    const handleNext = () => {
        switch(onboardingState.step) {
            case 'basics': updateState('step', 'strategy'); break;
            case 'strategy': updateState('step', 'aesthetic'); break;
            case 'aesthetic': updateState('step', 'details'); break;
            case 'details': updateState('step', 'products'); break;
            case 'products': updateState('step', 'contact'); break;
            case 'contact': updateState('step', 'visuals'); break;
            case 'visuals': generateDesignPlan(); break;
            case 'review': generateWebsite(); break;
        }
    };

    const generateField = async (field: 'summary' | 'audience' | 'offerings' | 'uniqueValueProposition' | 'companyHistory' | 'coreValues') => {
        if (!onboardingState.businessName || !onboardingState.industry) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setFieldLoading(field);
        try {
            const ai = await getGoogleGenAI();
            let promptName = '';
            
            switch(field) {
                case 'summary': promptName = 'onboarding-summary'; break;
                case 'audience': promptName = 'onboarding-audience'; break;
                case 'offerings': promptName = 'onboarding-offerings'; break;
                case 'uniqueValueProposition': promptName = 'onboarding-uvp'; break;
                case 'companyHistory': promptName = 'onboarding-history'; break;
                case 'coreValues': promptName = 'onboarding-core-values'; break;
            }

            const promptConfig = getPrompt(promptName);
            if (!promptConfig) throw new Error(`Prompt ${promptName} not found`);

            let filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry)
                .replace('{{summary}}', onboardingState.summary || '')
                .replace('{{audience}}', onboardingState.audience || '');

            const response = await ai.models.generateContent({
                model: promptConfig.model,
                contents: filledPrompt,
            });

            const text = response.text.trim();
            
            // Para coreValues, convertir a array
            if (field === 'coreValues') {
                const valuesArray = text.split(',').map(v => v.trim()).filter(v => v);
                updateState(field, valuesArray);
            } else {
                updateState(field, text);
            }

        } catch (error) {
            handleApiError(error);
            console.error(`Error generating ${field}:`, error);
        } finally {
            setFieldLoading(null);
        }
    };

    const generateDesignPlan = async () => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setIsLoading(true);
        updateState('step', 'review'); 
        
        try {
            const promptConfig = getPrompt('onboarding-design-plan');
            if (!promptConfig) throw new Error("Design prompt not found");

            // Obtener componentes habilitados
            const availableComponentsList = Object.entries(componentStatus)
                .filter(([_, enabled]) => enabled)
                .map(([key, _]) => key)
                .join(', ');
            
            // Obtener custom components
            const customComponentsList = customComponents
                .map(c => `${c.name} (based on ${c.baseComponent})`)
                .join(', ');

            const filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry)
                .replace('{{aesthetic}}', onboardingState.aesthetic || 'Minimalist')
                .replace('{{colorVibe}}', onboardingState.colorVibe || 'Professional')
                .replace('{{goal}}', onboardingState.goal)
                .replace('{{summary}}', onboardingState.summary)
                .replace('{{availableComponents}}', availableComponentsList || 'All standard components')
                .replace('{{customComponents}}', customComponentsList || 'None');

            const ai = await getGoogleGenAI();
            const response = await ai.models.generateContent({
                model: promptConfig.model,
                contents: filledPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const jsonText = cleanJson(response.text);
            const designPlan = JSON.parse(jsonText);
            
            updateState('designPlan', designPlan);

        } catch (error) {
            handleApiError(error);
            console.error("Error generating design plan:", error);
            // Fallback
            updateState('designPlan', {
                palette: { primary: '#4f46e5', background: '#0f172a', text: '#ffffff' },
                typography: { header: 'inter', body: 'inter' },
                componentOrder: ['hero', 'features', 'footer']
            });
        } finally {
            setIsLoading(false);
        }
    };

    const generateWebsite = async () => {
        console.log("🎨 [generateWebsite] =================================");
        console.log("🎨 [generateWebsite] STARTING WEBSITE GENERATION");
        console.log("🎨 [generateWebsite] =================================");
        
        // Pre-flight checks
        console.log("✈️ [generateWebsite] Pre-flight checks:", {
            hasApiKey,
            hasUser: !!user,
            businessName: onboardingState.businessName,
            hasDesignPlan: !!onboardingState.designPlan,
            designPlanKeys: onboardingState.designPlan ? Object.keys(onboardingState.designPlan) : []
        });

        if (hasApiKey === false) { 
            console.warn("⚠️ [generateWebsite] No API key detected");
            await promptForKeySelection(); 
            return; 
        }

        if (!user) {
            console.error("❌ [generateWebsite] CRITICAL: No user authenticated!");
            handleApiError(new Error("Debes iniciar sesión para crear un website"));
            return;
        }

        updateState('step', 'generating');
        setGeneratingStatus('Architecting site structure...');
        
        try {
            console.log("📋 [generateWebsite] Step 1: Loading prompt config...");
            const promptConfig = getPrompt('onboarding-website-json');
            if (!promptConfig) {
                throw new Error("Website generation prompt not found");
            }
            console.log("✅ [generateWebsite] Prompt config loaded:", promptConfig.name);

            // Preparar los datos para el prompt
            console.log("📝 [generateWebsite] Step 2: Filling prompt template...");
            const filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry)
                .replace('{{summary}}', onboardingState.summary || '')
                .replace('{{audience}}', onboardingState.audience || '')
                .replace('{{offerings}}', onboardingState.offerings || '')
                .replace('{{goal}}', onboardingState.goal || 'Generate Leads')
                .replace('{{aesthetic}}', onboardingState.aesthetic)
                .replace('{{companyHistory}}', onboardingState.companyHistory || 'Not provided')
                .replace('{{uniqueValueProposition}}', onboardingState.uniqueValueProposition || 'Not provided')
                .replace('{{coreValues}}', (onboardingState.coreValues || []).join(', ') || 'Not provided')
                .replace('{{yearsInBusiness}}', onboardingState.yearsInBusiness || 'Not provided')
                .replace('{{products}}', JSON.stringify(onboardingState.products || []))
                .replace('{{testimonials}}', JSON.stringify(onboardingState.testimonials || []))
                .replace('{{contactInfo}}', JSON.stringify(onboardingState.contactInfo || {}))
                .replace('{{brandGuidelines}}', JSON.stringify(onboardingState.brandGuidelines || {}))
                .replace('{{designPlan}}', JSON.stringify(onboardingState.designPlan));
            console.log("✅ [generateWebsite] Prompt filled (length:", filledPrompt.length, "chars)");

            setGeneratingStatus('Writing persuasive copy & painting pixels...');
            console.log("🤖 [generateWebsite] Step 3: Calling AI API...");

            const ai = await getGoogleGenAI();
            const response = await ai.models.generateContent({
                model: promptConfig.model,
                contents: filledPrompt,
                config: { responseMimeType: 'application/json' }
            });
            console.log("✅ [generateWebsite] AI response received (length:", response.text?.length || 0, "chars)");

            setGeneratingStatus('Finalizing project...');
            console.log("🔍 [generateWebsite] Step 4: Parsing AI response...");
            const jsonText = cleanJson(response.text);
            let result;
            try {
                result = JSON.parse(jsonText);
                console.log("✅ [generateWebsite] JSON parsed successfully:", {
                    hasPageConfig: !!result.pageConfig,
                    hasData: !!(result.data || result.pageConfig?.data),
                    hasTheme: !!(result.theme || result.pageConfig?.theme),
                    topLevelKeys: Object.keys(result)
                });
            } catch (e) {
                console.error("❌ [generateWebsite] JSON Parse Error:", e);
                console.error("❌ [generateWebsite] Failed JSON text (first 500 chars):", jsonText.substring(0, 500));
                throw new Error("Failed to parse AI response");
            }
            
            console.log("🔧 [generateWebsite] Step 5: Extracting data from AI response...");
            let generatedData = result.pageConfig?.data || result.data;
            if (!generatedData && result.hero) generatedData = result;

            const generatedTheme = result.pageConfig?.theme || result.theme || onboardingState.designPlan;
            const generatedPrompts = result.imagePrompts || result.pageConfig?.imagePrompts || {};

            console.log("✅ [generateWebsite] Data extracted:", {
                hasGeneratedData: !!generatedData,
                generatedDataKeys: generatedData ? Object.keys(generatedData) : [],
                hasTheme: !!generatedTheme,
                imagePromptCount: Object.keys(generatedPrompts).length
            });

            // Deep merge with safe defaults
            console.log("🔀 [generateWebsite] Step 6: Merging with default data...");
            const safeData = JSON.parse(JSON.stringify(initialData.data));
            if (generatedData) {
                Object.keys(generatedData).forEach((sectionKey: any) => {
                    if (safeData[sectionKey] && typeof safeData[sectionKey] === 'object') {
                        const genSection = generatedData[sectionKey];
                        const defaultColors = safeData[sectionKey].colors || {};
                        const { colors: genColors, ...otherProps } = genSection;
                        safeData[sectionKey] = { ...safeData[sectionKey], ...otherProps };
                        if (genColors && typeof genColors === 'object') {
                            safeData[sectionKey].colors = { ...defaultColors, ...genColors };
                        }
                    }
                });
            }
            console.log("✅ [generateWebsite] Data merged");
            
            // Step 6.5: Apply Design Plan colors to sections that may have been missed
            console.log("🎨 [generateWebsite] Step 6.5: Applying Design Plan colors to sections...");
            if (generatedTheme?.palette) {
                const palette = generatedTheme.palette;
                console.log("🎨 [generateWebsite] Design Plan palette:", palette);
                
                // Apply palette to sections that should use theme colors
                const sectionsToColorize = ['hero', 'features', 'testimonials', 'services', 'pricing', 'faq', 'cta', 'footer', 'leads'];
                sectionsToColorize.forEach(section => {
                    if (safeData[section] && !safeData[section].colors) {
                        // Section exists but has no colors, apply palette
                        safeData[section].colors = {
                            background: palette.background || '#0f172a',
                            text: palette.text || '#e2e8f0',
                            heading: palette.text || '#ffffff',
                            accent: palette.primary || palette.accent || '#4f46e5'
                        };
                        console.log(`   ✓ Applied palette to ${section}`);
                    }
                });
                console.log("✅ [generateWebsite] Design Plan colors applied to sections");
            }
            
            console.log("🏗️ [generateWebsite] Step 7: Building project object...");
            const projectId = `proj_${Date.now()}`;
            
            // Step 7.1: Apply user's brand guidelines (logo and colors)
            console.log("🎨 [generateWebsite] Step 7.1: Applying brand guidelines...");
            
            // Apply logo if user uploaded one
            if (onboardingState.brandGuidelines?.logoUrl) {
                console.log("📸 [generateWebsite] Applying user logo:", onboardingState.brandGuidelines.logoUrl);
                safeData.header.logoType = 'image';
                safeData.header.logoImageUrl = onboardingState.brandGuidelines.logoUrl;
            } else {
                // Use business name as text logo
                safeData.header.logoText = onboardingState.businessName;
            }
            
            // Build theme with potential brand color overrides
            const finalTheme = {
                ...generatedTheme,
                fontFamilyHeader: (generatedTheme.fontFamilyHeader || 'inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyBody: (generatedTheme.fontFamilyBody || 'inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyButton: (generatedTheme.fontFamilyButton || 'inter').toLowerCase().replace(/\s/g, '-'),
            };
            
            // Override palette with user's brand colors if provided
            if (onboardingState.brandGuidelines?.primaryColor || onboardingState.brandGuidelines?.secondaryColor) {
                console.log("🎨 [generateWebsite] Applying user brand colors:", {
                    primary: onboardingState.brandGuidelines?.primaryColor,
                    secondary: onboardingState.brandGuidelines?.secondaryColor
                });
                
                if (!finalTheme.palette) {
                    finalTheme.palette = onboardingState.designPlan?.palette || {};
                }
                
                if (onboardingState.brandGuidelines?.primaryColor) {
                    finalTheme.palette.primary = onboardingState.brandGuidelines.primaryColor;
                }
                if (onboardingState.brandGuidelines?.secondaryColor) {
                    finalTheme.palette.secondary = onboardingState.brandGuidelines.secondaryColor;
                }
            }
            
            console.log("✅ [generateWebsite] Brand guidelines applied");
            
            const newProject = {
                id: projectId,
                name: onboardingState.businessName,
                thumbnailUrl: 'https://picsum.photos/seed/newproject/800/600',
                status: 'Draft' as 'Draft',
                lastUpdated: new Date().toISOString(),
                data: safeData,
                theme: finalTheme,
                brandIdentity: {
                    name: onboardingState.businessName,
                    industry: onboardingState.industry,
                    targetAudience: onboardingState.audience || '',
                    toneOfVoice: onboardingState.aesthetic as any,
                    coreValues: (onboardingState.coreValues || []).join(', ') || onboardingState.goal,
                    language: 'English'
                },
                componentOrder: (result.pageConfig?.componentOrder || onboardingState.designPlan.componentOrder || initialData.componentOrder)
                    .filter((comp: string) => componentStatus[comp as any] !== false),
                sectionVisibility: Object.keys(initialData.sectionVisibility).reduce((acc: any, key) => {
                    const section = key as any;
                    // Ensure we always set a boolean value (never undefined) for Firebase
                    const statusValue = componentStatus[section];
                    const visibilityValue = result.pageConfig?.sectionVisibility?.[section] ?? initialData.sectionVisibility[section];
                    // If componentStatus is explicitly false, use false. Otherwise use the visibility value, defaulting to true
                    acc[section] = statusValue === false ? false : (visibilityValue !== undefined ? visibilityValue : true);
                    return acc;
                }, {} as Record<any, boolean>),
                imagePrompts: generatedPrompts,
                aiAssistantConfig: {
                    agentName: `${onboardingState.businessName} Assistant`,
                    tone: onboardingState.aesthetic || 'Professional',
                    languages: 'English, Spanish',
                    businessProfile: onboardingState.summary || onboardingState.companyHistory || '',
                    productsServices: onboardingState.offerings || '',
                    policiesContact: onboardingState.contactInfo?.email || '',
                    specialInstructions: '',
                    faqs: [],
                    widgetColor: onboardingState.designPlan?.palette?.primary || '#4f46e5',
                    isActive: true,
                    leadCaptureEnabled: true,
                    enableLiveVoice: false,
                    voiceName: 'Zephyr' as const
                }
            };
            console.log("✅ [generateWebsite] Project object built:", {
                projectId: newProject.id,
                projectName: newProject.name,
                dataKeys: Object.keys(newProject.data),
                themeKeys: Object.keys(newProject.theme),
                hasLogo: !!newProject.data.header.logoImageUrl,
                logoType: newProject.data.header.logoType,
                themePalette: newProject.theme.palette,
                appliedBrandColors: {
                    usedCustomPrimary: !!onboardingState.brandGuidelines?.primaryColor,
                    usedCustomSecondary: !!onboardingState.brandGuidelines?.secondaryColor
                }
            });
            
            // Final verification log
            console.log("🔍 [generateWebsite] Final Data Verification:");
            console.log("   • Logo:", newProject.data.header.logoImageUrl || newProject.data.header.logoText);
            console.log("   • Primary Color:", newProject.theme.palette?.primary);
            console.log("   • Secondary Color:", newProject.theme.palette?.secondary);
            console.log("   • Hero Background:", newProject.data.hero?.colors?.background);
            console.log("   • Features Background:", newProject.data.features?.colors?.background);
            
            // Clean the project object to remove any undefined values (Firebase doesn't accept them)
            console.log("🧹 [generateWebsite] Step 7.5: Cleaning undefined values...");
            const cleanedProject = removeUndefinedFields(newProject);
            console.log("✅ [generateWebsite] Project cleaned");
            
            console.log("💾 [generateWebsite] Step 8: Saving project to Firebase...");
            const savedProjectId = await addNewProject(cleanedProject);
            console.log("✅ [generateWebsite] Project saved! ID:", savedProjectId);
            
            setCreatedProjectId(savedProjectId);
            console.log("✅ [generateWebsite] Created project ID stored in state");
            
            // Track project creation analytics
            console.log("📊 [generateWebsite] Step 9: Tracking analytics...");
            const duration = onboardingStartTime.current 
                ? Math.round((Date.now() - onboardingStartTime.current) / 1000) 
                : 0;
            trackProjectCreated(savedProjectId, newProject.name, false);
            trackOnboardingCompleted(savedProjectId, newProject.name, duration);
            console.log("✅ [generateWebsite] Analytics tracked (duration:", duration, "s)");
            
            // Show success step with option to start guided tour
            console.log("🎉 [generateWebsite] Step 10: Showing success screen...");
            updateState('step', 'success' as OnboardingStep);
            onboardingStartTime.current = null;

            console.log("🎨 [generateWebsite] =================================");
            console.log("🎨 [generateWebsite] ✅ WEBSITE GENERATION COMPLETE!");
            console.log("🎨 [generateWebsite] Project ID:", savedProjectId);
            console.log("🎨 [generateWebsite] =================================");

        } catch (error) {
            console.log("🎨 [generateWebsite] =================================");
            console.error("❌ [generateWebsite] CRITICAL ERROR OCCURRED!");
            console.log("🎨 [generateWebsite] =================================");
            console.error("❌ [generateWebsite] Error object:", error);
            console.error("❌ [generateWebsite] Error details:", {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace',
                onboardingState: {
                    businessName: onboardingState.businessName,
                    industry: onboardingState.industry,
                    hasDesignPlan: !!onboardingState.designPlan,
                    designPlanKeys: onboardingState.designPlan ? Object.keys(onboardingState.designPlan) : []
                }
            });
            handleApiError(error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setGeneratingStatus(`Error: ${errorMessage}`);
            console.log("⏰ [generateWebsite] Returning to review in 5 seconds...");
            setTimeout(() => updateState('step', 'review'), 5000);
        }
    };

    // --- Step 1: Basics ---
    const renderBasics = () => (
        <div className="space-y-5 animate-fade-in-up">
            <div>
                <InputLabel label="Business Name" />
                <InputField 
                    value={onboardingState.businessName} 
                    onChange={(e) => updateState('businessName', e.target.value)} 
                    placeholder="e.g. Acme Studio" 
                    autoFocus
                />
            </div>
            <div>
                <InputLabel label="Industry / Niche" />
                <InputField 
                    value={onboardingState.industry} 
                    onChange={(e) => updateState('industry', e.target.value)} 
                    placeholder="e.g. Interior Design, SaaS, Coffee Shop" 
                />
            </div>
            <div>
                <InputLabel 
                    label="Short Summary" 
                    onAiAssist={() => generateField('summary')} 
                    isLoading={fieldLoading === 'summary'} 
                    disabled={!onboardingState.businessName || !onboardingState.industry}
                />
                <TextAreaField 
                    value={onboardingState.summary} 
                    onChange={(e) => updateState('summary', e.target.value)} 
                    rows={3} 
                    placeholder="What does your business do?" 
                />
            </div>
        </div>
    );

    // --- Step 2: Strategy ---
    const renderStrategy = () => (
        <div className="space-y-6 animate-fade-in-up">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="col-span-1 sm:col-span-2">
                    <InputLabel label="Primary Goal" />
                    <div className="grid grid-cols-3 gap-3">
                        {['Generate Leads', 'Sell Products', 'Show Portfolio'].map(g => (
                            <button
                                key={g}
                                onClick={() => updateState('goal', g)}
                                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-lg border transition-all ${onboardingState.goal === g ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                 </div>
             </div>
             
             <div>
                <InputLabel 
                    label="Target Audience" 
                    onAiAssist={() => generateField('audience')} 
                    isLoading={fieldLoading === 'audience'} 
                />
                <InputField 
                    value={onboardingState.audience} 
                    onChange={(e) => updateState('audience', e.target.value)} 
                    placeholder="e.g. Startups, Homeowners, Fitness Enthusiasts" 
                />
            </div>
             <div>
                <InputLabel 
                    label="Key Offerings" 
                    onAiAssist={() => generateField('offerings')} 
                    isLoading={fieldLoading === 'offerings'} 
                />
                <TextAreaField 
                    value={onboardingState.offerings} 
                    onChange={(e) => updateState('offerings', e.target.value)} 
                    rows={2}
                    placeholder="List your top services or products..." 
                />
            </div>
        </div>
    );

    // --- Step 3: Aesthetic (Visual Selection) ---
    const renderAesthetic = () => (
        <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-grow overflow-y-auto custom-scrollbar pr-1">
                <OptionCard 
                    title="Minimalist" 
                    description="Clean lines, lots of whitespace, sharp typography."
                    icon={Layout} 
                    selected={onboardingState.aesthetic === 'Minimalist'} 
                    onClick={() => updateState('aesthetic', 'Minimalist')}
                    aestheticType="Minimalist"
                />
                <OptionCard 
                    title="Bold / Loud" 
                    description="High contrast, large text, punchy colors."
                    icon={Megaphone} 
                    selected={onboardingState.aesthetic === 'Bold'} 
                    onClick={() => updateState('aesthetic', 'Bold')}
                    aestheticType="Bold"
                />
                <OptionCard 
                    title="Elegant" 
                    description="Serif fonts, muted luxury tones, classic layouts."
                    icon={Gem} 
                    selected={onboardingState.aesthetic === 'Elegant'} 
                    onClick={() => updateState('aesthetic', 'Elegant')}
                    aestheticType="Elegant"
                />
                <OptionCard 
                    title="Playful" 
                    description="Rounded shapes, vibrant colors, friendly vibe."
                    icon={Smile} 
                    selected={onboardingState.aesthetic === 'Playful'} 
                    onClick={() => updateState('aesthetic', 'Playful')}
                    aestheticType="Playful"
                />
                <OptionCard 
                    title="Tech / Future" 
                    description="Dark mode, neon accents, gradients, glow."
                    icon={Monitor} 
                    selected={onboardingState.aesthetic === 'Tech'} 
                    onClick={() => updateState('aesthetic', 'Tech')}
                    aestheticType="Tech"
                />
                <OptionCard 
                    title="Organic" 
                    description="Earth tones, soft edges, natural feel."
                    icon={Leaf} 
                    selected={onboardingState.aesthetic === 'Organic'} 
                    onClick={() => updateState('aesthetic', 'Organic')}
                    aestheticType="Organic"
                />
            </div>
            
            <div>
                <InputLabel label="Color Vibe" />
                <InputField 
                    value={onboardingState.colorVibe || ''} 
                    onChange={(e) => updateState('colorVibe', e.target.value)} 
                    placeholder="e.g. Trustworthy Blue, Energetic Orange, Deep Forest Green" 
                />
            </div>
        </div>
    );

    // --- Step 4: Details (Company Info) ---
    const renderDetails = () => (
        <div className="space-y-5 animate-fade-in-up">
            <div>
                <InputLabel 
                    label="Propuesta de Valor Única" 
                    onAiAssist={() => generateField('uniqueValueProposition')} 
                    isLoading={fieldLoading === 'uniqueValueProposition'}
                    disabled={!onboardingState.businessName || !onboardingState.industry}
                />
                <TextAreaField 
                    value={onboardingState.uniqueValueProposition || ''} 
                    onChange={(e) => updateState('uniqueValueProposition', e.target.value)} 
                    rows={3} 
                    placeholder="¿Qué hace a tu negocio único y diferente de la competencia?" 
                />
            </div>
            
            <div>
                <InputLabel 
                    label="Historia de la Empresa (Opcional)" 
                    onAiAssist={() => generateField('companyHistory')} 
                    isLoading={fieldLoading === 'companyHistory'}
                    disabled={!onboardingState.businessName || !onboardingState.industry}
                />
                <TextAreaField 
                    value={onboardingState.companyHistory || ''} 
                    onChange={(e) => updateState('companyHistory', e.target.value)} 
                    rows={3} 
                    placeholder="Cuéntanos cómo empezó tu negocio y qué te impulsa..." 
                />
            </div>
            
            <div>
                <InputLabel 
                    label="Valores Fundamentales (Opcional)" 
                    onAiAssist={() => generateField('coreValues')} 
                    isLoading={fieldLoading === 'coreValues'}
                    disabled={!onboardingState.businessName || !onboardingState.industry}
                />
                <InputField 
                    value={onboardingState.coreValues?.join(', ') || ''} 
                    onChange={(e) => updateState('coreValues', e.target.value.split(',').map(v => v.trim()).filter(v => v))} 
                    placeholder="e.g. Innovación, Calidad, Integridad, Sostenibilidad" 
                />
            </div>
            
            <div>
                <InputLabel label="Años en el Negocio (Opcional)" />
                <InputField 
                    value={onboardingState.yearsInBusiness || ''} 
                    onChange={(e) => updateState('yearsInBusiness', e.target.value)} 
                    placeholder="e.g. 5 años, Desde 2019" 
                />
            </div>
        </div>
    );

    // --- Step 5: Products/Services ---
    const renderProducts = () => {
        const addProduct = () => {
            const newProduct: ProductInfo = {
                id: `prod_${Date.now()}`,
                name: '',
                description: '',
                price: '',
                features: []
            };
            updateState('products', [...(onboardingState.products || []), newProduct]);
        };

        const updateProduct = (id: string, field: keyof ProductInfo, value: any) => {
            const updated = (onboardingState.products || []).map(p => 
                p.id === id ? { ...p, [field]: value } : p
            );
            updateState('products', updated);
        };

        const removeProduct = (id: string) => {
            updateState('products', (onboardingState.products || []).filter(p => p.id !== id));
        };

        return (
            <div className="space-y-5 animate-fade-in-up">
                <div className="text-center mb-4">
                    <p className="text-sm text-gray-400">Agrega tus productos o servicios principales (opcional)</p>
                </div>
                
                {(onboardingState.products || []).map((product, index) => (
                    <div key={product.id} className="bg-[#130a1d] p-4 rounded-xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-yellow-400">PRODUCTO {index + 1}</span>
                            <button
                                onClick={() => removeProduct(product.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        
                        <InputField 
                            value={product.name} 
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)} 
                            placeholder="Nombre del producto/servicio" 
                        />
                        
                        <TextAreaField 
                            value={product.description} 
                            onChange={(e) => updateProduct(product.id, 'description', e.target.value)} 
                            rows={2} 
                            placeholder="Descripción breve" 
                        />
                        
                        <InputField 
                            value={product.price || ''} 
                            onChange={(e) => updateProduct(product.id, 'price', e.target.value)} 
                            placeholder="Precio (opcional, e.g. $99/mes)" 
                        />
                    </div>
                ))}
                
                <button
                    onClick={addProduct}
                    className="w-full py-3 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Agregar Producto/Servicio
                </button>
            </div>
        );
    };

    // --- Step 6: Contact Information ---
    const renderContact = () => (
        <div className="space-y-5 animate-fade-in-up">
            <div className="text-center mb-4">
                <p className="text-sm text-gray-400">Información de contacto (opcional pero recomendado)</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <InputLabel label="Email" />
                    <InputField 
                        type="email"
                        value={onboardingState.contactInfo?.email || ''} 
                        onChange={(e) => updateState('contactInfo', { 
                            ...(onboardingState.contactInfo || {}), 
                            email: e.target.value 
                        })} 
                        placeholder="contacto@empresa.com" 
                    />
                </div>
                
                <div>
                    <InputLabel label="Teléfono" />
                    <InputField 
                        type="tel"
                        value={onboardingState.contactInfo?.phone || ''} 
                        onChange={(e) => updateState('contactInfo', { 
                            ...(onboardingState.contactInfo || {}), 
                            phone: e.target.value 
                        })} 
                        placeholder="+1 (555) 123-4567" 
                    />
                </div>
            </div>
            
            <div>
                <InputLabel label="Dirección" />
                <InputField 
                    value={onboardingState.contactInfo?.address || ''} 
                    onChange={(e) => updateState('contactInfo', { 
                        ...(onboardingState.contactInfo || {}), 
                        address: e.target.value 
                    })} 
                    placeholder="123 Main Street" 
                />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <InputLabel label="Ciudad" />
                    <InputField 
                        value={onboardingState.contactInfo?.city || ''} 
                        onChange={(e) => updateState('contactInfo', { 
                            ...(onboardingState.contactInfo || {}), 
                            city: e.target.value 
                        })} 
                        placeholder="Ciudad" 
                    />
                </div>
                
                <div>
                    <InputLabel label="País" />
                    <InputField 
                        value={onboardingState.contactInfo?.country || ''} 
                        onChange={(e) => updateState('contactInfo', { 
                            ...(onboardingState.contactInfo || {}), 
                            country: e.target.value 
                        })} 
                        placeholder="País" 
                    />
                </div>
            </div>
            
            <div className="border-t border-white/10 pt-4 mt-6">
                <InputLabel label="Redes Sociales (Opcional)" />
                <div className="space-y-3">
                    {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((platform) => (
                        <InputField 
                            key={platform}
                            value={onboardingState.contactInfo?.socialMedia?.[platform as keyof typeof onboardingState.contactInfo.socialMedia] || ''} 
                            onChange={(e) => updateState('contactInfo', { 
                                ...(onboardingState.contactInfo || {}), 
                                socialMedia: {
                                    ...(onboardingState.contactInfo?.socialMedia || {}),
                                    [platform]: e.target.value
                                }
                            })} 
                            placeholder={`URL de ${platform.charAt(0).toUpperCase() + platform.slice(1)}`} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    // --- Step 7: Visuals (Testimonials & Brand) ---
    const renderVisuals = () => {
        const addTestimonial = () => {
            const newTestimonial: TestimonialInfo = {
                id: `test_${Date.now()}`,
                quote: '',
                author: '',
                role: '',
                company: ''
            };
            updateState('testimonials', [...(onboardingState.testimonials || []), newTestimonial]);
        };

        const updateTestimonial = (id: string, field: keyof TestimonialInfo, value: string) => {
            const updated = (onboardingState.testimonials || []).map(t => 
                t.id === id ? { ...t, [field]: value } : t
            );
            updateState('testimonials', updated);
        };

        const removeTestimonial = (id: string) => {
            updateState('testimonials', (onboardingState.testimonials || []).filter(t => t.id !== id));
        };

        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* Testimonials Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Testimonios de Clientes</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Agrega testimonios reales de tus clientes (opcional)</p>
                    
                    {(onboardingState.testimonials || []).map((testimonial, index) => (
                        <div key={testimonial.id} className="bg-[#130a1d] p-4 rounded-xl border border-white/10 space-y-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-yellow-400">TESTIMONIO {index + 1}</span>
                                <button
                                    onClick={() => removeTestimonial(testimonial.id)}
                                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            
                            <TextAreaField 
                                value={testimonial.quote} 
                                onChange={(e) => updateTestimonial(testimonial.id, 'quote', e.target.value)} 
                                rows={2} 
                                placeholder="Testimonio del cliente..." 
                            />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <InputField 
                                    value={testimonial.author} 
                                    onChange={(e) => updateTestimonial(testimonial.id, 'author', e.target.value)} 
                                    placeholder="Nombre" 
                                />
                                
                                <InputField 
                                    value={testimonial.role} 
                                    onChange={(e) => updateTestimonial(testimonial.id, 'role', e.target.value)} 
                                    placeholder="Cargo" 
                                />
                            </div>
                            
                            <InputField 
                                value={testimonial.company || ''} 
                                onChange={(e) => updateTestimonial(testimonial.id, 'company', e.target.value)} 
                                placeholder="Empresa (opcional)" 
                            />
                        </div>
                    ))}
                    
                    <button
                        onClick={addTestimonial}
                        className="w-full py-3 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        Agregar Testimonio
                    </button>
                </div>
                
                {/* Brand Colors Section */}
                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Colores de Marca (Opcional)</h3>
                    <p className="text-xs text-gray-400 mb-4">Si ya tienes colores de marca, ingrésalos aquí</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputLabel label="Color Primario" />
                            <InputField 
                                type="color"
                                value={onboardingState.brandGuidelines?.primaryColor || '#4f46e5'} 
                                onChange={(e) => updateState('brandGuidelines', { 
                                    ...(onboardingState.brandGuidelines || {}), 
                                    primaryColor: e.target.value 
                                })} 
                            />
                        </div>
                        
                        <div>
                            <InputLabel label="Color Secundario" />
                            <InputField 
                                type="color"
                                value={onboardingState.brandGuidelines?.secondaryColor || '#ec4899'} 
                                onChange={(e) => updateState('brandGuidelines', { 
                                    ...(onboardingState.brandGuidelines || {}), 
                                    secondaryColor: e.target.value 
                                })} 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Logo Upload Section */}
                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Logo (Opcional)</h3>
                    <p className="text-xs text-gray-400 mb-4">Sube tu logo si ya tienes uno</p>
                    
                    <div className="flex items-center gap-4">
                        {onboardingState.brandGuidelines?.logoUrl && (
                            <div className="relative group">
                                <img 
                                    src={onboardingState.brandGuidelines.logoUrl} 
                                    alt="Logo" 
                                    className="w-20 h-20 object-contain bg-white/5 rounded-lg border border-white/10"
                                />
                                <button
                                    onClick={() => updateState('brandGuidelines', { 
                                        ...(onboardingState.brandGuidelines || {}), 
                                        logoUrl: undefined 
                                    })}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        
                        <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploadingImage ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={16} />
                                    {onboardingState.brandGuidelines?.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                                </>
                            )}
                        </button>
                        
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                setUploadingImage(true);
                                try {
                                    const url = await uploadImageAndGetURL(file);
                                    updateState('brandGuidelines', { 
                                        ...(onboardingState.brandGuidelines || {}), 
                                        logoUrl: url 
                                    });
                                } catch (error) {
                                    console.error('Error uploading logo:', error);
                                    handleApiError(error);
                                } finally {
                                    setUploadingImage(false);
                                    if (logoInputRef.current) {
                                        logoInputRef.current.value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // --- Step 8: Review (Loading or Success) ---
    const renderReview = () => {
        if (isLoading) return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
                <p className="text-white font-bold text-xl">Crafting Design System...</p>
                <p className="text-sm text-gray-500 mt-2">AI is selecting fonts, palettes, and layouts.</p>
            </div>
        );

        if (!onboardingState.designPlan) return null;

        const p = onboardingState.designPlan.palette || {};
        const t = onboardingState.designPlan.typography || {};

        // Calculate completeness score
        const totalFields = 7; // basics, strategy, aesthetic, details, products, contact, visuals
        let filledFields = 3; // basics, strategy, aesthetic are required
        if (onboardingState.uniqueValueProposition || onboardingState.companyHistory || onboardingState.coreValues?.length) filledFields++;
        if (onboardingState.products?.length) filledFields++;
        if (onboardingState.contactInfo?.email || onboardingState.contactInfo?.phone) filledFields++;
        if (onboardingState.testimonials?.length || onboardingState.brandGuidelines?.primaryColor) filledFields++;
        const completeness = Math.round((filledFields / totalFields) * 100);

        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* Completeness Score */}
                <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 p-4 rounded-xl border border-yellow-400/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">Nivel de Personalización</span>
                        <span className="text-2xl font-bold text-yellow-400">{completeness}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${completeness}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {completeness < 50 && "Tu website tendrá contenido base. Podrás editarlo después."}
                        {completeness >= 50 && completeness < 80 && "¡Buen trabajo! Tu website tendrá información personalizada."}
                        {completeness >= 80 && "¡Excelente! Tu website será altamente personalizado."}
                    </p>
                </div>

                {/* Design Preview */}
                <div className="bg-[#130a1d] p-6 rounded-xl border border-white/10">
                    <h3 className="font-bold text-white flex items-center mb-6 text-sm uppercase tracking-wider">
                        <Palette className="mr-2 text-yellow-400" size={16}/> Sistema de Diseño AI
                    </h3>
                    
                    {/* Palette Visualization */}
                    <div className="flex gap-4 mb-8 justify-center">
                        {['primary', 'secondary', 'accent', 'background'].map(k => (
                            <div key={k} className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-12 h-12 rounded-lg shadow-lg ring-1 ring-white/20 transition-transform hover:scale-110" 
                                    style={{ backgroundColor: p[k] || '#000' }}
                                />
                                <span className="text-[10px] text-gray-500 uppercase">{k}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
                         <div>
                             <span className="text-[10px] text-gray-500 uppercase block mb-1">Títulos</span>
                             <p className="text-lg font-bold text-white capitalize" style={{ fontFamily: t.header }}>{t.header?.replace(/-/g, ' ')}</p>
                         </div>
                         <div>
                             <span className="text-[10px] text-gray-500 uppercase block mb-1">Texto</span>
                             <p className="text-lg text-gray-300 capitalize" style={{ fontFamily: t.body }}>{t.body?.replace(/-/g, ' ')}</p>
                         </div>
                    </div>
                </div>

                {/* Information Summary */}
                <div className="bg-[#130a1d] p-6 rounded-xl border border-white/10 space-y-4">
                    <h3 className="font-bold text-white flex items-center text-sm uppercase tracking-wider mb-4">
                        <Briefcase className="mr-2 text-yellow-400" size={16}/> Resumen de tu Información
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Negocio:</span>
                            <p className="text-white font-medium">{onboardingState.businessName}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Industria:</span>
                            <p className="text-white font-medium">{onboardingState.industry}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Objetivo:</span>
                            <p className="text-white font-medium">{onboardingState.goal}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Estética:</span>
                            <p className="text-white font-medium">{onboardingState.aesthetic}</p>
                        </div>
                        {onboardingState.products && onboardingState.products.length > 0 && (
                            <div>
                                <span className="text-gray-500">Productos/Servicios:</span>
                                <p className="text-white font-medium">{onboardingState.products.length} agregados</p>
                            </div>
                        )}
                        {onboardingState.testimonials && onboardingState.testimonials.length > 0 && (
                            <div>
                                <span className="text-gray-500">Testimonios:</span>
                                <p className="text-white font-medium">{onboardingState.testimonials.length} agregados</p>
                            </div>
                        )}
                        {onboardingState.contactInfo?.email && (
                            <div>
                                <span className="text-gray-500">Email:</span>
                                <p className="text-white font-medium">{onboardingState.contactInfo.email}</p>
                            </div>
                        )}
                        {onboardingState.contactInfo?.phone && (
                            <div>
                                <span className="text-gray-500">Teléfono:</span>
                                <p className="text-white font-medium">{onboardingState.contactInfo.phone}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                    <p className="text-white text-sm font-medium mb-1">
                        🎉 ¡Todo listo para generar tu website!
                    </p>
                    <p className="text-gray-400 text-xs">
                        Haz clic en "Crear Website" para que la IA construya tu sitio personalizado
                    </p>
                </div>
            </div>
        )
    };

    // Render Success Screen
    const renderSuccess = () => (
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <CheckCircle className="text-green-400" size={40} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">¡Website Creado!</h2>
            <p className="text-gray-300 text-center max-w-md mb-8">
                Tu website base está listo. Ahora puedes personalizarlo aún más con ayuda de nuestra IA.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <button
                    onClick={() => {
                        if (createdProjectId) {
                            // Cargar el proyecto ANTES de abrir el tour
                            loadProject(createdProjectId);
                            setIsGuidedTourOpen(true);
                        }
                        onClose();
                    }}
                    className="bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl hover:bg-yellow-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex flex-col items-center justify-center gap-2"
                >
                    <Sparkles size={24} />
                    <span>Tour Guiado</span>
                    <span className="text-xs opacity-75">Recomendado</span>
                </button>
                
                <button
                    onClick={() => {
                        if (createdProjectId) {
                            // Cargar el proyecto recién creado
                            loadProject(createdProjectId);
                        }
                        onClose();
                        updateState('step', 'basics');
                    }}
                    className="bg-white/10 text-white font-bold py-4 px-6 rounded-xl hover:bg-white/20 border border-white/10 transition-all flex flex-col items-center justify-center gap-2"
                >
                    <Rocket size={24} />
                    <span>Editar Ahora</span>
                    <span className="text-xs opacity-75">Manual</span>
                </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-6 text-center max-w-md">
                El tour guiado te ayudará a personalizar las partes más importantes de tu website con asistencia de IA.
            </p>
        </div>
    );

    if (onboardingState.step === 'generating') {
        return (
            <Modal isOpen={isOpen} onClose={() => {}}>
                <div className="h-[450px] w-full bg-[#1A0D26] rounded-2xl border border-white/10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <GeneratingState statusText={generatingStatus} />
                </div>
            </Modal>
        )
    }

    if (onboardingState.step === 'success') {
        return (
            <>
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1A0D26] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
                        <div className="px-8 py-8">
                            {renderSuccess()}
                        </div>
                    </div>
                </div>
                
                <GuidedTour
                    isOpen={isGuidedTourOpen}
                    onClose={() => setIsGuidedTourOpen(false)}
                    onComplete={() => {
                        setIsGuidedTourOpen(false);
                        updateState('step', 'basics');
                    }}
                />
            </>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-[#1A0D26] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
                
                {/* Debug Panel Toggle - Only in Development */}
                <button
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="absolute top-4 left-4 z-10 text-[10px] px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
                    title="Toggle Debug Panel"
                >
                    🐛 DEBUG {showDebugPanel ? 'ON' : 'OFF'}
                </button>

                {/* Debug Status Panel */}
                {showDebugPanel && (
                    <div className="absolute top-14 left-4 right-4 z-10 bg-black/95 border border-yellow-500/50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                        <div className="text-[10px] font-mono space-y-1">
                            <div className="text-yellow-400 font-bold mb-2">🐛 ONBOARDING DEBUG STATUS</div>
                            <div className="text-green-400">✓ User: {user ? `Authenticated (${user.email})` : '❌ NOT AUTHENTICATED'}</div>
                            <div className="text-green-400">✓ API Key: {hasApiKey ? 'Configured' : '❌ NOT CONFIGURED'}</div>
                            <div className="text-blue-400">• Business: {onboardingState.businessName || 'Not set'}</div>
                            <div className="text-blue-400">• Industry: {onboardingState.industry || 'Not set'}</div>
                            <div className="text-blue-400">• Step: {onboardingState.step}</div>
                            <div className="text-blue-400">• Design Plan: {onboardingState.designPlan ? '✓ Generated' : '❌ Missing'}</div>
                            <div className="text-blue-400">• Created Project ID: {createdProjectId || 'Not created yet'}</div>
                            {onboardingState.step === 'generating' && (
                                <div className="text-purple-400 mt-2">⚡ {generatingStatus}</div>
                            )}
                            <div className="text-gray-500 text-[9px] mt-2 pt-2 border-t border-gray-700">
                                Tip: Open browser console (F12) for detailed logs
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-start border-b border-white/5 bg-white/5">
                     <div>
                         <div className="flex items-center gap-3 mb-1">
                            <Wand2 className="text-yellow-400" size={20} />
                            <h2 className="text-lg font-bold text-white tracking-tight">AI Site Architect</h2>
                         </div>
                         <div className="flex items-center gap-2 mt-2">
                             {['basics', 'strategy', 'aesthetic', 'details', 'products', 'contact', 'visuals', 'review'].map((s, i) => (
                                 <div key={s} className={`h-1 w-6 rounded-full transition-colors ${['basics', 'strategy', 'aesthetic', 'details', 'products', 'contact', 'visuals', 'review'].indexOf(onboardingState.step) >= i ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
                             ))}
                         </div>
                     </div>
                     <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                        <X size={20} />
                     </button>
                </div>

                {/* Content */}
                <div className="px-8 py-8 overflow-y-auto flex-grow custom-scrollbar relative z-10">
                    {onboardingState.step === 'basics' && renderBasics()}
                    {onboardingState.step === 'strategy' && renderStrategy()}
                    {onboardingState.step === 'aesthetic' && renderAesthetic()}
                    {onboardingState.step === 'details' && renderDetails()}
                    {onboardingState.step === 'products' && renderProducts()}
                    {onboardingState.step === 'contact' && renderContact()}
                    {onboardingState.step === 'visuals' && renderVisuals()}
                    {onboardingState.step === 'review' && renderReview()}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex justify-between items-center border-t border-white/5 bg-white/5">
                     {onboardingState.step !== 'basics' ? (
                         <button onClick={() => {
                             const steps: OnboardingStep[] = ['basics', 'strategy', 'aesthetic', 'details', 'products', 'contact', 'visuals', 'review'];
                             const currentIndex = steps.indexOf(onboardingState.step);
                             if (currentIndex > 0) {
                                 updateState('step', steps[currentIndex - 1]);
                             }
                         }} className="text-sm text-gray-400 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Atrás</button>
                     ) : <div></div>}

                     <div className="flex items-center gap-3">
                         {/* Botón Saltar para pasos opcionales */}
                         {['details', 'products', 'contact', 'visuals'].includes(onboardingState.step) && (
                             <button
                                 onClick={handleNext}
                                 className="text-sm text-gray-400 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                             >
                                 Saltar
                             </button>
                         )}
                         
                         <button 
                            onClick={handleNext}
                            disabled={isLoading || (onboardingState.step === 'basics' && !onboardingState.businessName)}
                            className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                         >
                            {onboardingState.step === 'review' ? 'Crear Website' : onboardingState.step === 'visuals' ? 'Generar Diseño' : 'Continuar'} <ArrowRight size={18} className="ml-2" />
                         </button>
                     </div>
                </div>
             </div>
             
             {/* Guided Tour can also be triggered from regular wizard */}
             {isGuidedTourOpen && onboardingState.step !== 'success' && (
                 <GuidedTour
                     isOpen={isGuidedTourOpen}
                     onClose={() => setIsGuidedTourOpen(false)}
                     onComplete={() => {
                         setIsGuidedTourOpen(false);
                         updateState('step', 'basics');
                     }}
                 />
             )}
        </div>
    );
};

export default OnboardingWizard;
