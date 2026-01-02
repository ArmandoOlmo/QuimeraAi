/**
 * SSR Renderer
 * 
 * Renders the storefront React app on the server for custom domains.
 * Provides SEO benefits and fast initial load.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Only import vite types - actual usage is dynamic
type ViteDevServer = import('vite').ViteDevServer;
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin initialization
let db: Firestore;

function getFirestoreDb(): Firestore {
    if (!db) {
        if (getApps().length === 0) {
            initializeApp();
        }
        db = getFirestore();
    }
    return db;
}

export interface SSRRenderOptions {
    projectId: string;
    url: string;
    hostname?: string; // Custom domain hostname
    isProduction: boolean;
    vite: ViteDevServer | null;
}

export interface ProjectData {
    id: string;
    name: string;
    theme?: any;
    data?: any;
    seoConfig?: any;
    brandIdentity?: any;
    aiAssistantConfig?: any;
}

/**
 * Render storefront with SSR
 */
export async function renderStorefront(options: SSRRenderOptions): Promise<string> {
    const { projectId, url, hostname, isProduction, vite } = options;

    // Fetch project data for SSR
    const projectData = await fetchProjectData(projectId);
    
    if (!projectData) {
        throw new Error(`Project ${projectId} not found`);
    }

    // Generate the HTML with injected data
    let template: string;
    let render: (url: string, projectData: ProjectData) => Promise<{ html: string; head: string }>;

    if (isProduction) {
        // Production: use pre-built files
        // In Docker: __dirname = /app/server/dist, so we need to go up 2 levels to /app
        template = fs.readFileSync(
            path.resolve(__dirname, '../../dist/client/index.html'),
            'utf-8'
        );
        
        // Import the server entry
        const serverModule = await import(path.resolve(__dirname, '../../dist/server/entry-server.js'));
        render = serverModule.render;
    } else {
        // Development: use Vite's transform
        // In dev: __dirname = /app/server, so we need to go up 1 level to /app
        template = fs.readFileSync(
            path.resolve(__dirname, '../index.html'),
            'utf-8'
        );
        template = await vite!.transformIndexHtml(url, template);
        
        const serverModule = await vite!.ssrLoadModule('/entry-server.tsx');
        render = serverModule.render;
    }

    // Render the app
    const { html: appHtml, head: headTags } = await render(url, projectData);

    // Generate SEO meta tags
    const seoTags = generateSEOTags(projectData, hostname);

    // Inject the rendered HTML and data into the template
    const finalHtml = template
        // Replace placeholder for SSR content
        .replace('<!--ssr-outlet-->', appHtml)
        // Inject SEO tags in head
        .replace('</head>', `${seoTags}\n${headTags}\n</head>`)
        // Inject initial state for hydration
        .replace(
            '</body>',
            `<script>window.__INITIAL_STATE__ = ${JSON.stringify({
                projectId,
                projectData: sanitizeForClient(projectData),
                hostname
            }).replace(/</g, '\\u003c')}</script>\n</body>`
        );

    return finalHtml;
}

/**
 * Fetch project data from Firestore
 */
async function fetchProjectData(projectId: string): Promise<ProjectData | null> {
    try {
        const firestore = getFirestoreDb();
        
        // First try publicStores (published stores)
        const publicStoreDoc = await firestore.collection('publicStores').doc(projectId).get();
        
        if (publicStoreDoc.exists) {
            const data = publicStoreDoc.data()!;
            return {
                id: projectId,
                name: data.name || 'Store',
                theme: data.theme,
                data: data.data,
                seoConfig: data.seoConfig,
                brandIdentity: data.brandIdentity,
                aiAssistantConfig: data.aiAssistantConfig
            };
        }

        // If not in publicStores, try to find via the userId
        // This requires the domain mapping to have userId
        console.warn(`[SSR] Project ${projectId} not found in publicStores`);
        return null;

    } catch (error) {
        console.error(`[SSR] Error fetching project ${projectId}:`, error);
        return null;
    }
}

/**
 * Generate SEO meta tags based on project data
 */
function generateSEOTags(project: ProjectData, hostname?: string): string {
    const seo = project.seoConfig || {};
    const brand = project.brandIdentity || {};
    
    const title = seo.title || project.name || 'Tienda Online';
    const description = seo.description || brand.tagline || `Bienvenido a ${project.name}`;
    const image = seo.ogImage || brand.logoUrl || '';
    const url = hostname ? `https://${hostname}` : '';

    const tags = [
        // Basic SEO
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}">`,
        seo.keywords?.length ? `<meta name="keywords" content="${escapeHtml(seo.keywords.join(', '))}">` : '',
        seo.author ? `<meta name="author" content="${escapeHtml(seo.author)}">` : '',
        
        // Open Graph
        `<meta property="og:type" content="${seo.ogType || 'website'}">`,
        `<meta property="og:title" content="${escapeHtml(seo.ogTitle || title)}">`,
        `<meta property="og:description" content="${escapeHtml(seo.ogDescription || description)}">`,
        image ? `<meta property="og:image" content="${escapeHtml(image)}">` : '',
        seo.ogImageAlt ? `<meta property="og:image:alt" content="${escapeHtml(seo.ogImageAlt)}">` : '',
        url ? `<meta property="og:url" content="${escapeHtml(url)}">` : '',
        `<meta property="og:site_name" content="${escapeHtml(seo.ogSiteName || project.name)}">`,
        
        // Twitter Card
        `<meta name="twitter:card" content="${seo.twitterCard || 'summary_large_image'}">`,
        `<meta name="twitter:title" content="${escapeHtml(seo.twitterTitle || title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(seo.twitterDescription || description)}">`,
        image ? `<meta name="twitter:image" content="${escapeHtml(seo.twitterImage || image)}">` : '',
        seo.twitterSite ? `<meta name="twitter:site" content="${escapeHtml(seo.twitterSite)}">` : '',
        seo.twitterCreator ? `<meta name="twitter:creator" content="${escapeHtml(seo.twitterCreator)}">` : '',
        
        // Canonical URL (important for custom domains)
        (seo.canonical || url) ? `<link rel="canonical" href="${escapeHtml(seo.canonical || url)}">` : '',
        
        // Robots
        `<meta name="robots" content="${seo.robots || 'index, follow'}">`,
        
        // Site Verification
        seo.googleSiteVerification ? `<meta name="google-site-verification" content="${escapeHtml(seo.googleSiteVerification)}">` : '',
        seo.bingVerification ? `<meta name="msvalidate.01" content="${escapeHtml(seo.bingVerification)}">` : '',
        
        // AI Bot Optimization
        seo.aiCrawlable ? `<meta name="ai:crawlable" content="true">` : '',
        seo.aiDescription ? `<meta name="ai:description" content="${escapeHtml(seo.aiDescription)}">` : '',
        seo.aiKeyTopics?.length ? `<meta name="ai:topics" content="${escapeHtml(seo.aiKeyTopics.join(', '))}">` : '',
    ];

    // Add Schema.org JSON-LD
    const schemaType = seo.schemaType || 'WebSite';
    const schema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        'name': project.name,
        'description': description,
        'url': url || undefined,
        'image': image || undefined,
        ...(seo.schemaData || {}),
    };

    tags.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);

    return tags.filter(Boolean).join('\n    ');
}

/**
 * Sanitize project data for client-side (remove sensitive info)
 */
function sanitizeForClient(project: ProjectData): Partial<ProjectData> {
    return {
        id: project.id,
        name: project.name,
        theme: project.theme,
        aiAssistantConfig: project.aiAssistantConfig,
        // Don't include full data - client will fetch as needed
        seoConfig: project.seoConfig ? {
            title: project.seoConfig.title,
            description: project.seoConfig.description
        } : undefined
    };
}

/**
 * Escape HTML entities for safe injection
 */
function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}










