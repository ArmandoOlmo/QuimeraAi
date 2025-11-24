
import React from 'react';
import { PricingData, PaddingSize, BorderRadiusSize, FontSize, PricingVariant } from '../types';
import { CheckCircle, Check, Sparkles, Zap } from 'lucide-react';
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
  full: 'rounded-full',
};

// Update props to accept separate border radius for card and button to align with other components and fix type errors.
interface PricingProps extends PricingData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
}

const Pricing: React.FC<PricingProps> = ({ 
    pricingVariant = 'classic',
    title, 
    description, 
    tiers, 
    paddingY, 
    paddingX, 
    colors, 
    cardBorderRadius = 'xl', 
    buttonBorderRadius, 
    titleFontSize = 'md', 
    descriptionFontSize = 'md' 
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge Design Tokens with component colors
  const actualColors = {
    background: colors.background,
    accent: getColor('primary.main', colors.accent || '#4f46e5'),
    borderColor: colors.borderColor || '#374151',
    text: colors.text,
    heading: colors.heading,
    cardBackground: colors.cardBackground || '#1f2937',
    buttonBackground: getColor('primary.main', colors.buttonBackground || '#4f46e5'),
    buttonText: colors.buttonText || '#ffffff',
    checkmarkColor: getColor('success.main', colors.checkmarkColor || '#10b981'),
    gradientStart: colors.gradientStart || '#4f46e5',
    gradientEnd: colors.gradientEnd || '#10b981',
  };

  // Classic Variant (Original Design)
  if (pricingVariant === 'classic') {
    return (
      <section id="pricing" className={`${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
        <div className="container mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: actualColors.heading }}>{title}</h2>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
                {description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`
                    p-8 border relative flex flex-col h-full
                    transform transition-all duration-300 hover:scale-105
                    ${borderRadiusClasses[cardBorderRadius]}
                    ${tier.featured ? 'border-2 shadow-2xl' : 'border'}
                  `}
                  style={{ 
                      backgroundColor: actualColors.cardBackground,
                      borderColor: tier.featured ? actualColors.accent : actualColors.borderColor
                  }}
                >
                  {tier.featured && (
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                      <span 
                          className={`px-4 py-1 text-xs font-semibold text-white uppercase tracking-wider ${borderRadiusClasses.full}`} 
                          style={{ backgroundColor: actualColors.accent }}
                      >
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-site-heading text-center mb-2 font-header" style={{ color: actualColors.heading }}>
                          {tier.name}
                      </h3>
                      
                      {tier.description && (
                          <p className="text-center text-sm font-body mb-4" style={{ color: actualColors.text, opacity: 0.8 }}>
                              {tier.description}
                          </p>
                      )}
                      
                      <div className="text-center mb-8">
                          <span className="text-5xl font-extrabold text-site-heading font-header" style={{ color: actualColors.heading }}>
                              {tier.price}
                          </span>
                          <span className="text-lg font-header ml-1" style={{ color: actualColors.text }}>
                              {tier.frequency}
                          </span>
                      </div>
                      
                      <ul className="space-y-4 mb-8">
                          {tier.features.map((feature, i) => (
                              <li key={i} className="flex items-start font-body" style={{ color: actualColors.text }}>
                                <CheckCircle 
                                    size={20} 
                                    className="mr-3 flex-shrink-0" 
                                    style={{ color: actualColors.checkmarkColor }}
                                />
                                <span>{feature}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <a
                    href={tier.buttonLink || '#'}
                    target={tier.buttonLink?.startsWith('http') ? '_blank' : undefined}
                    rel={tier.buttonLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`
                      w-full text-center block font-bold py-3 px-8 shadow-lg 
                      transition-all duration-300 transform hover:scale-105 font-button
                      ${borderRadiusClasses[buttonBorderRadius]}
                    `}
                    style={{ 
                        backgroundColor: tier.featured ? actualColors.accent : actualColors.buttonBackground,
                        color: actualColors.buttonText
                     }}
                  >
                    {tier.buttonText}
                  </a>
                </div>
              ))}
            </div>
        </div>
      </section>
    );
  }

  // Gradient Variant - Modern with vibrant gradients
  if (pricingVariant === 'gradient') {
    return (
      <section id="pricing" className={`${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative overflow-hidden`} style={{ backgroundColor: actualColors.background }}>
        {/* Background gradient effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: actualColors.gradientStart }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: actualColors.gradientEnd }} />
        </div>

        <div className="container mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 
                className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header bg-gradient-to-r bg-clip-text text-transparent`}
                style={{ backgroundImage: `linear-gradient(to right, ${actualColors.gradientStart}, ${actualColors.gradientEnd})` }}
              >
                {title}
              </h2>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
                {description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`
                    p-8 relative flex flex-col h-full
                    transform transition-all duration-500 hover:scale-105 hover:-translate-y-2
                    ${borderRadiusClasses[cardBorderRadius]}
                    ${tier.featured ? 'lg:scale-110' : ''}
                  `}
                  style={{ 
                      backgroundColor: actualColors.cardBackground,
                      backgroundImage: tier.featured 
                        ? `linear-gradient(135deg, ${actualColors.gradientStart}15, ${actualColors.gradientEnd}15)`
                        : 'none'
                  }}
                >
                  {/* Gradient border effect */}
                  <div 
                    className={`absolute inset-0 ${borderRadiusClasses[cardBorderRadius]} p-[2px]`}
                    style={{
                      background: tier.featured 
                        ? `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})`
                        : actualColors.borderColor,
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude'
                    }}
                  />

                  {tier.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div 
                        className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-lg"
                        style={{ 
                          backgroundImage: `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})`
                        }}
                      >
                        <Sparkles size={14} />
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-grow relative z-10">
                      <h3 className="text-2xl font-bold text-center mb-2 font-header" style={{ color: actualColors.heading }}>
                          {tier.name}
                      </h3>
                      
                      {tier.description && (
                          <p className="text-center text-sm font-body mb-6" style={{ color: actualColors.text, opacity: 0.8 }}>
                              {tier.description}
                          </p>
                      )}
                      
                      <div className="text-center mb-8">
                          <div className="inline-block">
                            <span 
                              className="text-6xl font-black font-header bg-gradient-to-br bg-clip-text text-transparent"
                              style={{ backgroundImage: `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})` }}
                            >
                                {tier.price}
                            </span>
                            <span className="text-lg font-header ml-1" style={{ color: actualColors.text }}>
                                {tier.frequency}
                            </span>
                          </div>
                      </div>
                      
                      <ul className="space-y-3 mb-8">
                          {tier.features.map((feature, i) => (
                              <li key={i} className="flex items-start font-body" style={{ color: actualColors.text }}>
                                <div 
                                  className="mr-3 flex-shrink-0 rounded-full p-1"
                                  style={{ 
                                    backgroundImage: `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})`
                                  }}
                                >
                                  <Check size={14} className="text-white" />
                                </div>
                                <span>{feature}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <a
                    href={tier.buttonLink || '#'}
                    target={tier.buttonLink?.startsWith('http') ? '_blank' : undefined}
                    rel={tier.buttonLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`
                      relative z-10 w-full text-center block font-bold py-3 px-8 shadow-xl
                      transition-all duration-300 transform hover:scale-105 hover:shadow-2xl font-button
                      ${borderRadiusClasses[buttonBorderRadius]}
                    `}
                    style={{ 
                        backgroundImage: tier.featured 
                          ? `linear-gradient(135deg, ${actualColors.gradientStart}, ${actualColors.gradientEnd})`
                          : `linear-gradient(135deg, ${actualColors.buttonBackground}, ${actualColors.buttonBackground})`,
                        color: actualColors.buttonText
                     }}
                  >
                    {tier.buttonText}
                  </a>
                </div>
              ))}
            </div>
        </div>
      </section>
    );
  }

  // Glassmorphism Variant - Frosted glass effect
  if (pricingVariant === 'glassmorphism') {
    return (
      <section id="pricing" className={`${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative overflow-hidden`} style={{ backgroundColor: actualColors.background }}>
        {/* Animated background blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: actualColors.accent }} />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: actualColors.checkmarkColor, animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-10" style={{ background: actualColors.gradientStart }} />
        </div>

        <div className="container mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: actualColors.heading }}>
                {title}
              </h2>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
                {description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`
                    p-8 relative flex flex-col h-full
                    backdrop-blur-xl backdrop-saturate-150
                    border border-white/10
                    transform transition-all duration-500 hover:scale-105
                    ${borderRadiusClasses[cardBorderRadius]}
                    ${tier.featured ? 'shadow-2xl' : 'shadow-lg'}
                  `}
                  style={{ 
                      backgroundColor: tier.featured ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      boxShadow: tier.featured 
                        ? `0 8px 32px 0 ${actualColors.accent}40, inset 0 0 0 1px rgba(255,255,255,0.1)`
                        : '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                >
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <div 
                        className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20"
                        style={{ 
                          backgroundColor: `${actualColors.accent}80`
                        }}
                      >
                        <Zap size={14} />
                        Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-center mb-2 font-header" style={{ color: actualColors.heading }}>
                          {tier.name}
                      </h3>
                      
                      {tier.description && (
                          <p className="text-center text-sm font-body mb-6" style={{ color: actualColors.text, opacity: 0.9 }}>
                              {tier.description}
                          </p>
                      )}
                      
                      <div className="text-center mb-8">
                          <span className="text-6xl font-black font-header" style={{ color: actualColors.heading }}>
                              {tier.price}
                          </span>
                          <span className="text-lg font-header ml-1 block mt-1" style={{ color: actualColors.text }}>
                              {tier.frequency}
                          </span>
                      </div>
                      
                      <ul className="space-y-3 mb-8">
                          {tier.features.map((feature, i) => (
                              <li key={i} className="flex items-start font-body" style={{ color: actualColors.text }}>
                                <div 
                                  className="mr-3 mt-0.5 flex-shrink-0 rounded-full p-1 backdrop-blur-sm"
                                  style={{ 
                                    backgroundColor: `${actualColors.checkmarkColor}30`,
                                    border: `1px solid ${actualColors.checkmarkColor}60`
                                  }}
                                >
                                  <Check size={12} style={{ color: actualColors.checkmarkColor }} />
                                </div>
                                <span className="text-sm">{feature}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <a
                    href={tier.buttonLink || '#'}
                    target={tier.buttonLink?.startsWith('http') ? '_blank' : undefined}
                    rel={tier.buttonLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`
                      w-full text-center block font-bold py-3 px-8
                      backdrop-blur-md border border-white/20
                      transition-all duration-300 transform hover:scale-105 font-button
                      ${borderRadiusClasses[buttonBorderRadius]}
                    `}
                    style={{ 
                        backgroundColor: tier.featured 
                          ? `${actualColors.accent}90`
                          : `${actualColors.buttonBackground}70`,
                        color: actualColors.buttonText,
                        boxShadow: `0 4px 16px ${actualColors.accent}30`
                     }}
                  >
                    {tier.buttonText}
                  </a>
                </div>
              ))}
            </div>
        </div>
      </section>
    );
  }

  // Minimalist Variant - Clean and simple
  if (pricingVariant === 'minimalist') {
    return (
      <section id="pricing" className={`${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
        <div className="container mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className={`${titleSizeClasses[titleFontSize]} font-bold mb-4 font-header`} style={{ color: actualColors.heading }}>
                {title}
              </h2>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
                {description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${actualColors.borderColor}, ${actualColors.borderColor})` }}>
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`
                    p-10 flex flex-col h-full
                    transition-all duration-300
                    ${tier.featured ? 'transform md:-translate-y-4' : ''}
                  `}
                  style={{ 
                      backgroundColor: actualColors.cardBackground,
                      borderTop: tier.featured ? `3px solid ${actualColors.accent}` : 'none'
                  }}
                >
                  {tier.featured && (
                    <div className="mb-4">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: actualColors.accent }}
                      >
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-grow">
                      <h3 className="text-lg font-semibold mb-1 font-header uppercase tracking-wide" style={{ color: actualColors.heading }}>
                          {tier.name}
                      </h3>
                      
                      {tier.description && (
                          <p className="text-xs font-body mb-8 leading-relaxed" style={{ color: actualColors.text, opacity: 0.7 }}>
                              {tier.description}
                          </p>
                      )}
                      
                      <div className="mb-10 pb-8 border-b" style={{ borderColor: actualColors.borderColor }}>
                          <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-light font-header" style={{ color: actualColors.heading }}>
                                {tier.price}
                            </span>
                            <span className="text-sm font-header" style={{ color: actualColors.text, opacity: 0.6 }}>
                                {tier.frequency}
                            </span>
                          </div>
                      </div>
                      
                      <ul className="space-y-4 mb-10">
                          {tier.features.map((feature, i) => (
                              <li key={i} className="flex items-start font-body text-sm leading-relaxed" style={{ color: actualColors.text }}>
                                <span className="mr-3 mt-1 flex-shrink-0" style={{ color: actualColors.accent }}>—</span>
                                <span>{feature}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <a
                    href={tier.buttonLink || '#'}
                    target={tier.buttonLink?.startsWith('http') ? '_blank' : undefined}
                    rel={tier.buttonLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`
                      w-full text-center block font-medium py-3 px-8 border
                      transition-all duration-300 font-button text-sm uppercase tracking-wider
                    `}
                    style={{ 
                        backgroundColor: tier.featured ? actualColors.accent : 'transparent',
                        borderColor: tier.featured ? actualColors.accent : actualColors.borderColor,
                        color: tier.featured ? actualColors.buttonText : actualColors.heading
                     }}
                  >
                    {tier.buttonText}
                  </a>
                </div>
              ))}
            </div>
        </div>
      </section>
    );
  }

  // Fallback to classic if variant is not recognized
  return null;
};

export default Pricing;
