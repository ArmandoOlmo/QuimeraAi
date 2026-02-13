import React from 'react';
import { HeroSplitData, BorderRadiusSize, FontSize, CornerGradientConfig } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import CornerGradient from './ui/CornerGradient';

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-6xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl',
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

interface HeroSplitProps extends HeroSplitData {
    borderRadius: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
    onNavigate?: (href: string) => void;
}

const HeroSplit: React.FC<HeroSplitProps> = ({
    headline,
    subheadline,
    buttonText,
    buttonUrl = '/#cta',
    imageUrl,
    imagePosition = 'right',
    maxHeight = 500,
    angleIntensity = 15,
    colors,
    borderRadius,
    headlineFontSize = 'lg',
    subheadlineFontSize = 'md',
    buttonBorderRadius = 'xl',
    cornerGradient,
    onNavigate,
}) => {
    const { getColor } = useDesignTokens();

    // Component colors take priority over Design Tokens
    const actualColors = {
        textBackground: colors?.textBackground || '#ffffff',
        imageBackground: colors?.imageBackground || '#000000',
        heading: colors?.heading || '#000000',
        text: colors?.text || '#374151',
        buttonBackground: colors?.buttonBackground || getColor('primary.main', '#4f46e5'),
        buttonText: colors?.buttonText || '#ffffff',
    };

    // Safe headline handling
    const safeHeadline = typeof headline === 'string' && headline.length > 0 ? headline : 'Your Headline';

    // Determine the clip-path based on angle intensity and image position
    // The angle creates the diagonal cut effect
    const getClipPath = (isImageSide: boolean) => {
        const angle = angleIntensity;
        if (imagePosition === 'right') {
            // Text on left, image on right
            if (isImageSide) {
                // Image side - diagonal cut on left edge
                return `polygon(${angle}% 0, 100% 0, 100% 100%, 0% 100%)`;
            } else {
                // Text side - straight edges
                return `polygon(0 0, 100% 0, ${100 - angle}% 100%, 0 100%)`;
            }
        } else {
            // Image on left, text on right
            if (isImageSide) {
                // Image side - diagonal cut on right edge
                return `polygon(0 0, 100% 0, ${100 - angle}% 100%, 0 100%)`;
            } else {
                // Text side - diagonal cut on left edge
                return `polygon(${angle}% 0, 100% 0, 100% 100%, 0% 100%)`;
            }
        }
    };

    const ImageComponent = () => {
        if (isPendingImage(imageUrl)) {
            return (
                <ImagePlaceholder
                    aspectRatio="16:9"
                    showGenerateButton={false}
                    className="w-full h-full object-cover"
                />
            );
        }

        return (
            <img
                src={imageUrl}
                alt="Hero Image"
                className="w-full h-full object-cover"
            />
        );
    };

    return (
        <section
            className="relative w-full overflow-hidden"
            style={{ maxHeight: `${maxHeight}px`, height: `${maxHeight}px` }}
        >
            {/* Container for both sides */}
            <div className="relative w-full h-full flex">
                {/* Text Side */}
                <div
                    className={`absolute inset-0 flex items-center ${imagePosition === 'right' ? 'justify-start' : 'justify-end'}`}
                    style={{
                        backgroundColor: actualColors.textBackground,
                        clipPath: getClipPath(false),
                        zIndex: 1,
                    }}
                >
                    {/* Corner Gradient overlay on text side */}
                    <CornerGradient config={cornerGradient} />
                    <div
                        className={`relative z-10 w-full md:w-1/2 px-8 md:px-16 py-12 ${imagePosition === 'right' ? 'pr-24 md:pr-32' : 'pl-24 md:pl-32'}`}
                    >
                        <h1
                            className={`${headlineSizeClasses[headlineFontSize]} font-extrabold leading-tight mb-4 font-header split-headline`}
                            style={{
                                color: actualColors.heading,
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)'
                            }}
                        >
                            {safeHeadline}
                        </h1>
                        <p
                            className={`${subheadlineSizeClasses[subheadlineFontSize]} mb-8 font-body max-w-md split-sub`}
                            style={{ color: actualColors.text }}
                        >
                            {subheadline}
                        </p>
                        <a
                            href={buttonUrl}
                            onClick={(e) => {
                                if (onNavigate && buttonUrl && !buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
                                    e.preventDefault();
                                    onNavigate(buttonUrl);
                                }
                            }}
                            className={`split-cta group relative overflow-hidden inline-block font-bold py-3 px-8 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-lg active:scale-95 font-button ${borderRadiusClasses[buttonBorderRadius || borderRadius]}`}
                            style={{
                                backgroundColor: actualColors.buttonBackground,
                                color: actualColors.buttonText,
                                textTransform: 'var(--buttons-transform, none)' as any,
                                letterSpacing: 'var(--buttons-spacing, normal)'
                            }}
                        >
                            <span className="relative z-10">{buttonText}</span>
                            {/* Shine sweep overlay */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                        </a>
                    </div>
                </div>

                {/* Image Side */}
                <div
                    className={`absolute inset-0 split-image-panel ${imagePosition === 'right' ? 'left-auto' : 'right-auto'}`}
                    style={{
                        backgroundColor: actualColors.imageBackground,
                        clipPath: getClipPath(true),
                        zIndex: 2,
                        width: '60%',
                        marginLeft: imagePosition === 'right' ? 'auto' : '0',
                        marginRight: imagePosition === 'left' ? 'auto' : '0',
                    }}
                >
                    <div className="w-full h-full overflow-hidden">
                        <ImageComponent />
                    </div>
                </div>
            </div>

            {/* Entrance & Interaction Animations */}
            <style>{`
                @keyframes split-fade-up {
                    from { opacity: 0; transform: translateY(25px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes split-slide-in {
                    from { opacity: 0; transform: translateX(${imagePosition === 'right' ? '-' : ''}30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes split-image-reveal {
                    from { opacity: 0; transform: scale(1.08); }
                    to { opacity: 1; transform: scale(1); }
                }
                .split-headline {
                    animation: split-fade-up 0.7s ease-out 0.3s forwards;
                    opacity: 0;
                }
                .split-sub {
                    animation: split-fade-up 0.7s ease-out 0.45s forwards;
                    opacity: 0;
                }
                .split-cta {
                    animation: split-fade-up 0.7s ease-out 0.6s forwards;
                    opacity: 0;
                }
                .split-image-panel {
                    animation: split-image-reveal 1.2s ease-out 0.2s forwards;
                    opacity: 0;
                }
                .split-image-panel img {
                    transition: transform 0.6s ease;
                }
                .split-image-panel:hover img {
                    transform: scale(1.05);
                }
            `}</style>
        </section>
    );
};

export default HeroSplit;

