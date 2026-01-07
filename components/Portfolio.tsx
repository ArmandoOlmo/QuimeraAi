
import React from 'react';
import { PortfolioData, PortfolioItem, PaddingSize, BorderRadiusSize, FontSize, AnimationType, TextAlignment, ObjectFit, CornerGradientConfig } from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import CornerGradient from './ui/CornerGradient';

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
  // Card-specific colors
  cardBackground?: string;
  cardTitleColor?: string;
  cardTextColor?: string;
  cardOverlayStart?: string;
  cardOverlayEnd?: string;
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

// Text alignment classes for overlay variant
const textAlignmentClasses: Record<TextAlignment, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

// --- Portfolio Overlay Card Component ---
interface PortfolioOverlayCardProps {
    item: PortfolioItem;
    index: number;
    colors: {
        accent: string;
    };
    imageHeight: number;
    textAlignment: TextAlignment;
    animationType?: AnimationType;
    enableAnimation?: boolean;
}

const PortfolioOverlayCard: React.FC<PortfolioOverlayCardProps> = ({ 
    item, 
    index, 
    colors, 
    imageHeight,
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
            {isPendingImage(item.imageUrl) ? (
                <ImagePlaceholder 
                    aspectRatio="auto"
                    showGenerateButton={false}
                    className="absolute inset-0 w-full h-full"
                />
            ) : (
                <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                    {item.title}
                </h3>
                <p 
                    className="text-sm md:text-base font-body text-white/80 max-w-md drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2"
                >
                    {item.description}
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

const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  imageUrl, 
  title, 
  description, 
  delay = '0s', 
  textColor, 
  borderRadius, 
  borderColor,
  animationType = 'fade-in-up',
  enableAnimation = true,
  cardBackground = 'rgba(0,0,0,0.8)',
  cardTitleColor = '#ffffff',
  cardTextColor = 'rgba(255,255,255,0.9)',
  cardOverlayStart = 'rgba(0,0,0,0.9)',
  cardOverlayEnd = 'rgba(0,0,0,0.2)'
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  
  // Build gradient style for overlay
  const overlayGradient = `linear-gradient(to top, ${cardOverlayStart}, ${cardOverlayEnd})`;
  
  return (
    <div 
      className={`relative h-[400px] border transform hover:scale-[1.02] transition-all duration-500 overflow-hidden group ${borderRadiusClasses[borderRadius]} ${animationClass}`} 
      style={{ animationDelay: delay, borderColor: borderColor, backgroundColor: cardBackground }}
    >
      {/* Full Background Image */}
      <div className="absolute inset-0">
          {isPendingImage(imageUrl) ? (
            <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className="w-full h-full" />
          ) : (
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              key={imageUrl} 
            />
          )}
      </div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0" style={{ background: overlayGradient }} />
      
      {/* Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h3 className="text-2xl font-bold mb-3 font-header line-clamp-2" style={{ color: cardTitleColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
          {title}
        </h3>
        <p className="font-body text-sm line-clamp-3" style={{ color: cardTextColor }}>
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
    cornerGradient?: CornerGradientConfig;
}

const gridColsClasses: Record<number, string> = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
};

const Portfolio: React.FC<PortfolioProps> = ({ 
  title, 
  description, 
  items = [], 
  paddingY, 
  paddingX, 
  colors, 
  borderRadius, 
  titleFontSize = 'md', 
  descriptionFontSize = 'md',
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  portfolioVariant = 'classic',
  gridColumns = 3,
  imageHeight = 300,
  overlayTextAlignment = 'left',
  showSectionHeader = true,
  cornerGradient
}) => {
  // --- RENDERIZADO IMAGE OVERLAY ---
  if (portfolioVariant === 'image-overlay') {
      return (
          <section 
              id="portfolio" 
              className="w-full relative overflow-hidden"
              style={{ backgroundColor: colors?.background }}
          >
              <CornerGradient config={cornerGradient} />
              {/* Optional Section Header */}
              {showSectionHeader && (title || description) && (
                  <div className={`container mx-auto text-center max-w-3xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} pb-8`}>
                      {title && (
                          <h2 
                              className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} 
                              style={{ 
                                  color: colors?.heading, 
                                  textTransform: 'var(--headings-transform, none)' as any, 
                                  letterSpacing: 'var(--headings-spacing, normal)' 
                              }}
                          >
                              {title}
                          </h2>
                      )}
                      {description && (
                          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors?.description || colors?.text }}>
                              {description}
                          </p>
                      )}
                  </div>
              )}

              {/* Full-width Image Grid - NO GAPS, 100% width */}
              <div 
                  className="grid w-full"
                  style={{
                      gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                      gap: '0px'
                  }}
              >
                  {items.map((item, index) => (
                      <PortfolioOverlayCard
                          key={index}
                          item={item}
                          index={index}
                          colors={{
                              accent: colors?.accent
                          }}
                          imageHeight={imageHeight}
                          textAlignment={overlayTextAlignment}
                          animationType={animationType}
                          enableAnimation={enableCardAnimation}
                      />
                  ))}
              </div>
          </section>
      );
  }

  // --- RENDERIZADO CLASSIC ---
  return (
    <section id="portfolio" className="w-full relative overflow-hidden" style={{ backgroundColor: colors?.background }}>
      <CornerGradient config={cornerGradient} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors?.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors?.text }}>
            {description}
          </p>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-8`}>
          {items.map((item, index) => (
            <PortfolioCard 
                key={index} 
                imageUrl={item.imageUrl}
                title={item.title}
                description={item.description}
                delay={getAnimationDelay(index)}
                textColor={colors?.text}
                borderRadius={borderRadius}
                borderColor={colors?.borderColor}
                animationType={animationType}
                enableAnimation={enableCardAnimation}
                cardBackground={colors?.cardBackground}
                cardTitleColor={colors?.cardTitleColor}
                cardTextColor={colors?.cardTextColor}
                cardOverlayStart={colors?.cardOverlayStart}
                cardOverlayEnd={colors?.cardOverlayEnd}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
