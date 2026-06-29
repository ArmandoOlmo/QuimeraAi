
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaqData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { Plus, Minus, ChevronDown, HelpCircle } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';
import { useDesignTokens } from '../hooks/useDesignTokens';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { FaqVariant } from '../data/faqVariants';

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
  activeTextColor?: string;
  iconBackground?: string;
}

const FaqItemClassic: React.FC<FaqItemProps> = ({
  question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderColor }) => {
  return (
    <div className="border-b backdrop-blur-lg" style={{ borderColor }}>
      <button
        onClick={onClick}
        className="flex w-full min-w-0 items-center justify-between gap-4 text-left py-6 transition-colors"
        aria-expanded={isOpen}
      >
        <h3
          className="min-w-0 flex-1 break-words text-lg font-semibold transition-colors hover:opacity-80 font-header"
          style={{ color: isOpen ? accentColor : headingColor }}
        >
          {question}
        </h3>
        <span className="flex-shrink-0 text-2xl transform transition-transform duration-300" style={{ color: textColor }}>
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
          <p className="pb-6 pr-0 font-body sm:pr-8" style={{ color: textColor }}>
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
      className={`mb-4 ${borderRadiusClasses[borderRadius]} overflow-hidden transition-all duration-300 border backdrop-blur-xl`}
      style={{
        backgroundColor: hexToRgba((cardBackground && !cardBackground.startsWith('rgba')) ? cardBackground : accentColor, 0.35),
        borderColor: isOpen ? accentColor : borderColor
      }}
    >
      <button
        onClick={onClick}
        className="flex w-full min-w-0 items-center justify-between text-left p-4 transition-colors hover:opacity-90 sm:p-6"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            className="flex-shrink-0 p-2 rounded-lg transition-transform duration-300"
            style={{
              backgroundColor: hexToRgba(accentColor, 0.125),
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            <ChevronDown className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <h3 className="min-w-0 break-words text-lg font-semibold font-header" style={{ color: isOpen ? accentColor : headingColor }}>
            {question}
          </h3>
        </div>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 sm:pl-[4.5rem]">
            <p className="font-body" style={{ color: textColor }}>
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaqItemGradient: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderRadius, gradientStart, gradientEnd, activeTextColor }) => {
  return (
    <div
      className={`mb-4 ${borderRadiusClasses[borderRadius]} overflow-hidden transition-all duration-500 relative group`}
      style={{
        background: isOpen
          ? `linear-gradient(135deg, ${hexToRgba(gradientStart || accentColor, 0.08)}, ${hexToRgba(gradientEnd || accentColor, 0.03)})`
          : hexToRgba(gradientEnd || accentColor, 0.3),
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
        className="relative z-10 flex w-full min-w-0 items-center justify-between gap-4 text-left p-4 sm:p-6"
        aria-expanded={isOpen}
      >
        <h3
          className="min-w-0 flex-1 break-words text-lg font-semibold transition-all duration-300 font-header"
          style={{
            color: isOpen ? accentColor : headingColor,
            textShadow: isOpen ? `0 0 20px ${hexToRgba(accentColor, 0.25)}` : 'none'
          }}
        >
          {question}
        </h3>
        <div
          className={`flex-shrink-0 p-2 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          style={{
            background: isOpen
              ? `linear-gradient(135deg, ${gradientStart || accentColor}, ${gradientEnd || accentColor})`
              : hexToRgba(accentColor, 0.125)
          }}
        >
          <Plus
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
            style={{ color: isOpen ? activeTextColor || headingColor : accentColor }}
          />
        </div>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="relative z-10 px-4 pb-4 sm:px-6 sm:pb-6">
            <div
              className="pl-4 border-l-2"
              style={{ borderColor: accentColor }}
            >
              <p className="font-body" style={{ color: textColor }}>
                {answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FaqItemMinimal: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor, headingColor, borderRadius, activeTextColor, iconBackground }) => {
  return (
    <div
      className={`mb-8 transition-all duration-300`}
    >
      <button
        onClick={onClick}
        className="flex w-full min-w-0 items-start gap-4 text-left transition-all duration-300 sm:gap-6"
        aria-expanded={isOpen}
      >
        <div
          className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 ${borderRadiusClasses[borderRadius]} flex items-center justify-center transition-all duration-300`}
          style={{
            backgroundColor: isOpen ? iconBackground || accentColor : hexToRgba(iconBackground || accentColor, 0.18),
            transform: isOpen ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <HelpCircle
            className="h-6 w-6"
            style={{ color: isOpen ? activeTextColor || headingColor : accentColor }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="break-words text-lg font-bold mb-2 transition-colors duration-300 font-header sm:text-xl"
            style={{ color: isOpen ? accentColor : headingColor }}
          >
            {question}
          </h3>
          <div
            className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
          >
            <div className="overflow-hidden">
              <p className="text-base leading-relaxed font-body" style={{ color: textColor }}>
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
  glassEffect,
  title: rawTitle,
  description: rawDescription,
  items: rawItems = [],
  imageUrl,
  backgroundImageUrl,
  paddingY,
  paddingX,
  colors,
  borderRadius,
  titleFontSize = 'md',
  descriptionFontSize = 'md',
  faqVariant = 'classic'
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Get design tokens for primary color
  const { colors: tokenColors } = useDesignTokens();
  const primaryColor = tokenColors.primary;

  const { i18n } = useTranslation();
  
  const resolveText = (text: any) => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text !== null) {
      const preferred = i18n.language?.startsWith('es') ? 'es' : 'en';
      return text[preferred] || text.es || text.en || Object.values(text)[0] || '';
    }
    return String(text);
  };

  const title = resolveText(rawTitle);
  const description = resolveText(rawDescription);
  const items = (rawItems || []).map(item => ({
    ...item,
    question: resolveText(item.question),
    answer: resolveText(item.answer)
  }));

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Use user-selected colors directly - respect their choices
  const safeColors = useMemo(() => {
    const background = colors?.background || primaryColor;
    const accent = colors?.accent || primaryColor;
    const sectionHeading = colors?.heading || colors?.text || '#F9FAFB';
    const sectionDescription = colors?.description || colors?.text || '#94a3b8';
    const questionText = colors?.cardHeading || colors?.text || colors?.heading || '#F9FAFB';
    const answerText = colors?.cardText || colors?.description || colors?.text || '#94a3b8';
    const cardBackground = colors?.cardBackground || colors?.panelBackground || background;

    return {
      background,
      accent,
      heading: sectionHeading,
      text: questionText,
      description: sectionDescription,
      cardHeading: questionText,
      cardText: answerText,
      cardBackground,
      panelBackground: colors?.panelBackground || cardBackground,
      activeBackground: colors?.activeBackground || accent,
      activeText: colors?.activeText || sectionHeading,
      iconBackground: colors?.iconBackground || accent,
      border: colors?.borderColor || hexToRgba(accent, 0.28),
      gradientStart: colors?.gradientStart || accent,
      gradientEnd: colors?.gradientEnd || cardBackground,
    };
  }, [colors, primaryColor]);

  const sectionClass = `w-full ${glassEffect ? 'backdrop-blur-xl border-y z-20' : ''}`;
  const sectionStyle: React.CSSProperties = {
    backgroundColor: glassEffect ? hexToRgba(safeColors.background, 0.4) : safeColors.background,
    borderColor: glassEffect ? hexToRgba(safeColors.border, 0.35) : undefined,
    boxShadow: glassEffect ? `0 4px 30px ${hexToRgba(safeColors.background, 0.1)}` : undefined,
  };

  const renderFaqItem = (item: any, index: number) => {
    // For card-based variants, use card-specific colors
    const isCardVariant = faqVariant === 'cards' || faqVariant === 'gradient';

    const commonProps = {
      question: item.question,
      answer: item.answer,
      isOpen: openIndex === index,
      onClick: () => handleToggle(index),
      accentColor: safeColors.accent,
      textColor: isCardVariant ? safeColors.cardText : safeColors.text,
      headingColor: isCardVariant ? safeColors.cardHeading : safeColors.heading,
      variant: faqVariant,
      borderRadius,
      cardBackground: safeColors.cardBackground,
      borderColor: safeColors.border,
      gradientStart: safeColors.gradientStart,
      gradientEnd: safeColors.gradientEnd,
      activeTextColor: safeColors.activeText,
      iconBackground: safeColors.iconBackground,
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

  const faqImageUrl = imageUrl || backgroundImageUrl;
  const activeIndex = openIndex ?? 0;
  const activeItem = items[activeIndex] || items[0];

  const renderInlineAnswer = (item: any, index: number, answerClassName = 'pb-6') => {
    const isOpen = openIndex === index;
    return (
      <div
        key={index}
        className="border-t"
        style={{ borderColor: safeColors.border }}
      >
        <button
          type="button"
          onClick={() => handleToggle(index)}
          className="flex w-full min-w-0 items-center justify-between gap-4 py-6 text-left transition-opacity hover:opacity-80 sm:gap-6"
          aria-expanded={isOpen}
        >
          <h3 className="min-w-0 flex-1 break-words font-header text-lg font-medium leading-snug sm:text-xl" style={{ color: isOpen ? safeColors.accent : safeColors.cardHeading }}>
            {item.question}
          </h3>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center border transition-transform"
            style={{ borderColor: safeColors.border, color: isOpen ? safeColors.accent : safeColors.cardHeading }}
          >
            {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </button>
        <div className={`grid overflow-hidden transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <p className={`font-body leading-relaxed ${answerClassName}`} style={{ color: safeColors.cardText }}>
              {item.answer}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderMediaPanel = () => (
    <div
      className={`relative min-h-[280px] overflow-hidden md:min-h-[420px] ${borderRadiusClasses[borderRadius]}`}
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(safeColors.gradientStart, 0.22)}, ${hexToRgba(safeColors.gradientEnd, 0.16)})`,
      }}
    >
      {faqImageUrl && !isPendingImage(faqImageUrl) ? (
        <img src={faqImageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <ImagePlaceholder aspectRatio="4:5" showGenerateButton={false} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );

  const renderEditorialSplit = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(220px,0.42fr)_minmax(0,1fr)]">
          <div>
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-[0.95]`} style={{ color: safeColors.heading }}>{title}</h2>
            {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-6 max-w-sm font-body leading-relaxed`} style={{ color: safeColors.description }}>{description}</p>}
          </div>
          <div>
            {items.map((item, index) => renderInlineAnswer(item, index))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderBoxedList = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="mx-auto mb-12 max-w-4xl text-center">
          <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
          {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mx-auto mt-4 max-w-2xl font-body`} style={{ color: safeColors.description }}>{description}</p>}
        </div>
        <div className={`mx-auto max-w-4xl overflow-hidden border ${borderRadiusClasses[borderRadius]}`} style={{ borderColor: safeColors.border, backgroundColor: safeColors.cardBackground }}>
          {items.map((item, index) => (
            <div key={index} className="px-4 sm:px-7">
              {renderInlineAnswer(item, index, 'pb-8')}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderDarkPanel = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className={`grid grid-cols-1 gap-10 border p-5 sm:p-8 md:p-14 lg:grid-cols-[0.9fr_1.1fr] ${borderRadiusClasses[borderRadius]}`} style={{ backgroundColor: safeColors.panelBackground, borderColor: safeColors.border }}>
          <div>
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
            {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-5 max-w-md font-body`} style={{ color: safeColors.description }}>{description}</p>}
          </div>
          <div className="space-y-4">
            {items.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className={`border p-4 sm:p-6 ${borderRadiusClasses[borderRadius]}`} style={{ backgroundColor: safeColors.cardBackground, borderColor: isOpen ? safeColors.accent : safeColors.border }}>
                  <button type="button" onClick={() => handleToggle(index)} className="flex w-full min-w-0 items-start justify-between gap-4 text-left" aria-expanded={isOpen}>
                    <h3 className="min-w-0 flex-1 break-words font-header text-lg font-medium" style={{ color: isOpen ? safeColors.accent : safeColors.cardHeading }}>{item.question}</h3>
                    {isOpen ? <Minus className="h-5 w-5 shrink-0" style={{ color: safeColors.accent }} /> : <Plus className="h-5 w-5 shrink-0" style={{ color: safeColors.cardHeading }} />}
                  </button>
                  {isOpen && <p className="mt-4 font-body leading-relaxed" style={{ color: safeColors.cardText }}>{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );

  const renderImageSplit = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1fr)] lg:items-center">
          {renderMediaPanel()}
          <div>
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
            {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-5 font-body`} style={{ color: safeColors.description }}>{description}</p>}
            <div className="mt-10">
              {items.map((item, index) => renderInlineAnswer(item, index))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderStackedCards = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.55fr_1fr]">
          <div>
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
            {description && <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 font-body`} style={{ color: safeColors.description }}>{description}</p>}
          </div>
          <div className="space-y-4">
            {items.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className={`p-4 sm:p-6 ${borderRadiusClasses[borderRadius]}`} style={{ backgroundColor: isOpen ? safeColors.activeBackground : safeColors.cardBackground, borderColor: safeColors.border }}>
                  <button type="button" onClick={() => handleToggle(index)} className="flex w-full min-w-0 items-center justify-between gap-3 text-left sm:gap-5" aria-expanded={isOpen}>
                    <h3 className="min-w-0 flex-1 break-words font-header text-lg font-medium sm:text-xl" style={{ color: isOpen ? safeColors.activeText : safeColors.cardHeading }}>{item.question}</h3>
                    <span className="flex-shrink-0" style={{ color: isOpen ? safeColors.activeText : safeColors.accent }}>{isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</span>
                  </button>
                  {isOpen && <p className="mt-5 font-body leading-relaxed" style={{ color: isOpen ? safeColors.activeText : safeColors.cardText }}>{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );

  const renderAnswerPanel = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="grid grid-cols-1 min-h-0 lg:min-h-[520px] lg:grid-cols-2">
          <div className="flex flex-col justify-center p-6 lg:p-14">
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
            <div className="mt-10 space-y-3">
              {items.map((item, index) => {
                const isActive = activeIndex === index;
                return (
                  <button key={index} type="button" onClick={() => setOpenIndex(index)} className={`w-full break-words p-4 text-left sm:p-5 ${borderRadiusClasses[borderRadius]}`} style={{ backgroundColor: isActive ? safeColors.activeBackground : safeColors.cardBackground, color: isActive ? safeColors.activeText : safeColors.cardHeading }}>
                    {item.question}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-6 lg:p-14" style={{ backgroundColor: safeColors.panelBackground }}>
            {activeItem && (
              <div className="max-w-xl">
                <p className="font-body text-sm uppercase tracking-widest" style={{ color: safeColors.activeText }}>Answer</p>
                <div className="my-8 h-px" style={{ backgroundColor: hexToRgba(safeColors.activeText, 0.55) }} />
                <h3 className="break-words font-header text-2xl font-semibold" style={{ color: safeColors.activeText }}>{activeItem.question}</h3>
                <p className="mt-6 break-words font-body text-lg leading-relaxed" style={{ color: safeColors.activeText }}>{activeItem.answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderContactCard = () => (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] lg:items-start">
          <div>
            <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-header font-semibold leading-tight`} style={{ color: safeColors.heading }}>{title}</h2>
            <div className="mt-10">
              {items.map((item, index) => renderInlineAnswer(item, index))}
            </div>
          </div>
          <div className={`border p-5 sm:p-8 ${borderRadiusClasses[borderRadius]}`} style={{ backgroundColor: safeColors.cardBackground, borderColor: safeColors.border }}>
            {faqImageUrl && !isPendingImage(faqImageUrl) && (
              <img src={faqImageUrl} alt="" className={`mb-8 aspect-video w-full object-cover ${borderRadiusClasses[borderRadius]}`} />
            )}
            <h3 className="break-words font-header text-2xl font-semibold" style={{ color: safeColors.cardHeading }}>{description || title}</h3>
            {activeItem && <p className="mt-5 break-words font-body leading-relaxed" style={{ color: safeColors.cardText }}>{activeItem.answer}</p>}
          </div>
        </div>
      </div>
    </section>
  );

  if (faqVariant === 'editorial-split') return renderEditorialSplit();
  if (faqVariant === 'boxed-list') return renderBoxedList();
  if (faqVariant === 'dark-panel') return renderDarkPanel();
  if (faqVariant === 'image-split') return renderImageSplit();
  if (faqVariant === 'stacked-cards') return renderStackedCards();
  if (faqVariant === 'answer-panel') return renderAnswerPanel();
  if (faqVariant === 'contact-card') return renderContactCard();

  return (
    <section id="faq" className={sectionClass} style={sectionStyle}>
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`${titleSizeClasses[titleFontSize]} break-words font-extrabold text-site-heading mb-4 font-header`} style={{ color: safeColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
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
