
import React from 'react';
import { PortfolioData, PaddingSize, BorderRadiusSize, FontSize, AnimationType } from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';

interface PortfolioCardProps {
  imageUrl: string;
  title: string;
  description: string;
  delay?: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  animationType?: AnimationType;
  enableAnimation?: boolean;
}

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

const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  imageUrl, 
  title, 
  description, 
  delay = '0s', 
  textColor, 
  borderRadius, 
  borderColor,
  animationType = 'fade-in-up',
  enableAnimation = true
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  
  return (
    <div 
      className={`relative h-[400px] shadow-2xl border transform hover:scale-[1.02] transition-all duration-500 overflow-hidden group ${borderRadiusClasses[borderRadius]} ${animationClass}`} 
      style={{ animationDelay: delay, borderColor: borderColor }}
    >
      {/* Full Background Image */}
      <div className="absolute inset-0">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            key={imageUrl} 
          />
      </div>
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      
      {/* Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h3 className="text-2xl font-bold text-white mb-3 font-header line-clamp-2">
          {title}
        </h3>
        <p className="font-body text-sm text-white/90 line-clamp-3">
          {description}
        </p>
      </div>
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />
    </div>
  );
};

interface PortfolioProps extends PortfolioData {
    borderRadius: BorderRadiusSize;
}

const Portfolio: React.FC<PortfolioProps> = ({ 
  title, 
  description, 
  items, 
  paddingY, 
  paddingX, 
  colors, 
  borderRadius, 
  titleFontSize = 'md', 
  descriptionFontSize = 'md',
  animationType = 'fade-in-up',
  enableCardAnimation = true
}) => {
  return (
    <section id="portfolio" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <PortfolioCard 
                key={index} 
                imageUrl={item.imageUrl}
                title={item.title}
                description={item.description}
                delay={getAnimationDelay(index)}
                textColor={colors.text}
                borderRadius={borderRadius}
                borderColor={colors.borderColor}
                animationType={animationType}
                enableAnimation={enableCardAnimation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
