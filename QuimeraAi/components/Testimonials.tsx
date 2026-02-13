
import React, { useMemo } from 'react';
import { TestimonialsData, PaddingSize, BorderRadiusSize, FontSize, TestimonialsVariant, AnimationType, CornerGradientConfig } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { hexToRgba } from '../utils/colorUtils';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import CornerGradient from './ui/CornerGradient';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  delay?: string;
  // Colors
  accentColor: string;
  textColor: string;
  descriptionColor: string;
  borderColor: string;
  cardBackground: string;
  // Style
  borderRadius: BorderRadiusSize;
  borderStyle: string;
  cardShadow: string;
  cardPadding: number;
  variant: TestimonialsVariant;
  // Animations
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

const shadowClasses: Record<string, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl shadow-purple-500/10',
};

// Helper to get safe shadow class
const getShadowClass = (shadow?: string): string => {
  if (!shadow || shadow === '') return shadowClasses['lg'];
  return shadowClasses[shadow] || shadowClasses['lg'];
};

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  name,
  title,
  delay = '0s',
  // Colors
  accentColor,
  textColor,
  descriptionColor,
  borderColor,
  cardBackground,
  // Style
  borderRadius,
  borderStyle,
  cardShadow,
  cardPadding,
  variant,
  // Animations
  animationType = 'fade-in-up',
  enableAnimation = true
}) => {
  const animationClass = getAnimationClass(animationType, enableAnimation);
  const getBorderClass = () => {
    switch (borderStyle) {
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
    switch (variant) {
      case 'minimal-cards':
        return 'border border-white/20 card-hover-lift card-shine-sweep card-border-glow';
      case 'glassmorphism':
        return 'backdrop-blur-xl border border-white/20 card-hover-lift card-shine-sweep';
      case 'gradient-glow':
        return 'relative overflow-hidden card-hover-glow card-shine-sweep before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300';
      case 'neon-border':
        return 'relative border-2 card-hover-tilt card-shine-sweep transition-all duration-500 animate-[pulse_3s_ease-in-out_infinite]';
      case 'floating-cards':
        return 'border border-white/20 card-hover-lift card-shine-sweep';
      case 'gradient-shift':
        return 'relative border-0 overflow-hidden card-hover-tilt card-shine-sweep transition-all duration-500 hover:scale-[1.03]';
      case 'classic':
      default:
        return 'card-hover-lift card-shine-sweep card-border-glow';
    }
  };

  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {
      animationDelay: delay,
      padding: `${cardPadding}px`,
      '--card-accent': `${accentColor}66`,
    } as React.CSSProperties;

    switch (variant) {
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

  // Get border classes - apply user borderStyle for classic, variant styles for others
  const finalBorderClass = variant === 'classic' ? getBorderClass() : getVariantClasses();

  return (
    <div
      className={`group flex flex-col justify-between ${animationClass} ${borderRadiusClasses[borderRadius]} ${getShadowClass(cardShadow)} ${finalBorderClass}`}
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
      <blockquote className={`mb-6 italic font-body transition-transform duration-300 group-hover:translate-x-1 ${needsZIndex ? 'relative z-10' : ''}`} style={{ color: textColor }}>
        <span className="inline-block transition-all duration-300 group-hover:scale-110 group-hover:opacity-80" style={{ color: accentColor }}>&ldquo;</span>
        {quote}
        <span className="inline-block transition-all duration-300 group-hover:scale-110 group-hover:opacity-80" style={{ color: accentColor }}>&rdquo;</span>
      </blockquote>
      <div className={`flex items-center ${needsZIndex ? 'relative z-10' : ''}`}>
        <div>
          <p className="font-bold font-body transition-colors duration-300 group-hover:text-[var(--hover-accent)]" style={{ color: textColor, '--hover-accent': accentColor } as React.CSSProperties}>{name}</p>
          <p className="text-sm font-body transition-opacity duration-300 group-hover:opacity-100" style={{ color: descriptionColor, opacity: 0.8 }}>{title}</p>
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
  animationType?: AnimationType;
  enableCardAnimation?: boolean;
  cornerGradient?: CornerGradientConfig;
}

const Testimonials: React.FC<TestimonialsProps> = ({
  title,
  description,
  items = [],
  paddingY,
  paddingX,
  colors,
  borderRadius = 'xl',
  cardShadow = 'lg',
  borderStyle = 'solid',
  cardPadding = 32,
  titleFontSize = 'md',
  descriptionFontSize = 'md',
  testimonialsVariant = 'classic',
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  cornerGradient
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();

  // Get primary color for title and cards
  const primaryColor = getColor('primary.main', '#4f46e5');

  // Merge component colors with Design Tokens - component colors take priority
  const actualColors = {
    background: colors?.background,
    accent: colors?.accent || primaryColor,
    borderColor: colors?.borderColor,
    text: colors?.text,
    heading: colors?.heading || primaryColor,
    description: colors?.description || colors?.text,
    cardBackground: colors?.cardBackground || primaryColor,
  };

  // Use component cardBackground color (falls back to primary if not set)
  const cardBackground = actualColors.cardBackground;

  // Use user-selected colors directly - respect their choices
  const safeColors = useMemo(() => {
    return {
      // Section-level colors
      heading: actualColors.heading || '#ffffff',
      text: actualColors.text || '#94a3b8',
      description: actualColors.description || actualColors.text || '#94a3b8',
      // Card-level colors
      cardHeading: actualColors.heading || '#ffffff',
      cardText: actualColors.text || '#94a3b8',
      cardDescription: actualColors.description || actualColors.text || '#94a3b8',
    };
  }, [actualColors]);

  return (
    <section id="testimonials" className="w-full relative overflow-hidden" style={{ backgroundColor: actualColors.background }}>
      <CornerGradient config={cornerGradient} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
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
              delay={getAnimationDelay(index)}
              // Colors
              accentColor={actualColors.accent}
              textColor={safeColors.cardText}
              descriptionColor={safeColors.cardDescription}
              borderColor={actualColors.borderColor}
              cardBackground={cardBackground}
              // Style
              borderRadius={borderRadius}
              borderStyle={borderStyle}
              cardShadow={cardShadow}
              cardPadding={cardPadding}
              variant={testimonialsVariant}
              // Animations
              animationType={animationType}
              enableAnimation={enableCardAnimation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
