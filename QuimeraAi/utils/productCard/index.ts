import type {
    ProductCardBadge,
    ProductCardDisplayOptions,
    ProductCardImage,
    ProductCardImageInput,
    ProductCardImageQuality,
    ProductCardInput,
    ProductCardReadiness,
    ProductCardValidationIssue,
    ProductCardVariant,
    ProductCardViewModel,
    ProductCardVisualVariant,
} from '../../types/productCard';
import {
    getSafeDiscountBadge,
    getSafeProductPrice,
    getSafeProductTitle,
    isRenderableStorefrontProduct,
} from '../ecommerce/productDisplayGuards';

export const PRODUCT_CARD_VARIANTS: ProductCardVariant[] = [
    'minimal',
    'modern',
    'elegant',
    'overlay',
    'luxury',
    'marketplace',
    'editorial',
    'compact',
    'imageFirst',
    'quickBuy',
    'fitness',
    'food',
    'fashion',
    'digital',
    'classic',
    'bordered',
];

export const PRODUCT_CARD_VISUAL_VARIANTS: ProductCardVisualVariant[] = [
    'minimal',
    'modern',
    'elegant',
    'overlay',
    'luxury',
    'marketplace',
    'editorial',
    'compact',
    'imageFirst',
    'quickBuy',
];

const PRODUCT_CARD_VARIANT_ALIASES: Record<string, ProductCardVariant> = {
    imagefirst: 'imageFirst',
    image_first: 'imageFirst',
    image: 'imageFirst',
    quickbuy: 'quickBuy',
    quick_buy: 'quickBuy',
    grid: 'modern',
    card: 'modern',
    default: 'modern',
};

const PRODUCT_CARD_VISUAL_VARIANT_MAP: Record<ProductCardVariant, ProductCardVisualVariant> = {
    minimal: 'minimal',
    modern: 'modern',
    elegant: 'elegant',
    overlay: 'overlay',
    luxury: 'luxury',
    marketplace: 'marketplace',
    editorial: 'editorial',
    compact: 'compact',
    imageFirst: 'imageFirst',
    quickBuy: 'quickBuy',
    fitness: 'quickBuy',
    food: 'imageFirst',
    fashion: 'editorial',
    digital: 'minimal',
    classic: 'modern',
    bordered: 'modern',
};

const UNUSABLE_IMAGE_PATTERNS = /(sprite|favicon|icon-|\/icon|pixel|tracking|spacer|blank|placeholder|loader|badge|payment|paypal|visa|mastercard)/i;
const LOW_QUALITY_IMAGE_PATTERNS = /(thumbnail|thumb|small|tiny|lowres|low-res|_sm\.|_xs\.|\/sm\/|\/xs\/)/i;

const toNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const trimString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

const addIssue = (
    issues: ProductCardValidationIssue[],
    issue: ProductCardValidationIssue,
) => {
    if (!issues.some(existing => existing.code === issue.code && existing.field === issue.field)) {
        issues.push(issue);
    }
};

export const isProductCardVariant = (value: unknown): value is ProductCardVariant => (
    typeof value === 'string' && PRODUCT_CARD_VARIANTS.includes(value as ProductCardVariant)
);

export const normalizeProductCardVariant = (
    variant?: ProductCardDisplayOptions['variant'],
    fallback: ProductCardVariant = 'modern',
): ProductCardVariant => {
    if (isProductCardVariant(variant)) return variant;
    if (typeof variant === 'string') {
        const normalizedKey = variant.trim().replace(/[\s-]+/g, '_');
        const lowerKey = normalizedKey.toLowerCase();
        if (PRODUCT_CARD_VARIANT_ALIASES[lowerKey]) return PRODUCT_CARD_VARIANT_ALIASES[lowerKey];

        const exact = PRODUCT_CARD_VARIANTS.find(candidate => candidate.toLowerCase() === lowerKey);
        if (exact) return exact;
    }
    return fallback;
};

export const getProductCardVisualVariant = (
    variant?: ProductCardDisplayOptions['variant'],
    fallback: ProductCardVisualVariant = 'modern',
): ProductCardVisualVariant => {
    const normalized = normalizeProductCardVariant(variant, fallback);
    return PRODUCT_CARD_VISUAL_VARIANT_MAP[normalized] || fallback;
};

export const formatProductCardPrice = (
    amount: number,
    currencySymbol = '$',
): string => `${currencySymbol}${amount.toFixed(2)}`;

export const getProductCardImageQuality = (url?: string | null): ProductCardImageQuality => {
    const cleanUrl = trimString(url);
    if (!cleanUrl) return 'missing';

    const lowerUrl = cleanUrl.toLowerCase();
    const hasSupportedProtocol =
        lowerUrl.startsWith('http://') ||
        lowerUrl.startsWith('https://') ||
        lowerUrl.startsWith('data:image/') ||
        lowerUrl.startsWith('/') ||
        lowerUrl.startsWith('blob:');

    if (!hasSupportedProtocol) return 'unsupported';
    if (UNUSABLE_IMAGE_PATTERNS.test(cleanUrl)) return 'placeholder';

    const widthMatch = cleanUrl.match(/[?&](?:w|width)=([0-9]{2,4})/i);
    if (widthMatch) {
        const width = Number(widthMatch[1]);
        if (Number.isFinite(width) && width > 0 && width < 320) return 'low_quality';
    }

    if (LOW_QUALITY_IMAGE_PATTERNS.test(cleanUrl)) return 'low_quality';

    return 'usable';
};

const getImageUrl = (image: ProductCardImageInput): string | undefined => {
    if (typeof image === 'string') return trimString(image);
    return trimString(image.url) || trimString(image.src);
};

const getImageAltText = (image: ProductCardImageInput): string | undefined => {
    if (typeof image === 'string') return undefined;
    return trimString(image.altText) || trimString(image.alt);
};

const getImageCandidates = (product: ProductCardInput): ProductCardImageInput[] => {
    const candidates: ProductCardImageInput[] = [];
    if (product.image) candidates.push(product.image);
    if (product.imageUrl) candidates.push(product.imageUrl);
    if (product.images?.length) {
        const sortedImages = [...product.images].sort((a, b) => {
            const aPosition = typeof a === 'string' ? 0 : a.position ?? 0;
            const bPosition = typeof b === 'string' ? 0 : b.position ?? 0;
            return aPosition - bPosition;
        });
        candidates.push(...sortedImages);
    }
    return candidates;
};

export const selectProductCardImage = (
    product: ProductCardInput,
    options: ProductCardDisplayOptions = {},
): ProductCardImage | undefined => {
    const candidates = getImageCandidates(product)
        .map(candidate => {
            const url = getImageUrl(candidate);
            return {
                candidate,
                url,
                quality: getProductCardImageQuality(url),
            };
        })
        .filter(candidate => candidate.url);

    const preferred =
        candidates.find(candidate => candidate.quality === 'usable') ||
        candidates.find(candidate => candidate.quality === 'low_quality') ||
        candidates.find(candidate => candidate.quality === 'placeholder');

    if (preferred?.url) {
        return {
            url: preferred.url,
            altText: getImageAltText(preferred.candidate) || trimString(product.name) || 'Product image',
            quality: preferred.quality,
            isFallback: false,
        };
    }

    const fallbackUrl = trimString(options.placeholderImageUrl);
    if (fallbackUrl) {
        return {
            url: fallbackUrl,
            altText: trimString(product.name) || 'Product image',
            quality: getProductCardImageQuality(fallbackUrl),
            isFallback: true,
        };
    }

    return undefined;
};

export const validateProductCardInput = (
    product: ProductCardInput,
    options: ProductCardDisplayOptions = {},
): ProductCardValidationIssue[] => {
    const issues: ProductCardValidationIssue[] = [];
    const id = trimString(product.id);
    const name = trimString(product.name);
    const safeName = getSafeProductTitle(product);
    const price = toNumber(product.price);
    const compareAtPrice = toNumber(product.compareAtPrice);
    const image = selectProductCardImage(product, options);
    const imageQuality = image?.quality || getProductCardImageQuality(undefined);
    const status = trimString(product.status)?.toLowerCase();
    const ratingValue = toNumber(product.reviewStats?.averageRating) ?? toNumber(product.averageRating) ?? toNumber(product.rating);
    const reviewCount = toNumber(product.reviewStats?.totalReviews) ?? toNumber(product.reviewCount);
    const inStock = getProductCardInventory(product).isAvailable;

    if (!id) {
        addIssue(issues, {
            code: 'missing_id',
            severity: 'error',
            field: 'id',
            message: 'Product card requires a product id.',
        });
    }

    if (!name) {
        addIssue(issues, {
            code: 'missing_name',
            severity: 'error',
            field: 'name',
            message: 'Product card requires a product name.',
        });
    } else if (!safeName) {
        addIssue(issues, {
            code: 'placeholder_name',
            severity: 'error',
            field: 'name',
            message: 'Product card name appears to be a placeholder.',
        });
    }

    if (price === undefined || price < 0) {
        addIssue(issues, {
            code: 'invalid_price',
            severity: 'error',
            field: 'price',
            message: 'Product card requires a non-negative numeric price.',
        });
    } else if (price === 0 && !options.allowZeroPrice) {
        addIssue(issues, {
            code: 'zero_price',
            severity: 'warning',
            field: 'price',
            message: 'Product price is zero and should be reviewed before publishing.',
        });
    }

    if (compareAtPrice !== undefined) {
        if (compareAtPrice < 0 || price === undefined || price <= 0 || compareAtPrice <= price) {
            addIssue(issues, {
                code: 'invalid_compare_at_price',
                severity: 'warning',
                field: 'compareAtPrice',
                message: 'Compare-at price should be greater than the product price.',
            });
        } else {
            const discountPercent = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
            if (discountPercent > 90) {
                addIssue(issues, {
                    code: 'unusually_high_discount',
                    severity: 'warning',
                    field: 'compareAtPrice',
                    message: 'Discount is unusually high and should be reviewed.',
                });
            }
        }
    }

    if (!image) {
        addIssue(issues, {
            code: 'missing_image',
            severity: 'warning',
            field: 'images',
            message: 'Product card has no image and will use an empty-state fallback.',
        });
    } else if (imageQuality === 'placeholder') {
        addIssue(issues, {
            code: 'placeholder_image',
            severity: 'warning',
            field: 'images',
            message: 'Product card image appears to be a placeholder or non-product asset.',
        });
    } else if (imageQuality === 'low_quality') {
        addIssue(issues, {
            code: 'low_quality_image',
            severity: 'warning',
            field: 'images',
            message: 'Product card image may be too small for storefront cards.',
        });
    } else if (imageQuality === 'unsupported') {
        addIssue(issues, {
            code: 'unsupported_image',
            severity: 'warning',
            field: 'images',
            message: 'Product card image URL uses an unsupported protocol.',
        });
    }

    if (ratingValue !== undefined && (ratingValue < 0 || ratingValue > 5)) {
        addIssue(issues, {
            code: 'invalid_rating',
            severity: 'warning',
            field: 'rating',
            message: 'Product rating should be between 0 and 5.',
        });
    }

    if (reviewCount !== undefined && reviewCount < 0) {
        addIssue(issues, {
            code: 'invalid_review_count',
            severity: 'warning',
            field: 'reviewCount',
            message: 'Product review count should not be negative.',
        });
    }

    if (status === 'draft') {
        addIssue(issues, {
            code: 'draft_product',
            severity: 'warning',
            field: 'status',
            message: 'Draft products should be reviewed before storefront publishing.',
        });
    }

    if (status === 'archived') {
        addIssue(issues, {
            code: 'archived_product',
            severity: 'error',
            field: 'status',
            message: 'Archived products should not be rendered in storefront product cards.',
        });
    }

    if (!inStock) {
        addIssue(issues, {
            code: 'out_of_stock',
            severity: 'warning',
            field: 'inventory',
            message: 'Product is out of stock.',
        });
    }

    return issues;
};

export const getProductCardReadiness = (
    issues: ProductCardValidationIssue[],
): ProductCardReadiness => ({
    isReady: !issues.some(issue => issue.severity === 'error'),
    blockers: issues.filter(issue => issue.severity === 'error').map(issue => issue.message),
    warnings: issues.filter(issue => issue.severity === 'warning').map(issue => issue.message),
});

export const getProductCardInventory = (product: ProductCardInput): ProductCardViewModel['inventory'] => {
    const quantity = toNumber(product.quantity);
    const lowStockThreshold = toNumber(product.lowStockThreshold) ?? 5;
    const trackInventory = product.trackInventory === true;
    const isAvailable = product.inStock === false
        ? false
        : trackInventory && quantity !== undefined
            ? quantity > 0
            : true;
    const lowStock = product.lowStock === true || (isAvailable && quantity !== undefined && quantity > 0 && quantity <= lowStockThreshold);

    return {
        isAvailable,
        lowStock,
    };
};

const getProductCardRating = (
    product: ProductCardInput,
    options: ProductCardDisplayOptions,
): ProductCardViewModel['rating'] => {
    if (options.showRatings === false) return undefined;

    const rawRating = toNumber(product.reviewStats?.averageRating) ?? toNumber(product.averageRating) ?? toNumber(product.rating);
    const rawReviewCount = toNumber(product.reviewStats?.totalReviews) ?? toNumber(product.reviewCount) ?? 0;

    if (rawRating === undefined || rawReviewCount <= 0) return undefined;

    const value = Math.min(5, Math.max(0, rawRating));
    const reviewCount = Math.max(0, Math.round(rawReviewCount));

    return {
        value,
        reviewCount,
        displayText: `(${reviewCount})`,
    };
};

const getProductCardBadges = (
    product: ProductCardInput,
    hasDiscount: boolean,
    discountPercent: number,
    inventory: ProductCardViewModel['inventory'],
    options: ProductCardDisplayOptions,
): ProductCardBadge[] => {
    if (options.showBadges === false) return [];

    const badges: ProductCardBadge[] = [];

    if (!inventory.isAvailable) {
        badges.push({ kind: 'out_of_stock', label: 'Agotado' });
        return badges;
    }

    if (options.showAvailabilityBadge) {
        badges.push({ kind: 'available', label: 'Disponible' });
    }

    if (hasDiscount) {
        badges.push({ kind: 'sale', label: `-${discountPercent}%` });
    }

    if (product.isFeatured && options.showFeaturedBadge !== false) {
        badges.push({ kind: 'featured', label: 'Destacado' });
    }

    if (inventory.lowStock) {
        badges.push({ kind: 'low_stock', label: 'Ultimas unidades' });
    }

    return badges;
};

export const createProductCardViewModel = (
    product: ProductCardInput,
    options: ProductCardDisplayOptions = {},
): ProductCardViewModel => {
    const variant = normalizeProductCardVariant(options.variant);
    const visualVariant = getProductCardVisualVariant(variant);
    const currencySymbol = options.currencySymbol || '$';
    const safePrice = getSafeProductPrice(product, {
        currencySymbol,
        allowPriceInquiry: true,
    });
    const safeDiscount = getSafeDiscountBadge(product);
    const rawPrice = toNumber(product.price);
    const price = rawPrice !== undefined && rawPrice >= 0 ? rawPrice : 0;
    const rawCompareAtPrice = toNumber(product.compareAtPrice);
    const compareAtPrice = safeDiscount && rawCompareAtPrice !== undefined ? rawCompareAtPrice : undefined;
    const hasDiscount = Boolean(safeDiscount);
    const discountPercent = safeDiscount?.percent || 0;
    const inventory = getProductCardInventory(product);
    const issues = validateProductCardInput(product, options);
    const readiness = getProductCardReadiness(issues);
    const image = selectProductCardImage(product, options);

    return {
        id: trimString(product.id) || '',
        name: getSafeProductTitle(product) || '',
        slug: trimString(product.slug),
        variant,
        visualVariant,
        price,
        compareAtPrice,
        displayPrice: safePrice.displayText || '',
        displayCompareAtPrice: compareAtPrice !== undefined ? formatProductCardPrice(compareAtPrice, currencySymbol) : undefined,
        hasDiscount,
        discountPercent,
        currencySymbol,
        image,
        badges: getProductCardBadges(product, hasDiscount, discountPercent, inventory, options),
        rating: getProductCardRating(product, options),
        inventory,
        issues,
        readiness,
        isRenderable: isRenderableStorefrontProduct(product, { currencySymbol }),
    };
};
