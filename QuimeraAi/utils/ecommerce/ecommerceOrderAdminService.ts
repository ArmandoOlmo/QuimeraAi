import type { OrderStatus, StoredTimestamp } from '../../types/ecommerce';
import type {
    EcommerceAdminData,
    EcommerceAdminOrder,
    EcommerceAdminOrderInput,
    EcommerceFulfillmentStatus,
    EcommerceOrderAdminMutation,
    EcommerceOrderPricingSummary,
    EcommerceOrderTimelineEvent,
    EcommercePaymentStatus,
} from '../../types/ecommerceOrders';

type RecordValue = Record<string, unknown>;

const PAYMENT_STATUSES = new Set<EcommercePaymentStatus>([
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'cancelled',
]);

const FULFILLMENT_STATUSES = new Set<EcommerceFulfillmentStatus>([
    'unfulfilled',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'cancelled',
]);

const ORDER_STATUSES = new Set<OrderStatus>([
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
]);

const isRecord = (value: unknown): value is RecordValue =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecord = (value: unknown): RecordValue => (isRecord(value) ? value : {});

const readArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const readString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (value === undefined || value === null) return fallback;
    return String(value);
};

const readOptionalString = (value: unknown): string | undefined => {
    const resolved = readString(value).trim();
    return resolved || undefined;
};

const readTimestampString = (value: unknown): string | undefined => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
        const milliseconds = value > 1e12 ? value : value * 1000;
        const date = new Date(milliseconds);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    if (typeof value === 'string') {
        const resolved = value.trim();
        return resolved || undefined;
    }
    if (isRecord(value) && typeof value.seconds === 'number') {
        const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
        const date = new Date((value.seconds * 1000) + Math.floor(nanoseconds / 1_000_000));
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    return undefined;
};

const readNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const nowIso = (): string => new Date().toISOString();

const firstDefined = (...values: unknown[]): unknown =>
    values.find((value) => value !== undefined && value !== null && value !== '');

const readData = (input: EcommerceAdminOrderInput): RecordValue => {
    const source = readRecord(input);
    return readRecord(source.data);
};

const readAdmin = (input: EcommerceAdminOrderInput | RecordValue): EcommerceAdminData => {
    const source = readRecord(input);
    const data = readRecord(source.data);
    return readRecord(source.admin ?? data.admin) as EcommerceAdminData;
};

const readField = (
    input: EcommerceAdminOrderInput,
    snakeKey: string,
    camelKey = snakeKey
): unknown => {
    const source = readRecord(input);
    const data = readData(input);
    return firstDefined(source[camelKey], source[snakeKey], data[camelKey], data[snakeKey]);
};

const normalizeOrderStatus = (value: unknown): OrderStatus => {
    const status = readString(value, 'pending') as OrderStatus;
    return ORDER_STATUSES.has(status) ? status : 'pending';
};

const normalizePaymentStatus = (value: unknown): EcommercePaymentStatus => {
    const status = readString(value, 'pending') as EcommercePaymentStatus;
    return PAYMENT_STATUSES.has(status) ? status : 'pending';
};

const normalizeFulfillmentStatus = (value: unknown): EcommerceFulfillmentStatus => {
    const status = readString(value, 'unfulfilled');
    if (status === 'partial') return 'partially_fulfilled';
    return FULFILLMENT_STATUSES.has(status as EcommerceFulfillmentStatus)
        ? status as EcommerceFulfillmentStatus
        : 'unfulfilled';
};

const normalizeTimelineEvent = (
    value: unknown,
    fallbackIndex = 0
): EcommerceOrderTimelineEvent | null => {
    const source = readRecord(value);
    const type = readString(source.type, 'system');
    const createdAt = readString(source.createdAt ?? source.created_at, nowIso());
    const message = readString(source.message);

    if (!message) return null;

    return {
        id: readString(source.id, `${type}-${createdAt}-${fallbackIndex}`),
        type: type as EcommerceOrderTimelineEvent['type'],
        message,
        createdAt,
        metadata: readRecord(source.metadata),
    };
};

const uniqueTimeline = (events: EcommerceOrderTimelineEvent[]): EcommerceOrderTimelineEvent[] => {
    const seen = new Set<string>();
    return events
        .filter((event) => {
            if (seen.has(event.id)) return false;
            seen.add(event.id);
            return true;
        })
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

const readStoredTimeline = (input: EcommerceAdminOrderInput): EcommerceOrderTimelineEvent[] => {
    const admin = readAdmin(input);
    return readArray<unknown>(admin.timeline)
        .map(normalizeTimelineEvent)
        .filter((event): event is EcommerceOrderTimelineEvent => Boolean(event));
};

const createTimelineEvent = (
    type: EcommerceOrderTimelineEvent['type'],
    message: string,
    options: {
        id?: string;
        createdAt?: string;
        metadata?: RecordValue;
    } = {}
): EcommerceOrderTimelineEvent => ({
    id: options.id || `${type}-${options.createdAt || nowIso()}`,
    type,
    message,
    createdAt: options.createdAt || nowIso(),
    metadata: options.metadata || {},
});

const withAdmin = (data: RecordValue, admin: EcommerceAdminData): RecordValue => ({
    ...data,
    admin: {
        ...readRecord(data.admin),
        ...admin,
    },
});

const getColumnData = (data?: RecordValue, fallback?: EcommerceAdminOrderInput): RecordValue =>
    data ? { ...data } : { ...readData(fallback || {}) };

export const getOrderStatus = (input: EcommerceAdminOrderInput): OrderStatus =>
    normalizeOrderStatus(readField(input, 'status', 'status'));

export const getPaymentStatus = (input: EcommerceAdminOrderInput): EcommercePaymentStatus =>
    normalizePaymentStatus(readField(input, 'payment_status', 'paymentStatus'));

export const getFulfillmentStatus = (input: EcommerceAdminOrderInput): EcommerceFulfillmentStatus => {
    const adminFulfillment = readRecord(readAdmin(input).fulfillment);
    return normalizeFulfillmentStatus(
        firstDefined(
            adminFulfillment.status,
            readField(input, 'fulfillment_status', 'fulfillmentStatus')
        )
    );
};

export const getOrderPricingSummary = (input: EcommerceAdminOrderInput): EcommerceOrderPricingSummary => {
    const pricing = readRecord(readField(input, 'pricing', 'pricing'));
    const pricingSnapshot = readRecord(readField(input, 'pricing_snapshot', 'pricingSnapshot'));
    const subtotal = readNumber(firstDefined(readField(input, 'subtotal', 'subtotal'), pricing.subtotal));
    const discountAmount = readNumber(firstDefined(
        readField(input, 'discount_amount', 'discountAmount'),
        readField(input, 'discount', 'discount'),
        pricing.discountTotal,
        pricing.discountAmount
    ));
    const shippingAmount = readNumber(firstDefined(
        readField(input, 'shipping_amount', 'shippingAmount'),
        readField(input, 'shipping_cost', 'shippingCost'),
        pricing.shippingTotal
    ));
    const taxAmount = readNumber(firstDefined(readField(input, 'tax_amount', 'taxAmount'), pricing.taxTotal));
    const totalAmount = readNumber(firstDefined(
        readField(input, 'total_amount', 'totalAmount'),
        readField(input, 'total', 'total'),
        pricing.total
    ));

    return {
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        totalAmount,
        currency: readString(readField(input, 'currency', 'currency'), 'USD').toUpperCase(),
        calculationVersion: readOptionalString(pricing.calculationVersion ?? pricingSnapshot.calculationVersion),
    };
};

export const getOrderTimeline = (input: EcommerceAdminOrderInput): EcommerceOrderTimelineEvent[] => {
    const orderId = readString(readField(input, 'id', 'id'));
    const createdAt = readTimestampString(readField(input, 'created_at', 'createdAt')) || nowIso();
    const paidAt = readTimestampString(readField(input, 'paid_at', 'paidAt'));
    const shippedAt = readTimestampString(readField(input, 'shipped_at', 'shippedAt'));
    const cancelledAt = readTimestampString(readField(input, 'cancelled_at', 'cancelledAt'));
    const paymentStatus = getPaymentStatus(input);
    const fulfillmentStatus = getFulfillmentStatus(input);
    const data = readData(input);
    const events = [...readStoredTimeline(input)];

    events.push(createTimelineEvent('order_created', 'Order created', {
        id: `order-created-${orderId || createdAt}`,
        createdAt,
        metadata: { orderId },
    }));

    if (paidAt || paymentStatus === 'paid') {
        events.push(createTimelineEvent('payment_status', 'Payment marked paid', {
            id: `payment-paid-${orderId || paidAt || createdAt}`,
            createdAt: paidAt || createdAt,
            metadata: { paymentStatus },
        }));
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        events.push(createTimelineEvent('payment_status', `Payment ${paymentStatus}`, {
            id: `payment-${paymentStatus}-${orderId || createdAt}`,
            createdAt,
            metadata: { paymentStatus },
        }));
    }

    if (cancelledAt || getOrderStatus(input) === 'cancelled') {
        events.push(createTimelineEvent('system', 'Order cancelled', {
            id: `order-cancelled-${orderId || cancelledAt || createdAt}`,
            createdAt: cancelledAt || createdAt,
        }));
    }

    if (fulfillmentStatus === 'fulfilled' || shippedAt) {
        events.push(createTimelineEvent('fulfillment', 'Fulfillment marked fulfilled', {
            id: `fulfillment-fulfilled-${orderId || shippedAt || createdAt}`,
            createdAt: shippedAt || createdAt,
            metadata: { fulfillmentStatus },
        }));
    }

    const reservationId = firstDefined(
        data.inventoryReservationId,
        data.reservationId,
        readRecord(data.inventory).reservationId
    );
    if (reservationId) {
        events.push(createTimelineEvent('inventory', 'Inventory reservation linked', {
            id: `inventory-reservation-${String(reservationId)}`,
            createdAt,
            metadata: { reservationId },
        }));
    }

    return uniqueTimeline(events);
};

export const normalizeOrderForAdmin = (input: EcommerceAdminOrderInput): EcommerceAdminOrder => {
    const pricing = readRecord(readField(input, 'pricing', 'pricing'));
    const data = readData(input);
    const admin = readAdmin(input);
    const adminFulfillment = readRecord(admin.fulfillment);
    const pricingSummary = getOrderPricingSummary(input);
    const id = readString(readField(input, 'id', 'id'));
    const orderNumber = readString(readField(input, 'order_number', 'orderNumber'), id);
    const items = readArray<RecordValue>(readField(input, 'items', 'items')).map((item, index) => {
        const unitPrice = readNumber(firstDefined(item.unitPrice, item.unit_price, item.price));
        const quantity = readNumber(item.quantity, 1);
        const totalPrice = readNumber(firstDefined(item.totalPrice, item.total_price), unitPrice * quantity);
        const name = readString(firstDefined(item.productName, item.product_name, item.name), 'Product');

        return {
            id: readString(item.id, `item-${index}`),
            productId: readString(firstDefined(item.productId, item.product_id)),
            variantId: readOptionalString(firstDefined(item.variantId, item.variant_id)),
            name,
            productName: name,
            variantName: readOptionalString(firstDefined(item.variantName, item.variant_name)),
            sku: readOptionalString(item.sku),
            imageUrl: readOptionalString(firstDefined(item.imageUrl, item.image_url, item.image)),
            image: readOptionalString(firstDefined(item.image, item.imageUrl, item.image_url)),
            price: unitPrice,
            quantity,
            unitPrice,
            totalPrice,
            fulfillmentStatus: normalizeFulfillmentStatus(firstDefined(item.fulfillmentStatus, item.fulfillment_status)),
        };
    });

    const tracking = {
        carrier: readOptionalString(firstDefined(adminFulfillment.trackingCarrier, readField(input, 'carrier', 'carrier'))),
        trackingNumber: readOptionalString(firstDefined(adminFulfillment.trackingNumber, readField(input, 'tracking_number', 'trackingNumber'))),
        trackingUrl: readOptionalString(firstDefined(adminFulfillment.trackingUrl, readField(input, 'tracking_url', 'trackingUrl'))),
        note: readOptionalString(adminFulfillment.note),
        fulfilledAt: readOptionalString(adminFulfillment.fulfilledAt),
        updatedAt: readOptionalString(adminFulfillment.updatedAt),
        updatedBy: readOptionalString(adminFulfillment.updatedBy),
    };

    return {
        id,
        projectId: readOptionalString(readField(input, 'project_id', 'projectId')),
        storeId: readOptionalString(readField(input, 'store_id', 'storeId')),
        orderNumber,
        orderId: id || orderNumber,
        customer: {
            id: readOptionalString(readField(input, 'customer_id', 'customerId')),
            name: readString(readField(input, 'customer_name', 'customerName')),
            email: readString(readField(input, 'customer_email', 'customerEmail')),
            phone: readOptionalString(readField(input, 'customer_phone', 'customerPhone')),
            shippingAddress: readRecord(readField(input, 'shipping_address', 'shippingAddress')),
            billingAddress: readRecord(readField(input, 'billing_address', 'billingAddress')),
        },
        items,
        subtotal: pricingSummary.subtotal,
        discountAmount: pricingSummary.discountAmount,
        shippingAmount: pricingSummary.shippingAmount,
        taxAmount: pricingSummary.taxAmount,
        totalAmount: pricingSummary.totalAmount,
        currency: pricingSummary.currency,
        paymentStatus: getPaymentStatus(input),
        fulfillmentStatus: getFulfillmentStatus(input),
        orderStatus: getOrderStatus(input),
        pricingSnapshot: {
            ...readRecord(data.pricingSnapshot),
            ...readRecord(pricing.pricingSnapshot),
            ...pricing,
        },
        shippingSnapshot: {
            methodId: pricing.shippingMethodId,
            methodName: pricing.shippingMethodName ?? readField(input, 'shipping_method', 'shippingMethod'),
            total: pricingSummary.shippingAmount,
        },
        taxSnapshot: {
            name: pricing.taxName,
            rate: pricing.taxRate,
            included: pricing.taxIncluded,
            breakdown: pricing.taxBreakdown,
            total: pricingSummary.taxAmount,
        },
        discountSnapshot: {
            code: firstDefined(readField(input, 'discount_code', 'discountCode'), pricing.discountCode),
            discount: pricing.discount,
            appliedDiscounts: pricing.appliedDiscounts,
            total: pricingSummary.discountAmount,
        },
        tracking,
        merchantNotes: readString(firstDefined(admin.merchantNotes, readField(input, 'internal_notes', 'internalNotes'))),
        timeline: getOrderTimeline(input),
        createdAt: readField(input, 'created_at', 'createdAt') as StoredTimestamp,
        updatedAt: readField(input, 'updated_at', 'updatedAt') as StoredTimestamp,
        rawData: data,
    };
};

export const canFulfillOrder = (input: EcommerceAdminOrderInput): boolean => {
    const order = normalizeOrderForAdmin(input);
    return order.paymentStatus === 'paid'
        && order.orderStatus !== 'cancelled'
        && order.orderStatus !== 'refunded'
        && order.fulfillmentStatus !== 'fulfilled'
        && order.fulfillmentStatus !== 'cancelled';
};

export const canCancelOrder = (input: EcommerceAdminOrderInput): boolean => {
    const order = normalizeOrderForAdmin(input);
    return order.orderStatus !== 'cancelled'
        && order.orderStatus !== 'refunded'
        && order.paymentStatus !== 'paid'
        && order.paymentStatus !== 'partially_refunded'
        && order.paymentStatus !== 'refunded';
};

export const canAddTracking = (input: EcommerceAdminOrderInput): boolean => {
    const order = normalizeOrderForAdmin(input);
    return order.orderStatus !== 'cancelled' && order.fulfillmentStatus !== 'cancelled';
};

export const appendOrderTimelineEvent = (input: {
    order?: EcommerceAdminOrderInput;
    data?: RecordValue;
    event: Omit<EcommerceOrderTimelineEvent, 'id' | 'createdAt'> & {
        id?: string;
        createdAt?: string;
    };
}): EcommerceOrderAdminMutation => {
    const data = getColumnData(input.data, input.order);
    const admin = readRecord(data.admin) as EcommerceAdminData;
    const createdAt = input.event.createdAt || nowIso();
    const event = createTimelineEvent(input.event.type, input.event.message, {
        id: input.event.id || `${input.event.type}-${createdAt}`,
        createdAt,
        metadata: input.event.metadata,
    });
    const timeline = readArray<unknown>(admin.timeline)
        .map(normalizeTimelineEvent)
        .filter((item): item is EcommerceOrderTimelineEvent => Boolean(item));

    if (timeline.some((item) => item.id === event.id)) {
        return {
            data,
            columnUpdates: {},
            skipped: true,
            message: 'Timeline event already exists',
        };
    }

    const nextTimeline = uniqueTimeline([...timeline, event]);

    return {
        data: withAdmin(data, { ...admin, timeline: nextTimeline }),
        columnUpdates: {},
        timelineEvent: event,
    };
};

export const updateFulfillmentStatus = (input: {
    order: EcommerceAdminOrderInput;
    data?: RecordValue;
    status: EcommerceFulfillmentStatus;
    updatedBy?: string;
    note?: string;
    now?: string;
}): EcommerceOrderAdminMutation => {
    const order = normalizeOrderForAdmin({ ...readRecord(input.order), data: input.data || readData(input.order) });
    const data = getColumnData(input.data, input.order);
    const admin = readRecord(data.admin) as EcommerceAdminData;
    const createdAt = input.now || nowIso();
    const status = normalizeFulfillmentStatus(input.status);

    if (order.orderStatus === 'cancelled' || order.fulfillmentStatus === 'cancelled') {
        throw new Error('Cancelled orders cannot be fulfilled.');
    }

    if (status === 'fulfilled' && order.fulfillmentStatus === 'fulfilled') {
        return {
            data,
            columnUpdates: {},
            skipped: true,
            message: 'Order is already fulfilled',
        };
    }

    if (status === 'fulfilled' && !canFulfillOrder({ ...readRecord(input.order), data })) {
        throw new Error('Only paid, active orders can be fulfilled.');
    }

    const fulfillment = {
        ...readRecord(admin.fulfillment),
        status,
        note: input.note || readOptionalString(readRecord(admin.fulfillment).note),
        fulfilledAt: status === 'fulfilled'
            ? readOptionalString(readRecord(admin.fulfillment).fulfilledAt) || createdAt
            : readOptionalString(readRecord(admin.fulfillment).fulfilledAt),
        updatedAt: createdAt,
        updatedBy: input.updatedBy,
    };
    const event = createTimelineEvent('fulfillment', `Fulfillment marked ${status}`, {
        id: `fulfillment-${status}-${createdAt}`,
        createdAt,
        metadata: { status, updatedBy: input.updatedBy, note: input.note },
    });
    const timeline = uniqueTimeline([
        ...readArray<unknown>(admin.timeline)
            .map(normalizeTimelineEvent)
            .filter((item): item is EcommerceOrderTimelineEvent => Boolean(item)),
        event,
    ]);

    return {
        data: withAdmin(data, { ...admin, fulfillment, timeline }),
        columnUpdates: { fulfillment_status: status },
        timelineEvent: event,
    };
};

export const updateOrderTracking = (input: {
    order: EcommerceAdminOrderInput;
    data?: RecordValue;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    note?: string;
    updatedBy?: string;
    now?: string;
}): EcommerceOrderAdminMutation => {
    if (!canAddTracking({ ...readRecord(input.order), data: input.data || readData(input.order) })) {
        throw new Error('Tracking cannot be added to cancelled orders.');
    }

    const data = getColumnData(input.data, input.order);
    const admin = readRecord(data.admin) as EcommerceAdminData;
    const createdAt = input.now || nowIso();
    const fulfillment = {
        ...readRecord(admin.fulfillment),
        trackingCarrier: readOptionalString(input.carrier),
        trackingNumber: readOptionalString(input.trackingNumber),
        trackingUrl: readOptionalString(input.trackingUrl),
        note: readOptionalString(input.note) || readOptionalString(readRecord(admin.fulfillment).note),
        updatedAt: createdAt,
        updatedBy: input.updatedBy,
    };
    const event = createTimelineEvent('tracking', 'Tracking information updated', {
        id: `tracking-${createdAt}`,
        createdAt,
        metadata: {
            carrier: input.carrier,
            trackingNumber: input.trackingNumber,
            trackingUrl: input.trackingUrl,
            updatedBy: input.updatedBy,
        },
    });
    const timeline = uniqueTimeline([
        ...readArray<unknown>(admin.timeline)
            .map(normalizeTimelineEvent)
            .filter((item): item is EcommerceOrderTimelineEvent => Boolean(item)),
        event,
    ]);

    return {
        data: withAdmin(data, { ...admin, fulfillment, timeline }),
        columnUpdates: {
            carrier: input.carrier || null,
            tracking_number: input.trackingNumber || null,
            tracking_url: input.trackingUrl || null,
        },
        timelineEvent: event,
    };
};

export const updateMerchantNotes = (input: {
    order?: EcommerceAdminOrderInput;
    data?: RecordValue;
    merchantNotes: string;
    updatedBy?: string;
    now?: string;
}): EcommerceOrderAdminMutation => {
    const data = getColumnData(input.data, input.order);
    const admin = readRecord(data.admin) as EcommerceAdminData;
    const createdAt = input.now || nowIso();
    const merchantNotes = input.merchantNotes;
    const event = createTimelineEvent('merchant_note', 'Merchant notes updated', {
        id: `merchant-note-${createdAt}`,
        createdAt,
        metadata: { updatedBy: input.updatedBy },
    });
    const timeline = uniqueTimeline([
        ...readArray<unknown>(admin.timeline)
            .map(normalizeTimelineEvent)
            .filter((item): item is EcommerceOrderTimelineEvent => Boolean(item)),
        event,
    ]);

    return {
        data: withAdmin(data, { ...admin, merchantNotes, timeline }),
        columnUpdates: {
            internal_notes: merchantNotes,
        },
        timelineEvent: event,
    };
};
