import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/project';
import { Sparkles, ArrowRight, Check, X, SkipForward, Lightbulb, MessageCircle } from 'lucide-react';
import AIContentAssistant from './AIContentAssistant';

interface TourStep {
    id: string;
    target: string; // Path like 'hero.headline'
    title: string;
    message: string;
    aiAssist: boolean;
    optional?: boolean;
    validator?: (value: any) => boolean;
}

interface GuidedTourProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'hero-headline',
        target: 'hero.headline',
        title: 'Crea tu Headline Perfecto',
        message: '¿Qué mensaje principal quieres comunicar a tus visitantes? Haz que sea memorable y directo.',
        aiAssist: true,
        validator: (value) => value && value.length > 10
    },
    {
        id: 'hero-subheadline',
        target: 'hero.subheadline',
        title: 'Complementa con un Subheadline',
        message: 'Explica brevemente qué haces o qué beneficio ofreces. 1-2 frases claras.',
        aiAssist: true,
        validator: (value) => value && value.length > 20
    },
    {
        id: 'features',
        target: 'features.title',
        title: 'Describe tus Características',
        message: 'Vamos a destacar lo mejor de tu negocio. ¿Qué título le ponemos a esta sección?',
        aiAssist: true,
        optional: true
    },
    {
        id: 'cta-message',
        target: 'cta.title',
        title: 'Llamada a la Acción',
        message: '¿Qué acción quieres que tomen tus visitantes? (ej: "¿Listo para comenzar?", "Hablemos de tu proyecto")',
        aiAssist: true,
        validator: (value) => value && value.length > 5
    },
    {
        id: 'footer',
        target: 'footer.description',
        title: 'Descripción del Footer',
        message: 'Agrega una breve descripción de tu negocio para el footer.',
        aiAssist: true,
        optional: true
    }
];

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose, onComplete }) => {
    const { data, setData, activeProjectId } = useProject();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
    const [aiAssistOpen, setAiAssistOpen] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const currentStep = TOUR_STEPS[currentStepIndex];
    const progress = Math.round((completedSteps.size / TOUR_STEPS.length) * 100);

    // Load current value when step changes
    useEffect(() => {
        if (!currentStep || !data) return;
        
        const keys = currentStep.target.split('.');
        let value: any = data;
        for (const key of keys) {
            value = value?.[key];
        }
        
        setCurrentValue(value || '');
    }, [currentStep, data]);

    const updateNestedData = (path: string, value: any) => {
        if (!data) return;
        
        const newData = JSON.parse(JSON.stringify(data));
        const keys = path.split('.');
        let current: any = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        setData(newData);
    };

    const handleSave = () => {
        if (!currentValue.trim()) return;
        
        updateNestedData(currentStep.target, currentValue);
        
        // Mark as completed
        setCompletedSteps(prev => new Set([...prev, currentStep.id]));
        
        // Show success briefly
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        
        // Move to next step after a brief delay
        setTimeout(() => {
            if (currentStepIndex < TOUR_STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                handleComplete();
            }
        }, 1500);
    };

    const handleSkip = () => {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        onComplete();
        onClose();
    };

    const handleAiApply = (text: string) => {
        setCurrentValue(text);
        setAiAssistOpen(false);
    };

    const getContextPrompt = () => {
        const section = currentStep.target.split('.')[0];
        return `This is for the ${section} section of the website. The field is ${currentStep.target}.`;
    };

    if (!isOpen || !currentStep) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1A0D26] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-white/5 bg-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                                    <Lightbulb className="text-yellow-400" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Personalización Guiada</h2>
                                    <p className="text-xs text-gray-400">Paso {currentStepIndex + 1} de {TOUR_STEPS.length}</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-gray-400">Progreso</span>
                                <span className="text-yellow-400 font-bold">{progress}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8 flex-grow overflow-y-auto">
                        {showSuccessMessage ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                    <Check className="text-green-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">¡Perfecto!</h3>
                                <p className="text-gray-400">Guardado exitosamente</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in-up">
                                {/* Step Info */}
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h3>
                                    <p className="text-gray-300 leading-relaxed">{currentStep.message}</p>
                                    {currentStep.optional && (
                                        <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                                            <Sparkles size={12} />
                                            Este paso es opcional
                                        </p>
                                    )}
                                </div>

                                {/* Input Area */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            Tu Contenido
                                        </label>
                                        {currentStep.aiAssist && (
                                            <button
                                                onClick={() => setAiAssistOpen(true)}
                                                className="text-xs flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                                            >
                                                <MessageCircle size={12} />
                                                Ayuda de AI
                                            </button>
                                        )}
                                    </div>
                                    
                                    <textarea
                                        value={currentValue}
                                        onChange={(e) => setCurrentValue(e.target.value)}
                                        className="w-full bg-[#130a1d] border border-white/10 rounded-lg p-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all resize-none"
                                        rows={4}
                                        placeholder="Escribe aquí..."
                                        autoFocus
                                    />
                                    
                                    {currentStep.validator && !currentStep.validator(currentValue) && currentValue && (
                                        <p className="text-xs text-orange-400 mt-2">
                                            Intenta agregar un poco más de detalle
                                        </p>
                                    )}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <button
                                        onClick={handleSkip}
                                        className="text-sm text-gray-400 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <SkipForward size={16} />
                                        {currentStep.optional ? 'Saltar' : 'Omitir'}
                                    </button>
                                    
                                    <button
                                        onClick={handleSave}
                                        disabled={!currentValue.trim() || (currentStep.validator && !currentStep.validator(currentValue))}
                                        className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                                    >
                                        {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Guardar y Continuar'}
                                        <ArrowRight size={18} />
                                    </button>
                                </div>

                                {/* Completed Steps Indicator */}
                                <div className="flex items-center gap-2 pt-4">
                                    {TOUR_STEPS.map((step, idx) => (
                                        <div
                                            key={step.id}
                                            className={`flex-1 h-1 rounded-full transition-all ${
                                                completedSteps.has(step.id)
                                                    ? 'bg-green-400'
                                                    : idx === currentStepIndex
                                                    ? 'bg-yellow-400'
                                                    : 'bg-white/10'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Content Assistant Modal */}
            {aiAssistOpen && (
                <AIContentAssistant
                    isOpen={aiAssistOpen}
                    onClose={() => setAiAssistOpen(false)}
                    onApply={handleAiApply}
                    initialText={currentValue}
                    contextPrompt={getContextPrompt()}
                />
            )}
        </>
    );
};

export default GuidedTour;

