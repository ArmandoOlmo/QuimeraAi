import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FAQManager from '../../components/dashboard/ai/FAQManager';
import { FAQItem } from '../../types';

describe('FAQManager', () => {
    it('accepts an undefined FAQ list', () => {
        render(
            <FAQManager
                faqs={undefined}
                onFAQsChange={vi.fn()}
            />
        );

        expect(screen.getByText('aiAssistant.faq.addFaq')).toBeInTheDocument();
        expect(screen.getByText('aiAssistant.faq.noFaqs')).toBeInTheDocument();
    });

    it('renders partial legacy FAQs without crashing', () => {
        const faqs = [
            {
                id: 'legacy-faq',
            },
        ] as unknown as FAQItem[];

        render(
            <FAQManager
                faqs={faqs}
                onFAQsChange={vi.fn()}
            />
        );

        expect(screen.getByText('Untitled question')).toBeInTheDocument();
    });
});
