import { describe, expect, it } from 'vitest';
import { GlobalAssistantActionRegistry } from '../../services/globalAssistant/globalAssistantActionRegistry.ts';
import { GlobalAssistantAuditService } from '../../services/globalAssistant/globalAssistantAuditService.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import { GlobalAssistantMemoryService } from '../../services/globalAssistant/globalAssistantMemoryService.ts';
import { GlobalAssistantRuntime } from '../../services/globalAssistant/globalAssistantRuntime.ts';
import { GlobalAssistantTaskService } from '../../services/globalAssistant/globalAssistantTaskService.ts';
import type { AssistantActionDefinition } from '../../types/globalAssistant.ts';

const activeProject = {
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft' as const,
    tenantId: 'tenant-1',
    userId: 'user-1',
};

const context = resolveCurrentAssistantContext({
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: 'owner',
    mode: 'owner',
    activeProject,
    activeRoute: '/dashboard/email',
    activeServices: ['emailMarketing'],
    featureFlags: ['emailMarketing'],
});

const buildRuntime = (registry: GlobalAssistantActionRegistry) => {
    const memoryService = new GlobalAssistantMemoryService();
    const taskService = new GlobalAssistantTaskService();
    const auditService = new GlobalAssistantAuditService();

    return {
        memoryService,
        taskService,
        auditService,
        runtime: new GlobalAssistantRuntime(registry, memoryService, taskService, auditService),
    };
};

const emailCampaignDefinition: AssistantActionDefinition = {
    actionType: 'create_email_campaign',
    module: 'emailMarketing',
    description: 'Create a review-gated email campaign draft.',
    inputSchema: {
        type: 'object',
        properties: {
            projectId: { type: 'string' },
            request: { type: 'string' },
        },
        required: ['projectId', 'request'],
        additionalProperties: true,
    },
    requiredPermissions: ['assistant:emailMarketing:use'],
    requiredService: 'emailMarketing',
    requiredFeature: 'emailMarketing',
    safetyLevel: 'high',
    requiresConfirmation: true,
    previewSupported: true,
    rollbackSupported: true,
    mutatesData: true,
    idempotencyKeyStrategy: 'user_project_action',
    execute: async input => ({
        afterSnapshot: {
            campaignId: 'campaign-1',
            projectId: input.projectId,
            status: 'draft',
            needsReview: true,
        },
        diff: {
            created: ['email_campaigns.campaign-1'],
        },
    }),
    rollback: async (_input, { snapshot }) => ({
        afterSnapshot: snapshot.beforeSnapshot,
        diff: {
            removed: ['email_campaigns.campaign-1'],
        },
    }),
};

describe('GlobalAssistantRuntime execution lifecycle', () => {
    it('confirms, applies, records memory, and rolls back actions with registered handlers', async () => {
        const registry = new GlobalAssistantActionRegistry([emailCampaignDefinition]);
        const { runtime, memoryService, auditService } = buildRuntime(registry);

        const planned = await runtime.planRequest({
            context,
            request: 'Crea una campana de email para reservas',
            userPermissions: ['assistant:emailMarketing:use'],
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(planned.plan.status).toBe('preview');
        expect(planned.task.status).toBe('waiting_for_confirmation');

        const confirmed = runtime.confirmPlan({
            taskId: planned.task.id,
            confirmedBy: 'user-1',
            confirmedAt: '2026-06-26T12:00:00.000Z',
        });

        expect(confirmed.plan.status).toBe('apply');
        expect(confirmed.task.status).toBe('running');
        expect(confirmed.actions[0].status).toBe('previewed');
        expect(confirmed.actions[0].confirmedAt).toBe('2026-06-26T12:00:00.000Z');

        const applied = await runtime.applyTask({
            taskId: planned.task.id,
            context,
        });

        expect(applied.task.status).toBe('completed');
        expect(applied.plan.status).toBe('complete');
        expect(applied.actions[0]).toMatchObject({
            actionType: 'create_email_campaign',
            status: 'applied',
            afterSnapshot: {
                campaignId: 'campaign-1',
                status: 'draft',
                needsReview: true,
            },
        });
        expect(auditService.listRollbackSnapshots({ actionId: applied.actions[0].id })).toHaveLength(1);

        const taskMemory = await memoryService.queryRelevantMemory({
            context,
            scopes: ['task'],
            text: 'create_email_campaign',
        });
        expect(taskMemory.map(memory => memory.title)).toContain('create_email_campaign applied');

        const rolledBack = await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(rolledBack.task.status).toBe('completed');
        expect(rolledBack.actions[0].status).toBe('rolled_back');
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
        expect(auditService.listActionLogs({ status: 'rolled_back' })).toHaveLength(1);
    });

    it('fails safely instead of applying when a module connector has no execute handler', async () => {
        const registry = new GlobalAssistantActionRegistry();
        const { runtime, auditService } = buildRuntime(registry);

        const planned = await runtime.planRequest({
            context,
            request: 'Crea una campana de email para reservas',
            userPermissions: ['assistant:emailMarketing:use'],
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({
            taskId: planned.task.id,
            context,
        });

        expect(applied.task.status).toBe('failed');
        expect(applied.plan.status).toBe('blocked');
        expect(applied.actions[0].status).toBe('failed');
        expect(applied.plan.blockers.join(' ')).toContain('No execute handler registered for create_email_campaign.');
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_failed');
        expect(auditService.listActionLogs({ status: 'failed' }).map(action => action.actionType)).toEqual([
            'create_email_campaign',
            'create_audience',
            'create_email_automation',
        ]);
    });
});
