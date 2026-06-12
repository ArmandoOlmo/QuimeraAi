import { describe, expect, it } from 'vitest';
import type { PageSection } from '../../types';
import { componentRegistry } from '../../data/componentRegistry';
import {
    buildAssetPlan,
    createWebsitePlanFromBrief,
    createWebsitePlanFromImport,
    recommendSectionsForBrief,
} from '../../utils/websitePlanEngine';

const publicRegistry = componentRegistry.filter(item => !item.adminOnly);
const registryWithoutEcommerce = publicRegistry.filter(item => item.role !== 'ecommerce');

const baseBrief = {
    businessName: 'Casa Cultural',
    industry: 'cultural arts',
    description: 'A cultural studio with workshops, local art, performances, and gallery events.',
    tagline: 'Culture in motion',
    services: [
        { name: 'Workshops', description: 'Creative workshops for local artists and families.' },
        { name: 'Events', description: 'Curated cultural events and exhibitions.' },
    ],
    contactInfo: { city: 'San Juan', country: 'Puerto Rico' },
    hasEcommerce: false,
    colorPalette: {
        primary: '#0f766e',
        secondary: '#f59e0b',
        accent: '#db2777',
        background: '#fff7ed',
        surface: '#ffffff',
        text: '#1f2937',
    },
};

describe('websitePlanEngine', () => {
    it('chooses visual components for creative/cultural businesses', () => {
        const sections = recommendSectionsForBrief(baseBrief, registryWithoutEcommerce);

        expect(sections.some(section => ['heroNova', 'heroGallery'].includes(section))).toBe(true);
        expect(sections).toContain('portfolio');
        expect(sections).toContain('slideshow');
        expect(sections).toContain('testimonials');
        expect(sections.some(section => section.startsWith('product'))).toBe(false);
    });

    it('does not let weak AI suggestedComponents replace the strategy engine', () => {
        const plan = createWebsitePlanFromBrief({
            ...baseBrief,
            suggestedComponents: ['hero', 'faq', 'footer'] as PageSection[],
        }, registryWithoutEcommerce);
        const sections = plan.componentPlan.map(item => item.component);

        expect(sections[0]).toBe('heroNova');
        expect(sections).toContain('portfolio');
        expect(sections).toContain('faq');
    });

    it('does not recommend ecommerce components when ecommerce is unavailable', () => {
        const sections = recommendSectionsForBrief({
            ...baseBrief,
            industry: 'ecommerce',
            description: 'A product catalog and online store for handmade goods.',
            hasEcommerce: true,
        }, registryWithoutEcommerce);

        expect(sections.some(section => ['productHero', 'featuredProducts', 'categoryGrid'].includes(section))).toBe(false);
        expect(sections.some(section => section.startsWith('hero'))).toBe(true);
    });

    it('ranks imported hero/gallery images above logos for hero slots', () => {
        const plan = {
            businessProfile: {
                businessName: 'Casa Cultural',
                industry: 'cultural arts',
                description: 'Gallery events and creative workshops.',
                services: [],
                contactInfo: {},
            },
            brandProfile: { colors: baseBrief.colorPalette },
            contentMap: {
                pages: [],
                extractedImages: [
                    { url: 'https://example.com/logo.png', alt: 'Casa Cultural logo', recommendedUse: 'logo', score: 98, width: 300, height: 120 },
                    { url: 'https://example.com/gallery-hero.jpg', alt: 'people at gallery opening', recommendedUse: 'gallery', score: 65, width: 1600, height: 900 },
                ],
            },
            componentPlan: [{ component: 'heroNova' as PageSection, reason: 'Visual business', confidence: 0.9 }],
        };

        const assets = buildAssetPlan(plan);

        expect(assets[0]?.source).toBe('existing');
        expect(assets[0]?.existingUrl).toBe('https://example.com/gallery-hero.jpg');
    });

    it('uses imported website colors as the default import palette', () => {
        const plan = createWebsitePlanFromImport({
            result: {
                businessProfile: {
                    businessName: 'Casa Cultural',
                    industry: 'cultural arts',
                    description: 'A cultural studio with workshops and events.',
                    services: [],
                    contactInfo: {},
                },
                brandProfile: {
                    colors: {
                        primary: '#be123c',
                        secondary: '#0f766e',
                        accent: '#f59e0b',
                        background: '#fff7ed',
                        surface: '#ffffff',
                        text: '#1f2937',
                    },
                },
                colorSignals: [
                    { color: '#be123c', source: 'css', weight: 110, roleGuess: 'primary', label: '--brand-primary' },
                    { color: '#0f766e', source: 'css', weight: 80, roleGuess: 'secondary', label: '--brand-secondary' },
                    { color: '#f59e0b', source: 'button', weight: 85, roleGuess: 'accent', label: '--cta' },
                    { color: '#fff7ed', source: 'background', weight: 70, roleGuess: 'background', label: 'body background' },
                ],
                recommendedComponents: ['heroNova', 'portfolio', 'slideshow', 'footer'],
            },
        }, registryWithoutEcommerce);

        expect(plan.brandProfile.selectedColorCandidateId).toBe('imported-palette-polished');
        expect(plan.brandProfile.colorCandidates?.some(candidate => candidate.id === 'imported-palette-polished')).toBe(true);
        expect(plan.brandProfile.colorBrief?.importedColors?.some(signal => signal.color === '#be123c')).toBe(true);
        expect(plan.brandProfile.colorCandidates?.find(candidate => candidate.id === 'imported-palette-polished')?.system.sourceColors).toContain('#be123c');
        expect(plan.brandProfile.colors.primary.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
    });
});
