import { describe, expect, it } from 'vitest';
import { GlobalAssistantActionRegistry } from '../../services/globalAssistant/globalAssistantActionRegistry.ts';
import { GlobalAssistantAuditService } from '../../services/globalAssistant/globalAssistantAuditService.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import { GlobalAssistantMemoryService } from '../../services/globalAssistant/globalAssistantMemoryService.ts';
import { GlobalAssistantRuntime } from '../../services/globalAssistant/globalAssistantRuntime.ts';
import { GlobalAssistantTaskService } from '../../services/globalAssistant/globalAssistantTaskService.ts';

const activeProject = {
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft' as const,
    tenantId: 'tenant-1',
    userId: 'user-1',
};

const buildRuntime = () => {
    const registry = new GlobalAssistantActionRegistry();
    const memoryService = new GlobalAssistantMemoryService();
    const taskService = new GlobalAssistantTaskService();
    const auditService = new GlobalAssistantAuditService();

    return {
        memoryService,
        auditService,
        runtime: new GlobalAssistantRuntime(registry, memoryService, taskService, auditService),
    };
};

describe('GlobalAssistantRuntime', () => {
    it('plans an email marketing request as preview-first work with memory and audit events', async () => {
        const { runtime, memoryService, auditService } = buildRuntime();
        const context = resolveCurrentAssistantContext({
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: 'member',
            activeProject,
            activeRoute: '/dashboard/email',
            activeServices: ['emailMarketing'],
            featureFlags: ['emailMarketing'],
        });
        await memoryService.createMemory({
            scope: 'project',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'emailMarketing',
            title: 'Email brand voice',
            summary: 'Campaign copy should use concise Spanish and mention reservations.',
            source: 'test',
            sourceEntityType: 'brand_note',
            sourceEntityId: 'brand-note-1',
        });

        const result = await runtime.planRequest({
            context,
            request: 'Crea una campana de email con el brand voice para reservas',
        });

        expect(result.modelId).toBe('anthropic/claude-opus-4.7');
        expect(result.plan.intent.module).toBe('emailMarketing');
        expect(result.plan.status).toBe('preview');
        expect(result.task.status).toBe('waiting_for_confirmation');
        expect(result.memoryUsed.map(memory => memory.title)).toContain('Email brand voice');
        expect(result.plan.actions.map(action => action.actionType)).toContain('create_email_campaign');
        expect(result.plan.approvals.length).toBeGreaterThan(0);
        expect(auditService.listEvents().map(event => event.type)).toEqual([
            'assistant_request_started',
            'assistant_memory_loaded',
            'assistant_intent_classified',
            'assistant_action_previewed',
        ]);
    });

    it('blocks project-scoped actions when no project is active', async () => {
        const { runtime } = buildRuntime();
        const context = resolveCurrentAssistantContext({
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: 'member',
            activeRoute: '/dashboard/email',
            activeServices: ['emailMarketing'],
            featureFlags: ['emailMarketing'],
        });

        const result = await runtime.planRequest({
            context,
            request: 'Crea una campana de email para reservas',
        });

        expect(result.plan.status).toBe('blocked');
        expect(result.task.status).toBe('failed');
        expect(result.plan.blockers.join(' ')).toContain('Project-scoped action requires a projectId');
    });
});
