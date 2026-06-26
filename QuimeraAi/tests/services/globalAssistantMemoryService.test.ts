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
});
