import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { getBorderRadiusClass } from '../utils/styleUtils';
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
        
    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 60;
    const blurRadius = (intensity / 100) * 40;
    const spreadRadius = (intensity / 100) * 10;
    const opacity = (intensity / 100) * 0.7 + 0.1;
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const showTopDots = data.showTopDots ?? true;
    const dotColors = data.dotColors?.length ? data.dotColors : ['#FF5F56', '#FFBD2E', '#27C93F'];
    
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
            className="w-full relative overflow-hidden py-12 md:py-24 px-4 md:px-12 flex items-center justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '70vh'
            }}
        >

            <div 
                className={clsx(
                    "relative z-10 w-full max-w-5xl mx-auto text-center p-6 md:p-16 lg:p-20 transition-all duration-300",
                    getBorderRadiusClass(data.cardBorderRadius),
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
                {/* Decorative Dots */}
                {showTopDots && dotColors.length > 0 && (
                    <div className="absolute top-6 right-6 flex items-center gap-2 z-20 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.5)]">
                        {dotColors.map((color, i) => (
                            <div 
                                key={i}
                                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full relative"
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
                <div className="max-w-3xl mx-auto space-y-8">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl lg:text-6xl font-bold font-header leading-tight heading-caps"
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
                            className="text-lg md:text-2xl font-body opacity-90 leading-relaxed"
                            style={{ 
                                color: colors.text || '#a1a1aa' }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        {primaryCta && (
                                <button 
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg font-button transition-transform hover:scale-105 active:scale-95 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_15px_rgba(0,0,0,0.4)] relative overflow-hidden button-caps"
                                    onClick={(e) => handleNavigate(e, data.primaryCtaLink)}
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.buttonBackground || neonColor} 0%, ${colors.buttonBackground || neonColor}cc 100%)`,
                                        color: colors.buttonText || '#000000',
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)' }}
                                >
                                    {primaryCta}
                                </button>
                        )}
                        
                        {secondaryCta && (
                                <button 
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg font-button border transition-transform hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.3)] backdrop-blur-md button-caps"
                                    onClick={(e) => handleNavigate(e, data.secondaryCtaLink)}
                                    style={{
                                        borderColor: colors.buttonBackground || neonColor,
                                        color: colors.text || '#ffffff',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)' }}
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
