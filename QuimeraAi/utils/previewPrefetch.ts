/**
 * Preview Data Prefetch
 * Starts Firestore fetch IMMEDIATELY when a /preview/ URL is detected,
 * BEFORE React even hydrates. This runs in parallel with the lazy component load,
 * saving ~2-5s of sequential waiting.
 */

import { db, doc, getDoc, collection, getDocs, query, orderBy } from '../firebase';

export interface PrefetchedPreviewData {
    project: any | null;
    posts: any[];
    menus: any[];
    tenantBranding: { logoUrl?: string; companyName?: string } | null;
    userId: string | null;
    projectId: string | null;
    error: string | null;
}

// Parse preview IDs from the current URL
function parsePreviewIds(): { userId: string | null; projectId: string | null } {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/preview/')) {
        const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
        if (parts.length >= 2) return { userId: parts[0], projectId: parts[1] };
        if (parts.length === 1) return { userId: null, projectId: parts[0] };
    }
    return { userId: null, projectId: null };
}

// The prefetch promise — only created once
let _prefetchPromise: Promise<PrefetchedPreviewData> | null = null;

async function doFetch(): Promise<PrefetchedPreviewData> {
    const { userId, projectId } = parsePreviewIds();

    if (!projectId) {
        return { project: null, posts: [], menus: [], tenantBranding: null, userId, projectId, error: 'No projectId' };
    }

    try {
        // Fire ALL requests in parallel: project doc, posts, and tenant branding
        const publicStoreRef = doc(db, 'publicStores', projectId);
        const publicPostsCol = collection(db, 'publicStores', projectId, 'posts');
        const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));

        const promises: Promise<any>[] = [
            getDoc(publicStoreRef),
            getDocs(publicPostsQuery),
        ];

        // Also fetch tenant branding if we have userId
        if (userId) {
            promises.push(getDoc(doc(db, 'tenants', `tenant_${userId}`)));
        }

        const results = await Promise.all(promises);
        const publicStoreSnap = results[0];
        const publicPostsSnap = results[1];
        const tenantSnap = results[2]; // may be undefined

        let project: any = null;
        let posts: any[] = [];
        let menus: any[] = [];
        let tenantBranding: { logoUrl?: string; companyName?: string } | null = null;

        if (publicStoreSnap.exists()) {
            const rawData = publicStoreSnap.data();
            project = { id: publicStoreSnap.id, ...rawData };
            menus = rawData.menus && Array.isArray(rawData.menus) ? rawData.menus : [];
        }

        if (publicPostsSnap && !publicPostsSnap.empty) {
            posts = publicPostsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }

        if (tenantSnap?.exists?.()) {
            const d = tenantSnap.data();
            if (d?.branding?.logoUrl || d?.branding?.companyName) {
                tenantBranding = {
                    logoUrl: d.branding.logoUrl,
                    companyName: d.branding.companyName,
                };
            }
        }

        // If no project from publicStores, try user projects
        if (!project && userId) {
            try {
                const userProjectSnap = await getDoc(doc(db, 'users', userId, 'projects', projectId));
                if (userProjectSnap.exists()) {
                    project = { id: userProjectSnap.id, ...userProjectSnap.data() };
                    menus = project.menus && Array.isArray(project.menus) ? project.menus : [];
                }
            } catch (_) { /* ignore */ }
        }

        // Last resort: templates
        if (!project) {
            try {
                const templateSnap = await getDoc(doc(db, 'templates', projectId));
                if (templateSnap.exists()) {
                    project = { id: templateSnap.id, ...templateSnap.data() };
                    menus = project.menus && Array.isArray(project.menus) ? project.menus : [];
                }
            } catch (_) { /* ignore */ }
        }

        return { project, posts, menus, tenantBranding, userId, projectId, error: project ? null : 'Project not found' };
    } catch (err: any) {
        return { project: null, posts: [], menus: [], tenantBranding: null, userId, projectId, error: err.message || 'Fetch failed' };
    }
}

/**
 * Start prefetching preview data immediately.
 * Can be called multiple times — only fires once.
 */
export function startPreviewPrefetch(): Promise<PrefetchedPreviewData> {
    if (!_prefetchPromise) {
        _prefetchPromise = doFetch();
    }
    return _prefetchPromise;
}

/**
 * Get the prefetch promise (returns null if not started).
 */
export function getPreviewPrefetch(): Promise<PrefetchedPreviewData> | null {
    return _prefetchPromise;
}

// ============================================================================
// AUTO-START: If we're on a preview route, start prefetching IMMEDIATELY
// This runs at module import time, before React hydrates.
// ============================================================================
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/preview/')) {
    startPreviewPrefetch();
}
