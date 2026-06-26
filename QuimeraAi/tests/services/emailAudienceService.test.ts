import { describe, expect, it } from 'vitest';
import {
    addAudienceMembers,
    createAudience,
    removeAudienceMembers,
    updateAudience,
} from '../../services/email/emailAudienceService.ts';
import { resolveCampaignRecipients } from '../../services/email/emailAudienceResolver.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private insertRows: Record<string, any>[] = [];
    private updateRow: Record<string, any> = {};
    private filters: Array<{ column: string; value: any }> = [];
    private inFilters: Array<{ column: string; values: Set<string> }> = [];
    private orFilters: Array<Array<{ column: string; value: string }>> = [];

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

    delete() {
        this.operation = 'delete';
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
    }

    in(column: string, values: any[]) {
        this.inFilters.push({ column, values: new Set(values.map((value) => String(value))) });
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

    order(_column: string, _options?: Record<string, unknown>) {
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
            const rows: Record<string, any>[] = [];
            table.forEach((row, index) => {
                if (this.matchesFilters(row)) {
                    table[index] = { ...row, ...this.updateRow };
                    rows.push(table[index]);
                }
            });
            return { data: rows, error: null };
        }

        if (this.operation === 'delete') {
            const deleted: Record<string, any>[] = [];
            this.db.tables[this.table] = table.filter(row => {
                if (this.matchesFilters(row)) {
                    deleted.push(row);
                    return false;
                }
                return true;
            });
            return { data: deleted, error: null };
        }

        return { data: table.filter(row => this.matchesFilters(row)), error: null };
    }

    private executeSingle() {
        const result = this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    private matchesFilters(row: Record<string, any>) {
        const scalarMatches = this.filters.every(filter => row[filter.column] === filter.value);
        const inMatches = this.inFilters.every(filter => filter.values.has(String(row[filter.column])));
        const orMatches = this.orFilters.every(group => (
            group.length === 0 || group.some(filter => row[filter.column] === filter.value)
        ));
        return scalarMatches && inMatches && orMatches;
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

describe('emailAudienceService', () => {
    it('creates project-scoped audiences without trusting client project fields', async () => {
        const supabase = new FakeSupabase({ email_audiences: [] });

        const audience = await createAudience({
            supabase: supabase as any,
            projectId: 'project-1',
            userId: 'user-1',
            audience: {
                project_id: 'other-project',
                store_id: 'other-project',
                name: 'Newsletter',
                staticMembers: { emails: ['Lead@Example.com'] },
                sourceModule: 'ai-studio',
                generatedByAI: true,
            },
        });

        expect(audience).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            user_id: 'user-1',
            name: 'Newsletter',
            source_module: 'ai-studio',
            generated_by_ai: true,
            needs_review: true,
            static_member_count: 1,
        });
    });

    it('adds audience members idempotently and normalizes emails', async () => {
        const supabase = new FakeSupabase({
            email_audiences: [{
                id: 'aud-1',
                project_id: 'project-1',
                store_id: 'project-1',
                name: 'Leads',
                static_members: { emails: ['lead@example.com'], members: [{ email: 'lead@example.com', source: 'manual' }] },
                static_member_count: 1,
            }],
        });

        const audience = await addAudienceMembers({
            supabase: supabase as any,
            projectId: 'project-1',
            audienceId: 'aud-1',
            members: [
                { email: 'LEAD@example.com', name: 'Existing Lead', source: 'csv' },
                { email: 'new@example.com', name: 'New Lead', source: 'crm', leadId: 'lead-2' },
            ],
        });

        expect(audience.static_member_count).toBe(2);
        expect(audience.static_members.emails).toEqual(['lead@example.com', 'new@example.com']);
        expect(audience.static_members.members[0]).toMatchObject({ email: 'lead@example.com', name: 'Existing Lead', source: 'csv' });
        expect(audience.static_members.members[1]).toMatchObject({ email: 'new@example.com', source: 'crm', leadId: 'lead-2' });
    });

    it('stores id-only lead and customer audience members', async () => {
        const supabase = new FakeSupabase({
            email_audiences: [{
                id: 'aud-1',
                project_id: 'project-1',
                store_id: 'project-1',
                name: 'Static IDs',
                static_members: { emails: [], members: [] },
                static_member_count: 0,
            }],
        });

        const audience = await addAudienceMembers({
            supabase: supabase as any,
            projectId: 'project-1',
            audienceId: 'aud-1',
            members: [
                { leadId: 'lead-1', source: 'crm' },
                { customerId: 'customer-1', source: 'ecommerce' },
            ],
        });

        expect(audience.static_member_count).toBe(2);
        expect(audience.static_members.emails).toEqual([]);
        expect(audience.static_members.leadIds).toEqual(['lead-1']);
        expect(audience.static_members.customerIds).toEqual(['customer-1']);

        const updated = await removeAudienceMembers({
            supabase: supabase as any,
            projectId: 'project-1',
            audienceId: 'aud-1',
            leadIds: ['lead-1'],
        });

        expect(updated.static_member_count).toBe(1);
        expect(updated.static_members.leadIds).toEqual([]);
        expect(updated.static_members.customerIds).toEqual(['customer-1']);
    });

    it('resolves id-only audience members through project scoped consented contacts', async () => {
        const supabase = new FakeSupabase({
            email_audiences: [{
                id: 'aud-1',
                project_id: 'project-1',
                store_id: 'project-1',
                name: 'Resolved IDs',
                accepts_marketing: true,
                static_members: {
                    members: [
                        { leadId: 'lead-1', source: 'crm' },
                        { leadId: 'lead-no-consent', source: 'crm' },
                        { customerId: 'customer-1', source: 'ecommerce' },
                        { customerId: 'customer-no-consent', source: 'ecommerce' },
                    ],
                },
            }],
            leads: [
                {
                    id: 'lead-1',
                    project_id: 'project-1',
                    email: 'lead@example.com',
                    name: 'Lead One',
                    source: 'newsletter',
                    custom_data: { marketingConsent: true },
                },
                {
                    id: 'lead-no-consent',
                    project_id: 'project-1',
                    email: 'blocked-lead@example.com',
                    name: 'Lead Blocked',
                    source: 'manual',
                    custom_data: {},
                },
                {
                    id: 'lead-1',
                    project_id: 'project-2',
                    email: 'wrong-project@example.com',
                    name: 'Wrong Project',
                    source: 'newsletter',
                    custom_data: { marketingConsent: true },
                },
            ],
            store_users: [
                {
                    id: 'customer-1',
                    project_id: 'project-1',
                    email: 'customer@example.com',
                    display_name: 'Customer One',
                    accepts_marketing: true,
                },
                {
                    id: 'customer-no-consent',
                    project_id: 'project-1',
                    email: 'blocked-customer@example.com',
                    display_name: 'Customer Blocked',
                    accepts_marketing: false,
                },
            ],
            email_suppressions: [],
        });

        const result = await resolveCampaignRecipients({
            supabase: supabase as any,
            projectId: 'project-1',
            campaign: { audience_id: 'aud-1' },
        });

        expect(result.recipients.map((recipient) => recipient.email).sort()).toEqual([
            'customer@example.com',
            'lead@example.com',
        ]);
        expect(result.counts.final).toBe(2);
    });

    it('removes audience members by email and preserves project scoping', async () => {
        const supabase = new FakeSupabase({
            email_audiences: [
                {
                    id: 'aud-1',
                    project_id: 'project-1',
                    store_id: 'project-1',
                    static_members: {
                        emails: ['one@example.com', 'two@example.com'],
                        members: [
                            { email: 'one@example.com', source: 'manual' },
                            { email: 'two@example.com', source: 'manual' },
                        ],
                    },
                    static_member_count: 2,
                },
                {
                    id: 'aud-1',
                    project_id: 'project-2',
                    store_id: 'project-2',
                    static_members: { emails: ['other@example.com'], members: [{ email: 'other@example.com' }] },
                    static_member_count: 1,
                },
            ],
        });

        const audience = await removeAudienceMembers({
            supabase: supabase as any,
            projectId: 'project-1',
            audienceId: 'aud-1',
            emails: ['one@example.com'],
        });

        expect(audience.static_member_count).toBe(1);
        expect(audience.static_members.emails).toEqual(['two@example.com']);
        expect(supabase.tables.email_audiences[1].static_members.emails).toEqual(['other@example.com']);
    });

    it('updates only allowlisted audience columns', async () => {
        const supabase = new FakeSupabase({
            email_audiences: [{
                id: 'aud-1',
                project_id: 'project-1',
                store_id: 'project-1',
                name: 'Original',
                static_member_count: 0,
            }],
        });

        const audience = await updateAudience({
            supabase: supabase as any,
            projectId: 'project-1',
            audienceId: 'aud-1',
            updates: {
                name: 'Updated',
                project_id: 'other-project',
                service_role_only: true,
            },
        });

        expect(audience.name).toBe('Updated');
        expect(audience.project_id).toBe('project-1');
        expect(audience.service_role_only).toBeUndefined();
    });
});
