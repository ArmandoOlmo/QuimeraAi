import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type {
    BlueprintReadiness,
    ChatbotActionType,
    ChatbotBlueprint,
    ChatbotDeploymentStatus,
    ChatbotKnowledgeSourceBlueprint,
    ChatbotSurface,
    ChatbotTestScenarioBlueprint,
} from '../../types/businessBlueprint';
import {
    buildChatbotEngineExecutedEvent,
    buildChatbotEngineObservedEvent,
    CHATBOT_ACTION_BLOCKED_MESSAGE,
    evaluateChatbotAction,
    type ChatbotEngineActorType,
    type ChatbotEngineAuditEvent,
} from '../../utils/chatbotEngine/actionRegistry';
import {
    disableAction,
    enableAction,
    getActionRegistry,
    getChatbotConfig,
    updateChatbotConfig,
    updateProjectChatbotKnowledgeSourceReview,
    updateProjectChatbotSurfaceDeployment,
    updateProjectChatbotTestScenarioStatus,
    type ChatbotEngineConfigResult,
    type ChatbotEngineKnowledgeConfigurationResult,
    type ChatbotEngineSurfaceConfigurationResult,
    type ChatbotSurfaceDeploymentKey,
} from '../chatbotEngine/chatbotEngineConfigurationService';
import {
    getChatbotEngineRuntimeSnapshot,
} from '../chatbotEngine/chatbotEngineDashboardService';
import { recordChatbotEngineEvent, type ChatbotEngineEventResult } from '../chatbotEngine/chatbotEngineEventService';
import {
    checkChatbotEcommerceOrderStatus,
    createChatbotEcommerceBackInStockRequest,
    createChatbotEcommerceProductInquiry,
    createChatbotFinanceQuoteRequest,
    explainChatbotEcommerceReturnsPolicy,
    explainChatbotEcommerceShippingPolicy,
    queueChatbotEmailFollowUpDraft,
    recommendChatbotEcommerceProducts,
    requestChatbotHumanHandoff,
    requestChatbotRealtyLead,
    requestChatbotRestaurantReservation,
    searchChatbotEcommerceProducts,
    startChatbotEcommerceCheckoutIntent,
    subscribeChatbotEmailAudience,
    type ChatbotHumanHandoffInput,
    type ChatbotEngineRuntimeScope,
} from '../chatbotEngine/chatbotEngineRuntimeActionService';
import {
    runChatbotTestScenarioInBlueprint,
    runProjectChatbotTestLab,
} from '../chatbotEngine/chatbotEngineTestLabService';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface ChatbotEngineReadinessSummary {
    projectId: string;
    readiness: BlueprintReadiness;
    blueprintStatus: ChatbotBlueprint['status'];
    needsReview: boolean;
    actionHealth: {
        total: number;
        configured: number;
        enabled: number;
        blocked: number;
        needsReview: number;
    };
    knowledgeHealth: {
        total: number;
        ready: number;
        blocked: number;
        needsReview: number;
        stale: number;
    };
    testingHealth: {
        status: ChatbotBlueprint['testing']['evaluationStatus'];
        scenarios: number;
        blockers: string[];
        warnings: string[];
    };
    deploymentHealth: {
        status: ChatbotDeploymentStatus;
        deployedSurfaces: ChatbotSurface[];
        voiceEnabled: boolean;
        blockers: string[];
        warnings: string[];
    };
}

export interface ChatbotKnowledgeSourceMutationInput {
    sourceId: string;
    actorId?: string | null;
    now?: string;
}

export interface ChatbotEventInput {
    tenantId?: string | null;
    projectId: string;
    eventType: string;
    actionType?: ChatbotActionType | null;
    actionStatus?: ChatbotEngineAuditEvent['action_status'];
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    messageId?: string | null;
    leadId?: string | null;
    appointmentId?: string | null;
    idempotencyKey?: string | null;
    correlationId?: string | null;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
    now?: string;
}

export interface ChatbotSingleScenarioRunInput {
    scenarioId: string;
    actorId?: string | null;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    idempotencyKey?: string | null;
    now?: string;
}

export interface ChatbotSingleScenarioRunResult {
    projectId: string;
    scenario: ChatbotTestScenarioBlueprint;
    result: ReturnType<typeof runChatbotTestScenarioInBlueprint>;
    chatbotBlueprint: ChatbotBlueprint;
    eventId?: string;
    warnings: string[];
}

export interface ChatbotSurfaceDeployInput {
    surfaceId: ChatbotSurfaceDeploymentKey;
    status: ChatbotDeploymentStatus;
    actorId?: string | null;
    now?: string;
}

export interface ChatbotBlueprintDraftInput {
    chatbotBlueprint: ChatbotBlueprint;
    actorId?: string | null;
    now?: string;
}

export interface ChatbotBlueprintSyncPreview {
    projectId: string;
    currentReadiness: BlueprintReadiness;
    nextReadiness: BlueprintReadiness;
    changedSections: string[];
    blocked: boolean;
    blockers: string[];
    warnings: string[];
}

export interface ExecuteChatbotActionInput {
    actionType: ChatbotActionType;
    scope: Omit<ChatbotEngineRuntimeScope, 'supabase'>;
    payload?: Record<string, unknown>;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    leadId?: string | null;
    appointmentId?: string | null;
    publicRequest?: boolean;
    hasAuth?: boolean;
    hasConsent?: boolean;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    idempotencyKey?: string | null;
    correlationId?: string | null;
    metadata?: Record<string, unknown>;
    now?: string;
}

export interface ExecuteChatbotActionResult<T = unknown> {
    projectId: string;
    actionType: ChatbotActionType;
    result: T;
    allowedEventId?: string;
    executedEventId?: string;
    duplicate?: boolean;
    warnings: string[];
}

const unsupportedActionMessage = [
    'ES: Esta accion aun no tiene ejecutor canónico en Chatbot Engine Service.',
    'EN: This action does not yet have a canonical executor in Chatbot Engine Service.',
].join('\n');

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

function combineReadiness(readiness: BlueprintReadiness[]): BlueprintReadiness {
    const blockers = uniqueStrings(readiness.flatMap(item => item.blockers || []));
    const warnings = uniqueStrings(readiness.flatMap(item => item.warnings || []));
    return {
        isReady: blockers.length === 0 && readiness.every(item => item.isReady),
        blockers,
        warnings,
    };
}

function changedSections(current: ChatbotBlueprint, next: ChatbotBlueprint): string[] {
    const entries: Array<[string, unknown, unknown]> = [
        ['agentProfile', current.agentProfile, next.agentProfile],
        ['knowledgeSources', current.knowledgeSources, next.knowledgeSources],
        ['actions', current.actions, next.actions],
        ['leadCapture', current.leadCapture, next.leadCapture],
        ['handoff', current.handoff, next.handoff],
        ['appointments', current.appointments, next.appointments],
        ['ecommerce', current.ecommerce, next.ecommerce],
        ['restaurants', current.restaurants, next.restaurants],
        ['realEstate', current.realEstate, next.realEstate],
        ['bioPage', current.bioPage, next.bioPage],
        ['channels', current.channels, next.channels],
        ['testing', current.testing, next.testing],
        ['analytics', current.analytics, next.analytics],
        ['deployment', current.deployment, next.deployment],
    ];

    return entries
        .filter(([, before, after]) => JSON.stringify(before) !== JSON.stringify(after))
        .map(([section]) => section);
}

export async function getChatbotReadiness(
    projectId: string,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineReadinessSummary> {
    const config = await getChatbotConfig(projectId, client);
    const blueprint = config.chatbotBlueprint;
    const actionReadiness = blueprint.actions.map(action => action.readiness);
    const knowledgeReadiness = blueprint.knowledgeSources.map(source => source.readiness);
    const channelReadiness = Object.values(blueprint.channels)
        .filter((value): value is { readiness: BlueprintReadiness } => Boolean(value && typeof value === 'object' && 'readiness' in value))
        .map(value => value.readiness);
    const readiness = combineReadiness([
        blueprint.readiness,
        blueprint.testing.readiness,
        blueprint.deployment.readiness,
        ...actionReadiness,
        ...knowledgeReadiness,
        ...channelReadiness,
    ]);

    return {
        projectId,
        readiness,
        blueprintStatus: blueprint.status,
        needsReview: blueprint.needsReview,
        actionHealth: {
            total: blueprint.actions.length,
            configured: blueprint.actions.filter(action => action.status === 'configured').length,
            enabled: blueprint.actions.filter(action => action.enabled).length,
            blocked: blueprint.actions.filter(action => action.readiness?.blockers?.length > 0).length,
            needsReview: blueprint.actions.filter(action => action.needsReview || action.requiresReview).length,
        },
        knowledgeHealth: {
            total: blueprint.knowledgeSources.length,
            ready: blueprint.knowledgeSources.filter(source => source.status === 'ready').length,
            blocked: blueprint.knowledgeSources.filter(source => source.readiness?.blockers?.length > 0).length,
            needsReview: blueprint.knowledgeSources.filter(source => source.needsReview).length,
            stale: blueprint.knowledgeSources.filter(source => source.freshness === 'stale').length,
        },
        testingHealth: {
            status: blueprint.testing.evaluationStatus,
            scenarios: blueprint.testing.testScenarios.length,
            blockers: blueprint.testing.readiness.blockers,
            warnings: blueprint.testing.readiness.warnings,
        },
        deploymentHealth: {
            status: blueprint.deployment.status,
            deployedSurfaces: blueprint.deployment.deployedSurfaces,
            voiceEnabled: blueprint.deployment.voiceSettings.enabled,
            blockers: blueprint.deployment.readiness.blockers,
            warnings: blueprint.deployment.readiness.warnings,
        },
    };
}

export async function getKnowledgeSources(
    projectId: string,
    client: SupabaseLike = supabase,
): Promise<ChatbotKnowledgeSourceBlueprint[]> {
    const config = await getChatbotConfig(projectId, client);
    return config.chatbotBlueprint.knowledgeSources;
}

export function syncKnowledgeSource(
    projectId: string,
    input: ChatbotKnowledgeSourceMutationInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    return updateProjectChatbotKnowledgeSourceReview(projectId, {
        ...input,
        enabled: true,
    }, client);
}

export function disableKnowledgeSource(
    projectId: string,
    input: ChatbotKnowledgeSourceMutationInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    return updateProjectChatbotKnowledgeSourceReview(projectId, {
        ...input,
        enabled: false,
    }, client);
}

export function recordChatbotEvent(
    input: ChatbotEventInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineEventResult> {
    const event = buildChatbotEngineObservedEvent({
        projectId: input.projectId,
        tenantId: input.tenantId,
        actionType: input.actionType || 'record_analytics_event',
        eventType: input.eventType,
        actionStatus: input.actionStatus === 'allowed' || input.actionStatus === 'blocked'
            ? 'observed'
            : input.actionStatus,
        sourceSurface: input.sourceSurface,
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        conversationId: input.conversationId,
        messageId: input.messageId,
        leadId: input.leadId,
        appointmentId: input.appointmentId,
        actorType: input.actorType || 'system',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            ...(input.metadata || {}),
            projectScoped: true,
            canonicalService: true,
        },
        now: input.now,
    });

    return recordChatbotEngineEvent(client, {
        ...event,
        action_type: input.actionType ?? event.action_type,
    });
}

export async function getChatbotAnalytics(
    projectId: string,
    client: SupabaseLike = supabase,
) {
    const snapshot = await getChatbotEngineRuntimeSnapshot(projectId, client);
    return snapshot.analytics;
}

export function createHandoff(
    input: Omit<ChatbotHumanHandoffInput, 'supabase'>,
    client: SupabaseLike = supabase,
) {
    return requestChatbotHumanHandoff({
        supabase: client,
        ...input,
    } as ChatbotHumanHandoffInput);
}

export function deployChatbotToSurface(
    projectId: string,
    input: ChatbotSurfaceDeployInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineSurfaceConfigurationResult> {
    return updateProjectChatbotSurfaceDeployment(projectId, input, client);
}

export async function applyChatbotBlueprintDraft(
    projectId: string,
    input: ChatbotBlueprintDraftInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigResult> {
    return updateChatbotConfig(projectId, {
        ...input.chatbotBlueprint,
        status: 'draft',
        needsReview: true,
    }, {
        actorId: input.actorId,
        now: input.now,
    }, client);
}

export async function previewChatbotBlueprintSync(
    projectId: string,
    input: ChatbotBlueprintDraftInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotBlueprintSyncPreview> {
    const current = await getChatbotConfig(projectId, client);
    const nextBlueprint: ChatbotBlueprint = {
        ...input.chatbotBlueprint,
        status: 'draft',
        needsReview: true,
    };
    const nextReadiness = combineReadiness([
        nextBlueprint.readiness,
        nextBlueprint.testing.readiness,
        nextBlueprint.deployment.readiness,
        ...nextBlueprint.actions.map(action => action.readiness),
        ...nextBlueprint.knowledgeSources.map(source => source.readiness),
    ]);

    return {
        projectId,
        currentReadiness: current.chatbotBlueprint.readiness,
        nextReadiness,
        changedSections: changedSections(current.chatbotBlueprint, nextBlueprint),
        blocked: nextReadiness.blockers.length > 0,
        blockers: nextReadiness.blockers,
        warnings: nextReadiness.warnings,
    };
}

export async function runChatbotTestScenario(
    projectId: string,
    input: ChatbotSingleScenarioRunInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotSingleScenarioRunResult> {
    const now = input.now || new Date().toISOString();
    const config = await getChatbotConfig(projectId, client);
    const scenario = config.chatbotBlueprint.testing.testScenarios.find(item => item.id === input.scenarioId);
    if (!scenario) {
        throw Object.assign(new Error(`Chatbot test scenario not found: ${input.scenarioId}`), {
            code: 'CHATBOT_TEST_SCENARIO_NOT_FOUND',
        });
    }

    const result = runChatbotTestScenarioInBlueprint(config.chatbotBlueprint, scenario, {
        projectId,
        actorId: input.actorId,
        sourceSurface: input.sourceSurface || 'admin_preview',
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        now,
    });
    const persisted = await updateProjectChatbotTestScenarioStatus(projectId, {
        scenarioId: scenario.id,
        status: result.status,
        actorId: input.actorId,
        now,
    }, client);
    const event = await recordChatbotEngineEvent(client, {
        tenant_id: config.businessBlueprint.tenantId || null,
        project_id: projectId,
        event_type: 'chatbot_test_scenario_run',
        action_type: 'record_analytics_event',
        action_status: result.passed ? 'observed' : 'failed',
        source_surface: input.sourceSurface || 'admin_preview',
        source_module: input.sourceModule || 'chatbot-engine-service',
        idempotency_key: input.idempotencyKey || `chatbot-engine-test-scenario:${projectId}:${scenario.id}:${now}`,
        correlation_id: scenario.id,
        actor_type: input.actorId ? 'project_user' : 'system',
        actor_id: input.actorId || null,
        metadata: {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            status: result.status,
            passed: result.passed,
            blockers: result.blockers,
            blockedActions: result.blockedActions,
            blockedSources: result.blockedSources,
            canonicalService: true,
            projectScoped: true,
        },
        created_at: now,
    });

    return {
        projectId,
        scenario,
        result,
        chatbotBlueprint: persisted.chatbotBlueprint,
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
    };
}

async function dispatchChatbotRuntimeAction(
    actionType: ChatbotActionType,
    scope: ChatbotEngineRuntimeScope,
    payload: Record<string, unknown>,
): Promise<unknown> {
    switch (actionType) {
        case 'answer_from_knowledge':
        case 'record_analytics_event':
            return { status: 'observed', actionType };
        case 'handoff_to_human':
            return requestChatbotHumanHandoff({ ...scope, ...payload } as any);
        case 'request_restaurant_reservation':
            return requestChatbotRestaurantReservation({ ...scope, ...payload } as any);
        case 'request_realty_showing':
        case 'register_open_house':
            return requestChatbotRealtyLead({ ...scope, ...payload, actionType } as any);
        case 'search_products':
            return searchChatbotEcommerceProducts({ ...scope, ...payload } as any);
        case 'recommend_products':
            return recommendChatbotEcommerceProducts({ ...scope, ...payload } as any);
        case 'explain_shipping':
            return explainChatbotEcommerceShippingPolicy({ ...scope, ...payload } as any);
        case 'explain_returns':
            return explainChatbotEcommerceReturnsPolicy({ ...scope, ...payload } as any);
        case 'create_product_inquiry':
            return createChatbotEcommerceProductInquiry({ ...scope, ...payload } as any);
        case 'back_in_stock_request':
            return createChatbotEcommerceBackInStockRequest({ ...scope, ...payload } as any);
        case 'check_order_status':
            return checkChatbotEcommerceOrderStatus({ ...scope, ...payload } as any);
        case 'start_checkout':
            return startChatbotEcommerceCheckoutIntent({ ...scope, ...payload } as any);
        case 'subscribe_email_audience':
            return subscribeChatbotEmailAudience({ ...scope, ...payload } as any);
        case 'queue_email_follow_up':
            return queueChatbotEmailFollowUpDraft({ ...scope, ...payload } as any);
        case 'create_finance_quote_request':
            return createChatbotFinanceQuoteRequest({ ...scope, ...payload } as any);
        default:
            throw Object.assign(new Error(unsupportedActionMessage), {
                code: 'CHATBOT_ACTION_EXECUTOR_MISSING',
                status: 501,
                actionType,
            });
    }
}

export async function executeChatbotAction(
    input: ExecuteChatbotActionInput,
    client: SupabaseLike = supabase,
): Promise<ExecuteChatbotActionResult> {
    const config = await getChatbotConfig(input.scope.projectId, client);
    const evaluation = evaluateChatbotAction({
        blueprint: config.chatbotBlueprint,
        tenantId: input.scope.tenantId,
        projectId: input.scope.projectId,
        actionType: input.actionType,
        sourceSurface: input.sourceSurface,
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        conversationId: input.conversationId,
        leadId: input.leadId,
        appointmentId: input.appointmentId,
        publicRequest: input.publicRequest,
        hasAuth: input.hasAuth,
        hasConsent: input.hasConsent,
        actorType: input.actorType || 'system',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            ...(input.metadata || {}),
            canonicalService: true,
            projectScoped: true,
        },
        now: input.now,
    });
    const allowedEvent = await recordChatbotEngineEvent(client, evaluation.auditEvent);

    if (!evaluation.allowed) {
        throw Object.assign(new Error(CHATBOT_ACTION_BLOCKED_MESSAGE), {
            code: 'CHATBOT_ACTION_BLOCKED',
            status: 403,
            blockers: evaluation.blockers,
            eventId: allowedEvent.id,
            duplicate: allowedEvent.duplicate,
        });
    }

    const runtimeScope: ChatbotEngineRuntimeScope = {
        supabase: client,
        tenantId: input.scope.tenantId,
        projectId: input.scope.projectId,
        projectUserId: input.scope.projectUserId,
    };
    const result = await dispatchChatbotRuntimeAction(input.actionType, runtimeScope, input.payload || {});
    const executedEvent = await recordChatbotEngineEvent(client, buildChatbotEngineExecutedEvent(evaluation, {
        resultRecorded: true,
        canonicalService: true,
    }));

    return {
        projectId: input.scope.projectId,
        actionType: input.actionType,
        result,
        allowedEventId: allowedEvent.id,
        executedEventId: executedEvent.id,
        duplicate: Boolean(allowedEvent.duplicate || executedEvent.duplicate),
        warnings: [allowedEvent.warning, executedEvent.warning].filter((item): item is string => Boolean(item)),
    };
}

export {
    disableAction,
    enableAction,
    getActionRegistry,
    getChatbotConfig,
    getChatbotEngineRuntimeSnapshot,
    recordChatbotEngineEvent,
    runProjectChatbotTestLab,
    updateChatbotConfig,
};
