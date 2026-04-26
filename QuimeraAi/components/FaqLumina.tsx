import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuminaBackground, LuminaPanel, LuminaTypography } from './ui/lumina';
import { sanitizeHtml } from '../utils/sanitize';

import { LuminaAnimationConfig } from '../types/components';

export interface LuminaFaq {
    question: string;
    answer: string;
}

export interface FaqLuminaData {
    headline: string;
    subheadline?: string;
    faqs: LuminaFaq[];
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

const FaqLumina: React.FC<FaqLuminaData> = ({
    headline,
    subheadline,
    faqs,
    glassEffect = true,
    luminaAnimation,
    colors
}) => {
    headline = headline || 'Frequently Asked Questions';
    subheadline = subheadline || 'Find answers to common questions about our platform.';
    faqs = faqs && faqs.length > 0 ? faqs : [
        { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, PayPal, and bank transfers for annual plans.' },
        { question: 'Can I cancel my subscription at any time?', answer: 'Yes, you can cancel your subscription at any time. Your access will remain active until the end of your current billing period.' },
        { question: 'Do you offer a free trial?', answer: 'Yes, we offer a 14-day free trial on all our plans. No credit card required.' },
        { question: 'Is my data secure?', answer: 'Security is our top priority. We use industry-standard encryption and regularly audit our systems to ensure your data is safe.' }
    ];
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

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
            
            <div className="relative z-10 w-full max-w-4xl mx-auto space-y-12">
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

                <div className="space-y-4">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <LuminaPanel 
                                key={idx} 
                                className="overflow-hidden transition-all duration-300"
                                variant={glassEffect ? 'glass' : 'solid'}
                                customBgColor={colors?.panelBackground}
                                customBorderColor={colors?.panelBorder}
                            >
                                <button
                                    onClick={() => toggleFaq(idx)}
                                    className="w-full text-left p-6 flex items-center justify-between focus:outline-none"
                                >
                                    <LuminaTypography variant="heading-sm" className="font-header" customColor={colors?.heading}>
                                        {faq.question}
                                    </LuminaTypography>
                                    <div className={`transform transition-transform duration-300 text-[#10B981] ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </button>
                                
                                <div 
                                    className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <div className="p-6 pt-0 border-t border-[#10B981]/10 mt-2">
                                        <LuminaTypography variant="body-md" className="opacity-80 font-body leading-relaxed pt-4" customColor={colors?.text}>
                                            {faq.answer}
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

export default FaqLumina;
