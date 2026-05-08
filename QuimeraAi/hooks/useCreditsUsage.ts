/**
 * useCreditsUsage Hook
 * Hook para obtener y gestionar el uso de AI Credits del tenant actual
 */

import { useState, useEffect, useCallback } from 'react';
import { useSafeTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import { supabase } from '../supabase';
import {
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
    getUsageColor,
} from '../types/subscription';

export interface CreditsUsageData {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    plan: string;
    planId: SubscriptionPlanId;
    color: string;
    isNearLimit: boolean;
    hasExceededLimit: boolean;
}

interface UseCreditsUsageReturn {
    usage: CreditsUsageData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useCreditsUsage(): UseCreditsUsageReturn {
    const { user, isUserOwner, userDocument, loadingAuth } = useAuth();
    const tenantContext = useSafeTenant();
    const [usage, setUsage] = useState<CreditsUsageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check role first (most reliable), then email-based owner check as fallback
    const userRole = userDocument?.role;
    const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

    const tenantId = tenantContext?.currentTenant?.id;

    const loadUsage = useCallback(async () => {
        if (!tenantId) {
            setUsage(null);
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('plan_id, ai_credits_usage')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            let planKey: SubscriptionPlanId = (data?.plan_id as SubscriptionPlanId) || 'free';
            let plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;
            
            const aiUsage = data?.ai_credits_usage as any;
            let used = aiUsage?.creditsUsed || 0;
            let limit = aiUsage?.creditsIncluded || plan.limits.maxAiCredits;
            
            let planName = plan.name;
            let planId = planKey;

            // OVERRIDE FOR OWNER/SUPERADMIN
            if (isOwner) {
                planId = 'enterprise';
                const enterprisePlan = SUBSCRIPTION_PLANS.enterprise;
                planName = enterprisePlan.name;
                limit = enterprisePlan.limits.maxAiCredits;
            }

            const remaining = Math.max(0, limit - used);
            const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

            setUsage({
                used,
                limit,
                remaining,
                percentage,
                plan: planName,
                planId,
                color: getUsageColor(percentage),
                isNearLimit: percentage >= 80 && percentage < 100,
                hasExceededLimit: percentage >= 100,
            });
        } catch (err: any) {
            console.error('Error fetching credits usage:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId, isOwner]);

    // Cargar al montar y cuando cambie el tenant
    useEffect(() => {
        loadUsage();
    }, [loadUsage]);

    // Supabase Real-time listener
    useEffect(() => {
        if (!tenantId) return;

        // Use a unique channel name to avoid "cannot add postgres_changes ... after subscribe()" 
        // when React re-runs this effect quickly (e.g. Strict Mode or rapid state changes).
        const channelName = `public:subscriptions:tenant_id=eq.${tenantId}_credits_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `tenant_id=eq.${tenantId}`,
                },
                () => {
                    loadUsage();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, loadUsage]);

    return {
        usage,
        isLoading: isLoading || loadingAuth,
        error,
        refresh: loadUsage,
    };
}

export default useCreditsUsage;




