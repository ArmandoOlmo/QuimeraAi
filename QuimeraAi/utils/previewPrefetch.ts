/**
 * Preview Data Prefetch
 * Starts Supabase fetch IMMEDIATELY when a /preview/ URL is detected,
 * BEFORE React even hydrates. This runs in parallel with the lazy component load,
 * saving ~2-5s of sequential waiting.
 * 
 * Data source: Supabase projects.published_data + posts table
 */

import { supabase } from '../supabase';
import { resolveProjectMenus } from './mapSupabaseProject';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export interface PrefetchedPreviewData {
    project: any | null;
    posts: any[];
    menus: any[];
    categories: any[];
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
        return { project: null, posts: [], menus: [], categories: [], tenantBranding: null, userId, projectId, error: 'No projectId' };
    }

    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const canLoadDraftData = Boolean(sessionData.session);
        const projectSelect = canLoadDraftData
            ? 'id, tenant_id, user_id, name, published_data, data'
            : 'id, tenant_id, user_id, name, published_data';

        // Fire requests in parallel: project + posts + tenant branding
        const projectResult = await supabase
            .from('projects')
            .select(projectSelect)
            .eq('id', projectId)
            .single();

        const tenantId = projectResult.data?.tenant_id;
        const promises: any[] = [
            // 1. Get published posts. The remote posts table is tenant-scoped, not project-scoped.
            tenantId
                ? supabase
                    .from('posts')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'published')
                    .contains('tags', [`project:${projectId}`])
                    .order('published_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
        ];

        // Also fetch tenant branding. Prefer tenant_id because legacy project user_id values
        // can be Firebase IDs, while tenants.owner_user_id is a UUID column in Supabase.
        if (tenantId && UUID_RE.test(tenantId)) {
            promises.push(
                supabase
                    .from('tenants')
                    .select('branding')
                    .eq('id', tenantId)
                    .maybeSingle()
            );
        } else if (userId && UUID_RE.test(userId)) {
            promises.push(
                supabase
                    .from('tenants')
                    .select('branding')
                    .eq('owner_user_id', userId)
                    .maybeSingle()
            );
        }

        const results = await Promise.all(promises);
        const postsResult = results[0];
        const tenantResult = results[1]; // may be undefined

        let project: any = null;
        let posts: any[] = [];
        let menus: any[] = [];
        let categories: any[] = [];
        let tenantBranding: { logoUrl?: string; companyName?: string } | null = null;

        // Process project data
        if (projectResult.data) {
            const row = projectResult.data;
            // Prefer draft data only when a Supabase session is available.
            // Public preview/domain loads should use the published snapshot.
            const sourceData = (canLoadDraftData ? row.data : row.published_data) || row.published_data || {};
            project = {
                id: row.id,
                tenantId: row.tenant_id,
                userId: row.user_id,
                name: row.name || sourceData.name,
                ...sourceData,
            };
            menus = resolveProjectMenus(row);
            categories = project.categories && Array.isArray(project.categories) ? project.categories : [];
            if (menus.length > 0) {
                project.menus = menus;
            }
        }

        // Process posts
        if (postsResult.data && postsResult.data.length > 0) {
            posts = postsResult.data.map((p: any) => ({ id: p.id, ...p }));
        }

        // Process tenant branding
        if (tenantResult?.data?.branding) {
            const b = tenantResult.data.branding;
            if (b.logoUrl || b.companyName) {
                tenantBranding = {
                    logoUrl: b.logoUrl,
                    companyName: b.companyName,
                };
            }
        }

        // If ecommerce data is embedded in published_data, extract categories
        if (project?.ecommerce?.categories && categories.length === 0) {
            categories = project.ecommerce.categories.map((c: any) => ({ id: c.id, ...c.data }));
        }

        return { project, posts, menus, categories, tenantBranding, userId, projectId, error: project ? null : 'Project not found' };
    } catch (err: any) {
        return { project: null, posts: [], menus: [], categories: [], tenantBranding: null, userId, projectId, error: err.message || 'Fetch failed' };
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
