import { Product, Category, Customer, Order, OrderItem, Review, Discount, DiscountType, StoreSettings, Cart, StoredTimestamp } from '../types/ecommerce';
import { StoreUser, StoreUserRole, StoreUserStatus, UserSegment, SegmentType, UserActivity, ActivityType } from '../types/storeUsers';
import { toStoredTimestamp } from './supabaseMappers';

export const mapProductFromDB = (row: any): Product => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.short_description,
    price: Number(row.price || 0),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    costPrice: row.cost_price ? Number(row.cost_price) : undefined,
    currency: row.currency,
    sku: row.sku,
    barcode: row.barcode,
    quantity: Number(row.quantity || 0),
    trackInventory: row.track_inventory,
    lowStockThreshold: row.low_stock_threshold,
    images: row.images || [],
    tags: row.tags || [],
    hasVariants: row.has_variants,
    variants: row.variants || [],
    options: row.options || [],
    status: row.status,
    isDigital: row.is_digital,
    isFeatured: row.is_featured,
    weight: row.weight ? Number(row.weight) : undefined,
    weightUnit: row.weight_unit,
    categoryId: row.category_id,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

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
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    parentId: row.parent_id,
    position: row.position,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
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
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items: row.items || [],
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    discountCode: row.discount_code,
    discountAmount: row.discount_amount ? Number(row.discount_amount) : undefined,
    shippingCost: Number(row.shipping_cost || 0),
    taxAmount: Number(row.tax_amount || 0),
    total: Number(row.total || 0),
    currency: row.currency,
    pricing: row.pricing,
    checkoutIdempotencyKey: row.checkout_idempotency_key,
    cartHash: row.cart_hash,
    stripe: row.stripe,
    shippingAddress: row.shipping_address,
    billingAddress: row.billing_address,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    paymentMethod: row.payment_method,
    paymentIntentId: row.payment_intent_id,
    paidAt: toStoredTimestamp(row.paid_at),
    shippingMethod: row.shipping_method,
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    carrier: row.carrier,
    shippedAt: toStoredTimestamp(row.shipped_at),
    deliveredAt: toStoredTimestamp(row.delivered_at),
    notes: row.notes,
    customerNotes: row.customer_notes,
    internalNotes: row.internal_notes,
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
    cancelledAt: toStoredTimestamp(row.cancelled_at),
    refundedAt: toStoredTimestamp(row.refunded_at),
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
    lastOrderAt: toStoredTimestamp(row.last_order_at),
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
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    verifiedPurchase: row.verified_purchase,
    status: row.status,
    helpfulVotes: row.helpful_votes,
    adminResponse: row.admin_response,
    adminResponseAt: toStoredTimestamp(row.admin_response_at), // Not in original DB schema, but map if present
    createdAt: toStoredTimestamp(row.created_at),
    updatedAt: toStoredTimestamp(row.updated_at),
});

export const mapReviewToDB = (review: Partial<Review>): any => {
    const data: any = {};
    if (review.productId !== undefined) data.product_id = review.productId;
    if (review.customerName !== undefined) data.customer_name = review.customerName;
    if (review.customerEmail !== undefined) data.customer_email = review.customerEmail;
    if (review.rating !== undefined) data.rating = review.rating;
    if (review.title !== undefined) data.title = review.title;
    if (review.comment !== undefined) data.comment = review.comment;
    if (review.verifiedPurchase !== undefined) data.verified_purchase = review.verifiedPurchase;
    if (review.status !== undefined) data.status = review.status;
    if (review.helpfulVotes !== undefined) data.helpful_votes = review.helpfulVotes;
    if (review.adminResponse !== undefined) data.admin_response = review.adminResponse;
    return data;
};

export const mapDiscountFromDB = (row: any): Discount => ({
    id: row.id,
    code: row.code,
    type: row.type as DiscountType,
    value: Number(row.value || 0),
    appliesTo: row.applies_to || 'all',
    customerEligibility: row.customer_eligibility || 'all',
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
    if (discount.minimumPurchase !== undefined) data.minimum_purchase = discount.minimumPurchase;
    if (discount.maxUses !== undefined) data.max_uses = discount.maxUses;
    if (discount.usedCount !== undefined) data.used_count = discount.usedCount;
    if (discount.isActive !== undefined) data.is_active = discount.isActive;
    // Timestamps are handled separately
    return data;
};

export const mapStoreSettingsFromDB = (row: any): StoreSettings => ({
    storeName: row.store_name,
    storeEmail: row.store_email,
    storePhone: row.store_phone,
    storeLogo: row.store_logo,
    currency: row.currency,
    currencySymbol: row.currency_symbol,
    storefrontTheme: row.storefront_theme,
    taxEnabled: row.tax_enabled,
    taxRate: Number(row.tax_rate),
    taxName: row.tax_name,
    taxIncluded: row.tax_included,
    taxIncludedInPrice: row.tax_included, // Some overlap
    shippingZones: row.shipping_zones || [],
    stripeEnabled: row.stripe_enabled,
    paypalEnabled: row.paypal_enabled,
    cashOnDeliveryEnabled: row.cash_on_delivery_enabled,
    stripeConnectAccountId: row.stripe_connect_account_id,
    stripeConnectStatus: row.stripe_connect_status,
    stripeConnectChargesEnabled: row.stripe_connect_charges_enabled,
    stripeConnectPayoutsEnabled: row.stripe_connect_payouts_enabled,
    stripeConnectDetailsSubmitted: row.stripe_connect_details_submitted,
    orderNotificationEmail: row.order_notification_email,
    lowStockNotifications: row.low_stock_notifications,
    lowStockThreshold: row.low_stock_threshold,
    requirePhone: row.require_phone,
    requireShippingAddress: row.require_shipping_address,
    isActive: row.is_active ?? true,
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
    if (settings.stripeEnabled !== undefined) data.stripe_enabled = settings.stripeEnabled;
    if (settings.paypalEnabled !== undefined) data.paypal_enabled = settings.paypalEnabled;
    if (settings.cashOnDeliveryEnabled !== undefined) data.cash_on_delivery_enabled = settings.cashOnDeliveryEnabled;
    if (settings.stripeConnectAccountId !== undefined) data.stripe_connect_account_id = settings.stripeConnectAccountId;
    if (settings.stripeConnectStatus !== undefined) data.stripe_connect_status = settings.stripeConnectStatus;
    if (settings.stripeConnectChargesEnabled !== undefined) data.stripe_connect_charges_enabled = settings.stripeConnectChargesEnabled;
    if (settings.stripeConnectPayoutsEnabled !== undefined) data.stripe_connect_payouts_enabled = settings.stripeConnectPayoutsEnabled;
    if (settings.stripeConnectDetailsSubmitted !== undefined) data.stripe_connect_details_submitted = settings.stripeConnectDetailsSubmitted;
    if (settings.orderNotificationEmail !== undefined) data.order_notification_email = settings.orderNotificationEmail;
    if (settings.lowStockNotifications !== undefined) data.low_stock_notifications = settings.lowStockNotifications;
    if (settings.lowStockThreshold !== undefined) data.low_stock_threshold = settings.lowStockThreshold;
    if (settings.requirePhone !== undefined) data.require_phone = settings.requirePhone;
    if (settings.requireShippingAddress !== undefined) data.require_shipping_address = settings.requireShippingAddress;
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
