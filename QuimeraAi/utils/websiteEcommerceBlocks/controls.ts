import type { ProductCardVariant } from '../../types/productCard';
import type {
    WebsiteEcommerceCTARouteInput,
    WebsiteEcommerceCTARouteType,
    WebsiteEcommerceResponsiveBehavior,
} from '../../types/websiteEcommerceBlocks';

export const WEBSITE_ECOMMERCE_PRODUCT_CARD_VARIANTS: ProductCardVariant[] = [
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

export const WEBSITE_ECOMMERCE_RESPONSIVE_BEHAVIORS: WebsiteEcommerceResponsiveBehavior[] = [
    'stack',
    'scroll',
    'hide',
];

export const WEBSITE_ECOMMERCE_CTA_ROUTE_TYPES: WebsiteEcommerceCTARouteType[] = [
    'storefront',
    'product',
    'category',
    'collection',
    'cart',
    'custom',
];

const cleanRoute = (value?: string): string | undefined => {
    const trimmed = value?.trim();
    return trimmed || undefined;
};

const withLeadingSlash = (value: string): string => value.startsWith('/') ? value : `/${value}`;

export const normalizeWebsiteEcommerceCTARouteType = (
    value?: string,
): WebsiteEcommerceCTARouteType => (
    WEBSITE_ECOMMERCE_CTA_ROUTE_TYPES.includes(value as WebsiteEcommerceCTARouteType)
        ? value as WebsiteEcommerceCTARouteType
        : 'storefront'
);

export const resolveWebsiteEcommerceCTARoute = (
    input: WebsiteEcommerceCTARouteInput,
): string => {
    const routeType = normalizeWebsiteEcommerceCTARouteType(input.routeType);
    const fallbackRoute = cleanRoute(input.fallbackRoute) || '/store';

    if (routeType === 'custom') return cleanRoute(input.customUrl) || fallbackRoute;
    if (routeType === 'cart') return cleanRoute(input.cartRoute) || '/cart';
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

export const normalizeWebsiteEcommerceResponsiveBehavior = (
    value?: string,
): WebsiteEcommerceResponsiveBehavior => (
    WEBSITE_ECOMMERCE_RESPONSIVE_BEHAVIORS.includes(value as WebsiteEcommerceResponsiveBehavior)
        ? value as WebsiteEcommerceResponsiveBehavior
        : 'stack'
);
