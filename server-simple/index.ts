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
    categories: any[] = []
): string {
    const theme = project.theme || {};
    const globalColors = theme.globalColors || {};
    const primaryColor = globalColors.primary || '#4f46e5';
    const backgroundColor = globalColors.background || theme.pageBackground || '#0f172a';
    const textColor = globalColors.text || '#94a3b8';
    const headingColor = globalColors.heading || '#f8fafc';
    
    // Get favicon
    const favicon = project.seoConfig?.favicon || '';
    
    // Build navigation links from pages
    const navLinks = (project.pages || [])
        .filter((p: SitePage) => p.showInNavigation)
        .sort((a: SitePage, b: SitePage) => (a.navigationOrder || 0) - (b.navigationOrder || 0))
        .map((p: SitePage) => `<a href="${p.slug}" style="color: ${headingColor}; text-decoration: none; padding: 0.5rem 1rem;">${p.title}</a>`)
        .join('');
    
    // Build page content
    let pageContent = '';
    
    // Hero section if present
    const heroData = page.sectionData?.hero || project.data?.hero;
    if (page.sections.includes('hero') && heroData) {
        pageContent += `
        <section style="padding: 4rem 1rem; text-align: center; background: ${heroData.colors?.background || backgroundColor};">
            <div style="max-width: 1200px; margin: 0 auto;">
                <h1 style="font-size: 2.5rem; font-weight: bold; color: ${heroData.colors?.heading || headingColor}; margin-bottom: 1rem;">
                    ${stripHtml(heroData.headline || '')}
                </h1>
                <p style="font-size: 1.125rem; color: ${heroData.colors?.text || textColor}; margin-bottom: 2rem;">
                    ${heroData.subheadline || ''}
                </p>
                ${heroData.primaryCta ? `
                <a href="${heroData.primaryCtaLink || '#'}" 
                   style="display: inline-block; padding: 0.75rem 2rem; background: ${heroData.colors?.buttonBackground || primaryColor}; 
                          color: ${heroData.colors?.buttonText || '#fff'}; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">
                    ${heroData.primaryCta}
                </a>
                ` : ''}
            </div>
        </section>`;
    }
    
    // Dynamic content for product/category/article pages
    if (page.type === 'dynamic' && dynamicData) {
        if (dynamicData.product) {
            const p = dynamicData.product;
            pageContent += `
            <section style="padding: 4rem 1rem; background: ${backgroundColor};">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                    <div>
                        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width: 100%; border-radius: 0.5rem;">` : ''}
                    </div>
                    <div>
                        <h1 style="font-size: 2rem; font-weight: bold; color: ${headingColor}; margin-bottom: 1rem;">${p.name}</h1>
                        <p style="font-size: 1.5rem; font-weight: bold; color: ${primaryColor}; margin-bottom: 1rem;">$${(p.price || 0).toFixed(2)}</p>
                        <p style="color: ${textColor}; margin-bottom: 2rem;">${p.description || ''}</p>
                        <button style="padding: 0.75rem 2rem; background: ${primaryColor}; color: #fff; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer;">
                            Agregar al Carrito
                        </button>
                    </div>
                </div>
            </section>`;
        }
        
        if (dynamicData.category) {
            const c = dynamicData.category;
            pageContent += `
            <section style="padding: 4rem 1rem; background: ${backgroundColor};">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h1 style="font-size: 2rem; font-weight: bold; color: ${headingColor}; margin-bottom: 1rem;">${c.name}</h1>
                    <p style="color: ${textColor}; margin-bottom: 2rem;">${c.description || ''}</p>
                    <div id="category-products" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
                        <!-- Products will be loaded client-side -->
                        <p style="color: ${textColor};">Cargando productos...</p>
                    </div>
                </div>
            </section>`;
        }
        
        if (dynamicData.article) {
            const a = dynamicData.article;
            pageContent += `
            <article style="padding: 4rem 1rem; background: ${backgroundColor};">
                <div style="max-width: 800px; margin: 0 auto;">
                    ${a.featuredImage ? `<img src="${a.featuredImage}" alt="${a.title}" style="width: 100%; border-radius: 0.5rem; margin-bottom: 2rem;">` : ''}
                    <h1 style="font-size: 2.5rem; font-weight: bold; color: ${headingColor}; margin-bottom: 1rem;">${a.title}</h1>
                    ${a.author ? `<p style="color: ${textColor}; margin-bottom: 2rem;">Por ${a.author}</p>` : ''}
                    <div style="color: ${textColor}; line-height: 1.8;">
                        ${a.content || ''}
                    </div>
                </div>
            </article>`;
        }
    }
    
    // Features section if present
    const featuresData = page.sectionData?.features || project.data?.features;
    if (page.sections.includes('features') && featuresData) {
        const items = featuresData.items || [];
        pageContent += `
        <section style="padding: 4rem 1rem; background: ${featuresData.colors?.background || backgroundColor};">
            <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                <h2 style="font-size: 2rem; font-weight: bold; color: ${featuresData.colors?.heading || headingColor}; margin-bottom: 1rem;">
                    ${featuresData.title || ''}
                </h2>
                <p style="color: ${featuresData.colors?.text || textColor}; margin-bottom: 3rem;">
                    ${featuresData.description || ''}
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
                    ${items.map((item: any) => `
                    <div style="padding: 1.5rem; background: ${featuresData.colors?.cardBackground || globalColors.surface || '#1e293b'}; border-radius: 0.75rem;">
                        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem;">` : ''}
                        <h3 style="color: ${headingColor}; margin-bottom: 0.5rem;">${item.title}</h3>
                        <p style="color: ${textColor}; font-size: 0.875rem;">${item.description}</p>
                    </div>
                    `).join('')}
                </div>
            </div>
        </section>`;
    }
    
    // CTA section if present
    const ctaData = page.sectionData?.cta || project.data?.cta;
    if (page.sections.includes('cta') && ctaData) {
        pageContent += `
        <section style="padding: 4rem 1rem; background: linear-gradient(135deg, ${ctaData.colors?.gradientStart || primaryColor}, ${ctaData.colors?.gradientEnd || '#10b981'});">
            <div style="max-width: 800px; margin: 0 auto; text-align: center;">
                <h2 style="font-size: 2rem; font-weight: bold; color: ${ctaData.colors?.heading || '#fff'}; margin-bottom: 1rem;">
                    ${ctaData.title || ''}
                </h2>
                <p style="color: ${ctaData.colors?.text || 'rgba(255,255,255,0.9)'}; margin-bottom: 2rem;">
                    ${ctaData.description || ''}
                </p>
                <a href="${ctaData.buttonUrl || '#'}" 
                   style="display: inline-block; padding: 0.75rem 2rem; background: ${ctaData.colors?.buttonBackground || '#fff'}; 
                          color: ${ctaData.colors?.buttonText || primaryColor}; border-radius: 0.5rem; text-decoration: none; font-weight: 500;">
                    ${ctaData.buttonText || 'Get Started'}
                </a>
            </div>
        </section>`;
    }
    
    // Footer if present
    const footerData = page.sectionData?.footer || project.data?.footer;
    if (page.sections.includes('footer') && footerData) {
        pageContent += `
        <footer style="padding: 3rem 1rem; background: ${footerData.colors?.background || primaryColor}; color: ${footerData.colors?.text || '#fff'};">
            <div style="max-width: 1200px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <h3 style="font-weight: bold; margin-bottom: 1rem; color: ${footerData.colors?.heading || '#fff'};">
                            ${footerData.title || project.name}
                        </h3>
                        <p style="font-size: 0.875rem; opacity: 0.9;">${footerData.description || ''}</p>
                    </div>
                    ${(footerData.linkColumns || []).map((col: any) => `
                    <div>
                        <h4 style="font-weight: 600; margin-bottom: 0.75rem;">${col.title}</h4>
                        ${(col.links || []).map((link: any) => `
                        <a href="${link.href}" style="display: block; color: inherit; opacity: 0.9; margin-bottom: 0.5rem; text-decoration: none; font-size: 0.875rem;">${link.text}</a>
                        `).join('')}
                    </div>
                    `).join('')}
                </div>
                <div style="border-top: 1px solid ${footerData.colors?.border || 'rgba(255,255,255,0.2)'}; padding-top: 1.5rem; text-align: center; font-size: 0.875rem; opacity: 0.8;">
                    ${footerData.copyrightText?.replace('{YEAR}', new Date().getFullYear().toString()) || `© ${new Date().getFullYear()} ${project.name}`}
                </div>
            </div>
        </footer>`;
    }
    
    // Full HTML document
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
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamilyHeader || 'Poppins')}:wght@400;500;600;700&family=${encodeURIComponent(theme.fontFamilyBody || 'Mulish')}:wght@400;500;600&display=swap" rel="stylesheet">
    
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: '${theme.fontFamilyBody || 'Mulish'}', system-ui, sans-serif;
            background: ${backgroundColor};
            color: ${textColor};
            line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 { 
            font-family: '${theme.fontFamilyHeader || 'Poppins'}', system-ui, sans-serif;
        }
        a { transition: opacity 0.2s; }
        a:hover { opacity: 0.8; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <!-- Header -->
    <header style="position: sticky; top: 0; z-index: 100; background: ${project.data?.header?.colors?.background || primaryColor}; padding: 1rem;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
            <a href="/" style="font-size: 1.25rem; font-weight: bold; color: ${project.data?.header?.colors?.text || '#fff'}; text-decoration: none;">
                ${project.data?.header?.logoText || project.name}
            </a>
            <nav style="display: flex; gap: 0.5rem;">
                ${navLinks}
            </nav>
        </div>
    </header>
    
    <!-- Main Content -->
    <main>
        ${pageContent || `
        <section style="padding: 4rem 1rem; text-align: center;">
            <h1 style="color: ${headingColor};">${page.title}</h1>
        </section>
        `}
    </main>
    
    <!-- Hydration Script -->
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({
            projectId: project.id,
            path,
            pageId: page.id,
            dynamicData: dynamicData || null,
            // Full project data for client-side hydration with PageRenderer
            project: {
                id: project.id,
                name: project.name,
                pages: project.pages || [],
                data: project.data,
                theme: project.theme,
                brandIdentity: project.brandIdentity,
                componentOrder: project.componentOrder,
                sectionVisibility: project.sectionVisibility,
                menus: project.menus || [],
            },
            // Pre-loaded products and categories for ecommerce pages
            products: products || [],
            categories: categories || [],
        })};
    </script>
    
    <!-- Client-side hydration will happen here -->
    <script src="${APP_URL}/assets/hydrate.js" async></script>
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
        
        const { projectId } = domainData;
        
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
        
        // 5. Load products and categories for hydration (for ecommerce sections)
        let products: any[] = [];
        let categories: any[] = [];
        try {
            const [productsSnap, categoriesSnap] = await Promise.all([
                db.collection('publicStores').doc(projectId).collection('products').limit(50).get(),
                db.collection('publicStores').doc(projectId).collection('categories').get(),
            ]);
            products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.log('[SSR] Could not load products/categories:', e);
        }
        
        // 6. Generate meta tags
        const meta = generateMetaTags(project, page, dynamicData, hostname, path);
        
        // 7. Generate and send HTML
        const html = generateFullHtml(project, page, dynamicData, meta, hostname, path, products, categories);
        
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



