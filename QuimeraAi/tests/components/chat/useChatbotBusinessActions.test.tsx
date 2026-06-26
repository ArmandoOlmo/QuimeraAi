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

const readFetchBody = (callIndex: number) => JSON.parse(String(vi.mocked(fetch).mock.calls[callIndex][1]?.body));

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

    it('requests restaurant reservations through the canonical audited widget endpoint', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            reservationId: 'reservation-1',
            status: 'pending',
            leadId: 'lead-1',
            duplicate: false,
        }) as Response);

        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'restaurant_menu',
            sourceModule: 'restaurants',
            consent: true,
            chatbotEngineContext,
        }));

        let reservation: Awaited<ReturnType<typeof result.current.requestRestaurantReservation>> = null;
        await act(async () => {
            reservation = await result.current.requestRestaurantReservation({
                restaurantId: 'restaurant-1',
                customerName: 'Ana Rivera',
                customerEmail: 'ana@example.com',
                date: '2026-07-10',
                time: '19:00',
                partySize: 4,
                notes: 'Mesa cerca de la ventana',
                idempotencyKey: 'reservation-key',
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/restaurant-reservations', expect.objectContaining({
            method: 'POST',
        }));
        expect(readFetchBody(0)).toMatchObject({
            restaurantId: 'restaurant-1',
            customerName: 'Ana Rivera',
            customerEmail: 'ana@example.com',
            sourceSurface: 'restaurant_menu',
            sourceModule: 'restaurants',
            consent: true,
            idempotencyKey: 'reservation-key',
        });
        expect(reservation).toMatchObject({ reservationId: 'reservation-1', leadId: 'lead-1', duplicate: false });
    });

    it('routes realty requests and open house registrations with surface context', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(okJson({
                propertyLeadId: 'property-lead-1',
                crmLeadId: 'lead-1',
                pipelineEventType: 'showing_request',
                duplicate: false,
            }) as Response)
            .mockResolvedValueOnce(okJson({
                propertyLeadId: 'property-lead-2',
                crmLeadId: 'lead-2',
                pipelineEventType: 'open_house_registration',
                duplicate: false,
            }) as Response);

        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'en', {
            apiBaseUrl: '/widget',
            sourceSurface: 'realty_property_page',
            sourceModule: 'realty',
            chatbotEngineContext,
        }));

        await act(async () => {
            await result.current.requestRealtyShowing({
                propertyId: 'property-1',
                name: 'Luis Vega',
                email: 'luis@example.com',
                preferredDate: '2026-07-08T15:00:00.000Z',
                idempotencyKey: 'showing-key',
            });
            await result.current.registerOpenHouse({
                propertyId: 'property-1',
                openHouseId: 'open-house-1',
                name: 'Mia Cruz',
                email: 'mia@example.com',
                idempotencyKey: 'open-house-key',
            });
        });

        expect(fetchMock.mock.calls[0][0]).toBe('/widget/project-1/realty-showings');
        expect(readFetchBody(0)).toMatchObject({
            propertyId: 'property-1',
            sourceSurface: 'realty_property_page',
            sourceModule: 'realty',
            idempotencyKey: 'showing-key',
        });
        expect(fetchMock.mock.calls[1][0]).toBe('/widget/project-1/open-house-registrations');
        expect(readFetchBody(1)).toMatchObject({
            propertyId: 'property-1',
            openHouseId: 'open-house-1',
            sourceSurface: 'realty_property_page',
            sourceModule: 'realty',
            idempotencyKey: 'open-house-key',
        });
    });

    it('passes per-action marketing consent into Email Marketing drafts', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock
            .mockResolvedValueOnce(okJson({
                audienceId: 'audience-1',
                email: 'lead@example.com',
                staticMemberCount: 1,
            }) as Response)
            .mockResolvedValueOnce(okJson({
                email: 'lead@example.com',
                emailLogId: 'email-log-1',
                duplicate: false,
                status: 'skipped',
                reviewRequired: true,
                reviewQueueUrl: '/dashboard/email?review=chatbot',
            }) as Response);

        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            marketingConsent: false,
            chatbotEngineContext,
        }));

        await act(async () => {
            await result.current.subscribeEmailAudience({
                audienceId: 'audience-1',
                email: 'lead@example.com',
                name: 'Lead Contact',
                marketingConsent: true,
                consentSource: 'chatcore-test',
            });
            await result.current.queueEmailFollowUpDraft({
                email: 'lead@example.com',
                leadId: 'lead-1',
                subject: 'Seguimiento',
                text: 'Borrador para revisar.',
                marketingConsent: true,
                idempotencyKey: 'follow-up-key',
            });
        });

        expect(fetchMock.mock.calls[0][0]).toBe('/widget/project-1/email-audience-subscriptions');
        expect(readFetchBody(0)).toMatchObject({
            audienceId: 'audience-1',
            marketingConsent: true,
            consentSource: 'chatcore-test',
            sourceModule: 'chatcore',
        });
        expect(fetchMock.mock.calls[1][0]).toBe('/widget/project-1/email-follow-up-drafts');
        expect(readFetchBody(1)).toMatchObject({
            email: 'lead@example.com',
            leadId: 'lead-1',
            marketingConsent: true,
            idempotencyKey: 'follow-up-key',
        });
    });

    it('creates Finance quote request drafts without payment creation from the client bridge', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            invoiceId: 'invoice-1',
            invoiceNumber: 'QTE-1',
            duplicate: false,
            status: 'draft',
            total: 250,
            currency: 'USD',
            reviewRequired: true,
            paymentCreated: false,
            paymentLinkCreated: false,
        }) as Response);

        const { result } = renderHook(() => useChatbotBusinessActions('project-1', 'owner-1', 'en', {
            apiBaseUrl: '/widget',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            conversationId: 'conversation-1',
        }));

        let quote: Awaited<ReturnType<typeof result.current.createFinanceQuoteRequest>> = null;
        await act(async () => {
            quote = await result.current.createFinanceQuoteRequest({
                customerName: 'Lead Contact',
                customerEmail: 'lead@example.com',
                description: 'Formal quote for consultation',
                amount: 250,
                currency: 'usd',
                leadId: 'lead-1',
                idempotencyKey: 'finance-key',
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/finance/quote-requests', expect.objectContaining({
            method: 'POST',
        }));
        expect(readFetchBody(0)).toMatchObject({
            customerEmail: 'lead@example.com',
            amount: 250,
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: 'finance-key',
        });
        expect(quote).toMatchObject({
            invoiceId: 'invoice-1',
            status: 'draft',
            paymentCreated: false,
            paymentLinkCreated: false,
        });
    });
});
