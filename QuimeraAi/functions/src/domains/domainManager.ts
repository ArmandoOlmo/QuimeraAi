/**
 * Domain Manager
 * 
 * Cloud Functions for managing custom domain mappings.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Cloud Run configuration - domains point directly to Cloud Run SSR server
const CLOUD_RUN_CONFIG = {
    url: 'quimera-ssr-575386543550.us-central1.run.app',
    cnameTarget: 'quimera-ssr-575386543550.us-central1.run.app'
};

/**
 * Add a custom domain mapping
 * Called when a user connects a domain to their project
 */
export const addCustomDomain = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain, projectId } = data;
    const userId = context.auth.uid;

    // Validate inputs
    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }
    if (!projectId || typeof projectId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID is required');
    }

    // Normalize domain
    const normalizedDomain = normalizeDomain(domain);

    // Validate domain format
    if (!isValidDomain(normalizedDomain)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid domain format');
    }

    try {
        // Check if domain is already registered
        const existingDomain = await db.collection('customDomains').doc(normalizedDomain).get();
        if (existingDomain.exists) {
            const existingData = existingDomain.data();
            if (existingData?.userId !== userId) {
                throw new functions.https.HttpsError(
                    'already-exists',
                    'This domain is already registered to another user'
                );
            }
        }

        // Verify the user owns the project
        const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Project not found');
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Create domain mapping
        const domainData = {
            domain: normalizedDomain,
            projectId,
            userId,
            status: 'pending',
            sslStatus: 'pending',
            dnsVerified: false,
            verificationToken,
            dnsRecords: [
                {
                    type: 'CNAME',
                    host: '@',
                    value: CLOUD_RUN_CONFIG.cnameTarget,
                    verified: false,
                    description: 'Root domain → Cloud Run SSR'
                },
                {
                    type: 'CNAME',
                    host: 'www',
                    value: CLOUD_RUN_CONFIG.cnameTarget,
                    verified: false,
                    description: 'www subdomain → Cloud Run SSR'
                }
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to global customDomains collection
        await db.collection('customDomains').doc(normalizedDomain).set(domainData);

        // Also update the user's domain record
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).set({
            ...domainData,
            id: normalizedDomain,
            name: normalizedDomain,
            provider: 'External'
        }, { merge: true });

        console.log(`[DomainManager] Created domain mapping: ${normalizedDomain} -> ${projectId}`);

        return {
            success: true,
            domain: normalizedDomain,
            dnsRecords: domainData.dnsRecords,
            verificationToken
        };

    } catch (error: any) {
        console.error('[DomainManager] Error adding domain:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Remove a custom domain mapping
 */
export const removeCustomDomain = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    const normalizedDomain = normalizeDomain(domain);

    try {
        // Verify ownership
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found');
        }

        const domainData = domainDoc.data();
        if (domainData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        // Delete from global collection
        await db.collection('customDomains').doc(normalizedDomain).delete();

        // Delete from user's collection
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).delete();

        console.log(`[DomainManager] Removed domain: ${normalizedDomain}`);

        return { success: true };

    } catch (error: any) {
        console.error('[DomainManager] Error removing domain:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update domain status
 */
export const updateDomainStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain, status, sslStatus } = data;
    const userId = context.auth.uid;

    const normalizedDomain = normalizeDomain(domain);

    try {
        // Verify ownership
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found');
        }

        const domainData = domainDoc.data();
        if (domainData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        // Update status
        const updates: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (status) updates.status = status;
        if (sslStatus) updates.sslStatus = sslStatus;

        await db.collection('customDomains').doc(normalizedDomain).update(updates);
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update(updates);

        return { success: true };

    } catch (error: any) {
        console.error('[DomainManager] Error updating domain:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('/')[0]; // Remove any path
}

function isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    return domainRegex.test(domain) && domain.length <= 253;
}

function generateVerificationToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Setup external domain with Cloudflare (SIMPLIFIED FLOW)
 * 
 * This is the easiest way for users to connect external domains:
 * 1. User adds their domain
 * 2. We create a Cloudflare zone and configure DNS automatically
 * 3. User only needs to change nameservers at their registrar
 * 4. Done! SSL and routing work automatically
 */
export const setupExternalDomainWithCloudflare = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain, projectId } = data;
    const userId = context.auth.uid;

    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = normalizeDomain(domain);

    if (!isValidDomain(normalizedDomain)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid domain format');
    }

    try {
        console.log(`[DomainManager] Setting up external domain with Cloudflare: ${normalizedDomain}`);

        // Check if domain is already registered to another user
        const existingDomain = await db.collection('customDomains').doc(normalizedDomain).get();
        if (existingDomain.exists) {
            const existingData = existingDomain.data();
            if (existingData?.userId && existingData.userId !== userId) {
                throw new functions.https.HttpsError(
                    'already-exists',
                    'This domain is already registered to another user'
                );
            }
        }

        // Import Cloudflare functions
        const { configureQuimeraDNS, enableStrictSSL } = await import('./cloudflareApi');

        // Configure Cloudflare DNS (creates zone + DNS records)
        const cloudflareResult = await configureQuimeraDNS(normalizedDomain, projectId);

        // Enable SSL
        await enableStrictSSL(cloudflareResult.zoneId);

        // Save domain to Firestore
        const domainData = {
            domain: normalizedDomain,
            projectId: projectId || null,
            userId,
            status: 'pending_nameservers', // New status: waiting for nameserver change
            sslStatus: 'pending',
            dnsVerified: false,
            provider: 'External',
            // Cloudflare info
            cloudflareZoneId: cloudflareResult.zoneId,
            cloudflareNameservers: cloudflareResult.nameservers,
            cloudflareConfigured: true,
            // Cloud Run target
            cloudRunTarget: CLOUD_RUN_CONFIG.url,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to global customDomains collection
        await db.collection('customDomains').doc(normalizedDomain).set(domainData, { merge: true });

        // Save to user's domains collection
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).set({
            ...domainData,
            id: normalizedDomain,
            name: normalizedDomain,
        }, { merge: true });

        console.log(`[DomainManager] External domain configured with Cloudflare: ${normalizedDomain}`);
        console.log(`[DomainManager] Nameservers: ${cloudflareResult.nameservers.join(', ')}`);

        return {
            success: true,
            domain: normalizedDomain,
            nameservers: cloudflareResult.nameservers,
            zoneId: cloudflareResult.zoneId,
            instructions: {
                step1: 'Go to your domain registrar (GoDaddy, Namecheap, etc.)',
                step2: 'Find "Nameservers" or "DNS Settings"',
                step3: 'Change nameservers to:',
                nameservers: cloudflareResult.nameservers,
                step4: 'Wait 5-30 minutes for propagation',
                step5: 'Click "Verify" in Quimera to complete setup'
            }
        };

    } catch (error: any) {
        console.error('[DomainManager] Error setting up external domain:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Verify nameserver change for external domain
 * Checks if Cloudflare zone is now active (nameservers were changed)
 */
export const verifyExternalDomainNameservers = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    if (!domain) {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = normalizeDomain(domain);

    try {
        // Get domain data
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found');
        }

        const domainData = domainDoc.data();
        if (domainData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        const zoneId = domainData?.cloudflareZoneId;
        if (!zoneId) {
            throw new functions.https.HttpsError('failed-precondition', 'Domain not configured with Cloudflare');
        }

        // Check Cloudflare zone status
        const { getZoneStatus } = await import('./cloudflareApi');
        const zoneStatus = await getZoneStatus(zoneId);

        console.log(`[DomainManager] Zone status for ${normalizedDomain}: ${zoneStatus}`);

        if (zoneStatus === 'active') {
            // Nameservers are working! Update domain status
            await db.collection('customDomains').doc(normalizedDomain).update({
                status: 'active',
                sslStatus: 'active',
                dnsVerified: true,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update({
                status: 'active',
                sslStatus: 'active',
                dnsVerified: true,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                verified: true,
                status: 'active',
                message: '¡Dominio configurado correctamente! Ya puedes usarlo.'
            };
        } else {
            return {
                verified: false,
                status: zoneStatus,
                message: 'Los nameservers aún no se han propagado. Espera unos minutos e intenta de nuevo.',
                nameservers: domainData?.cloudflareNameservers || []
            };
        }

    } catch (error: any) {
        console.error('[DomainManager] Error verifying nameservers:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Migrate existing domain to Cloudflare (simplified flow)
 * For domains already configured with the old DNS method
 */
export const migrateToCloudflare = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = normalizeDomain(domain);

    try {
        console.log(`[DomainManager] Migrating ${normalizedDomain} to Cloudflare...`);

        // Check if domain exists and belongs to user
        const existingDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!existingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found');
        }

        const existingData = existingDoc.data();
        if (existingData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        // Configure Cloudflare
        const { configureQuimeraDNS, enableStrictSSL } = await import('./cloudflareApi');
        const cloudflareResult = await configureQuimeraDNS(normalizedDomain, existingData?.projectId);
        await enableStrictSSL(cloudflareResult.zoneId);

        // Update domain with Cloudflare info
        const updateData = {
            cloudflareZoneId: cloudflareResult.zoneId,
            cloudflareNameservers: cloudflareResult.nameservers,
            cloudflareConfigured: true,
            status: 'pending_nameservers',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('customDomains').doc(normalizedDomain).update(updateData);
        
        // Also update user's domain collection
        const userDomainsQuery = await db.collection('users').doc(userId).collection('domains')
            .where('name', '==', normalizedDomain).get();
        
        for (const doc of userDomainsQuery.docs) {
            await doc.ref.update(updateData);
        }

        console.log(`[DomainManager] Migration complete for ${normalizedDomain}`);

        return {
            success: true,
            domain: normalizedDomain,
            nameservers: cloudflareResult.nameservers,
            message: 'Domain migrated to Cloudflare. Please update your nameservers.'
        };

    } catch (error: any) {
        console.error('[DomainManager] Migration error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Sync domain mapping to Firestore for Cloud Run SSR resolution
 * Cloud Run SSR server looks up domains in customDomains collection
 */
export const syncDomainMapping = functions.https.onCall(async (data, context) => {
    console.log('[DomainManager] syncDomainMapping called with data:', JSON.stringify(data));
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    
    const { domain, projectId } = data;
    const userId = context.auth.uid;

    if (!domain) throw new functions.https.HttpsError('invalid-argument', 'Domain is required');

    const normalizedDomain = domain.toLowerCase().trim().replace(/^www\./, '');

    try {
        // Save to Firestore (Cloud Run SSR server reads from this collection)
        const domainData = {
            domain: normalizedDomain,
            projectId: projectId || null,
            userId,
            status: projectId ? 'active' : 'pending',
            sslStatus: 'active', // Cloudflare handles SSL
            dnsVerified: true,
            cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await admin.firestore().collection('customDomains').doc(normalizedDomain).set(domainData, { merge: true });
        console.log(`[DomainManager] Synced ${normalizedDomain} to customDomains collection`);
        
        return { 
            success: true, 
            message: `Domain ${normalizedDomain} synced for Cloud Run SSR`,
            domain: normalizedDomain,
            target: domainData.cloudRunTarget
        };
    } catch (error: any) {
        console.error('[DomainManager] Error in syncDomainMapping:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Error syncing domain mapping');
    }
});






