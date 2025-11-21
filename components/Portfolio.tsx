
import React from 'react';
import { PortfolioData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

interface PortfolioCardProps {
  imageUrl: string;
  title: string;
  description: string;
  delay?: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
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

const PortfolioCard: React.FC<PortfolioCardProps> = ({ imageUrl, title, description, delay = '0s', textColor, borderRadius, borderColor }) => (
  <div className={`bg-dark-800 shadow-lg border transform hover:-translate-y-2 transition-all duration-300 animate-fade-in-up overflow-hidden group ${borderRadiusClasses[borderRadius]}`} style={{ animationDelay: delay, borderColor: borderColor }}>
    <div className="aspect-[4/3] overflow-hidden">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" key={imageUrl} />
    </div>
    <div className="p-6">
      <h3 className="text-xl font-bold text-site-heading mb-2 font-header">{title}</h3>
      <p className="font-body text-sm" style={{ color: textColor }}>{description}</p>
    </div>
  </div>
);

interface PortfolioProps extends PortfolioData {
    borderRadius: BorderRadiusSize;
}

const Portfolio: React.FC<PortfolioProps> = ({ title, description, items, paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
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
                delay={`${(index + 1) * 0.2}s`}
                textColor={colors.text}
                borderRadius={borderRadius}
                borderColor={colors.borderColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
