import { describe, expect, it, vi } from 'vitest';
import type { ChatbotBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import {
    addChatbotKnowledgeSourceToBlueprint,
    addProjectChatbotKnowledgeSource,
    disableAction,
    enableAction,
    getChatbotConfig,
    reviewChatbotActionInBlueprint,
    reviewChatbotKnowledgeSourceInBlueprint,
    updateChatbotSurfaceDeploymentInBlueprint,
    updateChatbotTestScenarioInBlueprint,
    updateChatbotVoiceSettingsInBlueprint,
    updateProjectChatbotActionReview,
    updateProjectChatbotKnowledgeSourceReview,
    updateProjectChatbotSurfaceDeployment,
    updateProjectChatbotTestScenarioStatus,
    updateProjectChatbotVoiceSettings,
} from '../../services/chatbotEngine/chatbotEngineConfigurationService';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Service',
            industry: 'appointments and ecommerce',
            description: 'A bilingual service business with ChatCore.',
            tagline: 'Serve smarter',
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

function buildBlueprint(): ChatbotBlueprint {
    return createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_chatbot',
        tenantId: 'tenant_chatbot',
    }).chatbotBlueprint;
}

function buildBusinessBlueprint() {
    return createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_chatbot',
        tenantId: 'tenant_chatbot',
    });
}

function createProjectClient(projectData: Record<string, unknown>) {
    let updatePayload: Record<string, unknown> | undefined;
    const events: Record<string, unknown>[] = [];
    const selectQuery: any = {
        select: vi.fn(() => selectQuery),
        eq: vi.fn(() => selectQuery),
        maybeSingle: vi.fn(async () => ({ data: { data: projectData }, error: null })),
    };
    const updateQuery: any = {
        eq: vi.fn(async () => ({ error: null })),
    };
    const tableApi: any = {
        select: selectQuery.select,
        update: vi.fn((payload: Record<string, unknown>) => {
            updatePayload = payload;
            return updateQuery;
        }),
    };
    const eventQuery: any = {
        insert: vi.fn((payload: Record<string, unknown>) => {
            events.push(payload);
            return eventQuery;
        }),
        select: vi.fn(() => eventQuery),
        maybeSingle: vi.fn(async () => ({ data: { id: `event-${events.length}` }, error: null })),
    };
    const client = {
        from: vi.fn((table: string) => {
            if (table === 'chatbot_engine_events') return eventQuery;
            return tableApi;
        }),
        getUpdatePayload: () => updatePayload,
        getEvents: () => events,
        selectQuery,
        updateQuery,
        tableApi,
        eventQuery,
    };
    return client;
}

describe('chatbotEngineConfigurationService', () => {
    it('configures safe actions and locks them from AI regeneration', () => {
        const next = reviewChatbotActionInBlueprint(buildBlueprint(), {
            actionType: 'answer_from_knowledge',
            enabled: true,
            actorId: 'user_1',
            now: '2026-06-26T12:00:00.000Z',
        });

        const action = next.actions.find(item => item.actionType === 'answer_from_knowledge');
        expect(action).toMatchObject({
            enabled: true,
            status: 'configured',
            needsReview: false,
            requiresReview: false,
            readiness: { isReady: true, blockers: [], warnings: [] },
        });
        expect(next.metadata).toMatchObject({
            userModified: true,
            lockedFromRegeneration: true,
            lastEditedAt: '2026-06-26T12:00:00.000Z',
            lastEditedBy: 'user_1',
        });
    });

    it('does not enable actions while readiness blockers are present', () => {
        expect(() => reviewChatbotActionInBlueprint(buildBlueprint(), {
            actionType: 'create_appointment',
            enabled: true,
            now: '2026-06-26T12:00:00.000Z',
        })).toThrow('readiness blockers');
    });

    it('persists targeted Action Registry updates into project data', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const projectData = {
            name: 'Quimera Service',
            data: { hero: { title: 'Hello' } },
            businessBlueprint,
        };
        const client = createProjectClient(projectData);

        const result = await updateProjectChatbotActionReview('project_chatbot', {
            actionType: 'answer_from_knowledge',
            enabled: true,
            actorId: 'user_1',
            now: '2026-06-26T12:00:00.000Z',
        }, client as any);

        expect(client.from).toHaveBeenCalledWith('projects');
        expect(client.selectQuery.eq).toHaveBeenCalledWith('id', 'project_chatbot');
        expect(client.tableApi.update).toHaveBeenCalledTimes(1);
        expect(client.updateQuery.eq).toHaveBeenCalledWith('id', 'project_chatbot');
        expect(result.auditEventId).toBe('event-1');
        expect(result.action).toMatchObject({
            actionType: 'answer_from_knowledge',
            enabled: true,
            status: 'configured',
        });
        expect(client.getEvents()[0]).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_configuration_updated',
            action_type: 'answer_from_knowledge',
            action_status: 'executed',
            source_surface: 'admin_preview',
            source_module: 'chatbot-engine-dashboard',
            actor_type: 'project_user',
            actor_id: 'user_1',
        });
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'actionRegistry',
            targetId: 'answer_from_knowledge',
            operation: 'enable_action',
            projectScoped: true,
            idempotent: true,
            auditLogRequired: true,
        });
        const updatePayload = client.getUpdatePayload();
        expect(updatePayload?.last_updated).toBe('2026-06-26T12:00:00.000Z');
        const updatedData = updatePayload?.data as any;
        expect(updatedData.name).toBe('Quimera Service');
        expect(updatedData.businessBlueprint.chatbotBlueprint.actions.find((item: any) => item.actionType === 'answer_from_knowledge')).toMatchObject({
            enabled: true,
            status: 'configured',
        });
    });

    it('reviews Knowledge Center sources and locks them from AI regeneration', () => {
        const next = reviewChatbotKnowledgeSourceInBlueprint(buildBlueprint(), {
            sourceId: 'knowledge-business-blueprint',
            enabled: true,
            actorId: 'user_knowledge',
            now: '2026-06-26T13:00:00.000Z',
        });

        const source = next.knowledgeSources.find(item => item.id === 'knowledge-business-blueprint');
        expect(source).toMatchObject({
            status: 'ready',
            freshness: 'fresh',
            needsReview: false,
            userModified: true,
            lockedFromRegeneration: true,
            readiness: { isReady: true, blockers: [], warnings: [] },
        });
        expect(next.metadata).toMatchObject({
            userModified: true,
            lockedFromRegeneration: true,
            lastEditedAt: '2026-06-26T13:00:00.000Z',
            lastEditedBy: 'user_knowledge',
        });
    });

    it('adds manual Knowledge Center sources as review-gated locked project knowledge', () => {
        const result = addChatbotKnowledgeSourceToBlueprint(buildBlueprint(), {
            name: 'Refund FAQ',
            type: 'faq',
            visibility: 'public',
            content: 'ES: Los reembolsos se revisan caso a caso. EN: Refunds are reviewed case by case.',
            actorId: 'user_knowledge',
            now: '2026-06-26T13:30:00.000Z',
        });

        expect(result.duplicate).toBe(false);
        expect(result.knowledgeSource).toMatchObject({
            name: 'Refund FAQ',
            type: 'faq',
            visibility: 'public',
            status: 'needs_review',
            needsReview: true,
            generatedByAI: false,
            userModified: true,
            lockedFromRegeneration: true,
            contentLength: expect.any(Number),
            contentPreview: expect.stringContaining('Refunds are reviewed'),
        });
        expect(result.blueprint.knowledgeSources).toContainEqual(result.knowledgeSource);
        expect(result.blueprint.metadata).toMatchObject({
            userModified: true,
            lockedFromRegeneration: true,
            lastEditedAt: '2026-06-26T13:30:00.000Z',
            lastEditedBy: 'user_knowledge',
        });
    });

    it('keeps manual Knowledge Center source creation idempotent by generated source hash', () => {
        const input = {
            name: 'Refund FAQ',
            type: 'faq' as const,
            visibility: 'public' as const,
            content: 'ES: Los reembolsos se revisan caso a caso. EN: Refunds are reviewed case by case.',
            now: '2026-06-26T13:30:00.000Z',
        };
        const first = addChatbotKnowledgeSourceToBlueprint(buildBlueprint(), input);
        const second = addChatbotKnowledgeSourceToBlueprint(first.blueprint, input);

        expect(second.duplicate).toBe(true);
        expect(second.knowledgeSource.id).toBe(first.knowledgeSource.id);
        expect(second.blueprint.knowledgeSources.filter(source => source.id === first.knowledgeSource.id)).toHaveLength(1);
    });

    it('does not enable Knowledge Center sources while readiness blockers are present', () => {
        expect(() => reviewChatbotKnowledgeSourceInBlueprint(buildBlueprint(), {
            sourceId: 'knowledge-ecommerce-orders-private',
            enabled: true,
            now: '2026-06-26T13:00:00.000Z',
        })).toThrow('readiness blockers');
    });

    it('persists Knowledge Center review updates into project data', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const projectData = {
            name: 'Quimera Service',
            businessBlueprint,
        };
        const client = createProjectClient(projectData);

        const result = await updateProjectChatbotKnowledgeSourceReview('project_chatbot', {
            sourceId: 'knowledge-business-blueprint',
            enabled: true,
            actorId: 'user_knowledge',
            now: '2026-06-26T13:00:00.000Z',
        }, client as any);

        expect(result.knowledgeSource).toMatchObject({
            id: 'knowledge-business-blueprint',
            status: 'ready',
            needsReview: false,
        });
        expect(result.auditEventId).toBe('event-1');
        expect(client.getEvents()[0]).toMatchObject({
            project_id: 'project_chatbot',
            event_type: 'chatbot_configuration_updated',
            action_type: null,
            source_module: 'chatbot-engine-dashboard',
        });
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'knowledgeCenter',
            targetId: 'knowledge-business-blueprint',
            operation: 'enable_knowledge_source',
        });
        const updatePayload = client.getUpdatePayload();
        const updatedData = updatePayload?.data as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.knowledgeSources.find((item: any) => item.id === 'knowledge-business-blueprint')).toMatchObject({
            status: 'ready',
            needsReview: false,
        });
    });

    it('persists added Knowledge Center sources into project data with audit evidence', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const client = createProjectClient({ businessBlueprint });

        const result = await addProjectChatbotKnowledgeSource('project_chatbot', {
            name: 'Public FAQ',
            type: 'faq',
            visibility: 'public',
            content: 'ES: Pregunta frecuente revisable. EN: Reviewable frequently asked question.',
            actorId: 'user_knowledge',
            now: '2026-06-26T13:45:00.000Z',
        }, client as any);

        expect(result.knowledgeSource).toMatchObject({
            name: 'Public FAQ',
            status: 'needs_review',
            needsReview: true,
            contentPreview: expect.stringContaining('Reviewable frequently asked question'),
        });
        expect(result.auditEventId).toBe('event-1');
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'knowledgeCenter',
            targetId: result.knowledgeSource.id,
            operation: 'add_knowledge_source',
            after: {
                id: result.knowledgeSource.id,
                type: 'faq',
                status: 'needs_review',
                visibility: 'public',
                needsReview: true,
                contentLength: expect.any(Number),
                duplicate: false,
            },
        });
        const updatePayload = client.getUpdatePayload();
        const updatedData = updatePayload?.data as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.knowledgeSources.find((item: any) => item.id === result.knowledgeSource.id)).toMatchObject({
            name: 'Public FAQ',
            status: 'needs_review',
        });
    });

    it('updates Test Lab scenario status and derives evaluation readiness', () => {
        const firstScenarioId = buildBlueprint().testing.testScenarios[0].id;
        const next = updateChatbotTestScenarioInBlueprint(buildBlueprint(), {
            scenarioId: firstScenarioId,
            status: 'passed',
            actorId: 'qa_1',
            now: '2026-06-26T14:00:00.000Z',
        });

        expect(next.testing.testScenarios.find(item => item.id === firstScenarioId)).toMatchObject({
            status: 'passed',
            needsReview: false,
        });
        expect(next.testing.evaluationStatus).toBe('needs_review');
        expect(next.testing.readiness).toMatchObject({
            isReady: false,
            blockers: [],
        });
        expect(next.metadata).toMatchObject({
            lastEditedAt: '2026-06-26T14:00:00.000Z',
            lastEditedBy: 'qa_1',
        });
    });

    it('marks Test Lab passing only after all scenarios pass', () => {
        const blueprint = buildBlueprint();
        const scenarioIds = blueprint.testing.testScenarios.map(scenario => scenario.id);
        const next = scenarioIds.reduce((current, scenarioId) => updateChatbotTestScenarioInBlueprint(current, {
            scenarioId,
            status: 'passed',
            now: '2026-06-26T14:00:00.000Z',
        }), blueprint);

        expect(next.testing.evaluationStatus).toBe('passing');
        expect(next.testing.readiness).toEqual({ isReady: true, blockers: [], warnings: [] });
    });

    it('persists Test Lab scenario updates into project data', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const projectData = {
            name: 'Quimera Service',
            businessBlueprint,
        };
        const client = createProjectClient(projectData);
        const scenarioId = businessBlueprint.chatbotBlueprint.testing.testScenarios[0].id;

        const result = await updateProjectChatbotTestScenarioStatus('project_chatbot', {
            scenarioId,
            status: 'failed',
            actorId: 'qa_1',
            now: '2026-06-26T14:00:00.000Z',
        }, client as any);

        expect(result.testScenario).toMatchObject({
            id: scenarioId,
            status: 'failed',
            needsReview: true,
        });
        expect(result.auditEventId).toBe('event-1');
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'testLab',
            targetId: scenarioId,
            operation: 'mark_failed',
            after: {
                status: 'failed',
                needsReview: true,
                evaluationStatus: 'failing',
            },
        });
        const updatePayload = client.getUpdatePayload();
        const updatedData = updatePayload?.data as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.testing.evaluationStatus).toBe('failing');
        expect(updatedData.businessBlueprint.chatbotBlueprint.testing.readiness.blockers[0]).toContain('ES:');
    });

    it('exposes canonical service aliases for Chatbot Engine configuration', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const client = createProjectClient({ businessBlueprint });

        const config = await getChatbotConfig('project_chatbot', client as any);
        expect(config.chatbotBlueprint.engineVersion).toBe('v2');

        const enabled = await enableAction('project_chatbot', 'answer_from_knowledge', 'user_1', client as any);
        expect(enabled.action).toMatchObject({ actionType: 'answer_from_knowledge', enabled: true });

        const disabled = await disableAction('project_chatbot', 'answer_from_knowledge', 'user_1', client as any);
        expect(disabled.action).toMatchObject({ actionType: 'answer_from_knowledge', enabled: false });
    });

    it('includes Booking Pages as a canonical deployment surface', () => {
        const blueprint = buildBlueprint();

        expect(blueprint.channels.bookingPage).toMatchObject({
            sourceSurface: 'booking_page',
            routePattern: '/booking/:serviceId',
        });
    });

    it('deploys and pauses project-scoped chatbot surfaces', () => {
        const deployed = updateChatbotSurfaceDeploymentInBlueprint(buildBlueprint(), {
            surfaceId: 'bookingPage',
            status: 'deployed',
            actorId: 'deploy_user',
            now: '2026-06-26T15:00:00.000Z',
        });

        expect(deployed.channels.bookingPage).toMatchObject({
            enabled: true,
            status: 'deployed',
            needsReview: false,
            readiness: { isReady: true, blockers: [], warnings: [] },
        });
        expect(deployed.deployment.status).toBe('deployed');
        expect(deployed.deployment.deployedSurfaces).toContain('booking_page');
        expect(deployed.metadata).toMatchObject({
            userModified: true,
            lockedFromRegeneration: true,
            lastEditedBy: 'deploy_user',
        });

        const paused = updateChatbotSurfaceDeploymentInBlueprint(deployed, {
            surfaceId: 'bookingPage',
            status: 'paused',
            now: '2026-06-26T15:10:00.000Z',
        });

        expect(paused.channels.bookingPage).toMatchObject({
            enabled: false,
            status: 'paused',
            needsReview: true,
        });
        expect(paused.deployment.deployedSurfaces).not.toContain('booking_page');
    });

    it('persists deployment surface updates into project data', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const client = createProjectClient({ businessBlueprint });

        const result = await updateProjectChatbotSurfaceDeployment('project_chatbot', {
            surfaceId: 'storefront',
            status: 'deployed',
            actorId: 'deploy_user',
            now: '2026-06-26T15:00:00.000Z',
        }, client as any);

        expect(result.surfaceId).toBe('storefront');
        expect(result.surface).toMatchObject({ enabled: true, status: 'deployed' });
        expect(result.auditEventId).toBe('event-1');
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'deploySettings',
            targetId: 'storefront',
            operation: 'surface_deployed',
            after: {
                enabled: true,
                status: 'deployed',
                needsReview: false,
            },
        });
        const updatePayload = client.getUpdatePayload();
        const updatedData = updatePayload?.data as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.channels.storefront.status).toBe('deployed');
        expect(updatedData.businessBlueprint.chatbotBlueprint.deployment.deployedSurfaces).toContain('storefront');
    });

    it('requires a provider agent before enabling voice', () => {
        expect(() => updateChatbotVoiceSettingsInBlueprint(buildBlueprint(), {
            enabled: true,
            provider: 'elevenlabs',
            now: '2026-06-26T16:00:00.000Z',
        })).toThrow('agent ID');
    });

    it('configures voice with explicit provider, agent, language mode, and consent', () => {
        const next = updateChatbotVoiceSettingsInBlueprint(buildBlueprint(), {
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'voice_agent_123',
            languageMode: 'visitor_language',
            consentRequired: true,
            actorId: 'voice_user',
            now: '2026-06-26T16:00:00.000Z',
        });

        expect(next.deployment.voiceSettings).toMatchObject({
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'voice_agent_123',
            languageMode: 'visitor_language',
            consentRequired: true,
        });
        expect(next.channels.voice).toMatchObject({
            enabled: true,
            status: 'deployed',
            readiness: { isReady: true, blockers: [], warnings: [] },
        });
        expect(next.deployment.deployedSurfaces).toContain('voice');
        expect(next.metadata.lastEditedBy).toBe('voice_user');
    });

    it('persists voice settings into project data', async () => {
        const businessBlueprint = buildBusinessBlueprint();
        const client = createProjectClient({ businessBlueprint });

        const result = await updateProjectChatbotVoiceSettings('project_chatbot', {
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'voice_agent_123',
            languageMode: 'visitor_language',
            consentRequired: true,
            actorId: 'voice_user',
            now: '2026-06-26T16:00:00.000Z',
        }, client as any);

        expect(result.voiceSettings).toMatchObject({
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'voice_agent_123',
        });
        expect(result.auditEventId).toBe('event-1');
        expect(client.getEvents()[0].metadata).toMatchObject({
            configurationType: 'voiceSettings',
            targetId: 'voice',
            operation: 'enable_voice',
            after: {
                enabled: true,
                provider: 'elevenlabs',
                agentConfigured: true,
                surfaceStatus: 'deployed',
            },
        });
        const updatePayload = client.getUpdatePayload();
        const updatedData = updatePayload?.data as any;
        expect(updatedData.businessBlueprint.chatbotBlueprint.deployment.voiceSettings.agentId).toBe('voice_agent_123');
        expect(updatedData.businessBlueprint.chatbotBlueprint.channels.voice.status).toBe('deployed');
    });
});
