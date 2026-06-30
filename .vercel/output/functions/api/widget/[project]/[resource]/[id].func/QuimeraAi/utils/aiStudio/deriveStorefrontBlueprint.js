import { classifyCommerceSignals, createAiStudioMetadata, createAiStudioReadiness, getBriefText, } from './types';
const STOREFRONT_SECTION_TYPES = [
    'announcementBar',
    'header',
    'storefrontHero',
    'featuredCollections',
    'featuredProducts',
    'productGrid',
    'promoBanner',
    'trustBadges',
    'newsletter',
    'faq',
    'storeFooter',
];
function normalizeBrandColors(brandProfile) {
    const profile = brandProfile && typeof brandProfile === 'object'
        ? brandProfile
        : undefined;
    const colors = (profile?.colors && typeof profile.colors === 'object')
        ? profile.colors
        : (brandProfile && typeof brandProfile === 'object' ? brandProfile : {});
    return Object.entries(colors)
        .filter((entry) => typeof entry[1] === 'string' && entry[1].trim().startsWith('#'))
        .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
}
function choosePreset(input, ecommerceBlueprint) {
    const text = getBriefText(input);
    const signals = classifyCommerceSignals(input);
    if (signals.includes('marketplace') || ecommerceBlueprint.productCategories.length > 8)
        return 'marketplace';
    if (signals.includes('fitness') || /\b(sports?|gym|fitness|crossfit|cycling|bike|bicycle|bicicleta)\b/i.test(text))
        return 'fitness';
    if (signals.includes('luxury'))
        return 'luxury';
    if (signals.includes('fashion'))
        return 'fashion';
    if (signals.includes('restaurant') || signals.includes('food'))
        return 'food';
    if (signals.includes('beauty'))
        return 'beauty';
    if (signals.includes('real-estate'))
        return 'realEstate';
    if (signals.includes('digital'))
        return 'digital';
    if (signals.includes('services'))
        return 'services';
    return ecommerceBlueprint.enabled ? 'minimal' : 'minimal';
}
function chooseProductCardVariant(preset) {
    switch (preset) {
        case 'fitness':
            return 'quickBuy';
        case 'luxury':
            return 'luxury';
        case 'fashion':
            return 'imageFirst';
        case 'food':
        case 'restaurant':
            return 'compact';
        case 'beauty':
            return 'imageFirst';
        case 'marketplace':
            return 'marketplace';
        case 'digital':
            return 'minimal';
        case 'editorial':
            return 'editorial';
        default:
            return 'minimal';
    }
}
function createSection(type, order, enabled, now, productCardVariant) {
    const metadata = createAiStudioMetadata(now);
    const isUncertain = ['featuredCollections', 'featuredProducts', 'productGrid', 'promoBanner', 'faq'].includes(type);
    return {
        id: `ai-storefront-${type}-${order + 1}`,
        type,
        order,
        enabled,
        status: isUncertain ? 'needs_review' : 'draft',
        needsReview: true,
        dataSource: type.includes('Product') || type === 'productGrid'
            ? 'ecommerceBlueprint.starterProducts'
            : type.includes('Collection')
                ? 'ecommerceBlueprint.productCategories'
                : undefined,
        settings: {
            productCardVariant,
            requiresMerchantReview: true,
            activeDiscount: false,
            fakeReviews: false,
            fakeSales: false,
        },
        readiness: createAiStudioReadiness([
            'Storefront section copy and data source should be reviewed before publishing.',
            ...(type === 'promoBanner' ? ['Promotion banners require merchant approval before activation.'] : []),
        ]),
        sourceMap: {
            section: `storefrontBlueprint.sections.${type}`,
            dataSource: type,
        },
        metadata,
    };
}
export function deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, brandProfile) {
    const now = input.now || ecommerceBlueprint.metadata.generatedAt || new Date().toISOString();
    const metadata = createAiStudioMetadata(now);
    const enabled = ecommerceBlueprint.enabled;
    const themePreset = choosePreset(input, ecommerceBlueprint);
    const productCardVariant = chooseProductCardVariant(themePreset);
    const sections = STOREFRONT_SECTION_TYPES.map((type, order) => (createSection(type, order, enabled, now, productCardVariant)));
    return {
        enabled,
        status: enabled ? 'needs_review' : 'draft',
        needsReview: true,
        templatePreset: enabled ? 'ai-storefront-starter' : 'ai-storefront-optional',
        themePreset,
        productCardVariant,
        sections,
        collectionStrategy: enabled
            ? ecommerceBlueprint.catalogStrategy
            : 'storefront_disabled_until_commerce_is_confirmed',
        cartStyle: 'drawer_draft',
        checkoutStyle: 'disabled_until_payments_configured',
        colorSystem: normalizeBrandColors(brandProfile || input.existingWebsitePlan?.brandProfile.colors),
        readiness: enabled
            ? createAiStudioReadiness([
                'Storefront is generated as draft infrastructure only.',
                'Product cards, sections, and collection strategy need merchant review.',
            ], [
                'Do not publish storefront until products, policies, and checkout settings are reviewed.',
            ])
            : createAiStudioReadiness(['Storefront remains optional because ecommerce is not enabled.']),
        sourceMap: {
            ecommerceBlueprint: 'deriveStorefrontBlueprintFromBusinessBrief.ecommerceBlueprint',
            brandProfile: brandProfile ? 'brandProfile' : 'websitePlan.brandProfile',
            colorSystem: 'brandProfile.colors',
        },
        metadata,
    };
}
//# sourceMappingURL=deriveStorefrontBlueprint.js.map