import React, { useState, useEffect, useRef } from 'react';
import { FontSize, BorderRadiusSize, CornerGradientConfig } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitize';
import CornerGradient from './ui/CornerGradient';
import { hexToRgba } from '../utils/colorUtils';

// ─── Types ───
export interface HeroNovaSlide {
    headline: string;
    subheadline?: string;
    primaryCta?: string;
    primaryCtaLink?: string;
    /** 'image' or 'video' */
    mediaType?: 'image' | 'video';
    /** Image URL for background */
    backgroundImage?: string;
    /** Video URL for background */
    backgroundVideo?: string;
    /** Fallback color when no media */
    backgroundColor?: string;
}

export interface HeroNovaData {
    slides: HeroNovaSlide[];
    /** Large centered display text (brand name, etc.) */
    displayText?: string;
    /** Show the centered display text */
    showDisplayText?: boolean;
    autoPlaySpeed?: number;
    transitionDuration?: number;
    showArrows?: boolean;
    showDots?: boolean;
    dotStyle?: 'circle' | 'line';
    heroHeight?: number;
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    overlayOpacity?: number;
    /** Display text letter spacing multiplier */
    displayLetterSpacing?: number;
    colors?: {
        background?: string;
        text?: string;
        heading?: string;
        displayText?: string;
        ctaText?: string;
        ctaBackground?: string;
        dotActive?: string;
        dotInactive?: string;
        arrowColor?: string;
    };
    buttonBorderRadius?: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

// ─── Size mappings ───
const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-lg md:text-xl lg:text-2xl',
    md: 'text-xl md:text-2xl lg:text-3xl',
    lg: 'text-2xl md:text-3xl lg:text-4xl',
    xl: 'text-3xl md:text-4xl lg:text-5xl',
};

const displaySizeMap: Record<FontSize, string> = {
    sm: 'text-3xl sm:text-4xl md:text-6xl lg:text-7xl',
    md: 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl',
    lg: 'text-4xl sm:text-6xl md:text-8xl lg:text-9xl',
    xl: 'text-5xl sm:text-7xl md:text-9xl lg:text-[11rem]',
};

// ─── Props ───
interface HeroNovaProps extends HeroNovaData {
    borderRadius?: BorderRadiusSize;
    onNavigate?: (href: string) => void;
}

const HeroNova: React.FC<HeroNovaProps> = ({
  glassEffect, slides = [],
    displayText = '',
    showDisplayText = true,
    autoPlaySpeed = 6000,
    transitionDuration = 700,
    showArrows = true,
    showDots = true,
    dotStyle = 'circle',
    heroHeight,
    headlineFontSize = 'md',
    overlayOpacity = 0.35,
    displayLetterSpacing = 0,
    colors,
    cornerGradient,
    onNavigate,
}) => {
    const { getColor } = useDesignTokens();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);



    // Fallback slide and smart empty-slide filtering
    const rawSlides = Array.isArray(slides) && slides.length > 0 ? slides : [{
        headline: 'Comfort, Style, Durability: Our Seating Collection',
        primaryCta: 'SHOP NOW',
        primaryCtaLink: '/#products',
        mediaType: 'image' as const,
        backgroundImage: '',
        backgroundColor: '#1a1a1a',
    }];

    // Filter out slides that have absolutely no media (common AI hallucination causing "disappearing" image)
    const validSlides = rawSlides.filter((s, i) => {
        // Keep the first slide always, so we at least have one slide to render
        if (i === 0) return true;
        const bgImg = s.backgroundImage || (s as any).imageUrl || (s as any).images?.[0]?.url;
        // Keep slide if it has image, video, OR a custom background color that isn't the default or empty
        return !!bgImg || !!s.backgroundVideo || (s.backgroundColor && s.backgroundColor !== '#1a1a1a' && s.backgroundColor !== '');
    });

    const hasMultipleSlides = validSlides.length > 1;

    const [displayScale, setDisplayScale] = useState(1);
    const displayContainerRef = useRef<HTMLDivElement>(null);
    const displayTextRef = useRef<HTMLHeadingElement>(null);

    const [headlineScale, setHeadlineScale] = useState(1);
    const headlineContainerRef = useRef<HTMLDivElement>(null);
    const headlineTextRef = useRef<HTMLHeadingElement>(null);

    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const calculateScales = () => {
            if (displayContainerRef.current && displayTextRef.current && showDisplayText && displayText) {
                displayTextRef.current.style.transform = 'scale(1)';
                const containerWidth = displayContainerRef.current.clientWidth - 32;
                const textWidth = displayTextRef.current.scrollWidth;
                if (textWidth > containerWidth && containerWidth > 0) {
                    setDisplayScale(containerWidth / textWidth);
                } else {
                    setDisplayScale(1);
                }
            }

            if (headlineContainerRef.current && headlineTextRef.current) {
                headlineTextRef.current.style.transform = 'scale(1)';
                const containerWidth = headlineContainerRef.current.clientWidth;
                const textWidth = headlineTextRef.current.scrollWidth;
                if (textWidth > containerWidth && containerWidth > 0) {
                    setHeadlineScale(containerWidth / textWidth);
                } else {
                    setHeadlineScale(1);
                }
            }
        };

        calculateScales();
        document.fonts?.ready.then(calculateScales);

        const observer = new ResizeObserver(() => {
            calculateScales();
        });

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }
        
        window.addEventListener('resize', calculateScales);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', calculateScales);
        };
    }, [displayText, showDisplayText, headlineFontSize, validSlides, currentIndex]);



    // Colors
    const textColor = colors?.text || '#ffffff';
    const headingColor = colors?.heading || '#ffffff';
    const displayColor = colors?.displayText || 'rgba(255,255,255,0.85)';
    const ctaText = colors?.ctaText || '#1a1a1a';
    const ctaBg = colors?.ctaBackground || '#ffffff';
    const bgColor = colors?.background || '#1a1a1a';

    // ─── Slideshow ───
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

    // Manage video playback based on active slide
    useEffect(() => {
        videoRefs.current.forEach((video, i) => {
            if (!video) return;
            if (i === currentIndex) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, [currentIndex]);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    const minHeight = heroHeight ? `${heroHeight}vh` : '90vh';
    const currentSlide = validSlides[currentIndex];

    return (
        <section ref={sectionRef} className={`relative w-full overflow-hidden ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(bgColor, 0.4) : bgColor, minHeight }}>
            <CornerGradient config={cornerGradient} />

            {/* ─── Background Slides (image / video) ─── */}
            {validSlides.map((slide, i) => {
                const isActive = i === currentIndex;
                const mediaType = slide.mediaType || 'image';
                const bgImage = slide.backgroundImage || (slide as any).imageUrl || (slide as any).images?.[0]?.url;
                const bgVideo = slide.backgroundVideo;

                return (
                    <div
                        key={i}
                        className="absolute inset-0 z-[1]"
                        style={{
                            opacity: isActive ? 1 : 0,
                            transition: `opacity ${transitionDuration}ms ease-in-out`,
                        }}
                    >
                        {/* Video background */}
                        {mediaType === 'video' && bgVideo ? (
                            <video
                                ref={el => { videoRefs.current[i] = el; }}
                                src={bgVideo}
                                className="absolute inset-0 w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                autoPlay={i === 0}
                            />
                        ) : bgImage ? (
                            <img
                                src={bgImage}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                    console.warn('[HeroNova] Image failed to load:', bgImage);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: slide.backgroundColor || bgColor }}
                            />
                        )}
                    </div>
                );
            })}

            {/* ─── Overlay ─── */}
            <div
                className="absolute inset-0 z-[2]"
                style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity > 1 ? overlayOpacity / 100 : overlayOpacity})` }}
            />

            {/* ─── Centered Display Text (brand name) ─── */}
            {showDisplayText && displayText && (
                <div ref={displayContainerRef} className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none p-4 w-full">
                    <h2
                        ref={displayTextRef}
                        className={`${displaySizeMap[headlineFontSize]} font-extrabold uppercase font-header nova-display text-center origin-center`}
                        style={{
                            color: displayColor,
                            letterSpacing: `${displayLetterSpacing}em`,
                            textTransform: 'uppercase',
                            lineHeight: 1,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transform: `scale(${displayScale})`,
                            willChange: 'transform',
                        }}
                    >
                        {displayText}
                    </h2>
                </div>
            )}

            {/* ─── Bottom Content Bar ─── */}
            <div className="absolute bottom-0 left-0 right-0 z-[10]">
                {/* Bottom gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                <div className="relative px-6 md:px-12 lg:px-16 pb-6 md:pb-10">
                    {/* Content row: headline left, CTA right */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
                        {/* Headline — bottom left */}
                        <div ref={headlineContainerRef} className="max-w-xl nova-headline min-w-0">
                            <h1
                                ref={headlineTextRef}
                                className={`${headlineSizeClasses[headlineFontSize]} font-bold uppercase leading-tight font-header origin-left`}
                                style={{
                                    color: headingColor,
                                    letterSpacing: '0.04em',
                                    textTransform: 'var(--headings-transform, uppercase)' as any,
                                    transform: `scale(${headlineScale})`,
                                    display: 'inline-block',
                                    willChange: 'transform',
                                }}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentSlide.headline || '') }}
                            />
                            {currentSlide.subheadline && (
                                <p
                                    className="text-sm md:text-base mt-2 opacity-80 font-body"
                                    style={{ color: textColor }}
                                >
                                    {currentSlide.subheadline}
                                </p>
                            )}
                        </div>

                        {/* CTA — bottom right */}
                        {currentSlide.primaryCta && (
                            <div className="nova-cta flex-shrink-0">
                                <a
                                    href={currentSlide.primaryCtaLink || '/#cta'}
                                    onClick={(e) => handleNavigate(e, currentSlide.primaryCtaLink || '/#cta')}
                                    className="inline-block px-8 py-3 md:px-10 md:py-3.5 rounded-full font-semibold text-sm md:text-base uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-2xl font-button"
                                    style={{
                                        backgroundColor: ctaBg,
                                        color: ctaText,
                                        textTransform: 'var(--buttons-transform, uppercase)' as any,
                                        letterSpacing: 'var(--buttons-spacing, 0.1em)',
                                    }}
                                >
                                    {currentSlide.primaryCta}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Navigation row */}
                    {hasMultipleSlides && (
                        <div className="flex items-center justify-between">
                            {/* Left arrow */}
                            {showArrows ? (
                                <button
                                    onClick={goToPrevious}
                                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                    style={{ color: colors?.arrowColor || '#ffffff' }}
                                    title="Previous"
                                >
                                    <ChevronLeft size={22} strokeWidth={1.5} />
                                </button>
                            ) : <div />}

                            {/* Center dots */}
                            {showDots && (
                                <div className="flex items-center gap-2">
                                    {validSlides.map((_, i) => (
                                        <button
                                            key={i}
                                            title={`Slide ${i + 1}`}
                                            onClick={() => goToSlide(i)}
                                            className="transition-all duration-300"
                                            style={{
                                                width: dotStyle === 'line'
                                                    ? (i === currentIndex ? '24px' : '12px')
                                                    : '8px',
                                                height: dotStyle === 'line' ? '3px' : '8px',
                                                borderRadius: '999px',
                                                backgroundColor: i === currentIndex
                                                    ? (colors?.dotActive || '#ffffff')
                                                    : (colors?.dotInactive || 'rgba(255,255,255,0.4)'),
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Right arrow */}
                            {showArrows ? (
                                <button
                                    onClick={goToNext}
                                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                    style={{ color: colors?.arrowColor || '#ffffff' }}
                                    title="Next"
                                >
                                    <ChevronRight size={22} strokeWidth={1.5} />
                                </button>
                            ) : <div />}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Animations ─── */}
            <style>{`
                @keyframes nova-slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes nova-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .nova-display {
                    animation: nova-fade-in 1s ease-out 0.2s both;
                }
                .nova-headline {
                    animation: nova-slide-up 0.7s ease-out 0.3s both;
                }
                .nova-cta {
                    animation: nova-slide-up 0.6s ease-out 0.5s both;
                }
            `}</style>
        </section>
    );
};

export default HeroNova;
