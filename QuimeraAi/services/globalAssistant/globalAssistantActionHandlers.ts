import { supabase as defaultSupabase } from '../../supabase';
import { componentStyles as defaultComponentStyles } from '../../data/componentStyles';
import { initialData } from '../../data/initialData';
import type {
    AssistantAction,
    AssistantActionDefinition,
    AssistantContextSnapshot,
    AssistantModuleTarget,
    AssistantRollbackSnapshot,
} from '../../types/globalAssistant';
import { createAppointmentCanonical, timestampFromIso, type CanonicalAppointmentInput } from '../appointments/appointmentEngineService';
import {
    addProjectChatbotKnowledgeSource,
    applyChatbotBlueprintToProjectData,
    type ChatbotSurfaceDeploymentKey,
} from '../chatbotEngine/chatbotEngineConfigurationService';
import {
    deployChatbotToSurface,
    runProjectChatbotTestLab,
} from '../chatbot/chatbotEngineService';
import { createAudience } from '../email/emailAudienceService';
import { createAutomationDraft } from '../email/emailAutomationService';
import { createCampaignDraft, loadCampaign, updateCampaign } from '../email/emailCampaignService';
import type { BrandIdentity, PageData, PageSection, SitePage, ThemeData } from '../../types';
import { DEFAULT_STOREFRONT_THEME } from '../../types/ecommerce';
import type { ProductCardVariant } from '../../types/productCard';
import type { StorefrontSectionKind } from '../../types/storefrontRenderer';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import { PLATFORM_SERVICES, type PlatformServiceId, type ServiceStatus } from '../../types/serviceAvailability';
import type {
    ChatbotBlueprint,
    ChatbotDeploymentStatus,
    ChatbotKnowledgeSourceBlueprint,
    ChatbotKnowledgeSourceType,
    ChatbotKnowledgeVisibility,
    BusinessBlueprint,
} from '../../types/businessBlueprint';
import type { PropertyCampaign, PropertyOpenHouse, RealtyProperty } from '../../types/realty';
import {
    createSnapshotBeforeRegeneration,
    mapAssistantModuleToBlueprintModuleKey,
    migrateBusinessBlueprint,
    syncWebsiteBlueprintFromEditor,
} from '../../utils/businessBlueprint';
import { mapPropertyCampaignToRow, mapPropertyOpenHouseToRow, mapRealtyPropertyToRow, toRealtySlug } from '../../utils/realty';
import {
    STOREFRONT_SECTION_KINDS,
    isStorefrontSectionKind,
    storefrontSectionRegistry,
    validateStorefrontSectionSettings,
} from '../../utils/storefrontRenderer/registry';
import { resolveStorefrontEditorConfig } from '../../utils/storefrontRenderer/editorConfig';
import { normalizeStorefrontSectionVisibility } from '../../utils/storefrontRenderer/visibility';
import {
    getAgencyEngineOperatingSystemManifest,
    getModuleRegistryItem,
} from '../../registry/moduleRegistry';

type SupabaseClientLike = {
    from: (table: string) => any;
    functions?: {
        invoke: (functionName: string, options?: { body?: Record<string, unknown> }) => Promise<{ data?: unknown; error?: unknown }>;
    };
};

type HandlerPatch = Pick<AssistantActionDefinition, 'validate' | 'execute' | 'rollback'>;

export interface GlobalAssistantActionHandlerDependencies {
    supabase?: SupabaseClientLike;
    now?: () => string;
    createId?: (prefix: string) => string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const cloneRecord = (value: Record<string, unknown>): Record<string, unknown> =>
    JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const readString = (value: unknown): string | undefined => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || undefined;
};

const readDisplayText = (value: unknown): string | undefined => {
    const direct = readString(value);
    if (direct) return direct;
    const record = asRecord(value);
    return readString(record.es) || readString(record.en) || readString(record.value) || readString(record.label);
};

const readNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const readBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', 'yes', 'si', 'sí', '1'].includes(normalized)) return true;
        if (['false', 'no', '0'].includes(normalized)) return false;
    }
    return undefined;
};

const readDate = (value: unknown, fallback: string): string => {
    const text = readString(value);
    if (!text) return fallback;
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : fallback;
};

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const titleFromRequest = (request: string | undefined, fallback: string): string => {
    if (!request) return fallback;
    const trimmed = request.replace(/\s+/g, ' ').trim();
    if (!trimmed) return fallback;
    return trimmed.length > 72 ? `${trimmed.slice(0, 69)}...` : trimmed;
};

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'draft';

const normalizeForSearch = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const includesAny = (text: string, terms: string[]): boolean =>
    terms.some(term => text.includes(term));

const isUuid = (value: string | undefined): value is string =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const createId = (prefix: string): string => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

const getClient = (deps: GlobalAssistantActionHandlerDependencies): SupabaseClientLike =>
    deps.supabase || defaultSupabase;

const invokeFunction = async (
    deps: GlobalAssistantActionHandlerDependencies,
    functionName: string,
    body: Record<string, unknown>,
): Promise<unknown> => {
    const client = getClient(deps);
    if (typeof client.functions?.invoke !== 'function') {
        throw new Error(`Supabase functions.invoke is required for ${functionName}.`);
    }

    const result = await client.functions.invoke(functionName, { body });
    if (result?.error) throw result.error;
    return asRecord(result?.data).data || result?.data;
};

const getNow = (deps: GlobalAssistantActionHandlerDependencies): string =>
    deps.now ? deps.now() : new Date().toISOString();

const getProjectId = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const projectId = readString(input.projectId) || action.projectId || context?.project.projectId || '';
    if (!projectId) throw new Error('projectId is required before applying this assistant action.');
    return projectId;
};

const getTenantId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string | null =>
    action.tenantId || context?.tenant.tenantId || context?.project.tenantId || null;

const getRequiredTenantId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const tenantId = getTenantId(action, context);
    if (!tenantId) throw new Error('tenantId is required before applying this assistant action.');
    return tenantId;
};

const buildBaseMetadata = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => ({
    ...(asRecord(input.metadata)),
    globalAssistant: {
        taskId: action.taskId || null,
        actionId: action.id,
        actionType: action.actionType,
        module: action.module,
        request: readString(input.request) || '',
        contextSnapshotId: context?.id || null,
        generatedByAI: true,
        needsReview: true,
    },
});

const selectSingle = async (builder: any) => {
    const selected = typeof builder.select === 'function' ? builder.select('*') : builder;
    if (typeof selected.maybeSingle === 'function') return selected.maybeSingle();
    if (typeof selected.single === 'function') return selected.single();
    return selected;
};

const selectFirstRow = async (builder: any): Promise<Record<string, unknown>> => {
    const limited = typeof builder.limit === 'function' ? builder.limit(1) : builder;
    const result = await limited;
    if (result?.error) throw result.error;
    return asRecord(asArray(result?.data)[0]);
};

const insertRow = async (
    client: SupabaseClientLike,
    table: string,
    row: Record<string, unknown>,
) => {
    const result = await selectSingle(client.from(table).insert(row));
    if (result?.error) throw result.error;
    return result?.data || row;
};

const loadProjectScopedRow = async (
    client: SupabaseClientLike,
    table: string,
    projectId: string,
    id: string,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from(table).select('*').eq('id', id).eq('project_id', projectId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`${table}.${id} was not found for project ${projectId}.`);
    }
    return cloneRecord(row);
};

const loadRowById = async (
    client: SupabaseClientLike,
    table: string,
    id: string,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from(table).select('*').eq('id', id));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`${table}.${id} was not found.`);
    }
    return cloneRecord(row);
};

const updateRowById = async (
    client: SupabaseClientLike,
    table: string,
    id: string,
    patch: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from(table).update(patch).eq('id', id));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`${table}.${id} could not be updated.`);
    }
    return row;
};

const updateProjectScopedRow = async (
    client: SupabaseClientLike,
    table: string,
    projectId: string,
    id: string,
    patch: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from(table).update(patch).eq('id', id).eq('project_id', projectId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`${table}.${id} could not be updated for project ${projectId}.`);
    }
    return row;
};

const deleteRowById = async (
    client: SupabaseClientLike,
    table: string,
    id: string,
) => {
    const result = await client.from(table).delete().eq('id', id);
    if (result?.error) throw result.error;
    return { deleted: true, table, id };
};

const getSnapshotRowId = (
    snapshot: AssistantRollbackSnapshot,
    keys: string[] = ['id'],
): string | null => {
    const after = asRecord(snapshot.afterSnapshot);
    for (const key of keys) {
        const value = readString(after[key]);
        if (value) return value;
    }
    const row = asRecord(after.row);
    for (const key of keys) {
        const value = readString(row[key]);
        if (value) return value;
    }
    return null;
};

const rollbackCreatedRow = (
    table: string,
    deps: GlobalAssistantActionHandlerDependencies,
    idKeys: string[] = ['id'],
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const id = getSnapshotRowId(snapshot, idKeys);
    if (!id) throw new Error(`Cannot rollback ${table}: created row id was not recorded.`);
    const result = await deleteRowById(getClient(deps), table, id);
    return {
        afterSnapshot: {
            ...snapshot.beforeSnapshot,
            rollback: result,
        },
        diff: {
            deleted: [`${table}.${id}`],
        },
    };
};

const rollbackUpdatedProjectScopedRow = (
    table: string,
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const row = asRecord(before.row);
    const id = readString(before.id) || readString(row.id);
    const projectId = readString(before.projectId) || readString(row.project_id);
    if (!id || !projectId || !Object.keys(row).length) {
        throw new Error(`Cannot rollback ${table}: previous row snapshot was not recorded.`);
    }
    const { id: _id, ...restorePatch } = row;
    const restored = await updateProjectScopedRow(getClient(deps), table, projectId, id, restorePatch);
    return {
        afterSnapshot: {
            table,
            id,
            projectId,
            row: restored,
            restored: true,
        },
        diff: {
            restored: [`${table}.${id}`],
        },
    };
};

const rollbackUpdatedRow = (
    table: string,
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const row = asRecord(before.row);
    const id = readString(before.id) || readString(row.id);
    if (!id || !Object.keys(row).length) {
        throw new Error(`Cannot rollback ${table}: previous row snapshot was not recorded.`);
    }
    const { id: _id, ...restorePatch } = row;
    const restored = await updateRowById(getClient(deps), table, id, restorePatch);
    return {
        afterSnapshot: {
            table,
            id,
            row: restored,
            restored: true,
        },
        diff: {
            restored: [`${table}.${id}`],
        },
    };
};

const requireObject = (input: Record<string, unknown>, key: string): Record<string, unknown> =>
    asRecord(input[key]);

const noValidationErrors = () => ({ valid: true, errors: [] });

const findProjectSnapshot = (
    projectId: string | null,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => {
    const projects = asArray(context?.snapshot?.availableProjects);
    return asRecord(projects.find(project => asRecord(project).id === projectId));
};

const createNavigationHandler = (
    view: string,
    options: {
        label: string;
        requiresProject?: boolean;
        adminView?: string;
        moduleItem?: string;
    },
): HandlerPatch => ({
    validate: input => ({
        valid: !options.requiresProject || Boolean(readString(input.projectId)),
        errors: !options.requiresProject || readString(input.projectId)
            ? []
            : [`${options.label} requires a projectId before navigation.`],
    }),
    execute: async (input, { action, context }) => {
        const projectId = readString(input.projectId) || action.projectId || context?.project.projectId || null;
        const project = findProjectSnapshot(projectId, context);
        return {
            afterSnapshot: {
                navigation: {
                    type: 'view',
                    view,
                    adminView: options.adminView || null,
                    moduleItem: options.moduleItem || null,
                    projectId,
                    projectName: readDisplayText(project.name) || context?.project.projectName || null,
                    actionType: action.actionType,
                    module: action.module,
                    sourceModule: 'global-assistant',
                    sourceComponent: 'OperatingLayer',
                    message: options.label,
                },
            },
            diff: {
                opened: [options.adminView ? `${view}.${options.adminView}` : view],
                projectId,
            },
        };
    },
});

const safeAssistantRows = async (
    builder: any,
    source: string,
): Promise<{ rows: Record<string, unknown>[]; warning?: string }> => {
    try {
        const result = await builder;
        if (result?.error) throw result.error;
        return { rows: asArray(result?.data).map(asRecord) };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { rows: [], warning: `${source}: ${message}` };
    }
};

const withOptionalLimit = (builder: any, count: number): any =>
    typeof builder?.limit === 'function' ? builder.limit(count) : builder;

const readAgencyTenantId = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const tenantId = readString(input.tenantId) || getTenantId(action, context);
    if (!tenantId) throw new Error('tenantId is required before using Agency Engine assistant actions.');
    return tenantId;
};

const dateOnlyFromIso = (value: string): string => value.slice(0, 10);

const addDaysToDateOnly = (value: string, days: number): string => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return value;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

const normalizeAgencyReportType = (value: unknown): string => {
    const allowed = new Set([
        'executive_summary',
        'client_monthly',
        'website_performance',
        'ecommerce_performance',
        'leads_crm',
        'email_marketing',
        'chatbot_performance',
        'appointments',
        'restaurant',
        'real_estate',
        'ai_usage',
    ]);
    const reportType = readString(value) || 'executive_summary';
    return allowed.has(reportType) ? reportType : 'executive_summary';
};

const createAgencyClient360NavigationHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => ({
        valid: Boolean(readString(input.clientTenantId)),
        errors: readString(input.clientTenantId) ? [] : ['clientTenantId is required before opening Agency Client 360.'],
    }),
    execute: async (input, { action, context }) => {
        const clientTenantId = readString(input.clientTenantId);
        const section = readString(input.section) || 'overview';
        if (!clientTenantId) throw new Error('clientTenantId is required before opening Agency Client 360.');
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const client360 = snapshot.clients.find(client => client.clientTenantId === clientTenantId);

        if (!client360) {
            throw new Error('Agency Client 360 can only open clients managed by the active agency tenant.');
        }

        return {
            afterSnapshot: {
                navigation: {
                    type: 'view',
                    view: 'agency',
                    moduleItem: 'client-360',
                    clientTenantId,
                    section,
                    tenantId: agencyTenantId,
                    actionType: action.actionType,
                    module: action.module,
                    sourceModule: 'global-assistant',
                    sourceComponent: 'OperatingLayer',
                    message: 'Open Agency Client 360.',
                },
                client360,
                warnings: snapshot.warnings,
                sourceTables: snapshot.sourceTables,
            },
            diff: {
                opened: [`agency.client360.${clientTenantId}.${section}`],
                clientTenantId,
                section,
                agencyTenantId,
                sourceTables: snapshot.sourceTables,
            },
        };
    },
});

const readAgencyClientsSnapshot = async (
    deps: GlobalAssistantActionHandlerDependencies,
    agencyTenantId: string,
) => {
    const client = getClient(deps);
    const relationshipsQuery = withOptionalLimit(
        client
            .from('agency_clients')
            .select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')
            .eq('agency_tenant_id', agencyTenantId),
        100,
    );
    const plansQuery = withOptionalLimit(
        client
            .from('agency_service_plans')
            .select('id,name,price,base_cost,is_active,is_default,is_archived,client_count,limits,features')
            .eq('tenant_id', agencyTenantId),
        100,
    );
    const tenantQuery = withOptionalLimit(
        client
            .from('tenants')
            .select('id,name,email,type,billing,subscription_plan,usage,updated_at')
            .eq('owner_tenant_id', agencyTenantId),
        100,
    );

    const [relationshipsResult, plansResult, ownedTenantsResult] = await Promise.all([
        safeAssistantRows(relationshipsQuery, 'agency_clients'),
        safeAssistantRows(plansQuery, 'agency_service_plans'),
        safeAssistantRows(tenantQuery, 'tenants'),
    ]);

    const ownedTenantsById = new Map(ownedTenantsResult.rows.map(row => [readString(row.id), row]));
    const plansById = new Map(plansResult.rows.map(row => [readString(row.id), row]));
    const relationshipClientIds = uniqueStringList(
        relationshipsResult.rows
            .map(row => readString(row.client_tenant_id))
            .filter((id): id is string => Boolean(id)),
    );
    let relationshipTenantRows: Record<string, unknown>[] = [];
    let relationshipTenantWarning: string | undefined;

    if (relationshipClientIds.length > 0) {
        const baseTenantQuery = client
            .from('tenants')
            .select('id,name,email,type,billing,subscription_plan,usage,updated_at');
        if (typeof baseTenantQuery.in === 'function') {
            const result = await safeAssistantRows(
                withOptionalLimit(baseTenantQuery.in('id', relationshipClientIds), 100),
                'tenants.by_relationship',
            );
            relationshipTenantRows = result.rows;
            relationshipTenantWarning = result.warning;
        }
    }

    relationshipTenantRows.forEach(row => {
        const id = readString(row.id);
        if (id) ownedTenantsById.set(id, row);
    });

    const relationshipsByClientId = new Map(
        relationshipsResult.rows.map(row => [readString(row.client_tenant_id), row]),
    );
    const clientIds = uniqueStringList([
        ...Array.from(ownedTenantsById.keys()).filter((id): id is string => Boolean(id)),
        ...relationshipClientIds,
    ]);
    const clients = clientIds.map(clientTenantId => {
        const tenant = asRecord(ownedTenantsById.get(clientTenantId));
        const relationship = asRecord(relationshipsByClientId.get(clientTenantId));
        const billing = asRecord(tenant.billing);
        const planId = readString(relationship.agency_plan_id) || readString(billing.agencyPlanId);
        const plan = asRecord(plansById.get(planId));
        return {
            clientTenantId,
            name: readDisplayText(tenant.name) || readDisplayText(billing.clientName) || clientTenantId,
            email: readString(tenant.email) || null,
            agencyPlanId: planId || null,
            agencyPlanName: readDisplayText(plan.name) || readDisplayText(billing.agencyPlanName) || null,
            billingMode: readString(relationship.billing_mode) || readString(billing.mode) || 'unknown',
            lifecycleStage: readString(relationship.lifecycle_stage) || readString(relationship.status) || readString(relationship.onboarding_status) || 'unknown',
            monthlyPrice: readNumber(billing.monthlyPrice) ?? readNumber(plan.price) ?? 0,
            projectCount: readNumber(asRecord(tenant.usage).projectCount) ?? readNumber(billing.projectCount) ?? 0,
            updatedAt: readString(relationship.updated_at) || readString(tenant.updated_at) || null,
        };
    });

    const activePlans = plansResult.rows.filter(plan => plan.is_archived !== true && plan.is_active !== false);
    const warnings = [
        relationshipsResult.warning,
        plansResult.warning,
        ownedTenantsResult.warning,
        relationshipTenantWarning,
    ].filter((warning): warning is string => Boolean(warning));

    return {
        agencyTenantId,
        clients,
        plans: plansResult.rows,
        activePlans,
        warnings,
        sourceTables: ['agency_clients', 'agency_service_plans', 'tenants'],
    };
};

const createSearchAgencyClientsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const query = normalizeForSearch(readString(input.query) || readString(input.request) || '');
        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const clients = query
            ? snapshot.clients.filter(client => normalizeForSearch([
                client.name,
                client.email,
                client.agencyPlanName,
                client.billingMode,
                client.lifecycleStage,
                client.clientTenantId,
            ].filter(Boolean).join(' ')).includes(query))
            : snapshot.clients;

        return {
            afterSnapshot: {
                agencyTenantId,
                query,
                clients: clients.slice(0, 25),
                totalMatches: clients.length,
                warnings: snapshot.warnings,
                sourceTables: snapshot.sourceTables,
            },
            diff: {
                searched: [`agency.clients.${agencyTenantId}`],
                mutatesData: false,
                totalMatches: clients.length,
            },
        };
    },
});

const createAgencyPerformanceSummaryHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const includeClients = readBoolean(input.includeClients) === true;
        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const totalMonthlyRevenue = snapshot.clients.reduce((sum, client) => sum + (readNumber(client.monthlyPrice) || 0), 0);
        const totalProjects = snapshot.clients.reduce((sum, client) => sum + (readNumber(client.projectCount) || 0), 0);
        const byBillingMode = snapshot.clients.reduce<Record<string, number>>((acc, client) => {
            const key = readString(client.billingMode) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const byLifecycleStage = snapshot.clients.reduce<Record<string, number>>((acc, client) => {
            const key = readString(client.lifecycleStage) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        return {
            afterSnapshot: {
                agencyTenantId,
                generatedAt: getNow(deps),
                summary: {
                    clientCount: snapshot.clients.length,
                    activePlanCount: snapshot.activePlans.length,
                    planCount: snapshot.plans.length,
                    totalMonthlyRevenue,
                    totalProjects,
                    averageRevenuePerClient: snapshot.clients.length > 0 ? totalMonthlyRevenue / snapshot.clients.length : 0,
                    byBillingMode,
                    byLifecycleStage,
                },
                clients: includeClients ? snapshot.clients.slice(0, 10) : [],
                warnings: snapshot.warnings,
                sourceTables: snapshot.sourceTables,
            },
            diff: {
                reported: [`agency.performance.${agencyTenantId}`],
                mutatesData: false,
                sourceTables: snapshot.sourceTables,
            },
        };
    },
});

const createAgencyReportHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const explicitClientIds = uniqueStringList([
            readString(input.clientTenantId),
            ...asArray(input.clientTenantIds).map(readString),
        ].filter((id): id is string => Boolean(id)));
        const selectedClientIds = explicitClientIds.length
            ? explicitClientIds
            : snapshot.clients.map(clientSnapshot => clientSnapshot.clientTenantId);
        const managedClientIds = new Set(snapshot.clients.map(clientSnapshot => clientSnapshot.clientTenantId));
        const unmanagedClientIds = selectedClientIds.filter(clientTenantId => !managedClientIds.has(clientTenantId));

        if (unmanagedClientIds.length > 0) {
            throw new Error('Agency reports can only include clients managed by the active agency tenant.');
        }

        const selectedClients = snapshot.clients.filter(clientSnapshot => selectedClientIds.includes(clientSnapshot.clientTenantId));
        const reportType = normalizeAgencyReportType(input.reportType);
        const now = getNow(deps);
        const periodEnd = readDate(input.periodEnd, dateOnlyFromIso(now));
        const periodStart = readDate(input.periodStart, addDaysToDateOnly(periodEnd, -30));
        const totalMonthlyRevenue = selectedClients.reduce((sum, clientSnapshot) => sum + (readNumber(clientSnapshot.monthlyPrice) || 0), 0);
        const totalProjects = selectedClients.reduce((sum, clientSnapshot) => sum + (readNumber(clientSnapshot.projectCount) || 0), 0);
        const byBillingMode = selectedClients.reduce<Record<string, number>>((acc, clientSnapshot) => {
            const key = readString(clientSnapshot.billingMode) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const byLifecycleStage = selectedClients.reduce<Record<string, number>>((acc, clientSnapshot) => {
            const key = readString(clientSnapshot.lifecycleStage) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const reportData = {
            source: 'global-assistant',
            actionId: action.id,
            taskId: action.taskId || null,
            reportType,
            period: { start: periodStart, end: periodEnd },
            metrics: {
                clientCount: selectedClients.length,
                totalMonthlyRevenue,
                totalProjects,
                averageRevenuePerClient: selectedClients.length > 0 ? totalMonthlyRevenue / selectedClients.length : 0,
                byBillingMode,
                byLifecycleStage,
            },
            clients: readBoolean(input.includeClients) === false ? [] : selectedClients,
            warnings: snapshot.warnings,
            sourceTables: [...snapshot.sourceTables, 'agency_reports', 'agency_activity'],
        };
        const aiSummary = `Agency ${reportType.replace(/_/g, ' ')} report prepared for ${selectedClients.length} client${selectedClients.length === 1 ? '' : 's'} from ${periodStart} to ${periodEnd}.`;
        const reportRow = await insertRow(client, 'agency_reports', {
            agency_tenant_id: agencyTenantId,
            client_tenant_id: selectedClientIds.length === 1 ? selectedClientIds[0] : null,
            report_type: reportType,
            period_start: periodStart,
            period_end: periodEnd,
            data: reportData,
            ai_summary: aiSummary,
            status: 'draft',
            generated_by: action.userId || context?.actor.userId || null,
            created_at: now,
        });
        const reportId = readString(asRecord(reportRow).id);
        const activityRow = await insertRow(client, 'agency_activity', {
            agency_tenant_id: agencyTenantId,
            client_tenant_id: selectedClientIds.length === 1 ? selectedClientIds[0] : null,
            type: 'report_generated',
            title: 'Agency report generated',
            description: aiSummary,
            metadata: {
                source: 'global-assistant',
                actionId: action.id,
                taskId: action.taskId || null,
                reportId: reportId || null,
                reportType,
                selectedClientIds,
                periodStart,
                periodEnd,
            },
            created_by: action.userId || context?.actor.userId || null,
            created_at: now,
        });

        return {
            afterSnapshot: {
                agencyTenantId,
                report: reportRow,
                activity: activityRow,
                summary: reportData.metrics,
                aiSummary,
                status: 'draft',
                sourceTables: reportData.sourceTables,
            },
            diff: {
                reported: [`agency.report.${agencyTenantId}.${reportId || reportType}`],
                inserted: {
                    agency_reports: reportId || null,
                    agency_activity: readString(asRecord(activityRow).id) || null,
                },
                selectedClientIds,
                mutatesData: true,
                sourceTables: reportData.sourceTables,
            },
        };
    },
    rollback: async (_input, { snapshot }) => {
        const client = getClient(deps);
        const after = asRecord(snapshot.afterSnapshot);
        const reportId = readString(asRecord(after.report).id);
        const activityId = readString(asRecord(after.activity).id);
        const rolledBack = [
            ...(activityId ? ['agency_activity'] : []),
            ...(reportId ? ['agency_reports'] : []),
        ];

        if (activityId) await deleteRowById(client, 'agency_activity', activityId);
        if (reportId) await deleteRowById(client, 'agency_reports', reportId);

        return {
            afterSnapshot: {
                deleted: {
                    agency_activity: activityId || null,
                    agency_reports: reportId || null,
                },
            },
            diff: {
                rolledBack,
            },
        };
    },
});

const createAgencyClientProvisioningHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: (input) => {
        const businessName = readString(input.businessName);
        const contactEmail = readString(input.contactEmail);
        const errors = [
            ...(!businessName ? ['businessName is required before creating an agency client.'] : []),
            ...(!contactEmail ? ['contactEmail is required before creating an agency client.'] : []),
            ...(contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? ['contactEmail must be a valid email address.'] : []),
        ];
        return {
            valid: errors.length === 0,
            errors,
        };
    },
    execute: async (input, { action, context }) => {
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const businessName = readString(input.businessName);
        const contactEmail = readString(input.contactEmail)?.toLowerCase();
        const contactPhone = readString(input.contactPhone);

        if (!businessName) throw new Error('businessName is required before creating an agency client.');
        if (!contactEmail) throw new Error('contactEmail is required before creating an agency client.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            throw new Error('contactEmail must be a valid email address.');
        }

        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const requestedPlanId = readString(input.selectedPlanId);
        const selectedPlan = requestedPlanId
            ? snapshot.activePlans.find(plan => readString(plan.id) === requestedPlanId)
            : snapshot.activePlans.find(plan => plan.is_default === true);

        if (requestedPlanId && !selectedPlan) {
            throw new Error('Agency client provisioning requires an active service plan owned by the active agency tenant.');
        }

        if (!selectedPlan) {
            throw new Error('Agency client provisioning requires selectedPlanId or an active default agency service plan.');
        }

        const selectedPlanId = readString(selectedPlan.id);
        const selectedPlanName = readDisplayText(selectedPlan.name);
        const monthlyPrice = readNumber(input.monthlyPrice) ?? readNumber(selectedPlan.price) ?? 0;
        const setupBilling = readBoolean(input.setupBilling) ?? monthlyPrice > 0;
        const enabledFeatures = uniqueStringList(
            asArray(input.enabledFeatures)
                .map(readString)
                .filter((value): value is string => Boolean(value)),
        );
        const initialUsers = asArray(input.initialUsers)
            .map(item => {
                const row = asRecord(item);
                const email = readString(row.email)?.toLowerCase();
                if (!email) return null;
                const role = readString(row.role);
                const safeRole = ['client', 'client_admin', 'client_user'].includes(role || '') ? role as string : 'client_admin';
                return {
                    email,
                    name: readDisplayText(row.name) || businessName,
                    role: safeRole,
                };
            })
            .filter((item): item is { email: string; name: string; role: string } => Boolean(item));
        const usersForInvite = initialUsers.length > 0
            ? initialUsers
            : [{ email: contactEmail, name: businessName, role: 'client_admin' }];
        const provisionBody = {
            action: 'autoProvision',
            agencyTenantId,
            businessName,
            industry: readString(input.industry) || 'other',
            contactEmail,
            ...(contactPhone ? { contactPhone } : {}),
            projectTemplate: readString(input.projectTemplate) || 'default',
            enabledFeatures: enabledFeatures.length > 0 ? enabledFeatures : ['cms', 'leads'],
            initialUsers: usersForInvite,
            selectedPlanId,
            selectedPlanName,
            setupBilling,
            monthlyPrice,
            aiStudioMode: readString(input.aiStudioMode) || 'draft',
            ...(readString(input.logoUrl) ? { logoUrl: readString(input.logoUrl) } : {}),
            primaryColor: readString(input.primaryColor) || '#3B82F6',
            secondaryColor: readString(input.secondaryColor) || '#10B981',
            generateWebsite: readBoolean(input.generateWebsite) ?? true,
            generateStorefront: readBoolean(input.generateStorefront) ?? false,
            generateEcommerce: readBoolean(input.generateEcommerce) ?? false,
            generateChatbot: readBoolean(input.generateChatbot) ?? true,
            generateEmailFlows: readBoolean(input.generateEmailFlows) ?? false,
            generateAppointments: readBoolean(input.generateAppointments) ?? false,
            generateRestaurantModule: readBoolean(input.generateRestaurantModule) ?? false,
            generateRealtyModule: readBoolean(input.generateRealtyModule) ?? false,
            generateBioPage: readBoolean(input.generateBioPage) ?? false,
            generateMediaAssets: readBoolean(input.generateMediaAssets) ?? true,
            metadata: {
                ...asRecord(input.metadata),
                source: 'global-assistant',
                actionId: action.id,
                taskId: action.taskId || null,
            },
        };

        const provisionResponse = asRecord(await invokeFunction(deps, 'onboarding-api', provisionBody));
        if (provisionResponse.success !== true) {
            throw new Error(readString(provisionResponse.message) || 'Agency client provisioning did not complete.');
        }

        const clientTenantId = readString(provisionResponse.clientTenantId);
        const projectId = readString(provisionResponse.projectId);
        const sourceTables = [
            ...snapshot.sourceTables,
            'onboarding-api',
            'projects',
            'tenant_modules',
            'project_modules',
            'tenant_invites',
            'agency_activity',
        ];

        return {
            afterSnapshot: {
                agencyTenantId,
                clientTenantId: clientTenantId || null,
                projectId: projectId || null,
                selectedPlan: {
                    id: selectedPlanId,
                    name: selectedPlanName || null,
                    monthlyPrice,
                    setupBilling,
                },
                provisioning: provisionResponse,
                sourceTables,
            },
            diff: {
                created: [
                    ...(clientTenantId ? [`tenant.${clientTenantId}`] : ['tenant.$pending']),
                    ...(projectId ? [`project.${projectId}`] : ['project.$pending']),
                    'agency_clients.relationship',
                    'businessBlueprint.draft',
                    'moduleActivations.prepared',
                    'agency_activity.client_created',
                ],
                clientTenantId: clientTenantId || null,
                projectId: projectId || null,
                selectedPlanId,
                mutatesData: true,
                reviewRequired: true,
                businessBlueprintCreated: Boolean(asRecord(provisionResponse.provisioningSummary).businessBlueprintCreated),
                moduleActivationsPrepared: Boolean(asRecord(provisionResponse.provisioningSummary).moduleActivationsPrepared),
                billingMode: readString(asRecord(provisionResponse.provisioningSummary).billingMode) || (setupBilling ? 'agency_managed' : 'included_in_parent'),
                invitesSent: readNumber(provisionResponse.invitesSent) ?? usersForInvite.length,
                sourceTables,
            },
        };
    },
});

const createAgencyProjectTransferHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: (input) => {
        const projectId = readString(input.projectId) || readString(input.sourceProjectId);
        const targetClientTenantId = readString(input.targetClientTenantId) || readString(input.clientTenantId);
        const errors = [
            ...(!projectId ? ['projectId is required before transferring an agency project.'] : []),
            ...(!targetClientTenantId ? ['targetClientTenantId is required before transferring an agency project.'] : []),
        ];
        return {
            valid: errors.length === 0,
            errors,
        };
    },
    execute: async (input, { action, context }) => {
        const agencyTenantId = readAgencyTenantId(input, action, context);
        const sourceProjectId = readString(input.projectId) || readString(input.sourceProjectId);
        const targetClientTenantId = readString(input.targetClientTenantId) || readString(input.clientTenantId);
        const projectName = readString(input.projectName);

        if (!sourceProjectId) throw new Error('projectId is required before transferring an agency project.');
        if (!targetClientTenantId) throw new Error('targetClientTenantId is required before transferring an agency project.');

        const snapshot = await readAgencyClientsSnapshot(deps, agencyTenantId);
        const managedClient = snapshot.clients.find(clientSnapshot => clientSnapshot.clientTenantId === targetClientTenantId);
        if (!managedClient) {
            throw new Error('Agency Project Transfer can only target clients managed by the active agency tenant.');
        }

        const transferResponse = asRecord(await invokeFunction(deps, 'onboarding-api', {
            action: 'transferProject',
            sourceTenantId: agencyTenantId,
            targetClientTenantId,
            projectId: sourceProjectId,
            ...(projectName ? { projectName } : {}),
            metadata: {
                ...asRecord(input.metadata),
                source: 'global-assistant',
                actionId: action.id,
                taskId: action.taskId || null,
            },
        }));

        if (transferResponse.success !== true) {
            throw new Error(readString(transferResponse.message) || 'Agency project transfer did not complete.');
        }

        const newProjectId = readString(transferResponse.newProjectId);
        const sourceTables = [...snapshot.sourceTables, 'onboarding-api', 'agency_project_transfers', 'agency_client_approvals', 'agency_activity'];

        return {
            afterSnapshot: {
                agencyTenantId,
                client: managedClient,
                transfer: transferResponse,
                sourceTables,
            },
            diff: {
                transferred: [`agency.projectTransfer.${sourceProjectId}.${targetClientTenantId}`],
                sourceProjectId,
                targetClientTenantId,
                newProjectId: newProjectId || null,
                mutatesData: true,
                reviewRequired: true,
                copiedAsDraft: true,
                approvalRequested: Boolean(asRecord(transferResponse.transferSummary).approvalRequested),
                sourceTables,
            },
        };
    },
});

type ProjectMetadataUpdateDraft = {
    name?: string;
    status?: 'Published' | 'Draft' | 'Template';
    description?: string;
    category?: string;
    tags?: string[];
};

const PROJECT_SEARCH_STOP_WORDS = new Set([
    'abre',
    'abrir',
    'busca',
    'buscar',
    'cambia',
    'cambiar',
    'encuentra',
    'find',
    'open',
    'project',
    'projects',
    'proyecto',
    'proyectos',
    'search',
    'switch',
]);

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(record, key);

const cleanInferredProjectValue = (value: string | undefined): string | undefined => {
    const text = titleFromRequest(value, '')
        .replace(/^["'“”]+/, '')
        .replace(/["'“”.,;:]+$/, '')
        .trim();
    return text || undefined;
};

const inferProjectNameFromRequest = (request: unknown): string | undefined => {
    const text = readString(request);
    if (!text) return undefined;

    const patterns = [
        /(?:renombra|renombrar|rename)\s+(?:el\s+)?(?:proyecto|project)?\s*(?:a|to)\s+(.+)$/i,
        /(?:cambia|cambiar|change)\s+(?:el\s+)?nombre(?:\s+del\s+proyecto|\s+project)?\s+(?:a|to)\s+(.+)$/i,
        /(?:nombre\s+del\s+proyecto|project\s+name)\s*(?:a|to|=|:)\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        const next = cleanInferredProjectValue(match?.[1]);
        if (next) return next;
    }
    return undefined;
};

const normalizeProjectStatus = (value: unknown): ProjectMetadataUpdateDraft['status'] => {
    const text = normalizeForSearch(readString(value) || '');
    if (!text) return undefined;
    if (['published', 'publish', 'publicado', 'publicada', 'publicar', 'live'].includes(text)) return 'Published';
    if (['draft', 'borrador', 'privado', 'privada'].includes(text)) return 'Draft';
    if (['template', 'plantilla'].includes(text)) return 'Template';
    return undefined;
};

const readProjectTags = (value: unknown): string[] | undefined => {
    if (Array.isArray(value)) return uniqueStringList(readStringList(value));
    const text = readString(value);
    if (!text) return undefined;
    return uniqueStringList(text.split(/[,;\n]/).map(tag => tag.trim()).filter(Boolean));
};

const deriveProjectMetadataUpdateDraft = (input: Record<string, unknown>): ProjectMetadataUpdateDraft => {
    const updates = asRecord(input.updates);
    const draft: ProjectMetadataUpdateDraft = {};

    const name = readDisplayText(input.name) || readDisplayText(updates.name) || inferProjectNameFromRequest(input.request);
    if (name) draft.name = name;

    const status = normalizeProjectStatus(input.status) || normalizeProjectStatus(updates.status);
    if (status) draft.status = status;

    const description = readDisplayText(input.description) || readDisplayText(updates.description);
    if (description) draft.description = description;

    const category = readDisplayText(input.category) || readDisplayText(updates.category);
    if (category) draft.category = category;

    const tagsSource = hasOwn(input, 'tags') ? input.tags : hasOwn(updates, 'tags') ? updates.tags : undefined;
    const tags = readProjectTags(tagsSource);
    if (tags) draft.tags = tags;

    return draft;
};

const cloneProjectMetadataColumns = (row: Record<string, unknown>): Record<string, unknown> => {
    const snapshot: Record<string, unknown> = {};
    ['name', 'status', 'description', 'category', 'tags', 'data', 'last_updated', 'updated_at', 'thumbnail_url'].forEach(key => {
        if (hasOwn(row, key)) snapshot[key] = cloneValue(row[key]);
    });
    return snapshot;
};

const readProjectTenantId = (row: Record<string, unknown>): string | undefined =>
    readString(row.tenant_id) || readString(row.tenantId);

const readProjectUserId = (row: Record<string, unknown>): string | undefined =>
    readString(row.user_id) || readString(row.userId);

const assertProjectRowInAssistantScope = (
    row: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
) => {
    const rowTenantId = readProjectTenantId(row);
    const contextTenantId = getTenantId(action, context);
    const isSuperAdmin = context?.actor.isSuperAdmin || context?.actor.mode === 'super_admin';
    if (rowTenantId && contextTenantId && rowTenantId !== contextTenantId && !isSuperAdmin) {
        throw new Error(`Project ${readString(row.id) || 'unknown'} is outside the active tenant/workspace scope.`);
    }

    const rowUserId = readProjectUserId(row);
    const contextUserId = action.userId || context?.actor.userId || null;
    if (!rowTenantId && rowUserId && contextUserId && rowUserId !== contextUserId && !isSuperAdmin) {
        throw new Error(`Project ${readString(row.id) || 'unknown'} is outside the active user scope.`);
    }
};

const loadProjectRowForAssistantScope = async (
    client: SupabaseClientLike,
    projectId: string,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
    purpose = 'assistant project action',
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('projects').select('*').eq('id', projectId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) throw new Error(`Project ${projectId} was not found before ${purpose}.`);
    assertProjectRowInAssistantScope(row, action, context);
    return cloneRecord(row);
};

const loadProjectMetadataRow = async (
    client: SupabaseClientLike,
    projectId: string,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Promise<Record<string, unknown>> =>
    loadProjectRowForAssistantScope(client, projectId, action, context, 'updating metadata');

const valuesDiffer = (left: unknown, right: unknown): boolean =>
    JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);

const deriveProjectMetadataPatch = (
    draft: ProjectMetadataUpdateDraft,
    currentRow: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedKeys: string[] } => {
    const currentData = cloneRecord(asRecord(currentRow.data));
    const nextData = cloneRecord(currentData);
    const patch: Record<string, unknown> = {};
    const changedKeys: string[] = [];

    const applyValue = (key: keyof ProjectMetadataUpdateDraft, columnKey: string, value: unknown, currentValue: unknown) => {
        if (value === undefined || !valuesDiffer(currentValue, value)) return;
        patch[columnKey] = value;
        nextData[key] = cloneValue(value);
        changedKeys.push(String(key));
    };

    applyValue('name', 'name', draft.name, readDisplayText(currentRow.name) || readDisplayText(currentData.name));
    applyValue('status', 'status', draft.status, normalizeProjectStatus(currentRow.status) || normalizeProjectStatus(currentData.status));
    applyValue('description', 'description', draft.description, readDisplayText(currentRow.description) || readDisplayText(currentData.description));
    applyValue('category', 'category', draft.category, readDisplayText(currentRow.category) || readDisplayText(currentData.category));
    applyValue('tags', 'tags', draft.tags, readProjectTags(currentRow.tags) || readProjectTags(currentData.tags) || []);

    if (changedKeys.length === 0) return { patch: {}, changedKeys };

    nextData.lastUpdated = now;
    nextData.assistantDrafts = {
        ...asRecord(nextData.assistantDrafts),
        projectMetadata: {
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            changedKeys,
            updatedAt: now,
            metadata: buildBaseMetadata(input, action, context),
        },
    };

    patch.data = nextData;
    patch.last_updated = now;
    return { patch, changedKeys };
};

const createProjectMetadataBeforeSnapshot = (
    projectId: string,
    row: Record<string, unknown>,
): Record<string, unknown> => ({
    table: 'projects',
    id: projectId,
    projectId,
    row: cloneProjectMetadataColumns(row),
});

const rollbackProjectMetadataColumns = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const projectId = readString(before.projectId) || readString(before.id);
    const row = asRecord(before.row);
    if (!projectId || !Object.keys(row).length) {
        throw new Error('Cannot rollback project metadata: previous project metadata snapshot was not recorded.');
    }
    const result = await selectSingle(getClient(deps).from('projects').update(row).eq('id', projectId));
    if (result?.error) throw result.error;
    const restored = asRecord(result?.data);
    if (!readString(restored.id)) throw new Error(`Project ${projectId} metadata could not be restored.`);

    return {
        afterSnapshot: {
            table: 'projects',
            id: projectId,
            projectId,
            row: restored,
            restored: true,
        },
        diff: {
            restored: [`projects.${projectId}.metadata`],
        },
    };
};

const normalizeProjectSearchQuery = (input: Record<string, unknown>): string => (
    readString(input.query)
    || readString(input.search)
    || readString(input.request)
    || ''
);

const projectSearchTerms = (query: string): string[] =>
    normalizeForSearch(query)
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length > 1 && !PROJECT_SEARCH_STOP_WORDS.has(term));

const projectRowSearchText = (row: Record<string, unknown>): string => {
    const data = asRecord(row.data);
    return normalizeForSearch([
        readString(row.id),
        readDisplayText(row.name),
        readString(row.status),
        readDisplayText(row.description) || readDisplayText(data.description),
        readDisplayText(row.category) || readDisplayText(data.category),
        ...readStringList(row.tags),
        ...readStringList(data.tags),
    ].filter(Boolean).join(' '));
};

const projectRowSearchScore = (row: Record<string, unknown>, terms: string[]): number => {
    if (terms.length === 0) return 1;
    const haystack = projectRowSearchText(row);
    return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
};

const readProjectRowsForSearch = async (
    client: SupabaseClientLike,
    context?: AssistantContextSnapshot,
): Promise<Record<string, unknown>[]> => {
    const snapshotProjects = asArray(context?.snapshot?.availableProjects)
        .map(project => asRecord(project))
        .filter(project => readString(project.id));
    if (snapshotProjects.length > 0) return snapshotProjects.map(project => cloneRecord(project));

    let builder = client.from('projects').select('*');
    if (context?.tenant.tenantId) {
        builder = builder.eq('tenant_id', context.tenant.tenantId);
    } else if (context?.actor.userId) {
        builder = builder.eq('user_id', context.actor.userId);
    }
    const result = await builder;
    if (result?.error) throw result.error;
    return asArray(result?.data).map(row => cloneRecord(asRecord(row))).filter(row => readString(row.id));
};

const projectSearchMatch = (row: Record<string, unknown>): Record<string, unknown> => {
    const data = asRecord(row.data);
    return {
        id: readString(row.id),
        name: readDisplayText(row.name) || readDisplayText(data.name) || readString(row.id),
        status: readString(row.status) || readString(data.status) || null,
        tenantId: readProjectTenantId(row) || null,
        userId: readProjectUserId(row) || null,
        description: readDisplayText(row.description) || readDisplayText(data.description) || null,
        category: readDisplayText(row.category) || readDisplayText(data.category) || null,
        tags: readProjectTags(row.tags) || readProjectTags(data.tags) || [],
        thumbnailUrl: readString(row.thumbnail_url) || readString(row.thumbnailUrl) || null,
        lastUpdated: readString(row.last_updated) || readString(row.lastUpdated) || null,
    };
};

const createSearchProjectsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const query = normalizeProjectSearchQuery(input);
        const terms = projectSearchTerms(query);
        const rows = await readProjectRowsForSearch(client, context);
        const matches = rows
            .map(row => ({ row, score: projectRowSearchScore(row, terms) }))
            .filter(entry => terms.length === 0 || entry.score > 0)
            .sort((left, right) => right.score - left.score || String(readDisplayText(left.row.name) || '').localeCompare(String(readDisplayText(right.row.name) || '')))
            .slice(0, 12)
            .map(entry => projectSearchMatch(entry.row));

        return {
            afterSnapshot: {
                kind: 'project_search',
                query,
                tenantId: context?.tenant.tenantId || null,
                userId: context?.actor.userId || null,
                matchCount: matches.length,
                matches,
                source: asArray(context?.snapshot?.availableProjects).length > 0 ? 'context_snapshot' : 'supabase.projects',
            },
            diff: {
                searched: ['projects'],
                mutatesData: false,
                actionType: action.actionType,
            },
        };
    },
});

const normalizeModuleFilter = (value: unknown): string =>
    normalizeForSearch(readDisplayText(value) || '')
        .replace(/[^a-z0-9]+/g, '')
        .trim();

const moduleMatchesCapabilityFilter = (
    moduleRecord: Record<string, unknown>,
    normalizedFilter: string,
): boolean => {
    if (!normalizedFilter) return true;
    const candidates = [
        readString(moduleRecord.module),
        readDisplayText(moduleRecord.label),
        ...readStringList(moduleRecord.actionTypes),
        ...readStringList(moduleRecord.executableActionTypes),
    ].map(item => normalizeModuleFilter(item));

    return candidates.some(candidate => candidate === normalizedFilter || candidate.includes(normalizedFilter));
};

const CAPABILITY_MODULE_ALIASES: Partial<Record<AssistantModuleTarget, string[]>> = {
    aiStudio: ['ai studio', 'studio', 'generador inicial'],
    businessBlueprint: ['business blueprint', 'blueprint', 'plan de negocio'],
    website: ['website builder', 'website', 'sitio web', 'pagina web', 'web builder'],
    storefront: ['storefront builder', 'storefront', 'catalogo', 'tienda publica'],
    ecommerce: ['ecommerce', 'e-commerce', 'commerce', 'checkout', 'orders', 'ordenes', 'productos'],
    media: ['media ai', 'media', 'imagenes', 'videos', 'assets'],
    appointments: ['appointments', 'citas', 'reservas', 'agenda'],
    restaurants: ['restaurants', 'restaurantes', 'menu', 'reservaciones'],
    realEstate: ['realty', 'real estate', 'inmobiliaria', 'propiedades', 'listings'],
    bioPage: ['bio page', 'bio pages', 'biopage', 'link in bio'],
    crm: ['crm', 'leads', 'contactos', 'pipeline'],
    emailMarketing: ['email marketing', 'email', 'emails', 'campanas', 'campañas', 'audiencias'],
    chatbot: ['chatcore', 'chat core', 'chatbot', 'ai assistant project', 'asistente del proyecto'],
    analytics: ['analytics', 'analitica', 'analítica', 'metricas', 'métricas'],
    finance: ['finance', 'finanzas', 'facturas', 'invoices', 'accounting'],
    admin: ['admin', 'super admin', 'owner mode', 'modo owner'],
    settings: ['settings', 'configuracion', 'configuración'],
    project: ['project', 'proyecto', 'workspace command center'],
    tenant: ['tenant', 'workspace', 'agencia'],
    user: ['user', 'usuario', 'profile'],
    designSystem: ['design system', 'design star', 'sistema de diseno', 'sistema de diseño'],
};

const buildCapabilityModuleTerms = (moduleRecord: Record<string, unknown>): string[] => {
    const moduleName = readString(moduleRecord.module) as AssistantModuleTarget | undefined;
    return uniqueStringList([
        readString(moduleRecord.module),
        readDisplayText(moduleRecord.label),
        ...(moduleName ? CAPABILITY_MODULE_ALIASES[moduleName] || [] : []),
    ].filter((item): item is string => Boolean(item)));
};

const inferCapabilityModuleFilter = (
    input: Record<string, unknown>,
    rawModules: Record<string, unknown>[],
): string => {
    const explicitFilter = normalizeModuleFilter(input.module || input.targetModule || input.moduleTarget);
    if (explicitFilter) return explicitFilter;

    const request = readString(input.request);
    if (!request) return '';
    const compactRequest = normalizeModuleFilter(request);
    if (!compactRequest) return '';

    const matches = rawModules
        .map(module => {
            const moduleName = readString(module.module);
            if (!moduleName) return '';
            const matched = buildCapabilityModuleTerms(module).some(term => {
                const normalizedTerm = normalizeModuleFilter(term);
                return normalizedTerm.length >= 3 && compactRequest.includes(normalizedTerm);
            });
            return matched ? normalizeModuleFilter(moduleName) : '';
        })
        .filter(Boolean);
    const uniqueMatches = uniqueStringList(matches);

    return uniqueMatches.length === 1 ? uniqueMatches[0] : '';
};

const buildAgencyEngineOperatingLayerSnapshot = (
    moduleSummaries: Record<string, unknown>[],
    selectedActions: Record<string, unknown>[],
) => {
    const manifest = getAgencyEngineOperatingSystemManifest();
    const agencyActions = selectedActions.filter(action => readString(action.module) === 'agency');
    const agencyModuleSummary = moduleSummaries.find(module => readString(module.module) === 'agency') || null;
    const missingModuleIds = manifest.moduleIds.filter(moduleId => !getModuleRegistryItem(moduleId));

    return {
        id: manifest.id,
        label: manifest.label,
        requiredService: manifest.requiredService,
        requiredFeature: String(manifest.requiredFeature),
        foundationalSystems: manifest.foundationalSystems,
        moduleIds: manifest.moduleIds,
        serviceAccessModuleIds: manifest.serviceAccessModuleIds,
        aiPoweredModuleIds: manifest.aiPoweredModuleIds,
        globalAssistantModuleIds: manifest.globalAssistantModuleIds,
        missingModuleIds,
        summary: {
            surfaceCount: manifest.operatingSurfaces.length,
            serviceAccessSurfaceCount: manifest.operatingSurfaces
                .filter(surface => manifest.serviceAccessModuleIds.includes(surface.moduleId))
                .length,
            aiPoweredSurfaceCount: manifest.operatingSurfaces.filter(surface => surface.aiPowered).length,
            globalAssistantSurfaceCount: manifest.operatingSurfaces.filter(surface => surface.globalAssistantEnabled).length,
            catalogActionCount: agencyActions.length,
            executableActionCount: agencyActions.filter(action => action.executable === true).length,
            missingModuleCount: missingModuleIds.length,
        },
        operatingSurfaces: manifest.operatingSurfaces.map(surface => {
            const registryItem = getModuleRegistryItem(surface.moduleId);
            return {
                id: surface.id,
                moduleId: surface.moduleId,
                label: surface.label,
                role: surface.role,
                requiredPermission: surface.requiredPermission || null,
                requiredService: registryItem?.requiredService || manifest.requiredService,
                requiredFeature: registryItem?.requiredFeature ? String(registryItem.requiredFeature) : null,
                serviceAccessGated: manifest.serviceAccessModuleIds.includes(surface.moduleId),
                aiPowered: surface.aiPowered,
                globalAssistantEnabled: surface.globalAssistantEnabled,
                requiredSystems: surface.requiredSystems,
                registered: Boolean(registryItem),
                route: registryItem?.route || null,
            };
        }),
        catalog: {
            module: agencyModuleSummary,
            actionTypes: agencyActions
                .map(action => readString(action.actionType))
                .filter((actionType): actionType is string => Boolean(actionType)),
            executableActionTypes: agencyActions
                .filter(action => action.executable === true)
                .map(action => readString(action.actionType))
                .filter((actionType): actionType is string => Boolean(actionType)),
            unavailableActionTypes: agencyActions
                .filter(action => action.availableInContext === false)
                .map(action => readString(action.actionType))
                .filter((actionType): actionType is string => Boolean(actionType)),
        },
    };
};

const createOperatingLayerCapabilitySummaryHandler = (): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { context }) => {
        const catalog = asRecord(context?.snapshot?.toolCatalog);
        const rawModules = asArray(catalog.modules).map(asRecord);
        const rawActions = asArray(catalog.actions).map(asRecord);
        const assistantSurfaceMap = asRecord(context?.snapshot?.assistantSurfaces);
        const assistantSurfaces = asArray(assistantSurfaceMap.surfaces).map(asRecord);
        const generatedAt = readString(catalog.generatedAt) || new Date().toISOString();
        const normalizedFilter = inferCapabilityModuleFilter(input, rawModules);
        const includeUnavailable = readBoolean(input.includeUnavailable) ?? true;
        const includeActions = readBoolean(input.includeActions) ?? true;
        const filteredModules = rawModules.filter(module => moduleMatchesCapabilityFilter(module, normalizedFilter));
        const selectedModuleNames = new Set(filteredModules.map(module => readString(module.module)).filter((item): item is string => Boolean(item)));
        const selectedActions = rawActions.filter(candidate => {
            const moduleName = readString(candidate.module);
            if (normalizedFilter && selectedModuleNames.size === 0) return false;
            if (selectedModuleNames.size > 0 && moduleName && !selectedModuleNames.has(moduleName)) return false;
            if (!includeUnavailable && candidate.availableInContext === false) return false;
            return true;
        });
        const blockedBy = uniqueStringList(selectedActions.flatMap(candidate =>
            readStringList(candidate.blockedBy),
        ));
        const blockedServices = blockedBy
            .filter(item => item.startsWith('service:'))
            .map(item => item.replace(/^service:/, ''));
        const blockedFeatures = blockedBy
            .filter(item => item.startsWith('feature:'))
            .map(item => item.replace(/^feature:/, ''));
        const moduleSummaries = filteredModules.map(module => {
            const actionTypes = readStringList(module.actionTypes);
            const executableActionTypes = readStringList(module.executableActionTypes);
            const unavailableActionTypes = readStringList(module.unavailableActionTypes);

            return {
                module: readString(module.module) || 'unknown',
                actionCount: readNumber(module.actionCount) ?? actionTypes.length,
                executableActionCount: readNumber(module.executableActionCount) ?? executableActionTypes.length,
                previewActionCount: readNumber(module.previewActionCount) ?? 0,
                rollbackActionCount: readNumber(module.rollbackActionCount) ?? 0,
                rollbackExecutableActionCount: readNumber(module.rollbackExecutableActionCount) ?? 0,
                rollbackGapActionCount: readNumber(module.rollbackGapActionCount) ?? 0,
                safeNavigationActionCount: readNumber(module.safeNavigationActionCount) ?? 0,
                highRiskActionCount: readNumber(module.highRiskActionCount) ?? 0,
                unavailableActionCount: unavailableActionTypes.length,
                serviceIds: readStringList(module.serviceIds),
                featureFlags: readStringList(module.featureFlags),
                ...(includeActions
                    ? {
                        actionTypes: actionTypes.slice(0, 12),
                        executableActionTypes: executableActionTypes.slice(0, 12),
                        unavailableActionTypes: includeUnavailable ? unavailableActionTypes.slice(0, 12) : [],
                    }
                    : {}),
            };
        });
        const availableActionCount = selectedActions.filter(candidate => candidate.availableInContext !== false).length;
        const executableActionCount = selectedActions.filter(candidate => candidate.executable === true).length;
        const previewActionCount = selectedActions.filter(candidate => candidate.previewSupported === true).length;
        const rollbackActionCount = selectedActions.filter(candidate => candidate.rollbackSupported === true).length;
        const rollbackExecutableActionCount = selectedActions.filter(candidate =>
            candidate.rollbackSupported === true && candidate.rollbackExecutable === true,
        ).length;
        const rollbackGapActions = selectedActions.filter(candidate =>
            candidate.rollbackSupported === true && candidate.rollbackExecutable !== true,
        );
        const rollbackGapActionTypes = rollbackGapActions
            .map(candidate => readString(candidate.actionType))
            .filter((item): item is string => Boolean(item));
        const confirmationActionCount = selectedActions.filter(candidate => candidate.requiresConfirmation === true).length;
        const highRiskActionCount = selectedActions.filter(candidate => ['high', 'critical'].includes(readString(candidate.safetyLevel) || '')).length;
        const safeNavigationActionCount = selectedActions.filter(candidate => candidate.safeNavigation === true).length;
        const unavailableActionCount = selectedActions.filter(candidate => candidate.availableInContext === false).length;
        const catalogMissing = rawModules.length === 0 || rawActions.length === 0;
        const useCatalogTotals = !normalizedFilter && includeUnavailable && rawActions.length > 0 && selectedActions.length === rawActions.length;

        const afterSnapshot = {
            kind: 'operating_layer_capability_summary',
            generatedAt,
            catalogAvailable: !catalogMissing,
            requestedModule: normalizedFilter || null,
            context: {
                mode: context?.actor.mode || 'user',
                userId: context?.actor.userId || null,
                tenantId: context?.tenant.tenantId || null,
                tenantRole: context?.tenant.role || null,
                projectId: context?.project.projectId || null,
                activeModule: context?.activeModule || null,
                activeServices: context?.tenant.activeServices || [],
                featureFlags: context?.tenant.featureFlags || [],
            },
            summary: {
                moduleCount: moduleSummaries.length,
                catalogModuleCount: rawModules.length,
                actionCount: useCatalogTotals
                    ? readNumber(catalog.actionCount) ?? selectedActions.length
                    : selectedActions.length,
                availableActionCount,
                unavailableActionCount,
                executableActionCount: useCatalogTotals
                    ? readNumber(catalog.executableActionCount) ?? executableActionCount
                    : executableActionCount,
                previewActionCount,
                rollbackActionCount,
                rollbackExecutableActionCount: useCatalogTotals
                    ? readNumber(catalog.rollbackExecutableActionCount) ?? rollbackExecutableActionCount
                    : rollbackExecutableActionCount,
                rollbackGapActionCount: useCatalogTotals
                    ? readNumber(catalog.rollbackGapActionCount) ?? rollbackGapActions.length
                    : rollbackGapActions.length,
                rollbackGapActionTypes: rollbackGapActionTypes.slice(0, 12),
                confirmationActionCount,
                highRiskActionCount,
                safeNavigationActionCount,
                blockedServiceCount: blockedServices.length,
                blockedFeatureCount: blockedFeatures.length,
            },
            modules: moduleSummaries,
            agencyEngine: buildAgencyEngineOperatingLayerSnapshot(moduleSummaries, selectedActions),
            blockedBy: {
                services: blockedServices,
                features: blockedFeatures,
                raw: blockedBy,
            },
            assistantSurfaces: {
                currentSurfaceId: readString(assistantSurfaceMap.currentSurfaceId) || null,
                surfaceCount: readNumber(assistantSurfaceMap.surfaceCount) ?? assistantSurfaces.length,
                globalActionSurfaceId: readString(assistantSurfaceMap.globalActionSurfaceId) || 'global-operating-layer',
                surfaces: assistantSurfaces.map(surface => ({
                    id: readString(surface.id) || 'unknown',
                    label: readString(surface.label) || 'Unknown assistant surface',
                    kind: readString(surface.kind) || 'unknown',
                    module: readString(surface.module) || 'project',
                    canGuideGlobalActions: surface.canGuideGlobalActions === true,
                    canExecuteGlobalActions: surface.canExecuteGlobalActions === true,
                    canMutateProjectData: surface.canMutateProjectData === true,
                    executionBoundary: readString(surface.executionBoundary) || 'module_local',
                    memoryScope: readString(surface.memoryScope) || 'unknown',
                    guardrail: readString(surface.guardrail) || '',
                })),
                guardrails: readStringList(assistantSurfaceMap.guardrails),
            },
            guardrails: [
                'Read-only capability summaries never mutate project, tenant, or admin data.',
                'Mutating actions stay preview-first and require confirmation when safety metadata is high or critical.',
                'Unavailable actions are marked by required service and feature flag gates.',
                'Admin actions remain restricted to Owner, Super Admin, or system modes.',
                'Rollback support is exposed per action and executable rollback is counted only when the handler implements rollback.',
            ],
            recommendations: catalogMissing
                ? ['Resolve the dashboard Operating Layer context with toolCatalog before answering capability requests.']
                : rollbackGapActions.length > 0
                    ? ['Add rollback handlers before presenting rollback-gapped actions as fully reversible.']
                : unavailableActionCount > 0
                    ? ['Enable missing services or feature flags before offering blocked module actions.']
                    : ['The current Operating Layer tool catalog has no service or feature blockers in the selected scope.'],
        };

        return {
            afterSnapshot,
            diff: {
                analyzed: ['assistant.toolCatalog'],
                mutatesData: false,
                moduleCount: moduleSummaries.length,
                actionCount: selectedActions.length,
                unavailableActionCount,
            },
        };
    },
});

type BusinessBlueprintSummaryConfig = {
    key: keyof BusinessBlueprint;
    module: AssistantModuleTarget;
    label: string;
    countKeys: string[];
};

const BUSINESS_BLUEPRINT_SUMMARY_MODULES: BusinessBlueprintSummaryConfig[] = [
    { key: 'businessProfile', module: 'businessBlueprint', label: 'Business profile', countKeys: ['services', 'goals', 'contactInfo'] },
    { key: 'brandProfile', module: 'designSystem', label: 'Brand profile', countKeys: ['colors', 'fonts', 'colorCandidates'] },
    { key: 'websiteBlueprint', module: 'website', label: 'Website Builder', countKeys: ['pages', 'sections', 'sectionBlueprints', 'ecommerceBlocks', 'leadForms'] },
    { key: 'storefrontBlueprint', module: 'storefront', label: 'Storefront Builder', countKeys: ['sections', 'templates', 'themeFallbackChain'] },
    { key: 'ecommerceBlueprint', module: 'ecommerce', label: 'Ecommerce', countKeys: ['categories', 'productCategories', 'starterProducts', 'discounts', 'recommendations'] },
    { key: 'chatbotBlueprint', module: 'chatbot', label: 'ChatCore', countKeys: ['knowledgeSources', 'actions', 'businessKnowledge', 'productKnowledge', 'policyKnowledge', 'eventIntents'] },
    { key: 'leadBlueprint', module: 'crm', label: 'CRM/Leads', countKeys: ['leadSources', 'leadTags', 'activityTimelineEvents'] },
    { key: 'emailMarketingBlueprint', module: 'emailMarketing', label: 'Email Marketing', countKeys: ['audiences', 'campaigns', 'automations', 'transactionalFlows', 'flows', 'logEvents'] },
    { key: 'mediaBlueprint', module: 'media', label: 'Media AI', countKeys: ['imageNeeds', 'videoNeeds', 'brandAssetNeeds'] },
    { key: 'bioPageBlueprint', module: 'bioPage', label: 'Bio Page', countKeys: ['blocks', 'links', 'socialLinks', 'integrations'] },
    { key: 'appointmentsBlueprint', module: 'appointments', label: 'Appointments', countKeys: ['serviceTypes', 'paidBookingTypes', 'services', 'websiteBuilderBlocks'] },
    { key: 'restaurantBlueprint', module: 'restaurants', label: 'Restaurants', countKeys: ['menuSignals', 'reservationRules', 'legacyEcommerceOffers'] },
    { key: 'realEstateBlueprint', module: 'realEstate', label: 'Realty', countKeys: ['listingDrafts', 'campaignTypes', 'chatbotKnowledge', 'emailAutomations', 'crmPipelineStages', 'analyticsEvents', 'digitalProducts', 'engineArtifacts'] },
    { key: 'financeBlueprint', module: 'finance', label: 'Finance', countKeys: ['trackedMetrics', 'revenueSources', 'refundSources'] },
    { key: 'analyticsBlueprint', module: 'analytics', label: 'Analytics', countKeys: ['events', 'dashboards'] },
    { key: 'automationBlueprint', module: 'project', label: 'Automations', countKeys: ['flows'] },
];

const readBlueprintStringList = (value: unknown): string[] =>
    uniqueStringList(asArray(value)
        .map(item => readDisplayText(item))
        .filter((item): item is string => Boolean(item)));

const readBlueprintReadiness = (
    value: unknown,
    available: boolean,
): { isReady: boolean; blockers: string[]; warnings: string[] } => {
    const readiness = asRecord(value);
    return {
        isReady: available ? readBoolean(readiness.isReady) ?? false : false,
        blockers: readBlueprintStringList(readiness.blockers),
        warnings: readBlueprintStringList(readiness.warnings),
    };
};

const countBlueprintDetail = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'string') return value.trim() ? 1 : 0;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const record = asRecord(value);
    return Object.keys(record).length;
};

const summarizeBlueprintCounts = (
    moduleRecord: Record<string, unknown>,
    countKeys: string[],
): Record<string, number> =>
    countKeys.reduce<Record<string, number>>((acc, key) => {
        const count = countBlueprintDetail(moduleRecord[key]);
        if (count > 0) acc[key] = count;
        return acc;
    }, {});

const blueprintSummaryModuleRequested = (
    config: BusinessBlueprintSummaryConfig,
    requestedModules: string[],
): boolean => {
    if (requestedModules.length === 0) return true;
    const normalized = requestedModules.map(item => normalizeForSearch(item).replace(/\s+/g, ''));
    const candidates = [
        String(config.key),
        config.module,
        config.label,
    ].map(item => normalizeForSearch(item).replace(/\s+/g, ''));
    return candidates.some(candidate => normalized.includes(candidate));
};

const summarizeBlueprintModule = (
    blueprint: BusinessBlueprint,
    config: BusinessBlueprintSummaryConfig,
) => {
    const moduleRecord = asRecord((blueprint as unknown as Record<string, unknown>)[config.key]);
    const available = Object.keys(moduleRecord).length > 0;
    const readiness = readBlueprintReadiness(moduleRecord.readiness, available);
    const enabled = available ? readBoolean(moduleRecord.enabled) ?? true : false;
    const needsReview = available ? readBoolean(moduleRecord.needsReview) ?? false : false;

    return {
        key: config.key,
        module: config.module,
        label: config.label,
        available,
        enabled,
        status: available ? readString(moduleRecord.status) || 'unknown' : 'missing',
        needsReview,
        readiness,
        counts: summarizeBlueprintCounts(moduleRecord, config.countKeys),
        metadata: {
            generatedBy: readString(asRecord(moduleRecord.metadata).generatedBy) || null,
            updatedAt: readString(asRecord(moduleRecord.metadata).updatedAt)
                || readString(asRecord(moduleRecord.metadata).lastEditedAt)
                || readString(asRecord(moduleRecord.metadata).lastSyncedAt)
                || null,
            userModified: readBoolean(asRecord(moduleRecord.metadata).userModified) ?? null,
            lockedFromRegeneration: readBoolean(asRecord(moduleRecord.metadata).lockedFromRegeneration) ?? null,
        },
    };
};

const buildBusinessBlueprintMissingSummary = (
    projectId: string,
    row: Record<string, unknown>,
    generatedAt: string,
) => ({
    kind: 'business_blueprint_summary',
    projectId,
    projectName: readDisplayText(row.name) || projectId,
    tenantId: readProjectTenantId(row) || null,
    generatedAt,
    hasBusinessBlueprint: false,
    summary: {
        projectId,
        businessName: readDisplayText(row.name) || projectId,
        status: 'missing',
        blockerCount: 1,
        warningCount: 0,
        enabledModuleCount: 0,
        reviewModuleCount: 0,
        readyModuleCount: 0,
    },
    modules: {},
    recommendations: [
        'Generate or refresh the AI Studio BusinessBlueprint before running cross-module Operating Layer actions.',
    ],
    sourceTables: ['projects'],
});

const createBusinessBlueprintSummaryHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const row = await loadProjectRowForAssistantScope(client, projectId, action, context, 'summarizing BusinessBlueprint');
        const projectData = asRecord(row.data);
        const nestedData = asRecord(projectData.data);
        const businessBlueprint = migrateBusinessBlueprint(projectData.businessBlueprint || nestedData.businessBlueprint);
        const generatedAt = getNow(deps);

        if (!businessBlueprint) {
            const afterSnapshot = buildBusinessBlueprintMissingSummary(projectId, row, generatedAt);
            return {
                afterSnapshot,
                diff: {
                    analyzed: [`projects.${projectId}.data.businessBlueprint`],
                    mutatesData: false,
                    hasBusinessBlueprint: false,
                },
            };
        }

        const requestedModules = readBlueprintStringList(input.includeModules || input.modules);
        const moduleSummaries = BUSINESS_BLUEPRINT_SUMMARY_MODULES
            .filter(config => blueprintSummaryModuleRequested(config, requestedModules))
            .map(config => summarizeBlueprintModule(businessBlueprint, config));
        const modules = moduleSummaries.reduce<Record<string, unknown>>((acc, summary) => {
            acc[String(summary.key)] = summary;
            return acc;
        }, {});
        const enabledModules = moduleSummaries.filter(module => module.enabled).map(module => module.key);
        const reviewModules = moduleSummaries.filter(module => module.needsReview).map(module => module.key);
        const readyModules = moduleSummaries.filter(module => module.readiness.isReady).map(module => module.key);
        const blockers = uniqueStringList(moduleSummaries.flatMap(module => module.readiness.blockers));
        const warnings = uniqueStringList(moduleSummaries.flatMap(module => module.readiness.warnings));
        const rootReadiness = readBlueprintReadiness(businessBlueprint.readiness, true);
        const allBlockers = uniqueStringList([...rootReadiness.blockers, ...blockers]);
        const allWarnings = uniqueStringList([...rootReadiness.warnings, ...warnings]);
        const blueprintRecord = businessBlueprint as unknown as Record<string, unknown>;
        const recommendations = uniqueStringList([
            ...(allBlockers.length > 0 ? ['Resolve BusinessBlueprint readiness blockers before publishing or automating dependent modules.'] : []),
            ...(reviewModules.length > 0 ? ['Review AI-generated module drafts before they are exposed publicly or sent to customers.'] : []),
            ...(allBlockers.length === 0 && reviewModules.length === 0 ? ['BusinessBlueprint has no detected blockers in the selected module scope.'] : []),
        ]);

        const afterSnapshot = {
            kind: 'business_blueprint_summary',
            projectId,
            projectName: readDisplayText(row.name) || businessBlueprint.businessProfile.businessName || projectId,
            tenantId: readProjectTenantId(row) || businessBlueprint.tenantId || null,
            generatedAt,
            hasBusinessBlueprint: true,
            blueprint: {
                blueprintVersion: businessBlueprint.blueprintVersion,
                schemaVersion: businessBlueprint.schemaVersion,
                source: businessBlueprint.source,
                status: businessBlueprint.status,
                generatedAt: businessBlueprint.generatedAt,
                updatedAt: businessBlueprint.updatedAt || null,
                lastSyncedAt: businessBlueprint.lastSyncedAt || null,
                rootNeedsReview: readBoolean(blueprintRecord.needsReview) ?? false,
            },
            summary: {
                projectId,
                businessName: businessBlueprint.businessProfile.businessName,
                industry: businessBlueprint.businessProfile.industry,
                rootStatus: businessBlueprint.status,
                rootReady: rootReadiness.isReady,
                blockerCount: allBlockers.length,
                warningCount: allWarnings.length,
                enabledModuleCount: enabledModules.length,
                reviewModuleCount: reviewModules.length,
                readyModuleCount: readyModules.length,
                selectedModuleCount: moduleSummaries.length,
                enabledModules,
                reviewModules,
                readyModules,
            },
            modules,
            blockers: allBlockers,
            warnings: allWarnings,
            recommendations,
            sourceTables: ['projects'],
        };

        return {
            afterSnapshot,
            diff: {
                analyzed: [`projects.${projectId}.data.businessBlueprint`],
                mutatesData: false,
                hasBusinessBlueprint: true,
                blockerCount: allBlockers.length,
                warningCount: allWarnings.length,
            },
        };
    },
});

const TENANT_SEARCH_STOP_WORDS = new Set([
    'admin',
    'busca',
    'buscar',
    'encuentra',
    'find',
    'search',
    'super',
    'tenant',
    'tenants',
    'workspace',
    'workspaces',
]);

const normalizeTenantSearchQuery = (input: Record<string, unknown>): string => (
    readString(input.query)
    || readString(input.search)
    || readString(input.request)
    || ''
);

const tenantSearchTerms = (query: string): string[] =>
    normalizeForSearch(query)
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length > 1 && !TENANT_SEARCH_STOP_WORDS.has(term));

const isSuperAdminContext = (context?: AssistantContextSnapshot): boolean =>
    context?.actor.isSuperAdmin === true || context?.actor.mode === 'super_admin' || context?.actor.mode === 'system';

const readTenantRowsForSearch = async (
    client: SupabaseClientLike,
    context?: AssistantContextSnapshot,
): Promise<Record<string, unknown>[]> => {
    const snapshotTenants = asArray(context?.snapshot?.availableTenants)
        .map(tenant => asRecord(tenant))
        .filter(tenant => readString(tenant.id));
    if (snapshotTenants.length > 0) return snapshotTenants.map(tenant => cloneRecord(tenant));

    let builder = client.from('tenants').select('*');
    if (!isSuperAdminContext(context)) {
        if (context?.tenant.tenantId) {
            builder = builder.eq('id', context.tenant.tenantId);
        } else if (context?.actor.userId) {
            builder = builder.eq('owner_user_id', context.actor.userId);
        }
    }

    const result = await builder;
    if (result?.error) throw result.error;
    return asArray(result?.data).map(row => cloneRecord(asRecord(row))).filter(row => readString(row.id));
};

const tenantRowSearchText = (row: Record<string, unknown>): string => normalizeForSearch([
    readString(row.id),
    readDisplayText(row.name),
    readString(row.email),
    readString(row.company_name) || readString(row.companyName),
    readString(row.status),
    readString(row.type),
    readString(row.subscription_plan) || readString(row.subscriptionPlan),
    readString(row.owner_user_id) || readString(row.ownerUserId),
].filter(Boolean).join(' '));

const tenantRowSearchScore = (row: Record<string, unknown>, terms: string[]): number => {
    if (terms.length === 0) return 1;
    const haystack = tenantRowSearchText(row);
    return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
};

const tenantSearchMatch = (row: Record<string, unknown>): Record<string, unknown> => {
    const limits = asRecord(row.limits);
    const usage = asRecord(row.usage);
    return {
        id: readString(row.id),
        name: readDisplayText(row.name) || readString(row.id),
        email: readString(row.email) || null,
        companyName: readString(row.company_name) || readString(row.companyName) || null,
        type: readString(row.type) || null,
        status: readString(row.status) || null,
        subscriptionPlan: readString(row.subscription_plan) || readString(row.subscriptionPlan) || null,
        ownerUserId: readString(row.owner_user_id) || readString(row.ownerUserId) || null,
        ownerTenantId: readString(row.owner_tenant_id) || readString(row.ownerTenantId) || null,
        usage: {
            projectCount: readNumber(usage.projectCount) ?? readNumber(usage.project_count) ?? null,
            userCount: readNumber(usage.userCount) ?? readNumber(usage.user_count) ?? null,
            storageUsedGB: readNumber(usage.storageUsedGB) ?? readNumber(usage.storage_used_gb) ?? null,
            aiCreditsUsed: readNumber(usage.aiCreditsUsed) ?? readNumber(usage.ai_credits_used) ?? null,
        },
        limits: {
            maxProjects: readNumber(limits.maxProjects) ?? readNumber(limits.max_projects) ?? null,
            maxUsers: readNumber(limits.maxUsers) ?? readNumber(limits.max_users) ?? null,
            maxStorageGB: readNumber(limits.maxStorageGB) ?? readNumber(limits.max_storage_gb) ?? null,
            maxAiCredits: readNumber(limits.maxAiCredits) ?? readNumber(limits.max_ai_credits) ?? null,
        },
        createdAt: readString(row.created_at) || readString(row.createdAt) || null,
        updatedAt: readString(row.updated_at) || readString(row.updatedAt) || null,
    };
};

const createSearchTenantsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const query = normalizeTenantSearchQuery(input);
        const terms = tenantSearchTerms(query);
        const rows = await readTenantRowsForSearch(client, context);
        const matches = rows
            .map(row => ({ row, score: tenantRowSearchScore(row, terms) }))
            .filter(entry => terms.length === 0 || entry.score > 0)
            .sort((left, right) => right.score - left.score || String(readDisplayText(left.row.name) || '').localeCompare(String(readDisplayText(right.row.name) || '')))
            .slice(0, 12)
            .map(entry => tenantSearchMatch(entry.row));

        return {
            afterSnapshot: {
                kind: 'tenant_search',
                query,
                mode: context?.actor.mode || action.mode || null,
                tenantId: context?.tenant.tenantId || null,
                userId: context?.actor.userId || null,
                matchCount: matches.length,
                matches,
                source: asArray(context?.snapshot?.availableTenants).length > 0 ? 'context_snapshot' : 'supabase.tenants',
                scope: isSuperAdminContext(context) ? 'all_tenants' : 'current_tenant_or_owner',
            },
            diff: {
                searched: ['tenants'],
                mutatesData: false,
                actionType: action.actionType,
            },
        };
    },
});

const ADMIN_SERVICE_IDS = new Set<PlatformServiceId>(PLATFORM_SERVICES.map(service => service.id));
const ADMIN_SERVICE_STATUSES = new Set<ServiceStatus>(['public', 'not_public', 'development']);
const ADMIN_PROMPT_SETTING_ALIASES: Record<string, string> = {
    globalassistant: 'global_assistant',
    global_assistant: 'global_assistant',
    global_assistant_settings: 'global_assistant',
    globalassistantsettings: 'global_assistant',
    assistant: 'global_assistant',
    chatbot: 'chatbotPrompts',
    chatcore: 'chatbotPrompts',
    chatbot_prompts: 'chatbotPrompts',
    chatcore_prompts: 'chatbotPrompts',
    chatbotprompts: 'chatbotPrompts',
    chatcoreprompts: 'chatbotPrompts',
};

const normalizeAdminToken = (value: unknown): string =>
    (readString(value) || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const getAdminTargetTenantId = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const tenantId = readString(input.tenantId)
        || readString(input.tenant_id)
        || context?.admin.targetTenantId
        || readString(context?.snapshot?.targetTenantId)
        || readString(context?.snapshot?.tenantId)
        || action.tenantId
        || context?.tenant.tenantId
        || context?.project.tenantId
        || '';
    if (!tenantId) throw new Error('tenantId is required before applying this admin action.');
    return tenantId;
};

const normalizeFeatureList = (value: unknown): string[] =>
    uniqueStringList(asArray(value).map(item => readString(item)).filter((item): item is string => Boolean(item)));

const normalizeServiceId = (value: unknown): PlatformServiceId | undefined => {
    const raw = readString(value);
    if (!raw) return undefined;
    const exact = PLATFORM_SERVICES.find(service => service.id === raw);
    if (exact) return exact.id;
    const normalized = normalizeAdminToken(raw);
    return PLATFORM_SERVICES.find(service => normalizeAdminToken(service.id) === normalized)?.id;
};

const normalizeServiceStatus = (input: Record<string, unknown>): ServiceStatus | undefined => {
    const raw = readString(input.status)
        || readString(input.newStatus)
        || readString(input.serviceStatus)
        || readString(input.availabilityStatus);
    const normalized = normalizeAdminToken(raw);
    if (ADMIN_SERVICE_STATUSES.has(normalized as ServiceStatus)) return normalized as ServiceStatus;
    if (['disabled', 'disable', 'hidden', 'off', 'private', 'notpublic', 'not_public'].includes(normalized)) return 'not_public';
    if (['dev', 'development', 'testing'].includes(normalized)) return 'development';
    if (['enabled', 'enable', 'active', 'on', 'public'].includes(normalized)) return 'public';

    const enabled = readBoolean(input.enabled);
    if (enabled !== undefined) return enabled ? 'public' : 'not_public';
    return undefined;
};

const loadSettingRow = async (
    client: SupabaseClientLike,
    id: string,
): Promise<{ exists: boolean; row: Record<string, unknown>; config: Record<string, unknown> }> => {
    const result = await selectSingle(client.from('settings').select('*').eq('id', id));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    return {
        exists: Boolean(readString(row.id)),
        row: readString(row.id) ? cloneRecord(row) : {},
        config: cloneRecord(asRecord(row.config)),
    };
};

const saveSettingConfig = async (
    client: SupabaseClientLike,
    id: string,
    config: Record<string, unknown>,
    options: { exists: boolean; actorId?: string | null; now: string },
): Promise<Record<string, unknown>> => {
    const patch = {
        config,
        updated_at: options.now,
        updated_by: options.actorId || null,
    };
    return options.exists
        ? updateRowById(client, 'settings', id, patch)
        : asRecord(await insertRow(client, 'settings', { id, ...patch }));
};

const rollbackSettingRow = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const id = readString(before.id);
    if (!id) throw new Error('Cannot rollback settings: setting id was not recorded.');
    if (before.exists === false) {
        const deleted = await deleteRowById(getClient(deps), 'settings', id);
        return {
            afterSnapshot: { table: 'settings', id, restoredMissingRow: true, rollback: deleted },
            diff: { deleted: [`settings.${id}`] },
        };
    }
    const row = asRecord(before.row);
    if (!Object.keys(row).length) throw new Error(`Cannot rollback settings.${id}: previous row snapshot was not recorded.`);
    const { id: _id, ...restorePatch } = row;
    const restored = await updateRowById(getClient(deps), 'settings', id, restorePatch);
    return {
        afterSnapshot: { table: 'settings', id, row: restored, restored: true },
        diff: { restored: [`settings.${id}`] },
    };
};

const normalizePromptSettingId = (value: unknown): string | undefined => {
    const raw = readString(value);
    if (!raw) return undefined;
    if (raw === 'global_assistant' || raw === 'chatbotPrompts') return raw;
    return ADMIN_PROMPT_SETTING_ALIASES[normalizeAdminToken(raw)];
};

const summarizeApiLogRows = (rows: Record<string, unknown>[]) => {
    const total = rows.length;
    const failures = rows.filter(row => row.success === false || Boolean(readString(row.error))).length;
    const byFeature = rows.reduce<Record<string, number>>((acc, row) => {
        const key = readString(row.feature) || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const byModel = rows.reduce<Record<string, number>>((acc, row) => {
        const key = readString(row.model) || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return { total, failures, success: total - failures, byFeature, byModel };
};

const apiLogSample = (row: Record<string, unknown>) => ({
    id: readString(row.id) || null,
    createdAt: readString(row.created_at) || readString(row.createdAt) || null,
    userId: readString(row.user_id) || readString(row.userId) || null,
    projectId: readString(row.project_id) || readString(row.projectId) || null,
    feature: readString(row.feature) || null,
    model: readString(row.model) || null,
    endpoint: readString(row.endpoint) || null,
    success: row.success !== false,
    error: readString(row.error) || null,
    totalTokens: readNumber(row.total_tokens) ?? readNumber(row.totalTokens) ?? null,
    latencyMs: readNumber(row.latency_ms) ?? readNumber(row.latencyMs) ?? null,
});

const API_LOG_REVIEW_STOP_WORDS = new Set([
    'admin',
    'api',
    'error',
    'errores',
    'failed',
    'fallo',
    'fallos',
    'ia',
    'logs',
    'plataforma',
    'platform',
    'revisa',
    'review',
]);

const readApiLogs = async (client: SupabaseClientLike, input: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
    const result = await client.from('api_logs').select('*');
    if (result?.error) throw result.error;
    const query = normalizeForSearch(readString(input.query) || readString(input.request) || '');
    const terms = query
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length > 2 && !API_LOG_REVIEW_STOP_WORDS.has(term));
    return asArray(result?.data)
        .map(row => cloneRecord(asRecord(row)))
        .filter(row => {
            if (terms.length === 0) return true;
            const haystack = normalizeForSearch([
                readString(row.id),
                readString(row.user_id),
                readString(row.project_id),
                readString(row.model),
                readString(row.feature),
                readString(row.endpoint),
                readString(row.error),
            ].filter(Boolean).join(' '));
            return terms.some(term => haystack.includes(term));
        })
        .sort((left, right) => String(readString(right.created_at) || '').localeCompare(String(readString(left.created_at) || '')));
};

const createUpdateFeatureFlagHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        if (!readString(input.tenantId) && !readString(input.tenant_id)) errors.push('tenantId is required for feature flag updates.');
        if (!readString(input.featureFlag) && !readString(input.feature_flag)) errors.push('featureFlag is required for feature flag updates.');
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const tenantId = getAdminTargetTenantId(input, action, context);
        const featureFlag = readString(input.featureFlag) || readString(input.feature_flag) || '';
        if (!featureFlag) throw new Error('featureFlag is required for feature flag updates.');
        const enabled = readBoolean(input.enabled) ?? true;
        const now = getNow(deps);
        const currentRow = await loadRowById(client, 'tenants', tenantId);
        const settings = asRecord(currentRow.settings);
        const beforeFeatures = normalizeFeatureList(settings.enabledFeatures);
        const afterFeatures = enabled
            ? uniqueStringList([...beforeFeatures, featureFlag])
            : beforeFeatures.filter(flag => flag !== featureFlag);
        const patch = {
            settings: {
                ...settings,
                enabledFeatures: afterFeatures,
                globalAssistantLastFeatureFlagUpdate: {
                    featureFlag,
                    enabled,
                    actionId: action.id,
                    updatedAt: now,
                    updatedBy: context?.actor.userId || action.userId || null,
                },
            },
            updated_at: now,
        };
        const row = await updateRowById(client, 'tenants', tenantId, patch);
        return {
            beforeSnapshot: { table: 'tenants', id: tenantId, row: currentRow },
            afterSnapshot: { table: 'tenants', id: tenantId, row, featureFlag, enabled, enabledFeatures: afterFeatures },
            diff: {
                updated: [`tenants.${tenantId}.settings.enabledFeatures`],
                featureFlag,
                enabled,
                rollback: 'restore_previous_tenant_settings',
            },
        };
    },
    rollback: rollbackUpdatedRow('tenants', deps),
});

const createUpdateServiceAvailabilityHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        const serviceId = normalizeServiceId(input.serviceId ?? input.service_id);
        if (!serviceId) errors.push('serviceId is required and must match a platform service.');
        if (!normalizeServiceStatus(input)) errors.push('A service status or enabled boolean is required.');
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const serviceId = normalizeServiceId(input.serviceId ?? input.service_id);
        if (!serviceId || !ADMIN_SERVICE_IDS.has(serviceId)) throw new Error('serviceId must match a platform service.');
        const newStatus = normalizeServiceStatus(input);
        if (!newStatus) throw new Error('A service status or enabled boolean is required.');
        const now = getNow(deps);
        const actorId = context?.actor.userId || action.userId || null;
        const current = await loadSettingRow(client, 'serviceAvailability');
        const currentServices = asRecord(current.config.services);
        const previousConfig = asRecord(currentServices[serviceId]);
        const previousStatus = (readString(previousConfig.status) || 'public') as ServiceStatus;
        const statusReason = readString(input.reason) || readString(input.statusReason) || readString(input.request) || null;
        const nextConfig = {
            ...current.config,
            services: {
                ...currentServices,
                [serviceId]: {
                    ...previousConfig,
                    status: newStatus,
                    statusReason,
                    updatedAt: now,
                    updatedBy: actorId || 'global-assistant',
                },
            },
            lastUpdated: now,
            updatedBy: actorId || 'global-assistant',
        };
        const row = await saveSettingConfig(client, 'serviceAvailability', nextConfig, {
            exists: current.exists,
            actorId,
            now,
        });
        let auditWarning: string | null = null;
        try {
            await insertRow(client, 'service_audit_logs', {
                service_id: serviceId,
                previous_status: previousStatus,
                new_status: newStatus,
                reason: statusReason,
                user_id: actorId,
                user_email: context?.actor.email || 'global-assistant',
                timestamp: now,
                source: 'global-assistant',
                action_id: action.id,
            });
        } catch (error) {
            auditWarning = error instanceof Error ? error.message : 'Service audit log write failed.';
        }
        return {
            beforeSnapshot: { table: 'settings', id: 'serviceAvailability', exists: current.exists, row: current.row },
            afterSnapshot: {
                table: 'settings',
                id: 'serviceAvailability',
                row,
                serviceId,
                previousStatus,
                newStatus,
                auditWarning,
            },
            diff: {
                updated: [`settings.serviceAvailability.services.${serviceId}.status`],
                auditLogged: auditWarning ? false : true,
                rollback: 'restore_previous_service_availability',
            },
        };
    },
    rollback: rollbackSettingRow(deps),
});

const createUpdatePlanHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        const planId = readString(input.planId) || readString(input.plan_id);
        if (!readString(input.tenantId) && !readString(input.tenant_id)) errors.push('tenantId is required for tenant plan updates.');
        if (!planId) errors.push('planId is required for tenant plan updates.');
        if (planId && !(planId in SUBSCRIPTION_PLANS)) errors.push(`Unsupported subscription plan: ${planId}.`);
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const tenantId = getAdminTargetTenantId(input, action, context);
        const planId = readString(input.planId) || readString(input.plan_id) || '';
        const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
        if (!plan) throw new Error(`Unsupported subscription plan: ${planId}.`);
        const now = getNow(deps);
        const currentRow = await loadRowById(client, 'tenants', tenantId);
        const previousBillingInfo = asRecord(currentRow.billing_info);
        const patch = {
            subscription_plan: planId,
            limits: cloneRecord(plan.limits as unknown as Record<string, unknown>),
            billing_info: {
                ...previousBillingInfo,
                lastPlanChangeAt: now,
                lastPlanChangeBy: context?.actor.userId || action.userId || null,
                lastPlanChangeSource: 'global-assistant',
                noStripeMutation: true,
            },
            updated_at: now,
        };
        const row = await updateRowById(client, 'tenants', tenantId, patch);
        return {
            beforeSnapshot: { table: 'tenants', id: tenantId, row: currentRow },
            afterSnapshot: {
                table: 'tenants',
                id: tenantId,
                row,
                planId,
                noStripeMutation: true,
            },
            diff: {
                updated: [`tenants.${tenantId}.subscription_plan`, `tenants.${tenantId}.limits`, `tenants.${tenantId}.billing_info`],
                noStripeMutation: true,
                rollback: 'restore_previous_tenant_plan',
            },
        };
    },
    rollback: rollbackUpdatedRow('tenants', deps),
});

const createReviewAiLogsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const rows = await readApiLogs(getClient(deps), input);
        return {
            afterSnapshot: {
                kind: 'ai_log_review',
                query: readString(input.query) || readString(input.request) || '',
                generatedAt: getNow(deps),
                tenantId: context?.tenant.tenantId || action.tenantId || null,
                summary: summarizeApiLogRows(rows),
                samples: rows.slice(0, 10).map(apiLogSample),
            },
            diff: {
                reviewed: ['api_logs'],
                mutatesData: false,
            },
        };
    },
});

const createReviewErrorsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const rows = (await readApiLogs(getClient(deps), input))
            .filter(row => row.success === false || Boolean(readString(row.error)));
        const byErrorFeature = rows.reduce<Record<string, number>>((acc, row) => {
            const key = readString(row.feature) || readString(row.endpoint) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return {
            afterSnapshot: {
                kind: 'platform_error_review',
                query: readString(input.query) || readString(input.request) || '',
                generatedAt: getNow(deps),
                tenantId: context?.tenant.tenantId || action.tenantId || null,
                summary: {
                    ...summarizeApiLogRows(rows),
                    byErrorFeature,
                },
                samples: rows.slice(0, 10).map(apiLogSample),
            },
            diff: {
                reviewed: ['api_logs'],
                mutatesData: false,
            },
        };
    },
});

const createManageGlobalPromptsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        const settingId = normalizePromptSettingId(input.promptId ?? input.prompt_id ?? input.settingId);
        const updates = asRecord(input.updates);
        const inlinePrompt = readString(input.prompt) || readString(input.instructions) || readString(input.content);
        if (!settingId) errors.push('promptId must target global_assistant or chatbotPrompts.');
        if (Object.keys(updates).length === 0 && !inlinePrompt) errors.push('updates or prompt/instructions are required for global prompt changes.');
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const settingId = normalizePromptSettingId(input.promptId ?? input.prompt_id ?? input.settingId);
        if (!settingId) throw new Error('promptId must target global_assistant or chatbotPrompts.');
        const explicitUpdates = asRecord(input.updates);
        const inlinePrompt = readString(input.prompt) || readString(input.instructions) || readString(input.content);
        const updates = Object.keys(explicitUpdates).length > 0
            ? explicitUpdates
            : { customInstructions: inlinePrompt };
        const now = getNow(deps);
        const actorId = context?.actor.userId || action.userId || null;
        const current = await loadSettingRow(client, settingId);
        const nextConfig = {
            ...current.config,
            ...updates,
            updatedAt: now,
            updatedBy: actorId,
            globalAssistantLastPromptUpdate: {
                actionId: action.id,
                updatedAt: now,
                updatedBy: actorId,
                scope: settingId === 'chatbotPrompts' ? 'chatcore_global_prompts' : 'global_assistant',
            },
        };
        const row = await saveSettingConfig(client, settingId, nextConfig, {
            exists: current.exists,
            actorId,
            now,
        });
        return {
            beforeSnapshot: { table: 'settings', id: settingId, exists: current.exists, row: current.row },
            afterSnapshot: {
                table: 'settings',
                id: settingId,
                row,
                updatedKeys: Object.keys(updates),
                chatCoreVisitorMemoryAffected: false,
            },
            diff: {
                updated: Object.keys(updates).map(key => `settings.${settingId}.config.${key}`),
                rollback: 'restore_previous_global_prompt_settings',
                chatCoreVisitorMemoryAffected: false,
            },
        };
    },
    rollback: rollbackSettingRow(deps),
});

const createUpdateProjectMetadataHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        if (!readString(input.projectId)) errors.push('projectId is required before updating project metadata.');
        const draft = deriveProjectMetadataUpdateDraft(input);
        if (Object.keys(draft).length === 0) {
            errors.push('At least one supported project metadata update is required: name, status, description, category, or tags.');
        }
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const currentRow = await loadProjectMetadataRow(client, projectId, action, context);
        const draft = deriveProjectMetadataUpdateDraft(input);
        const now = getNow(deps);
        const { patch, changedKeys } = deriveProjectMetadataPatch(draft, currentRow, input, action, context, now);
        if (changedKeys.length === 0) {
            throw new Error('Project metadata update did not change any supported fields.');
        }

        const result = await selectSingle(client.from('projects').update(patch).eq('id', projectId));
        if (result?.error) throw result.error;
        const row = asRecord(result?.data);
        if (!readString(row.id)) throw new Error(`Project ${projectId} metadata could not be updated.`);

        return {
            beforeSnapshot: createProjectMetadataBeforeSnapshot(projectId, currentRow),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row,
                changedKeys,
                reviewRequired: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
            diff: {
                updated: changedKeys.map(key => `projects.${projectId}.${key}`),
                reviewRequired: true,
                rollback: 'restore_previous_project_metadata',
            },
        };
    },
    rollback: rollbackProjectMetadataColumns(deps),
});

const getAssistantUserId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const userId = action.userId || context?.actor.userId || '';
    if (!userId) throw new Error('userId is required before applying this assistant action.');
    return userId;
};

const mergeSettingsWithAssistantMetadata = (
    settings: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => ({
    ...settings,
    generatedByAI: true,
    needsReview: true,
    safeToEdit: true,
    sourceModule: 'global-assistant',
    sourceComponent: 'OperatingLayer',
    sourceEntityType: 'assistant_action',
    sourceEntityId: action.id,
    metadata: {
        ...asRecord(settings.metadata),
        ...buildBaseMetadata(input, action, context),
    },
});

const assistantSourceMap = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, string | string[]> => ({
    globalAssistant: 'OperatingLayer',
    assistantTaskId: action.taskId || '',
    assistantActionId: action.id,
    assistantActionType: action.actionType,
    assistantModule: action.module,
    request: readString(input.request) || '',
    contextSnapshotId: context?.id || '',
});

const readStringList = (value: unknown): string[] =>
    asArray(value).map(item => String(item || '').trim()).filter(Boolean);

const uniqueStringList = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const DEFAULT_WEBSITE_THEME = {
    globalColors: {
        primary: '#111827',
        secondary: '#374151',
        accent: '#2563eb',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#111827',
    },
    fontFamilyHeader: 'Inter',
    fontFamilyBody: 'Inter',
    fontFamilyButton: 'Inter',
} as unknown as ThemeData;

type ProjectWebsiteState = {
    projectId: string;
    projectName: string;
    row: Record<string, unknown>;
    projectData: Record<string, unknown>;
    pageData: Record<string, unknown>;
    theme: ThemeData;
    brandIdentity?: BrandIdentity;
    componentOrder: PageSection[];
    sectionVisibility: Record<PageSection, boolean>;
    pages: SitePage[];
};

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;

const readPageSectionList = (value: unknown): PageSection[] => readStringList(value) as PageSection[];

const readSectionVisibility = (value: unknown): Record<PageSection, boolean> => {
    const record = asRecord(value);
    return Object.entries(record).reduce<Record<PageSection, boolean>>((acc, [key, next]) => {
        const bool = readBoolean(next);
        if (bool !== undefined) acc[key as PageSection] = bool;
        return acc;
    }, {} as Record<PageSection, boolean>);
};

const readSitePages = (value: unknown): SitePage[] =>
    asArray(value)
        .map(page => asRecord(page))
        .filter(page => readString(page.id) && readString(page.title))
        .map(page => ({
            ...(cloneRecord(page) as unknown as SitePage),
            sections: readPageSectionList(page.sections),
            sectionData: asRecord(page.sectionData),
        }));

const readTheme = (projectRow: Record<string, unknown>, projectData: Record<string, unknown>): ThemeData => {
    const theme = asRecord(projectRow.theme);
    const dataTheme = asRecord(projectData.theme);
    return Object.keys(theme).length
        ? theme as unknown as ThemeData
        : Object.keys(dataTheme).length
            ? dataTheme as unknown as ThemeData
            : DEFAULT_WEBSITE_THEME;
};

const readBrandIdentity = (projectRow: Record<string, unknown>, projectData: Record<string, unknown>): BrandIdentity | undefined => {
    const brandIdentity = asRecord(projectRow.brand_identity);
    const dataBrandIdentity = asRecord(projectData.brandIdentity);
    if (Object.keys(brandIdentity).length) return brandIdentity as unknown as BrandIdentity;
    if (Object.keys(dataBrandIdentity).length) return dataBrandIdentity as unknown as BrandIdentity;
    return undefined;
};

const inferProjectDraftName = (input: Record<string, unknown>, request: string): string => {
    const explicitName = readDisplayText(input.name)
        || readDisplayText(input.businessName)
        || readDisplayText(input.projectName)
        || readDisplayText(asRecord(input.business).name);
    if (explicitName) return titleFromRequest(explicitName, 'AI website draft');

    const cleanedRequest = request
        .replace(/\b(crea|crear|create|genera|generar|build|website|sitio|web|proyecto|project|para|for|de|del|una|un|nuevo|nueva)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return titleFromRequest(cleanedRequest || request, 'AI website draft');
};

const inferProjectDraftIndustry = (input: Record<string, unknown>, request: string): string => (
    readDisplayText(input.industry)
    || readDisplayText(asRecord(input.business).industry)
    || (includesAny(normalizeForSearch(request), ['restaurant', 'restaurante', 'menu', 'reservation', 'reserva', 'cita']) ? 'restaurant' : undefined)
    || (includesAny(normalizeForSearch(request), ['real estate', 'realty', 'inmobiliaria', 'propiedad', 'listing']) ? 'real estate' : undefined)
    || (includesAny(normalizeForSearch(request), ['ecommerce', 'store', 'tienda', 'product', 'producto']) ? 'ecommerce' : undefined)
    || 'general'
);

const inferProjectDraftHasEcommerce = (input: Record<string, unknown>, request: string): boolean => (
    readBoolean(input.hasEcommerce)
    ?? readBoolean(asRecord(input.business).hasEcommerce)
    ?? includesAny(normalizeForSearch(request), ['ecommerce', 'store', 'tienda', 'product', 'producto', 'checkout', 'cart'])
);

const buildAssistantProjectDraft = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    options: { now: string; projectId?: string },
) => {
    const request = readString(input.prompt) || readString(input.request) || '';
    const projectName = inferProjectDraftName(input, request);
    const industry = inferProjectDraftIndustry(input, request);
    const hasEcommerce = inferProjectDraftHasEcommerce(input, request);
    const userId = getAssistantUserId(action, context);
    const tenantId = readString(input.tenantId) || getRequiredTenantId(action, context);
    const isRestaurant = normalizeForSearch(industry).includes('restaurant');
    const componentOrder = uniqueStringList([
        'header',
        'hero',
        'features',
        ...(isRestaurant ? ['menu'] : []),
        'cta',
        'chatbot',
        ...(hasEcommerce ? ['featuredProducts', 'categoryGrid'] : []),
        'footer',
    ]) as PageSection[];
    const sectionVisibility = componentOrder.reduce<Record<PageSection, boolean>>((acc, section) => {
        acc[section] = true;
        return acc;
    }, {} as Record<PageSection, boolean>);
    const theme = cloneValue(DEFAULT_WEBSITE_THEME);
    const brandIdentity = {
        ...(cloneValue(initialData.brandIdentity) as unknown as Record<string, unknown>),
        name: projectName,
        industry,
        source: 'global-assistant',
    } as unknown as BrandIdentity;
    const basePageData = cloneValue(initialData.data) as Record<string, unknown>;
    const hero = {
        ...asRecord(basePageData.hero),
        headline: projectName,
        subheadline: request || 'AI website draft created by the Global Assistant Operating Layer.',
        ctaText: 'Review draft',
    };
    const pageData = {
        ...basePageData,
        hero,
        features: {
            ...asRecord(basePageData.features),
            title: `${projectName} draft`,
            subtitle: request || 'Generated intake ready for review.',
        },
        cta: {
            ...asRecord(basePageData.cta),
            title: 'Ready for review',
            description: 'This project was created as a draft and will not publish automatically.',
        },
    } as unknown as PageData;
    const pages: SitePage[] = [{
        id: 'home',
        title: 'Home',
        slug: '/',
        type: 'static',
        sections: componentOrder,
        sectionData: componentOrder.reduce<Record<string, unknown>>((acc, section) => {
            acc[section] = (pageData as Record<string, unknown>)[section];
            return acc;
        }, {}),
        seo: {
            title: projectName,
            description: request || `${projectName} draft`,
        },
        isHomePage: true,
        showInNavigation: true,
        navigationOrder: 0,
        createdAt: options.now,
        updatedAt: options.now,
    }];
    const assistantDrafts = {
        projectCreation: {
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            noAutoPublish: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            createdAt: options.now,
            prompt: request,
            metadata: buildBaseMetadata(input, action, context),
        },
        website: {
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            noAutoPublish: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            updatedAt: options.now,
            prompt: request,
            metadata: buildBaseMetadata(input, action, context),
        },
    };
    const businessBlueprint = options.projectId
        ? syncWebsiteBlueprintFromEditor({
            businessBlueprint: null,
            projectId: options.projectId,
            projectName,
            userId,
            data: pageData,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            pages,
            action: 'save_project',
            now: options.now,
        })
        : null;
    const projectData = {
        ...(options.projectId ? { id: options.projectId } : {}),
        name: projectName,
        userId,
        tenantId,
        status: 'Draft',
        data: pageData,
        theme,
        brandIdentity,
        componentOrder,
        sectionVisibility,
        pages,
        aiAssistantConfig: {},
        assistantDrafts,
        ...(businessBlueprint ? { businessBlueprint: {
            ...businessBlueprint,
            needsReview: true,
            metadata: {
                ...businessBlueprint.metadata,
                generatedBy: 'global-assistant',
                needsReview: true,
                noAutoPublish: true,
            },
            websiteBlueprint: {
                ...businessBlueprint.websiteBlueprint,
                needsReview: true,
            },
        } } : {}),
        globalAssistant: {
            actionType: action.actionType,
            actionId: action.id,
            taskId: action.taskId || null,
            contextSnapshotId: context?.id || null,
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        },
        createdAt: options.now,
        lastUpdated: options.now,
    };

    return {
        projectName,
        tenantId,
        userId,
        pageData,
        projectData,
        theme,
        brandIdentity,
        componentOrder,
        sectionVisibility,
        pages,
        businessBlueprint,
        prompt: request,
    };
};

const createProjectFromPromptHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        if (!readString(input.prompt) && !readString(input.request)) {
            errors.push('prompt is required before creating a project draft.');
        }
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const now = getNow(deps);
        const draft = buildAssistantProjectDraft(input, action, context, { now });
        const inserted = asRecord(await insertRow(client, 'projects', {
            name: draft.projectName,
            status: 'Draft',
            user_id: draft.userId,
            tenant_id: draft.tenantId,
            data: draft.projectData,
            theme: draft.theme,
            brand_identity: draft.brandIdentity,
            component_order: draft.componentOrder,
            section_visibility: draft.sectionVisibility,
            pages: draft.pages,
            thumbnail_url: null,
            ai_assistant_config: {},
            last_updated: now,
        }));
        const projectId = readString(inserted.id);
        if (!projectId) throw new Error('Project draft was created without a project id.');

        const finalizedDraft = buildAssistantProjectDraft(input, action, context, { now, projectId });
        let row: Record<string, unknown>;
        try {
            const result = await selectSingle(client.from('projects').update({
                data: finalizedDraft.projectData,
                theme: finalizedDraft.theme,
                brand_identity: finalizedDraft.brandIdentity,
                component_order: finalizedDraft.componentOrder,
                section_visibility: finalizedDraft.sectionVisibility,
                pages: finalizedDraft.pages,
                last_updated: now,
            }).eq('id', projectId));
            if (result?.error) throw result.error;
            row = asRecord(result?.data);
            if (!readString(row.id)) throw new Error(`Project draft ${projectId} could not be finalized.`);
        } catch (error) {
            await deleteRowById(client, 'projects', projectId).catch(() => null);
            throw error;
        }

        return {
            beforeSnapshot: {
                table: 'projects',
                id: null,
                created: false,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row,
                projectName: finalizedDraft.projectName,
                tenantId: finalizedDraft.tenantId,
                userId: finalizedDraft.userId,
                prompt: finalizedDraft.prompt,
                reviewRequired: true,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
            diff: {
                created: [`projects.${projectId}`],
                updated: [`projects.${projectId}.data.businessBlueprint`, `projects.${projectId}.data.assistantDrafts`],
                reviewRequired: true,
                noAutoPublish: true,
                rollback: 'delete_created_project_draft',
            },
        };
    },
    rollback: rollbackCreatedRow('projects', deps),
});

const createWebsiteFromPromptHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const errors: string[] = [];
        if (!readString(input.prompt) && !readString(input.request)) {
            errors.push('prompt is required before creating a website draft.');
        }
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const now = getNow(deps);
        const prompt = readString(input.prompt) || readString(input.request) || '';
        const nextProjectData = {
            ...state.projectData,
            assistantDrafts: {
                ...asRecord(state.projectData.assistantDrafts),
                websiteGeneration: {
                    generatedByAI: true,
                    needsReview: true,
                    safeToEdit: true,
                    noAutoPublish: true,
                    prompt,
                    sourceModule: 'global-assistant',
                    sourceComponent: 'OperatingLayer',
                    sourceEntityType: 'assistant_action',
                    sourceEntityId: action.id,
                    updatedAt: now,
                    metadata: buildBaseMetadata(input, action, context),
                },
            },
            lastUpdated: now,
        };
        const result = await selectSingle(client.from('projects').update({
            data: nextProjectData,
            last_updated: now,
        }).eq('id', projectId));
        if (result?.error) throw result.error;
        const row = asRecord(result?.data);
        if (!readString(row.id)) throw new Error(`Project ${projectId} website draft could not be updated.`);

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row,
                prompt,
                reviewRequired: true,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
            diff: {
                updated: [`projects.${projectId}.data.assistantDrafts.websiteGeneration`],
                reviewRequired: true,
                noAutoPublish: true,
                rollback: 'restore_previous_project_website_columns',
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const loadProjectWebsiteState = async (
    client: SupabaseClientLike,
    projectId: string,
    context?: AssistantContextSnapshot,
): Promise<ProjectWebsiteState> => {
    const result = await selectSingle(client.from('projects').select('*').eq('id', projectId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) throw new Error(`Project ${projectId} was not found before editing website content.`);

    const projectData = cloneRecord(asRecord(row.data));
    const nestedPageData = asRecord(projectData.data);
    const pageData = Object.keys(nestedPageData).length ? cloneRecord(nestedPageData) : cloneRecord(projectData);
    const componentOrder = readPageSectionList(row.component_order).length
        ? readPageSectionList(row.component_order)
        : readPageSectionList(projectData.componentOrder);
    const sectionVisibility = Object.keys(readSectionVisibility(row.section_visibility)).length
        ? readSectionVisibility(row.section_visibility)
        : readSectionVisibility(projectData.sectionVisibility);
    const pages = readSitePages(row.pages).length
        ? readSitePages(row.pages)
        : readSitePages(projectData.pages);

    return {
        projectId,
        projectName: readDisplayText(row.name) || context?.project.projectName || projectId,
        row: cloneRecord(row),
        projectData,
        pageData,
        theme: readTheme(row, projectData),
        brandIdentity: readBrandIdentity(row, projectData),
        componentOrder,
        sectionVisibility,
        pages,
    };
};

const cloneProjectWebsiteColumns = (row: Record<string, unknown>): Record<string, unknown> => {
    const snapshot: Record<string, unknown> = {};
    ['data', 'component_order', 'section_visibility', 'pages', 'last_updated'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            snapshot[key] = cloneValue(row[key]);
        }
    });
    return snapshot;
};

const writeProjectWebsiteState = async (
    client: SupabaseClientLike,
    state: ProjectWebsiteState,
    next: Pick<ProjectWebsiteState, 'pageData' | 'componentOrder' | 'sectionVisibility' | 'pages'>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    options: { now: string; touchedSection?: string; syncAction: 'component_reorder' | 'section_visibility' | 'section_settings' },
) => {
    const businessBlueprint = syncWebsiteBlueprintFromEditor({
        businessBlueprint: migrateBusinessBlueprint(state.projectData.businessBlueprint),
        projectId: state.projectId,
        projectName: state.projectName,
        userId: action.userId || context?.actor.userId || undefined,
        data: next.pageData as PageData,
        theme: state.theme,
        brandIdentity: state.brandIdentity,
        componentOrder: next.componentOrder,
        sectionVisibility: next.sectionVisibility,
        pages: next.pages,
        touchedSection: options.touchedSection as PageSection | undefined,
        action: options.syncAction,
        now: options.now,
    });

    const assistantDrafts = {
        ...asRecord(state.projectData.assistantDrafts),
        website: {
            ...asRecord(asRecord(state.projectData.assistantDrafts).website),
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            lastActionType: action.actionType,
            lastActionId: action.id,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            updatedAt: options.now,
            metadata: buildBaseMetadata(input, action, context),
        },
    };

    const nextProjectData = {
        ...state.projectData,
        data: next.pageData,
        theme: state.theme,
        ...(state.brandIdentity ? { brandIdentity: state.brandIdentity } : {}),
        componentOrder: next.componentOrder,
        sectionVisibility: next.sectionVisibility,
        pages: next.pages,
        businessBlueprint,
        assistantDrafts,
        lastUpdated: options.now,
    };

    const patch = {
        data: nextProjectData,
        component_order: next.componentOrder,
        section_visibility: next.sectionVisibility,
        pages: next.pages.length > 0 ? next.pages : null,
        last_updated: options.now,
    };
    const result = await selectSingle(client.from('projects').update(patch).eq('id', state.projectId));
    if (result?.error) throw result.error;
    return {
        row: result?.data || { id: state.projectId, ...patch },
        patch,
    };
};

const createProjectWebsiteBeforeSnapshot = (state: ProjectWebsiteState): Record<string, unknown> => ({
    table: 'projects',
    id: state.projectId,
    projectId: state.projectId,
    row: cloneProjectWebsiteColumns(state.row),
});

const cloneProjectPublishColumns = (row: Record<string, unknown>): Record<string, unknown> => {
    const snapshot: Record<string, unknown> = {};
    ['status', 'published_at', 'published_data', 'last_updated', 'updated_at'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            snapshot[key] = cloneValue(row[key]);
        }
    });
    return snapshot;
};

const createProjectPublishBeforeSnapshot = (
    projectId: string,
    row: Record<string, unknown>,
): Record<string, unknown> => ({
    table: 'projects',
    id: projectId,
    projectId,
    row: cloneProjectPublishColumns(row),
});

const rollbackProjectWebsiteColumns = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const projectId = readString(before.projectId) || readString(before.id);
    const row = asRecord(before.row);
    if (!projectId || !Object.keys(row).length) {
        throw new Error('Cannot rollback website edit: previous project website columns were not recorded.');
    }
    const result = await selectSingle(getClient(deps).from('projects').update(row).eq('id', projectId));
    if (result?.error) throw result.error;
    return {
        afterSnapshot: {
            table: 'projects',
            id: projectId,
            restored: true,
            row: result?.data || { id: projectId, ...row },
        },
        diff: {
            restored: [`projects.${projectId}.website`],
        },
    };
};

const rollbackProjectPublishColumns = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const projectId = readString(before.projectId) || readString(before.id);
    const row = asRecord(before.row);
    if (!projectId || !Object.keys(row).length) {
        throw new Error('Cannot rollback website publish state: previous project publish columns were not recorded.');
    }
    const result = await selectSingle(getClient(deps).from('projects').update(row).eq('id', projectId));
    if (result?.error) throw result.error;
    return {
        afterSnapshot: {
            table: 'projects',
            id: projectId,
            projectId,
            restored: true,
            row: result?.data || { id: projectId, ...row },
        },
        diff: {
            restored: [`projects.${projectId}.publish_state`],
        },
    };
};

const rowBelongsToProjectStore = (row: Record<string, unknown>, projectId: string): boolean => {
    const ids = uniqueStringList([
        readString(row.project_id) || '',
        readString(row.projectId) || '',
        readString(row.store_id) || '',
        readString(row.storeId) || '',
        readString(row.public_store_id) || '',
        readString(row.publicStoreId) || '',
    ]);
    return ids.includes(projectId);
};

const readTableRows = async (
    client: SupabaseClientLike,
    table: string,
): Promise<Record<string, unknown>[]> => {
    const result = await client.from(table).select('*');
    if (result?.error) throw result.error;
    return asArray(result?.data).map(row => asRecord(row));
};

const collectPublishedEcommerceRows = async (
    client: SupabaseClientLike,
    projectId: string,
): Promise<{ products: Record<string, unknown>[]; categories: Record<string, unknown>[] }> => {
    const [productRows, categoryRows] = await Promise.all([
        readTableRows(client, 'store_products').catch(() => []),
        readTableRows(client, 'store_categories').catch(() => []),
    ]);

    const products = productRows
        .filter(row => rowBelongsToProjectStore(row, projectId))
        .filter(row => ['active', 'published', 'live'].includes(normalizeForSearch(readString(row.status) || '')))
        .map(row => ({
            id: readString(row.id),
            data: {
                ...asRecord(row.data),
                ...cloneRecord(row),
            },
        }));

    const categories = categoryRows
        .filter(row => rowBelongsToProjectStore(row, projectId))
        .map(row => ({
            id: readString(row.id),
            data: {
                ...asRecord(row.data),
                ...cloneRecord(row),
            },
        }));

    return { products, categories };
};

const postBelongsToProject = (
    row: Record<string, unknown>,
    projectId: string,
    tenantId?: string | null,
): boolean => {
    const status = normalizeForSearch(readString(row.status) || '');
    if (status !== 'published') return false;
    const rowTenantId = readString(row.tenant_id) || readString(row.tenantId);
    if (tenantId && rowTenantId && rowTenantId !== tenantId) return false;
    const tags = readStringList(row.tags);
    return tags.includes(`project:${projectId}`) || readString(row.project_id) === projectId || readString(row.projectId) === projectId;
};

const collectPublishedPostRows = async (
    client: SupabaseClientLike,
    projectId: string,
    tenantId?: string | null,
): Promise<Record<string, unknown>[]> => {
    const rows = await readTableRows(client, 'posts').catch(() => []);
    return rows
        .filter(row => postBelongsToProject(row, projectId, tenantId))
        .map(row => ({
            id: readString(row.id),
            data: cloneRecord(row),
        }));
};

const hasReviewMarker = (value: unknown): boolean => {
    const record = asRecord(value);
    if (!Object.keys(record).length) return false;
    return readBoolean(record.needsReview) === true
        || normalizeForSearch(readString(record.status) || '') === 'needs_review';
};

const collectWebsitePublishBlockers = (state: ProjectWebsiteState): string[] => {
    const blockers: string[] = [];
    const status = readString(state.row.status);
    if (status === 'Template') blockers.push('Template projects cannot be published as live websites.');

    const hasPageData = Object.keys(state.pageData).some(key => key !== 'businessBlueprint');
    const hasSections = state.componentOrder.length > 0 || state.pages.some(page => page.sections.length > 0);
    if (!hasPageData || !hasSections) {
        blockers.push('Website needs at least one configured page section before publish.');
    }

    if (state.componentOrder.length > 0 && state.componentOrder.every(section => state.sectionVisibility[section] === false)) {
        blockers.push('Website cannot publish with every section hidden.');
    }

    if (state.pages.length > 0 && !state.pages.some(page => page.isHomePage || page.slug === '/')) {
        blockers.push('Website needs a home page before publish.');
    }

    const assistantDrafts = asRecord(state.projectData.assistantDrafts);
    Object.entries(assistantDrafts).forEach(([key, draft]) => {
        if (hasReviewMarker(draft)) blockers.push(`Global Assistant ${key} draft still needs review.`);
    });

    const storefrontEditor = asRecord(state.pageData.storefrontEditor);
    if (hasReviewMarker(storefrontEditor)) {
        blockers.push('Storefront Builder draft still needs review before website publish.');
    }

    return Array.from(new Set(blockers));
};

const buildWebsitePublishedSnapshot = async (
    client: SupabaseClientLike,
    state: ProjectWebsiteState,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): Promise<{ snapshot: Record<string, unknown>; stats: Record<string, number> }> => {
    const tenantId = getTenantId(action, context) || readProjectTenantId(state.row) || null;
    const userId = action.userId || context?.actor.userId || readProjectUserId(state.row) || null;
    const ecommerce = await collectPublishedEcommerceRows(client, state.projectId);
    const posts = await collectPublishedPostRows(client, state.projectId, tenantId);
    const data = cloneRecord(state.pageData);

    const snapshot = {
        id: state.projectId,
        name: state.projectName,
        userId,
        tenantId,
        data,
        header: asRecord(data.header),
        footer: asRecord(data.footer),
        theme: state.theme,
        brandIdentity: state.brandIdentity || null,
        pages: state.pages,
        componentOrder: state.componentOrder,
        sectionVisibility: state.sectionVisibility,
        componentStatus: state.row.component_status || asRecord(state.projectData.componentStatus) || null,
        componentStyles: state.row.component_styles || state.projectData.componentStyles || defaultComponentStyles,
        menus: asArray(state.row.menus).length ? cloneValue(state.row.menus) : asArray(state.projectData.menus),
        categories: asArray(state.row.categories).length ? cloneValue(state.row.categories) : asArray(state.projectData.categories),
        seoConfig: state.row.seo_config || state.projectData.seoConfig || null,
        aiAssistantConfig: state.row.ai_assistant_config || state.projectData.aiAssistantConfig || null,
        designTokens: state.row.design_tokens || state.projectData.designTokens || null,
        responsiveStyles: state.row.responsive_styles || state.projectData.responsiveStyles || null,
        abTests: state.row.ab_tests || state.projectData.abTests || null,
        businessBlueprint: state.projectData.businessBlueprint || state.pageData.businessBlueprint || null,
        ecommerce,
        posts,
        publishedAt: now,
        updatedAt: now,
        sourceProjectId: state.projectId,
        faviconUrl: readString(state.row.favicon_url) || readString(state.projectData.faviconUrl) || null,
        thumbnailUrl: readString(state.row.thumbnail_url) || readString(state.projectData.thumbnailUrl) || null,
        globalAssistant: {
            publishedByAssistant: true,
            actionId: action.id,
            taskId: action.taskId || null,
            request: readString(input.request) || '',
            contextSnapshotId: context?.id || null,
        },
    };

    return {
        snapshot,
        stats: {
            productsPublished: ecommerce.products.length,
            categoriesPublished: ecommerce.categories.length,
            postsPublished: posts.length,
        },
    };
};

const createPublishWebsiteHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => ({
        valid: Boolean(readString(input.projectId)),
        errors: readString(input.projectId) ? [] : ['projectId is required before publishing a website.'],
    }),
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        assertProjectRowInAssistantScope(state.row, action, context);

        const blockers = collectWebsitePublishBlockers(state);
        if (blockers.length > 0) {
            throw new Error(`Website publish blocked: ${blockers.join(' ')}`);
        }

        const { snapshot: publishedData, stats } = await buildWebsitePublishedSnapshot(client, state, input, action, context, now);
        const patch = {
            published_data: publishedData,
            published_at: now,
            status: 'Published',
            last_updated: now,
        };
        const result = await selectSingle(client.from('projects').update(patch).eq('id', projectId));
        if (result?.error) throw result.error;
        const row = asRecord(result?.data);
        if (!readString(row.id)) throw new Error(`Project ${projectId} could not be published.`);

        return {
            beforeSnapshot: createProjectPublishBeforeSnapshot(projectId, state.row),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                status: 'Published',
                publishedAt: now,
                row,
                stats,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
            diff: {
                updated: [`projects.${projectId}.published_data`, `projects.${projectId}.published_at`, `projects.${projectId}.status`],
                critical: true,
                rollback: 'restore_previous_project_publish_state',
                stats,
            },
        };
    },
    rollback: rollbackProjectPublishColumns(deps),
});

const createUnpublishWebsiteHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => ({
        valid: Boolean(readString(input.projectId)),
        errors: readString(input.projectId) ? [] : ['projectId is required before unpublishing a website.'],
    }),
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        assertProjectRowInAssistantScope(state.row, action, context);

        const patch = {
            published_data: null,
            published_at: null,
            status: 'Draft',
            last_updated: now,
        };
        const result = await selectSingle(client.from('projects').update(patch).eq('id', projectId));
        if (result?.error) throw result.error;
        const row = asRecord(result?.data);
        if (!readString(row.id)) throw new Error(`Project ${projectId} could not be unpublished.`);

        return {
            beforeSnapshot: createProjectPublishBeforeSnapshot(projectId, state.row),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                status: 'Draft',
                publishedAt: null,
                row,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
            diff: {
                updated: [`projects.${projectId}.published_data`, `projects.${projectId}.published_at`, `projects.${projectId}.status`],
                critical: true,
                rollback: 'restore_previous_project_publish_state',
            },
        };
    },
    rollback: rollbackProjectPublishColumns(deps),
});

const dangerousPathSegments = new Set(['__proto__', 'prototype', 'constructor']);

const parseSafePath = (path: unknown): string[] => {
    const raw = readString(path);
    if (!raw) return [];
    return raw
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .map(segment => segment.trim())
        .filter(Boolean)
        .filter(segment => !dangerousPathSegments.has(segment));
};

const setDeepValue = (
    root: Record<string, unknown>,
    path: string[],
    value: unknown,
): Record<string, unknown> => {
    if (path.length === 0) return root;
    let cursor: any = root;
    path.forEach((segment, index) => {
        const isLast = index === path.length - 1;
        const nextSegment = path[index + 1];
        const key = Array.isArray(cursor) && /^\d+$/.test(segment) ? Number(segment) : segment;
        if (isLast) {
            cursor[key] = value;
            return;
        }
        const current = cursor[key];
        if (!current || typeof current !== 'object') {
            cursor[key] = /^\d+$/.test(nextSegment || '') ? [] : {};
        }
        cursor = cursor[key];
    });
    return root;
};

const mergeDeepRecords = (
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
): Record<string, unknown> => {
    const next = cloneRecord(base);
    Object.entries(patch).forEach(([key, value]) => {
        if (dangerousPathSegments.has(key)) return;
        const existing = asRecord(next[key]);
        const incoming = asRecord(value);
        next[key] = Object.keys(existing).length && Object.keys(incoming).length
            ? mergeDeepRecords(existing, incoming)
            : cloneValue(value);
    });
    return next;
};

const updatePageSectionData = (
    pages: SitePage[],
    sectionId: string,
    nextSectionData: Record<string, unknown>,
    now: string,
): SitePage[] => pages.map(page => {
    const sectionData = asRecord(page.sectionData);
    const shouldUpdate = page.sections.includes(sectionId as PageSection)
        || Object.prototype.hasOwnProperty.call(sectionData, sectionId);
    if (!shouldUpdate) return page;
    return {
        ...page,
        sectionData: {
            ...sectionData,
            [sectionId]: cloneRecord(nextSectionData),
        },
        updatedAt: now,
    };
});

const sortPageSectionsByOrder = (sections: PageSection[], order: PageSection[]): PageSection[] => {
    const indexBySection = new Map(order.map((section, index) => [section, index]));
    return [...sections].sort((left, right) => {
        const leftIndex = indexBySection.get(left);
        const rightIndex = indexBySection.get(right);
        if (leftIndex === undefined && rightIndex === undefined) return 0;
        if (leftIndex === undefined) return 1;
        if (rightIndex === undefined) return -1;
        return leftIndex - rightIndex;
    });
};

const createWebsiteSectionPatchHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    mode: 'merge' | 'copy',
): HandlerPatch => ({
    validate: input => {
        const sectionId = readString(input.sectionId);
        const path = parseSafePath(input.path);
        const changes = asRecord(input.changes);
        const errors = [
            ...(!sectionId ? ['sectionId is required before editing website sections.'] : []),
            ...(mode === 'copy' && path.length === 0 ? ['path is required before updating website copy.'] : []),
            ...(mode === 'copy' && input.value === undefined ? ['value is required before updating website copy.'] : []),
            ...(mode === 'merge' && Object.keys(changes).length === 0 ? ['changes are required before editing website sections.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const sectionId = readString(input.sectionId) || '';
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const pageData = cloneRecord(state.pageData);
        const currentSection = cloneRecord(asRecord(pageData[sectionId]));
        const nextSection = mode === 'copy'
            ? setDeepValue(currentSection, parseSafePath(input.path), input.value)
            : mergeDeepRecords(currentSection, asRecord(input.changes));
        pageData[sectionId] = nextSection;
        const pages = updatePageSectionData(state.pages, sectionId, nextSection, now);
        const persisted = await writeProjectWebsiteState(client, state, {
            pageData,
            componentOrder: state.componentOrder,
            sectionVisibility: state.sectionVisibility,
            pages,
        }, input, action, context, {
            now,
            touchedSection: sectionId,
            syncAction: 'section_settings',
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                sectionId,
                path: mode === 'copy' ? readString(input.path) : undefined,
            },
            diff: {
                updated: [`projects.${projectId}.data.${sectionId}`],
                reviewRequired: true,
                rollback: 'restore_previous_project_website_columns',
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const createToggleWebsiteSectionVisibilityHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const sectionId = readString(input.sectionId);
        const visible = readBoolean(input.visible);
        const errors = [
            ...(!sectionId ? ['sectionId is required before changing website section visibility.'] : []),
            ...(visible === undefined ? ['visible is required before changing website section visibility.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const sectionId = readString(input.sectionId) || '';
        const visible = readBoolean(input.visible);
        if (visible === undefined) throw new Error('visible is required before changing website section visibility.');
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const sectionVisibility = {
            ...state.sectionVisibility,
            [sectionId]: visible,
        } as Record<PageSection, boolean>;
        const persisted = await writeProjectWebsiteState(client, state, {
            pageData: state.pageData,
            componentOrder: state.componentOrder,
            sectionVisibility,
            pages: state.pages,
        }, input, action, context, {
            now,
            touchedSection: sectionId,
            syncAction: 'section_visibility',
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                sectionId,
                visible,
            },
            diff: {
                updated: [`projects.${projectId}.section_visibility.${sectionId}`],
                reviewRequired: true,
                rollback: 'restore_previous_project_website_columns',
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const createReorderWebsiteSectionsHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const newOrder = readPageSectionList(input.newOrder);
        const errors = newOrder.length > 0 ? [] : ['newOrder is required before reordering website sections.'];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const requestedOrder = readPageSectionList(input.newOrder);
        const componentOrder = uniqueStringList([
            ...requestedOrder,
            ...state.componentOrder.filter(section => !requestedOrder.includes(section)),
        ]) as PageSection[];
        const pages = state.pages.map(page => ({
            ...page,
            sections: sortPageSectionsByOrder(page.sections, componentOrder),
            updatedAt: now,
        }));
        const persisted = await writeProjectWebsiteState(client, state, {
            pageData: state.pageData,
            componentOrder,
            sectionVisibility: state.sectionVisibility,
            pages,
        }, input, action, context, {
            now,
            syncAction: 'component_reorder',
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                componentOrder,
            },
            diff: {
                updated: [`projects.${projectId}.component_order`, `projects.${projectId}.pages.sections`],
                reviewRequired: true,
                rollback: 'restore_previous_project_website_columns',
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

type StorefrontSectionSettingsMap = Record<StorefrontSectionKind, Record<string, unknown>>;

const PRODUCT_CARD_VARIANTS = new Set<ProductCardVariant>([
    'minimal',
    'modern',
    'elegant',
    'overlay',
    'luxury',
    'marketplace',
    'editorial',
    'compact',
    'imageFirst',
    'quickBuy',
    'fitness',
    'food',
    'fashion',
    'digital',
    'classic',
    'bordered',
]);

const readStorefrontSectionKind = (value: unknown): StorefrontSectionKind | undefined => {
    const section = readString(value);
    return isStorefrontSectionKind(section) ? section : undefined;
};

const readStorefrontSectionOrder = (value: unknown): StorefrontSectionKind[] =>
    readStringList(value).filter(isStorefrontSectionKind);

const readProductCardVariant = (value: unknown): ProductCardVariant | undefined => {
    const variant = readString(value) as ProductCardVariant | undefined;
    return variant && PRODUCT_CARD_VARIANTS.has(variant) ? variant : undefined;
};

const compactStorefrontSettings = (settings: Record<string, unknown>): Record<string, unknown> =>
    Object.entries(settings).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {});

const buildStorefrontProjectConfigInput = (state: ProjectWebsiteState) => ({
    data: state.projectData,
    componentOrder: state.componentOrder,
    sectionVisibility: state.sectionVisibility,
});

const getStorefrontDraftConfig = (state: ProjectWebsiteState) =>
    resolveStorefrontEditorConfig(buildStorefrontProjectConfigInput(state), { mode: 'draft' });

const normalizeStorefrontSettings = (
    sections: StorefrontSectionKind[],
    settings: Record<string, Record<string, unknown>>,
): StorefrontSectionSettingsMap =>
    sections.reduce<StorefrontSectionSettingsMap>((acc, section) => {
        acc[section] = compactStorefrontSettings({
            ...storefrontSectionRegistry[section].defaultSettings,
            ...asRecord(settings[section]),
        });
        return acc;
    }, {} as StorefrontSectionSettingsMap);

const storefrontDefaultVisibilityBySection = (): Record<string, boolean> =>
    STOREFRONT_SECTION_KINDS.reduce<Record<string, boolean>>((acc, section) => {
        acc[section] = storefrontSectionRegistry[section].defaultVisible ?? true;
        return acc;
    }, {});

const normalizeStorefrontVisibility = (
    sections: StorefrontSectionKind[],
    previousVisibility: Record<string, boolean>,
): Record<string, boolean> =>
    normalizeStorefrontSectionVisibility({
        sections,
        previousVisibility,
        defaultVisibleBySection: storefrontDefaultVisibilityBySection(),
        ensureAtLeastOneVisible: true,
        fallbackSection: sections.includes('featuredProducts') ? 'featuredProducts' : sections[0],
    });

const buildStorefrontEditorSnapshot = (
    sections: StorefrontSectionKind[],
    sectionSettings: StorefrontSectionSettingsMap,
    visibility: Record<string, boolean>,
    themeSettings: Record<string, unknown>,
    now: string,
): Record<string, unknown> => ({
    componentOrder: sections,
    sectionVisibility: sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section] = visibility[section] !== false;
        return acc;
    }, {}),
    themeSettings,
    sectionSettings,
    sections: sections.map((section, index) => ({
        id: `storefront-${section}`,
        type: section,
        order: index,
        enabled: visibility[section] !== false,
        settings: asRecord(sectionSettings[section]),
    })),
    state: 'draft',
    updatedAt: now,
});

const getStorefrontBlueprint = (state: ProjectWebsiteState) => {
    const blueprint = migrateBusinessBlueprint(state.projectData.businessBlueprint || state.pageData.businessBlueprint);
    return blueprint?.storefrontBlueprint ? blueprint : null;
};

const buildStorefrontBlueprintSections = (
    state: ProjectWebsiteState,
    sections: StorefrontSectionKind[],
    sectionSettings: StorefrontSectionSettingsMap,
    visibility: Record<string, boolean>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
) => {
    const existingSections = asArray(getStorefrontBlueprint(state)?.storefrontBlueprint.sections);
    return sections.map((section, index) => {
        const existing = asRecord(existingSections.find(item => asRecord(item).type === section));
        const settings = asRecord(sectionSettings[section]);
        const enabled = visibility[section] !== false && settings.enabled !== false;
        const validation = validateStorefrontSectionSettings(section, settings);
        const warnings = Array.from(new Set([
            ...validation.warnings,
            'Global Assistant storefront change needs review before publishing.',
        ]));

        return {
            ...existing,
            id: readString(existing.id) || `storefront-${section}`,
            type: section,
            order: index,
            enabled,
            status: enabled ? 'needs_review' : 'disabled',
            needsReview: true,
            generatedByAI: true,
            userModified: false,
            lockedFromRegeneration: false,
            readiness: {
                isReady: validation.valid,
                blockers: validation.errors,
                warnings,
            },
            settings,
            metadata: {
                ...asRecord(existing.metadata),
                generatedBy: 'ai',
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                userModified: false,
                lockedFromRegeneration: false,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                updatedAt: now,
                lastEditedAt: now,
                ...(action.userId || context?.actor.userId ? { lastEditedBy: action.userId || context?.actor.userId } : {}),
            },
            sourceMap: {
                ...asRecord(existing.sourceMap),
                ...assistantSourceMap(input, action, context),
                storefrontEditor: `storefrontEditor.draft.sections.${index}`,
            },
        };
    });
};

const buildNextStorefrontBusinessBlueprint = (
    state: ProjectWebsiteState,
    sections: StorefrontSectionKind[],
    sectionSettings: StorefrontSectionSettingsMap,
    visibility: Record<string, boolean>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
    options: { productCardVariant?: ProductCardVariant } = {},
) => {
    const businessBlueprint = getStorefrontBlueprint(state);
    if (!businessBlueprint?.storefrontBlueprint) return null;
    const storefrontBlueprint = businessBlueprint.storefrontBlueprint;

    return {
        ...businessBlueprint,
        updatedAt: now,
        lastSyncedAt: now,
        storefrontBlueprint: {
            ...storefrontBlueprint,
            enabled: true,
            status: 'needs_review',
            needsReview: true,
            sections: buildStorefrontBlueprintSections(state, sections, sectionSettings, visibility, input, action, context, now),
            ...(options.productCardVariant ? { productCardVariant: options.productCardVariant } : {}),
            metadata: {
                ...asRecord(storefrontBlueprint.metadata),
                generatedBy: 'ai',
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                userModified: false,
                lockedFromRegeneration: false,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                updatedAt: now,
                lastEditedAt: now,
                ...(action.userId || context?.actor.userId ? { lastEditedBy: action.userId || context?.actor.userId } : {}),
            },
            sourceMap: {
                ...asRecord(storefrontBlueprint.sourceMap),
                ...assistantSourceMap(input, action, context),
                storefrontEditor: 'storefrontEditor.draft',
            },
        },
    };
};

const writeProjectStorefrontState = async (
    client: SupabaseClientLike,
    state: ProjectWebsiteState,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    options: {
        sections: StorefrontSectionKind[];
        sectionSettings: StorefrontSectionSettingsMap;
        visibility: Record<string, boolean>;
        themeSettings: Record<string, unknown>;
        productCardVariant?: ProductCardVariant;
        now: string;
    },
) => {
    const hasNestedPageData = Object.keys(asRecord(state.projectData.data)).length > 0;
    const nextBusinessBlueprint = buildNextStorefrontBusinessBlueprint(
        state,
        options.sections,
        options.sectionSettings,
        options.visibility,
        input,
        action,
        context,
        options.now,
        { productCardVariant: options.productCardVariant },
    );
    const existingStorefrontEditor = asRecord(state.pageData.storefrontEditor);
    const draftSnapshot = buildStorefrontEditorSnapshot(
        options.sections,
        options.sectionSettings,
        options.visibility,
        options.themeSettings,
        options.now,
    );
    const nextStorefrontEditor = {
        ...existingStorefrontEditor,
        templateState: 'draft',
        previewMode: readString(input.previewMode) || readString(existingStorefrontEditor.previewMode) || 'store',
        sectionSettings: options.sectionSettings,
        draft: draftSnapshot,
        ...(asRecord(existingStorefrontEditor.published).componentOrder ? { published: existingStorefrontEditor.published } : {}),
        updatedAt: options.now,
        source: 'global-assistant',
        generatedByAI: true,
        needsReview: true,
        safeToEdit: true,
        metadata: {
            ...asRecord(existingStorefrontEditor.metadata),
            ...buildBaseMetadata(input, action, context),
        },
    };
    const nextPageData = options.sections.reduce<Record<string, unknown>>((acc, section) => {
        acc[section] = options.sectionSettings[section];
        return acc;
    }, {
        ...state.pageData,
        storefrontEditor: nextStorefrontEditor,
    });
    const assistantDrafts = {
        ...asRecord(state.projectData.assistantDrafts),
        storefront: {
            ...asRecord(asRecord(state.projectData.assistantDrafts).storefront),
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            noAutoPublish: true,
            lastActionType: action.actionType,
            lastActionId: action.id,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
            updatedAt: options.now,
            metadata: buildBaseMetadata(input, action, context),
        },
    };
    const nextProjectData = hasNestedPageData
        ? {
            ...state.projectData,
            ...(nextBusinessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
            data: nextPageData,
            assistantDrafts,
            lastUpdated: options.now,
        }
        : {
            ...nextPageData,
            ...(nextBusinessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
            assistantDrafts,
            lastUpdated: options.now,
        };

    const patch = {
        data: nextProjectData,
        last_updated: options.now,
    };
    const result = await client.from('projects').update(patch).eq('id', state.projectId);
    if (result?.error) throw result.error;
    return {
        row: result?.data || { id: state.projectId, ...patch },
        patch,
    };
};

const getStorefrontSectionsForEdit = (
    state: ProjectWebsiteState,
    preferredSection?: StorefrontSectionKind,
): StorefrontSectionKind[] => {
    const config = getStorefrontDraftConfig(state);
    const fromConfig = config.componentOrder.filter(isStorefrontSectionKind);
    const fromProject = state.componentOrder.filter(isStorefrontSectionKind);
    const base = fromConfig.length ? fromConfig : fromProject;
    return uniqueStringList([
        ...base,
        ...(preferredSection ? [preferredSection] : []),
        ...(base.length ? [] : ['featuredProducts', 'categoryGrid']),
    ]).filter(isStorefrontSectionKind);
};

const buildStorefrontEditState = (
    state: ProjectWebsiteState,
    preferredSection?: StorefrontSectionKind,
) => {
    const config = getStorefrontDraftConfig(state);
    const sections = getStorefrontSectionsForEdit(state, preferredSection);
    const sectionSettings = normalizeStorefrontSettings(sections, config.sectionSettings);
    const visibility = normalizeStorefrontVisibility(sections, config.sectionVisibility);
    const themeSettings = {
        ...DEFAULT_STOREFRONT_THEME,
        ...asRecord(config.themeSettings),
    };

    return { sections, sectionSettings, visibility, themeSettings };
};

const validateStorefrontSectionSet = (
    sections: StorefrontSectionKind[],
    sectionSettings: StorefrontSectionSettingsMap,
): string[] => sections.flatMap(section => {
    const validation = validateStorefrontSectionSettings(section, asRecord(sectionSettings[section]));
    return validation.errors.map(error => `${section}: ${error}`);
});

const createAddStorefrontSectionHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const section = readStorefrontSectionKind(input.sectionType);
        return {
            valid: Boolean(section),
            errors: section ? [] : ['sectionType must be a supported storefront section before adding it.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const section = readStorefrontSectionKind(input.sectionType);
        if (!section) throw new Error('sectionType must be a supported storefront section before adding it.');
        const state = await loadProjectWebsiteState(client, projectId, context);
        const now = getNow(deps);
        const draft = buildStorefrontEditState(state, section);
        const sectionData = {
            ...draft.sectionSettings[section],
            ...asRecord(input.data),
            enabled: true,
        };
        draft.sectionSettings[section] = compactStorefrontSettings(sectionData);
        draft.visibility[section] = true;
        const validationErrors = validateStorefrontSectionSet(draft.sections, draft.sectionSettings);
        if (validationErrors.length > 0) throw new Error(validationErrors.join(' '));
        const persisted = await writeProjectStorefrontState(client, state, input, action, context, {
            ...draft,
            now,
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                sectionType: section,
                row: persisted.row,
            },
            diff: {
                updated: [`projects.${projectId}.data.storefrontEditor.draft`, `projects.${projectId}.data.businessBlueprint.storefrontBlueprint.sections`],
                reviewRequired: true,
                rollback: 'restore_previous_project_storefront_columns',
                noAutoPublish: true,
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const createEditStorefrontThemeHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const updates = asRecord(input.updates);
        return {
            valid: Object.keys(updates).length > 0,
            errors: Object.keys(updates).length > 0 ? [] : ['updates are required before editing storefront theme.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const now = getNow(deps);
        const draft = buildStorefrontEditState(state);
        const themeSettings = compactStorefrontSettings({
            ...draft.themeSettings,
            ...asRecord(input.updates),
        }) as unknown as Record<string, unknown>;
        const validationErrors = validateStorefrontSectionSet(draft.sections, draft.sectionSettings);
        if (validationErrors.length > 0) throw new Error(validationErrors.join(' '));
        const persisted = await writeProjectStorefrontState(client, state, input, action, context, {
            ...draft,
            themeSettings,
            now,
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                themeSettings,
            },
            diff: {
                updated: [`projects.${projectId}.data.storefrontEditor.draft.themeSettings`],
                reviewRequired: true,
                rollback: 'restore_previous_project_storefront_columns',
                noAutoPublish: true,
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const createUpdateProductCardStyleHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const updates = asRecord(input.updates);
        const variant = readProductCardVariant(
            updates.productCardVariant || updates.cardStyle || updates.variant || input.productCardVariant || input.cardStyle,
        );
        return {
            valid: Boolean(variant),
            errors: variant ? [] : ['A supported product card variant is required before updating product-card presentation.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const updates = asRecord(input.updates);
        const variant = readProductCardVariant(
            updates.productCardVariant || updates.cardStyle || updates.variant || input.productCardVariant || input.cardStyle,
        );
        if (!variant) throw new Error('A supported product card variant is required before updating product-card presentation.');
        const state = await loadProjectWebsiteState(client, projectId, context);
        const now = getNow(deps);
        const draft = buildStorefrontEditState(state);
        const productCardSections = new Set<StorefrontSectionKind>(['featuredProducts', 'recentlyViewed', 'productBundle']);
        draft.sections.forEach(section => {
            if (!productCardSections.has(section)) return;
            draft.sectionSettings[section] = compactStorefrontSettings({
                ...draft.sectionSettings[section],
                cardStyle: variant,
                productCardVariant: variant,
                ...updates,
            });
        });
        const validationErrors = validateStorefrontSectionSet(draft.sections, draft.sectionSettings);
        if (validationErrors.length > 0) throw new Error(validationErrors.join(' '));
        const persisted = await writeProjectStorefrontState(client, state, input, action, context, {
            ...draft,
            productCardVariant: variant,
            now,
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                productCardVariant: variant,
            },
            diff: {
                updated: [
                    `projects.${projectId}.data.storefrontEditor.draft.sectionSettings`,
                    `projects.${projectId}.data.businessBlueprint.storefrontBlueprint.productCardVariant`,
                ],
                reviewRequired: true,
                rollback: 'restore_previous_project_storefront_columns',
                noAutoPublish: true,
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const createEmailCampaignHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const campaign = requireObject(input, 'campaign');
        const request = readString(input.request);
        const subject = readString(campaign.subject) || titleFromRequest(request, 'AI email campaign draft');
        const row = await createCampaignDraft({
            supabase: client,
            projectId,
            userId: action.userId,
            campaign: {
                ...campaign,
                name: readString(campaign.name) || subject,
                subject,
                previewText: readString(campaign.previewText) || readString(campaign.preview_text) || titleFromRequest(request, ''),
                htmlContent: readString(campaign.htmlContent) || readString(campaign.html_content) || (request ? `<p>${escapeHtml(request)}</p>` : ''),
                type: readString(campaign.type) || 'module_generated',
                audienceType: readString(campaign.audienceType) || readString(campaign.audience_type) || 'custom',
                tags: [...asArray(campaign.tags).map(String), 'global-assistant'],
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_email_campaign',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:email-campaign`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_campaigns', id, row },
            diff: { created: [`email_campaigns.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_campaigns', deps),
});

const createEmailAudienceHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const audience = requireObject(input, 'audience');
        const request = readString(input.request);
        const row = await createAudience({
            supabase: client,
            projectId,
            userId: action.userId,
            audience: {
                ...audience,
                name: readString(audience.name) || titleFromRequest(request, 'AI audience draft'),
                description: readString(audience.description) || request || null,
                tags: [...asArray(audience.tags).map(String), 'global-assistant'],
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_audience',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:audience`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_audiences', id, row },
            diff: { created: [`email_audiences.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_audiences', deps),
});

const createEmailAutomationHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const automation = requireObject(input, 'automation');
        const request = readString(input.request);
        const name = readString(automation.name) || titleFromRequest(request, 'AI automation draft');
        const row = await createAutomationDraft({
            supabase: client,
            projectId,
            userId: action.userId,
            automation: {
                ...automation,
                name,
                description: readString(automation.description) || request || null,
                subject: readString(automation.subject) || name,
                type: readString(automation.type) || 'welcome',
                category: readString(automation.category) || 'lifecycle',
                steps: asArray(automation.steps),
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sendMode: 'draft_only',
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_email_automation',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:automation`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_automations', id, row },
            diff: { created: [`email_automations.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_automations', deps),
});

const getContextEmailCampaignId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '');
    if (!context?.activeEntityId) return undefined;
    if (['email_campaign', 'email-campaign', 'campaign', 'email'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetEmailCampaignId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string | undefined => {
    const campaign = requireObject(input, 'campaign');
    const copy = requireObject(input, 'copy');
    return readString(input.campaignId)
        || readString(input.campaign_id)
        || readString(input.targetId)
        || readString(campaign.id)
        || readString(copy.campaignId)
        || readString(copy.campaign_id)
        || getContextEmailCampaignId(context);
};

const buildEmailCopyHtml = (input: {
    subject: string;
    previewText: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
}) => {
    const paragraphs = input.body
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
        .join('');
    const cta = input.ctaLabel
        ? `<p><a href="${escapeHtml(input.ctaUrl || '#')}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111827;color:#ffffff;text-decoration:none">${escapeHtml(input.ctaLabel)}</a></p>`
        : '';
    return [
        '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">',
        `<h1>${escapeHtml(input.subject)}</h1>`,
        input.previewText ? `<p style="color:#475467">${escapeHtml(input.previewText)}</p>` : '',
        paragraphs || `<p>${escapeHtml(input.subject)}</p>`,
        cta,
        '</div>',
    ].join('');
};

const deriveEmailSubjectFromRequest = (request: unknown): string | undefined => {
    const text = readString(request);
    if (!text) return undefined;
    const match = text.match(/\b(?:asunto|subject)\s+(.+)$/i);
    if (!match) return undefined;
    return titleFromRequest(match[1], '');
};

const buildEmailCopyDraft = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    existingCampaign?: Record<string, unknown> | null,
) => {
    const campaign = requireObject(input, 'campaign');
    const copy = requireObject(input, 'copy');
    const request = readString(input.request);
    const subject = readString(input.subject)
        || readString(copy.subject)
        || readString(campaign.subject)
        || deriveEmailSubjectFromRequest(request)
        || titleFromRequest(request, 'AI email copy draft');
    const previewText = readString(input.previewText)
        || readString(input.preview_text)
        || readString(copy.previewText)
        || readString(copy.preview_text)
        || readString(campaign.previewText)
        || readString(campaign.preview_text)
        || titleFromRequest(request, '');
    const body = readString(input.body)
        || readString(copy.body)
        || readString(copy.text)
        || readString(campaign.body)
        || readString(existingCampaign?.html_content)
        || request
        || subject;
    const ctaLabel = readString(input.ctaLabel)
        || readString(input.cta_label)
        || readString(copy.ctaLabel)
        || readString(copy.cta_label);
    const ctaUrl = readString(input.ctaUrl)
        || readString(input.cta_url)
        || readString(copy.ctaUrl)
        || readString(copy.cta_url);
    const htmlContent = readString(input.htmlContent)
        || readString(input.html_content)
        || readString(copy.htmlContent)
        || readString(copy.html_content)
        || buildEmailCopyHtml({ subject, previewText, body, ctaLabel, ctaUrl });
    const tags = Array.from(new Set([
        ...asArray(existingCampaign?.tags).map(String),
        ...asArray(campaign.tags).map(String),
        ...asArray(copy.tags).map(String),
        'global-assistant',
        'ai-copy',
    ].filter(Boolean)));
    const metadata = mergeAssistantMetadata(existingCampaign?.metadata, input, action, context);
    const emailDocument = {
        ...asRecord(existingCampaign?.email_document),
        ...asRecord(campaign.emailDocument || campaign.email_document),
        ...asRecord(copy.emailDocument || copy.email_document),
        subject,
        previewText,
        body,
        htmlContent,
        cta: ctaLabel ? { label: ctaLabel, url: ctaUrl || '#' } : undefined,
        status: 'needs_review',
        generatedByAI: true,
        needsReview: true,
        sourceMap: assistantSourceMap(input, action, context),
    };

    return {
        name: readString(input.name)
            || readString(campaign.name)
            || readString(existingCampaign?.name)
            || subject,
        subject,
        previewText,
        htmlContent,
        emailDocument,
        type: readString(input.type)
            || readString(campaign.type)
            || readString(existingCampaign?.type)
            || 'newsletter',
        audienceType: readString(input.audienceType)
            || readString(input.audience_type)
            || readString(campaign.audienceType)
            || readString(campaign.audience_type)
            || readString(existingCampaign?.audience_type)
            || 'all',
        audienceSegmentId: readString(input.audienceSegmentId)
            || readString(input.audience_segment_id)
            || readString(campaign.audienceSegmentId)
            || readString(campaign.audience_segment_id)
            || readString(existingCampaign?.audience_segment_id)
            || null,
        customRecipientEmails: asArray(input.customRecipientEmails ?? input.custom_recipient_emails ?? campaign.customRecipientEmails ?? campaign.custom_recipient_emails ?? existingCampaign?.custom_recipient_emails),
        tags,
        status: 'draft',
        generatedByAI: true,
        needsReview: true,
        safeToEdit: true,
        userModified: false,
        sourceModule: 'global-assistant',
        sourceComponent: 'OperatingLayer',
        sourceEvent: 'generate_email_copy',
        sourceEntityType: 'assistant_action',
        sourceEntityId: action.id,
        correlationId: action.id,
        idempotencyKey: `global-assistant:${action.id}:email-copy`,
        readiness: {
            ...asRecord(existingCampaign?.readiness),
            isReady: false,
            status: 'needs_review',
            blockers: [
                ...asArray(asRecord(existingCampaign?.readiness).blockers).map(String),
                'AI-generated email copy requires review before sending.',
            ],
        },
        metadata: {
            ...metadata,
            noAutoSend: true,
            sendMode: 'manual_send',
        },
    };
};

const generateEmailCopyHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const userId = getAssistantUserId(action, context);
        const campaignId = getTargetEmailCampaignId(input, context);
        const existingCampaign = campaignId
            ? asRecord(await loadCampaign(client, projectId, campaignId))
            : null;

        if (campaignId && !readString(existingCampaign?.id)) {
            throw new Error(`email_campaigns.${campaignId} was not found for project ${projectId}.`);
        }

        const draft = buildEmailCopyDraft(input, action, context, existingCampaign);
        if (campaignId && existingCampaign) {
            const previousRow = cloneRecord(existingCampaign);
            const row = await updateCampaign({
                supabase: client,
                projectId,
                campaignId,
                updates: {
                    ...draft,
                    status: 'draft',
                    generatedByAI: true,
                    needsReview: true,
                    safeToEdit: true,
                    approved_at: null,
                    approved_by: null,
                    scheduledAt: null,
                    sent_at: null,
                },
            });
            return {
                beforeSnapshot: { table: 'email_campaigns', id: campaignId, projectId, row: previousRow, mode: 'update' },
                afterSnapshot: { table: 'email_campaigns', id: campaignId, projectId, row },
                diff: {
                    updated: [
                        `email_campaigns.${campaignId}.subject`,
                        `email_campaigns.${campaignId}.preview_text`,
                        `email_campaigns.${campaignId}.html_content`,
                        `email_campaigns.${campaignId}.email_document`,
                    ],
                    reviewRequired: true,
                    noAutoSend: true,
                    rollback: 'restore_previous_email_campaign_snapshot',
                },
            };
        }

        const row = await createCampaignDraft({
            supabase: client,
            projectId,
            userId,
            campaign: draft,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            beforeSnapshot: { table: 'email_campaigns', projectId, mode: 'create' },
            afterSnapshot: { table: 'email_campaigns', id, projectId, row },
            diff: {
                created: [`email_campaigns.${id}`],
                reviewRequired: true,
                noAutoSend: true,
                rollback: 'delete_created_email_copy_draft',
            },
        };
    },
    rollback: async (_input, { snapshot }) => {
        const before = asRecord(snapshot.beforeSnapshot);
        const mode = readString(before.mode);
        const projectId = readString(before.projectId);
        const id = getSnapshotRowId(snapshot);
        if (mode === 'create') {
            if (!id) throw new Error('Cannot rollback email copy draft: created campaign id was not recorded.');
            const result = await deleteRowById(getClient(deps), 'email_campaigns', id);
            return {
                afterSnapshot: {
                    ...snapshot.beforeSnapshot,
                    rollback: result,
                },
                diff: {
                    deleted: [`email_campaigns.${id}`],
                },
            };
        }

        const row = asRecord(before.row);
        const campaignId = readString(before.id) || readString(row.id);
        if (!projectId || !campaignId || !Object.keys(row).length) {
            throw new Error('Cannot rollback email copy draft: previous campaign snapshot was not recorded.');
        }
        const { id: _id, project_id: _projectId, store_id: _storeId, ...restorePatch } = row;
        const restored = await updateCampaign({
            supabase: getClient(deps),
            projectId,
            campaignId,
            updates: restorePatch,
        });
        return {
            afterSnapshot: {
                table: 'email_campaigns',
                id: campaignId,
                projectId,
                row: restored,
                restored: true,
            },
            diff: {
                restored: [`email_campaigns.${campaignId}`],
            },
        };
    },
});

const createLeadHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const lead = requireObject(input, 'lead');
        const request = readString(input.request);
        const now = getNow(deps);
        const name = readString(lead.name) || titleFromRequest(request, 'AI lead draft');
        const customerRequestSummary = buildCustomerRequestSummary(
            input,
            action,
            context,
            readString(lead.notes) || readString(lead.message) || request || name,
        );
        const row = await insertRow(client, 'leads', {
            tenant_id: tenantId,
            project_id: projectId,
            name,
            email: readString(lead.email) || '',
            phone: readString(lead.phone) || null,
            company: readString(lead.company) || null,
            source: 'quimera-chat',
            status: readString(lead.status) || 'new',
            value: readNumber(lead.value) ?? 0,
            notes: readString(lead.notes) || customerRequestSummary || request || '',
            tags: [...asArray(lead.tags).map(String), 'global-assistant'],
            custom_data: {
                ...asRecord(lead.customData || lead.custom_data),
                ...buildBaseMetadata(input, action, context),
                customerRequest: request || readString(lead.message) || null,
                customerRequestSummary,
                needsReview: true,
            },
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'leads', id, row },
            diff: { created: [`leads.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('leads', deps),
});

const leadStatuses = new Set(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost']);

const normalizeLeadStatus = (value: unknown): string | undefined => {
    const status = readString(value);
    if (!status) return undefined;
    if (leadStatuses.has(status)) return status;
    if (status === 'converted' || status === 'closed') return 'won';
    if (status === 'showing_scheduled') return 'qualified';
    if (status === 'offer_made') return 'negotiation';
    return 'new';
};

const getContextLeadId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '');
    if (!context?.activeEntityId) return undefined;
    if (['lead', 'crm_lead', 'crm-lead'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetLeadId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const task = requireObject(input, 'task');
    const lead = requireObject(input, 'lead');
    const leadId = readString(input.leadId)
        || readString(input.lead_id)
        || readString(input.targetId)
        || readString(updates.leadId)
        || readString(updates.lead_id)
        || readString(task.leadId)
        || readString(task.lead_id)
        || readString(lead.id)
        || getContextLeadId(context);
    if (!leadId) throw new Error('leadId is required or the active context must point to a CRM lead.');
    return leadId;
};

const readLeadRows = async (
    client: SupabaseClientLike,
    projectId: string,
): Promise<Record<string, unknown>[]> => {
    let query = client.from('leads').select('*').eq('project_id', projectId);
    if (typeof query.limit === 'function') query = query.limit(100);
    const result = await query;
    if (result?.error) throw result.error;
    return asArray(result?.data).map(asRecord).map(cloneRecord);
};

const readLeadRelatedRows = async (
    client: SupabaseClientLike,
    table: 'lead_tasks' | 'lead_activities',
    projectId: string,
): Promise<Record<string, unknown>[]> => {
    let query = client.from(table).select('*').eq('project_id', projectId);
    if (typeof query.limit === 'function') query = query.limit(100);
    const result = await query;
    if (result?.error) throw result.error;
    return asArray(result?.data).map(asRecord).map(cloneRecord);
};

const leadSearchText = (lead: Record<string, unknown>): string => [
    readString(lead.name),
    readString(lead.email),
    readString(lead.phone),
    readString(lead.company),
    readString(lead.source),
    readString(lead.status),
    readString(lead.notes),
    ...asArray(lead.tags).map(String),
].filter(Boolean).join(' ');

const deriveLeadSearchQuery = (input: Record<string, unknown>): string => {
    const explicit = readString(input.query);
    if (explicit) return explicit;
    const request = readString(input.request) || '';
    return request
        .replace(/\b(busca|buscar|search|encuentra|find|lead|leads|crm|prospecto|prospectos|en|el|la|los|las|de|del|por|para)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || request;
};

const countLeadRowsBy = (
    rows: Record<string, unknown>[],
    field: string,
): Record<string, number> => rows.reduce<Record<string, number>>((acc, row) => {
    const value = readString(row[field]) || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
}, {});

const searchLeadsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const query = deriveLeadSearchQuery(input);
        const normalizedQuery = normalizeForSearch(query);
        const leads = await readLeadRows(client, projectId);
        const matches = normalizedQuery
            ? leads.filter(lead => normalizeForSearch(leadSearchText(lead)).includes(normalizedQuery))
            : leads;
        const sample = matches.slice(0, 10).map(lead => ({
            id: readString(lead.id),
            name: readString(lead.name),
            email: readString(lead.email),
            phone: readString(lead.phone),
            company: readString(lead.company),
            status: readString(lead.status),
            source: readString(lead.source),
            value: readNumber(lead.value) ?? 0,
            tags: asArray(lead.tags).map(String),
        }));

        return {
            afterSnapshot: {
                kind: 'lead_search',
                table: 'leads',
                projectId,
                query,
                totalScanned: leads.length,
                matchCount: matches.length,
                matches: sample,
                generatedAt: getNow(deps),
            },
            diff: {
                searched: [`leads.${projectId}`],
                mutatesData: false,
            },
        };
    },
});

const summarizeLeadsHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const [leads, tasks, activities] = await Promise.all([
            readLeadRows(client, projectId),
            readLeadRelatedRows(client, 'lead_tasks', projectId),
            readLeadRelatedRows(client, 'lead_activities', projectId),
        ]);
        const totalValue = leads.reduce((sum, lead) => sum + (readNumber(lead.value) ?? 0), 0);
        const openTasks = tasks.filter(task => {
            const status = readString(task.status);
            return task.is_completed !== true && status !== 'completed' && status !== 'done';
        });

        return {
            afterSnapshot: {
                kind: 'lead_summary',
                projectId,
                generatedAt: getNow(deps),
                summary: {
                    totalLeads: leads.length,
                    totalValue,
                    openTasks: openTasks.length,
                    activityCount: activities.length,
                    byStatus: countLeadRowsBy(leads, 'status'),
                    bySource: countLeadRowsBy(leads, 'source'),
                    sampleLeadIds: leads.slice(0, 10).map(lead => readString(lead.id)).filter(Boolean),
                },
                modules: {
                    leads: { table: 'leads', count: leads.length },
                    tasks: { table: 'lead_tasks', count: tasks.length, openCount: openTasks.length },
                    activities: { table: 'lead_activities', count: activities.length },
                },
            },
            diff: {
                summarized: [`leads.${projectId}`],
                mutatesData: false,
            },
        };
    },
});

const readLeadTextUpdate = (updates: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
        const value = readString(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const readLeadNumberUpdate = (updates: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const key of keys) {
        const value = readNumber(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const buildLeadUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const customData = asRecord(currentRow.custom_data);
    const nextCustomData: Record<string, unknown> = {
        ...customData,
        metadata: mergeAssistantMetadata(asRecord(customData.metadata), input, action, context),
        globalAssistant: {
            ...asRecord(customData.globalAssistant),
            ...asRecord(buildBaseMetadata(input, action, context).globalAssistant),
        },
    };
    const patch: Record<string, unknown> = {
        updated_at: now,
    };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };
    const setCustomValue = (key: string, value: unknown) => {
        nextCustomData[key] = value;
        changedFields.push(`custom_data.${key}`);
    };

    const name = readLeadTextUpdate(updates, ['name', 'nombre']);
    if (name !== undefined) setValue('name', name);
    const email = readLeadTextUpdate(updates, ['email', 'correo']);
    if (email !== undefined) setValue('email', email);
    const phone = readLeadTextUpdate(updates, ['phone', 'telefono', 'teléfono']);
    if (phone !== undefined) setValue('phone', phone || null);
    const company = readLeadTextUpdate(updates, ['company', 'empresa']);
    if (company !== undefined) setValue('company', company || null);
    const source = readLeadTextUpdate(updates, ['source', 'fuente']);
    if (source !== undefined) setValue('source', source || 'manual');
    const status = normalizeLeadStatus(updates.status ?? updates.estado);
    if (status !== undefined) setValue('status', status);
    const value = readLeadNumberUpdate(updates, ['value', 'valor']);
    if (value !== undefined) setValue('value', value);
    const notes = readLeadTextUpdate(updates, ['notes', 'notas']);
    if (notes !== undefined) setValue('notes', notes);
    if (Array.isArray(updates.tags)) setValue('tags', updates.tags.map(String));

    const customStringKeys = [
        'jobTitle',
        'industry',
        'website',
        'linkedIn',
        'message',
        'aiSummary',
        'aiAnalysis',
        'recommendedAction',
    ];
    customStringKeys.forEach(key => {
        const value = readString(updates[key]);
        if (value !== undefined) setCustomValue(key, value);
    });
    const probability = readNumber(updates.probability);
    if (probability !== undefined) setCustomValue('probability', probability);
    const leadScore = readNumber(updates.leadScore);
    if (leadScore !== undefined) setCustomValue('leadScore', leadScore);
    const aiScore = readNumber(updates.aiScore);
    if (aiScore !== undefined) setCustomValue('aiScore', aiScore);
    if (updates.customFields !== undefined) setCustomValue('customFields', asArray(updates.customFields));
    const customerRequestSummary = buildCustomerRequestSummary(input, action, context, notes);
    if (customerRequestSummary) {
        setCustomValue('customerRequestSummary', customerRequestSummary);
        setCustomValue('customerRequest', readString(input.request) || readString(updates.message) || readString(updates.notes) || null);
    }

    patch.custom_data = nextCustomData;
    return { patch, changedFields: Array.from(new Set(changedFields)) };
};

const deriveLeadUpdatesFromRequest = (request: unknown): Record<string, unknown> => {
    const text = normalizeForSearch(readString(request) || '');
    const updates: Record<string, unknown> = {};
    if (!text) return updates;
    if (/\b(contacted|contactado|contactada)\b/.test(text)) updates.status = 'contacted';
    if (/\b(qualified|calificado|calificada|cualificado|cualificada)\b/.test(text)) updates.status = 'qualified';
    if (/\b(negotiation|negociacion|negociación)\b/.test(text)) updates.status = 'negotiation';
    if (/\b(won|ganado|ganada|convertido|convertida|closed)\b/.test(text)) updates.status = 'won';
    if (/\b(lost|perdido|perdida)\b/.test(text)) updates.status = 'lost';
    const value = readRequestNumberNear(request, ['valor', 'value']);
    if (value !== undefined) updates.value = value;
    return updates;
};

const updateLeadHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const leadId = getTargetLeadId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'leads', projectId, leadId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...deriveLeadUpdatesFromRequest(input.request),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'leadUpdates'),
        };
        const { patch, changedFields } = buildLeadUpdatePatch(currentRow, updates, input, action, context, now);
        if (changedFields.length === 0) {
            const currentCustomData = asRecord(currentRow.custom_data);
            patch.custom_data = {
                ...currentCustomData,
                assistantDrafts: {
                    ...asRecord(currentCustomData.assistantDrafts),
                    leadUpdate: {
                        prompt: readString(input.request) || 'AI lead update draft',
                        status: 'needs_review',
                        generatedAt: now,
                        generatedByAI: true,
                        needsReview: true,
                    },
                },
                globalAssistant: {
                    ...asRecord(currentCustomData.globalAssistant),
                    ...asRecord(buildBaseMetadata(input, action, context).globalAssistant),
                },
            };
            changedFields.push('custom_data.assistantDrafts.leadUpdate');
        }
        const row = await updateProjectScopedRow(client, 'leads', projectId, leadId, patch);
        return {
            beforeSnapshot: { table: 'leads', id: leadId, projectId, row: previousRow },
            afterSnapshot: { table: 'leads', id: leadId, projectId, row },
            diff: {
                updated: changedFields.map(field => `leads.${leadId}.${field}`),
                reviewRequired: true,
                rollback: 'restore_previous_lead_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('leads', deps),
});

const createFollowUpTaskHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getRequiredTenantId(action, context);
        const leadId = getTargetLeadId(input, context);
        await loadProjectScopedRow(client, 'leads', projectId, leadId);
        const task = requireObject(input, 'task');
        const request = readString(input.request);
        const now = getNow(deps);
        const dueDate = readString(task.dueDate ?? task.due_date) || null;
        const title = readString(task.title) || titleFromRequest(request, 'AI follow-up task');
        const row = await insertRow(client, 'lead_tasks', {
            tenant_id: tenantId,
            project_id: projectId,
            lead_id: leadId,
            title,
            description: readString(task.description) || request || '',
            due_date: dueDate,
            status: readString(task.status) || 'open',
            is_completed: false,
            metadata: {
                ...asRecord(task.metadata),
                ...buildBaseMetadata(input, action, context),
                assignedTo: readString(task.assignedTo ?? task.assigned_to) || action.userId || context?.actor.userId || null,
                priority: readString(task.priority) || 'medium',
                generatedByAI: true,
                needsReview: true,
            },
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'lead_tasks', id, leadId, row },
            diff: { created: [`lead_tasks.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('lead_tasks', deps),
});

const readRequestNumberNear = (request: unknown, terms: string[]): number | undefined => {
    const text = normalizeForSearch(readString(request) || '');
    if (!text) return undefined;
    const findNumber = (source: string): number | undefined => {
        const match = source.match(/\$?\s*(-?\d+(?:[.,]\d+)?)/);
        if (!match) return undefined;
        return readNumber(match[1].replace(',', '.'));
    };

    for (const term of terms) {
        const index = text.indexOf(term);
        if (index === -1) continue;
        const parsed = findNumber(text.slice(index + term.length));
        if (parsed !== undefined) return parsed;
    }

    return findNumber(text);
};

const getContextProductId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '');
    if (!context?.activeEntityId) return undefined;
    if (['product', 'store_product', 'ecommerce_product', 'store-products'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetProductId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const product = requireObject(input, 'product');
    const productId = readString(input.productId)
        || readString(input.product_id)
        || readString(input.targetId)
        || readString(updates.productId)
        || readString(updates.product_id)
        || readString(product.id)
        || getContextProductId(context);
    if (!productId) throw new Error('productId is required or the active context must point to an ecommerce product.');
    return productId;
};

const mergeAssistantMetadata = (
    existing: unknown,
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => {
    const current = asRecord(existing);
    const currentGlobal = asRecord(current.globalAssistant);
    const base = buildBaseMetadata(input, action, context);
    return {
        ...current,
        ...base,
        globalAssistant: {
            ...currentGlobal,
            ...asRecord(base.globalAssistant),
        },
    };
};

const buildCustomerRequestSummary = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
    fallback?: string,
): string => {
    const request = readString(input.request)
        || readString(input.message)
        || readString(input.customerRequest)
        || fallback
        || '';
    if (!request) return '';
    const lines = [
        'Customer request / Solicitud del cliente:',
        request,
        '',
        `Action / Accion: ${action.actionType}`,
        `Module / Modulo: ${action.module}`,
        `Project / Proyecto: ${action.projectId || context?.project.projectId || ''}`,
    ];
    const activeEntity = [
        readString(context?.activeEntityType),
        readString(context?.activeEntityId),
    ].filter(Boolean).join(':');
    if (activeEntity) lines.push(`Context / Contexto: ${activeEntity}`);
    return lines.filter(Boolean).join('\n').slice(0, 6000);
};

const readProductTextUpdate = (updates: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
        const value = readString(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const readProductNumberUpdate = (updates: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const key of keys) {
        const value = readNumber(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const readProductBooleanUpdate = (updates: Record<string, unknown>, keys: string[]): boolean | undefined => {
    for (const key of keys) {
        const value = readBoolean(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const buildProductUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const currentData = asRecord(currentRow.data);
    const nextData: Record<string, unknown> = {
        ...currentData,
        updatedAt: now,
        updated_at: now,
        metadata: mergeAssistantMetadata(currentData.metadata, input, action, context),
    };
    const patch: Record<string, unknown> = {
        updated_at: now,
    };
    const changedFields: string[] = [];
    const setValue = (column: string, dataKey: string, value: unknown) => {
        patch[column] = value;
        nextData[dataKey] = value;
        changedFields.push(column);
    };

    const name = readProductTextUpdate(updates, ['name', 'nombre', 'title', 'titulo']);
    if (name !== undefined) {
        setValue('name', 'name', name);
        setValue('slug', 'slug', readString(updates.slug) || slugify(name));
    }

    const description = readProductTextUpdate(updates, ['description', 'descripcion']);
    if (description !== undefined) setValue('description', 'description', description);

    const shortDescription = readProductTextUpdate(updates, ['shortDescription', 'short_description', 'resumen']);
    if (shortDescription !== undefined) {
        setValue('short_description', 'shortDescription', shortDescription);
        nextData.short_description = shortDescription;
    }

    const price = readProductNumberUpdate(updates, ['price', 'precio']);
    if (price !== undefined) setValue('price', 'price', price);

    const compareAtPrice = readProductNumberUpdate(updates, ['compareAtPrice', 'compare_at_price', 'precioComparacion']);
    if (compareAtPrice !== undefined) {
        setValue('compare_at_price', 'compareAtPrice', compareAtPrice);
        nextData.compare_at_price = compareAtPrice;
    }

    const costPrice = readProductNumberUpdate(updates, ['costPrice', 'cost_price', 'cost']);
    if (costPrice !== undefined) {
        setValue('cost_price', 'costPrice', costPrice);
        nextData.cost_price = costPrice;
    }

    const currency = readProductTextUpdate(updates, ['currency', 'moneda']);
    if (currency !== undefined) setValue('currency', 'currency', currency.toUpperCase());

    const sku = readProductTextUpdate(updates, ['sku']);
    if (sku !== undefined) setValue('sku', 'sku', sku);

    const barcode = readProductTextUpdate(updates, ['barcode', 'codigoBarras']);
    if (barcode !== undefined) setValue('barcode', 'barcode', barcode);

    const quantity = readProductNumberUpdate(updates, ['quantity', 'inventory_quantity', 'inventoryQuantity', 'inventario', 'stock']);
    if (quantity !== undefined) {
        setValue('quantity', 'quantity', quantity);
        patch.inventory_quantity = quantity;
        nextData.inventory_quantity = quantity;
        nextData.inventoryQuantity = quantity;
        changedFields.push('inventory_quantity');
    }

    const trackInventory = readProductBooleanUpdate(updates, ['trackInventory', 'track_inventory']);
    if (trackInventory !== undefined) {
        setValue('track_inventory', 'trackInventory', trackInventory);
        nextData.track_inventory = trackInventory;
    }

    const lowStockThreshold = readProductNumberUpdate(updates, ['lowStockThreshold', 'low_stock_threshold']);
    if (lowStockThreshold !== undefined) {
        setValue('low_stock_threshold', 'lowStockThreshold', lowStockThreshold);
        nextData.low_stock_threshold = lowStockThreshold;
    }

    if (Array.isArray(updates.images)) setValue('images', 'images', updates.images);
    if (Array.isArray(updates.tags)) setValue('tags', 'tags', updates.tags.map(String));
    if (Array.isArray(updates.variants)) setValue('variants', 'variants', updates.variants);
    if (Array.isArray(updates.options)) setValue('options', 'options', updates.options);

    const hasVariants = readProductBooleanUpdate(updates, ['hasVariants', 'has_variants']);
    if (hasVariants !== undefined) {
        setValue('has_variants', 'hasVariants', hasVariants);
        nextData.has_variants = hasVariants;
    }

    const isDigital = readProductBooleanUpdate(updates, ['isDigital', 'is_digital']);
    if (isDigital !== undefined) {
        setValue('is_digital', 'isDigital', isDigital);
        nextData.is_digital = isDigital;
    }

    const isFeatured = readProductBooleanUpdate(updates, ['isFeatured', 'is_featured']);
    if (isFeatured !== undefined) {
        setValue('is_featured', 'isFeatured', isFeatured);
        nextData.is_featured = isFeatured;
    }

    const weight = readProductNumberUpdate(updates, ['weight', 'peso']);
    if (weight !== undefined) setValue('weight', 'weight', weight);

    const weightUnit = readProductTextUpdate(updates, ['weightUnit', 'weight_unit']);
    if (weightUnit !== undefined) {
        setValue('weight_unit', 'weightUnit', weightUnit);
        nextData.weight_unit = weightUnit;
    }

    const categoryId = readProductTextUpdate(updates, ['categoryId', 'category_id', 'categoriaId']);
    if (categoryId !== undefined) {
        setValue('category_id', 'categoryId', categoryId || null);
        nextData.category_id = categoryId || null;
    }

    const status = readProductTextUpdate(updates, ['status', 'estado']);
    if (status && ['active', 'draft', 'archived'].includes(status)) setValue('status', 'status', status);

    patch.data = nextData;
    return { patch, changedFields: Array.from(new Set(changedFields)) };
};

const createProductHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const product = requireObject(input, 'product');
        const request = readString(input.request);
        const now = getNow(deps);
        const name = readString(product.name) || titleFromRequest(request, 'AI product draft');
        const explicitId = readString(product.id);
        const generatedDraftId = explicitId || (deps.createId || createId)('prod');
        const slug = readString(product.slug) || slugify(name);
        const price = readNumber(product.price) ?? readRequestNumberNear(request, ['precio', 'price']) ?? 0;
        const quantity = readNumber(product.quantity) ?? readNumber(product.inventory_quantity) ?? 0;
        const currency = readString(product.currency) || 'USD';
        const data = {
            ...product,
            id: explicitId || generatedDraftId,
            project_id: projectId,
            projectId,
            store_id: projectId,
            storeId: projectId,
            name,
            slug,
            description: readString(product.description) || request || '',
            price,
            currency,
            quantity,
            inventory_quantity: quantity,
            inventoryQuantity: quantity,
            trackInventory: product.trackInventory !== false,
            track_inventory: product.trackInventory !== false,
            images: asArray(product.images),
            status: 'draft',
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            metadata: buildBaseMetadata(input, action, context),
            createdAt: now,
            updatedAt: now,
        };
        const row = await insertRow(client, 'store_products', {
            ...(isUuid(explicitId) ? { id: explicitId } : {}),
            store_id: projectId,
            project_id: projectId,
            name,
            slug,
            description: data.description,
            price,
            currency,
            quantity,
            inventory_quantity: quantity,
            track_inventory: data.track_inventory,
            images: data.images,
            status: 'draft',
            data,
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || explicitId || generatedDraftId;
        return {
            afterSnapshot: { table: 'store_products', id, row },
            diff: { created: [`store_products.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('store_products', deps),
});

const editProductHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const productId = getTargetProductId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'store_products', projectId, productId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'productUpdates'),
        };
        const { patch, changedFields } = buildProductUpdatePatch(currentRow, updates, input, action, context, now);

        if (changedFields.length === 0) {
            const currentData = asRecord(currentRow.data);
            patch.data = {
                ...currentData,
                assistantDrafts: {
                    ...asRecord(currentData.assistantDrafts),
                    productEdit: {
                        prompt: readString(input.request) || 'AI product edit draft',
                        status: 'needs_review',
                        generatedAt: now,
                        generatedByAI: true,
                        needsReview: true,
                        noAutoPublish: true,
                    },
                },
                metadata: mergeAssistantMetadata(currentData.metadata, input, action, context),
                updatedAt: now,
                updated_at: now,
            };
            changedFields.push('data.assistantDrafts.productEdit');
        }

        const row = await updateProjectScopedRow(client, 'store_products', projectId, productId, patch);
        return {
            beforeSnapshot: { table: 'store_products', id: productId, projectId, row: previousRow },
            afterSnapshot: { table: 'store_products', id: productId, projectId, row },
            diff: { updated: changedFields.map(field => `store_products.${productId}.${field}`), reviewRequired: true },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('store_products', deps),
});

const createCategoryHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const category = {
            ...requireObject(input, 'category'),
            ...requireObject(input, 'data'),
        };
        const request = readString(input.request);
        const now = getNow(deps);
        const name = readString(input.name) || readString(category.name) || titleFromRequest(request, 'AI category draft');
        const slug = readString(input.slug) || readString(category.slug) || slugify(name);
        const position = readNumber(input.position ?? category.position) ?? 0;
        const row = await insertRow(client, 'store_categories', {
            ...(isUuid(readString(category.id)) ? { id: readString(category.id) } : {}),
            project_id: projectId,
            store_id: projectId,
            name,
            slug,
            description: readString(input.description) || readString(category.description) || request || null,
            image_url: readString(category.imageUrl ?? category.image_url) || null,
            parent_id: readString(category.parentId ?? category.parent_id) || null,
            position,
            data: {
                ...category,
                project_id: projectId,
                store_id: projectId,
                name,
                slug,
                position,
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                metadata: buildBaseMetadata(input, action, context),
            },
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'store_categories', id, row },
            diff: { created: [`store_categories.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('store_categories', deps),
});

const updateProductPriceHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const price = readNumber(input.price) ?? readRequestNumberNear(input.request, ['precio', 'price']);
        return {
            valid: price !== undefined && price >= 0,
            errors: price !== undefined && price >= 0 ? [] : ['A non-negative price is required before updating product pricing.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const productId = getTargetProductId(input, context);
        const price = readNumber(input.price) ?? readRequestNumberNear(input.request, ['precio', 'price']);
        if (price === undefined || price < 0) throw new Error('A non-negative price is required before updating product pricing.');
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'store_products', projectId, productId);
        const previousRow = cloneRecord(currentRow);
        const currency = (readString(input.currency) || readString(asRecord(currentRow.data).currency) || readString(currentRow.currency) || 'USD').toUpperCase();
        const { patch, changedFields } = buildProductUpdatePatch(currentRow, { price, currency }, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'store_products', projectId, productId, patch);
        return {
            beforeSnapshot: { table: 'store_products', id: productId, projectId, row: previousRow },
            afterSnapshot: { table: 'store_products', id: productId, projectId, row },
            diff: {
                updated: changedFields.map(field => `store_products.${productId}.${field}`),
                critical: true,
                rollback: 'restore_previous_product_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('store_products', deps),
});

const updateProductInventoryHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const quantity = readNumber(input.quantity) ?? readRequestNumberNear(input.request, ['inventario', 'inventory', 'stock', 'cantidad']);
        return {
            valid: quantity !== undefined && quantity >= 0,
            errors: quantity !== undefined && quantity >= 0 ? [] : ['A non-negative quantity is required before updating product inventory.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const productId = getTargetProductId(input, context);
        const quantity = readNumber(input.quantity) ?? readRequestNumberNear(input.request, ['inventario', 'inventory', 'stock', 'cantidad']);
        if (quantity === undefined || quantity < 0) throw new Error('A non-negative quantity is required before updating product inventory.');
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'store_products', projectId, productId);
        const previousRow = cloneRecord(currentRow);
        const { patch, changedFields } = buildProductUpdatePatch(currentRow, { quantity }, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'store_products', projectId, productId, patch);
        return {
            beforeSnapshot: { table: 'store_products', id: productId, projectId, row: previousRow },
            afterSnapshot: { table: 'store_products', id: productId, projectId, row },
            diff: {
                updated: changedFields.map(field => `store_products.${productId}.${field}`),
                critical: true,
                rollback: 'restore_previous_product_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('store_products', deps),
});

const createDiscountHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const discount = requireObject(input, 'discount');
        const request = readString(input.request);
        const now = getNow(deps);
        const code = (readString(discount.code) || readString(input.code) || slugify(titleFromRequest(request, 'AI discount')).replace(/-/g, '').slice(0, 12) || 'AIDRAFT').toUpperCase();
        const type = readString(discount.type) || (request?.includes('%') ? 'percentage' : 'fixed_amount');
        const value = readNumber(discount.value ?? input.value)
            ?? readRequestNumberNear(request, ['descuento', 'discount', 'coupon', 'cupon', 'codigo'])
            ?? 0;
        const row = await insertRow(client, 'store_discounts', {
            ...(isUuid(readString(discount.id)) ? { id: readString(discount.id) } : {}),
            project_id: projectId,
            code,
            type,
            value,
            applies_to: readString(discount.appliesTo ?? discount.applies_to) || 'all',
            product_ids: asArray(discount.productIds ?? discount.product_ids).map(String),
            category_ids: asArray(discount.categoryIds ?? discount.category_ids).map(String),
            minimum_purchase: readNumber(discount.minimumPurchase ?? discount.minimum_purchase) ?? null,
            minimum_quantity: readNumber(discount.minimumQuantity ?? discount.minimum_quantity) ?? null,
            max_uses: readNumber(discount.maxUses ?? discount.max_uses) ?? null,
            max_uses_per_customer: readNumber(discount.maxUsesPerCustomer ?? discount.max_uses_per_customer) ?? null,
            used_count: 0,
            customer_eligibility: readString(discount.customerEligibility ?? discount.customer_eligibility) || 'everyone',
            starts_at: readString(discount.startsAt ?? discount.starts_at) || now,
            ends_at: readString(discount.endsAt ?? discount.ends_at) || null,
            is_active: false,
            can_combine: readBoolean(discount.canCombine ?? discount.can_combine) ?? false,
            is_automatic: false,
            data: {
                ...discount,
                code,
                type,
                value,
                status: 'draft',
                isActive: false,
                is_active: false,
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
                metadata: buildBaseMetadata(input, action, context),
            },
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'store_discounts', id, row },
            diff: { created: [`store_discounts.${id}`], reviewRequired: true, noAutoPublish: true },
        };
    },
    rollback: rollbackCreatedRow('store_discounts', deps),
});

const generateProductCopyHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const productId = getTargetProductId(input, context);
        const prompt = readString(input.prompt) || readString(input.request) || 'Generate product copy';
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'store_products', projectId, productId);
        const previousRow = cloneRecord(currentRow);
        const currentData = asRecord(currentRow.data);
        const productName = readString(currentRow.name) || readString(currentData.name) || 'Product';
        const draft = {
            prompt,
            title: readString(input.title) || productName,
            shortDescription: readString(input.shortDescription) || readString(input.short_description) || titleFromRequest(prompt, `${productName} product copy`),
            description: readString(input.description) || `${productName}\n\n${prompt}`,
            status: 'needs_review',
            generatedAt: now,
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        };
        const row = await updateProjectScopedRow(client, 'store_products', projectId, productId, {
            data: {
                ...currentData,
                assistantDrafts: {
                    ...asRecord(currentData.assistantDrafts),
                    productCopy: draft,
                },
                metadata: mergeAssistantMetadata(currentData.metadata, input, action, context),
                updatedAt: now,
                updated_at: now,
            },
            updated_at: now,
        });
        return {
            beforeSnapshot: { table: 'store_products', id: productId, projectId, row: previousRow },
            afterSnapshot: { table: 'store_products', id: productId, projectId, row },
            diff: {
                updated: [`store_products.${productId}.data.assistantDrafts.productCopy`],
                reviewRequired: true,
                noAutoPublish: true,
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('store_products', deps),
});

const readMediaCategory = (value: unknown): string => {
    const category = readString(value);
    const allowed = new Set([
        'brand',
        'template',
        'article',
        'hero',
        'background',
        'icon',
        'component',
        'people',
        'product',
        'ai_generated',
        'other',
    ]);
    return category && allowed.has(category) ? category : 'ai_generated';
};

const buildMediaDraftPlaceholderUrl = (kind: 'image' | 'video' | 'image_edit' | 'asset', title: string): string => {
    const label = kind === 'video'
        ? 'AI video draft'
        : kind === 'image_edit'
            ? 'AI image edit draft'
            : kind === 'asset'
                ? 'AI asset draft'
                : 'AI image draft';
    const safeTitle = escapeHtml(title);
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
        '<rect width="1280" height="720" fill="#101828"/>',
        '<rect x="72" y="72" width="1136" height="576" rx="32" fill="#182230" stroke="#344054" stroke-width="3"/>',
        '<text x="108" y="178" fill="#f9fafb" font-family="Arial, sans-serif" font-size="48" font-weight="700">',
        label,
        '</text>',
        '<text x="108" y="258" fill="#d0d5dd" font-family="Arial, sans-serif" font-size="30">',
        safeTitle.slice(0, 96),
        '</text>',
        '<text x="108" y="574" fill="#98a2b3" font-family="Arial, sans-serif" font-size="24">',
        'Pending generation and human review in Quimera Media AI',
        '</text>',
        '</svg>',
    ].join('');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createMediaDraftAssetHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    kind: 'image' | 'video' | 'image_edit' | 'asset',
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const prompt = readString(input.prompt) || readString(input.request) || 'AI media generation draft';
        const now = getNow(deps);
        const title = titleFromRequest(
            prompt,
            kind === 'video'
                ? 'AI video generation draft'
                : kind === 'asset'
                    ? 'AI media asset draft'
                    : 'AI image generation draft',
        );
        const category = readMediaCategory(input.category);
        const aspectRatio = readString(input.aspectRatio) || (kind === 'video' ? '16:9' : '1:1');
        const tags = Array.from(new Set([
            'global-assistant',
            'ai-generated',
            `media:${kind}`,
            aspectRatio,
            ...asArray(input.tags).map(String),
        ].filter(Boolean)));
        const row = await insertRow(client, 'media_assets', {
            name: title,
            url: buildMediaDraftPlaceholderUrl(kind, title),
            size: 0,
            type: 'image/svg+xml',
            category,
            folder_path: `media/${category}/global-assistant/${action.id}`,
            tags,
            description: prompt,
            is_ai_generated: true,
            ai_prompt: prompt,
            is_system_asset: false,
            used_in: [],
            usage_count: 0,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                projectId,
                tenantId: getTenantId(action, context),
                mediaKind: kind,
                generationStatus: 'draft_prompt',
                generationMode: readString(input.mode) || (kind === 'video' ? 'draft_prompt' : 'generate_if_available'),
                aspectRatio,
                style: readString(input.style) || null,
                model: readString(input.model) || null,
                sourceAssetId: readString(input.sourceAssetId) || null,
                negativePrompt: readString(input.negativePrompt) || null,
                referenceAssetIds: asArray(input.referenceAssetIds).map(String),
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                readyForMediaAI: true,
                noAutoPublish: true,
            },
            created_by: getAssistantUserId(action, context),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'media_assets', id, row },
            diff: { created: [`media_assets.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('media_assets', deps),
});

const readMediaAssetProjectId = (asset: Record<string, unknown>): string | undefined => {
    const metadata = asRecord(asset.metadata);
    return readString(asset.project_id)
        || readString(asset.projectId)
        || readString(metadata.projectId)
        || readString(metadata.project_id);
};

const readMediaAssetTenantId = (asset: Record<string, unknown>): string | undefined => {
    const metadata = asRecord(asset.metadata);
    return readString(asset.tenant_id)
        || readString(asset.tenantId)
        || readString(metadata.tenantId)
        || readString(metadata.tenant_id);
};

const readMediaAssetUrl = (asset: Record<string, unknown>): string | undefined => {
    const metadata = asRecord(asset.metadata);
    return readString(asset.url)
        || readString(asset.public_url)
        || readString(asset.publicUrl)
        || readString(asset.image_url)
        || readString(asset.imageUrl)
        || readString(asset.src)
        || readString(metadata.url)
        || readString(metadata.publicUrl)
        || readString(metadata.previewUrl);
};

const loadMediaAssetForAttachment = async (
    client: SupabaseClientLike,
    assetId: string,
    projectId: string,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('media_assets').select('*').eq('id', assetId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) throw new Error(`Media asset ${assetId} was not found before attaching it to a section.`);

    const assetProjectId = readMediaAssetProjectId(row);
    if (assetProjectId && assetProjectId !== projectId) {
        throw new Error('Media asset belongs to a different project and cannot be attached to the active website.');
    }

    const tenantId = getTenantId(action, context);
    const assetTenantId = readMediaAssetTenantId(row);
    const canCrossTenant = context?.actor.isSuperAdmin === true || context?.actor.mode === 'super_admin';
    if (assetTenantId && tenantId && assetTenantId !== tenantId && !canCrossTenant) {
        throw new Error('Media asset belongs to a different tenant and cannot be attached in the current context.');
    }

    return cloneRecord(row);
};

const inferAttachmentPath = (input: Record<string, unknown>): string[] => {
    const explicitPath = parseSafePath(input.path);
    if (explicitPath.length > 0) return explicitPath;
    const request = normalizeForSearch(readString(input.request) || '');
    if (request.includes('background') || request.includes('fondo')) return ['backgroundImageUrl'];
    return ['imageUrl'];
};

const createAttachAssetToSectionHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
): HandlerPatch => ({
    validate: input => {
        const path = inferAttachmentPath(input);
        const errors = [
            ...(!readString(input.projectId) ? ['projectId is required before attaching a media asset to a section.'] : []),
            ...(!readString(input.sectionId) ? ['sectionId is required before attaching a media asset to a section.'] : []),
            ...(!readString(input.assetId) ? ['assetId is required before attaching a media asset to a section.'] : []),
            ...(path.length === 0 ? ['path is required before attaching a media asset to a section.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const sectionId = readString(input.sectionId) || '';
        const assetId = readString(input.assetId) || '';
        const path = inferAttachmentPath(input);
        const pathKey = path.join('.');
        const now = getNow(deps);
        const state = await loadProjectWebsiteState(client, projectId, context);
        const asset = await loadMediaAssetForAttachment(client, assetId, projectId, action, context);
        const assetUrl = readMediaAssetUrl(asset);
        if (!assetUrl) throw new Error(`Media asset ${assetId} does not have a usable URL.`);

        const pageData = cloneRecord(state.pageData);
        const currentSection = cloneRecord(asRecord(pageData[sectionId]));
        const nextSection = setDeepValue(currentSection, path, assetUrl);
        const attachmentAudit = {
            assetId,
            assetUrl,
            assetName: readDisplayText(asset.name) || assetId,
            path: pathKey,
            attachedAt: now,
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            sourceEntityType: 'assistant_action',
            sourceEntityId: action.id,
        };
        nextSection.assistantMediaAttachments = {
            ...asRecord(nextSection.assistantMediaAttachments),
            [pathKey]: attachmentAudit,
        };
        pageData[sectionId] = nextSection;
        const pages = updatePageSectionData(state.pages, sectionId, nextSection, now);
        const persisted = await writeProjectWebsiteState(client, state, {
            pageData,
            componentOrder: state.componentOrder,
            sectionVisibility: state.sectionVisibility,
            pages,
        }, input, action, context, {
            now,
            touchedSection: sectionId,
            syncAction: 'section_settings',
        });

        return {
            beforeSnapshot: createProjectWebsiteBeforeSnapshot(state),
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                row: persisted.row,
                sectionId,
                assetId,
                assetUrl,
                path: pathKey,
                attachment: attachmentAudit,
            },
            diff: {
                updated: [`projects.${projectId}.data.${sectionId}.${pathKey}`],
                attached: [`media_assets.${assetId}`],
                synced: ['projects.$current.data.businessBlueprint.websiteBlueprint'],
                reviewRequired: true,
                noAutoPublish: true,
                rollback: 'restore_previous_project_website_columns',
            },
        };
    },
    rollback: rollbackProjectWebsiteColumns(deps),
});

const appointmentStatuses = new Set(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']);

const getContextAppointmentId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '');
    if (!context?.activeEntityId) return undefined;
    if (['appointment', 'project_appointment', 'project-appointment', 'calendar_event', 'calendar-event'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetAppointmentId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const appointment = requireObject(input, 'appointment');
    const appointmentId = readString(input.appointmentId)
        || readString(input.appointment_id)
        || readString(input.targetId)
        || readString(updates.appointmentId)
        || readString(updates.appointment_id)
        || readString(appointment.id)
        || getContextAppointmentId(context);
    if (!appointmentId) throw new Error('appointmentId is required or the active context must point to an appointment.');
    return appointmentId;
};

const addMinutesToIso = (value: string, minutes: number): string | undefined => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
};

const readIsoDateString = (value: unknown): string | undefined => {
    const text = readString(value);
    if (!text) return undefined;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const extractIsoDatesFromRequest = (request: unknown): string[] => {
    const text = readString(request) || '';
    const matches = text.match(/\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)?/g) || [];
    return matches
        .map(value => readIsoDateString(value.includes('T') ? value : `${value}T09:00:00`))
        .filter((value): value is string => Boolean(value));
};

const readAppointmentRange = (
    input: Record<string, unknown>,
    source: Record<string, unknown>,
): { startDate?: string; endDate?: string } => {
    const requestDates = extractIsoDatesFromRequest(input.request);
    const startDate = readIsoDateString(source.startDate)
        || readIsoDateString(source.start_date)
        || readIsoDateString(input.startDate)
        || readIsoDateString(input.start_date)
        || requestDates[0];
    const durationMinutes = readNumber(source.durationMinutes ?? source.duration_minutes ?? input.durationMinutes ?? input.duration_minutes) ?? 60;
    const endDate = readIsoDateString(source.endDate)
        || readIsoDateString(source.end_date)
        || readIsoDateString(input.endDate)
        || readIsoDateString(input.end_date)
        || requestDates[1]
        || (startDate ? addMinutesToIso(startDate, durationMinutes) : undefined);
    return { startDate, endDate };
};

const buildAppointmentCreateInput = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Partial<CanonicalAppointmentInput> => {
    const appointment = requireObject(input, 'appointment');
    const request = readString(input.request);
    const range = readAppointmentRange(input, appointment);
    const actorId = readString(appointment.organizerId)
        || readString(appointment.organizer_id)
        || action.userId
        || context?.actor.userId;
    const explicitNotes = readString(appointment.notes ?? appointment.notas ?? input.notes ?? input.notas);
    const customerRequestSummary = buildCustomerRequestSummary(input, action, context, explicitNotes || request);
    return {
        ...appointment,
        title: readString(appointment.title) || readString(input.title) || titleFromRequest(request, 'AI appointment draft'),
        description: readString(appointment.description) || readString(input.description) || request || '',
        notes: explicitNotes || customerRequestSummary || request || null,
        startDate: range.startDate,
        endDate: range.endDate,
        participantName: readString(appointment.participantName ?? appointment.participant_name ?? input.participantName ?? input.participant_name),
        participantEmail: readString(appointment.participantEmail ?? appointment.participant_email ?? input.participantEmail ?? input.participant_email),
        participantPhone: readString(appointment.participantPhone ?? appointment.participant_phone ?? input.participantPhone ?? input.participant_phone),
        type: readString(appointment.type ?? input.type) || 'consultation',
        status: (readString(appointment.status ?? input.status) || 'scheduled') as CanonicalAppointmentInput['status'],
        priority: (readString(appointment.priority ?? input.priority) || 'medium') as CanonicalAppointmentInput['priority'],
        timezone: readString(appointment.timezone ?? input.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        linkedLeadId: readString(appointment.linkedLeadId ?? appointment.linked_lead_id ?? input.linkedLeadId ?? input.linked_lead_id),
        bookingServiceId: readString(appointment.bookingServiceId ?? appointment.booking_service_id ?? input.bookingServiceId ?? input.booking_service_id),
        organizerId: actorId,
        createdBy: actorId,
        updatedBy: actorId,
    };
};

const normalizeAppointmentStatus = (value: unknown): string | undefined => {
    const status = readString(value);
    if (!status) return undefined;
    if (appointmentStatuses.has(status)) return status;
    const normalized = normalizeForSearch(status);
    if (['confirmada', 'confirmado', 'confirmar', 'confirmed'].includes(normalized)) return 'confirmed';
    if (['cancelada', 'cancelado', 'cancelar', 'cancelled', 'canceled'].includes(normalized)) return 'cancelled';
    if (['completada', 'completado', 'completed'].includes(normalized)) return 'completed';
    if (['no show', 'noshow'].includes(normalized)) return 'no_show';
    if (['reprogramada', 'reprogramado', 'rescheduled'].includes(normalized)) return 'rescheduled';
    return undefined;
};

const deriveAppointmentUpdatesFromRequest = (request: unknown): Record<string, unknown> => {
    const text = normalizeForSearch(readString(request) || '');
    const updates: Record<string, unknown> = {};
    if (!text) return updates;
    if (/\b(confirmada|confirmado|confirmar|confirmed)\b/.test(text)) updates.status = 'confirmed';
    if (/\b(cancela|cancelar|cancelada|cancelado|cancelled|canceled)\b/.test(text)) updates.status = 'cancelled';
    if (/\b(completa|completar|completada|completado|completed)\b/.test(text)) updates.status = 'completed';
    if (/\b(no show|noshow)\b/.test(text)) updates.status = 'no_show';
    if (/\b(reprograma|reprogramar|rescheduled)\b/.test(text)) updates.status = 'rescheduled';
    const dates = extractIsoDatesFromRequest(request);
    if (dates[0]) updates.startDate = dates[0];
    if (dates[1]) updates.endDate = dates[1];
    return updates;
};

const readAppointmentTextUpdate = (updates: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
        const value = readString(updates[key]);
        if (value !== undefined) return value;
    }
    return undefined;
};

const normalizeAppointmentNotes = (value: unknown): Record<string, unknown>[] => {
    if (Array.isArray(value)) return value.map(asRecord).filter(note => Object.keys(note).length > 0);
    const text = readString(value);
    if (!text) return [];
    return [{
        id: 'legacy-note',
        content: text,
        createdAt: timestampFromIso(),
        createdBy: 'system',
        isPrivate: false,
    }];
};

const appendAssistantAppointmentNote = (
    currentRow: Record<string, unknown>,
    content: string,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): Record<string, unknown>[] => [
    ...normalizeAppointmentNotes(currentRow.notes),
    {
        id: `assistant-note-${action.id}`,
        content,
        createdAt: timestampFromIso(now),
        createdBy: getAssistantUserId(action, context),
        isPrivate: false,
        aiGenerated: true,
        pinned: true,
    },
];

const buildAppointmentUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const currentMetadata = asRecord(currentRow.metadata);
    const nextMetadata: Record<string, unknown> = mergeAssistantMetadata(currentMetadata, input, action, context);
    const patch: Record<string, unknown> = {
        updated_at: now,
        updated_by: getAssistantUserId(action, context),
        needs_review: true,
        generated_by_ai: true,
        metadata: nextMetadata,
    };
    const changedFields = ['metadata'];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const title = readAppointmentTextUpdate(updates, ['title', 'titulo']);
    if (title !== undefined) setValue('title', title);
    const description = readAppointmentTextUpdate(updates, ['description', 'descripcion']);
    if (description !== undefined) setValue('description', description);
    const note = readAppointmentTextUpdate(updates, ['notes', 'notas']);
    if (note !== undefined) {
        const noteSummary = buildCustomerRequestSummary(input, action, context, note) || note;
        setValue('notes', appendAssistantAppointmentNote(currentRow, noteSummary, action, context, now));
        nextMetadata.customerRequestSummary = noteSummary;
    }
    const type = readAppointmentTextUpdate(updates, ['type', 'tipo']);
    if (type !== undefined) setValue('type', type);
    const priority = readAppointmentTextUpdate(updates, ['priority', 'prioridad']);
    if (priority !== undefined) setValue('priority', priority);
    const status = normalizeAppointmentStatus(updates.status ?? updates.estado);
    if (status !== undefined) {
        setValue('status', status);
        if (status === 'cancelled') {
            setValue('cancelled_at', now);
            setValue('cancelled_by', getAssistantUserId(action, context));
            const reason = readAppointmentTextUpdate(updates, ['reason', 'razon', 'cancelledReason', 'cancelled_reason']);
            if (reason !== undefined) setValue('cancelled_reason', reason);
        }
        if (status === 'completed') setValue('completed_at', now);
    }

    const range = readAppointmentRange(input, updates);
    if (range.startDate) setValue('start_date', range.startDate);
    if (range.endDate) setValue('end_date', range.endDate);
    const timezone = readAppointmentTextUpdate(updates, ['timezone', 'timeZone']);
    if (timezone !== undefined) setValue('timezone', timezone);
    const location = asRecord(updates.location);
    if (Object.keys(location).length) setValue('location', location);
    if (Array.isArray(updates.participants)) setValue('participants', updates.participants);
    if (Array.isArray(updates.reminders)) setValue('reminders', updates.reminders);
    if (Array.isArray(updates.tags)) setValue('tags', updates.tags.map(String));
    if (Array.isArray(updates.linkedLeadIds) || Array.isArray(updates.linked_lead_ids)) {
        setValue('linked_lead_ids', asArray(updates.linkedLeadIds ?? updates.linked_lead_ids).map(String));
    }

    if (changedFields.length === 1) {
        nextMetadata.assistantDrafts = {
            ...asRecord(nextMetadata.assistantDrafts),
            appointmentUpdate: {
                prompt: readString(input.request) || 'AI appointment update draft',
                status: 'needs_review',
                generatedAt: now,
                generatedByAI: true,
                needsReview: true,
            },
        };
        changedFields.push('metadata.assistantDrafts.appointmentUpdate');
    }

    return { patch, changedFields: Array.from(new Set(changedFields)) };
};

const defaultAppointmentWeeklyHours = () => [
    { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', enabled: false, startTime: '09:00', endTime: '13:00' },
    { day: 'sunday', enabled: false, startTime: '09:00', endTime: '13:00' },
];

const normalizeWeeklyHours = (value: unknown, fallback: unknown): unknown[] => {
    const source = Array.isArray(value) && value.length
        ? value
        : Array.isArray(fallback) && fallback.length
            ? fallback
            : defaultAppointmentWeeklyHours();
    return source.map(item => {
        const record = asRecord(item);
        return {
            day: readString(record.day) || 'monday',
            enabled: readBoolean(record.enabled) ?? true,
            startTime: readString(record.startTime ?? record.start_time) || '09:00',
            endTime: readString(record.endTime ?? record.end_time) || '17:00',
        };
    });
};

const createAppointmentHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const appointment = buildAppointmentCreateInput(input, {
            id: 'validation',
            actionType: 'create_appointment',
            module: 'appointments',
            userId: '',
            tenantId: null,
            projectId: readString(input.projectId) || '',
            mode: 'user',
            target: {},
            input,
            requiresConfirmation: true,
            status: 'planned',
            createdAt: '',
        } as AssistantAction);
        const errors = [
            ...(!appointment.startDate ? ['appointment.startDate is required before apply.'] : []),
            ...(!appointment.endDate ? ['appointment.endDate is required before apply.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const appointment = buildAppointmentCreateInput(input, action, context);
        if (!appointment.startDate || !appointment.endDate) {
            throw new Error('appointment.startDate and appointment.endDate are required before applying this appointment action.');
        }
        const appointmentPayload: CanonicalAppointmentInput = {
            ...appointment,
            projectId,
            tenantId: getTenantId(action, context),
            source: 'dashboard',
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            generatedByAI: true,
            needsReview: true,
            createOrLinkLead: false,
            idempotencyKey: `global-assistant:${action.id}:appointment`,
            correlationId: action.id,
            metadata: buildBaseMetadata(input, action, context),
        } as CanonicalAppointmentInput;
        const result = await createAppointmentCanonical(client as any, appointmentPayload);
        return {
            afterSnapshot: {
                table: 'project_appointments',
                id: result.appointmentId,
                appointmentId: result.appointmentId,
                row: result.appointment,
                warnings: result.warnings,
            },
            diff: { created: [`project_appointments.${result.appointmentId}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('project_appointments', deps, ['id', 'appointmentId']),
});

const updateAppointmentHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const appointmentId = getTargetAppointmentId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'project_appointments', projectId, appointmentId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...deriveAppointmentUpdatesFromRequest(input.request),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'appointmentUpdates'),
            ...requireObject(input, 'appointment'),
        };
        const { patch, changedFields } = buildAppointmentUpdatePatch(currentRow, updates, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'project_appointments', projectId, appointmentId, patch);
        return {
            beforeSnapshot: { table: 'project_appointments', id: appointmentId, projectId, row: previousRow },
            afterSnapshot: { table: 'project_appointments', id: appointmentId, projectId, row },
            diff: {
                updated: changedFields.map(field => `project_appointments.${appointmentId}.${field}`),
                reviewRequired: true,
                rollback: 'restore_previous_appointment_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('project_appointments', deps),
});

const configureAvailabilityHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const businessBlueprint = migrateBusinessBlueprint(
            projectData.businessBlueprint || asRecord(projectData.data).businessBlueprint,
        );
        if (!businessBlueprint?.appointmentsBlueprint) {
            throw new Error('BusinessBlueprint V2 is required before configuring appointment availability.');
        }

        const availability = {
            ...requireObject(input, 'availability'),
            ...requireObject(input, 'settings'),
        };
        const currentAppointmentsBlueprint = businessBlueprint.appointmentsBlueprint;
        const currentAvailability = asRecord(currentAppointmentsBlueprint.availability);
        const nextAvailability = {
            ...currentAvailability,
            ...availability,
            weeklyHours: normalizeWeeklyHours(
                availability.weeklyHours ?? availability.weekly_hours,
                currentAvailability.weeklyHours,
            ),
            blockedTimeSource: 'project_appointment_blocks',
            timezone: readString(availability.timezone) || readString(currentAvailability.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            minimumNoticeMinutes: readNumber(availability.minimumNoticeMinutes ?? availability.minimum_notice_minutes) ?? readNumber(currentAvailability.minimumNoticeMinutes) ?? 120,
            maxAdvanceDays: readNumber(availability.maxAdvanceDays ?? availability.max_advance_days) ?? readNumber(currentAvailability.maxAdvanceDays) ?? 60,
            intervalMinutes: readNumber(availability.intervalMinutes ?? availability.interval_minutes) ?? readNumber(currentAvailability.intervalMinutes) ?? 30,
            capacityPerSlot: readNumber(availability.capacityPerSlot ?? availability.capacity_per_slot) ?? readNumber(currentAvailability.capacityPerSlot) ?? 1,
        };
        const nextAppointmentsBlueprint = {
            ...currentAppointmentsBlueprint,
            availabilityStatus: 'draft',
            availability: nextAvailability,
            needsReview: true,
            updatedAt: now,
            metadata: {
                ...asRecord((currentAppointmentsBlueprint as unknown as Record<string, unknown>).metadata),
                ...buildBaseMetadata(input, action, context),
            },
            sourceMap: {
                ...asRecord((currentAppointmentsBlueprint as unknown as Record<string, unknown>).sourceMap),
                ...assistantSourceMap(input, action, context),
                availability: 'globalAssistant.configureAvailability',
            },
            readiness: {
                ...asRecord((currentAppointmentsBlueprint as unknown as Record<string, unknown>).readiness),
                isReady: false,
                warnings: Array.from(new Set([
                    ...asArray(asRecord((currentAppointmentsBlueprint as unknown as Record<string, unknown>).readiness).warnings).map(String),
                    'Appointment availability was updated by Global Assistant and needs review.',
                ])),
            },
        };
        const nextBusinessBlueprint = {
            ...businessBlueprint,
            appointmentsBlueprint: nextAppointmentsBlueprint,
            updatedAt: now,
        };
        const nextData = {
            ...projectData,
            businessBlueprint: nextBusinessBlueprint,
        };
        await updateProjectData(client, projectId, nextData, now);

        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                row: {
                    projectId,
                    appointmentsBlueprint: nextAppointmentsBlueprint,
                },
            },
            diff: {
                updated: [`projects.${projectId}.data.businessBlueprint.appointmentsBlueprint.availability`],
                reviewRequired: true,
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: async (_input, { snapshot }) => {
        const before = asRecord(snapshot.beforeSnapshot);
        const projectId = readString(before.projectId) || readString(before.id);
        const projectData = asRecord(before.projectData);
        if (!projectId || !Object.keys(projectData).length) {
            throw new Error('Cannot rollback appointment availability: previous project data was not recorded.');
        }
        const result = await updateProjectData(getClient(deps), projectId, projectData, getNow(deps));
        return {
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                restored: true,
                row: result,
            },
            diff: {
                restored: [`projects.${projectId}.data`],
            },
        };
    },
});

const createBioPageHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const bioPage = {
            ...requireObject(input, 'bioPage'),
            ...requireObject(input, 'page'),
        };
        const request = readString(input.request);
        const now = getNow(deps);
        const projectName = context?.project.projectName || 'Bio Page';
        const title = readString(bioPage.title) || readString(bioPage.name) || titleFromRequest(request, `${projectName} Bio Page`);
        const requestedSlug = readString(bioPage.slug);
        const slug = requestedSlug || slugify(`${title}-${action.id.slice(-8)}`);
        const description = readString(bioPage.description) || request || '';
        const row = await insertRow(client, 'bio_pages', {
            tenant_id: tenantId,
            project_id: projectId,
            user_id: userId,
            slug,
            title,
            description,
            profile: {
                ...asRecord(bioPage.profile),
                name: readString(asRecord(bioPage.profile).name) || title,
                headline: readString(asRecord(bioPage.profile).headline) || description,
                generatedByAI: true,
                needsReview: true,
                userModified: false,
            },
            theme: asRecord(bioPage.theme),
            seo: asRecord(bioPage.seo),
            settings: mergeSettingsWithAssistantMetadata(asRecord(bioPage.settings), input, action, context),
            status: 'draft',
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'bio_pages', id, row },
            diff: { created: [`bio_pages.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('bio_pages', deps),
});

const createBioPageBlockHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const block = requireObject(input, 'block');
        const blockType = readString(input.blockType) || readString(block.type);
        return {
            valid: Boolean(blockType),
            errors: blockType ? [] : ['blockType is required before adding a Bio Page block.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const block = {
            ...requireObject(input, 'block'),
            ...requireObject(input, 'data'),
        };
        const request = readString(input.request);
        const now = getNow(deps);
        const pageResult = await selectSingle(client.from('bio_pages').select('*').eq('project_id', projectId));
        if (pageResult?.error) throw pageResult.error;
        const page = asRecord(pageResult?.data);
        const bioPageId = readString(page.id);
        if (!bioPageId) throw new Error('A Bio Page draft or published page is required before adding blocks.');

        const existingBlocks = await client.from('bio_page_blocks').select('order_index').eq('bio_page_id', bioPageId);
        if (existingBlocks?.error) throw existingBlocks.error;
        const nextOrderIndex = asArray(existingBlocks?.data).reduce<number>((max, row) => {
            const value = readNumber(asRecord(row).order_index) ?? -1;
            return Math.max(max, value);
        }, -1) + 1;
        const blockType = readString(input.blockType) || readString(block.type) || 'custom_html_placeholder';
        const title = readString(block.title) || titleFromRequest(request, `AI ${blockType} block`);
        const row = await insertRow(client, 'bio_page_blocks', {
            tenant_id: tenantId,
            project_id: projectId,
            bio_page_id: bioPageId,
            type: blockType,
            title,
            description: readString(block.description) || request || null,
            order_index: nextOrderIndex,
            visible: block.visible !== false,
            data: {
                ...asRecord(block.data),
                request: request || undefined,
            },
            settings: mergeSettingsWithAssistantMetadata(asRecord(block.settings), input, action, context),
            source_module: 'global-assistant',
            source_entity_id: action.id,
            generated_by_ai: true,
            needs_review: true,
            user_modified: false,
            locked_from_regeneration: false,
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'bio_page_blocks', id, bioPageId, row },
            diff: { created: [`bio_page_blocks.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('bio_page_blocks', deps),
});

const sanitizeBioPageLinkUrl = (value: unknown): string => {
    const raw = readString(value) || '';
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return '';
    if (raw.startsWith('/') || raw.startsWith('#')) return raw;
    if (/^(mailto|tel|sms):/i.test(raw)) return raw;
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(candidate);
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
        return '';
    }
};

const hasBioPagePlaceholderUrl = (value: unknown): boolean => {
    const text = normalizeForSearch(readString(value) || '');
    return Boolean(text && (
        text.includes('example.com')
        || text.includes('placeholder')
        || text.includes('your-link')
        || text.includes('tu-link')
        || text.includes('{{')
    ));
};

const loadBioPageRowForAction = async (
    client: SupabaseClientLike,
    projectId: string,
    bioPageId?: string,
): Promise<Record<string, unknown>> => {
    if (bioPageId) return loadProjectScopedRow(client, 'bio_pages', projectId, bioPageId);

    const result = await selectSingle(
        client
            .from('bio_pages')
            .select('*')
            .eq('project_id', projectId)
            .neq('status', 'archived'),
    );
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) throw new Error(`No Bio Page was found for project ${projectId}.`);
    return cloneRecord(row);
};

const readBioPageChildRows = async (
    client: SupabaseClientLike,
    table: 'bio_page_links' | 'bio_page_blocks',
    bioPageId: string,
): Promise<Record<string, unknown>[]> => {
    const result = await client.from(table).select('*').eq('bio_page_id', bioPageId);
    if (result?.error) throw result.error;
    return asArray(result?.data).map(row => cloneRecord(asRecord(row)));
};

const deriveBioPageLinkUpdatesFromRequest = (request: unknown): Record<string, unknown> => {
    const original = readString(request) || '';
    const text = normalizeForSearch(original);
    const updates: Record<string, unknown> = {};
    if (!text) return updates;

    if (/\b(oculta|ocultar|hide|hidden|invisible|desactiva|desactivar)\b/.test(text)) updates.visible = false;
    if (/\b(muestra|mostrar|show|visible|activa|activar)\b/.test(text)) updates.visible = true;

    const urlMatch = original.match(/\b((?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?)/i);
    if (urlMatch) updates.url = urlMatch[1].replace(/[),.;]+$/g, '');

    return updates;
};

const getContextBioPageLinkId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '').replace(/\s+/g, '_');
    if (!context?.activeEntityId) return undefined;
    if (['bio_page_link', 'bio_link', 'biopage_link', 'link_in_bio', 'link'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetBioPageLinkId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const link = requireObject(input, 'link');
    const linkId = readString(input.linkId)
        || readString(input.link_id)
        || readString(input.targetId)
        || readString(updates.linkId)
        || readString(updates.link_id)
        || readString(link.id)
        || getContextBioPageLinkId(context);
    if (!linkId) throw new Error('linkId is required or the active context must point to a Bio Page link.');
    return linkId;
};

const buildBioPageLinkUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const patch: Record<string, unknown> = { updated_at: now };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const title = readString(updates.title ?? updates.label ?? updates.name);
    if (title !== undefined) setValue('title', title || 'Link');
    if (updates.url !== undefined) {
        const url = sanitizeBioPageLinkUrl(updates.url);
        if (!url) throw new Error('Bio Page link update requires a safe URL.');
        setValue('url', url);
    }
    const description = readString(updates.description ?? updates.descripcion);
    if (description !== undefined) setValue('description', description || null);
    const icon = readString(updates.icon);
    if (icon !== undefined) setValue('icon', icon || null);
    const imageUrl = readString(updates.imageUrl ?? updates.image_url ?? updates.thumbnail);
    if (imageUrl !== undefined) setValue('image_url', imageUrl || null);
    const platform = readString(updates.platform);
    if (platform !== undefined) setValue('platform', platform || null);
    const linkType = readString(updates.linkType ?? updates.link_type ?? updates.type);
    if (linkType !== undefined) setValue('link_type', linkType === 'link' ? 'external' : linkType);
    const orderIndex = readNumber(updates.orderIndex ?? updates.order_index ?? updates.order);
    if (orderIndex !== undefined) setValue('order_index', orderIndex);
    const visible = readBoolean(updates.visible ?? updates.enabled);
    if (visible !== undefined) setValue('visible', visible);
    const clickTrackingEnabled = readBoolean(updates.clickTrackingEnabled ?? updates.click_tracking_enabled);
    if (clickTrackingEnabled !== undefined) setValue('click_tracking_enabled', clickTrackingEnabled);

    const metadata = mergeAssistantMetadata(currentRow.metadata, input, action, context);
    metadata.needsReview = true;
    metadata.generatedByAI = true;
    metadata.userModified = false;
    metadata.lockedFromRegeneration = false;
    metadata.sourceMap = {
        ...asRecord(metadata.sourceMap),
        ...assistantSourceMap(input, action, context),
        bioPageLink: 'globalAssistant.bioPage.linkUpdate',
    };
    patch.metadata = metadata;
    changedFields.push(changedFields.length === 0 ? 'metadata.assistantDrafts.linkUpdate' : 'metadata.globalAssistant');

    return { patch, changedFields: Array.from(new Set(changedFields)) };
};

const editBioPageLinkHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const linkId = readString(input.linkId)
            || readString(input.link_id)
            || readString(input.targetId);
        const updates = {
            ...deriveBioPageLinkUpdatesFromRequest(input.request),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'link'),
        };
        const errors = [
            ...(!linkId ? ['linkId is required before editing a Bio Page link.'] : []),
            ...(Object.keys(updates).length === 0 ? ['At least one supported Bio Page link update is required.'] : []),
            ...(updates.url !== undefined && !sanitizeBioPageLinkUrl(updates.url)
                ? ['Bio Page link URL must be safe before updating.']
                : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const linkId = getTargetBioPageLinkId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'bio_page_links', projectId, linkId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...deriveBioPageLinkUpdatesFromRequest(input.request),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'link'),
        };
        const { patch, changedFields } = buildBioPageLinkUpdatePatch(currentRow, updates, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'bio_page_links', projectId, linkId, patch);
        return {
            beforeSnapshot: { table: 'bio_page_links', id: linkId, projectId, row: previousRow },
            afterSnapshot: { table: 'bio_page_links', id: linkId, projectId, bioPageId: readString(row.bio_page_id), row },
            diff: {
                updated: changedFields.map(field => `bio_page_links.${linkId}.${field}`),
                reviewRequired: true,
                rollback: 'restore_previous_bio_page_link_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('bio_page_links', deps),
});

const getBioPageIdFromInput = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string | undefined => {
    const page = requireObject(input, 'bioPage');
    const entityType = normalizeForSearch(context?.activeEntityType || '').replace(/\s+/g, '_');
    return readString(input.bioPageId)
        || readString(input.bio_page_id)
        || readString(input.pageId)
        || readString(page.id)
        || (context?.activeEntityId && ['bio_page', 'biopage', 'bio'].includes(entityType) ? context.activeEntityId : undefined);
};

const collectBioPagePublishBlockers = (
    page: Record<string, unknown>,
    links: Record<string, unknown>[],
    blocks: Record<string, unknown>[],
): string[] => {
    const blockers: string[] = [];
    const settings = asRecord(page.settings);
    const profile = asRecord(page.profile);
    const slug = readString(page.slug);
    const displayName = readString(profile.displayName) || readString(profile.name) || readString(page.title);

    if (!slug) blockers.push('Bio Page slug is required before publishing.');
    if (!displayName) blockers.push('Bio Page profile name is required before publishing.');
    if (settings.needsReview === true || asRecord(settings.metadata).needsReview === true) {
        blockers.push('Bio Page settings still need review.');
    }
    if (profile.needsReview === true) blockers.push('Bio Page profile still needs review.');

    links.filter(link => link.visible !== false).forEach(link => {
        const metadata = asRecord(link.metadata);
        const label = readString(link.title) || readString(link.id) || 'Untitled link';
        if (metadata.needsReview === true) blockers.push(`Bio Page link "${label}" still needs review.`);
        const linkType = readString(link.link_type) || 'external';
        if (linkType !== 'chatbot') {
            const url = sanitizeBioPageLinkUrl(link.url);
            if (!url) blockers.push(`Bio Page link "${label}" needs a safe URL.`);
            if (hasBioPagePlaceholderUrl(link.url)) blockers.push(`Bio Page link "${label}" still uses a placeholder URL.`);
        }
    });

    blocks.filter(block => block.visible !== false).forEach(block => {
        const label = readString(block.title) || readString(block.type) || readString(block.id) || 'Untitled block';
        if (block.needs_review === true) blockers.push(`Bio Page block "${label}" still needs review.`);
    });

    return blockers;
};

const publishBioPageHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const page = await loadBioPageRowForAction(client, projectId, getBioPageIdFromInput(input, context));
        const bioPageId = readString(page.id) || '';
        const previousRow = cloneRecord(page);
        const [links, blocks] = await Promise.all([
            readBioPageChildRows(client, 'bio_page_links', bioPageId),
            readBioPageChildRows(client, 'bio_page_blocks', bioPageId),
        ]);
        const blockers = collectBioPagePublishBlockers(page, links, blocks);
        if (blockers.length > 0) throw new Error(`Bio Page is not ready to publish: ${blockers.join(' ')}`);

        const currentSettings = asRecord(page.settings);
        const baseMetadata = buildBaseMetadata(input, action, context);
        const patch = {
            status: 'published',
            published_at: now,
            updated_at: now,
            settings: {
                ...currentSettings,
                lastPublishedBy: 'global-assistant',
                lastPublishedAt: now,
                globalAssistant: {
                    ...asRecord(currentSettings.globalAssistant),
                    ...asRecord(baseMetadata.globalAssistant),
                    needsReview: false,
                    publishedByAssistant: true,
                },
                sourceMap: {
                    ...asRecord(currentSettings.sourceMap),
                    ...assistantSourceMap(input, action, context),
                    bioPagePublish: 'globalAssistant.bioPage.publish',
                },
            },
        };
        const row = await updateProjectScopedRow(client, 'bio_pages', projectId, bioPageId, patch);
        return {
            beforeSnapshot: { table: 'bio_pages', id: bioPageId, projectId, row: previousRow },
            afterSnapshot: { table: 'bio_pages', id: bioPageId, projectId, row },
            diff: {
                updated: [`bio_pages.${bioPageId}.status`, `bio_pages.${bioPageId}.published_at`, `bio_pages.${bioPageId}.settings.globalAssistant`],
                critical: true,
                published: [`bio_pages.${bioPageId}`],
                rollback: 'restore_previous_bio_page_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('bio_pages', deps),
});

const chatbotKnowledgeSourceTypes = new Set<ChatbotKnowledgeSourceType>([
    'business_blueprint',
    'website_content',
    'ecommerce_products',
    'ecommerce_policies',
    'ecommerce_orders_private',
    'appointments_services',
    'restaurant_menu',
    'restaurant_reservations',
    'realty_listings',
    'finance_invoices_private',
    'bio_page',
    'crm_leads_private',
    'email_marketing_flows',
    'cms_articles',
    'uploaded_document',
    'website_url',
    'youtube',
    'manual_snippet',
    'faq',
]);

const chatbotKnowledgeVisibility = new Set<ChatbotKnowledgeVisibility>(['public', 'private', 'internal']);

const readChatbotKnowledgeSourceType = (
    value: unknown,
    fallback: ChatbotKnowledgeSourceType,
): ChatbotKnowledgeSourceType => {
    const text = readString(value) as ChatbotKnowledgeSourceType | undefined;
    return text && chatbotKnowledgeSourceTypes.has(text) ? text : fallback;
};

const readChatbotKnowledgeVisibility = (
    value: unknown,
): ChatbotKnowledgeVisibility => {
    const text = readString(value) as ChatbotKnowledgeVisibility | undefined;
    return text && chatbotKnowledgeVisibility.has(text) ? text : 'internal';
};

const loadProjectData = async (
    client: SupabaseClientLike,
    projectId: string,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('projects').select('data').eq('id', projectId));
    if (result?.error) throw result.error;
    const projectRow = asRecord(result?.data);
    const projectData = asRecord(projectRow.data);
    if (!Object.keys(projectData).length) {
        throw new Error('Project data is required before configuring ChatCore knowledge.');
    }
    return projectData;
};

const updateProjectData = async (
    client: SupabaseClientLike,
    projectId: string,
    data: Record<string, unknown>,
    now: string,
    options: { touchLastUpdated?: boolean } = {},
) => {
    const patch = options.touchLastUpdated === false
        ? { data }
        : { data, last_updated: now };
    const result = await client
        .from('projects')
        .update(patch)
        .eq('id', projectId);
    if (result?.error) throw result.error;
    return result?.data || { projectId, data };
};

const resolveSnapshotSectionId = (input: Record<string, unknown>): string | undefined => {
    const target = asRecord(input.target);
    return readString(input.sectionId)
        || readString(input.targetSectionId)
        || readString(target.sectionId)
        || readString(target.id);
};

const resolveProjectIdForSnapshot = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string | null =>
    readString(input.projectId) || action.projectId || context?.project.projectId || null;

const PROJECT_VERSION_HISTORY_ACTIONS = new Set([
    'create_website_from_prompt',
    'edit_website_section',
    'update_section_copy',
    'update_section_image',
    'attach_asset_to_section',
    'reorder_sections',
    'toggle_section_visibility',
    'publish_website',
    'unpublish_website',
    'add_storefront_section',
    'edit_storefront_theme',
    'update_product_card_style',
    'update_project_metadata',
    'configure_availability',
    'create_chatbot_knowledge',
    'sync_chatbot_knowledge',
    'deploy_chatbot_to_surface',
    'create_showing_request_flow',
]);

const persistProjectSnapshotBeforeAssistantMutation = async (
    definition: AssistantActionDefinition,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    deps: GlobalAssistantActionHandlerDependencies,
): Promise<void> => {
    if (definition.actionType === 'create_project_from_prompt' || definition.actionType === 'transfer_agency_project') {
        return;
    }

    if (!PROJECT_VERSION_HISTORY_ACTIONS.has(definition.actionType)) {
        return;
    }

    if (definition.module === 'agency' && !readString(input.projectId) && !action.projectId) {
        return;
    }

    const projectId = resolveProjectIdForSnapshot(input, action, context);
    if (!projectId) return;

    const client = getClient(deps);
    const row = await loadProjectRowForAssistantScope(
        client,
        projectId,
        action,
        context,
        `creating a Version History snapshot before ${definition.actionType}`,
    );
    const projectData = asRecord(row.data);
    const now = getNow(deps);
    const moduleKey = mapAssistantModuleToBlueprintModuleKey(definition.module);
    const sectionId = resolveSnapshotSectionId(input);
    const { nextProjectData } = createSnapshotBeforeRegeneration(projectData, {
        projectId,
        now,
        moduleKey,
        sectionId,
        scope: sectionId ? 'section' : moduleKey ? 'module' : 'project',
        metadata: {
            projectName: readDisplayText(row.name),
            tenantId: readProjectTenantId(row) || getTenantId(action, context),
            userId: readProjectUserId(row) || action.userId || context?.actor.userId || null,
            createdBy: action.userId || context?.actor.userId || null,
            actionId: action.id,
            actionType: definition.actionType,
            taskId: action.taskId || null,
            module: definition.module,
            source: 'global-assistant',
        },
    });

    await updateProjectData(client, projectId, nextProjectData, now, { touchLastUpdated: false });
};

const rollbackProjectDataSnapshot = (
    deps: GlobalAssistantActionHandlerDependencies,
    label: string,
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const before = asRecord(snapshot.beforeSnapshot);
    const projectId = readString(before.projectId) || readString(before.id);
    const projectData = asRecord(before.projectData);
    if (!projectId || !Object.keys(projectData).length) {
        throw new Error(`Cannot rollback ${label}: previous project data was not recorded.`);
    }
    const result = await updateProjectData(getClient(deps), projectId, projectData, getNow(deps));
    return {
        afterSnapshot: {
            table: 'projects',
            id: projectId,
            restored: true,
            row: result,
        },
        diff: {
            restored: [`projects.${projectId}.data`],
        },
    };
};

const applyBusinessBlueprintToProjectData = (
    projectDataInput: unknown,
    businessBlueprint: BusinessBlueprint,
): Record<string, unknown> => {
    const projectData = asRecord(projectDataInput);
    const nestedData = asRecord(projectData.data);

    return {
        ...projectData,
        businessBlueprint,
        ...(nestedData.businessBlueprint ? {
            data: {
                ...nestedData,
                businessBlueprint,
            },
        } : {}),
    };
};

const buildChatbotKnowledgeSource = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    options: { sync: boolean; now: string },
): ChatbotKnowledgeSourceBlueprint => {
    const document = requireObject(input, 'document');
    const request = readString(input.request);
    const sources = asArray(input.sources).map(String).map(value => value.trim()).filter(Boolean);
    const fallbackType = options.sync
        ? readChatbotKnowledgeSourceType(sources[0], 'business_blueprint')
        : 'manual_snippet';
    const type = readChatbotKnowledgeSourceType(document.type || input.sourceType || sources[0], fallbackType);
    const name = readString(document.name)
        || readString(document.title)
        || (options.sync && sources.length ? `ChatCore sync: ${sources.join(', ')}` : titleFromRequest(request, 'Global Assistant ChatCore knowledge'));

    return {
        id: readString(document.id) || `global-assistant-${action.id}`,
        name,
        type,
        ownerModule: 'chatbot-engine',
        visibility: readChatbotKnowledgeVisibility(document.visibility || input.visibility),
        status: 'needs_review',
        lastSyncedAt: options.sync ? options.now : undefined,
        freshness: 'unknown',
        confidence: readNumber(document.confidence) ?? 0.72,
        contentHash: readString(document.contentHash) || readString(document.content_hash),
        sourceEntityIds: [
            action.id,
            ...asArray(document.sourceEntityIds).map(String),
            ...sources,
        ].filter(Boolean),
        readiness: {
            isReady: false,
            blockers: [],
            warnings: [
                'Needs human review before ChatCore uses this knowledge source.',
            ],
        },
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        lockedFromRegeneration: false,
        sourceMap: {
            ...assistantSourceMap(input, action, context),
            source: sources,
            documentId: readString(document.id) || '',
        },
    };
};

const upsertChatbotKnowledgeSource = (
    blueprint: ChatbotBlueprint,
    source: ChatbotKnowledgeSourceBlueprint,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): ChatbotBlueprint => {
    const nextSources = blueprint.knowledgeSources.some(item => item.id === source.id)
        ? blueprint.knowledgeSources.map(item => item.id === source.id ? source : item)
        : [...blueprint.knowledgeSources, source];

    return {
        ...blueprint,
        knowledgeSources: nextSources,
        status: 'needs_review',
        needsReview: true,
        readiness: {
            ...blueprint.readiness,
            isReady: false,
            warnings: Array.from(new Set([
                ...(blueprint.readiness?.warnings || []),
                'ChatCore knowledge was updated by Global Assistant and needs review.',
            ])),
        },
        metadata: {
            ...blueprint.metadata,
            generatedByAI: true,
            userModified: false,
            lockedFromRegeneration: false,
            updatedAt: now,
            lastEditedAt: now,
            lastEditedBy: action.userId || context?.actor.userId || '',
        },
        sourceMap: {
            ...(blueprint.sourceMap || {}),
            ...assistantSourceMap(input, action, context),
            knowledgeCenter: 'globalAssistant.chatbotKnowledge',
        },
    };
};

const createChatbotKnowledgeHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    options: { sync: boolean },
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const businessBlueprint = migrateBusinessBlueprint(
            projectData.businessBlueprint || asRecord(projectData.data).businessBlueprint,
        );
        if (!businessBlueprint?.chatbotBlueprint) {
            throw new Error('BusinessBlueprint V2 is required before configuring ChatCore knowledge.');
        }
        const source = buildChatbotKnowledgeSource(input, action, context, { sync: options.sync, now });
        const document = requireObject(input, 'document');
        const canonicalResult = await addProjectChatbotKnowledgeSource(projectId, {
            id: source.id,
            name: source.name,
            type: source.type,
            ownerModule: source.ownerModule,
            visibility: source.visibility,
            status: 'needs_review',
            content: readString(document.content) || readString(document.text) || readString(input.content) || readString(input.snippet) || readString(input.request) || null,
            sourceUrl: readString(document.url) || readString(document.sourceUrl) || readString(input.url) || null,
            sourceEntityIds: source.sourceEntityIds,
            contentHash: source.contentHash,
            confidence: source.confidence,
            generatedByAI: source.generatedByAI,
            sync: options.sync,
            actorId: action.userId || context?.actor.userId || null,
            now,
        }, client as any);

        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                row: { projectId, knowledgeSource: canonicalResult.knowledgeSource },
            },
            diff: {
                updated: [`projects.${projectId}.data.businessBlueprint.chatbotBlueprint.knowledgeSources`],
                reviewRequired: true,
                auditEventId: canonicalResult.auditEventId || null,
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: rollbackProjectDataSnapshot(deps, 'ChatCore knowledge'),
});

const chatbotSurfaceDeploymentKeys: ChatbotSurfaceDeploymentKey[] = [
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

const chatbotDeploymentStatuses = new Set<ChatbotDeploymentStatus>(['draft', 'test', 'deployed', 'paused', 'disabled']);

const chatbotSurfaceAliases: Record<string, ChatbotSurfaceDeploymentKey> = {
    webwidget: 'webWidget',
    websitewidget: 'webWidget',
    website: 'webWidget',
    web: 'webWidget',
    site: 'webWidget',
    paginaweb: 'webWidget',
    embeddedwidget: 'embeddedWidget',
    embedwidget: 'embeddedWidget',
    embedded: 'embeddedWidget',
    embed: 'embeddedWidget',
    biopage: 'bioPage',
    biolink: 'bioPage',
    bio: 'bioPage',
    linkinbio: 'bioPage',
    storefront: 'storefront',
    store: 'storefront',
    shop: 'storefront',
    tienda: 'storefront',
    checkout: 'checkout',
    bookingpage: 'bookingPage',
    booking: 'bookingPage',
    appointments: 'bookingPage',
    appointment: 'bookingPage',
    calendar: 'bookingPage',
    citas: 'bookingPage',
    reservas: 'bookingPage',
    restaurantmenu: 'restaurantMenu',
    restaurant: 'restaurantMenu',
    restaurante: 'restaurantMenu',
    menu: 'restaurantMenu',
    realtypropertypage: 'realtyPropertyPage',
    realestatepropertypage: 'realtyPropertyPage',
    realty: 'realtyPropertyPage',
    realestate: 'realtyPropertyPage',
    property: 'realtyPropertyPage',
    propiedad: 'realtyPropertyPage',
    listing: 'realtyPropertyPage',
    adminpreview: 'adminPreview',
    admin: 'adminPreview',
    preview: 'adminPreview',
    testlab: 'adminPreview',
    voice: 'voice',
    voz: 'voice',
};

const normalizeChatbotAlias = (value: string): string =>
    normalizeForSearch(value).replace(/[^a-z0-9]+/g, '');

const readChatbotSurfaceDeploymentKey = (
    input: Record<string, unknown>,
): ChatbotSurfaceDeploymentKey => {
    const rawValue = readString(input.surface)
        || readString(input.surfaceId)
        || readString(input.channel)
        || readString(input.targetSurface);
    const normalized = rawValue ? normalizeChatbotAlias(rawValue) : '';
    const direct = chatbotSurfaceDeploymentKeys.find(key => normalizeChatbotAlias(key) === normalized);
    const surface = direct || chatbotSurfaceAliases[normalized];
    if (!surface) {
        throw new Error('A valid ChatCore deployment surface is required.');
    }
    return surface;
};

const readChatbotDeploymentStatus = (
    input: Record<string, unknown>,
): ChatbotDeploymentStatus => {
    const explicitStatus = readString(input.status)
        || readString(input.deploymentStatus)
        || readString(input.targetStatus);
    if (explicitStatus && chatbotDeploymentStatuses.has(explicitStatus as ChatbotDeploymentStatus)) {
        return explicitStatus as ChatbotDeploymentStatus;
    }

    const request = normalizeForSearch(readString(input.request) || '');
    if (includesAny(request, ['test', 'prueba', 'laboratorio'])) return 'test';
    if (includesAny(request, ['pausa', 'pausar', 'pause'])) return 'paused';
    if (includesAny(request, ['desactiva', 'desactivar', 'disable', 'apaga'])) return 'disabled';
    if (includesAny(request, ['draft', 'borrador'])) return 'draft';
    return 'deployed';
};

const createChatbotTestHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const prompt = readString(input.prompt) || readString(input.request) || 'Global Assistant ChatCore test';
        const runId = readString(input.runId) || `global-assistant-${action.id}-${slugify(prompt).slice(0, 48)}`;
        const result = await runProjectChatbotTestLab(projectId, {
            actorId: action.userId || context?.actor.userId || null,
            sourceSurface: readString(input.sourceSurface) || 'admin_preview',
            sourceModule: 'global-assistant-operating-layer',
            idempotencyKey: readString(input.idempotencyKey) || `global-assistant:${projectId}:test-chatbot:${action.id}`,
            runId,
            now,
        }, client as any);

        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                prompt,
                runId: result.runId,
                eventId: result.eventId || null,
                status: result.status,
                passed: result.passed,
                scenarioCount: result.scenarioResults.length,
                failedCount: result.scenarioResults.filter(scenario => !scenario.passed).length,
                chatbotBlueprint: result.chatbotBlueprint,
                warnings: result.warnings,
            },
            diff: {
                updated: [
                    `projects.${projectId}.data.businessBlueprint.chatbotBlueprint.testing`,
                    `projects.${projectId}.data.businessBlueprint.chatbotBlueprint.metadata`,
                    `chatbot_engine_events.${result.eventId || '$pending'}`,
                ],
                reviewRequired: result.status !== 'passing',
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: rollbackProjectDataSnapshot(deps, 'ChatCore Test Lab'),
});

const createDeployChatbotToSurfaceHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const surfaceId = readChatbotSurfaceDeploymentKey(input);
        const status = readChatbotDeploymentStatus(input);
        const result = await deployChatbotToSurface(projectId, {
            surfaceId,
            status,
            actorId: action.userId || context?.actor.userId || null,
            now,
        }, client as any);

        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                surfaceId: result.surfaceId,
                surface: result.surface,
                status: result.surface.status,
                deploymentStatus: result.chatbotBlueprint.deployment.status,
                deployedSurfaces: result.chatbotBlueprint.deployment.deployedSurfaces,
                auditEventId: result.auditEventId || null,
                auditWarning: result.auditWarning || null,
                auditDuplicate: result.auditDuplicate || false,
                chatbotBlueprint: result.chatbotBlueprint,
            },
            diff: {
                updated: [
                    `projects.${projectId}.data.businessBlueprint.chatbotBlueprint.channels.${surfaceId}`,
                    `projects.${projectId}.data.businessBlueprint.chatbotBlueprint.deployment`,
                    ...(result.auditEventId ? [`chatbot_engine_events.${result.auditEventId}`] : []),
                ],
                critical: status === 'deployed',
                reviewRequired: status !== 'deployed',
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: rollbackProjectDataSnapshot(deps, 'ChatCore deployment'),
});

const normalizeInvoiceItems = (
    items: unknown,
    request: string | undefined,
): Array<Record<string, unknown>> => {
    const normalized = asArray(items)
        .map((item, index) => {
            const record = asRecord(item);
            if (!Object.keys(record).length) return null;
            const quantity = readNumber(record.quantity) ?? 1;
            const unitPrice = readNumber(record.unitPrice ?? record.unit_price ?? record.price ?? record.amount) ?? 0;
            const total = readNumber(record.total) ?? quantity * unitPrice;
            return {
                id: readString(record.id) || `item-${index + 1}`,
                description: readString(record.description) || readString(record.name) || 'AI finance draft item',
                quantity,
                unitPrice,
                unit_price: unitPrice,
                total,
            };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

    return normalized.length > 0
        ? normalized
        : [{
            id: 'item-1',
            description: request || 'AI finance draft item',
            quantity: 1,
            unitPrice: 0,
            unit_price: 0,
            total: 0,
        }];
};

const createFinanceRecordHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const record = requireObject(input, 'record');
        const request = readString(input.request);
        const now = getNow(deps);
        const issueDate = readDate(record.issueDate ?? record.issue_date ?? record.date, now.slice(0, 10));
        const dueDate = readDate(record.dueDate ?? record.due_date, issueDate);
        const items = normalizeInvoiceItems(record.items, request);
        const computedSubtotal = items.reduce((sum, item) => sum + (readNumber(item.total) ?? 0), 0);
        const subtotal = readNumber(record.subtotal) ?? computedSubtotal;
        const taxTotal = readNumber(record.taxTotal ?? record.tax_total) ?? 0;
        const discountTotal = readNumber(record.discountTotal ?? record.discount_total) ?? 0;
        const total = readNumber(record.total) ?? subtotal + taxTotal - discountTotal;
        const title = titleFromRequest(request, 'AI finance invoice draft');
        const invoiceNumber = readString(record.invoiceNumber)
            || readString(record.invoice_number)
            || `AI-${now.slice(2, 10).replace(/-/g, '')}-${slugify(title).slice(0, 12)}`;

        const row = await insertRow(client, 'accounting_invoices', {
            project_id: projectId,
            invoice_number: invoiceNumber,
            status: 'draft',
            issue_date: issueDate,
            due_date: dueDate,
            customer_name: readString(record.customerName ?? record.customer_name ?? record.clientName ?? record.name) || title,
            customer_email: readString(record.customerEmail ?? record.customer_email ?? record.email) || null,
            customer_address: readString(record.customerAddress ?? record.customer_address ?? record.address) || null,
            items,
            subtotal,
            tax_total: taxTotal,
            discount_total: discountTotal,
            total,
            notes: readString(record.notes) || request || null,
            currency: readString(record.currency) || 'USD',
            payment_terms: readString(record.paymentTerms ?? record.payment_terms) || 'Due on receipt',
            reminder_note: readString(record.reminderNote ?? record.reminder_note) || null,
            ai_optimized: true,
            ai_optimized_terms: readString(record.aiOptimizedTerms ?? record.ai_optimized_terms) || null,
            ai_optimized_reminder: readString(record.aiOptimizedReminder ?? record.ai_optimized_reminder) || null,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
            source_event: 'create_finance_record',
            source_entity_type: 'assistant_action',
            source_entity_id: action.id,
            idempotency_key: `global-assistant:${action.id}:finance-record`,
            metadata: buildBaseMetadata(input, action, context),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'accounting_invoices', id, row },
            diff: { created: [`accounting_invoices.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('accounting_invoices', deps),
});

const financeInvoiceStatuses = new Set(['draft', 'sent', 'paid', 'overdue', 'cancelled']);

const normalizeFinanceInvoiceStatus = (value: unknown): string | undefined => {
    const status = readString(value);
    if (!status) return undefined;
    const normalized = normalizeForSearch(status).replace(/\s+/g, '_');
    if (financeInvoiceStatuses.has(normalized)) return normalized;
    if (['canceled', 'cancelada', 'cancelado', 'cancelar', 'cancela'].includes(normalized)) return 'cancelled';
    if (['pagada', 'pagado', 'cobrada', 'cobrado'].includes(normalized)) return 'paid';
    if (['enviada', 'enviado', 'mandada', 'mandado'].includes(normalized)) return 'sent';
    if (['vencida', 'vencido', 'late'].includes(normalized)) return 'overdue';
    if (['borrador', 'draft_only'].includes(normalized)) return 'draft';
    return undefined;
};

const getContextFinanceRecordId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '').replace(/\s+/g, '_');
    if (!context?.activeEntityId) return undefined;
    if (['finance_record', 'finance_invoice', 'invoice', 'accounting_invoice', 'accounting_invoices'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetFinanceRecordId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const record = requireObject(input, 'record');
    const recordId = readString(input.recordId)
        || readString(input.record_id)
        || readString(input.invoiceId)
        || readString(input.invoice_id)
        || readString(input.targetId)
        || readString(updates.recordId)
        || readString(updates.record_id)
        || readString(updates.invoiceId)
        || readString(updates.invoice_id)
        || readString(record.id)
        || getContextFinanceRecordId(context);
    if (!recordId) throw new Error('recordId is required or the active context must point to a finance invoice.');
    return recordId;
};

const deriveFinanceInvoiceUpdatesFromRequest = (
    request: unknown,
    now: string,
): Record<string, unknown> => {
    const text = normalizeForSearch(readString(request) || '');
    const updates: Record<string, unknown> = {};
    if (!text) return updates;

    if (/\b(pagada|pagado|paid|cobrada|cobrado)\b/.test(text)) {
        updates.status = 'paid';
        updates.paidDate = now.slice(0, 10);
    } else if (/\b(enviada|enviado|sent|mandada|mandado)\b/.test(text)) {
        updates.status = 'sent';
    } else if (/\b(vencida|vencido|overdue|late)\b/.test(text)) {
        updates.status = 'overdue';
    } else if (/\b(cancelada|cancelado|cancelar|cancela|cancelled|canceled)\b/.test(text)) {
        updates.status = 'cancelled';
    } else if (/\b(borrador|draft)\b/.test(text)) {
        updates.status = 'draft';
    }

    const amount = readRequestNumberNear(request, ['total', 'monto', 'amount', 'importe', 'por']);
    if (amount !== undefined && /\b(total|monto|amount|importe|por)\b/.test(text)) updates.total = amount;

    const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
        if (/\b(vencimiento|vence|due)\b/.test(text)) updates.dueDate = dateMatch[1];
        if (/\b(pago|pagada|paid|cobrada)\b/.test(text)) updates.paidDate = dateMatch[1];
    }

    return updates;
};

const buildFinanceInvoiceUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const patch: Record<string, unknown> = { updated_at: now };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const status = normalizeFinanceInvoiceStatus(updates.status ?? updates.estado);
    if (status) {
        setValue('status', status);
        if (status === 'paid') {
            setValue('paid_date', readDate(updates.paidDate ?? updates.paid_date, now.slice(0, 10)));
        }
    }

    const issueDate = readString(updates.issueDate ?? updates.issue_date);
    if (issueDate !== undefined) setValue('issue_date', readDate(issueDate, now.slice(0, 10)));
    const dueDate = readString(updates.dueDate ?? updates.due_date);
    if (dueDate !== undefined) setValue('due_date', readDate(dueDate, now.slice(0, 10)));
    const paidDate = readString(updates.paidDate ?? updates.paid_date);
    if (paidDate !== undefined) setValue('paid_date', paidDate ? readDate(paidDate, now.slice(0, 10)) : null);

    const customerName = readString(updates.customerName ?? updates.customer_name ?? updates.clientName ?? updates.name);
    if (customerName !== undefined) setValue('customer_name', customerName);
    const customerEmail = readString(updates.customerEmail ?? updates.customer_email ?? updates.clientEmail ?? updates.email);
    if (customerEmail !== undefined) setValue('customer_email', customerEmail || null);
    const customerAddress = readString(updates.customerAddress ?? updates.customer_address ?? updates.clientAddress ?? updates.address);
    if (customerAddress !== undefined) setValue('customer_address', customerAddress || null);
    const paymentTerms = readString(updates.paymentTerms ?? updates.payment_terms);
    if (paymentTerms !== undefined) setValue('payment_terms', paymentTerms);
    const reminderNote = readString(updates.reminderNote ?? updates.reminder_note);
    if (reminderNote !== undefined) setValue('reminder_note', reminderNote || null);
    const notes = readString(updates.notes ?? updates.nota ?? updates.notas);
    if (notes !== undefined) setValue('notes', notes);
    const currency = readString(updates.currency ?? updates.moneda);
    if (currency !== undefined) setValue('currency', (currency || 'USD').toUpperCase());
    const aiOptimizedTerms = readString(updates.aiOptimizedTerms ?? updates.ai_optimized_terms);
    if (aiOptimizedTerms !== undefined) setValue('ai_optimized_terms', aiOptimizedTerms || null);
    const aiOptimizedReminder = readString(updates.aiOptimizedReminder ?? updates.ai_optimized_reminder);
    if (aiOptimizedReminder !== undefined) setValue('ai_optimized_reminder', aiOptimizedReminder || null);

    if (Array.isArray(updates.items)) {
        const items = normalizeInvoiceItems(updates.items, readString(input.request));
        setValue('items', items);
        if (updates.subtotal === undefined) {
            setValue('subtotal', items.reduce((sum, item) => sum + (readNumber(item.total) ?? 0), 0));
        }
    }

    const subtotal = readNumber(updates.subtotal);
    if (subtotal !== undefined) setValue('subtotal', subtotal);
    const taxTotal = readNumber(updates.taxTotal ?? updates.tax_total);
    if (taxTotal !== undefined) setValue('tax_total', taxTotal);
    const discountTotal = readNumber(updates.discountTotal ?? updates.discount_total);
    if (discountTotal !== undefined) setValue('discount_total', discountTotal);
    const total = readNumber(updates.total ?? updates.amount ?? updates.monto);
    if (total !== undefined) setValue('total', total);

    const metadata = mergeAssistantMetadata(currentRow.metadata, input, action, context);
    const assistantDrafts = asRecord(metadata.assistantDrafts);
    metadata.assistantDrafts = {
        ...assistantDrafts,
        financeUpdate: {
            ...asRecord(assistantDrafts.financeUpdate),
            prompt: readString(input.request) || 'AI finance invoice update',
            status: 'needs_review',
            generatedAt: now,
            generatedByAI: true,
            needsReview: true,
            noAutoCharge: true,
            noLedgerEntry: true,
        },
    };
    patch.metadata = metadata;
    changedFields.push(changedFields.length === 0
        ? 'metadata.assistantDrafts.financeUpdate'
        : 'metadata.globalAssistant');

    return { patch, changedFields: Array.from(new Set(changedFields)) };
};

const updateFinanceRecordHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const recordId = readString(input.recordId)
            || readString(input.record_id)
            || readString(input.invoiceId)
            || readString(input.invoice_id)
            || readString(input.targetId);
        const hasUpdates = Object.keys({
            ...deriveFinanceInvoiceUpdatesFromRequest(input.request, getNow(deps)),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'record'),
        }).length > 0;
        const errors = [
            ...(!recordId ? ['recordId is required before updating a finance invoice.'] : []),
            ...(!hasUpdates ? ['At least one supported finance invoice update is required.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const recordId = getTargetFinanceRecordId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'accounting_invoices', projectId, recordId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...deriveFinanceInvoiceUpdatesFromRequest(input.request, now),
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'record'),
        };
        const { patch, changedFields } = buildFinanceInvoiceUpdatePatch(currentRow, updates, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'accounting_invoices', projectId, recordId, patch);
        return {
            beforeSnapshot: { table: 'accounting_invoices', id: recordId, projectId, row: previousRow },
            afterSnapshot: { table: 'accounting_invoices', id: recordId, projectId, row },
            diff: {
                updated: changedFields.map(field => `accounting_invoices.${recordId}.${field}`),
                critical: true,
                reviewRequired: true,
                noAutoCharge: true,
                noLedgerEntry: true,
                rollback: 'restore_previous_finance_invoice_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('accounting_invoices', deps),
});

const resolveRestaurant = async (
    client: SupabaseClientLike,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    projectId: string,
): Promise<{ id: string; tenantId: string; row: Record<string, unknown> }> => {
    const details = {
        ...requireObject(input, 'item'),
        ...requireObject(input, 'offer'),
        ...requireObject(input, 'campaign'),
        ...requireObject(input, 'flow'),
    };
    const explicitRestaurantId = readString(input.restaurantId) || readString(details.restaurantId) || readString(details.restaurant_id);
    const query = explicitRestaurantId
        ? client.from('restaurants').select('*').eq('id', explicitRestaurantId)
        : client.from('restaurants').select('*').eq('project_id', projectId);
    const row = await selectFirstRow(query);
    const restaurantId = readString(row.id) || explicitRestaurantId || '';
    const tenantId = readString(row.tenant_id) || getRequiredTenantId(action, context);
    if (!restaurantId) {
        throw new Error('A restaurant record is required before applying restaurant assistant actions.');
    }
    return { id: restaurantId, tenantId, row };
};

const normalizeStringArray = (value: unknown): string[] =>
    asArray(value).map(String).map(item => item.trim()).filter(Boolean);

const getContextRestaurantMenuItemId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '').replace(/\s+/g, '_');
    if (!context?.activeEntityId) return undefined;
    if (['restaurant_menu_item', 'menu_item', 'restaurant_dish', 'dish'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetRestaurantMenuItemId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const item = requireObject(input, 'item');
    const itemId = readString(input.itemId)
        || readString(input.item_id)
        || readString(input.menuItemId)
        || readString(input.menu_item_id)
        || readString(input.targetId)
        || readString(updates.itemId)
        || readString(updates.item_id)
        || readString(item.id)
        || getContextRestaurantMenuItemId(context);
    if (!itemId) throw new Error('itemId is required or the active context must point to a restaurant menu item.');
    return itemId;
};

const loadRestaurantMenuItemRow = async (
    client: SupabaseClientLike,
    restaurantId: string,
    itemId: string,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('restaurant_menu_items').select('*').eq('id', itemId).eq('restaurant_id', restaurantId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`restaurant_menu_items.${itemId} was not found for restaurant ${restaurantId}.`);
    }
    return cloneRecord(row);
};

const updateRestaurantMenuItemRow = async (
    client: SupabaseClientLike,
    restaurantId: string,
    itemId: string,
    patch: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('restaurant_menu_items').update(patch).eq('id', itemId).eq('restaurant_id', restaurantId));
    if (result?.error) throw result.error;
    const row = asRecord(result?.data);
    if (!readString(row.id)) {
        throw new Error(`restaurant_menu_items.${itemId} could not be updated for restaurant ${restaurantId}.`);
    }
    return row;
};

const buildRestaurantMenuItemUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const patch: Record<string, unknown> = { updated_at: now };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const name = readString(updates.name ?? updates.nombre ?? updates.title);
    if (name !== undefined) setValue('name', name);
    const description = readString(updates.description ?? updates.descripcion ?? updates.copy);
    if (description !== undefined) setValue('description', description);
    const category = readString(updates.category ?? updates.categoria);
    if (category !== undefined) setValue('category', category || 'Specials');
    const price = readNumber(updates.price ?? updates.precio);
    if (price !== undefined) setValue('price', price);
    const currency = readString(updates.currency ?? updates.moneda);
    if (currency !== undefined) setValue('currency', (currency || readString(currentRow.currency) || 'USD').toUpperCase());
    const imageUrl = readString(updates.imageUrl ?? updates.image_url);
    if (imageUrl !== undefined) setValue('image_url', imageUrl || null);
    if (Array.isArray(updates.dietaryTags) || Array.isArray(updates.dietary_tags)) {
        setValue('dietary_tags', normalizeStringArray(updates.dietaryTags ?? updates.dietary_tags));
    }
    if (Array.isArray(updates.allergens)) setValue('allergens', normalizeStringArray(updates.allergens));
    if (Array.isArray(updates.ingredients)) setValue('ingredients', normalizeStringArray(updates.ingredients));
    const preparationTime = readNumber(updates.preparationTime ?? updates.preparation_time);
    if (preparationTime !== undefined) setValue('preparation_time', preparationTime);
    const isAvailable = readBoolean(updates.isAvailable ?? updates.is_available ?? updates.available ?? updates.disponible);
    if (isAvailable !== undefined) setValue('is_available', isAvailable);
    const isFeatured = readBoolean(updates.isFeatured ?? updates.is_featured ?? updates.featured);
    if (isFeatured !== undefined) setValue('is_featured', isFeatured);
    if (Array.isArray(updates.upsellItems) || Array.isArray(updates.upsell_items)) {
        setValue('upsell_items', normalizeStringArray(updates.upsellItems ?? updates.upsell_items));
    }
    const position = readNumber(updates.position);
    if (position !== undefined) setValue('position', position);

    const request = normalizeForSearch(readString(input.request) || '');
    if (isAvailable === undefined && /\b(no disponible|unavailable|oculta|hide|desactiva)\b/.test(request)) {
        setValue('is_available', false);
    } else if (isAvailable === undefined && /\b(disponible|available|mostrar|show|activa)\b/.test(request)) {
        setValue('is_available', true);
    }

    if (changedFields.length === 0 && readString(input.request)) {
        setValue('description', readString(input.request) || readString(currentRow.description) || '');
    }
    setValue('ai_generated', true);

    return { patch, changedFields: Array.from(new Set(changedFields.filter(field => field !== 'updated_at'))) };
};

const createRestaurantMenuItemHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const item = requireObject(input, 'item');
        const request = readString(input.request);
        const now = getNow(deps);
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const name = readString(item.name) || titleFromRequest(request, 'AI menu item draft');
        const row = await insertRow(client, 'restaurant_menu_items', {
            tenant_id: restaurant.tenantId,
            restaurant_id: restaurant.id,
            name,
            description: readString(item.description) || request || '',
            category: readString(item.category) || 'Specials',
            price: readNumber(item.price) ?? 0,
            currency: readString(item.currency) || readString(restaurant.row.currency) || 'USD',
            image_url: readString(item.imageUrl ?? item.image_url) || null,
            dietary_tags: normalizeStringArray(item.dietaryTags ?? item.dietary_tags),
            allergens: normalizeStringArray(item.allergens),
            ingredients: normalizeStringArray(item.ingredients),
            preparation_time: readNumber(item.preparationTime ?? item.preparation_time) ?? null,
            is_available: false,
            is_featured: item.isFeatured === true || item.is_featured === true,
            upsell_items: normalizeStringArray(item.upsellItems ?? item.upsell_items),
            ai_generated: true,
            position: readNumber(item.position) ?? Date.parse(now),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'restaurant_menu_items', id, row },
            diff: { created: [`restaurant_menu_items.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('restaurant_menu_items', deps),
});

const updateRestaurantMenuHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const itemId = readString(input.itemId)
            || readString(input.item_id)
            || readString(input.menuItemId)
            || readString(input.menu_item_id)
            || readString(input.targetId);
        return {
            valid: Boolean(itemId),
            errors: itemId ? [] : ['itemId is required before updating a restaurant menu item.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const itemId = getTargetRestaurantMenuItemId(input, context);
        const now = getNow(deps);
        const currentRow = await loadRestaurantMenuItemRow(client, restaurant.id, itemId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'item'),
        };
        const { patch, changedFields } = buildRestaurantMenuItemUpdatePatch(currentRow, updates, input, now);
        const row = await updateRestaurantMenuItemRow(client, restaurant.id, itemId, patch);
        return {
            beforeSnapshot: { table: 'restaurant_menu_items', id: itemId, restaurantId: restaurant.id, row: previousRow },
            afterSnapshot: { table: 'restaurant_menu_items', id: itemId, restaurantId: restaurant.id, row },
            diff: {
                updated: changedFields.map(field => `restaurant_menu_items.${itemId}.${field}`),
                reviewRequired: true,
                rollback: 'restore_previous_restaurant_menu_item_snapshot',
            },
        };
    },
    rollback: async (_input, { snapshot }) => {
        const before = asRecord(snapshot.beforeSnapshot);
        const row = asRecord(before.row);
        const itemId = readString(before.id) || readString(row.id);
        const restaurantId = readString(before.restaurantId) || readString(row.restaurant_id);
        if (!itemId || !restaurantId || !Object.keys(row).length) {
            throw new Error('Cannot rollback restaurant menu item: previous row snapshot was not recorded.');
        }
        const { id: _id, ...restorePatch } = row;
        const restored = await updateRestaurantMenuItemRow(getClient(deps), restaurantId, itemId, restorePatch);
        return {
            afterSnapshot: {
                table: 'restaurant_menu_items',
                id: itemId,
                restaurantId,
                row: restored,
                restored: true,
            },
            diff: {
                restored: [`restaurant_menu_items.${itemId}`],
            },
        };
    },
});

const buildRestaurantReservationFlowPatch = (
    currentRow: Record<string, unknown>,
    flow: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const patch: Record<string, unknown> = { updated_at: now };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const enabled = readBoolean(flow.enabled ?? flow.reservationEnabled ?? flow.reservation_enabled);
    setValue('reservation_enabled', enabled ?? Boolean(currentRow.reservation_enabled));
    const maxPartySize = readNumber(flow.maxPartySize ?? flow.max_party_size);
    if (maxPartySize !== undefined) setValue('max_party_size', maxPartySize);
    else if (currentRow.max_party_size === undefined || currentRow.max_party_size === null) setValue('max_party_size', 8);
    const interval = readNumber(flow.reservationInterval ?? flow.reservation_interval ?? flow.interval);
    if (interval !== undefined) setValue('reservation_interval', interval);
    else if (currentRow.reservation_interval === undefined || currentRow.reservation_interval === null) setValue('reservation_interval', 30);
    const duration = readNumber(flow.averageTableDuration ?? flow.average_table_duration ?? flow.duration);
    if (duration !== undefined) setValue('average_table_duration', duration);
    else if (currentRow.average_table_duration === undefined || currentRow.average_table_duration === null) setValue('average_table_duration', 90);
    const hours = readString(flow.hours ?? flow.horario);
    if (hours !== undefined) setValue('hours', hours);
    const languages = normalizeStringArray(flow.languagesEnabled ?? flow.languages_enabled);
    if (languages.length > 0) setValue('languages_enabled', languages);

    const existingSettings = asRecord(currentRow.settings);
    const settings = mergeAssistantMetadata(existingSettings, input, action, context);
    settings.reservationFlowDraft = {
        ...asRecord(existingSettings.reservationFlowDraft),
        prompt: readString(input.request) || 'AI restaurant reservation flow',
        status: 'needs_review',
        generatedAt: now,
        generatedByAI: true,
        needsReview: true,
        noAutoConfirm: true,
        confirmationMode: readString(flow.confirmationMode ?? flow.confirmation_mode) || 'manual',
        tablePreferences: normalizeStringArray(flow.tablePreferences ?? flow.table_preferences),
        cancellationPolicy: readString(flow.cancellationPolicy ?? flow.cancellation_policy) || '',
    };
    setValue('settings', settings);

    return { patch, changedFields: Array.from(new Set(changedFields.filter(field => field !== 'updated_at'))) };
};

const createRestaurantReservationFlowHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const now = getNow(deps);
        const currentRow = cloneRecord(restaurant.row);
        const flow = requireObject(input, 'flow');
        const { patch, changedFields } = buildRestaurantReservationFlowPatch(currentRow, flow, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'restaurants', projectId, restaurant.id, patch);
        return {
            beforeSnapshot: { table: 'restaurants', id: restaurant.id, projectId, row: currentRow },
            afterSnapshot: { table: 'restaurants', id: restaurant.id, projectId, row },
            diff: {
                updated: changedFields.map(field => `restaurants.${restaurant.id}.${field}`),
                reviewRequired: true,
                noAutoConfirm: true,
                rollback: 'restore_previous_restaurant_settings_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('restaurants', deps),
});

const createRestaurantMarketingOutputHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    options: { actionType: 'create_catering_offer' | 'generate_restaurant_campaign'; outputType: string; fallbackTitle: string },
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const request = readString(input.request);
        const details = {
            ...requireObject(input, 'offer'),
            ...requireObject(input, 'campaign'),
        };
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const prompt = readString(input.prompt) || readString(details.prompt) || request || options.fallbackTitle;
        const title = readString(details.title) || titleFromRequest(prompt, options.fallbackTitle);
        const output = [
            title,
            readString(details.description) || prompt,
            '',
            'Status: draft for human review before publishing or sending.',
        ].filter(Boolean).join('\n');
        const row = await insertRow(client, 'restaurant_marketing_outputs', {
            tenant_id: restaurant.tenantId,
            restaurant_id: restaurant.id,
            type: readString(details.type) || options.outputType,
            prompt,
            output,
            created_by: getAssistantUserId(action, context),
            created_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'restaurant_marketing_outputs', id, row },
            diff: { created: [`restaurant_marketing_outputs.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('restaurant_marketing_outputs', deps),
});

const createRealtyListingHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const listing = requireObject(input, 'listing');
        const request = readString(input.request);
        const now = getNow(deps);
        const title = readString(listing.title) || titleFromRequest(request, 'AI real estate listing draft');
        const property: Partial<RealtyProperty> = {
            title,
            slug: readString(listing.slug) || toRealtySlug(`${title}-${action.id.slice(-8)}`),
            description: readString(listing.description) || request || '',
            descriptionShort: readString(listing.descriptionShort ?? listing.description_short),
            descriptionLong: readString(listing.descriptionLong ?? listing.description_long) || readString(listing.description) || request || '',
            price: readNumber(listing.price) ?? 0,
            currency: readString(listing.currency) || 'USD',
            transactionType: readString(listing.transactionType ?? listing.transaction_type) as RealtyProperty['transactionType'] || 'sale',
            propertyType: readString(listing.propertyType ?? listing.property_type) as RealtyProperty['propertyType'] || 'house',
            status: 'draft',
            address: readString(listing.address) || readString(listing.addressLine1 ?? listing.address_line_1) || '',
            addressLine1: readString(listing.addressLine1 ?? listing.address_line_1) || readString(listing.address) || '',
            city: readString(listing.city) || '',
            state: readString(listing.state),
            country: readString(listing.country),
            zipCode: readString(listing.zipCode ?? listing.zip_code ?? listing.postalCode ?? listing.postal_code),
            bedrooms: readNumber(listing.bedrooms) ?? 0,
            bathrooms: readNumber(listing.bathrooms) ?? 0,
            area: readNumber(listing.area ?? listing.square_feet ?? listing.areaSqft ?? listing.area_sqft) ?? 0,
            areaUnit: 'sqft',
            amenities: normalizeStringArray(listing.amenities),
            features: normalizeStringArray(listing.features),
            highlights: normalizeStringArray(listing.highlights),
            images: [],
            isFeatured: false,
            publicEnabled: false,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
            },
        };
        const row = await insertRow(client, 'properties', {
            ...mapRealtyPropertyToRow(property, userId, projectId, tenantId),
            status: 'draft',
            public_enabled: false,
            published_at: null,
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'properties', id, row },
            diff: { created: [`properties.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('properties', deps),
});

const realtyListingStatuses = new Set(['draft', 'active', 'pending', 'sold', 'archived']);
const realtyTransactionTypes = new Set(['sale', 'rent', 'lease']);
const realtyPropertyTypeValues = new Set(['house', 'condo', 'apartment', 'townhouse', 'land', 'commercial']);

const getContextRealtyListingId = (context?: AssistantContextSnapshot): string | undefined => {
    const entityType = normalizeForSearch(context?.activeEntityType || '').replace(/\s+/g, '_');
    if (!context?.activeEntityId) return undefined;
    if (['realty_property', 'real_estate_property', 'property', 'listing', 'realty_listing'].includes(entityType)) {
        return context.activeEntityId;
    }
    return undefined;
};

const getTargetRealtyListingId = (
    input: Record<string, unknown>,
    context?: AssistantContextSnapshot,
): string => {
    const updates = requireObject(input, 'updates');
    const listing = requireObject(input, 'listing');
    const listingId = readString(input.listingId)
        || readString(input.listing_id)
        || readString(input.propertyId)
        || readString(input.property_id)
        || readString(input.targetId)
        || readString(updates.listingId)
        || readString(updates.propertyId)
        || readString(listing.id)
        || getContextRealtyListingId(context);
    if (!listingId) throw new Error('listingId is required or the active context must point to a Realty listing.');
    return listingId;
};

const normalizedEnum = (
    value: unknown,
    allowed: Set<string>,
): string | undefined => {
    const text = readString(value);
    if (!text) return undefined;
    const normalized = normalizeForSearch(text).replace(/\s+/g, '_');
    return allowed.has(normalized) ? normalized : undefined;
};

const buildRealtyListingUpdatePatch = (
    currentRow: Record<string, unknown>,
    updates: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): { patch: Record<string, unknown>; changedFields: string[] } => {
    const patch: Record<string, unknown> = { updated_at: now };
    const changedFields: string[] = [];
    const setValue = (column: string, value: unknown) => {
        patch[column] = value;
        changedFields.push(column);
    };

    const title = readString(updates.title ?? updates.titulo ?? updates.name);
    if (title !== undefined) setValue('title', title);
    const slug = readString(updates.slug);
    if (slug !== undefined) setValue('slug', slug ? toRealtySlug(slug) : toRealtySlug(title || readString(currentRow.title) || 'property'));
    const description = readString(updates.description ?? updates.descripcion);
    if (description !== undefined) {
        setValue('description', description);
        setValue('description_long', description);
    }
    const descriptionShort = readString(updates.descriptionShort ?? updates.description_short);
    if (descriptionShort !== undefined) setValue('description_short', descriptionShort || null);
    const descriptionLong = readString(updates.descriptionLong ?? updates.description_long);
    if (descriptionLong !== undefined) {
        setValue('description_long', descriptionLong);
        setValue('description', descriptionLong);
    }
    const price = readNumber(updates.price ?? updates.precio);
    if (price !== undefined) setValue('price', price);
    const currency = readString(updates.currency ?? updates.moneda);
    if (currency !== undefined) setValue('currency', (currency || readString(currentRow.currency) || 'USD').toUpperCase());
    const transactionType = normalizedEnum(updates.transactionType ?? updates.transaction_type, realtyTransactionTypes);
    if (transactionType) setValue('transaction_type', transactionType);
    const propertyType = normalizedEnum(updates.propertyType ?? updates.property_type, realtyPropertyTypeValues);
    if (propertyType) setValue('property_type', propertyType);
    const status = normalizedEnum(updates.status ?? updates.estado, realtyListingStatuses);
    if (status) setValue('status', status);
    const address = readString(updates.address ?? updates.addressLine1 ?? updates.address_line_1 ?? updates.direccion);
    if (address !== undefined) {
        setValue('address', address);
        setValue('address_line_1', address);
    }
    const addressLine2 = readString(updates.addressLine2 ?? updates.address_line_2);
    if (addressLine2 !== undefined) setValue('address_line_2', addressLine2 || null);
    const city = readString(updates.city ?? updates.ciudad);
    if (city !== undefined) setValue('city', city);
    const state = readString(updates.state ?? updates.estado_region);
    if (state !== undefined) setValue('state', state || null);
    const country = readString(updates.country ?? updates.pais);
    if (country !== undefined) setValue('country', country || null);
    const postalCode = readString(updates.postalCode ?? updates.postal_code ?? updates.zipCode ?? updates.zip_code);
    if (postalCode !== undefined) {
        setValue('zip_code', postalCode || null);
        setValue('postal_code', postalCode || null);
    }
    const bedrooms = readNumber(updates.bedrooms ?? updates.habitaciones);
    if (bedrooms !== undefined) setValue('bedrooms', bedrooms);
    const bathrooms = readNumber(updates.bathrooms ?? updates.banos ?? updates.baños);
    if (bathrooms !== undefined) setValue('bathrooms', bathrooms);
    const halfBathrooms = readNumber(updates.halfBathrooms ?? updates.half_bathrooms);
    if (halfBathrooms !== undefined) setValue('half_bathrooms', halfBathrooms);
    const area = readNumber(updates.area ?? updates.square_feet ?? updates.areaSqft ?? updates.area_sqft);
    if (area !== undefined) {
        setValue('square_feet', area);
        setValue('area_sqft', area);
    }
    const lotSize = readNumber(updates.lotSize ?? updates.lot_size ?? updates.lotSqft ?? updates.lot_sqft);
    if (lotSize !== undefined) {
        setValue('lot_size', lotSize);
        setValue('lot_sqft', lotSize);
    }
    const parkingSpaces = readNumber(updates.parkingSpaces ?? updates.parking_spaces);
    if (parkingSpaces !== undefined) setValue('parking_spaces', parkingSpaces);
    const yearBuilt = readNumber(updates.yearBuilt ?? updates.year_built);
    if (yearBuilt !== undefined) setValue('year_built', yearBuilt);
    const hoaFee = readNumber(updates.hoaFee ?? updates.hoa_fee);
    if (hoaFee !== undefined) setValue('hoa_fee', hoaFee);
    const taxes = readNumber(updates.taxes);
    if (taxes !== undefined) setValue('taxes', taxes);
    if (Array.isArray(updates.amenities)) setValue('amenities', normalizeStringArray(updates.amenities));
    if (Array.isArray(updates.features)) setValue('features', normalizeStringArray(updates.features));
    if (Array.isArray(updates.highlights)) setValue('highlights', normalizeStringArray(updates.highlights));
    if (Array.isArray(updates.images)) setValue('images', updates.images);
    const mainImageUrl = readString(updates.mainImageUrl ?? updates.main_image_url ?? updates.imageUrl ?? updates.image_url);
    if (mainImageUrl !== undefined) setValue('main_image_url', mainImageUrl || null);
    const videoUrl = readString(updates.videoUrl ?? updates.video_url);
    if (videoUrl !== undefined) setValue('video_url', videoUrl || null);
    const virtualTourUrl = readString(updates.virtualTourUrl ?? updates.virtual_tour_url);
    if (virtualTourUrl !== undefined) setValue('virtual_tour_url', virtualTourUrl || null);
    const seoTitle = readString(updates.seoTitle ?? updates.seo_title);
    if (seoTitle !== undefined) setValue('seo_title', seoTitle || null);
    const seoDescription = readString(updates.seoDescription ?? updates.seo_description);
    if (seoDescription !== undefined) setValue('seo_description', seoDescription || null);
    const isFeatured = readBoolean(updates.isFeatured ?? updates.is_featured);
    if (isFeatured !== undefined) setValue('is_featured', isFeatured);
    const publicEnabled = readBoolean(updates.publicEnabled ?? updates.public_enabled);
    if (publicEnabled !== undefined) setValue('public_enabled', publicEnabled);

    const metadata = mergeAssistantMetadata(currentRow.metadata, input, action, context);
    const assistantDrafts = asRecord(metadata.assistantDrafts);
    metadata.assistantDrafts = {
        ...assistantDrafts,
        realtyListingUpdate: {
            ...asRecord(assistantDrafts.realtyListingUpdate),
            prompt: readString(input.request) || 'AI Realty listing update',
            status: 'needs_review',
            generatedAt: now,
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        },
    };
    setValue('metadata', metadata);

    return { patch, changedFields: Array.from(new Set(changedFields.filter(field => field !== 'updated_at'))) };
};

const editRealtyListingHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const listingId = readString(input.listingId)
            || readString(input.listing_id)
            || readString(input.propertyId)
            || readString(input.property_id)
            || readString(input.targetId);
        return {
            valid: Boolean(listingId),
            errors: listingId ? [] : ['listingId is required before editing a Realty listing.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const listingId = getTargetRealtyListingId(input, context);
        const now = getNow(deps);
        const currentRow = await loadProjectScopedRow(client, 'properties', projectId, listingId);
        const previousRow = cloneRecord(currentRow);
        const updates = {
            ...requireObject(input, 'updates'),
            ...requireObject(input, 'listing'),
        };
        const { patch, changedFields } = buildRealtyListingUpdatePatch(currentRow, updates, input, action, context, now);
        const row = await updateProjectScopedRow(client, 'properties', projectId, listingId, patch);
        return {
            beforeSnapshot: { table: 'properties', id: listingId, projectId, row: previousRow },
            afterSnapshot: { table: 'properties', id: listingId, projectId, row },
            diff: {
                updated: changedFields.map(field => `properties.${listingId}.${field}`),
                reviewRequired: true,
                noAutoPublish: true,
                rollback: 'restore_previous_realty_listing_snapshot',
            },
        };
    },
    rollback: rollbackUpdatedProjectScopedRow('properties', deps),
});

const realtyShowingAvailabilitySources = new Set(['manual', 'appointments', 'calendar', 'unset']);
const realtyConfirmationModes = new Set(['manual', 'auto']);

const updateRealtyShowingFlowInBlueprint = (
    businessBlueprint: BusinessBlueprint,
    flow: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): BusinessBlueprint => {
    const realty = businessBlueprint.realEstateBlueprint;
    if (!realty) {
        throw new Error('RealEstateBlueprint is required before configuring a Realty showing request flow.');
    }
    const existing = realty.showingRequests;
    const leadFunnels = realty.leadFunnels;
    const propertyPages = realty.propertyPages;
    const integrations = realty.integrations;
    const realtyMetadata = asRecord(realty.metadata);
    const enabled = readBoolean(flow.enabled ?? flow.showingRequestEnabled ?? flow.showing_request_enabled);
    const appointmentIntegrationEnabled = readBoolean(flow.appointmentIntegrationEnabled ?? flow.appointment_integration_enabled);
    const availabilitySource = normalizedEnum(flow.availabilitySource ?? flow.availability_source, realtyShowingAvailabilitySources);
    const confirmationMode = normalizedEnum(flow.confirmationMode ?? flow.confirmation_mode, realtyConfirmationModes);
    const buyerQualificationFields = normalizeStringArray(flow.buyerQualificationFields ?? flow.buyer_qualification_fields);
    const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
    const sourceMap = {
        ...(realty.sourceMap || {}),
        ...assistantSourceMap(input, action, context),
        showingRequests: 'globalAssistant.realty.showingRequestFlow',
    };

    return {
        ...businessBlueprint,
        realEstateBlueprint: {
            ...realty,
            status: 'needs_review',
            needsReview: true,
            readiness: {
                ...realty.readiness,
                isReady: false,
                warnings: unique([
                    ...(realty.readiness?.warnings || []),
                    'Realty showing request flow was updated by Global Assistant and needs review.',
                ]),
            },
            metadata: {
                ...realtyMetadata,
                generatedBy: realty.metadata?.generatedBy || 'ai',
                userModified: true,
                lockedFromRegeneration: true,
                lastEditedAt: now,
                lastEditedBy: action.userId || context?.actor.userId || readString(realtyMetadata.lastEditedBy),
                updatedAt: now,
            },
            sourceMap,
            showingRequests: {
                ...existing,
                enabled: enabled ?? true,
                status: 'needs_review',
                availabilitySource: availabilitySource as any || existing.availabilitySource || 'manual',
                preferredDateEnabled: readBoolean(flow.preferredDateEnabled ?? flow.preferred_date_enabled) ?? true,
                preferredTimeEnabled: readBoolean(flow.preferredTimeEnabled ?? flow.preferred_time_enabled) ?? true,
                buyerQualificationFields: buyerQualificationFields.length > 0
                    ? buyerQualificationFields
                    : unique([...(existing.buyerQualificationFields || []), 'name', 'email', 'phone']),
                financingStatusField: readBoolean(flow.financingStatusField ?? flow.financing_status_field) ?? existing.financingStatusField ?? true,
                budgetField: readBoolean(flow.budgetField ?? flow.budget_field) ?? existing.budgetField ?? true,
                assignedAgentStrategy: readString(flow.assignedAgentStrategy ?? flow.assigned_agent_strategy) || existing.assignedAgentStrategy || 'owner',
                confirmationMode: confirmationMode as any || existing.confirmationMode || 'manual',
                remindersEnabled: readBoolean(flow.remindersEnabled ?? flow.reminders_enabled) ?? existing.remindersEnabled ?? false,
                appointmentIntegrationEnabled: appointmentIntegrationEnabled ?? existing.appointmentIntegrationEnabled ?? false,
                needsReview: true,
                readiness: {
                    isReady: false,
                    blockers: [],
                    warnings: ['Review showing request copy, availability source, and appointment handoff before enabling automation.'],
                },
            },
            leadFunnels: {
                ...leadFunnels,
                showingRequestEnabled: true,
                needsReview: true,
                leadTags: unique([...(leadFunnels.leadTags || []), 'realty', 'showing-request']),
                leadSources: unique([...(leadFunnels.leadSources || []), 'property_detail', 'realty-website']),
            },
            propertyPages: {
                ...propertyPages,
                showingRequestEnabled: true,
                status: 'needs_review',
                needsReview: true,
            },
            chatbot: {
                ...realty.chatbot,
                intents: unique([...(realty.chatbot?.intents || []), 'showing_request']) as any,
            },
            emailMarketing: {
                ...realty.emailMarketing,
                flows: unique([...(realty.emailMarketing?.flows || []), 'showing_request_confirmation']) as any,
            },
            analytics: {
                ...realty.analytics,
                events: unique([...(realty.analytics?.events || []), 'showing_requested']) as any,
            },
            integrations: {
                ...integrations,
                appointmentIntegration: appointmentIntegrationEnabled ?? integrations.appointmentIntegration ?? false,
                crmTags: unique([...(integrations.crmTags || []), 'realty', 'showing-request']),
                crmLeadSources: unique([...(integrations.crmLeadSources || []), 'property_detail', 'realty-website']),
                emailFlows: unique([...(integrations.emailFlows || []), 'showing_request_confirmation']),
                chatbotKnowledgeSources: unique([...(integrations.chatbotKnowledgeSources || []), 'realty_listings']),
                analyticsEvents: unique([...(integrations.analyticsEvents || []), 'showing_requested']),
                automationFlows: unique([...(integrations.automationFlows || []), 'showing_request_review']),
            },
        },
    };
};

const createRealtyShowingRequestFlowHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const businessBlueprint = migrateBusinessBlueprint(
            projectData.businessBlueprint || asRecord(projectData.data).businessBlueprint,
        );
        if (!businessBlueprint) {
            throw new Error('BusinessBlueprint is required before configuring a Realty showing request flow.');
        }
        const nextBlueprint = updateRealtyShowingFlowInBlueprint(
            businessBlueprint,
            requireObject(input, 'flow'),
            input,
            action,
            context,
            now,
        );
        const nextData = applyBusinessBlueprintToProjectData(projectData, nextBlueprint);
        await updateProjectData(client, projectId, nextData, now);
        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                showingRequests: nextBlueprint.realEstateBlueprint.showingRequests,
            },
            diff: {
                updated: [
                    `projects.${projectId}.data.businessBlueprint.realEstateBlueprint.showingRequests`,
                    `projects.${projectId}.data.businessBlueprint.realEstateBlueprint.leadFunnels`,
                    `projects.${projectId}.data.businessBlueprint.realEstateBlueprint.propertyPages`,
                    `projects.${projectId}.data.businessBlueprint.realEstateBlueprint.integrations`,
                ],
                reviewRequired: true,
                noAutoPublish: true,
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: rollbackProjectDataSnapshot(deps, 'Realty showing request flow'),
});

const createRealtyCampaignHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const request = readString(input.request);
        const campaignInput = requireObject(input, 'campaign');
        const prompt = readString(input.prompt) || readString(campaignInput.prompt) || request || 'AI realty campaign draft';
        const title = readString(campaignInput.title) || titleFromRequest(prompt, 'AI realty campaign draft');
        const campaign: Partial<PropertyCampaign> = {
            propertyId: readString(input.listingId) || readString(input.propertyId) || readString(campaignInput.propertyId ?? campaignInput.property_id) || null,
            campaignType: readString(campaignInput.campaignType ?? campaignInput.campaign_type) as PropertyCampaign['campaignType'] || 'social',
            title,
            status: 'draft',
            content: {
                prompt,
                copy: readString(campaignInput.copy) || prompt,
                generatedByAI: true,
                needsReview: true,
            },
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                noAutoPublish: true,
            },
        };
        const now = getNow(deps);
        const row = await insertRow(client, 'property_campaigns', {
            ...mapPropertyCampaignToRow(campaign, userId, projectId, tenantId),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'property_campaigns', id, row },
            diff: { created: [`property_campaigns.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('property_campaigns', deps),
});

const createRealtyOpenHouseHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const event = requireObject(input, 'event');
        const startsAt = readString(event.startsAt) || readString(event.starts_at) || readString(event.startDate);
        return {
            valid: Boolean(startsAt),
            errors: startsAt ? [] : ['event.startsAt is required before creating a Realty open house.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const event = requireObject(input, 'event');
        const propertyId = readString(input.listingId) || readString(input.propertyId) || readString(event.propertyId ?? event.property_id);
        if (!propertyId) throw new Error('listingId is required before creating a Realty open house.');
        const now = getNow(deps);
        const startsAt = readString(event.startsAt) || readString(event.starts_at) || readString(event.startDate) || now;
        const openHouse: Partial<PropertyOpenHouse> = {
            propertyId,
            title: readString(event.title) || titleFromRequest(readString(input.request), 'AI open house draft'),
            startsAt,
            endsAt: readString(event.endsAt) || readString(event.ends_at) || null,
            timezone: readString(event.timezone) || 'America/Puerto_Rico',
            status: 'scheduled',
            notes: readString(event.notes) || readString(input.request) || null,
            registrationEnabled: event.registrationEnabled !== false && event.registration_enabled !== false,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                needsReview: true,
            },
        };
        const row = await insertRow(client, 'property_open_houses', {
            ...mapPropertyOpenHouseToRow(openHouse, userId, projectId, tenantId),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'property_open_houses', id, row },
            diff: { created: [`property_open_houses.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('property_open_houses', deps),
});

type AnalyticsSourceKey =
    | 'leads'
    | 'appointments'
    | 'emailCampaigns'
    | 'emailAudiences'
    | 'emailEvents'
    | 'products'
    | 'orders'
    | 'mediaAssets'
    | 'bioPages'
    | 'bioPageEvents'
    | 'chatbotEvents'
    | 'financeInvoices'
    | 'realtyListings'
    | 'restaurantEvents';

const ANALYTICS_SOURCES: Array<{
    key: AnalyticsSourceKey;
    table: string;
    projectField: string;
    columns: string;
    statusField?: string;
    eventField?: string;
}> = [
    { key: 'leads', table: 'leads', projectField: 'project_id', columns: 'id,status,source,created_at', statusField: 'status' },
    { key: 'appointments', table: 'project_appointments', projectField: 'project_id', columns: 'id,status,source,created_at,start_date', statusField: 'status' },
    { key: 'emailCampaigns', table: 'email_campaigns', projectField: 'project_id', columns: 'id,status,type,created_at', statusField: 'status' },
    { key: 'emailAudiences', table: 'email_audiences', projectField: 'project_id', columns: 'id,status,created_at', statusField: 'status' },
    { key: 'emailEvents', table: 'email_events', projectField: 'project_id', columns: 'id,event_type,type,received_at,created_at', eventField: 'event_type' },
    { key: 'products', table: 'store_products', projectField: 'project_id', columns: 'id,data,created_at' },
    { key: 'orders', table: 'store_orders', projectField: 'project_id', columns: 'id,status,total,created_at', statusField: 'status' },
    { key: 'mediaAssets', table: 'media_assets', projectField: 'metadata->>projectId', columns: 'id,category,is_ai_generated,metadata,created_at', statusField: 'category' },
    { key: 'bioPages', table: 'bio_pages', projectField: 'project_id', columns: 'id,status,created_at', statusField: 'status' },
    { key: 'bioPageEvents', table: 'bio_page_events', projectField: 'project_id', columns: 'id,event_type,created_at', eventField: 'event_type' },
    { key: 'chatbotEvents', table: 'chatbot_engine_events', projectField: 'project_id', columns: 'id,event_type,action_type,intent,created_at', eventField: 'event_type' },
    { key: 'financeInvoices', table: 'accounting_invoices', projectField: 'project_id', columns: 'id,status,total,created_at', statusField: 'status' },
    { key: 'realtyListings', table: 'properties', projectField: 'project_id', columns: 'id,status,public_enabled,created_at', statusField: 'status' },
    { key: 'restaurantEvents', table: 'restaurant_analytics_events', projectField: 'project_id', columns: 'id,event_type,created_at', eventField: 'event_type' },
];

const countByField = (rows: Record<string, unknown>[], field?: string): Record<string, number> => {
    if (!field) return {};
    return rows.reduce<Record<string, number>>((acc, row) => {
        const value = readString(row[field]) || 'unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
};

const safeReadAnalyticsRows = async (
    client: SupabaseClientLike,
    source: (typeof ANALYTICS_SOURCES)[number],
    projectId: string,
): Promise<{ source: (typeof ANALYTICS_SOURCES)[number]; rows: Record<string, unknown>[]; warning?: string }> => {
    try {
        let query = client
            .from(source.table)
            .select(source.columns)
            .eq(source.projectField, projectId);
        if (typeof query.limit === 'function') query = query.limit(100);
        const result = await query;
        if (result?.error) throw result.error;
        return { source, rows: asArray(result?.data).map(asRecord) };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            source,
            rows: [],
            warning: `${source.table}: ${message}`,
        };
    }
};

const activeServiceSet = (context?: AssistantContextSnapshot): Set<string> =>
    new Set(context?.tenant.activeServices || []);

const buildProjectAnalyticsSnapshot = async (
    deps: GlobalAssistantActionHandlerDependencies,
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
) => {
    const client = getClient(deps);
    const projectId = getProjectId(input, action, context);
    const now = getNow(deps);
    const results = await Promise.all(
        ANALYTICS_SOURCES.map(source => safeReadAnalyticsRows(client, source, projectId)),
    );
    const modules = results.reduce<Record<string, Record<string, unknown>>>((acc, result) => {
        acc[result.source.key] = {
            table: result.source.table,
            count: result.rows.length,
            byStatus: countByField(result.rows, result.source.statusField),
            byEvent: countByField(result.rows, result.source.eventField),
            sampleIds: result.rows.slice(0, 5).map(row => readString(row.id)).filter(Boolean),
        };
        return acc;
    }, {});
    const services = activeServiceSet(context);
    const warnings = results.map(result => result.warning).filter((warning): warning is string => Boolean(warning));
    const blockers = [
        ...(!projectId ? ['missing_project_id'] : []),
        ...(services.has('crm') && (modules.leads?.count as number || 0) === 0 ? ['crm_has_no_leads'] : []),
        ...(services.has('appointments') && (modules.appointments?.count as number || 0) === 0 ? ['appointments_have_no_records'] : []),
        ...(services.has('emailMarketing') && (modules.emailCampaigns?.count as number || 0) === 0 ? ['email_marketing_has_no_campaigns'] : []),
        ...(services.has('emailMarketing') && (modules.emailAudiences?.count as number || 0) === 0 ? ['email_marketing_has_no_audiences'] : []),
        ...(services.has('ecommerce') && (modules.products?.count as number || 0) === 0 ? ['ecommerce_has_no_products'] : []),
        ...(services.has('ecommerce') && (modules.orders?.count as number || 0) === 0 ? ['ecommerce_has_no_orders'] : []),
        ...(services.has('chatbot') && (modules.chatbotEvents?.count as number || 0) === 0 ? ['chatcore_has_no_runtime_events'] : []),
        ...(services.has('aiFeatures') && (modules.mediaAssets?.count as number || 0) === 0 ? ['media_ai_has_no_assets'] : []),
        ...(services.has('finance') && (modules.financeInvoices?.count as number || 0) === 0 ? ['finance_has_no_invoices'] : []),
        ...(services.has('realEstate') && (modules.realtyListings?.count as number || 0) === 0 ? ['realty_has_no_listings'] : []),
        ...(services.has('restaurants') && (modules.restaurantEvents?.count as number || 0) === 0 ? ['restaurants_have_no_analytics_events'] : []),
    ];

    return {
        generatedAt: now,
        projectId,
        projectName: context?.project.projectName || null,
        modules,
        blockers,
        warnings,
        sourceTables: ANALYTICS_SOURCES.map(source => source.table),
    };
};

const createAnalyticsHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    kind: 'summary' | 'blockers' | 'report' | 'export',
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const snapshot = await buildProjectAnalyticsSnapshot(deps, input, action, context);
        const request = (readString(input.request) || '').toLowerCase();
        const format = readString(input.format)
            || (request.includes('csv') ? 'csv' : request.includes('pdf') ? 'pdf' : 'json');
        const afterSnapshot = {
            kind,
            format,
            reportId: `${kind}-${snapshot.projectId}-${snapshot.generatedAt}`,
            summary: {
                projectId: snapshot.projectId,
                projectName: snapshot.projectName,
                blockerCount: snapshot.blockers.length,
                warningCount: snapshot.warnings.length,
                totalSignals: Object.values(snapshot.modules).reduce<number>((sum, module) => sum + (readNumber(module.count) ?? 0), 0),
            },
            analytics: snapshot,
            export: kind === 'export'
                ? {
                    fileName: `quimera-project-report-${snapshot.projectId}.${format}`,
                    contentType: format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json',
                    status: 'ready_for_download_renderer',
                }
                : null,
        };

        return {
            afterSnapshot,
            diff: {
                reported: [`analytics.${kind}.${snapshot.projectId}`],
                mutatesData: false,
                sourceTables: snapshot.sourceTables,
            },
        };
    },
});

const HANDLER_FACTORIES: Record<string, (deps: GlobalAssistantActionHandlerDependencies) => HandlerPatch> = {
    open_project: () => createNavigationHandler('editor', { label: 'Open project in Website Builder.', requiresProject: true }),
    switch_project: () => createNavigationHandler('dashboard', { label: 'Switch active project context.', requiresProject: true }),
    search_projects: createSearchProjectsHandler,
    summarize_operating_layer_capabilities: createOperatingLayerCapabilitySummaryHandler,
    create_project_from_prompt: createProjectFromPromptHandler,
    update_project_metadata: createUpdateProjectMetadataHandler,
    summarize_business_blueprint: createBusinessBlueprintSummaryHandler,
    open_website_builder: () => createNavigationHandler('editor', { label: 'Open Website Builder.', requiresProject: true }),
    create_website_from_prompt: createWebsiteFromPromptHandler,
    open_storefront_builder: () => createNavigationHandler('ecommerce', { label: 'Open Storefront Builder.', requiresProject: true, moduleItem: 'storefront' }),
    open_orders: () => createNavigationHandler('ecommerce', { label: 'Open ecommerce orders.', requiresProject: true, moduleItem: 'orders' }),
    open_email_hub: () => createNavigationHandler('email', { label: 'Open Email Hub.', requiresProject: true }),
    open_calendar: () => createNavigationHandler('appointments', { label: 'Open appointments calendar.', requiresProject: true }),
    open_chatbot_dashboard: () => createNavigationHandler('ai-assistant', { label: 'Open ChatCore dashboard.', requiresProject: true }),
    open_media_library: () => createNavigationHandler('assets', { label: 'Open Media AI and asset library.' }),
    open_leads_dashboard: () => createNavigationHandler('leads', { label: 'Open Leads and CRM dashboard.', requiresProject: true }),
    open_bio_page_builder: () => createNavigationHandler('biopage', { label: 'Open Bio Page Builder.', requiresProject: true }),
    open_finance_dashboard: () => createNavigationHandler('finance', { label: 'Open Finance dashboard.' }),
    open_restaurants_dashboard: () => createNavigationHandler('restaurants', { label: 'Open Restaurants module.', requiresProject: true }),
    open_realty_dashboard: () => createNavigationHandler('real-estate', { label: 'Open Quimera Realty Suite.', requiresProject: true }),
    open_agency_command_center: () => createNavigationHandler('agency', { label: 'Open Agency Command Center.', moduleItem: 'command-center' }),
    open_agency_client_360: createAgencyClient360NavigationHandler,
    search_agency_clients: createSearchAgencyClientsHandler,
    summarize_agency_performance: createAgencyPerformanceSummaryHandler,
    create_agency_report: createAgencyReportHandler,
    create_agency_client: createAgencyClientProvisioningHandler,
    transfer_agency_project: createAgencyProjectTransferHandler,
    open_analytics_dashboard: () => createNavigationHandler('superadmin', { label: 'Open platform analytics.', adminView: 'analytics' }),
    open_super_admin: () => createNavigationHandler('superadmin', { label: 'Open Super Admin.' }),
    open_tenant: () => createNavigationHandler('superadmin', { label: 'Open tenant in Super Admin.', adminView: 'tenants' }),
    search_tenants: createSearchTenantsHandler,
    update_feature_flag: createUpdateFeatureFlagHandler,
    update_service_availability: createUpdateServiceAvailabilityHandler,
    update_plan: createUpdatePlanHandler,
    review_ai_logs: createReviewAiLogsHandler,
    review_errors: createReviewErrorsHandler,
    manage_global_prompts: createManageGlobalPromptsHandler,
    edit_website_section: deps => createWebsiteSectionPatchHandler(deps, 'merge'),
    update_section_copy: deps => createWebsiteSectionPatchHandler(deps, 'copy'),
    reorder_sections: createReorderWebsiteSectionsHandler,
    toggle_section_visibility: createToggleWebsiteSectionVisibilityHandler,
    publish_website: createPublishWebsiteHandler,
    unpublish_website: createUnpublishWebsiteHandler,
    create_email_campaign: createEmailCampaignHandler,
    create_audience: createEmailAudienceHandler,
    create_email_automation: createEmailAutomationHandler,
    generate_email_copy: generateEmailCopyHandler,
    search_leads: searchLeadsHandler,
    create_lead: createLeadHandler,
    update_lead: updateLeadHandler,
    summarize_leads: summarizeLeadsHandler,
    create_follow_up_task: createFollowUpTaskHandler,
    create_product: createProductHandler,
    edit_product: editProductHandler,
    create_category: createCategoryHandler,
    update_price: updateProductPriceHandler,
    update_inventory: updateProductInventoryHandler,
    create_discount: createDiscountHandler,
    generate_product_copy: generateProductCopyHandler,
    add_storefront_section: createAddStorefrontSectionHandler,
    edit_storefront_theme: createEditStorefrontThemeHandler,
    update_product_card_style: createUpdateProductCardStyleHandler,
    generate_image: deps => createMediaDraftAssetHandler(deps, 'image'),
    edit_image: deps => createMediaDraftAssetHandler(deps, 'image_edit'),
    generate_video: deps => createMediaDraftAssetHandler(deps, 'video'),
    create_asset_from_prompt: deps => createMediaDraftAssetHandler(deps, 'asset'),
    update_section_image: createAttachAssetToSectionHandler,
    attach_asset_to_section: createAttachAssetToSectionHandler,
    create_appointment: createAppointmentHandler,
    update_appointment: updateAppointmentHandler,
    configure_availability: configureAvailabilityHandler,
    create_bio_page: createBioPageHandler,
    edit_bio_link: editBioPageLinkHandler,
    add_bio_block: createBioPageBlockHandler,
    publish_bio_page: publishBioPageHandler,
    create_chatbot_knowledge: deps => createChatbotKnowledgeHandler(deps, { sync: false }),
    sync_chatbot_knowledge: deps => createChatbotKnowledgeHandler(deps, { sync: true }),
    test_chatbot: createChatbotTestHandler,
    deploy_chatbot_to_surface: createDeployChatbotToSurfaceHandler,
    create_finance_record: createFinanceRecordHandler,
    update_finance_record: updateFinanceRecordHandler,
    create_menu_item: createRestaurantMenuItemHandler,
    update_menu: updateRestaurantMenuHandler,
    create_reservation_flow: createRestaurantReservationFlowHandler,
    create_catering_offer: deps => createRestaurantMarketingOutputHandler(deps, {
        actionType: 'create_catering_offer',
        outputType: 'weeklyPromotion',
        fallbackTitle: 'AI catering offer draft',
    }),
    generate_restaurant_campaign: deps => createRestaurantMarketingOutputHandler(deps, {
        actionType: 'generate_restaurant_campaign',
        outputType: 'instagram',
        fallbackTitle: 'AI restaurant campaign draft',
    }),
    create_listing: createRealtyListingHandler,
    edit_listing: editRealtyListingHandler,
    create_open_house: createRealtyOpenHouseHandler,
    create_showing_request_flow: createRealtyShowingRequestFlowHandler,
    generate_realty_campaign: createRealtyCampaignHandler,
    run_project_report: deps => createAnalyticsHandler(deps, 'report'),
    summarize_analytics: deps => createAnalyticsHandler(deps, 'summary'),
    identify_blockers: deps => createAnalyticsHandler(deps, 'blockers'),
    export_report: deps => createAnalyticsHandler(deps, 'export'),
};

export function attachDefaultGlobalAssistantActionHandlers(
    definitions: AssistantActionDefinition[],
    deps: GlobalAssistantActionHandlerDependencies = {},
): AssistantActionDefinition[] {
    return definitions.map(definition => {
        const factory = HANDLER_FACTORIES[definition.actionType];
        if (!factory) return definition;
        const patch = factory(deps);
        const nextDefinition = {
            ...definition,
            ...patch,
        };
        if (!nextDefinition.execute || !nextDefinition.mutatesData) {
            return nextDefinition;
        }
        const execute = nextDefinition.execute;
        return {
            ...nextDefinition,
            execute: async (input, executionContext) => {
                await persistProjectSnapshotBeforeAssistantMutation(
                    nextDefinition,
                    input as Record<string, unknown>,
                    executionContext.action,
                    executionContext.context,
                    deps,
                );
                return execute(input, executionContext);
            },
        };
    });
}
