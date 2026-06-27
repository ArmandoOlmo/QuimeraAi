import { describe, expect, it } from 'vitest';
import {
    buildDirectConversationAuditIdempotencyKey,
    buildDirectConversationAuditMetadata,
    buildDirectParticipantUpdateAuditIdempotencyKey,
} from '../../utils/chatbotEngine/directConversationAudit';

describe('directConversationAudit', () => {
    it('builds deterministic project-scoped idempotency keys for direct ChatCore persistence', () => {
        expect(buildDirectConversationAuditIdempotencyKey('project_1', [
            'message',
            'Message 1',
            null,
            'Lead/ABC',
        ])).toBe('chatbot-engine-direct:project_1:message:message-1:none:lead-abc');
    });

    it('marks authenticated direct persistence events as canonical Chatbot Engine metadata', () => {
        const metadata = buildDirectConversationAuditMetadata({
            sessionId: 'session_123',
            sourceSurface: 'admin_preview',
            sourceModule: 'chatcore',
            chatbotEngineContext: {
                sourceSurface: 'admin_preview',
                sourceModule: 'chatcore',
                contextKeys: ['test_lab'],
                metadata: { route: 'chatbot-engine/test-lab' },
            },
            metadata: {
                role: 'user',
                messageLength: 42,
            },
        });

        expect(metadata).toEqual({
            directClientPersistence: true,
            sessionId: 'session_123',
            sourceSurface: 'admin_preview',
            sourceModule: 'chatcore',
            chatbotEngineContext: {
                sourceSurface: 'admin_preview',
                sourceModule: 'chatcore',
                contextKeys: ['test_lab'],
                metadata: { route: 'chatbot-engine/test-lab' },
            },
            role: 'user',
            messageLength: 42,
        });
    });

    it('uses deterministic idempotency for participant updates', () => {
        const first = buildDirectParticipantUpdateAuditIdempotencyKey('project_1', {
            conversationId: 'conversation_1',
            name: 'Ana Cliente',
            email: 'Ana@Example.com',
            phone: '+1 (787) 555-1111',
        });
        const retry = buildDirectParticipantUpdateAuditIdempotencyKey('project_1', {
            conversationId: 'conversation_1',
            name: 'Ana Cliente',
            email: 'Ana@Example.com',
            phone: '+1 (787) 555-1111',
        });
        const changedPhone = buildDirectParticipantUpdateAuditIdempotencyKey('project_1', {
            conversationId: 'conversation_1',
            name: 'Ana Cliente',
            email: 'Ana@Example.com',
            phone: '+1 (787) 555-2222',
        });

        expect(retry).toBe(first);
        expect(changedPhone).not.toBe(first);
        expect(first).toBe('chatbot-engine-direct:project_1:participant:conversation_1:ana-cliente:ana-example.com:1-787-555-1111');
    });
});
