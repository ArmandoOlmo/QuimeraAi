import { classifyCommerceSignals, createAiStudioMetadata, createAiStudioReadiness, getBriefText, hasCommerceIntent, uniqueValues, } from './types';
function titleCase(value) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
function includesSignal(signals, signal) {
    return signals.includes(signal);
}
function extractUserProvidedPrice(text) {
    const match = text.match(/(?:\$|usd\s*)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (!match)
        return undefined;
    const value = Number(match[1].replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
}
function serviceCategories(input) {
    const services = [
        ...(input.services || []),
        ...(input.existingWebsitePlan?.businessProfile.services || []),
    ];
    return uniqueValues(services.map(service => service.name).filter(Boolean).map(String), 6);
}
function inferProductCategories(input, signals) {
    const text = getBriefText(input);
    if (/\b(bike|bikes|bicycle|bicicleta|cycling)\b/i.test(text)) {
        return ['Bikes', 'Accessories', 'Repairs', 'Gift Cards'];
    }
    if (includesSignal(signals, 'restaurant')) {
        const categories = ['Gift Cards', 'Catering Packages', 'Event Tickets', 'Merchandise'];
        if (/\b(meal kit|meal kits|kit|take home|para llevar)\b/i.test(text))
            categories.push('Meal Kits');
        return categories;
    }
    if (includesSignal(signals, 'real-estate')) {
        return ['Digital Guides', 'Consultation Packages', 'Buyer Resources', 'Seller Resources'];
    }
    if (includesSignal(signals, 'services') && !includesSignal(signals, 'commerce')) {
        return ['Paid Consultations', 'Service Packages', 'Deposits', 'Add-ons'];
    }
    if (includesSignal(signals, 'fashion'))
        return ['Apparel', 'Accessories', 'New Arrivals', 'Gift Cards'];
    if (includesSignal(signals, 'beauty'))
        return ['Skincare', 'Beauty Packages', 'Gift Cards', 'Add-ons'];
    if (includesSignal(signals, 'digital'))
        return ['Digital Guides', 'Courses', 'Templates', 'Downloads'];
    if (includesSignal(signals, 'fitness'))
        return ['Training Gear', 'Programs', 'Recovery', 'Gift Cards'];
    if (includesSignal(signals, 'luxury'))
        return ['Signature Pieces', 'Accessories', 'Gift Cards', 'Private Consultations'];
    const fromServices = serviceCategories(input);
    if (fromServices.length > 0)
        return uniqueValues([...fromServices, 'Gift Cards'], 6);
    if (includesSignal(signals, 'commerce') || includesSignal(signals, 'marketplace')) {
        return ['Products', 'Accessories', 'Featured Items', 'Gift Cards'];
    }
    return [];
}
function inferStoreType(signals, categories) {
    if (includesSignal(signals, 'restaurant'))
        return 'restaurant_commerce_drafts';
    if (includesSignal(signals, 'real-estate'))
        return 'real_estate_services_drafts';
    if (includesSignal(signals, 'digital'))
        return 'digital_products_drafts';
    if (includesSignal(signals, 'services') && !includesSignal(signals, 'commerce'))
        return 'service_packages_drafts';
    if (includesSignal(signals, 'marketplace') || categories.length > 6)
        return 'multi_category_catalog_drafts';
    if (includesSignal(signals, 'commerce'))
        return 'product_catalog_drafts';
    return 'not_applicable';
}
function inferCatalogStrategy(enabled, signals) {
    if (!enabled)
        return 'no_catalog_optional_recommendations';
    if (includesSignal(signals, 'real-estate'))
        return 'optional_services_and_digital_resources';
    if (includesSignal(signals, 'services') && !includesSignal(signals, 'commerce'))
        return 'paid_services_and_packages';
    if (includesSignal(signals, 'restaurant'))
        return 'gift_cards_catering_events_and_merch';
    return 'draft_starter_catalog_for_review';
}
function createStarterProduct(category, input, index) {
    const text = getBriefText(input);
    const userPrice = index === 0 ? extractUserProvidedPrice(text) : undefined;
    const product = {
        name: `${category} Draft`,
        category,
        description: `Draft ${category.toLowerCase()} offer generated from the AI Studio business brief. Review before publishing.`,
        suggestedPrice: userPrice,
        priceSource: userPrice !== undefined ? 'user-provided' : 'unset',
        stockSource: 'unset',
        status: 'draft',
    };
    return {
        ...product,
        needsReview: true,
        isPublished: false,
        publishStatus: 'not_published',
        discountStatus: 'none',
    };
}
function recommendationsFor(signals, enabled) {
    if (!enabled) {
        return ['Keep ecommerce disabled until the merchant confirms products, paid services, or digital offers.'];
    }
    const recommendations = [
        'Review every draft product before publishing.',
        'Configure payments, tax, shipping, and policies before checkout goes live.',
    ];
    if (includesSignal(signals, 'restaurant'))
        recommendations.push('Validate gift cards, catering packages, and event tickets with the restaurant team.');
    if (includesSignal(signals, 'real-estate'))
        recommendations.push('Use digital guides and consultation packages as optional lead-generation offers.');
    if (includesSignal(signals, 'services'))
        recommendations.push('Confirm paid consultation, deposit, and appointment rules before enabling checkout.');
    if (includesSignal(signals, 'digital'))
        recommendations.push('Confirm file delivery and access rules before selling digital products.');
    return recommendations;
}
export function deriveEcommerceBlueprintFromBusinessBrief(input) {
    const now = input.now || new Date().toISOString();
    const metadata = createAiStudioMetadata(now);
    const signals = classifyCommerceSignals(input);
    const enabled = hasCommerceIntent(input);
    const productCategories = enabled ? inferProductCategories(input, signals) : [];
    const starterProducts = enabled
        ? productCategories.slice(0, 6).map((category, index) => createStarterProduct(titleCase(category), input, index))
        : [];
    const hasGiftCardCategory = productCategories.some(category => /gift card/i.test(category));
    const giftCardsEnabled = enabled && (hasGiftCardCategory ||
        (!includesSignal(signals, 'real-estate') &&
            signals.some(signal => ['restaurant', 'commerce', 'fitness', 'fashion', 'beauty', 'luxury'].includes(signal))));
    const digitalProductsEnabled = enabled && (includesSignal(signals, 'digital') ||
        includesSignal(signals, 'real-estate') ||
        productCategories.some(category => /guide|digital|download|course|template/i.test(category)));
    const storeType = inferStoreType(signals, productCategories);
    const catalogStrategy = inferCatalogStrategy(enabled, signals);
    const readiness = enabled
        ? createAiStudioReadiness([
            'Starter products are drafts and need merchant review.',
            'No payment, tax, shipping, inventory, or publishing has been activated.',
        ], [
            'Configure payment provider before accepting checkout.',
            'Review product names, prices, media, categories, and policies before publishing.',
        ])
        : createAiStudioReadiness([
            'No clear ecommerce intent was detected; commerce remains optional.',
        ]);
    return {
        enabled,
        status: enabled ? 'needs_review' : 'draft',
        needsReview: true,
        storeType,
        catalogStrategy,
        productCategories,
        categories: productCategories,
        starterProducts,
        giftCardsEnabled,
        digitalProductsEnabled,
        inventoryMode: 'not_configured',
        fulfillmentMode: 'not_configured',
        paymentMode: 'not_configured',
        taxMode: 'not_configured',
        shippingMode: 'not_configured',
        discounts: [],
        readiness,
        sourceMap: {
            businessBrief: [
                'businessName',
                'industry',
                'description',
                'productsServicesText',
                'services',
            ],
            ecommerceIntent: 'aiStudio.deriveEcommerceBlueprintFromBusinessBrief',
            websitePlan: input.existingWebsitePlan ? 'existingWebsitePlan' : 'not_provided',
        },
        metadata,
        recommendations: recommendationsFor(signals, enabled),
        industrySignals: signals,
    };
}
//# sourceMappingURL=deriveEcommerceBlueprint.js.map