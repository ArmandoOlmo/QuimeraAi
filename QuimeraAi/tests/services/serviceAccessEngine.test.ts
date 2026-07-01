import { describe, expect, it } from 'vitest';
import {
    canConsumeCredits,
    resolveServiceAccess,
} from '../../services/access/serviceAccessEngine';
import {
    CANONICAL_PLAN_IDS,
    formatPlanLimit,
    getCanonicalPlanLimits,
    getPlatformUnlimitedPlan,
    isFinitePlanLimit,
    isInvalidSubscriptionPlanId,
    isLegacyPlan,
    isPlatformUnlimitedUser,
    normalizePlanId,
    normalizePlanLimits,
    resolvePlanIdForPlatformRole,
} from '../../services/billing/planCatalog';
import {
    resolveTenantEffectiveLimits,
    resolveTenantEffectivePlan,
    calculateAgencyMonthlyBill,
    getAgencyPlanBillingDetails,
    isAgencyBillingPlan,
    normalizeTenantSubscriptionPlanForType,
    type Tenant,
} from '../../types/multiTenant';
import {
    getPermissions,
    isAdminRole,
    isPlatformOwnerRole,
    isSuperAdminRole,
    normalizeRoleKey,
} from '../../constants/roles';

const baseInput = {
    userId: 'user_1',
    userRole: 'agency_owner',
    tenantId: 'tenant_1',
    tenantStatus: 'active',
    subscriptionStatus: 'active',
    planId: 'individual',
};

describe('Service Access Engine', () => {
    it('keeps every canonical plan finite', () => {
        for (const planId of CANONICAL_PLAN_IDS) {
            const limits = getCanonicalPlanLimits(planId);
            for (const [key, value] of Object.entries(limits)) {
                if (typeof value === 'number') {
                    expect(value, `${planId}.${key}`).not.toBe(-1);
                    expect(Number.isFinite(value), `${planId}.${key}`).toBe(true);
                    expect(value, `${planId}.${key}`).toBeGreaterThanOrEqual(0);
                }
            }
        }
    });

    it('only treats owner and superadmin as platform-unlimited users', () => {
        expect(isPlatformUnlimitedUser('owner')).toBe(true);
        expect(isPlatformUnlimitedUser('superadmin')).toBe(true);
        expect(isPlatformUnlimitedUser('super_admin')).toBe(true);
        expect(isPlatformUnlimitedUser('super-admin')).toBe(true);
        expect(isPlatformUnlimitedUser('super admin')).toBe(true);
        for (const role of ['admin', 'manager', 'agency_owner', 'agency_admin', 'agency_member', 'client', 'enterprise']) {
            expect(isPlatformUnlimitedUser(role), role).toBe(false);
        }
    });

    it('resolves platform Owner and Super Admin display plans to unlimited instead of free', () => {
        for (const role of ['owner', 'superadmin', 'super_admin', 'super-admin', 'super admin']) {
            expect(resolvePlanIdForPlatformRole('free', role), role).toBe('enterprise');
            expect(getPlatformUnlimitedPlan(role), role).toMatchObject({
                id: 'enterprise',
                name: 'Ilimitado',
                price: { monthly: 0, annually: 0 },
                limits: expect.objectContaining({ hardLimit: false }),
            });
        }

        expect(resolvePlanIdForPlatformRole('free', 'agency_owner')).toBe('free');
        expect(getPlatformUnlimitedPlan('agency_owner')).toBeNull();
    });

    it('normalizes platform role aliases across admin permission helpers', () => {
        for (const role of ['superadmin', 'super_admin', 'super-admin', 'super admin']) {
            expect(normalizeRoleKey(role), role).toBe('superadmin');
            expect(isPlatformOwnerRole(role), role).toBe(true);
            expect(isSuperAdminRole(role), role).toBe(true);
            expect(isAdminRole(role), role).toBe(true);
            expect(getPermissions(role).canViewTenants, role).toBe(true);
            expect(getPermissions(role).canEditBilling, role).toBe(true);
        }

        expect(normalizeRoleKey('agency_owner')).toBe('agency_owner');
        expect(isPlatformOwnerRole('agency_owner')).toBe(false);
    });

    it('does not format invalid commercial limits as unlimited for normal users', () => {
        expect(formatPlanLimit(-1)).toBe('No disponible');
        expect(formatPlanLimit(Number.POSITIVE_INFINITY)).toBe('No disponible');
        expect(formatPlanLimit(null)).toBe('No disponible');
        expect(formatPlanLimit(-1, { role: 'owner', showUnlimitedForPlatformUser: true })).toBe('Ilimitado');
        expect(formatPlanLimit(-1, { role: 'super_admin', showUnlimitedForPlatformUser: true })).toBe('Ilimitado');
    });

    it('sanitizes invalid DB limits to finite canonical fallbacks', () => {
        const limits = normalizePlanLimits({
            maxProjects: -1,
            maxUsers: Number.POSITIVE_INFINITY,
            maxAiCredits: 200,
        }, 'agency_starter');

        expect(limits.maxProjects).toBe(25);
        expect(limits.maxUsers).toBe(5);
        expect(limits.maxAiCredits).toBe(200);
        expect(isFinitePlanLimit(limits.maxProjects)).toBe(true);
    });

    it('blocks commercial feature access when the plan lacks the required feature', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'free',
            serviceId: 'ecommerce',
            featureKey: 'ecommerceEnabled',
        })).toMatchObject({
            allowed: false,
            reasonCode: 'plan_feature_missing',
            upgradeRequired: true,
        });
    });

    it('allows included individual features without requiring admin override', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'individual',
            serviceId: 'ecommerce',
            featureKey: 'ecommerceEnabled',
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
        });
    });

    it('blocks not_public and development services for normal users', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            serviceId: 'emailMarketing',
            serviceAvailability: { emailMarketing: { status: 'not_public' } },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'service_not_public',
        });

        expect(resolveServiceAccess({
            ...baseInput,
            serviceId: 'ecommerce',
            serviceAvailability: { ecommerce: { status: 'development' } },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'service_in_development',
        });
    });

    it('lets owner and superadmin bypass not_public and development service gates', () => {
        for (const role of ['owner', 'superadmin', 'super_admin']) {
            expect(resolveServiceAccess({
                ...baseInput,
                userRole: role,
                planId: 'free',
                serviceId: 'ecommerce',
                featureKey: 'ecommerceEnabled',
                serviceAvailability: { ecommerce: { status: 'development' } },
                requestedUsage: { resource: 'projects', amount: 100, used: 100 },
                aiOperation: 'image_generation',
                aiCreditsUsage: { creditsIncluded: 0, creditsUsed: 0, creditsRemaining: 0 },
            })).toMatchObject({
                allowed: true,
                adminOverride: true,
                reasonCode: role === 'owner' ? 'owner_override' : 'superadmin_override',
            });

            expect(resolveServiceAccess({
                ...baseInput,
                userRole: role,
                planId: 'free',
                serviceId: 'emailMarketing',
                serviceAvailability: { emailMarketing: { status: 'not_public' } },
            })).toMatchObject({
                allowed: true,
                adminOverride: true,
                reasonCode: role === 'owner' ? 'owner_override' : 'superadmin_override',
            });
        }
    });

    it('allows owner and superadmin to bypass plan, limit, and credit gates when the service is public', () => {
        for (const role of ['owner', 'superadmin']) {
            expect(resolveServiceAccess({
                ...baseInput,
                userRole: role,
                planId: 'free',
                serviceId: 'ecommerce',
                featureKey: 'ecommerceEnabled',
                serviceAvailability: { ecommerce: { status: 'public' } },
                requestedUsage: { resource: 'projects', amount: 100, used: 100 },
                aiOperation: 'image_generation',
                aiCreditsUsage: { creditsIncluded: 0, creditsUsed: 0, creditsRemaining: 0 },
            })).toMatchObject({
                allowed: true,
                adminOverride: true,
                reasonCode: role === 'owner' ? 'owner_override' : 'superadmin_override',
            });
        }
    });

    it('normalizes Super Admin role aliases before applying unlimited platform access', () => {
        for (const role of ['super_admin', 'super-admin', 'super admin']) {
            expect(resolveServiceAccess({
                ...baseInput,
                userRole: role,
                planId: 'free',
                serviceId: 'ecommerce',
                featureKey: 'ecommerceEnabled',
                serviceAvailability: { ecommerce: { status: 'public' } },
                requestedUsage: { resource: 'projects', amount: 100, used: 100 },
                aiOperation: 'image_generation',
                aiCreditsUsage: { creditsIncluded: 0, creditsUsed: 0, creditsRemaining: 0 },
            })).toMatchObject({
                allowed: true,
                adminOverride: true,
                reasonCode: 'superadmin_override',
            });
        }
    });

    it('does not give admin, manager, or agency owner unlimited access', () => {
        for (const role of ['admin', 'manager', 'agency_owner']) {
            expect(resolveServiceAccess({
                ...baseInput,
                userRole: role,
                planId: 'individual',
                requestedUsage: { resource: 'projects', amount: 1, used: 1 },
            })).toMatchObject({
                allowed: false,
                reasonCode: 'limit_exceeded',
            });
        }
    });

    it('rejects agency_client as a subscription plan id', () => {
        expect(isInvalidSubscriptionPlanId('agency_client')).toBe(true);
        expect(isLegacyPlan('agency_client')).toBe(false);
        expect(normalizePlanId('agency_client')).toBe('free');

        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_client',
            serviceId: 'ecommerce',
        })).toMatchObject({
            allowed: false,
            reasonCode: 'invalid_plan',
        });
    });

    it('allows the canonical Agency Engine only for agency plans with agency permissions', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-engine',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageSettings',
            permissions: { canManageSettings: true },
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
        });
    });

    it('does not treat enterprise as an agency plan', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'enterprise',
            moduleId: 'agency-engine',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageSettings',
            permissions: { canManageSettings: true },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'plan_feature_missing',
            currentPlan: 'enterprise',
            requiredFeature: 'agencyModule',
        });
    });

    it('derives agency billing details from the canonical plan catalog', () => {
        expect(isAgencyBillingPlan('agency_pro')).toBe(true);
        expect(isAgencyBillingPlan('agency_plus')).toBe(true);
        expect(isAgencyBillingPlan('enterprise')).toBe(false);
        expect(isAgencyBillingPlan('agency_client' as Tenant['subscriptionPlan'])).toBe(false);

        expect(getAgencyPlanBillingDetails('agency_pro')).toEqual({
            baseFee: 199,
            projectCost: 29,
            poolCredits: 5000,
        });
        expect(getAgencyPlanBillingDetails('agency_plus')).toEqual(getAgencyPlanBillingDetails('agency_pro'));
        expect(getAgencyPlanBillingDetails('enterprise')).toBeNull();

        expect(calculateAgencyMonthlyBill('agency_pro', 3)).toBe(199 + (29 * 3));
        expect(calculateAgencyMonthlyBill('enterprise', 3)).toBe(0);
    });

    it('normalizes tenant creation plans by tenant type without treating enterprise or agency_client as agency plans', () => {
        expect(normalizeTenantSubscriptionPlanForType('agency', 'agency_starter')).toBe('agency_starter');
        expect(normalizeTenantSubscriptionPlanForType('agency', 'agency_plus')).toBe('agency_pro');
        expect(normalizeTenantSubscriptionPlanForType('agency')).toBe('agency_starter');
        expect(normalizeTenantSubscriptionPlanForType('individual', 'enterprise')).toBe('enterprise');

        expect(() => normalizeTenantSubscriptionPlanForType('agency', 'enterprise')).toThrow(/Agency Engine/);
        expect(() => normalizeTenantSubscriptionPlanForType('agency', 'individual')).toThrow(/Agency Engine/);
        expect(() => normalizeTenantSubscriptionPlanForType('individual', 'agency_pro')).toThrow(/individuales/);
        expect(normalizeTenantSubscriptionPlanForType('agency_client', 'individual')).toBe('individual');
        expect(normalizeTenantSubscriptionPlanForType('agency_client', 'enterprise')).toBe('enterprise');
        expect(() => normalizeTenantSubscriptionPlanForType('agency_client', 'agency_pro')).toThrow(/agencyPlanId/);
        expect(() => normalizeTenantSubscriptionPlanForType('agency', 'agency_client')).toThrow(/tipo de tenant/);
    });

    it('requires tenant permissions for agency billing submodules', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-billing',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageBilling',
            permissions: { canManageSettings: true },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'permission_missing',
            requiredService: 'agency',
        });
    });

    it('does not allow callers to weaken registry module permissions', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-service-plans',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageSettings',
            permissions: { canManageSettings: true },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'permission_missing',
            requiredPermission: 'canManageBilling',
        });

        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-service-plans',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageSettings',
            permissions: { canManageSettings: true, canManageBilling: true },
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
            requiredPermission: 'canManageBilling',
        });
    });

    it('gates agency project transfer by project management permission', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-project-transfer',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageProjects',
            permissions: { canManageProjects: true },
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
        });

        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'agency_pro',
            moduleId: 'agency-project-transfer',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            requiredPermission: 'canManageProjects',
            permissions: { canManageBilling: true },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'permission_missing',
            requiredService: 'agency',
        });
    });

    it('allows client portal access for managed client tenants without requiring an agency plan feature', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'individual',
            moduleId: 'agency-client-portal',
            serviceId: 'agency',
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
            requiredService: 'agency',
            requiredFeature: undefined,
        });
    });

    it('gates Content Studio by the registry minimum plan while using AI features availability', () => {
        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'free',
            moduleId: 'contentStudio',
            serviceId: 'aiFeatures',
            featureKey: 'aiImageGeneration',
        })).toMatchObject({
            allowed: false,
            reasonCode: 'plan_feature_missing',
            currentPlan: 'free',
            minimumPlan: 'individual',
            upgradeRequired: true,
        });

        expect(resolveServiceAccess({
            ...baseInput,
            planId: 'individual',
            moduleId: 'contentStudio',
            serviceId: 'aiFeatures',
            featureKey: 'aiImageGeneration',
        })).toMatchObject({
            allowed: true,
            reasonCode: 'allowed',
            requiredService: 'aiFeatures',
            requiredFeature: 'aiImageGeneration',
        });

        expect(resolveServiceAccess({
            ...baseInput,
            userRole: 'superadmin',
            planId: 'free',
            moduleId: 'contentStudio',
            serviceId: 'aiFeatures',
            featureKey: 'aiImageGeneration',
        })).toMatchObject({
            allowed: true,
            reasonCode: 'superadmin_override',
            adminOverride: true,
        });
    });

    it('resolves agency_client tenants to a valid finite effective plan', () => {
        const parent = {
            subscriptionPlan: 'agency_pro',
            limits: getCanonicalPlanLimits('agency_pro'),
        } as Tenant;
        const tenant = {
            type: 'agency_client',
            subscriptionPlan: 'free',
            billing: { mode: 'included_in_parent' },
            limits: { maxProjects: -1 },
        } as Tenant;

        expect(resolveTenantEffectivePlan(tenant, parent)).toBe('agency_pro');
        expect(resolveTenantEffectiveLimits(tenant, parent).maxProjects).toBe(100);
    });

    it('blocks AI credit consumption when credits are insufficient', () => {
        expect(canConsumeCredits({
            ...baseInput,
            aiOperation: 'image_generation',
            customCredits: 4,
            aiCreditsUsage: { creditsIncluded: 60, creditsUsed: 59, creditsRemaining: 1 },
        })).toMatchObject({
            allowed: false,
            reasonCode: 'credits_exceeded',
            remaining: 1,
        });
    });
});
