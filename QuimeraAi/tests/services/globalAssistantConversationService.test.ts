import { describe, expect, it } from 'vitest';
import {
    GlobalAssistantConversationService,
    InMemoryGlobalAssistantConversationAdapter,
} from '../../services/globalAssistant/globalAssistantConversationService.ts';

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
});
