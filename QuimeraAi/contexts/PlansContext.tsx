/**
 * PlansContext
 * Contexto global para gestionar los planes de suscripción
 * Se actualiza en tiempo real cuando se modifican los planes en Super Admin
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import {
    SUBSCRIPTION_PLANS,
    PlanFeatures,
    PlanLimits,
    SubscriptionPlanId,
    SubscriptionPlan
} from '../types/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface StoredPlanData {
    id: SubscriptionPlanId;
    name: string;
    description: string;
    price: { monthly: number; annually: number };
    features: PlanFeatures;
    limits: PlanLimits;
    color: string;
    icon: string;
    isFeatured?: boolean;
    isPopular?: boolean;
    isArchived?: boolean;
    showInLanding?: boolean;
    landingOrder?: number;
}

export interface PlansContextValue {
    // All plans data
    plans: Record<string, StoredPlanData>;
    plansArray: StoredPlanData[];

    // Loading state
    isLoading: boolean;
    error: string | null;

    // Helper functions
    getPlan: (planId: string) => StoredPlanData | null;
    getPlanFeatures: (planId: string) => PlanFeatures;
    getPlanLimits: (planId: string) => PlanLimits;
    hasFeatureInPlan: (planId: string, feature: keyof PlanFeatures) => boolean;
    getMinPlanForFeature: (feature: keyof PlanFeatures) => { planId: string; planName: string };

    // Refresh function
    refresh: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PLANS_COLLECTION = 'subscriptionPlans';

// Plan order for comparison
const PLAN_ORDER: SubscriptionPlanId[] = ['free', 'individual', 'agency_starter', 'agency_pro', 'agency_scale', 'enterprise'];

// =============================================================================
// CONTEXT
// =============================================================================

const PlansContext = createContext<PlansContextValue | null>(null);

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
 * Convert hardcoded plans to StoredPlanData format
 */
function convertHardcodedPlans(): Record<string, StoredPlanData> {
    const result: Record<string, StoredPlanData> = {};

    for (const [id, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
        result[id] = {
            id: id as SubscriptionPlanId,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            features: plan.features,
            limits: plan.limits,
            color: plan.color,
            icon: plan.icon,
            isFeatured: plan.isFeatured,
            isPopular: plan.isPopular,
        };
    }

    return result;
}

// =============================================================================
// PROVIDER
// =============================================================================

export const PlansProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [plans, setPlans] = useState<Record<string, StoredPlanData>>(() => convertHardcodedPlans());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Subscribe to plans collection with real-time updates
    useEffect(() => {
        setIsLoading(true);
        setError(null);

        try {
            const plansQuery = query(
                collection(db, PLANS_COLLECTION),
                orderBy('price.monthly', 'asc')
            );

            const unsubscribe = onSnapshot(
                plansQuery,
                (snapshot) => {
                    if (snapshot.empty) {
                        // No plans in Firestore, use hardcoded
                        console.log('[PlansContext] No plans in Firestore, using hardcoded plans');
                        setPlans(convertHardcodedPlans());
                    } else {
                        const seenPlans = new Set<string>();
                        const loadedPlans: Record<string, StoredPlanData> = {};

                        snapshot.docs.forEach((doc) => {
                            const data = doc.data();
                            seenPlans.add(doc.id);

                            // Skip archived plans
                            if (data.isArchived) return;

                            loadedPlans[doc.id] = {
                                id: doc.id as SubscriptionPlanId,
                                name: data.name || doc.id,
                                description: data.description || '',
                                price: data.price || { monthly: 0, annually: 0 },
                                features: data.features || SUBSCRIPTION_PLANS.free.features,
                                limits: data.limits || SUBSCRIPTION_PLANS.free.limits,
                                color: data.color || '#6b7280',
                                icon: data.icon || 'Sparkles',
                                isFeatured: data.isFeatured || false,
                                isPopular: data.isPopular || false,
                                isArchived: data.isArchived || false,
                                showInLanding: data.showInLanding,
                                landingOrder: data.landingOrder,
                            };
                        });

                        // Ensure we have at least the base plans
                        for (const planId of PLAN_ORDER) {
                            // Only fall back to hardcoded if the plan is NOT in Firestore at all
                            // If it is in Firestore but was skipped (archived), do NOT use hardcoded
                            if (!loadedPlans[planId] && !seenPlans.has(planId)) {
                                const hardcoded = SUBSCRIPTION_PLANS[planId];
                                if (hardcoded) {
                                    loadedPlans[planId] = {
                                        id: planId,
                                        name: hardcoded.name,
                                        description: hardcoded.description,
                                        price: hardcoded.price,
                                        features: hardcoded.features,
                                        limits: hardcoded.limits,
                                        color: hardcoded.color,
                                        icon: hardcoded.icon,
                                        isFeatured: hardcoded.isFeatured,
                                        isPopular: hardcoded.isPopular,
                                    };
                                }
                            }
                        }

                        console.log('[PlansContext] Loaded plans from Firestore:', Object.keys(loadedPlans));
                        setPlans(loadedPlans);
                    }
                    setIsLoading(false);
                },
                (err) => {
                    console.error('[PlansContext] Error loading plans:', err);
                    setError(err.message);
                    // Fallback to hardcoded plans
                    setPlans(convertHardcodedPlans());
                    setIsLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('[PlansContext] Error setting up listener:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setPlans(convertHardcodedPlans());
            setIsLoading(false);
        }
    }, [refreshTrigger]);

    // Convert to array sorted by plan order
    const plansArray = useMemo(() => {
        return PLAN_ORDER
            .filter(id => plans[id])
            .map(id => plans[id]);
    }, [plans]);

    // Get a specific plan
    const getPlan = useCallback((planId: string): StoredPlanData | null => {
        return plans[planId] || null;
    }, [plans]);

    // Get features for a plan
    const getPlanFeatures = useCallback((planId: string): PlanFeatures => {
        return plans[planId]?.features || SUBSCRIPTION_PLANS.free.features;
    }, [plans]);

    // Get limits for a plan
    const getPlanLimits = useCallback((planId: string): PlanLimits => {
        return plans[planId]?.limits || SUBSCRIPTION_PLANS.free.limits;
    }, [plans]);

    // Check if a plan has a specific feature
    const hasFeatureInPlan = useCallback((planId: string, feature: keyof PlanFeatures): boolean => {
        const planFeatures = plans[planId]?.features || SUBSCRIPTION_PLANS.free.features;
        return isFeatureEnabled(planFeatures[feature]);
    }, [plans]);

    // Get the minimum plan required for a feature
    const getMinPlanForFeature = useCallback((feature: keyof PlanFeatures): { planId: string; planName: string } => {
        for (const planId of PLAN_ORDER) {
            const plan = plans[planId];
            if (plan && isFeatureEnabled(plan.features[feature])) {
                return { planId, planName: plan.name };
            }
        }
        return { planId: 'pro', planName: 'Pro' }; // Default fallback
    }, [plans]);

    // Refresh function
    const refresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const value: PlansContextValue = {
        plans,
        plansArray,
        isLoading,
        error,
        getPlan,
        getPlanFeatures,
        getPlanLimits,
        hasFeatureInPlan,
        getMinPlanForFeature,
        refresh,
    };

    return (
        <PlansContext.Provider value={value}>
            {children}
        </PlansContext.Provider>
    );
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access the plans context
 */
export function usePlans(): PlansContextValue {
    const context = useContext(PlansContext);
    if (!context) {
        throw new Error('usePlans must be used within a PlansProvider');
    }
    return context;
}

/**
 * Safe hook that returns null if not within provider
 */
export function useSafePlans(): PlansContextValue | null {
    return useContext(PlansContext);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PlansContext;




