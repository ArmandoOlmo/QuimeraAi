import React, { useState } from 'react';

// ─── Types ───
export interface LogoBannerItem {
  imageUrl: string;
  alt: string;
  link?: string;
  linkText?: string;
  linkType?: 'manual' | 'content';
}

export interface LogoBannerData {
  title?: string;
  subtitle?: string;
  logos: LogoBannerItem[];
  /** Scrolling marquee */
  scrollEnabled?: boolean;
  scrollSpeed?: number;
  pauseOnHover?: boolean;
  /** Logo sizing */
  logoHeight?: number;
  logoGap?: number;
  /** Grayscale logos with color on hover */
  grayscale?: boolean;
  /** Background */
  useGradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  backgroundColor?: string;
  /** Colors */
  titleColor?: string;
  subtitleColor?: string;
  /** Font sizes */
  titleFontSize?: 'sm' | 'md' | 'lg';
  subtitleFontSize?: 'sm' | 'md' | 'lg';
  /** Padding */
  paddingY?: 'sm' | 'md' | 'lg' | 'xl';
  /** Separator line */
  showDivider?: boolean;
  dividerColor?: string;
  /** Background image */
  backgroundImageUrl?: string;
  backgroundOverlayEnabled?: boolean;
  backgroundOverlayOpacity?: number;
  backgroundOverlayColor?: string;
}

// ─── Font size map ───
const fontSizeMap = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
const subtitleSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
const paddingMap = { sm: 'py-6', md: 'py-10', lg: 'py-16', xl: 'py-24' };

// ─── Component ───
interface LogoBannerProps extends LogoBannerData {
  onNavigate?: (href: string) => void;
}

const LogoBanner: React.FC<LogoBannerProps> = ({
  title,
  subtitle,
  logos = [],
  scrollEnabled = false,
  scrollSpeed = 25,
  pauseOnHover = true,
  logoHeight = 40,
  logoGap = 48,
  grayscale = true,
  useGradient = false,
  gradientFrom = '#0f172a',
  gradientTo = '#1e293b',
  gradientAngle = 90,
  backgroundColor = '#ffffff',
  titleColor = '#64748b',
  subtitleColor = '#94a3b8',
  titleFontSize = 'sm',
  subtitleFontSize = 'sm',
  paddingY = 'md',
  showDivider = false,
  dividerColor = '#e2e8f0',
  onNavigate,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const validLogos = logos.length > 0 ? logos : [
    { imageUrl: '', alt: 'Brand 1', link: '', linkText: '' },
  ];

  const bgStyle: React.CSSProperties = useGradient
    ? { background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` }
    : { backgroundColor };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href) return;
    if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  const renderLogo = (logo: LogoBannerItem, index: number, keyPrefix = '') => {
    const imgEl = logo.imageUrl ? (
      <img
        src={logo.imageUrl}
        alt={logo.alt || `Logo ${index + 1}`}
        style={{ height: `${logoHeight}px`, maxWidth: '160px', objectFit: 'contain' }}
        className={`transition-all duration-300 ${grayscale ? 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100' : ''}`}
        loading="lazy"
      />
    ) : (
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-dashed ${grayscale ? 'border-gray-300 text-gray-400' : 'border-gray-500 text-gray-500'}`}
        style={{ height: `${logoHeight}px`, width: '120px' }}
      >
        <span className="text-xs font-medium">{logo.alt || `Logo ${index + 1}`}</span>
      </div>
    );

    if (logo.link) {
      return (
        <a
          key={`${keyPrefix}${index}`}
          href={logo.link}
          onClick={(e) => handleClick(e, logo.link!)}
          className="flex-shrink-0 inline-flex items-center"
          target={logo.link.startsWith('http') ? '_blank' : undefined}
          rel={logo.link.startsWith('http') ? 'noopener noreferrer' : undefined}
          title={logo.linkText || logo.alt}
        >
          {imgEl}
        </a>
      );
    }

    return (
      <div key={`${keyPrefix}${index}`} className="flex-shrink-0 inline-flex items-center">
        {imgEl}
      </div>
    );
  };

  // ─── Scrolling (Marquee) mode ───
  if (scrollEnabled && validLogos.length > 1) {
    return (
      <div style={bgStyle} className={paddingMap[paddingY]}>
        {(title || subtitle) && (
          <div className="text-center mb-8 px-4">
            {title && (
              <p className={`${fontSizeMap[titleFontSize]} font-semibold uppercase tracking-widest`} style={{ color: titleColor }}>
                {title}
              </p>
            )}
            {subtitle && (
              <p className={`${subtitleSizeMap[subtitleFontSize]} mt-1`} style={{ color: subtitleColor }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {showDivider && <div className="max-w-5xl mx-auto mb-8" style={{ height: '1px', backgroundColor: dividerColor }} />}

        <div
          className="relative overflow-hidden"
          onMouseEnter={() => pauseOnHover && setIsPaused(true)}
          onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10" style={{ background: `linear-gradient(to right, ${useGradient ? gradientFrom : backgroundColor}, transparent)` }} />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10" style={{ background: `linear-gradient(to left, ${useGradient ? gradientTo : backgroundColor}, transparent)` }} />

          <div
            className="flex items-center logo-marquee"
            style={{
              gap: `${logoGap}px`,
              animationDuration: `${scrollSpeed}s`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {/* Triple repeat for seamless loop */}
            {[...Array(3)].flatMap((_, rep) =>
              validLogos.map((logo, i) => renderLogo(logo, i, `${rep}-`))
            )}
          </div>
        </div>

        {showDivider && <div className="max-w-5xl mx-auto mt-8" style={{ height: '1px', backgroundColor: dividerColor }} />}

        <style>{`
          @keyframes logo-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.333%); }
          }
          .logo-marquee {
            animation: logo-scroll linear infinite;
            width: max-content;
          }
        `}</style>
      </div>
    );
  }

  // ─── Static Grid mode ───
  return (
    <div style={bgStyle} className={paddingMap[paddingY]}>
      {(title || subtitle) && (
        <div className="text-center mb-8 px-4">
          {title && (
            <p className={`${fontSizeMap[titleFontSize]} font-semibold uppercase tracking-widest`} style={{ color: titleColor }}>
              {title}
            </p>
          )}
          {subtitle && (
            <p className={`${subtitleSizeMap[subtitleFontSize]} mt-1`} style={{ color: subtitleColor }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {showDivider && <div className="max-w-5xl mx-auto mb-8" style={{ height: '1px', backgroundColor: dividerColor }} />}

      <div
        className="max-w-6xl mx-auto flex flex-wrap items-center justify-center px-4"
        style={{ gap: `${logoGap}px` }}
      >
        {validLogos.map((logo, i) => renderLogo(logo, i))}
      </div>

      {showDivider && <div className="max-w-5xl mx-auto mt-8" style={{ height: '1px', backgroundColor: dividerColor }} />}
    </div>
  );
};

export default LogoBanner;
