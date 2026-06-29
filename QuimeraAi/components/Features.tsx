import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FeaturesData, PaddingSize, BorderRadiusSize, FontSize, ObjectFit, AnimationType, TextAlignment, FeatureItem } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { hexToRgba, getNeonGlowStyles } from '../utils/colorUtils';
import { ArrowRight, Check } from 'lucide-react';
import FeaturesCinematicGym from './cinematic/FeaturesCinematicGym';
import { getIconComponent } from './ui/IconSelector';
import { getCardPaddingStyle } from '../utils/cardPadding';

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
  cardPaddingStyle?: React.CSSProperties;
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

const EDITORIAL_MOSAIC_IMAGE_ASPECT_RATIO = '3 / 4';
const EDITORIAL_MOSAIC_INFO_ASPECT_RATIO = '1 / 1';

const getEditorialMosaicClampStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

// Text alignment classes for overlay variant
const textAlignmentClasses: Record<TextAlignment, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

const normalizeFeatureIconName = (icon?: string) => {
  if (!icon || icon === 'none') return 'sparkles';
  return icon
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
};

const FeatureIconMark = ({
  icon,
  color,
  size = 24,
  className = '',
}: {
  icon?: string;
  color: string;
  size?: number;
  className?: string;
}) => (
  <span className={`inline-flex shrink-0 items-center justify-center ${className}`} style={{ color }}>
    {getIconComponent(normalizeFeatureIconName(icon), size)}
  </span>
);

const FeatureImagePanel = ({
  feature,
  aspectRatio,
  className = '',
  imageObjectFit,
  backgroundColor = 'transparent',
  borderColor,
}: {
  feature: FeatureItem;
  aspectRatio: string;
  className?: string;
  imageObjectFit: ObjectFit;
  backgroundColor?: string;
  borderColor?: string;
}) => (
  <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio, backgroundColor, borderColor }}>
    {isPendingImage(feature.imageUrl) ? (
      <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className="absolute inset-0 h-full w-full" />
    ) : (
      <img
        src={feature.imageUrl}
        alt={feature.title}
        className={`absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105 ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
      />
    )}
  </div>
);

const FeatureLink = ({
  feature,
  color,
  onNavigate,
  className = '',
}: {
  feature: FeatureItem;
  color: string;
  onNavigate?: (href: string) => void;
  className?: string;
}) => {
  if (!feature.linkUrl) return null;
  const isExternal = feature.linkUrl.startsWith('http');
  return (
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
      className={`inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75 ${className}`}
      style={{ color }}
    >
      <span>{feature.linkText || 'Learn more'}</span>
      <ArrowRight className="h-4 w-4" />
    </a>
  );
};

const getFeatureBullets = (feature: FeatureItem): string[] => {
  if (Array.isArray(feature.bullets) && feature.bullets.length > 0) {
    return feature.bullets.filter(Boolean).slice(0, 4);
  }
  if (!feature.description) return [];
  const parts = feature.description
    .split(/[.;]\s+/)
    .map(part => part.trim())
    .filter(part => part.length > 2);
  return parts.length > 1 ? parts.slice(0, 3) : [feature.description];
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
  onNavigate,
  cardPaddingStyle
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  const isExternal = linkUrl?.startsWith('http');

  return (
    <div
      className={`border transform hover:-translate-y-2 transition-transform duration-300 overflow-hidden backdrop-blur-xl ${borderRadiusClasses[borderRadius]} ${animationClass}`}
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
      <div className="p-8" style={cardPaddingStyle}>
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
const ModernFeatureCard = ({ feature, index, colors, borderRadius, onNavigate, cardPaddingStyle }: { feature: any, index: number, colors: any, borderRadius: string, onNavigate?: (href: string) => void, cardPaddingStyle?: React.CSSProperties }) => {
  // Patrón Bento: El 1º (0) y el 4º (3) ocupan 2 columnas
  const isWide = index === 0 || index === 3 || index === 6;
  const isExternal = feature.linkUrl?.startsWith('http');

  return (
    <div className={`group relative overflow-hidden border p-8 transition-all duration-500 backdrop-blur-xl ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`} style={{ ...cardPaddingStyle, borderColor: colors?.borderColor, backgroundColor: hexToRgba(colors?.cardBackground || '#1f2937', 0.35) }}>
      {/* Efecto Glow sutil */}
      <div
        className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full blur-[100px] transition-all duration-500"
        style={{
          opacity: 0.5,
          background: `radial-gradient(circle, ${hexToRgba(colors?.glowColor || colors?.accent || colors?.cardHeading || '#ffffff', 0.24)} 0%, transparent 68%)`,
        }}
      />

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
    overlayText?: string;
    overlayMuted?: string;
    overlayScrim?: string;
  };
  imageHeight: number;
  imageObjectFit: ObjectFit;
  textAlignment: TextAlignment;
  animationType?: AnimationType;
  enableAnimation?: boolean;
  onNavigate?: (href: string) => void;
  cardPaddingStyle?: React.CSSProperties;
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
  onNavigate,
  cardPaddingStyle
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
        className="absolute inset-0 opacity-70 group-hover:opacity-90 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to top, ${hexToRgba(colors.overlayScrim || '#000000', 0.82)} 0%, ${hexToRgba(colors.overlayScrim || '#000000', 0.32)} 48%, transparent 100%)`,
        }}
      />

      {/* Text overlay - position based on alignment */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 flex flex-col ${textAlignmentClasses[textAlignment]}`} style={cardPaddingStyle}>
        <h3
          className="text-xl md:text-2xl font-bold mb-2 font-header drop-shadow-lg"
          style={{
            color: colors.overlayText || '#ffffff',
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)'
          }}
        >
          {feature.title}
        </h3>
        <p
          className="text-sm md:text-base font-body max-w-md drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2"
          style={{ color: colors.overlayMuted || colors.overlayText || '#ffffff' }}
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
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-75"
            style={{ color: colors.overlayText || '#ffffff' }}
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
const BentoOverlayCard = ({ feature, index, colors, borderRadius, showNumbering, onNavigate, imageHeight, imageObjectFit, cardPaddingStyle }: {
  feature: FeatureItem;
  index: number;
  colors: any;
  borderRadius: string;
  showNumbering?: boolean;
  onNavigate?: (href: string) => void;
  imageHeight: number;
  imageObjectFit: ObjectFit;
  cardPaddingStyle?: React.CSSProperties;
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
        className="absolute inset-0 opacity-80 group-hover:opacity-95 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to top, ${hexToRgba(colors?.cardGradientEnd || colors?.background || '#000000', 0.85)} 0%, ${hexToRgba(colors?.cardGradientEnd || colors?.background || '#000000', 0.4)} 48%, ${hexToRgba(colors?.cardGradientStart || colors?.background || '#000000', 0.1)} 100%)`,
        }}
      />

      {/* Hover accent glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(colors?.accent || '#4f46e5', 0.15)}, transparent 60%)`
        }}
      />

      {/* Text overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10 flex flex-col" style={cardPaddingStyle}>
        <h3
          className={`${isWide ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'} font-bold mb-2 font-header drop-shadow-lg group-hover:translate-x-1 transition-transform duration-300`}
          style={{
            color: colors?.overlayText || colors?.cardHeading || '#ffffff',
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)'
          }}
        >
          {feature.title}
        </h3>
        <p
          className="text-sm md:text-base font-body drop-shadow-md max-w-lg line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ color: colors?.overlayMuted || colors?.cardText || '#ffffff' }}
        >
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
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-75"
            style={{ color: colors?.overlayText || colors?.cardHeading || '#ffffff' }}
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
const PressReleaseCard = ({ feature, index, colors, borderRadius, onNavigate, imageHeight, imageObjectFit, cardBorderSize = 0, cardBorderOpacity = 100, cardPaddingStyle }: {
  feature: FeatureItem;
  index: number;
  colors: any;
  borderRadius: string;
  onNavigate?: (href: string) => void;
  imageHeight: number;
  imageObjectFit: ObjectFit;
  cardBorderSize?: number;
  cardBorderOpacity?: number;
  cardPaddingStyle?: React.CSSProperties;
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
      <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between z-10" style={cardPaddingStyle}>
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
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-6 py-2 border rounded-full transition-opacity hover:opacity-75"
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

// --- Editorial Mosaic Style ---
const EditorialMosaicFeatureCard = ({ feature, index, colors, borderRadius, onNavigate, imageObjectFit, animationType = 'fade-in-up', enableAnimation = true, cardPaddingStyle }: {
  feature: FeatureItem;
  index: number;
  colors: any;
  borderRadius: string;
  onNavigate?: (href: string) => void;
  imageObjectFit: ObjectFit;
  animationType?: AnimationType;
  enableAnimation?: boolean;
  cardPaddingStyle?: React.CSSProperties;
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  const delay = getAnimationDelay(index, 0.08);
  const isExternal = feature.linkUrl?.startsWith('http');
  const imageFirst = index % 2 === 0;
  const cardBackground = colors?.cardBackground || '#ffffff';
  const cardHeading = colors?.cardHeading || colors?.heading || '#242424';
  const cardText = colors?.cardText || colors?.text || '#3f3a33';
  const borderColor = colors?.borderColor || 'transparent';

  const imagePanel = (
    <div
      className={`group relative overflow-hidden border ${borderRadius}`}
      style={{
        aspectRatio: EDITORIAL_MOSAIC_IMAGE_ASPECT_RATIO,
        backgroundColor: cardBackground,
        borderColor,
      }}
    >
      {isPendingImage(feature.imageUrl) ? (
        <ImagePlaceholder aspectRatio="3:4" showGenerateButton={false} className="absolute inset-0 h-full w-full" />
      ) : (
        <img
          src={feature.imageUrl}
          alt={feature.title}
          className={`absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105 ${objectFitClasses[imageObjectFit] || 'object-cover'}`}
        />
      )}
    </div>
  );

  const textPanel = (
    <div
      className={`border p-5 sm:p-6 ${borderRadius}`}
      style={{
        ...cardPaddingStyle,
        aspectRatio: EDITORIAL_MOSAIC_INFO_ASPECT_RATIO,
        backgroundColor: cardBackground,
        borderColor,
      }}
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-4">
        <div className="min-h-0">
          <h3
            className="text-xl md:text-2xl font-header font-semibold leading-tight"
            style={{
              color: cardHeading,
              textTransform: 'var(--headings-transform, none)' as any,
              letterSpacing: 'var(--headings-spacing, normal)',
              ...getEditorialMosaicClampStyle(2),
            }}
          >
            {feature.title}
          </h3>
          {feature.description && (
            <p
              className="mt-3 text-sm font-body leading-relaxed"
              style={{
                color: cardText,
                ...getEditorialMosaicClampStyle(4),
              }}
            >
              {feature.description}
            </p>
          )}
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
            className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
            style={{ color: colors?.accent || cardHeading }}
          >
            <span>{feature.linkText || 'Learn more'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <article
      className={`break-inside-avoid ${animationClass}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex flex-col gap-3">
        {imageFirst ? (
          <>
            {imagePanel}
            {textPanel}
          </>
        ) : (
          <>
            {textPanel}
            {imagePanel}
          </>
        )}
      </div>
    </article>
  );
};

interface FeaturesProps extends FeaturesData {
  borderRadius: BorderRadiusSize;
  onNavigate?: (href: string) => void;
  isPreview?: boolean;
}

const Features: React.FC<FeaturesProps> = ({
  glassEffect,
  title: rawTitle,
  description: rawDescription,
  items: rawItems,
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
  isPreview,
  cardPadding,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft
}) => {
  const { i18n } = useTranslation();
  
  const resolveText = (text: any) => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text !== null) {
      const preferred = i18n.language?.startsWith('es') ? 'es' : 'en';
      return text[preferred] || text.es || text.en || Object.values(text)[0] || '';
    }
    return String(text);
  };

  const title = resolveText(rawTitle);
  const description = resolveText(rawDescription);
  const items = (rawItems || []).map(item => ({
    ...item,
    title: resolveText(item.title),
    description: resolveText(item.description),
    eyebrow: resolveText((item as any).eyebrow),
    badge: resolveText((item as any).badge),
    metric: resolveText((item as any).metric),
    linkText: resolveText(item.linkText),
    bullets: Array.isArray((item as any).bullets)
      ? (item as any).bullets.map((bullet: any) => resolveText(bullet)).filter(Boolean)
      : undefined,
  }));
  const cardPaddingStyle = getCardPaddingStyle({ cardPadding, cardPaddingTop, cardPaddingRight, cardPaddingBottom, cardPaddingLeft }, 32);

  if (featuresVariant === 'cinematic-gym') {
    return <FeaturesCinematicGym {...{ title, description, items, paddingY, paddingX, colors, titleFontSize, descriptionFontSize, gridColumns, imageHeight, imageObjectFit, layoutAlignment, isPreview, cardPadding, cardPaddingTop, cardPaddingRight, cardPaddingBottom, cardPaddingLeft }} />;
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
    glowColor: (colors as any)?.glowColor || colors?.accent || primaryColor,
    cardGradientStart: (colors as any)?.cardGradientStart || colors?.cardBackground || colors?.background || primaryColor,
    cardGradientEnd: (colors as any)?.cardGradientEnd || colors?.background || colors?.cardBackground || primaryColor,
    overlayText: (colors as any)?.overlayText,
    overlayMuted: (colors as any)?.overlayMuted,
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
      overlayText: actualColors.overlayText || actualColors.cardHeading || actualColors.heading || '#ffffff',
      overlayMuted: actualColors.overlayMuted || actualColors.cardText || actualColors.description || actualColors.text || '#d1d5db',
    };
  }, [actualColors]);

  const glassSectionClass = `w-full ${glassEffect ? 'backdrop-blur-xl border-y z-20' : ''}`;
  const getSectionStyle = (fallbackBackground = actualColors.background, glassOpacity = 0.55): React.CSSProperties => ({
    backgroundColor: glassEffect
      ? hexToRgba(actualColors.background || fallbackBackground, glassOpacity)
      : actualColors.background,
    borderColor: glassEffect
      ? hexToRgba(actualColors.borderColor || actualColors.accent || actualColors.cardBackground || actualColors.background || fallbackBackground, 0.16)
      : undefined,
    boxShadow: glassEffect
      ? `0 4px 30px ${hexToRgba(actualColors.background || fallbackBackground, 0.1)}`
      : undefined,
  });

  // Responsive grid columns - mobile-first approach
  const gridColsClasses: Record<number, string> = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  if (featuresVariant === 'gallery-strip') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-14 grid gap-8 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.6fr)] lg:items-start">
              {description && (
                <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-md font-body leading-relaxed`} style={{ color: safeColors.description }}>
                  {description}
                </p>
              )}
              {title && (
                <h2 className={`${titleSizeClasses[titleFontSize]} max-w-5xl font-header font-normal leading-[1.02]`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                  {title}
                </h2>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((feature, index) => (
              <article key={index} className={`${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                <FeatureImagePanel feature={feature} aspectRatio="4 / 5" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} className={borderRadiusClasses[borderRadius]} />
                <div className="pt-4">
                  <h3 className="font-header text-lg font-semibold" style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{feature.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                  <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-3" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'visual-proof-grid') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mx-auto mb-14 max-w-4xl text-center">
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-semibold leading-tight`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mx-auto mt-4 max-w-2xl font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClasses[gridColumns] || 'lg:grid-cols-3'} gap-5 md:gap-6`}>
            {items.map((feature, index) => (
              <article key={index} className={`${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                <FeatureImagePanel feature={feature} aspectRatio="16 / 9" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} borderColor={actualColors.borderColor} className={`${borderRadiusClasses[borderRadius]} border p-4`} />
                <div className="pt-5">
                  <h3 className="font-header text-xl font-semibold" style={{ color: safeColors.heading }}>{feature.title}</h3>
                  <p className="mt-2 font-body text-base leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'strategy-cards') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-16 grid gap-6 lg:grid-cols-[0.32fr_1fr] lg:items-start">
              <div>
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: actualColors.accent, borderColor: actualColors.borderColor || hexToRgba(actualColors.accent, 0.25), backgroundColor: hexToRgba(actualColors.accent, 0.08) }}>
                  <span className="h-2 w-2" style={{ backgroundColor: actualColors.accent }} />
                  {items[0]?.eyebrow || 'Approach'}
                </span>
              </div>
              <div className="max-w-5xl">
                {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-normal leading-[1.05]`} style={{ color: safeColors.heading }}>{title}</h2>}
                {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-8 max-w-3xl font-body leading-relaxed`} style={{ color: safeColors.description }}>{description}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {items.slice(0, 3).map((feature, index) => {
              const isPrimary = index === 0;
              const cardBg = isPrimary ? (actualColors.cardBackground || actualColors.heading || '#111827') : hexToRgba(actualColors.cardBackground || '#ffffff', isPrimary ? 1 : 0.82);
              const cardHeading = isPrimary ? actualColors.background || '#ffffff' : safeColors.cardHeading;
              const cardText = isPrimary ? hexToRgba(actualColors.background || '#ffffff', 0.78) : safeColors.cardText;
              return (
                <article key={index} className={`flex min-h-[320px] flex-col justify-between border p-8 ${borderRadiusClasses[borderRadius]} ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index), backgroundColor: cardBg, borderColor: actualColors.borderColor || 'transparent' }}>
                  <FeatureIconMark icon={feature.icon} color={isPrimary ? actualColors.background || '#ffffff' : safeColors.heading} size={38} className="h-12 w-12" />
                  <div>
                    <p className="mb-5 font-body text-xs uppercase tracking-[0.18em]" style={{ color: cardText }}>{feature.eyebrow || `Strategy ${index + 1}`}</p>
                    <h3 className="font-header text-2xl font-semibold leading-tight" style={{ color: cardHeading }}>{feature.title}</h3>
                    <p className="mt-5 font-body text-base leading-relaxed" style={{ color: cardText }}>{feature.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'offer-showcase') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.6)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
                {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-2 font-body`} style={{ color: safeColors.description }}>{description}</p>}
              </div>
              {(items[0]?.linkUrl || items[0]?.linkText) && <FeatureLink feature={items[0]} color={safeColors.heading} onNavigate={onNavigate} className="rounded-full px-5 py-2 text-xs" />}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {items.slice(0, 3).map((feature, index) => (
              <article key={index} className={`group relative min-h-[520px] overflow-hidden border p-8 ${borderRadiusClasses[borderRadius]} ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index), backgroundColor: actualColors.cardBackground || '#f8fafc', borderColor: actualColors.borderColor || 'transparent' }}>
                {!isPendingImage(feature.imageUrl) && (
                  <img src={feature.imageUrl} alt={feature.title} className={`absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105 ${objectFitClasses[imageObjectFit] || 'object-cover'}`} />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${hexToRgba(actualColors.cardBackground || actualColors.background || '#ffffff', 0.88)} 0%, ${hexToRgba(actualColors.cardBackground || actualColors.background || '#ffffff', 0.42)} 42%, ${hexToRgba(actualColors.cardBackground || actualColors.background || '#ffffff', 0.05)} 100%)` }} />
                <div className="relative z-10 max-w-md">
                  <h3 className="font-header text-3xl font-semibold leading-tight" style={{ color: safeColors.cardHeading }}>{feature.title}</h3>
                  <p className="mt-4 font-body text-base leading-relaxed" style={{ color: safeColors.cardText }}>{feature.description}</p>
                  <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-7 rounded-full px-5 py-2 text-xs" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'product-highlights') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-16 max-w-xl">
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-normal leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-6 font-body leading-relaxed`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((feature, index) => (
              <article key={index} className={`${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                <FeatureImagePanel feature={feature} aspectRatio="4 / 5" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} borderColor={actualColors.borderColor} className={`${borderRadiusClasses[borderRadius]} border`} />
                <h3 className="mt-5 font-header text-lg font-semibold" style={{ color: safeColors.heading }}>{feature.title}</h3>
                <p className="mt-5 font-body text-sm leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-5" />
                {feature.badge && <span className="mt-4 inline-flex rounded-full px-3 py-1 text-xs" style={{ color: safeColors.cardText, backgroundColor: hexToRgba(actualColors.cardBackground || actualColors.accent, 0.18) }}>{feature.badge}</span>}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'icon-columns') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {title && <h2 className={`${titleSizeClasses[titleFontSize]} mx-auto mb-16 max-w-4xl text-center font-header font-normal leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
          <div className={`grid grid-cols-1 gap-12 md:grid-cols-3`}>
            {items.slice(0, 3).map((feature, index) => (
              <article key={index} className={`${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                <FeatureIconMark icon={feature.icon} color={safeColors.heading} size={64} className="mb-8 h-20 w-20" />
                <h3 className="font-header text-2xl font-normal" style={{ color: safeColors.heading }}>{feature.title}</h3>
                <p className="mt-5 font-body text-base leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-8" />
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'dark-showcase') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-10 max-w-3xl">
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-semibold`} style={{ color: safeColors.heading }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((feature, index) => (
              <article key={index} className={`border-y py-6 ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index), borderColor: hexToRgba(actualColors.borderColor || '#ffffff', 0.18) }}>
                <div className="relative">
                  <FeatureImagePanel feature={feature} aspectRatio="4 / 5" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} className={borderRadiusClasses[borderRadius]} />
                  {feature.linkUrl && (
                    <FeatureLink
                      feature={feature}
                      color={safeColors.overlayText}
                      onNavigate={onNavigate}
                      className="absolute bottom-4 right-4 rounded-full px-3 py-3 text-xs backdrop-blur-md"
                    />
                  )}
                </div>
                <h3 className="mt-5 font-header text-lg font-semibold" style={{ color: safeColors.heading }}>{feature.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'split-list') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto max-w-6xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mx-auto mb-16 max-w-3xl text-center">
              {items[0]?.eyebrow && <span className="mb-5 inline-flex rounded-full px-4 py-2 text-xs font-semibold" style={{ color: actualColors.accent, backgroundColor: hexToRgba(actualColors.accent, 0.1) }}>{items[0].eyebrow}</span>}
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className="space-y-8">
            {items.map((feature, index) => (
              <article key={index} className={`grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)] md:items-center ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                <FeatureImagePanel feature={feature} aspectRatio="21 / 9" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} className={borderRadiusClasses[borderRadius]} />
                <div className="border-l pl-8" style={{ borderColor: hexToRgba(actualColors.borderColor || actualColors.accent, 0.25) }}>
                  <FeatureIconMark icon={feature.icon} color={safeColors.heading} size={24} className="mb-8 h-8 w-8" />
                  <h3 className="font-header text-2xl font-semibold leading-tight" style={{ color: safeColors.heading }}>{feature.title}</h3>
                  <p className="mt-6 font-body text-base leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'app-showcase') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto max-w-7xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="grid gap-14 lg:grid-cols-2">
            {items.slice(0, 4).map((feature, index) => {
              const imageFirst = index % 2 === 0;
              const media = <FeatureImagePanel feature={feature} aspectRatio="4 / 3" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} borderColor={actualColors.borderColor} className={`${borderRadiusClasses[borderRadius]} border`} />;
              const copy = (
                <div className="flex flex-col justify-center">
                  {feature.eyebrow && <span className="mb-5 w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: safeColors.cardText, borderColor: actualColors.borderColor }}>{feature.eyebrow}</span>}
                  <h3 className={`${index < 2 ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-header font-bold leading-tight`} style={{ color: safeColors.heading }}>{feature.title}</h3>
                  <p className="mt-6 font-body text-base leading-relaxed" style={{ color: safeColors.description }}>{feature.description}</p>
                  <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-8" />
                </div>
              );
              return (
                <article key={index} className={`grid min-h-[360px] gap-8 ${index < 2 ? '' : 'lg:pt-16'} ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index) }}>
                  {imageFirst ? <>{copy}{media}</> : <>{media}{copy}</>}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'metrics-panel') {
    const heroFeature = items[0];
    const supportFeatures = items.slice(0, 3);
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto max-w-6xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mb-10 max-w-3xl">
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-normal leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          {heroFeature && (
            <div className={`overflow-hidden border ${borderRadiusClasses[borderRadius]}`} style={{ borderColor: actualColors.borderColor || 'transparent', backgroundColor: actualColors.cardBackground || '#ffffff' }}>
              <FeatureImagePanel feature={heroFeature} aspectRatio="16 / 9" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} className="rounded-none" />
              <div className="grid grid-cols-1 md:grid-cols-3">
                {supportFeatures.map((feature, index) => (
                  <article key={index} className="border-t p-7 md:border-l md:first:border-l-0" style={{ ...cardPaddingStyle, borderColor: hexToRgba(actualColors.borderColor || '#000000', 0.14), backgroundColor: index === 0 ? hexToRgba(actualColors.accent, 0.08) : 'transparent' }}>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-2.5 w-2.5" style={{ backgroundColor: index === 0 ? actualColors.accent : hexToRgba(actualColors.accent, 0.65) }} />
                      <h3 className="font-header text-lg font-semibold" style={{ color: safeColors.cardHeading }}>{feature.title}</h3>
                    </div>
                    <p className="font-body text-sm leading-relaxed" style={{ color: safeColors.cardText }}>{feature.description}</p>
                    <FeatureLink feature={feature} color={actualColors.accent} onNavigate={onNavigate} className="mt-5" />
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (featuresVariant === 'checklist-cards') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mx-auto mb-16 max-w-5xl text-center">
              {title && <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-bold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mx-auto mt-5 max-w-3xl font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {items.slice(0, 3).map((feature, index) => (
              <article key={index} className={`overflow-hidden border ${borderRadiusClasses[borderRadius]} ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ animationDelay: getAnimationDelay(index), backgroundColor: actualColors.cardBackground || '#f8fafc', borderColor: actualColors.borderColor || 'transparent' }}>
                <FeatureImagePanel feature={feature} aspectRatio="16 / 9" imageObjectFit={imageObjectFit} backgroundColor={actualColors.cardBackground} className="rounded-none" />
                <div className="p-7" style={cardPaddingStyle}>
                  <h3 className="font-header text-2xl font-bold" style={{ color: safeColors.cardHeading }}>{feature.title}</h3>
                  <ul className="mt-6 space-y-3">
                    {getFeatureBullets(feature).map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="flex items-start gap-3 font-body text-sm leading-relaxed" style={{ color: safeColors.cardText }}>
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ color: actualColors.accent, backgroundColor: hexToRgba(actualColors.accent, 0.14) }}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'dark-capability-grid') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto max-w-6xl ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mx-auto mb-16 max-w-4xl text-center">
              {title && (
                <h2
                  className={`${titleSizeClasses[titleFontSize]} font-header font-bold leading-tight`}
                  style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                >
                  {title}
                </h2>
              )}
              {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-5 font-body`} style={{ color: safeColors.description }}>{description}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((feature, index) => (
              <article key={index} className={`border p-8 ${borderRadiusClasses[borderRadius]} ${getAnimationClass(animationType, enableCardAnimation)}`} style={{ ...cardPaddingStyle, animationDelay: getAnimationDelay(index), backgroundColor: hexToRgba(actualColors.cardBackground || '#27272a', 0.72), borderColor: hexToRgba(actualColors.borderColor || '#ffffff', 0.08) }}>
                <FeatureIconMark icon={feature.icon} color={actualColors.accent} size={28} className="mb-8 h-8 w-8" />
                <h3 className="font-header text-xl font-semibold" style={{ color: safeColors.cardHeading }}>{feature.title}</h3>
                <p className="mt-5 font-body text-base leading-relaxed" style={{ color: safeColors.cardText }}>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuresVariant === 'editorial-mosaic') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background)}>
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          {(title?.trim() || description?.trim()) && (
            <div className="mx-auto mb-16 max-w-4xl text-center md:mb-20">
              {title && (
                <h2
                  className={`${titleSizeClasses[titleFontSize]} font-header font-normal leading-[1.05]`}
                  style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className={`${descriptionSizeClasses[descriptionFontSize]} mx-auto mt-6 max-w-2xl font-body`} style={{ color: safeColors.description }}>
                  {description}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(items || []).map((feature, index) => (
              <EditorialMosaicFeatureCard
                key={index}
                feature={feature}
                index={index}
                colors={{
                  ...actualColors,
                  cardBackground: actualColors.cardBackground,
                  cardHeading: safeColors.cardHeading,
                  cardText: safeColors.cardText,
                  heading: safeColors.cardHeading,
                  text: safeColors.cardText,
                  borderColor: actualColors.borderColor,
                }}
                borderRadius={borderRadiusClasses[borderRadius]}
                onNavigate={onNavigate}
                imageObjectFit={imageObjectFit}
                animationType={animationType}
                enableAnimation={enableCardAnimation}
                cardPaddingStyle={cardPaddingStyle}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

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
                accent: actualColors.accent,
                overlayText: safeColors.overlayText,
                overlayMuted: safeColors.overlayMuted,
                overlayScrim: actualColors.cardGradientEnd || actualColors.background,
              }}
              imageHeight={imageHeight}
              imageObjectFit={imageObjectFit}
              textAlignment={overlayTextAlignment}
              animationType={animationType}
              enableAnimation={enableCardAnimation}
              onNavigate={onNavigate}
              cardPaddingStyle={cardPaddingStyle}
            />
          ))}
        </div>
      </section>
    );
  }

  // --- RENDERIZADO BENTO OVERLAY ---
  if (featuresVariant === 'bento-overlay') {
    return (
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.4)}>
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
                  colors={{
                    ...actualColors,
                    overlayText: safeColors.overlayText,
                    overlayMuted: safeColors.overlayMuted,
                    cardHeading: safeColors.cardHeading,
                    cardText: safeColors.cardText,
                  }}
                  borderRadius={borderRadiusClasses[borderRadius]}
                  showNumbering={showNumbering}
                  onNavigate={onNavigate}
                  imageHeight={imageHeight}
                  imageObjectFit={imageObjectFit}
                  cardPaddingStyle={cardPaddingStyle}
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
      color: cardGlow?.color || actualColors.glowColor,
      intensity: cardGlow?.intensity ?? 100,
      borderRadius: cardGlow?.borderRadius ?? 80,
      gradientStart: cardGlow?.gradientStart || actualColors.cardGradientStart,
      gradientEnd: cardGlow?.gradientEnd || actualColors.cardGradientEnd
    };

    const neonStyles = getNeonGlowStyles(glowConfig);

    return (
      <section
        id="features"
        className={`w-full ${glassEffect ? 'backdrop-blur-xl border-y z-20' : ''}`}
        style={{
          backgroundColor: actualColors.background,
          borderColor: glassEffect ? hexToRgba(actualColors.borderColor || actualColors.glowColor, 0.18) : undefined,
          boxShadow: glassEffect ? `0 4px 30px ${hexToRgba(actualColors.background, 0.1)}` : undefined,
        }}
      >
        <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
          <div className="relative z-10">
            {/* Header section with glow accents */}
            {(title?.trim() || description?.trim()) && (
              <div className="mb-20 max-w-3xl">
                {title && (
                  <h2
                    className={`${titleSizeClasses[titleFontSize]} font-extrabold tracking-tight mb-6 font-header`}
                    style={{
                      color: safeColors.heading,
                      textTransform: 'var(--headings-transform, none)' as any,
                      letterSpacing: 'var(--headings-spacing, normal)',
                    }}
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    className={`${descriptionSizeClasses[descriptionFontSize]} border-l-4 pl-6 font-body`}
                    style={{ borderColor: glowConfig.color || actualColors.accent, color: safeColors.description }}
                  >
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
                    ...cardPaddingStyle,
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
                            aspectRatio="16:9"
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
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{ boxShadow: `inset 0 0 20px ${hexToRgba(actualColors.background, 0.5)}` }}
                            />
                          </>
                        )}
                      </div>
                      
                      <h3
                        className="text-2xl font-bold mb-4 font-header"
                        style={{
                          color: safeColors.cardHeading,
                          textTransform: 'var(--headings-transform, none)' as any,
                          letterSpacing: 'var(--headings-spacing, normal)',
                        }}
                      >
                        {feature.title}
                      </h3>
                      <p className="leading-relaxed font-light font-body mb-6" style={{ color: safeColors.cardText }}>
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
                        <span className="transition-opacity hover:opacity-75">{feature.linkText || 'Learn more'}</span>
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
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.4)}>
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
                  colors={{ ...actualColors, heading: safeColors.cardHeading, text: safeColors.cardText, cardHeading: safeColors.cardHeading, cardText: safeColors.cardText }}
                  borderRadius={borderRadiusClasses[borderRadius]}
                  onNavigate={onNavigate}
                  imageHeight={imageHeight}
                  imageObjectFit={imageObjectFit}
                  cardBorderSize={cardBorderSize}
                  cardBorderOpacity={cardBorderOpacity}
                  cardPaddingStyle={cardPaddingStyle}
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
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.4)}>
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
                  cardPaddingStyle={cardPaddingStyle}
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
      <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.4)}>
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
                    <div className="relative z-20 p-6 md:p-8" style={cardPaddingStyle}>
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
    <section id="features" className={glassSectionClass} style={getSectionStyle(actualColors.background, 0.4)}>
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
              cardPaddingStyle={cardPaddingStyle}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
