import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { getBorderRadiusClass } from '../utils/styleUtils';
import { FeaturesNeonData } from '../types/components';

export interface FeaturesNeonProps extends FeaturesNeonData {
    isPreviewMode?: boolean;
}

const FeaturesNeon: React.FC<FeaturesNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;

    // Fallbacks
    const headline = data.headline || 'Our Features';
    const subheadline = data.subheadline || 'Everything you need to succeed.';
    const features = data.features && data.features.length > 0 ? data.features : [
        {
            title: 'High Performance',
            description: 'Lightning fast load times and optimized delivery.',
        },
        {
            title: 'Secure by Design',
            description: 'Enterprise-grade security built into the core.',
        },
        {
            title: '24/7 Support',
            description: 'Our team is always here to help you out.',
        }
    ];

    const colors = data.colors || {};
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    const blurRadius = (intensity / 100) * 30;
    const spreadRadius = (intensity / 100) * 5;
    const opacity = (intensity / 100) * 0.5 + 0.1;
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const glowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

    const showTopDots = data.showTopDots ?? true;
    const dotColors = data.dotColors?.length ? data.dotColors : ['#FF5F56', '#FFBD2E', '#27C93F'];

    return (
        <section 
            className="w-full relative overflow-hidden py-24 px-6 md:px-12 flex flex-col justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '60vh'
            }}
        >

            <div className="relative z-10 w-full max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl font-bold font-header"
                            style={{ 
                                color: colors.heading || '#ffffff',
                                fontFamily: headlineFontFamily,
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
                                color: colors.text || '#a1a1aa',
                                fontFamily: subheadlineFontFamily
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div 
                            key={idx}
                            className={clsx(
                                "flex flex-col p-8 transition-all duration-300 relative group overflow-hidden",
                                getBorderRadiusClass(data.cardBorderRadius),
                                data.glassEffect ? "backdrop-blur-xl" : ""
                            )}
                            style={{
                                backgroundColor: data.glassEffect 
                                    ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} 60%, transparent)` 
                                    : (colors.cardBackground || '#141414'),
                                borderWidth: intensity > 0 ? '1px' : '0px',
                                borderStyle: 'solid',
                                borderColor: 'rgba(255,255,255,0.05)'
                            }}
                            onMouseEnter={(e) => {
                                if (intensity > 0) {
                                    Object.assign(e.currentTarget.style, glowStyle);
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            {/* Decorative Dots */}
                            {showTopDots && dotColors.length > 0 && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.5)]">
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

                            {feature.imageUrl && (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 relative z-10">
                                    <img src={feature.imageUrl} alt={feature.title} className="w-full h-full object-cover" />
                                </div>
                            )}
                            
                            <div className="relative z-10 space-y-3">
                                <h3 
                                    className="text-2xl font-bold font-header"
                                    style={{ 
                                        color: colors.heading || '#ffffff',
                                        fontFamily: headlineFontFamily
                                    }}
                                >
                                    {feature.title}
                                </h3>
                                <p 
                                    className="text-base font-body opacity-80 leading-relaxed"
                                    style={{ 
                                        color: colors.text || '#a1a1aa',
                                        fontFamily: subheadlineFontFamily
                                    }}
                                >
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

export default FeaturesNeon;
