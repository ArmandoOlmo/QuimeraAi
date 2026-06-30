/**
 * useCreditsUsage Hook
 * Hook para obtener y gestionar el uso de AI Credits del tenant actual
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import { supabase } from '../supabase';
import {
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
    getUsageColor,
} from '../types/subscription';
import {
    getCanonicalPlan,
    isPlatformUnlimitedUser,
    normalizePlanId,
    normalizePlanLimits,
} from '../services/billing/planCatalog';
import { isTransientSupabaseAvailabilityError } from '../utils/supabaseFetchGuards';

export interface CreditsUsageData {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    plan: string;
    planId: SubscriptionPlanId;
    status: string;
    billingCycle?: string;
    currentPeriodEnd?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    color: string;
    isNearLimit: boolean;
    hasExceededLimit: boolean;
    requiresPayment: boolean;
    isUnlimited: boolean;
}

interface UseCreditsUsageReturn {
    usage: CreditsUsageData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

interface SubscriptionUsageRow {
    plan_id?: string | null;
    billing_cycle?: string | null;
    status?: string | null;
    current_period_end?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    ai_credits_usage?: unknown;
}

const CREDITS_USAGE_CACHE_TTL_MS = 15000;
const subscriptionUsageCache = new Map<string, { data: SubscriptionUsageRow | null; loadedAt: number }>();
const subscriptionUsageRequests = new Map<string, Promise<SubscriptionUsageRow | null>>();

const loadSubscriptionUsageRow = async (
    tenantId: string,
    force = false
): Promise<SubscriptionUsageRow | null> => {
    const cached = subscriptionUsageCache.get(tenantId);
    if (!force && cached && Date.now() - cached.loadedAt < CREDITS_USAGE_CACHE_TTL_MS) {
        return cached.data;
    }

    const inFlight = subscriptionUsageRequests.get(tenantId);
    if (inFlight) {
        return inFlight;
    }

    let request!: Promise<SubscriptionUsageRow | null>;
    request = (async () => {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('plan_id, billing_cycle, status, current_period_end, stripe_customer_id, stripe_subscription_id, ai_credits_usage')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const row = (data || null) as SubscriptionUsageRow | null;
        subscriptionUsageCache.set(tenantId, { data: row, loadedAt: Date.now() });
        return row;
    })().finally(() => {
        if (subscriptionUsageRequests.get(tenantId) === request) {
            subscriptionUsageRequests.delete(tenantId);
        }
    });

    subscriptionUsageRequests.set(tenantId, request);
    return request;
};

export function useCreditsUsage(): UseCreditsUsageReturn {
    const { loadingAuth, userDocument } = useAuth();
    const tenantContext = useSafeTenant();
    const [usage, setUsage] = useState<CreditsUsageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(false);
    const requestIdRef = useRef(0);

    const currentTenant = tenantContext?.currentTenant;
    const tenantId = currentTenant?.id;
    const isLoadingTenant = tenantContext?.isLoadingTenant ?? false;
    const userRole = userDocument?.role;
    const isUnlimitedCreditsUser = isPlatformUnlimitedUser(userRole);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadUsage = useCallback(async (options: { force?: boolean } = {}) => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        const canCommit = () => mountedRef.current && requestIdRef.current === requestId;

        if (!tenantId) {
            setUsage(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        try {
            setError(null);
            const data = await loadSubscriptionUsageRow(tenantId, options.force === true);

            const subscriptionPlanKey = normalizePlanId(data?.plan_id || currentTenant?.subscriptionPlan || 'free') as SubscriptionPlanId;
            const planKey: SubscriptionPlanId = subscriptionPlanKey;
            const plan = SUBSCRIPTION_PLANS[planKey] || getCanonicalPlan(planKey);
            const status = isUnlimitedCreditsUser ? 'active' : data?.status || 'active';
            
            const aiUsage = data?.ai_credits_usage as any;
            const used = Number(aiUsage?.creditsUsed ?? aiUsage?.total_used ?? 0);
            const safeLimits = normalizePlanLimits(currentTenant?.limits || plan.limits, planKey);
            const tenantLimit = Number(safeLimits.maxAiCredits);
            const fallbackLimit = tenantLimit > 0 ? tenantLimit : plan.limits.maxAiCredits ?? 0;
            const limit = isUnlimitedCreditsUser
                ? fallbackLimit
                : Number(aiUsage?.creditsIncluded ?? fallbackLimit);
            
            const remaining = isUnlimitedCreditsUser
                ? limit
                : Number.isFinite(Number(aiUsage?.creditsRemaining))
                ? Number(aiUsage.creditsRemaining)
                : Math.max(0, limit - used);
            const percentage = isUnlimitedCreditsUser
                ? 0
                : limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

            if (canCommit()) {
                setUsage({
                    used,
                    limit,
                    remaining,
                    percentage,
                    plan: plan.name,
                    planId: planKey,
                    status,
                    billingCycle: data?.billing_cycle,
                    currentPeriodEnd: data?.current_period_end,
                    stripeCustomerId: data?.stripe_customer_id,
                    stripeSubscriptionId: data?.stripe_subscription_id,
                    color: getUsageColor(percentage),
                    isNearLimit: !isUnlimitedCreditsUser && percentage >= 80 && percentage < 100,
                    hasExceededLimit: !isUnlimitedCreditsUser && percentage >= 100,
                    requiresPayment: !isUnlimitedCreditsUser && ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status),
                    isUnlimited: isUnlimitedCreditsUser,
                });
            }
        } catch (err: any) {
            if (isTransientSupabaseAvailabilityError(err)) {
                console.warn('[useCreditsUsage] Credits usage temporarily unavailable:', err?.message || err);
            } else {
                console.error('Error fetching credits usage:', err);
            }
            if (canCommit()) {
                setError(err.message);
            }
        } finally {
            if (canCommit()) {
                setIsLoading(false);
            }
        }
    }, [tenantId, currentTenant?.subscriptionPlan, currentTenant?.limits, isUnlimitedCreditsUser]);

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
                    loadUsage({ force: true });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, loadUsage]);

    useEffect(() => {
        if (!tenantId || typeof window === 'undefined') return;

        const handleCreditsUpdated = (event: Event) => {
            const detail = (event as CustomEvent<{ tenantId?: string }>).detail;
            if (!detail?.tenantId || detail.tenantId === tenantId) {
                loadUsage({ force: true });
            }
        };

        const handleFocus = () => {
            loadUsage();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadUsage();
            }
        };

        window.addEventListener('quimera:credits-updated', handleCreditsUpdated);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('quimera:credits-updated', handleCreditsUpdated);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [tenantId, loadUsage]);

    return {
        usage,
        isLoading: isLoading || loadingAuth || isLoadingTenant,
        error,
        refresh: () => loadUsage({ force: true }),
    };
}

export default useCreditsUsage;
