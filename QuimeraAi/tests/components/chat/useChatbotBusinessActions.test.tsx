import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatbotBusinessActions } from '../../../components/chat/hooks/useChatbotBusinessActions';

const chatbotEngineContext = {
    sourceSurface: 'website' as const,
    sourceModule: 'chatcore',
    contextKeys: ['website', 'chatcore'],
    metadata: {
        routeView: 'home',
    },
};

const okJson = (body: unknown) => ({
    ok: true,
    status: 201,
    json: async () => body,
});

describe('useChatbotBusinessActions canonical actions', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('requests human handoff through the canonical conversation endpoint with surface context', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            conversationId: 'conversation-1',
            status: 'escalated',
            duplicate: false,
            leadId: 'lead-1',
        }) as Response);

        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            consent: true,
            chatbotEngineContext,
        }));

        let handoff: Awaited<ReturnType<typeof result.current.requestHumanHandoff>> = null;
        await act(async () => {
            handoff = await result.current.requestHumanHandoff({
                conversationId: 'conversation-1',
                reason: 'support',
                priority: 'high',
                summary: 'Necesito hablar con un agente',
                requesterName: 'Ana',
                requesterEmail: 'ana@example.com',
                requesterPhone: '+1 787 555 0101',
                idempotencyKey: 'handoff-key',
                metadata: {
                    sourceComponent: 'ChatCore',
                },
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/conversations/conversation-1/handoff', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }));
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body).toMatchObject({
            reason: 'support',
            priority: 'high',
            summary: 'Necesito hablar con un agente',
            requesterName: 'Ana',
            requesterEmail: 'ana@example.com',
            requesterPhone: '+1 787 555 0101',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            consent: true,
            idempotencyKey: 'handoff-key',
        });
        expect(body.chatbotEngineContext).toMatchObject({ sourceSurface: 'website', sourceModule: 'chatcore' });
        expect(body.metadata).toMatchObject({
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            sourceComponent: 'ChatCore',
        });
        expect(handoff).toMatchObject({
            conversationId: 'conversation-1',
            status: 'escalated',
            duplicate: false,
            leadId: 'lead-1',
        });
        expect(result.current.formatHumanHandoffResponse(handoff)).toContain('equipo humano');
    });

    it('formats duplicate human handoffs in English', async () => {
        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'en', {
            apiBaseUrl: '/widget',
        }));

        expect(result.current.formatHumanHandoffResponse({
            conversationId: 'conversation-1',
            status: 'escalated',
            duplicate: true,
        })).toContain('already active');
    });
});
