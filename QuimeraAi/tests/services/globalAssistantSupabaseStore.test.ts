import { describe, expect, it } from 'vitest';
import {
    SupabaseGlobalAssistantAuditRepository,
    SupabaseGlobalAssistantConversationRepository,
    SupabaseGlobalAssistantMemoryAdapter,
    SupabaseGlobalAssistantRuntimePersistence,
    SupabaseGlobalAssistantTaskRepository,
    fromAssistantConversationRow,
    fromAssistantMemoryRow,
    fromAssistantMessageRow,
    fromAssistantActionRowRollbackSnapshot,
    toAssistantActionRow,
    toAssistantConversationRow,
    toAssistantContextSnapshotRow,
    toAssistantMemoryRow,
    toAssistantMessageRow,
    toAssistantRuntimeEventRow,
    toAssistantTaskRow,
} from '../../services/globalAssistant/globalAssistantSupabaseStore.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import type {
    AssistantAction,
    AssistantConversation,
    AssistantMessage,
    AssistantRollbackSnapshot,
    AssistantRuntimeEvent,
    AssistantTask,
    GlobalAssistantMemory,
} from '../../types/globalAssistant.ts';

type TableData = Record<string, any[]>;
type QueryOperation = {
    table: string;
    type: 'insert' | 'upsert' | 'update' | 'delete';
};

class FakeQuery {
    private selected = false;
    private singleMode: 'single' | 'maybeSingle' | null = null;
    private filters: Array<{ op: 'eq' | 'in'; column: string; value: any }> = [];
    private pendingInsert: any[] | null = null;
    private pendingUpsert: any[] | null = null;
    private pendingUpdate: any | null = null;
    private deleteMode = false;
    private orderColumn: string | null = null;
    private ascending = true;

    constructor(private readonly table: string, private readonly db: FakeSupabase) {}

    select(_columns = '*') {
        this.selected = true;
        return this;
    }

    upsert(value: any) {
        this.pendingUpsert = Array.isArray(value) ? value : [value];
        this.db.operations.push({ table: this.table, type: 'upsert' });
        return this;
    }

    insert(value: any) {
        this.pendingInsert = Array.isArray(value) ? value : [value];
        this.db.operations.push({ table: this.table, type: 'insert' });
        return this;
    }

    update(value: any) {
        this.pendingUpdate = value;
        this.db.operations.push({ table: this.table, type: 'update' });
        return this;
    }

    delete() {
        this.deleteMode = true;
        this.db.operations.push({ table: this.table, type: 'delete' });
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ op: 'eq', column, value });
        return this;
    }

    in(column: string, value: any[]) {
        this.filters.push({ op: 'in', column, value });
        return this;
    }

    order(column: string, options: { ascending?: boolean } = {}) {
        this.orderColumn = column;
        this.ascending = options.ascending !== false;
        return this;
    }

    single() {
        this.singleMode = 'single';
        return this;
    }

    maybeSingle() {
        this.singleMode = 'maybeSingle';
        return this;
    }

    then(resolve: (value: { data: any; error: null }) => void, reject?: (reason: unknown) => void) {
        return Promise.resolve(this.execute()).then(resolve, reject);
    }

    private execute() {
        const tableRows = this.db.tables[this.table] ||= [];

        if (this.pendingUpsert) {
            for (const row of this.pendingUpsert) {
                const index = tableRows.findIndex(current => current.id === row.id || (row.user_id && current.user_id === row.user_id && !row.id));
                if (index >= 0) tableRows[index] = { ...tableRows[index], ...row };
                else tableRows.push({ ...row });
            }
        }

        if (this.pendingInsert) {
            for (const row of this.pendingInsert) {
                tableRows.push({ id: row.id || `${this.table}-${tableRows.length + 1}`, created_at: row.created_at || '2026-06-26T12:00:00.000Z', ...row });
            }
        }

        if (this.pendingUpdate) {
            const updated: any[] = [];
            for (let index = 0; index < tableRows.length; index += 1) {
                const row = tableRows[index];
                if (!this.matches(row)) continue;
                tableRows[index] = { ...row, ...this.pendingUpdate };
                updated.push(tableRows[index]);
            }
            if (this.singleMode) return { data: updated[0] || null, error: null };
            return { data: this.selected ? updated : null, error: null };
        }

        if (this.deleteMode) {
            const remaining = tableRows.filter(row => !this.matches(row));
            this.db.tables[this.table] = remaining;
            return { data: null, error: null };
        }

        let rows = tableRows.filter(row => this.matches(row));
        if (this.orderColumn) {
            rows = rows.sort((a, b) => {
                const left = String(a[this.orderColumn!] || '');
                const right = String(b[this.orderColumn!] || '');
                return this.ascending ? left.localeCompare(right) : right.localeCompare(left);
            });
        }

        if (this.singleMode) {
            return { data: rows[0] || null, error: null };
        }
        return { data: this.selected || this.pendingUpsert || this.pendingInsert ? rows : null, error: null };
    }

    private matches(row: Record<string, any>) {
        return this.filters.every(filter => {
            if (filter.op === 'eq') return row[filter.column] === filter.value;
            return filter.value.includes(row[filter.column]);
        });
    }
}

class FakeSupabase {
    readonly operations: QueryOperation[] = [];

    constructor(readonly tables: TableData = {}) {}

    from(table: string) {
        return new FakeQuery(table, this);
    }
}

const memory: GlobalAssistantMemory = {
    id: 'asst_mem_1',
    tenantId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    scope: 'project',
    module: 'website',
    title: 'Hero locked',
    summary: 'The hero headline is user modified.',
    data: { path: 'home.hero.headline', userModified: true },
    source: 'website-builder',
    sourceEntityType: 'section',
    sourceEntityId: 'hero',
    importance: 0.9,
    expiresAt: null,
    items: [],
    createdAt: '2026-06-26T12:00:00.000Z',
    updatedAt: '2026-06-26T12:00:00.000Z',
};

const task: AssistantTask = {
    id: 'asst_task_1',
    userId: memory.userId,
    tenantId: memory.tenantId,
    projectId: memory.projectId,
    module: 'emailMarketing',
    intent: 'create',
    status: 'waiting_for_confirmation',
    request: 'Crea una campana',
    plan: null,
    errors: [],
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
};

const action: AssistantAction = {
    id: 'asst_action_1',
    taskId: task.id,
    userId: memory.userId,
    tenantId: memory.tenantId,
    projectId: memory.projectId,
    mode: 'user',
    module: 'emailMarketing',
    actionType: 'create_email_campaign',
    target: { projectId: memory.projectId },
    input: { request: task.request },
    requiresConfirmation: true,
    status: 'planned',
    metadata: { safetyLevel: 'high' },
    createdAt: memory.createdAt,
};

const rollbackSnapshot: AssistantRollbackSnapshot = {
    id: 'asst_rollback_1',
    actionId: action.id,
    beforeSnapshot: { table: 'email_campaigns', id: 'campaign-1', existed: false },
    afterSnapshot: { table: 'email_campaigns', id: 'campaign-1', status: 'draft' },
    rollbackActionType: 'create_email_campaign:rollback',
    createdAt: '2026-06-26T12:00:05.000Z',
};

const conversation: AssistantConversation = {
    id: 'asst_conversation_1',
    userId: memory.userId,
    tenantId: memory.tenantId,
    projectId: memory.projectId,
    mode: 'owner',
    title: 'Draft email campaign',
    activeTaskId: task.id,
    metadata: { source: 'command_palette' },
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
};

const message: AssistantMessage = {
    id: 'asst_msg_1',
    conversationId: conversation.id,
    role: 'assistant',
    text: 'I prepared a review-gated draft.',
    contextSnapshotId: 'asst_context_1',
    memoryIds: [memory.id],
    actionIds: [action.id],
    metadata: { source: 'operating_layer_plan' },
    createdAt: '2026-06-26T12:00:02.000Z',
};

describe('globalAssistantSupabaseStore', () => {
    it('maps Global Assistant memory to Supabase snake_case rows and back', () => {
        const row = toAssistantMemoryRow(memory);

        expect(row).toMatchObject({
            id: 'asst_mem_1',
            tenant_id: memory.tenantId,
            project_id: memory.projectId,
            source_entity_type: 'section',
        });
        expect(fromAssistantMemoryRow(row)).toMatchObject({
            id: memory.id,
            tenantId: memory.tenantId,
            projectId: memory.projectId,
            sourceEntityType: 'section',
        });
    });

    it('persists memories through the Supabase adapter contract', async () => {
        const fake = new FakeSupabase();
        const adapter = new SupabaseGlobalAssistantMemoryAdapter(fake as any);

        await adapter.upsertMemory(memory);
        const list = await adapter.listMemories();

        expect(fake.tables.assistant_memories).toHaveLength(1);
        expect(list[0]).toMatchObject({
            id: memory.id,
            title: 'Hero locked',
            scope: 'project',
        });

        await adapter.deleteMemory(memory.id);
        expect(fake.tables.assistant_memories).toHaveLength(0);
    });

    it('maps and persists assistant conversations and messages', async () => {
        const fake = new FakeSupabase();
        const repository = new SupabaseGlobalAssistantConversationRepository(fake as any);

        expect(toAssistantConversationRow(conversation)).toMatchObject({
            id: conversation.id,
            tenant_id: conversation.tenantId,
            active_task_id: task.id,
            metadata: { source: 'command_palette' },
        });
        expect(fromAssistantConversationRow(toAssistantConversationRow(conversation))).toMatchObject({
            id: conversation.id,
            mode: 'owner',
            activeTaskId: task.id,
        });
        expect(toAssistantMessageRow(message)).toMatchObject({
            id: message.id,
            conversation_id: conversation.id,
            memory_ids: [memory.id],
            action_ids: [action.id],
        });
        expect(fromAssistantMessageRow(toAssistantMessageRow(message))).toMatchObject({
            id: message.id,
            conversationId: conversation.id,
            contextSnapshotId: 'asst_context_1',
        });

        await repository.upsertConversation(conversation);
        await repository.recordMessage({
            ...message,
            id: 'asst_msg_2',
            text: 'Second message.',
            createdAt: '2026-06-26T12:00:03.000Z',
        });
        await repository.recordMessage(message);

        const messages = await repository.listMessages(conversation.id);

        expect(fake.tables.assistant_conversations[0]).toMatchObject({ id: conversation.id, mode: 'owner' });
        expect(messages.map(entry => entry.id)).toEqual(['asst_msg_1', 'asst_msg_2']);
    });

    it('maps tasks, action logs, and runtime events to GA2 tables', async () => {
        const fake = new FakeSupabase();
        const tasks = new SupabaseGlobalAssistantTaskRepository(fake as any);
        const audit = new SupabaseGlobalAssistantAuditRepository(fake as any);
        const runtimeEvent: Omit<AssistantRuntimeEvent, 'id' | 'createdAt'> = {
            type: 'assistant_request_started',
            userId: memory.userId,
            tenantId: memory.tenantId,
            projectId: memory.projectId,
            taskId: task.id,
            metadata: { request: task.request },
        };

        expect(toAssistantTaskRow(task)).toMatchObject({ project_id: memory.projectId, draft_changes: null });
        expect(toAssistantActionRow(action)).toMatchObject({ action_type: 'create_email_campaign', requires_confirmation: true });
        expect(toAssistantRuntimeEventRow(runtimeEvent)).toMatchObject({ type: 'assistant_request_started', task_id: task.id });

        await tasks.upsertTask(task);
        await audit.recordAction(action);
        await audit.recordRollbackSnapshot(rollbackSnapshot);
        await audit.recordEvent(runtimeEvent);

        expect(await tasks.getTask(task.id)).toMatchObject({ id: task.id, status: 'waiting_for_confirmation' });
        expect(await audit.listActionLogs({ projectId: memory.projectId })).toHaveLength(1);
        expect(fromAssistantActionRowRollbackSnapshot(fake.tables.assistant_actions[0])).toMatchObject({
            actionId: action.id,
            beforeSnapshot: rollbackSnapshot.beforeSnapshot,
            rollbackActionType: 'create_email_campaign:rollback',
        });
        expect(await audit.getRollbackSnapshot(action.id)).toMatchObject({
            id: rollbackSnapshot.id,
            afterSnapshot: rollbackSnapshot.afterSnapshot,
        });
        expect(await audit.listEvents({ taskId: task.id })).toHaveLength(1);
    });

    it('persists runtime snapshots, tasks, action logs, and events through one adapter', async () => {
        const fake = new FakeSupabase();
        const persistence = new SupabaseGlobalAssistantRuntimePersistence(fake as any);
        const context = resolveCurrentAssistantContext({
            conversationId: conversation.id,
            userId: memory.userId,
            tenantId: memory.tenantId,
            role: 'owner',
            activeProject: {
                id: memory.projectId!,
                name: 'Casa Luna',
                status: 'Draft',
                tenantId: memory.tenantId!,
                userId: memory.userId!,
            },
            activeRoute: '/dashboard/email',
            currentSurface: 'dashboard',
            snapshot: { entrySource: 'dashboard_welcome' },
        });
        const runtimeEvent: AssistantRuntimeEvent = {
            id: 'asst_evt_1',
            type: 'assistant_request_started',
            userId: memory.userId,
            tenantId: memory.tenantId,
            projectId: memory.projectId,
            taskId: task.id,
            metadata: { request: task.request },
            createdAt: '2026-06-26T12:00:01.000Z',
        };

        await persistence.recordContextSnapshot!(context);
        await persistence.upsertTask!(task);
        await persistence.recordAction!(action as any);
        await persistence.recordRollbackSnapshot!(rollbackSnapshot);
        await persistence.recordEvent!(runtimeEvent);

        expect(fake.tables.assistant_context_snapshots[0]).toMatchObject({
            ...toAssistantContextSnapshotRow(context),
            conversation_id: conversation.id,
        });
        expect(fake.operations.filter(operation => operation.table === 'assistant_context_snapshots')).toEqual([
            { table: 'assistant_context_snapshots', type: 'insert' },
        ]);
        expect(fake.tables.assistant_tasks[0]).toMatchObject({ id: task.id, project_id: task.projectId });
        expect(fake.tables.assistant_actions[0]).toMatchObject({ id: action.id, action_type: action.actionType });
        await expect(persistence.getRollbackSnapshot!(action.id)).resolves.toMatchObject({
            id: rollbackSnapshot.id,
            beforeSnapshot: rollbackSnapshot.beforeSnapshot,
        });
        expect(fake.tables.assistant_runtime_events[0]).toMatchObject({
            id: runtimeEvent.id,
            type: runtimeEvent.type,
            created_at: runtimeEvent.createdAt,
        });
    });
});
