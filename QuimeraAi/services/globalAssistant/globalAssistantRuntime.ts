import type {
    AssistantContextSnapshot,
    AssistantExecutionPlan,
    AssistantTask,
} from '../../types/globalAssistant';
import {
    globalAssistantActionRegistry,
    type GlobalAssistantActionRegistry,
} from './globalAssistantActionRegistry';
import { buildExecutionPlan } from './globalAssistantExecutionEngine';
import { routeAssistantIntent } from './globalAssistantIntentRouter';
import {
    GlobalAssistantMemoryService,
    type MemoryQuery,
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
    memoryUsed: MemoryQuery extends { limit?: number } ? Awaited<ReturnType<GlobalAssistantMemoryService['queryRelevantMemory']>> : never;
    modelId: string;
}

export class GlobalAssistantRuntime {
    constructor(
        private readonly registry: GlobalAssistantActionRegistry = globalAssistantActionRegistry,
        private readonly memoryService: GlobalAssistantMemoryService = new GlobalAssistantMemoryService(),
        private readonly taskService: GlobalAssistantTaskService = globalAssistantTaskService,
        private readonly auditService: GlobalAssistantAuditService = globalAssistantAuditService,
    ) {}

    async planRequest(input: GlobalAssistantRuntimeRequest): Promise<GlobalAssistantRuntimeResult> {
        this.auditService.recordEvent({
            type: 'assistant_request_started',
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            metadata: { request: input.request },
        });

        const memoryUsed = await this.memoryService.queryRelevantMemory({
            context: input.context,
            text: input.request,
            limit: 12,
        });

        this.auditService.recordEvent({
            type: 'assistant_memory_loaded',
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            metadata: { count: memoryUsed.length, memoryIds: memoryUsed.map(memory => memory.id) },
        });

        const intent = routeAssistantIntent(input.request, input.context);
        const model = selectModelForIntent(intent);

        this.auditService.recordEvent({
            type: 'assistant_intent_classified',
            userId: input.context.actor.userId,
            tenantId: input.context.tenant.tenantId,
            projectId: input.context.project.projectId,
            metadata: { intent, modelId: model.modelId },
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

        plan.taskId = task.id;
        plan.actions.forEach(action => {
            action.taskId = task.id;
            this.auditService.recordAction(action);
        });

        if (plan.previews.length > 0) {
            this.auditService.recordEvent({
                type: 'assistant_action_previewed',
                userId: input.context.actor.userId,
                tenantId: input.context.tenant.tenantId,
                projectId: input.context.project.projectId,
                taskId: task.id,
                metadata: { actionIds: plan.actions.map(action => action.id) },
            });
        }

        return {
            context: input.context,
            task,
            plan,
            memoryUsed,
            modelId: model.modelId,
        };
    }
}

export const globalAssistantRuntime = new GlobalAssistantRuntime();
