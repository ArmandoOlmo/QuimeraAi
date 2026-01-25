/**
 * Cloud Run Admin API Integration
 * 
 * Automatically creates domain mappings in Cloud Run for SSL certificates.
 * This is required for end-to-end SSL when using custom domains.
 * 
 * API Docs: https://cloud.google.com/run/docs/reference/rest/v1/namespaces.domainmappings
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

const db = admin.firestore();

// Cloud Run configuration
const CLOUD_RUN_CONFIG = {
    projectId: 'quimeraai',
    region: 'us-central1',
    serviceName: 'quimera-ssr'
};

// Initialize Google Auth for Cloud APIs
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const CERT_MANAGER_CONFIG = {
    projectId: 'quimeraai',
    location: 'global',
    mapName: 'quimera-cert-map',
    loadBalancerIp: '130.211.43.242'
};

/**
 * Create a managed certificate and map entry in Google Certificate Manager
 * This is the modern replacement for Cloud Run Domain Mappings.
 */
export async function createCertificateManagerEntry(domain: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
}> {
    try {
        console.log(`[CertManager] Setting up SSL for: ${domain}`);

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) throw new Error('Failed to get access token');

        // Normalize ID for Google resources (no dots, just hyphens/lowercase)
        const resourceId = domain.replace(/\./g, '-');

        // Step 1: Create Managed Certificate
        const certUrl = `https://certificatemanager.googleapis.com/v1/projects/${CERT_MANAGER_CONFIG.projectId}/locations/${CERT_MANAGER_CONFIG.location}/certificates?certificateId=${resourceId}-cert`;

        const certResponse = await fetch(certUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                managed: { domains: [domain, `www.${domain}`] }
            })
        });

        if (!certResponse.ok && certResponse.status !== 409) {
            const errorData = await certResponse.json();
            console.error('[CertManager] Certificate creation failed:', errorData);
            // Continue anyway as the cert might already exist or we can retry map entry
        }

        // Step 2: Create Map Entry
        const mapEntryUrl = `https://certificatemanager.googleapis.com/v1/projects/${CERT_MANAGER_CONFIG.projectId}/locations/${CERT_MANAGER_CONFIG.location}/certificateMaps/${CERT_MANAGER_CONFIG.mapName}/certificateMapEntries?certificateMapEntryId=${resourceId}-entry`;

        const entryResponse = await fetch(mapEntryUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hostname: domain,
                certificates: [`projects/${CERT_MANAGER_CONFIG.projectId}/locations/${CERT_MANAGER_CONFIG.location}/certificates/${resourceId}-cert`]
            })
        });

        // Add www. entry too
        const wwwEntryResponse = await fetch(mapEntryUrl.replace(`${resourceId}-entry`, `${resourceId}-www-entry`), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hostname: `www.${domain}`,
                certificates: [`projects/${CERT_MANAGER_CONFIG.projectId}/locations/${CERT_MANAGER_CONFIG.location}/certificates/${resourceId}-cert`]
            })
        });

        if (!entryResponse.ok && entryResponse.status !== 409) {
            const errorData = await entryResponse.json();
            throw new Error(errorData.error?.message || 'Failed to create map entry');
        }

        return { success: true, status: 'provisioning' };

    } catch (error: any) {
        console.error('[CertManager] Exception:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get certificate status from Certificate Manager
 */
export async function getCertificateStatus(domain: string): Promise<{
    ready: boolean;
    status?: string;
}> {
    try {
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const resourceId = domain.replace(/\./g, '-');

        const url = `https://certificatemanager.googleapis.com/v1/projects/${CERT_MANAGER_CONFIG.projectId}/locations/${CERT_MANAGER_CONFIG.location}/certificates/${resourceId}-cert`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken.token}` }
        });

        if (!response.ok) return { ready: false };
        const data = await response.json();

        // Check if managed certificate is ACTIVE
        return {
            ready: data.managed?.state === 'ACTIVE',
            status: data.managed?.state || 'PROVISIONING'
        };
    } catch (e) {
        return { ready: false };
    }
}


/**
 * Get domain mapping status from Cloud Run
 */
export async function getCloudRunDomainMappingStatus(domain: string): Promise<{
    exists: boolean;
    ready: boolean;
    certificateStatus?: string;
    resourceRecords?: Array<{ type: string; rrdata: string }>;
    error?: string;
}> {
    try {
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        const url = `https://${CLOUD_RUN_CONFIG.region}-run.googleapis.com/apis/domains.cloudrun.com/v1/namespaces/${CLOUD_RUN_CONFIG.projectId}/domainmappings/${domain}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            return { exists: false, ready: false };
        }

        if (!response.ok) {
            const data = await response.json();
            return {
                exists: false,
                ready: false,
                error: data.error?.message || 'Failed to get status'
            };
        }

        const data = await response.json();

        // Check conditions for readiness
        const conditions = data.status?.conditions || [];
        const readyCondition = conditions.find((c: any) => c.type === 'Ready');
        const certificateCondition = conditions.find((c: any) => c.type === 'CertificateProvisioned');

        return {
            exists: true,
            ready: readyCondition?.status === 'True',
            certificateStatus: certificateCondition?.status === 'True' ? 'active' : 'provisioning',
            resourceRecords: data.status?.resourceRecords
        };

    } catch (error: any) {
        console.error('[CloudRunAPI] Get status error:', error);
        return {
            exists: false,
            ready: false,
            error: error.message
        };
    }
}

/**
 * Delete domain mapping from Cloud Run
 */
export async function deleteCloudRunDomainMapping(domain: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        console.log(`[CloudRunAPI] Deleting domain mapping: ${domain}`);

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        const url = `https://${CLOUD_RUN_CONFIG.region}-run.googleapis.com/apis/domains.cloudrun.com/v1/namespaces/${CLOUD_RUN_CONFIG.projectId}/domainmappings/${domain}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            console.log(`[CloudRunAPI] Domain mapping not found: ${domain}`);
            return { success: true }; // Already doesn't exist
        }

        if (!response.ok) {
            const data = await response.json();
            return {
                success: false,
                error: data.error?.message || 'Failed to delete mapping'
            };
        }

        console.log(`[CloudRunAPI] Domain mapping deleted: ${domain}`);
        return { success: true };

    } catch (error: any) {
        console.error('[CloudRunAPI] Delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// =============================================================================
// CLOUD FUNCTIONS
// =============================================================================

/**
 * Create Cloud Run domain mapping for a custom domain
 * Called when a user adds a domain to their project
 */
export const createDomainMapping = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim().replace(/^www\./, '');

    try {
        // Verify domain ownership in Firestore
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found. Please add it first.');
        }

        const domainData = domainDoc.data();
        if (domainData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        // Create Certificate Manager entry
        const result = await createCertificateManagerEntry(normalizedDomain);

        if (!result.success && result.status !== 'already_exists') {
            console.warn(`[CloudRunAPI] Warning: Failed to create SSL entry: ${result.error}`);

            // AUTOMATIC FALLBACK: Try to configure Cloudflare instead
            try {
                console.log('[CloudRunAPI] Attempting Cloudflare fallback...');
                const { configureQuimeraDNS, enableStrictSSL } = await import('./cloudflareApi');
                // Use default Quimera project ID if none provided
                const cloudflareResult = await configureQuimeraDNS(normalizedDomain, 'quimera-default');
                await enableStrictSSL(cloudflareResult.zoneId);

                // Update Firestore with Cloudflare info
                const updateData = {
                    useLoadBalancer: false,
                    cloudRunMappingStatus: 'error',
                    cloudflareConfigured: true,
                    cloudflareNameservers: cloudflareResult.nameservers,
                    cloudflareZoneId: cloudflareResult.zoneId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('customDomains').doc(normalizedDomain).update(updateData);
                await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update(updateData);

                return {
                    success: false, // It failed to map directly
                    domain: normalizedDomain,
                    status: 'error',
                    error: result.error,
                    nameservers: cloudflareResult.nameservers,
                    message: 'Google Certificate Manager failed. Cloudflare configured as fallback.'
                };

            } catch (cfError: any) {
                console.error('[CloudRunAPI] Cloudflare fallback failed:', cfError);
                // Return original error if fallback also fails
                return {
                    success: false,
                    domain: normalizedDomain,
                    status: 'error',
                    error: result.error,
                    message: 'Could not create SSL neither on Google nor Cloudflare.'
                };
            }
        }

        // Update domain status in Firestore (Success path)
        await db.collection('customDomains').doc(normalizedDomain).update({
            cloudRunMappingCreated: true,
            cloudRunMappingStatus: result.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Also update user's domain collection
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update({
            cloudRunMappingCreated: true,
            cloudRunMappingStatus: result.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[CloudRunAPI] Domain mapping created for ${normalizedDomain}, status: ${result.status}`);

        return {
            success: true,
            domain: normalizedDomain,
            status: result.status,
            message: result.status === 'already_exists'
                ? 'Domain mapping already exists'
                : 'Domain mapping created. SSL certificate is being provisioned (may take up to 15 minutes).'
        };

    } catch (error: any) {
        console.error('[CloudRunAPI] createDomainMapping error:', error);
        // Only throw for unexpected internal errors, not for mapping creation failures
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Return error structure for other errors too
        return {
            success: false,
            domain: normalizedDomain,
            status: 'error',
            error: error.message || 'Unknown error'
        };
    }
});

/**
 * Check Cloud Run domain mapping status
 */
export const checkDomainMappingStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;

    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = domain.toLowerCase().trim().replace(/^www\./, '');

    try {
        // Step 1: Check Certificate Manager Status (New System)
        const certStatus = await getCertificateStatus(normalizedDomain);

        // Step 2: Check Legacy Cloud Run Mapping (Backward Compatibility)
        const cloudRunStatus = await getCloudRunDomainMappingStatus(normalizedDomain);

        const isReady = certStatus.ready || cloudRunStatus.ready;

        // If ready, update Firestore
        if (isReady) {
            await db.collection('customDomains').doc(normalizedDomain).update({
                sslStatus: 'active',
                status: 'active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(context.auth.uid).collection('domains').doc(normalizedDomain).update({
                sslStatus: 'active',
                status: 'active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            domain: normalizedDomain,
            exists: certStatus.status !== undefined || cloudRunStatus.exists,
            ready: isReady,
            certificateStatus: certStatus.ready ? 'active' : (certStatus.status || cloudRunStatus.certificateStatus),
            resourceRecords: cloudRunStatus.resourceRecords,
            error: null
        };

    } catch (error: any) {
        console.error('[CloudRunAPI] checkDomainMappingStatus error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Full domain setup: Creates both Cloudflare zone AND Cloud Run domain mapping
 * This is the "one-click" solution for external domains
 */
export const setupFullDomainMapping = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain, projectId } = data;
    const userId = context.auth.uid;

    if (!domain || typeof domain !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = domain.toLowerCase().trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('/')[0];

    try {
        console.log(`[CloudRunAPI] Full domain setup for: ${normalizedDomain}`);

        // Step 1: Create Certificate Manager entry (for SSL certificate)
        console.log(`[CloudRunAPI] Step 1: Creating Certificate Manager SSL entry...`);
        const certResult = await createCertificateManagerEntry(normalizedDomain);

        if (!certResult.success) {
            console.error(`[CloudRunAPI] Failed to create SSL entry:`, certResult.error);
        }

        // Step 2: Create Cloudflare zone and configure DNS (optional)
        let cloudflareResult = null;
        try {
            console.log(`[CloudRunAPI] Step 2: Configuring Cloudflare DNS...`);
            const { configureQuimeraDNS, enableStrictSSL } = await import('./cloudflareApi');
            cloudflareResult = await configureQuimeraDNS(normalizedDomain, projectId);
            await enableStrictSSL(cloudflareResult.zoneId);
        } catch (cfError: any) {
            console.warn(`[CloudRunAPI] Cloudflare setup warning:`, cfError.message);
        }

        // Step 3: Save domain configuration to Firestore
        const domainData: any = {
            domain: normalizedDomain,
            projectId: projectId || null,
            userId,
            status: certResult.success ? 'ssl_pending' : 'pending',
            sslStatus: certResult.success ? 'provisioning' : 'pending',
            dnsVerified: false,
            provider: 'External',
            // Load Balancer info (Model yooeat.com)
            useLoadBalancer: true,
            loadBalancerIp: CERT_MANAGER_CONFIG.loadBalancerIp,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add Cloudflare info if available
        if (cloudflareResult) {
            domainData.cloudflareZoneId = cloudflareResult.zoneId;
            domainData.cloudflareNameservers = cloudflareResult.nameservers;
            domainData.cloudflareConfigured = true;
        }

        // Save to Firestore
        await db.collection('customDomains').doc(normalizedDomain).set(domainData, { merge: true });
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).set({
            ...domainData,
            id: normalizedDomain,
            name: normalizedDomain,
        }, { merge: true });

        console.log(`[CloudRunAPI] Full domain setup complete for ${normalizedDomain}`);

        // Build response with DNS instructions
        const dnsInstructions = {
            aRecords: [CERT_MANAGER_CONFIG.loadBalancerIp],
            cnameTarget: null,
            message: 'Configure your domain A record to point to our Load Balancer IP'
        };

        return {
            success: true,
            domain: normalizedDomain,
            sslStatus: certResult.success ? 'provisioning' : 'error',
            cloudflareConfigured: !!cloudflareResult,
            nameservers: cloudflareResult?.nameservers || null,
            dnsInstructions,
            message: `Domain configured! Point your A record to ${CERT_MANAGER_CONFIG.loadBalancerIp}`
        };


    } catch (error: any) {
        console.error('[CloudRunAPI] setupFullDomainMapping error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
