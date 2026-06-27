import type {
    PlanFeatures,
    PlanLimits,
    SubscriptionPlan,
    SubscriptionPlanId,
} from '../../types/subscription.ts';

export const CANONICAL_PLAN_IDS = [
    'free',
    'individual',
    'agency_starter',
    'agency_pro',
    'agency_scale',
    'enterprise',
] as const;

export type CanonicalPlanId = typeof CANONICAL_PLAN_IDS[number];

export type BillingModel = 'free' | 'subscription' | 'pay_per_project' | 'custom_contract';

export type PlanLimitKey = keyof PlanLimits;

export interface CanonicalAgencyPlanBillingDetails {
    planId: Extract<CanonicalPlanId, 'agency_starter' | 'agency_pro' | 'agency_scale'>;
    baseFee: number;
    projectCost: number;
    poolCredits: number;
    includedProjects: number;
    maxBillableProjects: number;
}

const CANONICAL_PLAN_SET = new Set<string>(CANONICAL_PLAN_IDS);

export const LEGACY_PLAN_MAP: Record<string, CanonicalPlanId> = {
    hobby: 'individual',
    starter: 'individual',
    pro: 'individual',
    agency: 'agency_starter',
    agency_plus: 'agency_pro',
    agency_client: 'individual',
};

const baseFeatures: PlanFeatures = {
    aiWebBuilder: true,
    visualEditor: true,
    templates: true,
    cmsEnabled: false,
    cmsAdvanced: false,
    crmEnabled: false,
    crmPipelines: false,
    crmAutomations: false,
    realEstateModule: false,
    ecommerceEnabled: false,
    ecommerceTransactionFee: 0,
    chatbotEnabled: false,
    chatbotCustomization: false,
    aiAssistant: true,
    aiImageGeneration: true,
    emailMarketing: false,
    emailAutomation: false,
    customDomains: false,
    removeBranding: false,
    whiteLabel: false,
    analyticsBasic: false,
    analyticsAdvanced: false,
    supportLevel: 'community',
    apiAccess: false,
    webhooks: false,
    agencyEnabled: false,
    agencyModule: false,
};

const fullFeaturePlan = (overrides: Partial<PlanFeatures> = {}): PlanFeatures => ({
    ...baseFeatures,
    cmsEnabled: true,
    cmsAdvanced: true,
    crmEnabled: true,
    crmPipelines: true,
    crmAutomations: true,
    realEstateModule: true,
    ecommerceEnabled: true,
    chatbotEnabled: true,
    chatbotCustomization: true,
    emailMarketing: true,
    emailAutomation: true,
    customDomains: true,
    removeBranding: true,
    analyticsBasic: true,
    analyticsAdvanced: true,
    apiAccess: true,
    webhooks: true,
    supportLevel: 'chat',
    ...overrides,
});

export const CANONICAL_PLAN_LIMITS: Record<CanonicalPlanId, PlanLimits> = {
    free: {
        maxProjects: 1,
        maxUsers: 1,
        maxStorageGB: 1,
        maxAiCredits: 60,
        maxSubClients: 0,
        maxDomains: 0,
        maxLeads: 50,
        maxProducts: 0,
        maxEmailsPerMonth: 0,
        maxReports: 0,
        maxApiCalls: 0,
        includedProjects: 0,
        maxBillableProjects: 0,
        projectCost: 0,
        hardLimit: true,
        billingModel: 'free',
    },
    individual: {
        maxProjects: 1,
        maxUsers: 1,
        maxStorageGB: 10,
        maxAiCredits: 500,
        maxSubClients: 0,
        maxDomains: 1,
        maxLeads: 1000,
        maxProducts: 100,
        maxEmailsPerMonth: 5000,
        maxReports: 10,
        maxApiCalls: 1000,
        includedProjects: 1,
        maxBillableProjects: 1,
        projectCost: 0,
        hardLimit: true,
        billingModel: 'subscription',
    },
    agency_starter: {
        maxProjects: 25,
        maxUsers: 5,
        maxStorageGB: 50,
        maxAiCredits: 2000,
        maxSubClients: 25,
        maxDomains: 25,
        maxLeads: 10000,
        maxProducts: 500,
        maxEmailsPerMonth: 10000,
        maxReports: 25,
        maxApiCalls: 5000,
        includedProjects: 0,
        maxBillableProjects: 25,
        projectCost: 29,
        hardLimit: true,
        billingModel: 'pay_per_project',
    },
    agency_pro: {
        maxProjects: 100,
        maxUsers: 15,
        maxStorageGB: 200,
        maxAiCredits: 5000,
        maxSubClients: 100,
        maxDomains: 100,
        maxLeads: 50000,
        maxProducts: 2000,
        maxEmailsPerMonth: 50000,
        maxReports: 100,
        maxApiCalls: 25000,
        includedProjects: 0,
        maxBillableProjects: 100,
        projectCost: 29,
        hardLimit: true,
        billingModel: 'pay_per_project',
    },
    agency_scale: {
        maxProjects: 250,
        maxUsers: 50,
        maxStorageGB: 1000,
        maxAiCredits: 15000,
        maxSubClients: 250,
        maxDomains: 250,
        maxLeads: 150000,
        maxProducts: 10000,
        maxEmailsPerMonth: 150000,
        maxReports: 500,
        maxApiCalls: 100000,
        includedProjects: 0,
        maxBillableProjects: 250,
        projectCost: 29,
        hardLimit: true,
        billingModel: 'pay_per_project',
    },
    enterprise: {
        maxProjects: 500,
        maxUsers: 250,
        maxStorageGB: 2000,
        maxAiCredits: 25000,
        maxSubClients: 500,
        maxDomains: 500,
        maxLeads: 500000,
        maxProducts: 50000,
        maxEmailsPerMonth: 500000,
        maxReports: 1000,
        maxApiCalls: 250000,
        includedProjects: 500,
        maxBillableProjects: 500,
        projectCost: 0,
        hardLimit: true,
        billingModel: 'custom_contract',
    },
};

export const CANONICAL_PLAN_FEATURES: Record<CanonicalPlanId, PlanFeatures> = {
    free: baseFeatures,
    individual: fullFeaturePlan({
        ecommerceTransactionFee: 2,
        whiteLabel: false,
        supportLevel: 'chat',
    }),
    agency_starter: fullFeaturePlan({
        ecommerceTransactionFee: 1,
        whiteLabel: true,
        agencyEnabled: true,
        agencyModule: true,
        supportLevel: 'priority',
    }),
    agency_pro: fullFeaturePlan({
        ecommerceTransactionFee: 0.5,
        whiteLabel: true,
        agencyEnabled: true,
        agencyModule: true,
        supportLevel: 'priority',
    }),
    agency_scale: fullFeaturePlan({
        ecommerceTransactionFee: 0,
        whiteLabel: true,
        agencyEnabled: true,
        agencyModule: true,
        supportLevel: 'dedicated',
    }),
    enterprise: fullFeaturePlan({
        ecommerceTransactionFee: 0.5,
        whiteLabel: true,
        supportLevel: 'dedicated',
    }),
};

const PLAN_META: Record<CanonicalPlanId, Pick<SubscriptionPlan, 'name' | 'description' | 'price' | 'isFeatured' | 'isPopular' | 'color' | 'icon' | 'trialDays'>> = {
    free: {
        name: 'Free',
        description: 'Perfecto para explorar y proyectos personales',
        price: { monthly: 0, annually: 0 },
        isFeatured: false,
        isPopular: false,
        color: '#6b7280',
        icon: 'Sparkles',
    },
    individual: {
        name: 'Individual',
        description: 'Todo incluido para emprendedores y freelancers',
        price: { monthly: 49, annually: 39 },
        isFeatured: true,
        isPopular: true,
        color: '#6366f1',
        icon: 'User',
        trialDays: 7,
    },
    agency_starter: {
        name: 'Agency Starter',
        description: 'Para agencias que comienzan con límites finitos por proyecto',
        price: { monthly: 99, annually: 79 },
        isFeatured: false,
        isPopular: false,
        color: '#10b981',
        icon: 'Building2',
    },
    agency_pro: {
        name: 'Agency Pro',
        description: 'Para agencias en crecimiento con límites finitos y pool compartido',
        price: { monthly: 199, annually: 159 },
        isFeatured: true,
        isPopular: true,
        color: '#8b5cf6',
        icon: 'Building2',
    },
    agency_scale: {
        name: 'Agency Scale',
        description: 'Para agencias de alto volumen con límites finitos configurables',
        price: { monthly: 399, annually: 319 },
        isFeatured: false,
        isPopular: false,
        color: '#f59e0b',
        icon: 'Crown',
    },
    enterprise: {
        name: 'Enterprise',
        description: 'Soluciones personalizadas de alto volumen con límites configurables',
        price: { monthly: 299, annually: 249 },
        isFeatured: false,
        isPopular: false,
        color: '#f59e0b',
        icon: 'Crown',
    },
};

export const COMMERCIAL_PLAN_IDS = CANONICAL_PLAN_IDS.filter(id => id !== 'free');
export const AGENCY_PLAN_IDS = ['agency_starter', 'agency_pro', 'agency_scale'] as const;

export function isPlatformUnlimitedUser(role?: string | null): boolean {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'owner' || normalized === 'superadmin';
}

export function isLegacyPlan(planId?: string | null): boolean {
    return Boolean(planId && Object.prototype.hasOwnProperty.call(LEGACY_PLAN_MAP, planId));
}

export function mapLegacyPlanToCanonical(planId?: string | null): CanonicalPlanId {
    if (planId && LEGACY_PLAN_MAP[planId]) return LEGACY_PLAN_MAP[planId];
    return 'free';
}

export function normalizePlanId(planId?: string | null): CanonicalPlanId {
    if (planId && CANONICAL_PLAN_SET.has(planId)) return planId as CanonicalPlanId;
    if (isLegacyPlan(planId)) return mapLegacyPlanToCanonical(planId);
    return 'free';
}

export function isAgencyPlan(planId?: string | null): boolean {
    return AGENCY_PLAN_IDS.includes(normalizePlanId(planId) as typeof AGENCY_PLAN_IDS[number]);
}

export function isEnterprisePlan(planId?: string | null): boolean {
    return normalizePlanId(planId) === 'enterprise';
}

export function isCommercialPlan(planId?: string | null): boolean {
    const normalized = normalizePlanId(planId);
    return normalized !== 'free';
}

export function isFinitePlanLimit(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getCanonicalPlanLimits(planId?: string | null): PlanLimits {
    return { ...CANONICAL_PLAN_LIMITS[normalizePlanId(planId)] };
}

export function getCanonicalPlanFeatures(planId?: string | null): PlanFeatures {
    return { ...CANONICAL_PLAN_FEATURES[normalizePlanId(planId)] };
}

function isDevelopmentRuntime(): boolean {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
}

export function normalizePlanLimits(limits?: Partial<PlanLimits> | null, fallbackPlanId?: string | null): PlanLimits {
    const fallback = getCanonicalPlanLimits(fallbackPlanId);
    const normalized: Record<string, unknown> = { ...fallback };

    for (const key of Object.keys(fallback) as PlanLimitKey[]) {
        const value = limits?.[key];
        if (key === 'hardLimit' && typeof value === 'boolean') {
            normalized[key] = value;
        } else if (key === 'billingModel' && (
            value === 'free' ||
            value === 'subscription' ||
            value === 'pay_per_project' ||
            value === 'custom_contract'
        )) {
            normalized[key] = value;
        } else if (isFinitePlanLimit(value)) {
            normalized[key] = value;
        } else if (value !== undefined && value !== null && isDevelopmentRuntime()) {
            console.warn(`[PlanCatalog] Invalid limit "${String(key)}" normalized to canonical fallback`, {
                received: value,
                fallback: fallback[key],
                fallbackPlanId: normalizePlanId(fallbackPlanId),
            });
        }
    }

    return normalized as unknown as PlanLimits;
}

export function sanitizePlanLimits(limits?: Partial<PlanLimits> | null, fallbackPlanId?: string | null): PlanLimits {
    return normalizePlanLimits(limits, fallbackPlanId);
}

export function getCanonicalPlan(planId?: string | null): SubscriptionPlan {
    const id = normalizePlanId(planId);
    const limits = getCanonicalPlanLimits(id);
    return {
        id,
        ...PLAN_META[id],
        limits,
        features: getCanonicalPlanFeatures(id),
        isAgencyPlan: isAgencyPlan(id),
        projectCost: limits.projectCost,
        hasSharedCreditsPool: isAgencyPlan(id),
    };
}

export function getCanonicalAgencyPlanBillingDetails(planId?: string | null): CanonicalAgencyPlanBillingDetails | null {
    const id = normalizePlanId(planId);
    if (!isAgencyPlan(id)) return null;

    const limits = getCanonicalPlanLimits(id);
    return {
        planId: id as CanonicalAgencyPlanBillingDetails['planId'],
        baseFee: PLAN_META[id].price.monthly,
        projectCost: Number(limits.projectCost ?? 0),
        poolCredits: limits.maxAiCredits,
        includedProjects: Number(limits.includedProjects ?? 0),
        maxBillableProjects: Number(limits.maxBillableProjects ?? 0),
    };
}

export const CANONICAL_SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
    free: getCanonicalPlan('free'),
    hobby: { ...getCanonicalPlan('individual'), id: 'hobby', name: 'Hobby', description: 'Plan legacy mapeado a Individual' },
    starter: { ...getCanonicalPlan('individual'), id: 'starter', name: 'Starter', description: 'Plan legacy mapeado a Individual' },
    pro: { ...getCanonicalPlan('individual'), id: 'pro', name: 'Pro', description: 'Plan legacy mapeado a Individual' },
    individual: getCanonicalPlan('individual'),
    agency: { ...getCanonicalPlan('agency_starter'), id: 'agency', name: 'Agency', description: 'Plan legacy mapeado a Agency Starter' },
    agency_plus: { ...getCanonicalPlan('agency_pro'), id: 'agency_plus', name: 'Agency Plus', description: 'Plan legacy mapeado a Agency Pro' },
    agency_starter: getCanonicalPlan('agency_starter'),
    agency_pro: getCanonicalPlan('agency_pro'),
    agency_scale: getCanonicalPlan('agency_scale'),
    enterprise: getCanonicalPlan('enterprise'),
};

export function getPlanLimitValue(
    limits: Partial<PlanLimits> | null | undefined,
    key: PlanLimitKey,
    fallbackPlanId?: string | null,
): number {
    return normalizePlanLimits(limits, fallbackPlanId)[key] as number;
}

export function formatPlanLimit(
    limit: unknown,
    context: { role?: string | null; unavailableLabel?: string; locale?: string; showUnlimitedForPlatformUser?: boolean } = {},
): string {
    if (!isFinitePlanLimit(limit)) {
        if (context.showUnlimitedForPlatformUser && isPlatformUnlimitedUser(context.role)) {
            return 'Ilimitado';
        }
        return context.unavailableLabel || 'No disponible';
    }

    return new Intl.NumberFormat(context.locale).format(limit);
}
