import type {
    ChatbotActionBlueprint,
    ChatbotActionType,
    ChatbotBlueprint,
    ChatbotSurface,
} from '../../types/businessBlueprint';

export type ChatbotEngineActorType = 'visitor' | 'project_user' | 'system' | 'anonymous';
export type ChatbotEngineActionStatus = 'allowed' | 'blocked' | 'executed' | 'observed' | 'failed' | 'duplicate';

export interface ChatbotEngineAuditEvent {
    tenant_id?: string | null;
    project_id: string;
    conversation_id?: string | null;
    message_id?: string | null;
    lead_id?: string | null;
    appointment_id?: string | null;
    event_type: string;
    action_type?: ChatbotActionType | null;
    action_status: ChatbotEngineActionStatus;
    source_surface?: string | null;
    source_module: string;
    idempotency_key?: string | null;
    correlation_id?: string | null;
    request_fingerprint?: string | null;
    actor_type: ChatbotEngineActorType;
    actor_id?: string | null;
    metadata: Record<string, unknown>;
    created_at?: string;
}

export interface ChatbotActionEvaluationInput {
    blueprint?: ChatbotBlueprint | null;
    tenantId?: string | null;
    projectId: string;
    actionType: ChatbotActionType;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    messageId?: string | null;
    leadId?: string | null;
    appointmentId?: string | null;
    publicRequest?: boolean;
    hasAuth?: boolean;
    hasConsent?: boolean;
    actorType?: ChatbotEngineActorType;
    actorId?: string | null;
    idempotencyKey?: string | null;
    idempotencyParts?: Array<string | number | boolean | null | undefined>;
    correlationId?: string | null;
    requestFingerprint?: string | null;
    metadata?: Record<string, unknown>;
    now?: string;
}

export interface ChatbotActionEvaluation {
    allowed: boolean;
    compatibilityMode: boolean;
    reason: string;
    blockers: string[];
    warnings: string[];
    action?: ChatbotActionBlueprint;
    actionType: ChatbotActionType;
    actionStatus: Extract<ChatbotEngineActionStatus, 'allowed' | 'blocked'>;
    eventType: 'chatbot_action_allowed' | 'chatbot_action_blocked';
    idempotencyKey?: string | null;
    auditEvent: ChatbotEngineAuditEvent;
}

export const CHATBOT_ACTION_BLOCKED_MESSAGE = [
    'ES: Esta accion no esta habilitada en el Action Registry del Chatbot Engine.',
    'EN: This action is not enabled in the Chatbot Engine Action Registry.',
].join('\n');

const DEFAULT_SOURCE_MODULE = 'chatbot-engine';
const DEFAULT_ACTOR_TYPE: ChatbotEngineActorType = 'visitor';
const MAX_IDEMPOTENCY_KEY_LENGTH = 240;

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

function compactMetadata(value?: Record<string, unknown>): Record<string, unknown> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => key.length <= 80)
            .slice(0, 60),
    );
}

export function buildChatbotActionIdempotencyKey(input: Pick<
    ChatbotActionEvaluationInput,
    'projectId' | 'actionType' | 'idempotencyParts' | 'correlationId'
>): string {
    const parts = [
        'chatbot-engine',
        input.projectId,
        input.actionType,
        input.correlationId,
        ...(input.idempotencyParts || []),
    ].map(cleanKeyPart);

    return parts.join(':').slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
}

export function findChatbotAction(
    blueprint: ChatbotBlueprint | null | undefined,
    actionType: ChatbotActionType,
): ChatbotActionBlueprint | undefined {
    return blueprint?.actions.find(action => action.actionType === actionType);
}

function actionReadinessBlockers(action: ChatbotActionBlueprint): string[] {
    const blockers = [...(action.readiness?.blockers || [])];
    if (!action.enabled) blockers.push('action_disabled');
    if (action.status !== 'configured') blockers.push(`action_status_${action.status || 'missing'}`);
    if (action.needsReview || action.requiresReview) blockers.push('action_needs_review');
    if (action.readiness?.isReady === false) blockers.push('action_readiness_false');
    return Array.from(new Set(blockers));
}

function actionReadinessWarnings(action: ChatbotActionBlueprint): string[] {
    return Array.from(new Set(action.readiness?.warnings || []));
}

function getEvaluationBlockers(input: ChatbotActionEvaluationInput, action?: ChatbotActionBlueprint): string[] {
    if (!action) return ['action_not_registered'];

    const blockers = actionReadinessBlockers(action);
    if (input.publicRequest !== false && !action.publicAllowed) blockers.push('public_request_not_allowed');
    if (action.requiresAuth && !input.hasAuth) blockers.push('auth_required');
    if (action.requiresConsent && !input.hasConsent) blockers.push('consent_required');
    return Array.from(new Set(blockers));
}

function buildAuditEvent(input: {
    evaluationInput: ChatbotActionEvaluationInput;
    eventType: string;
    actionStatus: ChatbotEngineActionStatus;
    reason: string;
    blockers?: string[];
    warnings?: string[];
    compatibilityMode?: boolean;
    metadata?: Record<string, unknown>;
}): ChatbotEngineAuditEvent {
    const sourceModule = cleanString(input.evaluationInput.sourceModule, 120) || DEFAULT_SOURCE_MODULE;
    const sourceSurface = cleanString(input.evaluationInput.sourceSurface, 120) || null;
    const idempotencyKey = cleanString(input.evaluationInput.idempotencyKey, MAX_IDEMPOTENCY_KEY_LENGTH)
        || buildChatbotActionIdempotencyKey(input.evaluationInput);

    return {
        tenant_id: input.evaluationInput.tenantId || null,
        project_id: input.evaluationInput.projectId,
        conversation_id: cleanString(input.evaluationInput.conversationId, 120) || null,
        message_id: cleanString(input.evaluationInput.messageId, 120) || null,
        lead_id: cleanString(input.evaluationInput.leadId, 120) || null,
        appointment_id: cleanString(input.evaluationInput.appointmentId, 120) || null,
        event_type: input.eventType,
        action_type: input.evaluationInput.actionType,
        action_status: input.actionStatus,
        source_surface: sourceSurface,
        source_module: sourceModule,
        idempotency_key: idempotencyKey,
        correlation_id: cleanString(input.evaluationInput.correlationId, 240) || null,
        request_fingerprint: cleanString(input.evaluationInput.requestFingerprint, 240) || null,
        actor_type: input.evaluationInput.actorType || DEFAULT_ACTOR_TYPE,
        actor_id: cleanString(input.evaluationInput.actorId, 120) || null,
        metadata: {
            ...compactMetadata(input.evaluationInput.metadata),
            ...compactMetadata(input.metadata),
            reason: input.reason,
            blockers: input.blockers || [],
            warnings: input.warnings || [],
            compatibilityMode: input.compatibilityMode === true,
            publicRequest: input.evaluationInput.publicRequest !== false,
        },
        created_at: input.evaluationInput.now,
    };
}

export function evaluateChatbotAction(input: ChatbotActionEvaluationInput): ChatbotActionEvaluation {
    const idempotencyKey = cleanString(input.idempotencyKey, MAX_IDEMPOTENCY_KEY_LENGTH)
        || buildChatbotActionIdempotencyKey(input);

    if (!input.blueprint) {
        const reason = 'legacy_no_chatbot_blueprint';
        const auditEvent = buildAuditEvent({
            evaluationInput: { ...input, idempotencyKey },
            eventType: 'chatbot_action_allowed',
            actionStatus: 'allowed',
            reason,
            warnings: [reason],
            compatibilityMode: true,
        });

        return {
            allowed: true,
            compatibilityMode: true,
            reason,
            blockers: [],
            warnings: [reason],
            actionType: input.actionType,
            actionStatus: 'allowed',
            eventType: 'chatbot_action_allowed',
            idempotencyKey,
            auditEvent,
        };
    }

    const action = findChatbotAction(input.blueprint, input.actionType);
    const blueprintBlockers = input.blueprint.enabled === false ? ['chatbot_blueprint_disabled'] : [];
    const blockers = Array.from(new Set([...blueprintBlockers, ...getEvaluationBlockers(input, action)]));
    const warnings = action ? actionReadinessWarnings(action) : [];
    const allowed = blockers.length === 0;
    const reason = allowed ? 'action_allowed' : blockers[0];
    const actionStatus: ChatbotActionEvaluation['actionStatus'] = allowed ? 'allowed' : 'blocked';
    const eventType: ChatbotActionEvaluation['eventType'] = allowed ? 'chatbot_action_allowed' : 'chatbot_action_blocked';
    const auditEvent = buildAuditEvent({
        evaluationInput: { ...input, idempotencyKey },
        eventType,
        actionStatus,
        reason,
        blockers,
        warnings,
        compatibilityMode: false,
        metadata: action ? { ownerModule: action.ownerModule, actionId: action.id } : undefined,
    });

    return {
        allowed,
        compatibilityMode: false,
        reason,
        blockers,
        warnings,
        action,
        actionType: input.actionType,
        actionStatus,
        eventType,
        idempotencyKey,
        auditEvent,
    };
}

export function buildChatbotEngineObservedEvent(
    input: Omit<ChatbotActionEvaluationInput, 'blueprint' | 'hasAuth' | 'hasConsent' | 'publicRequest'> & {
        eventType: string;
        actionStatus?: Extract<ChatbotEngineActionStatus, 'observed' | 'executed' | 'failed' | 'duplicate'>;
        reason?: string;
        metadata?: Record<string, unknown>;
    },
): ChatbotEngineAuditEvent {
    return buildAuditEvent({
        evaluationInput: input,
        eventType: input.eventType,
        actionStatus: input.actionStatus || 'observed',
        reason: input.reason || input.eventType,
        metadata: input.metadata,
    });
}

export function buildChatbotEngineExecutedEvent(
    evaluation: ChatbotActionEvaluation,
    metadata?: Record<string, unknown>,
): ChatbotEngineAuditEvent {
    return buildAuditEvent({
        evaluationInput: {
            projectId: evaluation.auditEvent.project_id,
            tenantId: evaluation.auditEvent.tenant_id,
            actionType: evaluation.actionType,
            sourceSurface: evaluation.auditEvent.source_surface,
            sourceModule: evaluation.auditEvent.source_module,
            conversationId: evaluation.auditEvent.conversation_id,
            messageId: evaluation.auditEvent.message_id,
            leadId: evaluation.auditEvent.lead_id,
            appointmentId: evaluation.auditEvent.appointment_id,
            actorType: evaluation.auditEvent.actor_type,
            actorId: evaluation.auditEvent.actor_id,
            idempotencyKey: evaluation.idempotencyKey,
            correlationId: evaluation.auditEvent.correlation_id,
            requestFingerprint: evaluation.auditEvent.request_fingerprint,
            metadata: {
                ...evaluation.auditEvent.metadata,
                ...compactMetadata(metadata),
            },
            now: evaluation.auditEvent.created_at,
        },
        eventType: 'chatbot_action_executed',
        actionStatus: 'executed',
        reason: 'action_executed',
        warnings: evaluation.warnings,
        metadata,
    });
}
