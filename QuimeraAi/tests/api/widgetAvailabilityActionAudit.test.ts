import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
    getAvailableAppointmentSlots: vi.fn(),
    recordedEvents: [] as Record<string, any>[],
    projectRow: null as Record<string, any> | null,
}));

vi.mock('../../services/appointments/appointmentEngineService.js', () => ({
    createAppointmentFromChat: vi.fn(),
    createAppointmentFromPublicBooking: vi.fn(),
    getAppointmentsByProject: vi.fn(),
    getAvailableAppointmentSlots: (...args: any[]) => mockState.getAvailableAppointmentSlots(...args),
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

function createReq(url: string) {
    return {
        method: 'GET',
        url,
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

describe('widget availability action audit', () => {
    beforeEach(() => {
        mockState.recordedEvents.length = 0;
        mockState.projectRow = createProject();
        mockState.getAvailableAppointmentSlots.mockReset();
        mockState.getAvailableAppointmentSlots.mockResolvedValue([
            {
                startDate: '2026-07-01T14:00:00.000Z',
                endDate: '2026-07-01T15:00:00.000Z',
                available: true,
            },
        ]);
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
});
