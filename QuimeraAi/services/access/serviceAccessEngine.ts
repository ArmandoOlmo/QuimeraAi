import type { PlanFeatures, PlanLimits, SubscriptionPlanId, AiCreditOperation } from '../../types/subscription.ts';
import type { PlatformServiceId, ServiceStatus } from '../../types/serviceAvailability.ts';
import { AI_CREDIT_COSTS } from '../../types/subscription.ts';
import { getModuleRegistryItem } from '../../registry/moduleRegistry.ts';
import {
    getCanonicalPlanFeatures,
    getCanonicalPlanLimits,
    isFinitePlanLimit,
    isPlatformUnlimitedUser,
    normalizePlanId,
    normalizePlanLimits,
} from '../billing/planCatalog.ts';

export type AccessReasonCode =
    | 'allowed'
    | 'owner_override'
    | 'superadmin_override'
    | 'not_authenticated'
    | 'tenant_not_found'
    | 'tenant_inactive'
    | 'subscription_inactive'
    | 'service_not_public'
    | 'service_in_development'
    | 'plan_feature_missing'
    | 'module_disabled'
    | 'permission_missing'
    | 'limit_exceeded'
    | 'credits_exceeded'
    | 'invalid_plan'
    | 'invalid_limit'
    | 'unknown';

export interface ServiceAccessDecision {
    allowed: boolean;
    reasonCode: AccessReasonCode;
    message: string;
    upgradeRequired?: boolean;
    minimumPlan?: string;
    currentPlan?: string;
    requiredFeature?: string;
    requiredService?: string;
    limit?: number;
    used?: number;
    remaining?: number;
    adminOverride?: boolean;
}

export interface AccessUsage {
    resource: string;
    amount: number;
    used?: number;
}

export interface CreditsUsageSnapshot {
    creditsIncluded?: number;
    creditsUsed?: number;
    creditsRemaining?: number;
    limit?: number;
    used?: number;
    remaining?: number;
}

export interface ModuleActivation {
    enabled?: boolean;
    disabled?: boolean;
    status?: string;
}

export interface ServiceAccessInput {
    userId?: string;
    userRole?: string;
    tenantId?: string;
    tenantStatus?: string;
    projectId?: string;
    planId?: string;
    subscriptionStatus?: string;
    serviceId?: PlatformServiceId;
    serviceStatus?: ServiceStatus;
    serviceAvailability?: Partial<Record<PlatformServiceId, { status?: ServiceStatus } | ServiceStatus>>;
    moduleId?: string;
    featureKey?: keyof PlanFeatures;
    action?: string;
    requiredPermission?: string;
    permissions?: Record<string, unknown>;
    planFeatures?: Partial<PlanFeatures>;
    planLimits?: Partial<PlanLimits>;
    currentUsage?: Record<string, unknown>;
    requestedUsage?: AccessUsage;
    aiOperation?: AiCreditOperation;
    aiCreditsUsage?: CreditsUsageSnapshot;
    customCredits?: number;
    tenantModules?: Record<string, ModuleActivation | boolean | undefined>;
    projectModules?: Record<string, ModuleActivation | boolean | undefined>;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trial', 'trialing']);
const ACTIVE_TENANT_STATUSES = new Set(['active', 'trial']);

const PLAN_RANK: Record<string, number> = {
    free: 0,
    individual: 1,
    agency_starter: 2,
    agency_pro: 3,
    agency_scale: 4,
    enterprise: 5,
};

const RESOURCE_LIMIT_KEY: Record<string, keyof PlanLimits> = {
    project: 'maxProjects',
    projects: 'maxProjects',
    user: 'maxUsers',
    users: 'maxUsers',
    storage: 'maxStorageGB',
    storageGB: 'maxStorageGB',
    aiCredits: 'maxAiCredits',
    credits: 'maxAiCredits',
    subClient: 'maxSubClients',
    subClients: 'maxSubClients',
    domain: 'maxDomains',
    domains: 'maxDomains',
    lead: 'maxLeads',
    leads: 'maxLeads',
    product: 'maxProducts',
    products: 'maxProducts',
    email: 'maxEmailsPerMonth',
    emails: 'maxEmailsPerMonth',
    report: 'maxReports',
    reports: 'maxReports',
    apiCall: 'maxApiCalls',
    apiCalls: 'maxApiCalls',
    billableProject: 'maxBillableProjects',
    billableProjects: 'maxBillableProjects',
};

function allowed(reasonCode: AccessReasonCode = 'allowed', message = 'Acceso permitido', extra: Partial<ServiceAccessDecision> = {}): ServiceAccessDecision {
    return normalizeAccessDecision({ allowed: true, reasonCode, message, ...extra });
}

function blocked(reasonCode: AccessReasonCode, message: string, extra: Partial<ServiceAccessDecision> = {}): ServiceAccessDecision {
    return normalizeAccessDecision({ allowed: false, reasonCode, message, ...extra });
}

function getServiceStatus(input: ServiceAccessInput, serviceId?: PlatformServiceId): ServiceStatus {
    if (!serviceId) return 'public';
    if (input.serviceStatus) return input.serviceStatus;
    const config = input.serviceAvailability?.[serviceId];
    if (typeof config === 'string') return config;
    return config?.status || 'public';
}

function getModuleActivationState(input: ServiceAccessInput, moduleId?: string): ModuleActivation | null {
    if (!moduleId) return null;
    const projectActivation = input.projectModules?.[moduleId];
    const tenantActivation = input.tenantModules?.[moduleId];
    const raw = projectActivation ?? tenantActivation;
    if (raw === undefined) return null;
    if (typeof raw === 'boolean') return { enabled: raw };
    return raw;
}

function hasPermission(input: ServiceAccessInput, permission?: string): boolean {
    if (!permission) return true;
    const permissions = input.permissions || {};
    const direct = permissions[permission];
    if (direct === true) return true;

    const parts = permission.split('.');
    let cursor: unknown = permissions;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return false;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor === true;
}

function isFeatureEnabled(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value !== 'community' && value.trim() !== '';
    return false;
}

function getUsageValue(input: ServiceAccessInput, usage: AccessUsage): number {
    if (typeof usage.used === 'number') return usage.used;
    const source = input.currentUsage || {};
    const exact = source[usage.resource];
    if (typeof exact === 'number') return exact;
    const usedKey = `${usage.resource}Used`;
    const countKey = `${usage.resource}Count`;
    const used = source[usedKey] ?? source[countKey];
    return typeof used === 'number' ? used : 0;
}

function getCreditSnapshot(input: ServiceAccessInput, limits: PlanLimits): Required<Pick<CreditsUsageSnapshot, 'creditsIncluded' | 'creditsUsed' | 'creditsRemaining'>> {
    const usage = input.aiCreditsUsage || {};
    const included = Number(usage.creditsIncluded ?? usage.limit ?? limits.maxAiCredits ?? 0);
    const used = Number(usage.creditsUsed ?? usage.used ?? input.currentUsage?.aiCreditsUsed ?? 0);
    const remaining = Number(usage.creditsRemaining ?? usage.remaining ?? Math.max(0, included - used));
    return {
        creditsIncluded: Number.isFinite(included) ? included : 0,
        creditsUsed: Number.isFinite(used) ? used : 0,
        creditsRemaining: Number.isFinite(remaining) ? remaining : 0,
    };
}

export function normalizeAccessDecision(decision: Partial<ServiceAccessDecision>): ServiceAccessDecision {
    return {
        allowed: decision.allowed === true,
        reasonCode: decision.reasonCode || (decision.allowed ? 'allowed' : 'unknown'),
        message: decision.message || (decision.allowed ? 'Acceso permitido' : 'Acceso bloqueado'),
        ...decision,
    } as ServiceAccessDecision;
}

export function resolveServiceAccess(input: ServiceAccessInput): ServiceAccessDecision {
    const role = input.userRole;
    const normalizedRole = String(role || '').trim().toLowerCase();
    const registryItem = input.moduleId ? getModuleRegistryItem(input.moduleId) : undefined;
    const requiredService = input.serviceId || registryItem?.requiredService;
    const requiredFeature = input.featureKey || registryItem?.requiredFeature;
    const requiredPermission = input.requiredPermission || registryItem?.requiredPermission;
    const serviceStatus = getServiceStatus(input, requiredService);

    if (!input.userId) {
        return blocked('not_authenticated', 'Debes iniciar sesión para acceder a este recurso');
    }

    if (serviceStatus === 'not_public') {
        return blocked('service_not_public', 'Este servicio no está público', { requiredService });
    }

    if (serviceStatus === 'development') {
        return blocked('service_in_development', 'Este servicio está en desarrollo', { requiredService });
    }

    if (isPlatformUnlimitedUser(role)) {
        return allowed(normalizedRole === 'owner' ? 'owner_override' : 'superadmin_override', 'Acceso permitido por rol interno de plataforma', {
            adminOverride: true,
            requiredService,
            requiredFeature: requiredFeature ? String(requiredFeature) : undefined,
        });
    }

    if (!input.tenantId && (input.moduleId || input.serviceId || input.featureKey || input.requestedUsage || input.aiOperation)) {
        return blocked('tenant_not_found', 'No hay workspace activo para validar el acceso');
    }

    if (input.tenantStatus && !ACTIVE_TENANT_STATUSES.has(input.tenantStatus)) {
        return blocked('tenant_inactive', 'El workspace no está activo');
    }

    if (input.subscriptionStatus && !ACTIVE_SUBSCRIPTION_STATUSES.has(input.subscriptionStatus)) {
        return blocked('subscription_inactive', 'La suscripción no está activa', { upgradeRequired: true });
    }

    if (input.planId === 'agency_client') {
        return blocked('invalid_plan', 'agency_client es un tipo de tenant, no un plan de suscripción');
    }

    const planId = normalizePlanId(input.planId) as SubscriptionPlanId;

    const moduleActivation = getModuleActivationState(input, input.moduleId);
    if (moduleActivation && (moduleActivation.enabled === false || moduleActivation.disabled === true || moduleActivation.status === 'disabled')) {
        return blocked('module_disabled', 'Este módulo está desactivado para el workspace o proyecto', {
            requiredService,
            requiredFeature: requiredFeature ? String(requiredFeature) : undefined,
        });
    }

    if (registryItem?.requiredPlan) {
        const requiredPlan = normalizePlanId(registryItem.requiredPlan);
        if ((PLAN_RANK[planId] ?? 0) < (PLAN_RANK[requiredPlan] ?? 0)) {
            return blocked('plan_feature_missing', 'Tu plan no incluye este módulo', {
                currentPlan: planId,
                minimumPlan: requiredPlan,
                upgradeRequired: true,
            });
        }
    }

    const features = { ...getCanonicalPlanFeatures(planId), ...(input.planFeatures || {}) };
    if (requiredFeature && !isFeatureEnabled(features[requiredFeature])) {
        return blocked('plan_feature_missing', 'Tu plan no incluye esta función', {
            currentPlan: planId,
            requiredFeature: String(requiredFeature),
            requiredService,
            upgradeRequired: true,
        });
    }

    if (requiredPermission && !hasPermission(input, requiredPermission)) {
        return blocked('permission_missing', 'Tu rol no tiene permiso para esta acción', {
            requiredFeature: requiredFeature ? String(requiredFeature) : undefined,
            requiredService,
        });
    }

    const limits = normalizePlanLimits(input.planLimits || getCanonicalPlanLimits(planId), planId);

    if (input.requestedUsage) {
        const decision = assertPlanLimit({ ...input, planId, planLimits: limits });
        if (!decision.allowed) return decision;
    }

    if (input.aiOperation) {
        const decision = canConsumeCredits({ ...input, planId, planLimits: limits });
        if (!decision.allowed) return decision;
    }

    return allowed('allowed', 'Acceso permitido', {
        currentPlan: planId,
        requiredFeature: requiredFeature ? String(requiredFeature) : undefined,
        requiredService,
    });
}

export function assertServiceAccess(input: ServiceAccessInput): ServiceAccessDecision {
    const decision = resolveServiceAccess(input);
    if (!decision.allowed) {
        throw Object.assign(new Error(decision.message), { decision });
    }
    return decision;
}

export function canAccessModule(input: ServiceAccessInput): ServiceAccessDecision {
    return resolveServiceAccess(input);
}

export function canAccessService(input: ServiceAccessInput): ServiceAccessDecision {
    return resolveServiceAccess(input);
}

export function canUseFeature(input: ServiceAccessInput): ServiceAccessDecision {
    return resolveServiceAccess(input);
}

export function canPerformAction(input: ServiceAccessInput): ServiceAccessDecision {
    return resolveServiceAccess(input);
}

export function assertPlanLimit(input: ServiceAccessInput): ServiceAccessDecision {
    if (isPlatformUnlimitedUser(input.userRole)) {
        const role = String(input.userRole || '').trim().toLowerCase();
        return allowed(role === 'owner' ? 'owner_override' : 'superadmin_override', 'Límite omitido por rol interno de plataforma', {
            adminOverride: true,
        });
    }

    if (!input.requestedUsage) return allowed();

    const planId = normalizePlanId(input.planId);
    const limitKey = RESOURCE_LIMIT_KEY[input.requestedUsage.resource];
    if (!limitKey) return allowed('allowed', 'No hay límite configurado para este recurso');

    const rawLimit = input.planLimits?.[limitKey];
    if (rawLimit !== undefined && !isFinitePlanLimit(rawLimit)) {
        return blocked('invalid_limit', 'El límite configurado no es válido', {
            currentPlan: planId,
            limit: typeof rawLimit === 'number' ? rawLimit : undefined,
        });
    }

    const limits = normalizePlanLimits(input.planLimits, planId);
    const limit = limits[limitKey];
    if (!isFinitePlanLimit(limit)) {
        return blocked('invalid_limit', 'El límite configurado no es válido', { currentPlan: planId });
    }

    const used = getUsageValue(input, input.requestedUsage);
    const requested = input.requestedUsage.amount;
    const remaining = Math.max(0, limit - used);
    if (used + requested > limit) {
        return blocked('limit_exceeded', 'Has alcanzado el límite de tu plan', {
            currentPlan: planId,
            limit,
            used,
            remaining,
            upgradeRequired: true,
        });
    }

    return allowed('allowed', 'Límite disponible', {
        currentPlan: planId,
        limit,
        used,
        remaining,
    });
}

export function canConsumeCredits(input: ServiceAccessInput): ServiceAccessDecision {
    if (isPlatformUnlimitedUser(input.userRole)) {
        const role = String(input.userRole || '').trim().toLowerCase();
        return allowed(role === 'owner' ? 'owner_override' : 'superadmin_override', 'Créditos omitidos por rol interno de plataforma', {
            adminOverride: true,
        });
    }

    if (!input.aiOperation) return allowed();
    if (!input.tenantId) return blocked('tenant_not_found', 'No hay workspace activo para validar créditos');

    const planId = normalizePlanId(input.planId);
    const limits = normalizePlanLimits(input.planLimits, planId);
    const creditsRequired = Number(input.customCredits ?? AI_CREDIT_COSTS[input.aiOperation] ?? 0);
    if (!Number.isFinite(creditsRequired) || creditsRequired <= 0) {
        return blocked('invalid_limit', 'El costo de créditos no es válido', { currentPlan: planId });
    }

    const usage = getCreditSnapshot(input, limits);
    if (usage.creditsRemaining < creditsRequired) {
        return blocked('credits_exceeded', 'No hay suficientes AI Credits para completar esta operación', {
            currentPlan: planId,
            limit: usage.creditsIncluded,
            used: usage.creditsUsed,
            remaining: usage.creditsRemaining,
            upgradeRequired: true,
        });
    }

    return allowed('allowed', 'AI Credits disponibles', {
        currentPlan: planId,
        limit: usage.creditsIncluded,
        used: usage.creditsUsed,
        remaining: usage.creditsRemaining - creditsRequired,
    });
}

export { isPlatformUnlimitedUser };
