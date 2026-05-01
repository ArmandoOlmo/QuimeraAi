import React from 'react';
import { Sparkles, Bot, Palette, Globe, Shield, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FeaturesQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        icon: string;
        title: string;
        description: string;
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
}

const getDefaultFeatures = (t: any) => [
    {
        icon: 'Bot',
        title: t('quimera.features.item1.title', 'Generación por IA'),
        description: t('quimera.features.item1.desc', 'Sitios web completos, copys persuasivos y diseño impecable generados en segundos por nuestra IA avanzada.')
    },
    {
        icon: 'Palette',
        title: t('quimera.features.item2.title', 'Editor Visual Intuitivo'),
        description: t('quimera.features.item2.desc', 'Personaliza cada detalle con nuestro potente editor drag & drop. Sin necesidad de escribir código.')
    },
    {
        icon: 'Globe',
        title: t('quimera.features.item3.title', 'Dominios Personalizados'),
        description: t('quimera.features.item3.desc', 'Conecta tu propio dominio fácilmente para mantener una presencia de marca profesional.')
    },
    {
        icon: 'Zap',
        title: t('quimera.features.item4.title', 'Rendimiento Extremo'),
        description: t('quimera.features.item4.desc', 'Optimización automática de imágenes y código para tiempos de carga ultrarrápidos y mejor SEO.')
    },
    {
        icon: 'Shield',
        title: t('quimera.features.item5.title', 'Seguridad Empresarial'),
        description: t('quimera.features.item5.desc', 'Certificados SSL gratuitos, protección DDoS y copias de seguridad automáticas de tu sitio.')
    },
    {
        icon: 'Sparkles',
        title: t('quimera.features.item6.title', 'Marca Blanca'),
        description: t('quimera.features.item6.desc', 'Agencias y freelancers pueden revender la plataforma bajo su propia marca sin menciones de Quimera.')
    }
];

const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'Bot': return <Bot className="w-8 h-8" />;
        case 'Palette': return <Palette className="w-8 h-8" />;
        case 'Globe': return <Globe className="w-8 h-8" />;
        case 'Zap': return <Zap className="w-8 h-8" />;
        case 'Shield': return <Shield className="w-8 h-8" />;
        case 'Sparkles': return <Sparkles className="w-8 h-8" />;
        default: return <Sparkles className="w-8 h-8" />;
    }
};

const FeaturesQuimera: React.FC<FeaturesQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false
}) => {
    const { t } = useTranslation();
    const displayFeatures = features || getDefaultFeatures(t);
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const cardText = colors.cardText || textColor;
    const iconColor = colors.iconColor || accentColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.features.title', 'Escribe el título aquí...');
    const displaySubtitle = subtitle || t('quimera.features.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-yellow-500/5 rounded-full filter blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-yellow-600/5 rounded-full filter blur-[100px]"></div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {displayFeatures.map((feature, index) => {
                        const displayFeatureTitle = feature.title || t('quimera.features.item.title', 'Título');
                        const displayFeatureDesc = feature.description || t('quimera.features.item.desc', 'Descripción');

                        return (
                        <div 
                            key={index}
                            className="group relative p-6 md:p-8 rounded-2xl transition-all duration-500 overflow-hidden border"
                            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                            {/* Hover gradient glow */}
                            <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" style={{ background: `linear-gradient(to bottom right, ${accentColor}33, transparent)` }} />
                            
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border" style={{ backgroundColor: `${accentColor}1A`, color: iconColor, borderColor: `${accentColor}33` }}>
                                    {getIcon(feature.icon)}
                                </div>
                                <h3 className={`text-xl font-bold mb-3 font-header heading-caps ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: cardText }}>
                                    {displayFeatureTitle}
                                </h3>
                                <p className={`leading-relaxed font-light transition-colors font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>
                                    {displayFeatureDesc}
                                </p>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default FeaturesQuimera;
