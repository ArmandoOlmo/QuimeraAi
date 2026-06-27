import type {
    AssistantAction,
    AssistantActionLog,
    AssistantContextSnapshot,
    AssistantExecutionPlan,
    AssistantIntent,
    AssistantMemoryContextManifest,
    AssistantRollbackSnapshot,
    AssistantRuntimeEvent,
    AssistantTask,
    GlobalAssistantMemory,
} from '../../types/globalAssistant';
import {
    globalAssistantActionRegistry,
    type GlobalAssistantActionRegistry,
} from './globalAssistantActionRegistry';
import { buildExecutionPlan } from './globalAssistantExecutionEngine';
import { routeAssistantIntent } from './globalAssistantIntentRouter';
import {
    GlobalAssistantMemoryService,
} from './globalAssistantMemoryService';
import { selectModelForIntent } from './globalAssistantModelRouter';
import {
    globalAssistantTaskService,
    type GlobalAssistantTaskService,
} from './globalAssistantTaskService';
import {
    globalAssistantAuditService,
    type GlobalAssistantAuditService,
} from './globalAssistantAuditService';
import {
    SupabaseGlobalAssistantMemoryAdapter,
    SupabaseGlobalAssistantRuntimePersistence,
} from './globalAssistantSupabaseStore';

export interface GlobalAssistantRuntimeRequest {
    request: string;
    context: AssistantContextSnapshot;
    userPermissions?: string[];
    enabledServices?: string[];
    enabledFeatures?: string[];
}

export interface GlobalAssistantRuntimeResult {
    context: AssistantContextSnapshot;
    task: AssistantTask;
    plan: AssistantExecutionPlan;
    memoryUsed: GlobalAssistantMemory[];
    memoryContext: AssistantMemoryContextManifest;
    modelId: string;
}

export interface ConfirmAssistantPlanInput {
    taskId: string;
    actionIds?: string[];
    confirmedBy?: string | null;
    confirmedAt?: string;
}

export interface CancelAssistantPlanInput {
    taskId: string;
    cancelledBy?: string | null;
    cancelledAt?: string;
}

export interface ApplyAssistantTaskInput {
    taskId: string;
    actionIds?: string[];
    context?: AssistantContextSnapshot;
}

export interface RollbackAssistantActionInput {
    taskId: string;
    actionId: string;
    context?: AssistantContextSnapshot;
}

export interface AssistantLifecycleResult {
    task: AssistantTask;
    plan: AssistantExecutionPlan;
    actions: AssistantAction[];
}

export interface GlobalAssistantRuntimePersistence {
    recordContextSnapshot?: (context: AssistantContextSnapshot) => Promise<void> | void;
    upsertTask?: (task: AssistantTask) => Promise<void> | void;
    recordAction?: (action: AssistantActionLog) => Promise<void> | void;
    recordRollbackSnapshot?: (snapshot: AssistantRollbackSnapshot) => Promise<void> | void;
    getRollbackSnapshot?: (actionId: string) => Promise<AssistantRollbackSnapshot | null | undefined> | AssistantRollbackSnapshot | null | undefined;
    recordEvent?: (event: AssistantRuntimeEvent) => Promise<void> | void;
}

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const hasRecordField = (value: Record<string, unknown>, field: string): value is Record<string, Record<string, unknown>> =>
    value[field] !== null && typeof value[field] === 'object' && !Array.isArray(value[field]);

const buildDefaultBeforeSnapshot = (action: AssistantAction): Record<string, unknown> => ({
    target: action.target,
    input: action.input,
    status: action.status,
});

const readResultRecord = (value: unknown): Record<string, unknown> => asRecord(value);

const readProjectDisplayName = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        return readProjectDisplayName(record.es)
            || readProjectDisplayName(record.en)
            || readProjectDisplayName(record.value)
            || readProjectDisplayName(record.label);
    }
    return null;
};

const findProjectDisplayName = (
    context: AssistantContextSnapshot,
    projectId: string | null | undefined,
): string | null => {
    if (!projectId) return null;
    const projects = Array.isArray(context.snapshot?.availableProjects)
        ? context.snapshot.availableProjects
        : [];
    const project = projects
        .map(asRecord)
        .find(entry => entry.id === projectId);
    return readProjectDisplayName(project?.name);
};

const projectScopedMemoryModules = new Set<string>([
    'businessBlueprint',
    'website',
    'storefront',
    'ecommerce',
    'media',
    'appointments',
    'restaurants',
    'realEstate',
    'bioPage',
    'crm',
    'emailMarketing',
    'chatbot',
    'analytics',
    'finance',
]);

const buildMemoryContextForIntent = (
    context: AssistantContextSnapshot,
    intent: AssistantIntent,
): AssistantContextSnapshot => {
    const targetProjectId = intent.projectResolution.projectId || context.project.projectId;
    const shouldTargetResolvedProject = Boolean(
        targetProjectId
        && targetProjectId !== context.project.projectId
        && projectScopedMemoryModules.has(intent.module),
    );

    return {
        ...context,
        project: shouldTargetResolvedProject
            ? {
                ...context.project,
                projectId: targetProjectId,
                projectName: findProjectDisplayName(context, targetProjectId),
                activePageId: null,
                sourceProject: null,
            }
            : context.project,
        activeModule: intent.module,
        snapshot: {
            ...context.snapshot,
            memoryTarget: {
                sourceContextId: context.id,
                activeProjectId: context.project.projectId,
                targetProjectId,
                targetModule: intent.module,
                requiresProjectSwitch: intent.projectResolution.requiresProjectSwitch,
            },
        },
    };
};

export class GlobalAssistantRuntime {
    private readonly pendingPersistence: Promise<void>[] = [];
    private persistenceTail: Promise<void> = Promise.resolve();

    constructor(
        private readonly registry: GlobalAssistantActionRegistry = globalAssistantActionRegistry,
        private readonly memoryService: GlobalAssistantMemoryService = new GlobalAssistantMemoryService(),
        private readonly taskService: GlobalAssistantTaskService = globalAssistantTaskService,
        private readonly auditService: GlobalAssistantAuditService = globalAssistantAuditService,
        private readonly persistence?: GlobalAssistantRuntimePersistence,
    ) {}

    async planRequest(input: GlobalAssistantRuntimeRequest): Promise<GlobalAssistantRuntimeResult> {
        this.recordContextSnapshot(input.context);
        this.recordEvent({
            type: 'assistant_request_started',
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            metadata: { request: input.request },
        });

        const intent = routeAssistantIntent(input.request, input.context);
        const model = selectModelForIntent(intent);
        const memoryContextSnapshot = buildMemoryContextForIntent(input.context, intent);

        this.recordEvent({
            type: 'assistant_intent_classified',
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            metadata: { intent, modelId: model.modelId },
        });

        const memoryContextResult = await this.memoryService.resolveMemoryContext({
            context: memoryContextSnapshot,
            text: input.request,
            limit: 12,
        });
        const memoryUsed = memoryContextResult.memories;
        const memoryContext = memoryContextResult.manifest;

        this.recordEvent({
            type: 'assistant_memory_loaded',
            userId: input.context.actor.userId,
            tenantId: memoryContext.tenantId,
            projectId: memoryContext.projectId,
            metadata: {
                count: memoryUsed.length,
                memoryIds: memoryContext.memoryIds,
                scopeCounts: memoryContext.scopeCounts,
                moduleCounts: memoryContext.moduleCounts,
                guardrails: memoryContext.guardrails,
                targetModule: memoryContext.activeModule,
                targetProjectId: memoryContext.projectId,
                requiresProjectSwitch: intent.projectResolution.requiresProjectSwitch,
            },
        });

        const definitions = intent.actionCandidates
            .map(actionType => this.registry.get(actionType))
            .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));

        const plan = buildExecutionPlan({
            context: input.context,
            intent,
            actionDefinitions: definitions,
            request: input.request,
            userPermissions: input.userPermissions,
            enabledServices: input.enabledServices,
            enabledFeatures: input.enabledFeatures,
        });

        const task = this.taskService.createTask({
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            request: input.request,
            intent,
            plan,
        });
        this.recordTask(task);

        plan.taskId = task.id;
        plan.actions.forEach(action => {
            action.taskId = task.id;
            this.recordAction(action);
        });

        if (plan.previews.length > 0) {
            this.recordEvent({
                type: 'assistant_action_previewed',
                userId: input.context.actor.userId,
                tenantId: input.context.tenant.tenantId,
                projectId: input.context.project.projectId,
                taskId: task.id,
                metadata: { actionIds: plan.actions.map(action => action.id) },
            });
        }
        await this.flushPersistence();

        return {
            context: input.context,
            task,
            plan,
            memoryUsed,
            memoryContext,
            modelId: model.modelId,
        };
    }

    confirmPlan(input: ConfirmAssistantPlanInput): AssistantLifecycleResult {
        const task = this.getTaskOrThrow(input.taskId);
        const plan = this.getPlanOrThrow(task);
        if (plan.status === 'blocked') {
            throw new Error('Cannot confirm a blocked assistant plan.');
        }
        if (plan.status === 'cancelled' || task.status === 'cancelled') {
            throw new Error('Cannot confirm a cancelled assistant plan.');
        }
        if (plan.status === 'complete' || task.status === 'completed') {
            throw new Error('Cannot confirm a completed assistant plan.');
        }

        const actionIds = new Set(input.actionIds || plan.actions.map(action => action.id));
        const timestamp = input.confirmedAt || nowIso();
        const actions = plan.actions.map(action => {
            if (!actionIds.has(action.id)) return action;
            const nextAction: AssistantAction = {
                ...action,
                confirmedAt: action.requiresConfirmation ? timestamp : action.confirmedAt,
                status: action.status === 'planned' ? 'previewed' : action.status,
                updatedAt: timestamp,
            };
            this.recordAction(nextAction, {
                metadata: {
                    confirmedBy: input.confirmedBy ?? action.userId,
                    lifecycle: 'confirmed',
                },
            });
            this.recordEvent({
                type: 'assistant_action_confirmed',
                userId: nextAction.userId,
                tenantId: nextAction.tenantId,
                projectId: nextAction.projectId,
                taskId: task.id,
                actionId: nextAction.id,
                metadata: {
                    confirmedBy: input.confirmedBy ?? nextAction.userId,
                    actionType: nextAction.actionType,
                },
            });
            return nextAction;
        });

        const approvals = plan.approvals.map(approval =>
            actionIds.has(approval.actionId)
                ? { ...approval, confirmedAt: approval.confirmedAt || timestamp }
                : approval,
        );
        const allRequiredActionsConfirmed = actions
            .filter(action => action.requiresConfirmation)
            .every(action => Boolean(action.confirmedAt));
        const nextPlan: AssistantExecutionPlan = {
            ...plan,
            actions,
            approvals,
            status: allRequiredActionsConfirmed ? 'apply' : plan.status,
            updatedAt: timestamp,
        };
        const nextTask = this.taskService.updateTask(task.id, {
            plan: nextPlan,
            status: allRequiredActionsConfirmed ? 'running' : 'waiting_for_confirmation',
            errors: [],
        });
        this.recordTask(nextTask);

        return { task: nextTask, plan: nextPlan, actions };
    }

    async cancelPlan(input: CancelAssistantPlanInput): Promise<AssistantLifecycleResult> {
        const task = this.getTaskOrThrow(input.taskId);
        const plan = this.getPlanOrThrow(task);
        if (plan.status === 'complete' || task.status === 'completed') {
            throw new Error('Cannot cancel a completed assistant plan. Use rollback for applied actions.');
        }
        if (plan.actions.some(action => action.status === 'applied')) {
            throw new Error('Cannot cancel a plan with applied actions. Use rollback for applied actions.');
        }

        const timestamp = input.cancelledAt || nowIso();
        const actions = plan.actions.map(action => {
            if (action.status === 'rolled_back') return action;
            const nextAction: AssistantAction = {
                ...action,
                status: 'cancelled',
                updatedAt: timestamp,
                metadata: {
                    ...(action.metadata || {}),
                    lifecycle: 'cancelled',
                    cancelledBy: input.cancelledBy ?? action.userId,
                },
            };
            this.recordAction(nextAction, {
                metadata: {
                    cancelledBy: input.cancelledBy ?? action.userId,
                    lifecycle: 'cancelled',
                },
            });
            this.recordEvent({
                type: 'assistant_action_cancelled',
                userId: nextAction.userId,
                tenantId: nextAction.tenantId,
                projectId: nextAction.projectId,
                taskId: task.id,
                actionId: nextAction.id,
                metadata: {
                    cancelledBy: input.cancelledBy ?? nextAction.userId,
                    actionType: nextAction.actionType,
                    module: nextAction.module,
                },
            });
            return nextAction;
        });
        const approvals = plan.approvals.map(approval => ({
            ...approval,
            cancelledAt: approval.cancelledAt || timestamp,
        }));
        const nextPlan: AssistantExecutionPlan = {
            ...plan,
            actions,
            approvals,
            status: 'cancelled',
            blockers: [],
            updatedAt: timestamp,
        };
        const nextTask = this.taskService.updateTask(task.id, {
            plan: nextPlan,
            status: 'cancelled',
            errors: [],
            result: {
                cancelled: true,
                cancelledBy: input.cancelledBy ?? task.userId,
                actionIds: actions.map(action => action.id),
            },
        });
        this.recordTask(nextTask);
        await this.flushPersistence();

        return { task: nextTask, plan: nextPlan, actions };
    }

    async applyTask(input: ApplyAssistantTaskInput): Promise<AssistantLifecycleResult> {
        const task = this.getTaskOrThrow(input.taskId);
        const plan = this.getPlanOrThrow(task);
        if (plan.status === 'blocked') {
            throw new Error('Cannot apply a blocked assistant plan.');
        }
        if (plan.status === 'cancelled' || task.status === 'cancelled') {
            throw new Error('Cannot apply a cancelled assistant plan.');
        }

        const selectedIds = new Set(input.actionIds || plan.actions.map(action => action.id));
        const timestamp = nowIso();
        const nextActions: AssistantAction[] = [];
        const errors: string[] = [];

        for (const action of plan.actions) {
            if (!selectedIds.has(action.id)) {
                nextActions.push(action);
                continue;
            }

            const definition = this.registry.get(action.actionType);
            const confirmed = !action.requiresConfirmation || Boolean(action.confirmedAt);
            if (!confirmed) {
                const error = `${action.actionType} requires confirmation before apply.`;
                errors.push(error);
                nextActions.push(this.failAction(action, task.id, error, timestamp));
                continue;
            }

            if (!definition?.execute) {
                const error = `No execute handler registered for ${action.actionType}.`;
                errors.push(error);
                nextActions.push(this.failAction(action, task.id, error, timestamp));
                continue;
            }

            const validation = definition.validate?.(action.input);
            if (validation && !validation.valid) {
                const error = validation.errors.join(' ') || `${action.actionType} input did not validate.`;
                errors.push(error);
                nextActions.push(this.failAction(action, task.id, error, timestamp));
                continue;
            }

            try {
                const result = readResultRecord(await definition.execute(action.input, {
                    action,
                    context: input.context,
                }));
                const beforeSnapshot = hasRecordField(result, 'beforeSnapshot')
                    ? asRecord(result.beforeSnapshot)
                    : action.beforeSnapshot || buildDefaultBeforeSnapshot(action);
                const afterSnapshot = hasRecordField(result, 'afterSnapshot')
                    ? asRecord(result.afterSnapshot)
                    : result;
                const nextAction: AssistantAction = {
                    ...action,
                    beforeSnapshot,
                    afterSnapshot,
                    diff: hasRecordField(result, 'diff') ? asRecord(result.diff) : null,
                    status: 'applied',
                    updatedAt: timestamp,
                    metadata: {
                        ...(action.metadata || {}),
                        lifecycle: 'applied',
                        result,
                    },
                };
                nextActions.push(nextAction);
                this.recordAction(nextAction);
                if (nextAction.metadata?.rollbackSupported === true || definition.rollbackSupported) {
                    const rollbackSnapshot: AssistantRollbackSnapshot = {
                        id: createId('asst_rollback'),
                        actionId: nextAction.id,
                        beforeSnapshot,
                        afterSnapshot,
                        rollbackActionType: definition.rollback ? `${nextAction.actionType}:rollback` : undefined,
                        createdAt: timestamp,
                    };
                    this.auditService.recordRollbackSnapshot(rollbackSnapshot);
                    this.recordRollbackSnapshot(rollbackSnapshot);
                }
                this.recordEvent({
                    type: 'assistant_action_applied',
                    userId: nextAction.userId,
                    tenantId: nextAction.tenantId,
                    projectId: nextAction.projectId,
                    taskId: task.id,
                    actionId: nextAction.id,
                    metadata: {
                        actionType: nextAction.actionType,
                        module: nextAction.module,
                    },
                });
                await this.recordAppliedMemory(task, nextAction, result);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(message);
                nextActions.push(this.failAction(action, task.id, message, timestamp));
            }
        }

        const nextPlan: AssistantExecutionPlan = {
            ...plan,
            actions: nextActions,
            status: errors.length > 0 ? 'blocked' : 'complete',
            blockers: errors,
            updatedAt: timestamp,
        };
        const nextTask = this.taskService.updateTask(task.id, {
            plan: nextPlan,
            status: errors.length > 0 ? 'failed' : 'completed',
            errors,
            result: errors.length > 0
                ? { applied: false, errors }
                : { applied: true, actionIds: nextActions.filter(action => selectedIds.has(action.id)).map(action => action.id) },
        });
        this.recordTask(nextTask);
        await this.flushPersistence();

        return { task: nextTask, plan: nextPlan, actions: nextActions };
    }

    async rollbackAction(input: RollbackAssistantActionInput): Promise<AssistantLifecycleResult> {
        const task = this.getTaskOrThrow(input.taskId);
        const plan = this.getPlanOrThrow(task);
        const action = plan.actions.find(entry => entry.id === input.actionId);
        if (!action) throw new Error(`Assistant action not found: ${input.actionId}`);

        const definition = this.registry.get(action.actionType);
        if (!definition?.rollbackSupported || !action.metadata?.rollbackSupported) {
            throw new Error(`${action.actionType} does not support rollback.`);
        }
        if (!definition.rollback) {
            throw new Error(`No rollback handler registered for ${action.actionType}.`);
        }
        const snapshot = await this.resolveRollbackSnapshot(action);
        if (!snapshot) {
            throw new Error(`Rollback snapshot not found for ${action.actionType}.`);
        }

        const timestamp = nowIso();
        const result = readResultRecord(await definition.rollback(action.input, {
            action,
            snapshot,
            context: input.context,
        }));
        const rolledBackAction: AssistantAction = {
            ...action,
            status: 'rolled_back',
            afterSnapshot: hasRecordField(result, 'afterSnapshot')
                ? asRecord(result.afterSnapshot)
                : snapshot.beforeSnapshot,
            diff: hasRecordField(result, 'diff') ? asRecord(result.diff) : null,
            updatedAt: timestamp,
            metadata: {
                ...(action.metadata || {}),
                lifecycle: 'rolled_back',
                rollbackResult: result,
            },
        };
        const actions = plan.actions.map(entry => entry.id === action.id ? rolledBackAction : entry);
        const nextPlan: AssistantExecutionPlan = {
            ...plan,
            actions,
            updatedAt: timestamp,
        };
        this.recordAction(rolledBackAction);
        this.recordEvent({
            type: 'assistant_action_rolled_back',
            userId: rolledBackAction.userId,
            tenantId: rolledBackAction.tenantId,
            projectId: rolledBackAction.projectId,
            taskId: task.id,
            actionId: rolledBackAction.id,
            metadata: {
                actionType: rolledBackAction.actionType,
                module: rolledBackAction.module,
            },
        });
        await this.recordAppliedMemory(task, rolledBackAction, {
            rollback: true,
            ...result,
        });
        const nextTask = this.taskService.updateTask(task.id, {
            plan: nextPlan,
            status: 'completed',
            result: {
                ...(task.result || {}),
                rolledBackActionId: rolledBackAction.id,
            },
        });
        this.recordTask(nextTask);
        await this.flushPersistence();

        return { task: nextTask, plan: nextPlan, actions };
    }

    private getTaskOrThrow(taskId: string): AssistantTask {
        const task = this.taskService.getTask(taskId);
        if (!task) throw new Error(`Assistant task not found: ${taskId}`);
        return task;
    }

    private getPlanOrThrow(task: AssistantTask): AssistantExecutionPlan {
        if (!task.plan) throw new Error(`Assistant task has no execution plan: ${task.id}`);
        return task.plan;
    }

    private failAction(action: AssistantAction, taskId: string, error: string, timestamp: string): AssistantAction {
        const failedAction: AssistantAction = {
            ...action,
            status: 'failed',
            updatedAt: timestamp,
            metadata: {
                ...(action.metadata || {}),
                lifecycle: 'failed',
                error,
            },
        };
        this.recordAction(failedAction, { error });
        this.recordEvent({
            type: 'assistant_action_failed',
            userId: failedAction.userId,
            tenantId: failedAction.tenantId,
            projectId: failedAction.projectId,
            taskId,
            actionId: failedAction.id,
            metadata: {
                actionType: failedAction.actionType,
                module: failedAction.module,
                error,
            },
        });
        return failedAction;
    }

    private async recordAppliedMemory(
        task: AssistantTask,
        action: AssistantAction,
        result: Record<string, unknown>,
    ): Promise<void> {
        await this.memoryService.createMemory({
            scope: 'task',
            userId: action.userId,
            tenantId: action.tenantId,
            projectId: action.projectId,
            module: action.module,
            title: `${action.actionType} ${action.status}`,
            summary: `Global Assistant marked ${action.actionType} as ${action.status}.`,
            data: {
                taskId: task.id,
                actionId: action.id,
                module: action.module,
                actionType: action.actionType,
                status: action.status,
                result,
            },
            source: 'globalAssistantRuntime',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            importance: 0.7,
        });
        this.recordEvent({
            type: 'assistant_memory_updated',
            userId: action.userId,
            tenantId: action.tenantId,
            projectId: action.projectId,
            taskId: task.id,
            actionId: action.id,
            metadata: {
                scope: 'task',
                actionType: action.actionType,
                status: action.status,
            },
        });
    }

    private recordContextSnapshot(context: AssistantContextSnapshot): void {
        this.queuePersistence(() => this.persistence?.recordContextSnapshot?.(context));
    }

    private recordTask(task: AssistantTask): void {
        this.queuePersistence(() => this.persistence?.upsertTask?.(task));
    }

    private recordAction(action: AssistantAction, metadata: Partial<AssistantActionLog> = {}): AssistantActionLog {
        const log = this.auditService.recordAction(action, metadata);
        this.queuePersistence(() => this.persistence?.recordAction?.(log));
        return log;
    }

    private recordRollbackSnapshot(snapshot: AssistantRollbackSnapshot): void {
        this.queuePersistence(() => this.persistence?.recordRollbackSnapshot?.(snapshot));
    }

    private async resolveRollbackSnapshot(action: AssistantAction): Promise<AssistantRollbackSnapshot | null> {
        const localSnapshot = this.auditService.getRollbackSnapshot(action.id);
        if (localSnapshot) return localSnapshot;

        const persistedSnapshot = await this.persistence?.getRollbackSnapshot?.(action.id);
        if (persistedSnapshot) {
            this.auditService.recordRollbackSnapshot(persistedSnapshot);
            return persistedSnapshot;
        }

        if (action.beforeSnapshot) {
            const recoveredSnapshot: AssistantRollbackSnapshot = {
                id: createId('asst_rollback_recovered'),
                actionId: action.id,
                beforeSnapshot: action.beforeSnapshot,
                afterSnapshot: action.afterSnapshot || undefined,
                rollbackActionType: `${action.actionType}:rollback`,
                createdAt: action.updatedAt || action.createdAt,
            };
            this.auditService.recordRollbackSnapshot(recoveredSnapshot);
            return recoveredSnapshot;
        }

        return null;
    }

    private recordEvent(event: Omit<AssistantRuntimeEvent, 'id' | 'createdAt'>): AssistantRuntimeEvent {
        const nextEvent = this.auditService.recordEvent(event);
        this.queuePersistence(() => this.persistence?.recordEvent?.(nextEvent));
        return nextEvent;
    }

    private queuePersistence(work: (() => Promise<void> | void | undefined) | undefined): void {
        if (!work) return;
        const queued = this.persistenceTail.then(() => work());
        this.persistenceTail = queued.catch(() => undefined);
        this.pendingPersistence.push(queued);
    }

    private async flushPersistence(): Promise<void> {
        const pending = this.pendingPersistence.splice(0);
        if (pending.length === 0) return;
        await Promise.all(pending);
    }
}

export const globalAssistantRuntime = new GlobalAssistantRuntime(
    globalAssistantActionRegistry,
    new GlobalAssistantMemoryService(new SupabaseGlobalAssistantMemoryAdapter(undefined, { failOpen: true })),
    globalAssistantTaskService,
    globalAssistantAuditService,
    new SupabaseGlobalAssistantRuntimePersistence(undefined, { failOpen: true }),
);
