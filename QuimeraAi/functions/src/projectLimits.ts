import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Trigger that runs when a new project is created inside a tenant.
 * It counts the active projects and enforces the maxProjects limit defined in the tenant's plan.
 */
export const enforceTenantProjectLimits = functions.firestore
    .document('tenants/{tenantId}/projects/{projectId}')
    .onCreate(async (snap, context) => {
        const { tenantId, projectId } = context.params;

        try {
            const tenantRef = db.doc(`tenants/${tenantId}`);
            const tenantDoc = await tenantRef.get();

            if (!tenantDoc.exists) {
                return;
            }

            const tenantData = tenantDoc.data()!;
            const limits = tenantData.limits || {};
            const maxProjects = limits.maxProjects !== undefined ? limits.maxProjects : 1; // Default to 1 (Free)

            // If maxProjects is -1, it means unlimited
            if (maxProjects === -1) {
                return;
            }

            // Count existing projects for this tenant
            const projectsSnapshot = await tenantRef.collection('projects')
                .where('status', 'in', ['active', 'published'])
                .get();

            const activeProjectsCount = projectsSnapshot.size;

            if (activeProjectsCount > maxProjects) {
                console.warn(`[Project Limits] Tenant ${tenantId} exceeded max projects (${maxProjects}). Disabling project ${projectId}.`);
                
                // Exceeded limit: mark the newly created project as locked
                await snap.ref.update({
                    status: 'quota_exceeded_locked',
                    published: false,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Optional: Update tenant doc with notification or flag
                await tenantRef.update({
                    'billing.quotaExceeded': true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                // If it's a project billing plan (agency), trigger a recount or just let the agency webhook handle it.
                // The agency webhook (`onTenantProjectChange`) already handles project recounts for billing, 
                // so we don't need to do billing here.
            }

        } catch (error) {
            console.error(`[Project Limits] Error enforcing limits for tenant ${tenantId}:`, error);
        }
    });
