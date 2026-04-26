import React, { useMemo, useState, useEffect } from 'react';
import { HeroNeonData, HeroNeonSlide } from '../types/components';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HeroNeonProps extends HeroNeonData {
    isPreviewMode?: boolean;
    onNavigate?: (href: string) => void;
    borderRadius?: string;
}

const HeroNeon: React.FC<HeroNeonProps> = (props) => {
    const data = props;

    // Slides initialization with fallback to legacy data
    const slides: HeroNeonSlide[] = useMemo(() => {
        if (data.slides && data.slides.length > 0) {
            return data.slides;
        }
        return [
            {
                headline: data.headline || 'INNOVATION MEETS DESIGN',
                subheadline: data.subheadline || 'Experience the next generation of web interfaces.',
                primaryCta: data.primaryCta || 'Explore Now',
                secondaryCta: data.secondaryCta || 'Learn More',
                primaryCtaLink: data.primaryCtaLink,
                primaryCtaLinkType: data.primaryCtaLinkType,
                secondaryCtaLink: data.secondaryCtaLink,
                secondaryCtaLinkType: data.secondaryCtaLinkType,
            }
        ];
    }, [data]);

    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

    const currentSlide = slides[currentIndex] || slides[0];

    const textPosition = data.textPosition || 'bottom-left';
    const showTopDots = data.showTopDots ?? true;
    const dotColors = data.dotColors?.length ? data.dotColors : ['#FF5F56', '#FFBD2E', '#27C93F'];
    const colors = data.colors || {
        background: 'transparent',
        text: '#ffffff',
        heading: '#ffffff',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        buttonBackground: '#FBB92B',
        buttonText: '#000000',
    };

    const positionClasses = useMemo(() => {
        switch (textPosition) {
            case 'top-left':
                return 'justify-start items-start text-left';
            case 'top-right':
                return 'justify-start items-end text-right';
            case 'bottom-right':
                return 'justify-end items-end text-right';
            case 'bottom-left':
            default:
                return 'justify-end items-start text-left';
        }
    }, [textPosition]);

    // Fonts
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    // Map intensity 0-100 to a blur radius from 0px to 60px
    const blurRadius = (intensity / 100) * 60;
    const spreadRadius = (intensity / 100) * 15;
    const opacity = (intensity / 100) * 0.8 + 0.2; // 0.2 to 1.0

    const neonColor = colors.neonGlow || '#FBB92B';
    
    const glowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

    return (
        <div 
            className="w-full relative overflow-hidden flex items-center justify-center p-6 md:p-12 lg:p-24 bg-transparent"
            style={{ minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '90vh' }}
        >
            {/* The Neon Card */}
            <div 
                className={clsx(
                    "w-full max-w-7xl min-h-[500px] rounded-3xl md:rounded-[40px] relative flex flex-col p-8 md:p-12 lg:p-16 transition-all duration-500",
                    data.glassEffect ? "backdrop-blur-xl bg-opacity-40" : "",
                    positionClasses,
                    "overflow-hidden"
                )}
                style={{
                    backgroundColor: colors.cardBackground || 'rgba(20, 20, 20, 0.8)',
                    ...glowStyle,
                    borderWidth: intensity > 0 ? '2px' : '0px',
                    borderStyle: 'solid'
                }}
            >
                {/* Top Dots (Decorative) */}
                {showTopDots && dotColors.length > 0 && (
                    <div className="absolute top-6 right-8 md:top-8 md:right-12 flex items-center gap-2 md:gap-3 z-20">
                        {dotColors.map((color, idx) => (
                            <div 
                                key={idx}
                                className="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full h-full flex flex-col justify-center z-10 relative flex-grow"
                    >
                        {/* Full Cover Image Background for the Slide */}
                        {currentSlide.imageUrl && (
                            <div className="absolute inset-[-3rem] md:inset-[-4rem] lg:inset-[-5rem] z-0 overflow-hidden pointer-events-none">
                                <img 
                                    src={currentSlide.imageUrl} 
                                    alt={currentSlide.headline} 
                                    className="w-full h-full object-cover" 
                                />
                                {/* Overlay to ensure text readability */}
                                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            </div>
                        )}

                        {/* Typography Content */}
                        <div className={clsx(
                            "flex flex-col gap-6 md:gap-8 w-full max-w-4xl z-10 relative"
                        )}>
                            <h1 
                                className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-tight font-header drop-shadow-lg"
                                style={{ 
                                    color: colors.heading, 
                                    fontFamily: headlineFontFamily,
                                    textTransform: 'var(--headings-transform, none)' as any,
                                    letterSpacing: 'var(--headings-spacing, normal)' 
                                }}
                            >
                                {currentSlide.headline}
                            </h1>
                            
                            <p 
                                className="text-lg md:text-xl lg:text-2xl leading-relaxed opacity-90 font-body drop-shadow-md max-w-2xl"
                                style={{ color: colors.text, fontFamily: subheadlineFontFamily }}
                            >
                                {currentSlide.subheadline}
                            </p>

                            {/* CTAs */}
                            {(currentSlide.primaryCta || currentSlide.secondaryCta) && (
                                <div className={clsx(
                                    "flex flex-wrap items-center gap-4 mt-4",
                                    textPosition.includes('right') ? 'justify-end' : 'justify-start'
                                )}>
                                    {currentSlide.primaryCta && (
                                        <button
                                            className="px-8 py-4 rounded-full font-semibold text-lg flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 font-button shadow-lg"
                                            onClick={() => props.onNavigate && currentSlide.primaryCtaLink && props.onNavigate(currentSlide.primaryCtaLink)}
                                            style={{
                                                backgroundColor: colors.buttonBackground || neonColor,
                                                color: colors.buttonText || '#000000',
                                                textTransform: 'var(--buttons-transform, none)' as any,
                                                letterSpacing: 'var(--buttons-spacing, normal)',
                                                borderRadius: props.borderRadius || '9999px'
                                            }}
                                        >
                                            {currentSlide.primaryCta}
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    )}
                                    
                                    {currentSlide.secondaryCta && (
                                        <button
                                            className="px-8 py-4 rounded-full font-semibold text-lg border-2 transition-transform hover:scale-105 active:scale-95 font-button shadow-lg backdrop-blur-sm"
                                            onClick={() => props.onNavigate && currentSlide.secondaryCtaLink && props.onNavigate(currentSlide.secondaryCtaLink)}
                                            style={{
                                                borderColor: colors.buttonBackground || neonColor,
                                                color: colors.text || '#ffffff',
                                                backgroundColor: 'rgba(0,0,0,0.2)',
                                                textTransform: 'var(--buttons-transform, none)' as any,
                                                letterSpacing: 'var(--buttons-spacing, normal)',
                                                borderRadius: props.borderRadius || '9999px'
                                            }}
                                        >
                                            {currentSlide.secondaryCta}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Slider Navigation */}
                {slides.length > 1 && (
                    <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
                        <button 
                            onClick={prevSlide}
                            className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                            aria-label="Previous slide"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex gap-2">
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={clsx(
                                        "w-2 h-2 rounded-full transition-all duration-300",
                                        currentIndex === idx ? "w-6 bg-white" : "bg-white/40 hover:bg-white/60"
                                    )}
                                    style={{
                                        backgroundColor: currentIndex === idx ? neonColor : undefined
                                    }}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>

                        <button 
                            onClick={nextSlide}
                            className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                            aria-label="Next slide"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeroNeon;
