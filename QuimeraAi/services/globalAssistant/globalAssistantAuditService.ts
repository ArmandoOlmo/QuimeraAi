import type {
    AssistantAction,
    AssistantActionLog,
    AssistantRuntimeEvent,
} from '../../types/globalAssistant';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

export class GlobalAssistantAuditService {
    private readonly actionLogs: AssistantActionLog[] = [];
    private readonly events: AssistantRuntimeEvent[] = [];

    recordAction(action: AssistantAction, metadata: Partial<AssistantActionLog> = {}): AssistantActionLog {
        const log: AssistantActionLog = {
            ...action,
            ...metadata,
            metadata: {
                ...(action.metadata || {}),
                ...(metadata.metadata || {}),
            },
        };
        this.actionLogs.push(log);
        return log;
    }

    recordEvent(event: Omit<AssistantRuntimeEvent, 'id' | 'createdAt'>): AssistantRuntimeEvent {
        const nextEvent: AssistantRuntimeEvent = {
            ...event,
            id: createId('asst_evt'),
            createdAt: nowIso(),
        };
        this.events.push(nextEvent);
        return nextEvent;
    }

    listActionLogs(filters: {
        userId?: string | null;
        tenantId?: string | null;
        projectId?: string | null;
        module?: string;
        status?: string;
    } = {}): AssistantActionLog[] {
        return this.actionLogs.filter(log => {
            if (filters.userId !== undefined && log.userId !== filters.userId) return false;
            if (filters.tenantId !== undefined && log.tenantId !== filters.tenantId) return false;
            if (filters.projectId !== undefined && log.projectId !== filters.projectId) return false;
            if (filters.module && log.module !== filters.module) return false;
            if (filters.status && log.status !== filters.status) return false;
            return true;
        });
    }

    listEvents(): AssistantRuntimeEvent[] {
        return [...this.events];
    }
}

export const globalAssistantAuditService = new GlobalAssistantAuditService();
