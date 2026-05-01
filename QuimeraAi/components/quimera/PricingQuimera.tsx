import React, { useState, useMemo } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToggleControl } from '../ui/EditorControlPrimitives';
import { useLandingPlans, LandingPlan } from '../../hooks/useLandingPlans';

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    annualPrice?: string;
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
    /** When true, use plans from the admin panel (Firestore) instead of static props */
    useAdminPlans?: boolean;
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

const getDefaultPlans = (t: any): PricingPlan[] => [
    {
        name: t('quimera.pricing.plan1.name', 'Starter'),
        description: t('quimera.pricing.plan1.desc', 'Ideal para individuos empezando'),
        price: t('quimera.pricing.plan1.price', 'Free'),
        period: t('quimera.pricing.plan1.period', 'para siempre'),
        buttonText: t('quimera.pricing.plan1.button', 'Empezar Gratis'),
        features: [
            { text: t('quimera.pricing.plan1.feat1', '1 Sitio web básico'), included: true },
            { text: t('quimera.pricing.plan1.feat2', 'Asistente de IA (10 creditos)'), included: true },
            { text: t('quimera.pricing.plan1.feat3', 'Soporte de la comunidad'), included: true },
            { text: t('quimera.pricing.plan1.feat4', 'Dominio personalizado'), included: false },
            { text: t('quimera.pricing.plan1.feat5', 'Marca blanca'), included: false },
        ]
    },
    {
        name: t('quimera.pricing.plan2.name', 'Pro'),
        description: t('quimera.pricing.plan2.desc', 'Para profesionales y pequeños negocios'),
        price: '$29',
        annualPrice: '$23',
        period: t('quimera.pricing.plan2.period', 'por mes'),
        isPopular: true,
        buttonText: t('quimera.pricing.plan2.button', 'Empezar Pro'),
        features: [
            { text: t('quimera.pricing.plan2.feat1', 'Sitios web ilimitados'), included: true },
            { text: t('quimera.pricing.plan2.feat2', 'Asistente de IA (Ilimitado)'), included: true },
            { text: t('quimera.pricing.plan2.feat3', 'Soporte prioritario'), included: true },
            { text: t('quimera.pricing.plan2.feat4', 'Dominio personalizado'), included: true },
            { text: t('quimera.pricing.plan2.feat5', 'Marca blanca'), included: false },
        ]
    },
    {
        name: t('quimera.pricing.plan3.name', 'Agencia'),
        description: t('quimera.pricing.plan3.desc', 'Para agencias y equipos grandes'),
        price: '$99',
        annualPrice: '$79',
        period: t('quimera.pricing.plan3.period', 'por mes'),
        buttonText: t('quimera.pricing.plan3.button', 'Contactar Ventas'),
        features: [
            { text: t('quimera.pricing.plan3.feat1', 'Sitios web ilimitados'), included: true },
            { text: t('quimera.pricing.plan3.feat2', 'Asistente de IA (Ilimitado)'), included: true },
            { text: t('quimera.pricing.plan3.feat3', 'Soporte 24/7'), included: true },
            { text: t('quimera.pricing.plan3.feat4', 'Dominio personalizado'), included: true },
            { text: t('quimera.pricing.plan3.feat5', 'Marca blanca completa'), included: true },
        ]
    }
];

/**
 * Transform admin LandingPlan[] to the PricingPlan[] shape used by the component.
 * All features from admin are treated as "included: true".
 */
function transformAdminPlans(adminPlans: LandingPlan[], t: (key: string, fallback: string) => string): PricingPlan[] {
    return adminPlans.map(plan => ({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        annualPrice: plan.annualPrice,
        period: plan.period || (plan.priceValue === 0 ? '' : t('quimera.pricing.perMonth', '/mes')),
        isPopular: plan.isPopular || plan.featured,
        buttonText: plan.priceValue === 0
            ? t('quimera.pricing.startFree', 'Empezar Gratis')
            : t('quimera.pricing.getStarted', 'Comenzar'),
        buttonLink: '/register',
        features: plan.features.map(feature => ({
            text: feature,
            included: true,
        })),
    }));
}

const PricingQuimera: React.FC<PricingQuimeraProps> = ({
    title,
    subtitle,
    plans: propPlans,
    useAdminPlans = true,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
}) => {
    const { t } = useTranslation();
    const [annual, setAnnual] = useState(false);

    // Fetch plans from admin (Firestore) via the useLandingPlans hook
    const { plans: adminPlans, isLoading: isLoadingAdminPlans } = useLandingPlans();

    // Transform admin plans to the component's format
    const adminPricingPlans = useMemo(() => {
        if (!adminPlans || adminPlans.length === 0) return null;
        return transformAdminPlans(adminPlans, t);
    }, [adminPlans, t]);

    // Priority: admin plans > editor prop plans > hardcoded defaults
    const plans = useMemo(() => {
        if (useAdminPlans && adminPricingPlans && adminPricingPlans.length > 0) {
            return adminPricingPlans;
        }
        if (propPlans && propPlans.length > 0) {
            return propPlans;
        }
        return getDefaultPlans(t);
    }, [useAdminPlans, adminPricingPlans, propPlans, t]);
    
    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#D4AF37';
    
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.1)';
    const cardText = colors.cardText || textColor;
    const secondaryColor = colors.secondaryText || '#9ca3af';
    
    const displayTitle = title || t('quimera.pricing.title', 'Escribe el título aquí...');
    const displaySubtitle = subtitle || t('quimera.pricing.subtitle', 'Escribe el subtítulo aquí...');

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full filter blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className={`text-4xl md:text-5xl font-bold mb-6 tracking-tight font-header heading-caps ${textDropShadow ? 'drop-shadow-xl' : ''}`}>
                        {displayTitle}
                    </h2>
                    <p className={`text-xl font-light mb-10 font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                        {displaySubtitle}
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-gray-400'}`}>{t('quimera.pricing.monthly', 'Mensual')}</span>
                        <ToggleControl checked={annual} onChange={setAnnual} />
                        <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-gray-400'}`}>
                            {t('quimera.pricing.annual', 'Anual')} <span className="ml-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full font-body">{t('quimera.pricing.discount', '-20%')}</span>
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-stretch max-w-6xl mx-auto">
                    {(plans || []).map((plan, index) => {
                        const displayPlanName = plan.name || t('quimera.pricing.plan.name', 'Plan');
                        const displayPlanDesc = plan.description || t('quimera.pricing.plan.desc', 'Descripción del plan');
                        const isFree = plan.price === 'Free' || plan.price === 'Gratis' || plan.price === '$0';
                        const displayPrice = annual && plan.annualPrice && !isFree ? plan.annualPrice : (plan.price || '$0');
                        const displayPeriod = plan.period || '/mes';
                        const displayButtonText = plan.buttonText || t('quimera.pricing.plan.button', 'Comenzar');

                        return (
                        <div 
                            key={index}
                            className={`relative p-6 md:p-8 rounded-3xl transition-all duration-300 border flex flex-col ${plan.isPopular ? 'md:-translate-y-4' : ''}`}
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
                                        {t('quimera.pricing.mostPopular', 'Más Popular')}
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2 font-header heading-caps">{displayPlanName}</h3>
                                <p className={`text-sm h-10 font-body ${textDropShadow ? 'drop-shadow-sm' : ''}`} style={{ color: secondaryColor }}>{displayPlanDesc}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-2">
                                <span className="text-5xl font-black">{displayPrice}</span>
                                {!isFree && (
                                    <span className="font-light" style={{ color: secondaryColor }}>{displayPeriod}</span>
                                )}
                            </div>

                            {/* Features list — flex-1 pushes button to bottom */}
                            <div className="flex-1 space-y-4 font-body">
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
                                            {feature.text || t('quimera.pricing.plan.feature', 'Escribe tu característica aquí...')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button — pinned at bottom */}
                            {plan.buttonLink ? (
                                <a 
                                    href={plan.buttonLink}
                                    className="w-full block text-center py-4 rounded-xl font-bold transition-all duration-300 font-button button-caps border mt-8"
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
                                    className="w-full py-4 rounded-xl font-bold transition-all duration-300 font-button button-caps border mt-8"
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
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default PricingQuimera;
