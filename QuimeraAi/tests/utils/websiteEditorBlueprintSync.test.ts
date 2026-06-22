import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { PageData, PageSection, SitePage, ThemeData } from '../../types';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    attachAiStudioBusinessBlueprint,
    mergeAiStudioBlueprint,
    syncWebsiteBlueprintFromEditor,
} from '../../utils/businessBlueprint';
import {
    deriveCrossModuleBlueprints,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    type AiStudioBusinessBriefInput,
} from '../../utils/aiStudio';
import { getWebsiteEcommerceBlockDefinition } from '../../utils/websiteEcommerceBlocks';

const now = '2026-06-22T12:00:00.000Z';

const theme = {
    cardBorderRadius: 'md',
    buttonBorderRadius: 'md',
    fontFamilyHeader: 'inter',
    fontFamilyBody: 'inter',
    fontFamilyButton: 'inter',
    pageBackground: '#ffffff',
    globalColors: {
        primary: '#0f766e',
        secondary: '#111827',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#111827',
        textMuted: '#64748b',
        heading: '#111827',
        border: '#e5e7eb',
        success: '#16a34a',
        error: '#dc2626',
    },
} as ThemeData;

const baseData = {
    hero: { headline: 'Manual headline' },
    featuredProducts: {
        sourceType: 'manual',
        productIds: ['prod_1', 'prod_2'],
        columns: 3,
        showPrice: true,
    },
    footer: { copyright: 'Quimera' },
} as unknown as PageData;

function makePlan(input: Partial<AiStudioBusinessBriefInput> = {}, sections: PageSection[] = ['hero', 'featuredProducts', 'footer']): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: input.businessName || 'Blueprint Shop',
            industry: input.industry || 'ecommerce store',
            description: input.businessDescription || 'Sells products online.',
            services: [{ name: 'Products', description: 'Curated products.' }],
            contactInfo: {},
            hasEcommerce: true,
        },
        brandProfile: {
            colors: theme.globalColors,
            fonts: ['inter', 'inter', 'inter'],
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Home page' }],
            products: [{ name: 'Starter Product', category: 'Featured', description: 'Draft product.' }],
        },
        componentPlan: sections.map(component => ({
            component,
            reason: 'test',
            confidence: 1,
            source: 'ai',
        })),
        assetPlan: [],
        qualityGoals: ['test'],
    };
}

function deriveMergeInputs(input: AiStudioBusinessBriefInput, plan = makePlan(input)) {
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(input);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, plan.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);

    return {
        websitePlan: plan,
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        chatbotBlueprint: crossModule.chatbotBlueprint,
        leadBlueprint: crossModule.leadBlueprint,
        emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
        options: {
            now,
            projectId: 'project_blueprint_sync',
            createdBy: 'user_blueprint_sync',
        },
    };
}

describe('Website Editor BusinessBlueprint sync', () => {
    it('syncs component add/reorder, section visibility, settings, and ecommerce blocks', () => {
        const blueprint = syncWebsiteBlueprintFromEditor({
            projectId: 'project_sync',
            projectName: 'Blueprint Shop',
            userId: 'user_sync',
            data: baseData,
            theme,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: true, footer: true } as Record<PageSection, boolean>,
            action: 'component_add',
            touchedSection: 'featuredProducts',
            now,
        });

        expect(blueprint.websiteBlueprint.sections).toEqual(['hero', 'featuredProducts', 'footer']);
        expect(blueprint.websiteBlueprint.componentOrder).toEqual(['hero', 'featuredProducts', 'footer']);
        expect(blueprint.websiteBlueprint.sectionVisibility?.featuredProducts).toBe(true);

        const section = blueprint.websiteBlueprint.sectionBlueprints?.find(item => item.type === 'featuredProducts');
        expect(section).toMatchObject({
            status: 'configured',
            needsReview: false,
            visible: true,
            settings: expect.objectContaining({ sourceType: 'manual' }),
            metadata: expect.objectContaining({
                userModified: true,
                lockedFromRegeneration: true,
                lastEditedAt: now,
                lastEditedBy: 'user_sync',
            }),
        });
        expect(section?.sourceMap?.settings).toBe('data.featuredProducts');

        const block = blueprint.websiteBlueprint.ecommerceBlocks.find(item => item.type === 'featuredProducts');
        expect(block).toMatchObject({
            source: 'manual',
            targetRoute: '/store',
            settings: expect.objectContaining({
                source: { type: 'manual', productIds: ['prod_1', 'prod_2'] },
                columns: 3,
            }),
            sourceMap: expect.objectContaining({
                canonicalSystem: 'ecommerce-engine',
                presentationOwner: 'website-builder',
            }),
        });
        expect(getWebsiteEcommerceBlockDefinition('featuredProducts')?.writes).toEqual([]);
    });

    it('syncs page changes and saveProject without dropping legacy runtime compatibility', () => {
        const pages: SitePage[] = [
            {
                id: 'home',
                title: 'Home',
                slug: '/',
                sections: ['hero', 'footer'],
                sectionData: {},
                isHomePage: true,
            },
            {
                id: 'shop',
                title: 'Shop',
                slug: '/shop',
                sections: ['featuredProducts', 'footer'],
                sectionData: {},
            },
        ];

        const blueprint = syncWebsiteBlueprintFromEditor({
            projectId: 'project_pages',
            projectName: 'Blueprint Shop',
            data: baseData,
            theme,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: false, footer: true } as Record<PageSection, boolean>,
            pages,
            action: 'save_project',
            now,
        });

        expect(blueprint.websiteBlueprint.pages).toEqual([
            { id: 'home', title: 'Home', slug: '/', sections: ['hero', 'footer'] },
            { id: 'shop', title: 'Shop', slug: '/shop', sections: ['featuredProducts', 'footer'] },
        ]);
        expect(blueprint.websiteBlueprint.sections).toEqual(['hero', 'featuredProducts', 'footer']);
        expect(blueprint.websiteBlueprint.sectionVisibility?.featuredProducts).toBe(false);
        expect(blueprint.websiteBlueprint.metadata.lastSyncedAt).toBe(now);
    });

    it('preserves user-modified website sections during AI regeneration', () => {
        const existing = syncWebsiteBlueprintFromEditor({
            projectId: 'project_regen',
            projectName: 'Locked Shop',
            userId: 'user_regen',
            data: { ...baseData, hero: { headline: 'Do not overwrite' } } as unknown as PageData,
            theme,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: true, footer: true } as Record<PageSection, boolean>,
            action: 'section_settings',
            touchedSection: 'hero',
            now,
        });

        const input: AiStudioBusinessBriefInput = {
            businessName: 'Locked Shop',
            industry: 'ecommerce store',
            businessDescription: 'Sells products online.',
            productsServicesText: 'products accessories',
            hasEcommerce: true,
            now,
        };
        const merged = mergeAiStudioBlueprint({
            existingBusinessBlueprint: existing,
            ...deriveMergeInputs(input, makePlan(input, ['hero', 'services', 'featuredProducts', 'footer'])),
        });

        const heroSection = merged.websiteBlueprint.sectionBlueprints?.find(section => section.type === 'hero');
        expect(heroSection?.metadata.lockedFromRegeneration).toBe(true);
        expect(heroSection?.settings).toMatchObject({ headline: 'Do not overwrite' });
        expect(merged.websiteBlueprint.sections).toContain('hero');
        expect(merged.websiteBlueprint.sections).toContain('services');
    });

    it('connects AI Website Studio generation to every orchestration blueprint', () => {
        const plan = makePlan({
            businessName: 'Connected Shop',
            industry: 'fitness ecommerce',
            businessDescription: 'Sells gear and digital plans.',
        });
        const project = attachAiStudioBusinessBlueprint({
            id: 'project_ai_connected',
            name: 'Connected Shop',
        }, plan, {
            now,
            createdBy: 'user_ai_connected',
        });
        const blueprint = project.businessBlueprint as BusinessBlueprint;

        expect(blueprint.websiteBlueprint.enabled).toBe(true);
        expect(blueprint.storefrontBlueprint.enabled).toBe(true);
        expect(blueprint.ecommerceBlueprint.enabled).toBe(true);
        expect(blueprint.chatbotBlueprint.enabled).toBe(true);
        expect(blueprint.leadBlueprint.enabled).toBe(true);
        expect(blueprint.emailMarketingBlueprint.enabled).toBe(true);
        expect(blueprint.analyticsBlueprint.enabled).toBe(true);
    });
});
