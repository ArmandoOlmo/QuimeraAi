
import React from 'react';
import { HowItWorksData, PaddingSize, BorderRadiusSize, HowItWorksIcon, FontSize, CornerGradientConfig } from '../types';
import { Upload, Cog, Sparkles, Download, Share2, Search } from 'lucide-react';
import CornerGradient from './ui/CornerGradient';

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

const howItWorksIcons: Record<HowItWorksIcon, React.ReactNode> = {
    'upload': <Upload size={32} />,
    'process': <Cog size={32} />,
    'magic-wand': <Sparkles size={32} />,
    'download': <Download size={32} />,
    'share': <Share2 size={32} />,
    'search': <Search size={32} />,
};

interface HowItWorksProps extends HowItWorksData {
    borderRadius: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ title, description, steps, items = [], paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md', cornerGradient }) => {
    const visibleItems = (items || []).slice(0, steps);
    const gridColsClass = steps === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

    return (
        <section id="how-it-works" className="w-full relative overflow-hidden" style={{ backgroundColor: colors?.background }}>
            <CornerGradient config={cornerGradient} />
            <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
                <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors?.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
                <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors?.description || colors?.text }}>
                    {description}
                </p>
            </div>

            <div className={`grid grid-cols-1 ${gridColsClass} gap-x-8 gap-y-12 relative`}>
                {visibleItems.map((item, index) => (
                    <div key={index} className="flex flex-col items-center text-center relative">
                        {/* Connecting line for desktop */}
                        {index < steps - 1 && (
                            <div
                                className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 border-t-2 border-dashed"
                                style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            />
                        )}
                        {/* Connecting line for mobile */}
                        {index < steps - 1 && (
                             <div
                                className="md:hidden absolute top-10 left-1/2 h-full w-0.5 border-l-2 border-dashed"
                                style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            />
                        )}
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative z-10"
                            style={{ backgroundColor: colors?.accent }}
                        >
                            <span style={{ color: (colors as any).iconColor || '#ffffff' }}>{howItWorksIcons[item.icon]}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 font-header" style={{ color: (colors as any).stepTitle || '#ffffff', textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{item.title}</h3>
                        <p className="font-body" style={{ color: colors?.text }}>{item.description}</p>
                    </div>
                ))}
            </div>
            </div>
        </section>
    );
};

export default HowItWorks;
