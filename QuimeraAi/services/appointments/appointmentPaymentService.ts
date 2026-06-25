import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '../../types';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface AppointmentPaymentDraftResult {
    orderId?: string;
    paymentStatus?: string;
    warnings: string[];
}

const normalizeRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const normalizeString = (value: unknown, maxLength = 200): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const normalizeAmount = (value: unknown): number | undefined => {
    const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0) return undefined;
    return Math.round(amount * 100) / 100;
};

const firstParticipant = (appointment: Appointment) => appointment.participants?.find(participant => (
    participant.email || participant.phone || participant.name
)) || appointment.participants?.[0];

const readPaymentMode = (metadata: Record<string, unknown>): string => (
    normalizeString(metadata.paymentMode, 80)
    || normalizeString(metadata.appointmentPaymentMode, 80)
    || 'none'
).toLowerCase();

const readPaymentAmount = (metadata: Record<string, unknown>): number | undefined => (
    normalizeAmount(metadata.depositAmount)
    || normalizeAmount(metadata.prepaidAmount)
    || normalizeAmount(metadata.paymentAmount)
    || normalizeAmount(metadata.amount)
    || normalizeAmount(metadata.price)
);

const buildOrderNumber = (appointment: Appointment): string => {
    const suffix = appointment.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase();
    return `APT-${suffix}`;
};

export async function createAppointmentPaymentDraft(
    client: SupabaseLike,
    appointment: Appointment,
): Promise<AppointmentPaymentDraftResult> {
    const warnings: string[] = [];
    const metadata = normalizeRecord(appointment.metadata);
    const paymentMode = readPaymentMode(metadata);
    const amount = readPaymentAmount(metadata);
    const productId = normalizeString(appointment.ecommerceProductId || metadata.ecommerceProductId, 160);
    const requiresPayment = paymentMode === 'deposit' || paymentMode === 'prepaid' || Boolean(productId);

    if (!requiresPayment) return { warnings };
    if (!amount) return { warnings: ['payment_draft_skipped_missing_amount'] };
    if (!appointment.projectId) return { warnings: ['payment_draft_skipped_missing_project'] };
    if (appointment.ecommerceOrderId) {
        return {
            orderId: appointment.ecommerceOrderId,
            paymentStatus: appointment.paymentStatus || 'pending',
            warnings,
        };
    }

    const participant = firstParticipant(appointment);
    const customerEmail = normalizeString(participant?.email, 320);
    const customerName = normalizeString(participant?.name, 200) || customerEmail;
    if (!customerEmail || !customerName) return { warnings: ['payment_draft_skipped_missing_customer'] };

    const now = new Date().toISOString();
    const currency = (normalizeString(metadata.currency, 12) || 'USD').toUpperCase();
    const checkoutIdempotencyKey = `appointments:${appointment.id}:payment:${paymentMode}`;

    const existing = await client
        .from('store_orders')
        .select('id, payment_status')
        .eq('project_id', appointment.projectId)
        .eq('checkout_idempotency_key', checkoutIdempotencyKey)
        .maybeSingle();

    if (existing.error) {
        warnings.push(`payment_draft_lookup_failed:${existing.error.message}`);
    } else if (existing.data?.id) {
        return {
            orderId: existing.data.id,
            paymentStatus: existing.data.payment_status || 'pending',
            warnings,
        };
    }

    const item = {
        id: `appointment-${appointment.id}`,
        productId: productId || `appointment-service-${appointment.bookingServiceId || appointment.id}`,
        name: normalizeString(metadata.serviceName, 200) || appointment.title || 'Appointment deposit',
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        appointmentId: appointment.id,
        bookingServiceId: appointment.bookingServiceId,
        paymentMode,
    };

    const order = await client
        .from('store_orders')
        .insert({
            project_id: appointment.projectId,
            store_id: appointment.projectId,
            order_number: buildOrderNumber(appointment),
            customer_email: customerEmail,
            customer_name: customerName,
            customer_phone: normalizeString(participant?.phone, 80) || null,
            items: [item],
            subtotal: amount,
            discount: 0,
            discount_amount: 0,
            shipping_cost: 0,
            shipping_amount: 0,
            tax_amount: 0,
            total: amount,
            total_amount: amount,
            currency,
            shipping_address: {
                type: 'appointment',
                appointmentId: appointment.id,
                delivery: 'not_required',
            },
            billing_address: null,
            status: 'pending',
            payment_status: 'pending',
            fulfillment_status: 'unfulfilled',
            payment_method: paymentMode === 'prepaid' || paymentMode === 'deposit' ? 'stripe' : 'manual',
            checkout_idempotency_key: checkoutIdempotencyKey,
            notes: appointment.title,
            customer_notes: typeof metadata.clientMessage === 'string' ? metadata.clientMessage : null,
            internal_notes: `Appointment Engine ${paymentMode} draft for ${appointment.id}`,
            data: {
                triggeredBy: 'appointments-engine',
                sourceModule: 'appointments',
                appointmentId: appointment.id,
                projectId: appointment.projectId,
                tenantId: appointment.tenantId,
                correlationId: appointment.correlationId,
                bookingServiceId: appointment.bookingServiceId,
                ecommerceProductId: productId,
                paymentMode,
                paymentStatus: 'pending',
                amount,
                currency,
                createdAt: now,
            },
            metadata: {
                triggeredBy: 'appointments-engine',
                sourceModule: 'appointments',
                appointmentId: appointment.id,
                correlationId: appointment.correlationId,
                bookingServiceId: appointment.bookingServiceId,
                ecommerceProductId: productId,
                paymentMode,
            },
            created_at: now,
            updated_at: now,
        })
        .select('id, payment_status')
        .single();

    if (order.error) {
        return { warnings: [...warnings, `payment_draft_create_failed:${order.error.message}`] };
    }

    return {
        orderId: order.data.id,
        paymentStatus: order.data.payment_status || 'pending',
        warnings,
    };
}
