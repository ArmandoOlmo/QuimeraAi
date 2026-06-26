import { describe, expect, it, vi } from 'vitest';
import type { ChatbotBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    addKnowledgeSource,
    executeChatbotAction,
    getChatbotReadiness,
    getOrCreateConversation,
    getKnowledgeSources,
    linkConversationToLead,
    recordChatbotEvent,
    runChatbotTestScenario,
    saveConversationMessage,
    syncKnowledgeSource,
    updateConversationParticipant,
} from '../../services/chatbot/chatbotEngineService';
import {
    reviewChatbotActionInBlueprint,
    reviewChatbotKnowledgeSourceInBlueprint,
} from '../../services/chatbotEngine/chatbotEngineConfigurationService';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Canonical Service',
            industry: 'appointments and ecommerce',
            description: 'Bilingual business using ChatCore as the canonical engine.',
            tagline: 'Serve smarter',
            services: [{ name: 'Consultation', description: 'Reviewed booking flow.' }],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico', email: 'hello@example.com' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#f8fafc',
                surface: '#ffffff',
                text: '#111827',
            },
            visualStyle: 'clean service',
        },
        contentMap: { pages: [], products: [] },
        componentPlan: [
            { component: 'heroLead', reason: 'Lead capture', confidence: 0.9 },
            { component: 'chatbot', reason: 'ChatCore', confidence: 0.9 },
        ],
        assetPlan: [],
        qualityGoals: ['canonical chatbot engine'],
    };
}

function buildBusinessBlueprint() {
    return createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_chatbot',
        tenantId: 'tenant_chatbot',
    });
}

type Tables = Record<string, any[]>;

class Query {
    private filters: Array<{ field: string; op: 'eq' | 'contains'; value: any }> = [];
    private insertRows: any[] | null = null;
    private updatePayload: Record<string, any> | null = null;
    private limitCount: number | null = null;
    private orderField: string | null = null;
    private orderAscending = true;

    constructor(private table: string, private tables: Tables) { }

    select() {
        return this;
    }

    eq(field: string, value: any) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    contains(field: string, value: Record<string, unknown>) {
        this.filters.push({ field, op: 'contains', value });
        return this;
    }

    order(field: string, options: { ascending?: boolean } = {}) {
        this.orderField = field;
        this.orderAscending = options.ascending !== false;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    insert(payload: any) {
        const rows = Array.isArray(payload) ? payload : [payload];
        this.insertRows = rows.map((row) => ({
            id: row.id || `${this.table}_${this.tables[this.table].length + 1}`,
            ...row,
        }));
        this.tables[this.table].push(...this.insertRows);
        return this;
    }

    update(payload: Record<string, any>) {
        this.updatePayload = payload;
        return this;
    }

    async maybeSingle() {
        const result = await this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    async single() {
        return this.maybeSingle();
    }

    then(resolve: (value: any) => unknown, reject?: (error: unknown) => unknown) {
        return this.execute().then(resolve, reject);
    }

    private async execute() {
        if (!this.tables[this.table]) this.tables[this.table] = [];

        if (this.insertRows) {
            return { data: this.limitCount === 1 ? this.insertRows.slice(0, 1) : this.insertRows, error: null };
        }

        let matches = this.tables[this.table].filter((row) => this.matches(row));
        if (this.orderField) {
            matches = [...matches].sort((a, b) => {
                const left = a[this.orderField || ''];
                const right = b[this.orderField || ''];
                if (left === right) return 0;
                const result = left > right ? 1 : -1;
                return this.orderAscending ? result : -result;
            });
        }

        if (this.updatePayload) {
            for (const row of matches) Object.assign(row, this.updatePayload);
            return { data: matches, error: null };
        }

        return {
            data: this.limitCount ? matches.slice(0, this.limitCount) : matches,
            error: null,
        };
    }

    private matches(row: Record<string, any>) {
        return this.filters.every((filter) => {
            if (filter.op === 'eq') return row[filter.field] === filter.value;
            if (filter.op === 'contains') {
                const source = row[filter.field] || {};
                return Object.entries(filter.value).every(([key, value]) => source[key] === value);
            }
            return true;
        });
    }
}

function createProjectClient(initialProjectData: Record<string, unknown>, extraTables: Partial<Tables> = {}) {
    const tables: Tables = {
        projects: [{
            id: 'project_chatbot',
            tenant_id: 'tenant_chatbot',
            data: initialProjectData,
        }],
        chatbot_engine_events: [],
        social_conversations: [],
        social_messages: [],
        ...extraTables,
    };

    return {
        tables,
        from: vi.fn((table: string) => {
            if (!tables[table]) tables[table] = [];
            return new Query(table, tables);
        }),
        getProjectData: () => tables.projects[0]?.data,
        getEvents: () => tables.chatbot_engine_events,
    };
}

describe('canonical chatbotEngineService facade', () => {
    it('exposes project-scoped readiness and Knowledge Center sources', async () => {
        const projectData = { businessBlueprint: buildBusinessBlueprint() };
        const client = createProjectClient(projectData);

        const sources = await getKnowledgeSources('project_chatbot', client as any);
        const readiness = await getChatbotReadiness('project_chatbot', client as any);

        expect(sources.map(source => source.id)).toContain('knowledge-business-blueprint');
        expect(readiness.projectId).toBe('project_chatbot');
        expect(readiness.actionHealth.total).toBeGreaterThan(5);
        expect(readiness.knowledgeHealth.total).toBeGreaterThan(3);
        expect(readiness.deploymentHealth.deployedSurfaces).toEqual([]);
        expect(readiness.readiness.blockers.length).toBeGreaterThan(0);
    });

    it('syncs a reviewed knowledge source through the canonical service contract', async () => {
        const projectData = { businessBlueprint: buildBusinessBlueprint() };
        const client = createProjectClient(projectData);

        const result = await syncKnowledgeSource('project_chatbot', {
            sourceId: 'knowledge-business-blueprint',
            actorId: 'user_knowledge',
            now: '2026-06-26T14:00:00.000Z',
        }, client as any);

        expect(result.knowledgeSource).toMatchObject({
            id: 'knowledge-business-blueprint',
            status: 'ready',
            needsReview: false,
            userModified: true,
            lockedFromRegeneration: true,
        });
        expect(client.getEvents()[0]).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_configuration_updated',
            source_module: 'chatbot-engine-dashboard',
        });
    });

    it('adds manual Knowledge Center sources through the canonical service contract', async () => {
        const projectData = { businessBlueprint: buildBusinessBlueprint() };
        const client = createProjectClient(projectData);

        const result = await addKnowledgeSource('project_chatbot', {
            name: 'Pricing FAQ',
            type: 'faq',
            visibility: 'public',
            content: 'ES: Los precios deben confirmarse antes de cotizar. EN: Prices must be confirmed before quoting.',
            actorId: 'user_knowledge',
            now: '2026-06-26T14:05:00.000Z',
        }, client as any);

        expect(result.knowledgeSource).toMatchObject({
            name: 'Pricing FAQ',
            status: 'needs_review',
            generatedByAI: false,
            contentPreview: expect.stringContaining('Prices must be confirmed'),
        });
        expect(client.getEvents()[0]).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_configuration_updated',
            source_module: 'chatbot-engine-dashboard',
        });
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'knowledgeCenter',
            operation: 'add_knowledge_source',
        });
    });

    it('records observed events with canonical project scope metadata', async () => {
        const client = createProjectClient({ businessBlueprint: buildBusinessBlueprint() });

        const result = await recordChatbotEvent({
            projectId: 'project_chatbot',
            eventType: 'chatbot_custom_observed',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            metadata: { locale: 'es-PR' },
            now: '2026-06-26T14:10:00.000Z',
        }, client as any);

        expect(result.id).toBe('chatbot_engine_events_1');
        expect(client.getEvents()[0]).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_custom_observed',
            action_type: 'record_analytics_event',
            action_status: 'observed',
            source_surface: 'website',
            source_module: 'chatcore',
        });
        expect(client.getEvents()[0].metadata).toMatchObject({
            locale: 'es-PR',
            projectScoped: true,
            canonicalService: true,
        });
    });

    it('reuses or creates project-scoped conversations through the canonical Inbox contract', async () => {
        const client = createProjectClient({ businessBlueprint: buildBusinessBlueprint() }, {
            social_conversations: [
                {
                    id: 'conversation_other_project',
                    tenant_id: 'tenant_other',
                    project_id: 'project_other',
                    channel: 'web',
                    participant_id: 'session-1',
                    status: 'active',
                    message_count: 9,
                    last_message_at: '2026-06-26T13:59:00.000Z',
                },
                {
                    id: 'conversation_existing',
                    tenant_id: 'tenant_chatbot',
                    project_id: 'project_chatbot',
                    channel: 'web',
                    participant_id: 'session-1',
                    status: 'active',
                    message_count: 2,
                    last_message_at: '2026-06-26T14:00:00.000Z',
                },
            ],
        });

        const reused = await getOrCreateConversation({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            sessionId: 'session-1',
            participantInfo: { name: 'Ana Cliente', email: 'ana@example.com' },
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            now: '2026-06-26T15:00:00.000Z',
        }, client as any);
        const created = await getOrCreateConversation({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            sessionId: 'session-2',
            participantInfo: { name: 'Luis Cliente', phone: '+17875550100' },
            sourceSurface: 'bio_page',
            sourceModule: 'bio-page-engine',
            now: '2026-06-26T15:01:00.000Z',
        }, client as any);

        expect(reused).toMatchObject({
            conversationId: 'conversation_existing',
            messageCount: 2,
            reused: true,
        });
        expect(created).toMatchObject({
            conversationId: 'social_conversations_3',
            sessionId: 'session-2',
            reused: false,
        });
        expect(client.tables.social_conversations.find(row => row.id === 'social_conversations_3')).toMatchObject({
            tenant_id: 'tenant_chatbot',
            project_id: 'project_chatbot',
            participant_name: 'Luis Cliente',
            participant_phone: '+17875550100',
            tags: ['web-chat', 'surface:bio_page', 'module:bio-page-engine'],
            metadata: expect.objectContaining({
                sessionId: 'session-2',
                canonicalService: true,
                projectScoped: true,
            }),
        });
        expect(client.getEvents().map(event => event.event_type)).toEqual([
            'chatbot_conversation_reused',
            'chatbot_conversation_created',
        ]);
        expect(client.getEvents()).toEqual(expect.arrayContaining([
            expect.objectContaining({ project_id: 'project_chatbot', action_type: 'save_conversation' }),
        ]));
    });

    it('saves messages with intent metadata, updates Inbox counters, and records the Event Log', async () => {
        const client = createProjectClient({ businessBlueprint: buildBusinessBlueprint() }, {
            social_conversations: [{
                id: 'conversation_1',
                tenant_id: 'tenant_chatbot',
                project_id: 'project_chatbot',
                channel: 'web',
                participant_id: 'session-1',
                participant_name: 'Visitante Web',
                status: 'active',
                message_count: 1,
                unread_count: 0,
                tags: ['web-chat'],
                metadata: { existing: true },
            }],
        });

        const result = await saveConversationMessage({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            conversationId: 'conversation_1',
            role: 'user',
            text: 'Hola, quiero reservar una cita para el paquete premium esta semana.',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            idempotencyKey: 'message-key-1',
            now: '2026-06-26T15:10:00.000Z',
        }, client as any);
        const duplicate = await saveConversationMessage({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            conversationId: 'conversation_1',
            role: 'user',
            text: 'Hola, quiero reservar una cita para el paquete premium esta semana.',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            idempotencyKey: 'message-key-1',
            now: '2026-06-26T15:10:01.000Z',
        }, client as any);

        expect(result).toMatchObject({
            conversationId: 'conversation_1',
            messageId: 'social_messages_1',
            messageCount: 2,
            unreadCount: 1,
            duplicate: false,
        });
        expect(result.intent?.actionType).toBe('create_appointment');
        expect(duplicate).toMatchObject({
            messageId: 'social_messages_1',
            duplicate: true,
        });
        expect(client.tables.social_messages).toHaveLength(1);
        expect(client.tables.social_messages[0]).toMatchObject({
            tenant_id: 'tenant_chatbot',
            project_id: 'project_chatbot',
            conversation_id: 'conversation_1',
            direction: 'inbound',
            sender_id: 'session-1',
            metadata: expect.objectContaining({
                idempotencyKey: 'message-key-1',
                canonicalService: true,
                projectScoped: true,
                intent: expect.objectContaining({
                    actionType: 'create_appointment',
                }),
            }),
        });
        expect(client.tables.social_conversations[0]).toMatchObject({
            message_count: 2,
            unread_count: 1,
            tags: expect.arrayContaining(['intent:appointment_request', 'action:create_appointment', 'surface:booking_page', 'module:appointments']),
            metadata: expect.objectContaining({
                existing: true,
                lastIntentActionType: 'create_appointment',
                canonicalService: true,
                projectScoped: true,
            }),
        });
        expect(client.getEvents().map(event => event.event_type)).toEqual([
            'chatbot_message_saved',
            'chatbot_intent_analyzed',
        ]);
    });

    it('updates participant details and links conversations to CRM leads without crossing project scope', async () => {
        const client = createProjectClient({ businessBlueprint: buildBusinessBlueprint() }, {
            social_conversations: [{
                id: 'conversation_1',
                tenant_id: 'tenant_chatbot',
                project_id: 'project_chatbot',
                channel: 'web',
                participant_id: 'session-1',
                participant_name: 'Visitante Web',
                status: 'active',
                message_count: 2,
                unread_count: 1,
                tags: ['web-chat'],
                metadata: { existing: true },
            }],
        });

        await expect(updateConversationParticipant({
            projectId: 'project_other',
            conversationId: 'conversation_1',
            participantInfo: { name: 'Should not update' },
        }, client as any)).rejects.toMatchObject({
            code: 'CHATBOT_CONVERSATION_NOT_FOUND',
        });

        const participant = await updateConversationParticipant({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            conversationId: 'conversation_1',
            participantInfo: { name: 'Ana Cliente', email: 'ana@example.com' },
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            now: '2026-06-26T15:20:00.000Z',
        }, client as any);
        const linked = await linkConversationToLead({
            tenantId: 'tenant_chatbot',
            projectId: 'project_chatbot',
            conversationId: 'conversation_1',
            leadId: 'lead_1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            now: '2026-06-26T15:21:00.000Z',
        }, client as any);

        expect(participant).toMatchObject({
            conversationId: 'conversation_1',
            reused: true,
        });
        expect(linked).toMatchObject({
            conversationId: 'conversation_1',
            leadId: 'lead_1',
        });
        expect(client.tables.social_conversations[0]).toMatchObject({
            participant_name: 'Ana Cliente',
            participant_email: 'ana@example.com',
            lead_id: 'lead_1',
            tags: expect.arrayContaining(['lead-linked', 'surface:website', 'module:chatcore']),
            metadata: expect.objectContaining({
                linkedLeadId: 'lead_1',
                canonicalService: true,
                projectScoped: true,
            }),
        });
        expect(client.getEvents().map(event => event.event_type)).toEqual([
            'chatbot_participant_updated',
            'chatbot_conversation_linked_to_lead',
        ]);
    });

    it('blocks runtime execution before mutations when Action Registry is not configured', async () => {
        const client = createProjectClient({ businessBlueprint: buildBusinessBlueprint() });

        await expect(executeChatbotAction({
            actionType: 'create_appointment',
            scope: {
                tenantId: 'tenant_chatbot',
                projectId: 'project_chatbot',
                projectUserId: 'user_chatbot',
            },
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            publicRequest: true,
            hasConsent: true,
            now: '2026-06-26T14:20:00.000Z',
        }, client as any)).rejects.toMatchObject({
            code: 'CHATBOT_ACTION_BLOCKED',
            status: 403,
        });

        expect(client.getEvents()).toHaveLength(1);
        expect(client.getEvents()[0]).toMatchObject({
            event_type: 'chatbot_action_blocked',
            action_type: 'create_appointment',
            action_status: 'blocked',
        });
    });

    it('executes configured non-mutating knowledge actions through one canonical facade', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const chatbotBlueprint = reviewChatbotActionInBlueprint(businessBlueprint.chatbotBlueprint, {
            actionType: 'answer_from_knowledge',
            enabled: true,
            actorId: 'user_engine',
            now: '2026-06-26T14:30:00.000Z',
        }) as ChatbotBlueprint;
        const client = createProjectClient({
            businessBlueprint: {
                ...businessBlueprint,
                chatbotBlueprint,
            },
        });

        const result = await executeChatbotAction({
            actionType: 'answer_from_knowledge',
            scope: {
                tenantId: 'tenant_chatbot',
                projectId: 'project_chatbot',
                projectUserId: 'user_chatbot',
            },
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            publicRequest: true,
            now: '2026-06-26T14:30:00.000Z',
        }, client as any);

        expect(result).toMatchObject({
            projectId: 'project_chatbot',
            actionType: 'answer_from_knowledge',
            result: { status: 'observed', actionType: 'answer_from_knowledge' },
        });
        expect(client.getEvents().map(event => event.event_type)).toEqual([
            'chatbot_action_allowed',
            'chatbot_action_executed',
        ]);
    });

    it('runs a single Test Lab scenario and writes the event log', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const withAction = reviewChatbotActionInBlueprint(businessBlueprint.chatbotBlueprint, {
            actionType: 'answer_from_knowledge',
            enabled: true,
            now: '2026-06-26T14:40:00.000Z',
        }) as ChatbotBlueprint;
        const withBusinessKnowledge = reviewChatbotKnowledgeSourceInBlueprint(withAction, {
            sourceId: 'knowledge-business-blueprint',
            enabled: true,
            now: '2026-06-26T14:40:00.000Z',
        }) as ChatbotBlueprint;
        const chatbotBlueprint = reviewChatbotKnowledgeSourceInBlueprint(withBusinessKnowledge, {
            sourceId: 'knowledge-website-content',
            enabled: true,
            now: '2026-06-26T14:40:00.000Z',
        }) as ChatbotBlueprint;
        const client = createProjectClient({
            businessBlueprint: {
                ...businessBlueprint,
                chatbotBlueprint,
            },
        });

        const result = await runChatbotTestScenario('project_chatbot', {
            scenarioId: 'chatbot-test-visitor-basic',
            actorId: 'user_test',
            now: '2026-06-26T14:40:00.000Z',
        }, client as any);

        expect(result.result.passed).toBe(true);
        expect(result.chatbotBlueprint.testing.testScenarios.find(scenario => scenario.id === 'chatbot-test-visitor-basic')).toMatchObject({
            status: 'passed',
            needsReview: false,
        });
        expect(client.getEvents().at(-1)).toMatchObject({
            event_type: 'chatbot_test_scenario_run',
            action_type: 'record_analytics_event',
            action_status: 'observed',
            source_module: 'chatbot-engine-service',
        });
    });
});
