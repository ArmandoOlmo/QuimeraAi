import React, { useState, useEffect } from 'react';
import { HeroGalleryData, FontSize, BorderRadiusSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitize';
import CornerGradient from './ui/CornerGradient';
import { hexToRgba } from '../utils/colorUtils';

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

// ─── Props ───
interface HeroGalleryProps extends HeroGalleryData {
    borderRadius?: BorderRadiusSize;
    onNavigate?: (href: string) => void;
    textHorizontalAlign?: 'left' | 'center' | 'right';
    textVerticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * HeroGallery — Fullscreen background-image slideshow hero.
 * Each slide has a full-bleed background image with text overlay.
 * Inspired by Copenhagen Oil: warm tones, fullscreen imagery, clean typography,
 * text-link CTAs, slideshow with dots & arrows, subtle grain texture.
 */
const HeroGallery: React.FC<HeroGalleryProps> = ({
  glassEffect, slides = [],
    autoPlaySpeed = 6000,
    transitionDuration = 800,
    showArrows = true,
    showDots = true,
    dotStyle = 'circle',
    heroHeight,
    headlineFontSize = 'lg',
    subheadlineFontSize = 'md',
    showGrain = true,
    overlayOpacity = 0.35,
    colors,
    cornerGradient,
    onNavigate,
    textHorizontalAlign = 'left',
    textVerticalAlign = 'bottom',
    bgPosition = 'center',
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
    const bgColor = colors?.background || '#8B6F5C';
    const textColor = colors?.text || '#ffffff';
    const headingColor = colors?.heading || '#ffffff';
    const ctaColor = colors?.ctaText || '#ffffff';

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
            className={`relative w-full overflow-hidden ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`}
            style={{ minHeight, backgroundColor: glassEffect ? hexToRgba(bgColor , 0.4) : bgColor }}
        >
            <CornerGradient config={cornerGradient} />

            {/* ─── Slides (absolute stacked, crossfade via opacity) ─── */}
            {validSlides.map((slide, i) => {
                const isActive = i === currentIndex;
                // Support both new backgroundImage and legacy images[0].url
                const bgImage = slide.backgroundImage || slide.images?.[0]?.url;
                const slideBg = slide.backgroundColor || bgColor;

                return (
                    <div
                        key={i}
                        className="absolute inset-0 z-[2]"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transition: `opacity ${transitionDuration}ms ease-in-out`,
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                    >
                        {/* Background image — fullscreen */}
                        {bgImage ? (
                            <div
                                className="absolute inset-0 z-0"
                                style={{
                                    backgroundImage: `url(${bgImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: bgPosition || 'center',
                                    backgroundColor: slideBg,
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-0 z-0"
                                style={{ backgroundColor: slideBg }}
                            />
                        )}

                        {/* Dark overlay for text readability */}
                        <div
                            className={`absolute inset-0 z-[1] ${glassEffect ? 'backdrop-blur-md' : ''}`}
                            style={{
                                backgroundColor: `rgba(0, 0, 0, ${overlayOpacity > 1 ? overlayOpacity / 100 : overlayOpacity})`,
                            }}
                        />

                        {/* Grain texture overlay */}
                        {showGrain && <div className="absolute inset-0 z-[2] pointer-events-none gallery-grain" />}

                        {/* ─── Text content ─── */}
                        <div
                            className={`relative z-[5] w-full flex flex-col px-5 md:px-12 ${
                                textVerticalAlign === 'top' ? 'justify-start pt-32 pb-10' :
                                textVerticalAlign === 'middle' ? 'justify-center py-20' :
                                'justify-end pb-20 md:pb-24 pt-10'
                            }`}
                            style={{ minHeight }}
                        >
                            <div className={`max-w-4xl w-full ${
                                textHorizontalAlign === 'center' ? 'mx-auto text-center flex flex-col items-center' : 
                                textHorizontalAlign === 'right' ? 'ml-auto text-right flex flex-col items-end' : 
                                'mr-auto text-left flex flex-col items-start'
                            }`}>
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
                                        className={`${subheadlineSizeClasses[subheadlineFontSize]} font-body opacity-85 mb-8 md:mb-12 gallery-sub`}
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
                        </div>
                    </div>
                );
            })}

            {/* ─── Slideshow Controls (always visible, above slide layers) ─── */}
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
                                    className="transition-all duration-300 no-min-touch"
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
                .gallery-headline {
                    animation: gallery-fade-up 0.9s ease-out 0.2s both;
                }
                .gallery-sub {
                    animation: gallery-fade-up 0.8s ease-out 0.4s both;
                }
                .gallery-cta {
                    animation: gallery-fade-up 0.7s ease-out 0.6s both;
                }
                .gallery-grain {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                    opacity: 0.035;
                    mix-blend-mode: overlay;
                }
            `}
            </style>
        </section>
    );
};

export default HeroGallery;
