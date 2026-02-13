import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, Zap } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-5xl md:text-6xl',
    md: 'text-6xl md:text-8xl',
    lg: 'text-7xl md:text-9xl',
    xl: 'text-8xl md:text-[10rem]',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-base md:text-lg',
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
    if (!badgeIcon) return '⚡';
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
    return IconComponent ? React.createElement(IconComponent, { size: 20, className: 'inline-block' }) : badgeIcon;
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
    onNavigate?: (href: string) => void;
}

/**
 * HeroBold — Oversized bold typography hero.
 * Massive headline text with strong color overlay on image,
 * diagonal accent lines, rotating geometric wireframes,
 * energy burst radial glows, skew badge, and aggressive animations.
 */
const HeroBold: React.FC<HeroProps> = ({
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
        background: colors?.background || '#0a0a0a',
        text: colors?.text,
        heading: colors?.heading,
        buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
        buttonText: colors?.buttonText || '#ffffff',
        secondaryButtonBackground: colors?.secondaryButtonBackground || '#334155',
        secondaryButtonText: colors?.secondaryButtonText || '#ffffff',
    };

    const safeHeadline = typeof headline === 'string' ? headline : 'Go Bold';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
    );

    return (
        <section className="relative w-full overflow-hidden flex items-center" style={{ background: actualColors.background, minHeight: heroHeight ? `${heroHeight}vh` : undefined }}>
            {/* Background image with heavy color tint */}
            {imageUrl && (
                <div className="absolute inset-0 z-0 transform-gpu">
                    <img
                        src={imageUrl}
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                    {/* Heavy color overlay tint from primary */}
                    <div className="absolute inset-0" style={{
                        background: `linear-gradient(135deg, ${actualColors.primary}${Math.round(gradientOpacity * 2.55).toString(16).padStart(2, '0')} 0%, rgba(0,0,0,${gradientOpacity / 100}) 50%, ${actualColors.secondary}${Math.round(gradientOpacity * 0.5 * 2.55).toString(16).padStart(2, '0')} 100%)`
                    }} />
                </div>
            )}

            {/* Diagonal accent lines */}
            <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-[20%] w-[2px] h-[120%] transform -skew-x-12 bold-line-1" style={{
                    background: `linear-gradient(to bottom, transparent, ${actualColors.primary}40, transparent)`
                }} />
                <div className="absolute top-0 left-[40%] w-[1px] h-[120%] transform -skew-x-12 bold-line-2" style={{
                    background: `linear-gradient(to bottom, transparent, ${actualColors.secondary}30, transparent)`
                }} />
                <div className="absolute top-0 right-[25%] w-[2px] h-[120%] transform -skew-x-12 bold-line-3" style={{
                    background: `linear-gradient(to bottom, transparent, ${actualColors.primary}25, transparent)`
                }} />
            </div>

            {/* Energy burst radial glow */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full blur-[100px] bold-glow-1" style={{
                    background: `radial-gradient(circle, ${actualColors.primary}30 0%, transparent 70%)`
                }} />
                <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] rounded-full blur-[80px] bold-glow-2" style={{
                    background: `radial-gradient(circle, ${actualColors.secondary}20 0%, transparent 70%)`
                }} />
            </div>

            {/* Rotating geometric wireframes */}
            <div className="absolute top-16 right-16 hidden xl:block z-[2]">
                <div className="w-40 h-40 transform rotate-45 opacity-15 bold-spin-1" style={{
                    border: `3px solid ${actualColors.primary}`,
                    borderRadius: '12px'
                }} />
            </div>
            <div className="absolute bottom-24 left-16 hidden xl:block z-[2]">
                <div className="w-28 h-28 transform rotate-12 opacity-15 bold-spin-2" style={{
                    border: `3px solid ${actualColors.secondary}`,
                    borderRadius: '8px'
                }} />
            </div>
            <div className="absolute top-1/2 right-1/4 hidden xl:block z-[2]">
                <div className="w-16 h-16 opacity-10 bold-spin-3" style={{
                    border: `2px solid ${actualColors.primary}`,
                    borderRadius: '50%'
                }} />
            </div>

            {/* Content */}
            <div className={`relative z-10 w-full ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} pt-24`}>
                <div className="container mx-auto max-w-7xl">

                    {/* Badge with skew */}
                    {showBadge && badgeText && (
                        <div
                            className="bold-badge inline-flex items-center gap-2 px-6 py-3 mb-8 font-black tracking-wider uppercase text-sm transform -skew-x-6"
                            style={{
                                backgroundColor: badgeBackgroundColor || actualColors.primary,
                                color: badgeColor || '#ffffff'
                            }}
                        >
                            <span className="text-xl transform skew-x-6 flex items-center">{renderBadgeIcon(badgeIcon)}</span>
                            <span className="transform skew-x-6">{badgeText}</span>
                        </div>
                    )}

                    {/* Oversized headline */}
                    <h1
                        className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tighter leading-[0.85] mb-8 font-header uppercase bold-headline`}
                        style={{
                            color: actualColors.heading,
                            textTransform: 'uppercase',
                            textShadow: `6px 6px 0px ${actualColors.primary}30, 12px 12px 0px rgba(0,0,0,0.2)`,
                            letterSpacing: '-0.04em',
                        }}
                        dangerouslySetInnerHTML={{ __html: styledHeadline }}
                    />

                    {/* Subheadline with thick accent bar */}
                    <div className="relative pl-8 mb-10 bold-sub">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-full" style={{ backgroundColor: actualColors.primary }} />
                        <p
                            className={`${subheadlineSizeClasses[subheadlineFontSize]} font-bold leading-relaxed max-w-2xl font-body`}
                            style={{ color: `${actualColors.text}cc` }}
                        >
                            {subheadline}
                        </p>
                    </div>

                    {/* CTAs — big and bold */}
                    <div className="flex flex-wrap gap-5 bold-ctas">
                        <a
                            href={primaryCtaLink || '/#cta'}
                            onClick={(e) => {
                                const href = primaryCtaLink || '/#cta';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group relative overflow-hidden px-12 py-5 text-xl font-black uppercase tracking-wide transform hover:scale-105 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                            style={{
                                backgroundColor: actualColors.buttonBackground,
                                color: actualColors.buttonText,
                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                letterSpacing: 'var(--buttons-spacing, 0.05em)',
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <Zap size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                                {primaryCta}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            {/* Fill reveal from bottom */}
                            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300" style={{ backgroundColor: actualColors.secondary }} />
                            {/* Shine sweep */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                        </a>

                        <a
                            href={secondaryCtaLink || '/#features'}
                            onClick={(e) => {
                                const href = secondaryCtaLink || '/#features';
                                if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) { e.preventDefault(); onNavigate(href); }
                            }}
                            className={`group relative overflow-hidden px-12 py-5 text-xl font-black uppercase tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                                ? 'border-4 bg-transparent'
                                : secondaryButtonStyle === 'ghost'
                                    ? 'bg-transparent border-0'
                                    : 'border-0'
                                }`}
                            style={{
                                backgroundColor: secondaryButtonStyle === 'solid'
                                    ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                    : 'transparent',
                                borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'transparent',
                                color: actualColors.secondaryButtonText,
                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                letterSpacing: 'var(--buttons-spacing, 0.05em)',
                            }}
                        >
                            <span className="relative z-10">{secondaryCta}</span>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ backgroundColor: `${actualColors.secondaryButtonBackground}15` }}
                            />
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes bold-fade-up {
                    from { opacity: 0; transform: translateY(50px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bold-skew-in {
                    from { opacity: 0; transform: translateX(-30px) skewX(-6deg); }
                    to { opacity: 1; transform: translateX(0) skewX(-6deg); }
                }
                @keyframes bold-spin-slow {
                    from { transform: rotate(45deg); }
                    to { transform: rotate(405deg); }
                }
                @keyframes bold-spin-reverse {
                    from { transform: rotate(12deg); }
                    to { transform: rotate(-348deg); }
                }
                @keyframes bold-spin-circle {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes bold-line-fade {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.8; }
                }
                @keyframes bold-glow-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                .bold-badge {
                    animation: bold-skew-in 0.7s ease-out forwards;
                    opacity: 0;
                }
                .bold-headline {
                    animation: bold-fade-up 0.9s ease-out 0.2s forwards;
                    opacity: 0;
                }
                .bold-sub {
                    animation: bold-fade-up 0.8s ease-out 0.4s forwards;
                    opacity: 0;
                }
                .bold-ctas {
                    animation: bold-fade-up 0.8s ease-out 0.6s forwards;
                    opacity: 0;
                }
                .bold-spin-1 {
                    animation: bold-spin-slow 40s linear infinite;
                }
                .bold-spin-2 {
                    animation: bold-spin-reverse 30s linear infinite;
                }
                .bold-spin-3 {
                    animation: bold-spin-circle 20s linear infinite;
                }
                .bold-line-1 {
                    animation: bold-line-fade 4s ease-in-out infinite;
                }
                .bold-line-2 {
                    animation: bold-line-fade 5s ease-in-out 1s infinite;
                }
                .bold-line-3 {
                    animation: bold-line-fade 3.5s ease-in-out 2s infinite;
                }
                .bold-glow-1 {
                    animation: bold-glow-pulse 6s ease-in-out infinite;
                }
                .bold-glow-2 {
                    animation: bold-glow-pulse 8s ease-in-out 2s infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroBold;
