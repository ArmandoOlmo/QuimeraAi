/**
 * PlansContext
 * Contexto global para gestionar los planes de suscripción
 * Se actualiza en tiempo real cuando se modifican los planes en Super Admin
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../supabase';
import {
    SUBSCRIPTION_PLANS,
    PlanFeatures,
    PlanLimits,
    SubscriptionPlanId,
    SubscriptionPlan
} from '../types/subscription';
import { resolveProjectName } from '../utils/resolveProjectName';

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

const PLANS_COLLECTION = 'subscription_plans';

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
        
        const fetchPlans = async () => {
            try {
                const { data, error } = await supabase
                    .from(PLANS_COLLECTION)
                    .select('*')
                    .eq('is_archived', false);
                    
                if (error) throw error;
                
                if (data && data.length > 0) {
                    const plansMap: Record<string, StoredPlanData> = {};
                    data.forEach(item => {
                        plansMap[item.id] = {
                            id: item.id as SubscriptionPlanId,
                            name: resolveProjectName(item.name || ''),
                            description: resolveProjectName(item.description || ''),
                            price: {
                                monthly: item.price_monthly,
                                annually: item.price_annually
                            },
                            features: item.features,
                            limits: item.limits,
                            color: item.color,
                            icon: item.icon,
                            isFeatured: item.is_featured,
                            isPopular: item.is_popular,
                            isArchived: item.is_archived,
                            showInLanding: item.show_in_landing,
                            landingOrder: item.landing_order
                        };
                    });
                    
                    // Fallback for missing plans to ensure completeness
                    const hardcoded = convertHardcodedPlans();
                    setPlans({ ...hardcoded, ...plansMap });
                } else {
                    setPlans(convertHardcodedPlans());
                }
            } catch (err: any) {
                console.error("[PlansContext] Error fetching plans from Supabase:", err);
                setPlans(convertHardcodedPlans());
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlans();
        
        const channel = supabase
            .channel('public:subscription_plans')
            .on('postgres_changes', { event: '*', schema: 'public', table: PLANS_COLLECTION }, (payload) => {
                fetchPlans();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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




