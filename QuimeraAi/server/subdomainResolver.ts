/**
 * Subdomain Resolver (Server-Side)
 * 
 * Resolves user subdomains (username.quimera.ai) to their associated projects.
 * Uses Supabase Admin client for server-side database access.
 * Includes caching for performance.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client
let supabaseAdmin: SupabaseClient;

function initializeSupabase() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('[SubdomainResolver] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Supabase configuration missing for subdomain resolver');
    }

    supabaseAdmin = createClient(url, key);
}

initializeSupabase();

// =============================================================================
// TYPES
// =============================================================================

export interface SubdomainResolution {
  projectId: string;
  userId: string;
  username: string;
  projectName?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Subdomains that should never be resolved as usernames */
const RESERVED_SUBDOMAINS = [
  'app', 'www', 'api', 'admin', 'mail', 'ftp',
  'staging', 'dev', 'test', 'beta', 'preview',
  'store', 'blog', 'help', 'support', 'status',
  'cdn', 'assets', 'static', 'media', 'docs', 'dashboard',
];

/** Quimera base domains */
const QUIMERA_DOMAINS = ['quimera.ai'];

// In-memory cache (TTL: 5 minutes)
const cache = new Map<string, { data: SubdomainResolution | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// =============================================================================
// RESOLUTION
// =============================================================================

/**
 * Extract subdomain from hostname if it's a Quimera user subdomain
 * Returns null for root, app, www, or non-Quimera domains
 */
export function extractUserSubdomain(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/:\d+$/, '');

  // Check if it's a Quimera domain
  const matchingBase = QUIMERA_DOMAINS.find(base =>
    normalized.endsWith(`.${base}`)
  );

  if (!matchingBase) return null;

  // Extract subdomain
  const sub = normalized.replace(`.${matchingBase}`, '');

  // Ignore multi-level subdomains
  if (sub.includes('.')) return null;

  // Ignore reserved subdomains
  if (RESERVED_SUBDOMAINS.includes(sub)) return null;

  return sub;
}

/**
 * Resolve a username to a project using Supabase
 * Returns null if user not found or has no projects
 */
export async function resolveUserSubdomain(username: string): Promise<SubdomainResolution | null> {
  // Check cache
  const cached = cache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[SubdomainResolver] Cache hit for '${username}'`);
    return cached.data;
  }

  try {
    console.log(`[SubdomainResolver] Looking up username '${username}'...`);

    // Query users table for matching username
    // Username might be stored in the 'name' column or a 'username' column
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, preferences')
      .or(`name.eq.${username},preferences->>username.eq.${username}`)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log(`[SubdomainResolver] Username '${username}' not found`);
      cache.set(username, { data: null, timestamp: Date.now() });
      return null;
    }

    const userData = users[0];
    const userId = userData.id;

    // Try to get the user's primary/default project
    let projectId: string | null = userData.preferences?.defaultProjectId || null;

    if (!projectId) {
      // Fallback: get the first published project belonging to this user
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .not('published_data', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        projectId = projects[0].id;
      } else {
        // Last resort: get any project
        const { data: anyProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (anyProjects && anyProjects.length > 0) {
          projectId = anyProjects[0].id;
        }
      }
    }

    if (!projectId) {
      console.log(`[SubdomainResolver] User '${username}' has no projects`);
      cache.set(username, { data: null, timestamp: Date.now() });
      return null;
    }

    const result: SubdomainResolution = {
      projectId,
      userId,
      username,
      projectName: userData.name || username,
    };

    console.log(`[SubdomainResolver] Resolved '${username}' -> Project ${projectId}`);
    cache.set(username, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error(`[SubdomainResolver] Error resolving '${username}':`, error);
    return null;
  }
}

/**
 * Clear cache for a specific username
 */
export function clearSubdomainCache(username: string): void {
  cache.delete(username.toLowerCase());
}

/**
 * Clear all subdomain cache
 */
export function clearAllSubdomainCache(): void {
  cache.clear();
}
