import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-4xl md:text-5xl',
    md: 'text-5xl md:text-6xl',
    lg: 'text-6xl md:text-7xl',
    xl: 'text-7xl md:text-8xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-3xl',
};

const paddingYClasses: Record<PaddingSize, string> = {
    none: 'py-0',
    sm: 'py-10 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-20 md:py-32',
    xl: 'py-24 md:py-40',
};

const paddingXClasses: Record<PaddingSize, string> = {
    none: 'px-0',
    sm: 'px-4',
    md: 'px-6',
    lg: 'px-8',
    xl: 'px-12',
};

const renderBadgeIcon = (badgeIcon?: ServiceIcon | string) => {
    if (!badgeIcon) return '✧';
    if (badgeIcon.length <= 2) return badgeIcon;
    const iconMap: Record<string, any> = {
        'sparkles': LucideIcons.Sparkles, 'zap': LucideIcons.Zap, 'star': LucideIcons.Star,
        'award': LucideIcons.Award, 'trophy': LucideIcons.Trophy, 'rocket': LucideIcons.Rocket,
        'lightbulb': LucideIcons.Lightbulb, 'heart': LucideIcons.Heart, 'check-circle': LucideIcons.CheckCircle,
        'alert-circle': LucideIcons.AlertCircle, 'shield': LucideIcons.Shield, 'target': LucideIcons.Target,
        'trending-up': LucideIcons.TrendingUp, 'circle-dot': LucideIcons.CircleDot, 'hexagon': LucideIcons.Hexagon,
        'layers': LucideIcons.Layers,
    };
    const IconComponent = iconMap[badgeIcon];
    return IconComponent ? React.createElement(IconComponent, { size: 14, className: 'inline-block' }) : badgeIcon;
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
    onNavigate?: (href: string) => void;
}

/**
 * HeroMinimal — Ultra-clean minimalist hero.
 * Full photo with subtle darkening, centered thin typography,
 * dot-grid pattern, smooth scale-in entrance, and refined micro-interactions.
 */
const HeroMinimal: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
    gradientOpacity = 70,
    heroHeight,
    primaryCtaLink = '/#cta',
    secondaryCtaLink = '/#features',
    onNavigate,
}) => {
    const { getColor } = useDesignTokens();

    const actualColors = {
        primary: colors?.primary || getColor('primary.main', '#4f46e5'),
        secondary: colors?.secondary || getColor('secondary.main', '#10b981'),
        background: colors?.background || '#fafaf9',
        text: colors?.text || '#1c1917',
        heading: colors?.heading || '#0c0a09',
        buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
        buttonText: colors?.buttonText || '#ffffff',
        secondaryButtonBackground: colors?.secondaryButtonBackground || '#334155',
        secondaryButtonText: colors?.secondaryButtonText || '#1c1917',
    };

    const safeHeadline = typeof headline === 'string' ? headline : 'Welcome';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span style="color: ${actualColors.primary}; font-weight: 300;">$2</span>`
    );

    return (
        <section className="relative w-full flex items-center justify-center overflow-hidden"
            style={{ minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>            {/* Background image with subtle darkening */}
            {imageUrl && (
                <div className="absolute inset-0 z-0 transform-gpu">
                    <img
                        src={imageUrl}
                        alt="Hero Background"
                        className="w-full h-full object-cover minimal-img-entrance"
                    />
                    {/* Even, subtle darkening — not dramatic */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `rgba(0,0,0,${gradientOpacity / 100})`
                        }}
                    />
                    {/* Subtle radial vignette */}
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,0.3) 100%)'
                    }} />
                </div>
            )}

            {/* Subtle dot-grid pattern */}
            <div className="absolute inset-0 z-[1] opacity-[0.04]" style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
            }} />

            {/* Thin animated accent line at top */}
            <div className="absolute top-0 left-0 right-0 z-20">
                <div className="h-[1px] minimal-top-line" style={{
                    background: `linear-gradient(90deg, transparent 10%, ${actualColors.primary} 50%, transparent 90%)`
                }} />
            </div>

            {/* Content — generous whitespace, centered, thin type */}
            <div className={`relative z-10 container mx-auto ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} text-center max-w-4xl flex flex-col items-center`}>

                {/* Minimalist badge */}
                {showBadge && badgeText && (
                    <div className="minimal-badge inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 border border-white/10 bg-white/5 backdrop-blur-sm">
                        <span className="text-xs flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                        <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-white/70">{badgeText}</span>
                    </div>
                )}

                {/* Headline — thin elegant weight */}
                <h1
                    className={`${headlineSizeClasses[headlineFontSize]} font-extralight tracking-tight leading-[1.1] mb-8 font-header minimal-headline`}
                    style={{
                        color: actualColors.heading,
                        textTransform: 'var(--headings-transform, none)' as any,
                        letterSpacing: 'var(--headings-spacing, -0.02em)',
                    }}
                    dangerouslySetInnerHTML={{ __html: styledHeadline }}
                />

                {/* Tiny accent dot */}
                <div className="minimal-dot w-1.5 h-1.5 rounded-full mb-8" style={{ backgroundColor: actualColors.primary }} />

                {/* Subheadline — light and airy */}
                <p
                    className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-12 opacity-60 max-w-xl mx-auto font-light leading-relaxed font-body minimal-sub`}
                    style={{ color: actualColors.text }}
                >
                    {subheadline}
                </p>

                {/* CTAs — clean and understated */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 minimal-ctas">
                    <a
                        href={primaryCtaLink || '/#cta'}
                        onClick={(e) => {
                            const href = primaryCtaLink || '/#cta';
                            if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                        }}
                        className={`group relative overflow-hidden inline-flex items-center gap-2 py-3.5 px-8 font-medium text-sm tracking-wide transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] font-button ${borderRadiusClasses[borderRadius]}`}
                        style={{
                            backgroundColor: actualColors.buttonBackground,
                            color: actualColors.buttonText,
                            textTransform: 'var(--buttons-transform, none)' as any,
                            letterSpacing: 'var(--buttons-spacing, 0.05em)',
                        }}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {primaryCta}
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-500" />
                        </span>
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </a>
                    <a
                        href={secondaryCtaLink || '/#features'}
                        onClick={(e) => {
                            const href = secondaryCtaLink || '/#features';
                            if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                        }}
                        className={`group py-3.5 px-8 font-medium text-sm tracking-wide backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                            ? 'border bg-transparent hover:bg-white/5'
                            : secondaryButtonStyle === 'ghost'
                                ? 'bg-transparent hover:bg-white/5 border border-transparent'
                                : 'hover:brightness-110'
                            }`}
                        style={{
                            backgroundColor: secondaryButtonStyle === 'solid'
                                ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                : 'transparent',
                            borderColor: secondaryButtonStyle === 'outline' ? `${actualColors.secondaryButtonBackground}60` : 'transparent',
                            color: actualColors.secondaryButtonText,
                            textTransform: 'var(--buttons-transform, none)' as any,
                            letterSpacing: 'var(--buttons-spacing, 0.05em)',
                        }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            {secondaryCta}
                            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform duration-500" />
                        </span>
                    </a>
                </div>

                {/* Scroll indicator — subtle bounce */}
                <div className="mt-20 minimal-scroll">
                    <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
                        <div className="w-1 h-2 rounded-full bg-white/40 minimal-scroll-dot" />
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes minimal-scale-in {
                    from { transform: scale(1.08); }
                    to { transform: scale(1); }
                }
                @keyframes minimal-fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes minimal-fade-scale {
                    from { opacity: 0; transform: scale(0.95) translateY(15px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes minimal-line-expand {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                @keyframes minimal-dot-pop {
                    from { opacity: 0; transform: scale(0); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes minimal-scroll-bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    50% { transform: translateY(4px); opacity: 0.8; }
                }
                .minimal-img-entrance {
                    animation: minimal-scale-in 2s ease-out forwards;
                }
                .minimal-top-line {
                    animation: minimal-line-expand 1.5s ease-out 0.3s forwards;
                    transform: scaleX(0);
                }
                .minimal-badge {
                    animation: minimal-fade-in 0.8s ease-out 0.5s forwards;
                    opacity: 0;
                }
                .minimal-headline {
                    animation: minimal-fade-scale 1s ease-out 0.7s forwards;
                    opacity: 0;
                }
                .minimal-dot {
                    animation: minimal-dot-pop 0.5s ease-out 1s forwards;
                    opacity: 0;
                }
                .minimal-sub {
                    animation: minimal-fade-in 0.8s ease-out 1.1s forwards;
                    opacity: 0;
                }
                .minimal-ctas {
                    animation: minimal-fade-in 0.8s ease-out 1.3s forwards;
                    opacity: 0;
                }
                .minimal-scroll {
                    animation: minimal-fade-in 0.8s ease-out 1.6s forwards;
                    opacity: 0;
                }
                .minimal-scroll-dot {
                    animation: minimal-scroll-bounce 2s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroMinimal;
