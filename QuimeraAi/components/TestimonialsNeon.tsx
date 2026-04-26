import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';

export interface NeonTestimonial {
    quote?: string;
    authorName?: string;
    authorRole?: string;
    authorImage?: string;
}

export interface TestimonialsNeonData {
    headline?: string;
    subheadline?: string;
    testimonials?: NeonTestimonial[];
    sectionHeight?: number; // Representing vh
    
    // Aesthetic controls
    glassEffect?: boolean;
    showBackgroundGrid?: boolean;
    glowIntensity?: number; // 0-100
    
    // Colors
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        neonGlow?: string;
        cardBackground?: string;
        cardText?: string;
    };
    
    // Typography
    headlineFont?: string;
    subheadlineFont?: string;
}

export interface TestimonialsNeonProps extends TestimonialsNeonData {
    isPreviewMode?: boolean;
}

const TestimonialsNeon: React.FC<TestimonialsNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;

    // Fallbacks
    const headline = data.headline || 'What Our Clients Say';
    const subheadline = data.subheadline || 'Real stories from real users.';
    const testimonials = data.testimonials && data.testimonials.length > 0 ? data.testimonials : [
        {
            quote: 'This platform completely changed how we work.',
            authorName: 'Sarah Jenkins',
            authorRole: 'CEO at TechNova',
            authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        },
        {
            quote: 'The design system is incredibly flexible and beautiful.',
            authorName: 'David Lee',
            authorRole: 'Lead Designer',
            authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        },
        {
            quote: 'A game changer for our agency. Highly recommended.',
            authorName: 'Elena Rodriguez',
            authorRole: 'Marketing Director',
            authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3'
        }
    ];

    const colors = data.colors || {
        background: '#0a0a0a',
        text: '#ffffff',
        heading: '#ffffff',
        neonGlow: '#FBB92B',
        cardBackground: 'rgba(20, 20, 20, 0.8)',
        cardText: '#ffffff',
    };

    // Fonts
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Glow Logic
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    const blurRadius = (intensity / 100) * 30;
    const spreadRadius = (intensity / 100) * 5;
    const opacity = (intensity / 100) * 0.6 + 0.2; // 0.2 to 0.8
    const neonColor = colors.neonGlow || '#FBB92B';
    
    const glowStyle = {
        boxShadow: `0 0 ${blurRadius}px ${spreadRadius}px ${neonColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        borderColor: neonColor
    };

    return (
        <section 
            className="w-full relative overflow-hidden py-20 px-6 md:px-12 flex flex-col justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '100vh'
            }}
        >
            {/* Background Grid Pattern */}
            {data.showBackgroundGrid !== false && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${neonColor} 1px, transparent 1px), linear-gradient(90deg, ${neonColor} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        backgroundPosition: 'center center'
                    }}
                />
            )}

            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-16">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <h2 
                        className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
                        style={{ fontFamily: headlineFontFamily, color: colors.heading }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }}
                    />
                    {subheadline && (
                        <p 
                            className="text-lg md:text-xl opacity-90"
                            style={{ fontFamily: subheadlineFontFamily, color: colors.text }}
                        >
                            {subheadline}
                        </p>
                    )}
                </div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, idx) => {
                        const name = testimonial.authorName || 'Anonymous';
                        const role = testimonial.authorRole || '';
                        const image = testimonial.authorImage || '';
                        const quoteText = testimonial.quote || '';

                        return (
                            <div 
                                key={idx}
                                className={clsx(
                                    "flex flex-col p-8 rounded-3xl transition-all duration-300 relative",
                                    data.glassEffect ? "backdrop-blur-xl" : ""
                                )}
                                style={{
                                    backgroundColor: data.glassEffect 
                                        ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} 60%, transparent)` 
                                        : (colors.cardBackground || '#141414'),
                                    ...glowStyle,
                                    borderWidth: intensity > 0 ? '1px' : '0px',
                                    borderStyle: 'solid'
                                }}
                            >
                                {/* Quote Icon */}
                                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                                     style={{ backgroundColor: neonColor, color: '#000' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                                    </svg>
                                </div>

                                <p 
                                    className="flex-grow text-lg italic leading-relaxed mb-8 mt-2"
                                    style={{ fontFamily: subheadlineFontFamily, color: colors.cardText }}
                                >
                                    "{quoteText}"
                                </p>

                                <div className="flex items-center gap-4 mt-auto">
                                    {image ? (
                                        <img src={image} alt={name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: neonColor }} />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2"
                                             style={{ backgroundColor: '#111', color: neonColor, borderColor: neonColor }}>
                                            {name.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h4 
                                            className="font-bold text-lg"
                                            style={{ fontFamily: headlineFontFamily, color: colors.heading }}
                                        >
                                            {name}
                                        </h4>
                                        {role && (
                                            <p 
                                                className="text-sm opacity-80"
                                                style={{ fontFamily: subheadlineFontFamily, color: colors.text }}
                                            >
                                                {role}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

export default TestimonialsNeon;
