/**
 * Portal Resolver
 * 
 * Resolves custom portal domains to their associated tenant for white-label support.
 * Uses the portalDomains collection in Firestore for lookups.
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

// =============================================================================
// CACHE
// =============================================================================

// In-memory cache for portal domain lookups (TTL: 5 minutes)
const portalCache = new Map<string, { data: PortalResolutionResult | null; timestamp: number }>();
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
        console.log(`[PortalResolver] Looking up ${normalizedDomain} in Firestore...`);
        
        // Query the portalDomains collection
        const domainDoc = await db.collection('portalDomains').doc(normalizedDomain).get();

        if (!domainDoc.exists) {
            console.log(`[PortalResolver] Portal domain ${normalizedDomain} not found`);
            
            // Also check if it's a tenant with branding.customDomain
            const tenantQuery = await db.collection('tenants')
                .where('branding.customDomain', '==', normalizedDomain)
                .where('branding.customDomainVerified', '==', true)
                .limit(1)
                .get();
            
            if (tenantQuery.empty) {
                // Cache negative result
                portalCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
                return null;
            }
            
            // Found via tenant query
            const tenantDoc = tenantQuery.docs[0];
            const tenantData = tenantDoc.data();
            
            const result = buildPortalResult(tenantDoc.id, tenantData, normalizedDomain);
            portalCache.set(normalizedDomain, { data: result, timestamp: Date.now() });
            return result;
        }

        const data = domainDoc.data()!;
        
        // Fetch full tenant data
        const tenantDoc = await db.collection('tenants').doc(data.tenantId).get();
        
        if (!tenantDoc.exists) {
            console.log(`[PortalResolver] Tenant ${data.tenantId} not found for domain ${normalizedDomain}`);
            portalCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
            return null;
        }
        
        const tenantData = tenantDoc.data()!;
        const result = buildPortalResult(data.tenantId, tenantData, normalizedDomain, data.status, data.sslStatus);
        
        // Cache the result
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
    tenantData: FirebaseFirestore.DocumentData,
    domain: string,
    status: string = 'active',
    sslStatus: string = 'active'
): PortalResolutionResult {
    return {
        tenantId,
        tenantName: tenantData.name || 'Portal',
        domain,
        status: status as any,
        sslStatus: sslStatus as any,
        branding: {
            logoUrl: tenantData.branding?.logoUrl,
            primaryColor: tenantData.branding?.primaryColor || '#4f46e5',
            secondaryColor: tenantData.branding?.secondaryColor || '#10b981',
            faviconUrl: tenantData.branding?.faviconUrl,
            companyName: tenantData.branding?.companyName || tenantData.name,
            customDomain: tenantData.branding?.customDomain,
            customDomainVerified: tenantData.branding?.customDomainVerified,
            footerText: tenantData.branding?.footerText,
            supportEmail: tenantData.branding?.supportEmail,
            supportUrl: tenantData.branding?.supportUrl,
        },
        enabledFeatures: tenantData.settings?.enabledFeatures || ['projects', 'cms', 'leads'],
        subscriptionPlan: tenantData.subscriptionPlan || 'free',
        ownerUserId: tenantData.ownerUserId,
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
 * - Lowercase
 * - Remove www. prefix
 * - Remove trailing dots
 * - Remove port
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
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex
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
    // Get tenant to find custom domain
    try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (tenantDoc.exists) {
            const customDomain = tenantDoc.data()?.branding?.customDomain;
            if (customDomain) {
                clearPortalCache(customDomain);
            }
        }
    } catch (e) {
        console.warn(`[PortalResolver] Could not clear cache for tenant ${tenantId}:`, e);
    }
    
    // Also clear any entries from portalDomains collection
    try {
        const domainsQuery = await db.collection('portalDomains')
            .where('tenantId', '==', tenantId)
            .get();
        
        for (const doc of domainsQuery.docs) {
            clearPortalCache(doc.id);
        }
    } catch (e) {
        console.warn(`[PortalResolver] Could not query portal domains for tenant ${tenantId}:`, e);
    }
    
    console.log(`[PortalResolver] Cache cleared for tenant ${tenantId}`);
}

/**
 * Clear all portal cache
 */
export function clearAllPortalCache(): void {
    portalCache.clear();
    console.log('[PortalResolver] All cache cleared');
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





