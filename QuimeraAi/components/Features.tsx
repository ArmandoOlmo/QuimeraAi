import React, { useMemo } from 'react';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit, AnimationType, TextAlignment, FeatureItem } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { hexToRgba } from '../utils/colorUtils';
import { ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  imageUrl: string;
  title: string;
  description: string;
  delay?: string;
  accentColor: string;
  headingColor: string;
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
  full: 'rounded-3xl',
};

const objectFitClasses: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

// Text alignment classes for overlay variant
const textAlignmentClasses: Record<TextAlignment, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  imageUrl, 
  title, 
  description, 
  delay = '0s', 
  headingColor,
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
      className={`border transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden ${borderRadiusClasses[borderRadius]} ${animationClass}`} 
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
        <h3 className="text-2xl font-bold mb-3 font-header" style={{ color: headingColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h3>
        <p className="font-body opacity-90" style={{ color: textColor }}>{description}</p>
      </div>
    </div>
  );
};

// --- NUEVO: Componente para la Tarjeta Moderna (Bento Style) ---
const ModernFeatureCard = ({ feature, index, colors, borderRadius }: { feature: any, index: number, colors: any, borderRadius: string }) => {
    // Patrón Bento: El 1º (0) y el 4º (3) ocupan 2 columnas
    const isWide = index === 0 || index === 3 || index === 6;
    
    return (
        <div className={`group relative overflow-hidden border p-8 transition-all duration-500 ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`} style={{ borderColor: colors?.borderColor, backgroundColor: colors?.cardBackground }}>
            {/* Efecto Glow sutil */}
            <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-white/10 to-transparent blur-[100px] transition-all duration-500 group-hover:bg-white/20" style={{ opacity: 0.5 }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="mb-8">
                    <div className={`mb-6 overflow-hidden rounded-2xl border ${isWide ? 'aspect-[21/9]' : 'aspect-[4/3]'}`} style={{ borderColor: colors?.borderColor }}>
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
                    <h3 className="text-2xl font-bold mb-3 transition-colors" style={{ color: colors?.heading }}>{feature.title}</h3>
                    <p className="leading-relaxed font-light" style={{ color: colors?.text }}>{feature.description}</p>
                </div>
            </div>
        </div>
    );
};

// --- NUEVO: Componente para Image Overlay Style ---
interface ImageOverlayCardProps {
    feature: FeatureItem;
    index: number;
    colors: {
        accent: string;
    };
    imageHeight: number;
    imageObjectFit: ObjectFit;
    textAlignment: TextAlignment;
    animationType?: AnimationType;
    enableAnimation?: boolean;
}

const ImageOverlayCard: React.FC<ImageOverlayCardProps> = ({ 
    feature, 
    index, 
    colors, 
    imageHeight,
    imageObjectFit,
    textAlignment,
    animationType = 'fade-in-up',
    enableAnimation = true
}) => {
    const animationClass = getAnimationClass(animationType, enableAnimation);
    const delay = getAnimationDelay(index);
    
    return (
        <div 
            className={`group relative overflow-hidden ${animationClass}`}
            style={{ 
                animationDelay: delay,
                height: `${imageHeight}px`
            }}
        >
            {/* Image as full background - 100% width */}
            {isPendingImage(feature.imageUrl) ? (
                <ImagePlaceholder 
                    aspectRatio="auto"
                    showGenerateButton={false}
                    className="absolute inset-0 w-full h-full"
                />
            ) : (
                <img 
                    src={feature.imageUrl} 
                    alt={feature.title} 
                    className={`absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105 ${objectFitClasses[imageObjectFit]}`}
                />
            )}
            
            {/* Gradient overlay for text readability */}
            <div 
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300"
            />
            
            {/* Text overlay - position based on alignment */}
            <div className={`absolute bottom-0 left-0 right-0 p-6 flex flex-col ${textAlignmentClasses[textAlignment]}`}>
                <h3 
                    className="text-xl md:text-2xl font-bold mb-2 font-header text-white drop-shadow-lg"
                    style={{ 
                        textTransform: 'var(--headings-transform, none)' as any, 
                        letterSpacing: 'var(--headings-spacing, normal)' 
                    }}
                >
                    {feature.title}
                </h3>
                <p 
                    className="text-sm md:text-base font-body text-white/80 max-w-md drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2"
                >
                    {feature.description}
                </p>
            </div>
            
            {/* Optional accent indicator */}
            <div 
                className="absolute top-4 right-4 w-2 h-2 rounded-full"
                style={{ backgroundColor: colors?.accent }}
            />
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
    enableCardAnimation = true,
    overlayTextAlignment = 'left',
    showSectionHeader = true
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Get primary color for background
  const primaryColor = getColor('primary.main', '#4f46e5');
  
  // Merge component colors with Design Tokens - component colors take priority
  const actualColors = {
    background: colors?.background || primaryColor, // Fallback to primary if not set
    accent: colors?.accent || primaryColor,
    borderColor: colors?.borderColor,
    text: colors?.text,
    heading: colors?.heading,
    description: colors?.description || colors?.text,
    cardBackground: colors?.cardBackground || primaryColor,
    // Separate card colors
    cardHeading: (colors as any).cardHeading,
    cardText: (colors as any).cardText,
  };
  
  // Use user-selected colors directly - respect their choices
  const safeColors = useMemo(() => {
    return {
      // Section-level colors (for titles on section background)
      heading: actualColors.heading || '#ffffff',
      text: actualColors.text || '#94a3b8',
      // Description uses exact user-selected color
      description: actualColors.description || actualColors.text || '#94a3b8',
      // Card-level colors (for text inside cards) - independent from section colors
      cardHeading: actualColors.cardHeading || '#ffffff',
      cardText: actualColors.cardText || '#94a3b8',
    };
  }, [actualColors]);
  
  // Responsive grid columns - mobile-first approach
  const gridColsClasses: Record<number, string> = {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-2 lg:grid-cols-3',
      4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  // --- RENDERIZADO IMAGE OVERLAY ---
  if (featuresVariant === 'image-overlay') {
      return (
          <section 
              id="features" 
              className="w-full"
              style={{ backgroundColor: actualColors.background }}
          >
              {/* Optional Section Header */}
              {showSectionHeader && (title || description) && (
                  <div className={`container mx-auto text-center max-w-3xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} pb-8`}>
                      {title && (
                          <h2 
                              className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} 
                              style={{ 
                                  color: safeColors.heading, 
                                  textTransform: 'var(--headings-transform, none)' as any, 
                                  letterSpacing: 'var(--headings-spacing, normal)' 
                              }}
                          >
                              {title}
                          </h2>
                      )}
                      {description && (
                          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
                              {description}
                          </p>
                      )}
                  </div>
              )}

              {/* Full-width Image Grid - NO GAPS, 100% width, responsive */}
              <div 
                  className={`grid w-full grid-cols-1 sm:grid-cols-2 ${gridColumns >= 3 ? 'lg:grid-cols-3' : ''} ${gridColumns >= 4 ? 'xl:grid-cols-4' : ''}`}
                  style={{ gap: '0px' }}
              >
                  {items.map((feature, index) => (
                      <ImageOverlayCard
                          key={index}
                          feature={feature}
                          index={index}
                          colors={{
                              accent: actualColors.accent
                          }}
                          imageHeight={imageHeight}
                          imageObjectFit={imageObjectFit}
                          textAlignment={overlayTextAlignment}
                          animationType={animationType}
                          enableAnimation={enableCardAnimation}
                      />
                  ))}
              </div>
          </section>
      );
  }

  // --- RENDERIZADO MODERNO ---
  if (featuresVariant === 'modern') {
      return (
        <section id="features" className="w-full" style={{ backgroundColor: actualColors.background }}>
            <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
                <div className="relative z-10">
                    <div className="mb-20 max-w-3xl">
                        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-6`} style={{ color: safeColors.heading }}>
                            {title}
                        </h2>
                        <p className={`${descriptionSizeClasses[descriptionFontSize]} border-l-4 pl-6`} style={{ color: safeColors.description, borderColor: actualColors.accent }}>
                            {description}
                        </p>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-6`}>
                        {items.map((feature, index) => (
                            <ModernFeatureCard 
                                key={index} 
                                feature={feature} 
                                index={index}
                                colors={{ ...actualColors, heading: safeColors.cardHeading, text: safeColors.cardText }}
                                borderRadius={borderRadiusClasses[borderRadius]}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
      );
  }

  // --- RENDERIZADO BENTO PREMIUM ---
  if (featuresVariant === 'bento-premium') {
      return (
        <section id="features" className="w-full" style={{ backgroundColor: actualColors.background }}>
          <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
            <div className="relative">
            {/* Section Header con línea decorativa */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${actualColors.accent}, transparent)` }} />
                  <span className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: actualColors.accent }}>Features</span>
                  <div className="h-px w-12" style={{ background: `linear-gradient(to right, ${actualColors.accent}, transparent)` }} />
                </div>
                <h2 className={`${titleSizeClasses[titleFontSize]} font-black tracking-tight leading-[1.1] font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                  {title}
                </h2>
              </div>
              <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-md font-body`} style={{ color: safeColors.description }}>
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
                      transition-all duration-500 hover:scale-[1.02]
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
                        background: `linear-gradient(135deg, ${hexToRgba(actualColors.accent, 0.125)}, transparent 60%)`
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
                        style={{ color: safeColors.cardHeading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                      >
                        {feature.title}
                      </h3>
                      
                      <p 
                        className="leading-relaxed opacity-70 font-body"
                        style={{ color: safeColors.cardText }}
                      >
                        {feature.description}
                      </p>
                      
                      {/* Arrow indicator */}
                      <div 
                        className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300"
                        style={{ color: actualColors.accent }}
                      >
                        <span className="text-sm font-semibold">Learn more</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Corner accent */}
                    <div 
                      className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, ${hexToRgba(actualColors.accent, 0.08)} 50%)`
                      }}
                    />
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </section>
      );
  }

  return (
    <section id="features" className="w-full" style={{ backgroundColor: actualColors.background }}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
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
                headingColor={safeColors.cardHeading}
                textColor={safeColors.cardText}
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