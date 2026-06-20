import { describe, expect, it } from 'vitest';
import {
    applyResolvedStorefrontEditorConfig,
    getRenderableStorefrontSectionDecisions,
    normalizeStorefrontSectionVisibility,
    resolveStorefrontPageData,
    resolveStorefrontEditorConfig,
    resolveStorefrontSectionVisibility,
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

    it('normalizes preset sections to visible even when they were previously hidden', () => {
        const visibility = normalizeStorefrontSectionVisibility({
            sections: ['productHero', 'featuredProducts'],
            previousVisibility: {
                productHero: false,
                featuredProducts: false,
            },
            recommendedSections: ['productHero', 'featuredProducts'],
            forceRecommendedVisible: true,
            ensureAtLeastOneVisible: true,
        });

        expect(visibility.productHero).toBe(true);
        expect(visibility.featuredProducts).toBe(true);
    });

    it('defaults new core storefront sections to visible without reading website section keys', () => {
        expect(resolveStorefrontSectionVisibility('productHero', { hero: false }, {
            defaultVisible: true,
            isCoreSection: true,
        })).toBe(true);
    });

    it('keeps manual all-hidden state so StorefrontHome can render the product-grid fallback', () => {
        const visibility = normalizeStorefrontSectionVisibility({
            sections: ['productHero', 'featuredProducts'],
            previousVisibility: {
                productHero: false,
                featuredProducts: false,
            },
            ensureAtLeastOneVisible: false,
        });

        expect(visibility.productHero).toBe(false);
        expect(visibility.featuredProducts).toBe(false);
    });

    it('resolves draft and published storefront editor configs separately', () => {
        const projectData = {
            componentOrder: ['announcementBar'],
            sectionVisibility: { announcementBar: true },
            data: {
                storefrontEditor: {
                    draft: {
                        componentOrder: ['productHero'],
                        sectionVisibility: { productHero: false },
                    },
                    published: {
                        componentOrder: ['featuredProducts'],
                        sectionVisibility: { featuredProducts: true },
                    },
                },
            },
        };

        expect(resolveStorefrontEditorConfig(projectData, { mode: 'draft' })).toMatchObject({
            componentOrder: ['productHero'],
            sectionVisibility: { productHero: false },
            source: 'draft',
        });
        expect(resolveStorefrontEditorConfig(projectData, { mode: 'published' })).toMatchObject({
            componentOrder: ['featuredProducts'],
            sectionVisibility: { featuredProducts: true },
            source: 'published',
        });
    });

    it('resolves nested storefront editor data for preview rendering', () => {
        const projectData = {
            componentOrder: ['announcementBar'],
            sectionVisibility: { announcementBar: true },
            data: {
                data: {
                    storefrontEditor: {
                        draft: {
                            componentOrder: ['collectionBanner'],
                            sectionVisibility: { collectionBanner: true },
                            sectionSettings: {
                                collectionBanner: {
                                    variant: 'hero',
                                    title: 'Coleccion destacada',
                                    visibleIn: 'store',
                                },
                            },
                        },
                    },
                },
            },
        };

        const appliedProject = applyResolvedStorefrontEditorConfig(projectData, { mode: 'draft' });
        const pageData = resolveStorefrontPageData(appliedProject);
        const decisions = resolveStorefrontSectionDecisions({
            pageData,
            componentOrder: appliedProject.componentOrder,
            sectionVisibility: appliedProject.sectionVisibility,
        });

        expect(resolveStorefrontEditorConfig(projectData, { mode: 'draft' })).toMatchObject({
            componentOrder: ['collectionBanner'],
            sectionVisibility: { collectionBanner: true },
            source: 'draft',
        });
        expect(pageData.collectionBanner).toMatchObject({
            title: 'Coleccion destacada',
            visibleIn: 'store',
        });
        expect(decisions).toHaveLength(1);
        expect(decisions[0]).toMatchObject({
            kind: 'collectionBanner',
            status: 'render',
        });
    });
});
