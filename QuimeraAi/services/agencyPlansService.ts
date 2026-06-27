/**
 * Agency Plans Service
 * CRUD operations for agency-created service plans
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
} from '@/utils/compatData';
import { supabase } from '../supabase';
import {
    AgencyPlan,
    AgencyPlanStats,
    AgencyPlanSummary,
    calculateMarkup,
    calculatePlanSummary,
    validateAgencyPlan,
    QUIMERA_PROJECT_COST,
    DEFAULT_AGENCY_PLAN_LIMITS,
    DEFAULT_AGENCY_PLAN_FEATURES,
    sanitizeAgencyPlanLimits,
} from '../types/agencyPlans';
import { normalizePlanId } from './billing/planCatalog';

// =============================================================================
// CONSTANTS
// =============================================================================

const AGENCY_PLANS_COLLECTION = 'agencyPlans';
const AGENCY_SERVICE_PLANS_TABLE = 'agency_service_plans';
const AGENCY_CLIENTS_TABLE = 'agency_clients';
const TENANTS_COLLECTION = 'tenants';

// =============================================================================
// CACHE
// =============================================================================

// Cache per tenant to avoid fetching all agency plans
const plansCacheByTenant: Map<string, { plans: AgencyPlan[]; timestamp: number }> = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Clear cache for a specific tenant or all caches
 */
export function clearAgencyPlansCache(tenantId?: string): void {
    if (tenantId) {
        plansCacheByTenant.delete(tenantId);
    } else {
        plansCacheByTenant.clear();
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Clean object for Supabase (remove undefined values)
 */
function cleanForSupabase(obj: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                cleaned[key] = cleanForSupabase(value);
            } else {
                cleaned[key] = value;
            }
        }
    }
    return cleaned;
}

/**
 * Generate a unique plan ID
 */
function generatePlanId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'plan_';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function isMissingCanonicalTable(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | null;
    const message = String(err?.message || '').toLowerCase();
    return err?.code === '42P01' ||
        err?.code === 'PGRST205' ||
        message.includes('agency_service_plans') ||
        message.includes('agency_clients') ||
        message.includes('could not find the table');
}

function rowToAgencyPlan(row: any): AgencyPlan {
    const { markup, markupPercentage } = calculateMarkup(Number(row.price || 0), Number(row.base_cost ?? row.baseCost ?? QUIMERA_PROJECT_COST));
    return {
        id: row.id,
        tenantId: row.tenant_id || row.tenantId,
        name: row.name || '',
        description: row.description || '',
        color: row.color || '#3b82f6',
        price: Number(row.price || 0),
        baseCost: Number(row.base_cost ?? row.baseCost ?? QUIMERA_PROJECT_COST),
        markup,
        markupPercentage,
        limits: sanitizeAgencyPlanLimits(row.limits),
        features: { ...DEFAULT_AGENCY_PLAN_FEATURES, ...(row.features || {}) },
        isActive: row.is_active ?? row.isActive ?? true,
        isDefault: row.is_default ?? row.isDefault ?? false,
        isArchived: row.is_archived ?? row.isArchived ?? false,
        clientCount: Number(row.client_count ?? row.clientCount ?? 0),
        createdAt: row.created_at || row.createdAt,
        updatedAt: row.updated_at || row.updatedAt,
        archivedAt: row.archived_at || row.archivedAt,
        createdBy: row.created_by || row.createdBy,
        updatedBy: row.updated_by || row.updatedBy,
    };
}

function agencyPlanToRow(plan: Partial<AgencyPlan>, planId: string, userId?: string): Record<string, any> {
    const now = new Date().toISOString();
    const baseCost = plan.baseCost ?? QUIMERA_PROJECT_COST;
    return cleanForSupabase({
        id: planId,
        tenant_id: plan.tenantId,
        name: plan.name,
        description: plan.description,
        color: plan.color,
        price: plan.price,
        base_cost: baseCost,
        limits: sanitizeAgencyPlanLimits(plan.limits),
        features: { ...DEFAULT_AGENCY_PLAN_FEATURES, ...(plan.features || {}) },
        is_active: plan.isActive ?? true,
        is_default: plan.isDefault ?? false,
        is_archived: plan.isArchived ?? false,
        client_count: plan.clientCount ?? 0,
        created_by: plan.id ? undefined : userId,
        updated_by: userId,
        created_at: plan.createdAt ? undefined : now,
        updated_at: now,
        archived_at: plan.archivedAt,
    });
}

async function unsetOtherCanonicalDefaults(tenantId: string, excludePlanId: string): Promise<void> {
    const { error } = await supabase
        .from(AGENCY_SERVICE_PLANS_TABLE)
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .neq('id', excludePlanId);

    if (error && !isMissingCanonicalTable(error)) throw error;
}

async function getCanonicalAgencyPlanById(planId: string): Promise<{ plan: AgencyPlan | null; tableAvailable: boolean }> {
    const { data, error } = await supabase
        .from(AGENCY_SERVICE_PLANS_TABLE)
        .select('*')
        .eq('id', planId)
        .maybeSingle();

    if (error) {
        if (isMissingCanonicalTable(error)) return { plan: null, tableAvailable: false };
        throw error;
    }

    return { plan: data ? rowToAgencyPlan(data) : null, tableAvailable: true };
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all plans for a specific agency
 */
export async function getAgencyPlans(
    tenantId: string,
    includeArchived = false,
    forceRefresh = false
): Promise<AgencyPlan[]> {
    // Check cache
    const cached = plansCacheByTenant.get(tenantId);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
        if (includeArchived) {
            return cached.plans;
        }
        return cached.plans.filter(p => !p.isArchived);
    }

    try {
        const { data, error } = await supabase
            .from(AGENCY_SERVICE_PLANS_TABLE)
            .select('*')
            .eq('tenant_id', tenantId)
            .order('price', { ascending: true });

        if (!error && data) {
            const plans = data.map(rowToAgencyPlan);
            plansCacheByTenant.set(tenantId, { plans, timestamp: Date.now() });
            return includeArchived ? plans : plans.filter(p => !p.isArchived);
        }

        if (error && !isMissingCanonicalTable(error)) {
            throw error;
        }

        const plansQuery = query(
            collection(db, AGENCY_PLANS_COLLECTION),
            where('tenantId', '==', tenantId),
            orderBy('price', 'asc')
        );

        const snapshot = await getDocs(plansQuery);
        const plans: AgencyPlan[] = [];

        snapshot.docs.forEach((doc) => {
            const data = doc.data() as AgencyPlan;
            // Calculate markup on the fly
            const { markup, markupPercentage } = calculateMarkup(data.price, data.baseCost);
            plans.push({
                ...data,
                id: doc.id,
                markup,
                markupPercentage,
            });
        });

        // Update cache
        plansCacheByTenant.set(tenantId, { plans, timestamp: Date.now() });

        if (includeArchived) {
            return plans;
        }
        return plans.filter(p => !p.isArchived);

    } catch (error) {
        console.error('Error fetching agency plans:', error);
        return [];
    }
}

/**
 * Get a single plan by ID
 */
export async function getAgencyPlanById(planId: string): Promise<AgencyPlan | null> {
    try {
        const { data, error } = await supabase
            .from(AGENCY_SERVICE_PLANS_TABLE)
            .select('*')
            .eq('id', planId)
            .maybeSingle();

        if (!error && data) {
            return rowToAgencyPlan(data);
        }

        if (error && !isMissingCanonicalTable(error)) {
            throw error;
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            return null;
        }

        const firestorePlan = planDoc.data() as AgencyPlan;
        const { markup, markupPercentage } = calculateMarkup(firestorePlan.price, firestorePlan.baseCost);
        
        return {
            ...firestorePlan,
            id: planDoc.id,
            markup,
            markupPercentage,
        };

    } catch (error) {
        console.error('Error fetching agency plan:', error);
        return null;
    }
}

/**
 * Get the default plan for an agency
 */
export async function getDefaultAgencyPlan(tenantId: string): Promise<AgencyPlan | null> {
    try {
        const { data, error } = await supabase
            .from(AGENCY_SERVICE_PLANS_TABLE)
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_default', true)
            .eq('is_archived', false)
            .maybeSingle();

        if (!error && data) {
            return rowToAgencyPlan(data);
        }

        if (error && !isMissingCanonicalTable(error)) {
            throw error;
        }

        const plansQuery = query(
            collection(db, AGENCY_PLANS_COLLECTION),
            where('tenantId', '==', tenantId),
            where('isDefault', '==', true),
            where('isArchived', '==', false)
        );

        const snapshot = await getDocs(plansQuery);
        
        if (snapshot.empty) {
            return null;
        }

        const firestorePlan = snapshot.docs[0].data() as AgencyPlan;
        const { markup, markupPercentage } = calculateMarkup(firestorePlan.price, firestorePlan.baseCost);
        
        return {
            ...firestorePlan,
            id: snapshot.docs[0].id,
            markup,
            markupPercentage,
        };

    } catch (error) {
        console.error('Error fetching default agency plan:', error);
        return null;
    }
}

/**
 * Save (create or update) an agency plan
 */
export async function saveAgencyPlan(
    plan: Partial<AgencyPlan>,
    userId?: string
): Promise<{ success: boolean; planId?: string; error?: string }> {
    // Validate
    const validation = validateAgencyPlan(plan);
    if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
    }

    try {
        const isNew = !plan.id;
        const planId = plan.id || generatePlanId();
        const canonicalPlanData = agencyPlanToRow(plan, planId, userId);

        if (plan.isDefault && plan.tenantId) {
            await unsetOtherCanonicalDefaults(plan.tenantId, planId);
        }

        const { error: upsertError } = await supabase
            .from(AGENCY_SERVICE_PLANS_TABLE)
            .upsert(canonicalPlanData, { onConflict: 'id' });

        if (!upsertError) {
            if (plan.tenantId) clearAgencyPlansCache(plan.tenantId);
            return { success: true, planId };
        }

        if (!isMissingCanonicalTable(upsertError)) {
            throw upsertError;
        }

        const docRef = doc(db, AGENCY_PLANS_COLLECTION, planId);

        // Ensure baseCost is set
        const baseCost = plan.baseCost ?? QUIMERA_PROJECT_COST;
        
        // Prepare data
        const planData: Partial<AgencyPlan> = {
            ...plan,
            id: planId,
            baseCost,
            limits: plan.limits || DEFAULT_AGENCY_PLAN_LIMITS,
            features: plan.features || DEFAULT_AGENCY_PLAN_FEATURES,
            isActive: plan.isActive ?? true,
            isArchived: plan.isArchived ?? false,
            clientCount: plan.clientCount ?? 0,
        };

        if (isNew) {
            planData.createdAt = serverTimestamp() as any;
            planData.createdBy = userId;
        }
        
        planData.updatedAt = serverTimestamp() as any;
        planData.updatedBy = userId;

        // If setting as default, unset other defaults first
        if (plan.isDefault && plan.tenantId) {
            await unsetOtherDefaults(plan.tenantId, planId);
        }

        // Clean and save
        const cleanedData = cleanForSupabase(planData);
        await setDoc(docRef, cleanedData, { merge: !isNew });

        // Clear cache
        if (plan.tenantId) {
            clearAgencyPlansCache(plan.tenantId);
        }

        return { success: true, planId };

    } catch (error) {
        console.error('Error saving agency plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Unset default flag on all other plans for this agency
 */
async function unsetOtherDefaults(tenantId: string, excludePlanId: string): Promise<void> {
    try {
        const plansQuery = query(
            collection(db, AGENCY_PLANS_COLLECTION),
            where('tenantId', '==', tenantId),
            where('isDefault', '==', true)
        );

        const snapshot = await getDocs(plansQuery);
        
        const updates = snapshot.docs
            .filter(d => d.id !== excludePlanId)
            .map(d => updateDoc(doc(db, AGENCY_PLANS_COLLECTION, d.id), { isDefault: false }));

        await Promise.all(updates);

    } catch (error) {
        console.error('Error unsetting other defaults:', error);
    }
}

/**
 * Archive an agency plan (soft delete)
 */
export async function archiveAgencyPlan(
    planId: string,
    userId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { plan: canonicalPlan, tableAvailable } = await getCanonicalAgencyPlanById(planId);
        if (canonicalPlan) {
            if (canonicalPlan.clientCount > 0) {
                return {
                    success: false,
                    error: `Este plan tiene ${canonicalPlan.clientCount} cliente(s) activo(s). Reasigna los clientes antes de archivar.`,
                };
            }

            const { error } = await supabase
                .from(AGENCY_SERVICE_PLANS_TABLE)
                .update({
                    is_archived: true,
                    is_active: false,
                    is_default: false,
                    archived_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    updated_by: userId,
                })
                .eq('id', planId);

            if (!error) {
                clearAgencyPlansCache(canonicalPlan.tenantId);
                return { success: true };
            }

            if (!isMissingCanonicalTable(error)) throw error;
        }
        if (tableAvailable && !canonicalPlan) {
            // Continue to legacy fallback: existing workspaces may still have agencyPlans only.
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            return { success: false, error: 'Plan no encontrado' };
        }

        const plan = planDoc.data() as AgencyPlan;

        // Check if plan has active clients
        if (plan.clientCount > 0) {
            return { 
                success: false, 
                error: `Este plan tiene ${plan.clientCount} cliente(s) activo(s). Reasigna los clientes antes de archivar.` 
            };
        }

        await updateDoc(doc(db, AGENCY_PLANS_COLLECTION, planId), {
            isArchived: true,
            isActive: false,
            isDefault: false,
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: userId,
        });

        // Clear cache
        clearAgencyPlansCache(plan.tenantId);

        return { success: true };

    } catch (error) {
        console.error('Error archiving agency plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Restore an archived plan
 */
export async function restoreAgencyPlan(
    planId: string,
    userId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { plan: canonicalPlan, tableAvailable } = await getCanonicalAgencyPlanById(planId);
        if (canonicalPlan) {
            const { error } = await supabase
                .from(AGENCY_SERVICE_PLANS_TABLE)
                .update({
                    is_archived: false,
                    is_active: true,
                    archived_at: null,
                    updated_at: new Date().toISOString(),
                    updated_by: userId,
                })
                .eq('id', planId);

            if (!error) {
                clearAgencyPlansCache(canonicalPlan.tenantId);
                return { success: true };
            }

            if (!isMissingCanonicalTable(error)) throw error;
        }
        if (tableAvailable && !canonicalPlan) {
            // Continue to legacy fallback.
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            return { success: false, error: 'Plan no encontrado' };
        }

        const plan = planDoc.data() as AgencyPlan;

        await updateDoc(doc(db, AGENCY_PLANS_COLLECTION, planId), {
            isArchived: false,
            isActive: true,
            archivedAt: null,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
        });

        // Clear cache
        clearAgencyPlansCache(plan.tenantId);

        return { success: true };

    } catch (error) {
        console.error('Error restoring agency plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Delete an agency plan permanently
 */
export async function deleteAgencyPlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { plan: canonicalPlan, tableAvailable } = await getCanonicalAgencyPlanById(planId);
        if (canonicalPlan) {
            if (canonicalPlan.clientCount > 0) {
                return {
                    success: false,
                    error: `Este plan tiene ${canonicalPlan.clientCount} cliente(s) activo(s). Reasigna los clientes antes de eliminar.`,
                };
            }

            const { error } = await supabase
                .from(AGENCY_SERVICE_PLANS_TABLE)
                .delete()
                .eq('id', planId);

            if (!error) {
                clearAgencyPlansCache(canonicalPlan.tenantId);
                return { success: true };
            }

            if (!isMissingCanonicalTable(error)) throw error;
        }
        if (tableAvailable && !canonicalPlan) {
            // Continue to legacy fallback.
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            return { success: false, error: 'Plan no encontrado' };
        }

        const plan = planDoc.data() as AgencyPlan;

        // Check if plan has active clients
        if (plan.clientCount > 0) {
            return { 
                success: false, 
                error: `Este plan tiene ${plan.clientCount} cliente(s) activo(s). Reasigna los clientes antes de eliminar.` 
            };
        }

        await deleteDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));

        // Clear cache
        clearAgencyPlansCache(plan.tenantId);

        return { success: true };

    } catch (error) {
        console.error('Error deleting agency plan:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

// =============================================================================
// CLIENT ASSIGNMENT
// =============================================================================

/**
 * Assign a plan to a client tenant
 * Updates the client's limits and billing based on the plan
 */
export async function assignPlanToClient(
    clientTenantId: string,
    planId: string,
    userId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the plan
        const plan = await getAgencyPlanById(planId);
        if (!plan) {
            return { success: false, error: 'Plan no encontrado' };
        }

        const { data: clientRow, error: clientError } = await supabase
            .from('tenants')
            .select('id,type,subscription_plan,billing,limits,owner_tenant_id')
            .eq('id', clientTenantId)
            .maybeSingle();

        if (!clientError && clientRow) {
            const previousPlanId = clientRow.billing?.agencyPlanId || null;
            const effectivePlanId = normalizePlanId(
                clientRow.billing?.effectivePlanId
                || clientRow.subscription_plan
                || 'individual',
            );
            const billing = {
                ...(clientRow.billing || {}),
                mode: clientRow.billing?.mode || 'included_in_parent',
                agencyPlanId: planId,
                agencyPlanName: plan.name,
                monthlyPrice: plan.price,
                effectivePlanId,
            };

            const { error: updateError } = await supabase
                .from('tenants')
                .update({
                    type: clientRow.type === 'agency_client' ? 'agency_client' : clientRow.type,
                    subscription_plan: effectivePlanId,
                    limits: sanitizeAgencyPlanLimits(plan.limits),
                    billing,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', clientTenantId);

            if (updateError) throw updateError;

            await supabase
                .from(AGENCY_CLIENTS_TABLE)
                .upsert({
                    agency_tenant_id: plan.tenantId,
                    client_tenant_id: clientTenantId,
                    agency_plan_id: planId,
                    billing_mode: billing.mode,
                    onboarding_status: 'active',
                    metadata: {
                        source: 'agencyPlansService.assignPlanToClient',
                        agencyPlanName: plan.name,
                    },
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'agency_tenant_id,client_tenant_id' })
                .then(({ error }) => {
                    if (error && !isMissingCanonicalTable(error)) throw error;
                });

            if (previousPlanId && previousPlanId !== planId) {
                await decrementPlanClientCount(previousPlanId);
            }

            if (!previousPlanId || previousPlanId !== planId) {
                await incrementPlanClientCount(planId);
            }

            clearAgencyPlansCache(plan.tenantId);
            return { success: true };
        }

        if (clientError && !isMissingCanonicalTable(clientError)) throw clientError;

        // Legacy fallback.
        const clientDoc = await getDoc(doc(db, TENANTS_COLLECTION, clientTenantId));
        if (!clientDoc.exists()) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const clientData = clientDoc.data();
        const previousPlanId = clientData.agencyPlanId;
        const effectivePlanId = normalizePlanId(
            clientData.billing?.effectivePlanId
            || clientData.subscription_plan
            || clientData.subscriptionPlan
            || 'individual',
        );

        await updateDoc(doc(db, TENANTS_COLLECTION, clientTenantId), {
            agencyPlanId: planId,
            agencyPlanName: plan.name,
            limits: sanitizeAgencyPlanLimits(plan.limits),
            billing: {
                ...(clientData.billing || {}),
                mode: clientData.billing?.mode || 'included_in_parent',
                agencyPlanId: planId,
                agencyPlanName: plan.name,
                monthlyPrice: plan.price,
                effectivePlanId,
            },
            subscriptionPlan: effectivePlanId,
            subscription_plan: effectivePlanId,
            updatedAt: serverTimestamp(),
        });

        // Update plan client counts
        if (previousPlanId && previousPlanId !== planId) {
            // Decrement previous plan
            await decrementPlanClientCount(previousPlanId);
        }

        if (!previousPlanId || previousPlanId !== planId) {
            // Increment new plan
            await incrementPlanClientCount(planId);
        }

        // Clear caches
        clearAgencyPlansCache(plan.tenantId);

        return { success: true };

    } catch (error) {
        console.error('Error assigning plan to client:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Remove plan assignment from a client
 */
export async function removePlanFromClient(
    clientTenantId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: clientRow, error: clientError } = await supabase
            .from('tenants')
            .select('id,billing')
            .eq('id', clientTenantId)
            .maybeSingle();

        if (!clientError && clientRow) {
            const previousPlanId = clientRow.billing?.agencyPlanId || null;
            const billing = { ...(clientRow.billing || {}) };
            delete billing.agencyPlanId;
            delete billing.agencyPlanName;

            const { error: updateError } = await supabase
                .from('tenants')
                .update({ billing, updated_at: new Date().toISOString() })
                .eq('id', clientTenantId);

            if (updateError) throw updateError;

            const { error: relationError } = await supabase
                .from(AGENCY_CLIENTS_TABLE)
                .update({ agency_plan_id: null, updated_at: new Date().toISOString() })
                .eq('client_tenant_id', clientTenantId);

            if (relationError && !isMissingCanonicalTable(relationError)) throw relationError;
            if (previousPlanId) await decrementPlanClientCount(previousPlanId);
            return { success: true };
        }

        if (clientError && !isMissingCanonicalTable(clientError)) throw clientError;

        // Get the client tenant
        const clientDoc = await getDoc(doc(db, TENANTS_COLLECTION, clientTenantId));
        if (!clientDoc.exists()) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const clientData = clientDoc.data();
        const previousPlanId = clientData.agencyPlanId;

        // Remove plan from client
        await updateDoc(doc(db, TENANTS_COLLECTION, clientTenantId), {
            agencyPlanId: null,
            agencyPlanName: null,
            updatedAt: serverTimestamp(),
        });

        // Decrement plan client count
        if (previousPlanId) {
            await decrementPlanClientCount(previousPlanId);
        }

        return { success: true };

    } catch (error) {
        console.error('Error removing plan from client:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Increment client count for a plan
 */
async function incrementPlanClientCount(planId: string): Promise<void> {
    try {
        const { plan: canonicalPlan } = await getCanonicalAgencyPlanById(planId);
        if (canonicalPlan) {
            await supabase
                .from(AGENCY_SERVICE_PLANS_TABLE)
                .update({ client_count: canonicalPlan.clientCount + 1, updated_at: new Date().toISOString() })
                .eq('id', planId);
            return;
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        if (planDoc.exists()) {
            const currentCount = planDoc.data().clientCount || 0;
            await updateDoc(doc(db, AGENCY_PLANS_COLLECTION, planId), {
                clientCount: currentCount + 1,
            });
        }
    } catch (error) {
        console.error('Error incrementing plan client count:', error);
    }
}

/**
 * Decrement client count for a plan
 */
async function decrementPlanClientCount(planId: string): Promise<void> {
    try {
        const { plan: canonicalPlan } = await getCanonicalAgencyPlanById(planId);
        if (canonicalPlan) {
            await supabase
                .from(AGENCY_SERVICE_PLANS_TABLE)
                .update({ client_count: Math.max(0, canonicalPlan.clientCount - 1), updated_at: new Date().toISOString() })
                .eq('id', planId);
            return;
        }

        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        if (planDoc.exists()) {
            const currentCount = planDoc.data().clientCount || 0;
            await updateDoc(doc(db, AGENCY_PLANS_COLLECTION, planId), {
                clientCount: Math.max(0, currentCount - 1),
            });
        }
    } catch (error) {
        console.error('Error decrementing plan client count:', error);
    }
}

/**
 * Get all clients using a specific plan
 */
export async function getClientsUsingPlan(planId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from(AGENCY_CLIENTS_TABLE)
            .select('client_tenant_id')
            .eq('agency_plan_id', planId);

        if (!error && data) {
            return data.map(row => row.client_tenant_id).filter(Boolean);
        }

        if (error && !isMissingCanonicalTable(error)) throw error;

        const clientsQuery = query(
            collection(db, TENANTS_COLLECTION),
            where('agencyPlanId', '==', planId)
        );

        const snapshot = await getDocs(clientsQuery);
        return snapshot.docs.map(d => d.id);

    } catch (error) {
        console.error('Error fetching clients using plan:', error);
        return [];
    }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get statistics for all agency plans
 */
export async function getAgencyPlanStats(tenantId: string): Promise<AgencyPlanStats> {
    try {
        const plans = await getAgencyPlans(tenantId, false, true);
        
        const activePlans = plans.filter(p => p.isActive && !p.isArchived);
        const totalClients = plans.reduce((sum, p) => sum + (p.clientCount || 0), 0);
        const totalMRR = plans.reduce((sum, p) => sum + (p.price * (p.clientCount || 0)), 0);
        const totalCost = plans.reduce((sum, p) => sum + (p.baseCost * (p.clientCount || 0)), 0);
        const totalMarkup = totalMRR - totalCost;

        // Calculate weighted average markup percentage
        let weightedMarkup = 0;
        if (totalClients > 0) {
            plans.forEach(p => {
                if (p.clientCount > 0) {
                    const { markupPercentage } = calculateMarkup(p.price, p.baseCost);
                    weightedMarkup += markupPercentage * p.clientCount;
                }
            });
            weightedMarkup = weightedMarkup / totalClients;
        }

        return {
            totalPlans: plans.length,
            activePlans: activePlans.length,
            totalClients,
            totalMRR,
            totalMarkup,
            averageMarkupPercentage: Math.round(weightedMarkup),
        };

    } catch (error) {
        console.error('Error calculating agency plan stats:', error);
        return {
            totalPlans: 0,
            activePlans: 0,
            totalClients: 0,
            totalMRR: 0,
            totalMarkup: 0,
            averageMarkupPercentage: 0,
        };
    }
}

/**
 * Get summary for each plan (for markup table)
 */
export async function getAgencyPlanSummaries(tenantId: string): Promise<AgencyPlanSummary[]> {
    try {
        const plans = await getAgencyPlans(tenantId, false, true);
        return plans.map(p => calculatePlanSummary(p));

    } catch (error) {
        console.error('Error getting plan summaries:', error);
        return [];
    }
}

/**
 * Recalculate client counts for all plans of an agency
 * Useful for fixing inconsistencies
 */
export async function recalculateClientCounts(tenantId: string): Promise<void> {
    try {
        const plans = await getAgencyPlans(tenantId, true, true);
        
        for (const plan of plans) {
            const clients = await getClientsUsingPlan(plan.id);
            
            if (clients.length !== plan.clientCount) {
                await updateDoc(doc(db, AGENCY_PLANS_COLLECTION, plan.id), {
                    clientCount: clients.length,
                });
            }
        }

        // Clear cache
        clearAgencyPlansCache(tenantId);

    } catch (error) {
        console.error('Error recalculating client counts:', error);
    }
}
