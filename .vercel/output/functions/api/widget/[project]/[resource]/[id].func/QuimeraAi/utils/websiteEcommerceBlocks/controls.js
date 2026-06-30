export const WEBSITE_ECOMMERCE_PRODUCT_CARD_VARIANTS = [
    'modern',
    'minimal',
    'elegant',
    'overlay',
    'luxury',
    'marketplace',
    'editorial',
    'compact',
    'imageFirst',
    'quickBuy',
];
export const WEBSITE_ECOMMERCE_RESPONSIVE_BEHAVIORS = [
    'stack',
    'scroll',
    'hide',
];
export const WEBSITE_ECOMMERCE_CTA_ROUTE_TYPES = [
    'storefront',
    'product',
    'category',
    'collection',
    'cart',
    'custom',
];
const cleanRoute = (value) => {
    const trimmed = value?.trim();
    return trimmed || undefined;
};
const withLeadingSlash = (value) => value.startsWith('/') ? value : `/${value}`;
export const normalizeWebsiteEcommerceCTARouteType = (value) => (WEBSITE_ECOMMERCE_CTA_ROUTE_TYPES.includes(value)
    ? value
    : 'storefront');
export const resolveWebsiteEcommerceCTARoute = (input) => {
    const routeType = normalizeWebsiteEcommerceCTARouteType(input.routeType);
    const fallbackRoute = cleanRoute(input.fallbackRoute) || '/store';
    if (routeType === 'custom')
        return cleanRoute(input.customUrl) || fallbackRoute;
    if (routeType === 'cart')
        return cleanRoute(input.cartRoute) || '/cart';
    if (routeType === 'product') {
        const productId = cleanRoute(input.productId);
        return productId ? `/product/${encodeURIComponent(productId)}` : fallbackRoute;
    }
    if (routeType === 'category') {
        const categoryId = cleanRoute(input.categoryId);
        return categoryId ? `/category/${encodeURIComponent(categoryId)}` : fallbackRoute;
    }
    if (routeType === 'collection') {
        const collectionId = cleanRoute(input.collectionId);
        return collectionId ? `/collection/${encodeURIComponent(collectionId)}` : fallbackRoute;
    }
    return withLeadingSlash(cleanRoute(input.storefrontRoute) || fallbackRoute);
};
export const normalizeWebsiteEcommerceResponsiveBehavior = (value) => (WEBSITE_ECOMMERCE_RESPONSIVE_BEHAVIORS.includes(value)
    ? value
    : 'stack');
//# sourceMappingURL=controls.js.map