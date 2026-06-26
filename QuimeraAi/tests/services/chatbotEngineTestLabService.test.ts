import { describe, expect, it, vi } from 'vitest';
import type { ChatbotActionType, ChatbotBlueprint, ChatbotKnowledgeSourceType } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import {
    runChatbotTestLabInBlueprint,
    runProjectChatbotTestLab,
} from '../../services/chatbotEngine/chatbotEngineTestLabService';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Test Shop',
            industry: 'appointments and ecommerce',
            description: 'A bilingual business with chatbot test coverage.',
            tagline: 'Test smarter',
            services: [{ name: 'Consultation', description: 'Reviewed appointment flow.' }],
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

function buildBlueprint(): ChatbotBlueprint {
    return buildBusinessBlueprint().chatbotBlueprint;
}

function configureExpectedTestLabDependencies(blueprint: ChatbotBlueprint): ChatbotBlueprint {
    const expectedActions = new Set<ChatbotActionType>(
        blueprint.testing.testScenarios.flatMap(scenario => scenario.expectedActions),
    );
    const expectedSources = new Set<ChatbotKnowledgeSourceType>(
        blueprint.testing.testScenarios.flatMap(scenario => scenario.expectedSources),
    );

    return {
        ...blueprint,
        actions: blueprint.actions.map(action => expectedActions.has(action.actionType)
            ? {
                ...action,
                enabled: true,
                status: 'configured' as const,
                needsReview: false,
                requiresReview: false,
                readiness: { isReady: true, blockers: [], warnings: [] },
            }
            : action),
        knowledgeSources: blueprint.knowledgeSources.map(source => expectedSources.has(source.type)
            ? {
                ...source,
                status: 'ready' as const,
                freshness: 'fresh' as const,
                needsReview: false,
                readiness: { isReady: true, blockers: [], warnings: [] },
            }
            : source),
    };
}

function createProjectClient(projectData: Record<string, unknown>) {
    let currentProjectData = projectData;
    const events: any[] = [];

    const client = {
        from: vi.fn((table: string) => {
            if (table === 'projects') {
                const projectQuery: any = {
                    select: vi.fn(() => projectQuery),
                    eq: vi.fn(() => projectQuery),
                    maybeSingle: vi.fn(async () => ({ data: { data: currentProjectData }, error: null })),
                    update: vi.fn((payload: Record<string, unknown>) => {
                        currentProjectData = payload.data as Record<string, unknown>;
                        return {
                            eq: vi.fn(async () => ({ error: null })),
                        };
                    }),
                };
                return projectQuery;
            }

            if (table === 'chatbot_engine_events') {
                const eventQuery: any = {
                    insert: vi.fn((payload: Record<string, unknown>) => {
                        const row = { id: `event_${events.length + 1}`, ...payload };
                        events.push(row);
                        return eventQuery;
                    }),
                    select: vi.fn(() => eventQuery),
                    maybeSingle: vi.fn(async () => ({ data: { id: events[events.length - 1]?.id }, error: null })),
                };
                return eventQuery;
            }

            throw new Error(`Unexpected table ${table}`);
        }),
        getProjectData: () => currentProjectData,
        getEvents: () => events,
    };

    return client;
}

describe('chatbotEngineTestLabService', () => {
    it('fails draft scenarios when Action Registry and Knowledge Center are not approved', () => {
        const result = runChatbotTestLabInBlueprint(buildBlueprint(), {
            projectId: 'project_chatbot',
            now: '2026-06-26T18:00:00.000Z',
        });

        expect(result.status).toBe('failing');
        expect(result.scenarioResults.every(scenario => !scenario.passed)).toBe(true);
        expect(result.scenarioResults[0].blockers).toEqual(expect.arrayContaining([
            expect.stringContaining('action_disabled'),
            expect.stringContaining('knowledge_needs_review'),
        ]));
        expect(result.blueprint.testing.readiness.blockers[0]).toContain('ES:');
    });

    it('passes scenarios when expected actions and sources are configured', () => {
        const result = runChatbotTestLabInBlueprint(configureExpectedTestLabDependencies(buildBlueprint()), {
            projectId: 'project_chatbot',
            actorId: 'qa_1',
            now: '2026-06-26T18:00:00.000Z',
        });

        expect(result.status).toBe('passing');
        expect(result.scenarioResults.every(scenario => scenario.passed)).toBe(true);
        expect(result.blueprint.testing.readiness).toEqual({ isReady: true, blockers: [], warnings: [] });
        expect(result.blueprint.metadata.lastEditedBy).toBe('qa_1');
    });

    it('persists project-scoped Test Lab runs and records an audit event', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const projectData = {
            businessBlueprint: {
                ...businessBlueprint,
                chatbotBlueprint: configureExpectedTestLabDependencies(businessBlueprint.chatbotBlueprint),
            },
        };
        const client = createProjectClient(projectData);

        const result = await runProjectChatbotTestLab('project_chatbot', {
            actorId: 'qa_1',
            runId: 'run_1',
            now: '2026-06-26T18:00:00.000Z',
        }, client as any);

        expect(result.status).toBe('passing');
        expect(result.passed).toBe(true);
        expect(result.eventId).toBe('event_2');

        const updatedData = client.getProjectData() as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.testing.evaluationStatus).toBe('passing');
        const configurationEvent = client.getEvents().find(event => event.event_type === 'chatbot_configuration_updated');
        const runEvent = client.getEvents().find(event => event.event_type === 'chatbot_test_lab_run');
        expect(configurationEvent).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_configuration_updated',
            action_status: 'executed',
            source_surface: 'admin_preview',
            source_module: 'chatbot-engine-dashboard',
            actor_id: 'qa_1',
        });
        expect(configurationEvent.metadata).toMatchObject({
            configurationType: 'configuration',
            targetId: 'chatbotBlueprint',
            operation: 'update',
            projectScoped: true,
            idempotent: true,
        });
        expect(runEvent).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_test_lab_run',
            action_type: 'record_analytics_event',
            action_status: 'observed',
            correlation_id: 'run_1',
            actor_id: 'qa_1',
        });
        expect(runEvent.metadata).toMatchObject({
            runId: 'run_1',
            status: 'passing',
            passedCount: result.scenarioResults.length,
            failedCount: 0,
        });
    });
});
