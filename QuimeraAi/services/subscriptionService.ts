/**
 * Subscription Service
 * Servicio para gestión de planes de suscripción en Quimera AI
 */

import {
    db,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    auth,
} from '../firebase';
import { isOwner } from '../constants/roles';
import {
    SubscriptionPlanId,
    BillingCycle,
    SubscriptionStatus,
    TenantSubscription,
    SubscriptionPlan,
    SUBSCRIPTION_PLANS,
    getPlanById,
    getPlanLimits,
    getPlanFeatures,
    PlanFeatures,
    PlanLimits,
    getAnnualSavings,
    getPlanTrialDays,
    isAgencyPlan,
    getProjectCost,
    calculateAgencyTotalCost,
} from '../types/subscription';
import { initializeCreditsUsage, handlePlanChange } from './aiCreditsService';

// =============================================================================
// CONSTANTS
// =============================================================================

const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const TRIAL_DAYS = 7;  // Cambiado de 14 a 7 días de trial

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Obtiene la suscripción de un tenant
 */
export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    try {
        const subRef = doc(db, SUBSCRIPTIONS_COLLECTION, tenantId);
        const subDoc = await getDoc(subRef);

        if (!subDoc.exists()) {
            return null;
        }

        return subDoc.data() as TenantSubscription;
    } catch (error) {
        console.error('Error getting tenant subscription:', error);
        return null;
    }
}

/**
 * Crea una suscripción inicial para un tenant (Free o Trial)
 */
export async function createSubscription(
    tenantId: string,
    options?: {
        planId?: SubscriptionPlanId;
        startWithTrial?: boolean;
        stripeCustomerId?: string;
    }
): Promise<TenantSubscription> {
    const planId = options?.planId || 'free';
    const startWithTrial = options?.startWithTrial ?? false;

    const now = Timestamp.now();
    const periodEndDate = new Date(now.toDate());
    periodEndDate.setMonth(periodEndDate.getMonth() + 1);

    // Calcular fecha de fin de trial si aplica
    let trialEndDate: { seconds: number; nanoseconds: number } | undefined;
    if (startWithTrial && planId !== 'free') {
        const trialEnd = new Date(now.toDate());
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        trialEndDate = Timestamp.fromDate(trialEnd) as any;
    }

    const subscription: TenantSubscription = {
        tenantId,
        planId,
        billingCycle: 'monthly',
        status: startWithTrial ? 'trial' : 'active',
        startDate: { seconds: now.seconds, nanoseconds: now.nanoseconds },
        currentPeriodStart: { seconds: now.seconds, nanoseconds: now.nanoseconds },
        currentPeriodEnd: { seconds: Timestamp.fromDate(periodEndDate).seconds, nanoseconds: 0 },
        trialEndDate,
        cancelAtPeriodEnd: false,
        stripeCustomerId: options?.stripeCustomerId,
        addOns: [],
        creditPackagesPurchased: [],
        aiCreditsUsage: null as any, // Se inicializa después
    };

    // Guardar suscripción
    await setDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), subscription);

    // Inicializar uso de credits
    const creditsUsage = await initializeCreditsUsage(tenantId, planId);
    subscription.aiCreditsUsage = creditsUsage;

    // Actualizar con el uso de credits
    await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), {
        aiCreditsUsage: creditsUsage,
    });

    return subscription;
}

/**
 * Actualiza el plan de suscripción de un tenant
 */
export async function updateSubscriptionPlan(
    tenantId: string,
    newPlanId: SubscriptionPlanId,
    billingCycle?: BillingCycle
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentSub = await getTenantSubscription(tenantId);

        if (!currentSub) {
            return { success: false, error: 'Suscripción no encontrada' };
        }

        const oldPlanId = currentSub.planId;

        // Actualizar suscripción
        const updates: Partial<TenantSubscription> = {
            planId: newPlanId,
            status: 'active',
        };

        if (billingCycle) {
            updates.billingCycle = billingCycle;
        }

        await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), {
            ...updates,
            lastUpdated: serverTimestamp(),
        } as any);

        // Manejar cambio de credits
        await handlePlanChange(tenantId, oldPlanId, newPlanId);

        return { success: true };

    } catch (error) {
        console.error('Error updating subscription plan:', error);
        return { success: false, error: 'Error al actualizar el plan' };
    }
}

/**
 * Cancela la suscripción al final del período actual
 */
export async function cancelSubscription(
    tenantId: string,
    immediately: boolean = false
): Promise<{ success: boolean; error?: string }> {
    try {
        const updates: any = {
            cancelAtPeriodEnd: !immediately,
            lastUpdated: serverTimestamp(),
        };

        if (immediately) {
            updates.status = 'cancelled';
            updates.cancelledAt = serverTimestamp();
        }

        await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), updates);

        return { success: true };

    } catch (error) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: 'Error al cancelar la suscripción' };
    }
}

/**
 * Reactiva una suscripción cancelada
 */
export async function reactivateSubscription(
    tenantId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), {
            cancelAtPeriodEnd: false,
            status: 'active',
            cancelledAt: null,
            lastUpdated: serverTimestamp(),
        } as any);

        return { success: true };

    } catch (error) {
        console.error('Error reactivating subscription:', error);
        return { success: false, error: 'Error al reactivar la suscripción' };
    }
}

// =============================================================================
// FEATURE & LIMIT CHECKS
// =============================================================================

/**
 * Verifica si un tenant tiene acceso a una feature específica
 */
export async function hasFeature(
    tenantId: string,
    feature: keyof PlanFeatures
): Promise<boolean> {
    // SECURITY: Bypass for OWNER (Armando)
    if (isOwner(auth.currentUser?.email || '')) return true;

    try {
        const subscription = await getTenantSubscription(tenantId);

        if (!subscription) {
            // Si no hay suscripción, usar features del plan free
            return getPlanFeatures('free')[feature] as boolean;
        }

        const features = getPlanFeatures(subscription.planId);
        return Boolean(features[feature]);

    } catch (error) {
        console.error('Error checking feature:', error);
        return false;
    }
}

/**
 * Obtiene el límite de un recurso para un tenant
 */
export async function getLimit(
    tenantId: string,
    limit: keyof PlanLimits
): Promise<number> {
    try {
        const subscription = await getTenantSubscription(tenantId);

        if (!subscription) {
            return getPlanLimits('free')[limit] ?? 0;
        }

        return getPlanLimits(subscription.planId)[limit] ?? 0;

    } catch (error) {
        console.error('Error getting limit:', error);
        return 0;
    }
}

/**
 * Verifica si un tenant ha alcanzado un límite
 */
export async function hasReachedLimit(
    tenantId: string,
    limit: keyof PlanLimits,
    currentUsage: number
): Promise<boolean> {
    // SECURITY: Bypass for OWNER (Armando)
    if (isOwner(auth.currentUser?.email || '')) return false;

    const maxLimit = await getLimit(tenantId, limit);

    // -1 significa ilimitado
    if (maxLimit === -1) return false;

    return currentUsage >= maxLimit;
}

/**
 * Obtiene el plan actual y sus detalles
 */
export async function getCurrentPlan(tenantId: string): Promise<SubscriptionPlan> {
    try {
        const subscription = await getTenantSubscription(tenantId);
        const planId = subscription?.planId || 'free';
        return getPlanById(planId);
    } catch (error) {
        console.error('Error getting current plan:', error);
        return getPlanById('free');
    }
}

// =============================================================================
// TRIAL MANAGEMENT
// =============================================================================

/**
 * Inicia un período de prueba para un tenant
 */
export async function startTrial(
    tenantId: string,
    planId: SubscriptionPlanId = 'pro'
): Promise<{ success: boolean; trialEndsAt?: Date; error?: string }> {
    try {
        const existingSub = await getTenantSubscription(tenantId);

        // Verificar si ya tuvo trial
        if (existingSub?.trialEndDate) {
            return { success: false, error: 'Ya has utilizado tu período de prueba' };
        }

        const now = Timestamp.now();
        const trialEnd = new Date(now.toDate());
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

        if (existingSub) {
            // Actualizar suscripción existente
            await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), {
                planId,
                status: 'trial',
                trialEndDate: Timestamp.fromDate(trialEnd),
                lastUpdated: serverTimestamp(),
            } as any);
        } else {
            // Crear nueva suscripción con trial
            await createSubscription(tenantId, { planId, startWithTrial: true });
        }

        // Inicializar credits del plan de trial
        await initializeCreditsUsage(tenantId, planId);

        return { success: true, trialEndsAt: trialEnd };

    } catch (error) {
        console.error('Error starting trial:', error);
        return { success: false, error: 'Error al iniciar el período de prueba' };
    }
}

/**
 * Verifica si el trial ha expirado y actualiza el estado
 */
export async function checkTrialExpiration(tenantId: string): Promise<boolean> {
    try {
        const subscription = await getTenantSubscription(tenantId);

        if (!subscription || subscription.status !== 'trial') {
            return false;
        }

        if (!subscription.trialEndDate) {
            return false;
        }

        const now = Timestamp.now();
        const trialEnd = subscription.trialEndDate;

        if (now.seconds > trialEnd.seconds) {
            // Trial expirado, degradar a free
            await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, tenantId), {
                planId: 'free',
                status: 'expired',
                lastUpdated: serverTimestamp(),
            } as any);

            // Actualizar credits al plan free
            await handlePlanChange(tenantId, subscription.planId, 'free');

            return true;
        }

        return false;

    } catch (error) {
        console.error('Error checking trial expiration:', error);
        return false;
    }
}

// =============================================================================
// BILLING HELPERS
// =============================================================================

/**
 * Calcula el precio del plan según el ciclo de facturación
 */
export function calculatePlanPrice(
    planId: SubscriptionPlanId,
    billingCycle: BillingCycle
): { monthly: number; total: number; savings: number } {
    const plan = getPlanById(planId);

    if (billingCycle === 'annually') {
        return {
            monthly: plan.price.annually,
            total: plan.price.annually * 12,
            savings: getAnnualSavings(planId),
        };
    }

    return {
        monthly: plan.price.monthly,
        total: plan.price.monthly,
        savings: 0,
    };
}

/**
 * Obtiene todos los planes disponibles para mostrar
 */
export function getAvailablePlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Compara dos planes y determina si es upgrade o downgrade
 */
export function comparePlans(
    currentPlanId: SubscriptionPlanId,
    targetPlanId: SubscriptionPlanId
): 'upgrade' | 'downgrade' | 'same' {
    // Orden de planes por nivel (de menor a mayor)
    const planOrder: SubscriptionPlanId[] = [
        'free', 
        'hobby', 
        'starter', 
        'individual',      // Nuevo plan individual
        'pro', 
        'agency', 
        'agency_starter',  // Nuevos planes de agencia
        'agency_plus',
        'agency_pro', 
        'agency_scale',
        'enterprise'
    ];

    const currentIndex = planOrder.indexOf(currentPlanId);
    const targetIndex = planOrder.indexOf(targetPlanId);

    if (targetIndex > currentIndex) return 'upgrade';
    if (targetIndex < currentIndex) return 'downgrade';
    return 'same';
}

/**
 * Obtiene la feature diferenciadora entre el plan actual y el siguiente
 */
export function getUpgradeHighlight(currentPlanId: SubscriptionPlanId): string[] {
    const highlights: Record<SubscriptionPlanId, string[]> = {
        free: [
            'Todas las features incluidas',
            '7 días de prueba gratis',
            '500 AI credits/mes',
            'Dominio personalizado',
        ],
        hobby: [
            'Todas las features incluidas',
            'E-commerce y CRM completo',
            'Chatbot con IA',
            '500 AI credits/mes',
        ],
        starter: [
            'Todas las features incluidas',
            'E-commerce completo',
            'Chatbot con IA',
            '500 AI credits/mes',
        ],
        individual: [
            'Gestiona múltiples clientes',
            'Pool de créditos compartido',
            'White-label completo',
            'Factura a tus clientes',
        ],
        pro: [
            'White-label completo',
            'Múltiples sub-clientes',
            '5,000 AI credits/mes',
            'API access',
        ],
        agency: [
            'Modelo fee + proyecto',
            'Pool de créditos compartido',
            'Sin límite de proyectos',
            'Soporte prioritario',
        ],
        agency_starter: [
            'Más créditos en el pool',
            'Soporte prioritario mejorado',
            'Más usuarios permitidos',
        ],
        agency_plus: [
            'Pool de 5,000 créditos',
            'Menor fee de transacción',
            'Más recursos',
        ],
        agency_pro: [
            'Pool de 15,000 créditos',
            'Recursos ilimitados',
            'Soporte dedicado',
        ],
        agency_scale: [
            'Soporte enterprise',
            'SLA garantizado',
            'Integraciones custom',
        ],
        enterprise: [],
    };

    return highlights[currentPlanId] || [];
}






