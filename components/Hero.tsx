
import React from 'react';
import { HeroData, PaddingSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, FontSize, ServiceIcon } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import * as LucideIcons from 'lucide-react';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { hexToRgba } from '../utils/colorUtils';

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

const headlineSizeClasses: Record<FontSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-5xl',
  lg: 'text-4xl md:text-6xl',
  xl: 'text-5xl md:text-8xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg md:text-xl',
  xl: 'text-xl md:text-2xl',
};

const imageStyleClasses: Record<ImageStyle, string> = {
  default: '',
  'rounded-full': 'rounded-full',
  glow: 'rounded-2xl',
  float: 'rounded-2xl img-style-float',
  hexagon: 'img-style-hexagon',
  polaroid: 'block',
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

const borderSizeClasses: Record<BorderSize, string> = {
  none: 'border-0',
  sm: 'border-2',
  md: 'border-4',
  lg: 'border-8',
};

const justificationClasses: Record<JustifyContent, string> = {
  start: 'md:justify-start',
  center: 'md:justify-center',
  end: 'md:justify-end',
};

const aspectRatioClasses: Record<AspectRatio, string> = {
  auto: 'aspect-auto',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
};

const objectFitClasses: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};


interface HeroProps extends HeroData {
  borderRadius: BorderRadiusSize;
  onNavigate?: (href: string) => void;
}

const getAspectRatioValue = (ratio: AspectRatio): number => {
  if (ratio === 'auto') return 0;
  const parts = ratio.split(':');
  if (parts.length !== 2) return 0;
  const [w, h] = parts.map(Number);
  if (isNaN(w) || isNaN(h) || w === 0) return 0;
  return h / w;
};

// Helper function to render badge icon (supports both emoji strings and Lucide icons)
const renderBadgeIcon = (badgeIcon?: ServiceIcon | string) => {
  if (!badgeIcon) return '✨';

  // If it's a single character or emoji, return it directly
  if (badgeIcon.length <= 2) return badgeIcon;

  // Try to render as Lucide icon
  const iconMap: Record<string, any> = {
    'sparkles': LucideIcons.Sparkles,
    'zap': LucideIcons.Zap,
    'star': LucideIcons.Star,
    'award': LucideIcons.Award,
    'trophy': LucideIcons.Trophy,
    'rocket': LucideIcons.Rocket,
    'lightbulb': LucideIcons.Lightbulb,
    'heart': LucideIcons.Heart,
    'check-circle': LucideIcons.CheckCircle,
    'alert-circle': LucideIcons.AlertCircle,
    'shield': LucideIcons.Shield,
    'target': LucideIcons.Target,
    'trending-up': LucideIcons.TrendingUp,
    'circle-dot': LucideIcons.CircleDot,
    'hexagon': LucideIcons.Hexagon,
    'layers': LucideIcons.Layers,
  };

  const IconComponent = iconMap[badgeIcon];
  if (IconComponent) {
    return React.createElement(IconComponent, { size: 16, className: 'inline-block' });
  }

  // Fallback to string if not found in icon map
  return badgeIcon;
};


const Hero: React.FC<HeroProps> = ({
  headline, subheadline, primaryCta, secondaryCta, imageUrl,
  imageStyle, imageDropShadow, imageBorderRadius, imageBorderSize, imageBorderColor, imageJustification, imagePosition,
  imageWidth, imageHeight, imageHeightEnabled, imageAspectRatio, imageObjectFit,
  paddingY, paddingX, sectionBorderSize, sectionBorderColor, colors = {}, borderRadius,
  headlineFontSize = 'lg', subheadlineFontSize = 'lg',
  showBadge = true, badgeText = '', badgeIcon = '✨',
  badgeColor, badgeBackgroundColor,
  secondaryButtonStyle = 'solid',
  secondaryButtonOpacity = 100,
  primaryCtaLink = '/#cta',
  secondaryCtaLink = '/#features',
  onNavigate,
}) => {
  // Get design tokens with fallback to component colors
  const { getColor, colors: tokenColors } = useDesignTokens();

  // Component colors take priority over Design Tokens
  // User changes should always override defaults and design tokens
  const actualColors = {
    primary: colors?.primary || getColor('primary.main', '#4f46e5'),
    secondary: colors?.secondary || getColor('secondary.main', '#10b981'),
    background: colors?.background,
    text: colors?.text,
    heading: colors?.heading,
    buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
    buttonText: colors?.buttonText || '#ffffff',
    secondaryButtonBackground: colors?.secondaryButtonBackground || '#334155',
    secondaryButtonText: colors?.secondaryButtonText || '#ffffff',
  };
  // Ensure headline is always a string - handle all edge cases
  let safeHeadline: string;
  if (typeof headline === 'string' && headline.length > 0) {
    safeHeadline = headline;
  } else if (headline && typeof headline.toString === 'function') {
    safeHeadline = String(headline);
  } else {
    safeHeadline = 'Welcome';
  }

  // Create a modified headline for styling the gradient part specifically
  const styledHeadline = safeHeadline.replace(
    /(<span.*?>)(.*?)(<\/span>)/,
    `<span style="background-image: linear-gradient(to right, ${actualColors.primary}, ${actualColors.secondary});" class="text-transparent bg-clip-text">$2</span>`
  );

  const glowStyle = imageStyle === 'glow' && imageDropShadow ? { boxShadow: `0 10px 15px -3px ${actualColors.primary}40, 0 4px 6px -4px ${actualColors.primary}40` } : {};
  const shadowClass = imageDropShadow && ['default', 'rounded-full', 'glow'].includes(imageStyle) ? 'shadow-2xl' : '';

  const imageBorderRadiusClass = imageStyle === 'default' ? borderRadiusClasses[imageBorderRadius] : '';

  // FIX: Cast to 'any' to allow 'maxWidth' which may be missing from CSSProperties type definition.
  const imageContainerStyle: any = {
    width: `${imageWidth}%`,
    maxWidth: '512px',
  };

  // Logic for fixed aspect ratios: constrain the container's width based on height.
  if (imageHeightEnabled && imageAspectRatio !== 'auto') {
    const ratioValue = getAspectRatioValue(imageAspectRatio);
    if (ratioValue > 0) {
      const heightBasedMaxWidth = imageHeight / ratioValue;

      const originalMaxWidthStr = imageContainerStyle.maxWidth || '512';
      const originalMaxWidth = parseInt(originalMaxWidthStr, 10);

      imageContainerStyle.maxWidth = `${Math.min(originalMaxWidth, heightBasedMaxWidth)}px`;
    }
  }

  const ImageComponent = () => {
    // FIX: Cast to 'any' to allow 'maxHeight' which may be missing from CSSProperties type definition.
    const imgStyle: any = {
      ...glowStyle,
      borderColor: imageBorderColor,
    };

    // Logic for 'auto' aspect ratio: constrain the image's height directly.
    if (imageHeightEnabled && imageAspectRatio === 'auto') {
      imgStyle.maxHeight = `${imageHeight}px`;
    }

    // Show placeholder if image URL is empty or pending
    if (isPendingImage(imageUrl)) {
      return (
        <ImagePlaceholder
          aspectRatio="16:9"
          showGenerateButton={false}
          className={`${imageBorderRadiusClass} ${borderSizeClasses[imageBorderSize]}`}
        />
      );
    }

    return (
      <img
        src={imageUrl}
        alt="AI Generated Artwork"
        className={`w-full ${imageAspectRatio === 'auto' ? 'h-auto' : 'h-full'} ${objectFitClasses[imageObjectFit]} ${imageStyleClasses[imageStyle]} ${imageBorderRadiusClass} ${borderSizeClasses[imageBorderSize]} ${shadowClass}`}
        style={imgStyle}
        key={imageUrl}
      />
    );
  };

  const sectionBorderClass = sectionBorderSize !== 'none' ? `border ${borderSizeClasses[sectionBorderSize]}` : '';

  return (
    <section
      className={`relative container mx-auto flex flex-col items-center ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} ${imagePosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} ${sectionBorderClass}`}
      style={{ backgroundColor: actualColors.background, borderColor: sectionBorderColor }}
    >
      <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <div className={`md:w-1/2 animate-fade-in-up text-center ${imagePosition === 'left' ? 'md:text-right' : 'md:text-left'}`}>
        {/* Badge/Kicker */}
        {showBadge && badgeText && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 border backdrop-blur-sm ${imagePosition === 'left' ? 'md:mr-0 md:ml-auto' : ''}`}
            style={{
              backgroundColor: badgeBackgroundColor || `${actualColors.primary}15`,
              borderColor: badgeColor ? `${badgeColor}30` : `${actualColors.primary}30`
            }}>
            <span className="text-sm font-semibold animate-pulse flex items-center" style={{ color: badgeColor || actualColors.primary }}>
              {renderBadgeIcon(badgeIcon)}
            </span>
            <span className="text-sm font-semibold" style={{ color: badgeColor || actualColors.primary }}>
              {badgeText}
            </span>
          </div>
        )}

        <h1
          className={`${headlineSizeClasses[headlineFontSize]} font-extrabold text-site-heading leading-tight mb-6 font-header`}
          style={{
            color: actualColors.heading,
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)'
          }}
          dangerouslySetInnerHTML={{ __html: styledHeadline }}
        />
        <p
          className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-8 max-w-xl mx-auto md:mx-0 font-body`}
          style={{ color: actualColors.text }}
        >
          {subheadline}
        </p>
        <div className={`flex flex-wrap justify-center gap-4 ${imagePosition === 'left' ? 'md:justify-end' : 'md:justify-start'}`}>
          <a
            href={primaryCtaLink || '/#cta'}
            onClick={(e) => {
              const href = primaryCtaLink || '/#cta';
              if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                e.preventDefault();
                onNavigate(href);
              }
            }}
            style={{
              backgroundColor: actualColors.buttonBackground || actualColors.primary,
              color: actualColors.buttonText || '#ffffff',
              textTransform: 'var(--buttons-transform, none)' as any,
              letterSpacing: 'var(--buttons-spacing, normal)'
            }}
            className={`relative overflow-hidden group text-white font-bold py-3 px-8 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
          >
            <span className="relative z-10">{primaryCta}</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </a>
          <a
            href={secondaryCtaLink || '/#features'}
            onClick={(e) => {
              const href = secondaryCtaLink || '/#features';
              if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                e.preventDefault();
                onNavigate(href);
              }
            }}
            className={`relative overflow-hidden group font-bold py-3 px-8 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
              ? 'border-2 bg-transparent'
              : secondaryButtonStyle === 'ghost'
                ? 'bg-transparent hover:bg-white/10'
                : ''
              }`}
            style={{
              backgroundColor: secondaryButtonStyle === 'solid'
                ? hexToRgba(actualColors.secondaryButtonBackground, secondaryButtonOpacity / 100)
                : 'transparent',
              borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'transparent',
              color: actualColors.secondaryButtonText || '#ffffff',
              textTransform: 'var(--buttons-transform, none)' as any,
              letterSpacing: 'var(--buttons-spacing, normal)'
            }}
          >
            <span className="relative z-10">{secondaryCta}</span>
            {secondaryButtonStyle === 'solid' && (
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            )}
          </a>
        </div>

      </div>
      <div className={`md:w-1/2 mt-12 md:mt-0 flex justify-center ${justificationClasses[imageJustification]} animate-fade-in-up`} style={{ animationDelay: '0.2s' }}>
        <div className="relative animate-hero-float" style={imageContainerStyle}>
          <div className={imageStyle === 'polaroid' || imageAspectRatio === 'auto' ? '' : aspectRatioClasses[imageAspectRatio]}>
            {imageStyle === 'polaroid' ? (
              <div className="img-style-polaroid">
                <ImageComponent />
              </div>
            ) : (
              <ImageComponent />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
