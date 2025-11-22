
import React from 'react';
import { TestimonialsData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

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
  cardPadding
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

  return (
    <div 
      className={`flex flex-col justify-between animate-fade-in-up ${borderRadiusClasses[borderRadius]} ${shadowClasses[cardShadow || 'lg']} ${getBorderClass()}`} 
      style={{ 
        animationDelay: delay, 
        borderColor: borderStyle === 'solid' || borderStyle === 'glow' ? borderColor : undefined,
        backgroundColor: cardBackground,
        padding: `${cardPadding}px`
      }}
    >
      <blockquote className="mb-6 italic font-body" style={{ color: textColor }}>
        "{quote}"
      </blockquote>
      <div className="flex items-center">
        <img src={avatar} alt={name} style={{ borderColor: accentColor }} className="w-12 h-12 rounded-full mr-4 border-2" key={avatar} />
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
  descriptionFontSize = 'md' 
}) => {
  return (
    <section id="testimonials" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((testimonial, index) => (
            <TestimonialCard 
                key={index}
                {...testimonial}
                delay={`${(index + 1) * 0.2}s`}
                accentColor={colors.accent}
                textColor={colors.text}
                borderRadius={borderRadius}
                borderColor={colors.borderColor}
                cardBackground={colors.cardBackground || '#1f2937'}
                cardShadow={cardShadow}
                borderStyle={borderStyle}
                cardPadding={cardPadding}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
