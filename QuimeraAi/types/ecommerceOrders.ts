import type {
    Address,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    StoredTimestamp,
} from './ecommerce';

export type EcommerceFulfillmentStatus =
    | 'unfulfilled'
    | 'processing'
    | 'partially_fulfilled'
    | 'fulfilled'
    | 'cancelled';

export type EcommercePaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded'
    | 'partially_refunded'
    | 'cancelled';

export type EcommerceOrderTimelineType =
    | 'order_created'
    | 'payment_status'
    | 'fulfillment'
    | 'tracking'
    | 'merchant_note'
    | 'inventory'
    | 'email'
    | 'system';

export interface EcommerceOrderCustomer {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    shippingAddress?: Partial<Address>;
    billingAddress?: Partial<Address>;
}

export interface EcommerceAdminOrderItem extends OrderItem {
    fulfillmentStatus?: EcommerceFulfillmentStatus;
}

export interface EcommerceOrderTracking {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    note?: string;
    fulfilledAt?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface EcommerceOrderTimelineEvent {
    id: string;
    type: EcommerceOrderTimelineType;
    message: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface EcommerceOrderPricingSummary {
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    calculationVersion?: string;
}

export interface EcommerceAdminData {
    merchantNotes?: string;
    fulfillment?: EcommerceOrderTracking & {
        status?: EcommerceFulfillmentStatus;
    };
    timeline?: EcommerceOrderTimelineEvent[];
    refundFoundation?: {
        message?: string;
        updatedAt?: string;
        updatedBy?: string;
    };
}

export interface EcommerceAdminOrder {
    id: string;
    projectId?: string;
    storeId?: string;
    orderNumber: string;
    orderId: string;
    customer: EcommerceOrderCustomer;
    items: EcommerceAdminOrderItem[];
    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    paymentStatus: EcommercePaymentStatus;
    fulfillmentStatus: EcommerceFulfillmentStatus;
    orderStatus: OrderStatus;
    pricingSnapshot: Record<string, unknown>;
    shippingSnapshot: Record<string, unknown>;
    taxSnapshot: Record<string, unknown>;
    discountSnapshot: Record<string, unknown>;
    tracking: EcommerceOrderTracking;
    merchantNotes: string;
    timeline: EcommerceOrderTimelineEvent[];
    createdAt: StoredTimestamp;
    updatedAt: StoredTimestamp;
    rawData: Record<string, unknown>;
}

export type EcommerceAdminOrderInput = Partial<Order> | Record<string, unknown>;

export interface EcommerceOrderAdminMutation {
    data: Record<string, unknown>;
    columnUpdates: Record<string, unknown>;
    timelineEvent?: EcommerceOrderTimelineEvent;
    skipped?: boolean;
    message?: string;
}

