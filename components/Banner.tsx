import React from 'react';
import { BannerData, PaddingSize, BorderRadiusSize, FontSize, TextAlignment } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { ArrowRight } from 'lucide-react';

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
  md: 'px-6 md:px-12',
  lg: 'px-8 md:px-16',
  xl: 'px-12 md:px-20',
};

const headlineSizeClasses: Record<FontSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-7xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base md:text-lg',
  lg: 'text-lg md:text-xl',
  xl: 'text-xl md:text-2xl',
};

const textAlignmentClasses: Record<TextAlignment, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
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

interface BannerProps extends BannerData {
  buttonBorderRadius?: BorderRadiusSize;
}

const Banner: React.FC<BannerProps> = ({
  headline,
  subheadline,
  buttonText = 'Learn More',
  buttonUrl = '#',
  showButton = true,
  backgroundImageUrl,
  backgroundOverlayOpacity = 50,
  height = 400,
  textAlignment = 'center',
  paddingY = 'md',
  paddingX = 'md',
  colors,
  headlineFontSize = 'lg',
  subheadlineFontSize = 'md',
  buttonBorderRadius = 'md',
}) => {
  const { getColor } = useDesignTokens();

  const actualColors = {
    background: colors?.background || '#0f172a',
    overlayColor: colors?.overlayColor || '#000000',
    heading: colors?.heading || '#ffffff',
    text: colors?.text || '#ffffff',
    buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
    buttonText: colors?.buttonText || '#ffffff',
  };

  const hasValidImage = backgroundImageUrl && !isPendingImage(backgroundImageUrl);

  // Estilo para el overlay
  const overlayStyle = {
    backgroundColor: actualColors.overlayColor,
    opacity: backgroundOverlayOpacity / 100,
  };

  // Renderizar contenido
  const renderContent = () => {
    const contentClasses = `relative z-10 flex flex-col ${textAlignmentClasses[textAlignment]} max-w-4xl mx-auto`;

    return (
      <div className={contentClasses}>
        <h2
          className={`${headlineSizeClasses[headlineFontSize]} font-extrabold mb-4 font-header leading-tight`}
          style={{
            color: actualColors.heading,
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)',
            textShadow: hasValidImage ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {headline}
        </h2>
        
        <p
          className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-8 max-w-2xl font-body`}
          style={{
            color: actualColors.text,
            textShadow: hasValidImage ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          {subheadline}
        </p>

        {showButton && buttonText && (
          <a
            href={buttonUrl}
            className={`inline-flex items-center gap-2 font-bold py-3 px-8 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 font-button ${borderRadiusClasses[buttonBorderRadius]}`}
            style={{
              backgroundColor: actualColors.buttonBackground,
              color: actualColors.buttonText,
              textTransform: 'var(--buttons-transform, none)' as any,
              letterSpacing: 'var(--buttons-spacing, normal)',
            }}
          >
            {buttonText}
            <ArrowRight className="w-5 h-5" />
          </a>
        )}
      </div>
    );
  };

  return (
    <section
      id="banner"
      className={`relative w-full overflow-hidden ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}
      style={{
        minHeight: `${height}px`,
        backgroundColor: actualColors.background,
      }}
    >
      {/* Background Image */}
      {hasValidImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
            }}
          />
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={overlayStyle}
          />
        </>
      ) : (
        <div className="absolute inset-0">
          <ImagePlaceholder
            aspectRatio="16:9"
            showGenerateButton={false}
            className="w-full h-full"
          />
          {/* Still show overlay for placeholder */}
          <div
            className="absolute inset-0"
            style={overlayStyle}
          />
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto relative z-10 flex items-center justify-center h-full" style={{ minHeight: `${height - 100}px` }}>
        {renderContent()}
      </div>
    </section>
  );
};

export default Banner;










