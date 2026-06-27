import { describe, expect, it, vi } from 'vitest';
import {
    assignChatbotEngineHandoff,
    buildChatbotEngineRuntimeSnapshot,
    getChatbotEngineRuntimeSnapshot,
    resolveChatbotEngineHandoff,
    type ChatbotEngineRuntimeEvent,
} from '../../services/chatbotEngine/chatbotEngineDashboardService';

function createQueryResult(data: unknown[] | null, error: { message: string } | null = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(async () => ({ data, error })),
    };
    return query;
}

function createMaybeSingleQuery(data: unknown, error: { message: string } | null = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        update: vi.fn(() => query),
        insert: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data, error })),
    };
    return query;
}

describe('chatbotEngineDashboardService', () => {
    it('builds analytics and inbox summaries from runtime events and conversations', () => {
        const events: ChatbotEngineRuntimeEvent[] = [
            {
                id: 'event_1',
                eventType: 'chatbot_action_executed',
                actionType: 'create_lead',
                actionStatus: 'executed',
                sourceSurface: 'website',
                sourceModule: 'website-builder',
                leadId: 'lead_1',
                metadata: {},
                createdAt: '2026-06-26T10:00:00.000Z',
            },
            {
                id: 'event_2',
                eventType: 'chatbot_action_blocked',
                actionType: 'create_appointment',
                actionStatus: 'blocked',
                sourceSurface: 'booking_page',
                sourceModule: 'appointments',
                appointmentId: null,
                metadata: {},
                createdAt: '2026-06-26T09:00:00.000Z',
            },
            {
                id: 'event_3',
                eventType: 'chatbot_intent_analyzed',
                actionType: 'analyze_intent',
                actionStatus: 'observed',
                sourceSurface: 'checkout',
                sourceModule: 'ecommerce',
                metadata: {
                    intent: {
                        primaryIntent: 'checkout_intent',
                        urgency: 'high',
                    },
                },
                createdAt: '2026-06-26T08:00:00.000Z',
            },
            {
                id: 'event_4',
                eventType: 'chatbot_ecommerce_product_inquiry',
                actionType: 'create_product_inquiry',
                actionStatus: 'executed',
                sourceSurface: 'storefront',
                sourceModule: 'ecommerce',
                metadata: {},
                createdAt: '2026-06-26T07:00:00.000Z',
            },
            {
                id: 'event_5',
                eventType: 'chatbot_email_audience_subscribed',
                actionType: 'subscribe_email_audience',
                actionStatus: 'executed',
                sourceSurface: 'website',
                sourceModule: 'email-marketing',
                metadata: {},
                createdAt: '2026-06-26T06:00:00.000Z',
            },
            {
                id: 'event_6',
                eventType: 'chatbot_restaurant_reservation_requested',
                actionType: 'request_restaurant_reservation',
                actionStatus: 'executed',
                sourceSurface: 'restaurant_menu',
                sourceModule: 'restaurants',
                metadata: {},
                createdAt: '2026-06-26T05:00:00.000Z',
            },
            {
                id: 'event_7',
                eventType: 'chatbot_realty_showing_requested',
                actionType: 'request_realty_showing',
                actionStatus: 'executed',
                sourceSurface: 'realty_property_page',
                sourceModule: 'real-estate',
                metadata: {},
                createdAt: '2026-06-26T04:00:00.000Z',
            },
            {
                id: 'event_8',
                eventType: 'chatbot_finance_quote_request_created',
                actionType: 'create_finance_quote_request',
                actionStatus: 'executed',
                sourceSurface: 'admin_preview',
                sourceModule: 'finance',
                metadata: {},
                createdAt: '2026-06-26T03:30:00.000Z',
            },
            {
                id: 'event_9',
                eventType: 'chatbot_handoff_requested',
                actionType: 'handoff_to_human',
                actionStatus: 'executed',
                sourceSurface: 'bio_page',
                sourceModule: 'bio-page',
                metadata: {},
                createdAt: '2026-06-26T03:00:00.000Z',
            },
            {
                id: 'event_10',
                eventType: 'chatbot_media_asset_requested',
                actionType: 'request_media_asset',
                actionStatus: 'executed',
                sourceSurface: 'website',
                sourceModule: 'media-ai',
                metadata: {},
                createdAt: '2026-06-26T02:30:00.000Z',
            },
            {
                id: 'event_11',
                eventType: 'chatbot_voice_session_started',
                actionType: 'record_analytics_event',
                actionStatus: 'observed',
                sourceSurface: 'website',
                sourceModule: 'chatcore',
                conversationId: 'conversation_1',
                metadata: {
                    runtimeEventType: 'chatbot_voice_session_started',
                    voice: {
                        provider: 'elevenlabs',
                        consentAccepted: true,
                        agentConfigured: true,
                    },
                },
                createdAt: '2026-06-26T02:00:00.000Z',
            },
        ];

        const snapshot = buildChatbotEngineRuntimeSnapshot({
            projectId: 'project_chatbot',
            events,
            conversations: [
                {
                    id: 'conversation_1',
                    channel: 'web',
                    status: 'active',
                    messageCount: 3,
                    unreadCount: 2,
                    leadId: 'lead_1',
                    tags: [],
                    metadata: {},
                    lastMessageAt: '2026-06-26T10:00:00.000Z',
                },
                {
                    id: 'conversation_2',
                    channel: 'web',
                    status: 'escalated',
                    messageCount: 8,
                    unreadCount: 1,
                    participantName: 'Marta',
                    participantEmail: 'marta@example.com',
                    assignedTo: 'agent_1',
                    tags: [],
                    metadata: {
                        chatbotEngineHandoff: {
                            requestedAt: '2026-06-26T09:35:00.000Z',
                            reason: 'pricing',
                            priority: 'high',
                            summary: 'Buyer wants a human follow-up.',
                            requesterName: 'Marta Cruz',
                            sourceSurface: 'storefront',
                        },
                    },
                    lastMessageAt: '2026-06-26T09:30:00.000Z',
                },
            ],
        });

        expect(snapshot.analytics).toMatchObject({
            totalEvents: 11,
            executedActions: 8,
            blockedActions: 1,
            observedEvents: 2,
            leadEvents: 1,
            appointmentEvents: 1,
            handoffEvents: 1,
            ecommerceEvents: 2,
            emailMarketingEvents: 1,
            financeEvents: 1,
            mediaEvents: 1,
            restaurantEvents: 1,
            realtyEvents: 1,
            voiceEvents: 1,
            highIntentEvents: 1,
            lastEventAt: '2026-06-26T10:00:00.000Z',
        });
        expect(snapshot.analytics.actionBreakdown[0]).toEqual({ actionType: 'create_lead', count: 1 });
        expect(snapshot.analytics.intentBreakdown[0]).toEqual({ intent: 'checkout_intent', count: 1 });
        expect(snapshot.analytics.surfaceBreakdown).toEqual([
            { sourceSurface: 'website', count: 4 },
            { sourceSurface: 'admin_preview', count: 1 },
            { sourceSurface: 'bio_page', count: 1 },
            { sourceSurface: 'booking_page', count: 1 },
            { sourceSurface: 'checkout', count: 1 },
            { sourceSurface: 'realty_property_page', count: 1 },
            { sourceSurface: 'restaurant_menu', count: 1 },
            { sourceSurface: 'storefront', count: 1 },
        ]);
        expect(snapshot.analytics.moduleBreakdown).toEqual([
            { sourceModule: 'ecommerce', count: 2 },
            { sourceModule: 'appointments', count: 1 },
            { sourceModule: 'bio-page', count: 1 },
            { sourceModule: 'chatcore', count: 1 },
            { sourceModule: 'email-marketing', count: 1 },
            { sourceModule: 'finance', count: 1 },
            { sourceModule: 'media-ai', count: 1 },
            { sourceModule: 'real-estate', count: 1 },
            { sourceModule: 'restaurants', count: 1 },
            { sourceModule: 'website-builder', count: 1 },
        ]);
        expect(snapshot.inbox).toMatchObject({
            activeConversations: 1,
            escalatedConversations: 1,
            unreadMessages: 3,
            linkedLeads: 1,
            lastConversationAt: '2026-06-26T10:00:00.000Z',
        });
        expect(snapshot.handoffs).toEqual([
            expect.objectContaining({
                conversationId: 'conversation_2',
                participantName: 'Marta',
                participantEmail: 'marta@example.com',
                assignedTo: 'agent_1',
                reason: 'pricing',
                priority: 'high',
                summary: 'Buyer wants a human follow-up.',
                requesterName: 'Marta Cruz',
                sourceSurface: 'storefront',
                requestedAt: '2026-06-26T09:35:00.000Z',
                unreadCount: 1,
            }),
        ]);
    });

    it('excludes resolved handoffs from the waiting queue', () => {
        const snapshot = buildChatbotEngineRuntimeSnapshot({
            projectId: 'project_chatbot',
            conversations: [
                {
                    id: 'conversation_resolved',
                    channel: 'web',
                    status: 'closed',
                    messageCount: 6,
                    unreadCount: 0,
                    tags: ['web-chat', 'chatbot-handoff', 'handoff:support'],
                    metadata: {
                        chatbotEngineHandoff: {
                            status: 'resolved',
                            reason: 'support',
                            resolvedAt: '2026-06-26T10:00:00.000Z',
                        },
                    },
                    lastMessageAt: '2026-06-26T10:00:00.000Z',
                },
            ],
        });

        expect(snapshot.handoffs).toEqual([]);
        expect(snapshot.inbox.escalatedConversations).toBe(0);
    });

    it('loads and normalizes runtime rows from Supabase-like clients', async () => {
        const eventsQuery = createQueryResult([
            {
                id: 'event_1',
                event_type: 'chatbot_action_executed',
                action_type: 'create_lead',
                action_status: 'executed',
                source_surface: 'website',
                source_module: 'chatcore',
                conversation_id: null,
                lead_id: 'lead_1',
                appointment_id: null,
                correlation_id: 'corr_1',
                metadata: { reason: 'action_executed' },
                created_at: '2026-06-26T10:00:00.000Z',
            },
        ]);
        const conversationsQuery = createQueryResult([
            {
                id: 'conversation_1',
                channel: 'web',
                participant_name: 'Ada',
                participant_email: 'ada@example.com',
                status: 'active',
                last_message_at: '2026-06-26T10:01:00.000Z',
                message_count: 4,
                unread_count: 2,
                lead_id: 'lead_1',
                assigned_to: null,
                tags: ['web-chat', 'handoff:support'],
                metadata: { source: 'widget', sourceSurface: 'website' },
            },
        ]);
        const client = {
            from: vi.fn((table: string) => table === 'chatbot_engine_events' ? eventsQuery : conversationsQuery),
        };

        const snapshot = await getChatbotEngineRuntimeSnapshot('project_chatbot', client as any);

        expect(client.from).toHaveBeenCalledWith('chatbot_engine_events');
        expect(client.from).toHaveBeenCalledWith('social_conversations');
        expect(eventsQuery.eq).toHaveBeenCalledWith('project_id', 'project_chatbot');
        expect(conversationsQuery.eq).toHaveBeenCalledWith('project_id', 'project_chatbot');
        expect(snapshot.events[0]).toMatchObject({
            eventType: 'chatbot_action_executed',
            actionType: 'create_lead',
            actionStatus: 'executed',
            leadId: 'lead_1',
        });
        expect(snapshot.conversations[0]).toMatchObject({
            participantName: 'Ada',
            unreadCount: 2,
            tags: ['web-chat', 'handoff:support'],
        });
        expect(snapshot.handoffs[0]).toMatchObject({
            conversationId: 'conversation_1',
            reason: 'support',
            priority: 'normal',
            sourceSurface: 'website',
        });
    });

    it('returns partial snapshots with warnings when a runtime table is unavailable', async () => {
        const eventsQuery = createQueryResult(null, { message: 'relation does not exist' });
        const conversationsQuery = createQueryResult([]);
        const client = {
            from: vi.fn((table: string) => table === 'chatbot_engine_events' ? eventsQuery : conversationsQuery),
        };

        const snapshot = await getChatbotEngineRuntimeSnapshot('project_chatbot', client as any);

        expect(snapshot.events).toEqual([]);
        expect(snapshot.conversations).toEqual([]);
        expect(snapshot.warnings[0]).toContain('events:relation does not exist');
    });

    it('assigns a handoff to the current project member and writes an audit event', async () => {
        const actorId = '11111111-1111-4111-8111-111111111111';
        const loadConversation = createMaybeSingleQuery({
            id: 'conversation_1',
            status: 'escalated',
            tags: ['web-chat', 'chatbot-handoff'],
            metadata: {
                chatbotEngineHandoff: {
                    requestedAt: '2026-06-26T09:00:00.000Z',
                    reason: 'pricing',
                    priority: 'high',
                },
            },
            notes: null,
            lead_id: 'lead_1',
            assigned_to: null,
            unread_count: 3,
        });
        const updateConversation = createMaybeSingleQuery({
            id: 'conversation_1',
            status: 'escalated',
            assigned_to: actorId,
        });
        const eventInsert = createMaybeSingleQuery({ id: 'event_1' });
        const socialQueries = [loadConversation, updateConversation];
        const client = {
            from: vi.fn((table: string) => table === 'social_conversations' ? socialQueries.shift() : eventInsert),
        };

        const result = await assignChatbotEngineHandoff('project_chatbot', {
            conversationId: 'conversation_1',
            actorId,
            now: '2026-06-26T10:00:00.000Z',
            idempotencyKey: 'assign-key-1',
        }, client as any);

        expect(result).toMatchObject({
            projectId: 'project_chatbot',
            conversationId: 'conversation_1',
            action: 'assign',
            status: 'escalated',
            assignedTo: actorId,
            duplicate: false,
            eventId: 'event_1',
        });
        expect(updateConversation.update).toHaveBeenCalledWith(expect.objectContaining({
            assigned_to: actorId,
            status: 'escalated',
            tags: ['web-chat', 'chatbot-handoff', 'handoff:pricing'],
            metadata: expect.objectContaining({
                chatbotEngineHandoff: expect.objectContaining({
                    status: 'assigned',
                    assignedBy: actorId,
                    assigneeId: actorId,
                    assignmentIdempotencyKey: 'assign-key-1',
                }),
            }),
        }));
        expect(eventInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            project_id: 'project_chatbot',
            conversation_id: 'conversation_1',
            lead_id: 'lead_1',
            event_type: 'chatbot_handoff_assigned',
            action_type: 'handoff_to_human',
            action_status: 'executed',
            source_surface: 'admin_dashboard',
            actor_type: 'project_user',
            actor_id: actorId,
            idempotency_key: 'assign-key-1',
        }));
    });

    it('resolves a handoff, removes it from the queue tags, and records the dashboard event', async () => {
        const actorId = '22222222-2222-4222-8222-222222222222';
        const loadConversation = createMaybeSingleQuery({
            id: 'conversation_2',
            status: 'escalated',
            tags: ['web-chat', 'chatbot-handoff', 'handoff:pricing', 'vip'],
            metadata: {
                chatbotEngineHandoff: {
                    requestedAt: '2026-06-26T09:00:00.000Z',
                    reason: 'pricing',
                    priority: 'high',
                    status: 'assigned',
                    assigneeId: actorId,
                },
            },
            notes: 'Existing note',
            lead_id: 'lead_2',
            assigned_to: actorId,
            unread_count: 2,
        });
        const updateConversation = createMaybeSingleQuery({
            id: 'conversation_2',
            status: 'closed',
            assigned_to: actorId,
        });
        const eventInsert = createMaybeSingleQuery({ id: 'event_2' });
        const socialQueries = [loadConversation, updateConversation];
        const client = {
            from: vi.fn((table: string) => table === 'social_conversations' ? socialQueries.shift() : eventInsert),
        };

        const result = await resolveChatbotEngineHandoff('project_chatbot', {
            conversationId: 'conversation_2',
            actorId,
            note: 'Customer was contacted.',
            now: '2026-06-26T10:30:00.000Z',
            idempotencyKey: 'resolve-key-1',
        }, client as any);

        expect(result).toMatchObject({
            projectId: 'project_chatbot',
            conversationId: 'conversation_2',
            action: 'resolve',
            status: 'closed',
            assignedTo: actorId,
            duplicate: false,
            eventId: 'event_2',
        });
        expect(updateConversation.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'closed',
            unread_count: 0,
            tags: ['web-chat', 'vip'],
            notes: expect.stringContaining('Chatbot handoff resolved: Customer was contacted.'),
            metadata: expect.objectContaining({
                chatbotEngineHandoff: expect.objectContaining({
                    status: 'resolved',
                    resolvedBy: actorId,
                    resolutionNote: 'Customer was contacted.',
                    resolutionIdempotencyKey: 'resolve-key-1',
                }),
            }),
        }));
        expect(eventInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            project_id: 'project_chatbot',
            conversation_id: 'conversation_2',
            lead_id: 'lead_2',
            event_type: 'chatbot_handoff_resolved',
            action_type: 'handoff_to_human',
            action_status: 'executed',
            source_surface: 'admin_dashboard',
            actor_type: 'project_user',
            actor_id: actorId,
            idempotency_key: 'resolve-key-1',
        }));
    });
});
