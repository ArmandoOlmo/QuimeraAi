import type {
    AiStudioBusinessBriefInput,
    AiStudioEcommerceBlueprint,
    AiStudioStorefrontBlueprint,
    AiStudioWebsiteEcommerceBlockSuggestion,
} from './types';
import {
    createAiStudioMetadata,
    getBriefText,
} from './types';

function blockTitle(type: AiStudioWebsiteEcommerceBlockSuggestion['type'], businessName?: string): string {
    switch (type) {
        case 'featuredProducts':
            return businessName ? `Featured picks from ${businessName}` : 'Featured products';
        case 'productCarousel':
            return 'New and recommended';
        case 'categoryShowcase':
            return 'Shop by category';
        case 'giftCardBlock':
            return 'Gift cards';
        case 'shopCTA':
            return 'Visit the store';
        case 'promoBanner':
            return 'Promotion draft';
        case 'bestSellersStrip':
            return 'Best sellers draft';
        default:
            return 'Commerce block draft';
    }
}

function blockDescription(type: AiStudioWebsiteEcommerceBlockSuggestion['type']): string {
    switch (type) {
        case 'featuredProducts':
            return 'Draft website section that can feature reviewed ecommerce starter products.';
        case 'productCarousel':
            return 'Draft carousel suggestion for product discovery after catalog review.';
        case 'categoryShowcase':
            return 'Draft category routing block sourced from ecommerce blueprint categories.';
        case 'giftCardBlock':
            return 'Draft gift card block; requires merchant approval before publishing.';
        case 'shopCTA':
            return 'Draft call-to-action that routes website visitors to the storefront.';
        case 'promoBanner':
            return 'Draft promo banner placeholder; no active discount is created.';
        case 'bestSellersStrip':
            return 'Draft strip for future best-seller data; disabled until real sales exist.';
        default:
            return 'Draft ecommerce block suggestion.';
    }
}

function ctaLabel(type: AiStudioWebsiteEcommerceBlockSuggestion['type']): string {
    switch (type) {
        case 'giftCardBlock':
            return 'Review gift cards';
        case 'categoryShowcase':
            return 'Browse categories';
        case 'promoBanner':
            return 'Review offer';
        case 'bestSellersStrip':
            return 'Review products';
        case 'shopCTA':
            return 'Open storefront';
        default:
            return 'Shop now';
    }
}

function makeBlock(
    type: AiStudioWebsiteEcommerceBlockSuggestion['type'],
    index: number,
    input: AiStudioBusinessBriefInput,
    source: string,
    enabled = true,
): AiStudioWebsiteEcommerceBlockSuggestion {
    const now = input.now || new Date().toISOString();
    return {
        id: `ai-website-${type}-${index + 1}`,
        type,
        enabled,
        status: 'draft',
        needsReview: true,
        source,
        title: blockTitle(type, input.businessName || input.existingWebsitePlan?.businessProfile.businessName),
        description: blockDescription(type),
        ctaLabel: ctaLabel(type),
        routeTarget: 'storefront',
        sourceMap: {
            source,
            websiteBuilder: 'suggestion_only_not_mounted',
        },
        metadata: createAiStudioMetadata(now),
    };
}

export function deriveWebsiteEcommerceBlocks(
    input: AiStudioBusinessBriefInput,
    ecommerceBlueprint: AiStudioEcommerceBlueprint,
    storefrontBlueprint: AiStudioStorefrontBlueprint,
): AiStudioWebsiteEcommerceBlockSuggestion[] {
    if (!ecommerceBlueprint.enabled || !storefrontBlueprint.enabled) return [];

    const text = getBriefText(input);
    const hasProductsOrReviewableDrafts = ecommerceBlueprint.starterProducts.length > 0;
    const hasCategories = ecommerceBlueprint.productCategories.length > 0;
    const hasEnoughProductsForCarousel = ecommerceBlueprint.starterProducts.length >= 4;
    const blocks: AiStudioWebsiteEcommerceBlockSuggestion[] = [];

    if (hasProductsOrReviewableDrafts) {
        blocks.push(makeBlock('featuredProducts', blocks.length, input, 'ecommerceBlueprint.starterProducts'));
    }

    if (hasCategories) {
        blocks.push(makeBlock('categoryShowcase', blocks.length, input, 'ecommerceBlueprint.productCategories'));
    }

    if (hasEnoughProductsForCarousel) {
        blocks.push(makeBlock('productCarousel', blocks.length, input, 'ecommerceBlueprint.starterProducts'));
    }

    if (ecommerceBlueprint.giftCardsEnabled) {
        blocks.push(makeBlock('giftCardBlock', blocks.length, input, 'ecommerceBlueprint.giftCards'));
    }

    if (/\b(promo|promotion|discount|sale|oferta|descuento)\b/i.test(text)) {
        blocks.push(makeBlock('promoBanner', blocks.length, input, 'merchantApproval.required', false));
    }

    if (/\b(best sellers?|top sellers?|mas vendidos|más vendidos)\b/i.test(text)) {
        blocks.push(makeBlock('bestSellersStrip', blocks.length, input, 'salesData.required', false));
    }

    if (!hasProductsOrReviewableDrafts || !hasCategories || blocks.length === 0) {
        blocks.push(makeBlock('shopCTA', blocks.length, input, 'storefrontBlueprint.routeStrategy'));
    }

    return blocks;
}
