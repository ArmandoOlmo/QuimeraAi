import type { ProductCardVariant } from './productCard';
import type { PageSection } from './ui';

export type WebsiteEcommerceBlockType =
    | 'featuredProducts'
    | 'productCarousel'
    | 'categoryShowcase'
    | 'promoBanner'
    | 'giftCardBlock'
    | 'shopCTA'
    | 'bestSellersStrip'
    | 'cartMiniCTA';

export type WebsiteEcommerceBlockSource =
    | 'manual'
    | 'category'
    | 'collection'
    | 'best_sellers'
    | 'new_arrivals'
    | 'featured'
    | 'gift_cards'
    | 'promotion';

export type WebsiteEcommerceBlockEntity =
    | 'products'
    | 'categories'
    | 'collections'
    | 'prices'
    | 'discounts'
    | 'gift_cards'
    | 'storefront_routes';

export type WebsiteEcommerceBlockLayout =
    | 'grid'
    | 'carousel'
    | 'showcase'
    | 'banner'
    | 'strip'
    | 'cta';

export type WebsiteEcommerceResponsiveBehavior = 'stack' | 'scroll' | 'hide';

export type WebsiteEcommerceCTARouteType =
    | 'storefront'
    | 'product'
    | 'category'
    | 'collection'
    | 'cart'
    | 'custom';

export interface WebsiteEcommerceBlockSourceConfig {
    type: WebsiteEcommerceBlockSource;
    productIds?: string[];
    categoryId?: string;
    collectionId?: string;
    discountId?: string;
}

export interface WebsiteEcommerceBlockCTA {
    label?: string;
    routeType?: WebsiteEcommerceCTARouteType;
    route?: string;
}

export interface WebsiteEcommerceBlockSettings {
    source?: WebsiteEcommerceBlockSourceConfig;
    layout?: WebsiteEcommerceBlockLayout;
    productCardVariant?: ProductCardVariant;
    columns?: 2 | 3 | 4 | 5;
    limit?: number;
    showPrice?: boolean;
    showBadges?: boolean;
    showRating?: boolean;
    visibility?: 'desktop' | 'mobile' | 'all';
    responsiveBehavior?: WebsiteEcommerceResponsiveBehavior;
    cta?: WebsiteEcommerceBlockCTA;
    styleVariant?: string;
}

export interface WebsiteEcommerceBlockDefinition {
    type: WebsiteEcommerceBlockType;
    label: string;
    description: string;
    pageSections: PageSection[];
    allowedSources: WebsiteEcommerceBlockSource[];
    defaultSource: WebsiteEcommerceBlockSource;
    defaultLayout: WebsiteEcommerceBlockLayout;
    consumes: WebsiteEcommerceBlockEntity[];
    writes: [];
    canonicalSystem: 'ecommerce-engine';
    presentationOwner: 'website-builder';
    requiredModule: 'ecommerce-engine';
    requiredFeature: 'ecommerceEnabled';
    requiredService: 'ecommerce';
    defaultTargetRoute: string;
    defaultSettings: WebsiteEcommerceBlockSettings;
}

export interface WebsiteEcommerceBlockSeed {
    id: string;
    type: WebsiteEcommerceBlockType;
    source: WebsiteEcommerceBlockSource;
    targetRoute: string;
    settings: WebsiteEcommerceBlockSettings;
}

export interface WebsiteEcommerceBlockValidationIssue {
    code:
        | 'missing_id'
        | 'unsupported_block_type'
        | 'unsupported_source'
        | 'missing_manual_products'
        | 'missing_category'
        | 'missing_collection'
        | 'missing_target_route'
        | 'forbidden_write_attempt';
    severity: 'warning' | 'error';
    message: string;
    field?: string;
}

export interface WebsiteEcommerceBlockValidationInput {
    id?: string;
    type?: string;
    source?: string;
    targetRoute?: string;
    settings?: WebsiteEcommerceBlockSettings | Record<string, unknown>;
}

export interface WebsiteEcommerceCTARouteInput {
    routeType?: WebsiteEcommerceCTARouteType | string;
    storefrontRoute?: string;
    productId?: string;
    categoryId?: string;
    collectionId?: string;
    cartRoute?: string;
    customUrl?: string;
    fallbackRoute?: string;
}
