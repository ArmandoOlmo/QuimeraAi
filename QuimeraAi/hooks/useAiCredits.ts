/**
 * useAiCredits Hook
 * Hook para gestión y consumo de AI credits en componentes React
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/core/AuthContext';
import {
    consumeCredits,
    checkCreditsAvailable,
    canPerformOperation,
    getCreditsUsage,
    getTransactionHistory,
    getUsageByOperation,
    getDailyUsage,
    addCredits,
    isNearCreditLimit,
    hasExceededCreditLimit,
    getCreditsUsagePercentage,
} from '../services/aiCreditsService';
import {
    getTenantSubscription,
    getCurrentPlan,
    hasFeature,
} from '../services/subscriptionService';
import {
    AiCreditOperation,
    AiCreditsUsage,
    AiCreditTransaction,
    CreditCheckResult,
    AI_CREDIT_COSTS,
    SubscriptionPlan,
    getUsageColor,
    calculateCreditsUsagePercentage,
} from '../types/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAiCreditsOptions {
    tenantId: string;
    userId: string;
    autoRefresh?: boolean;
    refreshInterval?: number;  // en milisegundos
}

export interface UseAiCreditsResult {
    // Estado
    isLoading: boolean;
    error: string | null;

    // Datos de uso
    usage: AiCreditsUsage | null;
    creditsRemaining: number;
    creditsUsed: number;
    creditsIncluded: number;
    usagePercentage: number;
    usageColor: string;

    // Estados de alerta
    isNearLimit: boolean;
    hasExceededLimit: boolean;

    // Plan actual
    currentPlan: SubscriptionPlan | null;

    // Acciones
    consumeCredits: (
        operation: AiCreditOperation,
        options?: {
            projectId?: string;
            description?: string;
            model?: string;
            customCredits?: number;
            metadata?: Record<string, any>;
        }
    ) => Promise<{
        success: boolean;
        creditsUsed: number;
        creditsRemaining: number;
        error?: string;
    }>;

    checkCredits: (operation: AiCreditOperation) => Promise<CreditCheckResult>;
    canPerformOperation: (operation: AiCreditOperation) => Promise<boolean>;

    // Historial
    getTransactionHistory: (limit?: number) => Promise<AiCreditTransaction[]>;
    getUsageByOperation: () => Promise<Record<AiCreditOperation, { count: number; credits: number }>>;
    getDailyUsage: (days?: number) => Promise<Array<{ date: string; credits: number }>>;

    // Refresh
    refresh: () => Promise<void>;

    // Helpers
    getCreditCost: (operation: AiCreditOperation) => number;
    formatCredits: (credits: number) => string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAiCredits(options: UseAiCreditsOptions): UseAiCreditsResult {
    const { tenantId, userId, autoRefresh = true, refreshInterval = 60000 } = options;
    const { userDocument, isUserOwner, loadingAuth } = useAuth();
    // Check role first (most reliable), then email-based owner check as fallback
    const userRole = userDocument?.role;
    const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

    // State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usage, setUsage] = useState<AiCreditsUsage | null>(null);
    const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

    // Cargar datos iniciales
    const loadData = useCallback(async () => {
        if (!tenantId) return;

        try {
            setIsLoading(true);
            setError(null);

            const [usageData, planData] = await Promise.all([
                getCreditsUsage(tenantId),
                getCurrentPlan(tenantId),
            ]);

            setUsage(usageData);
            setCurrentPlan(planData);

        } catch (err) {
            console.error('Error loading AI credits data:', err);
            setError('Error al cargar datos de credits');
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    // Cargar al montar y cuando cambia tenantId
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !tenantId) return;

        const interval = setInterval(loadData, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, loadData, tenantId]);

    // Valores calculados
    const creditsRemaining = usage?.creditsRemaining ?? 0;
    const creditsUsed = usage?.creditsUsed ?? 0;
    const creditsIncluded = usage?.creditsIncluded ?? 0;

    const usagePercentage = useMemo(() => {
        if (!usage) return 0;
        return calculateCreditsUsagePercentage(creditsUsed, creditsIncluded);
    }, [usage, creditsUsed, creditsIncluded]);

    const usageColor = useMemo(() => getUsageColor(usagePercentage), [usagePercentage]);

    const isNearLimit = useMemo(() => {
        if (!usage || isOwner) return false;
        return isNearCreditLimit(usage, 80);
    }, [usage, isOwner]);

    const hasExceeded = useMemo(() => {
        if (!usage || isOwner) return false;
        return hasExceededCreditLimit(usage);
    }, [usage, isOwner]);

    // Consumir credits
    const handleConsumeCredits = useCallback(async (
        operation: AiCreditOperation,
        consumeOptions?: {
            projectId?: string;
            description?: string;
            model?: string;
            customCredits?: number;
            metadata?: Record<string, any>;
        }
    ) => {
        if (!tenantId || !userId) {
            return {
                success: false,
                creditsUsed: 0,
                creditsRemaining: 0,
                error: 'Tenant o usuario no válido',
            };
        }

        const result = await consumeCredits(tenantId, userId, operation, consumeOptions);

        // Refresh data after consuming
        if (result.success) {
            await loadData();
        }

        return result;
    }, [tenantId, userId, loadData]);

    // Verificar credits disponibles
    const handleCheckCredits = useCallback(async (
        operation: AiCreditOperation
    ): Promise<CreditCheckResult> => {
        if (!tenantId) {
            return {
                hasCredits: false,
                creditsRequired: AI_CREDIT_COSTS[operation],
                creditsAvailable: 0,
                wouldExceedLimit: true,
                message: 'Tenant no válido',
            };
        }

        return canPerformOperation(tenantId, operation);
    }, [tenantId]);

    // Puede realizar operación
    const handleCanPerformOperation = useCallback(async (
        operation: AiCreditOperation
    ): Promise<boolean> => {
        const result = await handleCheckCredits(operation);
        return result.hasCredits;
    }, [handleCheckCredits]);

    // Obtener historial
    const handleGetTransactionHistory = useCallback(async (
        limit: number = 50
    ): Promise<AiCreditTransaction[]> => {
        if (!tenantId) return [];
        return getTransactionHistory(tenantId, { limit });
    }, [tenantId]);

    // Obtener uso por operación
    const handleGetUsageByOperation = useCallback(async () => {
        if (!tenantId) return {} as Record<AiCreditOperation, { count: number; credits: number }>;
        return getUsageByOperation(tenantId);
    }, [tenantId]);

    // Obtener uso diario
    const handleGetDailyUsage = useCallback(async (days: number = 30) => {
        if (!tenantId) return [];
        return getDailyUsage(tenantId, days);
    }, [tenantId]);

    // Obtener costo de una operación
    const getCreditCost = useCallback((operation: AiCreditOperation): number => {
        return AI_CREDIT_COSTS[operation];
    }, []);

    // Formatear credits
    const formatCredits = useCallback((credits: number): string => {
        if (credits >= 1000) {
            return `${(credits / 1000).toFixed(1)}K`;
        }
        return credits.toLocaleString();
    }, []);

    return {
        // Estado
        isLoading: isLoading || loadingAuth,
        error,

        // Datos de uso
        usage,
        creditsRemaining,
        creditsUsed,
        creditsIncluded,
        usagePercentage,
        usageColor,

        // Estados de alerta
        isNearLimit,
        hasExceededLimit: hasExceeded,

        // Plan actual
        currentPlan,

        // Acciones
        consumeCredits: handleConsumeCredits,
        checkCredits: handleCheckCredits,
        canPerformOperation: handleCanPerformOperation,

        // Historial
        getTransactionHistory: handleGetTransactionHistory,
        getUsageByOperation: handleGetUsageByOperation,
        getDailyUsage: handleGetDailyUsage,

        // Refresh
        refresh: loadData,

        // Helpers
        getCreditCost,
        formatCredits,
    };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook simplificado para verificar si una operación es posible
 */
export function useCanPerformAiOperation(
    tenantId: string,
    operation: AiCreditOperation
): { canPerform: boolean; isChecking: boolean; creditCost: number } {
    const [canPerform, setCanPerform] = useState(true);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!tenantId) {
            setIsChecking(false);
            return;
        }

        const check = async () => {
            setIsChecking(true);
            const result = await canPerformOperation(tenantId, operation);
            setCanPerform(result.hasCredits);
            setIsChecking(false);
        };

        check();
    }, [tenantId, operation]);

    return {
        canPerform,
        isChecking,
        creditCost: AI_CREDIT_COSTS[operation],
    };
}

/**
 * Hook para mostrar el uso de credits en formato de barra de progreso
 */
export function useCreditsProgress(tenantId: string): {
    percentage: number;
    color: string;
    label: string;
    isLoading: boolean;
} {
    const [data, setData] = useState({
        percentage: 0,
        color: '#10b981',
        label: '0 / 0',
        isLoading: true,
    });

    useEffect(() => {
        if (!tenantId) return;

        const load = async () => {
            const usage = await getCreditsUsage(tenantId);

            if (usage) {
                const percentage = calculateCreditsUsagePercentage(
                    usage.creditsUsed,
                    usage.creditsIncluded
                );

                setData({
                    percentage,
                    color: getUsageColor(percentage),
                    label: `${usage.creditsUsed.toLocaleString()} / ${usage.creditsIncluded.toLocaleString()}`,
                    isLoading: false,
                });
            } else {
                setData({
                    percentage: 0,
                    color: '#10b981',
                    label: 'Sin datos',
                    isLoading: false,
                });
            }
        };

        load();
    }, [tenantId]);

    return data;
}

/**
 * Hook para consumir credits con confirmación
 */
export function useConsumeWithConfirmation(
    tenantId: string,
    userId: string
): {
    consume: (
        operation: AiCreditOperation,
        options?: { skipConfirmation?: boolean }
    ) => Promise<{ success: boolean; error?: string }>;
    pendingOperation: AiCreditOperation | null;
    confirm: () => Promise<void>;
    cancel: () => void;
    isConsuming: boolean;
} {
    const [pendingOperation, setPendingOperation] = useState<AiCreditOperation | null>(null);
    const [pendingOptions, setPendingOptions] = useState<any>(null);
    const [isConsuming, setIsConsuming] = useState(false);

    const consume = useCallback(async (
        operation: AiCreditOperation,
        options?: { skipConfirmation?: boolean;[key: string]: any }
    ) => {
        const { skipConfirmation, ...restOptions } = options || {};

        if (!skipConfirmation) {
            // Guardar para confirmación
            setPendingOperation(operation);
            setPendingOptions(restOptions);
            return { success: true };
        }

        // Consumir directamente
        setIsConsuming(true);
        const result = await consumeCredits(tenantId, userId, operation, restOptions);
        setIsConsuming(false);

        return result;
    }, [tenantId, userId]);

    const confirm = useCallback(async () => {
        if (!pendingOperation) return;

        setIsConsuming(true);
        await consumeCredits(tenantId, userId, pendingOperation, pendingOptions);
        setIsConsuming(false);

        setPendingOperation(null);
        setPendingOptions(null);
    }, [tenantId, userId, pendingOperation, pendingOptions]);

    const cancel = useCallback(() => {
        setPendingOperation(null);
        setPendingOptions(null);
    }, []);

    return {
        consume,
        pendingOperation,
        confirm,
        cancel,
        isConsuming,
    };
}

export default useAiCredits;






