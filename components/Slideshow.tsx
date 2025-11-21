
import React, { useState, useEffect } from 'react';
import { SlideshowData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

const titleSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-7xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

interface SlideshowProps extends SlideshowData {
    borderRadius: BorderRadiusSize;
}

const Slideshow: React.FC<SlideshowProps> = ({ title, items, paddingY, paddingX, colors, borderRadius, titleFontSize = 'md' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const hasItems = items && items.length > 0;

    const goToPrevious = () => {
        if (!hasItems) return;
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? items.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        if (!hasItems) return;
        const isLastSlide = currentIndex === items.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    // Auto-play feature
    useEffect(() => {
        if (!hasItems) return;
        const interval = setInterval(() => {
            goToNext();
        }, 5000); // Change slide every 5 seconds
        return () => clearInterval(interval);
    }, [currentIndex, hasItems, items]);

    return (
        <section className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
            </div>
            {hasItems ? (
                <div className="relative w-full max-w-5xl mx-auto aspect-video">
                    <div className={`w-full h-full overflow-hidden relative shadow-2xl bg-dark-800 ${borderRadiusClasses[borderRadius]}`}>
                        {/* Slides container */}
                        <div className="w-full h-full whitespace-nowrap transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                            {items.map((item, index) => (
                                <div key={index} className="inline-block w-full h-full align-top">
                                    <img src={item.imageUrl} alt={item.altText} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>

                        {/* Navigation Arrows */}
                        <button onClick={goToPrevious} className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors z-10">
                            <ChevronLeft />
                        </button>
                        <button onClick={goToNext} className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors z-10">
                            <ChevronRight />
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                            {items.map((_, slideIndex) => (
                                <button
                                    key={slideIndex}
                                    title={`Go to slide ${slideIndex + 1}`}
                                    onClick={() => goToSlide(slideIndex)}
                                    className={`w-3 h-3 rounded-full transition-colors ${currentIndex === slideIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-editor-text-secondary p-8 bg-editor-panel-bg rounded-lg">
                    No slides to display. Add some in the editor!
                </div>
            )}
        </section>
    );
};

export default Slideshow;
