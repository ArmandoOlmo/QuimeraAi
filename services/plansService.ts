/**
 * Plans Service - Unified Plan Management
 * Servicio unificado para gestionar planes de suscripción en Firestore
 */

import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
} from '../firebase';
import {
    SubscriptionPlan,
    SubscriptionPlanId,
    PlanLimits,
    PlanFeatures,
    SUBSCRIPTION_PLANS,
} from '../types/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface StoredPlan extends SubscriptionPlan {
    // Firestore metadata
    createdAt?: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };
    createdBy?: string;
    updatedBy?: string;
    
    // Additional fields for management
    isArchived?: boolean;
    archivedAt?: { seconds: number; nanoseconds: number };
    
    // Landing Page visibility
    showInLanding?: boolean;  // Control if this plan appears in the public landing page
    landingOrder?: number;    // Order of appearance in landing page (lower = first)
    
    // Statistics (computed)
    activeSubscribers?: number;
    totalRevenue?: number;
}

export interface PlanStats {
    planId: string;
    activeSubscribers: number;
    totalRevenue: number;
    mrr: number;
    churnRate: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PLANS_COLLECTION = 'subscriptionPlans';
const PLAN_STATS_COLLECTION = 'planStats';

// Stripe Cloud Functions URLs
const STRIPE_API_BASE = 'https://us-central1-quimeraai.cloudfunctions.net';
const CREATE_UPDATE_PLAN_URL = `${STRIPE_API_BASE}/createOrUpdatePlan`;
const ARCHIVE_PLAN_URL = `${STRIPE_API_BASE}/archivePlan`;

// =============================================================================
// CACHE
// =============================================================================

let plansCache: Record<string, StoredPlan> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the plans cache
 */
export function clearPlansCache(): void {
    plansCache = null;
    cacheTimestamp = 0;
}

// =============================================================================
// PLAN CRUD OPERATIONS
// =============================================================================

/**
 * Get all plans from Firestore
 * Falls back to hardcoded SUBSCRIPTION_PLANS if Firestore is empty
 */
export async function getAllPlans(forceRefresh = false): Promise<Record<string, StoredPlan>> {
    // Check cache
    if (!forceRefresh && plansCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return plansCache;
    }
    
    try {
        const plansSnapshot = await getDocs(
            query(collection(db, PLANS_COLLECTION), orderBy('price.monthly', 'asc'))
        );
        
        if (plansSnapshot.empty) {
            // No plans in Firestore, return hardcoded plans
            console.log('No plans in Firestore, using hardcoded SUBSCRIPTION_PLANS');
            plansCache = { ...SUBSCRIPTION_PLANS } as Record<string, StoredPlan>;
            cacheTimestamp = Date.now();
            return plansCache;
        }
        
        const plans: Record<string, StoredPlan> = {};
        plansSnapshot.docs.forEach((doc) => {
            const data = doc.data() as StoredPlan;
            plans[doc.id] = { ...data, id: doc.id as SubscriptionPlanId };
        });
        
        plansCache = plans;
        cacheTimestamp = Date.now();
        return plans;
        
    } catch (error) {
        console.error('Error fetching plans from Firestore:', error);
        // Fallback to hardcoded plans
        return { ...SUBSCRIPTION_PLANS } as Record<string, StoredPlan>;
    }
}

/**
 * Get a single plan by ID
 */
export async function getPlanById(planId: string): Promise<StoredPlan | null> {
    try {
        // First check cache
        if (plansCache && plansCache[planId]) {
            return plansCache[planId];
        }
        
        const planDoc = await getDoc(doc(db, PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            // Try hardcoded plans
            if (SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]) {
                return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] as StoredPlan;
            }
            return null;
        }
        
        return { ...planDoc.data(), id: planDoc.id as SubscriptionPlanId } as StoredPlan;
        
    } catch (error) {
        console.error(`Error fetching plan ${planId}:`, error);
        // Try hardcoded
        if (SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]) {
            return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] as StoredPlan;
        }
        return null;
    }
}

/**
 * Get active (non-archived) plans
 */
export async function getActivePlans(): Promise<StoredPlan[]> {
    const allPlans = await getAllPlans();
    return Object.values(allPlans).filter(plan => !plan.isArchived);
}

/**
 * Sync plan to Stripe
 */
async function syncPlanToStripe(plan: Partial<StoredPlan>): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
        // Convert plan features to array of strings for Stripe
        const featureStrings: string[] = [];
        if (plan.features) {
            if (plan.features.aiWebBuilder) featureStrings.push('AI Website Builder');
            if (plan.features.cmsEnabled) featureStrings.push('CMS');
            if (plan.features.crmEnabled) featureStrings.push('CRM');
            if (plan.features.ecommerceEnabled) featureStrings.push('E-Commerce');
            if (plan.features.chatbotEnabled) featureStrings.push('AI Chatbot');
            if (plan.features.emailMarketing) featureStrings.push('Email Marketing');
            if (plan.features.customDomains) featureStrings.push('Custom Domains');
            if (plan.features.whiteLabel) featureStrings.push('White-Label');
            if (plan.features.apiAccess) featureStrings.push('API Access');
            if (plan.limits?.maxAiCredits) featureStrings.push(`${plan.limits.maxAiCredits} AI Credits/mes`);
        }
        
        const stripePlan = {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            features: featureStrings,
            isFeatured: plan.isFeatured || false,
            isArchived: plan.isArchived || false,
            stripeProductId: plan.stripeProductId,
            stripePriceIdMonthly: plan.stripePriceIdMonthly,
            stripePriceIdAnnually: plan.stripePriceIdAnnually,
        };
        
        const response = await fetch(CREATE_UPDATE_PLAN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: stripePlan }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.warn('Stripe sync warning:', error);
            return { success: false, error: error.message || 'Error al sincronizar con Stripe' };
        }
        
        const data = await response.json();
        return { success: true, productId: data.productId };
        
    } catch (error) {
        console.warn('Stripe sync error:', error);
        // Don't fail the whole operation if Stripe sync fails
        return { success: false, error: error instanceof Error ? error.message : 'Error de conexión con Stripe' };
    }
}

/**
 * Create or update a plan in Firestore (and optionally sync to Stripe)
 */
export async function savePlan(
    plan: Partial<StoredPlan> & { id: string },
    userId?: string,
    syncToStripe = true
): Promise<{ success: boolean; error?: string; stripeError?: string }> {
    try {
        const planRef = doc(db, PLANS_COLLECTION, plan.id);
        const existingPlan = await getDoc(planRef);
        
        const planData: Partial<StoredPlan> = {
            ...plan,
            updatedAt: serverTimestamp() as any,
            updatedBy: userId,
        };
        
        // Try to sync to Stripe first if enabled and plan has pricing
        let stripeError: string | undefined;
        if (syncToStripe && plan.price && (plan.price.monthly > 0 || plan.price.annually > 0)) {
            const stripeResult = await syncPlanToStripe(plan);
            if (stripeResult.success && stripeResult.productId) {
                planData.stripeProductId = stripeResult.productId;
            } else {
                stripeError = stripeResult.error;
            }
        }
        
        if (!existingPlan.exists()) {
            // Creating new plan
            planData.createdAt = serverTimestamp() as any;
            planData.createdBy = userId;
            planData.isArchived = false;
            await setDoc(planRef, planData);
        } else {
            // Updating existing plan
            await updateDoc(planRef, planData);
        }
        
        // Clear cache
        clearPlansCache();
        
        return { success: true, stripeError };
        
    } catch (error) {
        console.error('Error saving plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        };
    }
}

/**
 * Archive a plan (soft delete) - also archives in Stripe if synced
 */
export async function archivePlan(planId: string, userId?: string, syncToStripe = true): Promise<{ success: boolean; error?: string; stripeError?: string }> {
    try {
        const planRef = doc(db, PLANS_COLLECTION, planId);
        const planDoc = await getDoc(planRef);
        
        // Try to archive in Stripe first
        let stripeError: string | undefined;
        if (syncToStripe && planDoc.exists()) {
            const plan = planDoc.data() as StoredPlan;
            if (plan.stripeProductId) {
                try {
                    const response = await fetch(ARCHIVE_PLAN_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: plan.stripeProductId }),
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        stripeError = error.message || 'Error al archivar en Stripe';
                    }
                } catch (error) {
                    stripeError = error instanceof Error ? error.message : 'Error de conexión con Stripe';
                }
            }
        }
        
        await updateDoc(planRef, {
            isArchived: true,
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: userId,
        });
        
        clearPlansCache();
        
        return { success: true, stripeError };
        
    } catch (error) {
        console.error('Error archiving plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        };
    }
}

/**
 * Restore an archived plan
 */
export async function restorePlan(planId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const planRef = doc(db, PLANS_COLLECTION, planId);
        
        await updateDoc(planRef, {
            isArchived: false,
            archivedAt: null,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
        });
        
        clearPlansCache();
        
        return { success: true };
        
    } catch (error) {
        console.error('Error restoring plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        };
    }
}

/**
 * Delete a plan permanently (use with caution)
 */
export async function deletePlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, PLANS_COLLECTION, planId));
        clearPlansCache();
        return { success: true };
        
    } catch (error) {
        console.error('Error deleting plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        };
    }
}

// =============================================================================
// PLAN INITIALIZATION
// =============================================================================

/**
 * Initialize Firestore with hardcoded plans if empty
 * Call this once to seed the database
 */
export async function initializePlansInFirestore(userId?: string): Promise<{ success: boolean; plansCreated: number; error?: string }> {
    try {
        const existingPlans = await getDocs(collection(db, PLANS_COLLECTION));
        
        if (!existingPlans.empty) {
            console.log('Plans already exist in Firestore, skipping initialization');
            return { success: true, plansCreated: 0 };
        }
        
        let plansCreated = 0;
        
        for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            const planData: StoredPlan = {
                ...plan,
                createdAt: serverTimestamp() as any,
                updatedAt: serverTimestamp() as any,
                createdBy: userId,
                isArchived: false,
            };
            
            await setDoc(doc(db, PLANS_COLLECTION, planId), planData);
            plansCreated++;
        }
        
        clearPlansCache();
        
        console.log(`Initialized ${plansCreated} plans in Firestore`);
        return { success: true, plansCreated };
        
    } catch (error) {
        console.error('Error initializing plans:', error);
        return { 
            success: false, 
            plansCreated: 0,
            error: error instanceof Error ? error.message : 'Error desconocido' 
        };
    }
}

// =============================================================================
// PLAN STATISTICS
// =============================================================================

/**
 * Get statistics for all plans
 */
export async function getPlanStatistics(): Promise<Record<string, PlanStats>> {
    try {
        // Get subscriber counts from tenants collection
        const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
        
        const stats: Record<string, PlanStats> = {};
        const plans = await getAllPlans();
        
        // Initialize stats for all plans
        for (const planId of Object.keys(plans)) {
            stats[planId] = {
                planId,
                activeSubscribers: 0,
                totalRevenue: 0,
                mrr: 0,
                churnRate: 0,
            };
        }
        
        // Count subscribers per plan
        tenantsSnapshot.docs.forEach((doc) => {
            const tenant = doc.data();
            const planId = tenant.subscriptionPlan || 'free';
            
            if (stats[planId]) {
                stats[planId].activeSubscribers++;
                
                // Calculate MRR
                const plan = plans[planId];
                if (plan) {
                    stats[planId].mrr += plan.price.monthly;
                }
            }
        });
        
        return stats;
        
    } catch (error) {
        console.error('Error fetching plan statistics:', error);
        return {};
    }
}

/**
 * Get distribution data for charts
 */
export async function getPlanDistribution(): Promise<Array<{ planId: string; planName: string; subscribers: number; color: string; percentage: number }>> {
    const stats = await getPlanStatistics();
    const plans = await getAllPlans();
    
    const totalSubscribers = Object.values(stats).reduce((sum, s) => sum + s.activeSubscribers, 0);
    
    return Object.entries(stats)
        .map(([planId, stat]) => ({
            planId,
            planName: plans[planId]?.name || planId,
            subscribers: stat.activeSubscribers,
            color: plans[planId]?.color || '#6b7280',
            percentage: totalSubscribers > 0 ? (stat.activeSubscribers / totalSubscribers) * 100 : 0,
        }))
        .sort((a, b) => {
            // Sort by plan order: free, starter, pro, agency, enterprise
            const order = ['free', 'starter', 'pro', 'agency', 'enterprise'];
            return order.indexOf(a.planId) - order.indexOf(b.planId);
        });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get default limits for a plan ID
 */
export function getDefaultLimitsForPlan(planId: SubscriptionPlanId): PlanLimits {
    return SUBSCRIPTION_PLANS[planId]?.limits || SUBSCRIPTION_PLANS.free.limits;
}

/**
 * Get default features for a plan ID
 */
export function getDefaultFeaturesForPlan(planId: SubscriptionPlanId): PlanFeatures {
    return SUBSCRIPTION_PLANS[planId]?.features || SUBSCRIPTION_PLANS.free.features;
}

/**
 * Create a new empty plan template
 */
export function createEmptyPlan(): Partial<StoredPlan> {
    return {
        name: '',
        description: '',
        price: { monthly: 0, annually: 0 },
        limits: { ...SUBSCRIPTION_PLANS.free.limits },
        features: { ...SUBSCRIPTION_PLANS.free.features },
        isFeatured: false,
        isPopular: false,
        color: '#6b7280',
        icon: 'Sparkles',
        showInLanding: false,
        landingOrder: 99,
    };
}

/**
 * Validate a plan before saving
 */
export function validatePlan(plan: Partial<StoredPlan>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!plan.id) errors.push('El ID del plan es requerido');
    if (!plan.name?.trim()) errors.push('El nombre del plan es requerido');
    if (!plan.description?.trim()) errors.push('La descripción es requerida');
    if (plan.price?.monthly === undefined || plan.price.monthly < 0) {
        errors.push('El precio mensual debe ser >= 0');
    }
    if (plan.price?.annually === undefined || plan.price.annually < 0) {
        errors.push('El precio anual debe ser >= 0');
    }
    if (plan.limits?.maxAiCredits === undefined || plan.limits.maxAiCredits < 0) {
        errors.push('Los AI credits deben ser >= 0');
    }
    
    return { valid: errors.length === 0, errors };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    getAllPlans,
    getPlanById,
    getActivePlans,
    savePlan,
    archivePlan,
    restorePlan,
    deletePlan,
    initializePlansInFirestore,
    getPlanStatistics,
    getPlanDistribution,
    getDefaultLimitsForPlan,
    getDefaultFeaturesForPlan,
    createEmptyPlan,
    validatePlan,
    clearPlansCache,
};

