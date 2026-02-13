import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { Play, ArrowRight } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-4xl md:text-5xl',
    md: 'text-5xl md:text-7xl',
    lg: 'text-6xl md:text-8xl',
    xl: 'text-7xl md:text-9xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-base',
    md: 'text-lg md:text-xl',
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
    if (!badgeIcon) return '🎬';
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
    return IconComponent ? React.createElement(IconComponent, { size: 16, className: 'inline-block' }) : badgeIcon;
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
    onNavigate?: (href: string) => void;
}

/**
 * HeroCinematic — Dramatic movie-poster hero.
 * Full-bleed photo with heavy gradient, animated letterbox bars,
 * lens flare orbs, gradient headline text, and staggered entrance animations.
 */
const HeroCinematic: React.FC<HeroProps> = ({
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
        background: colors?.background,
        text: colors?.text,
        heading: colors?.heading,
        buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
        buttonText: colors?.buttonText || '#ffffff',
        secondaryButtonBackground: colors?.secondaryButtonBackground || '#334155',
        secondaryButtonText: colors?.secondaryButtonText || '#ffffff',
    };

    const safeHeadline = typeof headline === 'string' ? headline : 'Welcome';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
    );

    return (
        <section className="relative w-full flex items-center justify-center overflow-hidden"
            style={{ minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* Full-bleed background with dramatic overlay */}
            {imageUrl && (
                <div className="absolute inset-0 z-0 transform-gpu">
                    <img
                        src={imageUrl}
                        alt="Hero Background"
                        className="w-full h-full object-cover scale-110 cinematic-zoom"
                    />
                    {/* Heavy multi-stop gradient — movie poster bottom-heavy */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(to bottom, rgba(0,0,0,${gradientOpacity * 0.4 / 100}) 0%, rgba(0,0,0,${gradientOpacity * 0.2 / 100}) 30%, rgba(0,0,0,${gradientOpacity * 0.6 / 100}) 60%, rgba(0,0,0,${gradientOpacity / 100}) 100%)`
                        }}
                    />
                    {/* Color-tinted side gradients for drama */}
                    <div className="absolute inset-0" style={{
                        background: `linear-gradient(90deg, ${actualColors.primary}20 0%, transparent 30%, transparent 70%, ${actualColors.secondary}15 100%)`
                    }} />
                </div>
            )}

            {/* Lens flare / light orbs */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                <div
                    className="absolute top-[15%] right-[20%] w-[300px] h-[300px] rounded-full blur-[80px] cinematic-flare-1"
                    style={{ background: `radial-gradient(circle, ${actualColors.primary}30 0%, transparent 70%)` }}
                />
                <div
                    className="absolute bottom-[25%] left-[10%] w-[200px] h-[200px] rounded-full blur-[60px] cinematic-flare-2"
                    style={{ background: `radial-gradient(circle, ${actualColors.secondary}20 0%, transparent 70%)` }}
                />
                <div
                    className="absolute top-[40%] left-[50%] w-[400px] h-[100px] -translate-x-1/2 blur-[100px] cinematic-flare-3"
                    style={{ background: `linear-gradient(90deg, transparent, ${actualColors.primary}15, ${actualColors.secondary}10, transparent)` }}
                />
            </div>

            {/* Letterbox bars — cinematic widescreen */}
            <div className="absolute top-0 left-0 right-0 h-12 md:h-16 bg-black z-20 cinematic-bar-top">
                <div className="absolute bottom-0 left-0 right-0 h-px cinematic-bar-glow" style={{ background: `linear-gradient(90deg, transparent 10%, ${actualColors.primary}60 50%, transparent 90%)` }} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 md:h-16 bg-black z-20 cinematic-bar-bottom">
                <div className="absolute top-0 left-0 right-0 h-px cinematic-bar-glow" style={{ background: `linear-gradient(90deg, transparent 10%, ${actualColors.primary}60 50%, transparent 90%)` }} />
            </div>

            {/* Content — centered and dramatic */}
            <div className={`relative z-10 container mx-auto ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} pt-24 md:pt-16 text-center max-w-5xl flex flex-col items-center`}>

                {/* Badge */}
                {showBadge && badgeText && (
                    <div className="cinematic-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8 border border-white/10 backdrop-blur-md bg-white/5">
                        <span className="relative flex items-center">
                            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 cinematic-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                            <span className="relative text-base flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                        </span>
                        <span className="text-sm font-bold tracking-[0.25em] uppercase text-white/90">{badgeText}</span>
                    </div>
                )}

                {/* Headline — oversized uppercase cinematic */}
                <h1
                    className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tighter leading-[0.95] mb-8 font-header uppercase cinematic-headline`}
                    style={{
                        color: actualColors.heading,
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--headings-spacing, -0.03em)',
                        textShadow: `0 0 60px ${actualColors.primary}30, 0 4px 20px rgba(0,0,0,0.5)`,
                    }}
                    dangerouslySetInnerHTML={{ __html: styledHeadline }}
                />

                {/* Thin horizontal accent */}
                <div className="cinematic-divider flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, transparent, ${actualColors.primary})` }} />
                    <Play size={12} style={{ color: actualColors.primary }} className="opacity-60" />
                    <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, ${actualColors.primary}, transparent)` }} />
                </div>

                {/* Subheadline */}
                <p
                    className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-12 opacity-80 max-w-2xl mx-auto font-light leading-relaxed font-body cinematic-sub`}
                    style={{ color: actualColors.text }}
                >
                    {subheadline}
                </p>

                {/* CTAs — premium with fill-reveal hover */}
                <div className="flex flex-col sm:flex-row justify-center gap-5 mb-16 w-full sm:w-auto cinematic-ctas">
                    <a
                        href={primaryCtaLink || '/#cta'}
                        onClick={(e) => {
                            const href = primaryCtaLink || '/#cta';
                            if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                        }}
                        className={`group relative overflow-hidden py-4 px-10 font-bold text-lg uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 font-button ${borderRadiusClasses[borderRadius]}`}
                        style={{
                            backgroundColor: actualColors.buttonBackground,
                            color: actualColors.buttonText,
                            textTransform: 'var(--buttons-transform, uppercase)' as any,
                            letterSpacing: 'var(--buttons-spacing, 0.1em)',
                        }}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {primaryCta}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                        {/* Fill reveal from bottom */}
                        <div
                            className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                            style={{ backgroundColor: actualColors.secondary }}
                        />
                        {/* Shine sweep */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                    </a>
                    <a
                        href={secondaryCtaLink || '/#features'}
                        onClick={(e) => {
                            const href = secondaryCtaLink || '/#features';
                            if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                        }}
                        className={`group py-4 px-10 font-bold text-lg uppercase tracking-wider backdrop-blur-md transition-all duration-300 hover:scale-105 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                            ? 'border-2 bg-transparent hover:bg-white/10'
                            : secondaryButtonStyle === 'ghost'
                                ? 'bg-transparent hover:bg-white/10 border border-transparent'
                                : 'hover:brightness-110'
                            }`}
                        style={{
                            backgroundColor: secondaryButtonStyle === 'solid'
                                ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                : 'transparent',
                            borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'transparent',
                            color: actualColors.secondaryButtonText,
                            textTransform: 'var(--buttons-transform, uppercase)' as any,
                            letterSpacing: 'var(--buttons-spacing, 0.1em)',
                        }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Play size={16} className="group-hover:scale-110 transition-transform" />
                            {secondaryCta}
                        </span>
                    </a>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes cinematic-zoom-in {
                    from { transform: scale(1.15); }
                    to { transform: scale(1.05); }
                }
                @keyframes cinematic-fade-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes cinematic-bar-slide {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                @keyframes cinematic-flare-pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                @keyframes cinematic-divider-expand {
                    from { opacity: 0; transform: scaleX(0); }
                    to { opacity: 1; transform: scaleX(1); }
                }
                @keyframes cinematic-ping-anim {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .cinematic-zoom {
                    animation: cinematic-zoom-in 8s ease-out forwards;
                }
                .cinematic-bar-top {
                    animation: cinematic-bar-slide 0.8s ease-out forwards;
                    transform-origin: left;
                }
                .cinematic-bar-bottom {
                    animation: cinematic-bar-slide 0.8s ease-out 0.1s forwards;
                    transform-origin: right;
                }
                .cinematic-bar-glow {
                    animation: cinematic-flare-pulse 4s ease-in-out infinite;
                }
                .cinematic-badge {
                    animation: cinematic-fade-up 0.7s ease-out 0.5s forwards;
                    opacity: 0;
                }
                .cinematic-headline {
                    animation: cinematic-fade-up 0.9s ease-out 0.6s forwards;
                    opacity: 0;
                }
                .cinematic-divider {
                    animation: cinematic-divider-expand 0.8s ease-out 0.8s forwards;
                    opacity: 0;
                }
                .cinematic-sub {
                    animation: cinematic-fade-up 0.8s ease-out 0.9s forwards;
                    opacity: 0;
                }
                .cinematic-ctas {
                    animation: cinematic-fade-up 0.8s ease-out 1.1s forwards;
                    opacity: 0;
                }
                .cinematic-flare-1 {
                    animation: cinematic-flare-pulse 6s ease-in-out infinite;
                }
                .cinematic-flare-2 {
                    animation: cinematic-flare-pulse 8s ease-in-out 1s infinite;
                }
                .cinematic-flare-3 {
                    animation: cinematic-flare-pulse 5s ease-in-out 2s infinite;
                }
                .cinematic-ping {
                    animation: cinematic-ping-anim 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroCinematic;
