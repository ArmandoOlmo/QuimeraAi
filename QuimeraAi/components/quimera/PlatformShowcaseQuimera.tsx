import React from 'react';
import { Layout, Palette, Code, Smartphone, Zap, Shield, Search, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlatformShowcaseQuimeraProps {
    title?: string;
    subtitle?: string;
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
    features?: Array<{
        icon: string;
        title: string;
        description: string;
    }>;
}

const PlatformShowcaseQuimera: React.FC<PlatformShowcaseQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false
}) => {
    const { t } = useTranslation();

    const getDefaultFeatures = (t: any) => [
        { icon: 'Layout', title: t('quimera.showcase.item1.title', 'Web Editor Avanzado'), description: t('quimera.showcase.item1.desc', 'Crea sitios impresionantes con nuestro editor drag & drop. Diseños premium pre-construidos y personalización total sin código.') },
        { icon: 'Database', title: t('quimera.showcase.item2.title', 'Gestión de Leads (CRM)'), description: t('quimera.showcase.item2.desc', 'Captura, gestiona y nutre a tus clientes potenciales desde un dashboard centralizado. Formularios dinámicos integrados.') },
        { icon: 'Search', title: t('quimera.showcase.item3.title', 'SEO Automático'), description: t('quimera.showcase.item3.desc', 'Sitemaps, meta tags y robots.txt generados y actualizados automáticamente (SSR).') },
        { icon: 'Smartphone', title: t('quimera.showcase.item4.title', 'Mobile First'), description: t('quimera.showcase.item4.desc', 'Previsualizador móvil en tiempo real y componentes nativamente responsivos.') }
    ];

    const displayFeatures = features || getDefaultFeatures(t);
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.showcase.title', 'Plataforma Todo en Uno');
    const displaySubtitle = subtitle || t('quimera.showcase.subtitle', 'Escribe el subtítulo aquí...');

    // Helper to render lucide icons dynamically (mocked here by mapping string to icon components if needed, or we just keep the hardcoded ones if string matches)
    const renderIcon = (iconName: string, className: string) => {
        const IconComponent = { Layout, Database, Search, Smartphone, Palette, Code, Zap, Shield }[iconName as keyof typeof import('lucide-react')] || Zap;
        // @ts-ignore
        return <IconComponent className={className} />;
    };

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-yellow-500/5 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className={`text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps ${textDropShadow ? 'drop-shadow-xl' : ''}`}>
                        {displayTitle}
                    </h2>
                    <p className={`text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[300px]">
                    
                    {displayFeatures.map((feature, index) => {
                        const displayFeatureTitle = feature.title || t('quimera.showcase.item.title', 'Título de característica');
                        const displayFeatureDesc = feature.description || t('quimera.showcase.item.desc', 'Descripción de la característica');

                        if (index === 0) {
                            return (
                                <div key={index} className="md:col-span-2 md:row-span-2 group relative p-8 rounded-3xl transition-all duration-500 overflow-hidden flex flex-col border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                                    <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${accentColor}1A, transparent)` }} />
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${iconColor}1A`, color: iconColor }}>
                                        {renderIcon(feature.icon, "w-6 h-6")}
                                    </div>
                                    <h3 className={`text-3xl font-bold mb-4 font-header heading-caps ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: cardText }}>{displayFeatureTitle}</h3>
                                    <p className={`text-lg mb-8 max-w-md font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>
                                        {displayFeatureDesc}
                                    </p>
                                    <div className="mt-auto relative w-full h-48 rounded-xl border overflow-hidden group-hover:scale-[1.02] transition-transform duration-500" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)' }}>
                                        {/* Editor mock UI */}
                                        <div className="absolute top-0 w-full h-8 border-b flex items-center px-4 gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        </div>
                                        <div className="absolute top-8 left-0 w-1/4 h-full border-r p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                            <div className="h-4 w-full bg-white/10 rounded"></div>
                                            <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                            <div className="h-4 w-5/6 bg-white/10 rounded"></div>
                                        </div>
                                        <div className="absolute top-12 left-1/4 w-3/4 h-full p-6 flex flex-col items-center justify-center gap-4">
                                            <div className="w-32 h-8 rounded-full" style={{ backgroundColor: `${accentColor}33` }}></div>
                                            <div className="w-64 h-4 bg-white/10 rounded"></div>
                                            <div className="w-48 h-4 bg-white/10 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        if (index === 1) {
                            return (
                                <div key={index} className="md:col-span-2 group relative p-8 rounded-3xl transition-all duration-500 overflow-hidden flex flex-col border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                                    <div className="absolute top-0 right-0 w-32 h-32 filter blur-[50px] transition-all duration-500" style={{ backgroundColor: `${accentColor}1A` }}></div>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${iconColor}1A`, color: iconColor }}>
                                        {renderIcon(feature.icon, "w-6 h-6")}
                                    </div>
                                    <h3 className={`text-2xl font-bold mb-3 font-header heading-caps ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: cardText }}>{displayFeatureTitle}</h3>
                                    <p className={`font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>
                                        {displayFeatureDesc}
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div key={index} className="md:col-span-1 group relative p-8 rounded-3xl transition-all duration-500 overflow-hidden border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform" style={{ backgroundColor: `${iconColor}1A`, color: iconColor }}>
                                    {renderIcon(feature.icon, "w-5 h-5")}
                                </div>
                                <h3 className={`text-xl font-bold mb-2 font-header heading-caps ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: cardText }}>{displayFeatureTitle}</h3>
                                <p className={`text-sm font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>
                                    {displayFeatureDesc}
                                </p>
                            </div>
                        );
                    })}

                </div>
            </div>
        </section>
    );
};

export default PlatformShowcaseQuimera;
