import React from 'react';

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
    title = 'Impacto Demostrado',
    subtitle = 'Nuestros resultados hablan por sí solos en la escala de operaciones.',
    features,
    items,
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    // In some components the data might be mapped as features or items
    const displayMetrics = features?.length ? features : (items?.length ? items : defaultMetrics);

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full filter blur-[150px]" style={{ backgroundColor: `${accentColor}15` }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {(title || subtitle) && (
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        {title && (
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-xl text-gray-400 font-light">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
                    {displayMetrics.map((metric, index) => (
                        <div 
                            key={index}
                            className="group text-center relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500"
                        >
                            <h3 
                                className="text-5xl md:text-6xl font-black mb-4 tracking-tighter"
                                style={{ color: accentColor }}
                            >
                                {metric.title}
                            </h3>
                            <p className="text-lg text-gray-400 font-medium">
                                {metric.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MetricsQuimera;
