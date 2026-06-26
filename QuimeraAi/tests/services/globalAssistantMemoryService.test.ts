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
});
