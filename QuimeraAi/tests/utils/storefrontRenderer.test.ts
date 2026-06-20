import { describe, expect, it } from 'vitest';
import {
    applyResolvedStorefrontEditorConfig,
    getRenderableStorefrontSectionDecisions,
    normalizeStorefrontSectionVisibility,
    resolveStorefrontPageData,
    resolveStorefrontEditorConfig,
    resolveStorefrontSectionVisibility,
    resolveStorefrontSectionDecisions,
    STOREFRONT_SECTION_KINDS,
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

        expect(decisions.map(decision => decision.kind)).toEqual([
            'announcementBar',
            'featuredProducts',
            ...STOREFRONT_SECTION_KINDS.filter(section => !['announcementBar', 'featuredProducts'].includes(section)),
        ]);
        expect(decisions.every(decision => decision.source === 'componentOrder')).toBe(true);
        expect(getRenderableStorefrontSectionDecisions({
            componentOrder: ['hero', 'announcementBar', 'featuredProducts', 'footer'],
            pageData: {},
        })).toHaveLength(STOREFRONT_SECTION_KINDS.length);
    });

    it('defaults an unconfigured storefront landing page to every storefront section', () => {
        const decisions = resolveStorefrontSectionDecisions({
            pageData: {},
            componentOrder: [],
            sectionVisibility: {},
        });

        expect(decisions.map(decision => decision.kind)).toEqual(STOREFRONT_SECTION_KINDS);
        expect(decisions.every(decision => decision.status === 'render')).toBe(true);
    });

    it('respects explicit editor sections so removed modules can be added back individually', () => {
        const decisions = resolveStorefrontSectionDecisions({
            pageData: {},
            componentOrder: ['announcementBar', 'featuredProducts'],
            sectionVisibility: {},
            includeMissingSections: false,
        });

        expect(decisions.map(decision => decision.kind)).toEqual(['announcementBar', 'featuredProducts']);
    });

    it('completes legacy storefront editor config with every storefront section', () => {
        const config = resolveStorefrontEditorConfig({
            componentOrder: ['announcementBar'],
            sectionVisibility: { announcementBar: true },
            data: {},
        }, { mode: 'draft' });

        expect(config.source).toBe('legacy');
        expect(config.componentOrder).toEqual(STOREFRONT_SECTION_KINDS);
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

        expect(decisions.map(decision => decision.kind)).toEqual(STOREFRONT_SECTION_KINDS);
        expect(decisions.slice(0, 2).map(decision => decision.id)).toEqual(['announcement-blueprint', 'hero-blueprint']);
        expect(decisions.slice(0, 2).every(decision => decision.source === 'blueprint')).toBe(true);
        expect(decisions.slice(2).every(decision => decision.source === 'componentOrder')).toBe(true);
        expect(decisions[1].data.headline).toBe('From blueprint settings');
    });

    it('respects explicit editor blueprint sections without appending missing modules', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['featuredProducts', 'categoryGrid'],
            includeMissingSections: false,
            blueprintSections: [
                {
                    id: 'editor-hero',
                    type: 'productHero',
                    order: 1,
                    enabled: true,
                    status: 'generated',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'user', userModified: true },
                },
            ],
        });

        expect(decisions.map(decision => decision.kind)).toEqual(['productHero', 'featuredProducts', 'categoryGrid']);
        expect(decisions.map(decision => decision.source)).toEqual(['blueprint', 'componentOrder', 'componentOrder']);
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

        expect(decisions).toHaveLength(STOREFRONT_SECTION_KINDS.length);
        expect(decisions[0]).toMatchObject({
            kind: 'featuredProducts',
            source: 'componentOrder',
            status: 'render',
        });
    });

    it('hides sections via sectionVisibility, enabled, and disabled blueprint status', () => {
        const decisions = resolveStorefrontSectionDecisions({
            componentOrder: ['announcementBar', 'recentlyViewed', 'productReviews'],
            sectionVisibility: { announcementBar: false },
            pageData: {
                recentlyViewed: { enabled: false },
                productReviews: { visibleIn: 'landing' },
            },
        });

        expect(decisions.slice(0, 3).map(decision => decision.status)).toEqual(['hidden', 'hidden', 'render']);
        expect(decisions[2].data.visibleIn).toBe('landing');
        expect(decisions).toHaveLength(STOREFRONT_SECTION_KINDS.length);

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

    it('marks invalid settings and keeps incomplete storefront modules renderable', () => {
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

        expect(empty.slice(0, 2).map(decision => decision.status)).toEqual(['render', 'render']);
        expect(empty).toHaveLength(STOREFRONT_SECTION_KINDS.length);
        expect(getRenderableStorefrontSectionDecisions({
            componentOrder: ['productBundle'],
            pageData: { productBundle: { productIds: [] } },
        })).toHaveLength(STOREFRONT_SECTION_KINDS.length);
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

    it('keeps manual all-hidden state for explicit user visibility choices', () => {
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

    it('does not expose draft storefront editor config in published mode', () => {
        const projectData = {
            componentOrder: ['announcementBar'],
            sectionVisibility: {
                announcementBar: true,
                productHero: true,
            },
            data: {
                storefrontEditor: {
                    draft: {
                        componentOrder: ['productHero'],
                        sectionVisibility: { productHero: true },
                        sectionSettings: {
                            productHero: {
                                headline: 'Draft-only hero',
                            },
                        },
                    },
                },
            },
        };

        const publishedConfig = resolveStorefrontEditorConfig(projectData, { mode: 'published' });
        const appliedProject = applyResolvedStorefrontEditorConfig(projectData, { mode: 'published' });
        const pageData = resolveStorefrontPageData(appliedProject);

        expect(publishedConfig).toMatchObject({
            componentOrder: ['announcementBar', ...STOREFRONT_SECTION_KINDS.filter(section => section !== 'announcementBar')],
            source: 'legacy',
        });
        expect(pageData.productHero?.headline).not.toBe('Draft-only hero');
    });

    it('lets draft storefront editor config start from published when draft is missing', () => {
        const projectData = {
            componentOrder: ['announcementBar'],
            data: {
                storefrontEditor: {
                    published: {
                        componentOrder: ['featuredProducts'],
                        sectionVisibility: { featuredProducts: true },
                    },
                },
            },
        };

        expect(resolveStorefrontEditorConfig(projectData, { mode: 'draft' })).toMatchObject({
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
            includeMissingSections: false,
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
