/**
 * SSR Server for Custom Domains (Multi-Page Architecture)
 * 
 * This server provides real Server-Side Rendering for custom domains:
 * 1. Receives request with custom domain Host header
 * 2. Looks up domain in Firestore (customDomains collection)
 * 3. Loads project data from publicStores including pages array
 * 4. Matches URL path to a SitePage
 * 5. Renders the page to HTML string using React
 * 6. Returns complete HTML with SEO meta tags and hydration data
 * 
 * For dynamic pages (products, categories, articles), it loads the
 * dynamic data and generates appropriate meta tags.
 */

import express, { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PORT = process.env.PORT || 8080;
const APP_URL = process.env.APP_URL || 'https://quimeraai.web.app';

// Asset proxy cache (in-memory) - Shopify/Wix strategy
// Hashed assets (immutable) get long TTL, unhashed get short TTL
const assetCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
const ASSET_CACHE_TTL_HASHED = 24 * 60 * 60 * 1000; // 24 hours for immutable assets
const ASSET_CACHE_TTL_UNHASHED = 60 * 1000; // 1 minute for mutable assets

// Cache for asset references from Firebase Hosting
let cachedAssetRefs: { indexJs: string; mainCss: string; timestamp: number } | null = null;
const ASSET_REFS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch and cache asset references from Firebase Hosting index.html
async function getAssetReferences(): Promise<{ indexJs: string; mainCss: string }> {
    // Check cache
    if (cachedAssetRefs && Date.now() - cachedAssetRefs.timestamp < ASSET_REFS_CACHE_TTL) {
        return { indexJs: cachedAssetRefs.indexJs, mainCss: cachedAssetRefs.mainCss };
    }

    try {
        const response = await fetch(`${APP_URL}/index.html`);
        if (!response.ok) throw new Error(`Failed to fetch index.html: ${response.status}`);

        const html = await response.text();

        // Extract JS and CSS references (could be relative or absolute paths)
        // Note: After Vite config change, both use "index" prefix with hash
        const jsMatch = html.match(/src="([^"]*\/assets\/index[^"]*\.js)"/);
        const cssMatch = html.match(/href="([^"]*\/assets\/index[^"]*\.css)"/);

        // Convert relative paths to absolute URLs pointing to Firebase Hosting
        let indexJs = jsMatch ? jsMatch[1] : '/assets/index.js';
        let mainCss = cssMatch ? cssMatch[1] : '/assets/index.css';

        // If paths are relative, prepend APP_URL
        if (indexJs.startsWith('/')) indexJs = `${APP_URL}${indexJs}`;
        if (mainCss.startsWith('/')) mainCss = `${APP_URL}${mainCss}`;

        console.log(`[Assets] Fetched asset references: JS=${indexJs}, CSS=${mainCss}`);

        // Cache the references
        cachedAssetRefs = { indexJs, mainCss, timestamp: Date.now() };

        return { indexJs, mainCss };
    } catch (err) {
        console.error('[Assets] Failed to fetch asset references:', err);
        // Fallback to absolute paths
        return { indexJs: `${APP_URL}/assets/index.js`, mainCss: `${APP_URL}/assets/main.css` };
    }
}

// Helper to check if asset has a hash (immutable)
function isHashedAsset(path: string): boolean {
    return /[-_][a-zA-Z0-9]{6,}\.(js|css|woff2?|png|jpg|jpeg|svg|webp)(\?.*)?$/.test(path);
}

// Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp(); // Auto-credentials on Cloud Run
}
const db = getFirestore();

// =============================================================================
// TYPES
// =============================================================================

interface DomainData {
    projectId: string;
    userId: string;
    status: string;
}

interface ProjectData {
    id: string;
    name: string;
    pages?: SitePage[];
    data: any;
    theme: any;
    brandIdentity: any;
    componentOrder: string[];
    sectionVisibility: Record<string, boolean>;
    componentStatus?: Record<string, boolean>;
    componentStyles?: Record<string, any>;
    seoConfig?: any;
    aiAssistantConfig?: any;
    menus?: any[];
}

interface SitePage {
    id: string;
    title: string;
    slug: string;
    type: 'static' | 'dynamic';
    dynamicSource?: 'products' | 'categories' | 'blogPosts';
    sections: string[];
    sectionData: any;
    seo: {
        title?: string;
        description?: string;
        image?: string;
        keywords?: string[];
    };
    isHomePage?: boolean;
    showInNavigation?: boolean;
    navigationOrder?: number;
}

interface PageMatch {
    page: SitePage;
    params: Record<string, string>;
}

interface DynamicData {
    product?: any;
    category?: any;
    article?: any;
}

interface MetaTags {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage?: string;
    ogType: string;
    jsonLd?: string;
}

// =============================================================================
// CACHES
// =============================================================================

// Domain cache (1 minute TTL)
const domainCache = new Map<string, { data: DomainData | null; timestamp: number }>();
const DOMAIN_CACHE_TTL = 1 * 60 * 1000;

// Project cache (5 minute TTL)
const projectCache = new Map<string, { data: ProjectData | null; timestamp: number }>();
const PROJECT_CACHE_TTL = 5 * 60 * 1000;

// =============================================================================
// DOMAIN RESOLUTION
// =============================================================================

async function resolveDomain(hostname: string): Promise<DomainData | null> {
    const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');

    // Check cache
    const cached = domainCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < DOMAIN_CACHE_TTL) {
        return cached.data;
    }

    try {
        const doc = await db.collection('customDomains').doc(normalizedDomain).get();

        if (!doc.exists) {
            domainCache.set(normalizedDomain, { data: null, timestamp: Date.now() });
            return null;
        }

        const docData = doc.data()!;
        if (docData.status !== 'active') {
            return null;
        }

        const data: DomainData = {
            projectId: docData.projectId,
            userId: docData.userId,
            status: docData.status,
        };

        domainCache.set(normalizedDomain, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`[SSR] Error resolving domain ${normalizedDomain}:`, error);
        return null;
    }
}

// =============================================================================
// PROJECT LOADING
// =============================================================================

async function loadProject(projectId: string): Promise<ProjectData | null> {
    // Check cache
    const cached = projectCache.get(projectId);
    if (cached && Date.now() - cached.timestamp < PROJECT_CACHE_TTL) {
        return cached.data;
    }

    try {
        const doc = await db.collection('publicStores').doc(projectId).get();

        if (!doc.exists) {
            projectCache.set(projectId, { data: null, timestamp: Date.now() });
            return null;
        }

        const data = { id: doc.id, ...doc.data() } as ProjectData;
        projectCache.set(projectId, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`[SSR] Error loading project ${projectId}:`, error);
        return null;
    }
}

// =============================================================================
// PAGE MATCHING
// =============================================================================

function matchPage(pages: SitePage[], path: string): PageMatch | null {
    // Normalize path
    let normalizedPath = path.replace(/\/+$/, '') || '/';
    if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
    }

    // First try exact match
    const exactMatch = pages.find(p => p.slug === normalizedPath);
    if (exactMatch) {
        return { page: exactMatch, params: {} };
    }

    // Then try dynamic routes
    for (const page of pages) {
        if (page.slug.includes(':')) {
            const match = matchDynamicSlug(page.slug, normalizedPath);
            if (match) {
                return { page, params: match };
            }
        }
    }

    return null;
}

function matchDynamicSlug(pattern: string, path: string): Record<string, string> | null {
    // Convert pattern like /producto/:slug to regex
    const regexPattern = pattern.replace(/:[^/]+/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    const matches = path.match(regex);

    if (!matches) return null;

    // Extract param names
    const paramNames = (pattern.match(/:([^/]+)/g) || []).map(m => m.slice(1));
    const params: Record<string, string> = {};

    paramNames.forEach((name, i) => {
        params[name] = matches[i + 1];
    });

    return params;
}

// =============================================================================
// DYNAMIC DATA LOADING
// =============================================================================

async function loadDynamicData(
    projectId: string,
    page: SitePage,
    params: Record<string, string>
): Promise<DynamicData | null> {
    const slug = params.slug;
    if (!slug || !page.dynamicSource) return null;

    try {
        switch (page.dynamicSource) {
            case 'products': {
                const productsSnap = await db.collection('publicStores')
                    .doc(projectId)
                    .collection('products')
                    .where('slug', '==', slug)
                    .limit(1)
                    .get();

                if (productsSnap.empty) return null;
                return { product: { id: productsSnap.docs[0].id, ...productsSnap.docs[0].data() } };
            }

            case 'categories': {
                const categoriesSnap = await db.collection('publicStores')
                    .doc(projectId)
                    .collection('categories')
                    .where('slug', '==', slug)
                    .limit(1)
                    .get();

                if (categoriesSnap.empty) return null;
                return { category: { id: categoriesSnap.docs[0].id, ...categoriesSnap.docs[0].data() } };
            }

            case 'blogPosts': {
                const postsSnap = await db.collection('publicStores')
                    .doc(projectId)
                    .collection('posts')
                    .where('slug', '==', slug)
                    .limit(1)
                    .get();

                if (postsSnap.empty) return null;
                return { article: { id: postsSnap.docs[0].id, ...postsSnap.docs[0].data() } };
            }

            default:
                return null;
        }
    } catch (error) {
        console.error(`[SSR] Error loading dynamic data:`, error);
        return null;
    }
}

// =============================================================================
// META TAG GENERATION
// =============================================================================

function generateMetaTags(
    project: ProjectData,
    page: SitePage,
    dynamicData: DynamicData | null,
    hostname: string,
    path: string
): MetaTags {
    const siteName = project.brandIdentity?.name || project.name;
    const siteUrl = `https://${hostname}`;
    const pageUrl = `${siteUrl}${path}`;

    // For dynamic pages, use dynamic data for meta
    if (page.type === 'dynamic' && dynamicData) {
        if (dynamicData.product) {
            const p = dynamicData.product;
            return {
                title: `${p.name} | ${siteName}`,
                description: p.description || `Compra ${p.name} en ${siteName}`,
                canonicalUrl: pageUrl,
                ogImage: p.image || p.images?.[0],
                ogType: 'product',
                jsonLd: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: p.name,
                    description: p.description,
                    image: p.image ? [p.image] : undefined,
                    sku: p.sku,
                    offers: {
                        '@type': 'Offer',
                        price: p.price,
                        priceCurrency: 'USD',
                        availability: p.inStock
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/OutOfStock',
                    },
                }),
            };
        }

        if (dynamicData.category) {
            const c = dynamicData.category;
            return {
                title: `${c.name} | ${siteName}`,
                description: c.description || `Explora productos de ${c.name}`,
                canonicalUrl: pageUrl,
                ogImage: c.imageUrl,
                ogType: 'website',
            };
        }

        if (dynamicData.article) {
            const a = dynamicData.article;
            return {
                title: `${a.title} | ${siteName}`,
                description: a.excerpt || a.content?.substring(0, 160),
                canonicalUrl: pageUrl,
                ogImage: a.featuredImage,
                ogType: 'article',
                jsonLd: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: a.title,
                    description: a.excerpt,
                    image: a.featuredImage ? [a.featuredImage] : undefined,
                    datePublished: a.publishedAt,
                    author: a.author ? { '@type': 'Person', name: a.author } : undefined,
                }),
            };
        }
    }

    // Static page meta
    const seo = page.seo || {};
    return {
        title: seo.title || `${page.title} | ${siteName}`,
        description: seo.description || project.seoConfig?.siteDescription || '',
        canonicalUrl: pageUrl,
        ogImage: seo.image || project.seoConfig?.defaultOGImage,
        ogType: 'website',
    };
}

// =============================================================================
// HTML GENERATION
// =============================================================================

function generateFullHtml(
    project: ProjectData,
    page: SitePage,
    dynamicData: DynamicData | null,
    meta: MetaTags,
    hostname: string,
    path: string,
    products: any[] = [],
    categories: any[] = [],
    posts: any[] = [],
    userId: string = '',
    assetRefs: { indexJs: string; mainCss: string }
): string {
    const theme = project.theme || {};
    const globalColors = theme.globalColors || {};
    const primaryColor = globalColors.primary || '#4f46e5';
    const backgroundColor = globalColors.background || theme.pageBackground || '#0f172a';
    const textColor = globalColors.text || '#94a3b8';
    const headingColor = globalColors.heading || '#f8fafc';

    // Get favicon
    const favicon = project.seoConfig?.favicon || '';

    // Full HTML document - SEO-optimized with React app for rendering
    // We only include meta tags and initial data, React handles all rendering
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}">
    <link rel="canonical" href="${meta.canonicalUrl}">
    <meta name="robots" content="index, follow">
    
    ${favicon ? `
    <link rel="icon" href="${favicon}">
    <link rel="shortcut icon" href="${favicon}">
    ` : ''}
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(meta.title)}">
    <meta property="og:description" content="${escapeHtml(meta.description)}">
    <meta property="og:type" content="${meta.ogType}">
    <meta property="og:url" content="${meta.canonicalUrl}">
    <meta property="og:site_name" content="${escapeHtml(project.brandIdentity?.name || project.name)}">
    ${meta.ogImage ? `<meta property="og:image" content="${meta.ogImage}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(meta.title)}">
    <meta name="twitter:description" content="${escapeHtml(meta.description)}">
    ${meta.ogImage ? `<meta name="twitter:image" content="${meta.ogImage}">` : ''}
    
    <!-- Theme Color -->
    <meta name="theme-color" content="${primaryColor}">
    
    <!-- JSON-LD Structured Data -->
    ${meta.jsonLd ? `<script type="application/ld+json">${meta.jsonLd}</script>` : ''}
    
    <!-- Fonts - same as main app -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamilyHeader || 'Poppins')}:wght@400;500;600;700&family=${encodeURIComponent(theme.fontFamilyBody || 'Mulish')}:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Critical CSS - prevent flash of unstyled content -->
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: '${theme.fontFamilyBody || 'Mulish'}', system-ui, sans-serif;
            background: ${backgroundColor};
            color: ${textColor};
            line-height: 1.6;
        }
        #root:empty::before {
            content: '';
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: ${backgroundColor};
        }
    </style>
    
    <!-- CRITICAL: Unregister Service Worker BEFORE loading any JS to ensure fresh SSR content -->
    <script>
    (function(){
        if('serviceWorker' in navigator){
            navigator.serviceWorker.getRegistrations().then(function(r){
                r.forEach(function(reg){reg.unregister();console.log('[SSR] SW unregistered');});
            });
        }
        if('caches' in window){
            caches.keys().then(function(n){
                n.forEach(function(name){caches.delete(name);console.log('[SSR] Cache deleted:',name);});
            });
        }
    })();
    </script>
    
    <!-- Main app scripts and styles from Firebase Hosting (with hashed filenames) -->
    <script type="module" crossorigin src="${assetRefs.indexJs}"></script>
    <link rel="stylesheet" crossorigin href="${assetRefs.mainCss}">
</head>
<body>
    <!-- Domain Config for useCustomDomain hook (prevents extra Firestore call) -->
    <script>
        window.__DOMAIN_CONFIG__ = {
            domain: "${hostname}",
            projectId: "${project.id}",
            userId: "${userId}",
            isCustomDomain: true,
            primaryColor: "${primaryColor}",
            backgroundColor: "${backgroundColor}",
            projectName: "${escapeHtml(project.name || '')}"
        };
        window.__SSR_MODE__ = true;
        window.__INITIAL_DATA__ = ${JSON.stringify({
        projectId: project.id,
        path,
        pageId: page.id,
        dynamicData: dynamicData || null,
        // Full project data for client-side rendering with PublicWebsitePreview
        // IMPORTANT: Include ALL fields that PublicWebsitePreview needs
        project: {
            id: project.id,
            name: project.name,
            pages: project.pages || [],
            data: project.data,
            theme: project.theme,
            brandIdentity: project.brandIdentity,
            componentOrder: project.componentOrder || [],
            sectionVisibility: project.sectionVisibility || {},
            componentStatus: project.componentStatus || {},
            componentStyles: project.componentStyles || {},
            menus: project.menus || [],
            seoConfig: project.seoConfig || {},
            aiAssistantConfig: project.aiAssistantConfig || null,
        },
        // Pre-loaded products and categories for ecommerce pages
        products: products || [],
        categories: categories || [],
        // Pre-loaded blog posts for blog navigation
        posts: posts || [],
    })};
    </script>
    
    <!-- React mounts here -->
    <div id="root"></div>
</body>
</html>`;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/__debug', (req: Request, res: Response) => {
    res.json({
        headers: req.headers,
        hostname: req.hostname,
        host: req.headers.host,
        path: req.path,
    });
});

// Clear cache endpoint (for debugging/deployment)
app.post('/__clear-cache', (req: Request, res: Response) => {
    domainCache.clear();
    projectCache.clear();
    res.json({ success: true, message: 'Cache cleared' });
});

// Main SSR handler
app.get('*', async (req: Request, res: Response) => {
    const hostname = (req.headers['cf-connecting-host'] as string) ||
        (req.headers['x-forwarded-host'] as string) ||
        (req.headers['x-original-host'] as string) ||
        (req.headers['host'] as string)?.split(':')[0] ||
        req.hostname;
    const path = req.path;

    console.log(`[SSR] Request: ${hostname}${path}`);

    try {
        // 1. Resolve domain to project
        const domainData = await resolveDomain(hostname);
        if (!domainData) {
            return res.status(404).send(getNotFoundPage(hostname));
        }

        const { projectId, userId } = domainData;

        // 2. Load project data
        const project = await loadProject(projectId);
        if (!project) {
            return res.status(404).send(getNotFoundPage(hostname));
        }

        // 3. Match URL to page
        const pages = project.pages || [];
        let pageMatch: PageMatch | null = null;

        if (pages.length > 0) {
            // Multi-page architecture
            pageMatch = matchPage(pages, path);

            // If no match and path is /, try to find home page
            if (!pageMatch && (path === '/' || path === '')) {
                const homePage = pages.find((p: SitePage) => p.isHomePage) || pages[0];
                if (homePage) {
                    pageMatch = { page: homePage, params: {} };
                }
            }
        } else {
            // Legacy single-page project - create virtual home page
            pageMatch = {
                page: {
                    id: 'legacy-home',
                    title: project.name,
                    slug: '/',
                    type: 'static',
                    sections: project.componentOrder || [],
                    sectionData: project.data,
                    seo: {
                        title: project.seoConfig?.title || project.name,
                        description: project.seoConfig?.description,
                    },
                    isHomePage: true,
                    showInNavigation: true,
                },
                params: {},
            };
        }

        if (!pageMatch) {
            // 404 - page not found
            return res.status(404).send(get404Page(project, hostname));
        }

        const { page, params } = pageMatch;

        // 4. Load dynamic data if needed
        let dynamicData: DynamicData | null = null;
        if (page.type === 'dynamic' && params.slug) {
            dynamicData = await loadDynamicData(projectId, page, params);

            // If dynamic data not found, show 404
            if (!dynamicData) {
                return res.status(404).send(get404Page(project, hostname));
            }
        }

        // 5. Load products, categories, and blog posts for hydration (for ecommerce and blog sections)
        let products: any[] = [];
        let categories: any[] = [];
        let posts: any[] = [];
        try {
            const [productsSnap, categoriesSnap, postsSnap] = await Promise.all([
                db.collection('publicStores').doc(projectId).collection('products').limit(50).get(),
                db.collection('publicStores').doc(projectId).collection('categories').get(),
                db.collection('publicStores').doc(projectId).collection('posts').orderBy('publishedAt', 'desc').limit(50).get(),
            ]);
            products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`[SSR] Loaded ${products.length} products, ${categories.length} categories, ${posts.length} blog posts`);
        } catch (e) {
            console.log('[SSR] Could not load products/categories/posts:', e);
        }

        // 6. Generate meta tags
        const meta = generateMetaTags(project, page, dynamicData, hostname, path);

        // 7. Get asset references (with hashed filenames) from Firebase Hosting
        const assetRefs = await getAssetReferences();

        // 8. Generate and send HTML
        const html = generateFullHtml(project, page, dynamicData, meta, hostname, path, products, categories, posts, userId, assetRefs);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300'); // 1min browser, 5min CDN
        res.send(html);

        console.log(`[SSR] Served: ${hostname}${path} -> ${page.title}`);

    } catch (error) {
        console.error(`[SSR] Error handling request:`, error);
        res.status(500).send(getErrorPage());
    }
});

// =============================================================================
// ERROR PAGES
// =============================================================================

function getNotFoundPage(domain: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dominio no configurado</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { text-align: center; padding: 3rem; background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-width: 500px; margin: 1rem; }
        h1 { color: #1f2937; margin-bottom: 0.5rem; font-size: 1.5rem; }
        p { color: #6b7280; line-height: 1.6; }
        code { background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.875rem; color: #4f46e5; }
        a { color: #4f46e5; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 Dominio no configurado</h1>
        <p>El dominio <code>${domain}</code> no está asociado a ningún proyecto activo.</p>
        <p style="margin-top: 1.5rem;">Si eres el propietario, configura este dominio en tu <a href="https://quimera.ai/dashboard">panel de control</a>.</p>
    </div>
</body>
</html>`;
}

function get404Page(project: ProjectData, hostname: string): string {
    const theme = project.theme || {};
    const globalColors = theme.globalColors || {};

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página no encontrada | ${project.name}</title>
    <style>
        body { 
            font-family: system-ui, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            background: ${globalColors.background || '#0f172a'}; 
            color: ${globalColors.text || '#94a3b8'};
        }
        .container { text-align: center; padding: 3rem; }
        h1 { font-size: 6rem; margin: 0; color: ${globalColors.primary || '#4f46e5'}; }
        p { margin: 1rem 0; }
        a { 
            display: inline-block; 
            padding: 0.75rem 2rem; 
            background: ${globalColors.primary || '#4f46e5'}; 
            color: #fff; 
            text-decoration: none; 
            border-radius: 0.5rem; 
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p style="color: ${globalColors.heading || '#f8fafc'}; font-size: 1.5rem;">Página no encontrada</p>
        <p>La página que buscas no existe o ha sido movida.</p>
        <a href="/">Volver al inicio</a>
    </div>
</body>
</html>`;
}

function getErrorPage(): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1f2937; color: #9ca3af; }
        .container { text-align: center; padding: 3rem; }
        h1 { color: #f87171; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ Error del servidor</h1>
        <p>Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.</p>
    </div>
</body>
</html>`;
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
    console.log(`🚀 SSR Server (Multi-Page) running on port ${PORT}`);
    console.log(`   App URL: ${APP_URL}`);
});













