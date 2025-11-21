
import React from 'react';
import { NewsletterData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

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

interface NewsletterProps extends NewsletterData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const Newsletter: React.FC<NewsletterProps> = ({ title, description, placeholderText, buttonText, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  return (
    <section id="newsletter" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div className={`bg-dark-800 border p-8 md:p-12 text-center ${borderRadiusClasses[cardBorderRadius]}`} style={{ borderColor: colors.borderColor }}>
        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
        <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-2xl mx-auto mb-8 font-body`} style={{ color: colors.text }}>{description}</p>
        <form onSubmit={(e) => e.preventDefault()} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            placeholder={placeholderText}
            required
            className={`flex-grow bg-dark-900 border border-dark-700 text-site-heading px-4 py-3 focus:ring-2 focus:outline-none w-full font-body ${borderRadiusClasses[cardBorderRadius]}`}
            style={{'--tw-ring-color': colors.accent} as React.CSSProperties}
          />
          <button
            type="submit"
            className={`text-white font-bold py-3 px-8 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button ${borderRadiusClasses[buttonBorderRadius]}`}
            style={{ backgroundColor: colors.buttonBackground || colors.accent, color: colors.buttonText || '#ffffff' }}
          >
            {buttonText}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
