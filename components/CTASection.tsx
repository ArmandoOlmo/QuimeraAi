
import React from 'react';
import { CtaData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

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
  full: 'rounded-full',
};

interface CTASectionProps extends CtaData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const CTASection: React.FC<CTASectionProps> = ({ title, description, buttonText, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  return (
    <section id="cta" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background || '#0f172a' }}>
      <div>
        <div 
            className={`relative p-12 shadow-2xl text-center overflow-hidden ${borderRadiusClasses[cardBorderRadius]}`}
            style={{ backgroundImage: `linear-gradient(to right, ${colors.gradientStart}, ${colors.gradientEnd})` }}
        >
            <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
            <div className="relative">
                <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-white mb-4 font-header`} style={{ color: colors.heading }}>
                    {title}
                </h2>
                <p 
                    className={`${descriptionSizeClasses[descriptionFontSize]} mb-8 max-w-2xl mx-auto font-body`}
                    style={{ color: colors.text || '#ffffff' }}
                >
                    {description}
                </p>
                <a 
                    href="#" 
                    className={`inline-block font-bold py-4 px-10 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button ${borderRadiusClasses[buttonBorderRadius]}`}
                    style={{ backgroundColor: colors.buttonBackground || '#ffffff', color: colors.buttonText || '#4f46e5' }}
                >
                    {buttonText}
                </a>
            </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
