/**
 * AI Credits Service
 * Servicio para tracking y gestión de AI credits en Quimera AI
 */

import { supabase } from '../supabase';
import {
    AiCreditOperation,
    AiCreditTransaction,
    AiCreditsUsage,
    CreditCheckResult,
    AI_CREDIT_COSTS,
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
    calculateCreditsUsagePercentage,
} from '../types/subscription';

async function consumeCreditsServerSide(params: {
    tenantId: string;
    authorizedTenantId?: string;
    userId: string;
    operation: AiCreditOperation;
    creditsUsed: number;
    description: string;
    metadata: Record<string, any>;
}): Promise<{
    success: boolean;
    creditsUsed: number;
    creditsRemaining: number;
    transactionId?: string;
    error?: string;
}> {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
            action: 'credits_consume',
            tenant_id: params.tenantId,
            authorized_tenant_id: params.authorizedTenantId || params.tenantId,
            user_id: params.userId,
            operation: params.operation,
            credits_used: params.creditsUsed,
            description: params.description,
            metadata: params.metadata,
        },
    });

    if (error) {
        console.error('[aiCreditsService] credits_consume function error:', error);
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: 0,
            error: error.message || 'Error al consumir créditos. Por favor intenta de nuevo.',
        };
    }

    if (!data?.success) {
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: Number(data?.creditsRemaining || 0),
            error: data?.error || 'Error al consumir créditos. Por favor intenta de nuevo.',
        };
    }

    return {
        success: true,
        creditsUsed: Number(data.creditsUsed || params.creditsUsed),
        creditsRemaining: Number(data.creditsRemaining || 0),
        transactionId: data.transactionId,
    };
}

// =============================================================================
// CREDIT CONSUMPTION
// =============================================================================

/**
 * Consume AI credits para una operación
 */
export async function consumeCredits(
    tenantId: string,
    userId: string,
    operation: AiCreditOperation,
    options?: {
        projectId?: string;
        description?: string;
        model?: string;
        tokensInput?: number;
        tokensOutput?: number;
        customCredits?: number;
        metadata?: Record<string, any>;
    }
): Promise<{
    success: boolean;
    creditsUsed: number;
    creditsRemaining: number;
    transactionId?: string;
    error?: string;
}> {
    try {
        const creditsToUse = options?.customCredits ?? AI_CREDIT_COSTS[operation];
        const checkResult = await checkCreditsAvailable(tenantId, creditsToUse);

        if (!checkResult.hasCredits) {
            return {
                success: false,
                creditsUsed: 0,
                creditsRemaining: checkResult.creditsAvailable,
                error: checkResult.message || 'No hay suficientes AI credits disponibles',
            };
        }

        return await consumeCreditsServerSide({
            tenantId,
            userId,
            operation,
            creditsUsed: creditsToUse,
            description: options?.description || getOperationDescription(operation),
            metadata: {
                project_id: options?.projectId,
                model: options?.model,
                tokens_input: options?.tokensInput,
                tokens_output: options?.tokensOutput,
                ...options?.metadata
            },
        });

    } catch (error) {
        console.error('[aiCreditsService] Error consuming credits:', error);
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: 0,
            error: 'Error al consumir credits. Por favor intenta de nuevo.',
        };
    }
}

export async function checkCreditsAvailable(
    tenantId: string,
    creditsRequired: number
): Promise<CreditCheckResult> {
    try {
        const usage = await getCreditsUsage(tenantId);

        if (!usage) {
            return {
                hasCredits: true,
                creditsRequired,
                creditsAvailable: 0,
                wouldExceedLimit: false,
            };
        }

        const creditsAvailable = usage.creditsRemaining;
        const hasCredits = creditsAvailable >= creditsRequired;

        if (!hasCredits) {
            const usagePercentage = calculateCreditsUsagePercentage(
                usage.creditsUsed,
                usage.creditsIncluded
            );

            let suggestedAction: CreditCheckResult['suggestedAction'];
            let message: string;

            if (usagePercentage >= 100) {
                suggestedAction = 'upgrade';
                message = `Has agotado tus ${usage.creditsIncluded} AI credits del mes. Actualiza tu plan o compra un paquete adicional.`;
            } else {
                suggestedAction = 'buy_pack';
                message = `Necesitas ${creditsRequired} credits pero solo tienes ${creditsAvailable} disponibles.`;
            }

            return {
                hasCredits: false,
                creditsRequired,
                creditsAvailable,
                wouldExceedLimit: true,
                suggestedAction,
                message,
            };
        }

        return {
            hasCredits: true,
            creditsRequired,
            creditsAvailable,
            wouldExceedLimit: false,
        };

    } catch (error) {
        console.error('[aiCreditsService] Error checking credits:', error);
        return {
            hasCredits: true,
            creditsRequired,
            creditsAvailable: 0,
            wouldExceedLimit: false,
        };
    }
}

export async function canPerformOperation(
    tenantId: string,
    operation: AiCreditOperation,
    customCredits?: number
): Promise<CreditCheckResult> {
    const creditsRequired = customCredits ?? AI_CREDIT_COSTS[operation];
    return checkCreditsAvailable(tenantId, creditsRequired);
}

// =============================================================================
// USAGE TRACKING
// =============================================================================

export async function getCreditsUsage(tenantId: string): Promise<AiCreditsUsage | null> {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('ai_credits_usage')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error || !data || !data.ai_credits_usage) {
            return null;
        }

        return data.ai_credits_usage as AiCreditsUsage;
    } catch (error) {
        console.error('[aiCreditsService] Error getting credits usage:', error);
        return null;
    }
}

export async function initializeCreditsUsage(
    tenantId: string,
    planId: SubscriptionPlanId
): Promise<AiCreditsUsage> {
    const plan = SUBSCRIPTION_PLANS[planId];
    const now = new Date();

    const periodStart = new Date(now);
    const periodEndDate = new Date(now);
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);

    const usage: AiCreditsUsage = {
        tenantId,
        periodStart: { seconds: Math.floor(periodStart.getTime() / 1000), nanoseconds: 0 },
        periodEnd: { seconds: Math.floor(periodEndDate.getTime() / 1000), nanoseconds: 0 },
        creditsIncluded: plan.limits.maxAiCredits,
        creditsUsed: 0,
        creditsRemaining: plan.limits.maxAiCredits,
        creditsOverage: 0,
        usageByOperation: {} as Record<AiCreditOperation, number>,
        dailyUsage: [],
        lastUpdated: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
    };

    // Note: the subscriptionService inserts this into the table when creating the subscription.
    // However, if we just want to update it for an existing subscription, we do so here.
    const { error } = await supabase
        .from('subscriptions')
        .update({ ai_credits_usage: usage })
        .eq('tenant_id', tenantId);

    if (error && error.code !== 'PGRST116') {
        console.error('[aiCreditsService] Error setting credits usage:', error);
    }

    return usage;
}

async function updateUsageStats(
    tenantId: string,
    creditsUsed: number,
    operation: AiCreditOperation,
    projectId?: string
): Promise<void> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentUsage = await getCreditsUsage(tenantId);

        if (!currentUsage) {
            await initializeCreditsUsage(tenantId, 'free');
            return updateUsageStats(tenantId, creditsUsed, operation);
        }

        const now = new Date().getTime();
        if (now > currentUsage.periodEnd.seconds * 1000) {
            await initializeCreditsUsage(tenantId, 'free');
            return updateUsageStats(tenantId, creditsUsed, operation);
        }

        const usageByOperation = { ...currentUsage.usageByOperation };
        usageByOperation[operation] = (usageByOperation[operation] || 0) + creditsUsed;

        let dailyUsage = [...currentUsage.dailyUsage];
        const todayEntry = dailyUsage.find(d => d.date === today);

        if (todayEntry) {
            todayEntry.credits += creditsUsed;
        } else {
            dailyUsage.push({ date: today, credits: creditsUsed });
            if (dailyUsage.length > 30) {
                dailyUsage = dailyUsage.slice(-30);
            }
        }

        const newCreditsUsed = currentUsage.creditsUsed + creditsUsed;
        const newCreditsRemaining = Math.max(0, currentUsage.creditsIncluded - newCreditsUsed);
        const newCreditsOverage = Math.max(0, newCreditsUsed - currentUsage.creditsIncluded);

        const updatedUsage: Record<string, any> = {
            ...currentUsage,
            creditsUsed: newCreditsUsed,
            creditsRemaining: newCreditsRemaining,
            creditsOverage: newCreditsOverage,
            usageByOperation,
            dailyUsage,
            lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
        };

        if (projectId) {
            const usageByProject = (currentUsage as any).usageByProject || {};
            const projectEntry = usageByProject[projectId] || { creditsUsed: 0 };
            updatedUsage.usageByProject = {
                ...usageByProject,
                [projectId]: {
                    creditsUsed: (projectEntry.creditsUsed || 0) + creditsUsed,
                    lastUsed: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
                }
            };
        }

        await supabase
            .from('subscriptions')
            .update({ ai_credits_usage: updatedUsage })
            .eq('tenant_id', tenantId);

    } catch (error) {
        console.error('[aiCreditsService] Error updating usage stats:', error);
    }
}

export async function addCredits(
    tenantId: string,
    creditsToAdd: number,
    source: 'package_purchase' | 'bonus' | 'refund' | 'manual',
    metadata?: Record<string, any>
): Promise<boolean> {
    try {
        const currentUsage = await getCreditsUsage(tenantId);

        if (!currentUsage) {
            return false;
        }

        const updatedUsage = {
            ...currentUsage,
            creditsIncluded: currentUsage.creditsIncluded + creditsToAdd,
            creditsRemaining: currentUsage.creditsRemaining + creditsToAdd,
            lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        };

        await supabase
            .from('subscriptions')
            .update({ ai_credits_usage: updatedUsage })
            .eq('tenant_id', tenantId);

        await supabase.from('ai_credits_transactions').insert({
            tenant_id: tenantId,
            user_id: null,
            operation: 'credit_addition',
            credits_used: -creditsToAdd,
            description: `Credits añadidos: ${source}`,
            metadata: { source, ...metadata },
        });

        return true;

    } catch (error) {
        console.error('[aiCreditsService] Error adding credits:', error);
        return false;
    }
}

// =============================================================================
// TRANSACTION HISTORY
// =============================================================================

export async function getTransactionHistory(
    tenantId: string,
    options?: {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        operation?: AiCreditOperation;
        projectId?: string;
    }
): Promise<AiCreditTransaction[]> {
    try {
        let q = supabase
            .from('ai_credits_transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (options?.operation) {
            q = q.eq('operation', options.operation);
        }
        
        // projectId is inside metadata JSONB
        // Unfortunately standard PostgREST doesn't support complex JSON filtering easily if not top level
        // we'll filter client side for project id if needed

        if (options?.startDate) {
            q = q.gte('created_at', options.startDate.toISOString());
        }

        if (options?.endDate) {
            q = q.lte('created_at', options.endDate.toISOString());
        }

        if (options?.limit) {
            q = q.limit(options.limit);
        }

        const { data, error } = await q;

        if (error) throw error;
        
        let txs = data.map(d => ({
            id: d.id,
            tenantId: d.tenant_id,
            userId: d.user_id,
            operation: d.operation as AiCreditOperation,
            creditsUsed: d.credits_used,
            description: d.description,
            timestamp: { seconds: Math.floor(new Date(d.created_at).getTime() / 1000), nanoseconds: 0 } as any,
            projectId: d.metadata?.project_id,
            model: d.metadata?.model,
            tokensInput: d.metadata?.tokens_input,
            tokensOutput: d.metadata?.tokens_output,
            metadata: d.metadata
        }));

        if (options?.projectId) {
            txs = txs.filter(tx => tx.projectId === options.projectId);
        }

        return txs;

    } catch (error) {
        console.error('[aiCreditsService] Error getting transaction history:', error);
        return [];
    }
}

export async function getUsageByOperation(
    tenantId: string,
    days: number = 30
): Promise<Record<AiCreditOperation, { count: number; credits: number }>> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const transactions = await getTransactionHistory(tenantId, {
            startDate,
            limit: 1000,
        });

        const stats: Record<string, { count: number; credits: number }> = {};

        transactions.forEach((tx) => {
            if (!stats[tx.operation]) {
                stats[tx.operation] = { count: 0, credits: 0 };
            }
            stats[tx.operation].count++;
            stats[tx.operation].credits += tx.creditsUsed;
        });

        return stats as Record<AiCreditOperation, { count: number; credits: number }>;

    } catch (error) {
        console.error('[aiCreditsService] Error getting usage by operation:', error);
        return {} as Record<AiCreditOperation, { count: number; credits: number }>;
    }
}

export async function getDailyUsage(
    tenantId: string,
    days: number = 30
): Promise<Array<{ date: string; credits: number }>> {
    try {
        const usage = await getCreditsUsage(tenantId);

        if (!usage?.dailyUsage) {
            return [];
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        return usage.dailyUsage.filter(d => d.date >= cutoffString);

    } catch (error) {
        console.error('[aiCreditsService] Error getting daily usage:', error);
        return [];
    }
}

// =============================================================================
// PLAN UPGRADE HANDLING
// =============================================================================

export async function handlePlanChange(
    tenantId: string,
    oldPlanId: SubscriptionPlanId,
    newPlanId: SubscriptionPlanId
): Promise<void> {
    try {
        const oldPlan = SUBSCRIPTION_PLANS[oldPlanId];
        const newPlan = SUBSCRIPTION_PLANS[newPlanId];

        const currentUsage = await getCreditsUsage(tenantId);

        if (!currentUsage) {
            await initializeCreditsUsage(tenantId, newPlanId);
            return;
        }

        const creditsDifference = newPlan.limits.maxAiCredits - oldPlan.limits.maxAiCredits;
        const newCreditsIncluded = newPlan.limits.maxAiCredits;
        const newCreditsRemaining = Math.max(0, currentUsage.creditsRemaining + creditsDifference);

        const updatedUsage = {
            ...currentUsage,
            creditsIncluded: newCreditsIncluded,
            creditsRemaining: newCreditsRemaining,
            lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        };

        await supabase
            .from('subscriptions')
            .update({ ai_credits_usage: updatedUsage })
            .eq('tenant_id', tenantId);

        await supabase.from('ai_credits_transactions').insert({
            tenant_id: tenantId,
            user_id: null,
            operation: 'plan_change',
            credits_used: -creditsDifference,
            description: `Cambio de plan: ${oldPlanId} → ${newPlanId}`,
            metadata: { oldPlanId, newPlanId, creditsDifference },
        });

    } catch (error) {
        console.error('[aiCreditsService] Error handling plan change:', error);
    }
}

export async function resetCreditsForNewPeriod(
    tenantId: string,
    planId: SubscriptionPlanId
): Promise<void> {
    try {
        await initializeCreditsUsage(tenantId, planId);

        await supabase.from('ai_credits_transactions').insert({
            tenant_id: tenantId,
            user_id: null,
            operation: 'period_reset',
            credits_used: 0,
            description: 'Reset de credits por nuevo período de facturación',
            metadata: { planId },
        });

    } catch (error) {
        console.error('[aiCreditsService] Error resetting credits:', error);
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function getOperationDescription(operation: AiCreditOperation): string {
    const descriptions: Record<AiCreditOperation, string> = {
        onboarding_complete: 'Generación completa de website',
        design_plan: 'Generación de design plan',
        content_generation: 'Generación de contenido',
        image_generation: 'Generación de imagen',
        image_generation_fast: 'Generación de imagen (rápida)',
        image_generation_ultra: 'Generación de imagen (alta resolución)',
        video_generation_seedance: 'Generación de video (Seedance)',
        video_generation_veo: 'Generación de video (Veo 3.1)',
        video_generation_omni: 'Generación de video (Omni)',
        chatbot_message: 'Mensaje de chatbot',
        ai_assistant_request: 'Solicitud al asistente IA',
        ai_assistant_complex: 'Solicitud compleja al asistente IA',
        product_description: 'Descripción de producto con IA',
        seo_optimization: 'Optimización SEO con IA',
        email_generation: 'Generación de email con IA',
        translation: 'Traducción con IA',
    };

    return descriptions[operation] || operation;
}

export function estimateCreditsCost(credits: number): number {
    return credits * 0.01;
}

export function getCreditsUsagePercentage(usage: AiCreditsUsage): number {
    return calculateCreditsUsagePercentage(usage.creditsUsed, usage.creditsIncluded);
}

export function isNearCreditLimit(usage: AiCreditsUsage, threshold: number = 80): boolean {
    return getCreditsUsagePercentage(usage) >= threshold;
}

export function hasExceededCreditLimit(usage: AiCreditsUsage): boolean {
    return usage.creditsOverage > 0;
}

// =============================================================================
// SHARED CREDITS POOL FOR AGENCIES (Fase 4)
// =============================================================================

export async function getCreditsPoolTenantId(tenantId: string): Promise<{
    poolTenantId: string;
    isSharedPool: boolean;
    agencyName?: string;
}> {
    try {
        const usageData = await getCreditsUsage(tenantId);
        if (usageData && usageData.parentTenantId) {
            const { data: parentDoc } = await supabase.from('tenants').select('name').eq('id', usageData.parentTenantId).maybeSingle();
            return {
                poolTenantId: usageData.parentTenantId,
                isSharedPool: true,
                agencyName: parentDoc?.name,
            };
        }

        const { data: tenantData } = await supabase.from('tenants').select('owner_tenant_id').eq('id', tenantId).maybeSingle();
        if (!tenantData || !tenantData.owner_tenant_id) {
            return { poolTenantId: tenantId, isSharedPool: false };
        }

        const { data: parentData } = await supabase.from('tenants').select('name, subscription_plan').eq('id', tenantData.owner_tenant_id).maybeSingle();
        if (!parentData) {
            return { poolTenantId: tenantId, isSharedPool: false };
        }

        const plansWithSharedPool = ['agency_starter', 'agency_pro', 'agency_scale'];
        if (plansWithSharedPool.includes(parentData.subscription_plan || '')) {
            return {
                poolTenantId: tenantData.owner_tenant_id,
                isSharedPool: true,
                agencyName: parentData.name,
            };
        }

        return { poolTenantId: tenantId, isSharedPool: false };
    } catch (error) {
        console.error('[aiCreditsService] Error getting credits pool tenant ID:', error);
        return { poolTenantId: tenantId, isSharedPool: false };
    }
}

export async function consumeCreditsFromSharedPool(
    subClientTenantId: string,
    agencyTenantId: string,
    userId: string,
    operation: AiCreditOperation,
    options?: {
        projectId?: string;
        description?: string;
        model?: string;
        tokensInput?: number;
        tokensOutput?: number;
        customCredits?: number;
        metadata?: Record<string, any>;
    }
): Promise<{
    success: boolean;
    creditsUsed: number;
    creditsRemaining: number;
    transactionId?: string;
    error?: string;
}> {
    try {
        const creditsToUse = options?.customCredits ?? AI_CREDIT_COSTS[operation];
        const checkResult = await checkCreditsAvailable(agencyTenantId, creditsToUse);

        if (!checkResult.hasCredits) {
            return {
                success: false,
                creditsUsed: 0,
                creditsRemaining: checkResult.creditsAvailable,
                error: checkResult.message || 'El pool compartido de la agencia no tiene suficientes créditos',
            };
        }

        return await consumeCreditsServerSide({
            tenantId: agencyTenantId,
            authorizedTenantId: subClientTenantId,
            userId,
            operation,
            creditsUsed: creditsToUse,
            description: options?.description || getOperationDescription(operation),
            metadata: {
                project_id: options?.projectId,
                model: options?.model,
                tokens_input: options?.tokensInput,
                tokens_output: options?.tokensOutput,
                sub_client_tenant_id: subClientTenantId,
                ...options?.metadata
            },
        });
    } catch (error) {
        console.error('[aiCreditsService] Error consuming credits from shared pool:', error);
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: 0,
            error: 'Error al consumir créditos del pool compartido',
        };
    }
}

async function updateSubClientUsageInPool(
    agencyTenantId: string,
    subClientTenantId: string,
    creditsUsed: number
): Promise<void> {
    try {
        const currentUsage = await getCreditsUsage(agencyTenantId);
        if (!currentUsage) return;

        const { data: subClientDoc } = await supabase.from('tenants').select('name').eq('id', subClientTenantId).maybeSingle();
        const subClientName = subClientDoc?.name || 'Unknown';

        const subClientsUsage = currentUsage.subClientsUsage || {};
        const now = Date.now();

        if (subClientsUsage[subClientTenantId]) {
            subClientsUsage[subClientTenantId].creditsUsed += creditsUsed;
            subClientsUsage[subClientTenantId].lastUpdated = {
                seconds: Math.floor(now / 1000),
                nanoseconds: 0,
            };
        } else {
            subClientsUsage[subClientTenantId] = {
                tenantName: subClientName,
                creditsUsed,
                lastUpdated: {
                    seconds: Math.floor(now / 1000),
                    nanoseconds: 0,
                },
            };
        }

        const updatedUsage = {
            ...currentUsage,
            isAgencyPool: true,
            subClientsUsage,
            lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 }
        };

        await supabase
            .from('subscriptions')
            .update({ ai_credits_usage: updatedUsage })
            .eq('tenant_id', agencyTenantId);
            
    } catch (error) {
        console.error('[aiCreditsService] Error updating sub-client usage in pool:', error);
    }
}

export async function consumeCreditsWithPoolDetection(
    tenantId: string,
    userId: string,
    operation: AiCreditOperation,
    options?: {
        projectId?: string;
        description?: string;
        model?: string;
        tokensInput?: number;
        tokensOutput?: number;
        customCredits?: number;
        metadata?: Record<string, any>;
    }
): Promise<{
    success: boolean;
    creditsUsed: number;
    creditsRemaining: number;
    transactionId?: string;
    error?: string;
    usedSharedPool?: boolean;
    poolAgencyName?: string;
}> {
    const poolInfo = await getCreditsPoolTenantId(tenantId);

    if (poolInfo.isSharedPool) {
        const result = await consumeCreditsFromSharedPool(
            tenantId,
            poolInfo.poolTenantId,
            userId,
            operation,
            options
        );

        return {
            ...result,
            usedSharedPool: true,
            poolAgencyName: poolInfo.agencyName,
        };
    }

    const result = await consumeCredits(tenantId, userId, operation, options);
    return {
        ...result,
        usedSharedPool: false,
    };
}

export async function initializeSubClientForSharedPool(
    subClientTenantId: string,
    agencyTenantId: string
): Promise<void> {
    try {
        const now = new Date();
        const usage: AiCreditsUsage = {
            tenantId: subClientTenantId,
            parentTenantId: agencyTenantId,
            periodStart: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
            periodEnd: { seconds: Math.floor(now.getTime() / 1000) + (30 * 24 * 60 * 60), nanoseconds: 0 },
            creditsIncluded: 0,
            creditsUsed: 0,
            creditsRemaining: 0,
            creditsOverage: 0,
            usageByOperation: {} as Record<AiCreditOperation, number>,
            dailyUsage: [],
            lastUpdated: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
        };

        await supabase
            .from('subscriptions')
            .update({ ai_credits_usage: usage })
            .eq('tenant_id', subClientTenantId);

        console.log(`[SharedPool] Sub-client ${subClientTenantId} initialized to use pool from ${agencyTenantId}`);
    } catch (error) {
        console.error('[aiCreditsService] Error initializing sub-client for shared pool:', error);
    }
}

export async function getCreditsUsageWithPoolDetection(
    tenantId: string
): Promise<{
    usage: AiCreditsUsage | null;
    isSharedPool: boolean;
    poolTenantId: string;
    agencyName?: string;
}> {
    const poolInfo = await getCreditsPoolTenantId(tenantId);
    const usage = await getCreditsUsage(poolInfo.poolTenantId);

    return {
        usage,
        isSharedPool: poolInfo.isSharedPool,
        poolTenantId: poolInfo.poolTenantId,
        agencyName: poolInfo.agencyName,
    };
}

export async function getAgencyPoolBreakdown(
    agencyTenantId: string
): Promise<{
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
    subClients: Array<{
        tenantId: string;
        name: string;
        creditsUsed: number;
        percentage: number;
    }>;
}> {
    try {
        const usage = await getCreditsUsage(agencyTenantId);

        if (!usage) {
            return {
                totalCredits: 0,
                usedCredits: 0,
                remainingCredits: 0,
                subClients: [],
            };
        }

        const subClients = Object.entries(usage.subClientsUsage || {}).map(
            ([tenantId, data]) => ({
                tenantId,
                name: data.tenantName,
                creditsUsed: data.creditsUsed,
                percentage: usage.creditsUsed > 0
                    ? Math.round((data.creditsUsed / usage.creditsUsed) * 100)
                    : 0,
            })
        );

        subClients.sort((a, b) => b.creditsUsed - a.creditsUsed);

        return {
            totalCredits: usage.creditsIncluded,
            usedCredits: usage.creditsUsed,
            remainingCredits: usage.creditsRemaining,
            subClients,
        };
    } catch (error) {
        console.error('[aiCreditsService] Error getting agency pool breakdown:', error);
        return {
            totalCredits: 0,
            usedCredits: 0,
            remainingCredits: 0,
            subClients: [],
        };
    }
}
