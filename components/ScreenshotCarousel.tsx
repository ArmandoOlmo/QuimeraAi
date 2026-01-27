/**
 * ScreenshotCarousel
 * Full-width horizontal screenshot carousel with auto-scroll capability
 * Features: AI image generation, configurable aspect ratios, smooth animations
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';

// Types
export interface ScreenshotImage {
    id: string;
    url: string;
    alt: string;
    aspectRatio: '16:9' | '4:3' | '3:2' | '1:1' | 'custom';
    customWidth?: number;
    customHeight?: number;
}

export interface ScreenshotCarouselData {
    images: ScreenshotImage[];
    autoScroll: boolean;
    scrollDirection: 'left' | 'right';
    scrollSpeed: number; // px per second (e.g., 30, 50, 100)
    pauseOnHover: boolean;
    gap: number; // px between images
    showNavigation: boolean;
    colors: {
        background: string;
    };
}

interface ScreenshotCarouselProps {
    data: ScreenshotCarouselData;
    isEditing?: boolean;
    onGenerateImage?: () => void;
}

// Default data for new component
export const defaultScreenshotCarouselData: ScreenshotCarouselData = {
    images: [],
    autoScroll: true,
    scrollDirection: 'left',
    scrollSpeed: 50,
    pauseOnHover: true,
    gap: 16,
    showNavigation: true,
    colors: {
        background: 'transparent',
    },
};

// Helper to get aspect ratio dimensions
const getAspectRatioDimensions = (ratio: ScreenshotImage['aspectRatio'], customWidth?: number, customHeight?: number) => {
    switch (ratio) {
        case '16:9': return { width: 16, height: 9 };
        case '4:3': return { width: 4, height: 3 };
        case '3:2': return { width: 3, height: 2 };
        case '1:1': return { width: 1, height: 1 };
        case 'custom': return { width: customWidth || 16, height: customHeight || 9 };
        default: return { width: 16, height: 9 };
    }
};

const ScreenshotCarousel: React.FC<ScreenshotCarouselProps> = ({
    data,
    isEditing = false,
    onGenerateImage,
}) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const [isPaused, setIsPaused] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const {
        images,
        autoScroll,
        scrollDirection,
        scrollSpeed,
        pauseOnHover,
        gap,
        showNavigation,
        colors,
    } = data;

    // Determine if auto-scroll should be active
    const shouldAutoScroll = useMemo(() =>
        autoScroll && !isPaused && !(pauseOnHover && isHovering) && images.length > 0,
        [autoScroll, isPaused, pauseOnHover, isHovering, images.length]
    );

    // Animation loop for smooth scrolling
    useEffect(() => {
        if (!shouldAutoScroll || !scrollRef.current) return;

        const scrollContainer = scrollRef.current;

        const animate = (time: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000; // Convert to seconds
            lastTimeRef.current = time;

            const scrollAmount = scrollSpeed * delta;

            if (scrollDirection === 'left') {
                scrollContainer.scrollLeft += scrollAmount;
                // Reset to start when reaching end (infinite loop effect)
                if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
                    scrollContainer.scrollLeft = 0;
                }
            } else {
                scrollContainer.scrollLeft -= scrollAmount;
                // Reset to end when reaching start
                if (scrollContainer.scrollLeft <= 0) {
                    scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            lastTimeRef.current = 0;
        };
    }, [shouldAutoScroll, scrollDirection, scrollSpeed]);

    // Handle manual navigation
    const handleNavigation = useCallback((direction: 'prev' | 'next') => {
        if (!scrollRef.current) return;

        const scrollContainer = scrollRef.current;
        const scrollAmount = scrollContainer.clientWidth * 0.8;

        scrollContainer.scrollBy({
            left: direction === 'next' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
        });
    }, []);

    // Toggle pause/play
    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    // Empty state with AI generation option
    if (images.length === 0) {
        return (
            <div
                className="w-full py-16 px-4"
                style={{ backgroundColor: colors.background }}
            >
                <div className="max-w-md mx-auto text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t('screenshotCarousel.empty', 'Sin imágenes')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        {t('screenshotCarousel.emptyDescription', 'Añade screenshots de tu aplicación o genera imágenes con IA')}
                    </p>
                    {isEditing && onGenerateImage && (
                        <button
                            onClick={onGenerateImage}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
                        >
                            <Sparkles size={16} />
                            {t('screenshotCarousel.generateWithAI', 'Generar con IA')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full overflow-hidden relative"
            style={{ backgroundColor: colors.background }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Scrolling Container */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide scroll-smooth"
                style={{
                    gap: `${gap}px`,
                    paddingLeft: gap,
                    paddingRight: gap,
                    paddingTop: 24,
                    paddingBottom: 24,
                }}
            >
                {/* Duplicate images for infinite scroll effect */}
                {[...images, ...images].map((image, index) => {
                    const { width, height } = getAspectRatioDimensions(
                        image.aspectRatio,
                        image.customWidth,
                        image.customHeight
                    );

                    return (
                        <div
                            key={`${image.id}-${index}`}
                            className="flex-shrink-0 relative group overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                            style={{
                                aspectRatio: `${width}/${height}`,
                                height: '400px', // Fixed height, width calculated from aspect ratio
                            }}
                        >
                            <img
                                src={image.url}
                                alt={image.alt || `Screenshot ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />

                            {/* Hover overlay with image info (editing mode) */}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white text-sm font-medium">
                                        {image.aspectRatio}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Navigation Controls */}
            {showNavigation && images.length > 1 && (
                <>
                    {/* Previous Button */}
                    <button
                        onClick={() => handleNavigation('prev')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground shadow-lg hover:bg-background transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={() => handleNavigation('next')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground shadow-lg hover:bg-background transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Next"
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}

            {/* Play/Pause Control */}
            {autoScroll && (
                <button
                    onClick={togglePause}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground shadow-lg hover:bg-background transition-colors"
                    aria-label={isPaused ? 'Play' : 'Pause'}
                >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>
            )}

            {/* Gradient Overlays for seamless effect */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background/50 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background/50 to-transparent pointer-events-none" />
        </div>
    );
};

export default ScreenshotCarousel;
