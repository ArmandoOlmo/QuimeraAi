/**
 * GCP Certificate Manager Integration
 * 
 * Creates and manages Google-managed SSL certificates for custom domains
 * using the Google Cloud Certificate Manager API.
 * 
 * Infrastructure:
 * - Load Balancer: quimera-domains-lb (IP: 130.211.43.242)
 * - Certificate Map: quimera-cert-map
 * - Backend: quimera-ssr-backend → Cloud Run SSR
 */

import { google } from 'googleapis';

const PROJECT_ID = 'quimeraai';
const LOCATION = 'global';
const CERT_MAP_NAME = 'quimera-cert-map';

/**
 * Get authenticated client for GCP APIs
 * In Cloud Functions, this uses the default service account automatically
 */
async function getAuthClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return auth.getClient();
}

/**
 * Sanitize domain name into a valid GCP resource name
 * GCP resource names must match: [a-z0-9-]+
 */
function domainToResourceName(domain: string): string {
    return domain
        .toLowerCase()
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 60); // GCP max length
}

/**
 * Create a Google-managed SSL certificate for a domain
 * Automatically handles both root and www subdomains
 */
export async function createDomainCertificate(domain: string): Promise<{
    success: boolean;
    certName: string;
    state: string;
    error?: string;
}> {
    const certName = `${domainToResourceName(domain)}-cert`;
    
    try {
        const authClient = await getAuthClient();
        const url = `https://certificatemanager.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/certificates?certificateId=${certName}`;
        
        const response = await authClient.request({
            url,
            method: 'POST',
            data: {
                managed: {
                    domains: [domain, `www.${domain}`],
                },
            },
        });

        console.log(`[CertManager] Created certificate ${certName} for ${domain}`, response.status);

        // Wait for operation to complete (it's usually fast for the create request)
        const operation = (response as any).data;
        if (operation?.name) {
            await waitForOperation(authClient, operation.name);
        }

        return {
            success: true,
            certName,
            state: 'PROVISIONING',
        };
    } catch (error: any) {
        // If cert already exists, that's fine
        if (error?.response?.status === 409) {
            console.log(`[CertManager] Certificate ${certName} already exists, reusing`);
            return {
                success: true,
                certName,
                state: 'EXISTING',
            };
        }
        console.error(`[CertManager] Error creating certificate:`, error?.response?.data || error.message);
        return {
            success: false,
            certName,
            state: 'ERROR',
            error: error?.response?.data?.error?.message || error.message,
        };
    }
}

/**
 * Create certificate map entries for a domain in quimera-cert-map
 * Creates entries for both root domain and www subdomain
 */
export async function createCertMapEntries(domain: string, certName: string): Promise<{
    success: boolean;
    entries: string[];
    error?: string;
}> {
    const rootEntryName = `${domainToResourceName(domain)}-entry`;
    const wwwEntryName = `${domainToResourceName(domain)}-www-entry`;
    const entries: string[] = [];

    try {
        const authClient = await getAuthClient();
        const certFullName = `projects/${PROJECT_ID}/locations/${LOCATION}/certificates/${certName}`;
        const mapPath = `projects/${PROJECT_ID}/locations/${LOCATION}/certificateMaps/${CERT_MAP_NAME}`;

        // Create root domain entry
        try {
            const rootUrl = `https://certificatemanager.googleapis.com/v1/${mapPath}/certificateMapEntries?certificateMapEntryId=${rootEntryName}`;
            const rootResponse = await authClient.request({
                url: rootUrl,
                method: 'POST',
                data: {
                    hostname: domain,
                    certificates: [certFullName],
                },
            });

            const rootOp = (rootResponse as any).data;
            if (rootOp?.name) await waitForOperation(authClient, rootOp.name);
            entries.push(rootEntryName);
            console.log(`[CertManager] Created cert map entry for ${domain}`);
        } catch (error: any) {
            if (error?.response?.status === 409) {
                console.log(`[CertManager] Entry ${rootEntryName} already exists`);
                entries.push(rootEntryName);
            } else {
                throw error;
            }
        }

        // Create www subdomain entry
        try {
            const wwwUrl = `https://certificatemanager.googleapis.com/v1/${mapPath}/certificateMapEntries?certificateMapEntryId=${wwwEntryName}`;
            const wwwResponse = await authClient.request({
                url: wwwUrl,
                method: 'POST',
                data: {
                    hostname: `www.${domain}`,
                    certificates: [certFullName],
                },
            });

            const wwwOp = (wwwResponse as any).data;
            if (wwwOp?.name) await waitForOperation(authClient, wwwOp.name);
            entries.push(wwwEntryName);
            console.log(`[CertManager] Created cert map entry for www.${domain}`);
        } catch (error: any) {
            if (error?.response?.status === 409) {
                console.log(`[CertManager] Entry ${wwwEntryName} already exists`);
                entries.push(wwwEntryName);
            } else {
                throw error;
            }
        }

        return { success: true, entries };
    } catch (error: any) {
        console.error(`[CertManager] Error creating cert map entries:`, error?.response?.data || error.message);
        return {
            success: false,
            entries,
            error: error?.response?.data?.error?.message || error.message,
        };
    }
}

/**
 * Delete certificate map entries and certificate for a domain
 * Called when removing a custom domain
 */
export async function deleteDomainCertificate(domain: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const certName = `${domainToResourceName(domain)}-cert`;
    const rootEntryName = `${domainToResourceName(domain)}-entry`;
    const wwwEntryName = `${domainToResourceName(domain)}-www-entry`;

    try {
        const authClient = await getAuthClient();
        const mapPath = `projects/${PROJECT_ID}/locations/${LOCATION}/certificateMaps/${CERT_MAP_NAME}`;

        // Delete entries first (must be done before deleting cert)
        for (const entryName of [rootEntryName, wwwEntryName]) {
            try {
                const deleteUrl = `https://certificatemanager.googleapis.com/v1/${mapPath}/certificateMapEntries/${entryName}`;
                const deleteResponse = await authClient.request({ url: deleteUrl, method: 'DELETE' });
                const deleteOp = (deleteResponse as any).data;
                if (deleteOp?.name) await waitForOperation(authClient, deleteOp.name);
                console.log(`[CertManager] Deleted cert map entry: ${entryName}`);
            } catch (error: any) {
                if (error?.response?.status !== 404) {
                    console.warn(`[CertManager] Error deleting entry ${entryName}:`, error?.response?.data || error.message);
                }
            }
        }

        // Delete the certificate
        try {
            const certUrl = `https://certificatemanager.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/certificates/${certName}`;
            const certResponse = await authClient.request({ url: certUrl, method: 'DELETE' });
            const certOp = (certResponse as any).data;
            if (certOp?.name) await waitForOperation(authClient, certOp.name);
            console.log(`[CertManager] Deleted certificate: ${certName}`);
        } catch (error: any) {
            if (error?.response?.status !== 404) {
                console.warn(`[CertManager] Error deleting certificate:`, error?.response?.data || error.message);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error(`[CertManager] Error in deleteDomainCertificate:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Check the provisioning status of a domain's SSL certificate
 */
export async function checkCertificateStatus(domain: string): Promise<{
    exists: boolean;
    state: string;
    domains: string[];
    error?: string;
}> {
    const certName = `${domainToResourceName(domain)}-cert`;

    try {
        const authClient = await getAuthClient();
        const url = `https://certificatemanager.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/certificates/${certName}`;

        const response = await authClient.request({ url, method: 'GET' });
        const cert = (response as any).data;

        return {
            exists: true,
            state: cert?.managed?.state || 'UNKNOWN',
            domains: cert?.managed?.domains || [],
        };
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return { exists: false, state: 'NOT_FOUND', domains: [] };
        }
        console.error(`[CertManager] Error checking cert status:`, error?.response?.data || error.message);
        return {
            exists: false,
            state: 'ERROR',
            domains: [],
            error: error?.response?.data?.error?.message || error.message,
        };
    }
}

/**
 * Full domain SSL setup: Create cert + cert-map entries
 * This is the main function called from domainManager
 */
export async function setupDomainSSL(domain: string): Promise<{
    success: boolean;
    certName: string;
    state: string;
    error?: string;
}> {
    console.log(`[CertManager] === Setting up SSL for ${domain} ===`);

    // Step 1: Create certificate
    const certResult = await createDomainCertificate(domain);
    if (!certResult.success) {
        return {
            success: false,
            certName: certResult.certName,
            state: 'ERROR',
            error: `Failed to create certificate: ${certResult.error}`,
        };
    }

    // Step 2: Create cert-map entries
    const entriesResult = await createCertMapEntries(domain, certResult.certName);
    if (!entriesResult.success) {
        return {
            success: false,
            certName: certResult.certName,
            state: 'ERROR',
            error: `Failed to create cert map entries: ${entriesResult.error}`,
        };
    }

    console.log(`[CertManager] === SSL setup complete for ${domain} (state: ${certResult.state}) ===`);

    return {
        success: true,
        certName: certResult.certName,
        state: certResult.state,
    };
}

/**
 * Wait for a long-running operation to complete
 */
async function waitForOperation(authClient: any, operationName: string, maxWaitMs = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
        try {
            const url = `https://certificatemanager.googleapis.com/v1/${operationName}`;
            const response = await authClient.request({ url, method: 'GET' });
            const operation = (response as any).data;

            if (operation.done) {
                if (operation.error) {
                    console.warn(`[CertManager] Operation completed with error:`, operation.error);
                }
                return;
            }
        } catch (error: any) {
            console.warn(`[CertManager] Error polling operation:`, error.message);
        }

        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.warn(`[CertManager] Operation ${operationName} timed out after ${maxWaitMs}ms`);
}
