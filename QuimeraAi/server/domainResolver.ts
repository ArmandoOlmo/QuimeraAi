/**
 * Domain Resolver
 * 
 * Resolves custom domains to their associated projects using Firestore.
 * Uses a global collection for fast lookups.
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (for server-side)
let app: App;
let db: Firestore;

function initializeFirebase() {
    if (getApps().length === 0) {
        // In Cloud Run, credentials are automatic via service account
        // For local dev, use GOOGLE_APPLICATION_CREDENTIALS env var
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            app = initializeApp({
                credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            });
        } else {
            // Cloud Run: uses default credentials
            app = initializeApp();
        }
    } else {
        app = getApps()[0];
    }
    db = getFirestore(app);
}

// Initialize on module load
initializeFirebase();

export interface DomainResolutionResult {
    projectId: string;
    userId: string;
    domain: string;
    status: 'active' | 'pending' | 'verifying' | 'ssl_pending' | 'error';
    sslStatus: 'pending' | 'active' | 'error';
    storeData?: {
        name: string;
        theme?: any;
        header?: any;
    };
}

// In-memory cache for domain lookups (TTL: 5 minutes)
const domainCache = new Map<string, { data: DomainResolutionResult | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve a domain to its associated project
 * Uses caching for performance
 */
export async function resolveDomainToProject(domain: string): Promise<DomainResolutionResult | null> {
    // Normalize domain (lowercase, no www)
    const normalizedDomain = normalizeDomain(domain);
    
    // Check cache first
    const cached = domainCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[DomainResolver] Cache hit for ${normalizedDomain}`);
        return cached.data;
    }

    try {
        console.log(`[DomainResolver] Looking up ${normalizedDomain} in Firestore...`);
        
        // Query the global customDomains collection
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();

        if (!domainDoc.exists) {
            console.log(`[DomainResolver] Domain ${normalizedDomain} not found`);
            // Cache negative result
            domainCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
            return null;
        }

        const data = domainDoc.data()!;
        
        const result: DomainResolutionResult = {
            projectId: data.projectId,
            userId: data.userId,
            domain: data.domain,
            status: data.status || 'pending',
            sslStatus: data.sslStatus || 'pending'
        };

        // If domain is active, also fetch basic store data for SEO
        if (result.status === 'active') {
            try {
                const storeDoc = await db.collection('publicStores').doc(result.projectId).get();
                if (storeDoc.exists) {
                    const storeData = storeDoc.data()!;
                    result.storeData = {
                        name: storeData.name || 'Store',
                        theme: storeData.theme,
                        header: storeData.header
                    };
                }
            } catch (e) {
                console.warn(`[DomainResolver] Could not fetch store data for ${result.projectId}:`, e);
            }
        }

        // Cache the result
        domainCache.set(normalizedDomain, { data: result, timestamp: Date.now() });
        
        console.log(`[DomainResolver] Resolved ${normalizedDomain} -> Project ${result.projectId} (status: ${result.status})`);
        return result;

    } catch (error) {
        console.error(`[DomainResolver] Error resolving ${normalizedDomain}:`, error);
        return null;
    }
}

/**
 * Normalize domain name
 * - Lowercase
 * - Remove www. prefix
 * - Remove trailing dots
 */
function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '')
        .trim();
}

/**
 * Clear cache for a specific domain
 * Called when domain settings are updated
 */
export function clearDomainCache(domain: string): void {
    const normalized = normalizeDomain(domain);
    domainCache.delete(normalized);
    // Also clear www version
    domainCache.delete(`www.${normalized}`);
    console.log(`[DomainResolver] Cache cleared for ${normalized}`);
}

/**
 * Clear all domain cache
 */
export function clearAllDomainCache(): void {
    domainCache.clear();
    console.log('[DomainResolver] All cache cleared');
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): { size: number; entries: string[] } {
    return {
        size: domainCache.size,
        entries: Array.from(domainCache.keys())
    };
}











