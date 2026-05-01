import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FileText, PaintBucket, MessageSquare, Settings, Sparkles, Wand2, Plus, Type, UploadCloud } from 'lucide-react';

interface ChatbotBuilderQuimeraProps {
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
    Database, FileText, PaintBucket, MessageSquare, Settings, Sparkles, Wand2
};

const ChatbotBuilderQuimera: React.FC<ChatbotBuilderQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#8B5CF6'; // Violet for Builder/AI
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.chatbotbuilder.title', 'Crea un Chatbot a tu Medida');
    const displaySubtitle = subtitle || t('quimera.chatbotbuilder.subtitle', 'Personaliza cada aspecto de tu asistente. Entrénalo con tus propios documentos, define su personalidad y adapta su diseño visual a tu marca corporativa en segundos.');

    const getDefaultFeatures = (t: any) => [
        {
            title: t('quimera.chatbotbuilder.feat1.title', 'Base de Conocimiento'),
            description: t('quimera.chatbotbuilder.feat1.desc', 'Sube PDFs, pega URLs o escribe texto plano para que tu chatbot conozca todo sobre tu negocio al instante.'),
            icon: 'Database'
        },
        {
            title: t('quimera.chatbotbuilder.feat2.title', 'Identidad Visual'),
            description: t('quimera.chatbotbuilder.feat2.desc', 'Cambia colores, tipografía, logo y posición para que el chat se integre perfectamente con tu página web.'),
            icon: 'PaintBucket'
        },
        {
            title: t('quimera.chatbotbuilder.feat3.title', 'Personalidad y Comportamiento'),
            description: t('quimera.chatbotbuilder.feat3.desc', 'Configura instrucciones detalladas (prompts) para definir el tono de voz, el rol del bot y sus reglas de atención.'),
            icon: 'Settings'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : getDefaultFeatures(t);

    // Auto-cycle tabs if not interacted
    useEffect(() => {
        if (isPreviewMode) return;
        
        const interval = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % displayFeatures.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [displayFeatures.length, isPreviewMode]);

    const renderMockupContent = () => {
        switch(activeTab) {
            case 0: // Knowledge Base
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>Knowledge Sources</span>
                        </div>
                        
                        <div className="border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors" 
                             style={{ borderColor: `${accentColor}50`, backgroundColor: `${accentColor}05` }}>
                            <div className="p-3 rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
                                <UploadCloud className="w-6 h-6" style={{ color: accentColor }} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium" style={{ color: textColor }}>Drag and drop files</p>
                                <p className="text-xs text-gray-500">PDF, TXT, DOCX up to 50MB</p>
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222]">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-red-400" />
                                    <span className="text-xs text-gray-300">company_policies_2026.pdf</span>
                                </div>
                                <span className="text-[10px] text-green-400 font-mono">Trained</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222]">
                                <div className="flex items-center gap-3">
                                    <Wand2 className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-gray-300">https://website.com/faq</span>
                                </div>
                                <div className="h-1.5 w-12 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 1: // Visual Identity
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                        <div className="flex items-center gap-2 mb-4">
                            <PaintBucket className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>Appearance Settings</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Primary Color</label>
                                <div className="flex gap-2">
                                    {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((color, i) => (
                                        <div key={i} className={`w-8 h-8 rounded-full border-2 cursor-pointer ${i === 1 ? 'scale-110' : 'opacity-50'}`}
                                             style={{ backgroundColor: color, borderColor: i === 1 ? '#fff' : 'transparent' }} />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Theme</label>
                                    <div className="flex bg-[#141414] rounded-lg p-1 border border-[#222]">
                                        <div className="flex-1 text-center py-1.5 text-xs rounded-md bg-[#222] text-white">Dark</div>
                                        <div className="flex-1 text-center py-1.5 text-xs text-gray-500">Light</div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Launcher</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">
                                            <MessageSquare className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: accentColor, borderColor: '#fff' }}>
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-4 rounded-xl border border-[#222] bg-[#111] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-[#8B5CF6]/10"></div>
                                <div className="flex gap-3 relative z-10">
                                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                                        <Bot className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="bg-[#222] text-xs p-2 rounded-lg rounded-tl-sm text-gray-300">
                                        Previewing new style!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2: // Personality / System Prompt
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>Behavior Instructions</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Bot Name</label>
                                <div className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
                                    <Type className="w-3 h-3 text-gray-500" />
                                    Ventas IA
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-2">
                                    System Prompt
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px]">Required</span>
                                </label>
                                <div className="bg-[#141414] border border-[#222] rounded-lg p-3 text-xs text-gray-400 h-32 relative group">
                                    Eres un asistente experto en ventas inmobiliarias.
                                    Tu objetivo es recopilar el nombre, teléfono y email del cliente.
                                    <br/><br/>
                                    Reglas:
                                    <br/>
                                    - Sé siempre amable y profesional.
                                    <br/>
                                    - Usa emojis moderadamente 🏠✨
                                    
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141414] pointer-events-none"></div>
                                    <div className="absolute bottom-2 right-2 p-1.5 rounded-md bg-[#222] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Sparkles className="w-3 h-3 text-yellow-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full filter blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Tabs */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                                <Settings className="w-4 h-4 animate-[spin_4s_linear_infinite]" />
                                {t('quimera.chatbotbuilder.badge', 'Chatbot Studio')}
                            </div>
                            <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                                {displayTitle}
                            </h2>
                            <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                                {displaySubtitle}
                            </p>
                        </div>

                        {/* Interactive Tabs */}
                        <div className="space-y-3">
                            {displayFeatures.map((feature, idx) => {
                                const IconComp = iconMap[feature.icon] || Sparkles;
                                const isActive = activeTab === idx;

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setActiveTab(idx)}
                                        className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${isActive ? 'translate-x-2' : 'hover:translate-x-1'}`}
                                        style={{
                                            backgroundColor: isActive ? `${accentColor}10` : cardBg,
                                            borderColor: isActive ? `${accentColor}50` : cardBorder,
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 flex-shrink-0">
                                                <IconComp className="w-6 h-6" style={{ color: isActive ? accentColor : secondaryColor }} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold font-header heading-caps mb-1" style={{ color: isActive ? textColor : secondaryColor }}>
                                                    {feature.title}
                                                </h3>
                                                {isActive && (
                                                    <p className="text-sm font-light font-body animate-in fade-in duration-500" style={{ color: secondaryColor }}>
                                                        {feature.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Mockup */}
                    <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-blue-500/10 blur-3xl rounded-full" />
                        
                        {/* Settings Dashboard Mockup */}
                        <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border h-[450px] md:h-[550px] flex flex-col"
                            style={{ 
                                backgroundColor: '#0A0A0A', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`
                            }}
                        >
                            {/* Dashboard Header */}
                            <div className="h-12 border-b flex items-center justify-between px-4" style={{ backgroundColor: '#111111', borderColor: cardBorder }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
                                        <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 font-mono">Agent Settings</span>
                                </div>
                                <div className="px-3 py-1 rounded bg-[#222] border border-[#333] text-[10px] text-gray-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live
                                </div>
                            </div>

                            {/* Dashboard Body */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Sidebar Navigation Mock */}
                                <div className="w-14 border-r flex flex-col items-center py-4 gap-4" style={{ borderColor: cardBorder, backgroundColor: '#0A0A0A' }}>
                                    {[0, 1, 2].map(idx => (
                                        <div key={idx} 
                                             className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${activeTab === idx ? 'bg-[#222] shadow-inner' : 'opacity-50'}`}
                                             onClick={() => setActiveTab(idx)}>
                                            {idx === 0 && <Database className="w-4 h-4" style={{ color: activeTab === 0 ? accentColor : '#888' }} />}
                                            {idx === 1 && <PaintBucket className="w-4 h-4" style={{ color: activeTab === 1 ? accentColor : '#888' }} />}
                                            {idx === 2 && <Settings className="w-4 h-4" style={{ color: activeTab === 2 ? accentColor : '#888' }} />}
                                        </div>
                                    ))}
                                    <div className="mt-auto w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex-1 p-6 bg-[#0A0A0A] relative overflow-hidden flex items-start">
                                    {renderMockupContent()}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

// Simple bot icon component inline for the mockup
const Bot = ({ className, style }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <rect width="18" height="10" x="3" y="11" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" x2="8" y1="16" y2="16" />
        <line x1="16" x2="16" y1="16" y2="16" />
    </svg>
);

export default ChatbotBuilderQuimera;
