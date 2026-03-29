/**
 * Subdomain Utilities
 * 
 * Central utility for detecting and parsing subdomains across Quimera.ai.
 * Supports three subdomain tiers:
 * 
 * 1. 'root'   → quimera.ai (marketing site)
 * 2. 'app'    → app.quimera.ai (dashboard/editor)
 * 3. 'user'   → usuario.quimera.ai (user's published website)
 * 4. 'custom' → external custom domains (existing behavior)
 */

// =============================================================================
// TYPES
// =============================================================================

export type SubdomainType = 'root' | 'app' | 'user' | 'custom';

export interface SubdomainInfo {
  /** The detected subdomain type */
  type: SubdomainType;
  /** The subdomain string (e.g. "app", "username"), null for root */
  subdomain: string | null;
  /** The full hostname */
  hostname: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Quimera's own base domains (without subdomain prefix) */
const QUIMERA_BASE_DOMAINS = [
  'quimera.ai',
  'quimeraai.web.app',
  'quimera-502e2.web.app',
];

/** Development domains where we use query params for subdomain simulation */
const DEV_DOMAINS = ['localhost', '127.0.0.1'];

/** Reserved subdomains that cannot be used as usernames */
const RESERVED_SUBDOMAINS = [
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'ftp',
  'staging',
  'dev',
  'test',
  'beta',
  'preview',
  'store',
  'blog',
  'help',
  'support',
  'status',
  'cdn',
  'assets',
  'static',
  'media',
  'docs',
  'dashboard',
];

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Detect the subdomain type from a hostname.
 * 
 * In production:
 *   - quimera.ai → root
 *   - app.quimera.ai → app
 *   - username.quimera.ai → user
 *   - somethingelse.com → custom
 * 
 * In development (localhost):
 *   Uses ?subdomain=xxx query param for simulation.
 *   - localhost:3000 → root
 *   - localhost:3000?subdomain=app → app
 *   - localhost:3000?subdomain=username → user
 */
export function detectSubdomain(hostname: string): SubdomainInfo {
  const normalizedHost = hostname.toLowerCase().replace(/:\d+$/, ''); // Remove port

  // -------------------------------------------------------------------
  // DEV MODE: Use query param ?subdomain= for local testing
  // -------------------------------------------------------------------
  if (DEV_DOMAINS.some(d => normalizedHost === d)) {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const simulated = params.get('subdomain');

      if (simulated) {
        if (simulated === 'app') {
          return { type: 'app', subdomain: 'app', hostname };
        }
        if (!isReservedSubdomain(simulated)) {
          return { type: 'user', subdomain: simulated, hostname };
        }
      }
    }

    // Default: root in dev
    return { type: 'root', subdomain: null, hostname };
  }

  // -------------------------------------------------------------------
  // PRODUCTION: Parse actual hostname
  // -------------------------------------------------------------------

  // Check if this is a Quimera domain at all
  const matchingBase = QUIMERA_BASE_DOMAINS.find(base => 
    normalizedHost === base || normalizedHost.endsWith(`.${base}`)
  );

  if (!matchingBase) {
    // Not a Quimera domain → custom domain (existing behavior)
    return { type: 'custom', subdomain: null, hostname };
  }

  // Check for www (treat as root)
  if (normalizedHost === `www.${matchingBase}` || normalizedHost === matchingBase) {
    return { type: 'root', subdomain: null, hostname };
  }

  // Extract subdomain
  const sub = normalizedHost.replace(`.${matchingBase}`, '');

  // Ignore multi-level subdomains (e.g. foo.bar.quimera.ai)
  if (sub.includes('.')) {
    return { type: 'root', subdomain: null, hostname };
  }

  // 'app' subdomain → dashboard
  if (sub === 'app') {
    return { type: 'app', subdomain: 'app', hostname };
  }

  // Reserved subdomains → treat as root (they get their own handling)
  if (isReservedSubdomain(sub)) {
    return { type: 'root', subdomain: sub, hostname };
  }

  // Everything else → user subdomain
  return { type: 'user', subdomain: sub, hostname };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a subdomain is reserved (cannot be used as username)
 */
export function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.includes(sub.toLowerCase());
}

/**
 * Get the app URL (dashboard)
 * In production: https://app.quimera.ai
 * In development: http://localhost:3000?subdomain=app
 */
export function getAppUrl(): string {
  if (typeof window === 'undefined') return 'https://app.quimera.ai';

  const hostname = window.location.hostname.toLowerCase();
  if (DEV_DOMAINS.some(d => hostname === d)) {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${hostname}${port}?subdomain=app`;
  }

  return 'https://app.quimera.ai';
}

/**
 * Get the marketing site URL
 * In production: https://quimera.ai
 * In development: http://localhost:3000
 */
export function getMarketingUrl(): string {
  if (typeof window === 'undefined') return 'https://quimera.ai';

  const hostname = window.location.hostname.toLowerCase();
  if (DEV_DOMAINS.some(d => hostname === d)) {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${hostname}${port}`;
  }

  return 'https://quimera.ai';
}

/**
 * Get the user site URL for a given username
 * In production: https://username.quimera.ai
 * In development: http://localhost:3000?subdomain=username
 */
export function getUserSiteUrl(username: string): string {
  if (typeof window === 'undefined') return `https://${username}.quimera.ai`;

  const hostname = window.location.hostname.toLowerCase();
  if (DEV_DOMAINS.some(d => hostname === d)) {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${window.location.protocol}//${hostname}${port}?subdomain=${username}`;
  }

  return `https://${username}.quimera.ai`;
}

/**
 * Get the list of reserved subdomains (for username validation in UI)
 */
export function getReservedSubdomains(): string[] {
  return [...RESERVED_SUBDOMAINS];
}
