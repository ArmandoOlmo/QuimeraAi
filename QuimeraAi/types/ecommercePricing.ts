export type PricingProductStatus = 'active' | 'draft' | 'archived' | string;

export type PricingDiscountType =
    | 'percentage'
    | 'fixed_amount'
    | 'free_shipping'
    | 'buy_x_get_y'
    | string;

export interface PricingCartInputItem {
    productId: string;
    variantId?: string | null;
    quantity: number;
}

export interface PricingProductVariantSnapshot {
    id: string;
    name?: string | null;
    price?: number | string | null;
    quantity?: number | string | null;
    trackInventory?: boolean | null;
}

export interface PricingProductSnapshot {
    id: string;
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    name: string;
    status?: PricingProductStatus | null;
    price?: number | string | null;
    quantity?: number | string | null;
    inventoryQuantity?: number | string | null;
    trackInventory?: boolean | null;
    lowStockThreshold?: number | string | null;
    hasVariants?: boolean | null;
    variants?: PricingProductVariantSnapshot[] | null;
    images?: Array<string | { url?: string | null }> | null;
    categoryId?: string | null;
    currency?: string | null;
    isDigital?: boolean | null;
}

export interface PricingCartLine {
    productId: string;
    variantId?: string | null;
    categoryId?: string | null;
    name: string;
    productName: string;
    variantName?: string | null;
    imageUrl?: string | null;
    quantity: number;
    trackInventory: boolean;
    availableQuantity?: number | null;
    unitPrice: number;
    totalPrice: number;
    currency?: string | null;
    isDigital?: boolean | null;
}

export interface PricingStoreSettings {
    currency?: string | null;
    taxEnabled?: boolean | null;
    taxRate?: number | string | null;
    taxName?: string | null;
    taxIncluded?: boolean | null;
    taxIncludedInPrice?: boolean | null;
    taxShipping?: boolean | null;
    shippingZones?: PricingShippingZone[] | null;
    freeShippingThreshold?: number | string | null;
    requireShippingAddress?: boolean | null;
    shippingEnabled?: boolean | null;
    shippingDisabled?: boolean | null;
    pickupEnabled?: boolean | null;
    localPickupEnabled?: boolean | null;
    data?: Record<string, unknown> | null;
}

export interface PricingShippingRate {
    id?: string | null;
    name?: string | null;
    description?: string | null;
    price?: number | string | null;
    minOrderAmount?: number | string | null;
    minOrder?: number | string | null;
    estimatedDays?: string | null;
    type?: string | null;
}

export interface PricingShippingZone {
    id?: string | null;
    name?: string | null;
    countries?: string[] | null;
    rates?: PricingShippingRate[] | null;
}

export interface PricingDiscountRule {
    id?: string | null;
    code?: string | null;
    type?: PricingDiscountType | null;
    value?: number | string | null;
    appliesTo?: string | null;
    applies_to?: string | null;
    productIds?: string[] | null;
    product_ids?: string[] | null;
    categoryIds?: string[] | null;
    category_ids?: string[] | null;
    excludeProductIds?: string[] | null;
    exclude_product_ids?: string[] | null;
    minimumPurchase?: number | string | null;
    minimum_purchase?: number | string | null;
    minimumQuantity?: number | string | null;
    minimum_quantity?: number | string | null;
    maxUses?: number | string | null;
    max_uses?: number | string | null;
    maxUsesPerCustomer?: number | string | null;
    max_uses_per_customer?: number | string | null;
    usedCount?: number | string | null;
    used_count?: number | string | null;
    customerUsageCount?: number | string | null;
    customer_usage_count?: number | string | null;
    customerEligibility?: string | null;
    customer_eligibility?: string | null;
    canCombine?: boolean | null;
    can_combine?: boolean | null;
    startsAt?: unknown;
    starts_at?: unknown;
    endsAt?: unknown;
    ends_at?: unknown;
    isActive?: boolean | null;
    is_active?: boolean | null;
    isAutomatic?: boolean | null;
    is_automatic?: boolean | null;
    data?: Record<string, unknown> | null;
}

export interface AppliedPricingDiscount {
    id?: string | null;
    code?: string | null;
    type: PricingDiscountType;
    value: number;
    amount: number;
    freeShipping: boolean;
    scope: string;
    canCombine: boolean;
    isAutomatic: boolean;
}

export interface PricingShippingMethod {
    id?: string | null;
    name: string;
    amount: number;
    estimatedDays?: string | null;
    source: 'configured' | 'fallback' | 'pickup' | 'disabled' | 'digital';
}

export interface PricingTaxLine {
    name: string;
    rate: number;
    taxableAmount: number;
    amount: number;
    included: boolean;
}

export interface EcommercePricingSnapshot {
    calculationVersion: string;
    calculatedAt: string;
    currency: string;
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    platformFeeTotal: number;
    total: number;
    appliedDiscounts: AppliedPricingDiscount[];
    discount?: AppliedPricingDiscount | null;
    discountCode?: string | null;
    shippingMethod: PricingShippingMethod | null;
    taxBreakdown: PricingTaxLine[];
    warnings: string[];
    errors: string[];
}

export interface EcommercePricingResult {
    currency: string;
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    total: number;
    appliedDiscounts: AppliedPricingDiscount[];
    shippingMethod: PricingShippingMethod | null;
    taxBreakdown: PricingTaxLine[];
    warnings: string[];
    errors: string[];
    snapshot: EcommercePricingSnapshot;
}

export interface CartSubtotalResult {
    subtotal: number;
    items: PricingCartLine[];
    warnings: string[];
    errors: string[];
}

export interface DiscountCalculationResult {
    discountAmount: number;
    appliedDiscounts: AppliedPricingDiscount[];
    freeShipping: boolean;
    warnings: string[];
    errors: string[];
}
