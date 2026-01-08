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
    // Complete project data for proper rendering
    componentStyles?: any;
    componentOrder?: string[];
    sectionVisibility?: Record<string, boolean>;
    pages?: any[];
    menus?: any[];
    designTokens?: any;
    responsiveStyles?: any;
    header?: any;
    footer?: any;
    faviconUrl?: string;
    thumbnailUrl?: string;
    componentStatus?: any;
}

/**
 * Render storefront with SSR
 */
export async function renderStorefront(options: SSRRenderOptions): Promise<string> {
    const { projectId, url, hostname, isProduction, vite } = options;

    console.log(`[SSR] renderStorefront called for project: ${projectId}, url: ${url}`);

    // Fetch project data for SSR
    let projectData: ProjectData | null = null;
    try {
        projectData = await fetchProjectData(projectId);
        console.log(`[SSR] Project data fetched: ${projectData ? 'success' : 'null'}`);
    } catch (fetchError) {
        console.error(`[SSR] Error fetching project data:`, fetchError);
        throw fetchError;
    }
    
    if (!projectData) {
        throw new Error(`Project ${projectId} not found`);
    }

    // Generate the HTML with injected data
    let template: string;
    let render: (options: { url: string; project: ProjectData }) => Promise<{ html: string; head: string; statusCode?: number }>;

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

    // Render the app - use the new RenderOptions format
    console.log(`[SSR] Starting React render...`);
    let renderResult;
    try {
        renderResult = await render({ url, project: projectData });
        console.log(`[SSR] React render completed`);
    } catch (renderError) {
        console.error(`[SSR] React render failed:`, renderError);
        throw renderError;
    }
    const { html: appHtml, head: headTags } = renderResult;

    // Generate SEO meta tags
    const seoTags = generateSEOTags(projectData, hostname);

    // Sanitize and serialize project data for client
    console.log(`[SSR] Sanitizing project data for client...`);
    let sanitizedData;
    try {
        sanitizedData = sanitizeForClient(projectData);
        console.log(`[SSR] Data sanitized, serializing...`);
    } catch (sanitizeError) {
        console.error(`[SSR] Sanitization failed:`, sanitizeError);
        throw sanitizeError;
    }

    let serializedState;
    try {
        serializedState = JSON.stringify({
            projectId,
            projectData: sanitizedData,
            hostname
        }).replace(/</g, '\\u003c');
        console.log(`[SSR] Serialization successful`);
    } catch (serializeError) {
        console.error(`[SSR] JSON serialization failed:`, serializeError);
        throw serializeError;
    }

    // Inject the rendered HTML and data into the template
    const finalHtml = template
        // Replace placeholder for SSR content
        .replace('<!--ssr-outlet-->', appHtml)
        // Inject SEO tags in head
        .replace('</head>', `${seoTags}\n${headTags}\n</head>`)
        // Inject initial state for hydration
    // CRITICAL: Use __INITIAL_DATA__ to match what PublicWebsitePreview.tsx expects
        .replace(
            '</body>',
            `<script>window.__INITIAL_DATA__ = { project: ${JSON.stringify(sanitizedData).replace(/</g, '\\u003c')}, projectId: "${projectId}" };</script>\n</body>`
        );
    
    console.log(`[SSR] HTML generation completed`);
    return finalHtml;
}

/**
 * Fetch project data from Firestore
 */
async function fetchProjectData(projectId: string): Promise<ProjectData | null> {
    try {
        const firestore = getFirestoreDb();
        
        console.log(`[SSR] fetchProjectData called for projectId: ${projectId}`);
        
        // First try publicStores (published stores)
        const publicStoreDoc = await firestore.collection('publicStores').doc(projectId).get();
        
        if (publicStoreDoc.exists) {
            const data = publicStoreDoc.data()!;
            // Log data from publicStores for debugging
            console.log(`[SSR] publicStores data:`, {
                hasData: !!data.data,
                hasTheme: !!data.theme,
                hasComponentStyles: !!data.componentStyles,
                componentStylesCount: data.componentStyles ? Object.keys(data.componentStyles).length : 0,
                hasPages: !!data.pages,
                pagesCount: data.pages?.length || 0,
                hasComponentOrder: !!data.componentOrder,
                componentOrderCount: data.componentOrder?.length || 0,
                heroVariant: data.data?.hero?.heroVariant,
                headerLogoText: data.data?.header?.logoText,
            });
            return {
                id: projectId,
                name: data.name || 'Store',
                theme: data.theme,
                data: data.data,
                seoConfig: data.seoConfig,
                brandIdentity: data.brandIdentity,
                aiAssistantConfig: data.aiAssistantConfig,
                // Complete project data for proper rendering
                componentStyles: data.componentStyles || null,
                componentOrder: data.componentOrder || [],
                sectionVisibility: data.sectionVisibility || {},
                pages: data.pages || [],
                menus: data.menus || [],
                designTokens: data.designTokens || null,
                responsiveStyles: data.responsiveStyles || null,
                header: data.header || null,
                footer: data.footer || null,
                faviconUrl: data.faviconUrl || null,
                thumbnailUrl: data.thumbnailUrl || null,
                componentStatus: data.componentStatus || null,
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
 * Generate Google Fonts link based on project theme
 */
function generateFontTags(project: ProjectData): string {
    const theme = project.theme || {};
    
    // Get font families from theme
    const fonts: string[] = [];
    if (theme.fontFamilyHeader) fonts.push(theme.fontFamilyHeader);
    if (theme.fontFamilyBody) fonts.push(theme.fontFamilyBody);
    if (theme.fontFamilyButton) fonts.push(theme.fontFamilyButton);
    if (theme.fontFamily) fonts.push(theme.fontFamily);
    
    // Remove duplicates and system fonts
    const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman'];
    const uniqueFonts = [...new Set(fonts)]
        .filter(f => f && !systemFonts.includes(f))
        .map(f => f.replace(/\s+/g, '+'));
    
    if (uniqueFonts.length === 0) {
        // Default fonts if none specified
        uniqueFonts.push('Inter', 'Plus+Jakarta+Sans');
    }
    
    // Generate font families string
    const fontFamilies = uniqueFonts.map(f => `family=${f}:wght@300;400;500;600;700`).join('&');
    
    // Generate CSS for font application
    const fontHeaderFamily = theme.fontFamilyHeader || 'Plus Jakarta Sans';
    const fontBodyFamily = theme.fontFamilyBody || 'Inter';
    const fontButtonFamily = theme.fontFamilyButton || fontBodyFamily;
    const globalColors = theme.globalColors || {};
    const pageBackground = theme.pageBackground || globalColors.background || '#ffffff';
    
    return `
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap" rel="stylesheet">
    
    <!-- Theme Styles -->
    <style>
        :root {
            --font-header: '${fontHeaderFamily}', system-ui, sans-serif;
            --font-body: '${fontBodyFamily}', system-ui, sans-serif;
            --font-button: '${fontButtonFamily}', system-ui, sans-serif;
        }
        body {
            font-family: var(--font-body);
            background-color: ${pageBackground};
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-header);
        }
        button, .btn {
            font-family: var(--font-button);
        }
    </style>
    `;
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
    
    // Get font tags first
    const fontTags = generateFontTags(project);

    const tags = [
        // Fonts
        fontTags,
        
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
    // Include ALL necessary fields for client-side rendering
    // The client needs complete data to render correctly without re-fetching
    try {
        const sanitized: Partial<ProjectData> = {
            id: project.id,
            name: project.name,
            theme: project.theme || null,
            data: project.data || null,
            componentStyles: project.componentStyles || null,
            componentOrder: project.componentOrder || [],
            sectionVisibility: project.sectionVisibility || {},
            pages: project.pages || [],
            menus: project.menus || [],
            header: project.header || null,
            footer: project.footer || null,
            aiAssistantConfig: project.aiAssistantConfig || null,
            brandIdentity: project.brandIdentity || null,
            designTokens: project.designTokens || null,
            responsiveStyles: project.responsiveStyles || null,
            componentStatus: project.componentStatus || null,
            seoConfig: project.seoConfig || null,
            faviconUrl: project.faviconUrl,
            thumbnailUrl: project.thumbnailUrl,
        };
        
        // Verify it can be serialized
        JSON.stringify(sanitized);
        return sanitized;
    } catch (error) {
        console.error('[SSR] Error sanitizing project data:', error);
        // Fallback to minimal data if serialization fails
        return {
            id: project.id,
            name: project.name,
            theme: project.theme,
            seoConfig: project.seoConfig ? {
                title: project.seoConfig.title,
                description: project.seoConfig.description
            } : undefined
        };
    }
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










