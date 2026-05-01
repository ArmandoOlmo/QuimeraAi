import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, CalendarCheck, ArrowRight, Bot, CheckCircle2, UserPlus, Sparkles } from 'lucide-react';

interface ChatbotWorkflowQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        title: string;
        description: string;
        icon: string;
    }>;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
        cardBackground?: string;
        cardBorder?: string;
        cardText?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    MessageSquare, Users, CalendarCheck, Bot, UserPlus
};

const ChatbotWorkflowQuimera: React.FC<ChatbotWorkflowQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [activeStep, setActiveStep] = useState(0);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#F59E0B'; // Amber/Gold for AI leads
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.chatbotworkflow.title', 'El Recepcionista Perfecto: 24/7');
    const displaySubtitle = subtitle || t('quimera.chatbotworkflow.subtitle', 'Tu asistente virtual impulsado por IA no solo responde dudas; perfila clientes, guarda datos en tu CRM y agenda citas automáticamente sin que tengas que intervenir.');

    const getDefaultFeatures = (t: any) => [
        {
            title: t('quimera.chatbotworkflow.feat1.title', 'Atención Inmediata'),
            description: t('quimera.chatbotworkflow.feat1.desc', 'Responde al instante con el tono y personalidad de tu marca, resolviendo dudas frecuentes.'),
            icon: 'MessageSquare'
        },
        {
            title: t('quimera.chatbotworkflow.feat2.title', 'Captura de Leads (CRM)'),
            description: t('quimera.chatbotworkflow.feat2.desc', 'Identifica oportunidades y solicita datos clave (email, teléfono) guardándolos automáticamente en tu base de contactos.'),
            icon: 'UserPlus'
        },
        {
            title: t('quimera.chatbotworkflow.feat3.title', 'Agendamiento Inteligente'),
            description: t('quimera.chatbotworkflow.feat3.desc', 'Se sincroniza con tus servicios y disponibilidad para agendar reuniones y enviar confirmaciones.'),
            icon: 'CalendarCheck'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : getDefaultFeatures(t);

    // Simulation loop for the workflow animation
    useEffect(() => {
        if (isPreviewMode) {
            setActiveStep(3); // Show all complete in preview
            return;
        }

        const stepDurations = [2500, 2500, 2500, 4000]; // Duration for each step
        
        let timeout: NodeJS.Timeout;
        const advanceStep = () => {
            setActiveStep(prev => {
                const next = (prev + 1) % 4;
                timeout = setTimeout(advanceStep, stepDurations[next]);
                return next;
            });
        };

        timeout = setTimeout(advanceStep, stepDurations[0]);
        return () => clearTimeout(timeout);
    }, [isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full filter blur-[150px]"></div>
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full filter blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col-reverse ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Features */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                                <Sparkles className="w-4 h-4" />
                                {t('quimera.chatbotworkflow.badge', 'AI CRM Integration')}
                            </div>
                            <h2 className={`text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                                {displayTitle}
                            </h2>
                            <p className={`text-lg font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                                {displaySubtitle}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {displayFeatures.map((feature, idx) => {
                                const IconComp = iconMap[feature.icon] || CheckCircle2;
                                const isActive = activeStep === idx || activeStep === 3;
                                
                                return (
                                    <div key={idx} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60 grayscale'}`} 
                                        style={{ 
                                            backgroundColor: isActive ? `${accentColor}08` : cardBg, 
                                            borderColor: isActive ? `${accentColor}30` : cardBorder 
                                        }}>
                                        <div className="flex-shrink-0 p-3 rounded-xl transition-colors duration-500" style={{ backgroundColor: isActive ? `${accentColor}20` : '#222' }}>
                                            <IconComp className="w-6 h-6 transition-colors duration-500" style={{ color: isActive ? accentColor : '#666' }} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold font-header heading-caps mb-2" style={{ color: isActive ? '#fff' : '#aaa' }}>{feature.title}</h3>
                                            <p className="text-sm font-light font-body" style={{ color: isActive ? secondaryColor : '#666' }}>{feature.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Flow Mockup */}
                    <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0 flex justify-center items-center">
                        <div className="w-full max-w-md relative">
                            
                            {/* Workflow Container */}
                            <div className="relative rounded-3xl p-6 md:p-10 border shadow-2xl flex flex-col gap-12"
                                style={{ 
                                    backgroundColor: '#0A0A0A', 
                                    borderColor: cardBorder,
                                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(255,255,255,0.02)`
                                }}
                            >
                                {/* Path Lines (Background) */}
                                <div className="absolute top-[20%] bottom-[20%] left-1/2 -translate-x-1/2 w-0.5 bg-gray-800 z-0">
                                    <div className="w-full bg-gradient-to-b from-transparent via-amber-500 to-transparent absolute top-0 bottom-0 opacity-0 animate-[pathFlow_3s_linear_infinite]" 
                                         style={{ 
                                             opacity: activeStep > 0 && activeStep < 3 ? 1 : 0,
                                             backgroundImage: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`
                                         }}>
                                    </div>
                                </div>

                                {/* Node 1: Chatbot (Top) */}
                                <div className={`relative z-10 flex flex-col items-center gap-3 transition-all duration-700 ${activeStep === 0 ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border"
                                        style={{ backgroundColor: activeStep === 0 ? `${accentColor}20` : '#1A1A1A', borderColor: activeStep === 0 ? accentColor : cardBorder }}>
                                        <Bot className={`w-8 h-8 ${activeStep === 0 ? 'animate-bounce' : ''}`} style={{ color: activeStep === 0 ? accentColor : '#888' }} />
                                    </div>
                                    <div className="bg-[#1A1A1A] border rounded-lg px-4 py-2 text-xs font-medium" style={{ borderColor: cardBorder }}>
                                        {t('quimera.chatbotworkflow.node1', 'Interacción inicial')}
                                    </div>
                                    
                                    {/* Chat Bubble Mock */}
                                    <div className={`absolute top-0 right-[-60px] md:right-[-100px] bg-white text-black px-3 py-2 text-xs rounded-2xl rounded-tl-sm shadow-xl transition-all duration-300 ${activeStep === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                                        {t('quimera.chatbotworkflow.bubble1', '"¿En qué te ayudo?"')}
                                    </div>
                                </div>

                                {/* Node 2: CRM Leads (Middle) */}
                                <div className={`relative z-10 flex flex-col items-center gap-3 transition-all duration-700 ${activeStep === 1 ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border"
                                        style={{ backgroundColor: activeStep === 1 ? `${accentColor}20` : '#1A1A1A', borderColor: activeStep === 1 ? accentColor : cardBorder }}>
                                        <Users className={`w-8 h-8 ${activeStep === 1 ? 'animate-pulse' : ''}`} style={{ color: activeStep === 1 ? accentColor : '#888' }} />
                                    </div>
                                    <div className="bg-[#1A1A1A] border rounded-lg px-4 py-2 text-xs font-medium" style={{ borderColor: cardBorder }}>
                                        {t('quimera.chatbotworkflow.node2', 'Lead Capturado')}
                                    </div>

                                    {/* Lead Data Mock */}
                                    <div className={`absolute top-0 left-[-60px] md:left-[-120px] bg-[#1A1A1A] border px-3 py-2 text-xs rounded-xl shadow-xl transition-all duration-300 flex flex-col gap-1 ${activeStep === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ borderColor: cardBorder }}>
                                        <span className="text-[10px] text-gray-500">{t('quimera.chatbotworkflow.newContact', 'Nuevo Contacto')}</span>
                                        <span className="font-semibold" style={{ color: accentColor }}>cliente@email.com</span>
                                    </div>
                                </div>

                                {/* Node 3: Calendar (Bottom) */}
                                <div className={`relative z-10 flex flex-col items-center gap-3 transition-all duration-700 ${activeStep === 2 || activeStep === 3 ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border relative"
                                        style={{ backgroundColor: activeStep >= 2 ? `${accentColor}20` : '#1A1A1A', borderColor: activeStep >= 2 ? accentColor : cardBorder }}>
                                        <CalendarCheck className={`w-8 h-8`} style={{ color: activeStep >= 2 ? accentColor : '#888' }} />
                                        
                                        {activeStep === 3 && (
                                            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-0.5 animate-in zoom-in">
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-[#1A1A1A] border rounded-lg px-4 py-2 text-xs font-medium" style={{ borderColor: cardBorder }}>
                                        {t('quimera.chatbotworkflow.node3', 'Cita Agendada')}
                                    </div>

                                    {/* Calendar Mock */}
                                    <div className={`absolute top-0 right-[-60px] md:right-[-100px] bg-[#1A1A1A] border px-3 py-2 text-xs rounded-xl shadow-xl transition-all duration-300 flex flex-col gap-1 ${activeStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ borderColor: cardBorder }}>
                                        <span className="text-[10px] text-gray-500">{t('quimera.chatbotworkflow.meetingConfirmed', 'Reunión confirmada')}</span>
                                        <span className="font-semibold text-white">{t('quimera.chatbotworkflow.meetingTime', 'Mañana, 10:00 AM')}</span>
                                    </div>
                                </div>

                            </div>

                            {/* Success Overlay Effect at the end of cycle */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-transparent to-transparent pointer-events-none transition-opacity duration-1000 ${activeStep === 3 ? 'opacity-20' : 'opacity-0'}`} 
                                 style={{ backgroundImage: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)` }}>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes pathFlow {
                    0% { top: -20%; bottom: 100%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 100%; bottom: -20%; opacity: 0; }
                }
            `}</style>
        </section>
    );
};

export default ChatbotWorkflowQuimera;
