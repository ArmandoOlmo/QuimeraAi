/**
 * ChatbotSetupWizard
 * A simplified step-by-step wizard for configuring the chatbot
 * Designed for users who don't have technical knowledge
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    MessageSquare, 
    Sparkles, 
    Users, 
    Mail, 
    Check, 
    ChevronRight, 
    ChevronLeft,
    Eye,
    HelpCircle,
    Palette,
    MessageCircle,
    Zap
} from 'lucide-react';
import { AiAssistantConfig, FAQItem } from '../../../types/ai-assistant';
import { useProject } from '../../../contexts/project';
import { INDUSTRY_TEMPLATES, getIndustryTemplate } from '../../../data/chatbotIndustryTemplates';
import ChatCore from '../../chat/ChatCore';
import { getDefaultAppearanceConfig } from '../../../utils/chatThemes';

// =============================================================================
// TYPES
// =============================================================================

interface WizardStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface ChatbotSetupWizardProps {
    config: AiAssistantConfig;
    onSave: (config: AiAssistantConfig) => Promise<void>;
    onClose?: () => void;
}

type ToneOption = 'Friendly' | 'Professional' | 'Formal' | 'Casual';

// =============================================================================
// WIZARD STEPS DEFINITION
// =============================================================================

const WIZARD_STEPS: WizardStep[] = [
    {
        id: 'name',
        title: 'wizardSteps.name.title',
        description: 'wizardSteps.name.description',
        icon: <MessageSquare className="w-5 h-5" />,
    },
    {
        id: 'tone',
        title: 'wizardSteps.tone.title',
        description: 'wizardSteps.tone.description',
        icon: <Users className="w-5 h-5" />,
    },
    {
        id: 'faqs',
        title: 'wizardSteps.faqs.title',
        description: 'wizardSteps.faqs.description',
        icon: <HelpCircle className="w-5 h-5" />,
    },
    {
        id: 'leads',
        title: 'wizardSteps.leads.title',
        description: 'wizardSteps.leads.description',
        icon: <Mail className="w-5 h-5" />,
    },
    {
        id: 'preview',
        title: 'wizardSteps.preview.title',
        description: 'wizardSteps.preview.description',
        icon: <Eye className="w-5 h-5" />,
    },
];

// =============================================================================
// TONE OPTIONS
// =============================================================================

const TONE_OPTIONS: { value: ToneOption; emoji: string; example: string }[] = [
    { 
        value: 'Friendly', 
        emoji: '😊', 
        example: '¡Hola! ¿En qué puedo ayudarte hoy? Estoy aquí para lo que necesites.' 
    },
    { 
        value: 'Professional', 
        emoji: '💼', 
        example: 'Buenos días. ¿En qué puedo asistirle? Estoy a su disposición.' 
    },
    { 
        value: 'Formal', 
        emoji: '🎩', 
        example: 'Estimado usuario, ¿en qué podemos servirle? Agradecemos su consulta.' 
    },
    { 
        value: 'Casual', 
        emoji: '✌️', 
        example: '¡Hey! ¿Qué onda? ¿Cómo te puedo echar la mano?' 
    },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ChatbotSetupWizard: React.FC<ChatbotSetupWizardProps> = ({
    config,
    onSave,
    onClose,
}) => {
    const { t } = useTranslation();
    const { activeProject } = useProject();
    
    // Wizard state
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [agentName, setAgentName] = useState(config.agentName || '');
    const [tone, setTone] = useState<ToneOption>((config.tone as ToneOption) || 'Friendly');
    const [faqs, setFaqs] = useState<FAQItem[]>(config.faqs || []);
    const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(config.leadCaptureEnabled);
    const [preChatForm, setPreChatForm] = useState(config.leadCaptureConfig?.preChatForm || false);
    
    // Get industry for suggestions
    const industry = activeProject?.brandIdentity?.industry || 'default';
    const industryTemplate = getIndustryTemplate(industry);
    
    // Initialize FAQs from industry if empty
    useEffect(() => {
        if (faqs.length === 0 && industryTemplate) {
            const suggestedFaqs = industryTemplate.defaultFAQs.es; // or .en based on language
            setFaqs(suggestedFaqs);
        }
    }, [industry]);

    // Build preview config
    const previewConfig: AiAssistantConfig = {
        ...config,
        agentName,
        tone,
        faqs,
        leadCaptureEnabled,
        leadCaptureConfig: {
            ...config.leadCaptureConfig!,
            enabled: leadCaptureEnabled,
            preChatForm,
        },
    };

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleNext = () => {
        if (currentStep < WIZARD_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(previewConfig);
            onClose?.();
        } catch (error) {
            console.error('Error saving chatbot config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddFaq = () => {
        const newFaq: FAQItem = {
            id: `faq-${Date.now()}`,
            question: '',
            answer: '',
        };
        setFaqs([...faqs, newFaq]);
    };

    const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
        const updated = [...faqs];
        updated[index] = { ...updated[index], [field]: value };
        setFaqs(updated);
    };

    const handleRemoveFaq = (index: number) => {
        setFaqs(faqs.filter((_, i) => i !== index));
    };

    const handleAddSuggestedFaq = (faq: FAQItem) => {
        // Check if already added
        if (!faqs.some(f => f.question === faq.question)) {
            setFaqs([...faqs, { ...faq, id: `faq-${Date.now()}` }]);
        }
    };

    const canProceed = () => {
        switch (WIZARD_STEPS[currentStep].id) {
            case 'name':
                return agentName.trim().length > 0;
            case 'tone':
                return true;
            case 'faqs':
                return true; // FAQs are optional
            case 'leads':
                return true;
            case 'preview':
                return true;
            default:
                return true;
        }
    };

    // =============================================================================
    // RENDER STEPS
    // =============================================================================

    const renderStepContent = () => {
        switch (WIZARD_STEPS[currentStep].id) {
            case 'name':
                return renderNameStep();
            case 'tone':
                return renderToneStep();
            case 'faqs':
                return renderFaqsStep();
            case 'leads':
                return renderLeadsStep();
            case 'preview':
                return renderPreviewStep();
            default:
                return null;
        }
    };

    const renderNameStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                    {t('chatbotWizard.nameStep.heading', '¿Cómo quieres que se llame tu asistente?')}
                </h3>
                <p className="text-muted-foreground mt-2">
                    {t('chatbotWizard.nameStep.subheading', 'Este nombre aparecerá cuando tus clientes chateen')}
                </p>
            </div>

            <div className="max-w-md mx-auto">
                <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder={t('chatbotWizard.nameStep.placeholder', 'Ej: Asistente de Mi Negocio')}
                    className="w-full px-4 py-3 text-lg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    autoFocus
                />
                
                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                        {t('chatbotWizard.nameStep.suggestions', 'Sugerencias:')}
                    </span>
                    {[
                        `Asistente de ${activeProject?.name || 'Tu Negocio'}`,
                        'Soporte Virtual',
                        'Asistente AI',
                        industryTemplate?.emoji + ' Helper',
                    ].map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => setAgentName(suggestion)}
                            className="px-3 py-1 text-sm bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderToneStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                    {t('chatbotWizard.toneStep.heading', '¿Qué tono debe usar tu asistente?')}
                </h3>
                <p className="text-muted-foreground mt-2">
                    {t('chatbotWizard.toneStep.subheading', 'Elige el estilo de comunicación que mejor represente tu marca')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {TONE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setTone(option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            tone === option.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 bg-card'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="font-semibold text-foreground">
                                {t(`chatbotWizard.tones.${option.value.toLowerCase()}`, option.value)}
                            </span>
                            {tone === option.value && (
                                <Check className="w-5 h-5 text-primary ml-auto" />
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                            "{option.example}"
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderFaqsStep = () => {
        const suggestedFaqs = industryTemplate?.defaultFAQs.es || [];
        const unusedSuggestions = suggestedFaqs.filter(
            sf => !faqs.some(f => f.question === sf.question)
        );

        return (
            <div className="space-y-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HelpCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                        {t('chatbotWizard.faqsStep.heading', 'Preguntas frecuentes de tus clientes')}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                        {t('chatbotWizard.faqsStep.subheading', 'Agrega las preguntas que tus clientes hacen más seguido')}
                    </p>
                </div>

                {/* Suggested FAQs based on industry */}
                {unusedSuggestions.length > 0 && (
                    <div className="bg-accent/30 p-4 rounded-xl mb-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {t('chatbotWizard.faqsStep.suggestions', 'Sugerencias para tu industria')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {unusedSuggestions.slice(0, 4).map((faq, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAddSuggestedFaq(faq)}
                                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition-colors text-left"
                                >
                                    + {faq.question}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Current FAQs */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {faqs.map((faq, index) => (
                        <div key={faq.id} className="bg-card border border-border rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                    FAQ #{index + 1}
                                </span>
                                <button
                                    onClick={() => handleRemoveFaq(index)}
                                    className="text-muted-foreground hover:text-destructive text-sm"
                                >
                                    {t('common.remove', 'Eliminar')}
                                </button>
                            </div>
                            <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => handleUpdateFaq(index, 'question', e.target.value)}
                                placeholder={t('chatbotWizard.faqsStep.questionPlaceholder', '¿Cuál es la pregunta?')}
                                className="w-full px-3 py-2 mb-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
                            />
                            <textarea
                                value={faq.answer}
                                onChange={(e) => handleUpdateFaq(index, 'answer', e.target.value)}
                                placeholder={t('chatbotWizard.faqsStep.answerPlaceholder', 'Escribe la respuesta...')}
                                rows={2}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary resize-none"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleAddFaq}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                    + {t('chatbotWizard.faqsStep.addFaq', 'Agregar pregunta frecuente')}
                </button>
            </div>
        );
    };

    const renderLeadsStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                    {t('chatbotWizard.leadsStep.heading', 'Captura contactos de clientes potenciales')}
                </h3>
                <p className="text-muted-foreground mt-2">
                    {t('chatbotWizard.leadsStep.subheading', 'Decide cómo quieres obtener información de contacto')}
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                {/* Lead Capture Toggle */}
                <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    leadCaptureEnabled ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`} onClick={() => setLeadCaptureEnabled(!leadCaptureEnabled)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-6 rounded-full transition-colors ${
                                leadCaptureEnabled ? 'bg-primary' : 'bg-muted'
                            }`}>
                                <div className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                                    leadCaptureEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`} />
                            </div>
                            <div>
                                <span className="font-medium text-foreground">
                                    {t('chatbotWizard.leadsStep.enableCapture', 'Capturar leads')}
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    {t('chatbotWizard.leadsStep.enableCaptureDesc', 'Solicita email después de algunas interacciones')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pre-chat Form Toggle (only visible if lead capture is enabled) */}
                {leadCaptureEnabled && (
                    <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        preChatForm ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`} onClick={() => setPreChatForm(!preChatForm)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                    preChatForm ? 'bg-primary' : 'bg-muted'
                                }`}>
                                    <div className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                                        preChatForm ? 'translate-x-4' : 'translate-x-0.5'
                                    }`} />
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">
                                        {t('chatbotWizard.leadsStep.preChatForm', 'Formulario antes del chat')}
                                    </span>
                                    <p className="text-sm text-muted-foreground">
                                        {t('chatbotWizard.leadsStep.preChatFormDesc', 'Pide nombre y email antes de iniciar')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info box */}
                <div className="p-4 bg-accent/30 rounded-xl">
                    <p className="text-sm text-muted-foreground">
                        💡 {t('chatbotWizard.leadsStep.tip', 
                            'Los leads capturados aparecerán automáticamente en tu CRM para que puedas darles seguimiento.'
                        )}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderPreviewStep = () => {
        const appearance = config.appearance || getDefaultAppearanceConfig();
        
        return (
            <div className="space-y-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                        {t('chatbotWizard.previewStep.heading', '¡Así se verá tu chatbot!')}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                        {t('chatbotWizard.previewStep.subheading', 'Prueba cómo funcionará antes de activarlo')}
                    </p>
                </div>

                {/* Preview Container */}
                <div className="max-w-md mx-auto">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl h-[450px]">
                        {activeProject && (
                            <ChatCore
                                config={previewConfig}
                                project={activeProject}
                                appearance={appearance}
                                showHeader={true}
                                isEmbedded={false}
                                autoOpen={true}
                            />
                        )}
                    </div>
                </div>

                {/* Summary */}
                <div className="max-w-md mx-auto bg-accent/30 rounded-xl p-4">
                    <h4 className="font-semibold text-foreground mb-2">
                        {t('chatbotWizard.previewStep.summary', 'Resumen de configuración')}
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>✓ Nombre: <strong>{agentName}</strong></li>
                        <li>✓ Tono: <strong>{tone}</strong></li>
                        <li>✓ FAQs: <strong>{faqs.length} preguntas</strong></li>
                        <li>✓ Captura de leads: <strong>{leadCaptureEnabled ? 'Activada' : 'Desactivada'}</strong></li>
                    </ul>
                </div>
            </div>
        );
    };

    // =============================================================================
    // MAIN RENDER
    // =============================================================================

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header with Progress */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            {t('chatbotWizard.title', 'Configurar tu Chatbot')}
                        </h2>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between">
                        {WIZARD_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <button
                                    onClick={() => index <= currentStep && setCurrentStep(index)}
                                    disabled={index > currentStep}
                                    className={`flex flex-col items-center gap-1 transition-colors ${
                                        index === currentStep
                                            ? 'text-primary'
                                            : index < currentStep
                                            ? 'text-primary/70 cursor-pointer'
                                            : 'text-muted-foreground/50'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                                        index === currentStep
                                            ? 'border-primary bg-primary/10'
                                            : index < currentStep
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-muted-foreground/30'
                                    }`}>
                                        {index < currentStep ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            step.icon
                                        )}
                                    </div>
                                    <span className="text-xs font-medium hidden sm:block">
                                        {t(step.title, step.id)}
                                    </span>
                                </button>
                                {index < WIZARD_STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                                        index < currentStep ? 'bg-primary' : 'bg-border'
                                    }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderStepContent()}
                </div>

                {/* Footer with Navigation */}
                <div className="p-6 border-t border-border flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                            currentStep === 0
                                ? 'text-muted-foreground/50 cursor-not-allowed'
                                : 'text-foreground hover:bg-accent'
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        {t('common.back', 'Atrás')}
                    </button>

                    {currentStep < WIZARD_STEPS.length - 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                                canProceed()
                                    ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {t('common.next', 'Siguiente')}
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('common.saving', 'Guardando...')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    {t('chatbotWizard.save', 'Activar Chatbot')}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatbotSetupWizard;








