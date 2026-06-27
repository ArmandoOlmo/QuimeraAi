import type {
    AssistantContextSnapshot,
    AssistantMemoryContextManifest,
    AssistantMemoryItem,
    AssistantModuleTarget,
    GlobalAssistantMemory,
    GlobalAssistantScope,
} from '../../types/globalAssistant';
import { canUseAdminMode, checkMemoryAccess } from './globalAssistantPermissionService';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

export interface CreateMemoryInput {
    tenantId?: string | null;
    userId?: string | null;
    projectId?: string | null;
    scope: GlobalAssistantScope;
    module?: AssistantModuleTarget | null;
    title: string;
    summary: string;
    data?: Record<string, unknown>;
    source: string;
    sourceEntityType: string;
    sourceEntityId: string;
    importance?: number;
    expiresAt?: string | null;
}

export interface MemoryQuery {
    context: AssistantContextSnapshot;
    scopes?: GlobalAssistantScope[];
    module?: AssistantModuleTarget;
    projectId?: string | null;
    sessionId?: string | null;
    taskId?: string | null;
    text?: string;
    includeExpired?: boolean;
    limit?: number;
}

export interface AssistantMemoryContextResult {
    memories: GlobalAssistantMemory[];
    manifest: AssistantMemoryContextManifest;
}

export interface GlobalAssistantMemoryAdapter {
    upsertMemory(memory: GlobalAssistantMemory): Promise<GlobalAssistantMemory>;
    listMemories(): Promise<GlobalAssistantMemory[]>;
    deleteMemory(memoryId: string): Promise<void>;
}

export class InMemoryGlobalAssistantMemoryAdapter implements GlobalAssistantMemoryAdapter {
    private readonly memories = new Map<string, GlobalAssistantMemory>();

    async upsertMemory(memory: GlobalAssistantMemory): Promise<GlobalAssistantMemory> {
        this.memories.set(memory.id, memory);
        return memory;
    }

    async listMemories(): Promise<GlobalAssistantMemory[]> {
        return Array.from(this.memories.values());
    }

    async deleteMemory(memoryId: string): Promise<void> {
        this.memories.delete(memoryId);
    }
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

const getContextTenantId = (context: AssistantContextSnapshot): string | null =>
    context.admin.targetTenantId
    ?? context.tenant.tenantId
    ?? context.actor.tenantId
    ?? context.project.tenantId
    ?? null;

const getContextProjectId = (context: AssistantContextSnapshot): string | null =>
    context.admin.targetProjectId ?? context.project.projectId ?? null;

const getContextUserId = (context: AssistantContextSnapshot): string | null =>
    context.admin.targetUserId ?? context.actor.userId ?? null;

const getSessionId = (query: MemoryQuery): string | null =>
    query.sessionId
    ?? query.context.conversationId
    ?? asText(query.context.snapshot?.sessionId)
    ?? null;

const getTaskId = (query: MemoryQuery): string | null =>
    query.taskId
    ?? asText(query.context.snapshot?.activeTaskId)
    ?? asText(query.context.snapshot?.taskId)
    ?? null;

const matchesScopedId = (memory: GlobalAssistantMemory, targetId: string | null, keys: string[]): boolean => {
    if (!targetId) return false;
    if (memory.sourceEntityId === targetId) return true;
    const data = asRecord(memory.data);
    return keys.some(key => data[key] === targetId);
};

const formatScope = (scope: GlobalAssistantScope, count: number): string =>
    `${scope}:${count}`;

export class GlobalAssistantMemoryService {
    constructor(private readonly adapter: GlobalAssistantMemoryAdapter = new InMemoryGlobalAssistantMemoryAdapter()) {}

    validateMemoryScope(input: CreateMemoryInput): string[] {
        const errors: string[] = [];
        if (!input.scope) errors.push('Memory scope is required.');
        if (!input.source || !input.sourceEntityType || !input.sourceEntityId) {
            errors.push('Memory source, sourceEntityType, and sourceEntityId are required.');
        }
        if ((input.scope === 'tenant' || input.scope === 'admin') && !input.tenantId) {
            errors.push(`${input.scope} memory requires tenantId.`);
        }
        if ((input.scope === 'project' || input.scope === 'module') && !input.projectId) {
            errors.push(`${input.scope} memory requires projectId.`);
        }
        if (input.scope === 'module' && !input.module) {
            errors.push('module memory requires module.');
        }
        if (input.scope === 'user' && !input.userId) {
            errors.push('user memory requires userId.');
        }
        if (input.scope === 'session' && !input.expiresAt) {
            errors.push('session memory requires expiresAt.');
        }
        if (input.scope === 'task' && !input.sourceEntityId) {
            errors.push('task memory requires sourceEntityId task id.');
        }
        const importance = input.importance ?? 0.5;
        if (importance < 0 || importance > 1) {
            errors.push('importance must be between 0 and 1.');
        }
        return errors;
    }

    async createMemory(input: CreateMemoryInput): Promise<GlobalAssistantMemory> {
        const errors = this.validateMemoryScope(input);
        if (errors.length > 0) {
            throw new Error(errors.join(' '));
        }

        const timestamp = nowIso();
        const memory: GlobalAssistantMemory = {
            id: createId('asst_mem'),
            tenantId: input.tenantId ?? null,
            userId: input.userId ?? null,
            projectId: input.projectId ?? null,
            scope: input.scope,
            module: input.module ?? null,
            title: input.title,
            summary: input.summary,
            data: input.data || {},
            source: input.source,
            sourceEntityType: input.sourceEntityType,
            sourceEntityId: input.sourceEntityId,
            importance: input.importance ?? 0.5,
            expiresAt: input.expiresAt ?? null,
            items: [],
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        return this.adapter.upsertMemory(memory);
    }

    async addMemoryItem(memoryId: string, item: Omit<AssistantMemoryItem, 'id' | 'memoryId' | 'createdAt' | 'updatedAt'>): Promise<AssistantMemoryItem> {
        const memories = await this.adapter.listMemories();
        const memory = memories.find(entry => entry.id === memoryId);
        if (!memory) throw new Error(`Memory not found: ${memoryId}`);

        const timestamp = nowIso();
        const nextItem: AssistantMemoryItem = {
            ...item,
            id: createId('asst_mem_item'),
            memoryId,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const updated: GlobalAssistantMemory = {
            ...memory,
            items: [...(memory.items || []), nextItem],
            updatedAt: timestamp,
        };
        await this.adapter.upsertMemory(updated);
        return nextItem;
    }

    async queryRelevantMemory(query: MemoryQuery): Promise<GlobalAssistantMemory[]> {
        const memories = await this.adapter.listMemories();
        const now = Date.now();
        const searchText = query.text?.toLowerCase().trim();
        const searchTokens = searchText
            ? searchText.split(/\s+/).filter(token => token.length > 2)
            : [];

        return memories
            .filter(memory => {
                if (!query.includeExpired && memory.expiresAt && new Date(memory.expiresAt).getTime() < now) return false;
                if (query.scopes && !query.scopes.includes(memory.scope)) return false;
                if (query.module && memory.module !== query.module) return false;
                if (query.projectId !== undefined && memory.projectId !== query.projectId) return false;
                if (!this.matchesOperationalBoundary(memory, query)) return false;

                const access = checkMemoryAccess({
                    item: memory,
                    context: query.context,
                });
                if (!access.allowed) return false;

                const activeModule = query.module || query.context.activeModule || null;
                if (memory.scope === 'module' && activeModule && memory.module !== activeModule) return false;

                if (memory.scope === 'session') {
                    const sessionId = getSessionId(query);
                    if (!matchesScopedId(memory, sessionId, ['conversationId', 'sessionId'])) return false;
                }

                if (memory.scope === 'task') {
                    const taskId = getTaskId(query);
                    if (!matchesScopedId(memory, taskId, ['taskId', 'activeTaskId'])) return false;
                }

                if (!searchText) return true;
                const haystack = `${memory.title} ${memory.summary} ${JSON.stringify(memory.data)}`.toLowerCase();
                return haystack.includes(searchText) || searchTokens.some(token => haystack.includes(token));
            })
            .sort((a, b) => b.importance - a.importance || b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, query.limit || 20);
    }

    async resolveMemoryContext(query: MemoryQuery): Promise<AssistantMemoryContextResult> {
        const memories = await this.queryRelevantMemory(query);
        return {
            memories,
            manifest: this.buildMemoryContextManifest(query, memories),
        };
    }

    buildMemoryContextManifest(query: MemoryQuery, memories: GlobalAssistantMemory[]): AssistantMemoryContextManifest {
        const context = query.context;
        const scopeCounts: Partial<Record<GlobalAssistantScope, number>> = {};
        const moduleCounts: Partial<Record<AssistantModuleTarget, number>> = {};
        const segments = new Map<string, AssistantMemoryContextManifest['segments'][number]>();

        for (const memory of memories) {
            scopeCounts[memory.scope] = (scopeCounts[memory.scope] || 0) + 1;
            if (memory.module) {
                moduleCounts[memory.module] = (moduleCounts[memory.module] || 0) + 1;
            }

            const key = `${memory.scope}:${memory.module || 'global'}`;
            const existing = segments.get(key);
            const nextSource = `${memory.source}:${memory.sourceEntityType}`;
            if (existing) {
                existing.count += 1;
                existing.memoryIds.push(memory.id);
                existing.titles.push(memory.title);
                if (!existing.sources.includes(nextSource)) existing.sources.push(nextSource);
                existing.highestImportance = Math.max(existing.highestImportance, memory.importance);
            } else {
                segments.set(key, {
                    scope: memory.scope,
                    module: memory.module ?? null,
                    count: 1,
                    memoryIds: [memory.id],
                    titles: [memory.title],
                    sources: [nextSource],
                    highestImportance: memory.importance,
                });
            }
        }

        const activeModule = query.module || context.activeModule || null;
        const tenantId = getContextTenantId(context);
        const projectId = getContextProjectId(context);
        const userId = getContextUserId(context);
        const adminMemoryVisible = canUseAdminMode(context);
        const scopeSummary = Object.entries(scopeCounts)
            .map(([scope, count]) => formatScope(scope as GlobalAssistantScope, count || 0))
            .join(', ');
        const explanation = [
            `Loaded ${memories.length} memory item${memories.length === 1 ? '' : 's'} for user ${userId || 'none'}, tenant ${tenantId || 'none'}, project ${projectId || 'none'}.`,
            scopeSummary ? `Scopes used: ${scopeSummary}.` : 'No prior memory matched this request and context.',
            activeModule
                ? `Module memory was limited to ${activeModule}.`
                : 'No active module-specific memory filter was applied.',
            adminMemoryVisible
                ? 'Admin memory is visible only for the active or targeted tenant in Owner/Super Admin mode.'
                : 'Admin memory is hidden in user mode.',
        ];

        return {
            userId,
            tenantId,
            projectId,
            mode: context.actor.mode,
            activeModule,
            activeRoute: context.activeRoute ?? null,
            currentSurface: context.currentSurface ?? null,
            activeServices: context.tenant.activeServices || [],
            sessionId: getSessionId(query),
            taskId: getTaskId(query),
            totalCount: memories.length,
            memoryIds: memories.map(memory => memory.id),
            scopeCounts,
            moduleCounts,
            segments: Array.from(segments.values())
                .sort((a, b) => b.highestImportance - a.highestImportance || a.scope.localeCompare(b.scope)),
            explanation,
            guardrails: {
                tenantIsolation: tenantId
                    ? `Only memories for tenant ${tenantId} or permitted global/system scopes are eligible.`
                    : 'Tenant-scoped memories require an active or targeted tenant.',
                projectIsolation: projectId
                    ? `Project/module memories require project ${projectId}.`
                    : 'Project/module memories are hidden until a project is active or targeted.',
                adminMemoryVisible,
                adminMemoryReason: adminMemoryVisible
                    ? 'Actor can use Owner/Super Admin memory gates.'
                    : 'Actor is in user mode or lacks admin privileges.',
            },
            createdAt: nowIso(),
        };
    }

    async deleteMemory(memoryId: string, context: AssistantContextSnapshot): Promise<boolean> {
        const memories = await this.adapter.listMemories();
        const memory = memories.find(entry => entry.id === memoryId);
        if (!memory) return false;

        const access = checkMemoryAccess({ item: memory, context });
        if (!access.allowed) {
            throw new Error(access.reasons.join(' '));
        }
        await this.adapter.deleteMemory(memoryId);
        return true;
    }

    private matchesOperationalBoundary(memory: GlobalAssistantMemory, query: MemoryQuery): boolean {
        const context = query.context;
        const tenantId = getContextTenantId(context);
        const projectId = query.projectId ?? getContextProjectId(context);
        const userId = getContextUserId(context);
        const adminAllowed = canUseAdminMode(context);

        if (memory.scope === 'user') {
            return Boolean(memory.userId && userId && memory.userId === userId);
        }

        if (memory.scope === 'tenant') {
            return Boolean(memory.tenantId && tenantId && memory.tenantId === tenantId);
        }

        if (memory.scope === 'project' || memory.scope === 'module') {
            if (!memory.projectId || !projectId || memory.projectId !== projectId) return false;
            if (memory.scope === 'module') {
                const activeModule = query.module || context.activeModule || null;
                if (!memory.module || !activeModule || memory.module !== activeModule) return false;
            }
            return true;
        }

        if (memory.scope === 'session') {
            if (memory.userId && (!userId || memory.userId !== userId)) return false;
            if (memory.tenantId && (!tenantId || memory.tenantId !== tenantId)) return false;
            return Boolean(getSessionId(query));
        }

        if (memory.scope === 'task') {
            if (memory.tenantId && (!tenantId || memory.tenantId !== tenantId)) return false;
            if (memory.projectId && (!projectId || memory.projectId !== projectId)) return false;
            return Boolean(getTaskId(query));
        }

        if (memory.scope === 'admin') {
            return Boolean(adminAllowed && memory.tenantId && tenantId && memory.tenantId === tenantId);
        }

        if (memory.scope === 'system') {
            if (!adminAllowed && context.actor.mode !== 'system') return false;
            return !memory.tenantId || Boolean(tenantId && memory.tenantId === tenantId);
        }

        return false;
    }
}
