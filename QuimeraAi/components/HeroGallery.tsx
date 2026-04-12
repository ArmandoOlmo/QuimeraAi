import React, { useState, useEffect } from 'react';
import { HeroGalleryData, FontSize, BorderRadiusSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { sanitizeHtml } from '../utils/sanitize';
import CornerGradient from './ui/CornerGradient';

// ─── Size mappings ───
const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl lg:text-4xl',
    md: 'text-3xl md:text-4xl lg:text-5xl',
    lg: 'text-3xl md:text-5xl lg:text-6xl',
    xl: 'text-4xl md:text-6xl lg:text-7xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-xs md:text-sm',
    md: 'text-sm md:text-base lg:text-lg',
    lg: 'text-base md:text-lg lg:text-xl',
    xl: 'text-lg md:text-xl lg:text-2xl',
};

// ─── Gallery Image sub-component ───
const GalleryImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
    if (isPendingImage(src)) {
        return <ImagePlaceholder aspectRatio="3:4" showGenerateButton={false} className={`w-full h-full ${className}`} />;
    }
    return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} loading="lazy" />;
};

// ─── Props ───
interface HeroGalleryProps extends HeroGalleryData {
    borderRadius?: BorderRadiusSize;
    onNavigate?: (href: string) => void;
}

/**
 * HeroGallery — Gallery-style slideshow hero.
 * Inspired by Nordic gallery aesthetics: solid warm backgrounds, floating framed artwork,
 * refined light-weight typography, text-link CTAs, built-in slideshow with dots & arrows,
 * subtle grain texture, and staggered entrance animations.
 */
const HeroGallery: React.FC<HeroGalleryProps> = ({
    slides = [],
    autoPlaySpeed = 6000,
    transitionDuration = 800,
    showArrows = true,
    showDots = true,
    dotStyle = 'circle',
    heroHeight,
    headlineFontSize = 'lg',
    subheadlineFontSize = 'md',
    showGrain = true,
    frameStyle = 'shadow',
    colors,
    cornerGradient,
    onNavigate,
}) => {
    const { getColor } = useDesignTokens();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Fallback slide if no data provided
    const validSlides = Array.isArray(slides) && slides.length > 0 ? slides : [{
        headline: 'Welcome to Our Gallery',
        subheadline: 'Discover our curated collection',
        primaryCta: 'Explore',
        primaryCtaLink: '/#cta',
        images: [],
    }];

    const hasMultipleSlides = validSlides.length > 1;

    // ─── Slideshow controls ───
    const goToPrevious = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(prev => prev === 0 ? validSlides.length - 1 : prev - 1);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    const goToNext = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(prev => prev === validSlides.length - 1 ? 0 : prev + 1);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    const goToSlide = (index: number) => {
        if (isTransitioning || index === currentIndex) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), transitionDuration);
    };

    // Auto-play
    useEffect(() => {
        if (!hasMultipleSlides) return;
        const interval = setInterval(goToNext, autoPlaySpeed);
        return () => clearInterval(interval);
    }, [currentIndex, hasMultipleSlides, autoPlaySpeed]);

    // ─── Colors ───
    const activeSlide = validSlides[currentIndex];
    const bgColor = activeSlide?.backgroundColor || colors?.background || '#8B6F5C';
    const textColor = colors?.text || '#ffffff';
    const headingColor = colors?.heading || '#ffffff';
    const ctaColor = colors?.ctaText || '#ffffff';
    const frameColor = colors?.frameColor || 'rgba(255,255,255,0.15)';

    // ─── Frame styles for gallery images ───
    const getFrameStyles = (): React.CSSProperties => {
        switch (frameStyle) {
            case 'thin':
                return {
                    border: `2px solid ${frameColor}`,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                };
            case 'shadow':
                return {
                    boxShadow: '0 12px 48px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.1)',
                };
            case 'glass':
                return {
                    border: `1px solid ${frameColor}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                };
            case 'none':
            default:
                return {};
        }
    };

    // ─── Navigation handler ───
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    const minHeight = heroHeight ? `${heroHeight}vh` : '80vh';

    return (
        <section
            className="relative w-full overflow-hidden"
            style={{
                minHeight,
                backgroundColor: bgColor,
                transition: `background-color ${transitionDuration}ms ease-in-out`,
            }}
        >
            <CornerGradient config={cornerGradient} />

            {/* Grain texture overlay */}
            {showGrain && <div className="absolute inset-0 z-[1] pointer-events-none gallery-grain" />}

            {/* ─── Slides (absolute stacked, crossfade via opacity) ─── */}
            {validSlides.map((slide, i) => {
                const isActive = i === currentIndex;
                const images = slide.images || [];
                const primaryImage = images[0];
                const secondaryImage = images[1];

                return (
                    <div
                        key={i}
                        className="absolute inset-0 z-[5]"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transition: `opacity ${transitionDuration}ms ease-in-out`,
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                    >
                        <div
                            className="w-full flex flex-col justify-center md:flex-row md:items-center gap-6 md:gap-12 max-w-7xl mx-auto px-5 md:px-12 py-24 md:py-0"
                            style={{ minHeight }}
                        >
                            {/* ─── Text column ─── */}
                            <div className="w-full md:w-[55%] flex flex-col justify-center md:pr-8">
                                {/* Headline */}
                                <h1
                                    className={`${headlineSizeClasses[headlineFontSize]} font-light leading-tight mb-3 md:mb-5 font-header gallery-headline`}
                                    style={{
                                        color: headingColor,
                                        textTransform: 'var(--headings-transform, none)' as any,
                                        letterSpacing: 'var(--headings-spacing, normal)',
                                    }}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(slide.headline) }}
                                />

                                {/* Subheadline */}
                                {slide.subheadline && (
                                    <p
                                        className={`${subheadlineSizeClasses[subheadlineFontSize]} font-body opacity-80 mb-6 md:mb-10 gallery-sub`}
                                        style={{ color: textColor }}
                                    >
                                        {slide.subheadline}
                                    </p>
                                )}

                                {/* CTAs — minimalist text links separated by dot */}
                                <div className="flex items-center gap-4 gallery-cta">
                                    {slide.primaryCta && (
                                        <a
                                            href={slide.primaryCtaLink || '/#cta'}
                                            onClick={(e) => handleNavigate(e, slide.primaryCtaLink || '/#cta')}
                                            className="text-xs md:text-sm font-bold tracking-[0.15em] uppercase hover:opacity-70 transition-opacity duration-300 underline-offset-4 hover:underline font-button"
                                            style={{
                                                color: ctaColor,
                                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                                letterSpacing: 'var(--buttons-spacing, 0.15em)',
                                            }}
                                        >
                                            {slide.primaryCta}
                                        </a>
                                    )}
                                    {slide.primaryCta && slide.secondaryCta && (
                                        <span className="text-xs opacity-40" style={{ color: ctaColor }}>·</span>
                                    )}
                                    {slide.secondaryCta && (
                                        <a
                                            href={slide.secondaryCtaLink || '/#features'}
                                            onClick={(e) => handleNavigate(e, slide.secondaryCtaLink || '/#features')}
                                            className="text-xs md:text-sm font-bold tracking-[0.15em] uppercase hover:opacity-70 transition-opacity duration-300 underline-offset-4 hover:underline font-button"
                                            style={{
                                                color: ctaColor,
                                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                                letterSpacing: 'var(--buttons-spacing, 0.15em)',
                                            }}
                                        >
                                            {slide.secondaryCta}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* ─── Gallery images column ─── */}
                            {images.length > 0 && (
                                <div className="w-full md:w-[45%] flex gap-3 md:gap-5 items-start justify-center md:justify-end">
                                    {/* Primary image — larger, offset down */}
                                    {primaryImage && (
                                        <div className={`${secondaryImage ? 'w-[50%] md:w-[55%]' : 'w-[60%] md:w-[65%]'} pt-6 md:pt-12 gallery-img-1`}>
                                            <div
                                                className="aspect-[3/4] overflow-hidden"
                                                style={getFrameStyles()}
                                            >
                                                <GalleryImage src={primaryImage.url} alt={primaryImage.alt} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Secondary image — smaller, offset up */}
                                    {secondaryImage && (
                                        <div className="w-[42%] md:w-[42%] pt-0 md:pt-2 gallery-img-2">
                                            <div
                                                className="aspect-[3/4] overflow-hidden"
                                                style={getFrameStyles()}
                                            >
                                                <GalleryImage src={secondaryImage.url} alt={secondaryImage.alt} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ─── Slideshow Controls (always visible, not part of slide layers) ─── */}
            {hasMultipleSlides && (
                <div className="absolute bottom-6 md:bottom-10 right-5 md:right-12 flex items-center gap-3 z-20">
                    {/* Dots */}
                    {showDots && (
                        <div className="flex items-center gap-2">
                            {validSlides.map((_, i) => (
                                <button
                                    key={i}
                                    title={`Go to slide ${i + 1}`}
                                    onClick={() => goToSlide(i)}
                                    className="transition-all duration-300"
                                    style={{
                                        width: dotStyle === 'line'
                                            ? (i === currentIndex ? '24px' : '12px')
                                            : (i === currentIndex ? '10px' : '8px'),
                                        height: dotStyle === 'line' ? '3px' : (i === currentIndex ? '10px' : '8px'),
                                        borderRadius: '999px',
                                        backgroundColor: i === currentIndex
                                            ? (colors?.dotActive || '#ffffff')
                                            : 'transparent',
                                        border: i === currentIndex
                                            ? 'none'
                                            : `1.5px solid ${colors?.dotInactive || 'rgba(255,255,255,0.6)'}`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {/* Arrows */}
                    {showArrows && (
                        <div className="flex items-center gap-0.5 ml-2">
                            <button
                                onClick={goToPrevious}
                                className="p-1 hover:opacity-60 transition-opacity duration-200"
                                style={{ color: colors?.arrowColor || '#ffffff' }}
                                title="Previous slide"
                            >
                                <ChevronLeft size={20} strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={goToNext}
                                className="p-1 hover:opacity-60 transition-opacity duration-200"
                                style={{ color: colors?.arrowColor || '#ffffff' }}
                                title="Next slide"
                            >
                                <ChevronRight size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Custom Animations ─── */}
            <style>{`
                @keyframes gallery-fade-up {
                    from { opacity: 0; transform: translateY(25px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes gallery-img-reveal {
                    from { opacity: 0; transform: scale(0.92) translateY(15px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .gallery-headline {
                    animation: gallery-fade-up 0.9s ease-out 0.2s both;
                }
                .gallery-sub {
                    animation: gallery-fade-up 0.8s ease-out 0.4s both;
                }
                .gallery-cta {
                    animation: gallery-fade-up 0.7s ease-out 0.6s both;
                }
                .gallery-img-1 {
                    animation: gallery-img-reveal 1s ease-out 0.3s both;
                }
                .gallery-img-2 {
                    animation: gallery-img-reveal 1s ease-out 0.55s both;
                }
                .gallery-grain {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                    opacity: 0.035;
                    mix-blend-mode: overlay;
                }
            `}</style>
        </section>
    );
};

export default HeroGallery;
