import React from 'react';
import { HeroData, BorderRadiusSize, FontSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { hexToRgba } from '../utils/colorUtils';
import { sanitizeHtml } from '../utils/sanitize';

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

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

interface HeroProps extends HeroData {
  borderRadius: BorderRadiusSize;
  onNavigate?: (href: string) => void;
}

import HeroCinematicGym from './cinematic/HeroCinematicGym';

const Hero: React.FC<HeroProps> = (props) => {
  // Preserve the cinematic-gym variant as a special case
  if (props.heroVariant === 'cinematic-gym') {
    return <HeroCinematicGym {...props} headlineFontSize={props.headlineFontSize || 'lg'} subheadlineFontSize={props.subheadlineFontSize || 'lg'} />;
  }

  const {
    textLayout = 'left-top',
    headline, headlineImageUrl, subheadline, primaryCta, secondaryCta, imageUrl,
    colors, borderRadius,
    headlineFontSize = 'lg', subheadlineFontSize = 'lg',
    secondaryButtonStyle = 'solid',
    secondaryButtonOpacity = 100,
    heroHeight,
    overlayOpacity,
    primaryCtaLink = '/#cta',
    secondaryCtaLink = '/#features',
    onNavigate,
  } = props;

  const { getColor } = useDesignTokens();

  const actualColors = {
    primary: colors?.primary || getColor('primary.main', '#4f46e5'),
    secondary: colors?.secondary || getColor('secondary.main', '#10b981'),
    background: colors?.background,
    text: colors?.text || '#ffffff',
    heading: colors?.heading || '#ffffff',
    buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
    buttonText: colors?.buttonText || '#ffffff',
    secondaryButtonBackground: colors?.secondaryButtonBackground || '#334155',
    secondaryButtonText: colors?.secondaryButtonText || '#ffffff',
  };

  // Safe headline
  let safeHeadline: string;
  if (typeof headline === 'string' && headline.length > 0) {
    safeHeadline = headline;
  } else if (headline && typeof (headline as any).toString === 'function') {
    safeHeadline = String(headline);
  } else {
    safeHeadline = 'Welcome';
  }

  const styledHeadline = safeHeadline.replace(
    /(<span.*?>)(.*?)(<\/span>)/,
    `<span style="background-image: linear-gradient(to right, ${actualColors.primary}, ${actualColors.secondary});" class="text-transparent bg-clip-text">$2</span>`
  );

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  // ─── Background Image ───
  const BackgroundImage = () => {
    if (isPendingImage(imageUrl)) {
      return (
        <div className="absolute inset-0 z-0">
          <ImagePlaceholder
            aspectRatio="16:9"
            showGenerateButton={false}
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-0">
        <img
          src={imageUrl}
          alt="Hero background"
          className="w-full h-full object-cover"
          key={imageUrl}
        />
        {/* Dark overlay for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${(overlayOpacity ?? 50) / 100}), rgba(0,0,0,${((overlayOpacity ?? 50) + 15) / 100}))`
          }}
        />
      </div>
    );
  };

  // ─── Text Content Block ───
  const TextContent = ({ align = 'left' }: { align?: 'left' | 'center' | 'right' }) => {
    const alignClasses = {
      left: 'items-start text-left',
      center: 'items-center text-center',
      right: 'items-end text-right',
    };

    return (
      <div className={`flex flex-col gap-5 w-full max-w-2xl ${alignClasses[align]}`}>
        {/* Headline — Logo image or text */}
        {headlineImageUrl ? (
          <img
            src={headlineImageUrl}
            alt={safeHeadline}
            className="max-h-20 md:max-h-28 w-auto object-contain hero-anim-headline"
            style={{
              filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.3))',
              alignSelf: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            }}
          />
        ) : (
          <h1
            className={`${headlineSizeClasses[headlineFontSize]} font-extrabold leading-tight font-header`}
            style={{
              color: actualColors.heading,
              textTransform: 'var(--headings-transform, none)' as any,
              letterSpacing: 'var(--headings-spacing, normal)',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(styledHeadline) }}
          />
        )}

        <p
          className={`${subheadlineSizeClasses[subheadlineFontSize]} font-body opacity-90`}
          style={{ color: actualColors.text, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}
        >
          {subheadline}
        </p>

        <div className={`flex flex-wrap gap-4 mt-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <a
            href={primaryCtaLink || '/#cta'}
            onClick={(e) => handleNavigate(e, primaryCtaLink || '/#cta')}
            style={{
              backgroundColor: hexToRgba(actualColors.buttonBackground, 0.6),
              color: actualColors.buttonText,
              textTransform: 'var(--buttons-transform, none)' as any,
              letterSpacing: 'var(--buttons-spacing, normal)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            }}
            className={`relative overflow-hidden group font-bold py-3 px-8 border border-white/15 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]}`}
          >
            <span className="relative z-10">{primaryCta}</span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          </a>
          <a
            href={secondaryCtaLink || '/#features'}
            onClick={(e) => handleNavigate(e, secondaryCtaLink || '/#features')}
            className={`relative overflow-hidden group font-bold py-3 px-8 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95 transition-all duration-300 font-button ${borderRadiusClasses[borderRadius]} ${secondaryButtonStyle === 'outline'
              ? 'border-2 bg-transparent'
              : secondaryButtonStyle === 'ghost'
                ? 'bg-transparent hover:bg-white/10'
                : ''
              }`}
            style={{
              backgroundColor: secondaryButtonStyle === 'solid'
                ? hexToRgba(actualColors.secondaryButtonBackground, Math.min(secondaryButtonOpacity / 100, 0.5))
                : 'transparent',
              borderColor: secondaryButtonStyle === 'outline' ? actualColors.secondaryButtonBackground : 'rgba(255,255,255,0.15)',
              color: actualColors.secondaryButtonText,
              textTransform: 'var(--buttons-transform, none)' as any,
              letterSpacing: 'var(--buttons-spacing, normal)',
              backdropFilter: secondaryButtonStyle !== 'ghost' ? 'blur(12px) saturate(180%)' : undefined,
              WebkitBackdropFilter: secondaryButtonStyle !== 'ghost' ? 'blur(12px) saturate(180%)' : undefined,
            }}
          >
            <span className="relative z-10">{secondaryCta}</span>
            {secondaryButtonStyle === 'solid' && (
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            )}
          </a>
        </div>
      </div>
    );
  };

  // ─── Layout positioning helpers ───
  // Header padding (top positions) — ~80px to clear navigation header
  // Bottom padding — same as top (~80px) for visual symmetry
  const HEADER_PADDING = 'pt-28 md:pt-32';
  const BOTTOM_PADDING = 'pb-20 md:pb-24';

  // Determine alignment from textLayout
  const getHorizontalAlign = (): 'left' | 'center' | 'right' => {
    if (textLayout.startsWith('left')) return 'left';
    if (textLayout.startsWith('right')) return 'right';
    return 'center';
  };

  const getJustifyClass = (): string => {
    const h = getHorizontalAlign();
    if (h === 'left') return 'justify-start';
    if (h === 'right') return 'justify-end';
    return 'justify-center';
  };

  const getVerticalClass = (): string => {
    if (textLayout.endsWith('-top') || textLayout === 'center-top') return `items-start ${HEADER_PADDING}`;
    if (textLayout.endsWith('-bottom') || textLayout === 'center-bottom') return `items-end ${BOTTOM_PADDING}`;
    return 'items-center'; // center (vertical center)
  };

  return (
    <section
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        minHeight: heroHeight ? `${heroHeight}vh` : '80vh',
        backgroundColor: actualColors.background || '#0f172a',
      }}
    >
      <BackgroundImage />

      {/* Main content container — max-w-7xl + px-6 matches the floating header */}
      <div
        className={`relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-1 ${getVerticalClass()} ${getJustifyClass()}`}
        style={{ minHeight: heroHeight ? `${heroHeight}vh` : '80vh' }}
      >
        <TextContent align={getHorizontalAlign()} />
      </div>
    </section>
  );
};

export default Hero;
