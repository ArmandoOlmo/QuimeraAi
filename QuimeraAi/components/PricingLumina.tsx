import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LuminaBackground, LuminaPanel, LuminaButton, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface LuminaPricingTier {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    isPopular?: boolean;
    highlighted?: boolean;
    buttonText: string;
    buttonLink: string;
    buttonLinkType?: string;
}

export interface PricingLuminaData {
    cardsAlignment?: 'start' | 'center' | 'end';
    headline: string;
    subheadline?: string;
    billingToggle?: boolean;
    tiers: LuminaPricingTier[];
    glassEffect?: boolean;
    luminaAnimation?: LuminaAnimationConfig;
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        panelBackground?: string;
        panelBorder?: string;
        primaryButtonBackground?: string;
        primaryButtonText?: string;
        secondaryButtonBackground?: string;
        secondaryButtonText?: string;
    };
}

interface PricingLuminaProps extends PricingLuminaData {
    onNavigate?: (href: string) => void;
}

const PricingLumina: React.FC<PricingLuminaProps> = ({
    headline,
    subheadline,
    billingToggle,
    tiers,
    glassEffect = true,
    luminaAnimation,
    colors,
    cardsAlignment,
    onNavigate
}) => {
    headline = headline || 'Simple, Transparent Pricing';
    subheadline = subheadline || 'Choose the plan that best fits your needs.';
    billingToggle = billingToggle !== undefined ? billingToggle : true;
    tiers = tiers && tiers.length > 0 ? tiers : [
        { name: 'Starter', price: '$29', period: '/mo', description: 'Perfect for small businesses.', features: ['Up to 5 Projects', 'Basic Analytics', '24/7 Support'], buttonText: 'Start Free Trial', buttonLink: '#', highlighted: false },
        { name: 'Professional', price: '$99', period: '/mo', description: 'Ideal for growing companies.', features: ['Unlimited Projects', 'Advanced Analytics', 'Priority Support'], buttonText: 'Get Started', buttonLink: '#', highlighted: true },
        { name: 'Enterprise', price: '$299', period: '/mo', description: 'For large-scale organizations.', features: ['Dedicated Manager', 'Custom Integration', 'SLA Guarantee'], buttonText: 'Contact Sales', buttonLink: '#', highlighted: false }
    ];
    const { t } = useTranslation();

    const handleNavigate = (e: React.MouseEvent<HTMLButtonElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
        } else {
            window.location.href = href;
        }
    };

    return (
        <section 
            className="relative w-full py-24 px-6 md:px-12"
            style={{ backgroundColor: colors?.background }}
        >
            <LuminaBackground 
                className="absolute inset-0 z-0" 
                animationEnabled={luminaAnimation?.enabled}
                animationColors={luminaAnimation?.colors}
                pulseSpeed={luminaAnimation?.pulseSpeed}
                interactionStrength={luminaAnimation?.interactionStrength}
            />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-16">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <LuminaTypography variant="heading-lg" className="font-header" customColor={colors?.heading}>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                    </LuminaTypography>
                    
                    {subheadline && (
                        <LuminaTypography variant="body-lg" className="opacity-90 font-body" customColor={colors?.text}>
                            {subheadline}
                        </LuminaTypography>
                    )}
                </div>

                <div className={clsx(
                    "flex flex-wrap gap-8 justify-center",
                    cardsAlignment === 'start' ? 'justify-start' : 
                    cardsAlignment === 'end' ? 'justify-end' : 'justify-center',
                    "max-w-5xl mx-auto"
                )}>
                    {tiers.map((tier, idx) => {
                        const isPopular = tier.isPopular || tier.highlighted;
                        return (
                        <div key={idx} className={`relative flex flex-col w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.333rem)] max-w-md ${isPopular ? 'scale-105 z-10' : 'z-0'}`}>
                            {isPopular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#10B981] text-[#022C22] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg z-20">
                                    Most Popular
                                </div>
                            )}
                            <LuminaPanel 
                                variant={glassEffect ? (isPopular ? 'solid' : 'glass') : 'solid'}
                                className={`relative p-8 flex flex-col h-full flex-grow ${isPopular ? 'shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : ''}`}
                                customBgColor={colors?.panelBackground}
                                customBorderColor={colors?.panelBorder}
                            >
                                <div className="mb-8 space-y-2 mt-4">
                                    <LuminaTypography variant="heading-sm" className="font-header text-[#10B981]">
                                        {tier.name}
                                    </LuminaTypography>
                                    <div className="flex items-baseline gap-2">
                                        <LuminaTypography variant="display-md" className="font-header" customColor={colors?.heading}>
                                            {tier.price}
                                        </LuminaTypography>
                                        <LuminaTypography variant="body-md" className="opacity-80" customColor={colors?.text}>
                                            {tier.period}
                                        </LuminaTypography>
                                    </div>
                                    <LuminaTypography variant="body-sm" className="opacity-80" customColor={colors?.text}>
                                        {tier.description}
                                    </LuminaTypography>
                                </div>

                                <ul className="space-y-4 mb-8 flex-grow">
                                    {tier.features.map((feature, fIdx) => (
                                        <li key={fIdx} className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <LuminaTypography variant="body-sm" className="font-body opacity-90" customColor={colors?.text}>
                                                {feature}
                                            </LuminaTypography>
                                        </li>
                                    ))}
                                </ul>

                                <LuminaButton 
                                    variant={isPopular ? 'secondary' : 'primary'} 
                                    className="w-full mt-auto"
                                    onClick={(e: any) => handleNavigate(e, tier.buttonLink)}
                                    customBgColor={isPopular ? colors?.secondaryButtonBackground : colors?.primaryButtonBackground}
                                    customTextColor={isPopular ? colors?.secondaryButtonText : colors?.primaryButtonText}
                                >
                                    {tier.buttonText}
                                </LuminaButton>
                            </LuminaPanel>
                        </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default PricingLumina;
