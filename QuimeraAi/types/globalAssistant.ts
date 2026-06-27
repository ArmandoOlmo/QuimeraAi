/**
 * Global Assistant Operating Layer types.
 *
 * This is the platform-internal assistant contract. It must stay separate from:
 * - AiAssistantConfig / ChatCore: visitor-facing project chatbot.
 * - AI Studio: initial business/website generation.
 * - Module-specific assistants: SEO, CMS, Email Studio, Admin content/news studios.
 */

import type { Project } from './project';
import type { PlatformServiceId } from './serviceAvailability';

export type GlobalAssistantScope =
    | 'user'
    | 'tenant'
    | 'project'
    | 'module'
    | 'session'
    | 'task'
    | 'admin'
    | 'system';

export type GlobalAssistantMode =
    | 'user'
    | 'owner'
    | 'super_admin'
    | 'support'
    | 'system';

export type AssistantModuleTarget =
    | 'aiStudio'
    | 'businessBlueprint'
    | 'website'
    | 'storefront'
    | 'ecommerce'
    | 'media'
    | 'appointments'
    | 'restaurants'
    | 'realEstate'
    | 'bioPage'
    | 'crm'
    | 'emailMarketing'
    | 'chatbot'
    | 'analytics'
    | 'finance'
    | 'admin'
    | 'settings'
    | 'project'
    | 'tenant'
    | 'user'
    | 'designSystem';

export type AssistantIntentCategory =
    | 'create'
    | 'edit'
    | 'delete'
    | 'open'
    | 'search'
    | 'analyze'
    | 'generate_content'
    | 'generate_image'
    | 'generate_video'
    | 'schedule'
    | 'publish'
    | 'unpublish'
    | 'sync'
    | 'report'
    | 'debug'
    | 'admin_action'
    | 'explain'
    | 'continue_task'
    | 'undo'
    | 'rollback';

export type AssistantSafetyLevel = 'low' | 'medium' | 'high' | 'critical';

export type AssistantTaskStatus =
    | 'draft'
    | 'planning'
    | 'running'
    | 'waiting_for_confirmation'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type AssistantActionStatus =
    | 'planned'
    | 'previewed'
    | 'applied'
    | 'failed'
    | 'cancelled'
    | 'rolled_back';

export type AssistantMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AssistantJsonSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    properties?: Record<string, AssistantJsonSchema>;
    items?: AssistantJsonSchema;
    required?: string[];
    enum?: string[];
    description?: string;
    additionalProperties?: boolean | AssistantJsonSchema;
}

export interface AssistantActorContext {
    userId: string | null;
    tenantId: string | null;
    role?: string | null;
    email?: string | null;
    mode: GlobalAssistantMode;
    isOwner?: boolean;
    isSuperAdmin?: boolean;
}

export interface AssistantTenantContext {
    tenantId: string | null;
    name?: string | null;
    role?: string | null;
    plan?: string | null;
    activeServices?: PlatformServiceId[];
    featureFlags?: string[];
    branding?: Record<string, unknown> | null;
}

export interface AssistantProjectContext {
    projectId: string | null;
    projectName?: string | null;
    tenantId?: string | null;
    userId?: string | null;
    status?: string | null;
    activePageId?: string | null;
    businessBlueprintVersion?: string | null;
    sourceProject?: Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'> | null;
}

export interface AssistantAdminContext {
    enabled: boolean;
    adminView?: string | null;
    targetTenantId?: string | null;
    targetUserId?: string | null;
    targetProjectId?: string | null;
}

export interface AssistantContextSnapshot {
    id: string;
    conversationId?: string | null;
    actor: AssistantActorContext;
    tenant: AssistantTenantContext;
    project: AssistantProjectContext;
    admin: AssistantAdminContext;
    activeRoute?: string | null;
    activeModule?: AssistantModuleTarget | null;
    activeEntityType?: string | null;
    activeEntityId?: string | null;
    currentSurface?: string | null;
    selectedSection?: string | null;
    selectedModuleItem?: string | null;
    locale?: string | null;
    snapshot: Record<string, unknown>;
    createdAt: string;
}

export interface AssistantMemorySource {
    source: string;
    sourceEntityType: string;
    sourceEntityId: string;
}

export interface AssistantMemoryItem extends AssistantMemorySource {
    id: string;
    memoryId?: string | null;
    tenantId: string | null;
    userId: string | null;
    projectId: string | null;
    scope: GlobalAssistantScope;
    module?: AssistantModuleTarget | null;
    title: string;
    summary: string;
    data: Record<string, unknown>;
    embeddingId?: string | null;
    importance: number;
    expiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface GlobalAssistantMemory {
    id: string;
    tenantId: string | null;
    userId: string | null;
    projectId: string | null;
    scope: GlobalAssistantScope;
    module?: AssistantModuleTarget | null;
    title: string;
    summary: string;
    data: Record<string, unknown>;
    source: string;
    sourceEntityType: string;
    sourceEntityId: string;
    importance: number;
    expiresAt?: string | null;
    items?: AssistantMemoryItem[];
    createdAt: string;
    updatedAt: string;
}

export interface AssistantMemoryScopeSegment {
    scope: GlobalAssistantScope;
    module?: AssistantModuleTarget | null;
    count: number;
    memoryIds: string[];
    titles: string[];
    sources: string[];
    highestImportance: number;
}

export interface AssistantMemoryContextManifest {
    userId: string | null;
    tenantId: string | null;
    projectId: string | null;
    mode: GlobalAssistantMode;
    activeModule: AssistantModuleTarget | null;
    sessionId: string | null;
    taskId: string | null;
    totalCount: number;
    memoryIds: string[];
    scopeCounts: Partial<Record<GlobalAssistantScope, number>>;
    moduleCounts: Partial<Record<AssistantModuleTarget, number>>;
    segments: AssistantMemoryScopeSegment[];
    explanation: string[];
    guardrails: {
        tenantIsolation: string;
        projectIsolation: string;
        adminMemoryVisible: boolean;
        adminMemoryReason: string;
    };
    createdAt: string;
}

export interface AssistantConversation {
    id: string;
    userId: string | null;
    tenantId: string | null;
    projectId: string | null;
    mode: GlobalAssistantMode;
    title?: string | null;
    activeTaskId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface AssistantMessage {
    id: string;
    conversationId: string;
    role: AssistantMessageRole;
    text: string;
    contextSnapshotId?: string | null;
    memoryIds?: string[];
    actionIds?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface AssistantIntent {
    intent: AssistantIntentCategory;
    module: AssistantModuleTarget;
    confidence: number;
    projectResolution: {
        projectId?: string | null;
        requiresProjectSwitch: boolean;
        ambiguous: boolean;
        candidateProjectIds?: string[];
    };
    actionCandidates: string[];
    requiresClarification: boolean;
    clarifyingQuestion?: string;
    safetyLevel: AssistantSafetyLevel;
    rationale?: string;
}

export interface AssistantRollbackSnapshot {
    id: string;
    actionId: string;
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot?: Record<string, unknown>;
    rollbackActionType?: string;
    createdAt: string;
}

export interface AssistantExecutionPreview {
    actionId: string;
    module: AssistantModuleTarget;
    actionType: string;
    projectId: string | null;
    target: Record<string, unknown>;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    diff?: Record<string, unknown> | null;
    risks: string[];
    blockers: string[];
    requiresConfirmation: boolean;
    rollbackSupported: boolean;
}

export interface AssistantApprovalRequest {
    id: string;
    actionId: string;
    taskId?: string | null;
    requestedBy: string | null;
    safetyLevel: AssistantSafetyLevel;
    reason: string;
    preview: AssistantExecutionPreview;
    createdAt: string;
    confirmedAt?: string | null;
    cancelledAt?: string | null;
}

export interface AssistantActionDefinition<Input = Record<string, unknown>, Output = Record<string, unknown>> {
    actionType: string;
    module: AssistantModuleTarget;
    description: string;
    inputSchema: AssistantJsonSchema;
    outputSchema?: AssistantJsonSchema;
    requiredPermissions: string[];
    requiredService?: PlatformServiceId;
    requiredFeature?: string;
    safetyLevel: AssistantSafetyLevel;
    requiresConfirmation: boolean;
    previewSupported: boolean;
    rollbackSupported: boolean;
    mutatesData: boolean;
    idempotencyKeyStrategy: 'none' | 'user_project_action' | 'target_hash' | 'explicit';
    validate?: (input: Input) => { valid: boolean; errors: string[] };
    preview?: (input: Input) => Promise<AssistantExecutionPreview>;
    execute?: (input: Input, context: {
        action: AssistantAction;
        context?: AssistantContextSnapshot;
    }) => Promise<Output>;
    rollback?: (input: Input, context: {
        action: AssistantAction;
        snapshot: AssistantRollbackSnapshot;
        context?: AssistantContextSnapshot;
    }) => Promise<Output>;
}

export interface AssistantAction {
    id: string;
    taskId?: string | null;
    userId: string | null;
    tenantId: string | null;
    projectId: string | null;
    mode: GlobalAssistantMode;
    module: AssistantModuleTarget;
    actionType: string;
    target: Record<string, unknown>;
    input: Record<string, unknown>;
    beforeSnapshot?: Record<string, unknown> | null;
    afterSnapshot?: Record<string, unknown> | null;
    diff?: Record<string, unknown> | null;
    requiresConfirmation: boolean;
    confirmedAt?: string | null;
    status: AssistantActionStatus;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt?: string;
}

export interface AssistantTask {
    id: string;
    userId: string | null;
    tenantId: string | null;
    projectId: string | null;
    module: AssistantModuleTarget;
    intent: AssistantIntentCategory;
    status: AssistantTaskStatus;
    request: string;
    plan?: AssistantExecutionPlan | null;
    draftChanges?: Record<string, unknown> | null;
    result?: Record<string, unknown> | null;
    errors: string[];
    createdAt: string;
    updatedAt: string;
}

export interface AssistantExecutionPlan {
    id: string;
    taskId?: string | null;
    contextSnapshotId: string;
    intent: AssistantIntent;
    actions: AssistantAction[];
    previews: AssistantExecutionPreview[];
    approvals: AssistantApprovalRequest[];
    safetyLevel: AssistantSafetyLevel;
    requiresConfirmation: boolean;
    status: 'draft' | 'preview' | 'apply' | 'blocked' | 'complete' | 'cancelled';
    blockers: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface AssistantActionLog extends AssistantAction {
    modelUsed?: string | null;
    toolUsed?: string | null;
    latencyMs?: number | null;
    costUsd?: number | null;
    error?: string | null;
}

export interface AssistantRuntimeEvent {
    id: string;
    type:
        | 'assistant_request_started'
        | 'assistant_intent_classified'
        | 'assistant_context_resolved'
        | 'assistant_memory_loaded'
        | 'assistant_action_previewed'
        | 'assistant_action_confirmed'
        | 'assistant_action_cancelled'
        | 'assistant_action_applied'
        | 'assistant_action_failed'
        | 'assistant_action_rolled_back'
        | 'assistant_project_switched'
        | 'assistant_admin_action_requested'
        | 'assistant_model_call'
        | 'assistant_tool_call'
        | 'assistant_memory_updated';
    userId: string | null;
    tenantId: string | null;
    projectId: string | null;
    taskId?: string | null;
    actionId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface AssistantModelConfig {
    role: 'orchestrator' | 'fallback' | 'fast' | 'imagePro' | 'imageFast';
    modelId: string;
    supportsTools: boolean;
    supportsToolChoice: boolean;
    supportsStructuredOutputs: boolean;
    supportsResponseFormat: boolean;
    supportsReasoning: boolean;
    supportsImages: boolean;
    supportsAudioVideoInput: boolean;
    contextLength?: number;
    providerPolicy?: {
        requireParameters: boolean;
        dataCollection?: 'deny' | 'allow';
    };
}

export interface AssistantToolSchema {
    name: string;
    description: string;
    inputSchema: AssistantJsonSchema;
    safetyLevel: AssistantSafetyLevel;
    module: AssistantModuleTarget;
}

export interface AssistantPermissionCheck {
    allowed: boolean;
    requiresConfirmation: boolean;
    requiresPreview: boolean;
    reasons: string[];
    missingPermissions: string[];
}
