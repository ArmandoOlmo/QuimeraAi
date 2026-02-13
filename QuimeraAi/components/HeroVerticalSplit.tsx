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
    if (!badgeIcon) return '✨';
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
 * HeroVerticalSplit — 50/50 vertical split hero.
 * Left panel: solid background with text content, dot pattern, accent bar.
 * Right panel: full image with subtle parallax gradient.
 * Gradient border divider between panels, staggered slide-in animations.
 */
const HeroVerticalSplit: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'md',
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
        background: colors?.background || '#0f172a',
        text: colors?.text || '#e2e8f0',
        heading: colors?.heading || '#ffffff',
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
        <section className="relative w-full overflow-hidden flex flex-col md:flex-row"
            style={{ minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* === LEFT PANEL — Content === */}
            <div className="relative w-full md:w-1/2 flex items-center z-10" style={{ background: actualColors.background }}>
                {/* Dot pattern on text panel */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle, ${actualColors.text} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                }} />

                {/* Subtle gradient orb */}
                <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20" style={{
                    background: `radial-gradient(circle, ${actualColors.primary} 0%, transparent 70%)`
                }} />

                {/* Content */}
                <div className={`relative z-10 ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} pt-24 md:pt-16 max-w-2xl mx-auto`}>
                    {/* Badge */}
                    {showBadge && badgeText && (
                        <div className="vsplit-badge inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8 border backdrop-blur-sm"
                            style={{
                                borderColor: `${actualColors.primary}30`,
                                backgroundColor: `${actualColors.primary}10`,
                            }}
                        >
                            <span className="relative flex items-center">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-60 vsplit-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                                <span className="relative text-sm flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                            </span>
                            <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: `${actualColors.primary}cc` }}>{badgeText}</span>
                        </div>
                    )}

                    {/* Animated accent bar */}
                    <div className="vsplit-accent-bar h-1 w-0 rounded-full mb-8" style={{ backgroundColor: actualColors.primary }} />

                    {/* Headline */}
                    <h1
                        className={`${headlineSizeClasses[headlineFontSize]} font-bold tracking-tight leading-[1.08] mb-6 font-header vsplit-headline`}
                        style={{
                            color: actualColors.heading,
                            textTransform: 'var(--headings-transform, none)' as any,
                            letterSpacing: 'var(--headings-spacing, -0.02em)',
                        }}
                        dangerouslySetInnerHTML={{ __html: styledHeadline }}
                    />

                    {/* Subheadline */}
                    <p
                        className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-10 font-light leading-relaxed max-w-lg font-body vsplit-sub`}
                        style={{ color: actualColors.text, opacity: 0.75 }}
                    >
                        {subheadline}
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 vsplit-ctas">
                        <a
                            href={primaryCtaLink || '/#cta'}
                            onClick={(e) => {
                                const href = primaryCtaLink || '/#cta';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 py-4 px-8 font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 font-button ${borderRadiusClasses[borderRadius]}`}
                            style={{
                                backgroundColor: actualColors.buttonBackground,
                                color: actualColors.buttonText,
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)',
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {primaryCta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                        </a>
                        <a
                            href={secondaryCtaLink || '/#features'}
                            onClick={(e) => {
                                const href = secondaryCtaLink || '/#features';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group py-4 px-8 font-bold text-base transition-all duration-300 hover:scale-105 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                                ? 'border-2 bg-transparent hover:bg-white/5'
                                : secondaryButtonStyle === 'ghost'
                                    ? 'bg-transparent hover:bg-white/5 border border-transparent'
                                    : 'hover:brightness-110'
                                }`}
                            style={{
                                backgroundColor: secondaryButtonStyle === 'solid'
                                    ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                    : 'transparent',
                                borderColor: secondaryButtonStyle === 'outline' ? `${actualColors.secondaryButtonBackground}50` : 'transparent',
                                color: actualColors.secondaryButtonText,
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)',
                            }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                {secondaryCta}
                                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-300" />
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* === GRADIENT DIVIDER === */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] z-20 vsplit-divider" style={{
                background: `linear-gradient(to bottom, transparent 5%, ${actualColors.primary} 30%, ${actualColors.secondary} 70%, transparent 95%)`
            }} />

            {/* === RIGHT PANEL — Image === */}
            <div className="relative w-full md:w-1/2 min-h-[40vh] vsplit-image-panel">
                {imageUrl && (
                    <div className="absolute inset-0 transform-gpu">
                        <img
                            src={imageUrl}
                            alt="Hero Visual"
                            className="w-full h-full object-cover vsplit-img"
                        />
                        {/* Gradient edge on image for blending */}
                        <div className="absolute inset-0" style={{
                            background: `linear-gradient(90deg, ${actualColors.background} 0%, transparent 15%, transparent 100%)`
                        }} />
                        {/* Bottom fade on mobile */}
                        <div className="absolute inset-0 md:hidden" style={{
                            background: `linear-gradient(to bottom, ${actualColors.background} 0%, transparent 20%)`
                        }} />
                        {/* Subtle color tint */}
                        <div className="absolute inset-0 opacity-20" style={{
                            background: `linear-gradient(135deg, ${actualColors.primary}20, transparent 60%)`
                        }} />
                    </div>
                )}
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes vsplit-slide-left {
                    from { opacity: 0; transform: translateX(-40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes vsplit-slide-right {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes vsplit-bar-expand {
                    from { width: 0; }
                    to { width: 60px; }
                }
                @keyframes vsplit-divider-draw {
                    from { transform: translateX(-50%) scaleY(0); }
                    to { transform: translateX(-50%) scaleY(1); }
                }
                @keyframes vsplit-img-reveal {
                    from { opacity: 0; transform: scale(1.05); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes vsplit-ping-anim {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .vsplit-badge {
                    animation: vsplit-slide-left 0.7s ease-out 0.2s forwards;
                    opacity: 0;
                }
                .vsplit-accent-bar {
                    animation: vsplit-bar-expand 0.8s ease-out 0.4s forwards;
                }
                .vsplit-headline {
                    animation: vsplit-slide-left 0.8s ease-out 0.5s forwards;
                    opacity: 0;
                }
                .vsplit-sub {
                    animation: vsplit-slide-left 0.8s ease-out 0.65s forwards;
                    opacity: 0;
                }
                .vsplit-ctas {
                    animation: vsplit-slide-left 0.8s ease-out 0.8s forwards;
                    opacity: 0;
                }
                .vsplit-divider {
                    animation: vsplit-divider-draw 1s ease-out 0.3s forwards;
                    transform: translateX(-50%) scaleY(0);
                    transform-origin: center top;
                }
                .vsplit-image-panel {
                    animation: vsplit-slide-right 1s ease-out 0.2s forwards;
                    opacity: 0;
                }
                .vsplit-img {
                    animation: vsplit-img-reveal 1.5s ease-out forwards;
                }
                .vsplit-ping {
                    animation: vsplit-ping-anim 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroVerticalSplit;
