import React from 'react';
import { useTranslation } from 'react-i18next';

interface MetricsQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        title: string;
        description: string;
    }>;
    items?: Array<{
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
    isPreviewMode?: boolean;
}

const getDefaultMetrics = (t: any) => [
    {
        title: t('quimera.metrics.item1.title', '10x'),
        description: t('quimera.metrics.item1.desc', 'Más rápido que el desarrollo tradicional')
    },
    {
        title: t('quimera.metrics.item2.title', '99.9%'),
        description: t('quimera.metrics.item2.desc', 'Uptime garantizado en todos los proyectos')
    },
    {
        title: t('quimera.metrics.item3.title', '+5k'),
        description: t('quimera.metrics.item3.desc', 'Usuarios activos diariamente')
    },
    {
        title: t('quimera.metrics.item4.title', '24/7'),
        description: t('quimera.metrics.item4.desc', 'Soporte técnico ininterrumpido')
    }
];

const MetricsQuimera: React.FC<MetricsQuimeraProps> = ({
    title,
    subtitle,
    features,
    items,
    colors = {},
    textDropShadow = false
}) => {
    const { t } = useTranslation();
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    // In some components the data might be mapped as features or items
    const displayMetrics = features?.length ? features : (items?.length ? items : getDefaultMetrics(t));
    
    const displayTitle = title || t('quimera.metrics.title', 'Impacto Demostrado');
    const displaySubtitle = subtitle || t('quimera.metrics.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full filter blur-[150px]" style={{ backgroundColor: `${accentColor}15` }}></div>
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                    {displayMetrics.map((metric, index) => {
                        const displayMetricTitle = metric.title || t('quimera.metrics.item.title', '100%');
                        const displayMetricDesc = metric.description || t('quimera.metrics.item.desc', 'Descripción de métrica');
                        
                        return (
                        <div 
                            key={index}
                            className="group text-center relative p-4 sm:p-6 md:p-8 rounded-3xl transition-all duration-500 border"
                            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                            <h3 
                                className={`text-4xl md:text-6xl font-black mb-2 md:mb-4 tracking-tighter font-header heading-caps ${textDropShadow ? 'drop-shadow-md' : ''}`}
                                style={{ color: accentColor }}
                            >
                                {displayMetricTitle}
                            </h3>
                            <p className={`text-lg font-medium font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>
                                {displayMetricDesc}
                            </p>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default MetricsQuimera;
