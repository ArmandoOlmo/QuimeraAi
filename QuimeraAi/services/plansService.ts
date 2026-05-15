/**
 * Plans Service - Unified Plan Management
 * Servicio unificado para gestionar planes de suscripción en Supabase
 */

import { supabase } from '../supabase';
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
    // Metadata
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;

    // Additional fields for management
    isArchived?: boolean;
    archivedAt?: string;

    // Landing Page visibility
    showInLanding?: boolean;
    landingOrder?: number;

    // Statistics (computed)
    activeSubscribers?: number;
    totalRevenue?: number;

    // Internal flag to indicate plan is from code (not yet in DB)
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

const PLANS_TABLE = 'subscription_plans';

// Stripe API routes are hosted on Vercel.
const STRIPE_API_BASE = '/api/stripe';
const CREATE_UPDATE_PLAN_URL = `${STRIPE_API_BASE}/createOrUpdatePlan`;
const ARCHIVE_PLAN_URL = `${STRIPE_API_BASE}/archivePlan`;

// =============================================================================
// CACHE
// =============================================================================

let plansCache: Record<string, StoredPlan> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * SECURITY: Get auth token for authenticated Stripe API calls
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
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
 * Convert a Supabase row to a StoredPlan object
 */
function rowToPlan(row: any): StoredPlan {
    return {
        id: row.id as SubscriptionPlanId,
        name: row.name || '',
        description: row.description || '',
        price: { monthly: Number(row.price_monthly) || 0, annually: Number(row.price_annually) || 0 },
        stripeProductId: row.stripe_product_id || undefined,
        stripePriceIdMonthly: row.stripe_price_id_monthly || undefined,
        stripePriceIdAnnually: row.stripe_price_id_annually || undefined,
        color: row.color || '#6b7280',
        icon: row.icon || 'Sparkles',
        isFeatured: row.is_featured || false,
        isPopular: row.is_popular || false,
        showInLanding: row.show_in_landing || false,
        landingOrder: row.landing_order ?? 99,
        limits: row.limits || {},
        features: row.features || {},
        isArchived: row.is_archived || false,
        archivedAt: row.archived_at || undefined,
        createdBy: row.created_by || undefined,
        updatedBy: row.updated_by || undefined,
        createdAt: row.created_at || undefined,
        updatedAt: row.updated_at || undefined,
        _fromCode: false,
    } as StoredPlan;
}

/**
 * Convert a StoredPlan to a Supabase row
 */
function planToRow(plan: Partial<StoredPlan> & { id: string }): Record<string, any> {
    const row: Record<string, any> = { id: plan.id };
    if (plan.name !== undefined) row.name = plan.name;
    if (plan.description !== undefined) row.description = plan.description;
    if (plan.price) { row.price_monthly = plan.price.monthly; row.price_annually = plan.price.annually; }
    if (plan.stripeProductId !== undefined) row.stripe_product_id = plan.stripeProductId;
    if (plan.stripePriceIdMonthly !== undefined) row.stripe_price_id_monthly = plan.stripePriceIdMonthly;
    if (plan.stripePriceIdAnnually !== undefined) row.stripe_price_id_annually = plan.stripePriceIdAnnually;
    if (plan.color !== undefined) row.color = plan.color;
    if (plan.icon !== undefined) row.icon = plan.icon;
    if (plan.isFeatured !== undefined) row.is_featured = plan.isFeatured;
    if (plan.isPopular !== undefined) row.is_popular = plan.isPopular;
    if (plan.showInLanding !== undefined) row.show_in_landing = plan.showInLanding;
    if (plan.landingOrder !== undefined) row.landing_order = plan.landingOrder;
    if (plan.limits !== undefined) row.limits = plan.limits;
    if (plan.features !== undefined) row.features = plan.features;
    if (plan.isArchived !== undefined) row.is_archived = plan.isArchived;
    if (plan.createdBy !== undefined) row.created_by = plan.createdBy;
    if (plan.updatedBy !== undefined) row.updated_by = plan.updatedBy;
    return row;
}

/**
 * Get all plans from Supabase
 * Falls back to hardcoded SUBSCRIPTION_PLANS if Supabase is empty
 */
export async function getAllPlans(forceRefresh = false): Promise<Record<string, StoredPlan>> {
    if (!forceRefresh && plansCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return plansCache;
    }

    try {
        const { data: rows, error } = await supabase
            .from(PLANS_TABLE)
            .select('*')
            .order('price_monthly', { ascending: true });

        if (error) throw error;

        const plans: Record<string, StoredPlan> = {};

        // Add all hardcoded plans first
        for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            plans[planId] = { ...plan, id: planId as SubscriptionPlanId, _fromCode: true } as StoredPlan;
        }

        // Override with DB data where it exists
        if (rows && rows.length > 0) {
            rows.forEach((row) => {
                plans[row.id] = rowToPlan(row);
            });
        } else {
            console.log('No plans in Supabase, using hardcoded SUBSCRIPTION_PLANS');
        }

        plansCache = plans;
        cacheTimestamp = Date.now();
        return plans;

    } catch (error) {
        console.error('Error fetching plans from Supabase:', error);
        return { ...SUBSCRIPTION_PLANS } as Record<string, StoredPlan>;
    }
}

export async function getPlanById(planId: string): Promise<StoredPlan | null> {
    try {
        if (plansCache && plansCache[planId]) return plansCache[planId];

        const { data: row, error } = await supabase
            .from(PLANS_TABLE)
            .select('*')
            .eq('id', planId)
            .maybeSingle();

        if (error) throw error;
        if (!row) {
            if (SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]) {
                return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] as StoredPlan;
            }
            return null;
        }
        return rowToPlan(row);
    } catch (error) {
        console.error(`Error fetching plan ${planId}:`, error);
        if (SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]) {
            return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId] as StoredPlan;
        }
        return null;
    }
}

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

/** Remove undefined values from an object */
function cleanData(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) result[key] = obj[key];
    }
    return result;
}

/**
 * Create or update a plan in Supabase (and optionally sync to Stripe)
 */
export async function savePlan(
    plan: Partial<StoredPlan> & { id: string },
    userId?: string,
    syncToStripe = true
): Promise<{ success: boolean; error?: string; stripeError?: string }> {
    try {
        // Try to sync to Stripe first if enabled and plan has pricing
        let stripeError: string | undefined;
        if (syncToStripe && plan.price && (plan.price.monthly > 0 || plan.price.annually > 0)) {
            const stripeResult = await syncPlanToStripe(plan);
            if (stripeResult.success) {
                if (stripeResult.productId) plan.stripeProductId = stripeResult.productId;
                if (stripeResult.priceIdMonthly) plan.stripePriceIdMonthly = stripeResult.priceIdMonthly;
                if (stripeResult.priceIdAnnually) plan.stripePriceIdAnnually = stripeResult.priceIdAnnually;
                console.log('[savePlan] Stripe sync successful, IDs saved');
            } else {
                stripeError = stripeResult.error;
                console.warn('[savePlan] Stripe sync failed:', stripeError);
            }
        }

        const row = cleanData({
            ...planToRow(plan),
            updated_at: new Date().toISOString(),
            updated_by: userId || undefined,
        });

        const { error } = await supabase
            .from(PLANS_TABLE)
            .upsert(row, { onConflict: 'id' });

        if (error) throw error;
        clearPlansCache();
        return { success: true, stripeError };

    } catch (error) {
        console.error('Error saving plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Archive a plan (soft delete) - also archives in Stripe if synced
 */
export async function archivePlan(planId: string, userId?: string, syncToStripe = true): Promise<{ success: boolean; error?: string; stripeError?: string }> {
    try {
        let stripeError: string | undefined;
        if (syncToStripe) {
            const plan = await getPlanById(planId);
            if (plan?.stripeProductId) {
                try {
                    const headers = await getAuthHeaders();
                    const response = await fetch(ARCHIVE_PLAN_URL, {
                        method: 'POST', headers,
                        body: JSON.stringify({ productId: plan.stripeProductId }),
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        stripeError = err.message || 'Error al archivar en Stripe';
                    }
                } catch (e) {
                    stripeError = e instanceof Error ? e.message : 'Error de conexión con Stripe';
                }
            }
        }

        const { error } = await supabase
            .from(PLANS_TABLE)
            .update({
                is_archived: true,
                archived_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                updated_by: userId || null,
            })
            .eq('id', planId);

        if (error) throw error;
        clearPlansCache();
        return { success: true, stripeError };

    } catch (error) {
        console.error('Error archiving plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Restore an archived plan
 */
export async function restorePlan(planId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(PLANS_TABLE)
            .update({
                is_archived: false,
                archived_at: null,
                updated_at: new Date().toISOString(),
                updated_by: userId || null,
            })
            .eq('id', planId);

        if (error) throw error;
        clearPlansCache();
        return { success: true };

    } catch (error) {
        console.error('Error restoring plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Delete a plan permanently (use with caution)
 */
export async function deletePlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from(PLANS_TABLE)
            .delete()
            .eq('id', planId);

        if (error) throw error;
        clearPlansCache();
        return { success: true };

    } catch (error) {
        console.error('Error deleting plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
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
        const { data: existing } = await supabase.from(PLANS_TABLE).select('id');
        if (existing && existing.length > 0) {
            console.log('Plans already exist in Supabase, skipping initialization');
            return { success: true, plansCreated: 0 };
        }

        const rows = Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => ({
            ...planToRow({ ...plan, id: planId } as StoredPlan & { id: string }),
            is_archived: false,
            created_by: userId || null,
            updated_by: userId || null,
        }));

        const { error } = await supabase.from(PLANS_TABLE).insert(rows);
        if (error) throw error;

        clearPlansCache();
        console.log(`Initialized ${rows.length} plans in Supabase`);
        return { success: true, plansCreated: rows.length };

    } catch (error) {
        console.error('Error initializing plans:', error);
        return { success: false, plansCreated: 0, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Sync/Update all hardcoded plans to Supabase
 */
export async function syncPlansFromHardcoded(userId?: string): Promise<{ success: boolean; plansUpdated: number; plansCreated: number; error?: string }> {
    try {
        const rows = Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => ({
            ...planToRow({ ...plan, id: planId } as StoredPlan & { id: string }),
            updated_at: new Date().toISOString(),
            updated_by: userId || null,
        }));

        const { error } = await supabase.from(PLANS_TABLE).upsert(rows, { onConflict: 'id' });
        if (error) throw error;

        clearPlansCache();
        console.log(`[syncPlansFromHardcoded] Sync complete: ${rows.length} plans upserted`);
        return { success: true, plansUpdated: rows.length, plansCreated: 0 };

    } catch (error) {
        console.error('[syncPlansFromHardcoded] Error:', error);
        return { success: false, plansUpdated: 0, plansCreated: 0, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

// =============================================================================
// PLAN STATISTICS
// =============================================================================

export async function getPlanStatistics(): Promise<Record<string, PlanStats>> {
    try {
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('subscription_plan');

        if (error) throw error;

        const stats: Record<string, PlanStats> = {};
        const plans = await getAllPlans();

        for (const planId of Object.keys(plans)) {
            stats[planId] = { planId, activeSubscribers: 0, totalRevenue: 0, mrr: 0, churnRate: 0 };
        }

        (tenants ?? []).forEach((tenant) => {
            const planId = tenant.subscription_plan || 'free';
            if (stats[planId]) {
                stats[planId].activeSubscribers++;
                const plan = plans[planId];
                if (plan) stats[planId].mrr += plan.price.monthly;
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
    success: boolean; archived: string[]; created: string[]; updated: string[]; errors: string[];
}> {
    const archived: string[] = [];
    const created: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];

    try {
        console.log('[migrateToNewPlanStructure] Starting migration...');

        // Step 1: Archive legacy plans
        for (const planId of LEGACY_PLANS_TO_ARCHIVE) {
            try {
                const plan = await getPlanById(planId);
                if (plan && !plan.isArchived) {
                    if (plan.stripeProductId) {
                        try {
                            const headers = await getAuthHeaders();
                            await fetch(ARCHIVE_PLAN_URL, {
                                method: 'POST', headers,
                                body: JSON.stringify({ productId: plan.stripeProductId }),
                            });
                        } catch (e) { console.warn(`[migrate] Stripe archive error for ${planId}:`, e); }
                    }

                    const { error } = await supabase.from(PLANS_TABLE).update({
                        is_archived: true, archived_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(), show_in_landing: false,
                        updated_by: userId || null,
                    }).eq('id', planId);

                    if (!error) { archived.push(planId); }
                    else { errors.push(`Error archiving ${planId}: ${error.message}`); }
                }
            } catch (e) {
                errors.push(`Error archiving ${planId}: ${e instanceof Error ? e.message : 'Unknown'}`);
            }
        }

        // Step 2: Create/update new active plans
        for (const planId of ACTIVE_PLANS) {
            const hardcodedPlan = SUBSCRIPTION_PLANS[planId as SubscriptionPlanId];
            if (!hardcodedPlan) { errors.push(`Plan ${planId} not found`); continue; }

            try {
                const row = cleanData({
                    ...planToRow({ ...hardcodedPlan, id: planId } as StoredPlan & { id: string }),
                    is_archived: false, show_in_landing: true,
                    landing_order: ACTIVE_PLANS.indexOf(planId),
                    updated_at: new Date().toISOString(),
                    updated_by: userId || null,
                });

                const { error } = await supabase.from(PLANS_TABLE).upsert(row, { onConflict: 'id' });
                if (error) throw error;
                created.push(planId);

                // Sync to Stripe for paid plans
                if (hardcodedPlan.price.monthly > 0) {
                    const stripeResult = await syncPlanToStripe({ ...hardcodedPlan, id: planId as SubscriptionPlanId });
                    if (stripeResult.success) {
                        const stripeUpdate: Record<string, any> = {};
                        if (stripeResult.productId) stripeUpdate.stripe_product_id = stripeResult.productId;
                        if (stripeResult.priceIdMonthly) stripeUpdate.stripe_price_id_monthly = stripeResult.priceIdMonthly;
                        if (stripeResult.priceIdAnnually) stripeUpdate.stripe_price_id_annually = stripeResult.priceIdAnnually;
                        if (Object.keys(stripeUpdate).length > 0) {
                            await supabase.from(PLANS_TABLE).update(stripeUpdate).eq('id', planId);
                        }
                    } else {
                        errors.push(`Stripe sync failed for ${planId}: ${stripeResult.error}`);
                    }
                }
            } catch (e) {
                errors.push(`Error processing ${planId}: ${e instanceof Error ? e.message : 'Unknown'}`);
            }
        }

        clearPlansCache();
        return { success: errors.length === 0, archived, created, updated, errors };

    } catch (error) {
        return { success: false, archived, created, updated, errors: [...errors, error instanceof Error ? error.message : 'Error desconocido'] };
    }
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(): Promise<boolean> {
    try {
        const plans = await getAllPlans(true);

        const hasNewPlansInDB = ACTIVE_PLANS.every(planId => {
            const plan = plans[planId];
            return plan && !plan._fromCode && !plan.isArchived;
        });

        const legacyArchived = LEGACY_PLANS_TO_ARCHIVE.every(planId => {
            const plan = plans[planId];
            return !plan || plan.isArchived || plan._fromCode;
        });

        const migrationNeeded = !hasNewPlansInDB || !legacyArchived;
        console.log('[isMigrationNeeded] Check result:', { hasNewPlansInDB, legacyArchived, migrationNeeded });
        return migrationNeeded;
    } catch (error) {
        console.error('Error checking migration status:', error);
        return true;
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
