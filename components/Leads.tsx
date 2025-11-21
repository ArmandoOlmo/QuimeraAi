
import React from 'react';
import { LeadsData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

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

interface LeadsProps extends LeadsData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const Leads: React.FC<LeadsProps> = ({ 
    title, 
    description, 
    namePlaceholder, 
    emailPlaceholder, 
    companyPlaceholder, 
    messagePlaceholder, 
    buttonText, 
    paddingY, 
    paddingX, 
    colors, 
    cardBorderRadius, 
    buttonBorderRadius,
    titleFontSize = 'md', 
    descriptionFontSize = 'md'
}) => {
  const inputBaseClasses = `bg-dark-900 border border-dark-700 text-site-heading px-4 py-3 focus:ring-2 focus:outline-none w-full font-body`;

  return (
    <section id="leads" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 md:gap-16 items-center">
        <div className="text-center md:text-left mb-12 md:mb-0">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className={`bg-dark-800 p-8 md:p-12 border ${borderRadiusClasses[cardBorderRadius]}`} style={{ borderColor: colors.borderColor }}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <input 
                type="text" 
                placeholder={namePlaceholder} 
                required 
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]}`} 
                style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
              />
              <input 
                type="email" 
                placeholder={emailPlaceholder} 
                required 
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]}`} 
                style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
              />
            </div>
            <input 
              type="text" 
              placeholder={companyPlaceholder} 
              className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]}`} 
              style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
            />
            <textarea 
              placeholder={messagePlaceholder} 
              rows={5} 
              className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]}`} 
              style={{'--tw-ring-color': colors.accent} as React.CSSProperties}
            ></textarea>
            <button 
              type="submit" 
              className={`w-full text-white font-bold py-4 px-8 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button ${borderRadiusClasses[buttonBorderRadius]}`} 
              style={{ backgroundColor: colors.buttonBackground || colors.accent, color: colors.buttonText || '#ffffff' }}
            >
              {buttonText}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Leads;
