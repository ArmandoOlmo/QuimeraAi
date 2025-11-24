import React from 'react';
import { HeroData, BorderRadiusSize, FontSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { Zap, Target, TrendingUp, Award } from 'lucide-react';

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
    md: 'rounded-md',
    xl: 'rounded-xl',
    full: 'rounded-full',
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
}

const HeroFitness: React.FC<HeroProps> = ({ 
    headline, subheadline, primaryCta, secondaryCta, imageUrl, 
    colors, borderRadius,
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = 'AI-Powered Generation', badgeIcon = '⚡',
    badgeColor, badgeBackgroundColor,
    showStats = true, stats = [],
    statsValueColor, statsLabelColor
}) => {
    console.log('💪 HeroFitness rendering with imageUrl:', imageUrl);
    const { getColor } = useDesignTokens();
    
    const actualColors = {
        primary: getColor('primary.main', colors.primary),
        secondary: getColor('secondary.main', colors.secondary),
        background: colors.background,
        text: colors.text,
        heading: colors.heading,
        buttonBackground: getColor('primary.main', colors.buttonBackground),
        buttonText: colors.buttonText || '#ffffff',
        secondaryButtonBackground: colors.secondaryButtonBackground || '#1f2937',
        secondaryButtonText: colors.secondaryButtonText || '#ffffff',
    };

    const safeHeadline = typeof headline === 'string' ? headline : 'Transform Your Body';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
    );

    return (
        <section 
            className="relative w-full min-h-screen overflow-hidden"
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

            <div className="relative z-10 container mx-auto px-4 md:px-6 min-h-screen flex items-center">
                <div className="w-full py-20">
                    
                    {/* Main Content - Centered with Max Width */}
                    <div className="max-w-5xl">
                        
                        {/* Badge with Icon */}
                        {showBadge && (
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 mb-6 font-black tracking-wider uppercase text-sm transform -skew-x-6 shadow-xl animate-fade-in-down"
                                style={{ 
                                    backgroundColor: badgeBackgroundColor || actualColors.primary,
                                    color: badgeColor || '#ffffff'
                                }}
                            >
                                <span className="text-xl transform skew-x-6">{badgeIcon}</span>
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
                                href="#cta" 
                                style={{ 
                                    backgroundColor: actualColors.buttonBackground || actualColors.primary, 
                                    color: actualColors.buttonText 
                                }} 
                                className={`group relative overflow-hidden px-10 py-5 text-xl font-black uppercase tracking-wide transform hover:scale-105 active:scale-95 transition-all duration-300 font-button shadow-2xl ${borderRadiusClasses[borderRadius]}`}
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
                                href="#features" 
                                className={`group relative overflow-hidden px-10 py-5 text-xl font-black uppercase tracking-wide border-4 hover:scale-105 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                                style={{ 
                                    backgroundColor: 'transparent',
                                    borderColor: actualColors.primary,
                                    color: actualColors.heading 
                                }}
                            >
                                <span className="relative z-10">{secondaryCta}</span>
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ backgroundColor: `${actualColors.primary}20` }}
                                ></div>
                            </a>
                        </div>

                        {/* Stats Grid - Dynamic Cards */}
                        {showStats && stats && stats.length > 0 && (
                            <div 
                                className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up"
                                style={{ animationDelay: '0.3s' }}
                            >
                                {stats.map((stat, index) => {
                                    const icons = [Target, TrendingUp, Award, Zap];
                                    const Icon = icons[index % icons.length];
                                    
                                    return (
                                        <div 
                                            key={index}
                                            className="relative group cursor-pointer"
                                        >
                                            {/* Skewed Background */}
                                            <div 
                                                className="absolute inset-0 transform -skew-y-3 transition-all duration-300 group-hover:skew-y-0 group-hover:scale-105"
                                                style={{ 
                                                    backgroundColor: `${actualColors.primary}15`,
                                                    borderLeft: `4px solid ${actualColors.primary}`
                                                }}
                                            ></div>
                                            
                                            {/* Content */}
                                            <div className="relative p-5">
                                                <Icon 
                                                    size={24} 
                                                    className="mb-2 group-hover:scale-110 transition-transform"
                                                    style={{ color: actualColors.primary }}
                                                />
                                                <div 
                                                    className="text-3xl md:text-4xl font-black font-header mb-1"
                                                    style={{ color: statsValueColor || actualColors.primary }}
                                                >
                                                    {stat.value}
                                                </div>
                                                <div 
                                                    className="text-xs md:text-sm font-bold uppercase tracking-wider"
                                                    style={{ color: statsLabelColor || actualColors.text }}
                                                >
                                                    {stat.label}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Floating Action Elements - Bottom Right */}
                    <div className="absolute bottom-8 right-8 hidden lg:flex flex-col gap-4 animate-fade-in-left">
                        {/* Energy Indicator */}
                        <div 
                            className="flex items-center gap-3 px-6 py-4 backdrop-blur-xl border-l-4 shadow-2xl transform hover:scale-105 transition-all"
                            style={{ 
                                backgroundColor: `${actualColors.background}dd`,
                                borderColor: actualColors.primary
                            }}
                        >
                            <div className="relative">
                                <div 
                                    className="w-3 h-3 rounded-full animate-ping absolute"
                                    style={{ backgroundColor: actualColors.primary }}
                                ></div>
                                <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: actualColors.primary }}
                                ></div>
                            </div>
                            <div>
                                <div 
                                    className="text-sm font-black uppercase"
                                    style={{ color: actualColors.heading }}
                                >
                                    Live Classes
                                </div>
                                <div 
                                    className="text-xs font-bold"
                                    style={{ color: actualColors.text }}
                                >
                                    Join Now
                                </div>
                            </div>
                        </div>

                        {/* Achievement Badge */}
                        <div 
                            className="flex items-center gap-3 px-6 py-4 backdrop-blur-xl border-l-4 shadow-2xl transform hover:scale-105 transition-all"
                            style={{ 
                                backgroundColor: `${actualColors.background}dd`,
                                borderColor: actualColors.secondary
                            }}
                        >
                            <Award 
                                size={32} 
                                style={{ color: actualColors.secondary }}
                            />
                            <div>
                                <div 
                                    className="text-sm font-black uppercase"
                                    style={{ color: actualColors.heading }}
                                >
                                    Top Rated
                                </div>
                                <div 
                                    className="text-xs font-bold"
                                    style={{ color: actualColors.text }}
                                >
                                    5★ Reviews
                                </div>
                            </div>
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

