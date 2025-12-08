/**
 * Email System Types
 * Tipos para el sistema de email de Quimera AI
 */

import { FirebaseTimestamp } from './ecommerce';

// =============================================================================
// EMAIL SETTINGS
// =============================================================================

/**
 * Configuración de email por tienda/proyecto
 */
export interface EmailSettings {
    // Provider config
    provider: 'resend' | 'sendgrid';
    apiKeyConfigured: boolean; // Solo indica si está configurado, no guarda la key
    
    // Sender info
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    
    // Branding
    logoUrl?: string;
    primaryColor: string;
    footerText?: string;
    socialLinks?: EmailSocialLinks;
    
    // Transactional email toggles
    transactional: TransactionalEmailSettings;
    
    // Marketing email settings
    marketing: MarketingEmailSettings;
    
    // Timestamps
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

export interface EmailSocialLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
}

export interface TransactionalEmailSettings {
    // Order emails
    orderConfirmation: boolean;
    orderShipped: boolean;
    orderDelivered: boolean;
    orderCancelled: boolean;
    orderRefunded: boolean;
    
    // Review request
    reviewRequest: boolean;
    reviewRequestDelayDays: number; // días después de entrega
    
    // Admin notifications
    newOrderNotification: boolean;
    lowStockNotification: boolean;
}

export interface MarketingEmailSettings {
    enabled: boolean;
    
    // Automated emails
    welcomeEmail: boolean;
    abandonedCartEnabled: boolean;
    abandonedCartDelayHours: number;
    
    // Win-back
    winBackEnabled: boolean;
    winBackDelayDays: number;
}

// =============================================================================
// EMAIL CAMPAIGNS
// =============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'paused';
export type CampaignType = 'newsletter' | 'promotion' | 'announcement' | 'automated';
export type AudienceType = 'all' | 'segment' | 'custom';

/**
 * Campaña de email marketing
 */
export interface EmailCampaign {
    id: string;
    name: string;
    type: CampaignType;
    
    // Content
    subject: string;
    previewText?: string;
    templateId?: string;
    htmlContent: string;
    
    // Audience
    audienceType: AudienceType;
    audienceSegmentId?: string;
    customRecipientEmails?: string[];
    excludeEmails?: string[];
    
    // Scheduling
    status: CampaignStatus;
    scheduledAt?: FirebaseTimestamp;
    sentAt?: FirebaseTimestamp;
    
    // Stats
    stats: CampaignStats;
    
    // Metadata
    tags?: string[];
    createdBy: string;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

export interface CampaignStats {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    uniqueOpens: number;
    clicked: number;
    uniqueClicks: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
}

// =============================================================================
// EMAIL LOG
// =============================================================================

export type EmailType = 'transactional' | 'marketing';
export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'complained';

/**
 * Registro de email enviado
 */
export interface EmailLog {
    id: string;
    type: EmailType;
    templateId: string;
    campaignId?: string;
    
    // Recipient
    recipientEmail: string;
    recipientName?: string;
    customerId?: string;
    
    // Content
    subject: string;
    
    // Status tracking
    status: EmailStatus;
    
    // Provider info
    providerMessageId?: string;
    provider: 'resend' | 'sendgrid';
    
    // Timestamps
    sentAt: FirebaseTimestamp;
    deliveredAt?: FirebaseTimestamp;
    openedAt?: FirebaseTimestamp;
    clickedAt?: FirebaseTimestamp;
    bouncedAt?: FirebaseTimestamp;
    
    // Error info
    errorMessage?: string;
    errorCode?: string;
    
    // Context
    orderId?: string;
    leadId?: string;
    metadata?: Record<string, any>;
}

// =============================================================================
// EMAIL AUDIENCES / SEGMENTS
// =============================================================================

export type AudienceFilterOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';

export interface AudienceFilter {
    field: string;
    operator: AudienceFilterOperator;
    value: any;
}

/**
 * Segmento de audiencia para email marketing
 */
export interface EmailAudience {
    id: string;
    name: string;
    description?: string;
    
    // Filter conditions (AND logic)
    filters: AudienceFilter[];
    
    // Pre-built filters
    acceptsMarketing?: boolean;
    hasOrdered?: boolean;
    minOrders?: number;
    maxOrders?: number;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    tags?: string[];
    excludeTags?: string[];
    lastOrderDaysAgo?: number;
    source?: string[]; // 'ecommerce', 'lead-form', 'import'
    
    // Dynamic count (updated periodically)
    estimatedCount: number;
    lastCountUpdate?: FirebaseTimestamp;
    
    // Metadata
    isDefault: boolean;
    createdBy: string;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export type TemplateCategory = 'transactional' | 'marketing';
export type TemplateType = 
    // Transactional
    | 'order-confirmation'
    | 'order-shipped'
    | 'order-delivered'
    | 'order-cancelled'
    | 'order-refunded'
    | 'new-order-admin'
    | 'low-stock-alert'
    | 'review-request'
    | 'lead-notification'
    | 'welcome'
    | 'password-reset'
    | 'abandoned-cart'
    // Marketing
    | 'newsletter'
    | 'promotion'
    | 'announcement'
    | 'custom';

/**
 * Template de email
 */
export interface EmailTemplate {
    id: string;
    name: string;
    category: TemplateCategory;
    type: TemplateType;
    
    // Content
    subject: string;
    previewText?: string;
    htmlContent: string;
    
    // Variables available in this template
    availableVariables: TemplateVariable[];
    
    // Metadata
    isDefault: boolean;
    isActive: boolean;
    
    // Thumbnail for gallery
    thumbnailUrl?: string;
    
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

export interface TemplateVariable {
    name: string;
    description: string;
    defaultValue?: string;
    required: boolean;
}

// =============================================================================
// EMAIL AUTOMATION
// =============================================================================

export type AutomationType = 'welcome' | 'abandoned-cart' | 'post-purchase' | 'win-back' | 'birthday';
export type AutomationStatus = 'active' | 'paused' | 'draft';

/**
 * Automatización de email
 */
export interface EmailAutomation {
    id: string;
    name: string;
    type: AutomationType;
    status: AutomationStatus;
    
    // Trigger configuration
    triggerConfig: AutomationTrigger;
    
    // Email to send
    templateId: string;
    subject: string;
    
    // Delay before sending
    delayMinutes: number;
    
    // Stats
    stats: {
        triggered: number;
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
    };
    
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

export interface AutomationTrigger {
    type: 'event' | 'schedule';
    event?: string; // 'customer.created', 'cart.abandoned', 'order.delivered'
    schedule?: string; // cron expression
    conditions?: AudienceFilter[];
}

// =============================================================================
// EMAIL UNSUBSCRIBE
// =============================================================================

/**
 * Registro de unsubscribe
 */
export interface EmailUnsubscribe {
    id: string;
    email: string;
    reason?: string;
    campaignId?: string;
    unsubscribedAt: FirebaseTimestamp;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Datos para enviar un email
 */
export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    tags?: EmailTag[];
    metadata?: Record<string, any>;
}

export interface EmailTag {
    name: string;
    value: string;
}

/**
 * Resultado del envío de email
 */
export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Variables para renderizar templates
 */
export interface OrderEmailVariables {
    storeName: string;
    logoUrl?: string;
    primaryColor: string;
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderDate: string;
    items: OrderItemForEmail[];
    subtotal: string;
    shipping: string;
    discount?: string;
    tax: string;
    total: string;
    currency: string;
    currencySymbol: string;
    shippingAddress: AddressForEmail;
    trackingNumber?: string;
    trackingUrl?: string;
    footerText?: string;
    socialLinks?: EmailSocialLinks;
}

export interface OrderItemForEmail {
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    imageUrl?: string;
}

export interface AddressForEmail {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
}

export interface LeadEmailVariables {
    siteName: string;
    leadName: string;
    leadEmail: string;
    leadCompany?: string;
    leadPhone?: string;
    leadMessage?: string;
    leadSource: string;
    leadScore?: number;
    leadTags?: string[];
    submittedAt: string;
    dashboardUrl: string;
}

export interface WelcomeEmailVariables {
    storeName: string;
    logoUrl?: string;
    primaryColor: string;
    customerName: string;
    discountCode?: string;
    discountPercent?: number;
    shopUrl: string;
    footerText?: string;
    socialLinks?: EmailSocialLinks;
}
