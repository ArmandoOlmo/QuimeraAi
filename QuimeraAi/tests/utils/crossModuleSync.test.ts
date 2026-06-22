import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint, CrossModuleSyncDraft } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    deriveCrossModuleBlueprints,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    type AiStudioBusinessBriefInput,
} from '../../utils/aiStudio';
import { mergeAiStudioBlueprint } from '../../utils/businessBlueprint';
import {
    applyCrossModuleSync,
    previewCrossModuleSync,
} from '../../utils/businessBlueprint/crossModuleSync';

function makePlan(input: AiStudioBusinessBriefInput, hasEcommerce = true): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: input.businessName || 'AI Studio Business',
            industry: input.industry || 'general',
            description: input.businessDescription || input.description || '',
            tagline: '',
            services: input.services?.map(service => ({
                name: service.name || '',
                description: service.description || '',
            })) || [],
            contactInfo: {},
            hasEcommerce,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#111827',
            },
            fonts: ['inter', 'inter'],
            visualStyle: input.brandStyle,
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Generated home page' }],
            products: [],
        },
        componentPlan: [
            { component: 'hero', reason: 'Primary landing section', confidence: 0.9, source: 'ai' },
            { component: 'services', reason: 'Business offer summary', confidence: 0.8, source: 'ai' },
            { component: 'footer', reason: 'Site footer', confidence: 0.8, source: 'ai' },
        ],
        assetPlan: [],
        qualityGoals: ['draft-only commerce infrastructure'],
    };
}

function deriveBusinessBlueprint(input: AiStudioBusinessBriefInput): BusinessBlueprint {
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(input);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, input.existingWebsitePlan?.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);

    const blueprint = mergeAiStudioBlueprint({
        websitePlan: input.existingWebsitePlan || makePlan(input, ecommerceBlueprint.enabled),
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        chatbotBlueprint: crossModule.chatbotBlueprint,
        leadBlueprint: crossModule.leadBlueprint,
        emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
        options: {
            now: input.now,
            projectId: 'project_c3_test',
            tenantId: 'tenant_c3_test',
            createdBy: 'user_c3_test',
        },
    });

    return {
        ...blueprint,
        ecommerceBlueprint: {
            ...blueprint.ecommerceBlueprint,
            starterContentStatus: 'created_draft',
            createdContentRefs: {
                categoryIds: ['category_bikes'],
                productIds: ['product_bikes_draft'],
                giftCardIds: [],
            },
        },
    };
}

function runApply(businessBlueprint: BusinessBlueprint) {
    return applyCrossModuleSync({
        projectId: 'project_c3_test',
        storeId: 'project_c3_test',
        userId: 'user_c3_test',
        businessBlueprint,
        ecommerceBlueprint: businessBlueprint.ecommerceBlueprint,
        storefrontBlueprint: businessBlueprint.storefrontBlueprint,
        createdContentRefs: businessBlueprint.ecommerceBlueprint.createdContentRefs,
        now: '2026-06-21T12:00:00.000Z',
        options: {
            dryRun: false,
            overwriteExisting: false,
        },
    });
}

function allDrafts(blueprint: BusinessBlueprint): CrossModuleSyncDraft[] {
    const sync = blueprint.crossModuleSync;
    return [
        ...(sync?.chatbot?.drafts || []),
        ...(sync?.leads?.drafts || []),
        ...(sync?.emailMarketing?.drafts || []),
        ...(sync?.analytics?.drafts || []),
    ];
}

function expectDraftOnlyGuardrails(drafts: CrossModuleSyncDraft[]) {
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every(draft => draft.status === 'draft')).toBe(true);
    expect(drafts.every(draft => draft.enabled === false)).toBe(true);
    expect(drafts.every(draft => draft.active === false)).toBe(true);
    expect(drafts.every(draft => draft.needsReview === true)).toBe(true);
    expect(drafts.every(draft => draft.generatedByAI === true)).toBe(true);
    expect(drafts.every(draft => draft.safeToEdit === true)).toBe(true);
    expect(drafts.every(draft => draft.metadata?.safeWriter === 'businessBlueprint.crossModuleSync')).toBe(true);
}

describe('cross-module ecommerce draft sync', () => {
    it('generates bicycle shop chatbot, lead, email, and analytics drafts as inactive drafts', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Premium PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            productsServicesText: 'Bikes, accessories, repairs, cycling gear, and gift cards.',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = runApply(businessBlueprint);

        expect(result.errors).toEqual([]);
        expect(result.chatbotDrafts.some(draft => /product/i.test(draft.name))).toBe(true);
        expect(result.leadDrafts.map(draft => draft.name)).toEqual(expect.arrayContaining(['ecommerce', 'product-interest']));
        expect(result.emailDrafts.map(draft => draft.metadata?.flowType)).toEqual(expect.arrayContaining(['welcome', 'abandoned_cart', 'post_purchase']));
        expect(result.analyticsDrafts.map(draft => draft.metadata?.eventName)).toEqual(expect.arrayContaining(['product_view', 'add_to_cart', 'checkout_started']));
        expect(result.businessBlueprint.crossModuleSync?.status).toBe('synced_draft');
        expectDraftOnlyGuardrails(allDrafts(result.businessBlueprint));
    });

    it('adds restaurant gift card and catering drafts without live automations', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Mesa Moderna',
            industry: 'Modern restaurant in Puerto Rico',
            businessDescription: 'Restaurant with reservations, menu, catering, events, and gift cards.',
            productsServicesText: 'reservations, menu, gift cards, catering packages, event tickets',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = runApply(businessBlueprint);

        expect(result.chatbotDrafts.some(draft => /catering|reservations/i.test(`${draft.name} ${draft.content}`))).toBe(true);
        expect(result.leadDrafts.map(draft => draft.name)).toEqual(expect.arrayContaining(['gift-card', 'restaurant-catering']));
        expect(result.emailDrafts.map(draft => draft.metadata?.flowType)).toEqual(expect.arrayContaining(['gift_card_confirmation', 'catering_inquiry_follow_up']));
        expect(result.emailDrafts.every(draft => draft.metadata?.automationActive === false)).toBe(true);
        expect(result.emailDrafts.every(draft => draft.metadata?.emailSent === false)).toBe(true);
    });

    it('adds realtor consultation and guide drafts without false gift card drafts', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Isla Realtor',
            industry: 'Real estate realtor in Puerto Rico',
            businessDescription: 'Realtor focused on buyer leads, seller leads, digital guides, and consultations.',
            productsServicesText: 'buyer guide, seller guide, consultation packages, property resources',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = runApply(businessBlueprint);

        expect(result.chatbotDrafts.some(draft => /real estate|consultation|guide/i.test(`${draft.name} ${draft.content}`))).toBe(true);
        expect(result.leadDrafts.map(draft => draft.name)).toContain('real-estate-consultation');
        expect(result.emailDrafts.map(draft => draft.metadata?.flowType)).toContain('consultation_guide_follow_up');
        expect(result.leadDrafts.map(draft => draft.name)).not.toContain('gift-card');
        expect(result.emailDrafts.map(draft => draft.metadata?.flowType)).not.toContain('gift_card_confirmation');
    });

    it('previews without mutating the input business blueprint', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Preview PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles and cycling services.',
            productsServicesText: 'Bikes, accessories, repairs',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = previewCrossModuleSync({
            projectId: 'project_c3_test',
            storeId: 'project_c3_test',
            userId: 'user_c3_test',
            businessBlueprint,
            ecommerceBlueprint: businessBlueprint.ecommerceBlueprint,
            storefrontBlueprint: businessBlueprint.storefrontBlueprint,
            now: '2026-06-21T12:00:00.000Z',
            options: {
                dryRun: true,
                overwriteExisting: false,
            },
        });

        expect(result.summary.dryRun).toBe(true);
        expect(result.summary.created).toBe(0);
        expect(result.summary.planned).toBeGreaterThan(0);
        expect(result.businessBlueprint).toBe(businessBlueprint);
        expect(businessBlueprint.crossModuleSync).toBeUndefined();
    });

    it('applies synced_draft status and refs inside BusinessBlueprint only', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Apply PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles and cycling services.',
            productsServicesText: 'Bikes, accessories, repairs',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = runApply(businessBlueprint);
        const sync = result.businessBlueprint.crossModuleSync;

        expect(sync?.status).toBe('synced_draft');
        expect(sync?.syncedAt).toBe('2026-06-21T12:00:00.000Z');
        expect(sync?.chatbot?.refs.length).toBeGreaterThan(0);
        expect(sync?.leads?.refs.length).toBeGreaterThan(0);
        expect(sync?.emailMarketing?.refs.length).toBeGreaterThan(0);
        expect(sync?.analytics?.refs.length).toBeGreaterThan(0);
        expect(sync?.readiness).toEqual({
            chatbotReady: true,
            leadTagsReady: true,
            emailFlowsReady: true,
            analyticsReady: true,
            needsMerchantReview: true,
        });
    });

    it('skips duplicates on a second apply and protects user modified drafts', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Idempotent PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles and cycling services.',
            productsServicesText: 'Bikes, accessories, repairs',
            now: '2026-06-21T12:00:00.000Z',
        });
        const first = runApply(businessBlueprint);
        const firstDraftCount = allDrafts(first.businessBlueprint).length;
        const second = runApply(first.businessBlueprint);
        const protectedLeadDraft = first.businessBlueprint.crossModuleSync?.leads?.drafts.find(draft => draft.name === 'ecommerce');
        const protectedBlueprint: BusinessBlueprint = {
            ...first.businessBlueprint,
            crossModuleSync: {
                ...first.businessBlueprint.crossModuleSync!,
                leads: {
                    ...first.businessBlueprint.crossModuleSync!.leads!,
                    drafts: first.businessBlueprint.crossModuleSync!.leads!.drafts.map(draft => (
                        draft.id === protectedLeadDraft?.id
                            ? { ...draft, userModified: true, metadata: { ...draft.metadata, userModified: true, customLabel: 'keep merchant copy' } }
                            : draft
                    )),
                },
            },
        };
        const protectedResult = runApply(protectedBlueprint);
        const afterProtectedDraft = protectedResult.businessBlueprint.crossModuleSync?.leads?.drafts.find(draft => draft.id === protectedLeadDraft?.id);

        expect(second.summary.created).toBe(0);
        expect(second.summary.skipped).toBeGreaterThan(0);
        expect(allDrafts(second.businessBlueprint)).toHaveLength(firstDraftCount);
        expect(protectedResult.skippedItems).toEqual(expect.arrayContaining([
            expect.objectContaining({ module: 'leads', name: 'ecommerce', reason: 'user_modified' }),
        ]));
        expect(afterProtectedDraft?.metadata?.customLabel).toBe('keep merchant copy');
    });

    it('keeps guardrails: no email sends, live automations, real leads, or runtime analytics events', () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Guardrail Store PR',
            industry: 'Online store',
            businessDescription: 'Store with ecommerce catalog and lead capture.',
            productsServicesText: 'products, checkout, newsletter, product questions',
            now: '2026-06-21T12:00:00.000Z',
        });

        const result = runApply(businessBlueprint);
        const drafts = allDrafts(result.businessBlueprint);
        const emailDrafts = result.businessBlueprint.crossModuleSync?.emailMarketing?.drafts || [];
        const leadDrafts = result.businessBlueprint.crossModuleSync?.leads?.drafts || [];
        const analyticsDrafts = result.businessBlueprint.crossModuleSync?.analytics?.drafts || [];

        expectDraftOnlyGuardrails(drafts);
        expect(emailDrafts.every(draft => draft.metadata?.automationActive === false)).toBe(true);
        expect(emailDrafts.every(draft => draft.metadata?.scheduled === false)).toBe(true);
        expect(emailDrafts.every(draft => draft.metadata?.emailSent === false)).toBe(true);
        expect(leadDrafts.every(draft => draft.itemType !== 'lead_record')).toBe(true);
        expect(analyticsDrafts.every(draft => draft.metadata?.runtimeInstrumented === false)).toBe(true);
        expect(analyticsDrafts.every(draft => draft.metadata?.eventEmitted === false)).toBe(true);
        expect(result.summary.noRuntimeActivated).toBe(true);
    });
});
