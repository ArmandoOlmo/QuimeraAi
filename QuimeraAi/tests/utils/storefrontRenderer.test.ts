import { describe, expect, it } from 'vitest';
import {
    getRenderableStorefrontSectionDecisions,
    resolveStorefrontSectionDecisions,
    validateStorefrontSectionSettings,
} from '../../utils/storefrontRenderer';

describe('storefrontRenderer registry', () => {
    it('falls back to componentOrder and filters unsupported sections', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['hero', 'announcementBar', 'featuredProducts', 'footer'],
            pageData: {
                featuredProducts: { variant: 'grid', title: 'Featured' },
            },
        });

        expect(decisions.map(decision => decision.kind)).toEqual(['announcementBar', 'featuredProducts']);
        expect(decisions.every(decision => decision.source === 'componentOrder')).toBe(true);
        expect(getRenderableStorefrontSectionDecisions({
            componentOrder: ['hero', 'announcementBar', 'featuredProducts', 'footer'],
            pageData: {},
        })).toHaveLength(2);
    });

    it('uses blueprint sections before componentOrder when supported blueprint sections exist', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['featuredProducts', 'categoryGrid'],
            pageData: {
                productHero: { headline: 'From page data' },
            },
            blueprintSections: [
                {
                    id: 'hero-blueprint',
                    type: 'productHero',
                    order: 2,
                    settings: { headline: 'From blueprint settings' },
                    enabled: true,
                    status: 'generated',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                },
                {
                    id: 'announcement-blueprint',
                    type: 'announcementBar',
                    order: 1,
                    enabled: true,
                    status: 'generated',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                },
            ],
        });

        expect(decisions.map(decision => decision.id)).toEqual(['announcement-blueprint', 'hero-blueprint']);
        expect(decisions.every(decision => decision.source === 'blueprint')).toBe(true);
        expect(decisions[1].data.headline).toBe('From blueprint settings');
    });

    it('falls back to componentOrder when blueprint sections are unsupported', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['featuredProducts'],
            blueprintSections: [
                {
                    id: 'unsupported',
                    type: 'not-a-storefront-section',
                    order: 1,
                    enabled: true,
                    status: 'generated',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                },
            ],
        });

        expect(decisions).toHaveLength(1);
        expect(decisions[0]).toMatchObject({
            kind: 'featuredProducts',
            source: 'componentOrder',
            status: 'render',
        });
    });

    it('hides sections via sectionVisibility, visibleIn, enabled, and disabled blueprint status', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['announcementBar', 'recentlyViewed', 'productReviews'],
            sectionVisibility: { announcementBar: false },
            pageData: {
                recentlyViewed: { enabled: false },
                productReviews: { visibleIn: 'landing' },
            },
        });

        expect(decisions.map(decision => decision.status)).toEqual(['hidden', 'hidden', 'hidden']);

        const blueprintHidden = resolveStorefrontSectionDecisions({
            blueprintSections: [
                {
                    id: 'disabled-section',
                    type: 'featuredProducts',
                    order: 1,
                    enabled: true,
                    status: 'disabled',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                },
            ],
        });

        expect(blueprintHidden[0].status).toBe('hidden');
    });

    it('marks invalid settings and hides empty sections with hide behavior', () => {
        const invalid = resolveStorefrontSectionDecisions({
            componentOrder: ['featuredProducts'],
            pageData: {
                featuredProducts: { variant: 'invalid-layout' },
            },
        });

        expect(invalid[0]).toMatchObject({
            status: 'invalid',
            reasons: ['Unsupported featuredProducts variant: invalid-layout'],
        });

        const empty = resolveStorefrontSectionDecisions({
            componentOrder: ['productBundle', 'collectionBanner'],
            pageData: {
                productBundle: { productIds: [] },
                collectionBanner: {},
            },
        });

        expect(empty.map(decision => decision.status)).toEqual(['empty', 'empty']);
        expect(getRenderableStorefrontSectionDecisions({
            componentOrder: ['productBundle'],
            pageData: { productBundle: { productIds: [] } },
        })).toHaveLength(0);
    });

    it('validates section settings with warnings for reviewable incomplete states', () => {
        const result = validateStorefrontSectionSettings('featuredProducts', {
            variant: 'grid',
            sourceType: 'manual',
            productIds: [],
        });

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('Manual featured products should include productIds.');
    });
});
