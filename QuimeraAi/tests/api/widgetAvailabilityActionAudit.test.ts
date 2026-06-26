import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
    getAvailableAppointmentSlots: vi.fn(),
    requestChatbotRestaurantReservation: vi.fn(),
    createChatbotEcommerceProductInquiry: vi.fn(),
    queueChatbotEmailFollowUpDraft: vi.fn(),
    getOrCreateConversation: vi.fn(),
    saveConversationMessage: vi.fn(),
    updateConversationParticipant: vi.fn(),
    linkConversationToLead: vi.fn(),
    recordedEvents: [] as Record<string, any>[],
    projectRow: null as Record<string, any> | null,
}));

vi.mock('../../services/appointments/appointmentEngineService.js', () => ({
    createAppointmentFromChat: vi.fn(),
    createAppointmentFromPublicBooking: vi.fn(),
    getAppointmentsByProject: vi.fn(),
    getAvailableAppointmentSlots: (...args: any[]) => mockState.getAvailableAppointmentSlots(...args),
}));

vi.mock('../../services/chatbotEngine/chatbotEngineRuntimeActionService.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../services/chatbotEngine/chatbotEngineRuntimeActionService.js')>();
    return {
        ...actual,
        requestChatbotRestaurantReservation: (...args: any[]) => mockState.requestChatbotRestaurantReservation(...args),
        createChatbotEcommerceProductInquiry: (...args: any[]) => mockState.createChatbotEcommerceProductInquiry(...args),
        queueChatbotEmailFollowUpDraft: (...args: any[]) => mockState.queueChatbotEmailFollowUpDraft(...args),
    };
});

vi.mock('../../services/chatbot/chatbotEngineService.js', () => ({
    getOrCreateConversation: (...args: any[]) => mockState.getOrCreateConversation(...args),
    saveConversationMessage: (...args: any[]) => mockState.saveConversationMessage(...args),
    updateConversationParticipant: (...args: any[]) => mockState.updateConversationParticipant(...args),
    linkConversationToLead: (...args: any[]) => mockState.linkConversationToLead(...args),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
    getSupabaseAdmin: () => ({
        auth: {
            getUser: vi.fn(),
        },
        from: (table: string) => createSupabaseTableQuery(table),
    }),
}));

function createAction(overrides: Record<string, any> = {}) {
    return {
        id: 'chatbot-action-check_availability',
        actionType: 'check_availability',
        ownerModule: 'appointments',
        enabled: true,
        publicAllowed: true,
        requiresConfirmation: false,
        requiresAuth: false,
        requiresConsent: false,
        requiresReview: false,
        idempotencyRequired: false,
        auditLogRequired: true,
        status: 'configured',
        readiness: { isReady: true, blockers: [], warnings: [] },
        needsReview: false,
        ...overrides,
    };
}

function createProject(actionOverrides: Record<string, any> = {}) {
    return {
        id: 'project-1',
        tenant_id: 'tenant-1',
        user_id: 'owner-1',
        name: 'Ganova',
        status: 'Published',
        published_at: '2026-06-26T00:00:00.000Z',
        data: {
            businessBlueprint: {
                schemaVersion: 1,
                blueprintVersion: '1.0.0',
                generatedAt: '2026-06-26T00:00:00.000Z',
                updatedAt: '2026-06-26T00:00:00.000Z',
                businessProfile: {
                    businessName: 'Ganova',
                    industry: 'services',
                    description: 'Operational consulting.',
                    services: [],
                    contactInfo: {},
                },
                brandProfile: {
                    colors: { primary: '#f5b82e' },
                    logoUrl: '',
                    visualStyle: 'professional',
                },
                websiteBlueprint: {
                    enabled: true,
                    status: 'configured',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                    pages: [],
                    sections: [],
                    ecommerceBlocks: [],
                    chatbotPlacement: 'floating',
                },
                ecommerceBlueprint: {
                    enabled: false,
                    status: 'disabled',
                    needsReview: false,
                    readiness: { isReady: false, blockers: [], warnings: [] },
                    metadata: { generatedBy: 'ai', userModified: false },
                    categories: [],
                    starterProducts: [],
                    inventoryMode: 'not_configured',
                    fulfillmentMode: 'not_configured',
                    discounts: [],
                    giftCards: { enabled: false, status: 'draft' },
                },
                chatbotBlueprint: {
                    enabled: true,
                    status: 'configured',
                    needsReview: false,
                    readiness: { isReady: true, blockers: [], warnings: [] },
                    actions: [createAction(actionOverrides)],
                    appointments: {
                        enabled: true,
                        availabilitySource: 'appointments_engine',
                    },
                },
                appointmentsBlueprint: {
                    availability: {
                        intervalMinutes: 30,
                        minimumNoticeMinutes: 120,
                        timezone: 'America/Puerto_Rico',
                    },
                    bookingRules: {
                        confirmationMode: 'manual',
                    },
                },
            },
        },
        theme: {},
        brand_identity: {},
        component_order: [],
        section_visibility: {},
        pages: [],
        menus: [],
        ai_assistant_config: { isActive: true },
    };
}

function createSupabaseTableQuery(table: string) {
    const query: Record<string, any> = {
        payload: undefined,
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        insert: vi.fn((payload: Record<string, any>) => {
            query.payload = payload;
            if (table === 'chatbot_engine_events') {
                mockState.recordedEvents.push(payload);
            }
            return query;
        }),
        maybeSingle: vi.fn(async () => {
            if (table === 'projects') return { data: mockState.projectRow, error: null };
            if (table === 'chatbot_engine_events') return { data: { id: `event-${mockState.recordedEvents.length}` }, error: null };
            return { data: null, error: null };
        }),
        single: vi.fn(async () => ({ data: { id: 'row-1' }, error: null })),
    };
    return query;
}

function createReq(url: string, method = 'GET', body?: Record<string, any>) {
    return {
        method,
        url,
        body,
        headers: {
            'user-agent': 'vitest',
            'x-forwarded-for': '127.0.0.1',
        },
        socket: {
            remoteAddress: '127.0.0.1',
        },
    } as any;
}

function createRes() {
    const res = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: '',
        writeHead: vi.fn((status: number, headers?: Record<string, string>) => {
            res.statusCode = status;
            res.headers = headers || {};
            return res;
        }),
        end: vi.fn((body?: string) => {
            res.body = body || '';
            return res;
        }),
    };
    return res as any;
}

async function callAvailability(url: string) {
    const { default: handler } = await import('../../api/_lib/widgetHandler');
    const req = createReq(url);
    const res = createRes();
    await handler(req, res);
    return {
        status: res.statusCode,
        body: JSON.parse(res.body || '{}'),
    };
}

async function callWidgetPost(url: string, body: Record<string, any>) {
    const { default: handler } = await import('../../api/_lib/widgetHandler');
    const req = createReq(url, 'POST', body);
    const res = createRes();
    await handler(req, res);
    return {
        status: res.statusCode,
        body: JSON.parse(res.body || '{}'),
    };
}

async function callWidgetPatch(url: string, body: Record<string, any>) {
    const { default: handler } = await import('../../api/_lib/widgetHandler');
    const req = createReq(url, 'PATCH', body);
    const res = createRes();
    await handler(req, res);
    return {
        status: res.statusCode,
        body: JSON.parse(res.body || '{}'),
    };
}

describe('widget availability action audit', () => {
    beforeEach(() => {
        mockState.recordedEvents.length = 0;
        mockState.projectRow = createProject();
        mockState.getAvailableAppointmentSlots.mockReset();
        mockState.requestChatbotRestaurantReservation.mockReset();
        mockState.createChatbotEcommerceProductInquiry.mockReset();
        mockState.queueChatbotEmailFollowUpDraft.mockReset();
        mockState.getOrCreateConversation.mockReset();
        mockState.saveConversationMessage.mockReset();
        mockState.updateConversationParticipant.mockReset();
        mockState.linkConversationToLead.mockReset();
        mockState.getAvailableAppointmentSlots.mockResolvedValue([
            {
                startDate: '2026-07-01T14:00:00.000Z',
                endDate: '2026-07-01T15:00:00.000Z',
                available: true,
            },
        ]);
        mockState.requestChatbotRestaurantReservation.mockResolvedValue({
            reservationId: 'reservation-1',
            duplicate: false,
            leadId: 'lead-restaurant-1',
            status: 'pending',
        });
        mockState.createChatbotEcommerceProductInquiry.mockResolvedValue({
            leadId: 'lead-product-1',
            duplicate: false,
            product: {
                id: 'product-1',
                slug: 'radiant-serum',
                name: 'Radiant Serum',
            },
        });
        mockState.queueChatbotEmailFollowUpDraft.mockResolvedValue({
            emailLogId: 'email-log-1',
            email: 'lead@example.com',
            duplicate: false,
            status: 'skipped',
            reviewRequired: true,
            reviewQueueUrl: '/email?projectId=project-1&tab=review',
        });
        mockState.getOrCreateConversation.mockResolvedValue({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            conversationId: 'conversation-1',
            sessionId: 'session-1',
            messageCount: 0,
            reused: false,
        });
        mockState.saveConversationMessage.mockResolvedValue({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            conversationId: 'conversation-1',
            messageId: 'message-1',
            messageCount: 1,
            unreadCount: 1,
            duplicate: false,
            intent: { primaryIntent: 'appointment_request', confidence: 0.86 },
            warnings: [],
        });
        mockState.updateConversationParticipant.mockResolvedValue({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            conversationId: 'conversation-1',
            sessionId: 'session-1',
            messageCount: 1,
            reused: true,
        });
        mockState.linkConversationToLead.mockResolvedValue({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            conversationId: 'conversation-1',
            sessionId: 'session-1',
            messageCount: 1,
            reused: true,
            leadId: 'lead-1',
        });
    });

    it('creates widget conversations through the canonical Chatbot Engine service', async () => {
        const response = await callWidgetPost('/api/widget/project-1/conversations', {
            sessionId: 'session-1',
            participantInfo: {
                name: 'Ana Rivera',
                email: 'ana@example.com',
            },
            sourceSurface: 'bio_page',
            sourceModule: 'bio-page-engine',
            metadata: {
                pageSlug: 'links',
            },
            correlationId: 'corr-1',
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            conversationId: 'conversation-1',
            sessionId: 'session-1',
            messageCount: 0,
            reused: false,
        });
        expect(mockState.getOrCreateConversation).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            channel: 'web',
            sessionId: 'session-1',
            participantInfo: expect.objectContaining({
                name: 'Ana Rivera',
                email: 'ana@example.com',
            }),
            sourceSurface: 'bio_page',
            sourceModule: 'bio-page-engine',
            actorType: 'visitor',
            correlationId: 'corr-1',
            metadata: expect.objectContaining({
                widgetApi: true,
                endpoint: 'api/widget',
                requestFingerprint: expect.any(String),
                chatbotEngineContext: expect.objectContaining({
                    sourceSurface: 'bio_page',
                    sourceModule: 'bio-page-engine',
                }),
            }),
        }), expect.anything());
    });

    it('saves widget messages through the canonical Chatbot Engine service and returns intent metadata', async () => {
        const response = await callWidgetPost('/api/widget/project-1/conversations/conversation-1/messages', {
            role: 'user',
            text: 'Quiero una cita para el viernes',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            idempotencyKey: 'msg-key-1',
            isVoiceMessage: true,
            correlationId: 'corr-message-1',
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            messageId: 'message-1',
            messageCount: 1,
            unreadCount: 1,
            duplicate: false,
            intent: { primaryIntent: 'appointment_request' },
        });
        expect(mockState.saveConversationMessage).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            conversationId: 'conversation-1',
            role: 'user',
            text: 'Quiero una cita para el viernes',
            isVoiceMessage: true,
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            actorType: 'visitor',
            idempotencyKey: 'msg-key-1',
            correlationId: 'corr-message-1',
            metadata: expect.objectContaining({
                widgetApi: true,
                endpoint: 'api/widget',
                requestFingerprint: expect.any(String),
            }),
        }), expect.anything());
    });

    it('updates widget conversations and links leads through the canonical Chatbot Engine service', async () => {
        const response = await callWidgetPatch('/api/widget/project-1/conversations/conversation-1', {
            participantInfo: {
                name: 'Luis Cliente',
                phone: '+17875550100',
            },
            leadId: 'lead-1',
            status: 'pending',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: 'conversation-update-1',
            leadIdempotencyKey: 'lead-link-1',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            ok: true,
            conversationId: 'conversation-1',
            leadId: 'lead-1',
            messageCount: 1,
        });
        expect(mockState.updateConversationParticipant).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            conversationId: 'conversation-1',
            participantInfo: expect.objectContaining({
                name: 'Luis Cliente',
                phone: '+17875550100',
            }),
            status: 'pending',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            actorType: 'visitor',
            idempotencyKey: 'conversation-update-1',
        }), expect.anything());
        expect(mockState.linkConversationToLead).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            conversationId: 'conversation-1',
            leadId: 'lead-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            actorType: 'visitor',
            idempotencyKey: 'lead-link-1',
        }), expect.anything());
    });

    it('checks appointment availability through Action Registry and records an executed event', async () => {
        const response = await callAvailability('/api/widget/project-1/availability?startDate=2026-07-01&days=1&durationMinutes=60&sourceSurface=booking_page');

        expect(response.status).toBe(200);
        expect(response.body.slots).toHaveLength(1);
        expect(mockState.getAvailableAppointmentSlots).toHaveBeenCalledWith(expect.anything(), 'project-1', expect.objectContaining({
            durationMinutes: 60,
            maxSlots: 48,
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'check_availability',
            action_status: 'executed',
            source_surface: 'booking_page',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            slotCount: 1,
            durationMinutes: 60,
            confirmationMode: 'manual',
            availabilityWindow: expect.objectContaining({
                durationMinutes: 60,
                maxSlots: 48,
            }),
        });
    });

    it('blocks availability checks when Action Registry disables check_availability', async () => {
        mockState.projectRow = createProject({
            enabled: false,
            status: 'disabled',
            readiness: { isReady: true, blockers: [], warnings: [] },
        });

        const response = await callAvailability('/api/widget/project-1/availability?startDate=2026-07-01&days=1');

        expect(response.status).toBe(403);
        expect(mockState.getAvailableAppointmentSlots).not.toHaveBeenCalled();
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'check_availability',
            action_status: 'blocked',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
    });

    it('records failed audit events when availability lookup fails after registry approval', async () => {
        mockState.getAvailableAppointmentSlots.mockRejectedValue(
            Object.assign(new Error('availability backend unavailable'), {
                status: 503,
                code: 'SLOTS_DOWN',
            }),
        );

        const response = await callAvailability('/api/widget/project-1/availability?startDate=2026-07-01&days=1&sourceSurface=booking_page');

        expect(response.status).toBe(503);
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_failed',
            action_type: 'check_availability',
            action_status: 'failed',
            source_surface: 'booking_page',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            actionStage: 'appointment_availability_lookup',
            errorStatus: 503,
            errorCode: 'SLOTS_DOWN',
            errorMessage: 'availability backend unavailable',
        });
    });

    it('records restaurant reservation execution without copying customer request notes into the event', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-request_restaurant_reservation',
            actionType: 'request_restaurant_reservation',
        });

        const response = await callWidgetPost('/api/widget/project-1/restaurant-reservations', {
            restaurantId: 'restaurant-1',
            customerName: 'Ana Rivera',
            customerEmail: 'ana@example.com',
            date: '2026-07-10',
            time: '19:00',
            partySize: 4,
            notes: 'Window table',
            sourceSurface: 'restaurant_menu',
            sourceModule: 'restaurants',
        });

        expect(response.status).toBe(201);
        expect(mockState.requestChatbotRestaurantReservation).toHaveBeenCalledWith(expect.objectContaining({
            restaurantId: 'restaurant-1',
            notes: 'Window table',
            idempotencyKey: expect.any(String),
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'request_restaurant_reservation',
            action_status: 'executed',
            lead_id: 'lead-restaurant-1',
            source_surface: 'restaurant_menu',
            source_module: 'restaurants',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            restaurantReservationId: 'reservation-1',
            customerRequestSummaryStatus: 'stored',
            customerRequestSummaryStored: true,
            customerRequestSummaryTarget: 'restaurant_reservations.notes,leads.notes',
            customerRequestSummaryRedactedFromEvent: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('Window table');
    });

    it('records ecommerce product inquiry execution with redacted customer request audit metadata', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_product_inquiry',
            actionType: 'create_product_inquiry',
        });

        const response = await callWidgetPost('/api/widget/project-1/products/inquiries', {
            productId: 'product-1',
            name: 'Marta Cruz',
            email: 'marta@example.com',
            message: 'Is this safe for sensitive skin?',
            quantity: 2,
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });

        expect(response.status).toBe(201);
        expect(mockState.createChatbotEcommerceProductInquiry).toHaveBeenCalledWith(expect.objectContaining({
            productId: 'product-1',
            message: 'Is this safe for sensitive skin?',
            idempotencyKey: expect.any(String),
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'create_product_inquiry',
            action_status: 'executed',
            lead_id: 'lead-product-1',
            source_surface: 'storefront',
            source_module: 'ecommerce',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            leadId: 'lead-product-1',
            productId: 'product-1',
            productSlug: 'radiant-serum',
            customerRequestSummaryStatus: 'stored',
            customerRequestSummaryStored: true,
            customerRequestSummaryTarget: 'leads.notes',
            customerRequestSummaryRedactedFromEvent: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('sensitive skin');
    });

    it('queues Email Marketing follow-up drafts with customer request context without exposing it in the audit event', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-queue_email_follow_up',
            actionType: 'queue_email_follow_up',
            ownerModule: 'emailMarketing',
        });

        const response = await callWidgetPost('/api/widget/project-1/email-follow-up-drafts', {
            email: 'lead@example.com',
            name: 'Lead Contact',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            subject: 'Personal follow-up',
            text: 'Reviewed follow-up draft.',
            customerRequestSummary: 'Private quote request details',
            conversationTranscript: 'Cliente: necesito precio premium.',
            marketingConsent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(201);
        expect(mockState.queueChatbotEmailFollowUpDraft).toHaveBeenCalledWith(expect.objectContaining({
            email: 'lead@example.com',
            name: 'Lead Contact',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            customerRequestSummary: 'Private quote request details',
            conversationTranscript: 'Cliente: necesito precio premium.',
            marketingConsent: true,
            idempotencyKey: expect.any(String),
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'queue_email_follow_up',
            action_status: 'executed',
            lead_id: 'lead-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            emailLogId: 'email-log-1',
            email: 'lead@example.com',
            reviewRequired: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('Private quote request details');
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('precio premium');
    });

    it('records sanitized ChatCore voice runtime events as analytics observations', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-record_analytics_event',
            actionType: 'record_analytics_event',
            ownerModule: 'analytics',
        });

        const response = await callWidgetPost('/api/widget/project-1/events', {
            eventType: 'chatbot_voice_session_started',
            sessionId: 'voice-session-1',
            sessionPhase: 'connected',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            voice: {
                provider: 'elevenlabs',
                source: 'chatbotBlueprint',
                languageMode: 'visitor_language',
                consentRequired: true,
                consentAccepted: true,
                agentConfigured: true,
                agentId: 'secret-agent-id',
            },
            metadata: {
                voiceTranscript: 'Private transcript',
                customerRequestSummary: 'Private notes',
            },
        });

        expect(response.status).toBe(202);
        expect(response.body).toEqual({
            recorded: true,
            eventType: 'chatbot_voice_session_started',
        });
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_voice_session_started',
            action_type: 'record_analytics_event',
            action_status: 'observed',
            conversation_id: 'conversation-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            runtimeEvent: true,
            runtimeEventType: 'chatbot_voice_session_started',
            sessionId: 'voice-session-1',
            sessionPhase: 'connected',
            voice: {
                provider: 'elevenlabs',
                source: 'chatbotBlueprint',
                languageMode: 'visitor_language',
                consentRequired: true,
                consentAccepted: true,
                agentConfigured: true,
            },
        });
        const eventJson = JSON.stringify(mockState.recordedEvents[0].metadata);
        expect(eventJson).not.toContain('secret-agent-id');
        expect(eventJson).not.toContain('Private transcript');
        expect(eventJson).not.toContain('Private notes');
    });

    it('rejects unsupported widget runtime event types', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-record_analytics_event',
            actionType: 'record_analytics_event',
            ownerModule: 'analytics',
        });

        const response = await callWidgetPost('/api/widget/project-1/events', {
            eventType: 'chatbot_sensitive_payload_dumped',
            sessionId: 'voice-session-1',
        });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            code: 'UNSUPPORTED_RUNTIME_EVENT',
        });
        expect(mockState.recordedEvents).toHaveLength(0);
    });

    it('blocks runtime events when analytics recording is disabled in the Action Registry', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-record_analytics_event',
            actionType: 'record_analytics_event',
            ownerModule: 'analytics',
            enabled: false,
            status: 'disabled',
        });

        const response = await callWidgetPost('/api/widget/project-1/events', {
            eventType: 'chatbot_voice_session_blocked',
            sessionId: 'voice-session-1',
            reason: 'consent_required',
        });

        expect(response.status).toBe(403);
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'record_analytics_event',
            action_status: 'blocked',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
    });
});
