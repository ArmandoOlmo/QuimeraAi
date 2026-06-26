import { describe, expect, it } from 'vitest';
import {
    attachDefaultGlobalAssistantActionHandlers,
    GLOBAL_ASSISTANT_ACTIONS,
    GlobalAssistantActionRegistry,
    GlobalAssistantAuditService,
    GlobalAssistantMemoryService,
    GlobalAssistantRuntime,
    GlobalAssistantTaskService,
    resolveCurrentAssistantContext,
} from '../../services/globalAssistant';

type Row = Record<string, any>;

class FakeSupabaseQuery {
    private operation: 'select' | 'insert' | 'delete' = 'select';
    private payload: Row[] = [];
    private filters: Array<(row: Row) => boolean> = [];

    constructor(
        private readonly table: string,
        private readonly rowsByTable: Record<string, Row[]>,
        private readonly nextId: (table: string) => string,
    ) {}

    insert(payload: Row | Row[]) {
        this.operation = 'insert';
        this.payload = Array.isArray(payload) ? payload : [payload];
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    select() {
        return this;
    }

    eq(field: string, value: unknown) {
        this.filters.push(row => row[field] === value);
        return this;
    }

    neq(field: string, value: unknown) {
        this.filters.push(row => row[field] !== value);
        return this;
    }

    in(field: string, values: unknown[]) {
        this.filters.push(row => values.includes(row[field]));
        return this;
    }

    lt(field: string, value: unknown) {
        this.filters.push(row => row[field] < value);
        return this;
    }

    gt(field: string, value: unknown) {
        this.filters.push(row => row[field] > value);
        return this;
    }

    limit() {
        return this;
    }

    or() {
        return this;
    }

    maybeSingle() {
        return Promise.resolve(this.execute(true));
    }

    single() {
        return Promise.resolve(this.execute(true));
    }

    then(resolve: (value: any) => void, reject: (reason: unknown) => void) {
        return Promise.resolve(this.execute(false)).then(resolve, reject);
    }

    private execute(single: boolean) {
        const rows = this.rowsByTable[this.table] || (this.rowsByTable[this.table] = []);

        if (this.operation === 'insert') {
            const inserted = this.payload.map(row => ({
                id: row.id || this.nextId(this.table),
                ...row,
            }));
            rows.push(...inserted);
            return { data: single ? inserted[0] : inserted, error: null };
        }

        if (this.operation === 'delete') {
            const keep = rows.filter(row => !this.filters.every(filter => filter(row)));
            this.rowsByTable[this.table] = keep;
            return { data: null, error: null };
        }

        const filtered = rows.filter(row => this.filters.every(filter => filter(row)));
        return { data: single ? filtered[0] || null : filtered, error: null };
    }
}

const createFakeSupabase = () => {
    const rowsByTable: Record<string, Row[]> = {};
    let counter = 0;

    return {
        rowsByTable,
        from(table: string) {
            return new FakeSupabaseQuery(table, rowsByTable, (prefix) => `${prefix}_${++counter}`);
        },
    };
};

const activeProject = {
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft' as const,
    tenantId: 'tenant-1',
    userId: 'user-1',
};

const buildRuntime = (activeServices: string[], featureFlags: string[]) => {
    const fakeSupabase = createFakeSupabase();
    const definitions = attachDefaultGlobalAssistantActionHandlers(GLOBAL_ASSISTANT_ACTIONS, {
        supabase: fakeSupabase,
        now: () => '2026-06-26T13:30:00.000Z',
        createId: prefix => `${prefix}_fixed`,
    });
    const registry = new GlobalAssistantActionRegistry(definitions);
    const memoryService = new GlobalAssistantMemoryService();
    const taskService = new GlobalAssistantTaskService();
    const auditService = new GlobalAssistantAuditService();
    const runtime = new GlobalAssistantRuntime(registry, memoryService, taskService, auditService);
    const context = resolveCurrentAssistantContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'owner',
        mode: 'owner',
        activeProject,
        activeServices,
        featureFlags,
    });

    return { fakeSupabase, runtime, context, auditService };
};

describe('Global Assistant default action handlers', () => {
    it('creates and rolls back a review-gated email campaign draft', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['emailMarketing'], ['emailMarketing']);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una campana de email para reservas VIP',
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_email_campaign']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const campaigns = fakeSupabase.rowsByTable.email_campaigns;

        expect(applied.task.status).toBe('completed');
        expect(campaigns).toHaveLength(1);
        expect(campaigns[0]).toMatchObject({
            project_id: 'project-1',
            status: 'draft',
            generated_by_ai: true,
            needs_review: true,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.email_campaigns).toHaveLength(0);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('creates an ecommerce product draft with assistant review metadata', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea un producto llamado Cafe Premium con precio 12',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_product']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const products = fakeSupabase.rowsByTable.store_products;

        expect(applied.task.status).toBe('completed');
        expect(products).toHaveLength(1);
        expect(products[0].data).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            status: 'draft',
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
        });
        expect(products[0].data.metadata.globalAssistant.actionType).toBe('create_product');
    });

    it('blocks appointment plans until required schedule fields are structured', async () => {
        const { runtime, context } = buildRuntime(['appointments'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una cita para hablar con el cliente',
            enabledServices: ['appointments'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_appointment']);
        expect(planned.task.status).toBe('failed');
        expect(planned.plan.status).toBe('blocked');
        expect(planned.plan.blockers.join(' ')).toContain('create_appointment: appointment.startDate is required before apply.');
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                table: 'project_appointments',
                status: 'draft',
                needsReview: true,
            },
            diff: {
                created: ['project_appointments.$pending'],
                reviewRequired: true,
            },
        });
    });
});
