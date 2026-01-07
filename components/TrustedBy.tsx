import React from 'react';
import { PaddingSize } from '../types';

interface TrustedByLogo {
  name: string;
  imageUrl: string;
}

interface TrustedByColors {
  background: string;
  text: string;
  borderColor?: string;
}

export interface TrustedByData {
  title: string;
  logos: TrustedByLogo[];
  paddingY: PaddingSize;
  paddingX: PaddingSize;
  colors: TrustedByColors;
  showBorder?: boolean;
  logoStyle?: 'grayscale' | 'color' | 'monochrome';
  animationSpeed?: 'slow' | 'normal' | 'fast';
}

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-8 md:py-12',
  md: 'py-12 md:py-16',
  lg: 'py-16 md:py-20',
  xl: 'py-24 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
};

const animationDuration: Record<string, string> = {
  slow: '40s',
  normal: '25s',
  fast: '15s',
};

const TrustedBy: React.FC<TrustedByData> = ({ 
  title = "",
  logos = [],
  paddingY = 'sm',
  paddingX = 'md',
  colors,
  showBorder = true,
  logoStyle = 'grayscale',
  animationSpeed = 'normal',
}) => {
  // Duplicar logos para el efecto de marquee infinito
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  const getLogoStyleClasses = () => {
    switch (logoStyle) {
      case 'grayscale':
        return 'grayscale hover:grayscale-0 opacity-50 hover:opacity-100';
      case 'monochrome':
        return 'brightness-0 invert opacity-40 hover:opacity-80';
      case 'color':
      default:
        return 'opacity-60 hover:opacity-100';
    }
  };

  if (logos.length === 0) return null;

  return (
    <section 
      className={`${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} overflow-hidden relative ${showBorder ? 'border-t border-b' : ''}`}
      style={{ 
        backgroundColor: colors?.background,
        borderColor: colors?.borderColor || 'rgba(255,255,255,0.05)'
      }}
    >
      {/* Decorative gradient overlays */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-32 md:w-48 z-10 pointer-events-none"
        style={{ 
          background: `linear-gradient(to right, ${colors?.background}, transparent)`
        }}
      />
      <div 
        className="absolute right-0 top-0 bottom-0 w-32 md:w-48 z-10 pointer-events-none"
        style={{ 
          background: `linear-gradient(to left, ${colors?.background}, transparent)`
        }}
      />

      <div className="container mx-auto">
        {/* Title */}
        <p 
          className="text-center text-xs md:text-sm uppercase tracking-[0.25em] md:tracking-[0.3em] mb-8 md:mb-10 font-medium"
          style={{ color: colors?.text, opacity: 0.5 }}
        >
          {title}
        </p>
        
        {/* Logos Marquee */}
        <div className="relative flex overflow-hidden">
          <div 
            className="flex items-center gap-12 md:gap-16 animate-marquee whitespace-nowrap"
            style={{ 
              animationDuration: animationDuration[animationSpeed]
            }}
          >
            {duplicatedLogos.map((logo, index) => (
              <div 
                key={`logo-${index}`}
                className={`flex-shrink-0 flex items-center justify-center transition-all duration-500 cursor-pointer ${getLogoStyleClasses()}`}
              >
                <img 
                  src={logo.imageUrl} 
                  alt={logo.name}
                  className="h-6 md:h-8 lg:h-10 w-auto object-contain max-w-[120px] md:max-w-[150px]"
                  title={logo.name}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;

