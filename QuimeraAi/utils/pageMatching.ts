/**
 * Page Matching Utilities for Multi-Page Architecture
 * 
 * Provides functions to match URLs with pages and extract route parameters.
 */

import { SitePage, PageMatch } from '../types/project';

/**
 * Convert a page slug pattern to a regex pattern
 * e.g., "/producto/:slug" -> "/producto/([^/]+)"
 */
export const slugToRegex = (slug: string): RegExp => {
    // Guard against undefined/null slug
    if (!slug || typeof slug !== 'string') {
        return new RegExp('^/$');
    }
    // Escape special regex characters except :
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace :param with named capture group pattern
    const pattern = escaped.replace(/:([^/]+)/g, '([^/]+)');
    return new RegExp(`^${pattern}$`);
};

/**
 * Extract parameter names from a slug pattern
 * e.g., "/producto/:slug" -> ["slug"]
 */
export const extractParamNames = (slug: string): string[] => {
    if (!slug || typeof slug !== 'string') return [];
    const matches = slug.match(/:([^/]+)/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1)); // Remove the leading ':'
};

/**
 * Match a URL path against a page's slug pattern
 */
export const matchPageSlug = (slug: string, path: string): { match: boolean; params: Record<string, string> } => {
    if (!slug || !path) return { match: false, params: {} };
    const regex = slugToRegex(slug);
    const matches = path.match(regex);
    
    if (!matches) {
        return { match: false, params: {} };
    }
    
    const paramNames = extractParamNames(slug);
    const params: Record<string, string> = {};
    
    // First element is the full match, so we start from index 1
    paramNames.forEach((name, index) => {
        params[name] = matches[index + 1] || '';
    });
    
    return { match: true, params };
};

/**
 * Find the matching page for a given URL path
 * Returns the page and extracted parameters
 */
export const matchPage = (pages: SitePage[], path: string): PageMatch | null => {
    // Guard against undefined/null path
    if (!path || typeof path !== 'string') {
        console.warn('[matchPage] Invalid path:', path);
        return null;
    }
    
    // Normalize path (remove trailing slash, ensure leading slash)
    let normalizedPath = path.replace(/\/+$/, '') || '/';
    if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
    }
    
    // First try exact match (for static pages)
    const exactMatch = pages.find(p => p.slug === normalizedPath);
    if (exactMatch) {
        return {
            page: exactMatch,
            params: {},
        };
    }
    
    // Then try dynamic routes (pages with :param in slug)
    for (const page of pages) {
        if (page.slug.includes(':')) {
            const { match, params } = matchPageSlug(page.slug, normalizedPath);
            if (match) {
                return {
                    page,
                    params,
                };
            }
        }
    }
    
    return null;
};

/**
 * Generate a URL from a page and parameters
 * e.g., page with slug "/producto/:slug" + params { slug: "shoes" } -> "/producto/shoes"
 */
export const generatePageUrl = (page: SitePage, params?: Record<string, string>): string => {
    if (!page || !page.slug) return '/';
    let url = page.slug;
    
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, encodeURIComponent(value || ''));
        }
    }
    
    return url;
};

/**
 * Get all static pages (for sitemap generation)
 */
export const getStaticPages = (pages: SitePage[]): SitePage[] => {
    return pages.filter(p => p.type === 'static');
};

/**
 * Get all dynamic pages
 */
export const getDynamicPages = (pages: SitePage[]): SitePage[] => {
    return pages.filter(p => p.type === 'dynamic');
};

/**
 * Get pages that should appear in navigation
 */
export const getNavigationPages = (pages: SitePage[]): SitePage[] => {
    return pages
        .filter(p => p.showInNavigation)
        .sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0));
};

/**
 * Get the home page
 */
export const getHomePage = (pages: SitePage[]): SitePage | null => {
    return pages.find(p => p.isHomePage) || pages.find(p => p.slug === '/') || null;
};

/**
 * Check if a path matches any dynamic route
 */
export const isDynamicPath = (pages: SitePage[], path: string): boolean => {
    const match = matchPage(pages, path);
    return match?.page.type === 'dynamic' || false;
};

/**
 * Extract the slug from a dynamic path
 * e.g., "/producto/shoes" with pattern "/producto/:slug" -> "shoes"
 */
export const extractSlugFromPath = (path: string, pattern: string): string | null => {
    const { match, params } = matchPageSlug(pattern, path);
    if (!match) return null;
    return params.slug || null;
};

/**
 * Build navigation links from pages
 */
export const buildNavigationLinks = (pages: SitePage[]): Array<{ text: string; href: string }> => {
    return getNavigationPages(pages).map(page => ({
        text: page.title,
        href: page.slug,
    }));
};

/**
 * Find page by ID
 */
export const findPageById = (pages: SitePage[], pageId: string): SitePage | null => {
    return pages.find(p => p.id === pageId) || null;
};

/**
 * Get parent page for breadcrumbs (if applicable)
 * e.g., /producto/shoes -> /tienda
 */
export const getParentPage = (pages: SitePage[], currentPath: string): SitePage | null => {
    const match = matchPage(pages, currentPath);
    if (!match) return null;
    
    // For product pages, parent is store
    if (match.page.dynamicSource === 'products') {
        return pages.find(p => p.slug === '/tienda') || null;
    }
    
    // For category pages, parent is store
    if (match.page.dynamicSource === 'categories') {
        return pages.find(p => p.slug === '/tienda') || null;
    }
    
    // For article pages, parent is blog
    if (match.page.dynamicSource === 'blogPosts') {
        return pages.find(p => p.slug === '/blog') || null;
    }
    
    return null;
};

/**
 * Generate breadcrumbs for a path
 */
export const generateBreadcrumbs = (
    pages: SitePage[], 
    currentPath: string,
    currentTitle?: string
): Array<{ title: string; href: string }> => {
    const breadcrumbs: Array<{ title: string; href: string }> = [];
    
    // Always start with home
    const homePage = getHomePage(pages);
    if (homePage) {
        breadcrumbs.push({ title: homePage.title, href: '/' });
    }
    
    // Get parent if exists
    const parent = getParentPage(pages, currentPath);
    if (parent) {
        breadcrumbs.push({ title: parent.title, href: parent.slug });
    }
    
    // Add current page
    const match = matchPage(pages, currentPath);
    if (match) {
        breadcrumbs.push({
            title: currentTitle || match.page.title,
            href: currentPath,
        });
    }
    
    return breadcrumbs;
};

