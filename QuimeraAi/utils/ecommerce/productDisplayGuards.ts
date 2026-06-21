import type { ProductCardInput } from '../../types/productCard';

export interface SafeProductPrice {
    value?: number;
    displayText?: string;
    shouldDisplay: boolean;
    isFree: boolean;
    isPriceInquiry: boolean;
}

export interface SafeDiscountBadge {
    label: string;
    percent: number;
}

interface ProductDisplayGuardOptions {
    currencySymbol?: string;
    allowPriceInquiry?: boolean;
}

const DEFAULT_PRICE_INQUIRY_LABEL = 'Consultar precio';
const PLACEHOLDER_PRODUCT_NAMES = new Set([
    'producto sin nombre',
    'unnamed product',
    'untitled product',
    'sin nombre',
]);

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const trimString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

const getField = (product: unknown, keys: string[]): unknown => {
    if (!isRecord(product)) return undefined;
    for (const key of keys) {
        if (product[key] !== undefined && product[key] !== null) return product[key];
    }
    return undefined;
};

export const getSafeProductTitle = (product: unknown): string | undefined => {
    const title = trimString(getField(product, ['name', 'title']));
    if (!title) return undefined;

    const normalizedTitle = title.toLocaleLowerCase();
    return PLACEHOLDER_PRODUCT_NAMES.has(normalizedTitle) ? undefined : title;
};

const getSafeProductId = (product: unknown): string | undefined => {
    const id = trimString(getField(product, ['id', 'productId']));
    if (!id) return undefined;

    const normalizedId = id.toLocaleLowerCase();
    if (normalizedId === 'placeholder' || normalizedId === 'fallback') return undefined;
    return id;
};

const parsePrice = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;

    const normalized = value.replace(/[$,\s]/g, '');
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const hasExplicitFreePrice = (product: unknown): boolean => {
    if (!isRecord(product)) return false;
    const metadata = isRecord(product.metadata) ? product.metadata : {};

    return product.allowFreePrice === true ||
        product.isFree === true ||
        product.priceStrategy === 'free' ||
        metadata.allowFreePrice === true ||
        metadata.freeProduct === true ||
        metadata.isFree === true ||
        metadata.priceStrategy === 'free';
};

const isTechnicalFallbackProduct = (product: unknown): boolean => {
    if (!isRecord(product)) return true;

    return product.isPlaceholder === true ||
        product.placeholder === true ||
        product.__placeholder === true ||
        product.isFallback === true ||
        product.__fallback === true ||
        product.source === 'placeholder' ||
        product.sourceType === 'placeholder';
};

export const getSafeProductPrice = (
    product: unknown,
    options: ProductDisplayGuardOptions = {},
): SafeProductPrice => {
    const currencySymbol = options.currencySymbol || '$';
    const allowPriceInquiry = options.allowPriceInquiry !== false;
    const rawPrice = parsePrice(getField(product, ['price', 'amount']));

    if (rawPrice === undefined) {
        return allowPriceInquiry
            ? {
                displayText: DEFAULT_PRICE_INQUIRY_LABEL,
                shouldDisplay: true,
                isFree: false,
                isPriceInquiry: true,
            }
            : {
                shouldDisplay: false,
                isFree: false,
                isPriceInquiry: false,
            };
    }

    if (rawPrice < 0) {
        return {
            shouldDisplay: false,
            isFree: false,
            isPriceInquiry: false,
        };
    }

    if (rawPrice === 0 && !hasExplicitFreePrice(product)) {
        return {
            value: 0,
            displayText: DEFAULT_PRICE_INQUIRY_LABEL,
            shouldDisplay: true,
            isFree: false,
            isPriceInquiry: true,
        };
    }

    return {
        value: rawPrice,
        displayText: `${currencySymbol}${rawPrice.toFixed(2)}`,
        shouldDisplay: true,
        isFree: rawPrice === 0,
        isPriceInquiry: false,
    };
};

export const getSafeDiscountBadge = (
    product: unknown,
): SafeDiscountBadge | undefined => {
    const price = parsePrice(getField(product, ['price', 'amount']));
    const compareAtPrice = parsePrice(getField(product, ['compareAtPrice', 'originalPrice']));

    if (price === undefined || compareAtPrice === undefined) return undefined;
    if (price <= 0 || compareAtPrice <= price) return undefined;

    const percent = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
    if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return undefined;

    return {
        label: `-${percent}%`,
        percent,
    };
};

export const isRenderableStorefrontProduct = (
    product: ProductCardInput | Record<string, any> | null | undefined,
    options: ProductDisplayGuardOptions = {},
): boolean => {
    if (isTechnicalFallbackProduct(product)) return false;
    if (!getSafeProductId(product)) return false;
    if (!getSafeProductTitle(product)) return false;

    const status = trimString(getField(product, ['status']))?.toLocaleLowerCase();
    if (status === 'archived') return false;

    const safePrice = getSafeProductPrice(product, options);
    return safePrice.shouldDisplay;
};

export const filterRenderableStorefrontProducts = <T extends ProductCardInput | Record<string, any>>(
    products: T[],
    options: ProductDisplayGuardOptions = {},
): T[] => products.filter(product => isRenderableStorefrontProduct(product, options));
