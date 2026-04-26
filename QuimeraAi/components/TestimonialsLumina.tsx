import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';
import { LuminaAnimationConfig } from '../types/components';

export interface LuminaTestimonial {
    quote?: string;
    authorName?: string;
    author?: string;
    name?: string;
    authorRole?: string;
    role?: string;
    title?: string;
    authorImage?: string;
    avatarUrl?: string;
    imageUrl?: string;
}

export interface TestimonialsLuminaData {
    headline: string;
    subheadline?: string;
    testimonials: LuminaTestimonial[];
    glassEffect?: boolean;
    luminaAnimation?: LuminaAnimationConfig;
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        panelBackground?: string;
        panelBorder?: string;
    };
}

const TestimonialsLumina: React.FC<TestimonialsLuminaData> = ({
    headline,
    subheadline,
    testimonials,
    glassEffect = true,
    luminaAnimation,
    colors
}) => {
    headline = headline || 'What Our Users Say';
    subheadline = subheadline || "Don't just take our word for it.";
    testimonials = testimonials && testimonials.length > 0 ? testimonials : [
        { quote: 'This platform completely changed how we work.', authorName: 'Sarah Jenkins', authorRole: 'CEO at TechNova', authorImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3' },
        { quote: 'The design system is incredibly flexible and beautiful.', authorName: 'David Lee', authorRole: 'Lead Designer', authorImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3' },
        { quote: 'A game changer for our agency. Highly recommended.', authorName: 'Elena Rodriguez', authorRole: 'Marketing Director', authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&ixlib=rb-4.0.3' }
    ];
    const { t } = useTranslation();

    return (
        <section 
            className="relative w-full py-20 px-6 md:px-12"
            style={{ backgroundColor: colors?.background }}
        >
            <LuminaBackground 
                className="absolute inset-0 z-0" 
                animationEnabled={luminaAnimation?.enabled}
                animationColors={luminaAnimation?.colors}
                pulseSpeed={luminaAnimation?.pulseSpeed}
                interactionStrength={luminaAnimation?.interactionStrength}
            />
            
            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <LuminaTypography variant="heading-lg" className="font-header" customColor={colors?.heading}>
                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
                    </LuminaTypography>
                    
                    {subheadline && (
                        <LuminaTypography variant="body-md" className="opacity-90 font-body" customColor={colors?.text}>
                            {subheadline}
                        </LuminaTypography>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, idx) => {
                        const name = testimonial.authorName || testimonial.author || testimonial.name || 'Anonymous';
                        const role = testimonial.authorRole || testimonial.role || testimonial.title || '';
                        const image = testimonial.authorImage || testimonial.avatarUrl || testimonial.imageUrl || '';
                        const quoteText = testimonial.quote || '';

                        return (
                        <LuminaPanel 
                            key={idx} 
                            className="p-8 flex flex-col justify-between space-y-6"
                            variant={glassEffect ? 'glass' : 'solid'}
                            customBgColor={colors?.panelBackground}
                            customBorderColor={colors?.panelBorder}
                        >
                            <div className="text-[#10B981] opacity-50 mb-2">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                                </svg>
                            </div>
                            
                            <LuminaTypography variant="body-lg" className="font-body italic flex-grow" customColor={colors?.text}>
                                "{quoteText}"
                            </LuminaTypography>
                            
                            <div className="flex items-center gap-4 mt-6">
                                {image ? (
                                    <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover border border-[#10B981]/30" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-[#064E3B] flex items-center justify-center text-white font-bold font-header">
                                        {name.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <div>
                                    <LuminaTypography variant="heading-sm" className="font-header text-sm" customColor={colors?.heading}>
                                        {name}
                                    </LuminaTypography>
                                    <LuminaTypography variant="body-sm" className="opacity-70 text-xs" customColor={colors?.text}>
                                        {role}
                                    </LuminaTypography>
                                </div>
                            </div>
                        </LuminaPanel>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsLumina;
