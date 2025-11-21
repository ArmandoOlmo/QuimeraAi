
import React from 'react';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit } from '../types';

interface FeatureCardProps {
  imageUrl: string;
  title: string;
  description: string;
  delay?: string;
  accentColor: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  imageHeight: number;
  imageObjectFit: ObjectFit;
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

const objectFitClasses: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

const FeatureCard: React.FC<FeatureCardProps> = ({ imageUrl, title, description, delay = '0s', textColor, borderRadius, borderColor, imageHeight, imageObjectFit }) => (
  <div className={`bg-dark-800 shadow-lg border transform hover:-translate-y-2 transition-transform duration-300 animate-fade-in-up overflow-hidden ${borderRadiusClasses[borderRadius]}`} style={{ animationDelay: delay, borderColor: borderColor }}>
    <img 
        src={imageUrl} 
        alt={title} 
        className={`w-full ${objectFitClasses[imageObjectFit]}`} 
        style={{ height: `${imageHeight}px` }}
        key={imageUrl} 
    />
    <div className="p-8">
      <h3 className="text-2xl font-bold text-site-heading mb-3 font-header">{title}</h3>
      <p className="font-body" style={{ color: textColor }}>{description}</p>
    </div>
  </div>
);

interface FeaturesProps extends FeaturesData {
    borderRadius: BorderRadiusSize;
}

const Features: React.FC<FeaturesProps> = ({ title, description, items, paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md', gridColumns = 3, imageHeight = 200, imageObjectFit = 'cover' }) => {
  
  const gridColsClasses: Record<number, string> = {
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
  };

  return (
    <section id="features" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-8`}>
          {items.map((feature, index) => (
            <FeatureCard 
                key={index} 
                imageUrl={feature.imageUrl}
                title={feature.title}
                description={feature.description}
                delay={`${(index + 1) * 0.2}s`}
                accentColor={colors.accent}
                textColor={colors.text}
                borderRadius={borderRadius}
                borderColor={colors.borderColor}
                imageHeight={imageHeight}
                imageObjectFit={imageObjectFit}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
