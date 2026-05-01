import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, FileText, Globe, Layout, Sparkles, Image as ImageIcon, Zap, CheckCircle2, ChevronRight } from 'lucide-react';

interface ContentManagerQuimeraProps {
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
        iconColor?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Bot, FileText, Globe, Layout, Sparkles, ImageIcon, Zap, CheckCircle2
};

const ContentManagerQuimera: React.FC<ContentManagerQuimeraProps> = ({
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
    const accentColor = colors.accent || '#D4AF37';
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';
    const iconColor = colors.iconColor || accentColor;

    const displayTitle = title || t('quimera.contentmanager.title', 'Gestor de Contenidos con IA Integrada');
    const displaySubtitle = subtitle || t('quimera.contentmanager.subtitle', 'Centraliza tus artículos, portafolios y servicios en un editor avanzado que escribe, traduce y optimiza por ti.');

    const getDefaultFeatures = (t: any) => [
        {
            title: t('quimera.contentmanager.feat1.title', 'Asistente de Escritura IA'),
            description: t('quimera.contentmanager.feat1.desc', 'Expande ideas, mejora la gramática o genera artículos completos desde un simple comando dentro del editor.'),
            icon: 'Bot'
        },
        {
            title: t('quimera.contentmanager.feat2.title', 'Optimización SEO Automática'),
            description: t('quimera.contentmanager.feat2.desc', 'La IA sugiere meta títulos, descripciones y palabras clave basándose en el contenido de tu publicación.'),
            icon: 'Globe'
        },
        {
            title: t('quimera.contentmanager.feat3.title', 'Gestión Multimedia'),
            description: t('quimera.contentmanager.feat3.desc', 'Sube, recorta y organiza tus imágenes y videos en una galería centralizada lista para usar.'),
            icon: 'ImageIcon'
        },
        {
            title: t('quimera.contentmanager.feat4.title', 'Tipos de Contenido Dinámico'),
            description: t('quimera.contentmanager.feat4.desc', 'Crea blogs, portafolios, menús de restaurantes o listados inmobiliarios sin tocar código.'),
            icon: 'Layout'
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
            case 0: // AI Writer
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-6">
                            <Bot className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>{t('quimera.contentmanager.aiwriter', 'AI Writer')}</span>
                        </div>
                        <div className="h-4 w-3/4 rounded bg-gray-800"></div>
                        <div className="h-4 w-full rounded bg-gray-800"></div>
                        <div className="h-4 w-5/6 rounded bg-gray-800"></div>
                        <div className="mt-6 p-4 rounded-xl border border-dashed flex flex-col gap-3" style={{ borderColor: `${accentColor}50`, backgroundColor: `${accentColor}10` }}>
                            <div className="flex items-center gap-2 text-xs" style={{ color: accentColor }}>
                                <Sparkles className="w-3 h-3" /> {t('quimera.contentmanager.generating', 'Generando continuación...')}
                            </div>
                            <div className="h-3 w-full rounded bg-gray-700/50"></div>
                            <div className="h-3 w-4/5 rounded bg-gray-700/50"></div>
                        </div>
                    </div>
                );
            case 1: // SEO
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-6">
                            <Globe className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>{t('quimera.contentmanager.seo', 'SEO Optimization')}</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">{t('quimera.contentmanager.metatitle', 'Meta Title')}</label>
                            <div className="h-8 w-full rounded border flex items-center px-3" style={{ borderColor: cardBorder, backgroundColor: '#1A1A1A' }}>
                                <div className="h-2 w-1/2 rounded bg-gray-600"></div>
                            </div>
                        </div>
                        <div className="space-y-2 mt-4">
                            <label className="text-xs text-gray-400">{t('quimera.contentmanager.metadesc', 'Meta Description')}</label>
                            <div className="h-20 w-full rounded border p-3" style={{ borderColor: cardBorder, backgroundColor: '#1A1A1A' }}>
                                <div className="h-2 w-full rounded bg-gray-600 mb-2"></div>
                                <div className="h-2 w-5/6 rounded bg-gray-600"></div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: '#10B98130', backgroundColor: '#10B98110' }}>
                            <span className="text-xs text-[#10B981] font-medium">{t('quimera.contentmanager.seoscore', 'SEO Score: 95/100')}</span>
                            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        </div>
                    </div>
                );
            case 2: // Media
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-6">
                            <ImageIcon className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>{t('quimera.contentmanager.medialibrary', 'Media Library')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center border" style={{ borderColor: cardBorder }}>
                                    <ImageIcon className="w-6 h-6 text-gray-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 3: // Dynamic Types
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-6">
                            <Layout className="w-5 h-5" style={{ color: accentColor }} />
                            <span className="text-sm font-semibold" style={{ color: textColor }}>{t('quimera.contentmanager.collections', 'Content Collections')}</span>
                        </div>
                        <div className="space-y-2">
                            {[t('quimera.contentmanager.blogposts', 'Blog Posts'), t('quimera.contentmanager.portfolio', 'Portfolio Projects'), t('quimera.contentmanager.team', 'Team Members')].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: cardBorder, backgroundColor: '#1A1A1A' }}>
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-200">{item}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                </div>
                            ))}
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
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full filter blur-[120px]"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Tabs */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
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
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-purple-500/10 blur-3xl rounded-full" />
                        
                        {/* Editor Window Mockup */}
                        <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border h-[400px] md:h-[500px] flex flex-col"
                            style={{ 
                                backgroundColor: '#111111', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`
                            }}
                        >
                            {/* Browser Header */}
                            <div className="h-10 border-b flex items-center px-4" style={{ backgroundColor: '#1A1A1A', borderColor: cardBorder }}>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="mx-auto flex-1 flex justify-center">
                                    <div className="h-5 w-48 rounded flex items-center justify-center text-[10px] text-gray-500 font-mono" style={{ backgroundColor: '#0A0A0A' }}>
                                        cms.quimera.ai/editor
                                    </div>
                                </div>
                            </div>

                            {/* CMS Sidebar & Content Area */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Sidebar Mockup */}
                                <div className="w-16 md:w-48 border-r flex flex-col p-3 hidden sm:flex" style={{ borderColor: cardBorder, backgroundColor: '#141414' }}>
                                    <div className="h-6 w-full rounded bg-gray-800 mb-6"></div>
                                    <div className="space-y-3 flex-1">
                                        <div className="h-4 w-full rounded bg-gray-800/50"></div>
                                        <div className="h-4 w-5/6 rounded bg-gray-800/50"></div>
                                        <div className="h-4 w-4/5 rounded bg-gray-800/50"></div>
                                    </div>
                                </div>
                                
                                {/* Main Editor Area */}
                                <div className="flex-1 p-6 sm:p-8 bg-[#0A0A0A] relative overflow-hidden">
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

export default ContentManagerQuimera;
