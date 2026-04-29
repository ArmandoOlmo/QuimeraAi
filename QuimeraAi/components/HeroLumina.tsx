import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaButton, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface HeroLuminaData {
    headline: string;
    subheadline?: string;
    primaryCta?: string;
    primaryCtaLink?: string;
    secondaryCta?: string;
    secondaryCtaLink?: string;
    textLayout?: string;
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

interface HeroLuminaProps extends HeroLuminaData {
    onNavigate?: (href: string) => void;
}

const getHorizontalAlign = (layoutStr: string = 'center'): 'left' | 'center' | 'right' => {
    if (layoutStr.startsWith('left')) return 'left';
    if (layoutStr.startsWith('right')) return 'right';
    return 'center';
};

const getJustifyClass = (layoutStr: string = 'center'): string => {
    const h = getHorizontalAlign(layoutStr);
    if (h === 'left') return 'justify-start';
    if (h === 'right') return 'justify-end';
    return 'justify-center';
};

const getVerticalClass = (layoutStr: string = 'center'): string => {
    if (layoutStr.endsWith('-top') || layoutStr === 'center-top') return 'items-start pt-16 md:pt-32 pb-8 md:pb-12';
    if (layoutStr.endsWith('-bottom') || layoutStr === 'center-bottom') return 'items-end pb-8 md:pb-12 pt-16 md:pt-24';
    return 'items-center py-10 md:py-20';
};

const getAlignmentClass = (layoutStr: string = 'center') => {
    if (layoutStr.includes('left')) return 'items-start text-left';
    if (layoutStr.includes('right')) return 'items-end text-right';
    return 'items-center text-center';
};

const HeroLumina: React.FC<HeroLuminaProps> = ({
    headline,
    subheadline,
    primaryCta,
    primaryCtaLink,
    secondaryCta,
    secondaryCtaLink,
    textLayout = 'center',
    glassEffect = true,
    luminaAnimation,
    colors,
    onNavigate,
}) => {
    headline = headline || 'Welcome to Lumina';
    subheadline = subheadline || 'Experience the next generation of web design.';
    primaryCta = primaryCta || 'Get Started';
    primaryCtaLink = primaryCtaLink || '/register';
    secondaryCta = secondaryCta || 'Learn More';
    secondaryCtaLink = secondaryCtaLink || '/about';

    const { t } = useTranslation();

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    const justifyClass = getJustifyClass(textLayout);
    const verticalClass = getVerticalClass(textLayout);
    const alignmentClass = getAlignmentClass(textLayout);

    return (
        <section className={`relative w-full min-h-[80vh] flex flex-col overflow-hidden`}>
            <LuminaBackground 
                className="absolute inset-0 z-0" 
                animationEnabled={luminaAnimation?.enabled}
                animationColors={luminaAnimation?.colors}
                pulseSpeed={luminaAnimation?.pulseSpeed}
                interactionStrength={luminaAnimation?.interactionStrength}
            />
            
            <div className={`relative z-10 w-full max-w-7xl mx-auto px-4 md:px-12 flex flex-1 ${verticalClass} ${justifyClass}`}>
                <LuminaPanel 
                    variant={glassEffect ? 'glass' : 'solid'}
                    className={`w-full max-w-xl p-6 md:p-16 flex flex-col space-y-6 md:space-y-8 animate-fade-in-up ${alignmentClass}`}
                    customBgColor={colors?.panelBackground}
                    customBorderColor={colors?.panelBorder}
                >
                    <div className="space-y-4">
                        <LuminaTypography 
                            variant="display-md" 
                            className="font-header"
                            customColor={colors?.heading}
                        >
                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                        </LuminaTypography>
                        
                        {subheadline && (
                            <LuminaTypography 
                                variant="body-lg" 
                                className={`opacity-90 font-body ${alignmentClass.includes('text-center') ? 'mx-auto' : ''}`}
                                customColor={colors?.text}
                            >
                                {subheadline}
                            </LuminaTypography>
                        )}
                    </div>

                    <div className={`flex flex-col sm:flex-row gap-4 pt-4 ${alignmentClass.includes('items-center') ? 'justify-center' : alignmentClass.includes('items-start') ? 'justify-start' : 'justify-end'} w-full`}>
                        {primaryCta && (
                            <LuminaButton 
                                variant="primary" 
                                onClick={(e: any) => handleNavigate(e, primaryCtaLink)}
                                customBgColor={colors?.primaryButtonBackground}
                                customTextColor={colors?.primaryButtonText}
                                customBorderColor={colors?.primaryButtonBackground}
                            >
                                {primaryCta}
                            </LuminaButton>
                        )}
                        
                        {secondaryCta && (
                            <LuminaButton 
                                variant="secondary" 
                                onClick={(e: any) => handleNavigate(e, secondaryCtaLink)}
                                customBgColor={colors?.secondaryButtonBackground}
                                customTextColor={colors?.secondaryButtonText}
                                customBorderColor={colors?.secondaryButtonBackground || colors?.primaryButtonBackground}
                            >
                                {secondaryCta}
                            </LuminaButton>
                        )}
                    </div>
                </LuminaPanel>
            </div>
        </section>
    );
};

export default HeroLumina;
