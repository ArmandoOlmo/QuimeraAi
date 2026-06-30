export const WEBSITE_ECOMMERCE_BLOCK_TYPES = [
    'featuredProducts',
    'productCarousel',
    'categoryShowcase',
    'promoBanner',
    'giftCardBlock',
    'shopCTA',
    'bestSellersStrip',
    'cartMiniCTA',
];
const baseDefinition = (definition) => ({
    ...definition,
    canonicalSystem: 'ecommerce-engine',
    presentationOwner: 'website-builder',
    requiredModule: 'ecommerce-engine',
    requiredFeature: 'ecommerceEnabled',
    requiredService: 'ecommerce',
    writes: [],
});
export const websiteEcommerceBlockRegistry = {
    featuredProducts: baseDefinition({
        type: 'featuredProducts',
        label: 'Featured Products',
        description: 'Website block that displays selected or featured products from Ecommerce Engine.',
        pageSections: ['featuredProducts'],
        allowedSources: ['manual', 'featured', 'category', 'collection', 'new_arrivals', 'best_sellers'],
        defaultSource: 'featured',
        defaultLayout: 'grid',
        consumes: ['products', 'prices', 'categories', 'storefront_routes'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'grid',
            productCardVariant: 'modern',
            columns: 4,
            limit: 8,
            showPrice: true,
            showBadges: true,
            showRating: true,
            cta: { label: 'Shop all', routeType: 'storefront', route: '/store' },
        },
    }),
    productCarousel: baseDefinition({
        type: 'productCarousel',
        label: 'Product Carousel',
        description: 'Website carousel for newest, best-selling, featured, or manually selected products.',
        pageSections: ['featuredProducts'],
        allowedSources: ['manual', 'featured', 'category', 'collection', 'new_arrivals', 'best_sellers'],
        defaultSource: 'new_arrivals',
        defaultLayout: 'carousel',
        consumes: ['products', 'prices', 'categories', 'storefront_routes'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'carousel',
            productCardVariant: 'imageFirst',
            limit: 10,
            showPrice: true,
            showBadges: true,
            showRating: true,
            responsiveBehavior: 'scroll',
            cta: { label: 'View store', routeType: 'storefront', route: '/store' },
        },
    }),
    categoryShowcase: baseDefinition({
        type: 'categoryShowcase',
        label: 'Category Showcase',
        description: 'Website block that links to product categories managed by Ecommerce Engine.',
        pageSections: ['categoryGrid'],
        allowedSources: ['category', 'collection', 'featured'],
        defaultSource: 'category',
        defaultLayout: 'showcase',
        consumes: ['categories', 'collections', 'storefront_routes'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'showcase',
            columns: 4,
            limit: 6,
            cta: { label: 'Browse categories', routeType: 'storefront', route: '/store' },
        },
    }),
    promoBanner: baseDefinition({
        type: 'promoBanner',
        label: 'Promo Banner',
        description: 'Presentation banner for a collection, promotion, or discount configured in Ecommerce Engine.',
        pageSections: ['saleCountdown', 'collectionBanner'],
        allowedSources: ['promotion', 'collection', 'category', 'featured'],
        defaultSource: 'promotion',
        defaultLayout: 'banner',
        consumes: ['discounts', 'collections', 'categories', 'storefront_routes'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'banner',
            showBadges: true,
            cta: { label: 'Shop offer', routeType: 'storefront', route: '/store' },
        },
    }),
    giftCardBlock: baseDefinition({
        type: 'giftCardBlock',
        label: 'Gift Card Block',
        description: 'Website block that promotes gift card products while keeping gift card data in Ecommerce Engine.',
        pageSections: ['featuredProducts'],
        allowedSources: ['gift_cards'],
        defaultSource: 'gift_cards',
        defaultLayout: 'grid',
        consumes: ['products', 'prices', 'gift_cards', 'storefront_routes'],
        defaultTargetRoute: '/store/gift-cards',
        defaultSettings: {
            layout: 'grid',
            productCardVariant: 'minimal',
            columns: 3,
            limit: 3,
            showPrice: true,
            cta: { label: 'Buy gift card', routeType: 'collection', route: '/store/gift-cards' },
        },
    }),
    shopCTA: baseDefinition({
        type: 'shopCTA',
        label: 'Shop CTA',
        description: 'Call-to-action block that routes website visitors into the storefront, category, product, or cart.',
        pageSections: ['cta', 'productHero'],
        allowedSources: ['featured', 'category', 'collection', 'manual'],
        defaultSource: 'featured',
        defaultLayout: 'cta',
        consumes: ['storefront_routes', 'products', 'categories', 'collections'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'cta',
            cta: { label: 'Shop now', routeType: 'storefront', route: '/store' },
        },
    }),
    bestSellersStrip: baseDefinition({
        type: 'bestSellersStrip',
        label: 'Best Sellers Strip',
        description: 'Compact strip of best-selling products for a website page.',
        pageSections: ['featuredProducts'],
        allowedSources: ['best_sellers'],
        defaultSource: 'best_sellers',
        defaultLayout: 'strip',
        consumes: ['products', 'prices', 'storefront_routes'],
        defaultTargetRoute: '/store',
        defaultSettings: {
            layout: 'strip',
            productCardVariant: 'compact',
            limit: 6,
            showPrice: true,
            cta: { label: 'Best sellers', routeType: 'storefront', route: '/store' },
        },
    }),
    cartMiniCTA: baseDefinition({
        type: 'cartMiniCTA',
        label: 'Cart Mini CTA',
        description: 'Small website CTA that points visitors to the cart without editing cart or checkout behavior.',
        pageSections: ['cta'],
        allowedSources: ['featured'],
        defaultSource: 'featured',
        defaultLayout: 'cta',
        consumes: ['storefront_routes'],
        defaultTargetRoute: '/cart',
        defaultSettings: {
            layout: 'cta',
            cta: { label: 'View cart', routeType: 'cart', route: '/cart' },
        },
    }),
};
export const isWebsiteEcommerceBlockType = (value) => (typeof value === 'string' && WEBSITE_ECOMMERCE_BLOCK_TYPES.includes(value));
export const getWebsiteEcommerceBlockDefinition = (type) => (isWebsiteEcommerceBlockType(type) ? websiteEcommerceBlockRegistry[type] : undefined);
const getSourceConfig = (block) => {
    const settings = block.settings;
    return {
        type: block.source || settings?.source?.type,
        productIds: settings?.source?.productIds,
        categoryId: settings?.source?.categoryId,
        collectionId: settings?.source?.collectionId,
    };
};
const pushIssue = (issues, issue) => {
    if (!issues.some(existing => existing.code === issue.code && existing.field === issue.field)) {
        issues.push(issue);
    }
};
export const validateWebsiteEcommerceBlock = (block) => {
    const issues = [];
    const definition = block.type ? getWebsiteEcommerceBlockDefinition(block.type) : undefined;
    const sourceConfig = getSourceConfig(block);
    if (!block.id?.trim()) {
        pushIssue(issues, {
            code: 'missing_id',
            severity: 'error',
            field: 'id',
            message: 'Website ecommerce block requires an id.',
        });
    }
    if (!definition) {
        pushIssue(issues, {
            code: 'unsupported_block_type',
            severity: 'error',
            field: 'type',
            message: 'Website ecommerce block type is not supported.',
        });
        return issues;
    }
    const sourceType = sourceConfig.type || definition.defaultSource;
    if (!definition.allowedSources.includes(sourceType)) {
        pushIssue(issues, {
            code: 'unsupported_source',
            severity: 'error',
            field: 'source',
            message: `${definition.type} does not support source ${sourceType}.`,
        });
    }
    if (sourceType === 'manual' && !sourceConfig.productIds?.length && ['featuredProducts', 'productCarousel', 'shopCTA'].includes(definition.type)) {
        pushIssue(issues, {
            code: 'missing_manual_products',
            severity: 'warning',
            field: 'settings.source.productIds',
            message: 'Manual product sources should include product ids before publishing.',
        });
    }
    if (sourceType === 'category' && definition.type !== 'categoryShowcase' && !sourceConfig.categoryId) {
        pushIssue(issues, {
            code: 'missing_category',
            severity: 'warning',
            field: 'settings.source.categoryId',
            message: 'Category source should include a category id before publishing.',
        });
    }
    if (sourceType === 'collection' && !sourceConfig.collectionId) {
        pushIssue(issues, {
            code: 'missing_collection',
            severity: 'warning',
            field: 'settings.source.collectionId',
            message: 'Collection source should include a collection id before publishing.',
        });
    }
    if (!(block.targetRoute || definition.defaultTargetRoute)) {
        pushIssue(issues, {
            code: 'missing_target_route',
            severity: 'warning',
            field: 'targetRoute',
            message: 'Website ecommerce block should route to a storefront, product, category, collection, cart, or custom URL.',
        });
    }
    return issues;
};
const sectionSeedMap = {
    featuredProducts: {
        type: 'featuredProducts',
        source: 'featured',
        targetRoute: '/store',
        settings: websiteEcommerceBlockRegistry.featuredProducts.defaultSettings,
    },
    categoryGrid: {
        type: 'categoryShowcase',
        source: 'category',
        targetRoute: '/store',
        settings: websiteEcommerceBlockRegistry.categoryShowcase.defaultSettings,
    },
    saleCountdown: {
        type: 'promoBanner',
        source: 'promotion',
        targetRoute: '/store',
        settings: websiteEcommerceBlockRegistry.promoBanner.defaultSettings,
    },
    collectionBanner: {
        type: 'promoBanner',
        source: 'collection',
        targetRoute: '/store',
        settings: websiteEcommerceBlockRegistry.promoBanner.defaultSettings,
    },
    productHero: {
        type: 'shopCTA',
        source: 'featured',
        targetRoute: '/store',
        settings: websiteEcommerceBlockRegistry.shopCTA.defaultSettings,
    },
};
export const createWebsiteEcommerceBlockSeedsFromSections = (sections) => sections
    .map((section, index) => {
    const seed = sectionSeedMap[section];
    if (!seed)
        return undefined;
    const settings = {
        ...seed.settings,
        source: { type: seed.source },
    };
    return {
        id: `website-${seed.type}-${index + 1}`,
        ...seed,
        settings,
    };
})
    .filter((seed) => Boolean(seed));
//# sourceMappingURL=registry.js.map