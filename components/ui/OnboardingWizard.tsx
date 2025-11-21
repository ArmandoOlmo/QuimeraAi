
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import Modal from './Modal';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, ArrowRight, Wand2, Palette, Type, Layout, Loader2, X, Briefcase, Target, Layers, Gem, Monitor, PenTool, Leaf, Megaphone, Smile } from 'lucide-react';
import GeneratingState from './GeneratingState';
import { initialData } from '../../data/initialData';
import { OnboardingStep, AestheticType } from '../../types';

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
    const { addNewProject, handleApiError, hasApiKey, promptForKeySelection, getPrompt, onboardingState, setOnboardingState } = useEditor();
    
    // Local UI state for transient loading/status
    const [isLoading, setIsLoading] = useState(false);
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

    const handleNext = () => {
        switch(onboardingState.step) {
            case 'basics': updateState('step', 'strategy'); break;
            case 'strategy': updateState('step', 'aesthetic'); break;
            case 'aesthetic': generateDesignPlan(); break;
            case 'review': generateWebsite(); break;
        }
    };

    const generateField = async (field: 'summary' | 'audience' | 'offerings') => {
        if (!onboardingState.businessName || !onboardingState.industry) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setFieldLoading(field);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            let promptName = '';
            
            switch(field) {
                case 'summary': promptName = 'onboarding-summary'; break;
                case 'audience': promptName = 'onboarding-audience'; break;
                case 'offerings': promptName = 'onboarding-offerings'; break;
            }

            const promptConfig = getPrompt(promptName);
            if (!promptConfig) throw new Error(`Prompt ${promptName} not found`);

            const filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry);

            const response = await ai.models.generateContent({
                model: promptConfig.model,
                contents: filledPrompt,
            });

            updateState(field, response.text.trim());

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

            const filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry)
                .replace('{{aesthetic}}', onboardingState.aesthetic || 'Minimalist')
                .replace('{{colorVibe}}', onboardingState.colorVibe || 'Professional')
                .replace('{{goal}}', onboardingState.goal)
                .replace('{{summary}}', onboardingState.summary);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
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
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        updateState('step', 'generating');
        setGeneratingStatus('Architecting site structure...');
        
        try {
            const promptConfig = getPrompt('onboarding-website-json');
            if (!promptConfig) throw new Error("Website generation prompt not found");

            const filledPrompt = promptConfig.template
                .replace('{{businessName}}', onboardingState.businessName)
                .replace('{{industry}}', onboardingState.industry)
                .replace('{{aesthetic}}', onboardingState.aesthetic)
                .replace('{{designPlan}}', JSON.stringify(onboardingState.designPlan));

             setGeneratingStatus('Writing persuasive copy & painting pixels...');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: promptConfig.model,
                contents: filledPrompt,
                config: { responseMimeType: 'application/json' }
            });

            setGeneratingStatus('Finalizing project...');
            const jsonText = cleanJson(response.text);
            let result;
            try {
                result = JSON.parse(jsonText);
            } catch (e) {
                console.error("JSON Parse Error", e);
                throw new Error("Failed to parse AI response");
            }
            
            let generatedData = result.pageConfig?.data || result.data;
            if (!generatedData && result.hero) generatedData = result;

            const generatedTheme = result.pageConfig?.theme || result.theme || onboardingState.designPlan;
            const generatedPrompts = result.imagePrompts || result.pageConfig?.imagePrompts || {};

            // Deep merge with safe defaults
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
            
            const newProject = {
                id: `proj_${Date.now()}`,
                name: onboardingState.businessName,
                thumbnailUrl: 'https://picsum.photos/seed/newproject/800/600',
                status: 'Draft' as 'Draft',
                lastUpdated: new Date().toISOString(),
                data: safeData,
                theme: {
                    ...generatedTheme,
                    fontFamilyHeader: (generatedTheme.fontFamilyHeader || 'inter').toLowerCase().replace(/\s/g, '-'),
                    fontFamilyBody: (generatedTheme.fontFamilyBody || 'inter').toLowerCase().replace(/\s/g, '-'),
                    fontFamilyButton: (generatedTheme.fontFamilyButton || 'inter').toLowerCase().replace(/\s/g, '-'),
                },
                brandIdentity: {
                    name: onboardingState.businessName,
                    industry: onboardingState.industry,
                    targetAudience: onboardingState.audience,
                    toneOfVoice: onboardingState.aesthetic as any, // Mapping aesthetic to tone roughly
                    coreValues: onboardingState.goal,
                    language: 'English'
                },
                componentOrder: result.pageConfig?.componentOrder || onboardingState.designPlan.componentOrder || initialData.componentOrder,
                sectionVisibility: result.pageConfig?.sectionVisibility || initialData.sectionVisibility,
                imagePrompts: generatedPrompts, 
            };
            
            await addNewProject(newProject);
            onClose();
            updateState('step', 'basics');

        } catch (error) {
            handleApiError(error);
            console.error("Error generating website:", error);
            setGeneratingStatus('Error encountered. Please try again.');
            setTimeout(() => updateState('step', 'review'), 2000);
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

    // --- Step 4: Review (Loading or Success) ---
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

        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-[#130a1d] p-6 rounded-xl border border-white/10">
                    <h3 className="font-bold text-white flex items-center mb-6 text-sm uppercase tracking-wider">
                        <Palette className="mr-2 text-yellow-400" size={16}/> AI Design Blueprint
                    </h3>
                    
                    {/* Palette Visualization */}
                    <div className="flex gap-4 mb-8 justify-center">
                        {['primary', 'secondary', 'accent', 'background'].map(k => (
                            <div key={k} className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-12 h-12 rounded-lg shadow-lg ring-1 ring-white/20" 
                                    style={{ backgroundColor: p[k] || '#000' }}
                                />
                                <span className="text-[10px] text-gray-500 uppercase">{k}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
                         <div>
                             <span className="text-[10px] text-gray-500 uppercase block mb-1">Headings</span>
                             <p className="text-lg font-bold text-white capitalize" style={{ fontFamily: t.header }}>{t.header?.replace(/-/g, ' ')}</p>
                         </div>
                         <div>
                             <span className="text-[10px] text-gray-500 uppercase block mb-1">Body Copy</span>
                             <p className="text-lg text-gray-300 capitalize" style={{ fontFamily: t.body }}>{t.body?.replace(/-/g, ' ')}</p>
                         </div>
                    </div>
                </div>
                
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                    <p className="text-gray-300 text-sm">
                        Ready to generate <strong>{onboardingState.businessName}</strong> with the <strong>{onboardingState.aesthetic}</strong> aesthetic?
                    </p>
                </div>
            </div>
        )
    };

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-[#1A0D26] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
                
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-start border-b border-white/5 bg-white/5">
                     <div>
                         <div className="flex items-center gap-3 mb-1">
                            <Wand2 className="text-yellow-400" size={20} />
                            <h2 className="text-lg font-bold text-white tracking-tight">AI Site Architect</h2>
                         </div>
                         <div className="flex items-center gap-2 mt-2">
                             {['basics', 'strategy', 'aesthetic', 'review'].map((s, i) => (
                                 <div key={s} className={`h-1 w-8 rounded-full transition-colors ${['basics', 'strategy', 'aesthetic', 'review'].indexOf(onboardingState.step) >= i ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
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
                    {onboardingState.step === 'review' && renderReview()}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex justify-between items-center border-t border-white/5 bg-white/5">
                     {onboardingState.step !== 'basics' ? (
                         <button onClick={() => {
                             const steps = ['basics', 'strategy', 'aesthetic', 'review'];
                             const prev = steps[steps.indexOf(onboardingState.step) - 1];
                             updateState('step', prev);
                         }} className="text-sm text-gray-400 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Back</button>
                     ) : <div></div>}

                     <button 
                        onClick={handleNext}
                        disabled={isLoading || (onboardingState.step === 'basics' && !onboardingState.businessName)}
                        className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                     >
                        {onboardingState.step === 'review' ? 'Launch Construction' : 'Continue'} <ArrowRight size={18} className="ml-2" />
                     </button>
                </div>
             </div>
        </div>
    );
};

export default OnboardingWizard;
