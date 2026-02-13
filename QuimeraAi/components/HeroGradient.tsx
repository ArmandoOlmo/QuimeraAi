import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-3xl md:text-5xl',
    md: 'text-4xl md:text-6xl',
    lg: 'text-5xl md:text-7xl',
    xl: 'text-6xl md:text-8xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm md:text-base',
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

// Helper function to render badge icon (supports both emoji strings and Lucide icons)
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

const HeroGradient: React.FC<HeroProps> = ({
    headline, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = '', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
    heroHeight,
    primaryCtaLink = '/#cta',
    secondaryCtaLink = '/#features',
    onNavigate,
}) => {
    const { getColor } = useDesignTokens();

    // Component colors take priority over Design Tokens
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
        <section
            className="relative w-full overflow-hidden"
            style={{ background: actualColors.background, minHeight: heroHeight ? `${heroHeight}vh` : undefined }}
        >
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute top-0 -right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{
                        background: `radial-gradient(circle, ${actualColors.primary} 0%, transparent 70%)`,
                        animationDuration: '8s'
                    }}
                ></div>
                <div
                    className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{
                        background: `radial-gradient(circle, ${actualColors.secondary} 0%, transparent 70%)`,
                        animationDuration: '6s',
                        animationDelay: '1s'
                    }}
                ></div>
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl opacity-10 animate-pulse"
                    style={{
                        background: `radial-gradient(circle, ${actualColors.primary} 0%, ${actualColors.secondary} 50%, transparent 70%)`,
                        animationDuration: '10s'
                    }}
                ></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div
                className="absolute inset-0 z-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(${actualColors.text} 1px, transparent 1px), linear-gradient(90deg, ${actualColors.text} 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            ></div>

            <div className={`relative z-10 container mx-auto ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} flex items-center`}>
                <div className={`grid md:grid-cols-2 gap-12 items-center w-full`}>

                    {/* Left Column - Content */}
                    <div className="space-y-8 animate-fade-in-up">

                        {/* Badge */}
                        {showBadge && badgeText && (
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border"
                                style={{
                                    backgroundColor: badgeBackgroundColor || `${actualColors.primary}15`,
                                    borderColor: `${actualColors.primary}30`
                                }}
                            >
                                <span className="text-lg animate-pulse flex items-center" style={{ color: badgeColor || actualColors.primary }}>
                                    {renderBadgeIcon(badgeIcon)}
                                </span>
                                <span
                                    className="text-sm font-bold tracking-wide uppercase"
                                    style={{ color: badgeColor || actualColors.primary }}
                                >
                                    {badgeText}
                                </span>
                            </div>
                        )}

                        {/* Headline */}
                        <h1
                            className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tight leading-[1.1] font-header`}
                            style={{
                                color: actualColors.heading,
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)'
                            }}
                            dangerouslySetInnerHTML={{ __html: styledHeadline }}
                        />

                        {/* Subheadline */}
                        <p
                            className={`${subheadlineSizeClasses[subheadlineFontSize]} leading-relaxed max-w-xl font-body`}
                            style={{ color: actualColors.text }}
                        >
                            {subheadline}
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-wrap gap-4">
                            <a
                                href={primaryCtaLink || '/#cta'}
                                onClick={(e) => {
                                    const href = primaryCtaLink || '/#cta';
                                    if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                                        e.preventDefault();
                                        onNavigate(href);
                                    }
                                }}
                                style={{
                                    backgroundColor: actualColors.buttonBackground || actualColors.primary,
                                    color: actualColors.buttonText,
                                    textTransform: 'var(--buttons-transform, none)' as any,
                                    letterSpacing: 'var(--buttons-spacing, normal)'
                                }}
                                className={`relative overflow-hidden group px-8 py-4 font-bold hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                            >
                                <span className="relative z-10">{primaryCta}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            </a>

                            <a
                                href={secondaryCtaLink || '/#features'}
                                onClick={(e) => {
                                    const href = secondaryCtaLink || '/#features';
                                    if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                                        e.preventDefault();
                                        onNavigate(href);
                                    }
                                }}
                                className={`relative overflow-hidden group px-8 py-4 font-bold backdrop-blur-md hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
                                        ? 'border-2 bg-transparent'
                                        : secondaryButtonStyle === 'ghost'
                                            ? 'bg-transparent border border-transparent'
                                            : 'border-0'
                                    }`}
                                style={{
                                    backgroundColor: secondaryButtonStyle === 'solid'
                                        ? hexToRgba(actualColors.secondaryButtonBackground || '#334155', secondaryButtonOpacity / 100)
                                        : 'transparent',
                                    borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'transparent',
                                    color: actualColors.secondaryButtonText,
                                    textTransform: 'var(--buttons-transform, none)' as any,
                                    letterSpacing: 'var(--buttons-spacing, normal)'
                                }}
                            >
                                <span className="relative z-10">{secondaryCta}</span>
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                                    style={{ background: actualColors.primary }}
                                ></div>
                            </a>
                        </div>

                    </div>

                    {/* Right Column - Image with Floating Cards */}
                    <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

                        {/* Main Image Card */}
                        <div
                            className="relative rounded-3xl overflow-hidden backdrop-blur-md border"
                            style={{
                                borderColor: `${actualColors.primary}30`
                            }}
                        >
                            {/* Gradient Overlay on Image */}
                            <div
                                className="absolute inset-0 z-10 opacity-20"
                                style={{
                                    background: `linear-gradient(135deg, ${actualColors.primary} 0%, ${actualColors.secondary} 100%)`
                                }}
                            ></div>

                            <img
                                src={imageUrl}
                                alt="Hero Visual"
                                className="w-full h-auto object-cover"
                                style={{ minHeight: '400px', maxHeight: '600px' }}
                            />

                            {/* Decorative Elements */}
                            <div
                                className="absolute top-4 left-4 w-20 h-20 rounded-full blur-2xl opacity-50"
                                style={{ backgroundColor: actualColors.primary }}
                            ></div>
                            <div
                                className="absolute bottom-4 right-4 w-32 h-32 rounded-full blur-3xl opacity-30"
                                style={{ backgroundColor: actualColors.secondary }}
                            ></div>
                        </div>

                        {/* Decorative Rings */}
                        <div
                            className="absolute -top-8 -right-8 w-32 h-32 rounded-full border-4 opacity-20 animate-spin-slow"
                            style={{ borderColor: actualColors.primary }}
                        ></div>
                        <div
                            className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full border-4 opacity-20 animate-spin-slow"
                            style={{
                                borderColor: actualColors.secondary,
                                animationDirection: 'reverse',
                                animationDuration: '20s'
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }

                @keyframes spin-slow {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-spin-slow {
                    animation: spin-slow 30s linear infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroGradient;

