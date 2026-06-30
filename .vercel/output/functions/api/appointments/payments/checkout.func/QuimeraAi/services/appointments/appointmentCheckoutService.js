const STRIPE_API_VERSION = '2026-02-25.clover';
export function createStripeAppointmentCheckoutClient(secretKey) {
    if (!secretKey)
        return undefined;
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
export async function createAppointmentCheckoutSession(client, input, options = {}) {
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
    if (!amount)
        throw Object.assign(new Error('Appointment payment order has no payable amount.'), { status: 400 });
    if (String(order.payment_status || '').toLowerCase() === 'paid') {
        throw Object.assign(new Error('Appointment payment order is already paid.'), { status: 409 });
    }
    const customerEmail = normalizeEmail(order.customer_email);
    if (!customerEmail)
        throw Object.assign(new Error('Appointment payment order has no customer email.'), { status: 400 });
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
async function getAppointment(client, projectId, appointmentId) {
    const { data, error } = await client
        .from('project_appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw Object.assign(new Error('Appointment not found.'), { status: 404 });
    return data;
}
async function getAppointmentOrder(client, projectId, orderId, appointmentId) {
    const { data, error } = await client
        .from('store_orders')
        .select('*')
        .eq('id', orderId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw Object.assign(new Error('Appointment payment order not found.'), { status: 404 });
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
function buildCheckoutMetadata(input) {
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
function readAmount(order) {
    return normalizeAmount(order.total_amount)
        || normalizeAmount(order.total)
        || normalizeAmount(normalizeRecord(order.data).total)
        || normalizeAmount(normalizeRecord(order.data).amount);
}
function readProductName(order, appointment) {
    return normalizeString(readFirstItem(order).name, 120)
        || normalizeString(order.notes, 120)
        || normalizeString(appointment.title, 120)
        || 'Appointment payment';
}
function readFirstItem(order) {
    const items = Array.isArray(order.items) ? order.items : Array.isArray(normalizeRecord(order.data).items) ? normalizeRecord(order.data).items : [];
    return normalizeRecord(items[0]);
}
async function updateOrThrow(query) {
    const result = await query;
    if (result.error)
        throw result.error;
}
function appendStripeParam(body, key, value) {
    if (value === undefined || value === null || value === '')
        return;
    body.append(key, value);
}
function sanitizeStripeMetadata(value) {
    return Object.entries(value).reduce((acc, [key, entry]) => {
        const stringValue = normalizeString(entry, 500);
        if (stringValue)
            acc[key] = stringValue;
        return acc;
    }, {});
}
function normalizeRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function normalizeString(value, maxLength = 200) {
    if (typeof value !== 'string' && typeof value !== 'number')
        return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}
function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function normalizeAmount(value) {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0)
        return undefined;
    return Math.round(amount * 100) / 100;
}
function toIso(value) {
    if (!value)
        return new Date().toISOString();
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
//# sourceMappingURL=appointmentCheckoutService.js.map