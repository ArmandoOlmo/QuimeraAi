import React from 'react';
import { HeroData, BorderRadiusSize, FontSize, PaddingSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import { Zap } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-4xl md:text-5xl',
    md: 'text-5xl md:text-7xl',
    lg: 'text-6xl md:text-8xl',
    xl: 'text-7xl md:text-9xl',
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

// Helper function to render badge icon (supports both emoji strings and Lucide icons)
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

const HeroFitness: React.FC<HeroProps> = ({ 
    headline, subheadline, primaryCta, secondaryCta, imageUrl, 
    colors, borderRadius,
    paddingY = 'md', paddingX = 'md',
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = '', badgeIcon = '⚡',
    badgeColor, badgeBackgroundColor,
    secondaryButtonStyle = 'outline',
    secondaryButtonOpacity = 100,
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

    const safeHeadline = typeof headline === 'string' ? headline : 'Transform Your Body';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
    );

    return (
        <section 
            className="relative w-full overflow-hidden"
            style={{ background: actualColors.background }}
        >
            {/* Dynamic Background with Image */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={imageUrl} 
                    alt="Fitness Background" 
                    className="w-full h-full object-cover"
                />
                {/* Dark Overlay with Gradient */}
                <div 
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(135deg, ${actualColors.background}ee 0%, ${actualColors.background}cc 50%, ${actualColors.background}99 100%)`
                    }}
                ></div>
                
                {/* Diagonal Energy Lines */}
                <div className="absolute inset-0 opacity-20">
                    <div 
                        className="absolute top-0 left-1/4 w-1 h-full transform -skew-x-12 animate-pulse"
                        style={{ 
                            background: `linear-gradient(to bottom, transparent, ${actualColors.primary}, transparent)`,
                            animationDuration: '3s'
                        }}
                    ></div>
                    <div 
                        className="absolute top-0 right-1/3 w-1 h-full transform -skew-x-12 animate-pulse"
                        style={{ 
                            background: `linear-gradient(to bottom, transparent, ${actualColors.secondary}, transparent)`,
                            animationDuration: '2.5s',
                            animationDelay: '0.5s'
                        }}
                    ></div>
                </div>

                {/* Energy Burst Effect */}
                <div 
                    className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 animate-pulse"
                    style={{ 
                        background: `radial-gradient(circle, ${actualColors.primary} 0%, transparent 70%)`,
                        animationDuration: '4s'
                    }}
                ></div>
            </div>

            <div className={`relative z-10 container mx-auto ${paddingXClasses[paddingX]} ${paddingYClasses[paddingY]} flex items-center`}>
                <div className={`w-full`}>
                    
                    {/* Main Content - Centered with Max Width */}
                    <div className="max-w-5xl">
                        
                        {/* Badge with Icon */}
                        {showBadge && badgeText && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 mb-6 font-black tracking-wider uppercase text-sm transform -skew-x-6 animate-fade-in-down"
                                style={{ 
                                    backgroundColor: badgeBackgroundColor || actualColors.primary,
                                    color: badgeColor || '#ffffff'
                                }}
                            >
                                <span className="text-xl transform skew-x-6 flex items-center">{renderBadgeIcon(badgeIcon)}</span>
                                <span className="transform skew-x-6">{badgeText}</span>
                            </div>
                        )}

                        {/* Headline - Extra Bold */}
                        <h1 
                            className={`${headlineSizeClasses[headlineFontSize]} font-black tracking-tighter leading-[0.9] mb-6 font-header uppercase animate-fade-in-up`}
                            style={{ 
                                color: actualColors.heading,
                                textShadow: `4px 4px 0px ${actualColors.primary}40, 8px 8px 0px ${actualColors.background}40`
                            }}
                            dangerouslySetInnerHTML={{ __html: styledHeadline }}
                        />

                        {/* Subheadline with Accent Border */}
                        <div 
                            className="relative pl-6 mb-8 animate-fade-in-up"
                            style={{ animationDelay: '0.1s' }}
                        >
                            <div 
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: actualColors.primary }}
                            ></div>
                            <p 
                                className={`${subheadlineSizeClasses[subheadlineFontSize]} font-bold leading-relaxed max-w-2xl font-body`}
                                style={{ color: actualColors.text }}
                            >
                                {subheadline}
                            </p>
                        </div>

                        {/* CTAs - Bold and Large */}
                        <div 
                            className="flex flex-wrap gap-4 mb-12 animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
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
                                    color: actualColors.buttonText 
                                }} 
                                className={`group relative overflow-hidden px-10 py-5 text-xl font-black uppercase tracking-wide transform hover:scale-105 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <Zap size={24} className="group-hover:rotate-12 transition-transform" />
                                    {primaryCta}
                                </span>
                                <div 
                                    className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                                    style={{ backgroundColor: actualColors.secondary }}
                                ></div>
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
                                className={`group relative overflow-hidden px-10 py-5 text-xl font-black uppercase tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]} ${
                                    secondaryButtonStyle === 'outline' 
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
                                    color: actualColors.secondaryButtonText 
                                }}
                            >
                                <span className="relative z-10">{secondaryCta}</span>
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ backgroundColor: `${actualColors.secondaryButtonBackground}20` }}
                                ></div>
                            </a>
                        </div>

                    </div>

                    {/* Decorative Geometric Shapes */}
                    <div className="absolute top-20 right-20 hidden xl:block">
                        <div 
                            className="w-32 h-32 transform rotate-45 opacity-20 animate-spin-very-slow"
                            style={{ 
                                border: `4px solid ${actualColors.primary}`,
                                borderRadius: '8px'
                            }}
                        ></div>
                    </div>
                    <div className="absolute bottom-32 left-20 hidden xl:block">
                        <div 
                            className="w-24 h-24 transform rotate-12 opacity-20 animate-bounce-slow"
                            style={{ 
                                border: `4px solid ${actualColors.secondary}`,
                                borderRadius: '8px'
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
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fade-in-down {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fade-in-left {
                    from {
                        opacity: 0;
                        transform: translateX(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes spin-very-slow {
                    from {
                        transform: rotate(45deg);
                    }
                    to {
                        transform: rotate(405deg);
                    }
                }

                @keyframes bounce-slow {
                    0%, 100% {
                        transform: rotate(12deg) translateY(0);
                    }
                    50% {
                        transform: rotate(12deg) translateY(-20px);
                    }
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }

                .animate-fade-in-down {
                    animation: fade-in-down 0.6s ease-out forwards;
                }

                .animate-fade-in-left {
                    animation: fade-in-left 1s ease-out forwards;
                    animation-delay: 0.5s;
                    opacity: 0;
                }

                .animate-spin-very-slow {
                    animation: spin-very-slow 40s linear infinite;
                }

                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
};

export default HeroFitness;

