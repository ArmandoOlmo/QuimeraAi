/**
 * usePlanFeatures Hook
 * Hook para obtener las features del plan actual del usuario
 * Usa el PlansContext para obtener datos en tiempo real de Firestore
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

    const planId = (usage?.planId || 'free') as SubscriptionPlanId;

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
            features: hardcoded?.features || SUBSCRIPTION_PLANS.free.features,
            limits: hardcoded?.limits || SUBSCRIPTION_PLANS.free.limits,
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
    const { user, isUserOwner, userDocument, loadingAuth } = useAuth();
    const { usage, isLoading: isLoadingCredits } = useCreditsUsage();
    const plansContext = useSafePlans();

    const planId = (usage?.planId || 'free') as SubscriptionPlanId;
    // Owner and superadmin always have full access to all features
    // Check role first (most reliable), then email-based owner check as fallback
    const userRole = userDocument?.role;
    const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

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
            features: hardcoded?.features || SUBSCRIPTION_PLANS.free.features,
            limits: hardcoded?.limits || SUBSCRIPTION_PLANS.free.limits,
        };
    }, [plansContext, planId]);

    // Check if user has access to a feature
    const hasAccess = useCallback((feature?: keyof PlanFeatures): boolean => {
        if (!feature) return true;
        if (isOwner) {
            console.log('[usePlanAccess] Owner/SuperAdmin bypass activated for feature:', feature, 'userRole:', userRole);
            return true; // Direct bypass for owner
        }
        const access = isFeatureEnabled(planData.features[feature]);
        console.log('[usePlanAccess] Feature access check:', feature, 'hasAccess:', access, 'userRole:', userRole, 'isOwner:', isOwner);
        return access;
    }, [planData.features, isOwner, userRole]);

    // Get minimum plan name for a feature
    const getMinPlan = useCallback((feature: keyof PlanFeatures): string => {
        if (plansContext) {
            const { planName } = plansContext.getMinPlanForFeature(feature);
            return planName.toUpperCase();
        }

        // Fallback to hardcoded
        const planOrder: SubscriptionPlanId[] = ['free', 'starter', 'pro', 'agency', 'enterprise'];
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




