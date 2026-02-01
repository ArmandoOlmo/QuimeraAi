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
} from '../firebase';
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
} from '../types/agencyPlans';

// =============================================================================
// CONSTANTS
// =============================================================================

const AGENCY_PLANS_COLLECTION = 'agencyPlans';
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
 * Clean object for Firestore (remove undefined values)
 */
function cleanForFirestore(obj: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                cleaned[key] = cleanForFirestore(value);
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
        const planDoc = await getDoc(doc(db, AGENCY_PLANS_COLLECTION, planId));
        
        if (!planDoc.exists()) {
            return null;
        }

        const data = planDoc.data() as AgencyPlan;
        const { markup, markupPercentage } = calculateMarkup(data.price, data.baseCost);
        
        return {
            ...data,
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

        const data = snapshot.docs[0].data() as AgencyPlan;
        const { markup, markupPercentage } = calculateMarkup(data.price, data.baseCost);
        
        return {
            ...data,
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
        const cleanedData = cleanForFirestore(planData);
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

        // Get the client tenant
        const clientDoc = await getDoc(doc(db, TENANTS_COLLECTION, clientTenantId));
        if (!clientDoc.exists()) {
            return { success: false, error: 'Cliente no encontrado' };
        }

        const clientData = clientDoc.data();
        const previousPlanId = clientData.agencyPlanId;

        // Update client with new plan
        await updateDoc(doc(db, TENANTS_COLLECTION, clientTenantId), {
            agencyPlanId: planId,
            agencyPlanName: plan.name,
            limits: plan.limits,
            'billing.monthlyPrice': plan.price,
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
