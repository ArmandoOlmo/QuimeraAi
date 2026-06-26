import type {
    AssistantContextSnapshot,
    AssistantMemoryItem,
    AssistantModuleTarget,
    GlobalAssistantMemory,
    GlobalAssistantScope,
} from '../../types/globalAssistant';
import { checkMemoryAccess } from './globalAssistantPermissionService';

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
    text?: string;
    includeExpired?: boolean;
    limit?: number;
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

        return memories
            .filter(memory => {
                if (!query.includeExpired && memory.expiresAt && new Date(memory.expiresAt).getTime() < now) return false;
                if (query.scopes && !query.scopes.includes(memory.scope)) return false;
                if (query.module && memory.module !== query.module) return false;
                if (query.projectId !== undefined && memory.projectId !== query.projectId) return false;

                const access = checkMemoryAccess({
                    item: memory,
                    context: query.context,
                });
                if (!access.allowed) return false;

                if (!searchText) return true;
                const haystack = `${memory.title} ${memory.summary} ${JSON.stringify(memory.data)}`.toLowerCase();
                return haystack.includes(searchText);
            })
            .sort((a, b) => b.importance - a.importance || b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, query.limit || 20);
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
}
