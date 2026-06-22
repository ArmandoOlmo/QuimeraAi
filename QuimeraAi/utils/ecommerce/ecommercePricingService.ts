import type {
    AppliedPricingDiscount,
    CartSubtotalResult,
    DiscountCalculationResult,
    EcommercePricingResult,
    EcommercePricingSnapshot,
    PricingCartInputItem,
    PricingCartLine,
    PricingDiscountRule,
    PricingProductSnapshot,
    PricingShippingMethod,
    PricingShippingRate,
    PricingStoreSettings,
    PricingTaxLine,
} from '../../types/ecommercePricing.ts';

const CALCULATION_VERSION = 'ecommerce-pricing-v1';

type TimestampInput = string | number | Date | { seconds?: number; _seconds?: number } | null | undefined;

interface CalculateCartSubtotalInput {
    items: PricingCartInputItem[];
    products: PricingProductSnapshot[];
    currency?: string | null;
}

interface ValidateDiscountInput {
    discount: PricingDiscountRule;
    canonicalItems: PricingCartLine[];
    subtotal: number;
    customerEmail?: string | null;
    now?: Date | string | number;
    requestedCode?: string | null;
}

interface CalculateDiscountInput {
    discounts?: PricingDiscountRule[];
    discountCode?: string | null;
    canonicalItems: PricingCartLine[];
    subtotal: number;
    customerEmail?: string | null;
    now?: Date | string | number;
}

interface CalculateShippingInput {
    settings?: PricingStoreSettings | null;
    discountedSubtotal: number;
    appliedDiscounts?: AppliedPricingDiscount[];
    shippingAddress?: Record<string, unknown> | null;
    shippingMethodId?: string | null;
    canonicalItems?: PricingCartLine[];
}

interface CalculateTaxesInput {
    settings?: PricingStoreSettings | null;
    taxableSubtotal: number;
    shippingAmount?: number;
}

interface CalculateCheckoutTotalsInput {
    currency?: string | null;
    cartItems?: PricingCartInputItem[];
    products?: PricingProductSnapshot[];
    canonicalItems?: PricingCartLine[];
    discounts?: PricingDiscountRule[];
    discountCode?: string | null;
    settings?: PricingStoreSettings | null;
    shippingAddress?: Record<string, unknown> | null;
    shippingMethodId?: string | null;
    customerEmail?: string | null;
    now?: Date | string | number;
    clientTotals?: Record<string, unknown> | null;
}

interface CreateOrderPricingSnapshotInput {
    currency: string;
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    total: number;
    appliedDiscounts: AppliedPricingDiscount[];
    shippingMethod: PricingShippingMethod | null;
    taxBreakdown: PricingTaxLine[];
    warnings?: string[];
    errors?: string[];
    calculatedAt?: Date | string | number;
}

const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
};

const roundMoney = (amount: unknown): number => {
    const parsed = toNumber(amount);
    return Math.round(parsed * 100) / 100;
};

const normalizeCurrency = (currency?: string | null): string =>
    String(currency || 'USD').trim().toUpperCase() || 'USD';

const normalizeVariantId = (variantId?: string | null): string | null => {
    const normalized = String(variantId || '').trim();
    return normalized || null;
};

const normalizeDiscountCode = (code: unknown): string =>
    String(code || '').trim().toUpperCase();

const asDate = (value?: Date | string | number): Date => {
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'string') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
};

const timestampMs = (value: TimestampInput): number | null => {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value > 9_999_999_999 ? value : value * 1000;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    return null;
};

const readData = (row: Record<string, unknown> | null | undefined): Record<string, unknown> => {
    const data = row?.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
};

const readField = (
    row: Record<string, unknown> | null | undefined,
    snakeKey: string,
    camelKey = snakeKey,
): unknown => {
    const data = readData(row);
    return row?.[camelKey] ?? row?.[snakeKey] ?? data[camelKey] ?? data[snakeKey];
};

const readStringArray = (
    row: Record<string, unknown> | null | undefined,
    snakeKey: string,
    camelKey = snakeKey,
): string[] => {
    const value = readField(row, snakeKey, camelKey);
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item)).filter(Boolean);
};

const itemKey = (productId: string, variantId?: string | null): string =>
    `${productId}:${normalizeVariantId(variantId) || 'default'}`;

const aggregateCartItems = (items: PricingCartInputItem[]): PricingCartInputItem[] => {
    const grouped = new Map<string, PricingCartInputItem>();
    for (const item of items || []) {
        const productId = String(item.productId || '').trim();
        const quantity = Math.floor(toNumber(item.quantity));
        if (!productId) continue;
        const key = itemKey(productId, item.variantId);
        const existing = grouped.get(key);
        if (existing) {
            existing.quantity += quantity;
        } else {
            grouped.set(key, {
                productId,
                variantId: normalizeVariantId(item.variantId),
                quantity,
            });
        }
    }
    return Array.from(grouped.values());
};

const getProduct = (products: PricingProductSnapshot[], productId: string): PricingProductSnapshot | null =>
    products.find((product) => String(product.id) === String(productId)) || null;

const getVariant = (product: PricingProductSnapshot, variantId?: string | null) => {
    const normalizedVariantId = normalizeVariantId(variantId);
    if (!normalizedVariantId) return undefined;
    return (product.variants || []).find((variant) => String(variant?.id) === normalizedVariantId);
};

const getAvailableQuantity = (product: PricingProductSnapshot, variantId?: string | null): number => {
    const variant = getVariant(product, variantId);
    if (variant) return Math.max(0, toNumber(variant.quantity));
    return Math.max(0, toNumber(product.inventoryQuantity ?? product.quantity));
};

const getUnitPrice = (product: PricingProductSnapshot, variantId?: string | null): number => {
    const variant = getVariant(product, variantId);
    return roundMoney(variant?.price ?? product.price);
};

const getLineName = (product: PricingProductSnapshot, variantId?: string | null): {
    name: string;
    productName: string;
    variantName?: string | null;
} => {
    const variant = getVariant(product, variantId);
    const productName = String(product.name || 'Product');
    const variantName = variant?.name || null;
    return {
        name: variantName ? `${productName} - ${variantName}` : productName,
        productName,
        variantName,
    };
};

const getImageUrl = (product: PricingProductSnapshot): string | null => {
    const first = product.images?.[0];
    if (!first) return null;
    if (typeof first === 'string') return first;
    return first.url || null;
};

const isProductPurchasable = (product: PricingProductSnapshot): boolean =>
    String(product.status || 'active').toLowerCase() === 'active';

const discountScope = (discount: PricingDiscountRule): string =>
    String(readField(discount as Record<string, unknown>, 'applies_to', 'appliesTo') || 'all');

const discountCode = (discount: PricingDiscountRule): string =>
    normalizeDiscountCode(readField(discount as Record<string, unknown>, 'code', 'code'));

const discountType = (discount: PricingDiscountRule): string =>
    String(readField(discount as Record<string, unknown>, 'type', 'type') || 'percentage');

const discountValue = (discount: PricingDiscountRule): number =>
    Math.max(0, toNumber(readField(discount as Record<string, unknown>, 'value', 'value')));

const discountCanCombine = (discount: PricingDiscountRule): boolean =>
    toBoolean(readField(discount as Record<string, unknown>, 'can_combine', 'canCombine'), false);

const discountIsAutomatic = (discount: PricingDiscountRule): boolean =>
    toBoolean(readField(discount as Record<string, unknown>, 'is_automatic', 'isAutomatic'), false);

const discountIsActive = (discount: PricingDiscountRule): boolean =>
    readField(discount as Record<string, unknown>, 'is_active', 'isActive') !== false;

const getDiscountEligibleItems = (discount: PricingDiscountRule, canonicalItems: PricingCartLine[]): PricingCartLine[] => {
    const scope = discountScope(discount);
    const productIds = readStringArray(discount as Record<string, unknown>, 'product_ids', 'productIds');
    const categoryIds = readStringArray(discount as Record<string, unknown>, 'category_ids', 'categoryIds');
    const excludedProductIds = readStringArray(discount as Record<string, unknown>, 'exclude_product_ids', 'excludeProductIds');

    return canonicalItems.filter((item) => {
        if (excludedProductIds.includes(String(item.productId))) return false;
        if (scope === 'specific_products') return productIds.includes(String(item.productId));
        if (scope === 'specific_categories') return Boolean(item.categoryId && categoryIds.includes(String(item.categoryId)));
        if (scope === 'specific_collections') return false;
        return true;
    });
};

const baseSnapshot = (input: CreateOrderPricingSnapshotInput): EcommercePricingSnapshot => ({
    calculationVersion: CALCULATION_VERSION,
    calculatedAt: asDate(input.calculatedAt).toISOString(),
    currency: normalizeCurrency(input.currency),
    subtotal: roundMoney(input.subtotal),
    discountTotal: roundMoney(input.discountAmount),
    shippingTotal: roundMoney(input.shippingAmount),
    taxTotal: roundMoney(input.taxAmount),
    platformFeeTotal: 0,
    total: roundMoney(Math.max(0, input.total)),
    appliedDiscounts: input.appliedDiscounts,
    discount: input.appliedDiscounts[0] || null,
    discountCode: input.appliedDiscounts[0]?.code || null,
    shippingMethod: input.shippingMethod,
    taxBreakdown: input.taxBreakdown,
    warnings: input.warnings || [],
    errors: input.errors || [],
});

export const calculateCartSubtotal = ({
    items,
    products,
    currency,
}: CalculateCartSubtotalInput): CartSubtotalResult => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const canonicalItems: PricingCartLine[] = [];
    const normalizedCurrency = normalizeCurrency(currency);

    for (const item of aggregateCartItems(items)) {
        const quantity = Math.floor(toNumber(item.quantity));
        if (quantity <= 0) {
            errors.push(`Invalid quantity for ${item.productId}`);
            continue;
        }

        const product = getProduct(products, item.productId);
        if (!product) {
            errors.push(`Product ${item.productId} not found`);
            continue;
        }

        if (!isProductPurchasable(product)) {
            errors.push(`Product ${product.name || product.id} is not available`);
            continue;
        }

        const variantId = normalizeVariantId(item.variantId);
        if (variantId && product.hasVariants && !getVariant(product, variantId)) {
            errors.push(`Variant ${variantId} not found for ${product.name || product.id}`);
            continue;
        }

        const trackInventory = product.trackInventory !== false;
        const availableQuantity = trackInventory ? getAvailableQuantity(product, variantId) : null;
        if (trackInventory && availableQuantity !== null && availableQuantity < quantity) {
            errors.push(`Insufficient stock for ${product.name || product.id}`);
            continue;
        }

        const unitPrice = getUnitPrice(product, variantId);
        if (unitPrice < 0) {
            errors.push(`Invalid price for ${product.name || product.id}`);
            continue;
        }

        const names = getLineName(product, variantId);
        canonicalItems.push({
            productId: item.productId,
            variantId,
            categoryId: product.categoryId || null,
            ...names,
            imageUrl: getImageUrl(product),
            quantity,
            trackInventory,
            availableQuantity,
            unitPrice,
            totalPrice: roundMoney(unitPrice * quantity),
            currency: product.currency || normalizedCurrency,
            isDigital: product.isDigital === true,
        });
    }

    const subtotal = roundMoney(canonicalItems.reduce((sum, item) => sum + item.totalPrice, 0));
    if (canonicalItems.length === 0 && errors.length === 0) errors.push('Cart is empty');

    return {
        subtotal,
        items: canonicalItems,
        warnings,
        errors,
    };
};

export const validateDiscount = ({
    discount,
    canonicalItems,
    subtotal,
    customerEmail,
    now: nowInput,
    requestedCode,
}: ValidateDiscountInput): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = asDate(nowInput).getTime();
    const code = discountCode(discount);
    const requested = normalizeDiscountCode(requestedCode);
    const startsAt = timestampMs(readField(discount as Record<string, unknown>, 'starts_at', 'startsAt') as TimestampInput);
    const endsAt = timestampMs(readField(discount as Record<string, unknown>, 'ends_at', 'endsAt') as TimestampInput);
    const maxUses = toNumber(readField(discount as Record<string, unknown>, 'max_uses', 'maxUses'));
    const usedCount = toNumber(readField(discount as Record<string, unknown>, 'used_count', 'usedCount'));
    const maxUsesPerCustomer = toNumber(readField(discount as Record<string, unknown>, 'max_uses_per_customer', 'maxUsesPerCustomer'));
    const customerUsageCount = toNumber(readField(discount as Record<string, unknown>, 'customer_usage_count', 'customerUsageCount'));
    const minimumPurchase = toNumber(readField(discount as Record<string, unknown>, 'minimum_purchase', 'minimumPurchase'));
    const minimumQuantity = toNumber(readField(discount as Record<string, unknown>, 'minimum_quantity', 'minimumQuantity'));
    const customerEligibility = String(readField(discount as Record<string, unknown>, 'customer_eligibility', 'customerEligibility') || 'everyone');
    const totalQuantity = canonicalItems.reduce((sum, item) => sum + item.quantity, 0);

    if (requested && code !== requested) errors.push('Discount code mismatch');
    if (!discountIsActive(discount)) errors.push('Discount is inactive');
    if (startsAt && startsAt > now) errors.push('Discount has not started');
    if (endsAt && endsAt < now) errors.push('Discount expired');
    if (maxUses > 0 && usedCount >= maxUses) errors.push('Discount usage limit reached');
    if (maxUsesPerCustomer > 0 && customerUsageCount >= maxUsesPerCustomer) {
        errors.push('Discount customer usage limit reached');
    }
    if (minimumPurchase > 0 && subtotal < minimumPurchase) errors.push('Discount minimum subtotal not met');
    if (minimumQuantity > 0 && totalQuantity < minimumQuantity) errors.push('Discount minimum quantity not met');

    const normalizedEmail = String(customerEmail || '').trim().toLowerCase();
    if (customerEligibility === 'first_purchase' && !normalizedEmail) {
        errors.push('Customer email is required for this discount');
    } else if (!['everyone', 'all', 'first_purchase'].includes(customerEligibility)) {
        errors.push('Discount customer eligibility is not supported at checkout');
    }

    const eligibleItems = getDiscountEligibleItems(discount, canonicalItems);
    if (eligibleItems.length === 0) errors.push('Discount does not apply to cart items');

    return { valid: errors.length === 0, errors, warnings };
};

export const calculateDiscount = ({
    discounts = [],
    discountCode: requestedCodeInput,
    canonicalItems,
    subtotal,
    customerEmail,
    now,
}: CalculateDiscountInput): DiscountCalculationResult => {
    const requestedCode = normalizeDiscountCode(requestedCodeInput);
    const warnings: string[] = [];
    const errors: string[] = [];
    const appliedDiscounts: AppliedPricingDiscount[] = [];

    const candidates = discounts.filter((discount) => {
        const codeMatches = requestedCode && discountCode(discount) === requestedCode;
        return codeMatches || discountIsAutomatic(discount);
    });

    if (requestedCode && !candidates.some((discount) => discountCode(discount) === requestedCode)) {
        errors.push('Codigo de descuento invalido');
        return { discountAmount: 0, appliedDiscounts, freeShipping: false, warnings, errors };
    }

    const sortedCandidates = [...candidates].sort((a, b) => {
        const aRequested = requestedCode && discountCode(a) === requestedCode ? 0 : 1;
        const bRequested = requestedCode && discountCode(b) === requestedCode ? 0 : 1;
        return aRequested - bRequested;
    });

    let discountAmount = 0;
    let freeShipping = false;

    for (const discount of sortedCandidates) {
        const isRequested = requestedCode && discountCode(discount) === requestedCode;
        const validation = validateDiscount({
            discount,
            canonicalItems,
            subtotal,
            customerEmail,
            now,
            requestedCode: isRequested ? requestedCode : null,
        });

        if (!validation.valid) {
            if (isRequested) {
                errors.push(validation.errors[0] || 'Codigo de descuento invalido');
                return { discountAmount, appliedDiscounts, freeShipping, warnings, errors };
            }
            warnings.push(...validation.errors.map((error) => `automatic_discount_skipped:${error}`));
            continue;
        }

        const canCombine = discountCanCombine(discount);
        if (appliedDiscounts.length > 0) {
            const allExistingCanCombine = appliedDiscounts.every((applied) => applied.canCombine);
            if (!allExistingCanCombine || !canCombine) {
                warnings.push('discount_not_combined');
                continue;
            }
        }

        const type = discountType(discount);
        const value = discountValue(discount);
        const eligibleItems = getDiscountEligibleItems(discount, canonicalItems);
        const eligibleSubtotal = roundMoney(eligibleItems.reduce((sum, item) => sum + item.totalPrice, 0));
        const remainingDiscountableSubtotal = Math.max(0, subtotal - discountAmount);
        let amount = 0;

        if (type === 'percentage') {
            amount = roundMoney(Math.min(remainingDiscountableSubtotal, eligibleSubtotal * (value / 100)));
        } else if (type === 'fixed_amount') {
            amount = roundMoney(Math.min(remainingDiscountableSubtotal, eligibleSubtotal, value));
        } else if (type === 'free_shipping') {
            freeShipping = true;
        } else {
            if (isRequested) {
                errors.push('Este tipo de descuento todavia no esta disponible en checkout');
                return { discountAmount, appliedDiscounts, freeShipping, warnings, errors };
            }
            warnings.push(`automatic_discount_skipped:unsupported_type:${type}`);
            continue;
        }

        if (amount <= 0 && type !== 'free_shipping') {
            if (isRequested) {
                errors.push('El codigo no aplica a los productos del carrito');
                return { discountAmount, appliedDiscounts, freeShipping, warnings, errors };
            }
            continue;
        }

        discountAmount = roundMoney(Math.min(subtotal, discountAmount + amount));
        appliedDiscounts.push({
            id: String(readField(discount as Record<string, unknown>, 'id', 'id') || '') || null,
            code: discountCode(discount) || null,
            type,
            value,
            amount,
            freeShipping: type === 'free_shipping',
            scope: discountScope(discount),
            canCombine,
            isAutomatic: discountIsAutomatic(discount),
        });
    }

    return {
        discountAmount: roundMoney(Math.min(subtotal, discountAmount)),
        appliedDiscounts,
        freeShipping,
        warnings,
        errors,
    };
};

const destinationMatchesZone = (zone: Record<string, unknown>, shippingAddress?: Record<string, unknown> | null): boolean => {
    const countries = Array.isArray(zone.countries)
        ? zone.countries.map((country) => String(country).toUpperCase())
        : [];
    if (countries.length === 0 || countries.includes('*')) return true;
    const country = String(shippingAddress?.country || shippingAddress?.countryCode || '').trim().toUpperCase();
    return country ? countries.includes(country) : true;
};

const fallbackShippingRates = (): PricingShippingRate[] => [
    { id: 'standard', name: 'Envio Estandar', price: 99, estimatedDays: '5-7 dias habiles' },
    { id: 'express', name: 'Envio Express', price: 199, estimatedDays: '2-3 dias habiles' },
    { id: 'overnight', name: 'Entrega al Siguiente Dia', price: 349, estimatedDays: '1 dia habil' },
];

const isPickupMethod = (shippingMethodId?: string | null): boolean =>
    ['pickup', 'local_pickup', 'local-pickup'].includes(String(shippingMethodId || '').trim().toLowerCase());

export const calculateShipping = ({
    settings,
    discountedSubtotal,
    appliedDiscounts = [],
    shippingAddress,
    shippingMethodId,
    canonicalItems = [],
}: CalculateShippingInput): { amount: number; method: PricingShippingMethod | null; warnings: string[]; errors: string[] } => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const data = readData(settings as Record<string, unknown>);
    const allDigital = canonicalItems.length > 0 && canonicalItems.every((item) => item.isDigital === true);
    const shippingDisabled = toBoolean(settings?.shippingDisabled ?? data.shippingDisabled ?? data.shipping_disabled, false);
    const shippingEnabled = settings?.shippingEnabled ?? data.shippingEnabled ?? data.shipping_enabled;
    const pickupEnabled = toBoolean(settings?.pickupEnabled ?? settings?.localPickupEnabled ?? data.pickupEnabled ?? data.localPickupEnabled, false);

    if (allDigital) {
        return {
            amount: 0,
            method: { id: 'digital', name: 'Digital delivery', amount: 0, source: 'digital' },
            warnings,
            errors,
        };
    }

    if (shippingDisabled || shippingEnabled === false) {
        return {
            amount: 0,
            method: { id: 'shipping_disabled', name: 'Shipping disabled', amount: 0, source: 'disabled' },
            warnings,
            errors,
        };
    }

    if (pickupEnabled || isPickupMethod(shippingMethodId)) {
        return {
            amount: 0,
            method: { id: shippingMethodId || 'pickup', name: 'Local pickup', amount: 0, source: 'pickup' },
            warnings,
            errors,
        };
    }

    const zones = Array.isArray(settings?.shippingZones) ? settings?.shippingZones || [] : [];
    const matchingZones = zones.filter((zone) => destinationMatchesZone(zone as Record<string, unknown>, shippingAddress));
    const configuredRates = (matchingZones.length > 0 ? matchingZones : zones).flatMap((zone) => zone.rates || []);
    const rates = configuredRates.length > 0 ? configuredRates : fallbackShippingRates();
    if (configuredRates.length === 0) warnings.push('shipping_fallback_rate');

    if (zones.length > 0 && matchingZones.length === 0) {
        errors.push('No shipping methods are available for this destination');
        return { amount: 0, method: null, warnings, errors };
    }

    const eligibleRates = rates.filter((rate) => {
        const minOrder = toNumber(rate.minOrderAmount ?? rate.minOrder);
        return !minOrder || discountedSubtotal >= minOrder;
    });

    if (eligibleRates.length === 0) {
        errors.push('Cart subtotal does not meet shipping method minimums');
        return { amount: 0, method: null, warnings, errors };
    }

    const selectedRate = eligibleRates.find((rate) => String(rate.id || '') === String(shippingMethodId || '')) || eligibleRates[0];
    if (shippingMethodId && selectedRate.id !== shippingMethodId) warnings.push('shipping_method_recalculated');

    const freeShippingThreshold = toNumber(settings?.freeShippingThreshold ?? data.freeShippingThreshold);
    const hasFreeShippingDiscount = appliedDiscounts.some((discount) => discount.freeShipping);
    let amount = roundMoney(selectedRate.price);
    let name = selectedRate.name || 'Standard';
    if (hasFreeShippingDiscount || (freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold)) {
        amount = 0;
        name = 'Free Shipping';
    }

    return {
        amount,
        method: {
            id: selectedRate.id || null,
            name,
            amount,
            estimatedDays: selectedRate.estimatedDays || null,
            source: configuredRates.length > 0 ? 'configured' : 'fallback',
        },
        warnings,
        errors,
    };
};

export const calculateTaxes = ({
    settings,
    taxableSubtotal,
    shippingAmount = 0,
}: CalculateTaxesInput): { amount: number; breakdown: PricingTaxLine[]; warnings: string[]; errors: string[] } => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const data = readData(settings as Record<string, unknown>);
    const taxEnabled = toBoolean(settings?.taxEnabled ?? data.taxEnabled ?? data.tax_enabled, false);
    const taxIncluded = toBoolean(
        settings?.taxIncluded ?? settings?.taxIncludedInPrice ?? data.taxIncluded ?? data.taxIncludedInPrice,
        false,
    );
    const taxRate = toNumber(settings?.taxRate ?? data.taxRate ?? data.tax_rate);
    const taxShipping = toBoolean(settings?.taxShipping ?? data.taxShipping ?? data.tax_shipping, false);
    const taxName = String(settings?.taxName || data.taxName || data.tax_name || 'Tax');

    if (!taxEnabled || taxRate <= 0) {
        warnings.push('tax_not_configured');
        return { amount: 0, breakdown: [], warnings, errors };
    }

    const taxableAmount = roundMoney(Math.max(0, taxableSubtotal) + (taxShipping ? Math.max(0, shippingAmount) : 0));
    if (taxIncluded) {
        return {
            amount: 0,
            breakdown: [{ name: taxName, rate: taxRate, taxableAmount, amount: 0, included: true }],
            warnings,
            errors,
        };
    }

    const amount = roundMoney(taxableAmount * (taxRate / 100));
    return {
        amount,
        breakdown: [{ name: taxName, rate: taxRate, taxableAmount, amount, included: false }],
        warnings,
        errors,
    };
};

export const createOrderPricingSnapshot = (input: CreateOrderPricingSnapshotInput): EcommercePricingSnapshot =>
    baseSnapshot(input);

export const calculateCheckoutTotals = (input: CalculateCheckoutTotalsInput): EcommercePricingResult => {
    const currency = normalizeCurrency(input.currency || input.settings?.currency);
    const subtotalResult = input.canonicalItems
        ? {
            subtotal: roundMoney(input.canonicalItems.reduce((sum, item) => sum + item.totalPrice, 0)),
            items: input.canonicalItems,
            warnings: [],
            errors: [],
        }
        : calculateCartSubtotal({
            items: input.cartItems || [],
            products: input.products || [],
            currency,
        });
    const warnings = [...subtotalResult.warnings];
    const errors = [...subtotalResult.errors];

    const discount = calculateDiscount({
        discounts: input.discounts || [],
        discountCode: input.discountCode,
        canonicalItems: subtotalResult.items,
        subtotal: subtotalResult.subtotal,
        customerEmail: input.customerEmail,
        now: input.now,
    });
    warnings.push(...discount.warnings);
    errors.push(...discount.errors);

    const discountedSubtotal = roundMoney(Math.max(0, subtotalResult.subtotal - discount.discountAmount));
    const shipping = calculateShipping({
        settings: input.settings,
        discountedSubtotal,
        appliedDiscounts: discount.appliedDiscounts,
        shippingAddress: input.shippingAddress,
        shippingMethodId: input.shippingMethodId,
        canonicalItems: subtotalResult.items,
    });
    warnings.push(...shipping.warnings);
    errors.push(...shipping.errors);

    const taxes = calculateTaxes({
        settings: input.settings,
        taxableSubtotal: discountedSubtotal,
        shippingAmount: shipping.amount,
    });
    warnings.push(...taxes.warnings);
    errors.push(...taxes.errors);

    const total = roundMoney(Math.max(0, discountedSubtotal + shipping.amount + taxes.amount));
    const clientTotal = toNumber(input.clientTotals?.total ?? input.clientTotals?.totalAmount, NaN);
    if (Number.isFinite(clientTotal) && roundMoney(clientTotal) !== total) warnings.push('client_total_ignored');

    const snapshot = createOrderPricingSnapshot({
        currency,
        subtotal: subtotalResult.subtotal,
        discountAmount: discount.discountAmount,
        shippingAmount: shipping.amount,
        taxAmount: taxes.amount,
        total,
        appliedDiscounts: discount.appliedDiscounts,
        shippingMethod: shipping.method,
        taxBreakdown: taxes.breakdown,
        warnings,
        errors,
        calculatedAt: input.now,
    });

    return {
        currency,
        subtotal: subtotalResult.subtotal,
        discountAmount: discount.discountAmount,
        shippingAmount: shipping.amount,
        taxAmount: taxes.amount,
        total,
        appliedDiscounts: discount.appliedDiscounts,
        shippingMethod: shipping.method,
        taxBreakdown: taxes.breakdown,
        warnings,
        errors,
        snapshot,
    };
};
