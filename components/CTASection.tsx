
import React from 'react';
import { CtaData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

const titleSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-7xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-3xl',
};

interface CTASectionProps extends CtaData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const CTASection: React.FC<CTASectionProps> = ({ title, description, buttonText, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge component colors with Design Tokens (component colors take priority)
  const actualColors = {
    background: colors.background || '#0f172a',
    gradientStart: colors.gradientStart || getColor('primary.main', '#4f46e5'),
    gradientEnd: colors.gradientEnd || getColor('secondary.main', '#10b981'),
    text: colors.text || '#ffffff',
    heading: colors.heading,
    buttonBackground: colors.buttonBackground || '#ffffff',
    buttonText: colors.buttonText || '#4f46e5',
  };
  
  return (
    <section id="cta" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
      <div>
        <div 
            className={`relative p-12 md:p-16 lg:p-20 shadow-2xl text-center overflow-hidden ${borderRadiusClasses[cardBorderRadius]}`}
            style={{ backgroundImage: `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})` }}
        >
            {/* === ANIMATED BACKGROUND ELEMENTS === */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Floating orbs */}
              <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-blob" />
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-blob animation-delay-2000" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
              
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>
            
            <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
            
            <div className="relative z-10">
                {/* Urgency Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-white/90 text-sm font-medium">Limited Time Offer</span>
                </div>
                
                <h2 className={`${titleSizeClasses[titleFontSize]} font-black text-white mb-4 font-header leading-tight`} style={{ color: actualColors.heading }}>
                    {title}
                </h2>
                <p 
                    className={`${descriptionSizeClasses[descriptionFontSize]} mb-10 max-w-2xl mx-auto font-body opacity-90`}
                    style={{ color: actualColors.text }}
                >
                    {description}
                </p>
                
                {/* CTA Button Group */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <a 
                      href="#" 
                      className={`group inline-flex items-center gap-3 font-bold py-4 px-10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-button ${borderRadiusClasses[buttonBorderRadius]}`}
                      style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}
                  >
                      <span>{buttonText}</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                  </a>
                  
                  {/* Secondary text */}
                  <span className="text-white/60 text-sm">
                    No credit card required • Cancel anytime
                  </span>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
