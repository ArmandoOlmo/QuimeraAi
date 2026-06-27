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

export interface UseServiceAccessResult {
    isLoading: boolean;
    resolveAccess: (input: Omit<ServiceAccessInput, 'userId' | 'userRole' | 'tenantId'>) => ServiceAccessDecision;
    canAccessModule: (moduleId: string, input?: Partial<ServiceAccessInput>) => ServiceAccessDecision;
    canAccessService: (serviceId: PlatformServiceId, input?: Partial<ServiceAccessInput>) => ServiceAccessDecision;
}

export function useServiceAccess(): UseServiceAccessResult {
    const { user, userDocument, loadingAuth } = useAuth();
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

    const baseInput = useMemo<ServiceAccessInput>(() => ({
        userId: user?.id,
        userRole: userDocument?.role,
        tenantId: currentTenant?.id,
        tenantStatus: currentTenant?.status,
        planId: effectivePlanId,
        subscriptionStatus: credits.usage?.status || currentTenant?.status,
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
        userDocument?.role,
        currentTenant?.id,
        currentTenant?.status,
        currentTenant?.usage,
        effectivePlanId,
        credits.usage,
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

