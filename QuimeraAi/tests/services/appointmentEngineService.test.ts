import { describe, expect, it } from 'vitest';
import {
    checkAppointmentConflicts,
    confirmAppointmentCanonical,
    createAppointmentFromChat,
    createAppointmentFromPublicBooking,
    getAvailableAppointmentSlots,
    mapAppointmentPatchToRow,
} from '../../services/appointments/appointmentEngineService';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private insertRow: Record<string, any> | null = null;
    private updateRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any; op: string }> = [];

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select() {
        this.operation = this.operation === 'insert' || this.operation === 'update' ? this.operation : 'select';
        return this;
    }

    insert(row: Record<string, any>) {
        this.operation = 'insert';
        this.insertRow = row;
        this.db.inserts.push({ table: this.table, row });
        return this;
    }

    update(row: Record<string, any>) {
        this.operation = 'update';
        this.updateRow = row;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value, op: 'eq' });
        return this;
    }

    neq(column: string, value: any) {
        this.filters.push({ column, value, op: 'neq' });
        return this;
    }

    in(column: string, value: any[]) {
        this.filters.push({ column, value, op: 'in' });
        return this;
    }

    lt(column: string, value: any) {
        this.filters.push({ column, value, op: 'lt' });
        return this;
    }

    gt(column: string, value: any) {
        this.filters.push({ column, value, op: 'gt' });
        return this;
    }

    gte(column: string, value: any) {
        this.filters.push({ column, value, op: 'gte' });
        return this;
    }

    lte(column: string, value: any) {
        this.filters.push({ column, value, op: 'lte' });
        return this;
    }

    order() {
        return this;
    }

    limit() {
        return this;
    }

    maybeSingle() {
        const row = this.resolveRows()[0] || null;
        return Promise.resolve({ data: row, error: null });
    }

    single() {
        if (this.operation === 'insert') {
            const row = {
                id: `${this.table}-inserted-1`,
                created_at: '2026-06-25T12:00:00.000Z',
                updated_at: '2026-06-25T12:00:00.000Z',
                ...this.insertRow,
            };
            this.db.tables[this.table] = [...(this.db.tables[this.table] || []), row];
            return Promise.resolve({ data: row, error: null });
        }

        if (this.operation === 'update') {
            const rows = this.db.tables[this.table] || [];
            const index = rows.findIndex(row => this.matchesFilters(row));
            const row = {
                ...(index >= 0 ? rows[index] : { id: `${this.table}-updated-1` }),
                ...this.updateRow,
            };
            if (index >= 0) {
                rows[index] = row;
                this.db.tables[this.table] = rows;
            }
            return Promise.resolve({ data: row, error: null });
        }

        return Promise.resolve({ data: this.resolveRows()[0] || null, error: null });
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve({ data: this.resolveRows(), error: null }).then(resolve, reject);
    }

    private resolveRows() {
        return (this.db.tables[this.table] || []).filter(row => this.matchesFilters(row));
    }

    private matchesFilters(row: Record<string, any>) {
        return this.filters.every(filter => {
            const value = row[filter.column];
            if (filter.op === 'eq') return value === filter.value;
            if (filter.op === 'neq') return value !== filter.value;
            if (filter.op === 'in') return filter.value.includes(value);
            if (filter.op === 'lt') return value < filter.value;
            if (filter.op === 'gt') return value > filter.value;
            if (filter.op === 'gte') return value >= filter.value;
            if (filter.op === 'lte') return value <= filter.value;
            return true;
        });
    }
}

class FakeSupabase {
    readonly inserts: Array<{ table: string; row: Record<string, any> }> = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

describe('appointmentEngineService', () => {
    it('creates ChatCore appointments in the canonical table and queues appointment events', async () => {
        const supabase = new FakeSupabase();

        const result = await createAppointmentFromChat(supabase as any, {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'ChatCore consultation',
            startDate: '2026-07-01T14:00:00.000Z',
            endDate: '2026-07-01T15:00:00.000Z',
            participantName: 'Ana Client',
            participantEmail: 'ana@example.com',
            sourceConversationId: 'conversation-1',
            correlationId: 'correlation-1',
            notes: 'Resumen de solicitud del cliente / Customer request summary\nLo que desea el cliente / What the customer wants: Ana wants a consultation package.',
            conversationTranscript: 'The client asked ChatCore to book a consultation.',
            locale: 'es',
            allowConflicts: true,
            createOrLinkLead: false,
        });

        expect(result.duplicate).toBe(false);
        const appointmentInsert = supabase.inserts.find(insert => insert.table === 'project_appointments');
        const emailInsert = supabase.inserts.find(insert => insert.table === 'email_logs');
        expect(supabase.inserts.some(insert => insert.table.includes('users/'))).toBe(false);
        expect(appointmentInsert?.row).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            source: 'chatbot',
            source_module: 'chatcore',
            source_component: 'ChatCore',
            source_conversation_id: 'conversation-1',
            created_by_system: true,
            correlation_id: 'correlation-1',
        });
        expect(appointmentInsert?.row.notes).toEqual([
            expect.objectContaining({
                content: expect.stringContaining('What the customer wants: Ana wants a consultation package.'),
                isPrivate: false,
                aiGenerated: true,
                pinned: true,
            }),
        ]);
        expect(appointmentInsert?.row.metadata).toMatchObject({
            source: 'chatbot',
            sourceComponent: 'ChatCore',
            sourceModule: 'chatcore',
            conversationTranscript: 'The client asked ChatCore to book a consultation.',
            customerRequestSummary: expect.stringContaining('Ana wants a consultation package.'),
            locale: 'es',
        });
        expect(emailInsert?.row).toMatchObject({
            project_id: 'project-1',
            type: 'appointment_request_received',
            recipient_email: 'ana@example.com',
            subject: 'Solicitud de cita recibida: ChatCore consultation',
        });
        expect(emailInsert?.row.metadata).toMatchObject({
            triggeredBy: 'appointments-engine',
            sourceModule: 'chatcore',
            sourceConversationId: 'conversation-1',
            locale: 'es',
        });
        expect(result.appointment.metadata?.integrationEvents).toEqual(expect.arrayContaining([
            expect.objectContaining({
                eventType: 'appointment_requested',
                sourceModule: 'chatcore',
                entityType: 'appointment',
            }),
        ]));
    });

    it('stores the ChatCore customer request summary in both appointment notes and the linked CRM lead', async () => {
        const supabase = new FakeSupabase();
        const customerRequestSummary = [
            'Resumen de solicitud del cliente / Customer request summary',
            'Proyecto / Project: Ganova',
            'Lo que desea el cliente / What the customer wants: Maria wants a property showing after 3pm and needs parking details.',
            'Resumen de conversacion / Conversation snapshot:',
            '- Cliente / Customer: Quiero ver la propiedad despues de las 3pm.',
        ].join('\n');

        const result = await createAppointmentFromChat(supabase as any, {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'Property showing with Maria',
            startDate: '2026-07-03T19:00:00.000Z',
            endDate: '2026-07-03T19:30:00.000Z',
            participantName: 'Maria Gomez',
            participantEmail: 'maria@example.com',
            participantPhone: '+1 787 555 0123',
            sourceModule: 'realty',
            sourceConversationId: 'conversation-1',
            notes: customerRequestSummary,
            conversationTranscript: 'Cliente: Quiero ver la propiedad despues de las 3pm.',
            allowConflicts: true,
        });

        const appointmentInsert = supabase.inserts.find(insert => insert.table === 'project_appointments');
        const leadInsert = supabase.inserts.find(insert => insert.table === 'leads');

        expect(result.leadId).toBe('leads-inserted-1');
        expect(appointmentInsert?.row.notes).toEqual([
            expect.objectContaining({
                content: expect.stringContaining('What the customer wants: Maria wants a property showing after 3pm and needs parking details.'),
                aiGenerated: true,
                pinned: true,
            }),
        ]);
        expect(appointmentInsert?.row.metadata).toMatchObject({
            customerRequestSummary: expect.stringContaining('Maria wants a property showing after 3pm and needs parking details.'),
            conversationTranscript: 'Cliente: Quiero ver la propiedad despues de las 3pm.',
            sourceModule: 'realty',
            sourceConversationId: 'conversation-1',
        });
        expect(leadInsert?.row).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            name: 'Maria Gomez',
            email: 'maria@example.com',
            source: 'chatbot-widget',
            notes: expect.stringContaining('What the customer wants: Maria wants a property showing after 3pm and needs parking details.'),
        });
        expect(leadInsert?.row.custom_data).toMatchObject({
            appointmentId: expect.any(String),
            appointmentTitle: 'Property showing with Maria',
            sourceModule: 'realty',
            sourceConversationId: 'conversation-1',
            customerRequestSummary: expect.stringContaining('Maria wants a property showing after 3pm and needs parking details.'),
        });
    });

    it('marks public booking submissions for review while using the same canonical table', async () => {
        const supabase = new FakeSupabase();

        await createAppointmentFromPublicBooking(supabase as any, {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'Public booking request',
            startDate: '2026-07-02T10:00:00.000Z',
            endDate: '2026-07-02T10:30:00.000Z',
            participantName: 'Luis Visitor',
            participantEmail: 'luis@example.com',
            publicSubmissionId: 'submission-1',
            allowConflicts: true,
            createOrLinkLead: false,
        });

        expect(supabase.inserts[0].table).toBe('project_appointments');
        expect(supabase.inserts[0].row).toMatchObject({
            source: 'public_booking',
            source_module: 'website-builder',
            source_component: 'PublicBooking',
            public_submission_id: 'submission-1',
            created_by_system: true,
            needs_review: true,
        });
    });

    it('creates a linked ecommerce draft order for deposit-backed public bookings', async () => {
        const supabase = new FakeSupabase();

        const result = await createAppointmentFromPublicBooking(supabase as any, {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'Paid strategy session',
            startDate: '2026-07-02T10:00:00.000Z',
            endDate: '2026-07-02T11:00:00.000Z',
            participantName: 'Luis Visitor',
            participantEmail: 'luis@example.com',
            bookingServiceId: 'strategy-session',
            ecommerceProductId: 'product-deposit-1',
            paymentStatus: 'deposit_pending',
            metadata: {
                paymentMode: 'deposit',
                depositAmount: 50,
                currency: 'USD',
                serviceName: 'Strategy session deposit',
            },
            allowConflicts: true,
            createOrLinkLead: false,
        });

        const orderInsert = supabase.inserts.find(insert => insert.table === 'store_orders');
        const appointmentUpdates = supabase.tables.project_appointments.filter(row => row.id === result.appointmentId);

        expect(orderInsert?.row).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            customer_email: 'luis@example.com',
            customer_name: 'Luis Visitor',
            subtotal: 50,
            total: 50,
            total_amount: 50,
            currency: 'USD',
            payment_status: 'pending',
            checkout_idempotency_key: `appointments:${result.appointmentId}:payment:deposit`,
            metadata: {
                triggeredBy: 'appointments-engine',
                sourceModule: 'appointments',
                appointmentId: result.appointmentId,
                ecommerceProductId: 'product-deposit-1',
                paymentMode: 'deposit',
            },
        });
        expect(orderInsert?.row.items[0]).toMatchObject({
            productId: 'product-deposit-1',
            name: 'Strategy session deposit',
            unitPrice: 50,
            totalPrice: 50,
            bookingServiceId: 'strategy-session',
        });
        expect(result.appointment.ecommerceOrderId).toBe('store_orders-inserted-1');
        expect(result.appointment.paymentStatus).toBe('deposit_pending');
        expect(appointmentUpdates[0].metadata).toMatchObject({
            ecommerceOrderId: 'store_orders-inserted-1',
            paymentStatus: 'deposit_pending',
        });
    });

    it('queues confirmation and reminder email flows when an appointment is confirmed', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                title: 'Strategy session',
                status: 'scheduled',
                type: 'consultation',
                priority: 'medium',
                start_date: '2026-07-05T14:00:00.000Z',
                end_date: '2026-07-05T15:00:00.000Z',
                timezone: 'UTC',
                organizer_id: 'user-1',
                participants: [{
                    id: 'participant-1',
                    type: 'lead',
                    name: 'Ana Client',
                    email: 'ana@example.com',
                    role: 'attendee',
                    status: 'pending',
                }],
                reminders: [{
                    id: 'reminder-1',
                    type: 'email',
                    minutesBefore: 60,
                    sent: false,
                    enabled: true,
                }],
                metadata: { locale: 'en' },
                created_at: '2026-06-25T12:00:00.000Z',
            }],
        });

        const appointment = await confirmAppointmentCanonical(supabase as any, 'appointment-1', 'user-1');
        const emailTypes = supabase.inserts
            .filter(insert => insert.table === 'email_logs')
            .map(insert => insert.row.type);

        expect(appointment.status).toBe('confirmed');
        expect(emailTypes).toEqual(expect.arrayContaining([
            'appointment_confirmation',
            'appointment_reminder',
        ]));
        expect(supabase.inserts.find(insert => insert.row.type === 'appointment_confirmation')?.row.subject)
            .toBe('Appointment confirmed: Strategy session');
        expect(appointment.metadata?.integrationEvents).toEqual(expect.arrayContaining([
            expect.objectContaining({ eventType: 'appointment_confirmed' }),
        ]));
    });

    it('checks conflicts against canonical appointments and canonical blocked times', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                project_id: 'project-1',
                title: 'Existing booking',
                status: 'confirmed',
                start_date: '2026-07-03T14:00:00.000Z',
                end_date: '2026-07-03T15:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
            }],
            project_appointment_blocks: [{
                id: 'block-1',
                project_id: 'project-1',
                title: 'Lunch',
                start_date: '2026-07-03T13:00:00.000Z',
                end_date: '2026-07-03T16:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
            }],
        });

        const conflicts = await checkAppointmentConflicts(
            supabase as any,
            'project-1',
            '2026-07-03T14:30:00.000Z',
            '2026-07-03T15:30:00.000Z',
        );

        expect(conflicts.hasConflict).toBe(true);
        expect(conflicts.appointments[0].id).toBe('appointment-1');
        expect(conflicts.blocks[0].id).toBe('block-1');
    });

    it('generates public availability from canonical appointments and blocked times', async () => {
        const supabase = new FakeSupabase({
            project_appointments: [{
                id: 'appointment-1',
                project_id: 'project-1',
                title: 'Existing booking',
                status: 'confirmed',
                start_date: '2026-07-01T14:00:00.000Z',
                end_date: '2026-07-01T15:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
            }],
            project_appointment_blocks: [{
                id: 'block-1',
                project_id: 'project-1',
                title: 'Unavailable',
                start_date: '2026-07-01T15:00:00.000Z',
                end_date: '2026-07-01T16:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
            }],
        });

        const slots = await getAvailableAppointmentSlots(supabase as any, 'project-1', {
            startDate: '2026-07-01T00:00:00.000Z',
            endDate: '2026-07-02T00:00:00.000Z',
            now: '2026-07-01T07:00:00.000Z',
            durationMinutes: 60,
            intervalMinutes: 60,
            minimumNoticeMinutes: 0,
            weeklyHours: [{ day: 'wednesday', enabled: true, startTime: '09:00', endTime: '12:00' }],
        });

        expect(slots).toHaveLength(1);
        expect(slots[0].time).toBe('09:00');
    });

    it('maps engine metadata fields back to the canonical Supabase row shape', () => {
        expect(mapAppointmentPatchToRow({
            source: 'chatbot',
            sourceComponent: 'ChatCore',
            sourceModule: 'chatbot',
            sourceConversationId: 'conversation-1',
            sourceLeadId: 'lead-1',
            publicSubmissionId: 'public-1',
            idempotencyKey: 'idempotency-1',
            needsReview: true,
            generatedByAI: true,
            correlationId: 'correlation-1',
            bookingServiceId: 'service-1',
            ecommerceProductId: 'product-1',
            ecommerceOrderId: 'order-1',
            paymentStatus: 'deposit_pending',
            metadata: { source: 'test' },
        })).toMatchObject({
            source: 'chatbot',
            source_component: 'ChatCore',
            source_module: 'chatbot',
            source_conversation_id: 'conversation-1',
            source_lead_id: 'lead-1',
            public_submission_id: 'public-1',
            idempotency_key: 'idempotency-1',
            needs_review: true,
            generated_by_ai: true,
            correlation_id: 'correlation-1',
            booking_service_id: 'service-1',
            ecommerce_product_id: 'product-1',
            ecommerce_order_id: 'order-1',
            payment_status: 'deposit_pending',
            metadata: { source: 'test' },
        });
    });
});
