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
 * HeroStacked — Image on top, content below hero.
 * Full-width image with reveal animation & gradient overlay,
 * animated gradient divider, content slides up below,
 * decorative accent lines, and premium CTA effects.
 */
const HeroStacked: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'md',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
    gradientOpacity = 50,
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
        <section className="relative w-full overflow-hidden" style={{ background: actualColors.background, minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* === IMAGE SECTION === */}
            <div className="relative w-full h-[35vh] md:h-[40vh] stacked-img-reveal">
                {imageUrl && (
                    <div className="absolute inset-0 transform-gpu">
                        <img
                            src={imageUrl}
                            alt="Hero Visual"
                            className="w-full h-full object-cover stacked-img-scale"
                        />
                        {/* Gradient overlay — blends into content background */}
                        <div className="absolute inset-0" style={{
                            background: `linear-gradient(to bottom, rgba(0,0,0,${gradientOpacity * 0.2 / 100}) 0%, rgba(0,0,0,${gradientOpacity * 0.1 / 100}) 50%, ${actualColors.background}ee 90%, ${actualColors.background} 100%)`
                        }} />
                        {/* Color tint */}
                        <div className="absolute inset-0 opacity-20" style={{
                            background: `linear-gradient(135deg, ${actualColors.primary}30, transparent 50%, ${actualColors.secondary}20)`
                        }} />
                    </div>
                )}

                {/* Decorative floating orb on image */}
                <div className="absolute top-[20%] right-[15%] w-[200px] h-[200px] rounded-full blur-[80px] stacked-orb"
                    style={{ background: `radial-gradient(circle, ${actualColors.primary}25 0%, transparent 70%)` }}
                />
            </div>

            {/* === ANIMATED GRADIENT DIVIDER === */}
            <div className="relative h-[3px] stacked-divider" style={{
                background: `linear-gradient(90deg, transparent, ${actualColors.primary}, ${actualColors.secondary}, transparent)`,
                backgroundSize: '200% 100%',
            }} />

            {/* === CONTENT SECTION === */}
            <div className={`relative z-10 ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]}`}>
                <div className="container mx-auto max-w-4xl text-center">
                    {/* Dot pattern behind content */}
                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `radial-gradient(circle, ${actualColors.text} 1px, transparent 1px)`,
                        backgroundSize: '28px 28px',
                    }} />

                    {/* Badge */}
                    {showBadge && badgeText && (
                        <div className="stacked-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8 border backdrop-blur-sm"
                            style={{
                                borderColor: `${actualColors.primary}30`,
                                backgroundColor: `${actualColors.primary}10`,
                            }}
                        >
                            <span className="relative flex items-center">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-60 stacked-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                                <span className="relative text-sm flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                            </span>
                            <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: `${actualColors.primary}cc` }}>{badgeText}</span>
                        </div>
                    )}

                    {/* Headline */}
                    <h1
                        className={`${headlineSizeClasses[headlineFontSize]} font-bold tracking-tight leading-[1.08] mb-6 font-header stacked-headline relative z-10`}
                        style={{
                            color: actualColors.heading,
                            textTransform: 'var(--headings-transform, none)' as any,
                            letterSpacing: 'var(--headings-spacing, -0.02em)',
                        }}
                        dangerouslySetInnerHTML={{ __html: styledHeadline }}
                    />

                    {/* Decorative accent dots */}
                    <div className="flex items-center justify-center gap-2 mb-6 stacked-dots">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: actualColors.primary }} />
                        <div className="w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: actualColors.secondary }} />
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: actualColors.primary }} />
                    </div>

                    {/* Subheadline */}
                    <p
                        className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-10 font-light leading-relaxed max-w-2xl mx-auto font-body stacked-sub relative z-10`}
                        style={{ color: actualColors.text, opacity: 0.75 }}
                    >
                        {subheadline}
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 stacked-ctas relative z-10">
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

            {/* Custom Animations */}
            <style>{`
                @keyframes stacked-img-reveal {
                    from { clip-path: inset(100% 0 0 0); }
                    to { clip-path: inset(0 0 0 0); }
                }
                @keyframes stacked-img-scale {
                    from { transform: scale(1.08); }
                    to { transform: scale(1); }
                }
                @keyframes stacked-fade-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes stacked-divider-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes stacked-dots-pop {
                    from { opacity: 0; transform: scale(0); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes stacked-orb-drift {
                    0%, 100% { opacity: 0.5; transform: translate(0, 0); }
                    50% { opacity: 0.8; transform: translate(-15px, 10px); }
                }
                @keyframes stacked-ping-anim {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .stacked-img-reveal {
                    animation: stacked-img-reveal 1.2s ease-out forwards;
                }
                .stacked-img-scale {
                    animation: stacked-img-scale 2s ease-out forwards;
                }
                .stacked-divider {
                    animation: stacked-divider-shimmer 3s linear infinite;
                }
                .stacked-badge {
                    animation: stacked-fade-up 0.7s ease-out 0.6s forwards;
                    opacity: 0;
                }
                .stacked-headline {
                    animation: stacked-fade-up 0.8s ease-out 0.8s forwards;
                    opacity: 0;
                }
                .stacked-dots {
                    animation: stacked-dots-pop 0.5s ease-out 1s forwards;
                    opacity: 0;
                }
                .stacked-sub {
                    animation: stacked-fade-up 0.8s ease-out 1.1s forwards;
                    opacity: 0;
                }
                .stacked-ctas {
                    animation: stacked-fade-up 0.8s ease-out 1.3s forwards;
                    opacity: 0;
                }
                .stacked-orb {
                    animation: stacked-orb-drift 8s ease-in-out infinite;
                }
                .stacked-ping {
                    animation: stacked-ping-anim 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroStacked;
