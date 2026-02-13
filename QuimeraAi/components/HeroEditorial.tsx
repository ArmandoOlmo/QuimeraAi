import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, ChevronDown } from 'lucide-react';
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
 * HeroEditorial — Premium magazine/editorial style hero.
 * Full-screen photo with text anchored bottom-left, elegant thin-rule accents,
 * film-grain texture overlay, decorative frame corners, and staggered entrance animations.
 */
const HeroEditorial: React.FC<HeroProps> = ({
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
        `<span class="italic opacity-90" style="color: ${actualColors.primary}">$2</span>`
    );

    return (
        <section className="relative w-full flex items-end overflow-hidden"
            style={{ minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* Full-screen background image with parallax feel */}
            {imageUrl && (
                <div className="absolute inset-0 z-0 transform-gpu">
                    <img
                        src={imageUrl}
                        alt="Hero Background"
                        className="w-full h-full object-cover scale-105 transition-transform duration-[2s]"
                    />
                    {/* Multi-layer gradient for editorial depth */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(to top, rgba(0,0,0,${gradientOpacity / 100}) 0%, rgba(0,0,0,${gradientOpacity * 0.6 / 100}) 30%, rgba(0,0,0,${gradientOpacity * 0.15 / 100}) 60%, rgba(0,0,0,${gradientOpacity * 0.3 / 100}) 100%)`
                        }}
                    />
                    {/* Warm vignette from primary color */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, ${actualColors.primary}15 100%)`
                        }}
                    />
                    {/* Film-grain texture overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        }}
                    />
                </div>
            )}

            {/* Decorative corner frame lines — editorial magazine border */}
            <div className="absolute top-8 left-8 w-20 h-20 border-t-2 border-l-2 border-white/20 z-20 hero-editorial-corner-tl" />
            <div className="absolute top-8 right-8 w-20 h-20 border-t-2 border-r-2 border-white/20 z-20 hero-editorial-corner-tr" />
            <div className="absolute bottom-8 left-8 w-20 h-20 border-b-2 border-l-2 border-white/20 z-20 hero-editorial-corner-bl" />
            <div className="absolute bottom-8 right-8 w-20 h-20 border-b-2 border-r-2 border-white/20 z-20 hero-editorial-corner-br" />

            {/* Issue number / decorative vertical text */}
            <div className="absolute top-1/2 right-8 -translate-y-1/2 z-20 hidden xl:flex flex-col items-center gap-4 hero-editorial-side">
                <div className="w-px h-16 bg-white/20" />
                <span className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase writing-vertical" style={{ writingMode: 'vertical-rl' }}>Premium Edition</span>
                <div className="w-px h-16 bg-white/20" />
            </div>

            {/* Content anchored at bottom-left */}
            <div className={`relative z-10 w-full ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} pt-24`}>
                <div className="container mx-auto max-w-6xl">
                    {/* Badge with pulse */}
                    {showBadge && badgeText && (
                        <div className="hero-editorial-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-6 border border-white/15 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-default">
                            <span className="relative flex items-center">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 hero-editorial-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                                <span className="relative text-sm flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                            </span>
                            <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/80">{badgeText}</span>
                        </div>
                    )}

                    {/* Animated horizontal rule accent */}
                    <div className="hero-editorial-rule w-0 h-[2px] mb-8" style={{ backgroundColor: actualColors.primary }} />

                    {/* Headline — editorial serif feel */}
                    <h1
                        className={`${headlineSizeClasses[headlineFontSize]} font-bold tracking-tight leading-[1.02] mb-6 max-w-4xl font-header hero-editorial-headline`}
                        style={{
                            color: actualColors.heading,
                            textTransform: 'var(--headings-transform, none)' as any,
                            letterSpacing: 'var(--headings-spacing, -0.02em)',
                        }}
                        dangerouslySetInnerHTML={{ __html: styledHeadline }}
                    />

                    {/* Subheadline with left accent bar */}
                    <div className="relative pl-6 mb-10 hero-editorial-sub">
                        <div className="absolute left-0 top-1 bottom-1 w-[2px]" style={{ backgroundColor: `${actualColors.primary}60` }} />
                        <p
                            className={`${subheadlineSizeClasses[subheadlineFontSize]} opacity-80 max-w-2xl font-light leading-relaxed font-body`}
                            style={{ color: actualColors.text }}
                        >
                            {subheadline}
                        </p>
                    </div>

                    {/* CTAs with shine effect */}
                    <div className="flex flex-col sm:flex-row gap-5 mb-8 hero-editorial-ctas">
                        <a
                            href={primaryCtaLink || '/#cta'}
                            onClick={(e) => {
                                const href = primaryCtaLink || '/#cta';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group relative overflow-hidden inline-flex items-center gap-2 py-4 px-10 font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 font-button ${borderRadiusClasses[borderRadius]}`}
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
                            {/* Shine sweep effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                        </a>
                        <a
                            href={secondaryCtaLink || '/#features'}
                            onClick={(e) => {
                                const href = secondaryCtaLink || '/#features';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group py-4 px-10 font-bold text-base backdrop-blur-md transition-all duration-300 hover:scale-105 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
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
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)',
                            }}
                        >
                            <span className="flex items-center gap-2">
                                {secondaryCta}
                                <ChevronDown className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes editorial-fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes editorial-rule-expand {
                    from { width: 0; }
                    to { width: 80px; }
                }
                @keyframes editorial-corner-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes editorial-side-slide {
                    from { opacity: 0; transform: translateX(20px) translateY(-50%); }
                    to { opacity: 1; transform: translateX(0) translateY(-50%); }
                }
                @keyframes editorial-ping {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .hero-editorial-badge {
                    animation: editorial-fade-in-up 0.7s ease-out forwards;
                    opacity: 0;
                }
                .hero-editorial-rule {
                    animation: editorial-rule-expand 1s ease-out 0.3s forwards;
                }
                .hero-editorial-headline {
                    animation: editorial-fade-in-up 0.8s ease-out 0.4s forwards;
                    opacity: 0;
                }
                .hero-editorial-sub {
                    animation: editorial-fade-in-up 0.8s ease-out 0.55s forwards;
                    opacity: 0;
                }
                .hero-editorial-ctas {
                    animation: editorial-fade-in-up 0.8s ease-out 0.7s forwards;
                    opacity: 0;
                }
                .hero-editorial-corner-tl,
                .hero-editorial-corner-tr,
                .hero-editorial-corner-bl,
                .hero-editorial-corner-br {
                    animation: editorial-corner-fade 1.2s ease-out 0.8s forwards;
                    opacity: 0;
                }
                .hero-editorial-side {
                    animation: editorial-side-slide 1s ease-out 1s forwards;
                    opacity: 0;
                }
                .hero-editorial-ping {
                    animation: editorial-ping 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroEditorial;
