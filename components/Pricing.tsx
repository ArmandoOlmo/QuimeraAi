
import React from 'react';
import { PricingData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { CheckCircle } from 'lucide-react';

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

// Update props to accept separate border radius for card and button to align with other components and fix type errors.
interface PricingProps extends PricingData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const Pricing: React.FC<PricingProps> = ({ title, description, tiers, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  return (
    <section id="pricing" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
        <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
        {tiers.map((tier, index) => (
          <div
            key={index}
            className={`
              bg-dark-800 p-8 border relative flex flex-col h-full
              transform transition-all duration-300
              ${borderRadiusClasses[cardBorderRadius]}
              ${tier.featured ? 'scale-105 border-2 shadow-2xl' : 'border'}
            `}
            style={{ borderColor: tier.featured ? colors.accent : colors.borderColor }}
          >
            {tier.featured && (
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                <span className={`px-4 py-1 text-sm font-semibold text-white uppercase tracking-wider ${borderRadiusClasses.full}`} style={{ backgroundColor: colors.accent }}>
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="flex-grow">
                <h3 className="text-2xl font-bold text-site-heading text-center mb-2 font-header">{tier.name}</h3>
                <p className="text-center font-body mb-6" style={{ color: colors.text }}>{tier.description}</p>
                <div className="text-center mb-8">
                <span className="text-5xl font-extrabold text-site-heading font-header">{tier.price}</span>
                <span className="text-lg font-header" style={{ color: colors.text }}>{tier.frequency}</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start font-body" style={{ color: colors.text }}>
                      <CheckCircle size={20} className="mr-3 flex-shrink-0 text-current" />
                      <span>{feature}</span>
                    </li>
                ))}
                </ul>
            </div>

            <a
              href="#"
              className={`
                w-full text-center block font-bold py-3 px-8 shadow-lg transition-all duration-300 transform hover:scale-105 font-button
                ${borderRadiusClasses[buttonBorderRadius]}
                ${tier.featured 
                    ? `text-white`
                    : `bg-dark-700 text-white hover:bg-dark-800/50`
                }
              `}
              style={{ 
                  backgroundColor: tier.featured ? colors.accent : (colors.buttonBackground || '#4f46e5'),
                  color: colors.buttonText || '#ffffff'
               }}
            >
              {tier.buttonText}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Pricing;
