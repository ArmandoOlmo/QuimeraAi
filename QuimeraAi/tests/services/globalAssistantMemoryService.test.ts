import { describe, expect, it } from 'vitest';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import { GlobalAssistantMemoryService } from '../../services/globalAssistant/globalAssistantMemoryService.ts';

const project = (id: string, tenantId = 'tenant-1', userId = 'user-1') => ({
    id,
    name: id === 'project-1' ? 'Casa Luna' : 'Sol Realty',
    status: 'Draft' as const,
    tenantId,
    userId,
});

const context = (overrides: Parameters<typeof resolveCurrentAssistantContext>[0] = {}) =>
    resolveCurrentAssistantContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'member',
        activeProject: project('project-1'),
        ...overrides,
    });

describe('GlobalAssistantMemoryService', () => {
    it('validates required scope boundaries before persisting memory', async () => {
        const service = new GlobalAssistantMemoryService();

        await expect(service.createMemory({
            scope: 'project',
            title: 'Missing project',
            summary: 'Should fail',
            source: 'test',
            sourceEntityType: 'note',
            sourceEntityId: 'note-1',
        })).rejects.toThrow('project memory requires projectId');

        await expect(service.createMemory({
            scope: 'session',
            userId: 'user-1',
            title: 'Missing expiry',
            summary: 'Should fail',
            source: 'test',
            sourceEntityType: 'session',
            sourceEntityId: 'session-1',
        })).rejects.toThrow('session memory requires expiresAt');
    });

    it('keeps user and project memory isolated by context', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'user',
            userId: 'user-1',
            tenantId: 'tenant-1',
            title: 'User brand voice',
            summary: 'Use concise Spanish copy.',
            source: 'test',
            sourceEntityType: 'note',
            sourceEntityId: 'user-note',
        });
        await service.createMemory({
            scope: 'project',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-2',
            title: 'Other project brief',
            summary: 'Do not expose this to project one.',
            source: 'test',
            sourceEntityType: 'note',
            sourceEntityId: 'project-note',
        });

        const visible = await service.queryRelevantMemory({
            context: context(),
            text: 'brand',
        });
        expect(visible.map(memory => memory.title)).toEqual(['User brand voice']);

        const otherUserVisible = await service.queryRelevantMemory({
            context: context({ userId: 'user-2' }),
            text: 'brand',
        });
        expect(otherUserVisible).toHaveLength(0);
    });

    it('blocks admin memory in user mode and allows owner mode', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'admin',
            tenantId: 'tenant-1',
            title: 'Tenant billing override',
            summary: 'Owner-only operational note.',
            source: 'test',
            sourceEntityType: 'admin_note',
            sourceEntityId: 'admin-note-1',
        });

        const userResults = await service.queryRelevantMemory({
            context: context(),
            text: 'billing',
        });
        expect(userResults).toHaveLength(0);

        const ownerResults = await service.queryRelevantMemory({
            context: context({ role: 'owner', mode: 'owner' }),
            text: 'billing',
        });
        expect(ownerResults).toHaveLength(1);
    });

    it('keeps module memory scoped to the active module', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'module',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'emailMarketing',
            title: 'Email module memory',
            summary: 'Use reservation copy for campaigns.',
            source: 'test',
            sourceEntityType: 'module_note',
            sourceEntityId: 'email-note',
        });
        await service.createMemory({
            scope: 'module',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'ecommerce',
            title: 'Ecommerce module memory',
            summary: 'Use bundle copy for product cards.',
            source: 'test',
            sourceEntityType: 'module_note',
            sourceEntityId: 'ecommerce-note',
        });

        const emailResults = await service.queryRelevantMemory({
            context: context({ activeModule: 'emailMarketing' }),
            text: 'copy',
        });
        expect(emailResults.map(memory => memory.title)).toEqual(['Email module memory']);

        const ecommerceResults = await service.queryRelevantMemory({
            context: context({ activeModule: 'ecommerce' }),
            text: 'copy',
        });
        expect(ecommerceResults.map(memory => memory.title)).toEqual(['Ecommerce module memory']);
    });

    it('keeps session memory isolated by conversation/session id', async () => {
        const service = new GlobalAssistantMemoryService();
        const expiresAt = new Date(Date.now() + 60_000).toISOString();

        await service.createMemory({
            scope: 'session',
            userId: 'user-1',
            tenantId: 'tenant-1',
            title: 'Current session draft',
            summary: 'The user is reviewing a campaign preview.',
            data: { conversationId: 'conversation-1' },
            source: 'test',
            sourceEntityType: 'assistant_conversation',
            sourceEntityId: 'conversation-1',
            expiresAt,
        });
        await service.createMemory({
            scope: 'session',
            userId: 'user-1',
            tenantId: 'tenant-1',
            title: 'Other session draft',
            summary: 'This belongs to another drawer session.',
            data: { conversationId: 'conversation-2' },
            source: 'test',
            sourceEntityType: 'assistant_conversation',
            sourceEntityId: 'conversation-2',
            expiresAt,
        });

        const visible = await service.queryRelevantMemory({
            context: context({ conversationId: 'conversation-1' }),
            scopes: ['session'],
            text: 'draft',
        });
        expect(visible.map(memory => memory.title)).toEqual(['Current session draft']);

        const withoutSession = await service.queryRelevantMemory({
            context: context(),
            scopes: ['session'],
            text: 'draft',
        });
        expect(withoutSession).toHaveLength(0);
    });

    it('keeps task memory isolated by active task id', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'task',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'emailMarketing',
            title: 'Task one action',
            summary: 'Created campaign draft.',
            data: { taskId: 'task-1', actionId: 'action-1' },
            source: 'test',
            sourceEntityType: 'assistant_action',
            sourceEntityId: 'action-1',
        });
        await service.createMemory({
            scope: 'task',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'emailMarketing',
            title: 'Task two action',
            summary: 'Created another campaign draft.',
            data: { taskId: 'task-2', actionId: 'action-2' },
            source: 'test',
            sourceEntityType: 'assistant_action',
            sourceEntityId: 'action-2',
        });

        const taskOneResults = await service.queryRelevantMemory({
            context: context({ snapshot: { activeTaskId: 'task-1' } }),
            scopes: ['task'],
            text: 'campaign',
        });
        expect(taskOneResults.map(memory => memory.title)).toEqual(['Task one action']);

        const explicitTaskTwo = await service.queryRelevantMemory({
            context: context({ snapshot: { activeTaskId: 'task-1' } }),
            scopes: ['task'],
            taskId: 'task-2',
            text: 'campaign',
        });
        expect(explicitTaskTwo.map(memory => memory.title)).toEqual(['Task two action']);

        const withoutTask = await service.queryRelevantMemory({
            context: context(),
            scopes: ['task'],
            text: 'campaign',
        });
        expect(withoutTask).toHaveLength(0);
    });

    it('builds a segmented memory context without loading inactive project or admin memory', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'user',
            userId: 'user-1',
            tenantId: 'tenant-1',
            title: 'User visual preference',
            summary: 'Prefers compact dashboard copy.',
            source: 'test',
            sourceEntityType: 'preference',
            sourceEntityId: 'user-pref-1',
            importance: 0.8,
        });
        await service.createMemory({
            scope: 'tenant',
            userId: 'user-1',
            tenantId: 'tenant-1',
            title: 'Tenant services',
            summary: 'Email Marketing and Ecommerce are active.',
            source: 'test',
            sourceEntityType: 'tenant_summary',
            sourceEntityId: 'tenant-summary-1',
            importance: 0.6,
        });
        await service.createMemory({
            scope: 'project',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'Project brand profile',
            summary: 'Casa Luna uses bilingual hospitality copy.',
            source: 'test',
            sourceEntityType: 'project_summary',
            sourceEntityId: 'project-summary-1',
            importance: 0.9,
        });
        await service.createMemory({
            scope: 'module',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            module: 'emailMarketing',
            title: 'Email cadence',
            summary: 'Reservation follow-ups go out weekly.',
            source: 'test',
            sourceEntityType: 'module_summary',
            sourceEntityId: 'email-summary-1',
            importance: 0.7,
        });
        await service.createMemory({
            scope: 'project',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-2',
            title: 'Other project memory',
            summary: 'Should not load for Casa Luna.',
            source: 'test',
            sourceEntityType: 'project_summary',
            sourceEntityId: 'project-summary-2',
            importance: 1,
        });
        await service.createMemory({
            scope: 'admin',
            tenantId: 'tenant-1',
            title: 'Owner-only billing note',
            summary: 'Should not load in user mode.',
            source: 'test',
            sourceEntityType: 'admin_note',
            sourceEntityId: 'admin-note-1',
            importance: 1,
        });

        const result = await service.resolveMemoryContext({
            context: context({ activeModule: 'emailMarketing' }),
            text: 'copy email services billing',
        });

        expect(result.memories.map(memory => memory.title)).toEqual([
            'Project brand profile',
            'User visual preference',
            'Email cadence',
            'Tenant services',
        ]);
        expect(result.manifest.scopeCounts).toMatchObject({
            user: 1,
            tenant: 1,
            project: 1,
            module: 1,
        });
        expect(result.manifest.moduleCounts).toMatchObject({ emailMarketing: 1 });
        expect(result.manifest.guardrails.adminMemoryVisible).toBe(false);
        expect(result.manifest.explanation.join(' ')).toContain('Admin memory is hidden in user mode');
    });

    it('does not load project memory without an active project', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'project',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            title: 'Project-only memory',
            summary: 'Requires active project.',
            source: 'test',
            sourceEntityType: 'project_summary',
            sourceEntityId: 'project-summary-1',
        });

        const result = await service.resolveMemoryContext({
            context: context({ activeProject: null }),
            text: 'project',
        });

        expect(result.memories).toHaveLength(0);
        expect(result.manifest.guardrails.projectIsolation).toContain('hidden until a project is active');
    });

    it('limits owner admin memory to the active or targeted tenant', async () => {
        const service = new GlobalAssistantMemoryService();
        await service.createMemory({
            scope: 'admin',
            tenantId: 'tenant-1',
            title: 'Tenant one admin memory',
            summary: 'Visible to tenant one owner mode.',
            source: 'test',
            sourceEntityType: 'admin_note',
            sourceEntityId: 'admin-note-1',
        });
        await service.createMemory({
            scope: 'admin',
            tenantId: 'tenant-2',
            title: 'Tenant two admin memory',
            summary: 'Must not leak into tenant one owner mode.',
            source: 'test',
            sourceEntityType: 'admin_note',
            sourceEntityId: 'admin-note-2',
        });

        const ownerResult = await service.resolveMemoryContext({
            context: context({ role: 'owner', mode: 'owner' }),
            text: 'admin memory',
        });

        expect(ownerResult.memories.map(memory => memory.title)).toEqual(['Tenant one admin memory']);
        expect(ownerResult.manifest.scopeCounts).toMatchObject({ admin: 1 });
        expect(ownerResult.manifest.guardrails.adminMemoryVisible).toBe(true);

        const targetedResult = await service.resolveMemoryContext({
            context: {
                ...context({ role: 'owner', mode: 'owner' }),
                admin: {
                    enabled: true,
                    targetTenantId: 'tenant-2',
                },
            },
            text: 'admin memory',
        });

        expect(targetedResult.memories.map(memory => memory.title)).toEqual(['Tenant two admin memory']);
        expect(targetedResult.manifest.tenantId).toBe('tenant-2');
    });
});
