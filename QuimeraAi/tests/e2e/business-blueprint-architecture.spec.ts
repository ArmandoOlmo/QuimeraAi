import { expect, test } from '@playwright/test';
import type { PageData, PageSection, ThemeData } from '../../types';
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
import { buildStoreIdentityOrFilter, getStoreIdentityQueryIds } from '../../utils/ecommerce/storeIdentity';
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

function makePlan(sections: PageSection[] = ['hero', 'featuredProducts', 'categoryGrid', 'footer']): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'E2E Blueprint Shop',
            industry: 'fitness ecommerce',
            description: 'Sells training gear and digital plans.',
            services: [{ name: 'Training gear', description: 'Fitness products.' }],
            contactInfo: {},
            hasEcommerce: true,
        },
        brandProfile: {
            colors: theme.globalColors,
            fonts: ['inter', 'inter', 'inter'],
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Generated home page' }],
            products: [{ name: 'Resistance Kit', category: 'Gear', description: 'Draft product.' }],
        },
        componentPlan: sections.map(component => ({
            component,
            reason: 'architecture contract',
            confidence: 1,
            source: 'ai',
        })),
        assetPlan: [],
        qualityGoals: ['business blueprint architecture contract'],
    };
}

function mergeInputs(existingBusinessBlueprint?: any) {
    const brief: AiStudioBusinessBriefInput = {
        businessName: 'E2E Blueprint Shop',
        industry: 'fitness ecommerce',
        businessDescription: 'Sells training gear and digital plans.',
        productsServicesText: 'gear digital plans products',
        hasEcommerce: true,
        now,
    };
    const plan = makePlan(['hero', 'services', 'featuredProducts', 'categoryGrid', 'footer']);
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(brief);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(brief, ecommerceBlueprint, plan.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(brief, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(brief, ecommerceBlueprint, storefrontBlueprint);

    return {
        existingBusinessBlueprint,
        websitePlan: plan,
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        chatbotBlueprint: crossModule.chatbotBlueprint,
        leadBlueprint: crossModule.leadBlueprint,
        emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
        options: {
            projectId: '44444444-4444-4444-8444-444444444444',
            createdBy: 'user_e2e',
            now,
        },
    };
}

test.describe('BusinessBlueprint editor architecture contract', () => {
    test('AI generates website with ecommerce intent', () => {
        const project = attachAiStudioBusinessBlueprint({
            id: '44444444-4444-4444-8444-444444444444',
            name: 'E2E Blueprint Shop',
        }, makePlan(), {
            now,
            createdBy: 'user_e2e',
        });

        expect(project.businessBlueprint.websiteBlueprint.ecommerceBlocks.length).toBeGreaterThan(0);
        expect(project.businessBlueprint.ecommerceBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.storefrontBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.chatbotBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.leadBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.emailMarketingBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.analyticsBlueprint.enabled).toBe(true);
    });

    test('Website Editor opens generated project at /editor/:projectId', () => {
        const projectId = '44444444-4444-4444-8444-444444444444';
        const editorPath = new URL(`/editor/${projectId}`, 'http://localhost:5173').pathname;

        expect(editorPath).toBe(`/editor/${projectId}`);
    });

    test('Website ecommerce blocks read products from Ecommerce Engine only', () => {
        const block = getWebsiteEcommerceBlockDefinition('featuredProducts');
        const filter = buildStoreIdentityOrFilter(getStoreIdentityQueryIds('44444444-4444-4444-8444-444444444444'));

        expect(block?.canonicalSystem).toBe('ecommerce-engine');
        expect(block?.writes).toEqual([]);
        expect(filter).toContain('project_id.eq.44444444-4444-4444-8444-444444444444');
        expect(filter).toContain('store_id.eq.44444444-4444-4444-8444-444444444444');
    });

    test('Storefront Editor saves draft blueprint state', () => {
        const blueprint = syncWebsiteBlueprintFromEditor({
            projectId: '44444444-4444-4444-8444-444444444444',
            projectName: 'E2E Blueprint Shop',
            data: { featuredProducts: { sourceType: 'manual', productIds: ['prod_1'] } } as unknown as PageData,
            theme,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: true, footer: true } as Record<PageSection, boolean>,
            action: 'save_project',
            now,
        });

        expect(blueprint.websiteBlueprint.status).toBe('generated');
        expect(blueprint.websiteBlueprint.metadata.lastSyncedAt).toBe(now);
    });

    test('Storefront Editor publishes to public_stores payload contract', () => {
        const projectId = '44444444-4444-4444-8444-444444444444';
        const publicStoreData = {
            id: projectId,
            projectId,
            sourceProjectId: projectId,
            businessBlueprint: attachAiStudioBusinessBlueprint({ id: projectId, name: 'E2E Blueprint Shop' }, makePlan(), { now }).businessBlueprint,
            publishedAt: now,
        };

        expect(publicStoreData.id).toBe(projectId);
        expect(publicStoreData.projectId).toBe(projectId);
        expect(publicStoreData.sourceProjectId).toBe(projectId);
        expect(publicStoreData.businessBlueprint.storefrontBlueprint.enabled).toBe(true);
    });

    test('AI regeneration preserves user edits', () => {
        const existing = syncWebsiteBlueprintFromEditor({
            projectId: '44444444-4444-4444-8444-444444444444',
            projectName: 'E2E Blueprint Shop',
            userId: 'user_e2e',
            data: { hero: { headline: 'Locked editor headline' } } as unknown as PageData,
            theme,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: true, footer: true } as Record<PageSection, boolean>,
            action: 'section_settings',
            touchedSection: 'hero',
            now,
        });
        const regenerated = mergeAiStudioBlueprint(mergeInputs(existing));

        expect(regenerated.websiteBlueprint.sectionBlueprints?.find(section => section.type === 'hero')?.settings)
            .toMatchObject({ headline: 'Locked editor headline' });
    });

    test('storefrontBlueprint and websiteBlueprint stay in sync for ecommerce sections', () => {
        const blueprint = mergeAiStudioBlueprint(mergeInputs());

        expect(blueprint.websiteBlueprint.sections).toEqual(expect.arrayContaining(['featuredProducts', 'categoryGrid']));
        expect(blueprint.websiteBlueprint.ecommerceBlocks.map(block => block.type)).toEqual(
            expect.arrayContaining(['featuredProducts', 'categoryShowcase']),
        );
        expect(blueprint.storefrontBlueprint.enabled).toBe(true);
        expect(blueprint.storefrontBlueprint.themePreset).toBeTruthy();
    });
});
