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
    isPreviewMode?: boolean;
}

const defaultMetrics = [
    {
        title: '10x',
        description: 'Más rápido que el desarrollo tradicional'
    },
    {
        title: '99.9%',
        description: 'Uptime garantizado en todos los proyectos'
    },
    {
        title: '+5k',
        description: 'Usuarios activos diariamente'
    },
    {
        title: '24/7',
        description: 'Soporte técnico ininterrumpido'
    }
];

const MetricsQuimera: React.FC<MetricsQuimeraProps> = ({
    title,
    subtitle,
    features,
    items,
    colors = {}
}) => {
    const { t } = useTranslation();
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    // In some components the data might be mapped as features or items
    const displayMetrics = features?.length ? features : (items?.length ? items : defaultMetrics);
    
    const displayTitle = title || t('editor.placeholder.title', 'Impacto Demostrado');
    const displaySubtitle = subtitle || t('editor.placeholder.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full filter blur-[150px]" style={{ backgroundColor: `${accentColor}15` }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps">
                        {displayTitle}
                    </h2>
                    <p className="text-xl font-light font-body" style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
                    {displayMetrics.map((metric, index) => {
                        const displayMetricTitle = metric.title || t('editor.placeholder.title', '100%');
                        const displayMetricDesc = metric.description || t('editor.placeholder.description', 'Descripción de métrica');
                        
                        return (
                        <div 
                            key={index}
                            className="group text-center relative p-6 md:p-8 rounded-3xl transition-all duration-500 border"
                            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                        >
                            <h3 
                                className="text-5xl md:text-6xl font-black mb-4 tracking-tighter font-header heading-caps"
                                style={{ color: accentColor }}
                            >
                                {displayMetricTitle}
                            </h3>
                            <p className="text-lg font-medium font-body" style={{ color: secondaryColor }}>
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
