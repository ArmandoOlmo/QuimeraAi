import { describe, expect, it } from 'vitest';
import {
    GlobalAssistantConversationService,
    InMemoryGlobalAssistantConversationAdapter,
} from '../../services/globalAssistant/globalAssistantConversationService.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';

describe('globalAssistantConversationService', () => {
    it('creates conversations and stores ordered messages with operating-layer metadata', async () => {
        const service = new GlobalAssistantConversationService(new InMemoryGlobalAssistantConversationAdapter());

        const conversation = await service.createConversation({
            userId: 'user_1',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            mode: 'owner',
            title: 'Update storefront',
            metadata: { source: 'dashboard_input', module: 'storefront' },
        });

        await service.recordMessage({
            conversationId: conversation.id,
            role: 'assistant',
            text: 'I can draft the storefront change.',
            contextSnapshotId: 'asst_context_1',
            memoryIds: ['asst_mem_1'],
            actionIds: ['asst_action_1'],
            metadata: { source: 'operating_layer_plan' },
        });
        await service.recordMessage({
            conversationId: conversation.id,
            role: 'user',
            text: 'Apply it after preview.',
            metadata: { source: 'confirmation' },
        });
        const updatedConversation = await service.upsertConversation({
            ...conversation,
            activeTaskId: 'asst_task_1',
            metadata: {
                ...(conversation.metadata || {}),
                lastContextSnapshotId: 'asst_context_1',
            },
        });

        const messages = await service.listMessages(conversation.id);

        expect(conversation).toMatchObject({
            userId: 'user_1',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            mode: 'owner',
            title: 'Update storefront',
            metadata: { source: 'dashboard_input', module: 'storefront' },
        });
        expect(updatedConversation).toMatchObject({
            id: conversation.id,
            activeTaskId: 'asst_task_1',
            metadata: expect.objectContaining({ lastContextSnapshotId: 'asst_context_1' }),
        });
        expect(messages).toHaveLength(2);
        expect(messages[0]).toMatchObject({
            role: 'assistant',
            contextSnapshotId: 'asst_context_1',
            memoryIds: ['asst_mem_1'],
            actionIds: ['asst_action_1'],
        });
        expect(messages[1]).toMatchObject({ role: 'user', text: 'Apply it after preview.' });
    });

    it('persists project and module context after guide-only navigation', async () => {
        const service = new GlobalAssistantConversationService(new InMemoryGlobalAssistantConversationAdapter());
        const conversation = await service.createConversation({
            userId: 'user_1',
            tenantId: 'tenant_1',
            projectId: 'project_old',
            mode: 'owner',
            title: 'Open ecommerce',
            metadata: { source: 'dashboard_input', guideOnly: true },
        });

        const updatedConversation = await service.upsertConversation({
            ...conversation,
            tenantId: 'tenant_2',
            projectId: 'project_new',
            activeTaskId: null,
            metadata: {
                ...(conversation.metadata || {}),
                lastNavigationTarget: 'ecommerce',
                lastNavigationModule: 'ecommerce',
                lastNavigationProjectId: 'project_new',
                lastNavigationProjectName: 'Ganova',
                lastHandoff: {
                    target: 'ecommerce',
                    module: 'ecommerce',
                    projectId: 'project_new',
                    projectName: 'Ganova',
                    tenantId: 'tenant_2',
                    route: '/ecommerce',
                    guideOnly: true,
                },
                memoryScope: {
                    userId: 'user_1',
                    tenantId: 'tenant_2',
                    projectId: 'project_new',
                    module: 'ecommerce',
                    sessionId: conversation.id,
                    taskId: null,
                    mode: 'owner',
                    guideOnly: true,
                },
                guideOnly: true,
            },
        });

        expect(updatedConversation).toMatchObject({
            tenantId: 'tenant_2',
            projectId: 'project_new',
            activeTaskId: null,
            metadata: expect.objectContaining({
                lastNavigationTarget: 'ecommerce',
                lastNavigationModule: 'ecommerce',
                lastNavigationProjectId: 'project_new',
                lastNavigationProjectName: 'Ganova',
                lastHandoff: expect.objectContaining({
                    target: 'ecommerce',
                    module: 'ecommerce',
                    projectId: 'project_new',
                    guideOnly: true,
                }),
                memoryScope: expect.objectContaining({
                    tenantId: 'tenant_2',
                    projectId: 'project_new',
                    module: 'ecommerce',
                    sessionId: conversation.id,
                    taskId: null,
                    guideOnly: true,
                }),
                guideOnly: true,
            }),
        });
    });

    it('records guide-only context snapshots for audit-linked messages', async () => {
        const adapter = new InMemoryGlobalAssistantConversationAdapter();
        const service = new GlobalAssistantConversationService(adapter);
        const conversation = await service.createConversation({
            userId: 'user_1',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            mode: 'user',
            title: 'Use Images',
            metadata: { guideOnly: true },
        });
        const context = resolveCurrentAssistantContext({
            conversationId: conversation.id,
            userId: 'user_1',
            tenantId: 'tenant_1',
            activeProject: {
                id: 'project_1',
                name: 'Ganova',
                status: 'Draft',
                tenantId: 'tenant_1',
                userId: 'user_1',
            },
            activeRoute: '/dashboard',
            activeModule: 'media',
            currentSurface: 'dashboard',
            snapshot: {
                guideOnly: true,
                memoryScopeHint: 'user_tenant_project_module_session_task',
            },
        });

        await service.recordContextSnapshot(context);
        await service.recordMessage({
            conversationId: conversation.id,
            role: 'assistant',
            text: 'Abrí Imágenes. Revisa las opciones y toca Generar.',
            contextSnapshotId: context.id,
            metadata: { source: 'direct_module_navigation', guideOnly: true },
        });

        expect(adapter.listContextSnapshots()).toEqual([
            expect.objectContaining({
                id: context.id,
                conversationId: conversation.id,
                activeModule: 'media',
                currentSurface: 'dashboard',
                snapshot: expect.objectContaining({ guideOnly: true }),
            }),
        ]);
        await expect(service.listMessages(conversation.id)).resolves.toEqual([
            expect.objectContaining({
                contextSnapshotId: context.id,
                metadata: expect.objectContaining({ guideOnly: true }),
            }),
        ]);
    });
});
