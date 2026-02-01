/**
 * Cloudflare DNS API Integration
 * 
 * Automatically configures DNS records for purchased domains
 * API Docs: https://developers.cloudflare.com/api
 */

import * as functions from 'firebase-functions';
import { CLOUDFLARE_CONFIG } from '../config';

// Cloudflare API Configuration
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';

// Credential types
interface CloudflareCredentials {
    type: 'token' | 'global_key';
    apiToken?: string;
    globalApiKey?: string;
    email?: string;
    accountId: string;
}

// Get credentials from centralized config
function getCloudflareCredentials(): CloudflareCredentials {
    // First, check for Global API Key (has full permissions including zone.create)
    const globalApiKey = CLOUDFLARE_CONFIG.globalApiKey;
    const email = CLOUDFLARE_CONFIG.email;
    
    if (globalApiKey && email) {
        console.log('[Cloudflare] Using Global API Key authentication');
        return {
            type: 'global_key',
            globalApiKey,
            email,
            accountId: CLOUDFLARE_CONFIG.accountId
        };
    }
    
    // Fallback to API Token
    const apiToken = CLOUDFLARE_CONFIG.apiToken;
    
    return {
        type: 'token',
        apiToken,
        accountId: CLOUDFLARE_CONFIG.accountId
    };
}

// =============================================================================
// TYPES
// =============================================================================

interface CloudflareResponse<T> {
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    messages: string[];
    result: T;
}

interface DNSZone {
    id: string;
    name: string;
    status: string;
    name_servers: string[];
}

interface DNSRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function cloudflareRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any
): Promise<T> {
    const credentials = getCloudflareCredentials();
    
    // Build headers based on credential type
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    if (credentials.type === 'global_key') {
        // Global API Key uses X-Auth-Email and X-Auth-Key headers
        if (!credentials.globalApiKey || !credentials.email) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Cloudflare Global API Key or email not configured'
            );
        }
        headers['X-Auth-Email'] = credentials.email;
        headers['X-Auth-Key'] = credentials.globalApiKey;
    } else {
        // API Token uses Bearer authorization
        if (!credentials.apiToken) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Cloudflare API token not configured'
            );
        }
        headers['Authorization'] = `Bearer ${credentials.apiToken}`;
    }

    const url = `${CLOUDFLARE_API_URL}${endpoint}`;

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data: CloudflareResponse<T> = await response.json();

    if (!data.success) {
        const errorMsg = data.errors.map(e => e.message).join(', ');
        console.error(`[Cloudflare] API Error: ${errorMsg}`);
        throw new functions.https.HttpsError('internal', `Cloudflare API error: ${errorMsg}`);
    }

    return data.result;
}

// =============================================================================
// DNS ZONE MANAGEMENT
// =============================================================================

/**
 * Create a new DNS zone for a domain
 */
export async function createDNSZone(domainName: string): Promise<DNSZone> {
    const { accountId } = getCloudflareCredentials();
    
    if (!accountId) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Cloudflare account ID not configured'
        );
    }

    console.log(`[Cloudflare] Creating DNS zone for ${domainName}`);

    try {
        const zone = await cloudflareRequest<DNSZone>('/zones', 'POST', {
            name: domainName,
            account: { id: accountId },
            jump_start: true, // Auto-import existing DNS records
            type: 'full' // Full DNS management
        });

        console.log(`[Cloudflare] Zone created: ${zone.id}, nameservers: ${zone.name_servers.join(', ')}`);
        return zone;
    } catch (error: any) {
        // Check if zone already exists
        if (error.message?.includes('already exists')) {
            console.log(`[Cloudflare] Zone already exists for ${domainName}, fetching...`);
            return getZoneByName(domainName);
        }
        throw error;
    }
}

/**
 * Get a DNS zone by domain name
 */
export async function getZoneByName(domainName: string): Promise<DNSZone> {
    const zones = await cloudflareRequest<DNSZone[]>(`/zones?name=${domainName}`);
    
    if (!zones || zones.length === 0) {
        throw new functions.https.HttpsError('not-found', `Zone not found for ${domainName}`);
    }

    return zones[0];
}

/**
 * Get zone status (pending, active, etc.)
 */
export async function getZoneStatus(zoneId: string): Promise<string> {
    const zone = await cloudflareRequest<DNSZone>(`/zones/${zoneId}`);
    return zone.status;
}

// =============================================================================
// DNS RECORDS MANAGEMENT
// =============================================================================

/**
 * Add DNS record to a zone
 */
export async function addDNSRecord(
    zoneId: string,
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS',
    name: string,
    content: string,
    proxied: boolean = true,
    ttl: number = 1 // 1 = automatic
): Promise<DNSRecord> {
    console.log(`[Cloudflare] Adding ${type} record: ${name} -> ${content}`);

    return cloudflareRequest<DNSRecord>(`/zones/${zoneId}/dns_records`, 'POST', {
        type,
        name,
        content,
        proxied: type === 'A' || type === 'AAAA' || type === 'CNAME' ? proxied : false,
        ttl
    });
}

/**
 * Get all DNS records for a zone
 */
export async function getDNSRecords(zoneId: string): Promise<DNSRecord[]> {
    return cloudflareRequest<DNSRecord[]>(`/zones/${zoneId}/dns_records`);
}

/**
 * Delete a DNS record
 */
export async function deleteDNSRecord(zoneId: string, recordId: string): Promise<void> {
    await cloudflareRequest<any>(`/zones/${zoneId}/dns_records/${recordId}`, 'DELETE');
}

// =============================================================================
// QUIMERA DEFAULT DNS CONFIGURATION
// =============================================================================

// Cloud Run URL for custom domains (bypasses Firebase Hosting)
const CLOUD_RUN_URL = 'quimera-ssr-575386543550.us-central1.run.app';

/**
 * Configure DNS records for a Quimera-hosted domain
 * Uses CNAME pointing to Cloud Run for automatic domain routing
 */
export async function configureQuimeraDNS(
    domainName: string,
    projectId?: string
): Promise<{
    success: boolean;
    zoneId: string;
    nameservers: string[];
    records: DNSRecord[];
}> {
    console.log(`[Cloudflare] Configuring Quimera DNS for ${domainName} -> Cloud Run`);

    // 1. Create or get the DNS zone
    const zone = await createDNSZone(domainName);

    const records: DNSRecord[] = [];

    // 2. Delete any existing A records for root domain (clean up old config)
    try {
        const existingRecords = await getDNSRecords(zone.id);
        for (const record of existingRecords) {
            if (record.type === 'A' && (record.name === domainName || record.name === '@')) {
                console.log(`[Cloudflare] Deleting old A record: ${record.content}`);
                await deleteDNSRecord(zone.id, record.id);
            }
        }
    } catch (error: any) {
        console.warn(`[Cloudflare] Could not clean up old records:`, error.message);
    }

    // 3. Add CNAME for root domain pointing to Cloud Run
    // Note: Cloudflare supports CNAME flattening for root domains
    try {
        const rootRecord = await addDNSRecord(zone.id, 'CNAME', '@', CLOUD_RUN_URL, true);
        records.push(rootRecord);
        console.log(`[Cloudflare] Added root CNAME: @ -> ${CLOUD_RUN_URL}`);
    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            console.log(`[Cloudflare] Root CNAME already exists`);
        } else {
            console.error(`[Cloudflare] Failed to add root CNAME:`, error);
        }
    }

    // 4. Add CNAME for www subdomain pointing to Cloud Run
    try {
        const wwwRecord = await addDNSRecord(zone.id, 'CNAME', 'www', CLOUD_RUN_URL, true);
        records.push(wwwRecord);
        console.log(`[Cloudflare] Added www CNAME: www -> ${CLOUD_RUN_URL}`);
    } catch (error: any) {
        if (!error.message?.includes('already exists')) {
            console.error(`[Cloudflare] Failed to add www CNAME:`, error);
        }
    }

    // 5. Add TXT record for Quimera verification
    try {
        const txtRecord = await addDNSRecord(
            zone.id,
            'TXT',
            '@',
            `quimera-project=${projectId || 'pending'}`,
            false
        );
        records.push(txtRecord);
    } catch (error: any) {
        if (!error.message?.includes('already exists')) {
            console.error(`[Cloudflare] Failed to add TXT record:`, error);
        }
    }

    console.log(`[Cloudflare] DNS configured for ${domainName}:`, {
        zoneId: zone.id,
        nameservers: zone.name_servers,
        recordCount: records.length,
        target: CLOUD_RUN_URL
    });

    return {
        success: true,
        zoneId: zone.id,
        nameservers: zone.name_servers,
        records
    };
}

// =============================================================================
// SSL/TLS CONFIGURATION
// =============================================================================

/**
 * Enable Full (Strict) SSL for a zone
 */
export async function enableStrictSSL(zoneId: string): Promise<void> {
    console.log(`[Cloudflare] Enabling strict SSL for zone ${zoneId}`);

    await cloudflareRequest(`/zones/${zoneId}/settings/ssl`, 'PATCH', {
        value: 'full'
    });

    // Also enable Always Use HTTPS
    await cloudflareRequest(`/zones/${zoneId}/settings/always_use_https`, 'PATCH', {
        value: 'on'
    });

    // Enable automatic HTTPS rewrites
    await cloudflareRequest(`/zones/${zoneId}/settings/automatic_https_rewrites`, 'PATCH', {
        value: 'on'
    });

    console.log(`[Cloudflare] SSL configured for zone ${zoneId}`);
}

// =============================================================================
// CLOUD FUNCTIONS
// =============================================================================

/**
 * Setup DNS for a newly purchased domain
 * Called after domain registration with Name.com
 */
export const setupDomainDNS = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domainName, projectId } = data;

    if (!domainName) {
        throw new functions.https.HttpsError('invalid-argument', 'domainName is required');
    }

    try {
        // Configure DNS
        const dnsResult = await configureQuimeraDNS(domainName, projectId);

        // Enable SSL
        await enableStrictSSL(dnsResult.zoneId);

        return {
            success: true,
            zoneId: dnsResult.zoneId,
            nameservers: dnsResult.nameservers,
            instructions: `Please update your domain's nameservers at Name.com to: ${dnsResult.nameservers.join(', ')}`
        };

    } catch (error: any) {
        console.error('[Cloudflare] Setup DNS error:', error);
        throw error instanceof functions.https.HttpsError
            ? error
            : new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get DNS zone status
 */
export const getDomainDNSStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domainName } = data;

    if (!domainName) {
        throw new functions.https.HttpsError('invalid-argument', 'domainName is required');
    }

    try {
        const zone = await getZoneByName(domainName);
        const records = await getDNSRecords(zone.id);

        return {
            zoneId: zone.id,
            status: zone.status,
            nameservers: zone.name_servers,
            records: records.map(r => ({
                type: r.type,
                name: r.name,
                content: r.content,
                proxied: r.proxied
            }))
        };

    } catch (error: any) {
        if (error.code === 'not-found') {
            return { status: 'not_configured' };
        }
        throw error instanceof functions.https.HttpsError
            ? error
            : new functions.https.HttpsError('internal', error.message);
    }
});
