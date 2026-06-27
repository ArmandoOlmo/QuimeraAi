/**
 * usePlanFeatures Hook
 * Hook para obtener las features del plan actual del usuario
 * Usa el PlansContext para obtener datos en tiempo real de Supabase
 */

import { useCallback, useMemo } from 'react';
import { useCreditsUsage } from './useCreditsUsage';
import { useSafePlans } from '../contexts/PlansContext';
import { useAuth } from '../contexts/core/AuthContext';
import {
    SUBSCRIPTION_PLANS,
    PlanFeatures,
    PlanLimits,
    SubscriptionPlanId
} from '../types/subscription';
import {
    CANONICAL_PLAN_IDS,
    getCanonicalPlanFeatures,
    getCanonicalPlanLimits,
    isPlatformUnlimitedUser,
    normalizePlanId,
} from '../services/billing/planCatalog';

// =============================================================================
// TYPES
// =============================================================================

export interface PlanFeaturesData {
    planId: SubscriptionPlanId;
    planName: string;
    features: PlanFeatures;
    limits: PlanLimits;
    isLoading: boolean;
    error: string | null;
}

export interface PlanAccessData {
    planId: SubscriptionPlanId;
    planName: string;
    features: PlanFeatures;
    limits: PlanLimits;
    hasAccess: (feature?: keyof PlanFeatures) => boolean;
    getMinPlan: (feature: keyof PlanFeatures) => string;
    isLoading: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a feature is enabled based on its value
 */
function isFeatureEnabled(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value !== 'community';
    return false;
}

/**
 * Verifica si un plan tiene acceso a una feature
 */
export function checkFeatureAccess(
    feature: keyof PlanFeatures | undefined,
    features: PlanFeatures
): boolean {
    if (!feature) return true; // No feature required = always accessible
    return isFeatureEnabled(features[feature]);
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook para obtener las features del plan actual del usuario
 */
export function usePlanFeatures(): PlanFeaturesData {
    const { usage, isLoading: isLoadingCredits } = useCreditsUsage();
    const plansContext = useSafePlans();

    const planId = normalizePlanId(usage?.planId || 'free') as SubscriptionPlanId;

    // Get plan data from context or fallback to hardcoded
    const planData = useMemo(() => {
        if (plansContext) {
            const plan = plansContext.getPlan(planId);
            if (plan) {
                return {
                    name: plan.name,
                    features: plan.features,
                    limits: plan.limits,
                };
            }
        }

        // Fallback to hardcoded plans
        const hardcoded = SUBSCRIPTION_PLANS[planId];
        return {
            name: hardcoded?.name || 'Free',
            features: hardcoded?.features || getCanonicalPlanFeatures(planId),
            limits: hardcoded?.limits || getCanonicalPlanLimits(planId),
        };
    }, [plansContext, planId]);

    return {
        planId,
        planName: planData.name,
        features: planData.features,
        limits: planData.limits,
        isLoading: isLoadingCredits || (plansContext?.isLoading ?? false),
        error: plansContext?.error ?? null,
    };
}

/**
 * Hook que combina features del plan actual con funciones de acceso
 * Usa el PlansContext para datos en tiempo real
 */
export function usePlanAccess(): PlanAccessData {
    const { userDocument, loadingAuth } = useAuth();
    const { usage, isLoading: isLoadingCredits } = useCreditsUsage();
    const plansContext = useSafePlans();

    const planId = normalizePlanId(usage?.planId || 'free') as SubscriptionPlanId;
    // Owner and superadmin are the only platform-wide bypass roles.
    const userRole = userDocument?.role;
    const isOwner = isPlatformUnlimitedUser(userRole);

    // Get plan data from context or fallback
    const planData = useMemo(() => {
        if (plansContext) {
            const plan = plansContext.getPlan(planId);
            if (plan) {
                return {
                    name: plan.name,
                    features: plan.features,
                    limits: plan.limits,
                };
            }
        }

        const hardcoded = SUBSCRIPTION_PLANS[planId];
        return {
            name: hardcoded?.name || 'Free',
            features: hardcoded?.features || getCanonicalPlanFeatures(planId),
            limits: hardcoded?.limits || getCanonicalPlanLimits(planId),
        };
    }, [plansContext, planId]);

    // Check if user has access to a feature
    const hasAccess = useCallback((feature?: keyof PlanFeatures): boolean => {
        if (!feature) return true;
        if (isOwner) {
            return true; // Direct bypass for owner
        }
        return isFeatureEnabled(planData.features[feature]);
    }, [planData.features, isOwner, userRole]);

    // Get minimum plan name for a feature
    const getMinPlan = useCallback((feature: keyof PlanFeatures): string => {
        if (plansContext) {
            const { planName } = plansContext.getMinPlanForFeature(feature);
            return planName.toUpperCase();
        }

        // Fallback to canonical active plans; legacy ids are normalized elsewhere.
        const planOrder = CANONICAL_PLAN_IDS as readonly SubscriptionPlanId[];
        for (const id of planOrder) {
            const plan = SUBSCRIPTION_PLANS[id];
            if (plan && isFeatureEnabled(plan.features[feature])) {
                return plan.name.toUpperCase();
            }
        }
        return 'PRO';
    }, [plansContext]);

    return {
        planId,
        planName: planData.name,
        features: planData.features,
        limits: planData.limits,
        hasAccess,
        getMinPlan,
        isLoading: isLoadingCredits || (plansContext?.isLoading ?? false) || loadingAuth,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default usePlanFeatures;
