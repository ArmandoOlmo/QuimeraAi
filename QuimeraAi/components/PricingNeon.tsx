import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { getBorderRadiusClass } from '../utils/styleUtils';
import { PricingNeonData } from '../types/components';
import { Check } from 'lucide-react';

export interface PricingNeonProps extends PricingNeonData {
    isPreviewMode?: boolean;
    onNavigate?: (href: string) => void;
}

const PricingNeon: React.FC<PricingNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;

    // Fallbacks
    const headline = data.headline || 'Simple, transparent pricing';
    const subheadline = data.subheadline || 'No hidden fees. No surprise charges.';
    const tiers = data.tiers && data.tiers.length > 0 ? data.tiers : [
        {
            name: 'Basic',
            price: '$19',
            billingPeriod: '/month',
            description: 'Perfect for getting started.',
            features: ['1 User', 'Basic Support', '10GB Storage'],
            buttonText: 'Start Basic',
            isPopular: false
        },
        {
            name: 'Pro',
            price: '$49',
            billingPeriod: '/month',
            description: 'Best for growing teams.',
            features: ['5 Users', 'Priority Support', '100GB Storage', 'Advanced Analytics'],
            buttonText: 'Start Pro',
            isPopular: true
        },
        {
            name: 'Enterprise',
            price: '$99',
            billingPeriod: '/month',
            description: 'For large scale operations.',
            features: ['Unlimited Users', '24/7 Support', 'Unlimited Storage', 'Custom Integrations'],
            buttonText: 'Contact Sales',
            isPopular: false
        }
    ];

    const colors = data.colors || {};
        
    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    const blurRadius = (intensity / 100) * 30;
    const spreadRadius = (intensity / 100) * 5;
    const opacity = (intensity / 100) * 0.5 + 0.1;
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const baseGlowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

    const showTopDots = data.showTopDots ?? true;
    const dotColors = data.dotColors?.length ? data.dotColors : ['#FF5F56', '#FFBD2E', '#27C93F'];

    const handleNavigate = (e: React.MouseEvent<HTMLButtonElement>, href?: string) => {
        if (!href) return;
        if (data.onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            data.onNavigate(href);
        } else if (href) {
            window.location.href = href;
        }
    };

    return (
        <section 
            className="w-full relative overflow-hidden py-12 md:py-24 px-4 md:px-12 flex flex-col justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '75vh'
            }}
        >

            <div className="relative z-10 w-full max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl font-bold font-header heading-caps"
                            style={{ 
                                color: colors.heading || '#ffffff',
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)'
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }}
                        />
                    )}
                    {subheadline && (
                        <p 
                            className="text-lg md:text-xl font-body opacity-80"
                            style={{ 
                                color: colors.text || '#a1a1aa' }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}
                </div>

                <div className={clsx(
                    "flex flex-wrap gap-4 md:gap-8",
                    data.cardsAlignment === 'start' ? 'justify-start' : 
                    data.cardsAlignment === 'end' ? 'justify-end' : 'justify-center',
                    "max-w-7xl mx-auto"
                )}>
                    {tiers.map((tier, idx) => {
                        const isHighlight = tier.isPopular;
                        return (
                            <div 
                                key={idx}
                                className={clsx(
                                    "flex flex-col p-6 md:p-8 transition-all duration-300 relative group overflow-hidden w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.333rem)] max-w-md",
                                    getBorderRadiusClass(data.cardBorderRadius),
                                    data.glassEffect ? "backdrop-blur-xl" : "",
                                    isHighlight ? "scale-105 z-20" : "scale-100 z-10"
                                )}
                                style={{
                                    backgroundColor: data.glassEffect 
                                        ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} ${isHighlight ? '80%' : '60%'}, transparent)` 
                                        : (colors.cardBackground || '#141414'),
                                    borderWidth: intensity > 0 || isHighlight ? '2px' : '0px',
                                    borderStyle: 'solid',
                                    borderColor: isHighlight ? neonColor : 'rgba(255,255,255,0.05)',
                                    ...(isHighlight && intensity > 0 ? baseGlowStyle : {})
                                }}
                                onMouseEnter={(e) => {
                                    if (intensity > 0 && !isHighlight) {
                                        Object.assign(e.currentTarget.style, baseGlowStyle);
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isHighlight) {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                    }
                                }}
                            >
                                {/* Highlight Badge */}
                                {isHighlight && (
                                    <div 
                                        className="absolute top-0 inset-x-0 py-1 text-center text-xs font-bold font-header tracking-widest uppercase"
                                        style={{ backgroundColor: neonColor, color: '#000000' }}
                                    >
                                        Popular
                                    </div>
                                )}
                                
                                {/* Decorative Dots */}
                                {showTopDots && dotColors.length > 0 && (
                                    <div className={clsx(
                                        "absolute right-4 flex items-center gap-1.5 z-20 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.5)]",
                                        isHighlight ? "top-10" : "top-4"
                                    )}>
                                        {dotColors.map((color, i) => (
                                            <div 
                                                key={i}
                                                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full relative"
                                                style={{ 
                                                    backgroundColor: color,
                                                    boxShadow: `inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)`
                                                }}
                                            >
                                                <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-white/60 rounded-full blur-[1px]"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className={clsx("relative z-10 space-y-6", isHighlight ? "mt-4" : "")}>
                                    <div>
                                        <h3 
                                            className="text-2xl font-bold font-header heading-caps"
                                            style={{ 
                                                color: colors.cardHeading || colors.heading || '#ffffff' }}
                                        >
                                            {tier.name}
                                        </h3>
                                        <p 
                                            className="text-sm font-body opacity-80 mt-1"
                                            style={{ 
                                                color: colors.cardText || colors.text || '#a1a1aa' }}
                                        >
                                            {tier.description}
                                        </p>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span 
                                            className="text-5xl font-bold font-header"
                                            style={{ color: colors.cardHeading || colors.heading || '#ffffff' }}
                                        >
                                            {tier.price}
                                        </span>
                                        {tier.billingPeriod && (
                                            <span 
                                                className="text-lg font-body opacity-70"
                                                style={{ color: colors.cardText || colors.text || '#a1a1aa' }}
                                            >
                                                {tier.billingPeriod}
                                            </span>
                                        )}
                                    </div>

                                    <ul className="space-y-4 flex-grow border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                        {tier.features?.map((feature, fIdx) => (
                                            <li key={fIdx} className="flex items-start gap-3">
                                                <Check size={20} style={{ color: neonColor }} className="mt-0.5 shrink-0" />
                                                <span 
                                                    className="font-body text-base opacity-90"
                                                    style={{ color: colors.cardText || colors.text || '#a1a1aa' }}
                                                >
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="pt-6">
                                            <button 
                                                className={clsx(
                                                    "w-full py-4 rounded-full font-bold text-base font-button transition-transform hover:scale-105 active:scale-95 relative overflow-hidden",
                                                    isHighlight 
                                                        ? "shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_15px_rgba(0,0,0,0.4)]" 
                                                        : "border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.3)] backdrop-blur-md"
                                                )}
                                                onClick={(e) => handleNavigate(e, tier.buttonLink)}
                                                style={isHighlight ? {
                                                    background: `linear-gradient(135deg, ${colors.buttonBackground || neonColor} 0%, ${colors.buttonBackground || neonColor}cc 100%)`,
                                                    color: colors.buttonText || '#000000',
                                                    textTransform: 'var(--buttons-transform, none)' as any,
                                                    letterSpacing: 'var(--buttons-spacing, normal)' } : {
                                                    borderColor: colors.buttonBackground || neonColor,
                                                    color: colors.text || '#ffffff',
                                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                                                    textTransform: 'var(--buttons-transform, none)' as any,
                                                    letterSpacing: 'var(--buttons-spacing, normal)' }}
                                            >
                                                {tier.buttonText || 'Select Plan'}
                                            </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default PricingNeon;
