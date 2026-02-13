import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-3xl md:text-4xl',
    md: 'text-4xl md:text-5xl',
    lg: 'text-5xl md:text-6xl',
    xl: 'text-6xl md:text-7xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl',
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
 * HeroOverlap — Floating card overlapping the background image.
 * Photo fills top ~75%, styled content card overlaps at the bottom,
 * with gradient border glow, subtle float animation, slide-up entrance,
 * and premium CTA effects.
 */
const HeroOverlap: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'md',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
    gradientOpacity = 40,
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
        <section className="relative w-full overflow-hidden" style={{ background: actualColors.background, minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* Photo section — top ~70% */}
            <div className="relative w-full h-[45vh] md:h-[50vh]">
                {imageUrl && (
                    <div className="absolute inset-0 transform-gpu">
                        <img
                            src={imageUrl}
                            alt="Hero Background"
                            className="w-full h-full object-cover overlap-img"
                        />
                        {/* Multi-layer gradient for smooth transition to card area */}
                        <div className="absolute inset-0" style={{
                            background: `linear-gradient(to bottom, rgba(0,0,0,${gradientOpacity * 0.3 / 100}) 0%, rgba(0,0,0,${gradientOpacity * 0.1 / 100}) 40%, ${actualColors.background}dd 85%, ${actualColors.background} 100%)`
                        }} />
                        {/* Side color tints */}
                        <div className="absolute inset-0" style={{
                            background: `linear-gradient(90deg, ${actualColors.primary}10 0%, transparent 30%, transparent 70%, ${actualColors.secondary}08 100%)`
                        }} />
                    </div>
                )}

                {/* Floating decorative orb */}
                <div className="absolute top-[15%] right-[10%] w-[200px] h-[200px] rounded-full blur-[80px] overlap-orb" style={{
                    background: `radial-gradient(circle, ${actualColors.primary}25 0%, transparent 70%)`
                }} />
            </div>

            {/* Overlapping content card */}
            <div className={`relative z-10 ${paddingXClasses[paddingX]} -mt-32 md:-mt-40 pb-16 md:pb-24`}>
                <div className="container mx-auto max-w-4xl">
                    {/* Gradient border glow wrapper */}
                    <div className="relative overlap-card-entrance">
                        {/* Glow behind card */}
                        <div className="absolute -inset-[1px] rounded-2xl opacity-60 blur-sm" style={{
                            background: `linear-gradient(135deg, ${actualColors.primary}40, ${actualColors.secondary}30, ${actualColors.primary}20)`
                        }} />

                        {/* Card */}
                        <div
                            className="relative rounded-2xl p-8 md:p-12 border border-white/10 overlap-float"
                            style={{
                                background: `linear-gradient(135deg, ${actualColors.background}f0, ${actualColors.background}e0)`,
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${actualColors.primary}10`,
                            }}
                        >
                            {/* Accent line at top of card */}
                            <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full overlap-accent-line" style={{
                                background: `linear-gradient(90deg, ${actualColors.primary}, ${actualColors.secondary})`
                            }} />

                            {/* Badge */}
                            {showBadge && badgeText && (
                                <div className="overlap-badge inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-6 border border-white/10 bg-white/5 backdrop-blur-sm">
                                    <span className="relative flex items-center">
                                        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 overlap-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                                        <span className="relative text-sm flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                                    </span>
                                    <span className="text-xs font-bold tracking-[0.15em] uppercase text-white/80">{badgeText}</span>
                                </div>
                            )}

                            {/* Headline */}
                            <h1
                                className={`${headlineSizeClasses[headlineFontSize]} font-bold tracking-tight leading-[1.1] mb-5 font-header overlap-headline`}
                                style={{
                                    color: actualColors.heading,
                                    textTransform: 'var(--headings-transform, none)' as any,
                                    letterSpacing: 'var(--headings-spacing, -0.02em)',
                                }}
                                dangerouslySetInnerHTML={{ __html: styledHeadline }}
                            />

                            {/* Subheadline */}
                            <p
                                className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-8 opacity-70 max-w-2xl font-light leading-relaxed font-body overlap-sub`}
                                style={{ color: actualColors.text }}
                            >
                                {subheadline}
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-4 overlap-ctas">
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
                                        borderColor: secondaryButtonStyle === 'outline' ? `${actualColors.secondaryButtonBackground}60` : 'transparent',
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
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes overlap-img-scale {
                    from { transform: scale(1.05); }
                    to { transform: scale(1); }
                }
                @keyframes overlap-card-slide-up {
                    from { opacity: 0; transform: translateY(60px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes overlap-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes overlap-fade-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes overlap-accent-expand {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                @keyframes overlap-orb-drift {
                    0%, 100% { opacity: 0.6; transform: translate(0, 0); }
                    50% { opacity: 1; transform: translate(-20px, 10px); }
                }
                @keyframes overlap-ping-anim {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .overlap-img {
                    animation: overlap-img-scale 2s ease-out forwards;
                }
                .overlap-card-entrance {
                    animation: overlap-card-slide-up 0.9s ease-out 0.3s forwards;
                    opacity: 0;
                }
                .overlap-float {
                    animation: overlap-float 6s ease-in-out 1.5s infinite;
                }
                .overlap-accent-line {
                    animation: overlap-accent-expand 0.8s ease-out 0.8s forwards;
                    transform: scaleX(0);
                }
                .overlap-badge {
                    animation: overlap-fade-up 0.6s ease-out 0.9s forwards;
                    opacity: 0;
                }
                .overlap-headline {
                    animation: overlap-fade-up 0.7s ease-out 1s forwards;
                    opacity: 0;
                }
                .overlap-sub {
                    animation: overlap-fade-up 0.7s ease-out 1.1s forwards;
                    opacity: 0;
                }
                .overlap-ctas {
                    animation: overlap-fade-up 0.7s ease-out 1.2s forwards;
                    opacity: 0;
                }
                .overlap-orb {
                    animation: overlap-orb-drift 8s ease-in-out infinite;
                }
                .overlap-ping {
                    animation: overlap-ping-anim 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroOverlap;
