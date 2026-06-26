import { describe, expect, it, vi } from 'vitest';
import { EmailProviderRequestError, type EmailProvider } from '../../services/email/emailProviderService.ts';
import { processEmailOutbox } from '../../services/email/emailOutboxProcessor.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    private insertRows: Record<string, any>[] = [];
    private updateRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any; op: 'eq' | 'in' | 'lte' | 'gte' }> = [];
    private orFilters: Array<Array<{ column: string; value: string }>> = [];
    private limitCount: number | null = null;
    private orderBy: { column: string; ascending: boolean } | null = null;
    private countMode = false;

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select(_columns?: string, options: { count?: string; head?: boolean } = {}) {
        this.countMode = Boolean(options.count || options.head);
        return this;
    }

    insert(row: Record<string, any> | Record<string, any>[]) {
        this.operation = 'insert';
        this.insertRows = Array.isArray(row) ? row : [row];
        return this;
    }

    update(row: Record<string, any>) {
        this.operation = 'update';
        this.updateRow = row;
        return this;
    }

    upsert(row: Record<string, any> | Record<string, any>[]) {
        this.operation = 'upsert';
        this.insertRows = Array.isArray(row) ? row : [row];
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

    gte(column: string, value: any) {
        this.filters.push({ column, value, op: 'gte' });
        return this;
    }

    contains(_column: string, _value: Record<string, any>) {
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

    order(column: string, options: { ascending?: boolean } = {}) {
        this.orderBy = { column, ascending: options.ascending !== false };
        return this;
    }

    limit(value: number) {
        this.limitCount = value;
        return this;
    }

    maybeSingle() {
        return Promise.resolve(this.executeSingle());
    }

    then(resolve: (value: { data: any[]; error: null; count?: number }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        if (this.operation === 'insert') {
            const table = this.ensureTable();
            const inserted = this.insertRows.map(row => this.withDefaults(row));
            table.push(...inserted);
            return { data: inserted, error: null };
        }

        if (this.operation === 'update') {
            const table = this.ensureTable();
            const updated: Record<string, any>[] = [];
            table.forEach((row, index) => {
                if (!this.matches(row)) return;
                table[index] = { ...row, ...(this.updateRow || {}) };
                updated.push(table[index]);
            });
            return { data: updated, error: null };
        }

        if (this.operation === 'upsert') {
            const table = this.ensureTable();
            const rows = this.insertRows.map(row => this.withDefaults(row));
            table.push(...rows);
            return { data: rows, error: null };
        }

        const rows = this.resolveRows();
        if (this.countMode) return { data: [], error: null, count: rows.length };
        return { data: rows, error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private resolveRows() {
        let rows = (this.db.tables[this.table] || []).filter(row => this.matches(row));
        if (this.orderBy) {
            rows = [...rows].sort((a, b) => {
                const left = String(a[this.orderBy!.column] || '');
                const right = String(b[this.orderBy!.column] || '');
                return this.orderBy!.ascending ? left.localeCompare(right) : right.localeCompare(left);
            });
        }
        return this.limitCount ? rows.slice(0, this.limitCount) : rows;
    }

    private matches(row: Record<string, any>) {
        const scalarMatches = this.filters.every(filter => {
            if (filter.op === 'eq') return row[filter.column] === filter.value;
            if (filter.op === 'in') return filter.value.includes(row[filter.column]);
            if (filter.op === 'lte') return String(row[filter.column] || '') <= String(filter.value);
            return String(row[filter.column] || '') >= String(filter.value);
        });
        const orMatches = this.orFilters.every(group => (
            group.length === 0 || group.some(filter => row[filter.column] === filter.value)
        ));
        return scalarMatches && orMatches;
    }

    private ensureTable() {
        if (!this.db.tables[this.table]) this.db.tables[this.table] = [];
        return this.db.tables[this.table];
    }

    private withDefaults(row: Record<string, any>) {
        return {
            ...row,
            id: row.id || `${this.table}-${this.ensureTable().length + 1}`,
            created_at: row.created_at || '2026-06-25T12:00:00.000Z',
            updated_at: row.updated_at || '2026-06-25T12:00:00.000Z',
        };
    }
}

class FakeSupabase {
    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

const baseSettings = {
    project_id: 'project-1',
    from_email: 'hello@example.com',
    from_name: 'Quimera',
    api_key_configured: true,
    marketing: { enabled: true },
    compliance: { unsubscribeFooterEnabled: true, suppressionEnabled: true },
};

function queuedOutbox(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id || 'outbox-1',
        project_id: 'project-1',
        email_log_id: overrides.email_log_id || 'log-1',
        email_kind: overrides.email_kind || 'transactional',
        recipient_email: overrides.recipient_email || 'ada@example.com',
        subject: overrides.subject || 'Hello',
        html_content: overrides.html_content || '<p>Hello</p>',
        text_content: '',
        status: 'queued',
        attempts: 0,
        max_attempts: 3,
        scheduled_at: '2026-06-25T12:00:00.000Z',
        provider: overrides.provider || 'resend',
        idempotency_key: overrides.idempotency_key || 'idem-1',
        created_at: overrides.created_at || '2026-06-25T12:00:00.000Z',
        ...overrides,
    };
}

function logRow(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id || 'log-1',
        project_id: 'project-1',
        recipient_email: 'ada@example.com',
        status: 'queued',
        idempotency_key: overrides.idempotency_key || 'idem-1',
        metadata: { idempotencyKey: overrides.idempotency_key || 'idem-1' },
        ...overrides,
    };
}

describe('emailOutboxProcessor', () => {
    it('uses the server-side provider matching project email settings', async () => {
        const sendGridSend = vi.fn(async () => ({ providerMessageId: 'sg-1' }));
        const resendSend = vi.fn(async () => ({ providerMessageId: 'resend-1' }));
        const supabase = new FakeSupabase({
            email_settings: [{ ...baseSettings, provider: 'sendgrid' }],
            email_outbox: [queuedOutbox({ provider: 'sendgrid' })],
            email_logs: [logRow()],
            email_suppressions: [],
            email_campaigns: [],
        });

        const result = await processEmailOutbox({
            supabase: supabase as any,
            provider: { name: 'resend', send: resendSend },
            providers: { sendgrid: { name: 'sendgrid', send: sendGridSend } },
            now: '2026-06-25T12:00:00.000Z',
        });

        expect(result).toMatchObject({ processed: 1, sent: 1, failed: 0 });
        expect(sendGridSend).toHaveBeenCalledTimes(1);
        expect(resendSend).not.toHaveBeenCalled();
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            status: 'sent',
            provider_message_id: 'sg-1',
        });
    });

    it('defers extra rows when per-run rate limit is reached', async () => {
        const provider: EmailProvider = {
            name: 'resend',
            send: vi.fn(async () => ({ providerMessageId: 'resend-1' })),
        };
        const supabase = new FakeSupabase({
            email_settings: [{ ...baseSettings, provider: 'resend' }],
            email_outbox: [
                queuedOutbox({ id: 'outbox-1', email_log_id: 'log-1', idempotency_key: 'idem-1' }),
                queuedOutbox({ id: 'outbox-2', email_log_id: 'log-2', idempotency_key: 'idem-2', created_at: '2026-06-25T12:00:01.000Z' }),
            ],
            email_logs: [logRow({ id: 'log-1', idempotency_key: 'idem-1' }), logRow({ id: 'log-2', idempotency_key: 'idem-2' })],
            email_suppressions: [],
            email_campaigns: [],
        });

        const result = await processEmailOutbox({
            supabase: supabase as any,
            provider,
            rateLimit: { maxPerRun: 1, retryAfterSeconds: 90 },
            now: '2026-06-25T12:00:00.000Z',
        });

        expect(result).toMatchObject({ processed: 2, sent: 1, deferred: 1 });
        expect(provider.send).toHaveBeenCalledTimes(1);
        expect(supabase.tables.email_outbox[1]).toMatchObject({
            status: 'queued',
            skipped_reason: 'rate_limited',
            scheduled_at: '2026-06-25T12:01:30.000Z',
        });
    });

    it('uses project metadata rate limits when no runtime override is provided', async () => {
        const provider: EmailProvider = {
            name: 'resend',
            send: vi.fn(async () => ({ providerMessageId: 'resend-1' })),
        };
        const supabase = new FakeSupabase({
            email_settings: [{
                ...baseSettings,
                provider: 'resend',
                metadata: {
                    emailRateLimits: {
                        resend: { maxPerRun: 1, retryAfterSeconds: 75 },
                    },
                },
            }],
            email_outbox: [
                queuedOutbox({ id: 'outbox-1', email_log_id: 'log-1', idempotency_key: 'idem-1' }),
                queuedOutbox({ id: 'outbox-2', email_log_id: 'log-2', idempotency_key: 'idem-2', created_at: '2026-06-25T12:00:01.000Z' }),
            ],
            email_logs: [logRow({ id: 'log-1', idempotency_key: 'idem-1' }), logRow({ id: 'log-2', idempotency_key: 'idem-2' })],
            email_suppressions: [],
            email_campaigns: [],
        });

        const result = await processEmailOutbox({
            supabase: supabase as any,
            provider,
            now: '2026-06-25T12:00:00.000Z',
        });

        expect(result).toMatchObject({ processed: 2, sent: 1, deferred: 1 });
        expect(provider.send).toHaveBeenCalledTimes(1);
        expect(supabase.tables.email_outbox[1]).toMatchObject({
            status: 'queued',
            skipped_reason: 'rate_limited',
            scheduled_at: '2026-06-25T12:01:15.000Z',
        });
    });

    it('defers provider 429 responses using retry-after metadata', async () => {
        const provider: EmailProvider = {
            name: 'resend',
            send: vi.fn(async () => {
                throw new EmailProviderRequestError('Too many requests', {
                    statusCode: 429,
                    retryAfterSeconds: 120,
                    provider: 'resend',
                });
            }),
        };
        const supabase = new FakeSupabase({
            email_settings: [{ ...baseSettings, provider: 'resend' }],
            email_outbox: [queuedOutbox()],
            email_logs: [logRow()],
            email_suppressions: [],
            email_campaigns: [],
        });

        const result = await processEmailOutbox({
            supabase: supabase as any,
            provider,
            now: '2026-06-25T12:00:00.000Z',
        });

        expect(result).toMatchObject({ processed: 1, sent: 0, deferred: 1, failed: 0 });
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            status: 'queued',
            skipped_reason: 'rate_limited',
            scheduled_at: '2026-06-25T12:02:00.000Z',
        });
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'queued',
            skipped_reason: 'rate_limited',
        });
    });
});
