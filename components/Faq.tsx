
import React, { useState, useMemo } from 'react';
import { FaqData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { Plus, Minus, ChevronDown, HelpCircle } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';
import { useDesignTokens } from '../hooks/useDesignTokens';

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

type FaqVariant = 'classic' | 'cards' | 'gradient' | 'minimal';

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  accentColor: string;
  textColor: string;
  headingColor: string;
  variant: FaqVariant;
  borderRadius: BorderRadiusSize;
  cardBackground?: string;
  borderColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

const FaqItemClassic: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderColor }) => {
  return (
    <div className="border-b" style={{ borderColor: borderColor || 'rgba(128, 128, 128, 0.3)' }}>
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left py-6 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 
          className="text-lg font-semibold transition-colors hover:opacity-80" 
          style={{ color: isOpen ? accentColor : headingColor }}
        >
          {question}
        </h3>
        <span className="text-2xl transform transition-transform duration-300" style={{ color: textColor }}>
          {isOpen ? (
            <Minus className="h-6 w-6" style={{ color: accentColor }} />
          ) : (
            <Plus className="h-6 w-6" style={{ color: headingColor }} />
          )}
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <p className="pb-6 pr-8" style={{ color: textColor }}>
            {answer}
            </p>
        </div>
      </div>
    </div>
  );
};

const FaqItemCards: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderRadius, cardBackground, borderColor }) => {
  return (
    <div 
      className={`mb-4 ${borderRadiusClasses[borderRadius]} overflow-hidden transition-all duration-300 border`}
      style={{ 
        backgroundColor: cardBackground || 'rgba(30, 41, 59, 0.5)',
        borderColor: isOpen ? accentColor : (borderColor || 'rgba(255, 255, 255, 0.1)')
      }}
    >
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left p-6 transition-colors hover:opacity-90"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4 flex-1">
          <div 
            className="p-2 rounded-lg transition-transform duration-300"
            style={{ 
              backgroundColor: hexToRgba(accentColor, 0.125),
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            <ChevronDown className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: isOpen ? accentColor : headingColor }}>
            {question}
          </h3>
        </div>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pl-[4.5rem]">
            <p style={{ color: textColor }}>
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaqItemGradient: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderRadius, gradientStart, gradientEnd }) => {
  return (
    <div 
      className={`mb-4 ${borderRadiusClasses[borderRadius]} overflow-hidden transition-all duration-500 relative group`}
      style={{ 
        background: isOpen 
          ? `linear-gradient(135deg, ${hexToRgba(gradientStart || accentColor, 0.08)}, ${hexToRgba(gradientEnd || accentColor, 0.03)})`
          : 'rgba(30, 41, 59, 0.3)',
        border: isOpen ? `2px solid ${hexToRgba(accentColor, 0.31)}` : '2px solid transparent'
      }}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(gradientStart || accentColor, 0.06)}, ${hexToRgba(gradientEnd || accentColor, 0.03)})`
        }}
      />
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left p-6 relative z-10"
        aria-expanded={isOpen}
      >
        <h3 
          className="text-lg font-semibold transition-all duration-300 flex-1"
          style={{ 
            color: isOpen ? accentColor : headingColor,
            textShadow: isOpen ? `0 0 20px ${hexToRgba(accentColor, 0.25)}` : 'none'
          }}
        >
          {question}
        </h3>
        <div 
          className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          style={{ 
            background: isOpen 
              ? `linear-gradient(135deg, ${gradientStart || accentColor}, ${gradientEnd || accentColor})`
              : hexToRgba(accentColor, 0.125)
          }}
        >
          <Plus 
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
            style={{ color: isOpen ? '#ffffff' : accentColor }} 
          />
        </div>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 relative z-10">
            <div 
              className="pl-4 border-l-2"
              style={{ borderColor: accentColor }}
            >
              <p style={{ color: textColor }}>
                {answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaqItemMinimal: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderRadius }) => {
  return (
    <div 
      className={`mb-8 transition-all duration-300`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-start gap-6 text-left transition-all duration-300"
        aria-expanded={isOpen}
      >
        <div 
          className={`flex-shrink-0 w-12 h-12 ${borderRadiusClasses[borderRadius]} flex items-center justify-center transition-all duration-300`}
          style={{ 
            backgroundColor: isOpen ? accentColor : hexToRgba(accentColor, 0.125),
            transform: isOpen ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <HelpCircle 
            className="h-6 w-6" 
            style={{ color: isOpen ? '#ffffff' : accentColor }} 
          />
        </div>
        <div className="flex-1">
          <h3 
            className="text-xl font-bold mb-2 transition-colors duration-300"
            style={{ color: isOpen ? accentColor : headingColor }}
          >
            {question}
          </h3>
          <div
            className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
          >
            <div className="overflow-hidden">
              <p className="text-base leading-relaxed" style={{ color: textColor }}>
                {answer}
              </p>
            </div>
          </div>
        </div>
        <div 
          className={`flex-shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <ChevronDown className="h-6 w-6" style={{ color: accentColor }} />
        </div>
      </button>
    </div>
  );
};

interface FaqProps extends FaqData {
    borderRadius: BorderRadiusSize;
    faqVariant?: FaqVariant;
}

const Faq: React.FC<FaqProps> = ({ 
  title, 
  description, 
  items = [], 
  paddingY, 
  paddingX, 
  colors, 
  borderRadius, 
  titleFontSize = 'md', 
  descriptionFontSize = 'md',
  faqVariant = 'classic'
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  // Get design tokens for primary color
  const { colors: tokenColors } = useDesignTokens();
  const primaryColor = tokenColors.primary;

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Use user-selected colors directly - respect their choices
  const safeColors = useMemo(() => {
    // Section-level colors
    const sectionHeading = colors?.heading || '#F9FAFB';
    const sectionDescription = colors?.description || '#94a3b8';
    // Card/Question-level colors  
    const questionText = colors?.text || '#F9FAFB';
    const answerText = colors?.text || '#94a3b8';
    
    return {
      heading: sectionHeading,
      text: questionText,
      description: sectionDescription,
      cardHeading: questionText,
      cardText: answerText,
      border: colors?.borderColor || '#334155',
    };
  }, [colors]);

  const renderFaqItem = (item: any, index: number) => {
    // For card-based variants, use card-specific colors
    const isCardVariant = faqVariant === 'cards' || faqVariant === 'gradient';
    
    const commonProps = {
      question: item.question,
      answer: item.answer,
      isOpen: openIndex === index,
      onClick: () => handleToggle(index),
      accentColor: colors?.accent,
      textColor: isCardVariant ? safeColors.cardText : safeColors.text,
      headingColor: isCardVariant ? safeColors.cardHeading : safeColors.heading,
      variant: faqVariant,
      borderRadius,
      cardBackground: colors?.cardBackground,
      borderColor: safeColors.border,
      gradientStart: colors?.gradientStart,
      gradientEnd: colors?.gradientEnd,
    };

    switch (faqVariant) {
      case 'cards':
        return <FaqItemCards key={index} {...commonProps} />;
      case 'gradient':
        return <FaqItemGradient key={index} {...commonProps} />;
      case 'minimal':
        return <FaqItemMinimal key={index} {...commonProps} />;
      default:
        return <FaqItemClassic key={index} {...commonProps} />;
    }
  };

  return (
    <section id="faq" className="w-full" style={{ backgroundColor: colors?.background || primaryColor }}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: safeColors.description }}>
            {description}
          </p>
        </div>
        
        <div className={`${faqVariant === 'minimal' ? 'max-w-4xl' : 'max-w-3xl'} mx-auto`}>
          {items.map((item, index) => renderFaqItem(item, index))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
