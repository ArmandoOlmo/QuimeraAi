import { describe, expect, it } from 'vitest';
import { ingestAutomationEvent } from '../../services/email/emailAutomationRuntime.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    private insertRows: Record<string, any>[] = [];
    private updateRow: Record<string, any> | null = null;
    private filters: Array<{ column: string; value: any; op: 'eq' | 'in' }> = [];
    private containsFilters: Array<{ column: string; value: Record<string, any> }> = [];
    private orFilters: Array<Array<{ column: string; value: string }>> = [];
    private limitCount: number | null = null;
    private upsertConflict: string[] = [];

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

    upsert(row: Record<string, any> | Record<string, any>[], options: { onConflict?: string } = {}) {
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

    maybeSingle() {
        return Promise.resolve(this.executeSingle());
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
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

        const rows = this.resolveRows();
        return { data: rows, error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private resolveRows() {
        const rows = (this.db.tables[this.table] || []).filter(row => this.matches(row));
        return this.limitCount ? rows.slice(0, this.limitCount) : rows;
    }

    private matches(row: Record<string, any>) {
        const scalarMatches = this.filters.every(filter => (
            filter.op === 'eq'
                ? row[filter.column] === filter.value
                : filter.value.includes(row[filter.column])
        ));
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

const emailSettings = {
    project_id: 'project-1',
    provider: 'resend',
    api_key_configured: true,
    from_email: 'hello@example.com',
    from_name: 'Quimera',
    marketing: { enabled: true },
    compliance: { requireMarketingConsent: true, unsubscribeFooterEnabled: true, suppressionEnabled: true },
};

describe('emailAutomationRuntime', () => {
    it('queues reviewed automation email steps with deterministic scheduling', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_automations: [{
                id: 'auto-1',
                project_id: 'project-1',
                status: 'active',
                trigger_config: { event: 'customer.created' },
                source_event: 'customer.created',
                steps: [
                    { id: 't1', type: 'trigger', order: 0 },
                    { id: 'e1', type: 'email', order: 1, emailConfig: { subject: 'Welcome {{customer.name}}', html: '<p>Hello {{customer.name}}</p>' } },
                    { id: 'd1', type: 'delay', order: 2, delayConfig: { delayMinutes: 30 } },
                    { id: 'e2', type: 'email', order: 3, emailConfig: { subject: 'Next step', html: '<p>Next</p>' } },
                ],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        const result = await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'customer.created',
            idempotencyKey: 'evt-1',
            now: '2026-06-25T12:00:00.000Z',
            payload: {
                customer: { email: 'Ada@Example.com', name: 'Ada', acceptsMarketing: true },
            },
        });

        expect(result).toMatchObject({ accepted: 1, queued: 2, skipped: 0 });
        expect(supabase.tables.email_events).toHaveLength(1);
        expect(supabase.tables.email_logs).toHaveLength(2);
        expect(supabase.tables.email_outbox).toHaveLength(2);
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            recipient_email: 'ada@example.com',
            subject: 'Welcome Ada',
            scheduled_at: '2026-06-25T12:00:00.000Z',
            automation_id: 'auto-1',
        });
        expect(supabase.tables.email_outbox[1]).toMatchObject({
            subject: 'Next step',
            scheduled_at: '2026-06-25T12:30:00.000Z',
        });
        expect(supabase.tables.email_automations[0].stats).toMatchObject({ triggered: 1, queued: 2 });
    });

    it('records skipped logs when marketing consent is missing', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_automations: [{
                id: 'auto-2',
                project_id: 'project-1',
                status: 'active',
                trigger_config: { event: 'lead.created' },
                steps: [{ id: 'e1', type: 'email', order: 0, emailConfig: { subject: 'Follow up', html: '<p>Hi</p>' } }],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        const result = await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'lead.created',
            idempotencyKey: 'evt-2',
            now: '2026-06-25T12:00:00.000Z',
            payload: { lead: { email: 'lead@example.com' } },
        });

        expect(result).toMatchObject({ accepted: 1, queued: 0, skipped: 1 });
        expect(supabase.tables.email_outbox).toHaveLength(0);
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'skipped',
            skipped_reason: 'consent_required',
        });
    });

    it('does not dispatch email steps behind unevaluated conditions', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_automations: [{
                id: 'auto-3',
                project_id: 'project-1',
                status: 'active',
                trigger_config: { event: 'order.delivered' },
                steps: [
                    { id: 'c1', type: 'condition', order: 0, conditionConfig: { conditionType: 'email-opened' } },
                    { id: 'e1', type: 'email', order: 1, emailConfig: { subject: 'Review us', html: '<p>Review</p>' } },
                ],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        const result = await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'order.delivered',
            idempotencyKey: 'evt-3',
            now: '2026-06-25T12:00:00.000Z',
            payload: { customer: { email: 'buyer@example.com', acceptsMarketing: true } },
        });

        expect(result).toMatchObject({ accepted: 1, queued: 0, skipped: 1, skippedConditions: 1 });
        expect(supabase.tables.email_outbox).toHaveLength(0);
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'skipped',
            skipped_reason: 'policy_blocked',
        });
    });

    it('evaluates tag conditions and applies audience tag actions before queueing', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_audiences: [{
                id: 'aud-1',
                project_id: 'project-1',
                static_members: [],
            }],
            email_automations: [{
                id: 'auto-4',
                project_id: 'project-1',
                status: 'active',
                audience_id: 'aud-1',
                trigger_config: { event: 'lead.created' },
                steps: [
                    { id: 'c1', type: 'condition', order: 0, conditionConfig: { conditionType: 'has-tag', tag: 'vip' } },
                    { id: 'a1', type: 'action', order: 1, actionConfig: { actionType: 'add-tag', audienceId: 'aud-1', tag: 'nurture-ready' } },
                    { id: 'e1', type: 'email', order: 2, emailConfig: { subject: 'VIP follow up', html: '<p>Hi</p>' } },
                ],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        const result = await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'lead.created',
            idempotencyKey: 'evt-4',
            now: '2026-06-25T12:00:00.000Z',
            payload: { lead: { email: 'vip@example.com', acceptsMarketing: true, tags: ['vip'] } },
        });

        expect(result).toMatchObject({ accepted: 1, queued: 1, skipped: 0, skippedConditions: 0 });
        expect(supabase.tables.email_audiences[0].static_members[0]).toMatchObject({
            email: 'vip@example.com',
            tags: ['nurture-ready'],
        });
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            recipient_email: 'vip@example.com',
            subject: 'VIP follow up',
        });
    });

    it('routes multi-path condition branches without falling through to the other branch', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_automations: [{
                id: 'auto-5',
                project_id: 'project-1',
                status: 'active',
                trigger_config: { event: 'lead.segmented' },
                steps: [
                    { id: 'c1', type: 'condition', order: 0, conditionConfig: { conditionType: 'custom', path: 'lead.segment', value: 'vip' }, trueBranchStepId: 'e-vip', falseBranchStepId: 'e-regular' },
                    { id: 'e-vip', type: 'email', order: 1, nextStepId: 'end', emailConfig: { subject: 'VIP path', html: '<p>VIP</p>' } },
                    { id: 'e-regular', type: 'email', order: 2, nextStepId: 'end', emailConfig: { subject: 'Regular path', html: '<p>Regular</p>' } },
                ],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        const result = await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'lead.segmented',
            idempotencyKey: 'evt-5',
            now: '2026-06-25T12:00:00.000Z',
            payload: { lead: { email: 'vip@example.com', acceptsMarketing: true, segment: 'vip' } },
        });

        expect(result).toMatchObject({ accepted: 1, queued: 1, skipped: 0 });
        expect(supabase.tables.email_outbox).toHaveLength(1);
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            subject: 'VIP path',
            automation_step_id: 'e-vip',
        });
        expect(supabase.tables.email_outbox[0].metadata.branchDecisions[0]).toMatchObject({
            stepId: 'c1',
            passed: true,
            targetStepId: 'e-vip',
        });
    });

    it('supports wait-until delays using an absolute target timestamp', async () => {
        const supabase = new FakeSupabase({
            email_settings: [emailSettings],
            email_automations: [{
                id: 'auto-6',
                project_id: 'project-1',
                status: 'active',
                trigger_config: { event: 'customer.created' },
                steps: [
                    { id: 'd1', type: 'delay', order: 0, delayConfig: { delayType: 'wait-until', waitUntil: '2026-06-26T09:00:00.000Z' } },
                    { id: 'e1', type: 'email', order: 1, emailConfig: { subject: 'Timed path', html: '<p>Timed</p>' } },
                ],
                stats: {},
            }],
            email_events: [],
            email_logs: [],
            email_outbox: [],
            email_suppressions: [],
        });

        await ingestAutomationEvent({
            supabase: supabase as any,
            projectId: 'project-1',
            eventType: 'customer.created',
            idempotencyKey: 'evt-6',
            now: '2026-06-25T12:00:00.000Z',
            payload: { customer: { email: 'timed@example.com', acceptsMarketing: true } },
        });

        expect(supabase.tables.email_outbox).toHaveLength(1);
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            subject: 'Timed path',
            scheduled_at: '2026-06-26T09:00:00.000Z',
        });
        expect(supabase.tables.email_outbox[0].metadata.accumulatedDelayMinutes).toBe(1260);
    });
});
