import { Product, Category, Customer, Order, OrderItem, OrderRefund, Review, Discount, DiscountType, StoreSettings, Cart, StoredTimestamp } from '../types/ecommerce';
import { StoreUser, StoreUserRole, StoreUserStatus, UserSegment, SegmentType, UserActivity, ActivityType } from '../types/storeUsers';
import { toStoredTimestamp } from './supabaseMappers';

type DbRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DbRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const readJsonObject = (value: unknown): DbRecord => isRecord(value) ? value : {};

const readField = (
    row: DbRecord,
    data: DbRecord,
    columnKey: string,
    dataKey = columnKey
): unknown => row[columnKey] ?? data[dataKey];

const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const toOptionalNumber = (value: unknown): number | undefined =>
    value === undefined || value === null || value === '' ? undefined : toNumber(value);

const toStringValue = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value);

const toOptionalString = (value: unknown): string | undefined => {
    const resolved = toStringValue(value);
    return resolved ? resolved : undefined;
};

const firstNonEmpty = (...values: unknown[]): unknown =>
    values.find((value) => value !== undefined && value !== null && value !== '');

const toBoolean = (value: unknown, fallback = false): boolean =>
    typeof value === 'boolean' ? value : value === undefined || value === null ? fallback : Boolean(value);

const toArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const toTimestamp = (value: unknown): StoredTimestamp => {
    if (value instanceof Date || typeof value === 'number') return value;
    if (typeof value === 'string') return toStoredTimestamp(value);
    if (isRecord(value) && typeof value.seconds === 'number') return value as StoredTimestamp;
    return toStoredTimestamp(undefined);
};

const ORDER_STATUSES: ReadonlySet<Order['status']> = new Set([
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
]);

const PAYMENT_STATUSES: ReadonlySet<Order['paymentStatus']> = new Set([
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'cancelled',
]);

const FULFILLMENT_STATUSES: ReadonlySet<Order['fulfillmentStatus']> = new Set([
    'unfulfilled',
    'processing',
    'partial',
    'partially_fulfilled',
    'fulfilled',
    'cancelled',
]);

const normalizeOrderStatus = (value: unknown): Order['status'] => {
    const status = toStringValue(value, 'pending') as Order['status'];
    return ORDER_STATUSES.has(status) ? status : 'pending';
};

const normalizePaymentStatus = (value: unknown): Order['paymentStatus'] => {
    const status = toStringValue(value, 'pending') as Order['paymentStatus'];
    return PAYMENT_STATUSES.has(status) ? status : 'pending';
};

const normalizeFulfillmentStatus = (value: unknown): Order['fulfillmentStatus'] => {
    const status = toStringValue(value, 'unfulfilled') as Order['fulfillmentStatus'];
    return FULFILLMENT_STATUSES.has(status) ? status : 'unfulfilled';
};

const normalizeProductStatus = (value: unknown): Product['status'] => {
    const status = toStringValue(value, 'draft');
    return status === 'active' || status === 'archived' ? status : 'draft';
};

const normalizeOrderItem = (item: unknown, index: number): OrderItem => {
    const source = readJsonObject(item);
    const quantity = toNumber(source.quantity, 1);
    const unitPrice = toNumber(source.unit_price ?? source.unitPrice ?? source.price);
    const totalPrice = toNumber(source.total_price ?? source.totalPrice, unitPrice * quantity);
    const name = toStringValue(source.name ?? source.product_name ?? source.productName, 'Producto');
    const imageUrl = toOptionalString(source.image_url ?? source.imageUrl ?? source.image);

    return {
        id: toStringValue(source.id, `item-${index}`),
        productId: toStringValue(source.product_id ?? source.productId),
        variantId: toOptionalString(source.variant_id ?? source.variantId),
        name,
        productName: toOptionalString(source.product_name ?? source.productName) ?? name,
        variantName: toOptionalString(source.variant_name ?? source.variantName),
        sku: toOptionalString(source.sku),
        imageUrl,
        image: toOptionalString(source.image) ?? imageUrl,
        price: unitPrice,
        quantity,
        unitPrice,
        totalPrice,
    };
};

const normalizeOrderRefund = (refund: unknown, index: number): OrderRefund => {
    const source = readJsonObject(refund);
    return {
        id: toStringValue(source.id ?? source.refundId, `refund-${index}`),
        amount: toNumber(source.amount),
        status: toStringValue(source.status, 'unknown'),
        reason: toOptionalString(source.reason),
        source: toOptionalString(source.source) as OrderRefund['source'],
        createdBy: toOptionalString(source.createdBy ?? source.created_by),
        createdAt: source.createdAt ?? source.created_at ? toTimestamp(source.createdAt ?? source.created_at) : undefined,
    };
};

export const mapProductFromDB = (row: DbRecord): Product => {
    const data = readJsonObject(row.data);
    const quantity = toNumber(
        readField(row, data, 'quantity', 'quantity') ??
        readField(row, data, 'inventory_quantity', 'inventoryQuantity')
    );
    const costPrice = toOptionalNumber(
        readField(row, data, 'cost_price', 'costPrice') ??
        readField(row, data, 'cost', 'cost')
    );

    return {
        id: toStringValue(row.id ?? data.id),
        projectId: toOptionalString(readField(row, data, 'project_id', 'projectId')),
        storeId: toOptionalString(readField(row, data, 'store_id', 'storeId')),
        publicStoreId: toOptionalString(
            readField(row, data, 'public_store_id', 'publicStoreId') ??
            readField(row, data, 'store_id', 'storeId')
        ),
        name: toStringValue(readField(row, data, 'name', 'name')),
        slug: toStringValue(readField(row, data, 'slug', 'slug')),
        description: toStringValue(readField(row, data, 'description', 'description')),
        shortDescription: toOptionalString(readField(row, data, 'short_description', 'shortDescription')),
        price: toNumber(readField(row, data, 'price', 'price')),
        compareAtPrice: toOptionalNumber(readField(row, data, 'compare_at_price', 'compareAtPrice')),
        costPrice,
        cost: costPrice,
        currency: toOptionalString(readField(row, data, 'currency', 'currency')),
        sku: toOptionalString(readField(row, data, 'sku', 'sku')),
        barcode: toOptionalString(readField(row, data, 'barcode', 'barcode')),
        quantity,
        trackInventory: toBoolean(readField(row, data, 'track_inventory', 'trackInventory'), true),
        lowStockThreshold: toOptionalNumber(readField(row, data, 'low_stock_threshold', 'lowStockThreshold')),
        images: toArray<Product['images'] extends Array<infer T> ? T : never>(readField(row, data, 'images', 'images')),
        tags: toArray<string>(readField(row, data, 'tags', 'tags')),
        hasVariants: toBoolean(readField(row, data, 'has_variants', 'hasVariants'), false),
        variants: toArray<Product['variants'] extends Array<infer T> ? T : never>(readField(row, data, 'variants', 'variants')),
        options: toArray<Product['options'] extends Array<infer T> ? T : never>(readField(row, data, 'options', 'options')),
        metaTitle: toOptionalString(firstNonEmpty(data.metaTitle, data.meta_title, data.seoTitle, data.seo_title, row.meta_title, row.seo_title)),
        metaDescription: toOptionalString(firstNonEmpty(data.metaDescription, data.meta_description, data.seoDescription, data.seo_description, row.meta_description, row.seo_description)),
        status: normalizeProductStatus(readField(row, data, 'status', 'status')),
        isDigital: toBoolean(readField(row, data, 'is_digital', 'isDigital'), false),
        isFeatured: toBoolean(readField(row, data, 'is_featured', 'isFeatured'), false),
        weight: toOptionalNumber(readField(row, data, 'weight', 'weight')),
        weightUnit: toOptionalString(readField(row, data, 'weight_unit', 'weightUnit')) as Product['weightUnit'],
        categoryId: toOptionalString(readField(row, data, 'category_id', 'categoryId') ?? readField(row, data, 'category', 'category')),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapProductToDB = (product: Partial<Product>): DbRecord => {
    const data: DbRecord = {};
    const metadata: DbRecord = {};
    if (product.projectId !== undefined) data.project_id = product.projectId;
    if (product.storeId !== undefined) data.store_id = product.storeId;
    if (product.publicStoreId !== undefined) data.public_store_id = product.publicStoreId;
    if (product.name !== undefined) data.name = product.name;
    if (product.slug !== undefined) data.slug = product.slug;
    if (product.description !== undefined) data.description = product.description;
    if (product.shortDescription !== undefined) data.short_description = product.shortDescription;
    if (product.price !== undefined) data.price = product.price;
    if (product.compareAtPrice !== undefined) data.compare_at_price = product.compareAtPrice;
    if (product.costPrice !== undefined || product.cost !== undefined) data.cost_price = product.costPrice ?? product.cost;
    if (product.currency !== undefined) data.currency = product.currency;
    if (product.sku !== undefined) data.sku = product.sku;
    if (product.barcode !== undefined) data.barcode = product.barcode;
    if (product.quantity !== undefined) {
        data.quantity = product.quantity;
        data.inventory_quantity = product.quantity;
    }
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
    if (product.categoryId !== undefined) data.category_id = product.categoryId || null;
    if (product.metaTitle !== undefined) metadata.metaTitle = product.metaTitle ?? '';
    if (product.metaDescription !== undefined) metadata.metaDescription = product.metaDescription ?? '';
    if (Object.keys(metadata).length > 0) data.data = metadata;
    return data;
};

type CategoryDbInput = Partial<Omit<Category, 'description' | 'imageUrl' | 'parentId'>> & {
    description?: string | null;
    imageUrl?: string | null;
    parentId?: string | null;
};

export const mapCategoryFromDB = (row: DbRecord): Category => {
    const data = readJsonObject(row.data);

    return {
        id: toStringValue(row.id ?? data.id),
        name: toStringValue(readField(row, data, 'name', 'name')),
        slug: toStringValue(readField(row, data, 'slug', 'slug')),
        description: toOptionalString(firstNonEmpty(row.description, data.description)),
        imageUrl: toOptionalString(firstNonEmpty(row.image_url, data.imageUrl, data.image_url)),
        parentId: toOptionalString(firstNonEmpty(row.parent_id, data.parentId, data.parent_id)),
        position: toNumber(row.position ?? data.position ?? row.order ?? data.order),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapCategoryToDB = (category: CategoryDbInput): DbRecord => {
    const data: DbRecord = {};
    const metadata: DbRecord = {};

    if (category.name !== undefined) data.name = category.name;
    if (category.slug !== undefined) data.slug = category.slug;
    if (category.description !== undefined) metadata.description = category.description ?? '';
    if (category.imageUrl !== undefined) metadata.imageUrl = category.imageUrl ?? '';
    if (category.parentId !== undefined) metadata.parentId = category.parentId || null;
    if (category.position !== undefined) metadata.position = category.position;
    if (Object.keys(metadata).length > 0) data.data = metadata;

    return data;
};

export const mapOrderFromDB = (row: DbRecord): Order => {
    const data = readJsonObject(row.data);
    const stripeData = readJsonObject(readField(row, data, 'stripe', 'stripe'));
    const pricing = readJsonObject(readField(row, data, 'pricing', 'pricing'));
    const subtotal = toNumber(readField(row, data, 'subtotal', 'subtotal') ?? pricing.subtotal);
    const discountAmount = toOptionalNumber(
        readField(row, data, 'discount_amount', 'discountAmount') ??
        pricing.discountTotal
    );
    const shippingCost = toNumber(
        readField(row, data, 'shipping_amount', 'shippingAmount') ??
        readField(row, data, 'shipping_cost', 'shippingCost') ??
        pricing.shippingTotal
    );
    const taxAmount = toNumber(readField(row, data, 'tax_amount', 'taxAmount') ?? pricing.taxTotal);
    const total = toNumber(
        readField(row, data, 'total_amount', 'totalAmount') ??
        readField(row, data, 'total', 'total') ??
        pricing.total
    );
    const paymentIntentId = toOptionalString(
        readField(row, data, 'stripe_payment_intent_id', 'stripePaymentIntentId') ??
        readField(row, data, 'payment_intent_id', 'paymentIntentId') ??
        stripeData.paymentIntentId
    );
    const hasPricing = Object.keys(pricing).length > 0;
    const refunds = toArray<unknown>(readField(row, data, 'refunds', 'refunds')).map(normalizeOrderRefund);
    const refundedAmount = toNumber(
        readField(row, data, 'refunded_amount', 'refundedAmount'),
        refunds.reduce((sum, refund) => sum + toNumber(refund.amount), 0)
    );

    return {
        id: toStringValue(row.id ?? data.id),
        orderNumber: toStringValue(readField(row, data, 'order_number', 'orderNumber') ?? row.id),
        projectId: toOptionalString(readField(row, data, 'project_id', 'projectId')),
        storeId: toOptionalString(readField(row, data, 'store_id', 'storeId')),
        publicStoreId: toOptionalString(readField(row, data, 'public_store_id', 'publicStoreId')),
        data,
        admin: readJsonObject(data.admin),
        customerId: toOptionalString(readField(row, data, 'customer_id', 'customerId')),
        customerEmail: toStringValue(readField(row, data, 'customer_email', 'customerEmail')),
        customerName: toStringValue(readField(row, data, 'customer_name', 'customerName')),
        customerPhone: toOptionalString(readField(row, data, 'customer_phone', 'customerPhone')),
        items: toArray<unknown>(readField(row, data, 'items', 'items')).map(normalizeOrderItem),
        subtotal,
        discount: toNumber(readField(row, data, 'discount', 'discount') ?? discountAmount),
        discountCode: toOptionalString(readField(row, data, 'discount_code', 'discountCode')),
        discountAmount,
        shippingCost,
        taxAmount,
        total,
        currency: toStringValue(readField(row, data, 'currency', 'currency'), 'USD'),
        pricing: hasPricing ? pricing as Order['pricing'] : {
            subtotal,
            discountTotal: discountAmount ?? toNumber(readField(row, data, 'discount', 'discount')),
            shippingTotal: shippingCost,
            taxTotal: taxAmount,
            platformFeeTotal: toNumber(pricing.platformFeeTotal),
            total,
        },
        checkoutIdempotencyKey: toOptionalString(readField(row, data, 'checkout_idempotency_key', 'checkoutIdempotencyKey')),
        cartHash: toOptionalString(readField(row, data, 'cart_hash', 'cartHash')),
        stripe: {
            ...stripeData,
            paymentIntentId: paymentIntentId ?? toOptionalString(stripeData.paymentIntentId),
            connectedAccountId: toOptionalString(stripeData.connectedAccountId),
            clientSecret: toOptionalString(stripeData.clientSecret),
            chargeId: toOptionalString(stripeData.chargeId),
            applicationFeeAmount: toOptionalNumber(stripeData.applicationFeeAmount),
        },
        shippingAddress: readJsonObject(readField(row, data, 'shipping_address', 'shippingAddress')) as unknown as Order['shippingAddress'],
        billingAddress: readJsonObject(readField(row, data, 'billing_address', 'billingAddress')) as unknown as Order['billingAddress'],
        status: normalizeOrderStatus(readField(row, data, 'status', 'status')),
        paymentStatus: normalizePaymentStatus(readField(row, data, 'payment_status', 'paymentStatus')),
        fulfillmentStatus: normalizeFulfillmentStatus(readField(row, data, 'fulfillment_status', 'fulfillmentStatus')),
        paymentMethod: toStringValue(readField(row, data, 'payment_method', 'paymentMethod')),
        paymentIntentId,
        paidAt: toTimestamp(readField(row, data, 'paid_at', 'paidAt')),
        refundedAmount,
        refunds,
        shippingMethod: toOptionalString(readField(row, data, 'shipping_method', 'shippingMethod')),
        trackingNumber: toOptionalString(readField(row, data, 'tracking_number', 'trackingNumber')),
        trackingUrl: toOptionalString(readField(row, data, 'tracking_url', 'trackingUrl')),
        carrier: toOptionalString(readField(row, data, 'carrier', 'carrier')),
        shippedAt: toTimestamp(readField(row, data, 'shipped_at', 'shippedAt')),
        deliveredAt: toTimestamp(readField(row, data, 'delivered_at', 'deliveredAt')),
        notes: toOptionalString(readField(row, data, 'notes', 'notes')),
        customerNotes: toOptionalString(readField(row, data, 'customer_notes', 'customerNotes')),
        internalNotes: toOptionalString(readField(row, data, 'internal_notes', 'internalNotes')),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
        cancelledAt: toTimestamp(readField(row, data, 'cancelled_at', 'cancelledAt')),
        refundedAt: toTimestamp(readField(row, data, 'refunded_at', 'refundedAt')),
    };
};

export const mapOrderToDB = (order: Partial<Order>): DbRecord => {
    const data: DbRecord = {};
    if (order.projectId !== undefined) data.project_id = order.projectId;
    if (order.storeId !== undefined) data.store_id = order.storeId;
    if (order.publicStoreId !== undefined) data.public_store_id = order.publicStoreId;
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
    if (order.shippingCost !== undefined) data.shipping_amount = order.shippingCost;
    if (order.taxAmount !== undefined) data.tax_amount = order.taxAmount;
    if (order.total !== undefined) data.total = order.total;
    if (order.total !== undefined) data.total_amount = order.total;
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
    if (order.paymentIntentId !== undefined) data.stripe_payment_intent_id = order.paymentIntentId;
    if (order.stripe?.paymentIntentId !== undefined) data.stripe_payment_intent_id = order.stripe.paymentIntentId;
    if (order.refundedAmount !== undefined) data.refunded_amount = order.refundedAmount;
    if (order.refunds !== undefined) data.refunds = order.refunds;
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

export const mapCustomerFromDB = (row: DbRecord): Customer => {
    const data = readJsonObject(row.data);

    return {
        id: toStringValue(row.id ?? data.id),
        email: toStringValue(readField(row, data, 'email', 'email')),
        firstName: toStringValue(readField(row, data, 'first_name', 'firstName')),
        lastName: toStringValue(readField(row, data, 'last_name', 'lastName')),
        phone: toOptionalString(readField(row, data, 'phone', 'phone')),
        totalOrders: toNumber(readField(row, data, 'total_orders', 'totalOrders')),
        totalSpent: toNumber(readField(row, data, 'total_spent', 'totalSpent')),
        lastOrderAt: toTimestamp(readField(row, data, 'last_order_at', 'lastOrderAt')),
        defaultShippingAddress: readJsonObject(readField(row, data, 'default_shipping_address', 'defaultShippingAddress')) as unknown as Customer['defaultShippingAddress'],
        defaultBillingAddress: readJsonObject(readField(row, data, 'default_billing_address', 'defaultBillingAddress')) as unknown as Customer['defaultBillingAddress'],
        addresses: toArray<Customer['addresses'][number]>(readField(row, data, 'addresses', 'addresses')),
        acceptsMarketing: toBoolean(readField(row, data, 'accepts_marketing', 'acceptsMarketing'), false),
        tags: toArray<string>(readField(row, data, 'tags', 'tags')),
        notes: toOptionalString(readField(row, data, 'notes', 'notes')),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapCustomerToDB = (customer: Partial<Customer>): DbRecord => {
    const data: DbRecord = {};
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

export const mapReviewFromDB = (row: DbRecord): Review => {
    const data = readJsonObject(row.data);

    return {
        id: toStringValue(row.id ?? data.id),
        productId: toStringValue(readField(row, data, 'product_id', 'productId')),
        customerName: toStringValue(readField(row, data, 'customer_name', 'customerName')),
        customerEmail: toStringValue(readField(row, data, 'customer_email', 'customerEmail')),
        rating: toNumber(readField(row, data, 'rating', 'rating')),
        title: toOptionalString(readField(row, data, 'title', 'title')),
        comment: toStringValue(readField(row, data, 'comment', 'comment')),
        verifiedPurchase: toBoolean(readField(row, data, 'verified_purchase', 'verifiedPurchase'), false),
        status: toStringValue(readField(row, data, 'status', 'status')) as Review['status'],
        helpfulVotes: toNumber(readField(row, data, 'helpful_votes', 'helpfulVotes')),
        adminResponse: toOptionalString(readField(row, data, 'admin_response', 'adminResponse')),
        adminResponseAt: toTimestamp(readField(row, data, 'admin_response_at', 'adminResponseAt')),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapReviewToDB = (review: Partial<Review>): DbRecord => {
    const data: DbRecord = {};
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

export const mapDiscountFromDB = (row: DbRecord): Discount => {
    const data = readJsonObject(row.data);
    const customerEligibility = toStringValue(readField(row, data, 'customer_eligibility', 'customerEligibility'), 'everyone');

    return {
        id: toStringValue(row.id ?? data.id),
        code: toStringValue(readField(row, data, 'code', 'code')),
        type: toStringValue(readField(row, data, 'type', 'type'), 'percentage') as DiscountType,
        value: toNumber(readField(row, data, 'value', 'value')),
        appliesTo: toStringValue(readField(row, data, 'applies_to', 'appliesTo'), 'all') as Discount['appliesTo'],
        customerEligibility: customerEligibility === 'all' ? 'everyone' : customerEligibility as Discount['customerEligibility'],
        canCombine: toBoolean(readField(row, data, 'can_combine', 'canCombine'), false),
        isAutomatic: toBoolean(readField(row, data, 'is_automatic', 'isAutomatic'), false),
        minimumPurchase: toOptionalNumber(readField(row, data, 'minimum_purchase', 'minimumPurchase')),
        maxUses: toOptionalNumber(readField(row, data, 'max_uses', 'maxUses')),
        usedCount: toNumber(readField(row, data, 'used_count', 'usedCount')),
        startsAt: toTimestamp(readField(row, data, 'starts_at', 'startsAt')),
        endsAt: readField(row, data, 'ends_at', 'endsAt') ? toTimestamp(readField(row, data, 'ends_at', 'endsAt')) : undefined,
        isActive: toBoolean(readField(row, data, 'is_active', 'isActive'), true),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapDiscountToDB = (discount: Partial<Discount>): DbRecord => {
    const data: DbRecord = {};
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

export const mapStoreSettingsFromDB = (row: DbRecord): StoreSettings => {
    const data = readJsonObject(row.data);

    return {
        projectId: toOptionalString(readField(row, data, 'project_id', 'projectId')),
        storeId: toOptionalString(readField(row, data, 'store_id', 'storeId')),
        publicStoreId: toOptionalString(readField(row, data, 'public_store_id', 'publicStoreId')),
        storeName: toStringValue(readField(row, data, 'store_name', 'storeName')),
        storeEmail: toStringValue(readField(row, data, 'store_email', 'storeEmail')),
        storePhone: toOptionalString(readField(row, data, 'store_phone', 'storePhone')),
        storeLogo: toOptionalString(readField(row, data, 'store_logo', 'storeLogo')),
        currency: toStringValue(readField(row, data, 'currency', 'currency'), 'USD'),
        currencySymbol: toStringValue(readField(row, data, 'currency_symbol', 'currencySymbol'), '$'),
        storefrontTheme: readJsonObject(readField(row, data, 'storefront_theme', 'storefrontTheme')) as unknown as StoreSettings['storefrontTheme'],
        taxEnabled: toBoolean(readField(row, data, 'tax_enabled', 'taxEnabled'), false),
        taxRate: toNumber(readField(row, data, 'tax_rate', 'taxRate')),
        taxName: toOptionalString(readField(row, data, 'tax_name', 'taxName')),
        taxIncluded: toBoolean(readField(row, data, 'tax_included', 'taxIncluded'), false),
        taxIncludedInPrice: toBoolean(readField(row, data, 'tax_included', 'taxIncludedInPrice'), false),
        shippingZones: toArray<StoreSettings['shippingZones'][number]>(readField(row, data, 'shipping_zones', 'shippingZones')),
        freeShippingThreshold: toOptionalNumber(readField(row, data, 'free_shipping_threshold', 'freeShippingThreshold')),
        stripeEnabled: toBoolean(readField(row, data, 'stripe_enabled', 'stripeEnabled'), false),
        stripePublishableKey: toOptionalString(readField(row, data, 'stripe_publishable_key', 'stripePublishableKey')),
        paypalEnabled: toBoolean(readField(row, data, 'paypal_enabled', 'paypalEnabled'), false),
        paypalClientId: toOptionalString(readField(row, data, 'paypal_client_id', 'paypalClientId')),
        cashOnDeliveryEnabled: toBoolean(readField(row, data, 'cash_on_delivery_enabled', 'cashOnDeliveryEnabled'), false),
        stripeConnectAccountId: toOptionalString(readField(row, data, 'stripe_connect_account_id', 'stripeConnectAccountId')),
        stripeConnectStatus: toOptionalString(readField(row, data, 'stripe_connect_status', 'stripeConnectStatus')) as StoreSettings['stripeConnectStatus'],
        stripeConnectChargesEnabled: toBoolean(readField(row, data, 'stripe_connect_charges_enabled', 'stripeConnectChargesEnabled'), false),
        stripeConnectPayoutsEnabled: toBoolean(readField(row, data, 'stripe_connect_payouts_enabled', 'stripeConnectPayoutsEnabled'), false),
        stripeConnectDetailsSubmitted: toBoolean(readField(row, data, 'stripe_connect_details_submitted', 'stripeConnectDetailsSubmitted'), false),
        orderNotificationEmail: toStringValue(readField(row, data, 'order_notification_email', 'orderNotificationEmail')),
        lowStockNotifications: toBoolean(readField(row, data, 'low_stock_notifications', 'lowStockNotifications'), false),
        lowStockThreshold: toNumber(readField(row, data, 'low_stock_threshold', 'lowStockThreshold'), 5),
        notifyOnNewOrder: toBoolean(readField(row, data, 'notify_on_new_order', 'notifyOnNewOrder'), true),
        notifyOnLowStock: toBoolean(readField(row, data, 'notify_on_low_stock', 'notifyOnLowStock'), true),
        sendOrderConfirmation: toBoolean(readField(row, data, 'send_order_confirmation', 'sendOrderConfirmation'), true),
        sendShippingNotification: toBoolean(readField(row, data, 'send_shipping_notification', 'sendShippingNotification'), true),
        termsAndConditionsUrl: toOptionalString(readField(row, data, 'terms_and_conditions_url', 'termsAndConditionsUrl')),
        privacyPolicyUrl: toOptionalString(readField(row, data, 'privacy_policy_url', 'privacyPolicyUrl')),
        requirePhone: toBoolean(readField(row, data, 'require_phone', 'requirePhone'), false),
        requireShippingAddress: toBoolean(readField(row, data, 'require_shipping_address', 'requireShippingAddress'), true),
        isActive: toBoolean(readField(row, data, 'is_active', 'isActive'), true),
        createdAt: toTimestamp(readField(row, data, 'created_at', 'createdAt')),
        updatedAt: toTimestamp(readField(row, data, 'updated_at', 'updatedAt') ?? readField(row, data, 'created_at', 'createdAt')),
    };
};

export const mapStoreSettingsToDB = (settings: Partial<StoreSettings>): DbRecord => {
    const data: DbRecord = {};
    if (settings.projectId !== undefined) data.project_id = settings.projectId;
    if (settings.storeId !== undefined) data.store_id = settings.storeId;
    if (settings.publicStoreId !== undefined) data.public_store_id = settings.publicStoreId;
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

export const mapStoreUserFromDB = (row: any): StoreUser => {
    const metadata = row.metadata || {};
    const data = readJsonObject(row.data);

    return {
        id: row.id,
        authUserId: row.auth_user_id || metadata.authUserId,
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
        addresses: toArray(readField(row, data, 'addresses', 'addresses')) as StoreUser['addresses'],
        defaultShippingAddress: readField(row, data, 'default_shipping_address', 'defaultShippingAddress') as StoreUser['defaultShippingAddress'],
        defaultBillingAddress: readField(row, data, 'default_billing_address', 'defaultBillingAddress') as StoreUser['defaultBillingAddress'],
        totalOrders: row.total_orders,
        totalSpent: Number(row.total_spent),
        averageOrderValue: Number(row.average_order_value),
        lastLoginAt: row.last_login_at ? toStoredTimestamp(row.last_login_at) : undefined,
        lastOrderAt: row.last_order_at ? toStoredTimestamp(row.last_order_at) : undefined,
        createdAt: toStoredTimestamp(row.created_at),
        updatedAt: toStoredTimestamp(row.updated_at),
        metadata,
        acceptsMarketing: row.accepts_marketing,
        preferredLanguage: row.preferred_language,
        internalNotes: row.internal_notes,
    };
};

export const mapStoreUserToDB = (user: Partial<StoreUser>): any => {
    const data: any = {};
    if (user.authUserId !== undefined) data.auth_user_id = user.authUserId;
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
