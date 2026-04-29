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
    };
}

const defaultFeatures = [
    {
        icon: 'Bot',
        title: 'Generación por IA',
        description: 'Sitios web completos, copys persuasivos y diseño impecable generados en segundos por nuestra IA avanzada.'
    },
    {
        icon: 'Palette',
        title: 'Editor Visual Intuitivo',
        description: 'Personaliza cada detalle con nuestro potente editor drag & drop. Sin necesidad de escribir código.'
    },
    {
        icon: 'Globe',
        title: 'Dominios Personalizados',
        description: 'Conecta tu propio dominio fácilmente para mantener una presencia de marca profesional.'
    },
    {
        icon: 'Zap',
        title: 'Rendimiento Extremo',
        description: 'Optimización automática de imágenes y código para tiempos de carga ultrarrápidos y mejor SEO.'
    },
    {
        icon: 'Shield',
        title: 'Seguridad Empresarial',
        description: 'Certificados SSL gratuitos, protección DDoS y copias de seguridad automáticas de tu sitio.'
    },
    {
        icon: 'Sparkles',
        title: 'Marca Blanca',
        description: 'Agencias y freelancers pueden revender la plataforma bajo su propia marca sin menciones de Quimera.'
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
    title = 'Características Principales',
    subtitle = 'Todo lo que necesitas para construir una presencia digital potente',
    features = defaultFeatures,
    colors = {}
}) => {
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-yellow-500/5 rounded-full filter blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-yellow-600/5 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-xl text-gray-400 font-light">
                        {subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div 
                            key={index}
                            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-yellow-500/30 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
                        >
                            {/* Hover gradient glow */}
                            <div className="absolute -inset-px bg-gradient-to-br from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform duration-500 border border-yellow-500/20">
                                    {getIcon(feature.icon)}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed font-light group-hover:text-gray-300 transition-colors">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesQuimera;
