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
    auth,
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

    // Internal flag to indicate plan is from code (not yet in Firestore)
    _fromCode?: boolean;
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
 * SECURITY: Get Firebase Auth token for authenticated Stripe API calls
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } catch (e) {
        console.warn('[plansService] Could not get auth token:', e);
    }
    return headers;
}

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

        // Start with hardcoded plans as base (ensures new plans from code are always included)
        const plans: Record<string, StoredPlan> = {};

        // Add all hardcoded plans first
        for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            plans[planId] = {
                ...plan,
                id: planId as SubscriptionPlanId,
                // Mark as not in Firestore yet
                _fromCode: true,
            } as StoredPlan;
        }

        // Override with Firestore data where it exists
        if (!plansSnapshot.empty) {
            plansSnapshot.docs.forEach((doc) => {
                const data = doc.data() as StoredPlan;
                plans[doc.id] = {
                    ...data,
                    id: doc.id as SubscriptionPlanId,
                    _fromCode: false, // This plan exists in Firestore
                };
            });
        } else {
            console.log('No plans in Firestore, using hardcoded SUBSCRIPTION_PLANS');
        }

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
 * @param forceRefresh - Force refresh from Firestore, bypassing cache
 */
export async function getActivePlans(forceRefresh = false): Promise<StoredPlan[]> {
    const allPlans = await getAllPlans(forceRefresh);
    return Object.values(allPlans).filter(plan => !plan.isArchived);
}

/**
 * Sync plan to Stripe
 * Returns Stripe IDs for product and prices
 */
async function syncPlanToStripe(plan: Partial<StoredPlan>): Promise<{
    success: boolean;
    productId?: string;
    priceIdMonthly?: string;
    priceIdAnnually?: string;
    error?: string
}> {
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

        console.log('[syncPlanToStripe] Syncing plan to Stripe:', plan.id);

        const headers = await getAuthHeaders();
        const response = await fetch(CREATE_UPDATE_PLAN_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ plan: stripePlan }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.warn('[syncPlanToStripe] Stripe sync warning:', error);
            return { success: false, error: error.message || error.error || 'Error al sincronizar con Stripe' };
        }

        const data = await response.json();
        console.log('[syncPlanToStripe] Stripe sync successful:', data);

        return {
            success: true,
            productId: data.productId,
            priceIdMonthly: data.priceIdMonthly,
            priceIdAnnually: data.priceIdAnnually,
        };

    } catch (error) {
        console.warn('[syncPlanToStripe] Stripe sync error:', error);
        // Don't fail the whole operation if Stripe sync fails
        return { success: false, error: error instanceof Error ? error.message : 'Error de conexión con Stripe' };
    }
}

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 * Only removes top-level undefined values to avoid corrupting special Firebase objects
 */
function cleanForFirestore(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
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

        // Build plan data - explicitly handle optional fields
        const planData: Record<string, any> = {
            ...plan,
            updatedAt: serverTimestamp(),
        };

        // Only add updatedBy if userId is provided
        if (userId) {
            planData.updatedBy = userId;
        }

        // Try to sync to Stripe first if enabled and plan has pricing
        let stripeError: string | undefined;
        if (syncToStripe && plan.price && (plan.price.monthly > 0 || plan.price.annually > 0)) {
            const stripeResult = await syncPlanToStripe(plan);
            if (stripeResult.success) {
                // Save all Stripe IDs returned
                if (stripeResult.productId) planData.stripeProductId = stripeResult.productId;
                if (stripeResult.priceIdMonthly) planData.stripePriceIdMonthly = stripeResult.priceIdMonthly;
                if (stripeResult.priceIdAnnually) planData.stripePriceIdAnnually = stripeResult.priceIdAnnually;
                console.log('[savePlan] Stripe sync successful, IDs saved');
            } else {
                stripeError = stripeResult.error;
                console.warn('[savePlan] Stripe sync failed:', stripeError);
            }
        }

        if (!existingPlan.exists()) {
            // Creating new plan
            planData.createdAt = serverTimestamp();
            if (userId) {
                planData.createdBy = userId;
            }
            planData.isArchived = false;
        }

        // Clean all undefined values before writing to Firestore
        const dataToSave = cleanForFirestore(planData);

        if (!existingPlan.exists()) {
            await setDoc(planRef, dataToSave);
        } else {
            await updateDoc(planRef, dataToSave);
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
                    const headers = await getAuthHeaders();
                    const response = await fetch(ARCHIVE_PLAN_URL, {
                        method: 'POST',
                        headers,
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

        const updateData: Record<string, any> = {
            isArchived: true,
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        if (userId) {
            updateData.updatedBy = userId;
        }
        await updateDoc(planRef, updateData);

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

        const updateData: Record<string, any> = {
            isArchived: false,
            archivedAt: null,
            updatedAt: serverTimestamp(),
        };
        if (userId) {
            updateData.updatedBy = userId;
        }
        await updateDoc(planRef, updateData);

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
            const planData: Record<string, any> = {
                ...plan,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isArchived: false,
            };

            // Only add createdBy if userId is provided
            if (userId) {
                planData.createdBy = userId;
            }

            // Clean undefined values before writing
            const cleanData = cleanForFirestore(planData);
            await setDoc(doc(db, PLANS_COLLECTION, planId), cleanData);
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

/**
 * Sync/Update all hardcoded plans to Firestore
 * This will CREATE new plans and UPDATE existing ones
 * Use this when you've updated SUBSCRIPTION_PLANS in code
 */
export async function syncPlansFromHardcoded(userId?: string): Promise<{ success: boolean; plansUpdated: number; plansCreated: number; error?: string }> {
    try {
        let plansUpdated = 0;
        let plansCreated = 0;

        for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            const planRef = doc(db, PLANS_COLLECTION, planId);
            const existingPlan = await getDoc(planRef);

            const planData: Record<string, any> = {
                ...plan,
                updatedAt: serverTimestamp(),
            };

            if (userId) {
                planData.updatedBy = userId;
            }

            if (!existingPlan.exists()) {
                // Create new plan
                planData.createdAt = serverTimestamp();
                planData.isArchived = false;
                if (userId) {
                    planData.createdBy = userId;
                }
                const cleanData = cleanForFirestore(planData);
                await setDoc(planRef, cleanData);
                plansCreated++;
                console.log(`[syncPlansFromHardcoded] Created plan: ${planId}`);
            } else {
                // Update existing plan - preserve certain fields
                const existingData = existingPlan.data();
                planData.createdAt = existingData.createdAt;
                planData.createdBy = existingData.createdBy;
                planData.isArchived = existingData.isArchived || false;
                planData.showInLanding = existingData.showInLanding;
                planData.landingOrder = existingData.landingOrder;
                // Preserve Stripe IDs if they exist
                if (existingData.stripeProductId) planData.stripeProductId = existingData.stripeProductId;
                if (existingData.stripePriceIdMonthly) planData.stripePriceIdMonthly = existingData.stripePriceIdMonthly;
                if (existingData.stripePriceIdAnnually) planData.stripePriceIdAnnually = existingData.stripePriceIdAnnually;

                const cleanData = cleanForFirestore(planData);
                await updateDoc(planRef, cleanData);
                plansUpdated++;
                console.log(`[syncPlansFromHardcoded] Updated plan: ${planId}`);
            }
        }

        clearPlansCache();

        console.log(`[syncPlansFromHardcoded] Sync complete: ${plansCreated} created, ${plansUpdated} updated`);
        return { success: true, plansUpdated, plansCreated };

    } catch (error) {
        console.error('[syncPlansFromHardcoded] Error:', error);
        return {
            success: false,
            plansUpdated: 0,
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
// MIGRATION TO NEW PLAN STRUCTURE (Jan 2026)
// =============================================================================

/**
 * Plans to archive (legacy plans - kept for migration of existing Firestore data)
 */
const LEGACY_PLANS_TO_ARCHIVE = ['hobby', 'starter', 'pro', 'agency', 'agency_plus'];

/**
 * Current active plans
 */
const ACTIVE_PLANS = ['free', 'individual', 'agency_starter', 'agency_pro', 'agency_scale', 'enterprise'];

/**
 * Migrate to new plan structure
 * - Archives legacy plans (hobby, starter, pro, agency, agency_plus)
 * - Creates/updates new plans (free, individual, agency_starter, agency_pro, agency_scale, enterprise)
 * - Syncs all new plans to Stripe
 */
export async function migrateToNewPlanStructure(userId?: string): Promise<{
    success: boolean;
    archived: string[];
    created: string[];
    updated: string[];
    errors: string[];
}> {
    const archived: string[] = [];
    const created: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];

    try {
        console.log('[migrateToNewPlanStructure] Starting migration...');
        console.log('[migrateToNewPlanStructure] Legacy plans to archive:', LEGACY_PLANS_TO_ARCHIVE);
        console.log('[migrateToNewPlanStructure] New plans to create/update:', ACTIVE_PLANS);
        console.log('[migrateToNewPlanStructure] SUBSCRIPTION_PLANS keys:', Object.keys(SUBSCRIPTION_PLANS));

        // Step 1: Archive legacy plans
        console.log('[migrate] Step 1: Archiving legacy plans...');
        for (const planId of LEGACY_PLANS_TO_ARCHIVE) {
            try {
                console.log(`[migrate] Checking legacy plan: ${planId}`);
                const planRef = doc(db, PLANS_COLLECTION, planId);
                const planDoc = await getDoc(planRef);

                if (planDoc.exists()) {
                    const planData = planDoc.data();
                    console.log(`[migrate] Plan ${planId} exists, isArchived: ${planData.isArchived}`);

                    // Only archive if not already archived
                    if (!planData.isArchived) {
                        // Archive in Stripe first if has product ID
                        if (planData.stripeProductId) {
                            try {
                                const headers = await getAuthHeaders();
                                const response = await fetch(ARCHIVE_PLAN_URL, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ productId: planData.stripeProductId }),
                                });
                                if (!response.ok) {
                                    console.warn(`[migrate] Warning: Could not archive ${planId} in Stripe`);
                                }
                            } catch (e) {
                                console.warn(`[migrate] Stripe archive error for ${planId}:`, e);
                            }
                        }

                        // Archive in Firestore
                        const updateData: Record<string, any> = {
                            isArchived: true,
                            archivedAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            showInLanding: false,
                        };
                        if (userId) updateData.updatedBy = userId;

                        await updateDoc(planRef, updateData);
                        archived.push(planId);
                        console.log(`[migrate] Archived plan: ${planId}`);
                    } else {
                        console.log(`[migrate] Plan ${planId} already archived, skipping`);
                    }
                }
            } catch (error) {
                const msg = `Error archiving ${planId}: ${error instanceof Error ? error.message : 'Unknown'}`;
                errors.push(msg);
                console.error(`[migrate] ${msg}`);
            }
        }

        // Step 2: Create/update new active plans from SUBSCRIPTION_PLANS
        console.log('[migrate] Step 2: Creating/updating new plans...');
        for (const planId of ACTIVE_PLANS) {
            console.log(`[migrate] Processing new plan: ${planId}`);
            const hardcodedPlan = SUBSCRIPTION_PLANS[planId as SubscriptionPlanId];
            if (!hardcodedPlan) {
                console.error(`[migrate] Plan ${planId} NOT FOUND in SUBSCRIPTION_PLANS!`);
                errors.push(`Plan ${planId} not found in SUBSCRIPTION_PLANS`);
                continue;
            }
            console.log(`[migrate] Found hardcoded plan: ${planId}, price: $${hardcodedPlan.price.monthly}/month`);

            try {
                const planRef = doc(db, PLANS_COLLECTION, planId);
                const existingPlan = await getDoc(planRef);
                console.log(`[migrate] Plan ${planId} exists in Firestore: ${existingPlan.exists()}`);

                const planData: Record<string, any> = {
                    ...hardcodedPlan,
                    id: planId,
                    isArchived: false,
                    showInLanding: true,
                    landingOrder: ACTIVE_PLANS.indexOf(planId),
                    updatedAt: serverTimestamp(),
                };

                if (userId) planData.updatedBy = userId;

                if (!existingPlan.exists()) {
                    // Create new plan
                    console.log(`[migrate] Creating NEW plan in Firestore: ${planId}`);
                    planData.createdAt = serverTimestamp();
                    if (userId) planData.createdBy = userId;

                    const cleanData = cleanForFirestore(planData);
                    console.log(`[migrate] Data to save for ${planId}:`, JSON.stringify(cleanData, null, 2));
                    await setDoc(planRef, cleanData);
                    created.push(planId);
                    console.log(`[migrate] ✅ Created plan: ${planId}`);
                } else {
                    // Update existing plan - preserve Stripe IDs
                    console.log(`[migrate] Updating EXISTING plan in Firestore: ${planId}`);
                    const existingData = existingPlan.data();
                    planData.createdAt = existingData.createdAt;
                    planData.createdBy = existingData.createdBy;
                    if (existingData.stripeProductId) planData.stripeProductId = existingData.stripeProductId;
                    if (existingData.stripePriceIdMonthly) planData.stripePriceIdMonthly = existingData.stripePriceIdMonthly;
                    if (existingData.stripePriceIdAnnually) planData.stripePriceIdAnnually = existingData.stripePriceIdAnnually;

                    const cleanData = cleanForFirestore(planData);
                    await updateDoc(planRef, cleanData);
                    updated.push(planId);
                    console.log(`[migrate] ✅ Updated plan: ${planId}`);
                }

                // Sync to Stripe for paid plans
                if (hardcodedPlan.price.monthly > 0) {
                    const stripeResult = await syncPlanToStripe({
                        ...hardcodedPlan,
                        id: planId as SubscriptionPlanId,
                        stripeProductId: planData.stripeProductId,
                        stripePriceIdMonthly: planData.stripePriceIdMonthly,
                        stripePriceIdAnnually: planData.stripePriceIdAnnually,
                    });

                    if (stripeResult.success) {
                        // Update with new Stripe IDs
                        const stripeUpdate: Record<string, any> = {};
                        if (stripeResult.productId) stripeUpdate.stripeProductId = stripeResult.productId;
                        if (stripeResult.priceIdMonthly) stripeUpdate.stripePriceIdMonthly = stripeResult.priceIdMonthly;
                        if (stripeResult.priceIdAnnually) stripeUpdate.stripePriceIdAnnually = stripeResult.priceIdAnnually;

                        if (Object.keys(stripeUpdate).length > 0) {
                            await updateDoc(planRef, stripeUpdate);
                            console.log(`[migrate] Synced ${planId} to Stripe`);
                        }
                    } else {
                        errors.push(`Stripe sync failed for ${planId}: ${stripeResult.error}`);
                    }
                }
            } catch (error) {
                const msg = `Error processing ${planId}: ${error instanceof Error ? error.message : 'Unknown'}`;
                errors.push(msg);
                console.error(`[migrate] ${msg}`);
            }
        }

        clearPlansCache();

        console.log('[migrateToNewPlanStructure] Migration complete:', {
            archived: archived.length,
            created: created.length,
            updated: updated.length,
            errors: errors.length,
        });

        return {
            success: errors.length === 0,
            archived,
            created,
            updated,
            errors,
        };

    } catch (error) {
        console.error('[migrateToNewPlanStructure] Fatal error:', error);
        return {
            success: false,
            archived,
            created,
            updated,
            errors: [...errors, error instanceof Error ? error.message : 'Error desconocido'],
        };
    }
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(): Promise<boolean> {
    try {
        const plans = await getAllPlans(true);

        // Check if new plans exist IN FIRESTORE (not just from code) and are active
        const hasNewPlansInFirestore = ACTIVE_PLANS.every(planId => {
            const plan = plans[planId];
            // Plan must exist, NOT be from code only, and NOT be archived
            return plan && !plan._fromCode && !plan.isArchived;
        });

        // Check if legacy plans are archived (or don't exist in Firestore)
        const legacyArchived = LEGACY_PLANS_TO_ARCHIVE.every(planId => {
            const plan = plans[planId];
            // Plan either doesn't exist, or is archived, or is only from code
            return !plan || plan.isArchived || plan._fromCode;
        });

        // Migration needed if new plans aren't in Firestore OR legacy plans aren't archived
        const migrationNeeded = !hasNewPlansInFirestore || !legacyArchived;

        console.log('[isMigrationNeeded] Check result:', {
            hasNewPlansInFirestore,
            legacyArchived,
            migrationNeeded,
        });

        return migrationNeeded;
    } catch (error) {
        console.error('Error checking migration status:', error);
        return true; // Assume migration needed if we can't check
    }
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
    syncPlansFromHardcoded,
    getPlanStatistics,
    getPlanDistribution,
    getDefaultLimitsForPlan,
    getDefaultFeaturesForPlan,
    createEmptyPlan,
    validatePlan,
    clearPlansCache,
    migrateToNewPlanStructure,
    isMigrationNeeded,
};

