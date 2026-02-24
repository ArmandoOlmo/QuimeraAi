import React, { useEffect, useRef } from 'react';
import { HeroData, PaddingSize, FontSize } from '../../types';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDesignTokens } from '../../hooks/useDesignTokens';

gsap.registerPlugin(ScrollTrigger);

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

const headlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-4xl md:text-5xl lg:text-5xl',
    md: 'text-5xl md:text-6xl lg:text-6xl',
    lg: 'text-6xl md:text-7xl lg:text-[6vw]',
    xl: 'text-[12vw] sm:text-[10vw] lg:text-[8vw]',
};

const subheadlineSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl',
};

interface HeroCinematicGymProps extends HeroData {
    onNavigate?: (href: string) => void;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    headlineFontSize: FontSize;
    subheadlineFontSize: FontSize;
}

const HeroCinematicGym: React.FC<HeroCinematicGymProps> = (props) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLElement>(null);
    const mediaRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const { getColor } = useDesignTokens();

    const {
        paddingY = 'lg',
        paddingX = 'lg',
        headlineFontSize = 'xl',
        subheadlineFontSize = 'lg'
    } = props as any; // Cast because base interface might lack these specific optional overrides here

    const actualColors = {
        primary: props.colors?.primary || getColor('primary.main', '#E63B2E'),
        secondary: props.colors?.secondary || getColor('secondary.main', '#F5F3EE'),
        background: props.colors?.background || '#E8E4DD',
        text: props.colors?.text || '#0A0A0A',
        heading: props.colors?.heading || '#0A0A0A',
        buttonBackground: props.colors?.buttonBackground || props.colors?.primary || getColor('primary.main', '#E63B2E'),
        buttonText: props.colors?.buttonText || '#ffffff',
        secondaryButtonBackground: props.colors?.secondaryButtonBackground || '#334155',
        secondaryButtonText: props.colors?.secondaryButtonText || '#ffffff',
    };

    const primaryBg = actualColors.background;
    const accentRed = actualColors.primary;
    const darkText = actualColors.heading;
    const lightBg = actualColors.buttonText;

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Setup initial states
            gsap.set('.brutalist-split', { scaleX: 0, transformOrigin: 'left center' });
            gsap.set('.brutalist-headline-line', { yPercent: 100, opacity: 0 });
            gsap.set('.brutalist-subheadline', { y: 20, opacity: 0 });
            gsap.set('.brutalist-btn', { scale: 0.9, opacity: 0 });
            gsap.set(mediaRef.current, { scale: 1.1, opacity: 0 });
            gsap.set('.brutalist-media-overlay', { scaleY: 1, transformOrigin: 'top' });

            // Master timeline
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

            tl.to('.brutalist-split', {
                scaleX: 1,
                duration: 1.2,
                ease: 'power3.inOut'
            })
                .to(mediaRef.current, {
                    scale: 1,
                    opacity: 1,
                    duration: 1.5
                }, '-=0.8')
                .to('.brutalist-media-overlay', {
                    scaleY: 0,
                    duration: 1.2,
                    ease: 'circ.inOut'
                }, '-=1.2')
                .to('.brutalist-headline-line', {
                    yPercent: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.1
                }, '-=1')
                .to('.brutalist-subheadline', {
                    y: 0,
                    opacity: 1,
                    duration: 0.6
                }, '-=0.6')
                .to('.brutalist-btn', {
                    scale: 1,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.1
                }, '-=0.4');

            // Scroll parallax for media
            if (mediaRef.current && containerRef.current) {
                gsap.to(mediaRef.current, {
                    yPercent: 15,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top top',
                        end: 'bottom top',
                        scrub: true
                    }
                });
            }
        }, containerRef);

        return () => ctx.revert();
    }, [props.heroVariant]); // Minimal dependency to re-run entrance if variant switches while mounted

    // Split headline for staggered animation
    const words = props.headline?.split(' ') || [];
    const splitHeadline = words.map((word, i) => (
        <div key={i} className="inline-block overflow-hidden mr-[0.2em] leading-[0.85] pb-2">
            <span className="brutalist-headline-line inline-block origin-bottom uppercase tracking-tighter" style={{ color: darkText }}>
                {word}
            </span>
        </div>
    ));

    const handlePrimaryClick = (e: React.MouseEvent) => {
        if (props.onNavigate && props.primaryCtaLink) {
            e.preventDefault();
            props.onNavigate(props.primaryCtaLink);
        }
    };

    const handleSecondaryClick = (e: React.MouseEvent) => {
        if (props.onNavigate && props.secondaryCtaLink) {
            e.preventDefault();
            props.onNavigate(props.secondaryCtaLink);
        }
    };

    return (
        <section
            ref={containerRef}
            className={`relative w-full ${paddingYClasses[paddingY as PaddingSize] || paddingYClasses.xl} ${paddingXClasses[paddingX as PaddingSize] || paddingXClasses.lg} flex flex-col-reverse lg:flex-row overflow-hidden font-sans transition-colors duration-500`}
            style={{ backgroundColor: primaryBg, minHeight: props.heroHeight ? `${props.heroHeight}vh` : undefined }}
        >
            {/* Left Content Area - Brutalist Typography */}
            <div
                ref={textRef}
                className="relative z-10 w-full lg:w-[55%] flex flex-col justify-center py-12 sm:py-16 lg:py-0"
            >
                {/* Decorative brutalist elements */}
                <div className="absolute top-12 left-0 lg:left-12 w-8 h-8 sm:w-12 sm:h-12 border-t-4 border-l-4 opacity-20 transition-colors hidden sm:block" style={{ borderColor: darkText }} />
                <div className="absolute bottom-12 right-12 w-12 h-12 border-b-4 border-r-4 opacity-20 transition-colors hidden lg:block" style={{ borderColor: darkText }} />

                {props.showBadge && props.badgeText && (
                    <div className="mb-4 sm:mb-8 flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-[2px] brutalist-split transition-colors" style={{ backgroundColor: accentRed }} />
                        <span
                            className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase brutalist-headline-line transition-colors"
                            style={{ color: accentRed }}
                        >
                            {props.badgeText}
                        </span>
                    </div>
                )}

                <h1 className={`${headlineSizeClasses[headlineFontSize as FontSize] || headlineSizeClasses.xl} font-black leading-none mb-4 sm:mb-8 mix-blend-multiply flex flex-wrap transition-colors`}>
                    {splitHeadline}
                </h1>

                <p
                    className={`${subheadlineSizeClasses[subheadlineFontSize as FontSize] || subheadlineSizeClasses.lg} font-medium max-w-xl brutalist-subheadline opacity-80 leading-relaxed mb-6 sm:mb-8 lg:mb-12 transition-colors`}
                    style={{ color: actualColors.text }}
                >
                    {props.subheadline}
                </p>

                <div className="flex flex-wrap gap-6 items-center">
                    {props.primaryCta && (
                        <a
                            href={props.primaryCtaLink || '#'}
                            onClick={handlePrimaryClick}
                            className="brutalist-btn group relative px-6 py-4 sm:px-8 sm:py-5 flex items-center gap-4 overflow-hidden transition-colors"
                            style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}
                        >
                            <span className="relative z-10 font-bold uppercase tracking-wider text-sm sm:text-base">
                                {props.primaryCta}
                            </span>
                            <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            {/* Hover fill effect */}
                            <div className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        </a>
                    )}

                    {props.secondaryCta && (
                        <a
                            href={props.secondaryCtaLink || '#'}
                            onClick={handleSecondaryClick}
                            className="brutalist-btn group flex items-center gap-4 font-bold uppercase tracking-wider text-sm sm:text-base hover:opacity-70 transition-colors"
                            style={{ color: darkText }}
                        >
                            <span className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors" style={{ borderColor: darkText }}>
                                <Play className="w-4 h-4 ml-1" fill="currentColor" />
                            </span>
                            {props.secondaryCta}
                        </a>
                    )}
                </div>
            </div>

            {/* Right Media Area - Angled/Cut-out Image */}
            <div className="relative w-full lg:w-[45%] mt-6 sm:mt-8 lg:mt-0 h-[40vh] sm:h-[50vh] lg:h-auto overflow-hidden">
                {/* Diagonal cut overlay spanning from content */}
                <div
                    className="absolute inset-y-0 left-0 w-32 z-20 brutalist-split hidden lg:block transition-colors"
                    style={{
                        backgroundColor: primaryBg,
                        transform: 'skewX(-10deg)',
                        transformOrigin: 'bottom',
                        marginLeft: '-2rem'
                    }}
                />

                <div className="absolute inset-0 z-0 bg-black" />

                {/* Image Reveal Overlay */}
                <div
                    className="brutalist-media-overlay absolute inset-0 z-10 transition-colors"
                    style={{ backgroundColor: primaryBg }}
                />

                <div
                    ref={mediaRef}
                    className="absolute inset-0 w-full h-full"
                    style={{
                        backgroundImage: `url(${props.imageUrl})`,
                        backgroundSize: props.imageObjectFit || 'cover',
                        backgroundPosition: 'center',
                        filter: 'contrast(1.2) saturate(0) sepia(0.2) hue-rotate(-10deg) opacity(0.8)', // Cinematic gritty grade
                    }}
                />

                {/* Duotone map effect using mix-blend */}
                <div
                    className="absolute inset-0 mix-blend-multiply opacity-40 pointer-events-none transition-colors"
                    style={{ backgroundColor: accentRed }}
                />
                <div
                    className="absolute inset-0 mix-blend-screen opacity-20 pointer-events-none transition-colors"
                    style={{ backgroundColor: primaryBg }}
                />
            </div>
        </section>
    );
};

export default HeroCinematicGym;
