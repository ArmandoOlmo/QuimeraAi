import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    period: string;
    isPopular?: boolean;
    buttonText: string;
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
    title = 'Precios Simples y Transparentes',
    subtitle = 'Elige el plan que mejor se adapte a tus necesidades. Sin costos ocultos.',
    plans = defaultPlans,
    colors = {}
}) => {
    const [annual, setAnnual] = useState(false);
    
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';

    return (
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full filter blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-xl text-gray-400 font-light mb-10">
                        {subtitle}
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-gray-400'}`}>Mensual</span>
                        <button 
                            onClick={() => setAnnual(!annual)}
                            className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 transition-colors focus:outline-none"
                        >
                            <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-yellow-500 transition-transform ${annual ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-gray-400'}`}>
                            Anual <span className="ml-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">-20%</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div 
                            key={index}
                            className={`relative p-8 rounded-3xl transition-all duration-300 ${
                                plan.isPopular 
                                    ? 'bg-gradient-to-b from-white/10 to-white/5 border border-yellow-500/50 shadow-[0_0_40px_rgba(212,175,55,0.15)] md:-translate-y-4' 
                                    : 'bg-white/[0.02] border border-white/10'
                            }`}
                        >
                            {plan.isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-yellow-500 text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                                        Más Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-gray-400 text-sm h-10">{plan.description}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-2">
                                <span className="text-5xl font-black">{plan.price}</span>
                                {plan.price !== 'Free' && (
                                    <span className="text-gray-400 font-light">{plan.period}</span>
                                )}
                            </div>

                            <button className={`w-full py-4 rounded-xl font-bold transition-all mb-8 ${
                                plan.isPopular 
                                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]' 
                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                            }`}>
                                {plan.buttonText}
                            </button>

                            <div className="space-y-4">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {feature.included ? (
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5 border border-yellow-500/30">
                                                <Check className="w-3 h-3 text-yellow-500" />
                                            </div>
                                        ) : (
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center mt-0.5 border border-white/10">
                                                <X className="w-3 h-3 text-gray-500" />
                                            </div>
                                        )}
                                        <span className={`text-sm ${feature.included ? 'text-gray-200' : 'text-gray-500'}`}>
                                            {feature.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PricingQuimera;
