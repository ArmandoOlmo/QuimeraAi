import React from 'react';
import { HeroData, BorderRadiusSize, FontSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';

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
    md: 'rounded-md',
    xl: 'rounded-xl',
    full: 'rounded-full',
};

interface HeroProps extends HeroData {
    borderRadius: BorderRadiusSize;
}

const HeroGradient: React.FC<HeroProps> = ({ 
    headline, subheadline, primaryCta, secondaryCta, imageUrl, 
    colors, borderRadius,
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    showBadge = true, badgeText = 'AI-Powered Generation', badgeIcon = '✨',
    badgeColor, badgeBackgroundColor,
    showStats = true, stats = [],
    statsValueColor, statsLabelColor
}) => {
    console.log('🎨 HeroGradient rendering with imageUrl:', imageUrl);
    const { getColor } = useDesignTokens();
    
    const actualColors = {
        primary: getColor('primary.main', colors.primary),
        secondary: getColor('secondary.main', colors.secondary),
        background: colors.background,
        text: colors.text,
        heading: colors.heading,
        buttonBackground: getColor('primary.main', colors.buttonBackground),
        buttonText: colors.buttonText || '#ffffff',
        secondaryButtonBackground: colors.secondaryButtonBackground || 'rgba(255,255,255,0.1)',
        secondaryButtonText: colors.secondaryButtonText || '#ffffff',
    };

    const safeHeadline = typeof headline === 'string' ? headline : 'Welcome';
    const styledHeadline = safeHeadline.replace(
        /(<span.*?>)(.*?)(<\/span>)/,
        `<span class="text-transparent bg-clip-text bg-gradient-to-r from-[${actualColors.primary}] to-[${actualColors.secondary}]">$2</span>`
    );

    return (
        <section 
            className="relative w-full min-h-screen overflow-hidden"
            style={{ background: actualColors.background }}
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

            <div className="relative z-10 container mx-auto px-4 md:px-6 min-h-screen flex items-center">
                <div className="grid md:grid-cols-2 gap-12 items-center w-full py-20">
                    
                    {/* Left Column - Content */}
                    <div className="space-y-8 animate-fade-in-up">
                        
                        {/* Badge */}
                        {showBadge && (
                            <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg"
                                style={{ 
                                    backgroundColor: badgeBackgroundColor || `${actualColors.primary}15`,
                                    borderColor: `${actualColors.primary}30`
                                }}
                            >
                                <span className="text-lg animate-pulse" style={{ color: badgeColor || actualColors.primary }}>
                                    {badgeIcon}
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
                            style={{ color: actualColors.heading }}
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
                                href="#cta" 
                                style={{ 
                                    backgroundColor: actualColors.buttonBackground || actualColors.primary, 
                                    color: actualColors.buttonText 
                                }} 
                                className={`relative overflow-hidden group px-8 py-4 font-bold shadow-2xl hover:shadow-[0_20px_50px_rgba(139,92,246,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                            >
                                <span className="relative z-10">{primaryCta}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            </a>
                            
                            <a 
                                href="#features" 
                                className={`relative overflow-hidden group px-8 py-4 font-bold backdrop-blur-md border-2 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
                                style={{ 
                                    backgroundColor: actualColors.secondaryButtonBackground,
                                    borderColor: `${actualColors.primary}40`,
                                    color: actualColors.secondaryButtonText 
                                }}
                            >
                                <span className="relative z-10">{secondaryCta}</span>
                                <div 
                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                                    style={{ background: actualColors.primary }}
                                ></div>
                            </a>
                        </div>

                        {/* Stats - Horizontal Cards */}
                        {showStats && stats && stats.length > 0 && (
                            <div className="flex flex-wrap gap-4 pt-4">
                                {stats.map((stat, index) => (
                                    <div 
                                        key={index}
                                        className="flex-1 min-w-[140px] p-4 rounded-2xl backdrop-blur-md border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                        style={{ 
                                            backgroundColor: `${actualColors.primary}08`,
                                            borderColor: `${actualColors.primary}20`
                                        }}
                                    >
                                        <div 
                                            className="text-2xl md:text-3xl font-bold font-header mb-1"
                                            style={{ color: statsValueColor || actualColors.primary }}
                                        >
                                            {stat.value}
                                        </div>
                                        <div 
                                            className="text-xs md:text-sm font-medium opacity-80"
                                            style={{ color: statsLabelColor || actualColors.text }}
                                        >
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Image with Floating Cards */}
                    <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        
                        {/* Main Image Card */}
                        <div 
                            className="relative rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md border"
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
                            
                            {/* Floating Card 1 - Top Right */}
                            <div 
                                className="absolute top-8 -right-4 md:right-8 p-4 rounded-2xl backdrop-blur-xl shadow-2xl border animate-float"
                                style={{ 
                                    backgroundColor: `${actualColors.background}dd`,
                                    borderColor: `${actualColors.primary}40`,
                                    animationDelay: '0.5s'
                                }}
                            >
                                <div 
                                    className="text-3xl font-bold font-header mb-1"
                                    style={{ color: actualColors.primary }}
                                >
                                    ✨
                                </div>
                                <div 
                                    className="text-xs font-medium whitespace-nowrap"
                                    style={{ color: actualColors.text }}
                                >
                                    AI Powered
                                </div>
                            </div>

                            {/* Floating Card 2 - Bottom Left */}
                            <div 
                                className="absolute bottom-8 -left-4 md:left-8 p-5 rounded-2xl backdrop-blur-xl shadow-2xl border animate-float"
                                style={{ 
                                    backgroundColor: `${actualColors.background}dd`,
                                    borderColor: `${actualColors.secondary}40`,
                                    animationDelay: '1s'
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-3 h-3 rounded-full animate-pulse"
                                        style={{ backgroundColor: actualColors.secondary }}
                                    ></div>
                                    <div>
                                        <div 
                                            className="text-sm font-bold"
                                            style={{ color: actualColors.heading }}
                                        >
                                            Live Status
                                        </div>
                                        <div 
                                            className="text-xs opacity-80"
                                            style={{ color: actualColors.text }}
                                        >
                                            All systems operational
                                        </div>
                                    </div>
                                </div>
                            </div>

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

