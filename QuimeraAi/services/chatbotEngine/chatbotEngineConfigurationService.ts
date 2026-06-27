import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type {
    BusinessBlueprint,
    ChatbotActionBlueprint,
    ChatbotActionType,
    ChatbotBlueprint,
    ChatbotChannelBlueprint,
    ChatbotDeploymentBlueprint,
    ChatbotDeploymentStatus,
    ChatbotBlueprintOwnerModule,
    ChatbotKnowledgeSourceBlueprint,
    ChatbotKnowledgeSourceStatus,
    ChatbotKnowledgeSourceType,
    ChatbotKnowledgeVisibility,
    ChatbotSurfaceChannelBlueprint,
    ChatbotTestScenarioBlueprint,
} from '../../types/businessBlueprint';
import { migrateBusinessBlueprint } from '../../utils/businessBlueprint';
import {
    appendBlueprintSnapshot,
    createBlueprintSnapshot,
} from '../../utils/businessBlueprint/versionHistory';
import { recordChatbotEngineEvent, type ChatbotEngineEventResult } from './chatbotEngineEventService';

type SupabaseLike = Pick<SupabaseClient, 'from'>;
type ChatbotTestScenarioStatus = ChatbotTestScenarioBlueprint['status'];
export type ChatbotSurfaceDeploymentKey = keyof Pick<
    ChatbotChannelBlueprint,
    'webWidget' | 'embeddedWidget' | 'bioPage' | 'storefront' | 'checkout' | 'bookingPage' | 'restaurantMenu' | 'realtyPropertyPage' | 'adminPreview' | 'voice'
>;

export interface ChatbotConfigurationMutationInput {
    actorId?: string | null;
    now?: string;
}

export interface ChatbotActionReviewInput {
    actionType: ChatbotActionType;
    enabled: boolean;
    actorId?: string | null;
    now?: string;
}

export interface ChatbotKnowledgeSourceReviewInput extends ChatbotConfigurationMutationInput {
    sourceId: string;
    enabled: boolean;
}

export interface ChatbotKnowledgeSourceCreateInput extends ChatbotConfigurationMutationInput {
    id?: string;
    name: string;
    type?: ChatbotKnowledgeSourceType;
    ownerModule?: ChatbotBlueprintOwnerModule;
    visibility?: ChatbotKnowledgeVisibility;
    status?: Extract<ChatbotKnowledgeSourceStatus, 'draft' | 'needs_review' | 'syncing'>;
    content?: string | null;
    sourceUrl?: string | null;
    sourceEntityIds?: string[];
    contentHash?: string;
    confidence?: number;
    generatedByAI?: boolean;
    sync?: boolean;
}

export interface ChatbotTestScenarioStatusInput extends ChatbotConfigurationMutationInput {
    scenarioId: string;
    status: ChatbotTestScenarioStatus;
}

export interface ChatbotSurfaceDeploymentInput extends ChatbotConfigurationMutationInput {
    surfaceId: ChatbotSurfaceDeploymentKey;
    status: ChatbotDeploymentStatus;
}

export interface ChatbotVoiceSettingsInput extends ChatbotConfigurationMutationInput {
    enabled: boolean;
    provider?: ChatbotDeploymentBlueprint['voiceSettings']['provider'];
    agentId?: string | null;
    languageMode?: ChatbotDeploymentBlueprint['voiceSettings']['languageMode'];
    consentRequired?: boolean;
}

export interface ChatbotEngineConfigResult {
    projectId: string;
    businessBlueprint: BusinessBlueprint;
    chatbotBlueprint: ChatbotBlueprint;
    data: Record<string, unknown>;
    auditEventId?: string;
    auditWarning?: string;
    auditDuplicate?: boolean;
}

export interface ChatbotEngineActionConfigurationResult extends ChatbotEngineConfigResult {
    action: ChatbotActionBlueprint;
}

export interface ChatbotEngineKnowledgeConfigurationResult extends ChatbotEngineConfigResult {
    knowledgeSource: ChatbotKnowledgeSourceBlueprint;
}

export interface ChatbotEngineTestConfigurationResult extends ChatbotEngineConfigResult {
    testScenario: ChatbotTestScenarioBlueprint;
}

export interface ChatbotEngineSurfaceConfigurationResult extends ChatbotEngineConfigResult {
    surface: ChatbotSurfaceChannelBlueprint;
    surfaceId: ChatbotSurfaceDeploymentKey;
}

export interface ChatbotEngineVoiceConfigurationResult extends ChatbotEngineConfigResult {
    voiceSettings: ChatbotDeploymentBlueprint['voiceSettings'];
}

export type ChatbotEngineConfigurationResult = ChatbotEngineActionConfigurationResult;

interface LoadedProjectChatbotConfig {
    projectData: Record<string, unknown>;
    businessBlueprint: BusinessBlueprint;
    chatbotBlueprint: ChatbotBlueprint;
}

interface PersistedChatbotConfig {
    businessBlueprint: BusinessBlueprint;
    chatbotBlueprint: ChatbotBlueprint;
    data: Record<string, unknown>;
}

const disabledWarning = [
    'ES: La acción fue desactivada manualmente en el registro de acciones del Chatbot Engine.',
    'EN: Action was manually disabled in the Chatbot Engine Action Registry.',
].join('\n');

const disabledKnowledgeWarning = [
    'ES: La fuente fue desactivada manualmente en el Centro de conocimiento del Chatbot Engine.',
    'EN: Source was manually disabled in the Chatbot Engine Knowledge Center.',
].join('\n');

const testingNotRunWarning = [
    'ES: El laboratorio de pruebas todavía no tiene una corrida aprobada.',
    'EN: Test Lab does not have an approved run yet.',
].join('\n');

const testingNeedsReviewWarning = [
    'ES: El laboratorio de pruebas tiene escenarios pendientes de revisión.',
    'EN: Test Lab has scenarios pending review.',
].join('\n');

const testingFailedBlocker = [
    'ES: El laboratorio de pruebas tiene escenarios fallidos que bloquean el despliegue.',
    'EN: Test Lab has failed scenarios blocking deployment.',
].join('\n');

const surfaceTestWarning = [
    'ES: La superficie está activa solo para pruebas y requiere despliegue explícito para producción.',
    'EN: Surface is active for testing only and requires explicit deployment for production.',
].join('\n');

const surfacePausedWarning = [
    'ES: La superficie fue pausada manualmente desde Deploy Settings del Chatbot Engine.',
    'EN: Surface was manually paused from Chatbot Engine Deploy Settings.',
].join('\n');

const noDeployedSurfaceBlocker = [
    'ES: Ninguna superficie pública está marcada como desplegada.',
    'EN: No public deployment surface is marked deployed.',
].join('\n');

const voiceDisabledWarning = [
    'ES: La voz está desactivada hasta configurar proveedor, agente y consentimiento por proyecto.',
    'EN: Voice is disabled until provider, agent, and consent are configured per project.',
].join('\n');

const voiceMissingAgentBlocker = [
    'ES: El agent ID del proveedor de voz debe configurarse por proyecto antes de habilitar voz.',
    'EN: Voice provider agent ID must be configured per project before voice is enabled.',
].join('\n');

const SURFACE_DEPLOYMENT_KEYS: ChatbotSurfaceDeploymentKey[] = [
    'webWidget',
    'embeddedWidget',
    'bioPage',
    'storefront',
    'checkout',
    'bookingPage',
    'restaurantMenu',
    'realtyPropertyPage',
    'adminPreview',
    'voice',
];

function isRecord(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function cleanString(value: unknown, maxLength = 2000): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function uniqueStrings(values: unknown[], maxItems = 50): string[] {
    return Array.from(new Set(values.map(value => cleanString(value, 500)).filter(Boolean))).slice(0, maxItems);
}

function hashString(value: string): string {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    }
    return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function buildKnowledgeSourceId(input: ChatbotKnowledgeSourceCreateInput, contentHash: string): string {
    const explicitId = cleanString(input.id, 120);
    if (explicitId) return explicitId;
    return [
        'knowledge',
        input.type || 'manual_snippet',
        input.sourceUrl || input.name,
        contentHash.slice(0, 10),
    ].map(cleanKeyPart).join('-').slice(0, 160);
}

function buildKnowledgePreview(content: string, sourceUrl: string): string | undefined {
    const source = content || sourceUrl;
    if (!source) return undefined;
    return source.replace(/\s+/g, ' ').trim().slice(0, 500) || undefined;
}

function getBusinessBlueprintTenantId(blueprint: BusinessBlueprint): string | null {
    const metadata: Record<string, unknown> = isRecord(blueprint.metadata)
        ? blueprint.metadata as unknown as Record<string, unknown>
        : {};
    const tenantId = metadata.tenantId || metadata.tenant_id || metadata.tenant;
    return typeof tenantId === 'string' && tenantId.trim() ? tenantId.trim() : null;
}

function auditFields(result: ChatbotEngineEventResult): Pick<ChatbotEngineConfigResult, 'auditEventId' | 'auditWarning' | 'auditDuplicate'> {
    return {
        ...(result.id ? { auditEventId: result.id } : {}),
        ...(result.warning ? { auditWarning: result.warning } : {}),
        ...(result.duplicate ? { auditDuplicate: true } : {}),
    };
}

async function recordConfigurationMutationEvent(
    projectId: string,
    loaded: LoadedProjectChatbotConfig,
    input: ChatbotConfigurationMutationInput,
    client: SupabaseLike,
    event: {
        configurationType: string;
        targetId: string;
        targetLabel?: string | null;
        operation: string;
        before?: Record<string, unknown> | null;
        after?: Record<string, unknown> | null;
        actionType?: ChatbotActionType | null;
    },
): Promise<Pick<ChatbotEngineConfigResult, 'auditEventId' | 'auditWarning' | 'auditDuplicate'>> {
    const now = input.now || new Date().toISOString();
    const result = await recordChatbotEngineEvent(client, {
        tenant_id: getBusinessBlueprintTenantId(loaded.businessBlueprint),
        project_id: projectId,
        event_type: 'chatbot_configuration_updated',
        action_type: event.actionType || null,
        action_status: 'executed',
        source_surface: 'admin_preview',
        source_module: 'chatbot-engine-dashboard',
        idempotency_key: [
            'chatbot-engine',
            projectId,
            'configuration',
            event.configurationType,
            event.targetId,
            event.operation,
            now,
        ].map(cleanKeyPart).join(':').slice(0, 240),
        actor_type: input.actorId ? 'project_user' : 'system',
        actor_id: input.actorId || null,
        metadata: {
            configurationType: event.configurationType,
            targetId: event.targetId,
            targetLabel: event.targetLabel || event.targetId,
            operation: event.operation,
            before: event.before || null,
            after: event.after || null,
            sourceComponent: 'ChatbotEngineDashboard',
            projectScoped: true,
            idempotent: true,
            auditLogRequired: true,
        },
        created_at: now,
    });

    return auditFields(result);
}

function getProjectBusinessBlueprint(projectData: Record<string, any>): BusinessBlueprint | null {
    return migrateBusinessBlueprint(projectData.businessBlueprint || projectData.data?.businessBlueprint);
}

function ensureConfigurableAction(action: ChatbotActionBlueprint, input: ChatbotActionReviewInput): void {
    if (!input.enabled) return;
    const blockers = action.readiness?.blockers || [];
    if (blockers.length > 0) {
        throw Object.assign(new Error('Chatbot action cannot be enabled while readiness blockers are present.'), {
            code: 'CHATBOT_ACTION_HAS_BLOCKERS',
            blockers,
        });
    }
}

function ensureConfigurableKnowledgeSource(source: ChatbotKnowledgeSourceBlueprint, input: ChatbotKnowledgeSourceReviewInput): void {
    if (!input.enabled) return;
    const blockers = source.readiness?.blockers || [];
    if (blockers.length > 0) {
        throw Object.assign(new Error('Chatbot knowledge source cannot be enabled while readiness blockers are present.'), {
            code: 'CHATBOT_KNOWLEDGE_SOURCE_HAS_BLOCKERS',
            blockers,
        });
    }
}

function createKnowledgeSourceBlueprint(
    input: ChatbotKnowledgeSourceCreateInput,
    now: string,
): ChatbotKnowledgeSourceBlueprint {
    const name = cleanString(input.name, 240);
    if (!name) {
        throw Object.assign(new Error('Chatbot knowledge source name is required.'), {
            code: 'CHATBOT_KNOWLEDGE_SOURCE_NAME_REQUIRED',
        });
    }

    const content = cleanString(input.content, 12000);
    const sourceUrl = cleanString(input.sourceUrl, 2000);
    const contentHash = cleanString(input.contentHash, 120)
        || hashString([input.type || 'manual_snippet', name, sourceUrl, content].join('\n'));
    const id = buildKnowledgeSourceId(input, contentHash);
    const sync = input.sync === true;
    const status = input.status || 'needs_review';
    const preview = buildKnowledgePreview(content, sourceUrl);

    return {
        id,
        name,
        type: input.type || 'manual_snippet',
        ownerModule: input.ownerModule || 'chatbot-engine',
        visibility: input.visibility || 'internal',
        status,
        lastSyncedAt: sync ? now : undefined,
        freshness: sync ? 'fresh' : 'unknown',
        confidence: Math.min(Math.max(input.confidence ?? 0.72, 0), 1),
        contentHash,
        contentLength: content.length || sourceUrl.length || undefined,
        contentPreview: preview,
        sourceUrl: sourceUrl || undefined,
        sourceEntityIds: uniqueStrings([id, sourceUrl, ...(input.sourceEntityIds || [])]),
        readiness: {
            isReady: false,
            blockers: [],
            warnings: [
                'ES: Fuente agregada al Knowledge Center y pendiente de revisión humana antes de usarla en producción.',
                'EN: Source added to the Knowledge Center and pending human review before production use.',
            ],
        },
        needsReview: true,
        generatedByAI: input.generatedByAI === true,
        userModified: true,
        lockedFromRegeneration: true,
        sourceMap: {
            knowledgeCenter: 'chatbotEngine.knowledgeCenter',
            sourceKind: input.type || 'manual_snippet',
            ...(sourceUrl ? { sourceUrl } : {}),
            ...(preview ? { contentPreview: preview } : {}),
        },
    };
}

export function addChatbotKnowledgeSourceToBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotKnowledgeSourceCreateInput,
): { blueprint: ChatbotBlueprint; knowledgeSource: ChatbotKnowledgeSourceBlueprint; duplicate: boolean } {
    const now = input.now || new Date().toISOString();
    const knowledgeSource = createKnowledgeSourceBlueprint(input, now);
    const existing = blueprint.knowledgeSources.find(source => source.id === knowledgeSource.id);
    if (existing) {
        return {
            blueprint,
            knowledgeSource: existing,
            duplicate: true,
        };
    }

    const nextBlueprint: ChatbotBlueprint = {
        ...blueprint,
        status: 'needs_review',
        needsReview: true,
        knowledgeSources: [...blueprint.knowledgeSources, knowledgeSource],
        readiness: {
            ...blueprint.readiness,
            isReady: false,
            warnings: Array.from(new Set([
                ...(blueprint.readiness?.warnings || []),
                'ES: Knowledge Center tiene una fuente nueva pendiente de revisión.',
                'EN: Knowledge Center has a new source pending review.',
            ])),
        },
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'knowledgeCenter', 'chatbotEngine.knowledgeCenter'),
    };

    return {
        blueprint: nextBlueprint,
        knowledgeSource,
        duplicate: false,
    };
}

function updateChatbotBlueprintMetadata(
    blueprint: ChatbotBlueprint,
    input: ChatbotConfigurationMutationInput,
    now: string,
): ChatbotBlueprint['metadata'] {
    return {
        ...blueprint.metadata,
        userModified: true,
        lockedFromRegeneration: true,
        lastEditedAt: now,
        lastEditedBy: input.actorId || blueprint.metadata.lastEditedBy,
        updatedAt: now,
    };
}

function updateChatbotBlueprintSourceMap(
    blueprint: ChatbotBlueprint,
    sourceMapKey: string,
    sourceMapValue: string,
): ChatbotBlueprint['sourceMap'] {
    return {
        ...(blueprint.sourceMap || {}),
        [sourceMapKey]: sourceMapValue,
    };
}

async function loadProjectChatbotConfig(
    projectId: string,
    client: SupabaseLike,
): Promise<LoadedProjectChatbotConfig> {
    const { data, error } = await client
        .from('projects')
        .select('data')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw error;
    const projectData = isRecord(data?.data) ? data.data : {};
    const businessBlueprint = getProjectBusinessBlueprint(projectData);
    if (!businessBlueprint?.chatbotBlueprint) {
        throw Object.assign(new Error('ChatbotBlueprint V2 is required before configuring Chatbot Engine.'), {
            code: 'CHATBOT_BLUEPRINT_MISSING',
        });
    }

    return {
        projectData,
        businessBlueprint,
        chatbotBlueprint: businessBlueprint.chatbotBlueprint,
    };
}

async function persistProjectChatbotBlueprint(
    projectId: string,
    projectData: Record<string, unknown>,
    chatbotBlueprint: ChatbotBlueprint,
    now: string,
    client: SupabaseLike,
): Promise<PersistedChatbotConfig> {
    const snapshot = createBlueprintSnapshot({
        projectId,
        projectData,
        moduleKey: 'chatbotBlueprint',
        source: 'manual_save',
        changeType: 'manual_checkpoint',
        now,
        metadata: {
            userId: chatbotBlueprint.metadata.lastEditedBy || null,
            createdBy: chatbotBlueprint.metadata.lastEditedBy || null,
            actionType: 'chatbot_engine_configuration',
            module: 'chatbot',
            source: 'chatbot-engine',
        },
    });
    const versionedData = appendBlueprintSnapshot(projectData, snapshot);
    const nextData = applyChatbotBlueprintToProjectData(versionedData, chatbotBlueprint);
    const nextBusinessBlueprint = nextData.businessBlueprint as BusinessBlueprint;

    const updateResult = await client
        .from('projects')
        .update({
            data: nextData,
            last_updated: now,
        })
        .eq('id', projectId);

    if (updateResult.error) throw updateResult.error;

    return {
        businessBlueprint: nextBusinessBlueprint,
        chatbotBlueprint,
        data: nextData,
    };
}

function resolveTestingEvaluationStatus(testScenarios: ChatbotTestScenarioBlueprint[]): ChatbotBlueprint['testing']['evaluationStatus'] {
    if (testScenarios.length === 0) return 'not_run';
    if (testScenarios.some(scenario => scenario.status === 'failed')) return 'failing';
    if (testScenarios.every(scenario => scenario.status === 'passed')) return 'passing';
    return 'needs_review';
}

function resolveTestingReadiness(evaluationStatus: ChatbotBlueprint['testing']['evaluationStatus']) {
    if (evaluationStatus === 'passing') return { isReady: true, blockers: [], warnings: [] };
    if (evaluationStatus === 'failing') return { isReady: false, blockers: [testingFailedBlocker], warnings: [] };
    if (evaluationStatus === 'needs_review') return { isReady: false, blockers: [], warnings: [testingNeedsReviewWarning] };
    return { isReady: false, blockers: [], warnings: [testingNotRunWarning] };
}

function uniqueValues<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}

function isDeployableStatus(status: ChatbotDeploymentStatus): boolean {
    return ['draft', 'test', 'deployed', 'paused', 'disabled'].includes(status);
}

function getSurfaceReadiness(status: ChatbotDeploymentStatus) {
    if (status === 'deployed') return { isReady: true, blockers: [], warnings: [] };
    if (status === 'test') return { isReady: false, blockers: [], warnings: [surfaceTestWarning] };
    return { isReady: false, blockers: [], warnings: [surfacePausedWarning] };
}

function resolveDeploymentStatus(channels: ChatbotChannelBlueprint): ChatbotDeploymentStatus {
    const channelValues = SURFACE_DEPLOYMENT_KEYS.map(key => channels[key]);
    if (channelValues.some(channel => channel.enabled && channel.status === 'deployed')) return 'deployed';
    if (channelValues.some(channel => channel.enabled && channel.status === 'test')) return 'test';
    if (channelValues.some(channel => channel.status === 'paused')) return 'paused';
    return 'draft';
}

function syncDeploymentFromChannels(blueprint: ChatbotBlueprint): ChatbotDeploymentBlueprint {
    const deployedSurfaces = uniqueValues(
        SURFACE_DEPLOYMENT_KEYS
            .map(key => blueprint.channels[key])
            .filter(channel => channel.enabled && channel.status === 'deployed')
            .map(channel => channel.sourceSurface),
    );
    const voiceSettings = blueprint.deployment.voiceSettings;
    const blockers = [
        ...(deployedSurfaces.length === 0 ? [noDeployedSurfaceBlocker] : []),
        ...(voiceSettings.enabled && !voiceSettings.agentId ? [voiceMissingAgentBlocker] : []),
    ];

    return {
        ...blueprint.deployment,
        status: resolveDeploymentStatus(blueprint.channels),
        deployedSurfaces,
        readiness: {
            isReady: blockers.length === 0,
            blockers,
            warnings: voiceSettings.enabled ? [] : [voiceDisabledWarning],
        },
    };
}

function updateSurfaceChannelStatus(
    surface: ChatbotSurfaceChannelBlueprint,
    status: ChatbotDeploymentStatus,
): ChatbotSurfaceChannelBlueprint {
    return {
        ...surface,
        enabled: status === 'deployed' || status === 'test',
        status,
        needsReview: status !== 'deployed',
        readiness: getSurfaceReadiness(status),
    };
}

export function reviewChatbotActionInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotActionReviewInput,
): ChatbotBlueprint {
    const now = input.now || new Date().toISOString();
    let reviewedAction: ChatbotActionBlueprint | null = null;

    const nextActions = blueprint.actions.map(action => {
        if (action.actionType !== input.actionType) return action;
        ensureConfigurableAction(action, input);

        reviewedAction = {
            ...action,
            enabled: input.enabled,
            status: input.enabled ? 'configured' : 'disabled',
            needsReview: false,
            requiresReview: false,
            readiness: input.enabled
                ? { isReady: true, blockers: [], warnings: [] }
                : { isReady: false, blockers: [], warnings: [disabledWarning] },
            sourceMap: {
                ...(action.sourceMap || {}),
                actionRegistry: 'chatbotEngine.actionRegistry',
            },
        };
        return reviewedAction;
    });

    if (!reviewedAction) {
        throw Object.assign(new Error(`Chatbot action not found: ${input.actionType}`), {
            code: 'CHATBOT_ACTION_NOT_FOUND',
        });
    }

    return {
        ...blueprint,
        actions: nextActions,
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'actionRegistry', 'chatbotEngine.actionRegistry'),
    };
}

export function reviewChatbotKnowledgeSourceInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotKnowledgeSourceReviewInput,
): ChatbotBlueprint {
    const now = input.now || new Date().toISOString();
    let reviewedSource: ChatbotKnowledgeSourceBlueprint | null = null;

    const nextKnowledgeSources = blueprint.knowledgeSources.map(source => {
        if (source.id !== input.sourceId) return source;
        ensureConfigurableKnowledgeSource(source, input);

        reviewedSource = {
            ...source,
            status: input.enabled ? 'ready' : 'disabled',
            freshness: input.enabled ? 'fresh' : source.freshness,
            confidence: input.enabled ? Math.max(source.confidence || 0, 0.85) : source.confidence,
            needsReview: false,
            userModified: true,
            lockedFromRegeneration: true,
            readiness: input.enabled
                ? { isReady: true, blockers: [], warnings: [] }
                : { isReady: false, blockers: [], warnings: [disabledKnowledgeWarning] },
            sourceMap: {
                ...(source.sourceMap || {}),
                knowledgeCenter: 'chatbotEngine.knowledgeCenter',
            },
        };
        return reviewedSource;
    });

    if (!reviewedSource) {
        throw Object.assign(new Error(`Chatbot knowledge source not found: ${input.sourceId}`), {
            code: 'CHATBOT_KNOWLEDGE_SOURCE_NOT_FOUND',
        });
    }

    return {
        ...blueprint,
        knowledgeSources: nextKnowledgeSources,
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'knowledgeCenter', 'chatbotEngine.knowledgeCenter'),
    };
}

export function updateChatbotTestScenarioInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotTestScenarioStatusInput,
): ChatbotBlueprint {
    const now = input.now || new Date().toISOString();
    let reviewedScenario: ChatbotTestScenarioBlueprint | null = null;

    const nextTestScenarios = blueprint.testing.testScenarios.map(scenario => {
        if (scenario.id !== input.scenarioId) return scenario;
        reviewedScenario = {
            ...scenario,
            status: input.status,
            needsReview: input.status !== 'passed',
        };
        return reviewedScenario;
    });

    if (!reviewedScenario) {
        throw Object.assign(new Error(`Chatbot test scenario not found: ${input.scenarioId}`), {
            code: 'CHATBOT_TEST_SCENARIO_NOT_FOUND',
        });
    }

    const evaluationStatus = resolveTestingEvaluationStatus(nextTestScenarios);

    return {
        ...blueprint,
        testing: {
            ...blueprint.testing,
            testScenarios: nextTestScenarios,
            evaluationStatus,
            readiness: resolveTestingReadiness(evaluationStatus),
        },
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'testLab', 'chatbotEngine.testLab'),
    };
}

export function updateChatbotSurfaceDeploymentInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotSurfaceDeploymentInput,
): ChatbotBlueprint {
    const now = input.now || new Date().toISOString();
    if (!SURFACE_DEPLOYMENT_KEYS.includes(input.surfaceId)) {
        throw Object.assign(new Error(`Chatbot surface not found: ${input.surfaceId}`), {
            code: 'CHATBOT_SURFACE_NOT_FOUND',
        });
    }
    if (!isDeployableStatus(input.status)) {
        throw Object.assign(new Error(`Unsupported chatbot deployment status: ${input.status}`), {
            code: 'CHATBOT_SURFACE_STATUS_UNSUPPORTED',
        });
    }

    const nextChannels: ChatbotChannelBlueprint = {
        ...blueprint.channels,
        [input.surfaceId]: updateSurfaceChannelStatus(blueprint.channels[input.surfaceId], input.status),
    };
    const nextBlueprint: ChatbotBlueprint = {
        ...blueprint,
        channels: nextChannels,
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'deploySettings', 'chatbotEngine.deploySettings'),
    };

    return {
        ...nextBlueprint,
        deployment: syncDeploymentFromChannels(nextBlueprint),
    };
}

export function updateChatbotVoiceSettingsInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotVoiceSettingsInput,
): ChatbotBlueprint {
    const now = input.now || new Date().toISOString();
    const currentVoiceSettings = blueprint.deployment.voiceSettings;
    const provider = input.provider ?? currentVoiceSettings.provider ?? 'none';
    const agentId = input.agentId === undefined ? currentVoiceSettings.agentId : input.agentId || undefined;

    if (input.enabled && (provider === 'none' || !agentId)) {
        throw Object.assign(new Error('Voice provider and agent ID are required before enabling Chatbot Engine voice.'), {
            code: 'CHATBOT_VOICE_AGENT_REQUIRED',
        });
    }

    const voiceSettings: ChatbotDeploymentBlueprint['voiceSettings'] = {
        ...currentVoiceSettings,
        enabled: input.enabled,
        provider: input.enabled ? provider : (provider || 'none'),
        agentId,
        languageMode: input.languageMode || currentVoiceSettings.languageMode,
        consentRequired: input.consentRequired ?? currentVoiceSettings.consentRequired,
    };
    const voiceStatus: ChatbotDeploymentStatus = input.enabled ? 'deployed' : 'disabled';
    const nextChannels: ChatbotChannelBlueprint = {
        ...blueprint.channels,
        voice: {
            ...updateSurfaceChannelStatus(blueprint.channels.voice, voiceStatus),
            readiness: input.enabled
                ? { isReady: true, blockers: [], warnings: [] }
                : { isReady: false, blockers: [], warnings: [voiceDisabledWarning] },
        },
    };
    const nextBlueprint: ChatbotBlueprint = {
        ...blueprint,
        channels: nextChannels,
        deployment: {
            ...blueprint.deployment,
            voiceSettings,
        },
        metadata: updateChatbotBlueprintMetadata(blueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(blueprint, 'voice', 'chatbotEngine.voiceSettings'),
    };

    return {
        ...nextBlueprint,
        deployment: syncDeploymentFromChannels(nextBlueprint),
    };
}

export function applyChatbotBlueprintToProjectData(
    projectDataInput: unknown,
    chatbotBlueprint: ChatbotBlueprint,
): Record<string, unknown> {
    const projectData = isRecord(projectDataInput) ? projectDataInput : {};
    const sourceBlueprint = getProjectBusinessBlueprint(projectData);
    if (!sourceBlueprint) {
        throw Object.assign(new Error('BusinessBlueprint is required before configuring Chatbot Engine.'), {
            code: 'CHATBOT_BLUEPRINT_MISSING',
        });
    }

    const nextBusinessBlueprint: BusinessBlueprint = {
        ...sourceBlueprint,
        chatbotBlueprint,
    };
    const nestedData = isRecord(projectData.data) ? projectData.data : null;

    return {
        ...projectData,
        businessBlueprint: nextBusinessBlueprint,
        ...(nestedData?.businessBlueprint ? {
            data: {
                ...nestedData,
                businessBlueprint: nextBusinessBlueprint,
            },
        } : {}),
    };
}

export async function getChatbotActionRegistry(
    projectId: string,
    client: SupabaseLike = supabase,
): Promise<ChatbotActionBlueprint[]> {
    const { data, error } = await client
        .from('projects')
        .select('data')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw error;
    const projectData = isRecord(data?.data) ? data.data : {};
    const blueprint = getProjectBusinessBlueprint(projectData);
    if (!blueprint?.chatbotBlueprint) {
        throw Object.assign(new Error('ChatbotBlueprint V2 is required before reading Action Registry.'), {
            code: 'CHATBOT_BLUEPRINT_MISSING',
        });
    }

    return blueprint.chatbotBlueprint.actions;
}

export async function getChatbotConfig(
    projectId: string,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigResult> {
    const loaded = await loadProjectChatbotConfig(projectId, client);
    return {
        projectId,
        businessBlueprint: loaded.businessBlueprint,
        chatbotBlueprint: loaded.chatbotBlueprint,
        data: loaded.projectData,
    };
}

export async function updateChatbotConfig(
    projectId: string,
    chatbotBlueprint: ChatbotBlueprint,
    input: ChatbotConfigurationMutationInput = {},
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousMetadata = loaded.chatbotBlueprint.metadata;
    const nextBlueprint: ChatbotBlueprint = {
        ...chatbotBlueprint,
        metadata: updateChatbotBlueprintMetadata(chatbotBlueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(chatbotBlueprint, 'configuration', 'chatbotEngine.configuration'),
    };
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, nextBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'configuration',
        targetId: 'chatbotBlueprint',
        operation: 'update',
        before: { metadata: previousMetadata },
        after: { metadata: nextBlueprint.metadata },
    });

    return {
        projectId,
        ...persisted,
        ...audit,
    };
}

export async function updateProjectChatbotActionReview(
    projectId: string,
    input: ChatbotActionReviewInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousAction = loaded.chatbotBlueprint.actions.find(item => item.actionType === input.actionType);
    const chatbotBlueprint = reviewChatbotActionInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const action = chatbotBlueprint.actions.find(item => item.actionType === input.actionType);
    if (!action) {
        throw Object.assign(new Error(`Chatbot action not found after update: ${input.actionType}`), {
            code: 'CHATBOT_ACTION_NOT_FOUND',
        });
    }
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'actionRegistry',
        targetId: input.actionType,
        targetLabel: input.actionType,
        operation: input.enabled ? 'enable_action' : 'disable_action',
        actionType: input.actionType,
        before: previousAction ? {
            enabled: previousAction.enabled,
            status: previousAction.status,
            needsReview: previousAction.needsReview,
        } : null,
        after: {
            enabled: action.enabled,
            status: action.status,
            needsReview: action.needsReview,
        },
    });

    return {
        projectId,
        ...persisted,
        action,
        ...audit,
    };
}

export async function updateProjectChatbotKnowledgeSourceReview(
    projectId: string,
    input: ChatbotKnowledgeSourceReviewInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousKnowledgeSource = loaded.chatbotBlueprint.knowledgeSources.find(item => item.id === input.sourceId);
    const chatbotBlueprint = reviewChatbotKnowledgeSourceInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const knowledgeSource = chatbotBlueprint.knowledgeSources.find(item => item.id === input.sourceId);
    if (!knowledgeSource) {
        throw Object.assign(new Error(`Chatbot knowledge source not found after update: ${input.sourceId}`), {
            code: 'CHATBOT_KNOWLEDGE_SOURCE_NOT_FOUND',
        });
    }
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'knowledgeCenter',
        targetId: input.sourceId,
        targetLabel: knowledgeSource.name,
        operation: input.enabled ? 'enable_knowledge_source' : 'disable_knowledge_source',
        before: previousKnowledgeSource ? {
            status: previousKnowledgeSource.status,
            needsReview: previousKnowledgeSource.needsReview,
            confidence: previousKnowledgeSource.confidence,
        } : null,
        after: {
            status: knowledgeSource.status,
            needsReview: knowledgeSource.needsReview,
            confidence: knowledgeSource.confidence,
        },
    });

    return {
        projectId,
        ...persisted,
        knowledgeSource,
        ...audit,
    };
}

export async function addProjectChatbotKnowledgeSource(
    projectId: string,
    input: ChatbotKnowledgeSourceCreateInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const result = addChatbotKnowledgeSourceToBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const persisted = result.duplicate
        ? {
            businessBlueprint: loaded.businessBlueprint,
            chatbotBlueprint: loaded.chatbotBlueprint,
            data: loaded.projectData,
        }
        : await persistProjectChatbotBlueprint(projectId, loaded.projectData, result.blueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'knowledgeCenter',
        targetId: result.knowledgeSource.id,
        targetLabel: result.knowledgeSource.name,
        operation: result.duplicate ? 'knowledge_source_duplicate' : 'add_knowledge_source',
        before: null,
        after: {
            id: result.knowledgeSource.id,
            type: result.knowledgeSource.type,
            status: result.knowledgeSource.status,
            visibility: result.knowledgeSource.visibility,
            needsReview: result.knowledgeSource.needsReview,
            contentLength: result.knowledgeSource.contentLength || 0,
            sourceUrl: result.knowledgeSource.sourceUrl || null,
            duplicate: result.duplicate,
        },
    });

    return {
        projectId,
        ...persisted,
        knowledgeSource: result.knowledgeSource,
        ...audit,
    };
}

export async function updateProjectChatbotTestScenarioStatus(
    projectId: string,
    input: ChatbotTestScenarioStatusInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineTestConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousScenario = loaded.chatbotBlueprint.testing.testScenarios.find(item => item.id === input.scenarioId);
    const chatbotBlueprint = updateChatbotTestScenarioInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const testScenario = chatbotBlueprint.testing.testScenarios.find(item => item.id === input.scenarioId);
    if (!testScenario) {
        throw Object.assign(new Error(`Chatbot test scenario not found after update: ${input.scenarioId}`), {
            code: 'CHATBOT_TEST_SCENARIO_NOT_FOUND',
        });
    }
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'testLab',
        targetId: input.scenarioId,
        targetLabel: testScenario.name,
        operation: `mark_${input.status}`,
        before: previousScenario ? {
            status: previousScenario.status,
            needsReview: previousScenario.needsReview,
            evaluationStatus: loaded.chatbotBlueprint.testing.evaluationStatus,
        } : null,
        after: {
            status: testScenario.status,
            needsReview: testScenario.needsReview,
            evaluationStatus: chatbotBlueprint.testing.evaluationStatus,
        },
    });

    return {
        projectId,
        ...persisted,
        testScenario,
        ...audit,
    };
}

export async function updateProjectChatbotSurfaceDeployment(
    projectId: string,
    input: ChatbotSurfaceDeploymentInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineSurfaceConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousSurface = loaded.chatbotBlueprint.channels[input.surfaceId];
    const chatbotBlueprint = updateChatbotSurfaceDeploymentInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const surface = chatbotBlueprint.channels[input.surfaceId];
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'deploySettings',
        targetId: input.surfaceId,
        targetLabel: surface.sourceSurface,
        operation: `surface_${input.status}`,
        before: {
            enabled: previousSurface.enabled,
            status: previousSurface.status,
            needsReview: previousSurface.needsReview,
        },
        after: {
            enabled: surface.enabled,
            status: surface.status,
            needsReview: surface.needsReview,
        },
    });

    return {
        projectId,
        ...persisted,
        surface,
        surfaceId: input.surfaceId,
        ...audit,
    };
}

export async function updateProjectChatbotVoiceSettings(
    projectId: string,
    input: ChatbotVoiceSettingsInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineVoiceConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const previousVoiceSettings = loaded.chatbotBlueprint.deployment.voiceSettings;
    const previousVoiceSurface = loaded.chatbotBlueprint.channels.voice;
    const chatbotBlueprint = updateChatbotVoiceSettingsInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);
    const audit = await recordConfigurationMutationEvent(projectId, loaded, { ...input, now }, client, {
        configurationType: 'voiceSettings',
        targetId: 'voice',
        targetLabel: 'voice',
        operation: input.enabled ? 'enable_voice' : 'disable_voice',
        before: {
            enabled: previousVoiceSettings.enabled,
            provider: previousVoiceSettings.provider,
            agentConfigured: Boolean(previousVoiceSettings.agentId),
            surfaceStatus: previousVoiceSurface.status,
        },
        after: {
            enabled: chatbotBlueprint.deployment.voiceSettings.enabled,
            provider: chatbotBlueprint.deployment.voiceSettings.provider,
            agentConfigured: Boolean(chatbotBlueprint.deployment.voiceSettings.agentId),
            surfaceStatus: chatbotBlueprint.channels.voice.status,
        },
    });

    return {
        projectId,
        ...persisted,
        voiceSettings: chatbotBlueprint.deployment.voiceSettings,
        ...audit,
    };
}

export const getActionRegistry = getChatbotActionRegistry;

export function enableAction(
    projectId: string,
    actionType: ChatbotActionType,
    actorId?: string | null,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigurationResult> {
    return updateProjectChatbotActionReview(projectId, { actionType, enabled: true, actorId }, client);
}

export function disableAction(
    projectId: string,
    actionType: ChatbotActionType,
    actorId?: string | null,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigurationResult> {
    return updateProjectChatbotActionReview(projectId, { actionType, enabled: false, actorId }, client);
}
