import { Product, Category, Customer, Order, OrderItem, Review, Discount, DiscountType, StoreSettings, Cart, StoredTimestamp } from '../types/ecommerce';
import { StoreUser, StoreUserRole, StoreUserStatus, UserSegment, SegmentType, UserActivity, ActivityType } from '../types/storeUsers';
import { toStoredTimestamp } from './supabaseMappers';

const dataFor = (row: any): Record<string, any> => row?.data || {};
const valueFor = (row: any, snakeKey: string, camelKey: string = snakeKey): any =>
    row?.[snakeKey] ?? dataFor(row)[camelKey];
const optionalTimestamp = (value: any): StoredTimestamp | undefined => value ? toStoredTimestamp(value) : undefined;

export const mapProductFromDB = (row: any): Product => {
    const data = dataFor(row);
    const quantity = Number(valueFor(row, 'quantity') ?? 0);
    const lowStockThreshold = valueFor(row, 'low_stock_threshold', 'lowStockThreshold') ?? 5;

    return {
        id: row.id || data.id,
        name: valueFor(row, 'name') || '',
        slug: valueFor(row, 'slug') || '',
        description: valueFor(row, 'description') || '',
        shortDescription: valueFor(row, 'short_description', 'shortDescription'),
        price: Number(valueFor(row, 'price') ?? 0),
        compareAtPrice: valueFor(row, 'compare_at_price', 'compareAtPrice') != null
            ? Number(valueFor(row, 'compare_at_price', 'compareAtPrice'))
            : undefined,
        costPrice: valueFor(row, 'cost_price', 'costPrice') != null
            ? Number(valueFor(row, 'cost_price', 'costPrice'))
            : undefined,
        currency: valueFor(row, 'currency') || 'USD',
        sku: valueFor(row, 'sku') || undefined,
        barcode: valueFor(row, 'barcode') || undefined,
        quantity,
        trackInventory: valueFor(row, 'track_inventory', 'trackInventory') ?? true,
        lowStockThreshold,
        images: valueFor(row, 'images') || [],
        tags: valueFor(row, 'tags') || [],
        hasVariants: valueFor(row, 'has_variants', 'hasVariants') ?? false,
        variants: valueFor(row, 'variants') || [],
        options: valueFor(row, 'options') || [],
        status: valueFor(row, 'status') || 'draft',
        isDigital: valueFor(row, 'is_digital', 'isDigital') ?? false,
        isFeatured: valueFor(row, 'is_featured', 'isFeatured') ?? false,
        weight: valueFor(row, 'weight') != null ? Number(valueFor(row, 'weight')) : undefined,
        weightUnit: valueFor(row, 'weight_unit', 'weightUnit') || 'kg',
        categoryId: valueFor(row, 'category_id', 'categoryId') || undefined,
        createdAt: toStoredTimestamp(row.created_at || data.createdAt),
        updatedAt: toStoredTimestamp(row.updated_at || data.updatedAt),
    };
};

export const mapProductToDB = (product: Partial<Product>): any => {
    const data: any = {};
    if (product.name !== undefined) data.name = product.name;
    if (product.slug !== undefined) data.slug = product.slug;
    if (product.description !== undefined) data.description = product.description;
    if (product.shortDescription !== undefined) data.short_description = product.shortDescription;
    if (product.price !== undefined) data.price = product.price;
    if (product.compareAtPrice !== undefined) data.compare_at_price = product.compareAtPrice;
    if (product.costPrice !== undefined) data.cost_price = product.costPrice;
    if (product.currency !== undefined) data.currency = product.currency;
    if (product.sku !== undefined) data.sku = product.sku;
    if (product.barcode !== undefined) data.barcode = product.barcode;
    if (product.quantity !== undefined) data.quantity = product.quantity;
    if (product.trackInventory !== undefined) data.track_inventory = product.trackInventory;
    if (product.lowStockThreshold !== undefined) data.low_stock_threshold = product.lowStockThreshold;
    if (product.images !== undefined) data.images = product.images;
    if (product.tags !== undefined) data.tags = product.tags;
    if (product.hasVariants !== undefined) data.has_variants = product.hasVariants;
    if (product.variants !== undefined) data.variants = product.variants;
    if (product.options !== undefined) data.options = product.options;
    if (product.status !== undefined) data.status = product.status;
    if (product.isDigital !== undefined) data.is_digital = product.isDigital;
    if (product.isFeatured !== undefined) data.is_featured = product.isFeatured;
    if (product.weight !== undefined) data.weight = product.weight;
    if (product.weightUnit !== undefined) data.weight_unit = product.weightUnit;
    if (product.categoryId !== undefined) data.category_id = product.categoryId;
    return data;
};

export const mapCategoryFromDB = (row: any): Category => ({
    id: row.id || dataFor(row).id,
    name: valueFor(row, 'name') || '',
    slug: valueFor(row, 'slug') || '',
    description: valueFor(row, 'description') || undefined,
    imageUrl: valueFor(row, 'image_url', 'imageUrl') || dataFor(row).image || undefined,
    parentId: valueFor(row, 'parent_id', 'parentId') || undefined,
    position: valueFor(row, 'position') ?? dataFor(row).order ?? 0,
    createdAt: toStoredTimestamp(row.created_at || dataFor(row).createdAt),
    updatedAt: toStoredTimestamp(row.updated_at || dataFor(row).updatedAt),
});

export const mapCategoryToDB = (category: Partial<Category>): any => {
    const data: any = {};
    if (category.name !== undefined) data.name = category.name;
    if (category.slug !== undefined) data.slug = category.slug;
    if (category.description !== undefined) data.description = category.description;
    if (category.imageUrl !== undefined) data.image_url = category.imageUrl;
    if (category.parentId !== undefined) data.parent_id = category.parentId;
    if (category.position !== undefined) data.position = category.position;
    return data;
};

export const mapOrderFromDB = (row: any): Order => ({
    id: row.id || dataFor(row).id,
    orderNumber: valueFor(row, 'order_number', 'orderNumber') || '',
    customerId: valueFor(row, 'customer_id', 'customerId') || undefined,
    customerEmail: valueFor(row, 'customer_email', 'customerEmail') || '',
    customerName: valueFor(row, 'customer_name', 'customerName') || '',
    customerPhone: valueFor(row, 'customer_phone', 'customerPhone') || undefined,
    items: valueFor(row, 'items') || [],
    subtotal: Number(valueFor(row, 'subtotal') ?? 0),
    discount: Number(valueFor(row, 'discount') ?? 0),
    discountCode: valueFor(row, 'discount_code', 'discountCode') || undefined,
    discountAmount: valueFor(row, 'discount_amount', 'discountAmount') != null
        ? Number(valueFor(row, 'discount_amount', 'discountAmount'))
        : undefined,
    shippingCost: Number(valueFor(row, 'shipping_cost', 'shippingCost') ?? 0),
    taxAmount: Number(valueFor(row, 'tax_amount', 'taxAmount') ?? 0),
    total: Number(valueFor(row, 'total') ?? 0),
    currency: valueFor(row, 'currency') || 'USD',
    pricing: valueFor(row, 'pricing'),
    checkoutIdempotencyKey: valueFor(row, 'checkout_idempotency_key', 'checkoutIdempotencyKey'),
    cartHash: valueFor(row, 'cart_hash', 'cartHash'),
    stripe: valueFor(row, 'stripe'),
    shippingAddress: valueFor(row, 'shipping_address', 'shippingAddress'),
    billingAddress: valueFor(row, 'billing_address', 'billingAddress'),
    status: valueFor(row, 'status') || 'pending',
    paymentStatus: valueFor(row, 'payment_status', 'paymentStatus') || 'pending',
    fulfillmentStatus: valueFor(row, 'fulfillment_status', 'fulfillmentStatus') || 'unfulfilled',
    paymentMethod: valueFor(row, 'payment_method', 'paymentMethod') || '',
    paymentIntentId: valueFor(row, 'payment_intent_id', 'paymentIntentId') || undefined,
    paidAt: optionalTimestamp(valueFor(row, 'paid_at', 'paidAt')),
    shippingMethod: valueFor(row, 'shipping_method', 'shippingMethod') || undefined,
    trackingNumber: valueFor(row, 'tracking_number', 'trackingNumber') || undefined,
    trackingUrl: valueFor(row, 'tracking_url', 'trackingUrl') || undefined,
    carrier: valueFor(row, 'carrier') || undefined,
    shippedAt: optionalTimestamp(valueFor(row, 'shipped_at', 'shippedAt')),
    deliveredAt: optionalTimestamp(valueFor(row, 'delivered_at', 'deliveredAt')),
    notes: valueFor(row, 'notes') || undefined,
    customerNotes: valueFor(row, 'customer_notes', 'customerNotes') || undefined,
    internalNotes: valueFor(row, 'internal_notes', 'internalNotes') || undefined,
    createdAt: toStoredTimestamp(row.created_at || dataFor(row).createdAt),
    updatedAt: toStoredTimestamp(row.updated_at || dataFor(row).updatedAt),
    cancelledAt: optionalTimestamp(valueFor(row, 'cancelled_at', 'cancelledAt')),
    refundedAt: optionalTimestamp(valueFor(row, 'refunded_at', 'refundedAt')),
});

export const mapOrderToDB = (order: Partial<Order>): any => {
    const data: any = {};
    if (order.orderNumber !== undefined) data.order_number = order.orderNumber;
    if (order.customerId !== undefined) data.customer_id = order.customerId;
    if (order.customerEmail !== undefined) data.customer_email = order.customerEmail;
    if (order.customerName !== undefined) data.customer_name = order.customerName;
    if (order.customerPhone !== undefined) data.customer_phone = order.customerPhone;
    if (order.items !== undefined) data.items = order.items;
    if (order.subtotal !== undefined) data.subtotal = order.subtotal;
    if (order.discount !== undefined) data.discount = order.discount;
    if (order.discountCode !== undefined) data.discount_code = order.discountCode;
    if (order.discountAmount !== undefined) data.discount_amount = order.discountAmount;
    if (order.shippingCost !== undefined) data.shipping_cost = order.shippingCost;
    if (order.taxAmount !== undefined) data.tax_amount = order.taxAmount;
    if (order.total !== undefined) data.total = order.total;
    if (order.currency !== undefined) data.currency = order.currency;
    if (order.pricing !== undefined) data.pricing = order.pricing;
    if (order.checkoutIdempotencyKey !== undefined) data.checkout_idempotency_key = order.checkoutIdempotencyKey;
    if (order.cartHash !== undefined) data.cart_hash = order.cartHash;
    if (order.stripe !== undefined) data.stripe = order.stripe;
    if (order.shippingAddress !== undefined) data.shipping_address = order.shippingAddress;
    if (order.billingAddress !== undefined) data.billing_address = order.billingAddress;
    if (order.status !== undefined) data.status = order.status;
    if (order.paymentStatus !== undefined) data.payment_status = order.paymentStatus;
    if (order.fulfillmentStatus !== undefined) data.fulfillment_status = order.fulfillmentStatus;
    if (order.paymentMethod !== undefined) data.payment_method = order.paymentMethod;
    if (order.paymentIntentId !== undefined) data.payment_intent_id = order.paymentIntentId;
    if (order.shippingMethod !== undefined) data.shipping_method = order.shippingMethod;
    if (order.trackingNumber !== undefined) data.tracking_number = order.trackingNumber;
    if (order.trackingUrl !== undefined) data.tracking_url = order.trackingUrl;
    if (order.carrier !== undefined) data.carrier = order.carrier;
    if (order.notes !== undefined) data.notes = order.notes;
    if (order.customerNotes !== undefined) data.customer_notes = order.customerNotes;
    if (order.internalNotes !== undefined) data.internal_notes = order.internalNotes;
    // Note: timestamps like paidAt, shippedAt are handled separately or via DB default
    return data;
};

export const mapCustomerFromDB = (row: any): Customer => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    totalOrders: Number(row.total_orders || 0),
    totalSpent: Number(row.total_spent || 0),
    lastOrderAt: optionalTimestamp(row.last_order_at),
    defaultShippingAddress: row.default_shipping_address,
    defaultBillingAddress: row.default_billing_address,
    addresses: row.addresses || [],
    acceptsMarketing: row.accepts_marketing,
    tags: row.tags || [],
    notes: row.notes,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapCustomerToDB = (customer: Partial<Customer>): any => {
    const data: any = {};
    if (customer.email !== undefined) data.email = customer.email;
    if (customer.firstName !== undefined) data.first_name = customer.firstName;
    if (customer.lastName !== undefined) data.last_name = customer.lastName;
    if (customer.phone !== undefined) data.phone = customer.phone;
    if (customer.totalOrders !== undefined) data.total_orders = customer.totalOrders;
    if (customer.totalSpent !== undefined) data.total_spent = customer.totalSpent;
    if (customer.defaultShippingAddress !== undefined) data.default_shipping_address = customer.defaultShippingAddress;
    if (customer.defaultBillingAddress !== undefined) data.default_billing_address = customer.defaultBillingAddress;
    if (customer.addresses !== undefined) data.addresses = customer.addresses;
    if (customer.acceptsMarketing !== undefined) data.accepts_marketing = customer.acceptsMarketing;
    if (customer.tags !== undefined) data.tags = customer.tags;
    if (customer.notes !== undefined) data.notes = customer.notes;
    // Note: timestamps are handled separately or via DB default
    return data;
};

export const mapReviewFromDB = (row: any): Review => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    verifiedPurchase: row.verified_purchase,
    status: row.status,
    helpfulVotes: row.helpful_votes,
    images: row.images || [],
    adminResponse: row.admin_response,
    adminResponseAt: optionalTimestamp(row.admin_response_at),
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapReviewToDB = (review: Partial<Review>): any => {
    const data: any = {};
    if (review.productId !== undefined) data.product_id = review.productId;
    if (review.productName !== undefined) data.product_name = review.productName;
    if (review.customerName !== undefined) data.customer_name = review.customerName;
    if (review.customerEmail !== undefined) data.customer_email = review.customerEmail;
    if (review.rating !== undefined) data.rating = review.rating;
    if (review.title !== undefined) data.title = review.title;
    if (review.comment !== undefined) data.comment = review.comment;
    if (review.verifiedPurchase !== undefined) data.verified_purchase = review.verifiedPurchase;
    if (review.status !== undefined) data.status = review.status;
    if (review.helpfulVotes !== undefined) data.helpful_votes = review.helpfulVotes;
    if (review.images !== undefined) data.images = review.images;
    if (review.adminResponse !== undefined) data.admin_response = review.adminResponse;
    return data;
};

export const mapDiscountFromDB = (row: any): Discount => ({
    id: row.id,
    code: row.code,
    type: row.type as DiscountType,
    value: Number(row.value || 0),
    appliesTo: row.applies_to || 'all',
    productIds: row.product_ids || [],
    categoryIds: row.category_ids || [],
    minimumQuantity: row.minimum_quantity,
    maxUsesPerCustomer: row.max_uses_per_customer,
    customerEligibility: row.customer_eligibility || 'everyone',
    canCombine: row.can_combine ?? false,
    isAutomatic: row.is_automatic ?? false,
    minimumPurchase: row.minimum_purchase ? Number(row.minimum_purchase) : undefined,
    maxUses: row.max_uses,
    usedCount: row.used_count || 0,
    startsAt: toStoredTimestamp(row.starts_at),
    endsAt: row.ends_at ? toStoredTimestamp(row.ends_at) : undefined,
    isActive: row.is_active,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapDiscountToDB = (discount: Partial<Discount>): any => {
    const data: any = {};
    if (discount.code !== undefined) data.code = discount.code;
    if (discount.type !== undefined) data.type = discount.type;
    if (discount.value !== undefined) data.value = discount.value;
    if (discount.appliesTo !== undefined) data.applies_to = discount.appliesTo;
    if (discount.productIds !== undefined) data.product_ids = discount.productIds;
    if (discount.categoryIds !== undefined) data.category_ids = discount.categoryIds;
    if (discount.minimumPurchase !== undefined) data.minimum_purchase = discount.minimumPurchase;
    if (discount.minimumQuantity !== undefined) data.minimum_quantity = discount.minimumQuantity;
    if (discount.maxUses !== undefined) data.max_uses = discount.maxUses;
    if (discount.maxUsesPerCustomer !== undefined) data.max_uses_per_customer = discount.maxUsesPerCustomer;
    if (discount.usedCount !== undefined) data.used_count = discount.usedCount;
    if (discount.customerEligibility !== undefined) data.customer_eligibility = discount.customerEligibility;
    if (discount.canCombine !== undefined) data.can_combine = discount.canCombine;
    if (discount.isAutomatic !== undefined) data.is_automatic = discount.isAutomatic;
    if (discount.isActive !== undefined) data.is_active = discount.isActive;
    // Timestamps are handled separately
    return data;
};

export const mapStoreSettingsFromDB = (row: any): StoreSettings => ({
    storeName: valueFor(row, 'store_name', 'storeName') || '',
    storeEmail: valueFor(row, 'store_email', 'storeEmail') || '',
    storePhone: valueFor(row, 'store_phone', 'storePhone') || undefined,
    storeLogo: valueFor(row, 'store_logo', 'storeLogo') || undefined,
    currency: valueFor(row, 'currency') || 'USD',
    currencySymbol: valueFor(row, 'currency_symbol', 'currencySymbol') || '$',
    storefrontTheme: valueFor(row, 'storefront_theme', 'storefrontTheme'),
    taxEnabled: valueFor(row, 'tax_enabled', 'taxEnabled') ?? false,
    taxRate: Number(valueFor(row, 'tax_rate', 'taxRate') ?? 0),
    taxName: valueFor(row, 'tax_name', 'taxName') || 'Tax',
    taxIncluded: valueFor(row, 'tax_included', 'taxIncluded') ?? false,
    taxIncludedInPrice: valueFor(row, 'tax_included', 'taxIncludedInPrice') ?? false,
    shippingZones: valueFor(row, 'shipping_zones', 'shippingZones') || [],
    freeShippingThreshold: Number(valueFor(row, 'free_shipping_threshold', 'freeShippingThreshold') ?? 0),
    stripeEnabled: valueFor(row, 'stripe_enabled', 'stripeEnabled') ?? false,
    stripePublishableKey: valueFor(row, 'stripe_publishable_key', 'stripePublishableKey') || undefined,
    paypalEnabled: valueFor(row, 'paypal_enabled', 'paypalEnabled') ?? false,
    paypalClientId: valueFor(row, 'paypal_client_id', 'paypalClientId') || undefined,
    cashOnDeliveryEnabled: valueFor(row, 'cash_on_delivery_enabled', 'cashOnDeliveryEnabled') ?? true,
    stripeConnectAccountId: valueFor(row, 'stripe_connect_account_id', 'stripeConnectAccountId') || undefined,
    stripeConnectStatus: valueFor(row, 'stripe_connect_status', 'stripeConnectStatus'),
    stripeConnectChargesEnabled: valueFor(row, 'stripe_connect_charges_enabled', 'stripeConnectChargesEnabled') ?? false,
    stripeConnectPayoutsEnabled: valueFor(row, 'stripe_connect_payouts_enabled', 'stripeConnectPayoutsEnabled') ?? false,
    stripeConnectDetailsSubmitted: valueFor(row, 'stripe_connect_details_submitted', 'stripeConnectDetailsSubmitted') ?? false,
    orderNotificationEmail: valueFor(row, 'order_notification_email', 'orderNotificationEmail') || '',
    lowStockNotifications: valueFor(row, 'low_stock_notifications', 'lowStockNotifications') ?? true,
    lowStockThreshold: valueFor(row, 'low_stock_threshold', 'lowStockThreshold') ?? 5,
    notifyOnNewOrder: valueFor(row, 'notify_on_new_order', 'notifyOnNewOrder') ?? true,
    notifyOnLowStock: valueFor(row, 'notify_on_low_stock', 'notifyOnLowStock') ?? true,
    sendOrderConfirmation: valueFor(row, 'send_order_confirmation', 'sendOrderConfirmation') ?? true,
    sendShippingNotification: valueFor(row, 'send_shipping_notification', 'sendShippingNotification') ?? true,
    requirePhone: valueFor(row, 'require_phone', 'requirePhone') ?? false,
    requireShippingAddress: valueFor(row, 'require_shipping_address', 'requireShippingAddress') ?? true,
    termsAndConditionsUrl: valueFor(row, 'terms_and_conditions_url', 'termsAndConditionsUrl') || undefined,
    privacyPolicyUrl: valueFor(row, 'privacy_policy_url', 'privacyPolicyUrl') || undefined,
    isActive: valueFor(row, 'is_active', 'isActive') ?? true,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapStoreSettingsToDB = (settings: Partial<StoreSettings>): any => {
    const data: any = {};
    if (settings.storeName !== undefined) data.store_name = settings.storeName;
    if (settings.storeEmail !== undefined) data.store_email = settings.storeEmail;
    if (settings.storePhone !== undefined) data.store_phone = settings.storePhone;
    if (settings.storeLogo !== undefined) data.store_logo = settings.storeLogo;
    if (settings.currency !== undefined) data.currency = settings.currency;
    if (settings.currencySymbol !== undefined) data.currency_symbol = settings.currencySymbol;
    if (settings.storefrontTheme !== undefined) data.storefront_theme = settings.storefrontTheme;
    if (settings.taxEnabled !== undefined) data.tax_enabled = settings.taxEnabled;
    if (settings.taxRate !== undefined) data.tax_rate = settings.taxRate;
    if (settings.taxName !== undefined) data.tax_name = settings.taxName;
    if (settings.taxIncluded !== undefined) data.tax_included = settings.taxIncluded;
    if (settings.shippingZones !== undefined) data.shipping_zones = settings.shippingZones;
    if (settings.freeShippingThreshold !== undefined) data.free_shipping_threshold = settings.freeShippingThreshold;
    if (settings.stripeEnabled !== undefined) data.stripe_enabled = settings.stripeEnabled;
    if (settings.stripePublishableKey !== undefined) data.stripe_publishable_key = settings.stripePublishableKey;
    if (settings.paypalEnabled !== undefined) data.paypal_enabled = settings.paypalEnabled;
    if (settings.paypalClientId !== undefined) data.paypal_client_id = settings.paypalClientId;
    if (settings.cashOnDeliveryEnabled !== undefined) data.cash_on_delivery_enabled = settings.cashOnDeliveryEnabled;
    if (settings.stripeConnectAccountId !== undefined) data.stripe_connect_account_id = settings.stripeConnectAccountId;
    if (settings.stripeConnectStatus !== undefined) data.stripe_connect_status = settings.stripeConnectStatus;
    if (settings.stripeConnectChargesEnabled !== undefined) data.stripe_connect_charges_enabled = settings.stripeConnectChargesEnabled;
    if (settings.stripeConnectPayoutsEnabled !== undefined) data.stripe_connect_payouts_enabled = settings.stripeConnectPayoutsEnabled;
    if (settings.stripeConnectDetailsSubmitted !== undefined) data.stripe_connect_details_submitted = settings.stripeConnectDetailsSubmitted;
    if (settings.orderNotificationEmail !== undefined) data.order_notification_email = settings.orderNotificationEmail;
    if (settings.lowStockNotifications !== undefined) data.low_stock_notifications = settings.lowStockNotifications;
    if (settings.lowStockThreshold !== undefined) data.low_stock_threshold = settings.lowStockThreshold;
    if (settings.notifyOnNewOrder !== undefined) data.notify_on_new_order = settings.notifyOnNewOrder;
    if (settings.notifyOnLowStock !== undefined) data.notify_on_low_stock = settings.notifyOnLowStock;
    if (settings.sendOrderConfirmation !== undefined) data.send_order_confirmation = settings.sendOrderConfirmation;
    if (settings.sendShippingNotification !== undefined) data.send_shipping_notification = settings.sendShippingNotification;
    if (settings.requirePhone !== undefined) data.require_phone = settings.requirePhone;
    if (settings.requireShippingAddress !== undefined) data.require_shipping_address = settings.requireShippingAddress;
    if (settings.termsAndConditionsUrl !== undefined) data.terms_and_conditions_url = settings.termsAndConditionsUrl;
    if (settings.privacyPolicyUrl !== undefined) data.privacy_policy_url = settings.privacyPolicyUrl;
    if (settings.isActive !== undefined) data.is_active = settings.isActive;
    return data;
};

// ============================================================================
// STORE USERS MAPPERS
// ============================================================================

export const mapStoreUserFromDB = (row: any): StoreUser => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    photoURL: row.photo_url,
    phone: row.phone,
    role: row.role as StoreUserRole,
    status: row.status as StoreUserStatus,
    segments: row.segments || [],
    tags: row.tags || [],
    customerId: row.customer_id,
    totalOrders: row.total_orders,
    totalSpent: Number(row.total_spent),
    averageOrderValue: Number(row.average_order_value),
    lastLoginAt: row.last_login_at ? toStoredTimestamp(row.last_login_at) : undefined,
    lastOrderAt: row.last_order_at ? toStoredTimestamp(row.last_order_at) : undefined,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
    metadata: row.metadata || {},
    acceptsMarketing: row.accepts_marketing,
    preferredLanguage: row.preferred_language,
    internalNotes: row.internal_notes,
});

export const mapStoreUserToDB = (user: Partial<StoreUser>): any => {
    const data: any = {};
    if (user.email !== undefined) data.email = user.email;
    if (user.displayName !== undefined) data.display_name = user.displayName;
    if (user.firstName !== undefined) data.first_name = user.firstName;
    if (user.lastName !== undefined) data.last_name = user.lastName;
    if (user.photoURL !== undefined) data.photo_url = user.photoURL;
    if (user.phone !== undefined) data.phone = user.phone;
    if (user.role !== undefined) data.role = user.role;
    if (user.status !== undefined) data.status = user.status;
    if (user.segments !== undefined) data.segments = user.segments;
    if (user.tags !== undefined) data.tags = user.tags;
    if (user.customerId !== undefined) data.customer_id = user.customerId;
    if (user.totalOrders !== undefined) data.total_orders = user.totalOrders;
    if (user.totalSpent !== undefined) data.total_spent = user.totalSpent;
    if (user.averageOrderValue !== undefined) data.average_order_value = user.averageOrderValue;
    if (user.metadata !== undefined) data.metadata = user.metadata;
    if (user.acceptsMarketing !== undefined) data.accepts_marketing = user.acceptsMarketing;
    if (user.preferredLanguage !== undefined) data.preferred_language = user.preferredLanguage;
    if (user.internalNotes !== undefined) data.internal_notes = user.internalNotes;
    // Timestamps are handled separately or via DB default
    return data;
};

export const mapStoreUserSegmentFromDB = (row: any): UserSegment => ({
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    type: row.type as SegmentType,
    rules: row.rules || [],
    userCount: row.user_count,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapStoreUserSegmentToDB = (segment: Partial<UserSegment>): any => {
    const data: any = {};
    if (segment.name !== undefined) data.name = segment.name;
    if (segment.description !== undefined) data.description = segment.description;
    if (segment.color !== undefined) data.color = segment.color;
    if (segment.type !== undefined) data.type = segment.type;
    if (segment.rules !== undefined) data.rules = segment.rules;
    if (segment.userCount !== undefined) data.user_count = segment.userCount;
    return data;
};

export const mapStoreUserActivityFromDB = (row: any): UserActivity => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as ActivityType,
    description: row.description,
    metadata: row.metadata || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: toStoredTimestamp(row.created_at),
});

export const mapStoreUserActivityToDB = (activity: Partial<UserActivity>): any => {
    const data: any = {};
    if (activity.userId !== undefined) data.user_id = activity.userId;
    if (activity.type !== undefined) data.type = activity.type;
    if (activity.description !== undefined) data.description = activity.description;
    if (activity.metadata !== undefined) data.metadata = activity.metadata;
    if (activity.ipAddress !== undefined) data.ip_address = activity.ipAddress;
    if (activity.userAgent !== undefined) data.user_agent = activity.userAgent;
    return data;
};
