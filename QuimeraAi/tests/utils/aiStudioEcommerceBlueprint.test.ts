import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    deriveCrossModuleBlueprints,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    type AiStudioBusinessBriefInput,
} from '../../utils/aiStudio';
import { mergeAiStudioBlueprint } from '../../utils/businessBlueprint';

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

function deriveAll(input: AiStudioBusinessBriefInput) {
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(input);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, input.existingWebsitePlan?.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);

    return {
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        crossModule,
        businessBlueprint: mergeAiStudioBlueprint({
            websitePlan: input.existingWebsitePlan || makePlan(input, ecommerceBlueprint.enabled),
            ecommerceBlueprint,
            storefrontBlueprint,
            websiteEcommerceBlocks,
            chatbotBlueprint: crossModule.chatbotBlueprint,
            leadBlueprint: crossModule.leadBlueprint,
            emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
            options: {
                now: input.now,
                projectId: 'project_ai_studio_test',
                tenantId: 'tenant_ai_studio_test',
                createdBy: 'user_ai_studio_test',
            },
        }),
    };
}

function expectDraftGuardrails(blueprint: BusinessBlueprint) {
    expect(blueprint.ecommerceBlueprint.needsReview).toBe(true);
    expect(blueprint.storefrontBlueprint.needsReview).toBe(true);
    expect(blueprint.ecommerceBlueprint.inventoryMode).toBe('not_configured');
    expect(blueprint.ecommerceBlueprint.paymentMode).toBe('not_configured');
    expect(blueprint.ecommerceBlueprint.shippingMode).toBe('not_configured');
    expect(blueprint.ecommerceBlueprint.taxMode).toBe('not_configured');
    expect(blueprint.ecommerceBlueprint.discounts).toEqual([]);
    expect(blueprint.ecommerceBlueprint.starterProducts.every(product => (
        product.status === 'draft' &&
        product.needsReview === true &&
        product.isPublished === false &&
        product.publishStatus === 'not_published' &&
        product.stockSource === 'unset' &&
        product.suggestedStock === undefined &&
        product.discountStatus === 'none'
    ))).toBe(true);
    expect(blueprint.storefrontBlueprint.status).not.toBe('published');
}

describe('AI Studio ecommerce blueprint derivation', () => {
    it('derives bicycle shop ecommerce, storefront, and cross-module drafts', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Bici Premium PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            productsServicesText: 'Bikes, accessories, repairs, cycling gear, and gift cards.',
            audience: 'Cyclists in Puerto Rico',
            goals: ['sell products', 'capture repair leads'],
            hasEcommerce: true,
            existingWebsitePlan: makePlan({
                businessName: 'Bici Premium PR',
                industry: 'Premium bicycle shop in Puerto Rico',
                businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            }),
            now: '2026-06-21T12:00:00.000Z',
        };

        const { ecommerceBlueprint, storefrontBlueprint, websiteEcommerceBlocks, crossModule, businessBlueprint } = deriveAll(input);

        expect(ecommerceBlueprint.enabled).toBe(true);
        expect(ecommerceBlueprint.productCategories).toEqual(expect.arrayContaining(['Bikes', 'Accessories', 'Repairs', 'Gift Cards']));
        expect(storefrontBlueprint.enabled).toBe(true);
        expect(['fitness', 'marketplace']).toContain(storefrontBlueprint.themePreset);
        expect(['quickBuy', 'imageFirst', 'marketplace']).toContain(storefrontBlueprint.productCardVariant);
        expect(websiteEcommerceBlocks.map(block => block.type)).toEqual(expect.arrayContaining(['featuredProducts', 'categoryShowcase']));
        expect(websiteEcommerceBlocks.map(block => block.type)).not.toContain('shopCTA');
        expect(crossModule.chatbotBlueprint.productKnowledge.length).toBeGreaterThan(0);
        expect(crossModule.chatbotBlueprint.productKnowledge[0]).toContain('ES:');
        expect(crossModule.chatbotBlueprint.productKnowledge[0]).toContain('EN:');
        expect(businessBlueprint.chatbotBlueprint.engineVersion).toBe('v2');
        expect(businessBlueprint.chatbotBlueprint.agentProfile.supportedLanguages).toEqual(['es', 'en']);
        expect(businessBlueprint.chatbotBlueprint.agentProfile.welcomeMessage).toContain('ES:');
        expect(businessBlueprint.chatbotBlueprint.agentProfile.welcomeMessage).toContain('EN:');
        expect(businessBlueprint.chatbotBlueprint.actions.every(action => action.enabled === false)).toBe(true);
        expect(crossModule.leadBlueprint.leadTags).toEqual(expect.arrayContaining(['ecommerce', 'product-interest', 'abandoned-cart', 'high-intent', 'gift-card']));
        expect(crossModule.emailMarketingBlueprint.flows.map(flow => flow.type)).toEqual(expect.arrayContaining([
            'welcome',
            'abandoned_cart',
            'order_confirmation',
            'post_purchase',
            'product_recommendation',
            'back_in_stock',
            'merchant_new_order_alert',
        ]));
        expectDraftGuardrails(businessBlueprint);
    });

    it('suggests restaurant gift cards, catering, and event drafts without fake inventory', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Mesa Moderna',
            industry: 'Modern restaurant in Puerto Rico',
            businessDescription: 'Restaurant with reservations, menu, catering, events, and gift cards.',
            productsServicesText: 'reservations, menu, gift cards, catering packages, event tickets',
            now: '2026-06-21T12:00:00.000Z',
        };

        const { ecommerceBlueprint, storefrontBlueprint, crossModule, businessBlueprint } = deriveAll(input);

        expect(ecommerceBlueprint.enabled).toBe(true);
        expect(ecommerceBlueprint.giftCardsEnabled).toBe(true);
        expect(ecommerceBlueprint.productCategories).toEqual(expect.arrayContaining(['Gift Cards', 'Catering Packages', 'Event Tickets']));
        expect(ecommerceBlueprint.starterProducts.every(product => product.suggestedStock === undefined)).toBe(true);
        expect(storefrontBlueprint.themePreset).toBe('food');
        expect(crossModule.chatbotBlueprint.contextDrafts.some(item => /Restaurant context/i.test(item))).toBe(true);
        expectDraftGuardrails(businessBlueprint);
    });

    it('keeps real estate ecommerce optional and service-resource oriented', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Isla Realtor',
            industry: 'Real estate realtor in Puerto Rico',
            businessDescription: 'Realtor focused on buyer leads, seller leads, digital guides, and consultations.',
            productsServicesText: 'buyer guide, seller guide, consultation packages, property resources',
            goals: 'capture qualified buyer and seller leads',
            now: '2026-06-21T12:00:00.000Z',
        };

        const { ecommerceBlueprint, storefrontBlueprint, crossModule, businessBlueprint } = deriveAll(input);

        expect(ecommerceBlueprint.enabled).toBe(true);
        expect(ecommerceBlueprint.catalogStrategy).toBe('optional_services_and_digital_resources');
        expect(ecommerceBlueprint.productCategories).toEqual(expect.arrayContaining(['Digital Guides', 'Consultation Packages', 'Buyer Resources', 'Seller Resources']));
        expect(ecommerceBlueprint.digitalProductsEnabled).toBe(true);
        expect(ecommerceBlueprint.giftCardsEnabled).toBe(false);
        expect(storefrontBlueprint.themePreset).toBe('realEstate');
        expect(crossModule.chatbotBlueprint.contextDrafts.some(item => /Real estate context/i.test(item))).toBe(true);
        expect(crossModule.leadBlueprint.leadTags).not.toContain('gift-card');
        expectDraftGuardrails(businessBlueprint);
    });

    it('suggests paid consultations, packages, deposits, and appointment context for service businesses', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Consultas Caribe',
            industry: 'Service business',
            businessDescription: 'Consulting business with paid consultations, packages, deposits, appointments, and add-ons.',
            productsServicesText: 'paid consultation packages deposits appointments add-ons',
            services: [{ name: 'Strategy Consultation', description: 'Paid appointment with deposit.' }],
            now: '2026-06-21T12:00:00.000Z',
        };

        const { ecommerceBlueprint, crossModule, businessBlueprint } = deriveAll(input);

        expect(ecommerceBlueprint.enabled).toBe(true);
        expect(ecommerceBlueprint.productCategories).toEqual(expect.arrayContaining(['Paid Consultations', 'Service Packages', 'Deposits', 'Add-ons']));
        expect(crossModule.chatbotBlueprint.contextDrafts.some(item => /Appointments context/i.test(item))).toBe(true);
        expect(crossModule.leadBlueprint.leadTags).toContain('paid-service-interest');
        expectDraftGuardrails(businessBlueprint);
    });

    it('keeps non-commerce businesses disabled and publishes no starter products', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Civic Arts Puerto Rico',
            industry: 'Community arts nonprofit',
            businessDescription: 'Publishes programs, stories, volunteer information, and community resources.',
            productsServicesText: 'programs stories volunteer resources',
            now: '2026-06-21T12:00:00.000Z',
        };

        const { ecommerceBlueprint, storefrontBlueprint, websiteEcommerceBlocks, businessBlueprint } = deriveAll(input);

        expect(ecommerceBlueprint.enabled).toBe(false);
        expect(ecommerceBlueprint.starterProducts).toEqual([]);
        expect(storefrontBlueprint.enabled).toBe(false);
        expect(websiteEcommerceBlocks).toEqual([]);
        expect(businessBlueprint.ecommerceBlueprint.enabled).toBe(false);
        expect(businessBlueprint.ecommerceBlueprint.starterProducts).toEqual([]);
        expect(businessBlueprint.ecommerceBlueprint.status).toBe('disabled');
    });

    it('preserves locked business blueprint modules during merge', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Locked Shop',
            industry: 'ecommerce store',
            businessDescription: 'Sells products online.',
            productsServicesText: 'products accessories gift cards',
            hasEcommerce: true,
            now: '2026-06-21T12:00:00.000Z',
        };
        const initial = deriveAll(input).businessBlueprint;
        const existing: BusinessBlueprint = {
            ...initial,
            ecommerceBlueprint: {
                ...initial.ecommerceBlueprint,
                categories: ['Locked Category'],
                productCategories: ['Locked Category'],
                metadata: {
                    ...initial.ecommerceBlueprint.metadata,
                    lockedFromRegeneration: true,
                },
            },
        };

        const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief({
            ...input,
            productsServicesText: 'new products new accessories',
        });
        const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint);
        const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
        const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);
        const merged = mergeAiStudioBlueprint({
            existingBusinessBlueprint: existing,
            websitePlan: makePlan(input, true),
            ecommerceBlueprint,
            storefrontBlueprint,
            websiteEcommerceBlocks,
            chatbotBlueprint: crossModule.chatbotBlueprint,
            leadBlueprint: crossModule.leadBlueprint,
            emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
            options: { now: '2026-06-21T12:30:00.000Z' },
        });

        expect(merged.ecommerceBlueprint.productCategories).toEqual(['Locked Category']);
        expect(merged.ecommerceBlueprint.metadata.lockedFromRegeneration).toBe(true);
        expect(merged.sourceMap.ecommerceBlueprint).toBe('aiStudio.deriveEcommerceBlueprintFromBusinessBrief');
        expect(merged.metadata.generatedByAI).toBe(true);
        expect(merged.updatedAt).toBe('2026-06-21T12:30:00.000Z');
    });
});
