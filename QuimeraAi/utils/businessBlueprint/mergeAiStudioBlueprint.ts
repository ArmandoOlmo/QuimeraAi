import type {
    BusinessBlueprint,
    BlueprintModuleState,
    ChatbotBlueprint,
    EcommerceBlueprint,
    EmailMarketingBlueprint,
    LeadBlueprint,
    BlueprintSource,
    StorefrontBlueprint,
    WebsiteBlueprint,
    WebsiteEcommerceBlockBlueprint,
} from '../../types/businessBlueprint';
import {
    BUSINESS_BLUEPRINT_SCHEMA_VERSION,
    BUSINESS_BLUEPRINT_VERSION,
} from '../../types/businessBlueprint';
import type {
    WebsiteEcommerceBlockSource,
} from '../../types/websiteEcommerceBlocks';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    getStorefrontCatalogSize,
} from '../storefrontTheme';
import type {
    AiStudioCrossModuleBlueprints,
    AiStudioEcommerceBlueprint,
    AiStudioStorefrontBlueprint,
    AiStudioWebsiteEcommerceBlockSuggestion,
} from '../aiStudio';
import { createBusinessBlueprintFromWebsitePlan, createBlueprintModuleState, shouldProtectFromRegeneration } from './adapters';

export interface MergeAiStudioBlueprintOptions {
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    createdBy?: string;
    source?: BlueprintSource;
    now?: string;
}

export interface MergeAiStudioBlueprintInput {
    existingBusinessBlueprint?: BusinessBlueprint | null;
    websitePlan: WebsitePlan;
    ecommerceBlueprint: AiStudioEcommerceBlueprint;
    storefrontBlueprint: AiStudioStorefrontBlueprint;
    websiteEcommerceBlocks: AiStudioWebsiteEcommerceBlockSuggestion[];
    chatbotBlueprint: AiStudioCrossModuleBlueprints['chatbotBlueprint'];
    leadBlueprint: AiStudioCrossModuleBlueprints['leadBlueprint'];
    emailMarketingBlueprint: AiStudioCrossModuleBlueprints['emailMarketingBlueprint'];
    options?: MergeAiStudioBlueprintOptions;
}

function protectedOrMerged<TModule extends Pick<BlueprintModuleState, 'metadata'>>(
    existing: TModule | undefined,
    next: TModule,
): TModule {
    return existing && shouldProtectFromRegeneration(existing) ? existing : next;
}

function mapBlockSource(block: AiStudioWebsiteEcommerceBlockSuggestion): WebsiteEcommerceBlockSource {
    switch (block.type) {
        case 'giftCardBlock':
            return 'gift_cards';
        case 'categoryShowcase':
            return 'category';
        case 'bestSellersStrip':
            return 'best_sellers';
        case 'productCarousel':
            return 'new_arrivals';
        case 'promoBanner':
            return 'promotion';
        default:
            return 'featured';
    }
}

function toWebsiteEcommerceBlockBlueprint(
    block: AiStudioWebsiteEcommerceBlockSuggestion,
    index: number,
    now: string,
): WebsiteEcommerceBlockBlueprint {
    const source = mapBlockSource(block);

    return {
        id: block.id || `ai-website-ecommerce-${index + 1}`,
        type: block.type,
        source,
        targetRoute: '/store',
        settings: {
            source: { type: source },
            layout: block.type === 'productCarousel' ? 'carousel' : block.type === 'promoBanner' ? 'banner' : block.type === 'shopCTA' ? 'cta' : 'grid',
            cta: { label: block.ctaLabel, routeType: 'storefront', route: '/store' },
            showPrice: true,
            showBadges: true,
            showRating: false,
        },
        ...createBlueprintModuleState(now, {
            enabled: block.enabled,
            status: 'draft',
            needsReview: true,
            sourceMap: block.sourceMap,
            readiness: {
                isReady: true,
                warnings: ['Website ecommerce block is a suggestion only and is not mounted in Website Editor visual runtime.'],
                blockers: [],
            },
            metadata: {
                ...block.metadata,
                lastSyncedAt: now,
            },
        }),
    };
}

function mergeWebsiteBlueprint(
    base: WebsiteBlueprint,
    existing: WebsiteBlueprint | undefined,
    blocks: AiStudioWebsiteEcommerceBlockSuggestion[],
    now: string,
): WebsiteBlueprint {
    const next: WebsiteBlueprint = {
        ...base,
        needsReview: true,
        ecommerceBlocks: blocks.map((block, index) => toWebsiteEcommerceBlockBlueprint(block, index, now)),
        sourceMap: {
            ...(base.sourceMap || {}),
            ecommerceBlocks: 'aiStudio.deriveWebsiteEcommerceBlocks',
        },
        metadata: {
            ...base.metadata,
            generatedByAI: true,
            updatedAt: now,
            lastSyncedAt: now,
            generationSource: 'ai-studio-c1',
        },
    };

    return protectedOrMerged(existing, next);
}

function mergeEcommerceBlueprint(
    base: EcommerceBlueprint,
    existing: EcommerceBlueprint | undefined,
    derived: AiStudioEcommerceBlueprint,
    now: string,
): EcommerceBlueprint {
    const next: EcommerceBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.enabled ? 'needs_review' : 'disabled',
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: {
            ...derived.metadata,
            lastSyncedAt: now,
        },
        storeType: derived.storeType,
        catalogStrategy: derived.catalogStrategy,
        categories: derived.productCategories,
        productCategories: derived.productCategories,
        collections: derived.productCategories.map(category => `${category} Draft Collection`),
        starterProducts: derived.starterProducts,
        inventoryMode: derived.inventoryMode,
        fulfillmentMode: derived.fulfillmentMode,
        paymentMode: derived.paymentMode,
        taxMode: derived.taxMode,
        shippingMode: derived.shippingMode,
        discounts: [],
        giftCards: {
            enabled: derived.giftCardsEnabled,
            status: derived.giftCardsEnabled ? 'draft' : 'needs_review',
        },
        giftCardsEnabled: derived.giftCardsEnabled,
        digitalProductsEnabled: derived.digitalProductsEnabled,
        recommendations: derived.recommendations,
    };

    return protectedOrMerged(existing, next);
}

function mergeStorefrontBlueprint(
    base: StorefrontBlueprint,
    existing: StorefrontBlueprint | undefined,
    derived: AiStudioStorefrontBlueprint,
    ecommerceBlueprint: AiStudioEcommerceBlueprint,
    now: string,
): StorefrontBlueprint {
    const next: StorefrontBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.enabled ? 'needs_review' : 'disabled',
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: {
            ...derived.metadata,
            lastSyncedAt: now,
        },
        routeStrategy: 'project-store',
        catalogSize: getStorefrontCatalogSize(ecommerceBlueprint.starterProducts.length),
        templatePreset: derived.templatePreset,
        themePreset: derived.themePreset,
        themeFallbackChain: [
            'DEFAULT_STOREFRONT_THEME',
            `preset:${derived.themePreset}`,
            'brandColors',
            'projectGlobalColors',
            'storefrontTheme',
        ],
        productCardVariant: derived.productCardVariant,
        collectionStrategy: derived.collectionStrategy,
        cartStyle: derived.cartStyle,
        checkoutStyle: derived.checkoutStyle,
        colorSystem: derived.colorSystem,
        templates: {
            home: 'ai-store-home-draft',
            collection: 'ai-collection-draft',
            product: 'ai-product-draft',
            cart: 'draft-cart-drawer',
            checkoutVisual: 'payments-disabled-checkout-draft',
        },
        sections: derived.sections.map(section => ({
            id: section.id,
            type: section.type,
            order: section.order,
            dataSource: section.dataSource,
            settings: section.settings,
            ...createBlueprintModuleState(now, {
                enabled: section.enabled,
                status: section.status,
                needsReview: true,
                readiness: section.readiness,
                sourceMap: section.sourceMap,
                metadata: {
                    ...section.metadata,
                    lastSyncedAt: now,
                },
            }),
        })),
    };

    return protectedOrMerged(existing, next);
}

function mergeChatbotBlueprint(
    base: ChatbotBlueprint,
    existing: ChatbotBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['chatbotBlueprint'],
    now: string,
): ChatbotBlueprint {
    const next: ChatbotBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        businessKnowledge: derived.businessKnowledge,
        productKnowledge: derived.productKnowledge,
        policyKnowledge: [...derived.policyKnowledge, ...derived.contextDrafts],
        eventIntents: derived.eventIntents,
    };

    return protectedOrMerged(existing, next);
}

function mergeLeadBlueprint(
    base: LeadBlueprint,
    existing: LeadBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['leadBlueprint'],
    now: string,
): LeadBlueprint {
    const next: LeadBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        leadSources: derived.leadSources,
        leadTags: derived.leadTags,
        activityTimelineEvents: derived.activityTimelineEvents,
    };

    return protectedOrMerged(existing, next);
}

function mergeEmailMarketingBlueprint(
    base: EmailMarketingBlueprint,
    existing: EmailMarketingBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['emailMarketingBlueprint'],
    now: string,
): EmailMarketingBlueprint {
    const next: EmailMarketingBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        flows: derived.flows,
        logEvents: derived.logEvents,
    };

    return protectedOrMerged(existing, next);
}

export function mergeAiStudioBlueprint(input: MergeAiStudioBlueprintInput): BusinessBlueprint {
    const now = input.options?.now || input.ecommerceBlueprint.metadata.generatedAt || new Date().toISOString();
    const base = createBusinessBlueprintFromWebsitePlan(input.websitePlan, {
        ...input.options,
        now,
        source: input.options?.source || 'ai-studio',
    });
    const existing = input.existingBusinessBlueprint || undefined;
    const ecommerceBlueprint = mergeEcommerceBlueprint(base.ecommerceBlueprint, existing?.ecommerceBlueprint, input.ecommerceBlueprint, now);
    const storefrontBlueprint = mergeStorefrontBlueprint(base.storefrontBlueprint, existing?.storefrontBlueprint, input.storefrontBlueprint, input.ecommerceBlueprint, now);
    const websiteBlueprint = mergeWebsiteBlueprint(base.websiteBlueprint, existing?.websiteBlueprint, input.websiteEcommerceBlocks, now);

    return {
        ...base,
        blueprintVersion: existing?.blueprintVersion || BUSINESS_BLUEPRINT_VERSION,
        schemaVersion: existing?.schemaVersion || BUSINESS_BLUEPRINT_SCHEMA_VERSION,
        generatedAt: existing?.generatedAt || now,
        updatedAt: now,
        lastSyncedAt: now,
        sourceMap: {
            ...(existing?.sourceMap || {}),
            ...base.sourceMap,
            ecommerceBlueprint: 'aiStudio.deriveEcommerceBlueprintFromBusinessBrief',
            storefrontBlueprint: 'aiStudio.deriveStorefrontBlueprintFromBusinessBrief',
            websiteEcommerceBlocks: 'aiStudio.deriveWebsiteEcommerceBlocks',
            crossModuleBlueprints: 'aiStudio.deriveCrossModuleBlueprints',
        },
        metadata: {
            ...base.metadata,
            generatedByAI: true,
            updatedAt: now,
            lastSyncedAt: now,
            generationSource: 'ai-studio-c1',
        },
        readiness: input.ecommerceBlueprint.enabled
            ? {
                isReady: false,
                warnings: [
                    'AI Studio generated ecommerce and storefront draft infrastructure.',
                    'All commerce modules need merchant review before publishing.',
                ],
                blockers: [
                    'Payments are not configured.',
                    'Starter products are not reviewed or published.',
                    'Storefront is not published automatically.',
                ],
            }
            : base.readiness,
        businessProfile: protectedOrMerged(existing?.businessProfile, base.businessProfile),
        brandProfile: protectedOrMerged(existing?.brandProfile, base.brandProfile),
        websiteBlueprint,
        ecommerceBlueprint,
        storefrontBlueprint,
        chatbotBlueprint: mergeChatbotBlueprint(base.chatbotBlueprint, existing?.chatbotBlueprint, input.chatbotBlueprint, now),
        leadBlueprint: mergeLeadBlueprint(base.leadBlueprint, existing?.leadBlueprint, input.leadBlueprint, now),
        emailMarketingBlueprint: mergeEmailMarketingBlueprint(base.emailMarketingBlueprint, existing?.emailMarketingBlueprint, input.emailMarketingBlueprint, now),
        mediaBlueprint: protectedOrMerged(existing?.mediaBlueprint, base.mediaBlueprint),
        appointmentsBlueprint: protectedOrMerged(existing?.appointmentsBlueprint, base.appointmentsBlueprint),
        restaurantBlueprint: protectedOrMerged(existing?.restaurantBlueprint, base.restaurantBlueprint),
        realEstateBlueprint: protectedOrMerged(existing?.realEstateBlueprint, base.realEstateBlueprint),
        financeBlueprint: protectedOrMerged(existing?.financeBlueprint, base.financeBlueprint),
        analyticsBlueprint: protectedOrMerged(existing?.analyticsBlueprint, base.analyticsBlueprint),
        automationBlueprint: protectedOrMerged(existing?.automationBlueprint, base.automationBlueprint),
    };
}
