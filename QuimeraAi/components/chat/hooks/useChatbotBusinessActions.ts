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
    conversationId?: string | null;
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

export interface RestaurantReservationRequest {
    restaurantId: string;
    customerName?: string;
    name?: string;
    customerEmail?: string;
    email?: string;
    customerPhone?: string;
    phone?: string;
    date: string;
    time: string;
    partySize: number;
    tablePreference?: string;
    notes?: string;
    message?: string;
    conversationId?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface RestaurantReservationResult {
    reservationId?: string;
    status: string;
    leadId?: string | null;
    duplicate: boolean;
}

export interface RealtyLeadRequest {
    propertyId: string;
    openHouseId?: string;
    name?: string;
    customerName?: string;
    email?: string;
    customerEmail?: string;
    phone?: string;
    customerPhone?: string;
    message?: string;
    notes?: string;
    preferredDate?: string;
    budget?: number;
    conversationId?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface RealtyLeadResult {
    propertyLeadId?: string | null;
    crmLeadId?: string | null;
    pipelineEventType?: string;
    duplicate: boolean;
}

export interface EmailAudienceSubscriptionRequest {
    audienceId: string;
    email: string;
    name?: string;
    leadId?: string;
    customerId?: string;
    marketingConsent: boolean;
    consentSource?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface EmailAudienceSubscriptionResult {
    audienceId: string;
    email: string;
    staticMemberCount?: number;
}

export interface EmailFollowUpDraftRequest {
    email?: string;
    recipientEmail?: string;
    name?: string;
    recipientName?: string;
    leadId?: string;
    customerId?: string;
    conversationId?: string;
    subject?: string;
    html?: string;
    text?: string;
    sourceEvent?: string;
    marketingConsent: boolean;
    consentSource?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface EmailFollowUpDraftResult {
    email: string;
    emailLogId?: string;
    duplicate: boolean;
    status: string;
    reviewRequired: boolean;
    reviewQueueUrl?: string;
}

export interface FinanceQuoteRequestItem {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
}

export interface FinanceQuoteRequest {
    customerName?: string;
    customerEmail?: string;
    customerAddress?: string;
    description?: string;
    message?: string;
    amount?: number;
    currency?: string;
    items?: FinanceQuoteRequestItem[];
    dueDate?: string;
    paymentTerms?: string;
    leadId?: string;
    conversationId?: string;
    sourceEvent?: string;
    consent?: boolean;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
}

export interface FinanceQuoteResult {
    invoiceId?: string;
    invoiceNumber?: string;
    duplicate: boolean;
    status: string;
    total: number;
    currency: string;
    reviewRequired: boolean;
    paymentCreated: boolean;
    paymentLinkCreated: boolean;
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
        conversationId: typeof payload.conversationId === 'string' ? payload.conversationId : options.conversationId || undefined,
        consent: typeof payload.consent === 'boolean' ? payload.consent : options.consent,
        marketingConsent: typeof payload.marketingConsent === 'boolean' ? payload.marketingConsent : options.marketingConsent,
        chatbotEngineContext: options.chatbotEngineContext,
        metadata: {
            sourceSurface,
            sourceModule,
            chatbotEngineContext: options.chatbotEngineContext,
            ...(isRecord(payload.metadata) ? payload.metadata : {}),
        },
    }), [sourceSurface, sourceModule, options.conversationId, options.consent, options.marketingConsent, options.chatbotEngineContext]);

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

    const requestRestaurantReservation = useCallback(async (
        input: RestaurantReservationRequest,
    ): Promise<RestaurantReservationResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<RestaurantReservationResult>('/restaurant-reservations', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al crear la reserva del restaurante.' : 'Error creating restaurant reservation.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const requestRealtyShowing = useCallback(async (
        input: RealtyLeadRequest,
    ): Promise<RealtyLeadResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<RealtyLeadResult>('/realty-showings', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al crear la solicitud de propiedad.' : 'Error creating real estate request.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const registerOpenHouse = useCallback(async (
        input: RealtyLeadRequest,
    ): Promise<RealtyLeadResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<RealtyLeadResult>('/open-house-registrations', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al registrar el open house.' : 'Error registering open house.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const subscribeEmailAudience = useCallback(async (
        input: EmailAudienceSubscriptionRequest,
    ): Promise<EmailAudienceSubscriptionResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<EmailAudienceSubscriptionResult>('/email-audience-subscriptions', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al suscribir el contacto.' : 'Error subscribing contact.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const queueEmailFollowUpDraft = useCallback(async (
        input: EmailFollowUpDraftRequest,
    ): Promise<EmailFollowUpDraftResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<EmailFollowUpDraftResult>('/email-follow-up-drafts', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al crear el borrador de seguimiento.' : 'Error creating follow-up draft.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const createFinanceQuoteRequest = useCallback(async (
        input: FinanceQuoteRequest,
    ): Promise<FinanceQuoteResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<FinanceQuoteResult>('/finance/quote-requests', input as unknown as Record<string, unknown>);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al crear el borrador financiero.' : 'Error creating finance draft.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    return {
        requestHumanHandoff,
        requestRestaurantReservation,
        requestRealtyShowing,
        registerOpenHouse,
        subscribeEmailAudience,
        queueEmailFollowUpDraft,
        createFinanceQuoteRequest,
        formatHumanHandoffResponse,
        isLoading,
        error,
    };
};

export default useChatbotBusinessActions;
