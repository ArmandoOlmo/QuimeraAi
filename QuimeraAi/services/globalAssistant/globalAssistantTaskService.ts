import type {
    AssistantExecutionPlan,
    AssistantIntent,
    AssistantTask,
    AssistantTaskStatus,
} from '../../types/globalAssistant';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

export class GlobalAssistantTaskService {
    private readonly tasks = new Map<string, AssistantTask>();

    createTask(input: {
        userId: string | null;
        tenantId: string | null;
        projectId: string | null;
        request: string;
        intent: AssistantIntent;
        plan?: AssistantExecutionPlan | null;
    }): AssistantTask {
        const timestamp = nowIso();
        const task: AssistantTask = {
            id: createId('asst_task'),
            userId: input.userId,
            tenantId: input.tenantId,
            projectId: input.projectId,
            module: input.intent.module,
            intent: input.intent.intent,
            status: input.plan?.status === 'blocked'
                ? 'failed'
                : input.plan?.requiresConfirmation
                    ? 'waiting_for_confirmation'
                    : 'planning',
            request: input.request,
            plan: input.plan || null,
            errors: input.plan?.blockers || [],
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        this.tasks.set(task.id, task);
        return task;
    }

    updateTask(taskId: string, updates: Partial<Omit<AssistantTask, 'id' | 'createdAt'>>): AssistantTask {
        const current = this.tasks.get(taskId);
        if (!current) throw new Error(`Assistant task not found: ${taskId}`);
        const next: AssistantTask = {
            ...current,
            ...updates,
            updatedAt: nowIso(),
        };
        this.tasks.set(taskId, next);
        return next;
    }

    setStatus(taskId: string, status: AssistantTaskStatus, errors: string[] = []): AssistantTask {
        return this.updateTask(taskId, { status, errors });
    }

    getTask(taskId: string): AssistantTask | undefined {
        return this.tasks.get(taskId);
    }

    listTasks(filters: { userId?: string | null; tenantId?: string | null; projectId?: string | null } = {}): AssistantTask[] {
        return Array.from(this.tasks.values()).filter(task => {
            if (filters.userId !== undefined && task.userId !== filters.userId) return false;
            if (filters.tenantId !== undefined && task.tenantId !== filters.tenantId) return false;
            if (filters.projectId !== undefined && task.projectId !== filters.projectId) return false;
            return true;
        });
    }
}

export const globalAssistantTaskService = new GlobalAssistantTaskService();
