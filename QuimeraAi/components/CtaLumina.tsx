import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaButton, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface CtaLuminaData {
    headline: string;
    subheadline?: string;
    primaryCta?: string;
    primaryCtaLink?: string;
    primaryCtaLinkType?: string;
    secondaryCta?: string;
    secondaryCtaLink?: string;
    secondaryCtaLinkType?: string;
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

interface CtaLuminaProps extends CtaLuminaData {
    onNavigate?: (href: string) => void;
}

const CtaLumina: React.FC<CtaLuminaProps> = ({
    headline,
    subheadline,
    primaryCta,
    primaryCtaLink,
    secondaryCta,
    secondaryCtaLink,
    glassEffect = true,
    luminaAnimation,
    colors,
    onNavigate,
}) => {
    headline = headline || 'Ready to Transform Your Business?';
    subheadline = subheadline || 'Join thousands of satisfied customers who are already using our platform.';
    primaryCta = primaryCta || 'Get Started Now';
    primaryCtaLink = primaryCtaLink || '/register';
    const { t } = useTranslation();

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
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
            
            <div className="relative z-10 w-full max-w-5xl mx-auto">
                <LuminaPanel 
                    className="p-10 md:p-20 text-center flex flex-col items-center justify-center space-y-8 shadow-[0_20px_50px_rgba(2,44,34,0.6)]"
                    variant={glassEffect ? 'glass' : 'solid'}
                    customBgColor={colors?.panelBackground}
                    customBorderColor={colors?.panelBorder}
                >
                    <div className="space-y-4">
                        <LuminaTypography variant="heading-lg" className="font-header max-w-3xl mx-auto leading-tight" customColor={colors?.heading}>
                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                        </LuminaTypography>
                        
                        {subheadline && (
                            <LuminaTypography variant="body-lg" className="max-w-2xl mx-auto opacity-80 font-body" customColor={colors?.text}>
                                {subheadline}
                            </LuminaTypography>
                        )}
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
                        {primaryCta && (
                            <LuminaButton 
                                variant="primary" 
                                onClick={(e: any) => handleNavigate(e, primaryCtaLink as string)}
                                className="px-10 py-4 text-lg"
                                customBgColor={colors?.primaryButtonBackground}
                                customTextColor={colors?.primaryButtonText}
                            >
                                {primaryCta}
                            </LuminaButton>
                        )}
                        {secondaryCta && (
                            <LuminaButton 
                                variant="secondary" 
                                onClick={(e: any) => handleNavigate(e, secondaryCtaLink as string)}
                                className="px-10 py-4 text-lg"
                                customBgColor={colors?.secondaryButtonBackground}
                                customTextColor={colors?.secondaryButtonText}
                                customBorderColor={colors?.secondaryButtonBackground}
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

export default CtaLumina;
