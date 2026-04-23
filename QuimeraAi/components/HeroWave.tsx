import React, { useState, useEffect } from 'react';
import { HeroGalleryData, FontSize, BorderRadiusSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitize';
import CornerGradient from './ui/CornerGradient';
import { hexToRgba } from '../utils/colorUtils';

// ─── Size mappings ───
const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-3xl md:text-4xl lg:text-5xl',
    md: 'text-4xl md:text-5xl lg:text-6xl',
    lg: 'text-4xl md:text-6xl lg:text-7xl',
    xl: 'text-5xl md:text-7xl lg:text-8xl',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-lg lg:text-xl',
    lg: 'text-lg md:text-xl lg:text-2xl',
    xl: 'text-xl md:text-2xl lg:text-3xl',
};

// ─── Wave SVG Presets ───
type WaveShape = 'smooth' | 'bubbly' | 'sharp' | 'layered';

const waveShapes: Record<WaveShape, (waveColor: string) => React.ReactNode> = {
    smooth: (c) => (
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] lg:h-[120px]">
            <path d="M0,60 C360,120 720,0 1440,60 L1440,120 L0,120 Z" fill={c} />
        </svg>
    ),
    bubbly: (c) => (
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] lg:h-[120px]">
            <path d="M0,80 C120,120 240,40 360,80 C480,120 600,40 720,80 C840,120 960,40 1080,80 C1200,120 1320,40 1440,80 L1440,120 L0,120 Z" fill={c} />
        </svg>
    ),
    sharp: (c) => (
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] lg:h-[120px]">
            <path d="M0,60 L360,100 L720,20 L1080,100 L1440,40 L1440,120 L0,120 Z" fill={c} />
        </svg>
    ),
    layered: (c) => (
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] lg:h-[120px]">
            <path d="M0,40 C240,100 480,0 720,60 C960,120 1200,20 1440,60 L1440,120 L0,120 Z" fill={c} opacity="0.4" />
            <path d="M0,80 C360,120 720,40 1440,80 L1440,120 L0,120 Z" fill={c} />
        </svg>
    ),
};

// ─── Props ───
interface HeroWaveProps extends HeroGalleryData {
    borderRadius?: BorderRadiusSize;
    onNavigate?: (href: string) => void;
    /** Gradient angle in degrees */
    gradientAngle?: number;
    /** Wave shape preset */
    waveShape?: WaveShape;
    /** Wave fill color (usually matches next section bg) */
    waveColor?: string;
    /** Text alignment */
    textAlign?: 'left' | 'center' | 'right';
    /** Gradient colors array */
    gradientColors?: string[];
    /** Show text stroke/outline */
    showTextStroke?: boolean;
}

/**
 * HeroWave — Vibrant gradient hero with organic SVG wave at the bottom.
 * Inspired by Taiga Bubbly: bold gradients, big playful typography,
 * organic wave transitions, centered text, optional image overlay.
 */
const HeroWave: React.FC<HeroWaveProps> = ({
  glassEffect, slides = [],
    autoPlaySpeed = 6000,
    transitionDuration = 800,
    showArrows = true,
    showDots = true,
    dotStyle = 'circle',
    heroHeight,
    headlineFontSize = 'xl',
    subheadlineFontSize = 'md',
    showGrain = false,
    overlayOpacity = 0.15,
    colors,
    cornerGradient,
    onNavigate,
    gradientAngle = 135,
    waveShape = 'bubbly',
    waveColor = '#ffffff',
    textAlign = 'center',
    gradientColors,
    showTextStroke = false,
}) => {
    const { getColor } = useDesignTokens();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Fallback slide
    const validSlides = Array.isArray(slides) && slides.length > 0 ? slides : [{
        headline: 'Something Bold & Beautiful',
        subheadline: 'Your next big thing starts here',
        primaryCta: 'GET STARTED',
        primaryCtaLink: '/#cta',
    }];

    const hasMultipleSlides = validSlides.length > 1;

    // Default gradient colors
    const defaultGradientColors = ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8'];
    const activeGradientColors = gradientColors && gradientColors.length >= 2 ? gradientColors : defaultGradientColors;

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

    // Build gradient string
    const gradientBg = `linear-gradient(${gradientAngle}deg, ${activeGradientColors.join(', ')})`;
    const bgColor = colors?.background || '#ff006e';
    const textColor = colors?.text || '#ffffff';
    const headingColor = colors?.heading || '#ffffff';
    const ctaColor = colors?.ctaText || '#ffffff';
    const ctaBg = (colors as any)?.ctaBackground || 'rgba(255,255,255,0.2)';

    // Text alignment classes
    const alignClass = textAlign === 'left' ? 'items-start text-left' : textAlign === 'right' ? 'items-end text-right' : 'items-center text-center';

    // ─── Navigation handler ───
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (onNavigate && !href.startsWith('http://') && !href.startsWith('https://')) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    const minHeight = heroHeight ? `${heroHeight}vh` : '75vh';

    return (
        <section className={`relative w-full overflow-hidden ${glassEffect ? ' backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : ''}`} style={{ backgroundColor: glassEffect ? hexToRgba(bgColor , 0.4) : bgColor }}>
            <CornerGradient config={cornerGradient} />

            {/* ─── Gradient Background ─── */}
            <div
                className="absolute inset-0 z-0"
                style={{ background: gradientBg }}
            />

            {/* ─── Slides ─── */}
            {validSlides.map((slide, i) => {
                const isActive = i === currentIndex;
                const bgImage = slide.backgroundImage || (slide as any).images?.[0]?.url;

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
                        {/* Optional background image per slide */}
                        {bgImage && (
                            <div
                                className="absolute inset-0 z-0"
                                style={{
                                    backgroundImage: `url(${bgImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                        )}

                        {/* Overlay */}
                        {(bgImage || overlayOpacity > 0) && (
                            <div
                                className="absolute inset-0 z-[1]"
                                style={{
                                    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity > 1 ? overlayOpacity / 100 : overlayOpacity})`,
                                }}
                            />
                        )}

                        {/* Grain texture */}
                        {showGrain && <div className="absolute inset-0 z-[2] pointer-events-none wave-grain" />}

                        {/* ─── Text content ─── */}
                        <div
                            className={`relative z-[5] w-full flex flex-col justify-center ${alignClass} px-6 md:px-16 lg:px-24`}
                            style={{ minHeight, paddingBottom: '80px' }}
                        >
                            <div className="max-w-5xl w-full">
                                {/* Headline */}
                                <h1
                                    className={`${headlineSizeClasses[headlineFontSize]} font-extrabold leading-[0.95] mb-4 md:mb-6 font-header wave-headline`}
                                    style={{
                                        color: headingColor,
                                        textTransform: 'var(--headings-transform, none)' as any,
                                        letterSpacing: 'var(--headings-spacing, -0.02em)',
                                        ...(showTextStroke ? {
                                            WebkitTextStroke: `2px ${headingColor}`,
                                            WebkitTextFillColor: 'transparent',
                                            paintOrder: 'stroke fill',
                                        } : {}),
                                    }}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(slide.headline) }}
                                />

                                {/* Subheadline */}
                                {slide.subheadline && (
                                    <p
                                        className={`${subheadlineSizeClasses[subheadlineFontSize]} font-body opacity-90 mb-8 md:mb-10 wave-sub max-w-2xl ${textAlign === 'center' ? 'mx-auto' : ''}`}
                                        style={{ color: textColor }}
                                    >
                                        {slide.subheadline}
                                    </p>
                                )}

                                {/* CTAs — pill-style buttons */}
                                <div className={`flex flex-wrap gap-3 md:gap-4 wave-cta ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start'}`}>
                                    {slide.primaryCta && (
                                        <a
                                            href={slide.primaryCtaLink || '/#cta'}
                                            onClick={(e) => handleNavigate(e, slide.primaryCtaLink || '/#cta')}
                                            className="px-7 py-3 md:px-9 md:py-3.5 rounded-full font-bold text-sm md:text-base tracking-wide uppercase transition-all duration-300 hover:scale-105 hover:shadow-xl font-button"
                                            style={{
                                                backgroundColor: ctaBg,
                                                color: ctaColor,
                                                backdropFilter: 'blur(12px)',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                                letterSpacing: 'var(--buttons-spacing, 0.08em)',
                                            }}
                                        >
                                            {slide.primaryCta}
                                        </a>
                                    )}
                                    {slide.secondaryCta && (
                                        <a
                                            href={slide.secondaryCtaLink || '/#features'}
                                            onClick={(e) => handleNavigate(e, slide.secondaryCtaLink || '/#features')}
                                            className="px-7 py-3 md:px-9 md:py-3.5 rounded-full font-bold text-sm md:text-base tracking-wide uppercase transition-all duration-300 hover:scale-105 font-button"
                                            style={{
                                                backgroundColor: 'transparent',
                                                color: ctaColor,
                                                border: `2px solid ${ctaColor}`,
                                                textTransform: 'var(--buttons-transform, uppercase)' as any,
                                                letterSpacing: 'var(--buttons-spacing, 0.08em)',
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

            {/* ─── Spacer for layout (prevents collapse since children are absolute) ─── */}
            <div style={{ minHeight, paddingBottom: '60px' }} />

            {/* ─── Wave SVG at bottom ─── */}
            <div className="absolute bottom-0 left-0 right-0 z-[10] pointer-events-none">
                {waveShapes[waveShape]?.(waveColor) || waveShapes.bubbly(waveColor)}
            </div>

            {/* ─── Slideshow Controls ─── */}
            {hasMultipleSlides && (
                <div className="absolute bottom-[70px] md:bottom-[100px] left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                    {/* Arrows Left */}
                    {showArrows && (
                        <button
                            onClick={goToPrevious}
                            className="p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 transition-all duration-200"
                            style={{ color: colors?.arrowColor || '#ffffff' }}
                            title="Previous slide"
                        >
                            <ChevronLeft size={18} strokeWidth={2} />
                        </button>
                    )}

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
                                            ? (i === currentIndex ? '28px' : '14px')
                                            : (i === currentIndex ? '12px' : '8px'),
                                        height: dotStyle === 'line' ? '4px' : (i === currentIndex ? '12px' : '8px'),
                                        borderRadius: '999px',
                                        backgroundColor: i === currentIndex
                                            ? (colors?.dotActive || '#ffffff')
                                            : (colors?.dotInactive || 'rgba(255,255,255,0.45)'),
                                        transform: i === currentIndex ? 'scale(1)' : 'scale(0.85)',
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Arrows Right */}
                    {showArrows && (
                        <button
                            onClick={goToNext}
                            className="p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 transition-all duration-200"
                            style={{ color: colors?.arrowColor || '#ffffff' }}
                            title="Next slide"
                        >
                            <ChevronRight size={18} strokeWidth={2} />
                        </button>
                    )}
                </div>
            )}

            {/* ─── Animations ─── */}
            <style>{`
                @keyframes wave-fade-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes wave-scale-in {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
                .wave-headline {
                    animation: wave-scale-in 0.8s ease-out 0.15s both;
                }
                .wave-sub {
                    animation: wave-fade-up 0.7s ease-out 0.35s both;
                }
                .wave-cta {
                    animation: wave-fade-up 0.6s ease-out 0.55s both;
                }
                .wave-grain {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                    opacity: 0.03;
                    mix-blend-mode: overlay;
                }
            `}
            </style>
        </section>
    );
};

export default HeroWave;
