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
    md: 'text-base',
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
 * HeroGlass — Premium glassmorphism hero.
 * Full background photo with animated radial blur orbs,
 * floating frosted-glass card with rainbow shimmer border,
 * particle-like dots, card float animation, and staggered content entrance.
 */
const HeroGlass: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'lg', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'md',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
    gradientOpacity = 30,
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
            {/* Full background photo */}
            {imageUrl && (
                <div className="absolute inset-0 z-0 transform-gpu">
                    <img src={imageUrl} alt="Hero Background" className="w-full h-full object-cover glass-img" />
                    {/* Darkening for glass card to pop */}
                    <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${gradientOpacity / 100})` }} />
                </div>
            )}

            {/* Animated radial blur orbs behind glass */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                <div className="absolute top-[20%] left-[15%] w-[350px] h-[350px] rounded-full blur-[100px] glass-orb-1"
                    style={{ background: `radial-gradient(circle, ${actualColors.primary}35 0%, transparent 70%)` }}
                />
                <div className="absolute bottom-[15%] right-[10%] w-[300px] h-[300px] rounded-full blur-[80px] glass-orb-2"
                    style={{ background: `radial-gradient(circle, ${actualColors.secondary}30 0%, transparent 70%)` }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full blur-[60px] glass-orb-3"
                    style={{ background: `radial-gradient(circle, ${actualColors.primary}20 0%, ${actualColors.secondary}15 50%, transparent 70%)` }}
                />
            </div>

            {/* Particle-like floating dots */}
            <div className="absolute inset-0 z-[2] pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white glass-particle"
                        style={{
                            width: `${2 + Math.random() * 3}px`,
                            height: `${2 + Math.random() * 3}px`,
                            top: `${10 + i * 10}%`,
                            left: `${5 + i * 11}%`,
                            opacity: 0.15 + Math.random() * 0.2,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${4 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            {/* Floating glass card */}
            <div className={`relative z-10 w-full ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} pt-24 md:pt-16`}>
                <div className="container mx-auto max-w-3xl">
                    {/* Rainbow shimmer border wrapper */}
                    <div className="relative glass-card-entrance">
                        {/* Shimmer gradient border */}
                        <div className="absolute -inset-[1px] rounded-3xl glass-shimmer-border" style={{
                            background: `linear-gradient(135deg, ${actualColors.primary}50, ${actualColors.secondary}40, ${actualColors.primary}30, ${actualColors.secondary}50)`,
                            backgroundSize: '300% 300%',
                        }} />

                        {/* Glass card */}
                        <div
                            className="relative rounded-3xl p-8 md:p-14 text-center glass-float"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                backdropFilter: 'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                                boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.05), 0 0 60px ${actualColors.primary}08`,
                            }}
                        >
                            {/* Inner glow at top */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{
                                background: `linear-gradient(90deg, transparent, ${actualColors.primary}60, transparent)`
                            }} />

                            {/* Badge */}
                            {showBadge && badgeText && (
                                <div className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/15 bg-white/10 backdrop-blur-sm">
                                    <span className="relative flex items-center">
                                        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 glass-ping" style={{ backgroundColor: badgeColor || actualColors.primary }} />
                                        <span className="relative text-sm flex items-center" style={{ color: badgeColor || actualColors.primary }}>{renderBadgeIcon(badgeIcon)}</span>
                                    </span>
                                    <span className="text-xs font-bold tracking-[0.15em] uppercase text-white/80">{badgeText}</span>
                                </div>
                            )}

                            {/* Headline */}
                            <h1
                                className={`${headlineSizeClasses[headlineFontSize]} font-bold tracking-tight leading-[1.1] mb-6 font-header glass-headline`}
                                style={{
                                    color: actualColors.heading,
                                    textTransform: 'var(--headings-transform, none)' as any,
                                    letterSpacing: 'var(--headings-spacing, normal)',
                                }}
                                dangerouslySetInnerHTML={{ __html: styledHeadline }}
                            />

                            {/* Subheadline */}
                            <p
                                className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-10 opacity-70 max-w-xl mx-auto font-light leading-relaxed font-body glass-sub`}
                                style={{ color: actualColors.text }}
                            >
                                {subheadline}
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row justify-center gap-4 glass-ctas">
                                <a
                                    href={primaryCtaLink || '/#cta'}
                                    onClick={(e) => {
                                        const href = primaryCtaLink || '/#cta';
                                        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                                    }}
                                    className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 py-4 px-8 font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 font-button ${borderRadiusClasses[borderRadius]}`}
                                    style={{
                                        background: `linear-gradient(135deg, ${actualColors.buttonBackground}, ${actualColors.secondary})`,
                                        color: actualColors.buttonText,
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)',
                                    }}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {primaryCta}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                    </span>
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
                                </a>
                                <a
                                    href={secondaryCtaLink || '/#features'}
                                    onClick={(e) => {
                                        const href = secondaryCtaLink || '/#features';
                                        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                                    }}
                                    className={`group py-4 px-8 font-bold text-base backdrop-blur-sm transition-all duration-300 hover:scale-105 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                                        ? 'border bg-white/5 hover:bg-white/10'
                                        : secondaryButtonStyle === 'ghost'
                                            ? 'bg-transparent hover:bg-white/10 border border-transparent'
                                            : 'hover:brightness-110'
                                        }`}
                                    style={{
                                        backgroundColor: secondaryButtonStyle === 'solid'
                                            ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                            : undefined,
                                        borderColor: secondaryButtonStyle === 'outline' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                        color: actualColors.secondaryButtonText,
                                        textTransform: 'var(--buttons-transform, none)' as any,
                                        letterSpacing: 'var(--buttons-spacing, normal)',
                                    }}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {secondaryCta}
                                        <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    </span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes glass-img-scale {
                    from { transform: scale(1.08); }
                    to { transform: scale(1); }
                }
                @keyframes glass-card-slide-up {
                    from { opacity: 0; transform: translateY(50px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes glass-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes glass-fade-up {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes glass-shimmer {
                    0% { background-position: 0% 0%; }
                    50% { background-position: 100% 100%; }
                    100% { background-position: 0% 0%; }
                }
                @keyframes glass-orb-drift-1 {
                    0%, 100% { opacity: 0.5; transform: translate(0, 0) scale(1); }
                    50% { opacity: 0.9; transform: translate(30px, -20px) scale(1.1); }
                }
                @keyframes glass-orb-drift-2 {
                    0%, 100% { opacity: 0.4; transform: translate(0, 0) scale(1); }
                    50% { opacity: 0.8; transform: translate(-20px, 15px) scale(1.05); }
                }
                @keyframes glass-orb-drift-3 {
                    0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.15); }
                }
                @keyframes glass-particle-float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-15px) translateX(5px); }
                    50% { transform: translateY(-5px) translateX(-5px); }
                    75% { transform: translateY(-20px) translateX(3px); }
                }
                @keyframes glass-ping-anim {
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
                .glass-img {
                    animation: glass-img-scale 2s ease-out forwards;
                }
                .glass-card-entrance {
                    animation: glass-card-slide-up 1s ease-out 0.3s forwards;
                    opacity: 0;
                }
                .glass-float {
                    animation: glass-float 6s ease-in-out 1.5s infinite;
                }
                .glass-shimmer-border {
                    animation: glass-shimmer 8s ease-in-out infinite;
                }
                .glass-badge {
                    animation: glass-fade-up 0.6s ease-out 0.8s forwards;
                    opacity: 0;
                }
                .glass-headline {
                    animation: glass-fade-up 0.7s ease-out 0.95s forwards;
                    opacity: 0;
                }
                .glass-sub {
                    animation: glass-fade-up 0.7s ease-out 1.1s forwards;
                    opacity: 0;
                }
                .glass-ctas {
                    animation: glass-fade-up 0.7s ease-out 1.25s forwards;
                    opacity: 0;
                }
                .glass-orb-1 {
                    animation: glass-orb-drift-1 8s ease-in-out infinite;
                }
                .glass-orb-2 {
                    animation: glass-orb-drift-2 10s ease-in-out 1s infinite;
                }
                .glass-orb-3 {
                    animation: glass-orb-drift-3 7s ease-in-out 2s infinite;
                }
                .glass-particle {
                    animation: glass-particle-float 6s ease-in-out infinite;
                }
                .glass-ping {
                    animation: glass-ping-anim 2s cubic-bezier(0,0,0.2,1) infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroGlass;
