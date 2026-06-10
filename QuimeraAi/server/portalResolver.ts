/**
 * Portal Resolver
 * 
 * Resolves custom portal domains to their associated tenant for white-label support.
 * Uses the Supabase tenants and custom_domains tables for lookups.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client (server-side with service role)
let supabaseAdmin: SupabaseClient;

function initializeSupabase() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('[PortalResolver] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Supabase configuration missing for portal resolver');
    }

    supabaseAdmin = createClient(url, key);
}

// Initialize on module load
initializeSupabase();

// =============================================================================
// TYPES
// =============================================================================

export interface TenantBranding {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    faviconUrl?: string;
    companyName?: string;
    customDomain?: string;
    customDomainVerified?: boolean;
    emailFromName?: string;
    emailFromAddress?: string;
    footerText?: string;
    supportEmail?: string;
    supportUrl?: string;
}

export interface TenantFeature {
    projects?: boolean;
    cms?: boolean;
    leads?: boolean;
    ecommerce?: boolean;
    chat?: boolean;
    email?: boolean;
    domains?: boolean;
    analytics?: boolean;
    api?: boolean;
}

export interface PortalResolutionResult {
    tenantId: string;
    tenantName: string;
    domain: string;
    status: 'active' | 'pending' | 'verifying' | 'ssl_pending' | 'error';
    sslStatus: 'pending' | 'active' | 'error';
    branding: TenantBranding;
    enabledFeatures: string[];
    subscriptionPlan: string;
    ownerUserId: string;
}

export interface PortalTheme {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    companyName: string;
    footerText: string;
}

export interface AgencyLandingResolutionResult {
    tenantId: string;
    landingId: string;
    subdomain?: string;
    customDomain?: string;
    isAgencyLanding: true;
    config: any; // AgencyLandingConfig
}

export type DomainResolutionResult = 
    | (PortalResolutionResult & { isAgencyLanding?: false })
    | AgencyLandingResolutionResult;

// =============================================================================
// CACHE
// =============================================================================

// In-memory cache for portal domain lookups (TTL: 5 minutes)
const portalCache = new Map<string, { data: PortalResolutionResult | null; timestamp: number }>();
const landingCache = new Map<string, { data: AgencyLandingResolutionResult | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// RESOLVER FUNCTIONS
// =============================================================================

/**
 * Resolve a portal domain to its associated tenant
 * Uses caching for performance
 */
export async function resolvePortalDomain(domain: string): Promise<PortalResolutionResult | null> {
    // Normalize domain (lowercase, no www)
    const normalizedDomain = normalizeDomain(domain);
    
    // Check cache first
    const cached = portalCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[PortalResolver] Cache hit for ${normalizedDomain}`);
        return cached.data;
    }

    try {
        console.log(`[PortalResolver] Looking up ${normalizedDomain} in Supabase...`);
        
        // Check tenants with matching branding.customDomain
        const { data: tenants, error } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('branding->>customDomain', normalizedDomain)
            .eq('branding->>customDomainVerified', 'true')
            .limit(1);

        if (error) {
            console.error(`[PortalResolver] Supabase query error:`, error);
            return null;
        }

        if (!tenants || tenants.length === 0) {
            console.log(`[PortalResolver] Portal domain ${normalizedDomain} not found`);
            // Cache negative result
            portalCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
            return null;
        }

        const tenantData = tenants[0];
        const result = buildPortalResult(tenantData.id, tenantData, normalizedDomain);
        portalCache.set(normalizedDomain, { data: result, timestamp: Date.now() });
        
        console.log(`[PortalResolver] Resolved ${normalizedDomain} -> Tenant ${result.tenantId} (${result.tenantName})`);
        return result;

    } catch (error) {
        console.error(`[PortalResolver] Error resolving ${normalizedDomain}:`, error);
        return null;
    }
}

/**
 * Build portal resolution result from tenant data
 */
function buildPortalResult(
    tenantId: string,
    tenantData: any,
    domain: string,
    status: string = 'active',
    sslStatus: string = 'active'
): PortalResolutionResult {
    const branding = tenantData.branding || {};
    const settings = tenantData.settings || {};
    
    return {
        tenantId,
        tenantName: tenantData.name || 'Portal',
        domain,
        status: status as any,
        sslStatus: sslStatus as any,
        branding: {
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor || '#4f46e5',
            secondaryColor: branding.secondaryColor || '#10b981',
            faviconUrl: branding.faviconUrl,
            companyName: branding.companyName || tenantData.name,
            customDomain: branding.customDomain,
            customDomainVerified: branding.customDomainVerified,
            footerText: branding.footerText,
            supportEmail: branding.supportEmail,
            supportUrl: branding.supportUrl,
        },
        enabledFeatures: settings.enabledFeatures || ['projects', 'cms', 'leads'],
        subscriptionPlan: tenantData.subscription_plan || 'free',
        ownerUserId: tenantData.owner_user_id,
    };
}

/**
 * Check if a hostname is a portal domain
 * Returns false for main app domains and development domains
 */
export function isPortalDomain(hostname: string): boolean {
    // Main app domains - not portals
    const mainDomains = [
        'quimera.ai',
        'www.quimera.ai',
        'app.quimera.ai',
        'quimeraai.web.app',
        'quimeraai.firebaseapp.com',
        'localhost',
    ];
    
    const normalized = normalizeDomain(hostname);
    
    // Check if it's a main domain
    if (mainDomains.some(d => normalized === d || normalized.endsWith(`.${d}`))) {
        return false;
    }
    
    // Check if it's a localhost or development domain
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) {
        return false;
    }
    
    // Check for common development patterns
    if (normalized.match(/^\d+\.\d+\.\d+\.\d+/)) {
        return false; // IP address
    }
    
    return true;
}

/**
 * Get portal theme configuration for SSR injection
 */
export function getPortalTheme(branding: TenantBranding): PortalTheme {
    return {
        primaryColor: branding.primaryColor || '#4f46e5',
        secondaryColor: branding.secondaryColor || '#10b981',
        logoUrl: branding.logoUrl || '',
        faviconUrl: branding.faviconUrl || '/favicon.ico',
        companyName: branding.companyName || 'Portal',
        footerText: branding.footerText || '',
    };
}

/**
 * Generate CSS variables for portal theme
 */
export function generatePortalCSS(theme: PortalTheme): string {
    // Convert hex to HSL for better theming
    const primaryHSL = hexToHSL(theme.primaryColor);
    const secondaryHSL = hexToHSL(theme.secondaryColor);
    
    return `
        :root {
            --portal-primary: ${theme.primaryColor};
            --portal-primary-h: ${primaryHSL.h};
            --portal-primary-s: ${primaryHSL.s}%;
            --portal-primary-l: ${primaryHSL.l}%;
            --portal-secondary: ${theme.secondaryColor};
            --portal-secondary-h: ${secondaryHSL.h};
            --portal-secondary-s: ${secondaryHSL.s}%;
            --portal-secondary-l: ${secondaryHSL.l}%;
            --primary: ${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%;
        }
    `;
}

/**
 * Generate portal meta tags for SSR
 */
export function generatePortalMetaTags(portal: PortalResolutionResult): string {
    const title = portal.branding.companyName || portal.tenantName;
    const favicon = portal.branding.faviconUrl || '/favicon.ico';
    
    return `
        <title>${escapeHtml(title)}</title>
        <link rel="icon" href="${escapeHtml(favicon)}" />
        <meta name="theme-color" content="${escapeHtml(portal.branding.primaryColor || '#4f46e5')}" />
        <meta property="og:site_name" content="${escapeHtml(title)}" />
    `;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize domain name
 */
function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '')
        .replace(/:\d+$/, '') // Remove port
        .trim();
}

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace(/^#/, '');
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// =============================================================================
// AGENCY LANDING RESOLUTION
// =============================================================================

/**
 * Check if a domain is an agency landing subdomain
 * Format: {subdomain}.quimera.ai or {subdomain}.quimeraai.web.app
 */
export function isAgencyLandingSubdomain(hostname: string): boolean {
    const normalized = normalizeDomain(hostname);
    
    // Check for quimera.ai subdomains (not www, app, api)
    const quimeraMatch = normalized.match(/^([a-z0-9-]+)\.quimera\.ai$/);
    if (quimeraMatch) {
        const subdomain = quimeraMatch[1];
        const reservedSubdomains = ['www', 'app', 'api', 'admin', 'help', 'support', 'blog', 'docs', 'portal'];
        return !reservedSubdomains.includes(subdomain);
    }
    
    return false;
}

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): string | null {
    const normalized = normalizeDomain(hostname);
    
    const quimeraMatch = normalized.match(/^([a-z0-9-]+)\.quimera\.ai$/);
    if (quimeraMatch) {
        return quimeraMatch[1];
    }
    
    return null;
}

/**
 * Resolve agency landing by subdomain
 * Uses the tenants table with settings->>agencyLandingSubdomain
 */
export async function resolveAgencyLanding(subdomain: string): Promise<AgencyLandingResolutionResult | null> {
    const cacheKey = `landing:${subdomain}`;
    const cached = landingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[PortalResolver] Landing cache hit for ${subdomain}`);
        return cached.data;
    }

    try {
        console.log(`[PortalResolver] Looking up agency landing for subdomain: ${subdomain}`);
        
        // Query tenants where settings has agencyLandingSubdomain matching
        const { data: tenants, error } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('settings->>agencyLandingSubdomain', subdomain)
            .eq('status', 'active')
            .limit(1);

        if (error || !tenants || tenants.length === 0) {
            console.log(`[PortalResolver] No landing found for subdomain ${subdomain}`);
            landingCache.set(cacheKey, { data: null, timestamp: Date.now() });
            return null;
        }

        const tenant = tenants[0];
        const landingConfig = tenant.settings?.agencyLanding || tenant.settings || {};

        const result: AgencyLandingResolutionResult = {
            tenantId: tenant.id,
            landingId: tenant.id,
            subdomain,
            customDomain: tenant.branding?.customDomain,
            isAgencyLanding: true,
            config: landingConfig,
        };

        landingCache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`[PortalResolver] Resolved landing ${subdomain} -> Tenant ${result.tenantId}`);
        
        return result;

    } catch (error) {
        console.error(`[PortalResolver] Error resolving agency landing ${subdomain}:`, error);
        return null;
    }
}

/**
 * Resolve agency landing by custom domain
 * Checks both the custom_domains table and the tenants table
 */
export async function resolveAgencyLandingByDomain(domain: string): Promise<AgencyLandingResolutionResult | null> {
    const normalized = normalizeDomain(domain);
    const cacheKey = `landing-domain:${normalized}`;
    
    const cached = landingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        // CHECK 1: custom_domains table with agency_landing_tenant_id
        const { data: domainRows } = await supabaseAdmin
            .from('custom_domains')
            .select('*')
            .eq('domain_name', normalized)
            .limit(1);

        if (domainRows && domainRows.length > 0) {
            const cdData = domainRows[0];
            
            if (cdData.agency_landing_tenant_id) {
                console.log(`[PortalResolver] Found agency_landing_tenant_id in custom_domains: ${cdData.agency_landing_tenant_id}`);
                
                // Fetch the tenant to get the landing config
                const { data: tenant } = await supabaseAdmin
                    .from('tenants')
                    .select('*')
                    .eq('id', cdData.agency_landing_tenant_id)
                    .single();
                
                if (tenant) {
                    const landingConfig = tenant.settings?.agencyLanding || tenant.settings || {};
                    
                    const result: AgencyLandingResolutionResult = {
                        tenantId: cdData.agency_landing_tenant_id,
                        landingId: tenant.id,
                        subdomain: tenant.settings?.agencyLandingSubdomain,
                        customDomain: normalized,
                        isAgencyLanding: true,
                        config: landingConfig,
                    };

                    landingCache.set(cacheKey, { data: result, timestamp: Date.now() });
                    console.log(`[PortalResolver] Resolved landing by domain (custom_domains): ${normalized} -> Tenant ${result.tenantId}`);
                    return result;
                }
            }
        }

        // CHECK 2: tenants where branding.customDomain matches and has agency landing enabled
        const { data: tenants } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('branding->>customDomain', normalized)
            .limit(1);

        if (tenants && tenants.length > 0) {
            const tenant = tenants[0];
            const hasLanding = tenant.settings?.agencyLanding?.enabled || tenant.settings?.agencyLandingSubdomain;
            
            if (hasLanding) {
                const landingConfig = tenant.settings?.agencyLanding || {};
                
                const result: AgencyLandingResolutionResult = {
                    tenantId: tenant.id,
                    landingId: tenant.id,
                    subdomain: tenant.settings?.agencyLandingSubdomain,
                    customDomain: normalized,
                    isAgencyLanding: true,
                    config: landingConfig,
                };

                landingCache.set(cacheKey, { data: result, timestamp: Date.now() });
                console.log(`[PortalResolver] Resolved landing by domain (tenants): ${normalized} -> Tenant ${tenant.id}`);
                return result;
            }
        }

        landingCache.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;

    } catch (error) {
        console.error(`[PortalResolver] Error resolving landing by domain ${domain}:`, error);
        return null;
    }
}

/**
 * Universal domain resolver - determines if portal or landing
 */
export async function resolveDomain(hostname: string): Promise<DomainResolutionResult | null> {
    const normalized = normalizeDomain(hostname);

    // Check if it's an agency landing subdomain first
    if (isAgencyLandingSubdomain(hostname)) {
        const subdomain = extractSubdomain(hostname);
        if (subdomain) {
            const landingResult = await resolveAgencyLanding(subdomain);
            if (landingResult) {
                return landingResult;
            }
        }
    }

    // Check for custom domain landing
    const customDomainLanding = await resolveAgencyLandingByDomain(normalized);
    if (customDomainLanding) {
        return customDomainLanding;
    }

    // Fall back to portal resolution
    const portalResult = await resolvePortalDomain(hostname);
    if (portalResult) {
        return { ...portalResult, isAgencyLanding: false };
    }

    return null;
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Clear cache for a specific portal domain
 */
export function clearPortalCache(domain: string): void {
    const normalized = normalizeDomain(domain);
    portalCache.delete(normalized);
    portalCache.delete(`www.${normalized}`);
    console.log(`[PortalResolver] Cache cleared for ${normalized}`);
}

/**
 * Clear cache for a tenant (all associated domains)
 */
export async function clearTenantPortalCache(tenantId: string): Promise<void> {
    try {
        const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('branding')
            .eq('id', tenantId)
            .single();

        if (tenant?.branding?.customDomain) {
            clearPortalCache(tenant.branding.customDomain);
        }
    } catch (e) {
        console.warn(`[PortalResolver] Could not clear cache for tenant ${tenantId}:`, e);
    }
    
    console.log(`[PortalResolver] Cache cleared for tenant ${tenantId}`);
}

/**
 * Clear all portal cache
 */
export function clearAllPortalCache(): void {
    portalCache.clear();
    landingCache.clear();
    console.log('[PortalResolver] All cache cleared');
}

/**
 * Clear cache for an agency landing
 */
export function clearAgencyLandingCache(subdomain?: string, customDomain?: string): void {
    if (subdomain) {
        landingCache.delete(`landing:${subdomain}`);
    }
    if (customDomain) {
        landingCache.delete(`landing-domain:${normalizeDomain(customDomain)}`);
    }
    console.log(`[PortalResolver] Landing cache cleared for ${subdomain || customDomain}`);
}

/**
 * Get cache stats for monitoring
 */
export function getPortalCacheStats(): { size: number; entries: string[] } {
    return {
        size: portalCache.size,
        entries: Array.from(portalCache.keys())
    };
}
