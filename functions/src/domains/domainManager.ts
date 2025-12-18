/**
 * Domain Manager
 * 
 * Cloud Functions for managing custom domain mappings.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Cloud Run DNS configuration
const CLOUD_RUN_DNS = {
    aRecords: ['216.239.32.21', '216.239.34.21', '216.239.36.21', '216.239.38.21'],
    cnameTarget: 'ghs.googlehosted.com',
    txtPrefix: '_quimera-verify'
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
                    type: 'A',
                    host: '@',
                    value: CLOUD_RUN_DNS.aRecords[0],
                    verified: false
                },
                {
                    type: 'CNAME',
                    host: 'www',
                    value: CLOUD_RUN_DNS.cnameTarget,
                    verified: false
                },
                {
                    type: 'TXT',
                    host: CLOUD_RUN_DNS.txtPrefix,
                    value: `quimera-verify=${verificationToken}`,
                    verified: false
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








