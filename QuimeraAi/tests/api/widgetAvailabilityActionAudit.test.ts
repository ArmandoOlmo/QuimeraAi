import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
    createAppointmentFromChat: vi.fn(),
    createAppointmentFromPublicBooking: vi.fn(),
    getAvailableAppointmentSlots: vi.fn(),
    requestChatbotRestaurantReservation: vi.fn(),
    createChatbotEcommerceProductInquiry: vi.fn(),
    queueChatbotEmailFollowUpDraft: vi.fn(),
    requestChatbotMediaAssetDraft: vi.fn(),
    requestChatbotHumanHandoff: vi.fn(),
    scoreChatbotLead: vi.fn(),
    getOrCreateConversation: vi.fn(),
    saveConversationMessage: vi.fn(),
    updateConversationParticipant: vi.fn(),
    linkConversationToLead: vi.fn(),
    recordedEvents: [] as Record<string, any>[],
    projectRow: null as Record<string, any> | null,
}));

vi.mock('../../services/appointments/appointmentEngineService.js', () => ({
    createAppointmentFromChat: (...args: any[]) => mockState.createAppointmentFromChat(...args),
    createAppointmentFromPublicBooking: (...args: any[]) => mockState.createAppointmentFromPublicBooking(...args),
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
        requestChatbotMediaAssetDraft: (...args: any[]) => mockState.requestChatbotMediaAssetDraft(...args),
        requestChatbotHumanHandoff: (...args: any[]) => mockState.requestChatbotHumanHandoff(...args),
        scoreChatbotLead: (...args: any[]) => mockState.scoreChatbotLead(...args),
    };
});

vi.mock('../../services/chatbot/chatbotEngineService.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../services/chatbot/chatbotEngineService.js')>();
    return {
        executeAnswerFromKnowledgeAction: actual.executeAnswerFromKnowledgeAction,
        getOrCreateConversation: (...args: any[]) => mockState.getOrCreateConversation(...args),
        saveConversationMessage: (...args: any[]) => mockState.saveConversationMessage(...args),
        updateConversationParticipant: (...args: any[]) => mockState.updateConversationParticipant(...args),
        linkConversationToLead: (...args: any[]) => mockState.linkConversationToLead(...args),
    };
});

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

function createReadyKnowledgeSource(overrides: Record<string, any> = {}) {
    return {
        id: 'knowledge-business-blueprint',
        name: 'Project BusinessBlueprint',
        type: 'business_blueprint',
        ownerModule: 'business-blueprint',
        visibility: 'public',
        status: 'ready',
        freshness: 'fresh',
        confidence: 0.92,
        sourceEntityIds: ['businessBlueprint'],
        contentPreview: 'Ganova provides operational consulting, process audits, and automation planning.',
        readiness: { isReady: true, blockers: [], warnings: [] },
        needsReview: false,
        generatedByAI: true,
        userModified: false,
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

function createVoiceProject(actionOverrides: Record<string, any> = {}, voiceSettings: Record<string, any> = {}) {
    const project = createProject({
        id: 'chatbot-action-record_analytics_event',
        actionType: 'record_analytics_event',
        ownerModule: 'analytics',
        ...actionOverrides,
    });
    const chatbotBlueprint = project.data.businessBlueprint.chatbotBlueprint;
    chatbotBlueprint.deployment = {
        ...(chatbotBlueprint.deployment || {}),
        deployedSurfaces: ['voice'],
        safetySettings: {
            requireExplicitSurfaceDeployment: true,
        },
        voiceSettings: {
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'voice_agent_1',
            languageMode: 'visitor_language',
            consentRequired: true,
            ...voiceSettings,
        },
    };
    chatbotBlueprint.channels = {
        ...(chatbotBlueprint.channels || {}),
        voice: {
            enabled: true,
            status: 'deployed',
            sourceSurface: 'voice',
            routePattern: 'voice://project/:projectId',
            contextKeys: ['projectId', 'voiceSessionId', 'consent'],
            readiness: { isReady: true, blockers: [], warnings: [] },
            needsReview: false,
        },
    };
    return project;
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
        mockState.createAppointmentFromChat.mockReset();
        mockState.createAppointmentFromPublicBooking.mockReset();
        mockState.getAvailableAppointmentSlots.mockReset();
        mockState.requestChatbotRestaurantReservation.mockReset();
        mockState.createChatbotEcommerceProductInquiry.mockReset();
        mockState.queueChatbotEmailFollowUpDraft.mockReset();
        mockState.requestChatbotMediaAssetDraft.mockReset();
        mockState.requestChatbotHumanHandoff.mockReset();
        mockState.scoreChatbotLead.mockReset();
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
        mockState.createAppointmentFromChat.mockResolvedValue({
            appointmentId: 'appointment-1',
            leadId: 'lead-1',
            duplicate: false,
            warnings: [],
            appointment: {
                id: 'appointment-1',
                paymentStatus: null,
                ecommerceOrderId: null,
                metadata: {},
            },
        });
        mockState.createAppointmentFromPublicBooking.mockResolvedValue({
            appointmentId: 'appointment-public-1',
            leadId: 'lead-public-1',
            duplicate: false,
            warnings: [],
            appointment: {
                id: 'appointment-public-1',
                paymentStatus: null,
                ecommerceOrderId: null,
                metadata: {},
            },
        });
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
        mockState.requestChatbotMediaAssetDraft.mockResolvedValue({
            assetId: 'media-asset-1',
            name: 'Launch hero',
            url: 'data:image/svg+xml;base64,stub',
            duplicate: false,
            reviewRequired: true,
            generationStarted: false,
            noAutoPublish: true,
        });
        mockState.requestChatbotHumanHandoff.mockResolvedValue({
            conversationId: 'conversation-1',
            duplicate: false,
            status: 'escalated',
            leadId: 'lead-1',
        });
        mockState.scoreChatbotLead.mockResolvedValue({
            leadId: 'lead-1',
            score: 88,
            aiScore: 88,
            probability: 76,
            duplicate: false,
            scored: true,
            highIntent: true,
            reviewRequired: true,
            tags: ['chatbot', 'chatbot-scored'],
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

    it('links direct ChatCore lead captures back to the active widget conversation', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_lead',
            actionType: 'create_lead',
            ownerModule: 'crm',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/leads', {
            name: 'Elena Rivera',
            email: 'elena@example.com',
            phone: '+1 787 555 0177',
            message: 'Necesito una propuesta para automatizar ventas.',
            conversationId: 'conversation-1',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            leadId: 'row-1',
            conversationLeadLinked: true,
            warnings: [],
        });
        expect(mockState.linkConversationToLead).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            conversationId: 'conversation-1',
            leadId: 'row-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            actorType: 'visitor',
            metadata: expect.objectContaining({
                autoLinkedBy: 'widget-action-result',
                actionType: 'create_lead',
            }),
        }), expect.anything());
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'create_lead',
            action_status: 'executed',
            lead_id: 'row-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            leadId: 'row-1',
            conversationLeadLinked: true,
            customerRequestSummaryTarget: 'leads.notes',
            customerRequestSummaryRedactedFromEvent: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('automatizar ventas');
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

    it('answers public widget questions from reviewed ChatCore knowledge without storing raw question or answer in events', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-answer_from_knowledge',
            actionType: 'answer_from_knowledge',
            ownerModule: 'chatbot-engine',
            requiresConfirmation: false,
            idempotencyRequired: false,
        });
        mockState.projectRow.data.businessBlueprint.chatbotBlueprint.knowledgeSources = [
            createReadyKnowledgeSource(),
            createReadyKnowledgeSource({
                id: 'knowledge-crm-leads-private',
                name: 'Private CRM notes',
                type: 'crm_leads_private',
                ownerModule: 'crm',
                visibility: 'private',
                status: 'ready',
                contentPreview: 'Private VIP lead history should never be used in public answers.',
            }),
        ];

        const response = await callWidgetPost('/api/widget/project-1/knowledge/answer', {
            question: 'What services does Ganova offer to improve operations?',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            projectId: 'project-1',
            status: 'answered',
            actionType: 'answer_from_knowledge',
            answerStatus: 'answered_from_reviewed_public_knowledge',
            knowledgePolicy: 'reviewed_public_sources_only',
            needsHumanReview: false,
            eventRedaction: {
                question: true,
                answer: true,
                citationExcerpts: true,
            },
        });
        expect(response.body.answer).toContain('operational consulting');
        expect(response.body.citations.map((citation: any) => citation.sourceId)).toContain('knowledge-business-blueprint');
        expect(response.body.citations.map((citation: any) => citation.sourceId)).not.toContain('knowledge-crm-leads-private');
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'answer_from_knowledge',
            action_status: 'executed',
            conversation_id: 'conversation-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            answerStatus: 'answered_from_reviewed_public_knowledge',
            sourceCount: expect.any(Number),
            citationSourceIds: expect.arrayContaining(['knowledge-business-blueprint']),
            questionRedactedFromEvent: true,
            answerRedactedFromEvent: true,
            citationExcerptsRedactedFromEvent: true,
            questionHash: expect.any(String),
        });
        const eventJson = JSON.stringify(mockState.recordedEvents[0].metadata);
        expect(eventJson).not.toContain('What services does Ganova offer');
        expect(eventJson).not.toContain('operational consulting');
        expect(eventJson).not.toContain('Private VIP lead history');
    });

    it('blocks public knowledge answers when answer_from_knowledge is disabled', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-answer_from_knowledge',
            actionType: 'answer_from_knowledge',
            ownerModule: 'chatbot-engine',
            enabled: false,
            status: 'disabled',
            requiresConfirmation: false,
        });
        mockState.projectRow.data.businessBlueprint.chatbotBlueprint.knowledgeSources = [
            createReadyKnowledgeSource(),
        ];

        const response = await callWidgetPost('/api/widget/project-1/knowledge/answer', {
            question: 'Tell me private pricing notes',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(403);
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'answer_from_knowledge',
            action_status: 'blocked',
            conversation_id: 'conversation-1',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('private pricing notes');
    });

    it('scores CRM leads through the public ChatCore Action Registry without exposing message text', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-score_lead',
            actionType: 'score_lead',
            ownerModule: 'crm',
        });

        const response = await callWidgetPost('/api/widget/project-1/leads/lead-1/score', {
            conversationId: 'conversation-1',
            message: 'Private high intent request about premium pricing.',
            conversationTranscript: 'Visitor: I need premium pricing\nAssistant: I can help.',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            metadata: {
                customerRequestSummary: 'Do not expose this scoring context.',
            },
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            leadId: 'lead-1',
            score: 88,
            aiScore: 88,
            probability: 76,
            duplicate: false,
            scored: true,
            highIntent: true,
            reviewRequired: true,
        });
        expect(mockState.scoreChatbotLead).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            projectUserId: 'owner-1',
            leadId: 'lead-1',
            message: 'Private high intent request about premium pricing.',
            conversationTranscript: 'Visitor: I need premium pricing\nAssistant: I can help.',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: expect.any(String),
            metadata: expect.objectContaining({
                scoreRequestedFromWidget: true,
                messageHash: expect.any(String),
                transcriptHash: expect.any(String),
            }),
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'score_lead',
            action_status: 'executed',
            lead_id: 'lead-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            messageHash: expect.any(String),
            transcriptHash: expect.any(String),
            messageRedactedFromEvent: true,
            transcriptRedactedFromEvent: true,
            scoringTarget: 'leads.custom_data.leadScore,leads.custom_data.aiScore,leads.custom_data.probability',
            score: 88,
            aiScore: 88,
            probability: 76,
            highIntent: true,
            scoringStored: true,
        });
        const eventJson = JSON.stringify(mockState.recordedEvents[0].metadata);
        expect(eventJson).not.toContain('Private high intent request');
        expect(eventJson).not.toContain('premium pricing');
        expect(eventJson).not.toContain('Do not expose this scoring context');
    });

    it('blocks public lead scoring when score_lead is disabled in the Action Registry', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-score_lead',
            actionType: 'score_lead',
            ownerModule: 'crm',
            enabled: false,
            status: 'disabled',
        });

        const response = await callWidgetPost('/api/widget/project-1/leads/lead-1/score', {
            conversationId: 'conversation-1',
            message: 'Private score request that must not run.',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(403);
        expect(mockState.scoreChatbotLead).not.toHaveBeenCalled();
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'score_lead',
            action_status: 'blocked',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('must not run');
    });

    it('creates ChatCore appointments with a linked CRM lead when payload uses generic contact fields', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_appointment',
            actionType: 'create_appointment',
            ownerModule: 'appointments',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/appointments', {
            source: 'chatbot',
            title: 'Consulta de ChatCore',
            description: 'Quiere evaluar un paquete premium.',
            startDate: '2026-07-10T14:00:00.000Z',
            endDate: '2026-07-10T14:30:00.000Z',
            name: 'Maria Gomez',
            email: 'maria@example.com',
            phone: '+1 787 555 0101',
            leadId: 'lead-existing-1',
            conversationId: 'conversation-1',
            customerRequestSummary: 'Maria quiere una consulta para comparar el paquete premium.',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            appointmentId: 'appointment-1',
            leadId: 'lead-1',
            conversationLeadLinked: true,
        });
        expect(mockState.createAppointmentFromChat).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                participantName: 'Maria Gomez',
                participantEmail: 'maria@example.com',
                participantPhone: '+1 787 555 0101',
                linkedLeadId: 'lead-existing-1',
                sourceConversationId: 'conversation-1',
                sourceModule: 'chatcore',
                sourceComponent: 'ChatCore',
                notes: expect.stringContaining('Maria quiere una consulta para comparar el paquete premium.'),
            }),
        );
        expect(mockState.linkConversationToLead).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            conversationId: 'conversation-1',
            leadId: 'lead-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            actorType: 'visitor',
            metadata: expect.objectContaining({
                autoLinkedBy: 'widget-action-result',
                actionType: 'create_appointment',
                appointmentId: 'appointment-1',
            }),
        }), expect.anything());
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'create_appointment',
            action_status: 'executed',
            appointment_id: 'appointment-1',
            lead_id: 'lead-1',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            appointmentId: 'appointment-1',
            leadId: 'lead-1',
            conversationLeadLinked: true,
            customerRequestSummaryTarget: 'project_appointments.notes,leads.notes',
            customerRequestSummaryRedactedFromEvent: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('paquete premium');
    });

    it('uses participantInfo as appointment contact data so ChatCore can create the linked CRM lead', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_appointment',
            actionType: 'create_appointment',
            ownerModule: 'appointments',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/appointments', {
            source: 'chatbot',
            title: 'Consulta desde participantInfo',
            description: 'Quiere agendar una llamada.',
            startDate: '2026-07-11T16:00:00.000Z',
            endDate: '2026-07-11T16:30:00.000Z',
            participantInfo: {
                name: 'Carlos Rivera',
                email: 'carlos@example.com',
                phone: '+1 787 555 0199',
            },
            conversationId: 'conversation-participant-1',
            customerRequestSummary: 'Carlos quiere una llamada para revisar opciones de automatizacion.',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            appointmentId: 'appointment-1',
            leadId: 'lead-1',
        });
        expect(mockState.createAppointmentFromChat).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                participantName: 'Carlos Rivera',
                participantEmail: 'carlos@example.com',
                participantPhone: '+1 787 555 0199',
                sourceConversationId: 'conversation-participant-1',
                idempotencyKey: 'chatbot:project-1:carlos@example.com:2026-07-11T16:00:00.000Z',
                notes: expect.stringContaining('Carlos quiere una llamada para revisar opciones de automatizacion.'),
            }),
        );
    });

    it('returns repaired lead links for duplicate ChatCore appointment requests without exposing notes in events', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_appointment',
            actionType: 'create_appointment',
            ownerModule: 'appointments',
            requiresConsent: true,
        });
        mockState.createAppointmentFromChat.mockResolvedValueOnce({
            appointmentId: 'appointment-existing-1',
            leadId: 'lead-repaired-1',
            duplicate: true,
            warnings: [],
            appointment: {
                id: 'appointment-existing-1',
                paymentStatus: null,
                ecommerceOrderId: null,
                metadata: {
                    linkedLeadId: 'lead-repaired-1',
                    customerRequestNote: 'ES: El cliente Maria Gomez solicito seguimiento. EN: The customer Maria Gomez requested follow-up.',
                },
            },
        });

        const response = await callWidgetPost('/api/widget/project-1/appointments', {
            source: 'chatbot',
            title: 'Consulta duplicada de ChatCore',
            description: 'Cita existente por idempotencia.',
            startDate: '2026-07-10T14:00:00.000Z',
            endDate: '2026-07-10T14:30:00.000Z',
            name: 'Maria Gomez',
            email: 'maria@example.com',
            conversationId: 'conversation-1',
            idempotencyKey: 'chatcore:project-1:conversation-1:appointment',
            customerRequestSummary: 'Maria quiere confirmar la cita y comparar el paquete premium.',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            appointmentId: 'appointment-existing-1',
            leadId: 'lead-repaired-1',
            duplicate: true,
            conversationLeadLinked: true,
        });
        expect(mockState.createAppointmentFromChat).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                participantName: 'Maria Gomez',
                participantEmail: 'maria@example.com',
                sourceConversationId: 'conversation-1',
                idempotencyKey: 'chatcore:project-1:conversation-1:appointment',
                notes: expect.stringContaining('Maria quiere confirmar la cita'),
            }),
        );
        expect(mockState.linkConversationToLead).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'project-1',
            conversationId: 'conversation-1',
            leadId: 'lead-repaired-1',
            sourceModule: 'chatcore',
            metadata: expect.objectContaining({
                actionType: 'create_appointment',
                appointmentId: 'appointment-existing-1',
                duplicate: true,
            }),
        }), expect.anything());
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'create_appointment',
            action_status: 'duplicate',
            appointment_id: 'appointment-existing-1',
            lead_id: 'lead-repaired-1',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            appointmentId: 'appointment-existing-1',
            leadId: 'lead-repaired-1',
            duplicate: true,
            conversationLeadLinked: true,
            customerRequestSummaryTarget: 'project_appointments.notes,leads.notes',
            customerRequestSummaryRedactedFromEvent: true,
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('paquete premium');
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('Maria quiere confirmar');
    });

    it('creates support tickets as audited ChatCore handoff escalations without exposing the issue text', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_support_ticket',
            actionType: 'create_support_ticket',
            ownerModule: 'chatbot-engine',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/support-tickets', {
            conversationId: 'conversation-1',
            message: 'Private support issue about VIP billing access.',
            category: 'billing',
            priority: 'high',
            name: 'Ana Rivera',
            email: 'ana@example.com',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            metadata: {
                customerRequestSummary: 'Do not expose this support issue in audit metadata.',
            },
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            conversationId: 'conversation-1',
            status: 'escalated',
            duplicate: false,
            leadId: 'lead-1',
            supportTicket: true,
            conversationLeadLinked: true,
        });
        expect(mockState.requestChatbotHumanHandoff).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            projectUserId: 'owner-1',
            conversationId: 'conversation-1',
            reason: 'support_request',
            priority: 'high',
            summary: 'Private support issue about VIP billing access.',
            requesterName: 'Ana Rivera',
            requesterEmail: 'ana@example.com',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: expect.any(String),
            metadata: expect.objectContaining({
                supportTicket: true,
                supportCategory: 'billing',
                supportPriority: 'high',
                actionType: 'create_support_ticket',
            }),
        }));
        expect(mockState.linkConversationToLead).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'project-1',
            conversationId: 'conversation-1',
            leadId: 'lead-1',
            metadata: expect.objectContaining({
                autoLinkedBy: 'widget-action-result',
                actionType: 'create_support_ticket',
                supportCategory: 'billing',
            }),
        }), expect.anything());
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'create_support_ticket',
            action_status: 'executed',
            conversation_id: 'conversation-1',
            lead_id: 'lead-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            supportTicket: true,
            supportCategory: 'billing',
            priority: 'high',
            handoffReason: 'support_request',
            summaryHash: expect.any(String),
            summaryLength: 47,
            summaryRedactedFromEvent: true,
            conversationLeadLinked: true,
        });
        const eventJson = JSON.stringify(mockState.recordedEvents[0].metadata);
        expect(eventJson).not.toContain('Private support issue');
        expect(eventJson).not.toContain('Do not expose this support issue');
    });

    it('blocks support tickets when create_support_ticket is disabled in the Action Registry', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-create_support_ticket',
            actionType: 'create_support_ticket',
            ownerModule: 'chatbot-engine',
            enabled: false,
            status: 'disabled',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/support-tickets', {
            conversationId: 'conversation-1',
            message: 'Private support issue that must not run.',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(403);
        expect(mockState.requestChatbotHumanHandoff).not.toHaveBeenCalled();
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'create_support_ticket',
            action_status: 'blocked',
            conversation_id: 'conversation-1',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('must not run');
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

    it('creates Media AI draft assets through the public ChatCore Action Registry', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-request_media_asset',
            actionType: 'request_media_asset',
            ownerModule: 'media-ai',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/media/asset-drafts', {
            prompt: 'Private hero request for a premium launch campaign.',
            title: 'Launch hero',
            category: 'hero',
            aspectRatio: '16:9',
            style: 'Editorial product photography',
            model: 'review-later',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            consent: true,
            metadata: {
                customerRequestSummary: 'Do not expose this full Media AI request in audit logs.',
            },
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            assetId: 'media-asset-1',
            name: 'Launch hero',
            duplicate: false,
            reviewRequired: true,
            generationStarted: false,
            noAutoPublish: true,
        });
        expect(mockState.requestChatbotMediaAssetDraft).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            projectUserId: 'owner-1',
            prompt: 'Private hero request for a premium launch campaign.',
            title: 'Launch hero',
            category: 'hero',
            aspectRatio: '16:9',
            style: 'Editorial product photography',
            model: 'review-later',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: expect.any(String),
        }));
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_executed',
            action_type: 'request_media_asset',
            action_status: 'executed',
            lead_id: 'lead-1',
            conversation_id: 'conversation-1',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            promptHash: expect.any(String),
            promptLength: 51,
            title: 'Launch hero',
            category: 'hero',
            aspectRatio: '16:9',
            customerRequestSummaryStatus: 'stored',
            customerRequestSummaryStored: true,
            customerRequestSummaryTarget: 'media_assets.metadata.customerRequestSummary,media_assets.description',
            customerRequestSummaryRedactedFromEvent: true,
            assetId: 'media-asset-1',
            reviewRequired: true,
            generationStarted: false,
            noAutoPublish: true,
        });
        const eventJson = JSON.stringify(mockState.recordedEvents[0].metadata);
        expect(eventJson).not.toContain('Private hero request');
        expect(eventJson).not.toContain('Do not expose this full Media AI request');
    });

    it('blocks Media AI draft requests when the Action Registry disables request_media_asset', async () => {
        mockState.projectRow = createProject({
            id: 'chatbot-action-request_media_asset',
            actionType: 'request_media_asset',
            ownerModule: 'media-ai',
            enabled: false,
            status: 'disabled',
            requiresConsent: true,
        });

        const response = await callWidgetPost('/api/widget/project-1/media/asset-drafts', {
            prompt: 'Private hero request for a blocked campaign.',
            consent: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(403);
        expect(mockState.requestChatbotMediaAssetDraft).not.toHaveBeenCalled();
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_action_blocked',
            action_type: 'request_media_asset',
            action_status: 'blocked',
        });
        expect(mockState.recordedEvents[0].metadata.blockers).toEqual(expect.arrayContaining([
            'action_disabled',
            'action_status_disabled',
        ]));
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('blocked campaign');
    });

    it('creates canonical ChatCore voice sessions with Deploy Settings and redacted audit metadata', async () => {
        mockState.projectRow = createVoiceProject();

        const response = await callWidgetPost('/api/widget/project-1/voice/session', {
            sessionId: 'voice-session-1',
            conversationId: 'conversation-1',
            consentAccepted: true,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            voice: {
                agentId: 'client-leaked-agent',
            },
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            allowed: true,
            sessionId: 'voice-session-1',
            provider: 'elevenlabs',
            source: 'chatbotBlueprint',
            agentId: 'voice_agent_1',
            languageMode: 'visitor_language',
            consentRequired: true,
            eventRedaction: { agentId: true },
        });
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_voice_session_requested',
            action_type: 'record_analytics_event',
            action_status: 'executed',
            conversation_id: 'conversation-1',
            source_surface: 'voice',
            source_module: 'chatcore',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            runtimeEvent: true,
            runtimeEventType: 'chatbot_voice_session_requested',
            sessionId: 'voice-session-1',
            sessionPhase: 'requested',
            providerSessionStarted: false,
            agentIdRedactedFromEvent: true,
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
        expect(eventJson).not.toContain('voice_agent_1');
        expect(eventJson).not.toContain('client-leaked-agent');
    });

    it('blocks canonical ChatCore voice sessions until visitor consent is accepted', async () => {
        mockState.projectRow = createVoiceProject();

        const response = await callWidgetPost('/api/widget/project-1/voice/session', {
            sessionId: 'voice-session-2',
            conversationId: 'conversation-2',
            sourceModule: 'chatcore',
        });

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
            allowed: false,
            reason: 'consent_required',
            sessionId: 'voice-session-2',
            provider: 'elevenlabs',
            source: 'chatbotBlueprint',
            agentConfigured: true,
        });
        expect(mockState.recordedEvents).toHaveLength(1);
        expect(mockState.recordedEvents[0]).toMatchObject({
            project_id: 'project-1',
            event_type: 'chatbot_voice_session_blocked',
            action_type: 'record_analytics_event',
            action_status: 'blocked',
            conversation_id: 'conversation-2',
            source_surface: 'voice',
        });
        expect(mockState.recordedEvents[0].metadata).toMatchObject({
            runtimeEventType: 'chatbot_voice_session_blocked',
            reason: 'consent_required',
            readinessReason: 'consent_required',
            providerSessionStarted: false,
            voice: {
                consentRequired: true,
                consentAccepted: false,
                agentConfigured: true,
            },
        });
        expect(JSON.stringify(mockState.recordedEvents[0].metadata)).not.toContain('voice_agent_1');
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
