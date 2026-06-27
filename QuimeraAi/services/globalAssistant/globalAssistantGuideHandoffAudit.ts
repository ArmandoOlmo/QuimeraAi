import type {
    AssistantContextSnapshot,
    AssistantModuleTarget,
    AssistantRuntimeEvent,
} from '../../types/globalAssistant';
import {
    globalAssistantAuditService,
    type GlobalAssistantAuditService,
} from './globalAssistantAuditService';
import {
    SupabaseGlobalAssistantRuntimePersistence,
} from './globalAssistantSupabaseStore';
import type { GlobalAssistantRuntimePersistence } from './globalAssistantRuntime';

interface GlobalAssistantGuideHandoffAuditInput {
    context: AssistantContextSnapshot;
    target: string;
    targetModule: AssistantModuleTarget | null;
    message: string;
    blocked?: boolean;
    projectId?: string | null;
    projectName?: string | null;
    route?: string | null;
    entrySource?: string | null;
    entryMetadata?: Record<string, unknown>;
    reason?: string | null;
}

interface GlobalAssistantGuideHandoffAuditDeps {
    auditService?: GlobalAssistantAuditService;
    persistence?: Pick<GlobalAssistantRuntimePersistence, 'recordEvent'>;
    onError?: (error: unknown) => void;
}

const persistence = new SupabaseGlobalAssistantRuntimePersistence(undefined, { failOpen: true });

const cleanRecord = (value: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));

export const buildGuideHandoffRuntimeEvent = (
    input: GlobalAssistantGuideHandoffAuditInput,
): Omit<AssistantRuntimeEvent, 'id' | 'createdAt'> => {
    const projectId = input.projectId ?? input.context.project.projectId ?? null;
    const blocked = input.blocked === true;

    return {
        type: blocked ? 'assistant_guide_handoff_blocked' : 'assistant_guide_handoff_opened',
        userId: input.context.actor.userId,
        tenantId: input.context.tenant.tenantId,
        projectId,
        taskId: null,
        metadata: cleanRecord({
            guideOnly: true,
            blocked,
            target: input.target,
            targetModule: input.targetModule,
            message: input.message,
            route: input.route ?? null,
            projectName: input.projectName ?? input.context.project.projectName ?? null,
            contextSnapshotId: input.context.id,
            conversationId: input.context.conversationId ?? null,
            activeRoute: input.context.activeRoute ?? null,
            activeModule: input.context.activeModule ?? null,
            surface: input.context.currentSurface ?? null,
            mode: input.context.actor.mode,
            entrySource: input.entrySource ?? null,
            entryMetadata: input.entryMetadata || {},
            reason: input.reason ?? (blocked ? 'handoff_blocked' : 'handoff_opened'),
        }),
    };
};

export const recordGuideHandoffAudit = (
    input: GlobalAssistantGuideHandoffAuditInput,
    deps: GlobalAssistantGuideHandoffAuditDeps = {},
): AssistantRuntimeEvent => {
    const audit = deps.auditService || globalAssistantAuditService;
    const nextEvent = audit.recordEvent(buildGuideHandoffRuntimeEvent(input));
    const targetPersistence = deps.persistence || persistence;

    void Promise.resolve(targetPersistence.recordEvent?.(nextEvent)).catch(error => {
        deps.onError?.(error);
        if (!deps.onError) {
            console.warn('[Global Assistant] Failed to persist guide handoff audit event:', error);
        }
    });

    return nextEvent;
};
