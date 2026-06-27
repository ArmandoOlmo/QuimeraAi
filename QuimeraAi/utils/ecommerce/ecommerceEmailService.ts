import type {
    EcommerceEmailDeliveryResult,
    EcommerceEmailRenderContext,
    EcommerceEmailRenderResult,
    EcommerceEmailSettings,
    EcommerceStoreEmailSettings,
    EcommerceTransactionalEmailStatus,
    EcommerceTransactionalEmailType,
} from '../../types/ecommerceEmail.ts';
import type { EmailProvider } from '../../services/email/emailProviderService.ts';
import { dispatchCrossModuleTransactionalEmail } from '../../services/email/emailCrossModuleDispatcher.ts';

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
    canonical?: {
        supabase: SupabaseClient;
        sourceComponent?: string;
        sourceEvent?: string;
        sourceEntityType?: string;
        sourceEntityId?: string;
        scheduledAt?: string | Date | null;
    };
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
            const { data, error } = await supabase
                .from('email_logs')
                .select('*')
                .contains('metadata', { idempotencyKey })
                .limit(1)
                .maybeSingle();

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
    const enabled = (key: string) => transactional[key] === true;

    switch (input.type) {
        case 'order_confirmation':
            if (input.storeSettings.sendOrderConfirmation === false || !enabled('orderConfirmation')) {
                return { shouldSend: false, reason: 'Order confirmation is disabled' };
            }
            break;
        case 'merchant_new_order':
            if (input.storeSettings.notifyOnNewOrder === false || !enabled('newOrderNotification')) {
                return { shouldSend: false, reason: 'Merchant order notification is disabled' };
            }
            break;
        case 'payment_failed':
            if (!enabled('paymentFailed')) {
                return { shouldSend: false, reason: 'Payment failed email is disabled' };
            }
            break;
        case 'low_stock_alert':
            if (input.storeSettings.notifyOnLowStock === false || !enabled('lowStockNotification')) {
                return { shouldSend: false, reason: 'Low stock notification is disabled' };
            }
            break;
        case 'shipping_confirmation':
            if (input.storeSettings.sendShippingNotification === false || !enabled('orderShipped')) {
                return { shouldSend: false, reason: 'Shipping notification is disabled' };
            }
            break;
        default:
            if (disabled(input.type) || !enabled(input.type)) {
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
    const projectId = readProjectId(context);
    const row = await input.repository.insertEmailLog({
        project_id: projectId || null,
        store_id: projectId || null,
        type: 'transactional',
        template_id: input.type,
        recipient_email: normalizeEmail(input.recipientEmail),
        recipient_name: input.recipientName || readCustomerName(context) || null,
        customer_id: stringOrNull(order.customer_id || order.customerId || customer.id),
        subject: input.subject || null,
        status: input.status,
        provider: 'resend',
        provider_message_id: input.providerMessageId || null,
        error_message: input.error || null,
        order_id: stringOrNull(order.id || order.orderId),
        metadata: sanitizeMetadata({
            ...(input.metadata || {}),
            source: 'ecommerce',
            ecommerceEmailType: input.type,
            idempotencyKey: input.idempotencyKey,
            storeId: readStoreId(context),
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
    if (existing && (!input.canonical || isTerminalEcommerceEmailStatus(existing.status))) {
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

    const rendered = renderEcommerceEmail({ type: input.type, context: input.context });
    let recipientEmail = normalizeEmail(input.recipientEmail);
    if (!recipientEmail && (input.type === 'merchant_new_order' || input.type === 'low_stock_alert')) {
        recipientEmail = settings.store.merchantEmail || settings.email.replyTo || settings.email.fromEmail || '';
    }
    const recipientName = input.recipientName || readRecipientName(input.type, input.context);
    const sendDecision = shouldSendTransactionalEmail({
        type: input.type,
        recipientEmail,
        emailSettings: settings.email,
        storeSettings: settings.store,
        defaultFromEmail: input.defaultFromEmail || DEFAULT_FROM_EMAIL,
    });

    if (!sendDecision.shouldSend) {
        if (input.canonical?.supabase && projectId) {
            return mapCanonicalEcommerceResult(input.type, idempotencyKey, await dispatchCrossModuleTransactionalEmail({
                supabase: input.canonical.supabase,
                projectId,
                type: input.type,
                recipientEmail,
                recipientName,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                idempotencyKey,
                scheduledAt: input.canonical.scheduledAt || now,
                sourceModule: 'ecommerce',
                sourceComponent: input.canonical.sourceComponent,
                sourceEvent: input.canonical.sourceEvent || input.type,
                sourceEntityType: input.canonical.sourceEntityType || 'order',
                sourceEntityId: input.canonical.sourceEntityId || readOrderId(input.context) || readCartId(input.context),
                metadata: buildEcommerceCanonicalMetadata(input.context, input.type, input.metadata),
                skipReason: sendDecision.reason || 'Ecommerce transactional email is disabled',
            }), rendered.subject);
        }

        return safeRecordAndReturn({
            repository: input.repository,
            context: input.context,
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

    if (input.canonical?.supabase && projectId) {
        return mapCanonicalEcommerceResult(input.type, idempotencyKey, await dispatchCrossModuleTransactionalEmail({
            supabase: input.canonical.supabase,
            provider: toCanonicalProvider(input.provider),
            projectId,
            type: input.type,
            recipientEmail,
            recipientName,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            idempotencyKey,
            scheduledAt: input.canonical.scheduledAt || now,
            sourceModule: 'ecommerce',
            sourceComponent: input.canonical.sourceComponent,
            sourceEvent: input.canonical.sourceEvent || input.type,
            sourceEntityType: input.canonical.sourceEntityType || 'order',
            sourceEntityId: input.canonical.sourceEntityId || readOrderId(input.context) || readCartId(input.context),
            metadata: buildEcommerceCanonicalMetadata(input.context, input.type, input.metadata),
        }), rendered.subject);
    }

    return safeRecordAndReturn({
        repository: input.repository,
        context: input.context,
        type: input.type,
        status: 'queued',
        idempotencyKey,
        recipientEmail,
        recipientName,
        subject: rendered.subject,
        metadata: {
            ...(input.metadata || {}),
            queuedReason: 'Canonical email dispatcher is required for provider delivery',
        },
        now,
    });
}

function toCanonicalProvider(provider?: EcommerceEmailProvider): EmailProvider | undefined {
    if (!provider) return undefined;
    return {
        name: 'resend',
        send: provider.send,
    };
}

function mapCanonicalEcommerceResult(
    type: EcommerceTransactionalEmailType,
    idempotencyKey: string,
    result: {
        status: 'queued' | 'sent' | 'skipped' | 'failed' | 'deferred';
        logId?: string;
        existingLogId?: string;
        providerMessageId?: string;
        recipientEmail?: string;
        reason?: string;
    },
    subject?: string,
): EcommerceEmailDeliveryResult {
    return {
        type,
        status: result.status === 'deferred' ? 'queued' : result.status,
        recipientEmail: result.recipientEmail,
        subject,
        idempotencyKey,
        providerMessageId: result.providerMessageId,
        skippedReason: result.status === 'skipped' ? result.reason : undefined,
        error: result.status === 'failed' || result.status === 'deferred' ? result.reason : undefined,
        existingLogId: result.existingLogId,
        logId: result.logId,
    };
}

function isTerminalEcommerceEmailStatus(status?: string | null) {
    return ['sent', 'delivered', 'opened', 'clicked', 'skipped', 'failed'].includes(String(status || ''));
}

function buildEcommerceCanonicalMetadata(
    context: EcommerceEmailRenderContext,
    type: EcommerceTransactionalEmailType,
    metadata?: Record<string, unknown>,
) {
    return sanitizeMetadata({
        ...(metadata || {}),
        source: 'ecommerce',
        ecommerceEmailType: type,
        projectId: readProjectId(context),
        storeId: readStoreId(context),
        publicStoreId: readPublicStoreId(context),
        cartId: readCartId(context),
        orderId: readOrderId(context),
        orderNumber: readOrderNumber(context),
        paymentIntentId: readPaymentIntentId(context),
    });
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
            return logs.find((log) => readObject(log.metadata).idempotencyKey === idempotencyKey) || null;
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
        `Total: ${formatMoney(readTotal(context), readCurrency(context))}`,
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
        const unitPrice = toNumber(item.unitPrice ?? item.unit_price ?? item.price, 0);
        const total = toNumber(item.totalPrice ?? item.total_price, unitPrice * quantity);
        return `- ${name} x${quantity}: ${formatMoney(total, readCurrency(context))}`;
    }).join('\n');
}

function renderTotalsText(context: EcommerceEmailRenderContext) {
    return [
        `Subtotal: ${formatMoney(readSubtotal(context), readCurrency(context))}`,
        `Shipping: ${formatMoney(readShippingTotal(context), readCurrency(context))}`,
        `Tax: ${formatMoney(readTaxTotal(context), readCurrency(context))}`,
        `Total: ${formatMoney(readTotal(context), readCurrency(context))}`,
    ].join('\n');
}

function createIdempotencyKey(
    context: EcommerceEmailRenderContext,
    type: EcommerceTransactionalEmailType,
    eventId?: string | null,
    recipientEmail?: string | null,
) {
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
    return toNumber(totals.subtotal ?? order.subtotal ?? pricing.subtotal, 0);
}

function readShippingTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toNumber(totals.shipping ?? totals.shippingTotal ?? order.shipping_amount ?? order.shippingCost ?? pricing.shippingTotal, 0);
}

function readTaxTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toNumber(totals.tax ?? totals.taxTotal ?? order.tax_amount ?? order.taxAmount ?? pricing.taxTotal, 0);
}

function readTotal(context: EcommerceEmailRenderContext) {
    const order = readObject(context.order);
    const totals = readObject(context.totals);
    const pricing = readObject(order.pricing || readObject(order.data).pricing);
    return toNumber(totals.total ?? order.total_amount ?? order.total ?? pricing.total, 0);
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
