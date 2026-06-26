import { describe, expect, it } from 'vitest';
import { getEmailAnalytics } from '../../services/email/emailAnalyticsService.ts';

type TableData = Record<string, any[]>;

class FakeQuery {
    private filters: Array<{ column: string; value: any; op: 'eq' | 'gte' }> = [];
    private limitCount = 500;
    private orderColumn = 'created_at';
    private ascending = false;

    constructor(private readonly table: string, private readonly db: FakeSupabase) {}

    select(_columns?: string) {
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value, op: 'eq' });
        return this;
    }

    gte(column: string, value: any) {
        this.filters.push({ column, value, op: 'gte' });
        return this;
    }

    order(column: string, options: { ascending?: boolean } = {}) {
        this.orderColumn = column;
        this.ascending = options.ascending === true;
        return this;
    }

    limit(value: number) {
        this.limitCount = value;
        return this;
    }

    then(resolve: (value: { data: any[]; error: null }) => void, reject?: (reason: unknown) => void) {
        const rows = (this.db.tables[this.table] || [])
            .filter(row => this.matches(row))
            .sort((a, b) => {
                const left = new Date(a[this.orderColumn] || 0).getTime();
                const right = new Date(b[this.orderColumn] || 0).getTime();
                return this.ascending ? left - right : right - left;
            })
            .slice(0, this.limitCount);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    }

    private matches(row: Record<string, any>) {
        return this.filters.every(filter => {
            if (filter.op === 'eq') return row[filter.column] === filter.value;
            return new Date(row[filter.column] || 0).getTime() >= new Date(filter.value || 0).getTime();
        });
    }
}

class FakeSupabase {
    constructor(readonly tables: TableData) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

describe('emailAnalyticsService', () => {
    it('aggregates journeys, automation steps, revenue, and recipient timelines', async () => {
        const supabase = new FakeSupabase({
            email_logs: [
                {
                    id: 'log-1',
                    project_id: 'project-1',
                    status: 'clicked',
                    recipient_email: 'Ada@Example.com',
                    subject: 'VIP path',
                    source_module: 'ecommerce',
                    automation_id: 'auto-1',
                    automation_step_id: 'e-vip',
                    open_count: 1,
                    click_count: 1,
                    metadata: {
                        automationId: 'auto-1',
                        automationStepId: 'e-vip',
                        journeyPath: ['c1', 'e-vip'],
                        accumulatedDelayMinutes: 30,
                        payload: { order: { total: 125 } },
                    },
                    created_at: '2026-06-25T12:00:00.000Z',
                },
                {
                    id: 'log-2',
                    project_id: 'project-1',
                    status: 'skipped',
                    recipient_email: 'sam@example.com',
                    subject: 'Regular path',
                    source_module: 'ecommerce',
                    automation_id: 'auto-1',
                    automation_step_id: 'e-regular',
                    metadata: {
                        automationId: 'auto-1',
                        automationStepId: 'e-regular',
                        journeyPath: ['c1', 'e-regular'],
                        accumulatedDelayMinutes: 0,
                    },
                    created_at: '2026-06-25T11:00:00.000Z',
                },
            ],
            email_outbox: [{
                id: 'outbox-1',
                project_id: 'project-1',
                status: 'sent',
                scheduled_at: '2026-06-25T12:00:00.000Z',
                created_at: '2026-06-25T12:00:00.000Z',
            }],
            email_events: [{
                id: 'event-1',
                project_id: 'project-1',
                email_log_id: 'log-1',
                event_type: 'email.clicked',
                received_at: '2026-06-25T12:05:00.000Z',
            }],
        });

        const analytics = await getEmailAnalytics({
            supabase: supabase as any,
            projectId: 'project-1',
            since: '2026-06-25T00:00:00.000Z',
        });

        expect(analytics.revenue).toMatchObject({
            total: 125,
            orders: 1,
            bySourceModule: [{ sourceModule: 'ecommerce', revenue: 125, orders: 1 }],
            byAutomation: [{ automationId: 'auto-1', revenue: 125, orders: 1 }],
        });
        expect(analytics.journeys[0]).toMatchObject({
            automationId: 'auto-1',
            total: 2,
            clicked: 1,
            revenue: 125,
            paths: ['c1 > e-vip', 'c1 > e-regular'],
        });
        expect(analytics.automationSteps[0]).toMatchObject({
            automationId: 'auto-1',
            stepId: 'e-vip',
            clicked: 1,
            revenue: 125,
            averageDelayMinutes: 30,
        });
        expect(analytics.recipientTimelines[0]).toMatchObject({
            recipientEmail: 'ada@example.com',
            total: 2,
        });
    });
});
