
import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import Modal from './Modal';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { Sparkles, ArrowRight, Wand2, Palette, Type, Layout, Loader2, X, Briefcase, Target, Layers, Gem, Monitor, PenTool, Leaf, Megaphone, Smile, Building2, Package, Phone, Image as ImageIcon, Star, Plus, Trash2, Rocket, CheckCircle } from 'lucide-react';
import GeneratingState from './GeneratingState';
import GuidedTour from './GuidedTour';
import ColorControl from './ColorControl';
import { initialData } from '../../data/initialData';
import { OnboardingStep, AestheticType, ProductInfo, TestimonialInfo, ContactInfo, PageSection, ImageGenerationProgress } from '../../types';
import { trackOnboardingStarted, trackOnboardingCompleted, trackProjectCreated } from '../../utils/analytics';
import { getContrastingTextColor, ensureTextContrast } from '../../utils/colorUtils';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

/**
 * Converts hex color to rgba with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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
    const { addNewProject, handleApiError, hasApiKey, promptForKeySelection, getPrompt, onboardingState, setOnboardingState, componentStatus, componentStyles, customComponents, setView, uploadImageAndGetURL, loadProject, user, generateProjectImagesWithProgress } = useEditor();
    
    // Local UI state for transient loading/status
    const [isLoading, setIsLoading] = useState(false);
    const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const onboardingStartTime = useRef<number | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    // Track onboarding start
    useEffect(() => {
        if (isOpen && !onboardingStartTime.current) {
            onboardingStartTime.current = Date.now();
            trackOnboardingStarted();
        }
    }, [isOpen]);
    const [generatingStatus, setGeneratingStatus] = useState('Initializing...');
    const [fieldLoading, setFieldLoading] = useState<string | null>(null);
    const [imageProgress, setImageProgress] = useState<ImageGenerationProgress>({
        current: 0,
        total: 0,
        currentSection: '',
        completedImages: [],
        failedPaths: []
    });
    
    // Helper to update context state
    const updateState = (key: string, value: any) => {
        setOnboardingState(prev => ({ ...prev, [key]: value }));
    };

    const cleanJson = (text: string) => {
        let cleaned = text.replace(/```json\n?|```/g, '').trim();
        
        // Handle both objects {} and arrays []
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        // Determine if it's an array or object
        const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
        
        if (isArray && firstBracket !== -1 && lastBracket !== -1) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1 && lastBrace !== -1) {
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

    const generateField = async (field: 'summary' | 'audience' | 'offerings' | 'goal' | 'colorVibe' | 'uniqueValueProposition' | 'companyHistory' | 'coreValues') => {
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
                case 'goal': promptName = 'onboarding-goal'; break;
                case 'colorVibe': promptName = 'onboarding-color-vibe'; break;
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
                .replace('{{audience}}', onboardingState.audience || '')
                .replace('{{aesthetic}}', onboardingState.aesthetic || 'Minimalist');

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
            
            // Step 6.4.5: Ensure critical fields have default values and are correct types
            console.log("🔧 [generateWebsite] Step 6.4.5: Ensuring critical fields have defaults...");
            if (safeData.hero) {
                // Ensure headline is always a valid string
                if (!safeData.hero.headline || typeof safeData.hero.headline !== 'string') {
                    safeData.hero.headline = onboardingState.businessName || 'Welcome';
                    console.log("   ✓ Set default headline:", safeData.hero.headline);
                } else {
                    // Convert to string if it's not already
                    safeData.hero.headline = String(safeData.hero.headline);
                }
                
                // Ensure subheadline is always a valid string
                if (!safeData.hero.subheadline || typeof safeData.hero.subheadline !== 'string') {
                    safeData.hero.subheadline = onboardingState.summary || 'Your business description';
                    console.log("   ✓ Set default subheadline:", safeData.hero.subheadline);
                } else {
                    // Convert to string if it's not already
                    safeData.hero.subheadline = String(safeData.hero.subheadline);
                }
                
                // Ensure primaryCta and secondaryCta are strings
                if (!safeData.hero.primaryCta || typeof safeData.hero.primaryCta !== 'string') {
                    // Fallback CTA - AI should generate appropriate one based on business focus
                    safeData.hero.primaryCta = 'Get Started';
                } else {
                    safeData.hero.primaryCta = String(safeData.hero.primaryCta);
                }
                
                if (!safeData.hero.secondaryCta || typeof safeData.hero.secondaryCta !== 'string') {
                    safeData.hero.secondaryCta = 'Learn More';
                } else {
                    safeData.hero.secondaryCta = String(safeData.hero.secondaryCta);
                }
            }
            console.log("✅ [generateWebsite] Critical fields validated");
            
            // Step 6.5: Apply Design Plan colors ONLY to selected components (system decides which to use)
            console.log("🎨 [generateWebsite] Step 6.5: Applying Design Plan colors to selected components...");
            if (generatedTheme?.palette || onboardingState.designPlan?.palette) {
                // Use Design Plan palette as source of truth
                const palette = generatedTheme?.palette || onboardingState.designPlan?.palette;
                console.log("🎨 [generateWebsite] Design Plan palette:", palette);
                
                // Get components selected by Design Plan (the system decides which to use)
                const designPlanComponents = result.pageConfig?.componentOrder || 
                                             onboardingState.designPlan?.componentOrder || 
                                             [];
                
                console.log("📋 [generateWebsite] Components selected by Design Plan:", designPlanComponents);
                
                // Apply palette ONLY to components selected by the Design Plan
                designPlanComponents.forEach((section: string) => {
                    if (safeData[section as PageSection]) {
                        // FORCE Design Plan colors - do not preserve initialData colors
                        const sectionData = safeData[section as PageSection];
                        const existingColors = sectionData.colors || {};
                        
                        // Determine background color for this section
                        const sectionBg = palette.background || '#0f172a';
                        
                        // Ensure text color has proper contrast with background
                        const textColor = ensureTextContrast(sectionBg, palette.text);
                        const headingColor = ensureTextContrast(sectionBg, palette.text);
                        
                        // Build new colors object with Design Plan as absolute priority
                        const newColors: any = {
                            // Core colors from Design Plan with contrast verification
                            background: sectionBg,
                            text: textColor,
                            heading: headingColor,
                            accent: palette.primary || palette.accent || '#4f46e5',
                            primary: palette.primary,
                            secondary: palette.secondary,
                        };
                        
                        // Apply brand color to buttons
                        newColors.buttonBackground = palette.primary || '#4f46e5';
                        newColors.buttonText = getContrastingTextColor(newColors.buttonBackground);
                        
                        // Apply PRIMARY brand color to cards for specific components
                        if (['features', 'testimonials', 'menu', 'map'].includes(section)) {
                            newColors.cardBackground = palette.primary || '#4f46e5';
                            // Ensure text on cards contrasts with primary color
                            const cardTextColor = getContrastingTextColor(newColors.cardBackground);
                            newColors.text = cardTextColor;
                            newColors.heading = cardTextColor;
                            // Border color slightly different from card background
                            newColors.borderColor = palette.secondary || palette.accent || '#374151';
                        }
                        
                        // FAQ: use SECONDARY color
                        if (section === 'faq') {
                            newColors.background = palette.secondary || '#10b981';
                            newColors.cardBackground = palette.secondary || '#10b981';
                            const faqTextColor = getContrastingTextColor(newColors.background);
                            newColors.text = faqTextColor;
                            newColors.heading = faqTextColor;
                            newColors.borderColor = palette.accent || '#059669';
                        }
                        
                        // Leads: PRIMARY color for form background
                        if (section === 'leads') {
                            newColors.cardBackground = palette.primary || '#4f46e5';
                            const leadsTextColor = getContrastingTextColor(newColors.cardBackground);
                            newColors.text = leadsTextColor;
                            newColors.heading = leadsTextColor;
                            newColors.buttonBackground = palette.primary || '#4f46e5';
                            newColors.buttonText = getContrastingTextColor(newColors.buttonBackground);
                        }
                        
                        // Newsletter: PRIMARY color at 75% opacity
                        if (section === 'newsletter') {
                            const primaryColor = palette.primary || '#4f46e5';
                            // Convert hex to rgba with 75% opacity
                            const rgbaColor = hexToRgba(primaryColor, 0.75);
                            newColors.cardBackground = rgbaColor;
                            const newsletterTextColor = getContrastingTextColor(primaryColor);
                            newColors.text = newsletterTextColor;
                            newColors.heading = newsletterTextColor;
                            newColors.buttonBackground = palette.primary || '#4f46e5';
                            newColors.buttonText = getContrastingTextColor(newColors.buttonBackground);
                        }
                        
                        // Preserve section-specific color properties that don't conflict with Design Plan
                        // (like gradientStart, gradientEnd, border, linkHover)
                        if (existingColors.gradientStart) newColors.gradientStart = existingColors.gradientStart;
                        if (existingColors.gradientEnd) newColors.gradientEnd = existingColors.gradientEnd;
                        if (existingColors.border) newColors.border = existingColors.border;
                        if (!['features', 'testimonials', 'menu', 'map'].includes(section) && existingColors.borderColor) {
                            newColors.borderColor = existingColors.borderColor;
                        }
                        if (existingColors.linkHover) newColors.linkHover = existingColors.linkHover;
                        
                        sectionData.colors = newColors;
                        console.log(`   ✓ Applied Design Plan palette to ${section}:`, {
                            background: newColors.background,
                            text: newColors.text,
                            accent: newColors.accent,
                            buttonBackground: newColors.buttonBackground
                        });
                    }
                });
                
                // Always apply to header (it's always present)
                // Use PRIMARY brand color for header background (SOLID, not transparent)
                if (safeData.header) {
                    const headerBg = palette.primary || palette.background || '#0f172a';
                    
                    // Calculate contrasting text color based on background luminance
                    const textColor = getContrastingTextColor(headerBg);
                    
                    safeData.header.colors = {
                        background: headerBg, // SOLID color, NOT transparent
                        text: textColor,      // Contrasting text color for readability
                        accent: palette.secondary || palette.accent || '#ffffff',
                    };
                    
                    // Force header style to solid (not transparent)
                    safeData.header.style = 'sticky-solid';
                    
                    console.log(`   ✓ Applied brand color to header:`, {
                        background: headerBg,
                        text: textColor,
                        style: 'sticky-solid'
                    });
                }
                
                // Always apply SAME color to footer (matches header)
                if (safeData.footer) {
                    const footerBg = palette.primary || palette.background || '#0f172a';
                    const footerTextColor = getContrastingTextColor(footerBg);
                    
                    safeData.footer.colors = {
                        background: footerBg, // SAME as header - brand color
                        text: footerTextColor,
                        heading: footerTextColor,
                        border: footerBg,
                        linkHover: palette.secondary || palette.accent || '#ffffff',
                    };
                    
                    console.log(`   ✓ Applied brand color to footer (same as header):`, {
                        background: footerBg,
                        text: footerTextColor
                    });
                }
                
                console.log("✅ [generateWebsite] Design Plan colors applied to selected components");
            }
            
            // Step 6.6: Apply layoutStrategy from Design Plan
            console.log("🎨 [generateWebsite] Step 6.6: Applying layoutStrategy from Design Plan...");
            if (onboardingState.designPlan?.layoutStrategy) {
                const layoutStrategy = onboardingState.designPlan.layoutStrategy;
                
                // Apply header layout and style
                if (layoutStrategy.headerLayout && safeData.header) {
                    safeData.header.layout = layoutStrategy.headerLayout;
                    console.log(`   ✓ Applied headerLayout: ${layoutStrategy.headerLayout}`);
                }
                if (layoutStrategy.headerStyle && safeData.header) {
                    safeData.header.style = layoutStrategy.headerStyle;
                    console.log(`   ✓ Applied headerStyle: ${layoutStrategy.headerStyle}`);
                }
                
                // Apply hero image style and position
                if (layoutStrategy.heroImageStyle && safeData.hero) {
                    safeData.hero.imageStyle = layoutStrategy.heroImageStyle;
                    console.log(`   ✓ Applied heroImageStyle: ${layoutStrategy.heroImageStyle}`);
                }
                if (layoutStrategy.heroImagePosition && safeData.hero) {
                    safeData.hero.imagePosition = layoutStrategy.heroImagePosition;
                    console.log(`   ✓ Applied heroImagePosition: ${layoutStrategy.heroImagePosition}`);
                }
                
                console.log("✅ [generateWebsite] layoutStrategy applied");
            }
            
            // Step 6.7: Apply uiShapes from Design Plan to theme
            console.log("🎨 [generateWebsite] Step 6.7: Applying uiShapes from Design Plan...");
            let themeWithShapes = { ...generatedTheme };
            if (onboardingState.designPlan?.uiShapes) {
                const uiShapes = onboardingState.designPlan.uiShapes;
                if (uiShapes.cardBorderRadius) {
                    themeWithShapes.cardBorderRadius = uiShapes.cardBorderRadius;
                    console.log(`   ✓ Applied cardBorderRadius: ${uiShapes.cardBorderRadius}`);
                }
                if (uiShapes.buttonBorderRadius) {
                    themeWithShapes.buttonBorderRadius = uiShapes.buttonBorderRadius;
                    console.log(`   ✓ Applied buttonBorderRadius: ${uiShapes.buttonBorderRadius}`);
                }
                console.log("✅ [generateWebsite] uiShapes applied");
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
                ...themeWithShapes,
                fontFamilyHeader: (themeWithShapes.fontFamilyHeader || 'inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyBody: (themeWithShapes.fontFamilyBody || 'inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyButton: (themeWithShapes.fontFamilyButton || 'inter').toLowerCase().replace(/\s/g, '-'),
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
            
            // Step 7.2: Ensure ALL enabled components are included in componentOrder
            console.log("📋 [generateWebsite] Step 7.2: Ensuring all enabled components are included...");
            const designPlanOrder = result.pageConfig?.componentOrder || onboardingState.designPlan?.componentOrder || [];
            const enabledComponents = Object.entries(componentStatus)
                .filter(([_, enabled]) => enabled !== false)
                .map(([key, _]) => key as PageSection);

            // Merge: Start with Design Plan order, then add any missing enabled components
            const mergedComponentOrder: PageSection[] = [];
            const addedComponents = new Set<string>();

            // First, add components from Design Plan (in order)
            designPlanOrder.forEach((comp: string) => {
                if (componentStatus[comp as PageSection] !== false && !addedComponents.has(comp)) {
                    mergedComponentOrder.push(comp as PageSection);
                    addedComponents.add(comp);
                }
            });

            // Then, add any enabled components that weren't in the Design Plan
            enabledComponents.forEach(comp => {
                if (!addedComponents.has(comp)) {
                    mergedComponentOrder.push(comp);
                    addedComponents.add(comp);
                }
            });

            // Always ensure header and footer are included (if enabled)
            if (componentStatus.header !== false && !addedComponents.has('header')) {
                mergedComponentOrder.unshift('header');
            }
            if (componentStatus.footer !== false && !addedComponents.has('footer')) {
                mergedComponentOrder.push('footer');
            }

            console.log("✅ [generateWebsite] Component order merged:", {
                designPlanCount: designPlanOrder.length,
                enabledCount: enabledComponents.length,
                finalCount: mergedComponentOrder.length,
                finalOrder: mergedComponentOrder
            });
            
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
                componentOrder: mergedComponentOrder,
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
            
            // Step 9: Generate images with progress UI
            console.log("🖼️ [generateWebsite] Step 9: Starting image generation...");
            if (generatedPrompts && Object.keys(generatedPrompts).length > 0) {
                updateState('step', 'generating-images' as OnboardingStep);
                
                // Reset image progress
                setImageProgress({
                    current: 0,
                    total: Object.keys(generatedPrompts).length,
                    currentSection: '',
                    completedImages: [],
                    failedPaths: []
                });

                // Create a project object with the saved ID for the image generation
                const projectForImages = { 
                    ...cleanedProject, 
                    id: savedProjectId 
                };

                // Generate images with progress callbacks
                const imageResult = await generateProjectImagesWithProgress(
                    projectForImages,
                    generatedPrompts,
                    (current, total, section, imageUrl) => {
                        setImageProgress(prev => ({
                            ...prev,
                            current,
                            total,
                            currentSection: section,
                            completedImages: imageUrl 
                                ? [...prev.completedImages, imageUrl]
                                : prev.completedImages
                        }));
                    }
                );

                // Update failed paths if any
                if (imageResult.failedPaths.length > 0) {
                    setImageProgress(prev => ({
                        ...prev,
                        failedPaths: imageResult.failedPaths
                    }));
                }

                console.log("✅ [generateWebsite] Image generation complete:", {
                    generated: Object.keys(imageResult.generatedImages).length,
                    failed: imageResult.failedPaths.length
                });
            } else {
                console.log("ℹ️ [generateWebsite] No image prompts to generate");
            }
            
            // Track project creation analytics
            console.log("📊 [generateWebsite] Step 10: Tracking analytics...");
            const duration = onboardingStartTime.current 
                ? Math.round((Date.now() - onboardingStartTime.current) / 1000) 
                : 0;
            trackProjectCreated(savedProjectId, newProject.name, false);
            trackOnboardingCompleted(savedProjectId, newProject.name, duration);
            console.log("✅ [generateWebsite] Analytics tracked (duration:", duration, "s)");
            
            // Show success step with option to start guided tour
            console.log("🎉 [generateWebsite] Step 11: Showing success screen...");
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
                    <InputLabel 
                        label="Business Focus" 
                        onAiAssist={() => generateField('goal')} 
                        isLoading={fieldLoading === 'goal'}
                    />
                    <InputField 
                        value={onboardingState.goal} 
                        onChange={(e) => updateState('goal', e.target.value)} 
                        placeholder="e.g. Generate leads, Sell products online, Showcase portfolio, Book appointments, Build brand awareness"
                    />
                    <p className="text-xs text-gray-500 mt-1">What's the main purpose of your website?</p>
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
                <InputLabel 
                    label="Color Vibe" 
                    onAiAssist={() => generateField('colorVibe')} 
                    isLoading={fieldLoading === 'colorVibe'}
                />
                <InputField 
                    value={onboardingState.colorVibe || ''} 
                    onChange={(e) => updateState('colorVibe', e.target.value)} 
                    placeholder="e.g. Trustworthy Blue, Energetic Orange, Deep Forest Green" 
                />
                <p className="text-xs text-gray-500 mt-1">What emotional tone should your brand colors convey?</p>
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

        const generateProducts = async () => {
            if (!onboardingState.businessName || !onboardingState.industry) return;
            if (hasApiKey === false) { await promptForKeySelection(); return; }

            setFieldLoading('products');
            try {
                const ai = await getGoogleGenAI();
                const promptConfig = getPrompt('onboarding-products');
                if (!promptConfig) throw new Error('Prompt onboarding-products not found');

                const filledPrompt = promptConfig.template
                    .replace('{{businessName}}', onboardingState.businessName)
                    .replace('{{industry}}', onboardingState.industry)
                    .replace('{{summary}}', onboardingState.summary || '')
                    .replace('{{offerings}}', onboardingState.offerings || '');

                const response = await ai.models.generateContent({
                    model: promptConfig.model,
                    contents: filledPrompt,
                    config: { responseMimeType: 'application/json' }
                });

                const jsonText = cleanJson(response.text);
                const productsData = JSON.parse(jsonText);
                
                // Convert to ProductInfo format with IDs
                const products: ProductInfo[] = productsData.map((p: any, index: number) => ({
                    id: `prod_${Date.now()}_${index}`,
                    name: p.name || '',
                    description: p.description || '',
                    price: p.price || '',
                    features: []
                }));

                updateState('products', products);
            } catch (error) {
                handleApiError(error);
                console.error('Error generating products:', error);
            } finally {
                setFieldLoading(null);
            }
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
                    {(onboardingState.products || []).length === 0 && (
                        <button
                            onClick={generateProducts}
                            disabled={fieldLoading === 'products'}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {fieldLoading === 'products' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generar con IA
                                </>
                            )}
                        </button>
                    )}
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
            
            {/* FAQs Section */}
            <div className="border-t border-white/10 pt-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <InputLabel 
                        label="Preguntas Frecuentes (FAQ)" 
                        onAiAssist={async () => {
                            if (!onboardingState.businessName || !onboardingState.industry) return;
                            if (hasApiKey === false) { await promptForKeySelection(); return; }

                            setFieldLoading('faqs');
                            try {
                                const ai = await getGoogleGenAI();
                                const promptConfig = getPrompt('onboarding-faqs');
                                if (!promptConfig) throw new Error('Prompt onboarding-faqs not found');

                                const filledPrompt = promptConfig.template
                                    .replace('{{businessName}}', onboardingState.businessName)
                                    .replace('{{industry}}', onboardingState.industry)
                                    .replace('{{summary}}', onboardingState.summary || '')
                                    .replace('{{audience}}', onboardingState.audience || '');

                                const response = await ai.models.generateContent({
                                    model: promptConfig.model,
                                    contents: filledPrompt,
                                    config: { responseMimeType: 'application/json' }
                                });

                                const jsonText = cleanJson(response.text);
                                const faqsData = JSON.parse(jsonText);
                                updateState('faqs', faqsData);
                            } catch (error) {
                                console.error('Error generating FAQs:', error);
                                alert('Error al generar FAQs. Por favor intenta de nuevo.');
                            } finally {
                                setFieldLoading(null);
                            }
                        }}
                        isLoading={fieldLoading === 'faqs'}
                    />
                </div>
                
                {(onboardingState.faqs || []).map((faq, index) => (
                    <div key={index} className="space-y-2 mb-4 p-4 border border-white/10 rounded-lg">
                        <InputField 
                            value={faq.question} 
                            onChange={(e) => {
                                const newFaqs = [...(onboardingState.faqs || [])];
                                newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                                updateState('faqs', newFaqs);
                            }} 
                            placeholder="Pregunta" 
                        />
                        <textarea
                            value={faq.answer}
                            onChange={(e) => {
                                const newFaqs = [...(onboardingState.faqs || [])];
                                newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                                updateState('faqs', newFaqs);
                            }}
                            placeholder="Respuesta"
                            className="w-full bg-dark-800 border border-dark-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary resize-none"
                            rows={3}
                        />
                        <button
                            onClick={() => {
                                const newFaqs = (onboardingState.faqs || []).filter((_, i) => i !== index);
                                updateState('faqs', newFaqs);
                            }}
                            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                            <Trash2 size={14} />
                            Eliminar
                        </button>
                    </div>
                ))}
                
                {(onboardingState.faqs || []).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No hay preguntas frecuentes. Usa el asistente de IA para generarlas.
                    </p>
                )}
                
                <button
                    onClick={() => {
                        const newFaq = { question: '', answer: '' };
                        updateState('faqs', [...(onboardingState.faqs || []), newFaq]);
                    }}
                    className="w-full py-3 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Agregar Pregunta Frecuente
                </button>
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

        const generateTestimonials = async () => {
            if (!onboardingState.businessName || !onboardingState.industry) return;
            if (hasApiKey === false) { await promptForKeySelection(); return; }

            setFieldLoading('testimonials');
            try {
                const ai = await getGoogleGenAI();
                const promptConfig = getPrompt('onboarding-testimonials');
                if (!promptConfig) throw new Error('Prompt onboarding-testimonials not found');

                const filledPrompt = promptConfig.template
                    .replace('{{businessName}}', onboardingState.businessName)
                    .replace('{{industry}}', onboardingState.industry)
                    .replace('{{summary}}', onboardingState.summary || '')
                    .replace('{{audience}}', onboardingState.audience || '');

                const response = await ai.models.generateContent({
                    model: promptConfig.model,
                    contents: filledPrompt,
                    config: { responseMimeType: 'application/json' }
                });

                const jsonText = cleanJson(response.text);
                const testimonialsData = JSON.parse(jsonText);
                
                // Convert to TestimonialInfo format with IDs
                const testimonials: TestimonialInfo[] = testimonialsData.map((t: any, index: number) => ({
                    id: `test_${Date.now()}_${index}`,
                    quote: t.quote || '',
                    author: t.author || '',
                    role: t.role || '',
                    company: t.company || ''
                }));

                updateState('testimonials', testimonials);
            } catch (error) {
                handleApiError(error);
                console.error('Error generating testimonials:', error);
            } finally {
                setFieldLoading(null);
            }
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
                    
                    {(onboardingState.testimonials || []).length === 0 && (
                        <button
                            onClick={generateTestimonials}
                            disabled={fieldLoading === 'testimonials'}
                            className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {fieldLoading === 'testimonials' ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generar con IA
                                </>
                            )}
                        </button>
                    )}
                    
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
                    <p className="text-xs text-gray-400 mb-4">Si ya tienes colores de marca, ingrésalos aquí. Estos colores se aplicarán a tu sitio web.</p>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <ColorControl 
                                label="Color Primario" 
                                value={onboardingState.brandGuidelines?.primaryColor || '#4f46e5'} 
                                onChange={(value) => updateState('brandGuidelines', { 
                                    ...(onboardingState.brandGuidelines || {}), 
                                    primaryColor: value 
                                })} 
                            />
                            <p className="text-xs text-gray-500 mt-1">Se usará en botones, header, footer y elementos principales</p>
                        </div>
                        
                        <div>
                            <ColorControl 
                                label="Color Secundario" 
                                value={onboardingState.brandGuidelines?.secondaryColor || '#ec4899'} 
                                onChange={(value) => updateState('brandGuidelines', { 
                                    ...(onboardingState.brandGuidelines || {}), 
                                    secondaryColor: value 
                                })} 
                            />
                            <p className="text-xs text-gray-500 mt-1">Se usará para acentos y elementos secundarios</p>
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
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse"></div>
                    <img 
                        src={QUIMERA_LOGO} 
                        alt="Quimera AI" 
                        className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse"
                    />
                </div>
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
                    <GeneratingState statusText={generatingStatus} phase="content" />
                </div>
            </Modal>
        )
    }

    if (onboardingState.step === 'generating-images') {
        return (
            <Modal isOpen={isOpen} onClose={() => {}}>
                <div className="h-[550px] w-full bg-[#1A0D26] rounded-2xl border border-white/10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <GeneratingState 
                        statusText="" 
                        phase="images" 
                        imageProgress={imageProgress}
                    />
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
                
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-start border-b border-white/5 bg-white/5">
                     <div>
                         <div className="flex items-center gap-3 mb-1">
                            <div className="relative w-7 h-7">
                                <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse"></div>
                                <img 
                                    src={QUIMERA_LOGO} 
                                    alt="Quimera AI" 
                                    className="relative w-full h-full object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                                />
                            </div>
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
