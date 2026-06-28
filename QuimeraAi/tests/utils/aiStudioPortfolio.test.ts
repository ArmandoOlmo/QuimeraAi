import { describe, expect, it } from 'vitest';
import {
    ensureGeneratedPortfolioSections,
    ensurePortfolioProjects,
    ensureStandardPortfolioItems,
} from '../../utils/aiStudioPortfolio';

describe('aiStudioPortfolio', () => {
    const brief = {
        businessName: 'Studio Norte',
        industry: 'Design',
        description: 'Brand and web design for local businesses.',
        services: [
            { name: 'Brand Refresh', description: 'Identity cleanup and launch assets.' },
            { name: 'Website Redesign', description: 'Responsive website design.' },
            { name: 'Campaign System', description: 'Reusable campaign visuals.' },
        ],
    };

    it('normalizes standard portfolio data to at least three renderable items', () => {
        const portfolio: Record<string, any> = {
            projects: [
                { title: 'Existing Case Study', category: 'Branding' },
            ],
        };

        ensureStandardPortfolioItems(portfolio, brief, false);

        expect(portfolio.projects).toBeUndefined();
        expect(portfolio.items).toHaveLength(3);
        expect(portfolio.items[0]).toMatchObject({
            title: 'Existing Case Study',
            category: 'Branding',
            imageUrl: '',
        });
        expect(portfolio.items[1]).toMatchObject({
            title: 'Website Redesign',
            description: 'Responsive website design.',
            imageUrl: '',
        });
    });

    it('normalizes suite portfolio variants to at least three projects', () => {
        const portfolio: Record<string, any> = {
            items: [
                { title: 'Launch Package', description: 'A complete launch package.' },
            ],
        };

        ensurePortfolioProjects(portfolio, brief, true);

        expect(portfolio.projects).toHaveLength(3);
        expect(portfolio.projects[0]).toMatchObject({
            title: 'Launch Package',
            description: 'A complete launch package.',
            imageUrl: '',
        });
        expect(portfolio.projects[2]).toMatchObject({
            title: 'Campaign System',
            imageUrl: '',
        });
    });

    it('creates missing active portfolio sections from component order', () => {
        const data: Record<string, any> = {};

        ensureGeneratedPortfolioSections(data, brief, false, ['portfolio', 'portfolioLumina']);

        expect(data.portfolio.items).toHaveLength(3);
        expect(data.portfolioLumina.projects).toHaveLength(3);
    });
});
