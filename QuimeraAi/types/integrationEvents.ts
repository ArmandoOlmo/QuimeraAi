import type { PlatformServiceId } from './serviceAvailability.ts';

export type IntegrationEventModule =
    | 'ai-studio'
    | 'website-builder'
    | 'storefront-builder'
    | 'ecommerce'
    | 'chatbot'
    | 'crm'
    | 'email-marketing'
    | 'media-ai'
    | 'appointments'
    | 'restaurant'
    | 'real-estate'
    | 'finance'
    | 'analytics'
    | 'automation'
    | PlatformServiceId;

export type IntegrationEventEntityType =
    | 'business_blueprint'
    | 'website'
    | 'website_section'
    | 'storefront_template'
    | 'storefront_section'
    | 'product'
    | 'category'
    | 'cart'
    | 'checkout'
    | 'order'
    | 'customer'
    | 'lead'
    | 'email'
    | 'chatbot_knowledge'
    | 'appointment'
    | 'restaurant_menu_item'
    | 'reservation'
    | 'real_estate_listing'
    | 'transaction'
    | 'analytics_event'
    | 'automation_flow';

export type IntegrationEventType =
    | 'blueprint_generated'
    | 'blueprint_updated'
    | 'module_configured'
    | 'module_disabled'
    | 'content_generated'
    | 'content_review_requested'
    | 'content_user_modified'
    | 'product_viewed'
    | 'collection_viewed'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'checkout_started'
    | 'checkout_failed'
    | 'purchase_completed'
    | 'order_created'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'order_fulfilled'
    | 'order_refunded'
    | 'cart_abandoned'
    | 'low_stock'
    | 'back_in_stock'
    | 'gift_card_purchased'
    | 'newsletter_signup'
    | 'product_inquiry'
    | 'chatbot_product_question'
    | 'lead_created'
    | 'email_flow_queued'
    | 'email_sent'
    | 'inventory_low_stock'
    | 'inventory_back_in_stock'
    | string;

export interface IntegrationEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
    id: string;
    projectId: string;
    tenantId?: string;
    workspaceId?: string;
    sourceModule: IntegrationEventModule;
    eventType: IntegrationEventType;
    entityType: IntegrationEventEntityType;
    entityId?: string;
    payload: TPayload;
    createdAt: string;
    createdBy?: string;
    correlationId?: string;
}

export type EcommerceEmailEventType =
    | 'order_created'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'checkout_started'
    | 'cart_abandoned'
    | 'order_fulfilled'
    | 'order_refunded'
    | 'low_stock'
    | 'back_in_stock'
    | 'gift_card_purchased';

export interface EcommerceEmailEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
    eventId: string;
    eventType: EcommerceEmailEventType;
    tenantId?: string | null;
    projectId: string;
    storeId?: string | null;
    engineStoreId?: string | null;
    orderId?: string | null;
    checkoutSessionId?: string | null;
    customerId?: string | null;
    recipientEmail?: string | null;
    recipientName?: string | null;
    payload: TPayload;
    idempotencyKey: string;
    sourceModule: 'ecommerce';
    createdAt: string;
}
