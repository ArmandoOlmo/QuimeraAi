import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface LuminaFeature {
    icon?: string;
    image?: string;
    title: string;
    description: string;
}

export interface FeaturesLuminaData {
    headline: string;
    subheadline?: string;
    features: LuminaFeature[];
    glassEffect?: boolean;
    luminaAnimation?: LuminaAnimationConfig;
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        panelBackground?: string;
        panelBorder?: string;
    };
}

const FeaturesLumina: React.FC<FeaturesLuminaData> = ({
    headline,
    subheadline,
    features,
    glassEffect = true,
    luminaAnimation,
    colors
}) => {
    headline = headline || 'Core Features';
    subheadline = subheadline || 'Everything you need to succeed';
    features = features && features.length > 0 ? features : [
        { title: 'Lightning Fast', description: 'Optimized for performance and speed.', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 9.81h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14.19H4z"/></svg>' },
        { title: 'Secure Design', description: 'Built with modern security practices.', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/></svg>' },
        { title: 'Global Scale', description: 'Ready for users around the world.', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>' }
    ];
    const { t } = useTranslation();

    return (
        <section 
            className="relative w-full py-20 px-6 md:px-12"
            style={{ backgroundColor: colors?.background }}
        >
            <LuminaBackground 
                className="absolute inset-0 z-0" 
                animationEnabled={luminaAnimation?.enabled}
                animationColors={luminaAnimation?.colors}
                pulseSpeed={luminaAnimation?.pulseSpeed}
                interactionStrength={luminaAnimation?.interactionStrength}
            />
            
            <div className="relative z-10 w-full max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <LuminaTypography variant="heading-lg" className="font-header" customColor={colors?.heading}>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                    </LuminaTypography>
                    
                    {subheadline && (
                        <LuminaTypography variant="body-md" className="opacity-90 font-body" customColor={colors?.text}>
                            {subheadline}
                        </LuminaTypography>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <LuminaPanel 
                            key={idx} 
                            className="p-8 space-y-4 hover:-translate-y-1 transition-transform"
                            variant={glassEffect ? 'glass' : 'solid'}
                            customBgColor={colors?.panelBackground}
                            customBorderColor={colors?.panelBorder}
                        >
                            {feature.image && (
                                <img src={feature.image} alt={feature.title} className="w-full h-48 md:h-56 object-cover rounded-xl mb-6 shadow-md" />
                            )}
                            {!feature.image && feature.icon && (
                                <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-6">
                                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(feature.icon) }} />
                                </div>
                            )}
                            <LuminaTypography variant="heading-sm" className="font-header" customColor={colors?.heading}>
                                {feature.title}
                            </LuminaTypography>
                            <LuminaTypography variant="body-sm" className="opacity-80 font-body leading-relaxed" customColor={colors?.text}>
                                {feature.description}
                            </LuminaTypography>
                        </LuminaPanel>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesLumina;
