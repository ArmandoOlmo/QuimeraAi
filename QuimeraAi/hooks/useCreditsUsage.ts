/**
 * useCreditsUsage Hook
 * Hook para obtener y gestionar el uso de AI Credits del tenant actual
 */

import { useState, useEffect, useCallback } from 'react';
import { useSafeTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import {
    db,
    doc,
    getDoc,
    onSnapshot,
} from '../firebase';
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
        if (!tenantId || !user) {
            // Si no hay tenant, intentar cargar desde el documento del usuario o usar defaults
            setUsage({
                used: 0,
                limit: SUBSCRIPTION_PLANS.free.limits.maxAiCredits,
                remaining: SUBSCRIPTION_PLANS.free.limits.maxAiCredits,
                percentage: 0,
                plan: 'Free',
                planId: 'free',
                color: getUsageColor(0),
                isNearLimit: false,
                hasExceededLimit: false,
            });
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Intentar cargar desde aiCreditsUsage
            const usageRef = doc(db, 'aiCreditsUsage', tenantId);
            const usageDoc = await getDoc(usageRef);

            if (usageDoc.exists()) {
                const data = usageDoc.data();
                const used = data.creditsUsed || data.used || 0;
                // Support both "creditsIncluded" and "limit" field names
                let limit = data.creditsIncluded || data.limit || SUBSCRIPTION_PLANS.free.limits.maxAiCredits;

                // Use planId directly if available, otherwise determine from credits
                let planId: SubscriptionPlanId = (data.planId as SubscriptionPlanId) || 'free';
                let planName = SUBSCRIPTION_PLANS[planId]?.name || 'Free';

                // If no direct planId, try to determine from credits limit
                if (!data.planId) {
                    for (const [id, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
                        if (plan.limits.maxAiCredits === limit) {
                            planId = id as SubscriptionPlanId;
                            planName = plan.name;
                            break;
                        }
                    }
                }

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
            } else {
                // Si no existe, intentar obtener del tenant o usar defaults
                const tenantRef = doc(db, 'tenants', tenantId);
                const tenantDoc = await getDoc(tenantRef);

                if (tenantDoc.exists()) {
                    const tenantData = tenantDoc.data();
                    const planKey = (tenantData.subscriptionPlan || 'free') as SubscriptionPlanId;
                    const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;

                    let used = tenantData.usage?.aiCreditsUsed || 0;
                    let limit = tenantData.limits?.maxAiCredits || plan.limits.maxAiCredits;
                    let planName = plan.name;
                    let planId = planKey;

                    // OVERRIDE FOR OWNER/SUPERADMIN
                    if (isOwner) {
                        planId = 'enterprise';
                        const enterprisePlan = SUBSCRIPTION_PLANS.enterprise;
                        planName = enterprisePlan.name;
                        limit = enterprisePlan.limits.maxAiCredits;
                        // Keep real usage
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
                } else {
                    // Usar valores por defecto del plan free (o enterprise si es owner)
                    let freePlan = SUBSCRIPTION_PLANS.free;
                    let limit = freePlan.limits.maxAiCredits;
                    let planName = freePlan.name;
                    let planId: SubscriptionPlanId = 'free';

                    if (isOwner) {
                        freePlan = SUBSCRIPTION_PLANS.enterprise;
                        limit = freePlan.limits.maxAiCredits;
                        planName = freePlan.name;
                        planId = 'enterprise';
                    }

                    setUsage({
                        used: 0,
                        limit: limit,
                        remaining: limit,
                        percentage: 0,
                        plan: planName,
                        planId: planId,
                        color: getUsageColor(0),
                        isNearLimit: false,
                        hasExceededLimit: false,
                    });
                }
            }
        } catch (err) {
            console.error('Error loading credits usage:', err);
            setError('Error al cargar el uso de créditos');
            // Establecer valores por defecto en caso de error
            setUsage({
                used: 0,
                limit: SUBSCRIPTION_PLANS.free.limits.maxAiCredits,
                remaining: SUBSCRIPTION_PLANS.free.limits.maxAiCredits,
                percentage: 0,
                plan: 'Free',
                planId: 'free',
                color: getUsageColor(0),
                isNearLimit: false,
                hasExceededLimit: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, [tenantId, user, isOwner]);

    // Cargar al montar y cuando cambie el tenant
    useEffect(() => {
        loadUsage();
    }, [loadUsage]);

    // Suscribirse a cambios en tiempo real
    useEffect(() => {
        if (!tenantId || !user) return;

        const usageRef = doc(db, 'aiCreditsUsage', tenantId);
        const unsubscribe = onSnapshot(
            usageRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const used = data.creditsUsed || data.used || 0;
                    // Support both "creditsIncluded" and "limit" field names
                    let limit = data.creditsIncluded || data.limit || SUBSCRIPTION_PLANS.free.limits.maxAiCredits;

                    // Use planId directly if available, otherwise determine from credits
                    let planId: SubscriptionPlanId = (data.planId as SubscriptionPlanId) || 'free';
                    let planName = SUBSCRIPTION_PLANS[planId]?.name || 'Free';

                    // If no direct planId, try to determine from credits limit
                    if (!data.planId) {
                        for (const [id, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
                            if (plan.limits.maxAiCredits === limit) {
                                planId = id as SubscriptionPlanId;
                                planName = plan.name;
                                break;
                            }
                        }
                    }

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
                }
            },
            (error) => {
                // Ignorar errores de permisos silenciosamente
                if (error.code !== 'permission-denied') {
                    console.error('Error in credits usage listener:', error);
                }
            }
        );

        return () => unsubscribe();
    }, [tenantId, user, isOwner]);

    return {
        usage,
        isLoading: isLoading || loadingAuth,
        error,
        refresh: loadUsage,
    };
}

export default useCreditsUsage;




