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

    // Static members (manually added contacts)
    staticMembers?: {
        leadIds?: string[];      // IDs de leads añadidos manualmente
        customerIds?: string[];  // IDs de clientes añadidos manualmente
        emails?: string[];       // Emails añadidos directamente
    };
    staticMemberCount?: number;  // Contador de miembros manuales

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

// =============================================================================
// EMAIL EDITOR - VISUAL BLOCK SYSTEM
// =============================================================================

/**
 * Tipos de bloques disponibles en el editor de email
 */
export type EmailBlockType =
    | 'hero'
    | 'text'
    | 'image'
    | 'button'
    | 'divider'
    | 'spacer'
    | 'columns'
    | 'products'
    | 'social'
    | 'footer';

/**
 * Tamaños de padding para bloques de email
 */
export type EmailPaddingSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Tamaños de fuente para bloques de email
 */
export type EmailFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Alineación de contenido
 */
export type EmailAlignment = 'left' | 'center' | 'right';

/**
 * Border radius opciones
 */
export type EmailBorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Estilos de un bloque de email
 */
export interface EmailBlockStyles {
    backgroundColor?: string;
    textColor?: string;
    headingColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    linkColor?: string;
    borderColor?: string;
    padding?: EmailPaddingSize;
    paddingTop?: EmailPaddingSize;
    paddingBottom?: EmailPaddingSize;
    alignment?: EmailAlignment;
    fontSize?: EmailFontSize;
    borderRadius?: EmailBorderRadius;
    borderWidth?: number;
}

/**
 * Contenido del bloque Hero
 */
export interface EmailHeroContent {
    headline: string;
    subheadline?: string;
    imageUrl?: string;
    imageAlt?: string;
    buttonText?: string;
    buttonUrl?: string;
    showButton?: boolean;
}

/**
 * Contenido del bloque Text
 */
export interface EmailTextContent {
    text: string;
    isHtml?: boolean;
}

/**
 * Contenido del bloque Image
 */
export interface EmailImageContent {
    src: string;
    alt?: string;
    link?: string;
    width?: number; // percentage 0-100
}

/**
 * Contenido del bloque Button
 */
export interface EmailButtonContent {
    text: string;
    url: string;
    fullWidth?: boolean;
}

/**
 * Contenido del bloque Divider
 */
export interface EmailDividerContent {
    style: 'solid' | 'dashed' | 'dotted';
    thickness: number; // 1-5
    width: number; // percentage 0-100
}

/**
 * Contenido del bloque Spacer
 */
export interface EmailSpacerContent {
    height: number; // in pixels
}

/**
 * Contenido del bloque Columns
 */
export interface EmailColumnsContent {
    columnCount: 2 | 3;
    columns: EmailBlock[][];
    gap?: EmailPaddingSize;
}

/**
 * Contenido del bloque Products
 */
export interface EmailProductsContent {
    productIds: string[];
    showPrices: boolean;
    showButtons: boolean;
    buttonText: string;
    columns: 1 | 2 | 3;
}

/**
 * Contenido del bloque Social
 */
export interface EmailSocialContent {
    links: EmailSocialLinks;
    iconStyle: 'color' | 'mono' | 'outline';
    iconSize: 'sm' | 'md' | 'lg';
}

/**
 * Contenido del bloque Footer
 */
export interface EmailFooterContent {
    companyName?: string;
    address?: string;
    showUnsubscribe: boolean;
    unsubscribeText?: string;
    showSocialLinks: boolean;
    socialLinks?: EmailSocialLinks;
    copyrightText?: string;
}

/**
 * Union type para contenido de bloques
 */
export type EmailBlockContent =
    | EmailHeroContent
    | EmailTextContent
    | EmailImageContent
    | EmailButtonContent
    | EmailDividerContent
    | EmailSpacerContent
    | EmailColumnsContent
    | EmailProductsContent
    | EmailSocialContent
    | EmailFooterContent;

/**
 * Bloque de email individual
 */
export interface EmailBlock {
    id: string;
    type: EmailBlockType;
    visible: boolean;
    content: EmailBlockContent;
    styles: EmailBlockStyles;
}

/**
 * Estilos globales del documento de email
 */
export interface EmailGlobalStyles {
    fontFamily: string;
    primaryColor: string;
    secondaryColor?: string;
    backgroundColor: string;
    bodyBackgroundColor: string;
    headingColor: string;
    textColor: string;
    linkColor: string;
    borderRadius: EmailBorderRadius;
}

/**
 * Documento completo de email (para el editor visual)
 */
export interface EmailDocument {
    id: string;
    name: string;
    subject: string;
    previewText?: string;
    blocks: EmailBlock[];
    globalStyles: EmailGlobalStyles;
    createdAt?: FirebaseTimestamp;
    updatedAt?: FirebaseTimestamp;
}

/**
 * Configuración por defecto para estilos globales
 */
export const DEFAULT_EMAIL_GLOBAL_STYLES: EmailGlobalStyles = {
    fontFamily: 'Arial, sans-serif',
    primaryColor: '#4f46e5',
    secondaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    bodyBackgroundColor: '#f4f4f5',
    headingColor: '#18181b',
    textColor: '#52525b',
    linkColor: '#4f46e5',
    borderRadius: 'md',
};

/**
 * Contenido por defecto para cada tipo de bloque
 */
export const DEFAULT_BLOCK_CONTENT: Record<EmailBlockType, EmailBlockContent> = {
    hero: {
        headline: 'Welcome to our newsletter',
        subheadline: 'Stay updated with the latest news and offers',
        imageUrl: '',
        buttonText: 'Learn More',
        buttonUrl: '#',
        showButton: true,
    } as EmailHeroContent,
    text: {
        text: 'Enter your text here...',
        isHtml: false,
    } as EmailTextContent,
    image: {
        src: '',
        alt: 'Image description',
        width: 100,
    } as EmailImageContent,
    button: {
        text: 'Click Here',
        url: '#',
        fullWidth: false,
    } as EmailButtonContent,
    divider: {
        style: 'solid',
        thickness: 1,
        width: 100,
    } as EmailDividerContent,
    spacer: {
        height: 32,
    } as EmailSpacerContent,
    columns: {
        columnCount: 2,
        columns: [[], []],
        gap: 'md',
    } as EmailColumnsContent,
    products: {
        productIds: [],
        showPrices: true,
        showButtons: true,
        buttonText: 'View Product',
        columns: 2,
    } as EmailProductsContent,
    social: {
        links: {},
        iconStyle: 'color',
        iconSize: 'md',
    } as EmailSocialContent,
    footer: {
        companyName: 'Your Company',
        showUnsubscribe: true,
        unsubscribeText: 'Unsubscribe from this list',
        showSocialLinks: false,
        copyrightText: '© 2024 All rights reserved',
    } as EmailFooterContent,
};

/**
 * Estilos por defecto para cada tipo de bloque
 */
export const DEFAULT_BLOCK_STYLES: Record<EmailBlockType, EmailBlockStyles> = {
    hero: {
        backgroundColor: '#4f46e5',
        textColor: '#ffffff',
        headingColor: '#ffffff',
        buttonColor: '#ffffff',
        buttonTextColor: '#4f46e5',
        padding: 'lg',
        alignment: 'center',
        borderRadius: 'none',
    },
    text: {
        backgroundColor: 'transparent',
        textColor: '#52525b',
        padding: 'md',
        alignment: 'left',
        fontSize: 'md',
    },
    image: {
        padding: 'sm',
        alignment: 'center',
        borderRadius: 'md',
    },
    button: {
        buttonColor: '#4f46e5',
        buttonTextColor: '#ffffff',
        padding: 'md',
        alignment: 'center',
        borderRadius: 'md',
    },
    divider: {
        borderColor: '#e4e4e7',
        padding: 'sm',
    },
    spacer: {
        padding: 'none',
    },
    columns: {
        padding: 'md',
        backgroundColor: 'transparent',
    },
    products: {
        backgroundColor: 'transparent',
        padding: 'md',
        buttonColor: '#4f46e5',
        buttonTextColor: '#ffffff',
    },
    social: {
        padding: 'md',
        alignment: 'center',
    },
    footer: {
        backgroundColor: '#f4f4f5',
        textColor: '#71717a',
        padding: 'lg',
        alignment: 'center',
        fontSize: 'sm',
    },
};











