import type {
    AssistantConversation,
    AssistantContextSnapshot,
    AssistantMessage,
    AssistantMessageRole,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import { SupabaseGlobalAssistantConversationRepository } from './globalAssistantSupabaseStore';

export interface GlobalAssistantConversationAdapter {
    upsertConversation(conversation: AssistantConversation): Promise<AssistantConversation>;
    recordMessage(message: AssistantMessage): Promise<AssistantMessage>;
    listMessages(conversationId: string): Promise<AssistantMessage[]>;
    recordContextSnapshot?(context: AssistantContextSnapshot): Promise<void> | void;
}

export interface CreateAssistantConversationInput {
    userId?: string | null;
    tenantId?: string | null;
    projectId?: string | null;
    mode: GlobalAssistantMode;
    title?: string | null;
    activeTaskId?: string | null;
    metadata?: Record<string, unknown>;
}

export interface RecordAssistantMessageInput {
    conversationId: string;
    role: AssistantMessageRole;
    text: string;
    contextSnapshotId?: string | null;
    memoryIds?: string[];
    actionIds?: string[];
    metadata?: Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export class InMemoryGlobalAssistantConversationAdapter implements GlobalAssistantConversationAdapter {
    private readonly conversations = new Map<string, AssistantConversation>();
    private readonly messages = new Map<string, AssistantMessage[]>();
    private readonly contextSnapshots = new Map<string, AssistantContextSnapshot>();

    async upsertConversation(conversation: AssistantConversation): Promise<AssistantConversation> {
        const nextConversation = { ...conversation };
        this.conversations.set(nextConversation.id, nextConversation);
        return nextConversation;
    }

    async recordMessage(message: AssistantMessage): Promise<AssistantMessage> {
        const nextMessage = {
            ...message,
            memoryIds: [...(message.memoryIds || [])],
            actionIds: [...(message.actionIds || [])],
            metadata: { ...(message.metadata || {}) },
        };
        const currentMessages = this.messages.get(nextMessage.conversationId) || [];
        this.messages.set(nextMessage.conversationId, [...currentMessages, nextMessage]);
        return nextMessage;
    }

    async listMessages(conversationId: string): Promise<AssistantMessage[]> {
        return [...(this.messages.get(conversationId) || [])].sort((left, right) =>
            left.createdAt.localeCompare(right.createdAt),
        );
    }

    async recordContextSnapshot(context: AssistantContextSnapshot): Promise<void> {
        this.contextSnapshots.set(context.id, {
            ...context,
            snapshot: { ...(context.snapshot || {}) },
        });
    }

    listContextSnapshots(): AssistantContextSnapshot[] {
        return Array.from(this.contextSnapshots.values()).sort((left, right) =>
            left.createdAt.localeCompare(right.createdAt),
        );
    }
}

export class GlobalAssistantConversationService {
    constructor(private readonly adapter: GlobalAssistantConversationAdapter = new InMemoryGlobalAssistantConversationAdapter()) {}

    async createConversation(input: CreateAssistantConversationInput): Promise<AssistantConversation> {
        const timestamp = nowIso();
        return this.adapter.upsertConversation({
            id: createId('asst_conversation'),
            userId: input.userId ?? null,
            tenantId: input.tenantId ?? null,
            projectId: input.projectId ?? null,
            mode: input.mode,
            title: input.title ?? null,
            activeTaskId: input.activeTaskId ?? null,
            metadata: { ...(input.metadata || {}) },
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    }

    async recordMessage(input: RecordAssistantMessageInput): Promise<AssistantMessage> {
        return this.adapter.recordMessage({
            id: createId('asst_msg'),
            conversationId: input.conversationId,
            role: input.role,
            text: input.text,
            contextSnapshotId: input.contextSnapshotId ?? null,
            memoryIds: [...(input.memoryIds || [])],
            actionIds: [...(input.actionIds || [])],
            metadata: { ...(input.metadata || {}) },
            createdAt: nowIso(),
        });
    }

    async upsertConversation(conversation: AssistantConversation): Promise<AssistantConversation> {
        return this.adapter.upsertConversation({
            ...conversation,
            metadata: { ...(conversation.metadata || {}) },
            updatedAt: nowIso(),
        });
    }

    async recordContextSnapshot(context: AssistantContextSnapshot): Promise<void> {
        await this.adapter.recordContextSnapshot?.({
            ...context,
            snapshot: { ...(context.snapshot || {}) },
        });
    }

    async listMessages(conversationId: string): Promise<AssistantMessage[]> {
        return this.adapter.listMessages(conversationId);
    }
}

export const globalAssistantConversationService = new GlobalAssistantConversationService(
    new SupabaseGlobalAssistantConversationRepository(undefined, { failOpen: true }),
);
