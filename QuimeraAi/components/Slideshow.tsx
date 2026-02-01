
import React, { useState, useEffect } from 'react';
import { SlideshowData, PaddingSize, BorderRadiusSize, FontSize, SlideshowVariant, ArrowStyle, DotStyle, CornerGradientConfig } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { useDesignTokens } from '../hooks/useDesignTokens';
import CornerGradient from './ui/CornerGradient';

// Helper component to render slideshow image or placeholder
const SlideImage: React.FC<{ imageUrl: string; altText: string; className?: string }> = ({ imageUrl, altText, className = '' }) => {
    if (isPendingImage(imageUrl)) {
        return <ImagePlaceholder aspectRatio="16:9" showGenerateButton={false} className={`w-full h-full ${className}`} />;
    }
    return <img src={imageUrl} alt={altText} className={`w-full h-full object-cover ${className}`} />;
};

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

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

interface SlideshowProps extends SlideshowData {
    borderRadius?: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

const Slideshow: React.FC<SlideshowProps> = ({ 
    slideshowVariant = 'classic',
    title, 
    showTitle = true,
    fullWidth = false,
    items = [], 
    paddingY, 
    paddingX, 
    colors, 
    borderRadius = 'xl', 
    titleFontSize = 'md',
    autoPlaySpeed = 5000,
    transitionEffect = 'slide',
    transitionDuration = 500,
    showArrows = true,
    showDots = true,
    arrowStyle = 'rounded',
    dotStyle = 'circle',
    kenBurnsIntensity = 'medium',
    thumbnailSize = 80,
    showCaptions = false,
    slideHeight = 600,
    cornerGradient
}) => {
    // Get design tokens with primary color
    const { getColor } = useDesignTokens();
    const primaryColor = getColor('primary.main', '#4f46e5');
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const hasItems = items && items.length > 0;

    const goToPrevious = () => {
        if (!hasItems || isTransitioning) return;
        setIsTransitioning(true);
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? items.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    const goToNext = () => {
        if (!hasItems || isTransitioning) return;
        setIsTransitioning(true);
        const isLastSlide = currentIndex === items.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    const goToSlide = (slideIndex: number) => {
        if (isTransitioning || slideIndex === currentIndex) return;
        setIsTransitioning(true);
        setCurrentIndex(slideIndex);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    // Auto-play feature
    useEffect(() => {
        if (!hasItems) return;
        const interval = setInterval(() => {
            goToNext();
        }, autoPlaySpeed);
        return () => clearInterval(interval);
    }, [currentIndex, hasItems, items, autoPlaySpeed]);

    // Arrow style classes
    const getArrowClasses = () => {
        const baseClasses = "absolute top-1/2 -translate-y-1/2 p-3 transition-all duration-300 z-20";
        const bgColor = colors?.arrowBackground || 'rgba(0, 0, 0, 0.4)';
        const textColor = colors?.arrowText || '#ffffff';
        
        const shapes = {
            rounded: 'rounded-full hover:scale-110',
            square: 'rounded-none hover:scale-105',
            minimal: 'rounded hover:opacity-80',
            floating: 'rounded-full hover:scale-110'
        };
        
        return `${baseClasses} ${shapes[arrowStyle]}`;
    };

    // Dot style classes
    const getDotClasses = (isActive: boolean) => {
        const activeColor = colors?.dotActive || '#ffffff';
        const inactiveColor = colors?.dotInactive || 'rgba(255, 255, 255, 0.5)';
        
        const shapes = {
            circle: 'w-3 h-3 rounded-full',
            line: isActive ? 'w-8 h-1 rounded-full' : 'w-3 h-1 rounded-full',
            square: 'w-3 h-3 rounded-sm',
            pill: isActive ? 'w-8 h-3 rounded-full' : 'w-3 h-3 rounded-full'
        };
        
        return `${shapes[dotStyle]} transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`;
    };

    // Ken Burns animation intensity
    const getKenBurnsScale = () => {
        const scales = {
            low: 'scale-105',
            medium: 'scale-110',
            high: 'scale-125'
        };
        return scales[kenBurnsIntensity];
    };

    // Get transition styles based on effect type
    const getTransitionStyles = (index: number): React.CSSProperties => {
        const isActive = index === currentIndex;
        
        switch (transitionEffect) {
            case 'fade':
                return {
                    position: 'absolute',
                    inset: 0,
                    opacity: isActive ? 1 : 0,
                    transition: `opacity ${transitionDuration}ms ease-in-out`,
                    zIndex: isActive ? 10 : 0,
                };
            case 'zoom':
                return {
                    position: 'absolute',
                    inset: 0,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scale(1)' : 'scale(1.1)',
                    transition: `opacity ${transitionDuration}ms ease-in-out, transform ${transitionDuration}ms ease-in-out`,
                    zIndex: isActive ? 10 : 0,
                };
            case 'slide':
            default:
                return {}; // Slide effect uses different layout
        }
    };

    // Render Classic Variant
    const renderClassic = () => {
        const containerStyle: React.CSSProperties = fullWidth 
            ? { height: `${slideHeight}px` }
            : {};
        const containerClass = fullWidth 
            ? `w-full overflow-hidden relative ${fullWidth ? 'rounded-none' : borderRadiusClasses[borderRadius]}`
            : `w-full aspect-video overflow-hidden relative ${borderRadiusClasses[borderRadius]}`;

        // For slide effect, use horizontal scroll layout
        if (transitionEffect === 'slide') {
            return (
                <div className={containerClass} style={containerStyle}>
                    <div 
                        className="w-full h-full whitespace-nowrap transition-transform ease-in-out" 
                        style={{ 
                            transform: `translateX(-${currentIndex * 100}%)`,
                            transitionDuration: `${transitionDuration}ms`
                        }}
                    >
                        {items.map((item, index) => (
                            <div key={index} className="inline-block w-full h-full align-top relative">
                                <SlideImage imageUrl={item.imageUrl} altText={item.altText} />
                                {showCaptions && item.caption && (
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 p-4 text-center"
                                        style={{ 
                                            backgroundColor: colors?.captionBackground || 'rgba(0, 0, 0, 0.7)',
                                            color: colors?.captionText || '#ffffff'
                                        }}
                                    >
                                        {item.caption}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {renderControls()}
                </div>
            );
        }
        
        // For fade and zoom effects, use absolute positioning
        return (
            <div className={containerClass} style={containerStyle}>
                <div className="relative w-full h-full">
                    {items.map((item, index) => (
                        <div 
                            key={index} 
                            style={getTransitionStyles(index)}
                            className="w-full h-full"
                        >
                            <SlideImage imageUrl={item.imageUrl} altText={item.altText} />
                            {showCaptions && item.caption && index === currentIndex && (
                                <div 
                                    className="absolute bottom-0 left-0 right-0 p-4 text-center"
                                    style={{ 
                                        backgroundColor: colors?.captionBackground || 'rgba(0, 0, 0, 0.7)',
                                        color: colors?.captionText || '#ffffff'
                                    }}
                                >
                                    {item.caption}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {renderControls()}
            </div>
        );
    };

    // Render Ken Burns Variant
    const renderKenBurns = () => {
        const containerStyle: React.CSSProperties = fullWidth 
            ? { height: `${slideHeight}px` }
            : {};
        const containerClass = fullWidth 
            ? `w-full overflow-hidden relative ${fullWidth ? 'rounded-none' : borderRadiusClasses[borderRadius]}`
            : `w-full aspect-video overflow-hidden relative ${borderRadiusClasses[borderRadius]}`;

        return (
            <div className={containerClass} style={containerStyle}>
                <div className="relative w-full h-full">
                    {items.map((item, index) => (
                        <div 
                            key={index} 
                            className={`absolute inset-0 transition-opacity duration-1000 ${
                                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        >
                            <div className="w-full h-full overflow-hidden">
                                {isPendingImage(item.imageUrl) ? (
                                    <ImagePlaceholder aspectRatio="16:9" showGenerateButton={false} className="w-full h-full" />
                                ) : (
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.altText} 
                                        className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${
                                            index === currentIndex ? getKenBurnsScale() : 'scale-100'
                                        }`}
                                    />
                                )}
                            </div>
                            {showCaptions && item.caption && index === currentIndex && (
                                <div 
                                    className="absolute bottom-0 left-0 right-0 p-4 text-center animate-fade-in"
                                    style={{ 
                                        backgroundColor: colors?.captionBackground || 'rgba(0, 0, 0, 0.7)',
                                        color: colors?.captionText || '#ffffff'
                                    }}
                                >
                                    {item.caption}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {renderControls()}
            </div>
        );
    };

    // Render 3D Cards Variant
    const renderCards3D = () => {
        const containerStyle: React.CSSProperties = fullWidth 
            ? { height: `${slideHeight}px`, perspective: '1000px' }
            : { perspective: '1000px' };
        const containerClass = fullWidth 
            ? `relative w-full`
            : `relative w-full aspect-video`;

        return (
            <div className={containerClass} style={containerStyle}>
                <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                    {items.map((item, index) => {
                        const offset = index - currentIndex;
                        const isActive = index === currentIndex;
                        
                        return (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-all duration-700 ${fullWidth ? 'rounded-none' : borderRadiusClasses[borderRadius]} overflow-hidden`}
                                style={{
                                    transform: `
                                        translateX(${offset * 100}px)
                                        translateZ(${isActive ? 0 : -200}px)
                                        rotateY(${offset * 15}deg)
                                        scale(${isActive ? 1 : 0.85})
                                    `,
                                    opacity: Math.abs(offset) > 1 ? 0 : 1,
                                    zIndex: isActive ? 10 : 10 - Math.abs(offset),
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <SlideImage imageUrl={item.imageUrl} altText={item.altText} />
                                {showCaptions && item.caption && isActive && (
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 p-4 text-center"
                                        style={{ 
                                            backgroundColor: colors?.captionBackground || 'rgba(0, 0, 0, 0.7)',
                                            color: colors?.captionText || '#ffffff'
                                        }}
                                    >
                                        {item.caption}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {renderControls()}
            </div>
        );
    };

    // Render Thumbnails Variant
    const renderThumbnails = () => {
        const containerStyle: React.CSSProperties = fullWidth 
            ? { height: `${slideHeight}px` }
            : {};
        const containerClass = fullWidth 
            ? `w-full overflow-hidden relative ${fullWidth ? 'rounded-none' : borderRadiusClasses[borderRadius]}`
            : `w-full aspect-video overflow-hidden relative ${borderRadiusClasses[borderRadius]}`;

        return (
            <div className="w-full space-y-4">
                <div className={containerClass} style={containerStyle}>
                    <div 
                        className="w-full h-full whitespace-nowrap transition-transform ease-in-out" 
                        style={{ 
                            transform: `translateX(-${currentIndex * 100}%)`,
                            transitionDuration: `${transitionDuration}ms`
                        }}
                    >
                        {items.map((item, index) => (
                            <div key={index} className="inline-block w-full h-full align-top relative">
                                <SlideImage imageUrl={item.imageUrl} altText={item.altText} />
                                {showCaptions && item.caption && (
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 p-4 text-center"
                                        style={{ 
                                            backgroundColor: colors?.captionBackground || 'rgba(0, 0, 0, 0.7)',
                                            color: colors?.captionText || '#ffffff'
                                        }}
                                    >
                                        {item.caption}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {renderControls()}
                </div>
                
                {/* Thumbnails */}
                <div className={`flex gap-2 justify-center overflow-x-auto pb-2 ${fullWidth ? paddingXClasses[paddingX] : ''}`}>
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`flex-shrink-0 overflow-hidden transition-all duration-300 ${borderRadiusClasses[borderRadius]}`}
                            style={{ 
                                height: `${thumbnailSize}px`,
                                width: `${thumbnailSize * 1.5}px`,
                                border: index === currentIndex 
                                    ? `4px solid ${colors?.dotActive || '#ffffff'}` 
                                    : `2px solid ${colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'}`,
                                transform: index === currentIndex ? 'scale(1.05)' : 'scale(1)',
                            }}
                            onMouseEnter={(e) => {
                                if (index !== currentIndex) {
                                    e.currentTarget.style.borderColor = colors?.dotActive || '#ffffff';
                                    e.currentTarget.style.borderWidth = '2px';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (index !== currentIndex) {
                                    e.currentTarget.style.borderColor = colors?.dotInactive || 'rgba(255, 255, 255, 0.5)';
                                    e.currentTarget.style.borderWidth = '2px';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            <SlideImage imageUrl={item.imageUrl} altText={item.altText} />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // Render Controls (Arrows and Dots)
    const renderControls = () => (
        <>
            {showArrows && (
                <>
                    <button 
                        onClick={goToPrevious} 
                        className={`${getArrowClasses()} left-4`}
                        style={{ 
                            backgroundColor: colors?.arrowBackground || 'rgba(0, 0, 0, 0.4)',
                            color: colors?.arrowText || '#ffffff'
                        }}
                    >
                        <ChevronLeft />
                    </button>
                    <button 
                        onClick={goToNext} 
                        className={`${getArrowClasses()} right-4`}
                        style={{ 
                            backgroundColor: colors?.arrowBackground || 'rgba(0, 0, 0, 0.4)',
                            color: colors?.arrowText || '#ffffff'
                        }}
                    >
                        <ChevronRight />
                    </button>
                </>
            )}
            
            {showDots && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {items.map((_, slideIndex) => (
                        <button
                            key={slideIndex}
                            title={`Go to slide ${slideIndex + 1}`}
                            onClick={() => goToSlide(slideIndex)}
                            className={getDotClasses(currentIndex === slideIndex)}
                            style={{ 
                                backgroundColor: currentIndex === slideIndex 
                                    ? colors?.dotActive || '#ffffff'
                                    : colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    );

    // Render variant selector
    const renderVariant = () => {
        switch (slideshowVariant) {
            case 'kenburns':
                return renderKenBurns();
            case 'cards3d':
                return renderCards3D();
            case 'thumbnails':
                return renderThumbnails();
            default:
                return renderClassic();
        }
    };

    return (
        <section 
            className="w-full relative overflow-hidden" 
            style={{ backgroundColor: colors?.background }}
        >
            <CornerGradient config={cornerGradient} />
            <div className={`${fullWidth ? '' : 'container mx-auto'} ${paddingYClasses[paddingY]} ${fullWidth ? '' : paddingXClasses[paddingX]} relative z-10`}>
                {showTitle && title && (
                    <div className={`text-center max-w-3xl mx-auto mb-16 ${fullWidth ? paddingXClasses[paddingX] : ''}`}>
                        <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors?.heading || primaryColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
                    </div>
                )}
                {hasItems ? (
                    <div className={`relative w-full ${fullWidth ? '' : 'max-w-5xl mx-auto'}`}>
                        {renderVariant()}
                    </div>
                ) : (
                    <div className={`text-center text-editor-text-secondary p-8 bg-editor-panel-bg rounded-lg ${fullWidth ? 'mx-4' : ''}`}>
                        No slides to display. Add some in the editor!
                    </div>
                )}
            </div>
        </section>
    );
};

export default Slideshow;
