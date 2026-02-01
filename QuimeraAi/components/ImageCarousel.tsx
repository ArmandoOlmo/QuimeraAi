/**
 * ScreenshotCarousel (renamed conceptually to ImageCarousel)
 * Full-width horizontal carousel with multiple display modes
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

// Types
export interface CarouselImage {
    id?: string;
    url: string;
    alt?: string;
    title?: string;
    subtitle?: string;
    aspectRatio?: string; // '16:9' | '4:3' | '3:2' | '1:1' | 'custom'
    customWidth?: number;
    customHeight?: number;
}

export interface ImageCarouselData {
    images: CarouselImage[];
    autoScroll: boolean;
    scrollDirection: 'left' | 'right';
    scrollSpeed: number; // px per second
    pauseOnHover: boolean;
    gap: number;
    showNavigation: boolean;
    showScrollbar?: boolean;
    aspectRatio?: '16:9' | '4:3' | '3:2' | '1:1' | 'custom';
    variant?: 'basic' | 'gradient' | 'cards' | 'modern';
    colors: {
        background: string;
    };
}

interface ImageCarouselProps {
    data: ImageCarouselData;
    isEditing?: boolean;
    onGenerateImage?: () => void;
}

// Default data
export const defaultImageCarouselData: ImageCarouselData = {
    images: [],
    autoScroll: true,
    scrollDirection: 'left',
    scrollSpeed: 50,
    pauseOnHover: true,
    gap: 16,
    showNavigation: true,
    showScrollbar: false,
    aspectRatio: '16:9',
    variant: 'basic',
    colors: {
        background: 'transparent',
    },
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({
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

    // Merge defaults
    const {
        images,
        autoScroll,
        scrollDirection,
        scrollSpeed,
        pauseOnHover,
        gap,
        showNavigation,
        showScrollbar = false,
        aspectRatio: globalAspectRatio = '16:9',
        variant = 'basic',
        colors,
    } = { ...defaultImageCarouselData, ...data };

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
            const delta = (time - lastTimeRef.current) / 1000;
            lastTimeRef.current = time;

            const scrollAmount = scrollSpeed * delta;

            if (scrollDirection === 'left') {
                scrollContainer.scrollLeft += scrollAmount;
                // Infinite loop logic could be improved with true circular buffer, 
                // but for now we reset when reaching end of scroll-able area (minus visible)
                if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth - 1) { // -1 buffer
                    scrollContainer.scrollLeft = 0;
                }
            } else {
                scrollContainer.scrollLeft -= scrollAmount;
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

    // Handle manual navigation delay/debounce could be added
    const handleNavigation = useCallback((direction: 'prev' | 'next') => {
        if (!scrollRef.current) return;
        const scrollContainer = scrollRef.current;
        const scrollAmount = scrollContainer.clientWidth * 0.5;

        scrollContainer.scrollBy({
            left: direction === 'next' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
        });
    }, []);

    const togglePause = useCallback(() => setIsPaused(p => !p), []);

    if (!images || images.length === 0) {
        return (
            <div className="w-full py-20 px-4 flex flex-col items-center justify-center text-center" style={{ backgroundColor: colors.background }}>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('landingEditor.emptyCarousel', 'Carrusel vacío')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                    {t('landingEditor.addImages', 'Añade imágenes desde el panel de control.')}
                </p>
            </div>
        );
    }

    // Determine base card styles based on variant
    const getCardStyles = () => {
        switch (variant) {
            case 'cards':
                return 'rounded-xl overflow-hidden shadow-lg border border-white/5 bg-white/5';
            case 'modern':
                return 'rounded-2xl overflow-hidden shadow-2xl scale-95 hover:scale-100 transition-transform duration-300';
            default: // basic, gradient
                return 'rounded-lg overflow-hidden shadow-md';
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full relative group"
            style={{ backgroundColor: colors.background }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className={`flex overflow-x-auto scroll-smooth items-center ${!showScrollbar ? 'scrollbar-hide' : ''}`}
                style={{
                    gap: `${gap}px`,
                    padding: '24px', // Standard padding
                }}
            >
                {/* Render doubled list for infinite scroll capability */}
                {[...images, ...images].map((image, index) => (
                    <div
                        key={`${index}-${image.url}`} // index key for duplicate list
                        className={`flex-shrink-0 relative ${getCardStyles()}`}
                        style={{
                            height: variant === 'modern' ? '450px' : '400px',
                            minWidth: variant === 'modern' ? '300px' : 'auto',
                            aspectRatio: (image.aspectRatio || globalAspectRatio || '16:9').replace(':', '/')
                        }}
                    >
                        <img
                            src={image.url}
                            alt={image.alt || image.title || ''}
                            className={`w-full h-full object-cover transition-transform duration-700 ${shouldAutoScroll ? 'hover:scale-105' : ''}`}
                            loading="lazy"
                        />

                        {/* Overlay Content */}
                        {(variant === 'gradient' || variant === 'cards' || variant === 'modern') && (image.title || image.subtitle) && (
                            <div className={`absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end
                                ${variant === 'cards' ? 'bg-white/95 dark:bg-black/80 backdrop-blur-sm h-1/3' : 'bg-gradient-to-t from-black/90 via-black/50 to-transparent h-1/2'}
                            `}>
                                {image.title && (
                                    <h3 className={`font-bold truncate ${variant === 'cards' ? 'text-foreground text-lg' : 'text-white text-xl'}`}>
                                        {image.title}
                                    </h3>
                                )}
                                {image.subtitle && (
                                    <p className={`text-sm truncate mt-1 ${variant === 'cards' ? 'text-muted-foreground' : 'text-gray-200'}`}>
                                        {image.subtitle}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Navigation Overlay */}
            {showNavigation && (
                <>
                    <button
                        onClick={() => handleNavigation('prev')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => handleNavigation('next')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Play/Pause Indicator (optional, keep small) */}
            <button
                onClick={togglePause}
                className="absolute bottom-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
        </div>
    );
};

export default ImageCarousel;
