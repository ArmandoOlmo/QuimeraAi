import { describe, expect, it } from 'vitest';
import { getAiStudioSummary, getStudioReadiness, getTemplateStudioSummary } from '../../utils/studioUX';

describe('Studio UX summary/readiness', () => {
    it('enables AI Studio generation with minimum business context', () => {
        const readiness = getStudioReadiness({
            kind: 'website',
            businessName: 'Guaynabo E-Bikes',
            industry: 'electric bike shop',
            services: [{ name: 'Bike sales' }],
            missingFields: ['contactInfo.phone', 'style'],
        });

        expect(readiness.canGenerate).toBe(true);
        expect(readiness.label).toBe('Ready to generate');
        expect(readiness.nonCriticalMissing).toContain('location/contact');
    });

    it('does not block generation for non-critical missing AI Studio fields', () => {
        const summary = getAiStudioSummary({
            brief: {
                businessName: 'Modern Art Gallery',
                industry: 'gallery',
                description: 'A portfolio website for exhibitions and artist collections.',
                services: [],
                contactInfo: {},
                suggestedComponents: ['hero', 'portfolio', 'cta'],
                missingFields: ['contactInfo.email', 'businessHours'],
                readinessScore: 45,
            },
        });

        expect(summary.readiness.canGenerate).toBe(true);
        expect(summary.nextAction).toBe('Generate Website');
        expect(summary.warnings.join(' ')).toContain('reviewed later');
    });

    it('marks Template Studio output as sample content and template draft', () => {
        const summary = getTemplateStudioSummary({
            brief: {
                businessName: 'Restaurant template',
                industry: 'restaurant',
                description: 'Reusable restaurant template with menu and reservations.',
                suggestedComponents: ['hero', 'menu', 'cta'],
            },
        });

        expect(summary.readiness.canGenerate).toBe(true);
        expect(summary.badges).toEqual(expect.arrayContaining(['Template draft', 'Sample content', 'Needs review']));
        expect(summary.fields.some(field => field.label === 'Sample content status' && field.value.includes('Sample content'))).toBe(true);
        expect(summary.nextAction).toBe('Generate Template');
    });
});
