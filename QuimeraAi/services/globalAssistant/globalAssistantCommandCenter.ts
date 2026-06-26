import type { Project } from '../../types/project';
import type { TenantPermissions } from '../../types/multiTenant';
import { PLATFORM_SERVICES, type PlatformServiceId } from '../../types/serviceAvailability';
import type {
    AssistantModuleTarget,
    AssistantContextSnapshot,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import type { GlobalAssistantRuntimeResult } from './globalAssistantRuntime';
import { resolveCurrentAssistantContext } from './globalAssistantContextResolver';
import { buildGlobalAssistantCapabilityCatalog } from './globalAssistantCapabilityCatalog';

export const GLOBAL_ASSISTANT_KNOWN_FEATURE_FLAGS = [
    'websiteBuilder',
    'emailMarketing',
    'ecommerceEnabled',
    'chatbotEnabled',
    'realEstateModule',
] as const;

export interface ResolveGlobalAssistantAppContextInput {
    conversationId?: string | null;
    userId?: string | null;
    email?: string | null;
    role?: string | null;
    mode?: GlobalAssistantMode;
    tenantId?: string | null;
    tenantName?: string | null;
    tenantRole?: string | null;
    tenantPlan?: string | null;
    activeServices?: PlatformServiceId[];
    featureFlags?: string[];
    activeProject?: Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'> | null;
    activeRoute?: string | null;
    activeModule?: AssistantContextSnapshot['activeModule'];
    selectedSection?: string | null;
    activeEntityType?: string | null;
    activeEntityId?: string | null;
    currentSurface?: string | null;
    locale?: string | null;
    view?: string | null;
    availableProjects?: Array<Pick<Project, 'id' | 'name' | 'status'>>;
    snapshot?: Record<string, unknown>;
}

export interface ResolveOperatingLayerTenantContextInput {
    activeProject?: Pick<Project, 'tenantId'> | null;
    currentTenant?: {
        id?: string | null;
        name?: unknown;
        subscriptionPlan?: string | null;
    } | null;
    currentMembership?: {
        role?: string | null;
    } | null;
    userDocument?: {
        tenantId?: string | null;
        tenantRole?: string | null;
    } | null;
}

export interface OperatingLayerTenantContext {
    tenantId: string | null;
    tenantName: string | null;
    tenantRole: string | null;
    tenantPlan: string | null;
}

export interface ResolveOperatingLayerAccessInput {
    userRole?: string | null;
    tenantRole?: string | null;
    tenantPermissions?: Partial<TenantPermissions> | null;
}

export interface OperatingLayerAccessContext {
    mode: GlobalAssistantMode;
    userPermissions: string[];
}

const isSpanish = (locale?: string | null) => (locale || '').toLowerCase().startsWith('es');

const asText = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return String(record.es || record.en || record.value || record.label || '');
    }
    return value == null ? '' : String(value);
};

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const ALL_ASSISTANT_MODULES: AssistantModuleTarget[] = [
    'aiStudio',
    'businessBlueprint',
    'website',
    'storefront',
    'ecommerce',
    'media',
    'appointments',
    'restaurants',
    'realEstate',
    'bioPage',
    'crm',
    'emailMarketing',
    'chatbot',
    'analytics',
    'finance',
    'admin',
    'settings',
    'project',
    'tenant',
    'user',
    'designSystem',
];

const addModulePermissions = (permissions: Set<string>, modules: AssistantModuleTarget[]) => {
    modules.forEach(module => permissions.add(`assistant:${module}:use`));
};

export function resolveOperatingLayerTenantContext(input: ResolveOperatingLayerTenantContextInput): OperatingLayerTenantContext {
    const projectTenantId = asText(input.activeProject?.tenantId).trim() || null;
    const currentTenantId = asText(input.currentTenant?.id).trim() || null;
    const fallbackTenantId = asText(input.userDocument?.tenantId).trim() || null;
    const tenantId = projectTenantId || currentTenantId || fallbackTenantId;
    const canUseCurrentTenantDetails = Boolean(tenantId && currentTenantId && tenantId === currentTenantId);

    return {
        tenantId,
        tenantName: canUseCurrentTenantDetails
            ? (asText(input.currentTenant?.name).trim() || null)
            : null,
        tenantRole: canUseCurrentTenantDetails
            ? (asText(input.currentMembership?.role).trim() || null)
            : (asText(input.userDocument?.tenantRole).trim() || null),
        tenantPlan: canUseCurrentTenantDetails
            ? (asText(input.currentTenant?.subscriptionPlan).trim() || null)
            : null,
    };
}

export function resolveOperatingLayerAssistantMode(input: Pick<ResolveOperatingLayerAccessInput, 'userRole' | 'tenantRole'>): GlobalAssistantMode {
    const userRole = asText(input.userRole).trim();
    const tenantRole = asText(input.tenantRole).trim();

    if (userRole === 'superadmin' || userRole === 'super_admin') return 'super_admin';
    if (userRole === 'owner' || tenantRole === 'agency_owner') return 'owner';
    if (userRole === 'support') return 'support';
    return 'user';
}

export function resolveOperatingLayerAccessContext(input: ResolveOperatingLayerAccessInput): OperatingLayerAccessContext {
    const mode = resolveOperatingLayerAssistantMode(input);
    const permissions = new Set<string>();
    const tenantPermissions = input.tenantPermissions || {};

    if (mode === 'owner' || mode === 'super_admin' || mode === 'system') {
        addModulePermissions(permissions, ALL_ASSISTANT_MODULES);
        permissions.add('assistant:admin:use');
        permissions.add('assistant:admin:write');
        permissions.add('assistant:admin:billing');
        return { mode, userPermissions: Array.from(permissions).sort() };
    }

    if (tenantPermissions.canManageProjects) {
        addModulePermissions(permissions, ['aiStudio', 'businessBlueprint', 'project', 'website', 'designSystem']);
    }
    if (tenantPermissions.canManageCMS) {
        addModulePermissions(permissions, ['website', 'bioPage', 'chatbot']);
    }
    if (tenantPermissions.canManageEcommerce) {
        addModulePermissions(permissions, ['ecommerce', 'storefront']);
    }
    if (tenantPermissions.canManageLeads) {
        addModulePermissions(permissions, ['crm', 'emailMarketing', 'appointments']);
    }
    if (tenantPermissions.canManageRealEstate) {
        addModulePermissions(permissions, ['realEstate']);
    }
    if (tenantPermissions.canManageFiles) {
        addModulePermissions(permissions, ['media']);
    }
    if (tenantPermissions.canViewAnalytics) {
        addModulePermissions(permissions, ['analytics']);
    }
    if (tenantPermissions.canManageBilling) {
        addModulePermissions(permissions, ['finance']);
    }
    if (tenantPermissions.canManageSettings) {
        addModulePermissions(permissions, ['settings', 'tenant', 'user']);
    }

    return { mode, userPermissions: Array.from(permissions).sort() };
}

const previewLine = (preview: GlobalAssistantRuntimeResult['plan']['previews'][number], spanish: boolean): string => {
    const diff = asRecord(preview.diff);
    const after = asRecord(preview.after);
    const label = asText(diff.createdLabel) || `${preview.module}.${preview.actionType}`;
    const status = asText(after.status);
    const reviewRequired = diff.reviewRequired === true;
    const rollback = asText(diff.rollback);
    const parts = [
        label,
        status ? `${spanish ? 'estado' : 'status'}: ${status}` : '',
        reviewRequired ? (spanish ? 'requiere revision' : 'requires review') : '',
        rollback ? `${spanish ? 'rollback' : 'rollback'}: ${rollback}` : '',
    ].filter(Boolean);
    return `- ${parts.join(' | ')}`;
};

export function listEnabledPlatformServices(canAccessService: (serviceId: PlatformServiceId) => boolean): PlatformServiceId[] {
    return PLATFORM_SERVICES
        .map(service => service.id)
        .filter(serviceId => canAccessService(serviceId));
}

export function defaultGlobalAssistantFeatureFlags(): string[] {
    return [...GLOBAL_ASSISTANT_KNOWN_FEATURE_FLAGS];
}

export function resolveGlobalAssistantAppContext(input: ResolveGlobalAssistantAppContextInput): AssistantContextSnapshot {
    const availableProjects = (input.availableProjects || []).slice(0, 12).map(project => ({
        id: project.id,
        name: asText(project.name),
        status: project.status,
    }));

    return resolveCurrentAssistantContext({
        conversationId: input.conversationId,
        userId: input.userId,
        email: input.email,
        role: input.role,
        mode: input.mode,
        tenantId: input.tenantId,
        tenantName: input.tenantName,
        tenantRole: input.tenantRole,
        tenantPlan: input.tenantPlan,
        activeServices: input.activeServices,
        featureFlags: input.featureFlags,
        activeProject: input.activeProject,
        activeRoute: input.activeRoute,
        activeModule: input.activeModule,
        selectedSection: input.selectedSection,
        activeEntityType: input.activeEntityType,
        activeEntityId: input.activeEntityId,
        currentSurface: input.currentSurface,
        locale: input.locale,
        snapshot: {
            view: input.view || null,
            availableProjects,
            toolCatalog: buildGlobalAssistantCapabilityCatalog({
                enabledServices: input.activeServices,
                enabledFeatures: input.featureFlags,
            }),
            ...input.snapshot,
        },
    });
}

export function shouldContinueAfterRuntimePlan(result: GlobalAssistantRuntimeResult): boolean {
    const mutatesData = result.plan.actions.some(action => action.metadata?.mutatesData === true);
    const hasExecutableActions = result.plan.actions.some(action => action.metadata?.executable === true);

    return result.plan.status !== 'blocked'
        && !result.plan.requiresConfirmation
        && !mutatesData
        && !hasExecutableActions
        && result.plan.safetyLevel === 'low';
}

const AUTO_APPLY_NAVIGATION_ACTIONS = new Set([
    'open_project',
    'open_website_builder',
    'open_storefront_builder',
    'open_orders',
    'open_email_hub',
    'open_calendar',
    'open_chatbot_dashboard',
    'open_tenant',
]);

const formatMemoryContextSummary = (result: GlobalAssistantRuntimeResult): string => {
    const manifest = result.memoryContext;
    if (!manifest || manifest.totalCount === 0) return String(result.memoryUsed.length);

    const scopes = Object.entries(manifest.scopeCounts)
        .filter(([, count]) => Number(count) > 0)
        .map(([scope, count]) => `${scope}:${count}`)
        .join(', ');

    return scopes ? `${manifest.totalCount} (${scopes})` : String(manifest.totalCount);
};

const formatCountMap = (counts?: Record<string, number | undefined>): string =>
    Object.entries(counts || {})
        .filter(([, count]) => Number(count) > 0)
        .map(([key, count]) => `${key}:${count}`)
        .join(', ');

const formatMemorySegments = (result: GlobalAssistantRuntimeResult): string => {
    const segments = result.memoryContext?.segments || [];
    if (segments.length === 0) return '';

    return segments
        .slice(0, 4)
        .map(segment => `${segment.scope}${segment.module ? `.${segment.module}` : ''}:${segment.count}`)
        .join(', ');
};

const formatMemoryContextDetailLines = (
    result: GlobalAssistantRuntimeResult,
    spanish: boolean,
): string[] => {
    const manifest = result.memoryContext;
    if (!manifest) return [];

    const targetProject = manifest.projectId || result.context.project.projectId || (spanish ? 'sin proyecto' : 'no project');
    const targetTenant = manifest.tenantId || result.context.tenant?.tenantId || (spanish ? 'sin workspace' : 'no workspace');
    const targetModule = manifest.activeModule || result.plan.intent.module;
    const scopeSummary = formatCountMap(manifest.scopeCounts);
    const segmentSummary = formatMemorySegments(result);
    const adminVisibility = manifest.guardrails?.adminMemoryVisible
        ? (spanish ? 'admin visible por modo Owner/Super Admin' : 'admin visible through Owner/Super Admin mode')
        : (spanish ? 'admin oculto en modo usuario' : 'admin hidden in user mode');

    const lines = [
        spanish
            ? `Contexto usado: workspace ${targetTenant}, proyecto ${targetProject}, modulo ${targetModule}, modo ${manifest.mode}.`
            : `Context used: workspace ${targetTenant}, project ${targetProject}, module ${targetModule}, mode ${manifest.mode}.`,
    ];

    if (scopeSummary) {
        lines.push(spanish
            ? `Memoria segmentada: ${scopeSummary}.`
            : `Segmented memory: ${scopeSummary}.`);
    }
    if (segmentSummary) {
        lines.push(spanish
            ? `Segmentos usados: ${segmentSummary}.`
            : `Segments used: ${segmentSummary}.`);
    }
    lines.push(spanish
        ? `Guardrails: ${adminVisibility}; ${manifest.guardrails.projectIsolation}`
        : `Guardrails: ${adminVisibility}; ${manifest.guardrails.projectIsolation}`);

    return lines;
};

export function buildGlobalAssistantPlanMemoryMetadata(result: GlobalAssistantRuntimeResult): Record<string, unknown> {
    const manifest = result.memoryContext;
    if (!manifest) {
        return {
            totalCount: result.memoryUsed.length,
            memoryIds: result.memoryUsed.map(memory => memory.id),
        };
    }

    return {
        userId: manifest.userId,
        tenantId: manifest.tenantId,
        projectId: manifest.projectId,
        mode: manifest.mode,
        activeModule: manifest.activeModule,
        sessionId: manifest.sessionId,
        taskId: manifest.taskId,
        totalCount: manifest.totalCount,
        memoryIds: manifest.memoryIds,
        scopeCounts: manifest.scopeCounts,
        moduleCounts: manifest.moduleCounts,
        segments: manifest.segments.map(segment => ({
            scope: segment.scope,
            module: segment.module,
            count: segment.count,
            memoryIds: segment.memoryIds,
            titles: segment.titles,
            sources: segment.sources,
        })),
        explanation: manifest.explanation,
        guardrails: manifest.guardrails,
    };
}

const getPlanProjectLabel = (result: GlobalAssistantRuntimeResult, fallback: string): string => {
    const contextProjectId = result.context.project.projectId || null;
    const targetProjectId = result.memoryContext?.projectId
        || result.plan.actions.find(action => action.projectId)?.projectId
        || contextProjectId;
    if (!targetProjectId) return fallback;

    if (targetProjectId === contextProjectId) {
        return result.context.project.projectName || targetProjectId;
    }

    const availableProjects = Array.isArray(result.context.snapshot?.availableProjects)
        ? result.context.snapshot.availableProjects
        : [];
    const targetProject = availableProjects
        .map(asRecord)
        .find(project => project.id === targetProjectId);

    return asText(targetProject?.name) || targetProjectId;
};

export function shouldAutoApplyOperatingLayerPlan(result: GlobalAssistantRuntimeResult): boolean {
    if (result.plan.status === 'blocked' || result.plan.requiresConfirmation) return false;
    if (result.plan.actions.length === 0) return false;
    if (result.plan.status === 'preview' || result.plan.previews.length > 0) return false;

    return result.plan.actions.every(action =>
        action.metadata?.mutatesData !== true
        && (
            AUTO_APPLY_NAVIGATION_ACTIONS.has(action.actionType)
            || action.metadata?.executable === true
        )
    );
}

export function formatGlobalAssistantPlanMessage(
    result: GlobalAssistantRuntimeResult,
    locale?: string | null,
): string {
    const spanish = isSpanish(locale);
    const projectName = getPlanProjectLabel(result, spanish ? 'sin proyecto activo' : 'no active project');
    const actionLabels = result.plan.actions.map(action => `${action.module}.${action.actionType}`);
    const blocked = result.plan.blockers.length > 0;
    const approvals = result.plan.approvals.length;
    const previews = result.plan.previews.length;
    const memorySummary = formatMemoryContextSummary(result);
    const memoryContextLines = formatMemoryContextDetailLines(result, spanish);
    const previewNeedsApplyConfirmation = !blocked
        && previews > 0
        && result.plan.status === 'preview'
        && !result.plan.requiresConfirmation;

    if (spanish) {
        const lines = [
            'Plan del Operating Layer',
            `Modulo: ${result.plan.intent.module}`,
            `Intencion: ${result.plan.intent.intent}`,
            `Estado: ${result.plan.status}`,
            `Proyecto: ${projectName}`,
            `Modelo planificado: ${result.modelId}`,
            `Tarea: ${result.task.id}`,
            `Memoria usada: ${memorySummary}`,
            ...memoryContextLines,
        ];

        if (actionLabels.length > 0) {
            lines.push(`Acciones propuestas: ${actionLabels.join(', ')}`);
        }
        if (previews > 0) {
            lines.push(`Previews: ${previews}`);
            lines.push(...result.plan.previews.slice(0, 4).map(preview => previewLine(preview, true)));
        }
        if (approvals > 0) {
            lines.push(`Confirmaciones requeridas: ${approvals}`);
        }
        if (blocked) {
            lines.push(`Bloqueos: ${result.plan.blockers.join(' | ')}`);
        }
        if (result.plan.requiresConfirmation) {
            lines.push('No voy a aplicar cambios hasta que confirmes el preview.');
            lines.push('Responde "confirmar" para aplicar o "cancelar" para descartarlo.');
        } else if (previewNeedsApplyConfirmation) {
            lines.push('Preview listo. No voy a aplicar cambios hasta que confirmes.');
            lines.push('Responde "confirmar" para aplicar o "cancelar" para descartarlo.');
        }

        return lines.join('\n');
    }

    const lines = [
        'Operating Layer plan',
        `Module: ${result.plan.intent.module}`,
        `Intent: ${result.plan.intent.intent}`,
        `Status: ${result.plan.status}`,
        `Project: ${projectName}`,
        `Planned model: ${result.modelId}`,
        `Task: ${result.task.id}`,
        `Memory used: ${memorySummary}`,
        ...memoryContextLines,
    ];

    if (actionLabels.length > 0) {
        lines.push(`Proposed actions: ${actionLabels.join(', ')}`);
    }
    if (previews > 0) {
        lines.push(`Previews: ${previews}`);
        lines.push(...result.plan.previews.slice(0, 4).map(preview => previewLine(preview, false)));
    }
    if (approvals > 0) {
        lines.push(`Confirmations required: ${approvals}`);
    }
    if (blocked) {
        lines.push(`Blockers: ${result.plan.blockers.join(' | ')}`);
    }
    if (result.plan.requiresConfirmation) {
        lines.push('I will not apply changes until you confirm the preview.');
        lines.push('Reply "confirm" to apply or "cancel" to discard it.');
    } else if (previewNeedsApplyConfirmation) {
        lines.push('Preview ready. I will not apply changes until you confirm.');
        lines.push('Reply "confirm" to apply or "cancel" to discard it.');
    }

    return lines.join('\n');
}
