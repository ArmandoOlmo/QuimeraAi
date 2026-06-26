/**
 * useChatbotBusinessActions Hook
 * Canonical non-commerce Chatbot Engine action bridge for ChatCore.
 */

import { useCallback, useState } from 'react';
import type { ChatbotEngineSurfaceContext } from '../../../utils/chatbotEngine/surfaceContext';

const DEFAULT_WIDGET_API_BASE_URL = (import.meta.env.VITE_WIDGET_API_BASE_URL || '/api/widget').replace(/\/$/, '');

export type ChatbotHandoffPriority = 'low' | 'normal' | 'high' | 'urgent' | string;

export interface ChatbotBusinessActionOptions {
    apiBaseUrl?: string;
    sourceSurface?: string;
    sourceModule?: string;
    chatbotEngineContext?: ChatbotEngineSurfaceContext;
    consent?: boolean;
    marketingConsent?: boolean;
}

export interface HumanHandoffRequest {
    conversationId: string;
    reason?: string;
    priority?: ChatbotHandoffPriority;
    summary?: string;
    message?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    assignedTo?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface HumanHandoffResult {
    conversationId: string;
    status: string;
    duplicate: boolean;
    leadId?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const useChatbotBusinessActions = (
    projectId: string,
    _userId?: string,
    language: string = 'es',
    options: ChatbotBusinessActionOptions = {},
) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSpanish = language === 'es';
    const apiBaseUrl = (options.apiBaseUrl || DEFAULT_WIDGET_API_BASE_URL).replace(/\/$/, '');
    const sourceSurface = options.sourceSurface || options.chatbotEngineContext?.sourceSurface || 'website';
    const sourceModule = options.sourceModule || options.chatbotEngineContext?.sourceModule || 'chatcore';

    const buildPayload = useCallback((payload: Record<string, unknown> = {}) => ({
        ...payload,
        sourceSurface,
        sourceModule,
        consent: typeof payload.consent === 'boolean' ? payload.consent : options.consent,
        marketingConsent: options.marketingConsent,
        chatbotEngineContext: options.chatbotEngineContext,
        metadata: {
            sourceSurface,
            sourceModule,
            chatbotEngineContext: options.chatbotEngineContext,
            ...(isRecord(payload.metadata) ? payload.metadata : {}),
        },
    }), [sourceSurface, sourceModule, options.consent, options.marketingConsent, options.chatbotEngineContext]);

    const callWidgetApi = useCallback(async <T,>(path: string, payload: Record<string, unknown> = {}): Promise<T> => {
        if (!projectId) {
            throw new Error(isSpanish ? 'No se pudo conectar el asistente.' : 'Could not connect the assistant.');
        }

        const response = await fetch(`${apiBaseUrl}/${encodeURIComponent(projectId)}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(payload)),
        });

        if (!response.ok) {
            let message = `Widget API request failed (${response.status})`;
            try {
                const body = await response.json();
                message = body?.error || message;
            } catch {
                // Ignore malformed error bodies.
            }
            throw new Error(message);
        }

        return response.json();
    }, [apiBaseUrl, buildPayload, isSpanish, projectId]);

    const requestHumanHandoff = useCallback(async (
        input: HumanHandoffRequest,
    ): Promise<HumanHandoffResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const conversationId = input.conversationId?.trim();
            if (!conversationId) {
                throw new Error(isSpanish ? 'No hay conversacion activa para handoff.' : 'There is no active conversation for handoff.');
            }

            return await callWidgetApi<HumanHandoffResult>(`/conversations/${encodeURIComponent(conversationId)}/handoff`, {
                reason: input.reason,
                priority: input.priority,
                summary: input.summary,
                message: input.message,
                requesterName: input.requesterName,
                requesterEmail: input.requesterEmail,
                requesterPhone: input.requesterPhone,
                assignedTo: input.assignedTo,
                consent: input.consent,
                idempotencyKey: input.idempotencyKey,
                metadata: input.metadata,
            });
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al activar el handoff humano.' : 'Error requesting human handoff.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const formatHumanHandoffResponse = useCallback((result: HumanHandoffResult | null): string => {
        if (!result) {
            return isSpanish
                ? 'No pude activar el handoff humano ahora mismo. Compárteme tu email o teléfono y lo dejo listo para seguimiento.'
                : 'I could not request human handoff right now. Share your email or phone and I will prepare it for follow-up.';
        }

        if (result.duplicate) {
            return isSpanish
                ? 'Ya hay un handoff humano activo para esta conversación. El equipo puede verlo desde la bandeja.'
                : 'A human handoff is already active for this conversation. The team can see it in the inbox.';
        }

        return isSpanish
            ? 'Te conecto con el equipo humano. Dejé esta conversación marcada para atención en la bandeja.'
            : 'I am connecting you with the human team. I marked this conversation for attention in the inbox.';
    }, [isSpanish]);

    return {
        requestHumanHandoff,
        formatHumanHandoffResponse,
        isLoading,
        error,
    };
};

export default useChatbotBusinessActions;
