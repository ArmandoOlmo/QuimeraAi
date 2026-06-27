import type { Project } from '../../types/project';
import type { TenantPermissions } from '../../types/multiTenant';
import { PLATFORM_SERVICES, type PlatformServiceId } from '../../types/serviceAvailability';
import type {
    AssistantModuleTarget,
    AssistantContextSnapshot,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import type { AssistantLifecycleResult, GlobalAssistantRuntimeResult } from './globalAssistantRuntime';
import { resolveCurrentAssistantContext } from './globalAssistantContextResolver';
import { buildGlobalAssistantCapabilityCatalog } from './globalAssistantCapabilityCatalog';
import { buildGlobalAssistantChatSurfaceMap } from './globalAssistantChatSurfaceRegistry';

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

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

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
    'agency',
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
                requireServiceContext: true,
            }),
            assistantSurfaces: buildGlobalAssistantChatSurfaceMap({
                currentSurface: input.currentSurface,
                activeRoute: input.activeRoute,
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
    'switch_project',
    'open_project',
    'open_website_builder',
    'open_storefront_builder',
    'open_orders',
    'open_email_hub',
    'open_calendar',
    'open_chatbot_dashboard',
    'open_media_library',
    'open_leads_dashboard',
    'open_bio_page_builder',
    'open_finance_dashboard',
    'open_agency_command_center',
    'open_agency_client_360',
    'open_restaurants_dashboard',
    'open_realty_dashboard',
    'open_analytics_dashboard',
    'open_super_admin',
    'open_tenant',
]);

const ACTION_COPY: Record<string, { es: string; en: string }> = {
    switch_project: { es: 'cambiar al proyecto correcto', en: 'switch to the right project' },
    open_project: { es: 'abrir el proyecto', en: 'open the project' },
    open_website_builder: { es: 'abrir el editor del sitio', en: 'open the site editor' },
    open_storefront_builder: { es: 'abrir el editor de la tienda', en: 'open the store editor' },
    open_orders: { es: 'abrir la tienda', en: 'open the store' },
    open_email_hub: { es: 'abrir emails', en: 'open emails' },
    open_calendar: { es: 'abrir citas', en: 'open appointments' },
    open_chatbot_dashboard: { es: 'abrir ChatCore', en: 'open ChatCore' },
    open_media_library: { es: 'abrir imagenes y videos', en: 'open images and videos' },
    open_leads_dashboard: { es: 'abrir leads', en: 'open leads' },
    open_bio_page_builder: { es: 'abrir Bio Page', en: 'open Bio Page' },
    open_finance_dashboard: { es: 'abrir finanzas', en: 'open finance' },
    open_agency_command_center: { es: 'abrir Agency Command Center', en: 'open Agency Command Center' },
    open_agency_client_360: { es: 'abrir Client 360', en: 'open Client 360' },
    search_agency_clients: { es: 'buscar clientes de agencia', en: 'search agency clients' },
    summarize_agency_performance: { es: 'resumir performance de agencia', en: 'summarize agency performance' },
    open_restaurants_dashboard: { es: 'abrir restaurantes', en: 'open restaurants' },
    open_realty_dashboard: { es: 'abrir Realty', en: 'open Realty' },
    open_analytics_dashboard: { es: 'abrir analytics', en: 'open analytics' },
    open_super_admin: { es: 'abrir Super Admin', en: 'open Super Admin' },
    open_tenant: { es: 'abrir el tenant', en: 'open the tenant' },
    create_project_from_prompt: { es: 'crear un proyecto nuevo', en: 'create a new project' },
    create_website_from_prompt: { es: 'crear un sitio web', en: 'create a website' },
    edit_website_section: { es: 'editar una seccion del sitio', en: 'edit a site section' },
    update_section_copy: { es: 'actualizar texto del sitio', en: 'update site text' },
    update_section_image: { es: 'actualizar una imagen del sitio', en: 'update a site image' },
    generate_image: { es: 'generar una imagen', en: 'generate an image' },
    edit_image: { es: 'editar una imagen', en: 'edit an image' },
    generate_video: { es: 'crear un video', en: 'create a video' },
    create_asset_from_prompt: { es: 'crear una imagen o video', en: 'create an image or video' },
    create_email_campaign: { es: 'crear una campana de email', en: 'create an email campaign' },
    generate_email_copy: { es: 'escribir un email', en: 'write an email' },
    create_product: { es: 'crear un producto', en: 'create a product' },
    edit_product: { es: 'editar un producto', en: 'edit a product' },
    create_lead: { es: 'crear un lead', en: 'create a lead' },
    summarize_leads: { es: 'revisar leads', en: 'review leads' },
    create_appointment: { es: 'crear una cita', en: 'create an appointment' },
    create_bio_page: { es: 'crear una Bio Page', en: 'create a Bio Page' },
    sync_chatbot_knowledge: { es: 'entrenar ChatCore', en: 'train ChatCore' },
    test_chatbot: { es: 'probar ChatCore', en: 'test ChatCore' },
    summarize_analytics: { es: 'revisar analytics', en: 'review analytics' },
    identify_blockers: { es: 'identificar bloqueos', en: 'identify blockers' },
    create_finance_record: { es: 'crear un registro financiero', en: 'create a finance record' },
    update_finance_record: { es: 'actualizar un registro financiero', en: 'update a finance record' },
    review_errors: { es: 'revisar errores de plataforma', en: 'review platform errors' },
    summarize_business_blueprint: { es: 'revisar el proyecto', en: 'review the project' },
    summarize_operating_layer_capabilities: { es: 'revisar lo que puedo hacer', en: 'review what I can do' },
    run_project_report: { es: 'preparar un reporte', en: 'prepare a report' },
    export_report: { es: 'exportar un reporte', en: 'export a report' },
};

const humanizeAction = (actionType: string, spanish: boolean): string => {
    const copy = ACTION_COPY[actionType];
    if (copy) return spanish ? copy.es : copy.en;
    return actionType.replace(/_/g, ' ');
};

const stripActionPrefix = (blocker: string): string =>
    blocker.replace(/^[a-z0-9_]+:\s*/i, '').trim();

const humanizeBlocker = (blocker: string, spanish: boolean): string => {
    const reason = stripActionPrefix(blocker);
    const normalized = reason.toLowerCase();

    if (normalized.includes('which project should i use')) {
        return spanish
            ? 'Elige un proyecto.'
            : 'I need to know which project to use.';
    }
    if (normalized.includes('which matching project should i use')) {
        return spanish
            ? 'Hay mas de un proyecto posible. Escribe el nombre exacto.'
            : 'I found more than one matching project. Type the exact project name.';
    }
    if (normalized.includes('no execute handler registered')) {
        return spanish
            ? 'Todavia no puedo hacer eso automaticamente.'
            : 'This action is not connected to real execution yet.';
    }
    if (normalized.includes('required service is not available')) {
        return spanish
            ? 'Esta funcion no esta disponible en este momento.'
            : reason;
    }
    if (normalized.includes('required feature is not enabled')) {
        return spanish
            ? 'Esta funcion no esta activa para este workspace.'
            : reason;
    }

    return reason;
};

const formatAvailableProjectHint = (
    result: GlobalAssistantRuntimeResult,
    spanish: boolean,
): string | null => {
    const projects = Array.isArray(result.context.snapshot?.availableProjects)
        ? result.context.snapshot.availableProjects.map(asRecord)
        : [];
    const names = projects
        .map(project => asText(project.name))
        .filter(Boolean)
        .slice(0, 4);
    if (!names.length) return null;
    const suffix = projects.length > names.length ? ', ...' : '';
    return spanish
        ? `Opciones: ${names.join(', ')}${suffix}`
        : `Options: ${names.join(', ')}${suffix}`;
};

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

const formatValueList = (value: unknown, limit = 5): string => {
    const values = asArray(value)
        .map(item => asText(item).trim())
        .filter(Boolean);
    if (values.length === 0) return '';
    const visible = values.slice(0, limit).join(', ');
    const remaining = values.length - limit;
    return remaining > 0 ? `${visible} +${remaining}` : visible;
};

const formatBusinessBlueprintResultLines = (
    snapshot: Record<string, unknown>,
    spanish: boolean,
): string[] => {
    const summary = asRecord(snapshot.summary);
    const businessName = asText(summary.businessName) || asText(snapshot.projectName) || asText(snapshot.projectId);
    const selectedModuleCount = asNumber(summary.selectedModuleCount) ?? 0;
    const enabledModuleCount = asNumber(summary.enabledModuleCount) ?? 0;
    const readyModuleCount = asNumber(summary.readyModuleCount) ?? 0;
    const reviewModuleCount = asNumber(summary.reviewModuleCount) ?? 0;
    const recommendation = formatValueList(snapshot.recommendations, 1);

    const lines = [
        spanish
            ? `Proyecto: ${businessName || 'proyecto activo'}`
            : `Project: ${businessName || 'active project'}`,
        spanish
            ? `Listo: ${readyModuleCount} de ${enabledModuleCount || selectedModuleCount} areas activas. Por revisar: ${reviewModuleCount}.`
            : `Ready: ${readyModuleCount} of ${enabledModuleCount || selectedModuleCount} active areas. To review: ${reviewModuleCount}.`,
    ];

    if (recommendation) {
        lines.push(spanish
            ? `Siguiente: ${recommendation}.`
            : `Next: ${recommendation}.`);
    }

    return lines;
};

const formatAnalyticsResultLines = (
    snapshot: Record<string, unknown>,
    spanish: boolean,
): string[] => {
    const summary = asRecord(snapshot.summary);
    const analytics = asRecord(snapshot.analytics);
    const projectName = asText(summary.projectName) || asText(analytics.projectName) || asText(summary.projectId);
    const blockerCount = asNumber(summary.blockerCount) ?? asArray(analytics.blockers).length;
    const warningCount = asNumber(summary.warningCount) ?? asArray(analytics.warnings).length;
    const totalSignals = asNumber(summary.totalSignals) ?? 0;
    const blockers = formatValueList(analytics.blockers, 4);
    const exportInfo = asRecord(snapshot.export);
    const fileName = asText(exportInfo.fileName);

    const lines = [
        spanish
            ? `Resumen: ${projectName || 'proyecto activo'}`
            : `Summary: ${projectName || 'active project'}`,
        spanish
            ? `${totalSignals} senales revisadas. ${blockerCount} bloqueos y ${warningCount} avisos.`
            : `${totalSignals} signals checked. ${blockerCount} blockers and ${warningCount} warnings.`,
    ];

    if (blockers) {
        lines.push(spanish
            ? `Bloqueos: ${blockers}.`
            : `Blockers: ${blockers}.`);
    }
    if (fileName) {
        lines.push(spanish
            ? `Export preparado: ${fileName}.`
            : `Export prepared: ${fileName}.`);
    }

    return lines;
};

const formatOperatingLayerCapabilityResultLines = (
    snapshot: Record<string, unknown>,
    spanish: boolean,
): string[] => {
    const summary = asRecord(snapshot.summary);
    const blockedBy = asRecord(snapshot.blockedBy);
    const assistantSurfaces = asRecord(snapshot.assistantSurfaces);
    const modules = asArray(snapshot.modules).map(asRecord);
    const moduleNames = modules
        .map(module => asText(module.module))
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');
    const availableActionCount = asNumber(summary.availableActionCount) ?? 0;
    const unavailableActionCount = asNumber(summary.unavailableActionCount) ?? 0;
    const blockedServices = formatValueList(blockedBy.services, 5);
    const blockedFeatures = formatValueList(blockedBy.features, 5);
    const surfaceCount = asNumber(assistantSurfaces.surfaceCount) ?? asArray(assistantSurfaces.surfaces).length;
    const recommendation = formatValueList(snapshot.recommendations, 1);

    const lines = [
        spanish
            ? `Puedo ayudarte en ${modules.length} areas.`
            : `I can help in ${modules.length} areas.`,
        spanish
            ? `${availableActionCount} acciones estan disponibles ahora.`
            : `${availableActionCount} actions are available now.`,
    ].filter(Boolean);

    if (blockedServices) {
        lines.push(spanish
            ? `Servicios por activar: ${blockedServices}.`
            : `Required inactive services: ${blockedServices}.`);
    }
    if (blockedFeatures) {
        lines.push(spanish
            ? `Funciones por activar: ${blockedFeatures}.`
            : `Required feature flags: ${blockedFeatures}.`);
    }
    if (unavailableActionCount > 0 && lines.length < 4) {
        lines.push(spanish
            ? `${unavailableActionCount} acciones necesitan permisos o servicios activos.`
            : `Actions blocked by context: ${unavailableActionCount}.`);
    }
    if (moduleNames && lines.length < 4) {
        lines.push(spanish ? `Ejemplos: ${moduleNames}.` : `Examples: ${moduleNames}.`);
    }
    if (surfaceCount > 0) {
        lines.push(spanish
            ? `${surfaceCount} chats detectados; este es el asistente global.`
            : `${surfaceCount} chat surfaces detected; this is the global assistant.`);
    }
    if (recommendation) {
        lines.push(spanish ? `Siguiente: ${recommendation}.` : `Next: ${recommendation}.`);
    }

    return lines;
};

const formatLeadSummaryResultLines = (
    snapshot: Record<string, unknown>,
    spanish: boolean,
): string[] => {
    const summary = asRecord(snapshot.summary);
    const totalLeads = asNumber(summary.totalLeads) ?? 0;
    const openTasks = asNumber(summary.openTasks) ?? 0;
    const activityCount = asNumber(summary.activityCount) ?? 0;
    const totalValue = asNumber(summary.totalValue) ?? 0;

    return [
        spanish
            ? `Leads: ${totalLeads}; tareas abiertas: ${openTasks}; actividades: ${activityCount}.`
            : `Leads: ${totalLeads}; open tasks: ${openTasks}; activities: ${activityCount}.`,
        totalValue > 0
            ? (spanish ? `Valor estimado: ${totalValue}.` : `Estimated value: ${totalValue}.`)
            : '',
    ].filter(Boolean);
};

const formatSearchResultLines = (
    snapshot: Record<string, unknown>,
    spanish: boolean,
): string[] => {
    const kind = asText(snapshot.kind);
    const matches = asArray(snapshot.matches).map(asRecord);
    const matchCount = asNumber(snapshot.matchCount) ?? matches.length;
    const names = matches
        .map(match => asText(match.name) || asText(match.id))
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');

    if (kind === 'project_search') {
        return [
            spanish ? `Proyectos encontrados: ${matchCount}.` : `Projects found: ${matchCount}.`,
            names ? (spanish ? `Matches: ${names}.` : `Matches: ${names}.`) : '',
        ].filter(Boolean);
    }
    if (kind === 'tenant_search') {
        return [
            spanish ? `Workspaces encontrados: ${matchCount}.` : `Workspaces found: ${matchCount}.`,
            names ? (spanish ? `Matches: ${names}.` : `Matches: ${names}.`) : '',
        ].filter(Boolean);
    }

    return [];
};

const formatAppliedActionResultLines = (
    result: AssistantLifecycleResult,
    spanish: boolean,
): string[] => {
    const lines: string[] = [];
    for (const action of result.actions) {
        const snapshot = asRecord(action.afterSnapshot);
        const kind = asText(snapshot.kind);
        if (!kind) continue;

        if (kind === 'business_blueprint_summary') {
            lines.push(...formatBusinessBlueprintResultLines(snapshot, spanish));
        } else if (kind === 'operating_layer_capability_summary') {
            lines.push(...formatOperatingLayerCapabilityResultLines(snapshot, spanish));
        } else if (['summary', 'blockers', 'report', 'export'].includes(kind) && snapshot.analytics) {
            lines.push(...formatAnalyticsResultLines(snapshot, spanish));
        } else if (kind === 'lead_summary') {
            lines.push(...formatLeadSummaryResultLines(snapshot, spanish));
        } else if (kind === 'project_search' || kind === 'tenant_search') {
            lines.push(...formatSearchResultLines(snapshot, spanish));
        }
    }

    return lines.slice(0, 10);
};

export function formatOperatingLayerApplyMessage(
    result: AssistantLifecycleResult,
    locale?: string | null,
): string {
    const spanish = isSpanish(locale);
    const blockers = result.plan.blockers || [];
    const resultLines = formatAppliedActionResultLines(result, spanish);
    const actionLabels = result.actions
        .filter(action => action.status === 'applied')
        .map(action => humanizeAction(action.actionType, spanish));

    if (spanish) {
        if (blockers.length > 0) {
            return [
                'No pude terminarlo.',
                humanizeBlocker(blockers[0], true),
            ].join('\n');
        }

        return [
            actionLabels.length ? `Listo. Ya pude ${actionLabels.join(' y ')}.` : 'Listo.',
            ...resultLines.slice(0, 3),
        ].join('\n');
    }

    if (blockers.length > 0) {
        return [
            'I could not finish that.',
            humanizeBlocker(blockers[0], false),
        ].join('\n');
    }

    return [
        actionLabels.length ? `Done. I finished: ${actionLabels.join(' and ')}.` : 'Done.',
        ...resultLines.slice(0, 3),
    ].join('\n');
}

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
        && AUTO_APPLY_NAVIGATION_ACTIONS.has(action.actionType)
    );
}

export function formatGlobalAssistantPlanMessage(
    result: GlobalAssistantRuntimeResult,
    locale?: string | null,
): string {
    const spanish = isSpanish(locale);
    const projectName = getPlanProjectLabel(result, spanish ? 'sin proyecto activo' : 'no active project');
    const actionLabels = result.plan.actions.map(action => humanizeAction(action.actionType, spanish));
    const blocked = result.plan.blockers.length > 0;
    const blockerLines = result.plan.blockers
        .map(blocker => humanizeBlocker(blocker, spanish))
        .filter(Boolean);
    const projectHint = formatAvailableProjectHint(result, spanish);
    const navigationOnly = result.plan.actions.length > 0 && result.plan.actions.every(action =>
        action.metadata?.mutatesData !== true
        && AUTO_APPLY_NAVIGATION_ACTIONS.has(action.actionType)
    );

    if (blocked) {
        const primaryAction = actionLabels[0] || (spanish ? 'hacer eso' : 'do that');
        const primaryBlocker = blockerLines[0] || (spanish ? 'Necesito mas informacion.' : 'I need more information.');
        const isProjectMissing = primaryBlocker.toLowerCase().includes(spanish ? 'proyecto' : 'project');

        if (spanish) {
            return [
                isProjectMissing ? '¿Para qué proyecto?' : 'No pude hacerlo todavía.',
                `Puedo ${primaryAction}, pero ${primaryBlocker.charAt(0).toLowerCase()}${primaryBlocker.slice(1)}`,
                projectHint,
                'Elige el módulo correcto y confirma allí la acción final.',
            ].filter(line => line !== null && line !== undefined).join('\n');
        }

        return [
            isProjectMissing ? 'Which project should I use?' : 'I could not do that yet.',
            `I can ${primaryAction}, but ${primaryBlocker}`,
            projectHint,
            'Choose the right module and confirm the final action there.',
        ].filter(line => line !== null && line !== undefined).join('\n');
    }

    const primaryAction = actionLabels[0] || (spanish ? 'hacer eso' : 'do that');
    const joinedActions = actionLabels.join(spanish ? ' y ' : ' and ');

    if (navigationOnly && !result.plan.requiresConfirmation && result.plan.status !== 'preview') {
        if (spanish) {
            return [
                `Voy a ${joinedActions || primaryAction}.`,
                projectName ? `Proyecto: ${projectName}` : null,
            ].filter(Boolean).join('\n');
        }

        return [
            `I will ${joinedActions || primaryAction}.`,
            projectName ? `Project: ${projectName}` : null,
        ].filter(Boolean).join('\n');
    }

    if (spanish) {
        const lines = [
            `Para ${joinedActions || primaryAction}${projectName ? ` en ${projectName}` : ''}, abre el módulo correcto y revísalo allí.`,
            'Dime qué área quieres usar y te explico los pasos.',
        ];

        return lines.join('\n');
    }

    const lines = [
        `To ${joinedActions || primaryAction}${projectName ? ` for ${projectName}` : ''}, open the right module and review it there.`,
        'Tell me which area you want to use and I will explain the steps.',
    ];

    return lines.join('\n');
}
