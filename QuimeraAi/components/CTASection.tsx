
import React from 'react';
import { CtaData, PaddingSize, BorderRadiusSize, FontSize, CornerGradientConfig } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import CornerGradient from './ui/CornerGradient';
import { ArrowRight } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';

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

interface CTASectionProps extends CtaData {
  cardBorderRadius: BorderRadiusSize;
  buttonBorderRadius: BorderRadiusSize;
  cornerGradient?: CornerGradientConfig;
  onNavigate?: (href: string) => void;
}

const CTASection: React.FC<CTASectionProps> = ({
  glassEffect, title, description, buttonText, secondaryText, buttonUrl, paddingY, paddingX, colors, cardBorderRadius, buttonBorderRadius, titleFontSize = 'md', descriptionFontSize = 'md', cornerGradient, onNavigate, showAccent, accentText, cardOpacity, showCardBorder }) => {
  // Get design tokens with fallback to component colors
  const { getColor } = useDesignTokens();

  // Use component colors directly - respect user's choices
  const actualColors = {
    background: colors?.background || '#0f172a',
    gradientStart: colors?.gradientStart || getColor('primary.main', '#4f46e5'),
    gradientEnd: colors?.gradientEnd || getColor('secondary.main', '#10b981'),
    text: colors?.text || '#ffffff',
    heading: colors?.heading || '#ffffff',
    description: colors?.description || colors?.text || '#ffffff',
    buttonBackground: colors?.buttonBackground || '#ffffff',
    buttonText: colors?.buttonText || '#4f46e5',
    secondaryText: colors?.secondaryText || 'rgba(255, 255, 255, 0.6)',
  };

  return (
    <section id="cta" className={`w-full relative overflow-hidden ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(actualColors.background , 0.4) : actualColors.background }}>
      <CornerGradient config={cornerGradient} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div
          className={`${showCardBorder !== false ? 'border border-white/10' : ''} p-12 md:p-16 lg:p-20 text-center ${borderRadiusClasses[cardBorderRadius]} relative overflow-hidden`}
          style={{ ...(showCardBorder !== false ? { borderColor: colors?.borderColor || 'rgba(255,255,255,0.1)' } : {}), backgroundImage: `linear-gradient(135deg, ${hexToRgba(actualColors.gradientStart, (cardOpacity !== undefined ? cardOpacity : 100) / 100)}, ${hexToRgba(actualColors.gradientEnd, (cardOpacity !== undefined ? cardOpacity : 100) / 100)})` }}
        >
          <div>
            {/* Urgency Badge */}
            {showAccent !== false && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-white/90 text-sm font-medium">{accentText || 'Limited Time Offer'}</span>
              </div>
            )}

            <h2 className={`${titleSizeClasses[titleFontSize]} font-black text-white mb-4 font-header leading-tight`} style={{ color: actualColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
              {title}
            </h2>
            <p
              className={`${descriptionSizeClasses[descriptionFontSize]} mb-10 max-w-2xl mx-auto font-body`}
              style={{ color: actualColors.description }}
            >
              {description}
            </p>

            {/* CTA Button Group */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={buttonUrl || '#'}
                target={buttonUrl?.startsWith('http') ? '_blank' : undefined}
                rel={buttonUrl?.startsWith('http') ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  const href = buttonUrl || '#';
                  if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
                    e.preventDefault();
                    onNavigate(href);
                  }
                }}
                className={`group inline-flex items-center gap-3 font-bold py-4 px-10 transition-all duration-300 transform hover:scale-105 font-button backdrop-blur-md border border-white/15 ${borderRadiusClasses[buttonBorderRadius]}`}
                style={{ backgroundColor: hexToRgba(actualColors.buttonBackground, 0.7), color: actualColors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
              >
                <span>{buttonText}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Secondary text */}
              {secondaryText !== '' && (
                <span className="text-sm font-medium" style={{ color: actualColors.secondaryText }}>
                  {secondaryText !== undefined ? secondaryText : 'No credit card required • Cancel anytime'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
