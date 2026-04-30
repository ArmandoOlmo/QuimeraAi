import React, { useMemo } from 'react';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit, AnimationType, TextAlignment, FeatureItem } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { hexToRgba, getNeonGlowStyles } from '../utils/colorUtils';
import { ArrowRight } from 'lucide-react';
import FeaturesCinematicGym from './cinematic/FeaturesCinematicGym';

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
  linkUrl?: string;
  linkText?: string;
  onNavigate?: (href: string) => void;
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
  accentColor,
  headingColor,
  textColor,
  borderRadius,
  borderColor,
  cardBackground,
  imageHeight,
  imageObjectFit,
  animationType = 'fade-in-up',
  enableAnimation = true,
  linkUrl,
  linkText,
  onNavigate
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  const isExternal = linkUrl?.startsWith('http');

  return (
    <div
      className={`border border-white/10 transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden backdrop-blur-xl ${borderRadiusClasses[borderRadius]} ${animationClass}`}
      style={{ animationDelay: delay, borderColor: borderColor, backgroundColor: hexToRgba(cardBackground, 0.35) }}
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
        {linkUrl && (
          <a
            href={linkUrl}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (onNavigate && linkUrl && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
                e.preventDefault();
                onNavigate(linkUrl);
              }
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold group/link transition-colors"
            style={{ color: accentColor }}
          >
            <span>{linkText || 'Learn more'}</span>
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </a>
        )}
      </div>
    </div>
  );
};

// --- NUEVO: Componente para la Tarjeta Moderna (Bento Style) ---
const ModernFeatureCard = ({ feature, index, colors, borderRadius, onNavigate }: { feature: any, index: number, colors: any, borderRadius: string, onNavigate?: (href: string) => void }) => {
  // Patrón Bento: El 1º (0) y el 4º (3) ocupan 2 columnas
  const isWide = index === 0 || index === 3 || index === 6;
  const isExternal = feature.linkUrl?.startsWith('http');

  return (
    <div className={`group relative overflow-hidden border border-white/10 p-8 transition-all duration-500 backdrop-blur-xl ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`} style={{ borderColor: colors?.borderColor, backgroundColor: hexToRgba(colors?.cardBackground || '#1f2937', 0.35) }}>
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
          <h3 className="text-2xl font-bold mb-3 transition-colors font-header" style={{ color: colors?.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{feature.title}</h3>
          <p className="leading-relaxed font-light font-body" style={{ color: colors?.text }}>{feature.description}</p>
        </div>
        {feature.linkUrl && (
          <a
            href={feature.linkUrl}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (onNavigate && feature.linkUrl && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                e.preventDefault();
                onNavigate(feature.linkUrl);
              }
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold group/link transition-colors"
            style={{ color: colors?.accent }}
          >
            <span>{feature.linkText || 'Learn more'}</span>
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </a>
        )}
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
  onNavigate?: (href: string) => void;
}

const ImageOverlayCard: React.FC<ImageOverlayCardProps> = ({
  feature,
  index,
  colors,
  imageHeight,
  imageObjectFit,
  textAlignment,
  animationType = 'fade-in-up',
  enableAnimation = true,
  onNavigate
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
        {feature.linkUrl && (
          <a
            href={feature.linkUrl}
            target={feature.linkUrl.startsWith('http') ? '_blank' : undefined}
            rel={feature.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (feature.linkType === 'content' && feature.linkUrl && onNavigate && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                e.preventDefault();
                onNavigate(feature.linkUrl);
              }
            }}
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <span>{feature.linkText || 'Learn more'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>

    </div>
  );
};

// --- NUEVO: Componente para Bento Overlay Style ---
const BentoOverlayCard = ({ feature, index, colors, borderRadius, showNumbering, onNavigate, imageHeight, imageObjectFit }: {
  feature: FeatureItem;
  index: number;
  colors: any;
  borderRadius: string;
  showNumbering?: boolean;
  onNavigate?: (href: string) => void;
  imageHeight: number;
  imageObjectFit: ObjectFit;
}) => {
  const isWide = index === 0 || index === 3 || index === 6;
  const isExternal = feature.linkUrl?.startsWith('http');

  return (
    <div
      className={`group relative overflow-hidden cursor-pointer ${isWide ? 'md:col-span-2' : 'col-span-1'} ${borderRadius} transition-all duration-500 hover:scale-[1.02]`}
      style={{ height: `${isWide ? imageHeight + 40 : imageHeight}px` }}
    >
      {/* Full-bleed background image */}
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
          className={`absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110 ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
        />
      )}

      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 opacity-80 group-hover:opacity-95 transition-opacity duration-300"
      />

      {/* Hover accent glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(colors?.accent || '#4f46e5', 0.15)}, transparent 60%)`
        }}
      />

      {/* Text overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10 flex flex-col">
        <h3
          className={`${isWide ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'} font-bold mb-2 font-header text-white drop-shadow-lg group-hover:translate-x-1 transition-transform duration-300`}
          style={{
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)'
          }}
        >
          {feature.title}
        </h3>
        <p className="text-sm md:text-base font-body text-white/75 drop-shadow-md max-w-lg line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {feature.description}
        </p>
        {feature.linkUrl && (
          <a
            href={feature.linkUrl}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (onNavigate && feature.linkUrl && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                e.preventDefault();
                onNavigate(feature.linkUrl);
              }
            }}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <span>{feature.linkText || 'Learn more'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

// --- NUEVO: Componente para Press Release Style ---
const PressReleaseCard = ({ feature, index, colors, borderRadius, onNavigate, imageHeight, imageObjectFit, cardBorderSize = 0, cardBorderOpacity = 100 }: {
  feature: FeatureItem;
  index: number;
  colors: any;
  borderRadius: string;
  onNavigate?: (href: string) => void;
  imageHeight: number;
  imageObjectFit: ObjectFit;
  cardBorderSize?: number;
  cardBorderOpacity?: number;
}) => {
  const isWide = index === 0 || index === 3 || index === 4;
  const isExternal = feature.linkUrl?.startsWith('http');
  const hasBorder = cardBorderSize > 0;
  
  // Calculate border color with opacity
  const borderColor = colors?.borderColor ? hexToRgba(colors.borderColor, cardBorderOpacity / 100) : 'transparent';

  return (
    <div
      className={`group relative overflow-hidden cursor-pointer ${isWide ? 'md:col-span-2' : 'col-span-1'} transition-all duration-500 rounded-tl-none rounded-tr-[3rem] rounded-bl-[3rem] rounded-br-[3rem] hover:rounded-none`}
      style={{ height: `${isWide ? imageHeight + 40 : imageHeight}px`, backgroundColor: colors?.cardBackground || '#fef08a', borderWidth: hasBorder ? `${cardBorderSize}px` : '0px', borderStyle: hasBorder ? 'solid' : 'none', borderColor }}
    >
      {/* Full-bleed background image or gradient */}
      {isPendingImage(feature.imageUrl) ? (
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-50 bg-gradient-to-br from-yellow-100 to-yellow-300" />
      ) : (
        <img
          src={feature.imageUrl}
          alt={feature.title}
          className={`absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105 ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
        />
      )}

      {/* Content overlay */}
      <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between z-10">
        <div className="flex flex-col mt-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 opacity-80" style={{ color: colors?.cardText || '#000' }}>
            {feature.description?.substring(0, 25) || 'LATEST NEWS'}
          </p>
          <h3
            className={`${isWide ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'} font-light mb-6 font-header`}
            style={{
              color: colors?.cardHeading || '#000',
              textTransform: 'var(--headings-transform, none)' as any,
              letterSpacing: 'var(--headings-spacing, normal)'
            }}
          >
            {feature.title}
          </h3>
          
          <div className="mt-auto">
            {feature.linkUrl && (
              <a
                href={feature.linkUrl}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (onNavigate && feature.linkUrl && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                    e.preventDefault();
                    onNavigate(feature.linkUrl);
                  }
                }}
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-6 py-2 border rounded-full transition-colors hover:bg-black/5"
                style={{ borderColor: colors?.cardText || '#000', color: colors?.cardText || '#000' }}
              >
                <span>{feature.linkText || 'Learn More'}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeaturesProps extends FeaturesData {
  borderRadius: BorderRadiusSize;
  onNavigate?: (href: string) => void;
}

const Features: React.FC<FeaturesProps> = ({
  glassEffect,
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
  imageHeight = 430,
  imageObjectFit = 'cover',
  featuresVariant = 'classic',
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  overlayTextAlignment = 'left',
  showSectionHeader = true,
  showNumbering = true,
  layoutAlignment = 'left',
  cardGlow,
  cardBorderSize = 0,
  cardBorderOpacity = 100,
  onNavigate,
  isPreview
}) => {
  if (featuresVariant === 'cinematic-gym') {
    return <FeaturesCinematicGym {...{ title, description, items, paddingY, paddingX, colors, titleFontSize, descriptionFontSize, gridColumns, imageHeight, imageObjectFit, layoutAlignment, isPreview }} />;
  }

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
    cardHeading: (colors as any)?.cardHeading,
    cardText: (colors as any)?.cardText,
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
        className="w-full relative overflow-hidden"
        style={{ backgroundColor: actualColors.background }}
      >
        {/* Optional Section Header */}
        {showSectionHeader && (title?.trim() || description?.trim()) && (
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
          {(items || []).map((feature, index) => (
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
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </section>
    );
  }

  // --- RENDERIZADO BENTO OVERLAY ---
  if (featuresVariant === 'bento-overlay') {
    return (
      <section id="features" className={`w-full ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background || "#0f172a", 0.4) : actualColors.background }}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative">
            {(title?.trim() || description?.trim()) && (
              <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="max-w-2xl">
                  {title && (
                    <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bento Overlay Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-4 md:gap-5`}>
              {(items || []).map((feature, index) => (
                <BentoOverlayCard
                  key={index}
                  feature={feature}
                  index={index}
                  colors={actualColors}
                  borderRadius={borderRadiusClasses[borderRadius]}
                  showNumbering={showNumbering}
                  onNavigate={onNavigate}
                  imageHeight={imageHeight}
                  imageObjectFit={imageObjectFit}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- RENDERIZADO NEON GLOW ---
  if (featuresVariant === 'neon-glow') {
    const glowConfig = {
      enabled: cardGlow?.enabled !== false,
      color: cardGlow?.color || '#144CCD',
      intensity: cardGlow?.intensity ?? 100,
      borderRadius: cardGlow?.borderRadius ?? 80,
      gradientStart: cardGlow?.gradientStart || '#0A0909',
      gradientEnd: cardGlow?.gradientEnd || '#09101F'
    };

    const neonStyles = getNeonGlowStyles(glowConfig);

    return (
      <section id="features" className={`w-full bg-black ${glassEffect ? 'backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative z-10">
            {/* Header section with glow accents */}
            {(title?.trim() || description?.trim()) && (
              <div className="mb-20 max-w-3xl">
                {title && (
                  <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-6 text-white font-header`} style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className={`${descriptionSizeClasses[descriptionFontSize]} border-l-4 pl-6 text-gray-400 font-body`} style={{ borderColor: glowConfig.color || actualColors.accent }}>
                    {description}
                  </p>
                )}
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-8`}>
              {(items || []).map((feature, index) => (
                <div
                  key={index}
                  className={`
                    relative flex flex-col h-full p-8 md:p-10
                    transform transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]
                    ${getAnimationClass(animationType, enableCardAnimation)}
                  `}
                  style={{
                    ...neonStyles,
                    animationDelay: getAnimationDelay(index)
                  }}
                >
                  {/* Outer glow effect under the card if enabled */}
                  {glowConfig.enabled && (
                    <div 
                      className="absolute inset-0 -z-10 rounded-full blur-[120px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40" 
                      style={{ backgroundColor: glowConfig.color }} 
                    />
                  )}

                  <div className="flex-grow relative z-10 flex flex-col justify-between">
                    <div>
                      {/* Image or Icon container with inner glow */}
                      <div 
                        className="mb-8 overflow-hidden relative"
                        style={{
                          borderRadius: `${(glowConfig.borderRadius || 24) * 0.5}px`,
                          height: `${imageHeight}px`
                        }}
                      >
                        {isPendingImage(feature.imageUrl) ? (
                          <ImagePlaceholder
                            aspectRatio="video"
                            showGenerateButton={false}
                            className="h-full"
                          />
                        ) : (
                          <>
                            <img
                              src={feature.imageUrl}
                              alt={feature.title}
                              className={`h-full w-full transition-transform duration-700 hover:scale-110 ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
                            />
                            {/* Color overlay matching the glow */}
                            <div 
                              className="absolute inset-0 opacity-20 mix-blend-color pointer-events-none"
                              style={{ backgroundColor: glowConfig.color }}
                            />
                            {/* Inner shadow for the image */}
                            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none" />
                          </>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-4 font-header text-white" style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                        {feature.title}
                      </h3>
                      <p className="leading-relaxed font-light font-body text-gray-400 mb-6">
                        {feature.description}
                      </p>
                    </div>

                    {feature.linkUrl && (
                      <a
                        href={feature.linkUrl}
                        target={feature.linkUrl.startsWith('http') ? '_blank' : undefined}
                        rel={feature.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        onClick={(e) => {
                          if (onNavigate && feature.linkUrl && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                            e.preventDefault();
                            onNavigate(feature.linkUrl);
                          }
                        }}
                        className="inline-flex items-center gap-2 text-sm font-bold group/link transition-all"
                        style={{ color: glowConfig.color || actualColors.accent }}
                      >
                        <span className="hover:text-white transition-colors">{feature.linkText || 'Learn more'}</span>
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- RENDERIZADO PRESS RELEASE ---
  if (featuresVariant === 'press-release') {
    return (
      <section id="features" className={`w-full ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background || "#0f172a", 0.4) : actualColors.background }}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative z-10">
            {(title?.trim() || description?.trim()) && (
              <div className="mb-20 max-w-3xl text-center mx-auto">
                {title && (
                  <h2 className={`${titleSizeClasses[titleFontSize]} font-black tracking-[0.2em] uppercase mb-4 font-header`} style={{ color: safeColors.heading }}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body opacity-80`} style={{ color: safeColors.description }}>
                    {description}
                  </p>
                )}
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-4 md:gap-5`}>
              {(items || []).map((feature, index) => (
                <PressReleaseCard
                  key={index}
                  feature={feature}
                  index={index}
                  colors={{ ...actualColors, heading: safeColors.cardHeading, text: safeColors.cardText }}
                  borderRadius={borderRadiusClasses[borderRadius]}
                  onNavigate={onNavigate}
                  imageHeight={imageHeight}
                  imageObjectFit={imageObjectFit}
                  cardBorderSize={cardBorderSize}
                  cardBorderOpacity={cardBorderOpacity}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- RENDERIZADO MODERNO ---
  if (featuresVariant === 'modern') {
    return (
      <section id="features" className={`w-full ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background || "#0f172a", 0.4) : actualColors.background }}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative z-10">
            {(title?.trim() || description?.trim()) && (
              <div className="mb-20 max-w-3xl">
                {title && (
                  <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-6`} style={{ color: safeColors.heading }}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className={`${descriptionSizeClasses[descriptionFontSize]} border-l-4 pl-6`} style={{ color: safeColors.description, borderColor: actualColors.accent }}>
                    {description}
                  </p>
                )}
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-6`}>
              {(items || []).map((feature, index) => (
                <ModernFeatureCard
                  key={index}
                  feature={feature}
                  index={index}
                  colors={{ ...actualColors, heading: safeColors.cardHeading, text: safeColors.cardText }}
                  borderRadius={borderRadiusClasses[borderRadius]}
                  onNavigate={onNavigate}
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
      <section id="features" className={`w-full ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background || "#0f172a", 0.4) : actualColors.background }}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative">
            {/* Section Header con línea decorativa */}
            {(title?.trim() || description?.trim()) && (
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
                <div className="max-w-2xl">
                  {title && (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${actualColors.accent}, transparent)` }} />
                        <span className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: actualColors.accent }}>Features</span>
                        <div className="h-px w-12" style={{ background: `linear-gradient(to right, ${actualColors.accent}, transparent)` }} />
                      </div>
                      <h2 className={`${titleSizeClasses[titleFontSize]} font-black tracking-tight leading-[1.1] font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                        {title}
                      </h2>
                    </>
                  )}
                </div>
                {description && (
                  <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-md font-body`} style={{ color: safeColors.description }}>
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Bento Grid Premium */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-4 md:gap-6`}>
              {(items || []).map((feature, index) => {
                const isLarge = index === 0 || index === 3 || index === 6;

                return (
                  <div
                    key={index}
                    className={`
                      group relative overflow-hidden cursor-pointer
                      ${isLarge ? 'md:col-span-2' : 'col-span-1'}
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
                    <div className={`overflow-hidden ${isLarge ? 'aspect-[21/9]' : 'aspect-[4/3]'}`}>
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

                      {/* Arrow indicator / Link */}
                      {feature.linkUrl ? (
                        <a
                          href={feature.linkUrl}
                          target={feature.linkUrl.startsWith('http') ? '_blank' : undefined}
                          rel={feature.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                          onClick={(e) => {
                            if (onNavigate && !feature.linkUrl.startsWith('http://') && !feature.linkUrl.startsWith('https://')) {
                              e.preventDefault();
                              onNavigate(feature.linkUrl);
                            }
                          }}
                          className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300"
                          style={{ color: actualColors.accent }}
                        >
                          <span className="text-sm font-semibold">{feature.linkText || 'Learn more'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      ) : (
                        <div
                          className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300"
                          style={{ color: actualColors.accent }}
                        >
                          <span className="text-sm font-semibold">Learn more</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
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
    <section id="features" className={`w-full ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background || "#0f172a", 0.4) : actualColors.background }}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        {(title?.trim() || description?.trim()) && (
          <div className="text-center max-w-3xl mx-auto mb-16">
            {title && (
              <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
            )}
            {description && (
              <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
                {description}
              </p>
            )}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-8`}>
          {(items || []).map((feature, index) => (
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
              linkUrl={feature.linkUrl}
              linkText={feature.linkText}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;