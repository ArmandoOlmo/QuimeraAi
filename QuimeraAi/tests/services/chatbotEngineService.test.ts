import { describe, expect, it, vi } from 'vitest';
import type { ChatbotBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    executeChatbotAction,
    getChatbotReadiness,
    getKnowledgeSources,
    recordChatbotEvent,
    runChatbotTestScenario,
    syncKnowledgeSource,
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

function createProjectClient(initialProjectData: Record<string, unknown>) {
    let projectData = initialProjectData;
    const events: Record<string, unknown>[] = [];

    class Query {
        private insertPayload: Record<string, unknown> | null = null;
        private updatePayload: Record<string, unknown> | null = null;

        constructor(private table: string) { }

        select() {
            return this;
        }

        insert(payload: Record<string, unknown>) {
            this.insertPayload = payload;
            if (this.table === 'chatbot_engine_events') {
                events.push(payload);
            }
            return this;
        }

        update(payload: Record<string, unknown>) {
            this.updatePayload = payload;
            return this;
        }

        eq() {
            if (this.table === 'projects' && this.updatePayload) {
                projectData = this.updatePayload.data as Record<string, unknown>;
                return Promise.resolve({ error: null });
            }
            return this;
        }

        async maybeSingle() {
            if (this.table === 'projects') {
                return { data: { data: projectData }, error: null };
            }
            if (this.table === 'chatbot_engine_events' && this.insertPayload) {
                return { data: { id: `event-${events.length}` }, error: null };
            }
            return { data: null, error: null };
        }
    }

    return {
        from: vi.fn((table: string) => new Query(table)),
        getProjectData: () => projectData,
        getEvents: () => events,
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

        expect(result.id).toBe('event-1');
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
