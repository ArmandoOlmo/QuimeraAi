import type {
    BlueprintReadiness,
    ChatbotActionBlueprint,
    ChatbotBlueprint,
    ChatbotKnowledgeSourceBlueprint,
} from '../../types/businessBlueprint';
import type { Project } from '../../types/project';
import { migrateBusinessBlueprint } from '../businessBlueprint';
import {
    buildChatbotEngineSurfaceDeploymentManifest,
    type ChatbotEngineDeploymentSurfaceId,
    type ChatbotEngineDeploymentSurfaceStatus,
} from './surfaceDeploymentManifest';

export type ChatbotEngineReadinessStatus = 'ready' | 'review' | 'blocked';

export interface ChatbotEngineCountSummary {
    total: number;
    ready: number;
    review: number;
    blocked: number;
}

export interface ChatbotEngineActionSummary extends ChatbotEngineCountSummary {
    enabled: number;
    disabled: number;
    publicAllowed: number;
    requiresAuth: number;
    requiresConsent: number;
    idempotent: number;
    auditLogged: number;
}

export interface ChatbotEngineKnowledgeSummary extends ChatbotEngineCountSummary {
    privateSources: number;
    internalSources: number;
}

export type ChatbotEngineSurfaceSummary = ChatbotEngineDeploymentSurfaceStatus;

export interface ChatbotEngineCapabilitySummary {
    id: 'leadCapture' | 'handoff' | 'appointments' | 'ecommerce' | 'restaurants' | 'realEstate' | 'bioPage' | 'finance' | 'voice';
    enabled: boolean;
    needsReview: boolean;
    status: ChatbotEngineReadinessStatus;
}

export interface ChatbotEngineDashboardSummary {
    hasBlueprint: boolean;
    engineVersion?: ChatbotBlueprint['engineVersion'];
    status: ChatbotEngineReadinessStatus;
    readyCheckpoints: number;
    totalCheckpoints: number;
    blockers: string[];
    warnings: string[];
    supportedLanguages: string[];
    agentName?: string;
    training: {
        businessKnowledgeCount: number;
        productKnowledgeCount: number;
        policyKnowledgeCount: number;
        eventIntentCount: number;
        knowledgeSectionCount: number;
        supportedLanguageCount: number;
    };
    knowledge: ChatbotEngineKnowledgeSummary;
    actions: ChatbotEngineActionSummary;
    surfaces: ChatbotEngineSurfaceSummary[];
    capabilities: ChatbotEngineCapabilitySummary[];
    testLab: {
        scenarioCount: number;
        regressionQuestionCount: number;
        blockedRuleCount: number;
        evaluationStatus: ChatbotBlueprint['testing']['evaluationStatus'] | 'missing';
    };
    eventLog: {
        eventCount: number;
        metricCount: number;
        conversionGoalCount: number;
        events: string[];
    };
    deployment: {
        status: ChatbotBlueprint['deployment']['status'] | 'missing';
        deployedSurfaces: string[];
        voiceEnabled: boolean;
        voiceProvider: string;
        voiceAgentConfigured: boolean;
        requireActionRegistry: boolean;
        requireKnowledgeReview: boolean;
        surfaceCoverage: {
            required: number;
            deployedRequired: number;
            public: number;
            deployedPublic: number;
            missingRequired: ChatbotEngineDeploymentSurfaceId[];
            blocked: ChatbotEngineDeploymentSurfaceId[];
            review: ChatbotEngineDeploymentSurfaceId[];
            status: ChatbotEngineReadinessStatus;
        };
    };
}

const emptyCounts = (): ChatbotEngineCountSummary => ({
    total: 0,
    ready: 0,
    review: 0,
    blocked: 0,
});

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readinessStatus(readiness?: BlueprintReadiness, needsReview = false): ChatbotEngineReadinessStatus {
    if ((readiness?.blockers || []).length > 0) return 'blocked';
    if (needsReview || (readiness?.warnings || []).length > 0 || readiness?.isReady === false) return 'review';
    return 'ready';
}

function addStatus(counts: ChatbotEngineCountSummary, status: ChatbotEngineReadinessStatus) {
    counts.total += 1;
    counts[status] += 1;
}

function summarizeKnowledge(sources: ChatbotKnowledgeSourceBlueprint[]): ChatbotEngineKnowledgeSummary {
    const counts: ChatbotEngineKnowledgeSummary = {
        ...emptyCounts(),
        privateSources: 0,
        internalSources: 0,
    };

    sources.forEach(source => {
        addStatus(counts, readinessStatus(source.readiness, source.needsReview || source.status !== 'ready'));
        if (source.visibility === 'private') counts.privateSources += 1;
        if (source.visibility === 'internal') counts.internalSources += 1;
    });

    return counts;
}

function summarizeActions(actions: ChatbotActionBlueprint[]): ChatbotEngineActionSummary {
    const counts: ChatbotEngineActionSummary = {
        ...emptyCounts(),
        enabled: 0,
        disabled: 0,
        publicAllowed: 0,
        requiresAuth: 0,
        requiresConsent: 0,
        idempotent: 0,
        auditLogged: 0,
    };

    actions.forEach(action => {
        addStatus(counts, readinessStatus(action.readiness, action.needsReview || action.status !== 'configured'));
        if (action.enabled) counts.enabled += 1;
        if (!action.enabled) counts.disabled += 1;
        if (action.publicAllowed) counts.publicAllowed += 1;
        if (action.requiresAuth) counts.requiresAuth += 1;
        if (action.requiresConsent) counts.requiresConsent += 1;
        if (action.idempotencyRequired) counts.idempotent += 1;
        if (action.auditLogRequired) counts.auditLogged += 1;
    });

    return counts;
}

function buildCapabilitySummary(blueprint: ChatbotBlueprint): ChatbotEngineCapabilitySummary[] {
    const voiceSettings = blueprint.deployment.voiceSettings;
    const financeActions = blueprint.actions.filter(action => action.ownerModule === 'finance');
    const financeNeedsReview = financeActions.length === 0
        || financeActions.some(action => action.needsReview || action.status !== 'configured' || !action.enabled);
    return [
        {
            id: 'leadCapture',
            enabled: blueprint.leadCapture.enabled,
            needsReview: blueprint.leadCapture.needsReview,
            status: blueprint.leadCapture.needsReview ? 'review' : 'ready',
        },
        {
            id: 'handoff',
            enabled: blueprint.handoff.enabled,
            needsReview: blueprint.handoff.needsReview,
            status: blueprint.handoff.needsReview ? 'review' : 'ready',
        },
        {
            id: 'appointments',
            enabled: blueprint.appointments.enabled,
            needsReview: blueprint.appointments.needsReview,
            status: blueprint.appointments.needsReview ? 'review' : 'ready',
        },
        {
            id: 'ecommerce',
            enabled: blueprint.ecommerce.enabled,
            needsReview: blueprint.ecommerce.needsReview,
            status: blueprint.ecommerce.needsReview ? 'review' : 'ready',
        },
        {
            id: 'restaurants',
            enabled: blueprint.restaurants.enabled,
            needsReview: blueprint.restaurants.needsReview,
            status: blueprint.restaurants.needsReview ? 'review' : 'ready',
        },
        {
            id: 'realEstate',
            enabled: blueprint.realEstate.enabled,
            needsReview: blueprint.realEstate.needsReview,
            status: blueprint.realEstate.needsReview ? 'review' : 'ready',
        },
        {
            id: 'bioPage',
            enabled: blueprint.bioPage.enabled,
            needsReview: blueprint.bioPage.needsReview,
            status: blueprint.bioPage.needsReview ? 'review' : 'ready',
        },
        {
            id: 'finance',
            enabled: financeActions.length > 0,
            needsReview: financeNeedsReview,
            status: financeActions.length === 0 ? 'blocked' : financeNeedsReview ? 'review' : 'ready',
        },
        {
            id: 'voice',
            enabled: voiceSettings.enabled,
            needsReview: !voiceSettings.enabled || !voiceSettings.agentId,
            status: voiceSettings.enabled && voiceSettings.agentId ? 'ready' : 'blocked',
        },
    ];
}

function collectReadiness(blueprint: ChatbotBlueprint, surfaces: ChatbotEngineSurfaceSummary[]): {
    status: ChatbotEngineReadinessStatus;
    readyCheckpoints: number;
    totalCheckpoints: number;
    blockers: string[];
    warnings: string[];
} {
    const checkpoints: ChatbotEngineReadinessStatus[] = [
        readinessStatus(blueprint.readiness, blueprint.needsReview),
        ...blueprint.knowledgeSources.map(source => readinessStatus(source.readiness, source.needsReview || source.status !== 'ready')),
        ...blueprint.actions.map(action => readinessStatus(action.readiness, action.needsReview || action.status !== 'configured')),
        ...surfaces.map(surface => surface.readinessStatus),
        readinessStatus(blueprint.testing.readiness, blueprint.testing.evaluationStatus !== 'passing'),
        readinessStatus(blueprint.deployment.readiness, blueprint.deployment.status !== 'deployed'),
    ];

    const blockers = [
        ...blueprint.readiness.blockers,
        ...blueprint.knowledgeSources.flatMap(source => source.readiness.blockers),
        ...blueprint.actions.flatMap(action => action.readiness.blockers),
        ...surfaces.flatMap(surface => surface.blockers),
        ...blueprint.testing.readiness.blockers,
        ...blueprint.deployment.readiness.blockers,
    ];
    const warnings = [
        ...blueprint.readiness.warnings,
        ...blueprint.knowledgeSources.flatMap(source => source.readiness.warnings),
        ...blueprint.actions.flatMap(action => action.readiness.warnings),
        ...surfaces.flatMap(surface => surface.warnings),
        ...blueprint.testing.readiness.warnings,
        ...blueprint.deployment.readiness.warnings,
    ];

    return {
        status: checkpoints.includes('blocked') ? 'blocked' : checkpoints.includes('review') ? 'review' : 'ready',
        readyCheckpoints: checkpoints.filter(status => status === 'ready').length,
        totalCheckpoints: checkpoints.length,
        blockers: Array.from(new Set(blockers)).filter(Boolean),
        warnings: Array.from(new Set(warnings)).filter(Boolean),
    };
}

export function resolveProjectChatbotBlueprint(project: Pick<Project, 'businessBlueprint' | 'data'> | null | undefined): ChatbotBlueprint | null {
    const data = isPlainRecord(project?.data) ? project?.data : null;
    const candidate = project?.businessBlueprint || (isPlainRecord(data?.businessBlueprint) ? data.businessBlueprint : undefined);
    const migratedBlueprint = migrateBusinessBlueprint(candidate);
    return migratedBlueprint?.chatbotBlueprint || null;
}

export function buildChatbotEngineDashboardSummary(blueprint: ChatbotBlueprint | null | undefined): ChatbotEngineDashboardSummary {
    if (!blueprint) {
        return {
            hasBlueprint: false,
            status: 'blocked',
            readyCheckpoints: 0,
            totalCheckpoints: 0,
            blockers: ['chatbot_blueprint_missing'],
            warnings: [],
            supportedLanguages: [],
            training: {
                businessKnowledgeCount: 0,
                productKnowledgeCount: 0,
                policyKnowledgeCount: 0,
                eventIntentCount: 0,
                knowledgeSectionCount: 0,
                supportedLanguageCount: 0,
            },
            knowledge: { ...emptyCounts(), privateSources: 0, internalSources: 0 },
            actions: {
                ...emptyCounts(),
                enabled: 0,
                disabled: 0,
                publicAllowed: 0,
                requiresAuth: 0,
                requiresConsent: 0,
                idempotent: 0,
                auditLogged: 0,
            },
            surfaces: [],
            capabilities: [],
            testLab: {
                scenarioCount: 0,
                regressionQuestionCount: 0,
                blockedRuleCount: 0,
                evaluationStatus: 'missing',
            },
            eventLog: {
                eventCount: 0,
                metricCount: 0,
                conversionGoalCount: 0,
                events: [],
            },
            deployment: {
                status: 'missing',
                deployedSurfaces: [],
                voiceEnabled: false,
                voiceProvider: 'none',
                voiceAgentConfigured: false,
                requireActionRegistry: true,
                requireKnowledgeReview: true,
                surfaceCoverage: {
                    required: 0,
                    deployedRequired: 0,
                    public: 0,
                    deployedPublic: 0,
                    missingRequired: [],
                    blocked: [],
                    review: [],
                    status: 'blocked',
                },
            },
        };
    }

    const surfaceManifest = buildChatbotEngineSurfaceDeploymentManifest(blueprint.channels);
    const surfaces = surfaceManifest.surfaces;
    const readiness = collectReadiness(blueprint, surfaces);
    const safetySettings = isPlainRecord(blueprint.deployment.safetySettings) ? blueprint.deployment.safetySettings : {};
    const trainingSections = [
        blueprint.businessKnowledge,
        blueprint.productKnowledge,
        blueprint.policyKnowledge,
    ].filter(section => section.length > 0).length;

    return {
        hasBlueprint: true,
        engineVersion: blueprint.engineVersion,
        status: readiness.status,
        readyCheckpoints: readiness.readyCheckpoints,
        totalCheckpoints: readiness.totalCheckpoints,
        blockers: readiness.blockers,
        warnings: readiness.warnings,
        supportedLanguages: blueprint.agentProfile.supportedLanguages,
        agentName: blueprint.agentProfile.agentName,
        training: {
            businessKnowledgeCount: blueprint.businessKnowledge.length,
            productKnowledgeCount: blueprint.productKnowledge.length,
            policyKnowledgeCount: blueprint.policyKnowledge.length,
            eventIntentCount: blueprint.eventIntents.length,
            knowledgeSectionCount: trainingSections,
            supportedLanguageCount: blueprint.agentProfile.supportedLanguages.length,
        },
        knowledge: summarizeKnowledge(blueprint.knowledgeSources),
        actions: summarizeActions(blueprint.actions),
        surfaces,
        capabilities: buildCapabilitySummary(blueprint),
        testLab: {
            scenarioCount: blueprint.testing.testScenarios.length,
            regressionQuestionCount: blueprint.testing.regressionQuestions.length,
            blockedRuleCount: blueprint.testing.blockedAnswerRules.length,
            evaluationStatus: blueprint.testing.evaluationStatus,
        },
        eventLog: {
            eventCount: blueprint.analytics.events.length,
            metricCount: blueprint.analytics.metrics.length,
            conversionGoalCount: blueprint.analytics.conversionGoals.length,
            events: blueprint.analytics.events,
        },
        deployment: {
            status: blueprint.deployment.status,
            deployedSurfaces: blueprint.deployment.deployedSurfaces,
            voiceEnabled: blueprint.deployment.voiceSettings.enabled,
            voiceProvider: blueprint.deployment.voiceSettings.provider || 'none',
            voiceAgentConfigured: Boolean(blueprint.deployment.voiceSettings.agentId),
            requireActionRegistry: safetySettings.requireActionRegistry !== false,
            requireKnowledgeReview: safetySettings.requireKnowledgeReview !== false,
            surfaceCoverage: {
                required: surfaceManifest.requiredSurfaceCount,
                deployedRequired: surfaceManifest.deployedRequiredSurfaceCount,
                public: surfaceManifest.publicSurfaceCount,
                deployedPublic: surfaceManifest.deployedPublicSurfaceCount,
                missingRequired: surfaceManifest.missingRequiredSurfaceIds,
                blocked: surfaceManifest.blockedSurfaceIds,
                review: surfaceManifest.reviewSurfaceIds,
                status: surfaceManifest.coverageStatus,
            },
        },
    };
}
