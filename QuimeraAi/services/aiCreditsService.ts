/**
 * AI Credits Service
 * Servicio para tracking y gestión de AI credits en Quimera AI
 */

import {
    db,
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    increment,
    Timestamp,
} from '../firebase';
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

// =============================================================================
// CONSTANTS
// =============================================================================

const CREDITS_COLLECTION = 'aiCreditsTransactions';
const USAGE_COLLECTION = 'aiCreditsUsage';

// =============================================================================
// CREDIT CONSUMPTION
// =============================================================================

/**
 * Consume AI credits para una operación
 * @param tenantId - ID del tenant
 * @param userId - ID del usuario que realiza la operación
 * @param operation - Tipo de operación
 * @param options - Opciones adicionales
 * @returns Resultado de la operación
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
        customCredits?: number;       // Override del costo por defecto
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
        // Obtener el costo de la operación
        const creditsToUse = options?.customCredits ?? AI_CREDIT_COSTS[operation];

        // Verificar si hay credits disponibles
        const checkResult = await checkCreditsAvailable(tenantId, creditsToUse);

        if (!checkResult.hasCredits) {
            return {
                success: false,
                creditsUsed: 0,
                creditsRemaining: checkResult.creditsAvailable,
                error: checkResult.message || 'No hay suficientes AI credits disponibles',
            };
        }

        // Crear la transacción
        const transaction: Omit<AiCreditTransaction, 'id'> = {
            tenantId,
            userId,
            projectId: options?.projectId,
            operation,
            creditsUsed: creditsToUse,
            description: options?.description || getOperationDescription(operation),
            model: options?.model,
            tokensInput: options?.tokensInput,
            tokensOutput: options?.tokensOutput,
            timestamp: serverTimestamp() as any,
            metadata: options?.metadata,
        };

        // Guardar la transacción
        const docRef = await addDoc(collection(db, CREDITS_COLLECTION), transaction);

        // Actualizar el uso del tenant (including per-project tracking)
        await updateUsageStats(tenantId, creditsToUse, operation, options?.projectId);

        // Obtener credits restantes
        const usage = await getCreditsUsage(tenantId);

        return {
            success: true,
            creditsUsed: creditsToUse,
            creditsRemaining: usage?.creditsRemaining ?? 0,
            transactionId: docRef.id,
        };

    } catch (error) {
        console.error('Error consuming credits:', error);
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: 0,
            error: 'Error al consumir credits. Por favor intenta de nuevo.',
        };
    }
}

/**
 * Verifica si hay credits disponibles para una operación
 */
export async function checkCreditsAvailable(
    tenantId: string,
    creditsRequired: number
): Promise<CreditCheckResult> {
    try {
        const usage = await getCreditsUsage(tenantId);

        if (!usage) {
            // Si no hay registro de uso, asumir que está en período inicial
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
            // Determinar la acción sugerida
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
        console.error('Error checking credits:', error);
        // En caso de error, permitir la operación para no bloquear al usuario
        return {
            hasCredits: true,
            creditsRequired,
            creditsAvailable: 0,
            wouldExceedLimit: false,
        };
    }
}

/**
 * Pre-verifica si una operación es posible sin consumir credits
 */
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

/**
 * Obtiene el uso de credits de un tenant
 */
export async function getCreditsUsage(tenantId: string): Promise<AiCreditsUsage | null> {
    try {
        const usageRef = doc(db, USAGE_COLLECTION, tenantId);
        const usageDoc = await getDoc(usageRef);

        if (!usageDoc.exists()) {
            return null;
        }

        return usageDoc.data() as AiCreditsUsage;
    } catch (error) {
        console.error('Error getting credits usage:', error);
        return null;
    }
}

/**
 * Inicializa o resetea el uso de credits para un tenant
 */
export async function initializeCreditsUsage(
    tenantId: string,
    planId: SubscriptionPlanId
): Promise<AiCreditsUsage> {
    const plan = SUBSCRIPTION_PLANS[planId];
    const now = Timestamp.now();

    // Calcular inicio y fin del período (mensual)
    const periodStart = now;
    const periodEndDate = new Date(now.toDate());
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);
    const periodEnd = Timestamp.fromDate(periodEndDate);

    const usage: AiCreditsUsage = {
        tenantId,
        periodStart: { seconds: periodStart.seconds, nanoseconds: periodStart.nanoseconds },
        periodEnd: { seconds: periodEnd.seconds, nanoseconds: periodEnd.nanoseconds },
        creditsIncluded: plan.limits.maxAiCredits,
        creditsUsed: 0,
        creditsRemaining: plan.limits.maxAiCredits,
        creditsOverage: 0,
        usageByOperation: {} as Record<AiCreditOperation, number>,
        dailyUsage: [],
        lastUpdated: { seconds: periodStart.seconds, nanoseconds: periodStart.nanoseconds },
    };

    await setDoc(doc(db, USAGE_COLLECTION, tenantId), usage);

    return usage;
}

/**
 * Actualiza las estadísticas de uso después de consumir credits
 */
async function updateUsageStats(
    tenantId: string,
    creditsUsed: number,
    operation: AiCreditOperation,
    projectId?: string
): Promise<void> {
    try {
        const usageRef = doc(db, USAGE_COLLECTION, tenantId);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Obtener uso actual
        const usageDoc = await getDoc(usageRef);

        if (!usageDoc.exists()) {
            // Si no existe, inicializar con plan free por defecto
            await initializeCreditsUsage(tenantId, 'free');
            return updateUsageStats(tenantId, creditsUsed, operation);
        }

        const currentUsage = usageDoc.data() as AiCreditsUsage;

        // Verificar si el período ha expirado
        const now = Timestamp.now();
        if (now.seconds > currentUsage.periodEnd.seconds) {
            // Resetear para nuevo período
            // TODO: Obtener el plan actual del tenant
            await initializeCreditsUsage(tenantId, 'free');
            return updateUsageStats(tenantId, creditsUsed, operation);
        }

        // Actualizar uso por operación
        const usageByOperation = { ...currentUsage.usageByOperation };
        usageByOperation[operation] = (usageByOperation[operation] || 0) + creditsUsed;

        // Actualizar uso diario
        let dailyUsage = [...currentUsage.dailyUsage];
        const todayEntry = dailyUsage.find(d => d.date === today);

        if (todayEntry) {
            todayEntry.credits += creditsUsed;
        } else {
            dailyUsage.push({ date: today, credits: creditsUsed });
            // Mantener solo últimos 30 días
            if (dailyUsage.length > 30) {
                dailyUsage = dailyUsage.slice(-30);
            }
        }

        // Calcular nuevos totales
        const newCreditsUsed = currentUsage.creditsUsed + creditsUsed;
        const newCreditsRemaining = Math.max(0, currentUsage.creditsIncluded - newCreditsUsed);
        const newCreditsOverage = Math.max(0, newCreditsUsed - currentUsage.creditsIncluded);

        // Actualizar documento
        const updateData: Record<string, any> = {
            creditsUsed: newCreditsUsed,
            creditsRemaining: newCreditsRemaining,
            creditsOverage: newCreditsOverage,
            usageByOperation,
            dailyUsage,
            lastUpdated: serverTimestamp(),
        };

        // Track per-project credit usage
        if (projectId) {
            const currentUsageByProject = (currentUsage as any).usageByProject || {};
            const projectEntry = currentUsageByProject[projectId] || { creditsUsed: 0 };
            updateData[`usageByProject.${projectId}`] = {
                creditsUsed: (projectEntry.creditsUsed || 0) + creditsUsed,
                lastUsed: serverTimestamp(),
            };
        }

        await updateDoc(usageRef, updateData);

    } catch (error) {
        console.error('Error updating usage stats:', error);
    }
}

/**
 * Añade credits adicionales (por compra de paquete)
 */
export async function addCredits(
    tenantId: string,
    creditsToAdd: number,
    source: 'package_purchase' | 'bonus' | 'refund' | 'manual',
    metadata?: Record<string, any>
): Promise<boolean> {
    try {
        const usageRef = doc(db, USAGE_COLLECTION, tenantId);
        const usageDoc = await getDoc(usageRef);

        if (!usageDoc.exists()) {
            console.error('Usage document not found for tenant:', tenantId);
            return false;
        }

        const currentUsage = usageDoc.data() as AiCreditsUsage;

        await updateDoc(usageRef, {
            creditsIncluded: currentUsage.creditsIncluded + creditsToAdd,
            creditsRemaining: currentUsage.creditsRemaining + creditsToAdd,
            lastUpdated: serverTimestamp(),
        });

        // Registrar la adición de credits
        await addDoc(collection(db, CREDITS_COLLECTION), {
            tenantId,
            userId: 'system',
            operation: 'credit_addition' as any,
            creditsUsed: -creditsToAdd, // Negativo porque es una adición
            description: `Credits añadidos: ${source}`,
            timestamp: serverTimestamp(),
            metadata: { source, ...metadata },
        });

        return true;

    } catch (error) {
        console.error('Error adding credits:', error);
        return false;
    }
}

// =============================================================================
// TRANSACTION HISTORY
// =============================================================================

/**
 * Obtiene el historial de transacciones de un tenant
 */
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
        let q = query(
            collection(db, CREDITS_COLLECTION),
            where('tenantId', '==', tenantId),
            orderBy('timestamp', 'desc')
        );

        if (options?.operation) {
            q = query(q, where('operation', '==', options.operation));
        }

        if (options?.projectId) {
            q = query(q, where('projectId', '==', options.projectId));
        }

        if (options?.limit) {
            q = query(q, limit(options.limit));
        }

        const snapshot = await getDocs(q);
        const transactions: AiCreditTransaction[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            // Filtrar por fecha si se especificó
            if (options?.startDate || options?.endDate) {
                const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp.seconds * 1000);

                if (options.startDate && timestamp < options.startDate) return;
                if (options.endDate && timestamp > options.endDate) return;
            }

            transactions.push({
                id: doc.id,
                ...data,
            } as AiCreditTransaction);
        });

        return transactions;

    } catch (error) {
        console.error('Error getting transaction history:', error);
        return [];
    }
}

/**
 * Obtiene estadísticas de uso agrupadas por operación
 */
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
        console.error('Error getting usage by operation:', error);
        return {} as Record<AiCreditOperation, { count: number; credits: number }>;
    }
}

/**
 * Obtiene el uso diario de credits
 */
export async function getDailyUsage(
    tenantId: string,
    days: number = 30
): Promise<Array<{ date: string; credits: number }>> {
    try {
        const usage = await getCreditsUsage(tenantId);

        if (!usage?.dailyUsage) {
            return [];
        }

        // Filtrar últimos N días
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        return usage.dailyUsage.filter(d => d.date >= cutoffString);

    } catch (error) {
        console.error('Error getting daily usage:', error);
        return [];
    }
}

// =============================================================================
// PLAN UPGRADE HANDLING
// =============================================================================

/**
 * Actualiza los credits cuando cambia el plan
 */
export async function handlePlanChange(
    tenantId: string,
    oldPlanId: SubscriptionPlanId,
    newPlanId: SubscriptionPlanId
): Promise<void> {
    try {
        const oldPlan = SUBSCRIPTION_PLANS[oldPlanId];
        const newPlan = SUBSCRIPTION_PLANS[newPlanId];

        const usageRef = doc(db, USAGE_COLLECTION, tenantId);
        const usageDoc = await getDoc(usageRef);

        if (!usageDoc.exists()) {
            // Inicializar con el nuevo plan
            await initializeCreditsUsage(tenantId, newPlanId);
            return;
        }

        const currentUsage = usageDoc.data() as AiCreditsUsage;

        // Calcular la diferencia de credits
        const creditsDifference = newPlan.limits.maxAiCredits - oldPlan.limits.maxAiCredits;

        // Actualizar los credits incluidos y restantes
        const newCreditsIncluded = newPlan.limits.maxAiCredits;
        const newCreditsRemaining = Math.max(0, currentUsage.creditsRemaining + creditsDifference);

        await updateDoc(usageRef, {
            creditsIncluded: newCreditsIncluded,
            creditsRemaining: newCreditsRemaining,
            lastUpdated: serverTimestamp(),
        });

        // Registrar el cambio de plan
        await addDoc(collection(db, CREDITS_COLLECTION), {
            tenantId,
            userId: 'system',
            operation: 'plan_change' as any,
            creditsUsed: -creditsDifference,
            description: `Cambio de plan: ${oldPlanId} → ${newPlanId}`,
            timestamp: serverTimestamp(),
            metadata: { oldPlanId, newPlanId, creditsDifference },
        });

    } catch (error) {
        console.error('Error handling plan change:', error);
    }
}

/**
 * Resetea los credits al inicio de un nuevo período de facturación
 */
export async function resetCreditsForNewPeriod(
    tenantId: string,
    planId: SubscriptionPlanId
): Promise<void> {
    try {
        await initializeCreditsUsage(tenantId, planId);

        // Registrar el reset
        await addDoc(collection(db, CREDITS_COLLECTION), {
            tenantId,
            userId: 'system',
            operation: 'period_reset' as any,
            creditsUsed: 0,
            description: 'Reset de credits por nuevo período de facturación',
            timestamp: serverTimestamp(),
            metadata: { planId },
        });

    } catch (error) {
        console.error('Error resetting credits:', error);
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Obtiene la descripción legible de una operación
 */
function getOperationDescription(operation: AiCreditOperation): string {
    const descriptions: Record<AiCreditOperation, string> = {
        onboarding_complete: 'Generación completa de website',
        design_plan: 'Generación de design plan',
        content_generation: 'Generación de contenido',
        image_generation: 'Generación de imagen',
        image_generation_fast: 'Generación de imagen (rápida)',
        image_generation_ultra: 'Generación de imagen (alta resolución)',
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

/**
 * Calcula el costo estimado en USD de una cantidad de credits
 */
export function estimateCreditsCost(credits: number): number {
    // 1 credit ≈ $0.01 USD en costo real
    return credits * 0.01;
}

/**
 * Obtiene el porcentaje de uso de credits
 */
export function getCreditsUsagePercentage(usage: AiCreditsUsage): number {
    return calculateCreditsUsagePercentage(usage.creditsUsed, usage.creditsIncluded);
}

/**
 * Verifica si el tenant está cerca del límite de credits
 */
export function isNearCreditLimit(usage: AiCreditsUsage, threshold: number = 80): boolean {
    return getCreditsUsagePercentage(usage) >= threshold;
}

/**
 * Verifica si el tenant ha excedido su límite de credits
 */
export function hasExceededCreditLimit(usage: AiCreditsUsage): boolean {
    return usage.creditsOverage > 0;
}

// =============================================================================
// SHARED CREDITS POOL FOR AGENCIES (Fase 4)
// =============================================================================

/**
 * Obtiene el ID del pool de créditos que debe usar un tenant
 * - Si es sub-cliente de una agencia con pool compartido, devuelve el ID de la agencia
 * - Si no, devuelve el ID del tenant
 */
export async function getCreditsPoolTenantId(tenantId: string): Promise<{
    poolTenantId: string;
    isSharedPool: boolean;
    agencyName?: string;
}> {
    try {
        // Primero verificar si ya tenemos la info en el documento de uso
        const usageDoc = await getDoc(doc(db, USAGE_COLLECTION, tenantId));
        if (usageDoc.exists()) {
            const usageData = usageDoc.data() as AiCreditsUsage;
            if (usageData.parentTenantId) {
                // Ya tiene un pool padre configurado
                const parentDoc = await getDoc(doc(db, 'tenants', usageData.parentTenantId));
                return {
                    poolTenantId: usageData.parentTenantId,
                    isSharedPool: true,
                    agencyName: parentDoc.exists() ? parentDoc.data()?.name : undefined,
                };
            }
        }

        // Obtener el tenant para verificar si es sub-cliente
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
        if (!tenantDoc.exists()) {
            return { poolTenantId: tenantId, isSharedPool: false };
        }

        const tenantData = tenantDoc.data();
        const ownerTenantId = tenantData.ownerTenantId;

        // Si no tiene un tenant padre, usa su propio pool
        if (!ownerTenantId) {
            return { poolTenantId: tenantId, isSharedPool: false };
        }

        // Verificar si el tenant padre tiene un plan con pool compartido
        const parentDoc = await getDoc(doc(db, 'tenants', ownerTenantId));
        if (!parentDoc.exists()) {
            return { poolTenantId: tenantId, isSharedPool: false };
        }

        const parentData = parentDoc.data();
        const parentPlan = parentData.subscriptionPlan;

        // Planes de agencia con pool compartido
        const plansWithSharedPool = ['agency_starter', 'agency_pro', 'agency_scale'];

        if (plansWithSharedPool.includes(parentPlan)) {
            return {
                poolTenantId: ownerTenantId,
                isSharedPool: true,
                agencyName: parentData.name,
            };
        }

        return { poolTenantId: tenantId, isSharedPool: false };
    } catch (error) {
        console.error('Error getting credits pool tenant ID:', error);
        return { poolTenantId: tenantId, isSharedPool: false };
    }
}

/**
 * Consume créditos del pool compartido de agencia
 * Registra el uso tanto en el pool como en el desglose por sub-cliente
 */
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

        // Verificar créditos disponibles en el pool de la agencia
        const checkResult = await checkCreditsAvailable(agencyTenantId, creditsToUse);

        if (!checkResult.hasCredits) {
            return {
                success: false,
                creditsUsed: 0,
                creditsRemaining: checkResult.creditsAvailable,
                error: checkResult.message || 'El pool compartido de la agencia no tiene suficientes créditos',
            };
        }

        // Crear la transacción (con referencia al sub-cliente)
        const transaction: Omit<AiCreditTransaction, 'id'> = {
            tenantId: agencyTenantId, // Pool de la agencia
            userId,
            projectId: options?.projectId,
            operation,
            creditsUsed: creditsToUse,
            description: options?.description || getOperationDescription(operation),
            model: options?.model,
            tokensInput: options?.tokensInput,
            tokensOutput: options?.tokensOutput,
            timestamp: serverTimestamp() as any,
            metadata: {
                ...options?.metadata,
                subClientTenantId, // Registrar qué sub-cliente usó los créditos
            },
        };

        const docRef = await addDoc(collection(db, CREDITS_COLLECTION), transaction);

        // Actualizar el uso del pool de la agencia
        await updateUsageStats(agencyTenantId, creditsToUse, operation);

        // Actualizar el desglose por sub-cliente en el pool
        await updateSubClientUsageInPool(agencyTenantId, subClientTenantId, creditsToUse);

        // Obtener créditos restantes del pool
        const usage = await getCreditsUsage(agencyTenantId);

        return {
            success: true,
            creditsUsed: creditsToUse,
            creditsRemaining: usage?.creditsRemaining ?? 0,
            transactionId: docRef.id,
        };
    } catch (error) {
        console.error('Error consuming credits from shared pool:', error);
        return {
            success: false,
            creditsUsed: 0,
            creditsRemaining: 0,
            error: 'Error al consumir créditos del pool compartido',
        };
    }
}

/**
 * Actualiza el desglose de uso por sub-cliente en el pool de la agencia
 */
async function updateSubClientUsageInPool(
    agencyTenantId: string,
    subClientTenantId: string,
    creditsUsed: number
): Promise<void> {
    try {
        const usageRef = doc(db, USAGE_COLLECTION, agencyTenantId);
        const usageDoc = await getDoc(usageRef);

        if (!usageDoc.exists()) return;

        const currentUsage = usageDoc.data() as AiCreditsUsage;

        // Obtener nombre del sub-cliente
        const subClientDoc = await getDoc(doc(db, 'tenants', subClientTenantId));
        const subClientName = subClientDoc.exists() ? subClientDoc.data()?.name : 'Unknown';

        // Actualizar o crear entrada del sub-cliente
        const subClientsUsage = currentUsage.subClientsUsage || {};
        const now = Timestamp.now();

        if (subClientsUsage[subClientTenantId]) {
            subClientsUsage[subClientTenantId].creditsUsed += creditsUsed;
            subClientsUsage[subClientTenantId].lastUpdated = {
                seconds: now.seconds,
                nanoseconds: now.nanoseconds,
            };
        } else {
            subClientsUsage[subClientTenantId] = {
                tenantName: subClientName,
                creditsUsed,
                lastUpdated: {
                    seconds: now.seconds,
                    nanoseconds: now.nanoseconds,
                },
            };
        }

        await updateDoc(usageRef, {
            isAgencyPool: true,
            subClientsUsage,
            lastUpdated: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating sub-client usage in pool:', error);
    }
}

/**
 * Consume créditos con detección automática de pool compartido
 * Esta es la función principal que debe usarse para consumir créditos
 */
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
    // Detectar si debe usar pool compartido
    const poolInfo = await getCreditsPoolTenantId(tenantId);

    if (poolInfo.isSharedPool) {
        // Consumir del pool de la agencia
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

    // Consumir de su propio pool
    const result = await consumeCredits(tenantId, userId, operation, options);
    return {
        ...result,
        usedSharedPool: false,
    };
}

/**
 * Inicializa el documento de uso para un sub-cliente que usa pool compartido
 * NO crea un pool propio, solo registra la referencia al pool padre
 */
export async function initializeSubClientForSharedPool(
    subClientTenantId: string,
    agencyTenantId: string
): Promise<void> {
    try {
        const usageRef = doc(db, USAGE_COLLECTION, subClientTenantId);
        const now = Timestamp.now();

        // Crear documento mínimo que apunta al pool padre
        await setDoc(usageRef, {
            tenantId: subClientTenantId,
            parentTenantId: agencyTenantId,
            periodStart: { seconds: now.seconds, nanoseconds: now.nanoseconds },
            periodEnd: { seconds: now.seconds + (30 * 24 * 60 * 60), nanoseconds: 0 }, // +30 días
            creditsIncluded: 0, // No tiene créditos propios
            creditsUsed: 0,
            creditsRemaining: 0,
            creditsOverage: 0,
            usageByOperation: {},
            dailyUsage: [],
            lastUpdated: { seconds: now.seconds, nanoseconds: now.nanoseconds },
        });

        console.log(`[SharedPool] Sub-client ${subClientTenantId} initialized to use pool from ${agencyTenantId}`);
    } catch (error) {
        console.error('Error initializing sub-client for shared pool:', error);
    }
}

/**
 * Obtiene el uso de créditos del pool correcto (propio o de agencia)
 */
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

/**
 * Obtiene el desglose de uso por sub-cliente para una agencia
 */
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

        // Ordenar por uso descendente
        subClients.sort((a, b) => b.creditsUsed - a.creditsUsed);

        return {
            totalCredits: usage.creditsIncluded,
            usedCredits: usage.creditsUsed,
            remainingCredits: usage.creditsRemaining,
            subClients,
        };
    } catch (error) {
        console.error('Error getting agency pool breakdown:', error);
        return {
            totalCredits: 0,
            usedCredits: 0,
            remainingCredits: 0,
            subClients: [],
        };
    }
}







