import type {
    EcommerceEmailDeliveryResult,
    EcommerceEmailEvent,
    EcommerceEmailEventInput,
    EcommerceEmailRenderContext,
    EcommerceEmailRenderResult,
    EcommerceEmailSettings,
    EcommerceEmailTemplateValidation,
    EcommerceStoreEmailSettings,
    EcommerceTransactionalEmailTemplate,
    EcommerceTransactionalEmailStatus,
    EcommerceTransactionalEmailType,
} from '../../types/ecommerceEmail.ts';

type SupabaseClient = any;

export interface EcommerceEmailProvider {
    send(input: {
        from: string;
        replyTo?: string;
        to: string[];
        subject: string;
        html: string;
        text?: string;
    }): Promise<{ providerMessageId?: string }>;
}

export interface EcommerceEmailLogRow {
    id?: string;
    project_id?: string | null;
    store_id?: string | null;
    user_id?: string | null;
    type?: string | null;
    template_id?: string | null;
    campaign_id?: string | null;
    recipient_email?: string | null;
    recipient_name?: string | null;
    customer_id?: string | null;
    subject?: string | null;
    status?: EcommerceTransactionalEmailStatus | string | null;
    provider_message_id?: string | null;
    provider?: string | null;
    event_type?: string | null;
    template_type?: string | null;
    idempotency_key?: string | null;
    error_message?: string | null;
    error_code?: string | null;
    order_id?: string | null;
    lead_id?: string | null;
    metadata?: Record<string, unknown> | null;
    sent_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface EcommerceEmailRepository {
    getEmailSettings(input: {
        projectId: string;
        storeId?: string | null;
        publicStoreId?: string | null;
    }): Promise<Record<string, unknown> | null>;
    getStoreSettings(input: {
        projectId: string;
        storeId?: string | null;
        publicStoreId?: string | null;
    }): Promise<Record<string, unknown> | null>;
    findEmailLogByIdempotencyKey(idempotencyKey: string): Promise<EcommerceEmailLogRow | null>;
    insertEmailLog(row: EcommerceEmailLogRow): Promise<EcommerceEmailLogRow>;
}

export interface EcommerceEmailServiceInput {
    repository: EcommerceEmailRepository;
    provider?: EcommerceEmailProvider;
    defaultFromEmail?: string;
    now?: string | Date;
}

export interface QueueOrSendEcommerceEmailInput extends EcommerceEmailServiceInput {
    type: EcommerceTransactionalEmailType;
    context: EcommerceEmailRenderContext;
    idempotencyKey: string;
    recipientEmail?: string | null;
    recipientName?: string | null;
    metadata?: Record<string, unknown>;
}

export interface SendEcommerceEmailInput extends EcommerceEmailServiceInput {
    context: EcommerceEmailRenderContext;
    eventId?: string | null;
    idempotencyKey?: string | null;
}

export interface SendLowStockAlertInput extends SendEcommerceEmailInput {
    product?: Record<string, unknown> | null;
    currentQuantity?: number | null;
    threshold?: number | null;
}

const DEFAULT_FROM_EMAIL = 'Quimera Ai <no-reply@quimera.ai>';
const DEFAULT_PRIMARY_COLOR = '#4f46e5';

const configuredReadiness = { isReady: true, blockers: [], warnings: [] };
const needsReviewReadiness = (blockers: string[] = ['Template must be reviewed before activation.']) => ({
    isReady: false,
    blockers,
    warnings: [],
});

export const ECOMMERCE_TRANSACTIONAL_EMAIL_TEMPLATES: Record<EcommerceTransactionalEmailType, EcommerceTransactionalEmailTemplate> = {
    order_confirmation: {
        id: 'ecommerce.order_confirmation.system',
        type: 'order_confirmation',
        subject: 'Order {{orderNumber}} confirmed',
        previewText: 'Confirm a customer order only after payment succeeds.',
        bodyText: 'Customer-safe paid order summary using reviewed order, item, and total data.',
        variables: ['storeName', 'orderNumber', 'customerEmail', 'customerName', 'orderItems', 'orderTotal', 'paymentStatus'],
        requiredVariables: ['storeName', 'orderNumber', 'customerEmail', 'orderTotal', 'paymentConfirmed'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    merchant_new_order: {
        id: 'ecommerce.merchant_new_order.system',
        type: 'merchant_new_order',
        subject: 'New paid order {{orderNumber}}',
        previewText: 'Notify the merchant after payment succeeds.',
        bodyText: 'Merchant-safe paid order alert with customer contact and order total.',
        variables: ['storeName', 'merchantEmail', 'orderNumber', 'customerEmail', 'orderTotal', 'paymentStatus'],
        requiredVariables: ['storeName', 'merchantEmail', 'orderNumber', 'orderTotal', 'paymentConfirmed'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    payment_failed: {
        id: 'ecommerce.payment_failed.system',
        type: 'payment_failed',
        subject: 'Payment issue for order {{orderNumber}}',
        previewText: 'Tell the customer a payment failed without exposing payment details.',
        bodyText: 'Payment failed notice without card, payment method, or sensitive Stripe data.',
        variables: ['storeName', 'orderNumber', 'customerEmail', 'customerName', 'paymentStatus'],
        requiredVariables: ['storeName', 'orderNumber', 'customerEmail', 'paymentFailed'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    fulfillment_confirmation: {
        id: 'ecommerce.fulfillment_confirmation.system',
        type: 'fulfillment_confirmation',
        subject: 'Order {{orderNumber}} fulfilled',
        previewText: 'Confirm fulfillment without inventing tracking data.',
        bodyText: 'Fulfillment confirmation using only stored carrier, tracking, and fulfillment status data.',
        variables: ['storeName', 'orderNumber', 'customerEmail', 'fulfillmentStatus', 'trackingNumber', 'trackingUrl', 'carrier'],
        requiredVariables: ['storeName', 'orderNumber', 'customerEmail', 'fulfilled'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    shipping_confirmation: {
        id: 'ecommerce.shipping_confirmation.system',
        type: 'shipping_confirmation',
        subject: 'Order {{orderNumber}} fulfilled',
        previewText: 'Alias for fulfillment confirmation.',
        bodyText: 'Shipping notification backed by fulfillment data.',
        variables: ['storeName', 'orderNumber', 'customerEmail', 'fulfillmentStatus', 'trackingNumber', 'trackingUrl', 'carrier'],
        requiredVariables: ['storeName', 'orderNumber', 'customerEmail', 'fulfilled'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    refund_confirmation: {
        id: 'ecommerce.refund_confirmation.system',
        type: 'refund_confirmation',
        subject: 'Refund update for order {{orderNumber}}',
        previewText: 'Confirm a stored refund without inventing amount or reason.',
        bodyText: 'Refund confirmation from persisted refund/payment state.',
        variables: ['storeName', 'orderNumber', 'customerEmail', 'refundAmount', 'paymentStatus'],
        requiredVariables: ['storeName', 'orderNumber', 'customerEmail', 'refundRecorded'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    low_stock_alert: {
        id: 'ecommerce.low_stock_alert.system',
        type: 'low_stock_alert',
        subject: 'Low stock: {{productName}}',
        previewText: 'Alert merchant only when inventory tracking is configured.',
        bodyText: 'Merchant low stock alert from tracked inventory data.',
        variables: ['storeName', 'merchantEmail', 'productName', 'currentQuantity', 'lowStockThreshold'],
        requiredVariables: ['storeName', 'merchantEmail', 'productName', 'inventoryTrackingConfigured', 'lowStockThreshold'],
        status: 'configured',
        generatedByAI: false,
        userModified: false,
        readiness: configuredReadiness,
    },
    abandoned_cart: {
        id: 'ecommerce.abandoned_cart.draft',
        type: 'abandoned_cart',
        subject: 'Still thinking it over?',
        previewText: 'Draft cart recovery flow. Requires review before activation.',
        bodyText: 'Draft recovery reminder using customer email, cart items, and checkout URL.',
        variables: ['storeName', 'customerEmail', 'cartItems', 'checkoutUrl'],
        requiredVariables: ['storeName', 'customerEmail', 'cartItems', 'checkoutUrl'],
        status: 'needs_review',
        generatedByAI: true,
        userModified: false,
        readiness: needsReviewReadiness(['Abandoned cart flow must be reviewed and enabled before sending.']),
    },
    back_in_stock: {
        id: 'ecommerce.back_in_stock.draft',
        type: 'back_in_stock',
        subject: '{{productName}} is back in stock',
        previewText: 'Draft back-in-stock flow. Requires consent and review.',
        bodyText: 'Draft inventory availability alert for opted-in customers.',
        variables: ['storeName', 'customerEmail', 'productName'],
        requiredVariables: ['storeName', 'customerEmail', 'productName', 'inventoryTrackingConfigured'],
        status: 'needs_review',
        generatedByAI: true,
        userModified: false,
        readiness: needsReviewReadiness(['Back-in-stock flow requires customer consent and merchant review.']),
    },
    gift_card_confirmation: {
        id: 'ecommerce.gift_card_confirmation.draft',
        type: 'gift_card_confirmation',
        subject: 'Gift card purchase confirmation',
        previewText: 'Draft gift card confirmation. Requires delivery/redemption review.',
        bodyText: 'Draft gift card purchase confirmation without redemption assumptions.',
        variables: ['storeName', 'customerEmail', 'giftCardAmount', 'recipientEmail'],
        requiredVariables: ['storeName', 'customerEmail', 'giftCardAmount'],
        status: 'needs_review',
        generatedByAI: true,
        userModified: false,
        readiness: needsReviewReadiness(['Gift card delivery and redemption rules must be configured.']),
    },
};

export function createEcommerceEmailEventIdempotencyKey(input: {
    tenantId?: string | null;
    projectId: string;
    storeId?: string | null;
    engineStoreId?: string | null;
    eventType: string;
    orderId?: string | null;
    checkoutSessionId?: string | null;
    providerEventId?: string | null;
    eventId?: string | null;
}) {
    return [
        input.tenantId || 'tenant',
        input.projectId || 'project',
        input.engineStoreId || input.storeId || 'store',
        input.eventType || 'event',
        input.orderId || input.checkoutSessionId || 'order',
        input.providerEventId || input.eventId || 'provider-event',
    ].join(':');
}

export function normalizeEcommerceEmailEvent(input: EcommerceEmailEventInput): EcommerceEmailEvent {
    const createdAt = input.createdAt || new Date().toISOString();
    const eventId = String(
        input.eventId
            || input.providerEventId
            || input.orderId
            || input.checkoutSessionId
            || `${input.eventType}:${createdAt}`,
    );
    const payload = sanitizeMetadata({
        ...(input.payload || {}),
        providerEventId: input.providerEventId || undefined,
    });

    return {
        eventId,
        eventType: input.eventType,
        tenantId: input.tenantId || null,
        projectId: input.projectId,
        storeId: input.storeId || null,
        engineStoreId: input.engineStoreId || input.storeId || null,
        orderId: input.orderId || null,
        checkoutSessionId: input.checkoutSessionId || null,
        customerId: input.customerId || null,
        recipientEmail: normalizeEmail(input.recipientEmail) || null,
        recipientName: stringOrNull(input.recipientName),
        payload,
        idempotencyKey: createEcommerceEmailEventIdempotencyKey({
            tenantId: input.tenantId,
            projectId: input.projectId,
            storeId: input.storeId,
            engineStoreId: input.engineStoreId,
            eventType: input.eventType,
            orderId: input.orderId,
            checkoutSessionId: input.checkoutSessionId,
            providerEventId: input.providerEventId,
            eventId,
        }),
        sourceModule: 'ecommerce',
        createdAt,
    };
}

export function getEcommerceTransactionalEmailTemplate(type: EcommerceTransactionalEmailType): EcommerceTransactionalEmailTemplate {
    return ECOMMERCE_TRANSACTIONAL_EMAIL_TEMPLATES[type];
}

export function createEcommerceEmailDeliveryIdempotencyKey(input: {
    event: EcommerceEmailEvent;
    templateType: EcommerceTransactionalEmailType;
    recipientEmail?: string | null;
}) {
    return [
        input.event.idempotencyKey,
        input.templateType,
        normalizeEmail(input.recipientEmail) || 'recipient',
    ].join(':');
}

export function validateEcommerceEmailTemplateVariables(
    type: EcommerceTransactionalEmailType,
    context: EcommerceEmailRenderContext,
): EcommerceEmailTemplateValidation {
    const template = getEcommerceTransactionalEmailTemplate(type);
    const values = resolveTemplateVariables(type, context);
    const missingVariables = template.requiredVariables.filter(variable => !values[variable]);
    const blockers = [...missingVariables.map(variable => `Missing required variable: ${variable}`)];
    const warnings: string[] = [];

    if (template.status !== 'configured') {
        blockers.push(`Template ${template.id} is ${template.status}`);
    }

    if ((type === 'order_confirmation' || type === 'merchant_new_order') && !isPaymentConfirmed(context)) {
        blockers.push('Payment is not confirmed');
    }

    if (type === 'payment_failed' && !isPaymentFailed(context)) {
        blockers.push('Payment failure is not confirmed');
    }

    if ((type === 'low_stock_alert' || type === 'back_in_stock') && !isInventoryTrackingConfigured(context)) {
        blockers.push('Inventory tracking is not configured');
    }

    if ((type === 'fulfillment_confirmation' || type === 'shipping_confirmation') && !isFulfilled(context)) {
        blockers.push('Order fulfillment is not confirmed');
    }

    if (type === 'refund_confirmation' && !hasRefundRecord(context)) {
        blockers.push('Refund is not recorded');
    }

    if (readItems(context).some(item => !hasValidLineItemPrice(item))) {
        warnings.push('One or more item prices are unavailable and will be omitted.');
    }

    return {
        valid: blockers.length === 0,
        missingVariables,
        blockers,
        warnings,
    };
}

export function createSupabaseEcommerceEmailRepository(supabase: SupabaseClient): EcommerceEmailRepository {
    return {
        async getEmailSettings({ projectId, storeId }) {
            const filters = [`project_id.eq.${projectId}`, `store_id.eq.${projectId}`];
            if (storeId && isUuid(storeId)) filters.push(`store_id.eq.${storeId}`);

            const { data, error } = await supabase
                .from('email_settings')
                .select('*')
                .or(filters.join(','))
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data || null;
        },
        async getStoreSettings({ projectId, storeId, publicStoreId }) {
            const filters = [`project_id.eq.${projectId}`];
            if (storeId) filters.push(`store_id.eq.${storeId}`);
            if (publicStoreId) filters.push(`public_store_id.eq.${publicStoreId}`);

            const { data, error } = await supabase
                .from('store_settings')
                .select('*')
                .or(filters.join(','))
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data || null;
        },
        async findEmailLogByIdempotencyKey(idempotencyKey) {
            const byColumn = await supabase
                .from('email_logs')
                .select('*')
                .eq('idempotency_key', idempotencyKey)
                .limit(1)
                .maybeSingle();

            if (!byColumn.error && byColumn.data) return byColumn.data;

            const { data, error } = await supabase
                .from('email_logs')
                .select('*')
                .contains('metadata', { idempotencyKey })
                .limit(1)
                .maybeSingle();

            if (error && byColumn.error) throw byColumn.error;
            if (error) throw error;
            return data || null;
        },
        async insertEmailLog(row) {
            const { data, error } = await supabase
                .from('email_logs')
                .insert(row)
                .select('*')
                .maybeSingle();

            if (error) throw error;
            return data || row;
        },
    };
}

export function createResendEcommerceEmailProvider(apiKey?: string | null): EcommerceEmailProvider | undefined {
    if (!apiKey) return undefined;

    return {
        async send(input) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: input.from,
                    to: input.to,
                    subject: input.subject,
                    html: input.html,
                    text: input.text,
                    reply_to: input.replyTo,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(String(data?.message || data?.error || 'Email provider request failed'));
            }

            return { providerMessageId: data?.id ? String(data.id) : undefined };
        },
    };
}

export async function getEcommerceEmailSettings(input: {
    repository: EcommerceEmailRepository;
    projectId: string;
    storeId?: string | null;
    publicStoreId?: string | null;
}) {
    const [emailSettingsRow, storeSettingsRow] = await Promise.all([
        input.repository.getEmailSettings(input),
        input.repository.getStoreSettings(input),
    ]);

    return {
        email: normalizeEmailSettings(emailSettingsRow),
        store: normalizeStoreEmailSettings(storeSettingsRow),
    };
}

export function shouldSendTransactionalEmail(input: {
    type: EcommerceTransactionalEmailType;
    recipientEmail?: string | null;
    emailSettings: EcommerceEmailSettings;
    storeSettings: EcommerceStoreEmailSettings;
    defaultFromEmail?: string;
}) {
    if (!isValidEmail(input.recipientEmail)) {
        return { shouldSend: false, reason: 'Missing or invalid recipient email' };
    }

    if (!input.emailSettings.exists || !input.emailSettings.enabled) {
        return { shouldSend: false, reason: 'Email settings are not configured' };
    }

    if (!input.emailSettings.apiKeyConfigured) {
        return { shouldSend: false, reason: 'Email provider is not configured' };
    }

    if (!input.emailSettings.fromEmail && !input.defaultFromEmail) {
        return { shouldSend: false, reason: 'Sender email is not configured' };
    }

    const transactional = input.emailSettings.transactional || {};
    const disabled = (key: string) => transactional[key] === false;

    switch (input.type) {
        case 'order_confirmation':
            if (input.storeSettings.sendOrderConfirmation === false || disabled('orderConfirmation')) {
                return { shouldSend: false, reason: 'Order confirmation is disabled' };
            }
            break;
        case 'merchant_new_order':
            if (input.storeSettings.notifyOnNewOrder === false || disabled('newOrderNotification')) {
                return { shouldSend: false, reason: 'Merchant order notification is disabled' };
            }
            break;
        case 'payment_failed':
            if (disabled('paymentFailed')) {
                return { shouldSend: false, reason: 'Payment failed email is disabled' };
            }
            break;
        case 'low_stock_alert':
            if (input.storeSettings.notifyOnLowStock === false || disabled('lowStockNotification')) {
                return { shouldSend: false, reason: 'Low stock notification is disabled' };
            }
            break;
        case 'shipping_confirmation':
        case 'fulfillment_confirmation':
            if (input.storeSettings.sendShippingNotification === false || disabled('orderShipped')) {
                return { shouldSend: false, reason: 'Shipping notification is disabled' };
            }
            break;
        case 'refund_confirmation':
            if (disabled('refundConfirmation')) {
                return { shouldSend: false, reason: 'Refund confirmation is disabled' };
            }
            break;
        case 'abandoned_cart':
            if (disabled('abandonedCart')) {
                return { shouldSend: false, reason: 'Abandoned cart flow is disabled' };
            }
            break;
        default:
            if (disabled(input.type)) {
                return { shouldSend: false, reason: `${input.type} is disabled` };
            }
            break;
    }

    return { shouldSend: true };
}

export function renderEcommerceEmail(input: {
    type: EcommerceTransactionalEmailType;
    context: EcommerceEmailRenderContext;
}): EcommerceEmailRenderResult {
    const context = input.context;
    switch (input.type) {
        case 'order_confirmation':
            return renderOrderConfirmation(context);
        case 'merchant_new_order':
            return renderMerchantNewOrderAlert(context);
        case 'payment_failed':
            return renderPaymentFailed(context);
        case 'fulfillment_confirmation':
        case 'shipping_confirmation':
            return renderFulfillmentConfirmation(context);
        case 'refund_confirmation':
            return renderRefundConfirmation(context);
        case 'abandoned_cart':
            return renderAbandonedCart(context);
        case 'low_stock_alert':
            return renderLowStockAlert(context);
        default:
            return renderGenericTransactionalEmail(input.type, context);
    }
}

export async function recordEcommerceEmailLog(input: {
    repository: EcommerceEmailRepository;
    context: EcommerceEmailRenderContext;
    type: EcommerceTransactionalEmailType;
    status: EcommerceTransactionalEmailStatus;
    idempotencyKey: string;
    recipientEmail?: string | null;
    recipientName?: string | null;
    subject?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
    metadata?: Record<string, unknown>;
    now?: string | Date;
}) {
    const existing = await input.repository.findEmailLogByIdempotencyKey(input.idempotencyKey);
    if (existing) return { row: existing, duplicate: true };

    const now = toIso(input.now);
    const context = input.context;
    const order = readObject(context.order);
    const customer = readObject(context.customer);
    const event = context.event || null;
    const projectId = readProjectId(context);
    const storeId = readStoreId(context);
    const row = await input.repository.insertEmailLog({
        project_id: projectId || null,
        store_id: storeId || null,
        type: 'transactional',
        template_id: input.type,
        template_type: input.type,
        recipient_email: normalizeEmail(input.recipientEmail),
        recipient_name: input.recipientName || readCustomerName(context) || null,
        customer_id: stringOrNull(order.customer_id || order.customerId || customer.id),
        subject: input.subject || null,
        status: input.status,
        provider: 'resend',
        provider_message_id: input.providerMessageId || null,
        event_type: event?.eventType || stringOrNull(readObject(input.metadata).eventType),
        idempotency_key: input.idempotencyKey,
        error_message: input.error || null,
        order_id: stringOrNull(order.id || order.orderId),
        metadata: sanitizeMetadata({
            ...(input.metadata || {}),
            source: 'ecommerce',
            sourceModule: 'ecommerce',
            ecommerceEmailType: input.type,
            idempotencyKey: input.idempotencyKey,
            eventId: event?.eventId,
            eventType: event?.eventType,
            eventIdempotencyKey: event?.idempotencyKey,
            storeId,
            publicStoreId: readPublicStoreId(context),
            cartId: readCartId(context),
            orderNumber: readOrderNumber(context),
            paymentIntentId: readPaymentIntentId(context),
        }),
        sent_at: input.status === 'sent' ? now : null,
        created_at: now,
        updated_at: now,
    });

    return { row, duplicate: false };
}

export async function queueOrSendEcommerceEmail(input: QueueOrSendEcommerceEmailInput): Promise<EcommerceEmailDeliveryResult> {
    const idempotencyKey = input.idempotencyKey;
    const now = toIso(input.now);
    const existing = await safeFindExistingLog(input.repository, idempotencyKey);
    if (existing) {
        return {
            type: input.type,
            status: 'skipped',
            recipientEmail: normalizeEmail(input.recipientEmail),
            idempotencyKey,
            skippedReason: `Duplicate email event (${existing.status || 'logged'})`,
            existingLogId: existing.id,
        };
    }

    const projectId = readProjectId(input.context);
    const settings = projectId
        ? await getEcommerceEmailSettings({
            repository: input.repository,
            projectId,
            storeId: readStoreId(input.context),
            publicStoreId: readPublicStoreId(input.context),
        })
        : {
            email: normalizeEmailSettings(null),
            store: normalizeStoreEmailSettings(null),
        };

    const contextWithSettings: EcommerceEmailRenderContext = {
        ...input.context,
        settings: {
            ...readObject(input.context.settings),
            merchantEmail: readObject(input.context.settings).merchantEmail || settings.store.merchantEmail,
            fromEmail: settings.email.fromEmail,
            replyTo: settings.email.replyTo,
            primaryColor: settings.email.primaryColor,
        },
    };
    const rendered = renderEcommerceEmail({ type: input.type, context: contextWithSettings });
    let recipientEmail = normalizeEmail(input.recipientEmail);
    if (!recipientEmail && (input.type === 'merchant_new_order' || input.type === 'low_stock_alert')) {
        recipientEmail = settings.store.merchantEmail || settings.email.replyTo || settings.email.fromEmail || '';
    }
    const recipientName = input.recipientName || readRecipientName(input.type, contextWithSettings);
    const contextForValidation: EcommerceEmailRenderContext = {
        ...contextWithSettings,
        ...(input.type === 'merchant_new_order' || input.type === 'low_stock_alert'
            ? { settings: { ...readObject(contextWithSettings.settings), merchantEmail: recipientEmail } }
            : {}),
    };
    const templateValidation = validateEcommerceEmailTemplateVariables(input.type, contextForValidation);
    if (!templateValidation.valid) {
        const reason = templateValidation.blockers.join('; ');
        return safeRecordAndReturn({
            repository: input.repository,
            context: contextForValidation,
            type: input.type,
            status: 'skipped',
            idempotencyKey,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            error: reason,
            metadata: {
                ...(input.metadata || {}),
                templateValidation,
            },
            now,
            skippedReason: reason,
        });
    }
    const sendDecision = shouldSendTransactionalEmail({
        type: input.type,
        recipientEmail,
        emailSettings: settings.email,
        storeSettings: settings.store,
        defaultFromEmail: input.defaultFromEmail || DEFAULT_FROM_EMAIL,
    });

    if (!sendDecision.shouldSend) {
        return safeRecordAndReturn({
            repository: input.repository,
            context: contextForValidation,
            type: input.type,
            status: 'skipped',
            idempotencyKey,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            error: sendDecision.reason,
            metadata: input.metadata,
            now,
            skippedReason: sendDecision.reason,
        });
    }

    if (!input.provider) {
        return safeRecordAndReturn({
            repository: input.repository,
            context: contextForValidation,
            type: input.type,
            status: 'queued',
            idempotencyKey,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            metadata: {
                ...(input.metadata || {}),
                queuedReason: 'Provider sender is not available in this runtime',
            },
            now,
        });
    }

    try {
        const providerResult = await input.provider.send({
            from: resolveFrom(settings.email, input.defaultFromEmail || DEFAULT_FROM_EMAIL),
            replyTo: settings.email.replyTo,
            to: [recipientEmail],
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        });

        return safeRecordAndReturn({
            repository: input.repository,
            context: contextForValidation,
            type: input.type,
            status: 'sent',
            idempotencyKey,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            providerMessageId: providerResult.providerMessageId,
            metadata: input.metadata,
            now,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return safeRecordAndReturn({
            repository: input.repository,
            context: contextForValidation,
            type: input.type,
            status: 'failed',
            idempotencyKey,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            error: message,
            metadata: input.metadata,
            now,
        });
    }
}

export async function sendOrderConfirmation(input: SendEcommerceEmailInput) {
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'order_confirmation',
        recipientEmail: readCustomerEmail(input.context),
        recipientName: readCustomerName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'order_confirmation', input.eventId, readCustomerEmail(input.context)),
    });
}

export async function sendMerchantNewOrderAlert(input: SendEcommerceEmailInput) {
    const merchantEmail = readMerchantEmail(input.context);
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'merchant_new_order',
        recipientEmail: merchantEmail,
        recipientName: readStoreName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'merchant_new_order', input.eventId, merchantEmail),
    });
}

export async function sendPaymentFailedEmail(input: SendEcommerceEmailInput) {
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'payment_failed',
        recipientEmail: readCustomerEmail(input.context),
        recipientName: readCustomerName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'payment_failed', input.eventId, readCustomerEmail(input.context)),
    });
}

export async function sendFulfillmentConfirmationEmail(input: SendEcommerceEmailInput) {
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'fulfillment_confirmation',
        recipientEmail: readCustomerEmail(input.context),
        recipientName: readCustomerName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'fulfillment_confirmation', input.eventId, readCustomerEmail(input.context)),
    });
}

export async function sendRefundConfirmationEmail(input: SendEcommerceEmailInput) {
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'refund_confirmation',
        recipientEmail: readCustomerEmail(input.context),
        recipientName: readCustomerName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'refund_confirmation', input.eventId, readCustomerEmail(input.context)),
    });
}

export async function queueAbandonedCartEmail(input: SendEcommerceEmailInput) {
    return queueOrSendEcommerceEmail({
        ...input,
        type: 'abandoned_cart',
        recipientEmail: readCustomerEmail(input.context),
        recipientName: readCustomerName(input.context),
        idempotencyKey: input.idempotencyKey || createIdempotencyKey(input.context, 'abandoned_cart', input.eventId, readCustomerEmail(input.context)),
    });
}

export async function sendLowStockAlert(input: SendLowStockAlertInput) {
    const product = input.product || readObject(input.context.products?.[0]);
    const productId = stringOrNull(product.id || product.productId) || 'unknown-product';
    const currentQuantity = input.currentQuantity ?? toNumber(product.quantity ?? product.inventoryQuantity ?? product.inventory_quantity, 0);
    const threshold = input.threshold ?? toNumber(product.lowStockThreshold ?? product.low_stock_threshold, 0);
    const merchantEmail = readMerchantEmail(input.context);

    return queueOrSendEcommerceEmail({
        ...input,
        context: {
            ...input.context,
            products: [product],
        },
        type: 'low_stock_alert',
        recipientEmail: merchantEmail,
        recipientName: readStoreName(input.context),
        idempotencyKey: input.idempotencyKey || [
            'ecommerce',
            'low_stock_alert',
            readProjectId(input.context) || 'project',
            productId,
            `threshold-${threshold}`,
            `qty-${currentQuantity}`,
        ].join(':'),
        metadata: {
            productId,
            currentQuantity,
            threshold,
        },
    });
}

export function createMemoryEcommerceEmailRepository(input: {
    emailSettings?: Record<string, unknown> | null;
    storeSettings?: Record<string, unknown> | null;
    logs?: EcommerceEmailLogRow[];
} = {}): EcommerceEmailRepository & {
    logs: EcommerceEmailLogRow[];
    setEmailSettings(settings: Record<string, unknown> | null): void;
    setStoreSettings(settings: Record<string, unknown> | null): void;
} {
    let emailSettings = input.emailSettings ?? null;
    let storeSettings = input.storeSettings ?? null;
    const logs = [...(input.logs || [])];

    return {
        logs,
        setEmailSettings(settings) {
            emailSettings = settings;
        },
        setStoreSettings(settings) {
            storeSettings = settings;
        },
        async getEmailSettings() {
            return emailSettings;
        },
        async getStoreSettings() {
            return storeSettings;
        },
        async findEmailLogByIdempotencyKey(idempotencyKey) {
            return logs.find((log) => log.idempotency_key === idempotencyKey || readObject(log.metadata).idempotencyKey === idempotencyKey) || null;
        },
        async insertEmailLog(row) {
            const next = {
                ...row,
                id: row.id || `email_log_${logs.length + 1}`,
            };
            logs.push(next);
            return next;
        },
    };
}

function safeRecordAndReturn(input: {
    repository: EcommerceEmailRepository;
    context: EcommerceEmailRenderContext;
    type: EcommerceTransactionalEmailType;
    status: EcommerceTransactionalEmailStatus;
    idempotencyKey: string;
    recipientEmail?: string | null;
    recipientName?: string | null;
    subject?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
    metadata?: Record<string, unknown>;
    now?: string | Date;
    skippedReason?: string;
}): Promise<EcommerceEmailDeliveryResult> {
    return recordEcommerceEmailLog(input)
        .then(({ row, duplicate }) => ({
            type: input.type,
            status: duplicate ? 'skipped' : input.status,
            recipientEmail: normalizeEmail(input.recipientEmail),
            recipientName: input.recipientName || undefined,
            subject: input.subject || undefined,
            idempotencyKey: input.idempotencyKey,
            providerMessageId: input.providerMessageId || row.provider_message_id || undefined,
            skippedReason: duplicate ? `Duplicate email event (${row.status || 'logged'})` : input.skippedReason,
            error: input.error || undefined,
            existingLogId: duplicate ? row.id : undefined,
            logId: duplicate ? undefined : row.id,
        }))
        .catch((error) => ({
            type: input.type,
            status: 'failed',
            recipientEmail: normalizeEmail(input.recipientEmail),
            recipientName: input.recipientName || undefined,
            subject: input.subject || undefined,
            idempotencyKey: input.idempotencyKey,
            error: error instanceof Error ? error.message : String(error),
        }));
}

async function safeFindExistingLog(repository: EcommerceEmailRepository, idempotencyKey: string) {
    try {
        return await repository.findEmailLogByIdempotencyKey(idempotencyKey);
    } catch (_error) {
        return null;
    }
}

function normalizeEmailSettings(row: Record<string, unknown> | null | undefined): EcommerceEmailSettings {
    const data = readObject(row);
    const transactional = readObject(data.transactional);
    const marketing = readObject(data.marketing);
    const provider = String(data.provider || 'resend');
    const fromEmail = normalizeEmail(data.from_email || data.fromEmail);
    const apiKeyConfigured = data.api_key_configured === true || data.apiKeyConfigured === true;

    return {
        exists: Boolean(row),
        enabled: Boolean(row),
        provider,
        apiKeyConfigured,
        fromEmail,
        fromName: stringOrUndefined(data.from_name || data.fromName),
        replyTo: normalizeEmail(data.reply_to || data.replyTo),
        primaryColor: stringOrUndefined(data.primary_color || data.primaryColor) || DEFAULT_PRIMARY_COLOR,
        footerText: stringOrUndefined(data.footer_text || data.footerText),
        transactional,
        marketing,
        raw: row || null,
    };
}

function normalizeStoreEmailSettings(row: Record<string, unknown> | null | undefined): EcommerceStoreEmailSettings {
    const data = readObject(row);
    const nested = readObject(data.data);
    return {
        sendOrderConfirmation: readBoolean(data.send_order_confirmation, data.sendOrderConfirmation, nested.sendOrderConfirmation),
        notifyOnNewOrder: readBoolean(data.notify_on_new_order, data.notifyOnNewOrder, nested.notifyOnNewOrder),
        notifyOnLowStock: readBoolean(data.notify_on_low_stock, data.notifyOnLowStock, nested.notifyOnLowStock),
        sendShippingNotification: readBoolean(data.send_shipping_notification, data.sendShippingNotification, nested.sendShippingNotification),
        merchantEmail: normalizeEmail(
            data.order_notification_email
                || data.orderNotificationEmail
                || data.store_email
                || data.storeEmail
                || data.contact_email
                || data.contactEmail
                || nested.orderNotificationEmail
                || nested.storeEmail
                || nested.contactEmail,
        ),
        raw: row || null,
    };
}

function resolveFrom(settings: EcommerceEmailSettings, defaultFromEmail: string) {
    const fromEmail = settings.fromEmail || defaultFromEmail;
    if (!settings.fromEmail) return defaultFromEmail;
    return settings.fromName ? `${settings.fromName} <${fromEmail}>` : fromEmail;
}

function renderOrderConfirmation(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const orderNumber = readOrderNumber(context);
    const storeName = readStoreName(context);
    const subject = `Order ${orderNumber} confirmed`;
    const body = [
        `Hi ${readCustomerName(context) || 'there'},`,
        `Your payment was received and ${storeName} is preparing your order.`,
        `Order: ${orderNumber}`,
        `Payment status: ${readPaymentStatus(context)}`,
        `Checkout status: ${readOrderStatus(context)}`,
        '',
        renderItemsText(context),
        '',
        renderTotalsText(context),
        readStoreUrl(context) ? `Store: ${readStoreUrl(context)}` : '',
        'Contact the store if you need help with this order.',
    ].filter(Boolean).join('\n');

    return {
        type: 'order_confirmation',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderMerchantNewOrderAlert(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const orderNumber = readOrderNumber(context);
    const storeName = readStoreName(context);
    const subject = `New paid order ${orderNumber}`;
    const body = [
        `A new paid order is ready to process for ${storeName}.`,
        `Order: ${orderNumber}`,
        `Customer: ${readCustomerName(context) || 'Unknown customer'}`,
        `Customer email: ${readCustomerEmail(context) || 'Not provided'}`,
        readTotal(context) != null ? `Total: ${formatMoney(readTotal(context)!, readCurrency(context))}` : 'Total: Not available',
        `Payment status: ${readPaymentStatus(context)}`,
        `Inventory status: ${readInventoryStatus(context)}`,
        '',
        renderItemsText(context),
        readDashboardOrdersUrl(context) ? `Orders dashboard: ${readDashboardOrdersUrl(context)}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'merchant_new_order',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderPaymentFailed(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const orderNumber = readOrderNumber(context);
    const storeName = readStoreName(context);
    const subject = `Payment issue for order ${orderNumber}`;
    const body = [
        `Hi ${readCustomerName(context) || 'there'},`,
        `We could not complete payment for order ${orderNumber}.`,
        'No card details are included in this message.',
        'Please return to checkout or contact the store for help.',
        readStoreUrl(context) ? `Store: ${readStoreUrl(context)}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'payment_failed',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderFulfillmentConfirmation(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const orderNumber = readOrderNumber(context);
    const storeName = readStoreName(context);
    const trackingNumber = readTrackingNumber(context);
    const trackingUrl = readTrackingUrl(context);
    const carrier = readCarrier(context);
    const subject = `Order ${orderNumber} fulfilled`;
    const body = [
        `Hi ${readCustomerName(context) || 'there'},`,
        `${storeName} marked order ${orderNumber} as fulfilled.`,
        carrier ? `Carrier: ${carrier}` : '',
        trackingNumber ? `Tracking number: ${trackingNumber}` : '',
        trackingUrl ? `Tracking link: ${trackingUrl}` : '',
        !trackingNumber && !trackingUrl ? 'Tracking details were not provided by the store.' : '',
        readStoreUrl(context) ? `Store: ${readStoreUrl(context)}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'fulfillment_confirmation',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderRefundConfirmation(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const orderNumber = readOrderNumber(context);
    const storeName = readStoreName(context);
    const refundAmount = readRefundAmount(context);
    const subject = `Refund update for order ${orderNumber}`;
    const body = [
        `Hi ${readCustomerName(context) || 'there'},`,
        `${storeName} recorded a refund update for order ${orderNumber}.`,
        refundAmount != null ? `Refund amount: ${formatMoney(refundAmount, readCurrency(context))}` : '',
        `Payment status: ${readPaymentStatus(context)}`,
        readStoreUrl(context) ? `Store: ${readStoreUrl(context)}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'refund_confirmation',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderAbandonedCart(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const storeName = readStoreName(context);
    const checkoutUrl = readCheckoutUrl(context);
    const subject = 'Still thinking it over?';
    const body = [
        `Hi ${readCustomerName(context) || 'there'},`,
        `${storeName} saved your cart draft.`,
        renderItemsText(context),
        checkoutUrl ? `Checkout: ${checkoutUrl}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'abandoned_cart',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderLowStockAlert(context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const product = readObject(context.products?.[0]);
    const productName = String(product.name || product.productName || 'Product');
    const currentQuantity = toNumber(product.quantity ?? product.inventoryQuantity ?? product.inventory_quantity, 0);
    const threshold = toNumber(product.lowStockThreshold ?? product.low_stock_threshold, 0);
    const storeName = readStoreName(context);
    const subject = `Low stock: ${productName}`;
    const body = [
        `${productName} is at or below the configured low stock threshold.`,
        `Current quantity: ${currentQuantity}`,
        `Threshold: ${threshold}`,
        readProductAdminUrl(context, product) ? `Product admin: ${readProductAdminUrl(context, product)}` : '',
    ].filter(Boolean).join('\n');

    return {
        type: 'low_stock_alert',
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderGenericTransactionalEmail(type: EcommerceTransactionalEmailType, context: EcommerceEmailRenderContext): EcommerceEmailRenderResult {
    const storeName = readStoreName(context);
    const subject = `Notification from ${storeName}`;
    const body = `Transactional ecommerce event: ${type}`;
    return {
        type,
        subject,
        text: body,
        html: renderSimpleHtml(storeName, subject, body, context),
    };
}

function renderSimpleHtml(storeName: string, subject: string, text: string, context: EcommerceEmailRenderContext) {
    const primaryColor = String(readObject(context.settings).primaryColor || DEFAULT_PRIMARY_COLOR);
    const paragraphs = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
        .join('');

    return `<!doctype html><html><body style="margin:0;background:#f7f7f8;font-family:Arial,sans-serif;color:#111827;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;"><tr><td style="padding:24px;border-bottom:1px solid #e5e7eb;"><div style="font-size:14px;color:#6b7280;">${escapeHtml(storeName)}</div><h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${escapeHtml(subject)}</h1></td></tr><tr><td style="padding:24px;border-left:4px solid ${escapeHtml(primaryColor)};">${paragraphs}</td></tr></table></td></tr></table></body></html>`;
}

function renderItemsText(context: EcommerceEmailRenderContext) {
    const items = readItems(context);
    if (items.length === 0) return 'Items: Not available';
    return items.map((item) => {
        const name = item.name || item.productName || item.product_name || 'Product';
        const quantity = toNumber(item.quantity, 0);
        const unitPrice = toOptionalNumber(item.unitPrice ?? item.unit_price ?? item.price);
        const total = toOptionalNumber(item.totalPrice ?? item.total_price) ?? (unitPrice != null ? unitPrice * quantity : null);
        return `- ${name} x${quantity}${total != null ? `: ${formatMoney(total, readCurrency(context))}` : ''}`;
    }).join('\n');
}

function renderTotalsText(context: EcommerceEmailRenderContext) {
    const lines = [
        optionalMoneyLine('Subtotal', readSubtotal(context), readCurrency(context)),
        optionalMoneyLine('Shipping', readShippingTotal(context), readCurrency(context)),
        optionalMoneyLine('Tax', readTaxTotal(context), readCurrency(context)),
        optionalMoneyLine('Total', readTotal(context), readCurrency(context)),
    ].filter(Boolean);
    return lines.length > 0 ? lines.join('\n') : 'Totals: Not available';
}

function createIdempotencyKey(
    context: EcommerceEmailRenderContext,
    type: EcommerceTransactionalEmailType,
    eventId?: string | null,
    recipientEmail?: string | null,
) {
    if (context.event) {
        return createEcommerceEmailDeliveryIdempotencyKey({
            event: context.event,
            templateType: type,
            recipientEmail,
        });
    }

    return [
        'ecommerce',
        type,
        eventId || readPaymentIntentId(context) || readOrderId(context) || readCartId(context) || 'event',
        normalizeEmail(recipientEmail) || 'recipient',
    ].join(':');
}

function readProjectId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const store = readObject(context.store);
    return stringOrUndefined(order.project_id || order.projectId || store.project_id || store.projectId);
}

function readStoreId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const store = readObject(context.store);
    return stringOrUndefined(order.store_id || order.storeId || store.store_id || store.storeId);
}

function readPublicStoreId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const store = readObject(context.store);
    return stringOrUndefined(order.public_store_id || order.publicStoreId || store.public_store_id || store.publicStoreId);
}

function readOrderId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    return stringOrUndefined(order.id || order.orderId);
}

function readCartId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    return stringOrUndefined(order.cart_id || order.cartId);
}

function readPaymentIntentId(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const payment = readObject(context.payment);
    const stripe = readObject(order.stripe);
    return stringOrUndefined(
        payment.paymentIntentId
            || payment.payment_intent_id
            || order.payment_intent_id
            || order.stripe_payment_intent_id
            || stripe.paymentIntentId,
    );
}

function readOrderNumber(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    return String(order.order_number || order.orderNumber || order.id || 'Order');
}

function readStoreName(context: EcommerceEmailRenderContext) {
    const store = readObject(context.store);
    const settings = readObject(context.settings);
    return String(store.name || store.storeName || settings.storeName || settings.store_name || 'Quimera Store');
}

function readCustomerEmail(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const customer = readObject(context.customer);
    return normalizeEmail(order.customer_email || order.customerEmail || customer.email);
}

function readCustomerName(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const customer = readObject(context.customer);
    return stringOrUndefined(order.customer_name || order.customerName || customer.name || customer.fullName || readCustomerEmail(context));
}

function readMerchantEmail(context: EcommerceEmailRenderContext) {
    const store = readObject(context.store);
    const settings = readObject(context.settings);
    return normalizeEmail(
        store.orderNotificationEmail
            || store.order_notification_email
            || store.email
            || store.storeEmail
            || store.store_email
            || settings.merchantEmail
            || settings.orderNotificationEmail
            || settings.order_notification_email
            || settings.storeEmail
            || settings.store_email
            || settings.fromEmail
            || settings.from_email
            || settings.replyTo
            || settings.reply_to,
    );
}

function readRecipientName(type: EcommerceTransactionalEmailType, context: EcommerceEmailRenderContext) {
    if (type === 'merchant_new_order' || type === 'low_stock_alert') return readStoreName(context);
    return readCustomerName(context);
}

function readItems(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    if (Array.isArray(context.items)) return context.items;
    if (Array.isArray(order.items)) return order.items as Array<Record<string, unknown>>;
    const data = readObject(order.data);
    if (Array.isArray(data.items)) return data.items as Array<Record<string, unknown>>;
    return [];
}

function readCurrency(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    return String(order.currency || totals.currency || 'USD').toUpperCase();
}

function readSubtotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toOptionalNumber(totals.subtotal ?? order.subtotal ?? pricing.subtotal);
}

function readShippingTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toOptionalNumber(totals.shipping ?? totals.shippingTotal ?? order.shipping_amount ?? order.shippingCost ?? pricing.shippingTotal);
}

function readTaxTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toOptionalNumber(totals.tax ?? totals.taxTotal ?? order.tax_amount ?? order.taxAmount ?? pricing.taxTotal);
}

function readTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toOptionalNumber(totals.total ?? order.total_amount ?? order.total ?? pricing.total);
}

function readPaymentStatus(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const payment = readObject(context.payment);
    return String(payment.status || order.payment_status || order.paymentStatus || 'unknown');
}

function readOrderStatus(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    return String(order.status || readObject(order.data).status || 'unknown');
}

function readInventoryStatus(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const inventory = readObject(readObject(order.data).inventory);
    if (inventory.committedAt) return 'committed';
    if (inventory.decrementedAt) return 'decremented';
    if (inventory.reservedAt) return 'reserved';
    return 'not tracked';
}

function readStoreUrl(context: EcommerceEmailRenderContext) {
    const store = readObject(context.store);
    const settings = readObject(context.settings);
    return stringOrUndefined(store.url || store.storeUrl || settings.storeUrl || settings.store_url);
}

function readDashboardOrdersUrl(context: EcommerceEmailRenderContext) {
    const settings = readObject(context.settings);
    return stringOrUndefined(settings.ordersUrl || settings.dashboardOrdersUrl || '/ecommerce/orders');
}

function readProductAdminUrl(context: EcommerceEmailRenderContext, product: Record<string, unknown>) {
    const settings = readObject(context.settings);
    const productId = stringOrUndefined(product.id || product.productId);
    const base = stringOrUndefined(settings.productAdminBaseUrl || settings.productsUrl);
    if (base && productId) return `${base.replace(/\/$/, '')}/${productId}`;
    return stringOrUndefined(settings.productsUrl || '/ecommerce/products');
}

function resolveTemplateVariables(
    _type: EcommerceTransactionalEmailType,
    context: EcommerceEmailRenderContext,
): Record<string, boolean> {
    return {
        storeName: Boolean(readStoreName(context)),
        orderNumber: Boolean(readOrderNumber(context)),
        customerEmail: Boolean(readCustomerEmail(context)),
        customerName: Boolean(readCustomerName(context)),
        merchantEmail: Boolean(readMerchantEmail(context)),
        orderItems: readItems(context).length > 0,
        cartItems: readItems(context).length > 0,
        checkoutUrl: Boolean(readCheckoutUrl(context)),
        orderTotal: readTotal(context) != null,
        paymentStatus: Boolean(readPaymentStatus(context)),
        paymentConfirmed: isPaymentConfirmed(context),
        paymentFailed: isPaymentFailed(context),
        fulfilled: isFulfilled(context),
        refundRecorded: hasRefundRecord(context),
        refundAmount: readRefundAmount(context) != null,
        productName: Boolean(readProductName(context)),
        currentQuantity: readCurrentQuantity(context) != null,
        lowStockThreshold: readLowStockThresholdFromContext(context) != null,
        inventoryTrackingConfigured: isInventoryTrackingConfigured(context),
        trackingNumber: Boolean(readTrackingNumber(context)),
        trackingUrl: Boolean(readTrackingUrl(context)),
        carrier: Boolean(readCarrier(context)),
        giftCardAmount: readGiftCardAmount(context) != null,
        recipientEmail: Boolean(readObject(context.event?.payload).recipientEmail || readObject(context.order).recipientEmail),
    };
}

function isPaymentConfirmed(context: EcommerceEmailRenderContext) {
    const status = readPaymentStatus(context).toLowerCase();
    const order = readObject(context.order);
    return context.event?.eventType === 'payment_succeeded'
        || ['paid', 'succeeded', 'success', 'captured', 'payment_succeeded'].includes(status)
        || Boolean(order.paid_at || order.paidAt);
}

function isPaymentFailed(context: EcommerceEmailRenderContext) {
    const status = readPaymentStatus(context).toLowerCase();
    return context.event?.eventType === 'payment_failed'
        || ['failed', 'payment_failed', 'canceled', 'cancelled'].includes(status);
}

function isFulfilled(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    const status = String(
        order.fulfillment_status
            || order.fulfillmentStatus
            || data.fulfillmentStatus
            || order.status
            || data.status
            || '',
    ).toLowerCase();

    return context.event?.eventType === 'order_fulfilled'
        || ['fulfilled', 'shipped', 'delivered', 'complete', 'completed'].includes(status)
        || Boolean(order.shipped_at || order.shippedAt || order.delivered_at || order.deliveredAt);
}

function hasRefundRecord(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    const status = readPaymentStatus(context).toLowerCase();
    return context.event?.eventType === 'order_refunded'
        || ['refunded', 'partially_refunded'].includes(status)
        || Boolean(order.refunded_at || order.refundedAt || data.refundedAt)
        || readRefundAmount(context) != null
        || readRefunds(context).length > 0;
}

function isInventoryTrackingConfigured(context: EcommerceEmailRenderContext) {
    const product = readObject(context.products?.[0]);
    const data = readObject(product.data);
    return product.track_inventory === true
        || product.trackInventory === true
        || data.trackInventory === true
        || data.track_inventory === true;
}

function hasValidLineItemPrice(item: Record<string, unknown>) {
    const price = item.totalPrice ?? item.total_price ?? item.unitPrice ?? item.unit_price ?? item.price;
    if (price === undefined || price === null || price === '') return false;
    return toOptionalNumber(price) != null;
}

function readProductName(context: EcommerceEmailRenderContext) {
    const product = readObject(context.products?.[0]);
    return stringOrUndefined(product.name || product.productName || product.title);
}

function readCurrentQuantity(context: EcommerceEmailRenderContext) {
    const product = readObject(context.products?.[0]);
    const data = readObject(product.data);
    return toOptionalNumber(product.quantity ?? product.inventoryQuantity ?? product.inventory_quantity ?? data.quantity ?? data.inventoryQuantity);
}

function readLowStockThresholdFromContext(context: EcommerceEmailRenderContext) {
    const product = readObject(context.products?.[0]);
    const data = readObject(product.data);
    return toOptionalNumber(product.lowStockThreshold ?? product.low_stock_threshold ?? data.lowStockThreshold ?? data.low_stock_threshold);
}

function readTrackingNumber(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    return stringOrUndefined(order.tracking_number || order.trackingNumber || data.trackingNumber);
}

function readTrackingUrl(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    return stringOrUndefined(order.tracking_url || order.trackingUrl || data.trackingUrl);
}

function readCarrier(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    return stringOrUndefined(order.carrier || data.carrier || order.shipping_carrier || data.shippingCarrier);
}

function readCheckoutUrl(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const settings = readObject(context.settings);
    const data = readObject(order.data);
    return stringOrUndefined(order.checkout_url || order.checkoutUrl || data.checkoutUrl || settings.checkoutUrl);
}

function readRefunds(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    if (Array.isArray(order.refunds)) return order.refunds as Array<Record<string, unknown>>;
    if (Array.isArray(data.refunds)) return data.refunds as Array<Record<string, unknown>>;
    return [];
}

function readRefundAmount(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const data = readObject(order.data);
    const direct = toOptionalNumber(order.refunded_amount ?? order.refundedAmount ?? data.refundedAmount);
    if (direct != null) return direct;
    const total = readRefunds(context).reduce((sum, refund) => sum + (toOptionalNumber(refund.amount) || 0), 0);
    return total > 0 ? total : null;
}

function readGiftCardAmount(context: EcommerceEmailRenderContext) {
    const payload = readObject(context.event?.payload);
    return toOptionalNumber(payload.giftCardAmount || payload.amount);
}

function sanitizeMetadata(value: Record<string, unknown>) {
    const blocked = new Set(['card', 'cardNumber', 'clientSecret', 'secret', 'apiKey', 'authorization']);
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, item]) => item !== undefined && !blocked.has(key))
            .map(([key, item]) => [key, typeof item === 'bigint' ? String(item) : item]),
    );
}

function readObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function readBoolean(...values: unknown[]) {
    for (const value of values) {
        if (value === true || value === false) return value;
    }
    return undefined;
}

function isValidEmail(value?: string | null) {
    return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function normalizeEmail(value: unknown) {
    const email = String(value || '').trim().toLowerCase();
    return isValidEmail(email) ? email : '';
}

function stringOrUndefined(value: unknown) {
    const stringValue = String(value || '').trim();
    return stringValue || undefined;
}

function stringOrNull(value: unknown) {
    return stringOrUndefined(value) || null;
}

function toNumber(value: unknown, fallback: number) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function toIso(value?: string | Date) {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    return value;
}

function formatMoney(value: number, currency: string) {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    } catch (_error) {
        return `$${value.toFixed(2)}`;
    }
}

function optionalMoneyLine(label: string, value: number | null, currency: string) {
    return value == null ? '' : `${label}: ${formatMoney(value, currency)}`;
}

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isUuid(value?: string | null) {
    return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
