import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToggleControl } from '../ui/EditorControlPrimitives';

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    period: string;
    isPopular?: boolean;
    buttonText: string;
    buttonLink?: string;
    features: Array<{ text: string; included: boolean }>;
}

interface PricingQuimeraProps {
    title?: string;
    subtitle?: string;
    plans?: PricingPlan[];
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
}

const defaultPlans: PricingPlan[] = [
    {
        name: 'Starter',
        description: 'Ideal para individuos empezando',
        price: 'Free',
        period: 'para siempre',
        buttonText: 'Empezar Gratis',
        features: [
            { text: '1 Sitio web básico', included: true },
            { text: 'Asistente de IA (10 creditos)', included: true },
            { text: 'Soporte de la comunidad', included: true },
            { text: 'Dominio personalizado', included: false },
            { text: 'Marca blanca', included: false },
        ]
    },
    {
        name: 'Pro',
        description: 'Para profesionales y pequeños negocios',
        price: '$29',
        period: 'por mes',
        isPopular: true,
        buttonText: 'Empezar Pro',
        features: [
            { text: 'Sitios web ilimitados', included: true },
            { text: 'Asistente de IA (Ilimitado)', included: true },
            { text: 'Soporte prioritario', included: true },
            { text: 'Dominio personalizado', included: true },
            { text: 'Marca blanca', included: false },
        ]
    },
    {
        name: 'Agencia',
        description: 'Para agencias y equipos grandes',
        price: '$99',
        period: 'por mes',
        buttonText: 'Contactar Ventas',
        features: [
            { text: 'Sitios web ilimitados', included: true },
            { text: 'Asistente de IA (Ilimitado)', included: true },
            { text: 'Soporte 24/7', included: true },
            { text: 'Dominio personalizado', included: true },
            { text: 'Marca blanca completa', included: true },
        ]
    }
];

const PricingQuimera: React.FC<PricingQuimeraProps> = ({
    title,
    subtitle,
    plans = defaultPlans,
    colors = {}
}) => {
    const { t } = useTranslation();
    const [annual, setAnnual] = useState(false);
    
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';
    
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.1)';
    const cardText = colors.cardText || textColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';
    
    const displayTitle = title || t('editor.placeholder.title', 'Escribe el título aquí...');
    const displaySubtitle = subtitle || t('editor.placeholder.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full filter blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps">
                        {displayTitle}
                    </h2>
                    <p className="text-xl font-light mb-10 font-body" style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-gray-400'}`}>Mensual</span>
                        <ToggleControl checked={annual} onChange={setAnnual} />
                        <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-gray-400'}`}>
                            Anual <span className="ml-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full font-body">-20%</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-center max-w-6xl mx-auto">
                    {(plans || []).map((plan, index) => {
                        const displayPlanName = plan.name || t('editor.placeholder.planName', 'Plan');
                        const displayPlanDesc = plan.description || t('editor.placeholder.planDesc', 'Descripción del plan');
                        const displayPrice = plan.price || '$0';
                        const displayPeriod = plan.period || '/mes';
                        const displayButtonText = plan.buttonText || t('editor.placeholder.button', 'Comenzar');

                        return (
                        <div 
                            key={index}
                            className={`relative p-6 md:p-8 rounded-3xl transition-all duration-300 border ${plan.isPopular ? 'md:-translate-y-4' : ''}`}
                            style={{ 
                                backgroundColor: cardBg, 
                                borderColor: plan.isPopular ? accentColor : cardBorder,
                                boxShadow: plan.isPopular ? `0 0 40px ${accentColor}25` : 'none',
                                color: cardText
                            }}
                        >
                            {plan.isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider" style={{ backgroundColor: accentColor }}>
                                        Más Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2 font-header heading-caps">{displayPlanName}</h3>
                                <p className="text-sm h-10 font-body" style={{ color: secondaryColor }}>{displayPlanDesc}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-2">
                                <span className="text-5xl font-black">{displayPrice}</span>
                                {plan.price !== 'Free' && (
                                    <span className="font-light" style={{ color: secondaryColor }}>{displayPeriod}</span>
                                )}
                            </div>

                            {plan.buttonLink ? (
                                <a 
                                    href={plan.buttonLink}
                                    className="w-full block text-center py-4 rounded-xl font-bold transition-all duration-300 font-button button-caps border"
                                    style={{
                                        backgroundColor: plan.isPopular ? accentColor : 'transparent',
                                        color: plan.isPopular ? '#000000' : textColor,
                                        borderColor: plan.isPopular ? 'transparent' : cardBorder,
                                        boxShadow: plan.isPopular ? `0 0 20px ${accentColor}50` : 'none'
                                    }}
                                >
                                    {displayButtonText}
                                </a>
                            ) : (
                                <button 
                                    className="w-full py-4 rounded-xl font-bold transition-all duration-300 font-button button-caps border"
                                    style={{
                                        backgroundColor: plan.isPopular ? accentColor : 'transparent',
                                        color: plan.isPopular ? '#000000' : textColor,
                                        borderColor: plan.isPopular ? 'transparent' : cardBorder,
                                        boxShadow: plan.isPopular ? `0 0 20px ${accentColor}50` : 'none'
                                    }}
                                >
                                    {displayButtonText}
                                </button>
                            )}

                            <div className="mt-8 space-y-4 font-button button-caps">
                                {(plan.features || []).map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {feature.included ? (
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 border" style={{ backgroundColor: `${accentColor}33`, borderColor: `${accentColor}50` }}>
                                                <Check className="w-3 h-3" style={{ color: accentColor }} />
                                            </div>
                                        ) : (
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center mt-0.5 border border-white/10" style={{ borderColor: cardBorder }}>
                                                <X className="w-3 h-3" style={{ color: secondaryColor }} />
                                            </div>
                                        )}
                                        <span className="text-sm" style={{ color: feature.included ? textColor : secondaryColor }}>
                                            {feature.text || t('editor.placeholder.feature', 'Escribe tu característica aquí...')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default PricingQuimera;
