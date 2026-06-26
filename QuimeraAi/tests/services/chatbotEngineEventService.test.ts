import { describe, expect, it, vi } from 'vitest';
import { recordChatbotEngineEvent } from '../../services/chatbotEngine/chatbotEngineEventService';
import type { ChatbotEngineAuditEvent } from '../../utils/chatbotEngine/actionRegistry';

function createQuery(data: unknown, error: { code?: string; message: string; details?: string } | null = null) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data, error })),
    };
    return query;
}

function createEvent(overrides: Partial<ChatbotEngineAuditEvent> = {}): ChatbotEngineAuditEvent {
    return {
        project_id: 'project-1',
        event_type: 'chatbot_action_executed',
        action_type: 'create_lead',
        action_status: 'executed',
        source_surface: 'website',
        source_module: 'chatbot-engine',
        idempotency_key: 'chatbot-engine:project-1:create-lead:lead@example.com',
        actor_type: 'visitor',
        actor_id: undefined,
        metadata: { reason: 'action_executed' },
        ...overrides,
    };
}

describe('chatbotEngineEventService', () => {
    it('records a scoped audit event and strips undefined values', async () => {
        const insertQuery = createQuery({ id: 'event-1' });
        const client = {
            from: vi.fn(() => insertQuery),
        };

        const result = await recordChatbotEngineEvent(client as any, createEvent());

        expect(result).toEqual({ id: 'event-1' });
        expect(client.from).toHaveBeenCalledWith('chatbot_engine_events');
        expect(insertQuery.insert).toHaveBeenCalledWith(expect.not.objectContaining({ actor_id: undefined }));
        expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            idempotency_key: 'chatbot-engine:project-1:create-lead:lead@example.com',
        }));
    });

    it('returns the existing event when a replay hits the idempotency index', async () => {
        const insertQuery = createQuery(null, {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
            details: 'Key exists in chatbot_engine_events_project_event_idempotency_uidx.',
        });
        const lookupQuery = createQuery({ id: 'event-existing' });
        const client = {
            from: vi.fn()
                .mockReturnValueOnce(insertQuery)
                .mockReturnValueOnce(lookupQuery),
        };

        const result = await recordChatbotEngineEvent(client as any, createEvent());

        expect(result).toEqual({ id: 'event-existing', duplicate: true });
        expect(lookupQuery.select).toHaveBeenCalledWith('id');
        expect(lookupQuery.eq).toHaveBeenNthCalledWith(1, 'project_id', 'project-1');
        expect(lookupQuery.eq).toHaveBeenNthCalledWith(2, 'event_type', 'chatbot_action_executed');
        expect(lookupQuery.eq).toHaveBeenNthCalledWith(3, 'idempotency_key', 'chatbot-engine:project-1:create-lead:lead@example.com');
    });

    it('skips events without project scope or event type', async () => {
        const client = { from: vi.fn() };

        const result = await recordChatbotEngineEvent(client as any, createEvent({ project_id: '' }));

        expect(result).toEqual({ warning: 'chatbot_engine_event_skipped_missing_scope' });
        expect(client.from).not.toHaveBeenCalled();
    });
});
