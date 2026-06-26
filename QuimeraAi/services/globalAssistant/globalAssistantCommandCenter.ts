import type { Project } from '../../types/project';
import { PLATFORM_SERVICES, type PlatformServiceId } from '../../types/serviceAvailability';
import type {
    AssistantContextSnapshot,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import type { GlobalAssistantRuntimeResult } from './globalAssistantRuntime';
import { resolveCurrentAssistantContext } from './globalAssistantContextResolver';

export const GLOBAL_ASSISTANT_KNOWN_FEATURE_FLAGS = [
    'websiteBuilder',
    'emailMarketing',
    'ecommerceEnabled',
    'chatbotEnabled',
    'realEstateModule',
] as const;

export interface ResolveGlobalAssistantAppContextInput {
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
    currentSurface?: string | null;
    locale?: string | null;
    view?: string | null;
    availableProjects?: Array<Pick<Project, 'id' | 'name' | 'status'>>;
    snapshot?: Record<string, unknown>;
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
        currentSurface: input.currentSurface,
        locale: input.locale,
        snapshot: {
            view: input.view || null,
            availableProjects,
            ...input.snapshot,
        },
    });
}

export function shouldContinueAfterRuntimePlan(result: GlobalAssistantRuntimeResult): boolean {
    const mutatesData = result.plan.actions.some(action => action.metadata?.mutatesData === true);

    return result.plan.status !== 'blocked'
        && !result.plan.requiresConfirmation
        && !mutatesData
        && result.plan.safetyLevel === 'low';
}

export function formatGlobalAssistantPlanMessage(
    result: GlobalAssistantRuntimeResult,
    locale?: string | null,
): string {
    const spanish = isSpanish(locale);
    const projectName = result.context.project.projectName || result.context.project.projectId || (spanish ? 'sin proyecto activo' : 'no active project');
    const actionLabels = result.plan.actions.map(action => `${action.module}.${action.actionType}`);
    const blocked = result.plan.blockers.length > 0;
    const approvals = result.plan.approvals.length;
    const previews = result.plan.previews.length;
    const memoryCount = result.memoryUsed.length;

    if (spanish) {
        const lines = [
            'Plan del Operating Layer',
            `Modulo: ${result.plan.intent.module}`,
            `Intencion: ${result.plan.intent.intent}`,
            `Estado: ${result.plan.status}`,
            `Proyecto: ${projectName}`,
            `Modelo planificado: ${result.modelId}`,
            `Tarea: ${result.task.id}`,
            `Memoria usada: ${memoryCount}`,
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
        `Memory used: ${memoryCount}`,
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
    }

    return lines.join('\n');
}
