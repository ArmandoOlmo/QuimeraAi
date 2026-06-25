import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface AppointmentCheckoutInput {
    projectId: string;
    appointmentId: string;
    orderId: string;
    successUrl?: string | null;
    cancelUrl?: string | null;
}

export interface AppointmentCheckoutSession {
    sessionId: string;
    url: string;
    paymentIntentId?: string | null;
}

export interface AppointmentStripeCheckoutClient {
    createCheckoutSession(
        input: StripeCheckoutSessionInput,
        options: { idempotencyKey: string },
    ): Promise<AppointmentCheckoutSession>;
}

export interface StripeCheckoutSessionInput {
    amount: number;
    currency: string;
    productName: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    clientReferenceId: string;
    metadata: Record<string, string>;
}

export interface AppointmentCheckoutOptions {
    stripeSecretKey?: string | null;
    stripeClient?: AppointmentStripeCheckoutClient;
    now?: string | Date;
}

export interface AppointmentCheckoutResult {
    appointmentId: string;
    orderId: string;
    sessionId: string;
    checkoutUrl: string;
    paymentIntentId?: string | null;
    paymentStatus: string;
}

const STRIPE_API_VERSION = '2026-02-25.clover';

export function createStripeAppointmentCheckoutClient(secretKey?: string | null): AppointmentStripeCheckoutClient | undefined {
    if (!secretKey) return undefined;

    return {
        async createCheckoutSession(input, options) {
            const body = new URLSearchParams();
            appendStripeParam(body, 'mode', 'payment');
            appendStripeParam(body, 'client_reference_id', input.clientReferenceId);
            appendStripeParam(body, 'customer_email', input.customerEmail);
            appendStripeParam(body, 'success_url', input.successUrl);
            appendStripeParam(body, 'cancel_url', input.cancelUrl);
            appendStripeParam(body, 'line_items[0][quantity]', '1');
            appendStripeParam(body, 'line_items[0][price_data][currency]', input.currency.toLowerCase());
            appendStripeParam(body, 'line_items[0][price_data][unit_amount]', String(Math.round(input.amount * 100)));
            appendStripeParam(body, 'line_items[0][price_data][product_data][name]', input.productName);

            for (const [key, value] of Object.entries(input.metadata)) {
                appendStripeParam(body, `metadata[${key}]`, value);
                appendStripeParam(body, `payment_intent_data[metadata][${key}]`, value);
            }

            const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Stripe-Version': STRIPE_API_VERSION,
                    'Idempotency-Key': options.idempotencyKey.slice(0, 255),
                },
                body,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(String(data?.error?.message || data?.message || 'Stripe Checkout Session failed'));
            }

            return {
                sessionId: String(data.id),
                url: String(data.url),
                paymentIntentId: typeof data.payment_intent === 'string'
                    ? data.payment_intent
                    : data.payment_intent?.id || null,
            };
        },
    };
}

export async function createAppointmentCheckoutSession(
    client: SupabaseLike,
    input: AppointmentCheckoutInput,
    options: AppointmentCheckoutOptions = {},
): Promise<AppointmentCheckoutResult> {
    const now = toIso(options.now);
    const stripeClient = options.stripeClient || createStripeAppointmentCheckoutClient(options.stripeSecretKey);
    if (!stripeClient) {
        throw Object.assign(new Error('Stripe is not configured for appointment payments.'), { status: 503 });
    }
    if (!input.successUrl || !input.cancelUrl) {
        throw Object.assign(new Error('Appointment checkout requires success and cancel URLs.'), { status: 400 });
    }

    const appointment = await getAppointment(client, input.projectId, input.appointmentId);
    const orderId = String(appointment.ecommerce_order_id || input.orderId || '');
    if (!orderId || orderId !== input.orderId) {
        throw Object.assign(new Error('Appointment is not linked to this payment order.'), { status: 409 });
    }

    const order = await getAppointmentOrder(client, input.projectId, orderId, input.appointmentId);
    const amount = readAmount(order);
    if (!amount) throw Object.assign(new Error('Appointment payment order has no payable amount.'), { status: 400 });
    if (String(order.payment_status || '').toLowerCase() === 'paid') {
        throw Object.assign(new Error('Appointment payment order is already paid.'), { status: 409 });
    }

    const customerEmail = normalizeEmail(order.customer_email);
    if (!customerEmail) throw Object.assign(new Error('Appointment payment order has no customer email.'), { status: 400 });

    const checkoutMetadata = buildCheckoutMetadata({ appointment, order });
    const session = await stripeClient.createCheckoutSession({
        amount,
        currency: normalizeString(order.currency, 12) || 'USD',
        productName: readProductName(order, appointment),
        customerEmail,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        clientReferenceId: input.appointmentId,
        metadata: checkoutMetadata,
    }, {
        idempotencyKey: `${order.checkout_idempotency_key || `appointments:${input.appointmentId}:payment`}:checkout`,
    });

    const nextStripeData = {
        ...normalizeRecord(order.stripe),
        checkoutSessionId: session.sessionId,
        checkoutUrl: session.url,
        paymentIntentId: session.paymentIntentId || normalizeRecord(order.stripe).paymentIntentId,
        checkoutStartedAt: now,
        source: 'appointments-engine',
    };
    const nextOrderData = {
        ...normalizeRecord(order.data),
        stripe: {
            ...normalizeRecord(normalizeRecord(order.data).stripe),
            ...nextStripeData,
        },
        paymentStatus: 'checkout_started',
        updatedAt: now,
    };

    await updateOrThrow(client
        .from('store_orders')
        .update({
            status: 'pending',
            payment_status: 'checkout_started',
            payment_method: 'stripe',
            stripe_checkout_session_id: session.sessionId,
            stripe_payment_intent_id: session.paymentIntentId || order.stripe_payment_intent_id || order.payment_intent_id || null,
            payment_intent_id: session.paymentIntentId || order.payment_intent_id || null,
            stripe: nextStripeData,
            data: nextOrderData,
            metadata: {
                ...normalizeRecord(order.metadata),
                ...checkoutMetadata,
                checkoutSessionId: session.sessionId,
            },
            updated_at: now,
        })
        .eq('id', order.id));

    const appointmentMetadata = normalizeRecord(appointment.metadata);
    await updateOrThrow(client
        .from('project_appointments')
        .update({
            payment_status: 'checkout_started',
            metadata: {
                ...appointmentMetadata,
                ecommerceOrderId: order.id,
                paymentStatus: 'checkout_started',
                stripeCheckoutSessionId: session.sessionId,
                stripePaymentIntentId: session.paymentIntentId || undefined,
                paymentCheckout: {
                    provider: 'stripe',
                    sessionId: session.sessionId,
                    paymentIntentId: session.paymentIntentId || null,
                    startedAt: now,
                },
            },
            updated_at: now,
        })
        .eq('id', input.appointmentId));

    return {
        appointmentId: input.appointmentId,
        orderId: order.id,
        sessionId: session.sessionId,
        checkoutUrl: session.url,
        paymentIntentId: session.paymentIntentId,
        paymentStatus: 'checkout_started',
    };
}

async function getAppointment(client: SupabaseLike, projectId: string, appointmentId: string): Promise<Record<string, any>> {
    const { data, error } = await client
        .from('project_appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('Appointment not found.'), { status: 404 });
    return data;
}

async function getAppointmentOrder(
    client: SupabaseLike,
    projectId: string,
    orderId: string,
    appointmentId: string,
): Promise<Record<string, any>> {
    const { data, error } = await client
        .from('store_orders')
        .select('*')
        .eq('id', orderId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('Appointment payment order not found.'), { status: 404 });

    const orderData = normalizeRecord(data.data);
    const orderMetadata = normalizeRecord(data.metadata);
    const triggeredBy = orderData.triggeredBy || orderMetadata.triggeredBy;
    const sourceModule = orderData.sourceModule || orderMetadata.sourceModule;
    const orderAppointmentId = orderData.appointmentId || orderMetadata.appointmentId || readFirstItem(data).appointmentId;
    if (triggeredBy !== 'appointments-engine' || sourceModule !== 'appointments' || orderAppointmentId !== appointmentId) {
        throw Object.assign(new Error('Payment order is not owned by Appointments Engine.'), { status: 403 });
    }

    return data;
}

function buildCheckoutMetadata(input: { appointment: Record<string, any>; order: Record<string, any> }): Record<string, string> {
    const orderData = normalizeRecord(input.order.data);
    const appointmentMetadata = normalizeRecord(input.appointment.metadata);
    return sanitizeStripeMetadata({
        source: 'appointments-engine',
        type: 'appointment_payment',
        projectId: input.appointment.project_id,
        tenantId: input.appointment.tenant_id || orderData.tenantId,
        appointmentId: input.appointment.id,
        orderId: input.order.id,
        orderNumber: input.order.order_number,
        checkoutIdempotencyKey: input.order.checkout_idempotency_key,
        correlationId: input.appointment.correlation_id || appointmentMetadata.correlationId,
        bookingServiceId: input.appointment.booking_service_id || orderData.bookingServiceId,
        paymentMode: orderData.paymentMode || appointmentMetadata.paymentMode,
    });
}

function readAmount(order: Record<string, any>): number | undefined {
    return normalizeAmount(order.total_amount)
        || normalizeAmount(order.total)
        || normalizeAmount(normalizeRecord(order.data).total)
        || normalizeAmount(normalizeRecord(order.data).amount);
}

function readProductName(order: Record<string, any>, appointment: Record<string, any>): string {
    return normalizeString(readFirstItem(order).name, 120)
        || normalizeString(order.notes, 120)
        || normalizeString(appointment.title, 120)
        || 'Appointment payment';
}

function readFirstItem(order: Record<string, any>): Record<string, any> {
    const items = Array.isArray(order.items) ? order.items : Array.isArray(normalizeRecord(order.data).items) ? normalizeRecord(order.data).items : [];
    return normalizeRecord(items[0]);
}

async function updateOrThrow(query: PromiseLike<{ error?: any }>): Promise<void> {
    const result = await query;
    if (result.error) throw result.error;
}

function appendStripeParam(body: URLSearchParams, key: string, value?: string | null): void {
    if (value === undefined || value === null || value === '') return;
    body.append(key, value);
}

function sanitizeStripeMetadata(value: Record<string, unknown>): Record<string, string> {
    return Object.entries(value).reduce((acc, [key, entry]) => {
        const stringValue = normalizeString(entry, 500);
        if (stringValue) acc[key] = stringValue;
        return acc;
    }, {} as Record<string, string>);
}

function normalizeRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function normalizeString(value: unknown, maxLength = 200): string | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeAmount(value: unknown): number | undefined {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0) return undefined;
    return Math.round(amount * 100) / 100;
}

function toIso(value?: string | Date): string {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
