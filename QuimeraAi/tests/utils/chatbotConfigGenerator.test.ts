import { describe, expect, it } from 'vitest';
import { generateAiAssistantConfig } from '../../utils/chatbotConfigGenerator';
import type { OnboardingProgress } from '../../types/onboarding';

const colors = {
    primary: '#0f766e',
    secondary: '#111827',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#111827',
    border: '#e5e7eb',
};

function makeProgress(overrides: Partial<OnboardingProgress> = {}): OnboardingProgress {
    return {
        step: 7,
        businessName: 'Bici Premium PR',
        industry: 'retail',
        description: 'Premium bicycle shop with repairs, accessories, and cycling gear.',
        tagline: 'Ride better',
        services: [
            {
                id: 'svc-1',
                name: 'Bicycle repairs',
                description: 'Tune-ups and diagnostics for premium bikes.',
            },
            {
                id: 'svc-2',
                name: 'Cycling accessories',
                description: 'Helmets, lights, and maintenance kits.',
            },
        ],
        contactInfo: {
            email: 'hello@example.com',
            phone: '787-000-0000',
            city: 'San Juan',
            country: 'Puerto Rico',
        },
        hasEcommerce: true,
        storeSetup: {
            storeName: 'Bici Premium Store',
            currency: 'USD',
            currencySymbol: '$',
            shippingType: 'local',
            suggestedCategories: ['Bikes', 'Accessories'],
            selectedCategories: ['Bikes', 'Accessories'],
        },
        createdAt: { seconds: 0, nanoseconds: 0 },
        updatedAt: { seconds: 0, nanoseconds: 0 },
        language: 'en',
        ...overrides,
    };
}

describe('chatbotConfigGenerator', () => {
    it('creates a ChatCore knowledge document when AI Studio generates a project', () => {
        const config = generateAiAssistantConfig(makeProgress(), colors);

        expect(config.knowledgeDocuments).toHaveLength(1);
        expect(config.knowledgeDocuments[0]).toMatchObject({
            id: 'ai-studio-chatcore-project-knowledge',
            fileType: 'text/markdown',
        });
        expect(config.knowledgeDocuments[0].name).toContain('Bici Premium PR');
        expect(config.knowledgeDocuments[0].content).toContain('ChatCore project knowledge');
        expect(config.knowledgeDocuments[0].content).toContain('Bicycle repairs');
        expect(config.knowledgeDocuments[0].content).toContain('hello@example.com');
        expect(config.knowledgeDocuments[0].content).toContain('FAQs');
        expect(config.knowledgeDocuments[0].size).toBe(config.knowledgeDocuments[0].content.length);
    });

    it('keeps the same project knowledge available through ChatCore fields', () => {
        const config = generateAiAssistantConfig(makeProgress({ language: 'es' }), colors);

        expect(config.businessProfile).toContain('Bici Premium PR');
        expect(config.productsServices).toContain('Bicycle repairs');
        expect(config.policiesContact).toContain('hello@example.com');
        expect(config.faqs.length).toBeGreaterThan(0);
        expect(config.knowledgeDocuments[0].content).toContain('Conocimiento del proyecto para ChatCore');
        expect(config.knowledgeDocuments[0].content).toContain(config.businessProfile);
    });
});
