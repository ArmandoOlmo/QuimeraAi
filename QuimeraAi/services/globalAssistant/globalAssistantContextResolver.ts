import type {
    AssistantAdminContext,
    AssistantContextSnapshot,
    AssistantModuleTarget,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import type { Project } from '../../types/project';

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

export interface ResolveAssistantContextInput {
    conversationId?: string | null;
    userId?: string | null;
    email?: string | null;
    role?: string | null;
    mode?: GlobalAssistantMode;
    tenantId?: string | null;
    tenantName?: string | null;
    tenantRole?: string | null;
    tenantPlan?: string | null;
    activeServices?: string[];
    featureFlags?: string[];
    activeProject?: Pick<Project, 'id' | 'name' | 'status' | 'tenantId' | 'userId'> | null;
    activeRoute?: string | null;
    activeModule?: AssistantModuleTarget | null;
    adminView?: string | null;
    selectedSection?: string | null;
    activeEntityType?: string | null;
    activeEntityId?: string | null;
    currentSurface?: string | null;
    locale?: string | null;
    snapshot?: Record<string, unknown>;
}

const normalizeProjectName = (name: unknown): string | null => {
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object') {
        const record = name as Record<string, unknown>;
        return String(record.es || record.en || record.value || record.label || '') || null;
    }
    return null;
};

export function resolveModuleFromRoute(route?: string | null): AssistantModuleTarget | null {
    const path = (route || '').toLowerCase();
    if (!path) return null;
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/editor')) return 'website';
    if (path.includes('/websites')) return 'project';
    if (path.includes('/ecommerce')) return 'ecommerce';
    if (path.includes('/email')) return 'emailMarketing';
    if (path.includes('/appointments')) return 'appointments';
    if (path.includes('/restaurants') || path.includes('/menu')) return 'restaurants';
    if (path.includes('/real-estate') || path.includes('/realty')) return 'realEstate';
    if (path.includes('/biopage')) return 'bioPage';
    if (path.includes('/ai-assistant')) return 'chatbot';
    if (path.includes('/leads')) return 'crm';
    if (path.includes('/finance')) return 'finance';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/assets')) return 'media';
    if (path.includes('/seo')) return 'website';
    if (path.includes('/settings')) return 'settings';
    return 'project';
}

export function resolveCurrentAssistantContext(input: ResolveAssistantContextInput): AssistantContextSnapshot {
    const activeProject = input.activeProject || null;
    const role = input.role || null;
    const isOwnerRole = role === 'owner';
    const isSuperAdminRole = role === 'superadmin' || role === 'super_admin';
    const mode = input.mode || (isOwnerRole ? 'owner' : isSuperAdminRole ? 'super_admin' : 'user');
    const isOwner = isOwnerRole || mode === 'owner';
    const isSuperAdmin = isSuperAdminRole || mode === 'super_admin';
    const activeModule = input.activeModule || resolveModuleFromRoute(input.activeRoute);
    const admin: AssistantAdminContext = {
        enabled: mode === 'owner' || mode === 'super_admin' || activeModule === 'admin',
        adminView: input.adminView || null,
    };

    return {
        id: createId('asst_ctx'),
        conversationId: input.conversationId ?? null,
        actor: {
            userId: input.userId ?? null,
            tenantId: input.tenantId ?? activeProject?.tenantId ?? null,
            email: input.email ?? null,
            role,
            mode,
            isOwner,
            isSuperAdmin,
        },
        tenant: {
            tenantId: input.tenantId ?? activeProject?.tenantId ?? null,
            name: input.tenantName ?? null,
            role: input.tenantRole ?? null,
            plan: input.tenantPlan ?? null,
            activeServices: (input.activeServices || []) as any,
            featureFlags: input.featureFlags || [],
        },
        project: {
            projectId: activeProject?.id ?? null,
            projectName: normalizeProjectName(activeProject?.name),
            tenantId: activeProject?.tenantId ?? input.tenantId ?? null,
            userId: activeProject?.userId ?? input.userId ?? null,
            status: activeProject?.status ?? null,
            sourceProject: activeProject,
        },
        admin,
        activeRoute: input.activeRoute ?? null,
        activeModule,
        activeEntityType: input.activeEntityType ?? null,
        activeEntityId: input.activeEntityId ?? null,
        currentSurface: input.currentSurface ?? 'authenticated_app',
        selectedSection: input.selectedSection ?? null,
        locale: input.locale ?? null,
        snapshot: input.snapshot || {},
        createdAt: nowIso(),
    };
}
