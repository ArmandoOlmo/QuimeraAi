
import React from 'react';
import { TestimonialsData, PaddingSize, BorderRadiusSize, FontSize, TestimonialsVariant } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  avatar: string;
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
  avatarBorderWidth: number;
  avatarBorderColor: string;
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
  full: 'rounded-full',
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
  avatar, 
  delay = '0s', 
  accentColor, 
  textColor, 
  borderRadius, 
  borderColor,
  cardBackground,
  cardShadow,
  borderStyle,
  cardPadding,
  variant,
  avatarBorderWidth,
  avatarBorderColor
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
        return 'border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      default:
        return 'border';
    }
  };

  const getVariantClasses = () => {
    switch(variant) {
      case 'minimal-cards':
        return 'border border-gray-200/20 hover:border-gray-200/40 transition-all duration-300 hover:-translate-y-1';
      case 'glassmorphism':
        return 'backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300';
      case 'gradient-glow':
        return 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/20 before:to-blue-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300';
      case 'neon-border':
        return 'relative border-2 hover:scale-[1.02] transition-all duration-500 animate-[pulse_3s_ease-in-out_infinite]';
      case 'floating-cards':
        return 'border border-gray-700/30 hover:-translate-y-2 hover:rotate-1 transition-all duration-500 shadow-2xl hover:shadow-purple-500/20';
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
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        };
      case 'gradient-glow':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: borderStyle === 'solid' ? borderColor : undefined,
          boxShadow: `0 0 30px ${accentColor}33, 0 10px 50px rgba(0,0,0,0.3)`,
        };
      case 'neon-border':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: accentColor,
          boxShadow: `0 0 20px ${accentColor}66, 0 0 40px ${accentColor}33, inset 0 0 20px ${accentColor}11`,
        };
      case 'floating-cards':
        return {
          ...baseStyle,
          backgroundColor: cardBackground,
          borderColor: borderStyle === 'solid' ? borderColor : undefined,
          transform: 'perspective(1000px) translateZ(0)',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.5), 0 10px 30px -10px rgba(0, 0, 0, 0.4)',
        };
      case 'gradient-shift':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${accentColor}22, ${cardBackground}, ${accentColor}11)`,
          backgroundSize: '200% 200%',
          animation: 'gradientShift 8s ease infinite',
          boxShadow: `0 15px 40px -10px ${accentColor}44`,
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
  const avatarClasses = () => {
    switch(variant) {
      case 'glassmorphism':
        return 'ring-2 ring-white/20';
      case 'neon-border':
        return `ring-2 shadow-[0_0_10px_${accentColor}]`;
      case 'floating-cards':
        return 'ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/20';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`flex flex-col justify-between animate-fade-in-up ${borderRadiusClasses[borderRadius]} ${variant === 'classic' ? shadowClasses[cardShadow || 'lg'] : ''} ${variant === 'classic' ? getBorderClass() : getVariantClasses()}`} 
      style={getCardStyle()}
    >
      {variant === 'gradient-shift' && (
        <div 
          className="absolute inset-0 opacity-50 -z-10"
          style={{
            background: `linear-gradient(45deg, ${accentColor}33, transparent, ${accentColor}22)`,
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
        <img 
          src={avatar} 
          alt={name} 
          style={{ 
            borderColor: avatarBorderColor,
            borderWidth: `${avatarBorderWidth}px`
          }} 
          className={`w-12 h-12 rounded-full mr-4 ${avatarBorderWidth > 0 ? 'border-solid' : ''} ${avatarClasses()}`} 
          key={avatar} 
        />
        <div>
          <p className="font-bold text-site-heading font-body">{name}</p>
          <p className="text-sm font-body" style={{ color: textColor }}>{title}</p>
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
    avatarBorderWidth?: number;
    avatarBorderColor?: string;
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
  testimonialsVariant = 'classic',
  avatarBorderWidth = 2,
  avatarBorderColor
}) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();
  
  // Merge Design Tokens with component colors
  const actualColors = {
    background: colors.background,
    accent: getColor('primary.main', colors.accent),
    borderColor: colors.borderColor,
    text: colors.text,
    heading: colors.heading,
  };

  // Avatar border color defaults to accent color if not specified
  const finalAvatarBorderColor = avatarBorderColor || actualColors.accent;
  
  return (
    <section id="testimonials" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: actualColors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: actualColors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: actualColors.text }}>
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((testimonial, index) => (
            <TestimonialCard 
                key={index}
                {...testimonial}
                delay={`${(index + 1) * 0.2}s`}
                accentColor={actualColors.accent}
                textColor={actualColors.text}
                borderRadius={borderRadius}
                borderColor={actualColors.borderColor}
                cardBackground={colors.cardBackground || '#1f2937'}
                cardShadow={cardShadow}
                borderStyle={borderStyle}
                cardPadding={cardPadding}
                variant={testimonialsVariant}
                avatarBorderWidth={avatarBorderWidth}
                avatarBorderColor={finalAvatarBorderColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
