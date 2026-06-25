import { describe, expect, it, vi } from 'vitest';
import { createAppointmentCheckoutSession } from '../../services/appointments/appointmentCheckoutService';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'update' = 'select';
    private updateRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any }> = [];

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select() {
        return this;
    }

    update(row: Record<string, any>) {
        this.operation = 'update';
        this.updateRow = row;
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
    }

    maybeSingle() {
        return Promise.resolve({ data: this.resolveRows()[0] || null, error: null });
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        if (this.operation === 'update') {
            const rows = this.db.tables[this.table] || [];
            const updated: any[] = [];
            rows.forEach((row, index) => {
                if (!this.matches(row)) return;
                rows[index] = { ...row, ...this.updateRow };
                updated.push(rows[index]);
                this.db.updates.push({ table: this.table, id: row.id, patch: this.updateRow || {} });
            });
            return { data: updated, error: null };
        }
        return { data: this.resolveRows(), error: null };
    }

    private resolveRows() {
        return (this.db.tables[this.table] || []).filter(row => this.matches(row));
    }

    private matches(row: Record<string, any>) {
        return this.filters.every(filter => row[filter.column] === filter.value);
    }
}

class FakeSupabase {
    readonly updates: Array<{ table: string; id: string; patch: Record<string, any> }> = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

describe('appointmentCheckoutService', () => {
    it('creates a Stripe Checkout Session for an appointment deposit order', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                title: 'Strategy session',
                ecommerce_order_id: 'order-1',
                payment_status: 'deposit_pending',
                correlation_id: 'corr-1',
                booking_service_id: 'strategy',
                metadata: { paymentMode: 'deposit' },
            }],
            store_orders: [{
                id: 'order-1',
                project_id: 'project-1',
                order_number: 'APT-0001',
                customer_email: 'ana@example.com',
                customer_name: 'Ana',
                total_amount: 25,
                currency: 'USD',
                payment_status: 'pending',
                checkout_idempotency_key: 'appointments:appointment-1:payment:deposit',
                items: [{
                    name: 'Strategy session deposit',
                    appointmentId: 'appointment-1',
                    paymentMode: 'deposit',
                }],
                data: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    appointmentId: 'appointment-1',
                    paymentMode: 'deposit',
                    tenantId: 'tenant-1',
                },
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    appointmentId: 'appointment-1',
                },
            }],
        });
        const createCheckoutSession = vi.fn(async (_input: any) => ({
            sessionId: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/cs_test_123',
            paymentIntentId: 'pi_123',
        }));

        const result = await createAppointmentCheckoutSession(supabase as any, {
            projectId: 'project-1',
            appointmentId: 'appointment-1',
            orderId: 'order-1',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
        }, {
            now: '2026-06-25T12:00:00.000Z',
            stripeClient: { createCheckoutSession },
        });

        expect(result).toMatchObject({
            appointmentId: 'appointment-1',
            orderId: 'order-1',
            sessionId: 'cs_test_123',
            checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
            paymentIntentId: 'pi_123',
            paymentStatus: 'checkout_started',
        });
        expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
            amount: 25,
            currency: 'USD',
            productName: 'Strategy session deposit',
            customerEmail: 'ana@example.com',
            metadata: expect.objectContaining({
                source: 'appointments-engine',
                type: 'appointment_payment',
                projectId: 'project-1',
                appointmentId: 'appointment-1',
                orderId: 'order-1',
                paymentMode: 'deposit',
            }),
        }), {
            idempotencyKey: 'appointments:appointment-1:payment:deposit:checkout',
        });
        expect(supabase.tables.store_orders[0]).toMatchObject({
            payment_status: 'checkout_started',
            stripe_checkout_session_id: 'cs_test_123',
            stripe_payment_intent_id: 'pi_123',
        });
        expect(supabase.tables.project_appointments[0]).toMatchObject({
            payment_status: 'checkout_started',
        });
        expect(supabase.tables.project_appointments[0].metadata.paymentCheckout).toMatchObject({
            provider: 'stripe',
            sessionId: 'cs_test_123',
            paymentIntentId: 'pi_123',
        });
    });

    it('rejects orders that are not owned by Appointments Engine', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                project_id: 'project-1',
                ecommerce_order_id: 'order-1',
                metadata: {},
            }],
            store_orders: [{
                id: 'order-1',
                project_id: 'project-1',
                total_amount: 25,
                currency: 'USD',
                customer_email: 'ana@example.com',
                data: { triggeredBy: 'ecommerce', sourceModule: 'storefront' },
                metadata: {},
            }],
        });

        await expect(createAppointmentCheckoutSession(supabase as any, {
            projectId: 'project-1',
            appointmentId: 'appointment-1',
            orderId: 'order-1',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
        }, {
            stripeClient: { createCheckoutSession: vi.fn() },
        })).rejects.toThrow('Payment order is not owned by Appointments Engine.');
    });
});
