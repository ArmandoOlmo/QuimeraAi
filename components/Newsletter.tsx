
import React from 'react';
import { NewsletterData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

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
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

interface NewsletterProps extends NewsletterData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const Newsletter: React.FC<NewsletterProps> = ({ title, description, placeholderText, buttonText, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  // Use section colors for title/description - cardHeading/cardText are legacy fallbacks
  const headingColor = colors?.heading || colors?.cardHeading || '#ffffff';
  const textColor = colors?.text || colors?.cardText || '#ffffff';
  const placeholderColor = colors?.inputPlaceholder || '#6b7280';
  
  return (
    <section id="newsletter" className="w-full" style={{ backgroundColor: colors?.background }}>
      <style dangerouslySetInnerHTML={{ __html: `
        #newsletter-email-input::placeholder {
          color: ${placeholderColor};
          opacity: 1;
        }
      `}} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className={`border p-8 md:p-12 text-center ${borderRadiusClasses[cardBorderRadius]}`} style={{ borderColor: colors?.borderColor, backgroundColor: colors?.cardBackground || 'rgba(79, 70, 229, 0.75)' }}>
        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: headingColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
        <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-2xl mx-auto mb-8 font-body`} style={{ color: textColor }}>{description}</p>
        <form onSubmit={(e) => e.preventDefault()} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
          <input
            id="newsletter-email-input"
            type="email"
            placeholder={placeholderText}
            required
            className={`flex-grow border px-4 py-3 focus:ring-2 focus:outline-none w-full font-body ${borderRadiusClasses[cardBorderRadius]}`}
            style={{
              backgroundColor: colors?.inputBackground || '#111827',
              color: colors?.inputText || '#ffffff',
              borderColor: colors?.inputBorder || '#374151',
              '--tw-ring-color': colors?.accent
            } as React.CSSProperties}
          />
          <button
            type="submit"
            className={`text-white font-bold py-3 px-8 hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button ${borderRadiusClasses[buttonBorderRadius]}`}
            style={{ backgroundColor: colors?.buttonBackground || colors?.accent, color: colors?.buttonText || '#ffffff', textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
          >
            {buttonText}
          </button>
        </form>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
