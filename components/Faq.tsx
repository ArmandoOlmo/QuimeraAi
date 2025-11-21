
import React, { useState } from 'react';
import { FaqData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { Plus, Minus } from 'lucide-react';

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

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  accentColor: string;
  textColor: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, accentColor, textColor }) => {
  return (
    <div className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left py-6"
        aria-expanded={isOpen}
      >
        <h3 className={`text-lg font-semibold transition-colors ${isOpen ? '' : 'text-site-heading hover:text-site-heading/80'}`} style={{ color: isOpen ? accentColor : undefined }}>
          {question}
        </h3>
        <span className="text-2xl text-site-body transform transition-transform duration-300">
          {isOpen ? (
            <Minus className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
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

interface FaqProps extends FaqData {
    borderRadius: BorderRadiusSize;
}

const Faq: React.FC<FaqProps> = ({ title, description, items, paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
        <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
          {description}
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        {items.map((item, index) => (
          <FaqItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onClick={() => handleToggle(index)}
            accentColor={colors.accent}
            textColor={colors.text}
          />
        ))}
      </div>
    </section>
  );
};

export default Faq;
