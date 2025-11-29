
import React, { useMemo } from 'react';
import { TestimonialsData, PaddingSize, BorderRadiusSize, FontSize, TestimonialsVariant } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { ensureTextContrast } from '../utils/colorUtils';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  delay?: string;
  accentColor: string;
  textColor: string;
  borderRadius: BorderRadiusSize;
  borderColor: string;
  cardBackground: string;
  cardShadow: string;
  borderStyle: string;
  cardPadding: number;
  variant: TestimonialsVariant;
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

const shadowClasses: Record<string, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl shadow-purple-500/10',
};

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  quote, 
  name, 
  title, 
  delay = '0s', 
  accentColor, 
  textColor, 
  borderRadius, 
  borderColor,
  cardBackground,
  cardShadow,
  borderStyle,
  cardPadding,
  variant
}) => {
  const getBorderClass = () => {
    switch(borderStyle) {
      case 'none':
        return 'border-0';
      case 'solid':
        return 'border';
      case 'gradient':
        return 'border-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20';
      case 'glow':
        return 'border border-purple-500/50';
      default:
        return 'border';
    }
  };

  const getVariantClasses = () => {
    switch(variant) {
      case 'minimal-cards':
        return 'border border-white/20 hover:border-white/40 transition-all duration-300 hover:-translate-y-1';
      case 'glassmorphism':
        return 'backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300';
      case 'gradient-glow':
        return 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300';
      case 'neon-border':
        return 'relative border-2 hover:scale-[1.02] transition-all duration-500 animate-[pulse_3s_ease-in-out_infinite]';
      case 'floating-cards':
        return 'border border-white/20 hover:-translate-y-2 hover:rotate-1 transition-all duration-500';
      case 'gradient-shift':
        return 'relative border-0 overflow-hidden transition-all duration-500 hover:scale-[1.03]';
      case 'classic':
      default:
        return '';
    }
  };

  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      animationDelay: delay,
      padding: `${cardPadding}px`
    };

    // Convert hex to rgba for glassmorphism effect
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    switch(variant) {
      case 'minimal-cards':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: borderStyle === 'solid' ? borderColor : undefined,
        };
      case 'glassmorphism':
        return {
          ...baseStyle,
          backgroundColor: hexToRgba(cardBackground, 0.85),
          backdropFilter: 'blur(20px)',
        };
      case 'gradient-glow':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: borderStyle === 'solid' ? borderColor : undefined,
        };
      case 'neon-border':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: accentColor,
        };
      case 'floating-cards':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: borderStyle === 'solid' ? borderColor : undefined,
          transform: 'perspective(1000px) translateZ(0)',
        };
      case 'gradient-shift':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${cardBackground}ee, ${cardBackground}, ${cardBackground}dd)`,
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease infinite',
        };
      case 'classic':
      default:
        return {
          ...baseStyle,
          borderColor: borderStyle === 'solid' || borderStyle === 'glow' ? borderColor : undefined,
          backgroundColor: cardBackground,
        };
    }
  };

  const needsZIndex = variant === 'gradient-glow' || variant === 'gradient-shift';

  return (
    <div 
      className={`flex flex-col justify-between animate-fade-in-up ${borderRadiusClasses[borderRadius]} ${variant === 'classic' ? shadowClasses[cardShadow || 'lg'] : ''} ${variant === 'classic' ? getBorderClass() : getVariantClasses()}`} 
      style={getCardStyle()}
    >
      {variant === 'gradient-shift' && (
        <div 
          className="absolute inset-0 opacity-50 -z-10"
          style={{
            background: `linear-gradient(45deg, ${cardBackground}55, transparent, ${cardBackground}44)`,
            backgroundSize: '400% 400%',
            animation: 'gradientShift 10s ease infinite',
            filter: 'blur(30px)',
          }}
        />
      )}
      <blockquote className={`mb-6 italic font-body ${needsZIndex ? 'relative z-10' : ''}`} style={{ color: textColor }}>
        "{quote}"
      </blockquote>
      <div className={`flex items-center ${needsZIndex ? 'relative z-10' : ''}`}>
        <div>
          <p className="font-bold font-body" style={{ color: textColor }}>{name}</p>
          <p className="text-sm font-body opacity-80" style={{ color: textColor }}>{title}</p>
        </div>
      </div>
    </div>
  );
};

interface TestimonialsProps extends TestimonialsData {
    borderRadius?: BorderRadiusSize;
    cardShadow?: string;
    borderStyle?: string;
    cardPadding?: number;
}

const Testimonials: React.FC<TestimonialsProps> = ({ 
  title, 
  description, 
  items, 
  paddingY, 
  paddingX, 
  colors, 
  borderRadius = 'xl', 
  cardShadow = 'lg',
  borderStyle = 'solid',
  cardPadding = 32,
  titleFontSize = 'md', 
  descriptionFontSize = 'md',
  testimonialsVariant = 'classic'
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Get primary color for title and cards
  const primaryColor = getColor('primary.main', '#4f46e5');
  
  // Merge component colors with Design Tokens - component colors take priority
  const actualColors = {
    background: colors.background,
    accent: colors.accent || primaryColor,
    borderColor: colors.borderColor,
    text: colors.text,
    heading: colors.heading || primaryColor,
    description: colors.description || colors.text,
    cardBackground: colors.cardBackground || primaryColor,
  };
  
  // Use component cardBackground color (falls back to primary if not set)
  const cardBackground = actualColors.cardBackground;
  
  // Calculate contrast-safe colors based on backgrounds
  const safeColors = useMemo(() => {
    const bgColor = actualColors.background || '#ffffff';
    const cardBg = cardBackground;
    
    return {
      // Section-level colors - use component heading color (with contrast check)
      heading: ensureTextContrast(bgColor, actualColors.heading),
      text: ensureTextContrast(bgColor, actualColors.text),
      description: ensureTextContrast(bgColor, actualColors.description),
      // Card-level colors
      cardHeading: ensureTextContrast(cardBg, actualColors.heading),
      cardText: ensureTextContrast(cardBg, actualColors.text),
    };
  }, [actualColors, cardBackground]);
  
  return (
    <section id="testimonials" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: safeColors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((testimonial, index) => (
            <TestimonialCard 
                key={index}
                quote={testimonial.quote}
                name={testimonial.name}
                title={testimonial.title}
                delay={`${(index + 1) * 0.2}s`}
                accentColor={actualColors.accent}
                textColor={safeColors.cardText}
                borderRadius={borderRadius}
                borderColor={actualColors.borderColor}
                cardBackground={cardBackground}
                cardShadow={cardShadow}
                borderStyle={borderStyle}
                cardPadding={cardPadding}
                variant={testimonialsVariant}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
