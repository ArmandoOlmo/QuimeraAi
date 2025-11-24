import React from 'react';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';

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

// --- NUEVO: Componente para la Tarjeta Moderna (Bento Style) ---
const ModernFeatureCard = ({ feature, index, colors, borderRadius }: { feature: any, index: number, colors: any, borderRadius: string }) => {
    // Patrón Bento: El 1º (0) y el 4º (3) ocupan 2 columnas
    const isWide = index === 0 || index === 3 || index === 6;
    
    return (
        <div className={`group relative overflow-hidden border bg-white/5 p-8 hover:bg-white/10 transition-all duration-500 ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`} style={{ borderColor: colors.borderColor }}>
            {/* Efecto Glow sutil */}
            <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-purple-500/20 to-transparent blur-[100px] transition-all duration-500 group-hover:bg-purple-500/30" style={{ opacity: 0.5 }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="mb-8">
                    <div className={`mb-6 overflow-hidden rounded-2xl border shadow-2xl ${isWide ? 'aspect-[21/9]' : 'aspect-[4/3]'}`} style={{ borderColor: colors.borderColor }}>
                        <img 
                            src={feature.imageUrl} 
                            alt={feature.title} 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 transition-colors" style={{ color: colors.heading }}>{feature.title}</h3>
                    <p className="leading-relaxed font-light" style={{ color: colors.text }}>{feature.description}</p>
                </div>
            </div>
        </div>
    );
};

interface FeaturesProps extends FeaturesData {
    borderRadius: BorderRadiusSize;
}

const Features: React.FC<FeaturesProps> = ({ 
    title, 
    description, 
    items, 
    paddingY, 
    paddingX, 
    colors, 
    borderRadius, 
    titleFontSize = 'md', 
    descriptionFontSize = 'md', 
    gridColumns = 3, 
    imageHeight = 200, 
    imageObjectFit = 'cover',
    featuresVariant = 'classic' 
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge Design Tokens with component colors
  const actualColors = {
    background: colors.background,
    accent: getColor('primary.main', colors.accent),
    borderColor: colors.borderColor,
    text: colors.text,
    heading: colors.heading,
  };
  
  const gridColsClasses: Record<number, string> = {
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
  };

  // --- RENDERIZADO MODERNO ---
  if (featuresVariant === 'modern') {
      return (
        <section id="features" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
            <div className="relative z-10">
                <div className="mb-20 max-w-3xl">
                    <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-6`} style={{ color: actualColors.heading }}>
                        {title}
                    </h2>
                    <p className={`${descriptionSizeClasses[descriptionFontSize]} border-l-4 pl-6`} style={{ color: actualColors.text, borderColor: actualColors.accent }}>
                        {description}
                    </p>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6`}>
                    {items.map((feature, index) => (
                        <ModernFeatureCard 
                            key={index} 
                            feature={feature} 
                            index={index}
                            colors={actualColors}
                            borderRadius={borderRadiusClasses[borderRadius]}
                        />
                    ))}
                </div>
            </div>
        </section>
      );
  }

  return (
    <section id="features" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: actualColors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
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
                accentColor={actualColors.accent}
                textColor={actualColors.text}
                borderRadius={borderRadius}
                borderColor={actualColors.borderColor}
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