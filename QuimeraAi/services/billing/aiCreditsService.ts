import { addCredits as addCreditsInternal, consumeCredits as consumeCreditsInternal } from '../aiCreditsService';

export {
    addCredits,
    assertCreditsAvailable,
    canPerformOperation,
    checkCreditsAvailable,
    consumeCredits,
    consumeCreditsFromSharedPool,
    consumeCreditsWithPoolDetection,
    estimateCreditsCost,
    getAgencyPoolBreakdown,
    getCreditCost,
    getCreditsPoolTenantId,
    getCreditsUsage,
    getCreditsUsagePercentage,
    getCreditsUsageWithPoolDetection,
    getDailyUsage,
    getTransactionHistory,
    getUsageByOperation,
    handlePlanChange,
    hasExceededCreditLimit,
    initializeCreditsUsage,
    initializeSubClientForSharedPool,
    isNearCreditLimit,
    normalizeAiCreditsUsage,
    resetCreditsForNewPeriod,
} from '../aiCreditsService';

export async function debitCredits(...args: Parameters<typeof consumeCreditsInternal>) {
    return consumeCreditsInternal(...args);
}

export async function refundCredits(params: {
    tenantId: string;
    credits: number;
    reason: string;
    metadata?: Record<string, unknown>;
}): Promise<boolean> {
    return addCreditsInternal(params.tenantId, params.credits, 'refund', {
        reason: params.reason,
        ...params.metadata,
    });
}

export async function recordAiCreditTransaction(params: {
    tenantId: string;
    credits: number;
    reason: string;
    metadata?: Record<string, unknown>;
}): Promise<boolean> {
    return addCreditsInternal(params.tenantId, params.credits, 'manual', {
        reason: params.reason,
        ...params.metadata,
    });
}
