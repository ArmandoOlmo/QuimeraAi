import React, { useEffect, useRef } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { FeaturesData, PaddingSize, FontSize } from '../../types';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDesignTokens } from '../../hooks/useDesignTokens';

gsap.registerPlugin(ScrollTrigger);

// ============================================================================
// STYPING MAPPINGS
// ============================================================================
const paddingMap: Record<PaddingSize, string> = {
    none: 'py-0',
    sm: 'py-12 md:py-20',
    md: 'py-20 md:py-32',
    lg: 'py-32 md:py-48',
    xl: 'py-40 md:py-56',
};

const paddingXMap: Record<PaddingSize, string> = {
    none: 'px-0 lg:px-0',
    sm: 'px-4 lg:px-8',
    md: 'px-6 lg:px-12',
    lg: 'px-8 lg:px-24',
    xl: 'px-12 lg:px-32',
};

const fontSizeMap: Record<FontSize, string> = {
    sm: 'text-3xl md:text-5xl lg:text-6xl',
    md: 'text-5xl md:text-7xl lg:text-8xl',
    lg: 'text-6xl md:text-8xl lg:text-9xl',
    xl: 'text-7xl md:text-9xl lg:text-[10rem]',
};

export interface FeaturesCinematicGymProps extends FeaturesData {
    isPreview?: boolean;
}

const FeaturesCinematicGym: React.FC<FeaturesCinematicGymProps> = (props) => {
    const {
        title = 'Features',
        description = 'What we do',
        items = [],
        paddingY = 'lg',
        paddingX = 'md',
        colors,
        titleFontSize = 'md',
        layoutAlignment = 'left',
        isPreview
    } = props;

    // The brutalist preset requires heavy, geometric/grotesk typography
    const defaultFontFamily = "'Space Grotesk', system-ui, sans-serif";
    const { getColor } = useDesignTokens();

    // Helper to get color with fallback
    const getSafeColor = (colorValue: string | undefined, defaultHex: string) => {
        if (!colorValue) return defaultHex;
        // If it's a CSS variable map it, otherwise just use the value
        return colorValue.startsWith('var(--') ? getColor(colorValue.replace('var(--color-', '').replace(')', ''), defaultHex) : colorValue;
    }

    // Color fallbacks for the Brutalist Signal aesthetic
    const bgColor = getSafeColor(colors?.background, '#E8E4DD'); // Paper
    const headingColor = getSafeColor(colors?.heading, '#0D0D0D'); // Near Black
    const textColor = getSafeColor(colors?.text, '#2A2A2A'); // Dark Gray
    const accentColor = getSafeColor(colors?.accent, '#E63B2E'); // Signal Red

    // Card aesthetics
    const cardBgColor = getSafeColor(colors?.cardBackground, '#F5F3EE');
    const cardHeadingColor = getSafeColor((colors as any)?.cardHeading, headingColor);
    const cardTextColor = getSafeColor((colors as any)?.cardText, textColor);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const cardsContainerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        // If we're in the editor preview, simplify animations to avoid layout jumping while typing
        // and ensure all cards are visible without scrolling
        if (isPreview) {
            // Remove any GSAP inline styles that hide elements
            if (titleRef.current) gsap.set(titleRef.current, { clearProps: "all" });
            cardsRef.current.forEach(card => {
                if (card) gsap.set(card, { clearProps: "all" });
            });
            return;
        }

        // Use GSAP Context for easy cleanup
        const ctx = gsap.context(() => {
            // 1. Text reveal for the main sticky title
            gsap.fromTo(
                titleRef.current,
                { opacity: 0, y: 50 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.2,
                    ease: 'power4.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                    },
                }
            );

            // 2. Staggered reveal for the cards as they scroll into view
            cardsRef.current.forEach((card, index) => {
                if (!card) return;

                // Image reveal inside card
                const img = card.querySelector('.gym-feature-img');
                if (img) {
                    gsap.fromTo(img,
                        { scale: 1.2, filter: 'grayscale(100%)' },
                        {
                            scale: 1,
                            filter: 'grayscale(0%)',
                            duration: 1.5,
                            ease: 'expo.out',
                            scrollTrigger: {
                                trigger: card,
                                start: 'top 85%',
                            }
                        }
                    );
                }

                // Card container reveal
                gsap.fromTo(
                    card,
                    { opacity: 0, x: 50, skewX: -2 },
                    {
                        opacity: 1,
                        x: 0,
                        skewX: 0,
                        duration: 1,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 85%', // Trigger slightly before it hits the viewport
                        },
                    }
                );
            });
        }, sectionRef);

        return () => ctx.revert();
    }, [isPreview, items.length]);

    return (
        <section
            ref={sectionRef}
            className={`relative w-full ${paddingMap[paddingY]} overflow-hidden`}
            style={{
                backgroundColor: bgColor,
                fontFamily: defaultFontFamily,
                color: textColor
            }}
        >
            <div className={`mx-auto max-w-[1400px] ${paddingXMap[paddingX]}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">

                    {/* STICKY TITLE COLUMN */}
                    <div className={`lg:col-span-5 relative ${layoutAlignment === 'right' ? 'lg:order-last' : 'lg:order-first'}`}>
                        <div className="lg:sticky lg:top-32" ref={titleRef}>
                            {/* Decorative accent slash */}
                            <div
                                className="w-16 h-2 mb-8 transform -skew-x-12"
                                style={{ backgroundColor: accentColor }}
                            />

                            <h2
                                className={`font-black uppercase tracking-tighter leading-[0.85] mb-8 ${fontSizeMap[titleFontSize]}`}
                                style={{ color: headingColor }}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}
                            />

                            <p
                                className="text-xl md:text-2xl font-medium tracking-tight leading-snug max-w-md opacity-80"
                                style={{ color: textColor }}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                            />
                        </div>
                    </div>

                    {/* SCROLLING CARDS COLUMN */}
                    <div className={`lg:col-span-7 ${layoutAlignment === 'right' ? 'lg:order-first' : 'lg:order-last'}`} ref={cardsContainerRef}>
                        <div className="flex flex-col gap-8 md:gap-12">
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    ref={(el) => { cardsRef.current[index] = el; }}
                                    className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl"
                                    style={{ backgroundColor: cardBgColor }}
                                >
                                    {/* Subtle Accent Line on Top */}
                                    <div
                                        className="absolute top-0 left-0 w-full h-1 scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100 z-10"
                                        style={{ backgroundColor: accentColor }}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2">
                                        {/* Content Area */}
                                        <div className="p-8 md:p-12 flex flex-col justify-between min-h-[300px]">
                                            <div>
                                                {/* Number Index */}
                                                <div
                                                    className="text-sm font-bold opacity-30 tracking-widest mb-6"
                                                    style={{ color: cardHeadingColor }}
                                                >
                                                    /(0{index + 1})
                                                </div>

                                                <h3
                                                    className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-6 group-hover:translate-x-2 transition-transform duration-300"
                                                    style={{ color: cardHeadingColor }}
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.title) }}
                                                />
                                                <p
                                                    className="text-lg leading-relaxed opacity-80 font-medium"
                                                    style={{ color: cardTextColor }}
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
                                                />
                                            </div>

                                            {/* Optional Action/Arrow */}
                                            {(item.linkUrl || item.linkType) && (
                                                <div className="mt-8">
                                                    <div
                                                        className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-sm transition-opacity opacity-0 group-hover:opacity-100"
                                                        style={{ color: accentColor }}
                                                    >
                                                        <span>{item.linkText || 'Explore'}</span>
                                                        <ArrowUpRight strokeWidth={3} size={20} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Image Area */}
                                        <div className="relative h-[250px] md:h-auto overflow-hidden bg-black">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    className="gym-feature-img w-full h-full object-cover transform scale-100 brightness-75 group-hover:brightness-100 transition-all duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center opacity-20">
                                                    <div className="w-1/2 h-1/2 rounded mix-blend-overlay" style={{ backgroundColor: accentColor }} />
                                                </div>
                                            )}

                                            {/* Inner border frame for Brutalist feel */}
                                            <div className="absolute inset-4 border border-white/20 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default FeaturesCinematicGym;
