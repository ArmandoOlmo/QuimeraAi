/**
 * SSR Renderer
 * 
 * Renders the storefront React app on the server for custom domains.
 * Provides SEO benefits and fast initial load.
 */

import fs from 'fs';
import path from 'path';
import { ViteDevServer } from 'vite';
import { initializeApp, getApps, App } from 'firebase-admin/app';
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
        template = fs.readFileSync(
            path.resolve(__dirname, '../dist/client/index.html'),
            'utf-8'
        );
        
        // Import the server entry
        const serverModule = await import(path.resolve(__dirname, '../dist/server/entry-server.js'));
        render = serverModule.render;
    } else {
        // Development: use Vite's transform
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
                brandIdentity: data.brandIdentity
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
        
        // Open Graph
        `<meta property="og:type" content="website">`,
        `<meta property="og:title" content="${escapeHtml(seo.ogTitle || title)}">`,
        `<meta property="og:description" content="${escapeHtml(seo.ogDescription || description)}">`,
        image ? `<meta property="og:image" content="${escapeHtml(image)}">` : '',
        url ? `<meta property="og:url" content="${escapeHtml(url)}">` : '',
        `<meta property="og:site_name" content="${escapeHtml(project.name)}">`,
        
        // Twitter Card
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeHtml(seo.twitterTitle || title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(seo.twitterDescription || description)}">`,
        image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : '',
        
        // Canonical URL (important for custom domains)
        url ? `<link rel="canonical" href="${escapeHtml(url)}">` : '',
        
        // Robots
        `<meta name="robots" content="${seo.robots || 'index, follow'}">`,
    ];

    // Add Schema.org JSON-LD for store
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        'name': project.name,
        'description': description,
        'url': url || undefined,
        'image': image || undefined,
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


