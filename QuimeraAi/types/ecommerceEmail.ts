export type EcommerceTransactionalEmailType =
    | 'order_confirmation'
    | 'merchant_new_order'
    | 'payment_failed'
    | 'abandoned_cart'
    | 'shipping_confirmation'
    | 'refund_confirmation'
    | 'low_stock_alert'
    | 'back_in_stock'
    | 'gift_card_confirmation';

export type EcommerceTransactionalEmailStatus =
    | 'draft'
    | 'queued'
    | 'sending'
    | 'sent'
    | 'skipped'
    | 'failed';

export interface EcommerceEmailJob {
    id: string;
    projectId: string;
    storeId?: string | null;
    publicStoreId?: string | null;
    orderId?: string | null;
    cartId?: string | null;
    customerEmail?: string | null;
    merchantEmail?: string | null;
    type: EcommerceTransactionalEmailType;
    status: EcommerceTransactionalEmailStatus;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    createdAt: string;
    sentAt?: string | null;
    error?: string | null;
}

export interface EcommerceEmailRenderContext {
    store?: Record<string, unknown> | null;
    order?: Record<string, unknown> | null;
    customer?: Record<string, unknown> | null;
    items?: Array<Record<string, unknown>> | null;
    totals?: Record<string, unknown> | null;
    shipping?: Record<string, unknown> | null;
    payment?: Record<string, unknown> | null;
    products?: Array<Record<string, unknown>> | null;
    settings?: Record<string, unknown> | null;
}

export interface EcommerceEmailRenderResult {
    type: EcommerceTransactionalEmailType;
    subject: string;
    html: string;
    text: string;
}

export interface EcommerceEmailSettings {
    exists: boolean;
    enabled: boolean;
    provider: string;
    apiKeyConfigured: boolean;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    primaryColor?: string;
    footerText?: string;
    transactional: Record<string, unknown>;
    marketing: Record<string, unknown>;
    raw?: Record<string, unknown> | null;
}

export interface EcommerceStoreEmailSettings {
    sendOrderConfirmation?: boolean;
    notifyOnNewOrder?: boolean;
    notifyOnLowStock?: boolean;
    sendShippingNotification?: boolean;
    merchantEmail?: string;
    raw?: Record<string, unknown> | null;
}

export interface EcommerceEmailDeliveryResult {
    type: EcommerceTransactionalEmailType;
    status: EcommerceTransactionalEmailStatus;
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
    idempotencyKey: string;
    providerMessageId?: string;
    skippedReason?: string;
    error?: string;
    existingLogId?: string;
    logId?: string;
}
