export type ProductCardVariant =
    | 'minimal'
    | 'modern'
    | 'elegant'
    | 'overlay'
    | 'luxury'
    | 'marketplace'
    | 'editorial'
    | 'compact'
    | 'imageFirst'
    | 'quickBuy'
    | 'fitness'
    | 'food'
    | 'fashion'
    | 'digital'
    | 'classic'
    | 'bordered';

export type ProductCardVisualVariant =
    | 'minimal'
    | 'modern'
    | 'elegant'
    | 'overlay'
    | 'luxury'
    | 'marketplace'
    | 'editorial'
    | 'compact'
    | 'imageFirst'
    | 'quickBuy';

export type ProductCardImageQuality = 'usable' | 'missing' | 'placeholder' | 'low_quality' | 'unsupported';

export type ProductCardValidationSeverity = 'warning' | 'error';

export type ProductCardValidationCode =
    | 'missing_id'
    | 'missing_name'
    | 'invalid_price'
    | 'zero_price'
    | 'invalid_compare_at_price'
    | 'unusually_high_discount'
    | 'missing_image'
    | 'placeholder_image'
    | 'low_quality_image'
    | 'unsupported_image'
    | 'invalid_rating'
    | 'invalid_review_count'
    | 'draft_product'
    | 'archived_product'
    | 'out_of_stock';

export interface ProductCardValidationIssue {
    code: ProductCardValidationCode;
    severity: ProductCardValidationSeverity;
    message: string;
    field?: string;
}

export interface ProductCardReadiness {
    isReady: boolean;
    blockers: string[];
    warnings: string[];
}

export type ProductCardImageInput =
    | string
    | {
        id?: string;
        url?: string | null;
        src?: string | null;
        alt?: string | null;
        altText?: string | null;
        position?: number;
    };

export interface ProductCardInput {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    price?: number | string | null;
    compareAtPrice?: number | string | null;
    currency?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    images?: ProductCardImageInput[] | null;
    category?: string | null;
    categoryId?: string | null;
    categoryName?: string | null;
    tags?: string[] | null;
    status?: string | null;
    inStock?: boolean | null;
    quantity?: number | string | null;
    lowStock?: boolean | null;
    lowStockThreshold?: number | string | null;
    trackInventory?: boolean | null;
    isFeatured?: boolean | null;
    rating?: number | string | null;
    averageRating?: number | string | null;
    reviewCount?: number | string | null;
    reviewStats?: {
        averageRating?: number | string | null;
        totalReviews?: number | string | null;
    } | null;
}

export interface ProductCardDisplayOptions {
    variant?: ProductCardVariant | string | null;
    currencySymbol?: string;
    showBadges?: boolean;
    showAvailabilityBadge?: boolean;
    showFeaturedBadge?: boolean;
    showRatings?: boolean;
    showPrice?: boolean;
    allowZeroPrice?: boolean;
    placeholderImageUrl?: string;
}

export interface ProductCardImage {
    url: string;
    altText: string;
    quality: ProductCardImageQuality;
    isFallback: boolean;
}

export interface ProductCardBadge {
    kind: 'sale' | 'featured' | 'available' | 'out_of_stock' | 'low_stock';
    label: string;
}

export interface ProductCardRating {
    value: number;
    reviewCount: number;
    displayText: string;
}

export interface ProductCardViewModel {
    id: string;
    name: string;
    slug?: string;
    variant: ProductCardVariant;
    visualVariant: ProductCardVisualVariant;
    price: number;
    compareAtPrice?: number;
    displayPrice: string;
    displayCompareAtPrice?: string;
    hasDiscount: boolean;
    discountPercent: number;
    currencySymbol: string;
    image?: ProductCardImage;
    badges: ProductCardBadge[];
    rating?: ProductCardRating;
    inventory: {
        isAvailable: boolean;
        lowStock: boolean;
    };
    issues: ProductCardValidationIssue[];
    readiness: ProductCardReadiness;
    isRenderable: boolean;
}
