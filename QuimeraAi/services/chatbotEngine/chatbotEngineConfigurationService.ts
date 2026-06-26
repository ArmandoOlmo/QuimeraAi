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
    ChatbotKnowledgeSourceBlueprint,
    ChatbotSurfaceChannelBlueprint,
    ChatbotTestScenarioBlueprint,
} from '../../types/businessBlueprint';
import { migrateBusinessBlueprint } from '../../utils/businessBlueprint';

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
    const nextData = applyChatbotBlueprintToProjectData(projectData, chatbotBlueprint);
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
    const nextBlueprint: ChatbotBlueprint = {
        ...chatbotBlueprint,
        metadata: updateChatbotBlueprintMetadata(chatbotBlueprint, input, now),
        sourceMap: updateChatbotBlueprintSourceMap(chatbotBlueprint, 'configuration', 'chatbotEngine.configuration'),
    };
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, nextBlueprint, now, client);

    return {
        projectId,
        ...persisted,
    };
}

export async function updateProjectChatbotActionReview(
    projectId: string,
    input: ChatbotActionReviewInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
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

    return {
        projectId,
        ...persisted,
        action,
    };
}

export async function updateProjectChatbotKnowledgeSourceReview(
    projectId: string,
    input: ChatbotKnowledgeSourceReviewInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineKnowledgeConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
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

    return {
        projectId,
        ...persisted,
        knowledgeSource,
    };
}

export async function updateProjectChatbotTestScenarioStatus(
    projectId: string,
    input: ChatbotTestScenarioStatusInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineTestConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
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

    return {
        projectId,
        ...persisted,
        testScenario,
    };
}

export async function updateProjectChatbotSurfaceDeployment(
    projectId: string,
    input: ChatbotSurfaceDeploymentInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineSurfaceConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const chatbotBlueprint = updateChatbotSurfaceDeploymentInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const surface = chatbotBlueprint.channels[input.surfaceId];
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);

    return {
        projectId,
        ...persisted,
        surface,
        surfaceId: input.surfaceId,
    };
}

export async function updateProjectChatbotVoiceSettings(
    projectId: string,
    input: ChatbotVoiceSettingsInput,
    client: SupabaseLike = supabase,
): Promise<ChatbotEngineVoiceConfigurationResult> {
    const now = input.now || new Date().toISOString();
    const loaded = await loadProjectChatbotConfig(projectId, client);
    const chatbotBlueprint = updateChatbotVoiceSettingsInBlueprint(loaded.chatbotBlueprint, {
        ...input,
        now,
    });
    const persisted = await persistProjectChatbotBlueprint(projectId, loaded.projectData, chatbotBlueprint, now, client);

    return {
        projectId,
        ...persisted,
        voiceSettings: chatbotBlueprint.deployment.voiceSettings,
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
