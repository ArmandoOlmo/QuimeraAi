import { describe, expect, it } from 'vitest';
import { ingestEmailEvent } from '../../services/email/emailEventService.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' = 'select';
    private insertRows: Record<string, any>[] = [];
    private updateRow: Record<string, any> = {};
    private filters: Array<{ column: string; value: any }> = [];
    private limitCount: number | null = null;

    constructor(
        private readonly table: string,
        private readonly db: FakeSupabase,
    ) {}

    select(_columns?: string) {
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

    eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
    }

    limit(value: number) {
        this.limitCount = value;
        return this;
    }

    maybeSingle() {
        return Promise.resolve(this.executeSingle());
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        const table = this.ensureTable();
        if (this.operation === 'insert') {
            const inserted = this.insertRows.map(row => this.withDefaults(row));
            table.push(...inserted);
            return { data: inserted, error: null };
        }

        if (this.operation === 'update') {
            const updated: Record<string, any>[] = [];
            table.forEach((row, index) => {
                if (!this.matches(row)) return;
                table[index] = { ...row, ...this.updateRow };
                updated.push(table[index]);
            });
            return { data: updated, error: null };
        }

        const rows = table.filter(row => this.matches(row));
        return { data: this.limitCount ? rows.slice(0, this.limitCount) : rows, error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private matches(row: Record<string, any>) {
        return this.filters.every(filter => row[filter.column] === filter.value);
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

const campaignId = '00000000-0000-4000-8000-000000000001';
const automationId = '00000000-0000-4000-8000-000000000002';

function logRow(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id || 'log-1',
        project_id: 'project-1',
        tenant_id: 'tenant-1',
        campaign_id: campaignId,
        automation_id: automationId,
        recipient_email: 'Ada@Example.com',
        provider_message_id: 'msg-1',
        status: 'sent',
        open_count: 0,
        click_count: 0,
        clicked_links: [],
        ...overrides,
    };
}

describe('emailEventService', () => {
    it('deduplicates provider events while updating logs and attribution stats once', async () => {
        const supabase = new FakeSupabase({
            email_logs: [logRow()],
            email_events: [],
            email_campaigns: [{ id: campaignId, stats: { sent: 1 } }],
            email_automations: [{ id: automationId, stats: { sent: 1 } }],
            email_suppressions: [],
        });

        const first = await ingestEmailEvent({
            supabase: supabase as any,
            provider: 'resend',
            providerEventId: 'evt-open-1',
            providerMessageId: 'msg-1',
            eventType: 'email.opened',
            payload: { userAgent: 'Vitest' },
            receivedAt: '2026-06-25T13:00:00.000Z',
        });
        const duplicate = await ingestEmailEvent({
            supabase: supabase as any,
            provider: 'resend',
            providerEventId: 'evt-open-1',
            providerMessageId: 'msg-1',
            eventType: 'opened',
            receivedAt: '2026-06-25T13:01:00.000Z',
        });

        expect(first.duplicate).toBe(false);
        expect(duplicate).toMatchObject({ duplicate: true, eventId: 'email_events-1' });
        expect(supabase.tables.email_events).toHaveLength(1);
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'opened',
            open_count: 1,
            opened_at: ['2026-06-25T13:00:00.000Z'],
        });
        expect(supabase.tables.email_campaigns[0].stats).toMatchObject({
            sent: 1,
            opened: 1,
            totalOpens: 1,
            uniqueOpens: 1,
        });
        expect(supabase.tables.email_automations[0].stats).toMatchObject({
            sent: 1,
            opened: 1,
        });
    });

    it('records click telemetry and keeps unique click counts based on the log history', async () => {
        const supabase = new FakeSupabase({
            email_logs: [logRow({ click_count: 1, clicked_links: [{ url: 'https://old.example.com', at: '2026-06-25T12:00:00.000Z' }] })],
            email_events: [],
            email_campaigns: [{ id: campaignId, stats: { clicked: 1, totalClicks: 1, uniqueClicks: 1 } }],
            email_automations: [{ id: automationId, stats: { clicked: 1 } }],
            email_suppressions: [],
        });

        await ingestEmailEvent({
            supabase: supabase as any,
            providerEventId: 'evt-click-1',
            providerMessageId: 'msg-1',
            eventType: 'clicked',
            payload: { url: 'https://example.com/pricing' },
            receivedAt: '2026-06-25T14:00:00.000Z',
        });

        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'clicked',
            click_count: 2,
            clicked_at: '2026-06-25T14:00:00.000Z',
        });
        expect(supabase.tables.email_logs[0].clicked_links).toEqual([
            { url: 'https://old.example.com', at: '2026-06-25T12:00:00.000Z' },
            { url: 'https://example.com/pricing', at: '2026-06-25T14:00:00.000Z' },
        ]);
        expect(supabase.tables.email_campaigns[0].stats).toMatchObject({
            clicked: 2,
            totalClicks: 2,
            uniqueClicks: 1,
        });
        expect(supabase.tables.email_automations[0].stats.clicked).toBe(1);
    });

    it('turns hard bounces into suppressions and campaign bounce stats', async () => {
        const supabase = new FakeSupabase({
            email_logs: [logRow()],
            email_events: [],
            email_campaigns: [{ id: campaignId, stats: {} }],
            email_automations: [{ id: automationId, stats: {} }],
            email_suppressions: [],
        });

        await ingestEmailEvent({
            supabase: supabase as any,
            provider: 'sendgrid',
            providerEventId: 'evt-bounce-1',
            providerMessageId: 'msg-1',
            eventType: 'bounced',
            payload: { bounce_type: 'hard', reason: 'Mailbox does not exist' },
            receivedAt: '2026-06-25T15:00:00.000Z',
        });

        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'bounced',
            bounced_at: '2026-06-25T15:00:00.000Z',
            bounce_type: 'hard',
            bounce_message: 'Mailbox does not exist',
        });
        expect(supabase.tables.email_campaigns[0].stats.bounced).toBe(1);
        expect(supabase.tables.email_suppressions[0]).toMatchObject({
            project_id: 'project-1',
            email: 'ada@example.com',
            reason: 'hard_bounce',
            source: 'sendgrid-webhook',
            campaign_id: campaignId,
            email_log_id: 'log-1',
            suppression_scope: 'marketing',
            active: true,
        });
    });
});
