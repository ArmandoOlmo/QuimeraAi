import { supabase as defaultSupabase } from '../../supabase';
import type {
    AssistantAction,
    AssistantActionLog,
    AssistantConversation,
    AssistantContextSnapshot,
    AssistantMessage,
    AssistantRollbackSnapshot,
    AssistantRuntimeEvent,
    AssistantTask,
    GlobalAssistantMemory,
} from '../../types/globalAssistant';
import type { GlobalAssistantMemoryAdapter } from './globalAssistantMemoryService';
import type { GlobalAssistantRuntimePersistence } from './globalAssistantRuntime';

type SupabaseClientLike = {
    from: (table: string) => any;
};

type AnyRecord = Record<string, any>;

export interface SupabaseGlobalAssistantStoreOptions {
    failOpen?: boolean;
    onError?: (error: unknown, operation: string) => void;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];

const handleStoreError = (
    error: unknown,
    operation: string,
    options: SupabaseGlobalAssistantStoreOptions,
): void => {
    options.onError?.(error, operation);
    if (!options.failOpen) throw error;
    console.warn(`[GlobalAssistantSupabaseStore] ${operation} failed:`, error);
};

export function toAssistantMemoryRow(memory: GlobalAssistantMemory): AnyRecord {
    return {
        id: memory.id,
        tenant_id: memory.tenantId,
        user_id: memory.userId,
        project_id: memory.projectId,
        scope: memory.scope,
        module: memory.module,
        title: memory.title,
        summary: memory.summary,
        data: memory.data || {},
        importance: memory.importance,
        source: memory.source,
        source_entity_type: memory.sourceEntityType,
        source_entity_id: memory.sourceEntityId,
        expires_at: memory.expiresAt,
        created_at: memory.createdAt,
        updated_at: memory.updatedAt,
    };
}

export function fromAssistantMemoryRow(row: AnyRecord, items: AnyRecord[] = []): GlobalAssistantMemory {
    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        userId: row.user_id ?? null,
        projectId: row.project_id ?? null,
        scope: row.scope,
        module: row.module ?? null,
        title: row.title || '',
        summary: row.summary || '',
        data: asRecord(row.data),
        source: row.source || '',
        sourceEntityType: row.source_entity_type || '',
        sourceEntityId: row.source_entity_id || '',
        importance: Number(row.importance ?? 0.5),
        expiresAt: row.expires_at ?? null,
        items: items.map(fromAssistantMemoryItemRow),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toAssistantMemoryItemRow(item: NonNullable<GlobalAssistantMemory['items']>[number]): AnyRecord {
    return {
        id: item.id,
        memory_id: item.memoryId,
        tenant_id: item.tenantId,
        user_id: item.userId,
        project_id: item.projectId,
        scope: item.scope,
        module: item.module,
        title: item.title,
        summary: item.summary,
        data: item.data || {},
        embedding_id: item.embeddingId,
        importance: item.importance,
        source: item.source,
        source_entity_type: item.sourceEntityType,
        source_entity_id: item.sourceEntityId,
        expires_at: item.expiresAt,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
    };
}

export function fromAssistantMemoryItemRow(row: AnyRecord): NonNullable<GlobalAssistantMemory['items']>[number] {
    return {
        id: row.id,
        memoryId: row.memory_id ?? null,
        tenantId: row.tenant_id ?? null,
        userId: row.user_id ?? null,
        projectId: row.project_id ?? null,
        scope: row.scope,
        module: row.module ?? null,
        title: row.title || '',
        summary: row.summary || '',
        data: asRecord(row.data),
        embeddingId: row.embedding_id ?? null,
        importance: Number(row.importance ?? 0.5),
        source: row.source || '',
        sourceEntityType: row.source_entity_type || '',
        sourceEntityId: row.source_entity_id || '',
        expiresAt: row.expires_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toAssistantConversationRow(conversation: AssistantConversation): AnyRecord {
    return {
        id: conversation.id,
        user_id: conversation.userId,
        tenant_id: conversation.tenantId,
        project_id: conversation.projectId,
        mode: conversation.mode,
        title: conversation.title,
        active_task_id: conversation.activeTaskId,
        metadata: conversation.metadata || {},
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
    };
}

export function fromAssistantConversationRow(row: AnyRecord): AssistantConversation {
    return {
        id: row.id,
        userId: row.user_id ?? null,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id ?? null,
        mode: row.mode || 'user',
        title: row.title ?? null,
        activeTaskId: row.active_task_id ?? null,
        metadata: asRecord(row.metadata),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toAssistantMessageRow(message: AssistantMessage): AnyRecord {
    return {
        id: message.id,
        conversation_id: message.conversationId,
        role: message.role,
        text: message.text,
        context_snapshot_id: message.contextSnapshotId,
        memory_ids: message.memoryIds || [],
        action_ids: message.actionIds || [],
        metadata: message.metadata || {},
        created_at: message.createdAt,
    };
}

export function fromAssistantMessageRow(row: AnyRecord): AssistantMessage {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        text: row.text || '',
        contextSnapshotId: row.context_snapshot_id ?? null,
        memoryIds: Array.isArray(row.memory_ids) ? row.memory_ids : [],
        actionIds: Array.isArray(row.action_ids) ? row.action_ids : [],
        metadata: asRecord(row.metadata),
        createdAt: row.created_at,
    };
}

export function toAssistantTaskRow(task: AssistantTask): AnyRecord {
    return {
        id: task.id,
        user_id: task.userId,
        tenant_id: task.tenantId,
        project_id: task.projectId,
        module: task.module,
        intent: task.intent,
        status: task.status,
        request: task.request,
        plan: task.plan || null,
        draft_changes: task.draftChanges || null,
        result: task.result || null,
        errors: task.errors || [],
        created_at: task.createdAt,
        updated_at: task.updatedAt,
    };
}

export function fromAssistantTaskRow(row: AnyRecord): AssistantTask {
    return {
        id: row.id,
        userId: row.user_id ?? null,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id ?? null,
        module: row.module,
        intent: row.intent,
        status: row.status,
        request: row.request || '',
        plan: row.plan || null,
        draftChanges: row.draft_changes || null,
        result: row.result || null,
        errors: Array.isArray(row.errors) ? row.errors : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toAssistantActionRow(action: AssistantActionLog | AssistantAction): AnyRecord {
    return {
        id: action.id,
        task_id: action.taskId,
        user_id: action.userId,
        tenant_id: action.tenantId,
        project_id: action.projectId,
        mode: action.mode,
        module: action.module,
        action_type: action.actionType,
        target: action.target || {},
        input: action.input || {},
        before_snapshot: action.beforeSnapshot || null,
        after_snapshot: action.afterSnapshot || null,
        diff: action.diff || null,
        requires_confirmation: action.requiresConfirmation,
        confirmed_at: action.confirmedAt,
        status: action.status,
        metadata: action.metadata || {},
        model_used: 'modelUsed' in action ? action.modelUsed : null,
        tool_used: 'toolUsed' in action ? action.toolUsed : null,
        latency_ms: 'latencyMs' in action ? action.latencyMs : null,
        cost_usd: 'costUsd' in action ? action.costUsd : null,
        error: 'error' in action ? action.error : null,
        created_at: action.createdAt,
        updated_at: action.updatedAt,
    };
}

export function fromAssistantActionRow(row: AnyRecord): AssistantActionLog {
    return {
        id: row.id,
        taskId: row.task_id ?? null,
        userId: row.user_id ?? null,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id ?? null,
        mode: row.mode,
        module: row.module,
        actionType: row.action_type,
        target: asRecord(row.target),
        input: asRecord(row.input),
        beforeSnapshot: row.before_snapshot || null,
        afterSnapshot: row.after_snapshot || null,
        diff: row.diff || null,
        requiresConfirmation: row.requires_confirmation === true,
        confirmedAt: row.confirmed_at ?? null,
        status: row.status,
        metadata: asRecord(row.metadata),
        modelUsed: row.model_used ?? null,
        toolUsed: row.tool_used ?? null,
        latencyMs: row.latency_ms ?? null,
        costUsd: row.cost_usd ?? null,
        error: row.error ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function fromAssistantActionRowRollbackSnapshot(row: AnyRecord): AssistantRollbackSnapshot | null {
    if (!row || row.before_snapshot === null || row.before_snapshot === undefined) return null;
    const metadata = asRecord(row.metadata);
    const rollbackMetadata = asRecord(metadata.rollbackSnapshot);
    return {
        id: typeof rollbackMetadata.id === 'string' && rollbackMetadata.id
            ? rollbackMetadata.id
            : `asst_rollback_${row.id}`,
        actionId: row.id,
        beforeSnapshot: asRecord(row.before_snapshot),
        afterSnapshot: row.after_snapshot === null || row.after_snapshot === undefined
            ? undefined
            : asRecord(row.after_snapshot),
        rollbackActionType: typeof rollbackMetadata.rollbackActionType === 'string'
            ? rollbackMetadata.rollbackActionType
            : `${row.action_type}:rollback`,
        createdAt: typeof rollbackMetadata.createdAt === 'string' && rollbackMetadata.createdAt
            ? rollbackMetadata.createdAt
            : row.updated_at || row.created_at,
    };
}

export function toAssistantRuntimeEventRow(event: AssistantRuntimeEvent | Omit<AssistantRuntimeEvent, 'id' | 'createdAt'>): AnyRecord {
    return {
        ...('id' in event ? { id: event.id } : {}),
        type: event.type,
        user_id: event.userId,
        tenant_id: event.tenantId,
        project_id: event.projectId,
        task_id: event.taskId,
        action_id: event.actionId,
        metadata: event.metadata || {},
        ...('createdAt' in event ? { created_at: event.createdAt } : {}),
    };
}

export function fromAssistantRuntimeEventRow(row: AnyRecord): AssistantRuntimeEvent {
    return {
        id: row.id,
        type: row.type,
        userId: row.user_id ?? null,
        tenantId: row.tenant_id ?? null,
        projectId: row.project_id ?? null,
        taskId: row.task_id ?? null,
        actionId: row.action_id ?? null,
        metadata: asRecord(row.metadata),
        createdAt: row.created_at,
    };
}

export function toAssistantContextSnapshotRow(context: AssistantContextSnapshot): AnyRecord {
    return {
        id: context.id,
        conversation_id: context.conversationId,
        user_id: context.actor.userId,
        tenant_id: context.tenant.tenantId || context.actor.tenantId || context.project.tenantId,
        project_id: context.project.projectId,
        active_route: context.activeRoute,
        active_module: context.activeModule,
        active_entity_type: context.activeEntityType,
        active_entity_id: context.activeEntityId,
        current_surface: context.currentSurface,
        snapshot: context,
        created_at: context.createdAt,
    };
}

export class SupabaseGlobalAssistantMemoryAdapter implements GlobalAssistantMemoryAdapter {
    constructor(
        private readonly client: SupabaseClientLike = defaultSupabase,
        private readonly options: SupabaseGlobalAssistantStoreOptions = {},
    ) {}

    async upsertMemory(memory: GlobalAssistantMemory): Promise<GlobalAssistantMemory> {
        try {
            const { data, error } = await this.client
                .from('assistant_memories')
                .upsert(toAssistantMemoryRow(memory))
                .select('*')
                .single();
            if (error) throw error;

            const items = memory.items || [];
            if (items.length > 0) {
                const { error: itemError } = await this.client
                    .from('assistant_memory_items')
                    .upsert(items.map(toAssistantMemoryItemRow));
                if (itemError) throw itemError;
            }

            return fromAssistantMemoryRow(data, items.map(toAssistantMemoryItemRow));
        } catch (error) {
            handleStoreError(error, 'upsertMemory', this.options);
            return memory;
        }
    }

    async listMemories(): Promise<GlobalAssistantMemory[]> {
        try {
            const { data, error } = await this.client
                .from('assistant_memories')
                .select('*')
                .order('updated_at', { ascending: false });
            if (error) throw error;

            const rows = Array.isArray(data) ? data : [];
            const ids = rows.map(row => row.id).filter(Boolean);
            if (ids.length === 0) return [];

            const { data: itemData, error: itemError } = await this.client
                .from('assistant_memory_items')
                .select('*')
                .in('memory_id', ids)
                .order('updated_at', { ascending: false });
            if (itemError) throw itemError;

            const itemsByMemory = new Map<string, AnyRecord[]>();
            for (const item of Array.isArray(itemData) ? itemData : []) {
                const list = itemsByMemory.get(item.memory_id) || [];
                list.push(item);
                itemsByMemory.set(item.memory_id, list);
            }

            return rows.map(row => fromAssistantMemoryRow(row, itemsByMemory.get(row.id) || []));
        } catch (error) {
            handleStoreError(error, 'listMemories', this.options);
            return [];
        }
    }

    async deleteMemory(memoryId: string): Promise<void> {
        try {
            const { error } = await this.client
                .from('assistant_memories')
                .delete()
                .eq('id', memoryId);
            if (error) throw error;
        } catch (error) {
            handleStoreError(error, 'deleteMemory', this.options);
        }
    }
}

export class SupabaseGlobalAssistantTaskRepository {
    constructor(private readonly client: SupabaseClientLike = defaultSupabase) {}

    async upsertTask(task: AssistantTask): Promise<AssistantTask> {
        const { data, error } = await this.client
            .from('assistant_tasks')
            .upsert(toAssistantTaskRow(task))
            .select('*')
            .single();
        if (error) throw error;
        return fromAssistantTaskRow(data);
    }

    async getTask(taskId: string): Promise<AssistantTask | null> {
        const { data, error } = await this.client
            .from('assistant_tasks')
            .select('*')
            .eq('id', taskId)
            .maybeSingle();
        if (error) throw error;
        return data ? fromAssistantTaskRow(data) : null;
    }

    async listTasks(filters: { userId?: string | null; tenantId?: string | null; projectId?: string | null } = {}): Promise<AssistantTask[]> {
        let query = this.client.from('assistant_tasks').select('*').order('updated_at', { ascending: false });
        if (filters.userId !== undefined) query = query.eq('user_id', filters.userId);
        if (filters.tenantId !== undefined) query = query.eq('tenant_id', filters.tenantId);
        if (filters.projectId !== undefined) query = query.eq('project_id', filters.projectId);
        const { data, error } = await query;
        if (error) throw error;
        return asArray(data).map(fromAssistantTaskRow);
    }
}

export class SupabaseGlobalAssistantConversationRepository {
    private readonly contexts: SupabaseGlobalAssistantContextRepository;

    constructor(
        private readonly client: SupabaseClientLike = defaultSupabase,
        private readonly options: SupabaseGlobalAssistantStoreOptions = {},
    ) {
        this.contexts = new SupabaseGlobalAssistantContextRepository(client);
    }

    async upsertConversation(conversation: AssistantConversation): Promise<AssistantConversation> {
        try {
            const { data, error } = await this.client
                .from('assistant_conversations')
                .upsert(toAssistantConversationRow(conversation))
                .select('*')
                .single();
            if (error) throw error;
            return fromAssistantConversationRow(data);
        } catch (error) {
            handleStoreError(error, 'upsertConversation', this.options);
            return conversation;
        }
    }

    async recordMessage(message: AssistantMessage): Promise<AssistantMessage> {
        try {
            const { data, error } = await this.client
                .from('assistant_messages')
                .insert(toAssistantMessageRow(message))
                .select('*')
                .single();
            if (error) throw error;
            return fromAssistantMessageRow(data);
        } catch (error) {
            handleStoreError(error, 'recordMessage', this.options);
            return message;
        }
    }

    async listMessages(conversationId: string): Promise<AssistantMessage[]> {
        try {
            const { data, error } = await this.client
                .from('assistant_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return asArray(data).map(fromAssistantMessageRow);
        } catch (error) {
            handleStoreError(error, 'listMessages', this.options);
            return [];
        }
    }

    async recordContextSnapshot(context: AssistantContextSnapshot): Promise<void> {
        try {
            await this.contexts.recordContextSnapshot(context);
        } catch (error) {
            handleStoreError(error, 'recordContextSnapshot', this.options);
        }
    }
}

export class SupabaseGlobalAssistantAuditRepository {
    constructor(private readonly client: SupabaseClientLike = defaultSupabase) {}

    async recordAction(action: AssistantAction, metadata: Partial<AssistantActionLog> = {}): Promise<AssistantActionLog> {
        const log: AssistantActionLog = {
            ...action,
            ...metadata,
            metadata: {
                ...(action.metadata || {}),
                ...(metadata.metadata || {}),
            },
        };
        const { data, error } = await this.client
            .from('assistant_actions')
            .upsert(toAssistantActionRow(log))
            .select('*')
            .single();
        if (error) throw error;
        return fromAssistantActionRow(data);
    }

    async recordEvent(event: AssistantRuntimeEvent | Omit<AssistantRuntimeEvent, 'id' | 'createdAt'>): Promise<AssistantRuntimeEvent> {
        const { data, error } = await this.client
            .from('assistant_runtime_events')
            .insert(toAssistantRuntimeEventRow(event))
            .select('*')
            .single();
        if (error) throw error;
        return fromAssistantRuntimeEventRow(data);
    }

    async recordRollbackSnapshot(snapshot: AssistantRollbackSnapshot): Promise<AssistantRollbackSnapshot> {
        const { data: currentRow, error: readError } = await this.client
            .from('assistant_actions')
            .select('*')
            .eq('id', snapshot.actionId)
            .maybeSingle();
        if (readError) throw readError;
        if (!currentRow) throw new Error(`Assistant action not found for rollback snapshot: ${snapshot.actionId}`);

        const metadata = {
            ...asRecord(currentRow.metadata),
            rollbackSnapshot: {
                id: snapshot.id,
                rollbackActionType: snapshot.rollbackActionType,
                createdAt: snapshot.createdAt,
            },
        };
        const { data, error } = await this.client
            .from('assistant_actions')
            .update({
                before_snapshot: snapshot.beforeSnapshot,
                after_snapshot: snapshot.afterSnapshot || null,
                metadata,
            })
            .eq('id', snapshot.actionId)
            .select('*')
            .single();
        if (error) throw error;
        return fromAssistantActionRowRollbackSnapshot(data) || snapshot;
    }

    async getRollbackSnapshot(actionId: string): Promise<AssistantRollbackSnapshot | null> {
        const { data, error } = await this.client
            .from('assistant_actions')
            .select('*')
            .eq('id', actionId)
            .maybeSingle();
        if (error) throw error;
        return data ? fromAssistantActionRowRollbackSnapshot(data) : null;
    }

    async listActionLogs(filters: {
        userId?: string | null;
        tenantId?: string | null;
        projectId?: string | null;
        module?: string;
        status?: string;
    } = {}): Promise<AssistantActionLog[]> {
        let query = this.client.from('assistant_actions').select('*').order('created_at', { ascending: false });
        if (filters.userId !== undefined) query = query.eq('user_id', filters.userId);
        if (filters.tenantId !== undefined) query = query.eq('tenant_id', filters.tenantId);
        if (filters.projectId !== undefined) query = query.eq('project_id', filters.projectId);
        if (filters.module) query = query.eq('module', filters.module);
        if (filters.status) query = query.eq('status', filters.status);
        const { data, error } = await query;
        if (error) throw error;
        return asArray(data).map(fromAssistantActionRow);
    }

    async listEvents(filters: { userId?: string | null; tenantId?: string | null; projectId?: string | null; taskId?: string | null } = {}): Promise<AssistantRuntimeEvent[]> {
        let query = this.client.from('assistant_runtime_events').select('*').order('created_at', { ascending: false });
        if (filters.userId !== undefined) query = query.eq('user_id', filters.userId);
        if (filters.tenantId !== undefined) query = query.eq('tenant_id', filters.tenantId);
        if (filters.projectId !== undefined) query = query.eq('project_id', filters.projectId);
        if (filters.taskId !== undefined) query = query.eq('task_id', filters.taskId);
        const { data, error } = await query;
        if (error) throw error;
        return asArray(data).map(fromAssistantRuntimeEventRow);
    }
}

export class SupabaseGlobalAssistantContextRepository {
    constructor(private readonly client: SupabaseClientLike = defaultSupabase) {}

    async recordContextSnapshot(context: AssistantContextSnapshot): Promise<void> {
        const { error } = await this.client
            .from('assistant_context_snapshots')
            .insert(toAssistantContextSnapshotRow(context));
        if (error) throw error;
    }
}

export class SupabaseGlobalAssistantRuntimePersistence implements GlobalAssistantRuntimePersistence {
    private readonly tasks: SupabaseGlobalAssistantTaskRepository;
    private readonly audit: SupabaseGlobalAssistantAuditRepository;
    private readonly contexts: SupabaseGlobalAssistantContextRepository;

    constructor(
        client: SupabaseClientLike = defaultSupabase,
        private readonly options: SupabaseGlobalAssistantStoreOptions = {},
    ) {
        this.tasks = new SupabaseGlobalAssistantTaskRepository(client);
        this.audit = new SupabaseGlobalAssistantAuditRepository(client);
        this.contexts = new SupabaseGlobalAssistantContextRepository(client);
    }

    async recordContextSnapshot(context: AssistantContextSnapshot): Promise<void> {
        try {
            await this.contexts.recordContextSnapshot(context);
        } catch (error) {
            handleStoreError(error, 'recordContextSnapshot', this.options);
        }
    }

    async upsertTask(task: AssistantTask): Promise<void> {
        try {
            await this.tasks.upsertTask(task);
        } catch (error) {
            handleStoreError(error, 'upsertTask', this.options);
        }
    }

    async recordAction(action: AssistantActionLog): Promise<void> {
        try {
            await this.audit.recordAction(action);
        } catch (error) {
            handleStoreError(error, 'recordAction', this.options);
        }
    }

    async recordRollbackSnapshot(snapshot: AssistantRollbackSnapshot): Promise<void> {
        try {
            await this.audit.recordRollbackSnapshot(snapshot);
        } catch (error) {
            handleStoreError(error, 'recordRollbackSnapshot', this.options);
        }
    }

    async getRollbackSnapshot(actionId: string): Promise<AssistantRollbackSnapshot | null> {
        try {
            return await this.audit.getRollbackSnapshot(actionId);
        } catch (error) {
            handleStoreError(error, 'getRollbackSnapshot', this.options);
            return null;
        }
    }

    async recordEvent(event: AssistantRuntimeEvent): Promise<void> {
        try {
            await this.audit.recordEvent(event);
        } catch (error) {
            handleStoreError(error, 'recordEvent', this.options);
        }
    }
}
