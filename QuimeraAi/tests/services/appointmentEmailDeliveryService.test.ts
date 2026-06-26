import { describe, expect, it, vi } from 'vitest';
import { processAppointmentEmailLogs } from '../../services/appointments/appointmentEmailDeliveryService';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'update' | 'insert' | 'upsert' = 'select';
    private updateRow: Record<string, any> | null = null;
    private insertRows: Record<string, any>[] = [];
    private filters: Array<{ column: string; value: any; op: string }> = [];
    private containsFilters: Array<{ column: string; value: Record<string, any> }> = [];
    private orFilters: Array<Array<{ column: string; value: string }>> = [];
    private limitCount: number | null = null;
    private orderBy: { column: string; ascending: boolean } | null = null;
    private upsertConflict: string[] = [];

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select(_columns?: string, _options?: Record<string, any>) {
        return this;
    }

    update(row: Record<string, any>) {
        this.operation = 'update';
        this.updateRow = row;
        return this;
    }

    insert(row: Record<string, any> | Record<string, any>[]) {
        this.operation = 'insert';
        this.insertRows = Array.isArray(row) ? row : [row];
        return this;
    }

    upsert(row: Record<string, any> | Record<string, any>[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
        this.operation = 'upsert';
        this.insertRows = Array.isArray(row) ? row : [row];
        this.upsertConflict = String(options.onConflict || '')
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value, op: 'eq' });
        return this;
    }

    in(column: string, value: any[]) {
        this.filters.push({ column, value, op: 'in' });
        return this;
    }

    lte(column: string, value: any) {
        this.filters.push({ column, value, op: 'lte' });
        return this;
    }

    contains(column: string, value: Record<string, any>) {
        this.containsFilters.push({ column, value });
        return this;
    }

    or(expression: string) {
        const group = expression
            .split(',')
            .map(part => part.match(/^(.+)\.eq\.(.+)$/))
            .filter((match): match is RegExpMatchArray => Boolean(match))
            .map(match => ({ column: match[1], value: match[2] }));
        this.orFilters.push(group);
        return this;
    }

    limit(value: number) {
        this.limitCount = value;
        return this;
    }

    order(column: string, options: { ascending?: boolean } = {}) {
        this.orderBy = { column, ascending: options.ascending !== false };
        return this;
    }

    maybeSingle() {
        return Promise.resolve(this.executeSingle());
    }

    single() {
        return Promise.resolve(this.executeSingle());
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        if (this.operation === 'update') {
            const rows = this.db.tables[this.table] || [];
            const updated: any[] = [];
            rows.forEach((row, index) => {
                if (!this.matchesFilters(row)) return;
                rows[index] = { ...row, ...this.updateRow };
                updated.push(rows[index]);
                this.db.updates.push({ table: this.table, id: row.id, patch: this.updateRow || {} });
            });
            return { data: updated, error: null };
        }

        if (this.operation === 'insert') {
            const table = this.ensureTable();
            const inserted = this.insertRows.map(row => this.withDefaults(row));
            table.push(...inserted);
            return { data: inserted, error: null };
        }

        if (this.operation === 'upsert') {
            const table = this.ensureTable();
            const rows: Record<string, any>[] = [];
            for (const row of this.insertRows) {
                const existingIndex = this.upsertConflict.length > 0
                    ? table.findIndex(existing => this.upsertConflict.every(column => existing[column] === row[column]))
                    : -1;
                if (existingIndex >= 0) {
                    table[existingIndex] = { ...table[existingIndex], ...row };
                    rows.push(table[existingIndex]);
                } else {
                    const next = this.withDefaults(row);
                    table.push(next);
                    rows.push(next);
                }
            }
            return { data: rows, error: null };
        }

        return { data: this.resolveRows(), error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private resolveRows() {
        let rows = (this.db.tables[this.table] || []).filter(row => this.matchesFilters(row));
        if (this.orderBy) {
            const { column, ascending } = this.orderBy;
            rows = [...rows].sort((a, b) => {
                const left = a[column] || '';
                const right = b[column] || '';
                if (left === right) return 0;
                return (left > right ? 1 : -1) * (ascending ? 1 : -1);
            });
        }
        return this.limitCount ? rows.slice(0, this.limitCount) : rows;
    }

    private matchesFilters(row: Record<string, any>) {
        const scalarMatches = this.filters.every(filter => {
            const value = row[filter.column];
            if (filter.op === 'eq') return value === filter.value;
            if (filter.op === 'in') return filter.value.includes(value);
            if (filter.op === 'lte') return new Date(value).getTime() <= new Date(filter.value).getTime();
            return true;
        });
        const containsMatches = this.containsFilters.every(filter => objectContains(row[filter.column], filter.value));
        const orMatches = this.orFilters.every(group => (
            group.length === 0 || group.some(filter => row[filter.column] === filter.value)
        ));
        return scalarMatches && containsMatches && orMatches;
    }

    private ensureTable() {
        if (!this.db.tables[this.table]) this.db.tables[this.table] = [];
        return this.db.tables[this.table];
    }

    private withDefaults(row: Record<string, any>) {
        const now = new Date().toISOString();
        return {
            ...row,
            id: row.id || `${this.table}-${this.ensureTable().length + 1}`,
            created_at: row.created_at || now,
            updated_at: row.updated_at || now,
        };
    }
}

class FakeSupabase {
    readonly updates: Array<{ table: string; id: string; patch: Record<string, any> }> = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

function objectContains(value: unknown, expected: Record<string, any>): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.entries(expected).every(([key, expectedValue]) => {
        const actualValue = (value as Record<string, any>)[key];
        if (expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
            return objectContains(actualValue, expectedValue);
        }
        return actualValue === expectedValue;
    });
}

describe('appointmentEmailDeliveryService', () => {
    it('sends due Appointments Engine email logs through the configured provider', async () => {
        const supabase = new FakeSupabase({
            email_logs: [{
                id: 'email-1',
                project_id: 'project-1',
                store_id: 'project-1',
                type: 'appointment_confirmation',
                recipient_email: 'ANA@EXAMPLE.COM',
                recipient_name: 'Ana',
                subject: 'Cita confirmada: Consulta',
                status: 'queued',
                provider: 'resend',
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    locale: 'es',
                    i18n: { params: { title: 'Consulta' } },
                    startDate: '2026-07-01T14:00:00.000Z',
                    endDate: '2026-07-01T15:00:00.000Z',
                    timezone: 'America/Puerto_Rico',
                },
            }],
            email_settings: [{
                project_id: 'project-1',
                provider: 'resend',
                api_key_configured: true,
                from_email: 'appointments@example.com',
                from_name: 'Quimera Studio',
                reply_to: 'team@example.com',
                primary_color: '#111827',
                transactional: { appointments: true },
            }],
        });
        const send = vi.fn(async (_input: any) => ({ providerMessageId: 'resend-1' }));

        const summary = await processAppointmentEmailLogs(supabase as any, {
            now: '2026-06-25T12:00:00.000Z',
            provider: { send },
        });

        expect(summary).toMatchObject({ processed: 1, sent: 1, failed: 0, skipped: 0 });
        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            from: 'Quimera Studio <appointments@example.com>',
            replyTo: 'team@example.com',
            to: ['ana@example.com'],
            subject: 'Cita confirmada: Consulta',
        }));
        const sentEmail = send.mock.calls.at(0)?.[0] as { text?: string } | undefined;
        expect(sentEmail?.text).toContain('Tu cita está confirmada.');
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'sent',
            sent_at: '2026-06-25T12:00:00.000Z',
            provider_message_id: 'resend-1',
        });
        expect(supabase.tables.email_logs[0].metadata.delivery).toMatchObject({
            provider: 'resend',
            status: 'sent',
            bodyKey: 'appointmentBooking.emailBodies.appointment_confirmation',
        });
    });

    it('defers scheduled reminders until their sendAt time arrives', async () => {
        const supabase = new FakeSupabase({
            email_logs: [{
                id: 'email-2',
                project_id: 'project-1',
                type: 'appointment_reminder',
                recipient_email: 'ana@example.com',
                status: 'scheduled',
                provider: 'resend',
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    locale: 'en',
                    sendAt: '2026-06-25T14:00:00.000Z',
                    i18n: { params: { title: 'Strategy session' } },
                },
            }],
            email_settings: [{
                project_id: 'project-1',
                provider: 'resend',
                api_key_configured: true,
                transactional: { appointments: true },
            }],
        });
        const send = vi.fn(async (_input: any) => ({ providerMessageId: 'resend-2' }));

        const summary = await processAppointmentEmailLogs(supabase as any, {
            now: '2026-06-25T12:00:00.000Z',
            provider: { send },
        });

        expect(summary).toMatchObject({ processed: 1, deferred: 1, sent: 0 });
        expect(send).not.toHaveBeenCalled();
        expect(supabase.tables.email_logs[0].status).toBe('scheduled');
    });

    it('uses project appointment email template overrides with variables and custom HTML', async () => {
        const supabase = new FakeSupabase({
            email_logs: [{
                id: 'email-template-1',
                project_id: 'project-1',
                type: 'appointment_confirmation',
                recipient_email: 'ana@example.com',
                recipient_name: 'Ana',
                status: 'queued',
                provider: 'resend',
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    locale: 'en',
                    i18n: { params: { title: 'Strategy session' } },
                    startDate: '2026-07-01T14:00:00.000Z',
                    endDate: '2026-07-01T15:00:00.000Z',
                    timezone: 'UTC',
                },
            }],
            email_settings: [{
                project_id: 'project-1',
                provider: 'resend',
                api_key_configured: true,
                from_email: 'appointments@example.com',
                from_name: 'Quimera Studio',
                transactional: {
                    appointments: true,
                    appointmentTemplates: {
                        appointment_confirmation: {
                            enabled: true,
                            subject: 'Ready for {{title}}, {{name}}',
                            preheader: 'Prepared for {{start}}',
                            intro: 'Custom intro for {{name}}',
                            html: '<main><h1>{{title}}</h1><p>{{name}} at {{start}}</p></main>',
                            primaryColor: '#0f766e',
                        },
                    },
                },
            }],
        });
        const send = vi.fn(async (_input: any) => ({ providerMessageId: 'resend-template-1' }));

        const summary = await processAppointmentEmailLogs(supabase as any, {
            now: '2026-06-25T12:00:00.000Z',
            provider: { send },
        });

        expect(summary).toMatchObject({ processed: 1, sent: 1 });
        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            subject: 'Ready for Strategy session, Ana',
            html: expect.stringContaining('<h1>Strategy session</h1>'),
            text: expect.stringContaining('Custom intro for Ana'),
        }));
        expect(send.mock.calls.at(0)?.[0].html).toContain('Ana at ');
    });

    it('skips disabled appointment email flows without calling the provider', async () => {
        const supabase = new FakeSupabase({
            email_logs: [{
                id: 'email-3',
                project_id: 'project-1',
                type: 'appointment_reminder',
                recipient_email: 'ana@example.com',
                status: 'scheduled',
                provider: 'resend',
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    locale: 'en',
                    sendAt: '2026-06-25T11:00:00.000Z',
                    i18n: { params: { title: 'Strategy session' } },
                },
            }],
            email_settings: [{
                project_id: 'project-1',
                provider: 'resend',
                api_key_configured: true,
                transactional: { appointmentReminder: false },
            }],
        });
        const send = vi.fn(async (_input: any) => ({ providerMessageId: 'resend-3' }));

        const summary = await processAppointmentEmailLogs(supabase as any, {
            now: '2026-06-25T12:00:00.000Z',
            provider: { send },
        });

        expect(summary).toMatchObject({ processed: 1, skipped: 1, sent: 0 });
        expect(send).not.toHaveBeenCalled();
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'skipped',
            error_code: 'appointment_email_flow_disabled',
        });
    });

    it('defers due logs when the cron runtime has no email provider', async () => {
        const supabase = new FakeSupabase({
            email_logs: [{
                id: 'email-4',
                project_id: 'project-1',
                type: 'appointment_confirmation',
                recipient_email: 'ana@example.com',
                status: 'queued',
                provider: 'resend',
                metadata: {
                    triggeredBy: 'appointments-engine',
                    sourceModule: 'appointments',
                    locale: 'en',
                    i18n: { params: { title: 'Strategy session' } },
                },
            }],
            email_settings: [{
                project_id: 'project-1',
                provider: 'resend',
                api_key_configured: true,
                transactional: { appointments: true },
            }],
        });

        const summary = await processAppointmentEmailLogs(supabase as any, {
            now: '2026-06-25T12:00:00.000Z',
        });

        expect(summary).toMatchObject({ processed: 1, deferred: 1, failed: 0, sent: 0 });
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'queued',
            error_code: 'email_provider_missing',
        });
        expect(supabase.tables.email_logs[0].metadata.delivery).toMatchObject({
            provider: 'resend',
            status: 'deferred',
        });
    });
});
