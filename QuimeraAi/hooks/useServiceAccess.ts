import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/core/AuthContext';
import { useSafeTenant } from '../contexts/tenant';
import { useSafePlans } from '../contexts/PlansContext';
import { useCreditsUsage } from './useCreditsUsage';
import { useServiceAvailability } from './useServiceAvailability';
import type { PlanFeatures } from '../types/subscription';
import type { PlatformServiceId } from '../types/serviceAvailability';
import {
    resolveTenantEffectiveLimits,
    resolveTenantEffectivePlan,
} from '../types/multiTenant';
import {
    getCanonicalPlanFeatures,
    normalizePlanId,
    normalizePlanLimits,
} from '../services/billing/planCatalog';
import {
    resolveServiceAccess,
    type ServiceAccessDecision,
    type ServiceAccessInput,
} from '../services/access/serviceAccessEngine';

const ACTIVE_BILLING_STATUSES = new Set(['active', 'trial', 'trialing']);

function readTenantBillingStatus(tenant: any): string | undefined {
    const billing = tenant?.billing && typeof tenant.billing === 'object' ? tenant.billing : null;
    const status = billing?.subscriptionStatus || billing?.status;
    return typeof status === 'string' && status.trim() ? status.trim() : undefined;
}

function resolveAccessSubscriptionStatus(params: {
    creditsStatus?: string;
    billingStatus?: string;
    tenantStatus?: string;
}): string | undefined {
    const candidates = [params.creditsStatus, params.billingStatus, params.tenantStatus]
        .map(status => typeof status === 'string' ? status.trim() : '')
        .filter(Boolean);
    return candidates.find(status => !ACTIVE_BILLING_STATUSES.has(status)) || candidates[0];
}

export interface UseServiceAccessResult {
    isLoading: boolean;
    resolveAccess: (input: Omit<ServiceAccessInput, 'userId' | 'userRole' | 'tenantId'>) => ServiceAccessDecision;
    canAccessModule: (moduleId: string, input?: Partial<ServiceAccessInput>) => ServiceAccessDecision;
    canAccessService: (serviceId: PlatformServiceId, input?: Partial<ServiceAccessInput>) => ServiceAccessDecision;
}

export function useServiceAccess(): UseServiceAccessResult {
    const { user, userDocument, loadingAuth, isUserOwner } = useAuth();
    const tenantContext = useSafeTenant();
    const plansContext = useSafePlans();
    const credits = useCreditsUsage();
    const serviceAvailability = useServiceAvailability();

    const currentTenant = tenantContext?.currentTenant ?? null;
    const effectivePlanId = useMemo(() => (
        normalizePlanId(resolveTenantEffectivePlan(currentTenant)) as string
    ), [currentTenant]);

    const plan = plansContext?.getPlan(effectivePlanId);
    const planFeatures = useMemo<Partial<PlanFeatures>>(() => ({
        ...getCanonicalPlanFeatures(effectivePlanId),
        ...(plan?.features || {}),
    }), [effectivePlanId, plan?.features]);

    const planLimits = useMemo(() => (
        normalizePlanLimits(plan?.limits || resolveTenantEffectiveLimits(currentTenant), effectivePlanId)
    ), [currentTenant, effectivePlanId, plan?.limits]);

    const billingStatus = readTenantBillingStatus(currentTenant);
    const accessSubscriptionStatus = resolveAccessSubscriptionStatus({
        creditsStatus: credits.usage?.status,
        billingStatus,
        tenantStatus: currentTenant?.status,
    });
    const userRole = isUserOwner ? 'owner' : userDocument?.role;

    const baseInput = useMemo<ServiceAccessInput>(() => ({
        userId: user?.id,
        userRole,
        tenantId: currentTenant?.id,
        tenantStatus: currentTenant?.status,
        planId: effectivePlanId,
        subscriptionStatus: accessSubscriptionStatus,
        serviceAvailability: serviceAvailability.availability?.services,
        planFeatures,
        planLimits,
        permissions: tenantContext?.currentMembership?.permissions as Record<string, unknown> | undefined,
        currentUsage: currentTenant?.usage as Record<string, unknown> | undefined,
        aiCreditsUsage: credits.usage ? {
            creditsIncluded: credits.usage.limit,
            creditsUsed: credits.usage.used,
            creditsRemaining: credits.usage.remaining,
        } : undefined,
    }), [
        user?.id,
        userRole,
        currentTenant?.id,
        currentTenant?.status,
        currentTenant?.usage,
        effectivePlanId,
        credits.usage,
        billingStatus,
        accessSubscriptionStatus,
        serviceAvailability.availability?.services,
        planFeatures,
        planLimits,
        tenantContext?.currentMembership?.permissions,
    ]);

    const resolveAccess = useCallback((input: Omit<ServiceAccessInput, 'userId' | 'userRole' | 'tenantId'>) => {
        return resolveServiceAccess({
            ...baseInput,
            ...input,
            userId: baseInput.userId,
            userRole: baseInput.userRole,
            tenantId: baseInput.tenantId,
        });
    }, [baseInput]);

    const canAccessModule = useCallback((moduleId: string, input: Partial<ServiceAccessInput> = {}) => (
        resolveAccess({ ...input, moduleId })
    ), [resolveAccess]);

    const canAccessService = useCallback((serviceId: PlatformServiceId, input: Partial<ServiceAccessInput> = {}) => (
        resolveAccess({ ...input, serviceId })
    ), [resolveAccess]);

    return {
        isLoading: loadingAuth ||
            Boolean(tenantContext?.isLoadingTenant) ||
            Boolean(plansContext?.isLoading) ||
            serviceAvailability.isLoading ||
            credits.isLoading,
        resolveAccess,
        canAccessModule,
        canAccessService,
    };
}

export default useServiceAccess;
