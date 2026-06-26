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
    addProjectChatbotKnowledgeSource,
    disableAction,
    enableAction,
    getActionRegistry,
    getChatbotConfig,
    updateChatbotConfig,
    updateProjectChatbotKnowledgeSourceReview,
    updateProjectChatbotSurfaceDeployment,
    updateProjectChatbotTestScenarioStatus,
    type ChatbotKnowledgeSourceCreateInput,
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
import {
    buildChatbotMessageIntentMetadata,
    type ChatbotMessageIntentMetadataResult,
} from '../../utils/chatbotEngine/messageIntentMetadata';
import type {
    ChatbotEngineSurfaceContext,
    ChatbotEngineSurfaceContextInput,
} from '../../utils/chatbotEngine/surfaceContext';

type SupabaseLike = Pick<SupabaseClient, 'from'>;
type ConversationStatus = 'active' | 'closed' | 'pending' | 'escalated';
type ConversationMessageRole = 'user' | 'model';

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

export type ChatbotKnowledgeSourceAddInput = ChatbotKnowledgeSourceCreateInput;

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

export interface ChatbotConversationParticipantInfo {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
}

export interface ChatbotConversationContextInput {
    tenantId?: string | null;
    projectId: string;
    channel?: string | null;
    sessionId?: string | null;
    participantId?: string | null;
    participantInfo?: ChatbotConversationParticipantInfo | null;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
    correlationId?: string | null;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    idempotencyKey?: string | null;
    now?: string;
}

export interface ChatbotConversationResult {
    projectId: string;
    tenantId?: string | null;
    conversationId: string;
    sessionId: string;
    messageCount: number;
    reused: boolean;
    eventId?: string;
    duplicate?: boolean;
    warning?: string;
}

export interface ChatbotConversationMessageInput {
    tenantId?: string | null;
    projectId: string;
    conversationId: string;
    role: ConversationMessageRole;
    text: string;
    channel?: string | null;
    isVoiceMessage?: boolean;
    messageType?: string | null;
    mediaUrl?: string | null;
    senderId?: string | null;
    senderName?: string | null;
    recipientId?: string | null;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | null;
    metadata?: Record<string, unknown>;
    correlationId?: string | null;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    idempotencyKey?: string | null;
    now?: string;
}

export interface ChatbotConversationMessageResult {
    projectId: string;
    tenantId?: string | null;
    conversationId: string;
    messageId: string;
    messageCount: number;
    unreadCount: number;
    duplicate: boolean;
    intent: ChatbotMessageIntentMetadataResult['intent'];
    eventIds: string[];
    warnings: string[];
}

export interface ChatbotConversationUpdateInput {
    tenantId?: string | null;
    projectId: string;
    conversationId: string;
    participantInfo?: ChatbotConversationParticipantInfo | null;
    status?: ConversationStatus | null;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
    correlationId?: string | null;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    idempotencyKey?: string | null;
    now?: string;
}

export interface ChatbotConversationLeadLinkInput extends ChatbotConversationUpdateInput {
    leadId: string;
}

const unsupportedActionMessage = [
    'ES: Esta accion aun no tiene ejecutor canónico en Chatbot Engine Service.',
    'EN: This action does not yet have a canonical executor in Chatbot Engine Service.',
].join('\n');

const conversationNotFoundMessage = [
    'ES: La conversacion no existe o no pertenece a este proyecto.',
    'EN: The conversation does not exist or does not belong to this project.',
].join('\n');

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength = 240): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function cleanKeyPart(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'none';
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'none';
}

function cleanTags(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(
        values
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean),
    )).slice(0, 40);
}

function compactMetadata(value: unknown): Record<string, unknown> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, entry]) => key.length <= 80 && entry !== undefined)
            .slice(0, 60),
    );
}

function serviceIdempotencyKey(parts: unknown[]): string {
    return ['chatbot-engine-service', ...parts].map(cleanKeyPart).join(':').slice(0, 240);
}

function surfaceTags(input: {
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    extra?: string[];
}): string[] {
    return uniqueStrings([
        ...(input.extra || []),
        input.sourceSurface ? `surface:${input.sourceSurface}` : '',
        input.sourceModule ? `module:${input.sourceModule}` : '',
    ]).slice(0, 40);
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

export function addKnowledgeSource(
    projectId: string,
    input: ChatbotKnowledgeSourceAddInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    return addProjectChatbotKnowledgeSource(projectId, input, client);
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

async function loadProjectConversation(
    client: SupabaseLike,
    projectId: string,
    conversationId: string,
): Promise<Record<string, any>> {
    const { data, error } = await client
        .from('social_conversations')
        .select('id,tenant_id,project_id,channel,participant_id,participant_name,participant_email,participant_phone,status,message_count,unread_count,tags,metadata,lead_id,notes')
        .eq('id', conversationId)
        .eq('project_id', projectId)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw Object.assign(new Error(conversationNotFoundMessage), {
            code: 'CHATBOT_CONVERSATION_NOT_FOUND',
            status: 404,
        });
    }

    return data as Record<string, any>;
}

function buildConversationMetadataPatch(input: {
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | null;
    metadata?: Record<string, unknown>;
    now?: string;
}) {
    return {
        sourceSurface: cleanString(input.sourceSurface, 120) || 'website',
        sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
        chatbotEngineContext: input.chatbotEngineContext || null,
        ...compactMetadata(input.metadata),
        lastCanonicalServiceUpdateAt: input.now,
    };
}

export async function getOrCreateConversation(
    input: ChatbotConversationContextInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotConversationResult> {
    const now = input.now || new Date().toISOString();
    const projectId = cleanString(input.projectId, 120);
    if (!projectId) {
        throw Object.assign(new Error('ES: projectId es requerido.\nEN: projectId is required.'), {
            code: 'CHATBOT_PROJECT_ID_REQUIRED',
            status: 400,
        });
    }

    const sessionId = cleanString(input.sessionId || input.participantId, 120) || `session_${Date.now()}`;
    const channel = cleanString(input.channel, 40) || 'web';
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const participant = input.participantInfo || {};
    const participantName = cleanString(participant.name, 200) || 'Visitante Web';
    const metadata = {
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        sessionId,
        canonicalService: true,
        projectScoped: true,
    };

    const existing = await client
        .from('social_conversations')
        .select('id,message_count')
        .eq('project_id', projectId)
        .eq('channel', channel)
        .eq('participant_id', sessionId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data?.id) {
        const event = await recordChatbotEvent({
            tenantId: input.tenantId,
            projectId,
            eventType: 'chatbot_conversation_reused',
            actionType: 'save_conversation',
            actionStatus: 'observed',
            sourceSurface,
            sourceModule,
            conversationId: existing.data.id,
            actorType: input.actorType || 'visitor',
            actorId: input.actorId,
            idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([projectId, 'conversation-reused', sessionId]),
            correlationId: input.correlationId,
            metadata: {
                ...metadata,
                messageCount: Number(existing.data.message_count || 0),
            },
            now,
        }, client);

        return {
            projectId,
            tenantId: input.tenantId,
            conversationId: String(existing.data.id),
            sessionId,
            messageCount: Number(existing.data.message_count || 0),
            reused: true,
            eventId: event.id,
            duplicate: event.duplicate,
            warning: event.warning,
        };
    }

    const created = await client
        .from('social_conversations')
        .insert({
            tenant_id: input.tenantId || null,
            project_id: projectId,
            channel,
            participant_id: sessionId,
            participant_name: participantName,
            participant_avatar: cleanString(participant.avatarUrl, 1000) || null,
            participant_email: cleanString(participant.email, 320) || null,
            participant_phone: cleanString(participant.phone, 80) || null,
            status: 'active',
            started_at: now,
            last_message_at: now,
            message_count: 0,
            unread_count: 0,
            tags: surfaceTags({
                sourceSurface,
                sourceModule,
                extra: ['web-chat', ...cleanTags(input.tags)],
            }),
            metadata,
            created_at: now,
            updated_at: now,
        })
        .select('id')
        .single();

    if (created.error) throw created.error;
    const conversationId = String(created.data.id);
    const event = await recordChatbotEvent({
        tenantId: input.tenantId,
        projectId,
        eventType: 'chatbot_conversation_created',
        actionType: 'save_conversation',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([projectId, 'conversation-created', sessionId]),
        correlationId: input.correlationId,
        metadata: {
            ...metadata,
            participantCaptured: Boolean(participant.name || participant.email || participant.phone),
        },
        now,
    }, client);

    return {
        projectId,
        tenantId: input.tenantId,
        conversationId,
        sessionId,
        messageCount: 0,
        reused: false,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
    };
}

async function findIdempotentMessage(
    input: ChatbotConversationMessageInput,
    client: SupabaseLike,
): Promise<Record<string, any> | null> {
    const idempotencyKey = cleanString(input.idempotencyKey, 240);
    if (!idempotencyKey) return null;

    const { data, error } = await client
        .from('social_messages')
        .select('id,metadata')
        .eq('project_id', input.projectId)
        .eq('conversation_id', input.conversationId)
        .contains('metadata', { idempotencyKey })
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data?.id ? data as Record<string, any> : null;
}

export async function saveConversationMessage(
    input: ChatbotConversationMessageInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotConversationMessageResult> {
    const now = input.now || new Date().toISOString();
    const text = cleanString(input.text, 12000);
    if (!text) {
        throw Object.assign(new Error('ES: El texto del mensaje es requerido.\nEN: Message text is required.'), {
            code: 'CHATBOT_MESSAGE_TEXT_REQUIRED',
            status: 400,
        });
    }

    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const duplicateMessage = await findIdempotentMessage(input, client);
    if (duplicateMessage) {
        return {
            projectId: input.projectId,
            tenantId: input.tenantId || conversation.tenant_id || null,
            conversationId: input.conversationId,
            messageId: String(duplicateMessage.id),
            messageCount: Number(conversation.message_count || 0),
            unreadCount: Number(conversation.unread_count || 0),
            duplicate: true,
            intent: null,
            eventIds: [],
            warnings: [],
        };
    }

    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const isUser = input.role === 'user';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || serviceIdempotencyKey([input.projectId, input.conversationId, input.role, Number(conversation.message_count || 0) + 1]);
    const intentMetadata = buildChatbotMessageIntentMetadata({
        role: input.role,
        text,
        isVoiceMessage: input.isVoiceMessage,
        sourceSurface,
        sourceModule,
        chatbotEngineContext: input.chatbotEngineContext,
        previousConversationMetadata: conversation.metadata,
        previousConversationTags: conversation.tags,
        now,
    });
    const messageMetadata = {
        ...intentMetadata.messageMetadata,
        ...compactMetadata(input.metadata),
        idempotencyKey,
        canonicalService: true,
        projectScoped: true,
    };

    const message = await client
        .from('social_messages')
        .insert({
            tenant_id: input.tenantId || conversation.tenant_id || null,
            project_id: input.projectId,
            conversation_id: input.conversationId,
            channel: cleanString(input.channel, 40) || conversation.channel || 'web',
            direction: isUser ? 'inbound' : 'outbound',
            sender_id: cleanString(input.senderId, 120) || (isUser ? conversation.participant_id : 'ai-assistant'),
            sender_name: cleanString(input.senderName, 200) || (isUser ? 'Visitante' : 'Asistente AI'),
            recipient_id: cleanString(input.recipientId, 120) || (isUser ? 'ai-assistant' : conversation.participant_id),
            message: text,
            message_type: cleanString(input.messageType, 40) || (input.isVoiceMessage ? 'audio' : 'text'),
            media_url: cleanString(input.mediaUrl, 1000) || null,
            timestamp: now,
            status: 'delivered',
            processed_by_ai: !isUser,
            metadata: messageMetadata,
            created_at: now,
            updated_at: now,
        })
        .select('id')
        .single();

    if (message.error) throw message.error;
    const nextMessageCount = Number(conversation.message_count || 0) + 1;
    const nextUnreadCount = isUser ? Number(conversation.unread_count || 0) + 1 : Number(conversation.unread_count || 0);
    const conversationMetadata = {
        ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        ...(intentMetadata.conversationMetadata || {}),
        canonicalService: true,
        projectScoped: true,
    };
    const conversationTags = surfaceTags({
        sourceSurface,
        sourceModule,
        extra: [
            ...cleanTags(conversation.tags),
            ...cleanTags(intentMetadata.conversationTags),
        ],
    });

    const updated = await client
        .from('social_conversations')
        .update({
            last_message_at: now,
            message_count: nextMessageCount,
            unread_count: nextUnreadCount,
            metadata: conversationMetadata,
            tags: conversationTags,
            updated_at: now,
        })
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);

    if (updated.error) throw updated.error;

    const eventIds: string[] = [];
    const warnings: string[] = [];
    const savedEvent = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_message_saved',
        actionType: 'save_message',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        messageId: String(message.data.id),
        actorType: input.actorType || (isUser ? 'visitor' : 'system'),
        actorId: input.actorId,
        idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            role: input.role,
            direction: isUser ? 'inbound' : 'outbound',
            messageLength: text.length,
            isVoiceMessage: input.isVoiceMessage === true,
            intent: intentMetadata.intent,
        },
        now,
    }, client);
    if (savedEvent.id) eventIds.push(savedEvent.id);
    if (savedEvent.warning) warnings.push(savedEvent.warning);

    if (intentMetadata.intent) {
        const intentEvent = await recordChatbotEvent({
            tenantId: input.tenantId || conversation.tenant_id || null,
            projectId: input.projectId,
            eventType: 'chatbot_intent_analyzed',
            actionType: 'analyze_intent',
            actionStatus: 'observed',
            sourceSurface,
            sourceModule,
            conversationId: input.conversationId,
            messageId: String(message.data.id),
            actorType: input.actorType || 'visitor',
            actorId: input.actorId,
            idempotencyKey: serviceIdempotencyKey([input.projectId, 'intent', input.conversationId, message.data.id, intentMetadata.intent.primaryIntent]),
            correlationId: input.correlationId,
            metadata: {
                intent: intentMetadata.intent,
                customerRequestSignal: true,
            },
            now,
        }, client);
        if (intentEvent.id) eventIds.push(intentEvent.id);
        if (intentEvent.warning) warnings.push(intentEvent.warning);
    }

    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        messageId: String(message.data.id),
        messageCount: nextMessageCount,
        unreadCount: nextUnreadCount,
        duplicate: false,
        intent: intentMetadata.intent,
        eventIds,
        warnings,
    };
}

export async function updateConversationParticipant(
    input: ChatbotConversationUpdateInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotConversationResult> {
    const now = input.now || new Date().toISOString();
    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const participant = input.participantInfo || {};
    const updates: Record<string, unknown> = {
        metadata: {
            ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
            ...buildConversationMetadataPatch({
                sourceSurface,
                sourceModule,
                chatbotEngineContext: input.chatbotEngineContext,
                metadata: input.metadata,
                now,
            }),
            canonicalService: true,
            projectScoped: true,
        },
        tags: surfaceTags({
            sourceSurface,
            sourceModule,
            extra: [
                ...cleanTags(conversation.tags),
                ...cleanTags(input.tags),
            ],
        }),
        updated_at: now,
    };

    const name = cleanString(participant.name, 200);
    const email = cleanString(participant.email, 320);
    const phone = cleanString(participant.phone, 80);
    const avatar = cleanString(participant.avatarUrl, 1000);
    if (name) updates.participant_name = name;
    if (email) updates.participant_email = email;
    if (phone) updates.participant_phone = phone;
    if (avatar) updates.participant_avatar = avatar;
    if (input.status && ['active', 'closed', 'pending', 'escalated'].includes(input.status)) updates.status = input.status;

    const updated = await client
        .from('social_conversations')
        .update(updates)
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);

    if (updated.error) throw updated.error;

    const event = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_participant_updated',
        actionType: 'save_conversation',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([input.projectId, 'participant', input.conversationId, now]),
        correlationId: input.correlationId,
        metadata: {
            participantUpdated: Boolean(name || email || phone || avatar),
            status: updates.status || conversation.status || null,
        },
        now,
    }, client);

    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        sessionId: String(conversation.participant_id || ''),
        messageCount: Number(conversation.message_count || 0),
        reused: true,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
    };
}

export async function linkConversationToLead(
    input: ChatbotConversationLeadLinkInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotConversationResult & { leadId: string }> {
    const leadId = cleanString(input.leadId, 120);
    if (!leadId) {
        throw Object.assign(new Error('ES: leadId es requerido.\nEN: leadId is required.'), {
            code: 'CHATBOT_LEAD_ID_REQUIRED',
            status: 400,
        });
    }

    const now = input.now || new Date().toISOString();
    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const metadata = {
        ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        linkedLeadId: leadId,
        leadLinkedAt: now,
        canonicalService: true,
        projectScoped: true,
    };

    const updated = await client
        .from('social_conversations')
        .update({
            lead_id: leadId,
            metadata,
            tags: surfaceTags({
                sourceSurface,
                sourceModule,
                extra: [
                    ...cleanTags(conversation.tags),
                    'lead-linked',
                    ...cleanTags(input.tags),
                ],
            }),
            updated_at: now,
        })
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);

    if (updated.error) throw updated.error;

    const event = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_conversation_linked_to_lead',
        actionType: 'link_conversation_to_lead',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        leadId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([input.projectId, 'lead-link', input.conversationId, leadId]),
        correlationId: input.correlationId,
        metadata: {
            previousLeadId: conversation.lead_id || null,
            leadLinked: true,
        },
        now,
    }, client);

    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        sessionId: String(conversation.participant_id || ''),
        messageCount: Number(conversation.message_count || 0),
        reused: true,
        leadId,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
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
