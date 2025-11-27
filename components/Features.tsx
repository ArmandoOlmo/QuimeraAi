import React from 'react';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit, AnimationType } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';

interface FeatureCardProps {
  imageUrl: string;
  title: string;
  description: string;
  delay?: string;
  accentColor: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  cardBackground: string;
  imageHeight: number;
  imageObjectFit: ObjectFit;
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
  full: 'rounded-3xl',
};

const objectFitClasses: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  imageUrl, 
  title, 
  description, 
  delay = '0s', 
  textColor, 
  borderRadius, 
  borderColor,
  cardBackground,
  imageHeight, 
  imageObjectFit,
  animationType = 'fade-in-up',
  enableAnimation = true
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  
  return (
    <div 
      className={`shadow-lg border transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden ${borderRadiusClasses[borderRadius]} ${animationClass}`} 
      style={{ animationDelay: delay, borderColor: borderColor, backgroundColor: cardBackground }}
    >
      {isPendingImage(imageUrl) ? (
        <div style={{ height: `${imageHeight}px` }}>
          <ImagePlaceholder 
            aspectRatio="4:3"
            showGenerateButton={false}
            className="h-full"
          />
        </div>
      ) : (
        <img 
            src={imageUrl} 
            alt={title} 
            className={`w-full ${objectFitClasses[imageObjectFit]}`} 
            style={{ height: `${imageHeight}px` }}
            key={imageUrl} 
        />
      )}
      <div className="p-8">
        <h3 className="text-2xl font-bold text-site-heading mb-3 font-header">{title}</h3>
        <p className="font-body" style={{ color: textColor }}>{description}</p>
      </div>
    </div>
  );
};

// --- NUEVO: Componente para la Tarjeta Moderna (Bento Style) ---
const ModernFeatureCard = ({ feature, index, colors, borderRadius }: { feature: any, index: number, colors: any, borderRadius: string }) => {
    // Patrón Bento: El 1º (0) y el 4º (3) ocupan 2 columnas
    const isWide = index === 0 || index === 3 || index === 6;
    
    return (
        <div className={`group relative overflow-hidden border p-8 transition-all duration-500 ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`} style={{ borderColor: colors.borderColor, backgroundColor: colors.cardBackground }}>
            {/* Efecto Glow sutil */}
            <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-white/10 to-transparent blur-[100px] transition-all duration-500 group-hover:bg-white/20" style={{ opacity: 0.5 }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="mb-8">
                    <div className={`mb-6 overflow-hidden rounded-2xl border shadow-2xl ${isWide ? 'aspect-[21/9]' : 'aspect-[4/3]'}`} style={{ borderColor: colors.borderColor }}>
                        {isPendingImage(feature.imageUrl) ? (
                            <ImagePlaceholder 
                                aspectRatio="4:3"
                                showGenerateButton={false}
                                className="h-full"
                            />
                        ) : (
                            <img 
                                src={feature.imageUrl} 
                                alt={feature.title} 
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        )}
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
    featuresVariant = 'classic',
    animationType = 'fade-in-up',
    enableCardAnimation = true
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge component colors with Design Tokens (component colors take priority)
  const actualColors = {
    background: colors.background,
    accent: colors.accent || getColor('primary.main', '#4f46e5'),
    borderColor: colors.borderColor,
    text: colors.text,
    heading: colors.heading,
    cardBackground: colors.cardBackground || getColor('primary.main', '#4f46e5'),
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

                <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-6`}>
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

  // --- RENDERIZADO BENTO PREMIUM ---
  if (featuresVariant === 'bento-premium') {
      return (
        <section id="features" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
          <div className="relative">
            {/* Section Header con línea decorativa */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${actualColors.accent}, transparent)` }} />
                  <span className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: actualColors.accent }}>Features</span>
                  <div className="h-px w-12" style={{ background: `linear-gradient(to right, ${actualColors.accent}, transparent)` }} />
                </div>
                <h2 className={`${titleSizeClasses[titleFontSize]} font-black tracking-tight leading-[1.1] font-header`} style={{ color: actualColors.heading }}>
                  {title}
                </h2>
              </div>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-md opacity-70 font-body`} style={{ color: actualColors.text }}>
                {description}
              </p>
            </div>

            {/* Bento Grid Premium */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {items.map((feature, index) => {
                const isLarge = index === 0;
                
                return (
                  <div 
                    key={index}
                    className={`
                      group relative overflow-hidden cursor-pointer
                      ${isLarge ? 'md:col-span-2 lg:row-span-2' : ''}
                      ${borderRadiusClasses[borderRadius]}
                      transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl
                      border
                    `}
                    style={{ 
                      backgroundColor: actualColors.cardBackground,
                      borderColor: actualColors.borderColor
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"
                      style={{ 
                        background: `linear-gradient(135deg, ${actualColors.accent}20, transparent 60%)`
                      }}
                    />
                    
                    {/* Image Container */}
                    <div className={`overflow-hidden ${isLarge ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                      {isPendingImage(feature.imageUrl) ? (
                        <ImagePlaceholder 
                          aspectRatio="4:3"
                          showGenerateButton={false}
                          className="h-full"
                        />
                      ) : (
                        <img 
                          src={feature.imageUrl} 
                          alt={feature.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-20 p-6 md:p-8">
                      {/* Número de feature */}
                      <span 
                        className="inline-block text-xs font-bold uppercase tracking-widest mb-3 opacity-50"
                        style={{ color: actualColors.accent }}
                      >
                        0{index + 1}
                      </span>
                      
                      <h3 
                        className={`${isLarge ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold mb-3 group-hover:translate-x-2 transition-transform duration-300 font-header`}
                        style={{ color: actualColors.heading }}
                      >
                        {feature.title}
                      </h3>
                      
                      <p 
                        className="leading-relaxed opacity-70 font-body"
                        style={{ color: actualColors.text }}
                      >
                        {feature.description}
                      </p>
                      
                      {/* Arrow indicator */}
                      <div 
                        className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300"
                        style={{ color: actualColors.accent }}
                      >
                        <span className="text-sm font-semibold">Learn more</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    {/* Corner accent */}
                    <div 
                      className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, ${actualColors.accent}15 50%)`
                      }}
                    />
                  </div>
                );
              })}
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
                delay={getAnimationDelay(index)}
                accentColor={actualColors.accent}
                textColor={actualColors.text}
                borderRadius={borderRadius}
                borderColor={actualColors.borderColor}
                cardBackground={actualColors.cardBackground}
                imageHeight={imageHeight}
                imageObjectFit={imageObjectFit}
                animationType={animationType}
                enableAnimation={enableCardAnimation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;