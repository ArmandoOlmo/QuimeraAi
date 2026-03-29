/**
 * Subdomain Resolver (Server-Side)
 * 
 * Resolves user subdomains (username.quimera.ai) to their associated projects.
 * Uses Firebase Admin SDK for server-side Firestore access.
 * Includes caching for performance.
 */

import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
 * Resolve a username to a project using Firestore
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
    const db = getFirestore(getApps()[0]);

    console.log(`[SubdomainResolver] Looking up username '${username}'...`);

    // Query users collection for matching username
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
      console.log(`[SubdomainResolver] Username '${username}' not found`);
      cache.set(username, { data: null, timestamp: Date.now() });
      return null;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Try to get default/primary project
    let projectId = userData.defaultProjectId || userData.primaryProjectId;

    if (!projectId) {
      // Fallback: get first project from publicStores that belongs to this user
      const publicStoresRef = db.collection('publicStores');
      const storeSnapshot = await publicStoresRef
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!storeSnapshot.empty) {
        projectId = storeSnapshot.docs[0].id;
      } else {
        // Last resort: get first project from user's subcollection
        const projectsRef = db.collection('users').doc(userId).collection('projects');
        const projectsSnapshot = await projectsRef.limit(1).get();
        if (!projectsSnapshot.empty) {
          projectId = projectsSnapshot.docs[0].id;
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
      projectName: userData.displayName || username,
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
