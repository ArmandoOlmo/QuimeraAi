import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { getFontStack } from '../utils/fontLoader';
import { sanitizeHtml } from '../utils/sanitize';
import { getBorderRadiusClass } from '../utils/styleUtils';
import { FaqNeonData } from '../types/components';
import { ChevronDown } from 'lucide-react';

export interface FaqNeonProps extends FaqNeonData {
    isPreviewMode?: boolean;
}

const FaqNeon: React.FC<FaqNeonProps> = (props) => {
    const { t } = useTranslation();
    const data = props;
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    // Fallbacks
    const headline = data.headline || 'Frequently Asked Questions';
    const subheadline = data.subheadline || 'Everything you need to know about the product and billing.';
    const faqs = data.faqs && data.faqs.length > 0 ? data.faqs : [
        { question: 'Is there a free trial available?', answer: 'Yes, you can try us for free for 30 days. If you want, we’ll provide you with a free, personalized 30-minute onboarding call to get you up and running as soon as possible.' },
        { question: 'Can I change my plan later?', answer: 'Of course. Our pricing scales with your company. Chat to our friendly team to find a solution that works for you.' },
        { question: 'What is your cancellation policy?', answer: 'We understand that things change. You can cancel your plan at any time and we’ll refund you the difference already paid.' },
        { question: 'How does billing work?', answer: 'Plans are per workspace, not per account. You can upgrade one workspace, and still have any number of free workspaces.' }
    ];

    const colors = data.colors || {};
    const headlineFontFamily = data.headlineFont ? getFontStack(data.headlineFont) : 'var(--font-header)';
    const subheadlineFontFamily = data.subheadlineFont ? getFontStack(data.subheadlineFont) : 'var(--font-body)';

    // Box Shadow for Neon Glow
    const intensity = data.glowIntensity !== undefined ? data.glowIntensity : 50;
    const neonColor = colors.neonGlow || '#FBB92B';

    const showTopDots = data.showTopDots ?? true;
    const dotColors = data.dotColors?.length ? data.dotColors : ['#FF5F56', '#FFBD2E', '#27C93F'];

    return (
        <section 
            className="w-full relative overflow-hidden py-24 px-6 md:px-12 flex flex-col justify-center"
            style={{ 
                backgroundColor: colors.background,
                minHeight: data.sectionHeight ? `${data.sectionHeight}vh` : '70vh'
            }}
        >

            <div className="relative z-10 w-full max-w-4xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    {headline && (
                        <h2 
                            className="text-4xl md:text-5xl font-bold font-header"
                            style={{ 
                                color: colors.heading || '#ffffff',
                                fontFamily: headlineFontFamily,
                                textTransform: 'var(--headings-transform, none)' as any,
                                letterSpacing: 'var(--headings-spacing, normal)',
                                textShadow: intensity > 0 ? `0 0 20px ${neonColor}40` : 'none'
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }}
                        />
                    )}
                    {subheadline && (
                        <p 
                            className="text-lg md:text-xl font-body opacity-80"
                            style={{ 
                                color: colors.text || '#a1a1aa',
                                fontFamily: subheadlineFontFamily
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subheadline) }}
                        />
                    )}
                </div>

                <div 
                    className={clsx(
                        "p-6 md:p-10 transition-all duration-300 relative",
                        getBorderRadiusClass(data.cardBorderRadius),
                        data.glassEffect ? "backdrop-blur-xl" : ""
                    )}
                    style={{
                        backgroundColor: data.glassEffect 
                            ? `color-mix(in srgb, ${colors.cardBackground || '#141414'} 50%, transparent)` 
                            : (colors.cardBackground || '#141414'),
                        borderWidth: intensity > 0 ? '1px' : '0px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(255,255,255,0.05)',
                        boxShadow: intensity > 0 ? `0 0 ${intensity}px ${neonColor}20` : 'none'
                    }}
                >
                    {/* Decorative Dots */}
                    {showTopDots && dotColors.length > 0 && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-white/5 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.5)]">
                            {dotColors.map((color, i) => (
                                <div 
                                    key={i}
                                    className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full relative"
                                    style={{ 
                                        backgroundColor: color,
                                        boxShadow: `inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)`
                                    }}
                                >
                                    <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-white/60 rounded-full blur-[1px]"></div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className={clsx("divide-y divide-white/10", showTopDots && dotColors.length > 0 ? "pt-6" : "")}>
                        {faqs.map((faq, idx) => {
                            const isOpen = openIndex === idx;
                            return (
                                <div key={idx} className="py-6 first:pt-0 last:pb-0">
                                    <button 
                                        className="w-full flex items-center justify-between gap-4 text-left group"
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                    >
                                        <span 
                                            className="text-xl font-bold font-header transition-colors duration-300"
                                            style={{ 
                                                color: isOpen ? neonColor : (colors.heading || '#ffffff'),
                                                fontFamily: headlineFontFamily,
                                                textShadow: isOpen && intensity > 0 ? `0 0 10px ${neonColor}80` : 'none'
                                            }}
                                        >
                                            {faq.question}
                                        </span>
                                        <span 
                                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                                            style={{
                                                backgroundColor: isOpen ? neonColor : 'rgba(255,255,255,0.05)',
                                                color: isOpen ? '#000000' : (colors.heading || '#ffffff'),
                                                boxShadow: isOpen && intensity > 0 ? `0 0 15px ${neonColor}80` : 'none'
                                            }}
                                        >
                                            <ChevronDown 
                                                size={20} 
                                                className={clsx("transition-transform duration-300", isOpen && "rotate-180")} 
                                            />
                                        </span>
                                    </button>
                                    
                                    <div 
                                        className={clsx(
                                            "overflow-hidden transition-all duration-300 ease-in-out",
                                            isOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
                                        )}
                                    >
                                        <p 
                                            className="text-base font-body leading-relaxed pr-12"
                                            style={{ 
                                                color: colors.text || '#a1a1aa',
                                                fontFamily: subheadlineFontFamily
                                            }}
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer) }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FaqNeon;
