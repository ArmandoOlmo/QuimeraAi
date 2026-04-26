import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { CtaNeonData } from '../types/components';

export interface CtaNeonProps extends CtaNeonData {
    isPreviewMode?: boolean;
    onNavigate?: (href: string) => void;
}

const CtaNeon: React.FC<CtaNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;

    // Fallbacks
    const headline = data.headline || 'Ready to start your journey?';
    const subheadline = data.subheadline || 'Join thousands of satisfied customers today and experience the difference.';
    const primaryCta = data.primaryCta || 'Get Started Now';
    const secondaryCta = data.secondaryCta || 'Contact Sales';

    const colors = data.colors || {};
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 60;
    const blurRadius = (intensity / 100) * 40;
    const spreadRadius = (intensity / 100) * 10;
    const opacity = (intensity / 100) * 0.7 + 0.1;
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const glowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

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
            className="w-full relative overflow-hidden py-24 px-6 md:px-12 flex items-center justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '70vh'
            }}
        >
            {/* Background Grid Pattern */}
            {data.showBackgroundGrid !== false && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${neonColor} 1px, transparent 1px), linear-gradient(90deg, ${neonColor} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        backgroundPosition: 'center center'
                    }}
                />
            )}

            <div 
                className={clsx(
                    "relative z-10 w-full max-w-5xl mx-auto text-center p-10 md:p-16 lg:p-20 rounded-[2.5rem] md:rounded-[4rem] transition-all duration-300",
                    data.glassEffect ? "backdrop-blur-2xl" : ""
                )}
                style={{
                    backgroundColor: data.glassEffect 
                        ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} 60%, transparent)` 
                        : (colors.cardBackground || '#141414'),
                    borderWidth: intensity > 0 ? '2px' : '0px',
                    borderStyle: 'solid',
                    ...glowStyle
                }}
            >
                <div className="max-w-3xl mx-auto space-y-8">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl lg:text-6xl font-bold font-header leading-tight"
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
                            className="text-lg md:text-2xl font-body opacity-90 leading-relaxed"
                            style={{ 
                                color: colors.text || '#a1a1aa',
                                fontFamily: subheadlineFontFamily
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        {primaryCta && (
                                <button 
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg font-button transition-all duration-300 hover:scale-105"
                                    onClick={(e) => handleNavigate(e, data.primaryCtaLink)}
                                    style={{
                                        backgroundColor: neonColor,
                                        color: '#000000',
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)',
                                        boxShadow: `0 0 20px ${neonColor}80`
                                    }}
                                >
                                    {primaryCta}
                                </button>
                        )}
                        
                        {secondaryCta && (
                                <button 
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg font-button transition-all duration-300 hover:bg-white/5 border border-white/20"
                                    onClick={(e) => handleNavigate(e, data.secondaryCtaLink)}
                                    style={{
                                        color: '#ffffff',
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)'
                                    }}
                                >
                                    {secondaryCta}
                                </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CtaNeon;
