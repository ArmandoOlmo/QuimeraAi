/**
 * Domain Resolver
 * 
 * Resolves custom domains to their associated projects using Supabase.
 * Uses the custom_domains and projects tables for lookups.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Admin client (server-side, bypasses RLS)
let supabaseAdmin: SupabaseClient;

function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseAdmin) {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        supabaseAdmin = createClient(url, key);
    }
    return supabaseAdmin;
}

export interface DomainResolutionResult {
    projectId: string;
    userId: string;
    domain: string;
    status: 'active' | 'pending' | 'verifying' | 'ssl_pending' | 'error';
    sslStatus: 'pending' | 'active' | 'error';
    /** When set, this domain serves an agency landing page instead of a project */
    agencyLandingTenantId?: string;
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
        const sb = getSupabaseAdmin();
        console.log(`[DomainResolver] Looking up ${normalizedDomain} in Supabase...`);
        
        // Query the custom_domains table
        const { data: domainRow, error: domainError } = await sb
            .from('custom_domains')
            .select('*')
            .eq('domain_name', normalizedDomain)
            .single();

        if (domainError || !domainRow) {
            console.log(`[DomainResolver] Domain ${normalizedDomain} not found`);
            // Cache negative result
            domainCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
            return null;
        }

        const domainData = domainRow.data || {};
        const result: DomainResolutionResult = {
            projectId: domainData.projectId || domainData.project_id || domainRow.project_id,
            userId: domainRow.user_id || domainData.userId || domainData.user_id,
            domain: domainRow.domain_name || domainData.domain,
            status: domainData.status || domainRow.status || 'pending',
            sslStatus: domainData.sslStatus || domainData.ssl_status || domainRow.ssl_status || 'pending',
            agencyLandingTenantId: domainRow.agency_landing_tenant_id || undefined,
        };

        // If domain is active, also fetch basic store data for SEO
        if (result.status === 'active') {
            try {
                const { data: projectRow } = await sb
                    .from('projects')
                    .select('published_data')
                    .eq('id', result.projectId)
                    .not('published_data', 'is', null)
                    .single();

                if (projectRow?.published_data) {
                    const pd = projectRow.published_data as any;
                    result.storeData = {
                        name: pd.name || 'Store',
                        theme: pd.theme,
                        header: pd.header,
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
