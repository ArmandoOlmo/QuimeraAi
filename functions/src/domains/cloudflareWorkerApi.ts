/**
 * Cloudflare Worker API Integration
 * 
 * Automatically adds custom domains to the Cloudflare Worker
 * so they route through our domain routing system.
 */

import * as functions from 'firebase-functions';
import { CLOUDFLARE_CONFIG } from '../config';

// Cloudflare API Configuration
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const WORKER_NAME = 'quimera-router';

// Get credentials from centralized config
function getCloudflareCredentials(): { apiToken: string; accountId: string; zoneId?: string } {
    return {
        apiToken: CLOUDFLARE_CONFIG.workersToken,
        accountId: CLOUDFLARE_CONFIG.accountId,
        zoneId: CLOUDFLARE_CONFIG.zoneId
    };
}

/**
 * Add a custom domain to the Cloudflare Worker
 * This makes the domain route through our domain routing system
 */
export async function addDomainToWorker(domainName: string): Promise<{ success: boolean; error?: string }> {
    const { apiToken, accountId } = getCloudflareCredentials();
    
    if (!apiToken || !accountId) {
        console.error('[CloudflareWorker] Missing API credentials');
        return { success: false, error: 'Missing Cloudflare API credentials' };
    }

    const normalizedDomain = domainName.toLowerCase().trim();
    
    console.log(`[CloudflareWorker] Adding ${normalizedDomain} to Worker ${WORKER_NAME}`);

    try {
        // First, get the zone ID for this domain
        const zoneResponse = await fetch(
            `${CLOUDFLARE_API_URL}/zones?name=${normalizedDomain}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const zoneData = await zoneResponse.json() as any;
        
        if (!zoneData.success || !zoneData.result || zoneData.result.length === 0) {
            // Try to get zone for the root domain
            const rootDomain = normalizedDomain.split('.').slice(-2).join('.');
            const rootZoneResponse = await fetch(
                `${CLOUDFLARE_API_URL}/zones?name=${rootDomain}`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const rootZoneData = await rootZoneResponse.json() as any;
            
            if (!rootZoneData.success || !rootZoneData.result || rootZoneData.result.length === 0) {
                console.error('[CloudflareWorker] Zone not found for domain:', normalizedDomain);
                return { success: false, error: 'Domain zone not found in Cloudflare' };
            }
            
            zoneData.result = rootZoneData.result;
        }
        
        const zoneId = zoneData.result[0].id;
        console.log(`[CloudflareWorker] Found zone ${zoneId} for ${normalizedDomain}`);

        // Add the custom domain to the Worker
        // Using Workers for Platforms custom domains API
        const workerDomainResponse = await fetch(
            `${CLOUDFLARE_API_URL}/accounts/${accountId}/workers/domains`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    environment: 'production',
                    hostname: normalizedDomain,
                    service: WORKER_NAME,
                    zone_id: zoneId
                })
            }
        );

        const workerDomainData = await workerDomainResponse.json() as any;

        if (!workerDomainResponse.ok) {
            // If the domain already exists, that's fine
            if (workerDomainData.errors?.[0]?.message?.includes('already exists')) {
                console.log(`[CloudflareWorker] Domain ${normalizedDomain} already configured`);
                return { success: true };
            }
            
            console.error('[CloudflareWorker] Failed to add domain:', workerDomainData);
            return { 
                success: false, 
                error: workerDomainData.errors?.[0]?.message || 'Failed to add domain to Worker' 
            };
        }

        console.log(`[CloudflareWorker] ✅ Successfully added ${normalizedDomain} to Worker`);
        return { success: true };

    } catch (error: any) {
        console.error('[CloudflareWorker] Error adding domain to Worker:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove a custom domain from the Cloudflare Worker
 */
export async function removeDomainFromWorker(domainName: string): Promise<{ success: boolean; error?: string }> {
    const { apiToken, accountId } = getCloudflareCredentials();
    
    if (!apiToken || !accountId) {
        return { success: false, error: 'Missing Cloudflare API credentials' };
    }

    const normalizedDomain = domainName.toLowerCase().trim();
    
    console.log(`[CloudflareWorker] Removing ${normalizedDomain} from Worker`);

    try {
        // Get the domain ID first
        const listResponse = await fetch(
            `${CLOUDFLARE_API_URL}/accounts/${accountId}/workers/domains?hostname=${normalizedDomain}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const listData = await listResponse.json() as any;

        if (!listData.success || !listData.result || listData.result.length === 0) {
            console.log(`[CloudflareWorker] Domain ${normalizedDomain} not found in Worker`);
            return { success: true }; // Already removed
        }

        const domainId = listData.result[0].id;

        // Delete the domain
        const deleteResponse = await fetch(
            `${CLOUDFLARE_API_URL}/accounts/${accountId}/workers/domains/${domainId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const deleteData = await deleteResponse.json() as any;

        if (!deleteResponse.ok && !deleteData.success) {
            console.error('[CloudflareWorker] Failed to remove domain:', deleteData);
            return { success: false, error: deleteData.errors?.[0]?.message || 'Failed to remove domain' };
        }

        console.log(`[CloudflareWorker] ✅ Successfully removed ${normalizedDomain} from Worker`);
        return { success: true };

    } catch (error: any) {
        console.error('[CloudflareWorker] Error removing domain from Worker:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cloud Function to manually add a domain to the Worker
 */
export const addWorkerDomain = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    if (!domain) {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const result = await addDomainToWorker(domain);
    
    if (!result.success) {
        throw new functions.https.HttpsError('internal', result.error || 'Failed to add domain');
    }

    return { success: true, message: `Domain ${domain} added to Worker` };
});



