import { describe, expect, it } from 'vitest';
import { queueCrossModuleTransactionalEmail } from '../../services/email/emailCrossModuleDispatcher.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'upsert' | 'update' = 'select';
    private insertRows: Record<string, any>[] = [];
    private updateRow: Record<string, any> = {};
    private filters: Array<{ column: string; value: any }> = [];
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

    upsert(row: Record<string, any> | Record<string, any>[], options: { onConflict?: string } = {}) {
        this.operation = 'upsert';
        this.insertRows = Array.isArray(row) ? row : [row];
        this.upsertConflict = String(options.onConflict || '')
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);
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

        if (this.operation === 'update') {
            const table = this.ensureTable();
            const rows: Record<string, any>[] = [];
            table.forEach((row, index) => {
                if (this.matchesFilters(row)) {
                    table[index] = { ...row, ...this.updateRow };
                    rows.push(table[index]);
                }
            });
            return { data: rows, error: null };
        }

        return { data: this.resolveRows(), error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private resolveRows() {
        const rows = (this.db.tables[this.table] || []).filter(row => this.matchesFilters(row));
        return this.limitCount ? rows.slice(0, this.limitCount) : rows;
    }

    private matchesFilters(row: Record<string, any>) {
        const scalarMatches = this.filters.every(filter => row[filter.column] === filter.value);
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
    return Object.entries(expected).every(([key, expectedValue]) => (value as Record<string, any>)[key] === expectedValue);
}

function settings(transactional: Record<string, unknown>) {
    return [{
        project_id: 'project-1',
        provider: 'resend',
        api_key_configured: true,
        from_email: 'hello@example.com',
        from_name: 'Quimera',
        transactional,
        compliance: { unsubscribeFooterEnabled: true, suppressionEnabled: true },
    }];
}

describe('emailCrossModuleDispatcher', () => {
    it('records skipped logs when a module has no explicit transactional opt-in', async () => {
        const supabase = new FakeSupabase({ email_settings: settings({}), email_logs: [] });

        const result = await queueCrossModuleTransactionalEmail({
            supabase: supabase as any,
            projectId: 'project-1',
            type: 'chat_lead_follow_up',
            recipientEmail: 'lead@example.com',
            subject: 'Follow up',
            html: '<p>Hello</p>',
            idempotencyKey: 'chatcore-no-opt-in',
            sourceModule: 'chatcore',
            sourceComponent: 'ChatCore',
            sourceEvent: 'chat_lead_follow_up',
        });

        expect(result.status).toBe('skipped');
        expect(result.reason).toContain('chatcore/chatLeadEmails');
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'skipped',
            skipped_reason: 'disabled',
            source_module: 'chatcore',
        });
        expect(supabase.tables.email_outbox || []).toHaveLength(0);
    });

    it('queues reviewed Realty emails only when the matching module opt-in is enabled', async () => {
        const supabase = new FakeSupabase({
            email_settings: settings({ realtyPropertyInquiry: true }),
            email_logs: [],
            email_outbox: [],
        });

        const result = await queueCrossModuleTransactionalEmail({
            supabase: supabase as any,
            projectId: 'project-1',
            type: 'new_property_inquiry',
            recipientEmail: 'buyer@example.com',
            recipientName: 'Buyer',
            subject: 'Property inquiry',
            html: '<p>Thanks for your inquiry</p>',
            idempotencyKey: 'realty-property-inquiry-1',
            sourceModule: 'realty',
            sourceComponent: 'RealtyLeadPipeline',
            sourceEvent: 'new_property_inquiry',
            sourceEntityType: 'property_lead',
            sourceEntityId: 'lead-1',
            metadata: { needsReview: false, sendMode: 'reviewed' },
        });

        expect(result.status).toBe('queued');
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'queued',
            source_module: 'realty',
            recipient_email: 'buyer@example.com',
        });
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            status: 'queued',
            source_module: 'realty',
            idempotency_key: 'realty-property-inquiry-1',
        });
    });

    it('resumes an existing needs-review skipped intent after explicit review', async () => {
        const supabase = new FakeSupabase({
            email_settings: settings({ chatLeadEmails: true }),
            email_logs: [],
            email_outbox: [],
        });

        const skipped = await queueCrossModuleTransactionalEmail({
            supabase: supabase as any,
            projectId: 'project-1',
            type: 'chat_lead_follow_up',
            recipientEmail: 'lead@example.com',
            subject: 'AI draft follow up',
            html: '<p>AI draft</p>',
            idempotencyKey: 'chatcore-review-1',
            sourceModule: 'chatcore',
            sourceComponent: 'ChatCore',
            sourceEvent: 'chat_lead_follow_up',
            metadata: { generatedByAI: true, needsReview: true, sendMode: 'draft_only' },
        });

        expect(skipped.status).toBe('skipped');
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'skipped',
            skipped_reason: 'needs_review',
        });

        const reviewed = await queueCrossModuleTransactionalEmail({
            supabase: supabase as any,
            projectId: 'project-1',
            type: 'chat_lead_follow_up',
            recipientEmail: 'lead@example.com',
            subject: 'Reviewed follow up',
            html: '<p>Reviewed content</p>',
            idempotencyKey: 'chatcore-review-1',
            sourceModule: 'chatcore',
            sourceComponent: 'ChatCore',
            sourceEvent: 'chat_lead_follow_up',
            metadata: { generatedByAI: false, needsReview: false, sendMode: 'reviewed' },
        });

        expect(reviewed.status).toBe('queued');
        expect(supabase.tables.email_logs[0]).toMatchObject({
            status: 'queued',
            skipped_reason: null,
            error_message: null,
            subject: 'Reviewed follow up',
        });
        expect(supabase.tables.email_outbox).toHaveLength(1);
        expect(supabase.tables.email_outbox[0]).toMatchObject({
            status: 'queued',
            idempotency_key: 'chatcore-review-1',
            subject: 'Reviewed follow up',
        });
    });
});
