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
    userId?: string; // Domain owner's userId for __DOMAIN_CONFIG__
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
    const { projectId, url, hostname, userId, isProduction, vite } = options;

    console.log(`[SSR] renderStorefront called for project: ${projectId}, url: ${url}`);

    // =========================================================================
    // STEP 1: Fetch project data from Firestore (server-side, cached)
    // This is the key value-add: the client gets data instantly via __INITIAL_DATA__
    // without making its own Firestore call.
    // =========================================================================
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

    // =========================================================================
    // STEP 2: Load the HTML template (SPA shell)
    // =========================================================================
    let template: string;

    if (isProduction) {
        template = fs.readFileSync(
            path.resolve(__dirname, '../../dist/client/index.html'),
            'utf-8'
        );
    } else {
        template = fs.readFileSync(
            path.resolve(__dirname, '../index.html'),
            'utf-8'
        );
        template = await vite!.transformIndexHtml(url, template);
    }

    // =========================================================================
    // STEP 3: Generate SEO meta tags (server-side — critical for crawlers)
    // =========================================================================
    const seoTags = generateSEOTags(projectData, hostname);

    // =========================================================================
    // STEP 4: Sanitize & serialize project data for client-side hydration
    // PublicWebsitePreview.tsx reads window.__INITIAL_DATA__ and renders
    // immediately without making a Firestore call.
    // =========================================================================
    let sanitizedData;
    try {
        sanitizedData = sanitizeForClient(projectData);
    } catch (sanitizeError) {
        console.error(`[SSR] Sanitization failed:`, sanitizeError);
        throw sanitizeError;
    }

    // =========================================================================
    // STEP 5: Generate branded skeleton HTML
    // Uses the project's own theme colors and logo so the user sees
    // their brand while React loads — instead of a blank screen or error.
    // =========================================================================
    const skeletonHtml = generateBrandedSkeleton(projectData);

    // =========================================================================
    // STEP 6: Assemble final HTML
    // =========================================================================
    const domainConfig = hostname ? JSON.stringify({
        domain: hostname,
        projectId,
        userId: userId || '',
        isCustomDomain: true,
        primaryColor: projectData.theme?.globalColors?.primary,
        backgroundColor: projectData.theme?.pageBackground || projectData.theme?.globalColors?.background,
        projectName: projectData.name,
    }).replace(/</g, '\\u003c') : null;

    const initialDataScript = `<script>window.__INITIAL_DATA__ = { project: ${JSON.stringify(sanitizedData).replace(/</g, '\\u003c')}, projectId: "${projectId}" };${domainConfig ? `\nwindow.__DOMAIN_CONFIG__ = ${domainConfig};` : ''}</script>`;

    const finalHtml = template
        // Inject branded skeleton into the root element
        .replace('<!--ssr-outlet-->', skeletonHtml)
        // Inject SEO tags in head
        .replace('</head>', `${seoTags}\n</head>`)
        // Inject initial state for instant client-side hydration
        .replace('</body>', `${initialDataScript}\n</body>`);
    
    console.log(`[SSR] SPA Shell generated with branded skeleton for "${projectData.name}"`);
    return finalHtml;
}

/**
 * Generate a branded loading skeleton using the project's theme
 * 
 * This is shown briefly while React loads client-side. It uses the project's
 * own colors and logo so the user sees their brand — not a blank screen or error.
 * React will replace this entirely when it mounts.
 */
function generateBrandedSkeleton(project: ProjectData): string {
    const theme = project.theme || {};
    const globalColors = theme.globalColors || {};
    const bgColor = theme.pageBackground || globalColors.background || '#0f172a';
    const primaryColor = globalColors.primary || '#6366f1';
    const textColor = globalColors.heading || '#f8fafc';
    
    // Try to find a logo from various sources
    const logoUrl = project.data?.header?.logoUrl 
        || project.data?.header?.logoImage
        || project.brandIdentity?.logoUrl
        || project.faviconUrl
        || '';
    
    const projectName = project.name || '';

    // Build the skeleton: logo + subtle pulse animation
    // Matches the project's visual identity for a seamless loading experience
    return `
    <div id="ssr-skeleton" style="
        min-height: 100vh;
        background: ${bgColor};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        transition: opacity 0.3s ease;
    ">
        <style>
            @keyframes ssr-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes ssr-spin {
                to { transform: rotate(360deg); }
            }
            #ssr-skeleton .ssr-logo {
                animation: ssr-pulse 2s ease-in-out infinite;
            }
            #ssr-skeleton .ssr-spinner {
                width: 32px;
                height: 32px;
                border: 2px solid ${primaryColor}33;
                border-top-color: ${primaryColor};
                border-radius: 50%;
                animation: ssr-spin 0.8s linear infinite;
            }
        </style>
        ${logoUrl ? `
        <div style="margin-bottom: 24px;">
            <img 
                src="${escapeHtml(logoUrl)}" 
                alt="${escapeHtml(projectName)}"
                class="ssr-logo"
                style="max-width: 120px; max-height: 80px; object-fit: contain;"
                onerror="this.style.display='none'"
            />
        </div>
        ` : ''}
        <div class="ssr-spinner"></div>
        ${projectName ? `
        <p style="
            color: ${textColor}88;
            font-size: 0.875rem;
            margin-top: 16px;
            letter-spacing: 0.025em;
        ">${escapeHtml(projectName)}</p>
        ` : ''}
    </div>
    <script>
        // Remove skeleton smoothly when React takes over
        window.__removeSkeleton = function() {
            var el = document.getElementById('ssr-skeleton');
            if (el) {
                el.style.opacity = '0';
                setTimeout(function() { el.remove(); }, 300);
            }
        };
    </script>`;
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
 * Convert FontFamily key to Google Fonts API name
 * Handles special cases where simple capitalization doesn't work
 */
const fontNameOverrides: Record<string, string> = {
    'pt-sans': 'PT Sans',
    'pt-serif': 'PT Serif',
    'amatic-sc': 'Amatic SC',
    'source-sans-pro': 'Source Sans 3',
};

function formatFontNameForApi(font: string): string {
    if (fontNameOverrides[font]) return fontNameOverrides[font];
    // Simple capitalization: 'open-sans' → 'Open Sans'
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// CSS font-family stacks (must match fontLoader.ts)
const ssrFontStacks: Record<string, string> = {
    'source-sans-pro': "'Source Sans 3', 'Source Sans Pro', sans-serif",
    'pt-sans': "'PT Sans', sans-serif",
    'pt-serif': "'PT Serif', serif",
    'amatic-sc': "'Amatic SC', cursive",
};

function getFontStackForCss(font: string): string {
    if (ssrFontStacks[font]) return ssrFontStacks[font];
    return `'${formatFontNameForApi(font)}', system-ui, sans-serif`;
}

/**
 * Generate Google Fonts link based on project theme
 */
function generateFontTags(project: ProjectData): string {
    const theme = project.theme || {};
    
    // Get font families from theme (these are hyphenated keys like 'pt-sans')
    const fonts: string[] = [];
    if (theme.fontFamilyHeader) fonts.push(theme.fontFamilyHeader);
    if (theme.fontFamilyBody) fonts.push(theme.fontFamilyBody);
    if (theme.fontFamilyButton) fonts.push(theme.fontFamilyButton);
    if (theme.fontFamily) fonts.push(theme.fontFamily);
    
    // Remove duplicates and system fonts
    const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman'];
    const uniqueFontKeys = [...new Set(fonts)]
        .filter(f => f && !systemFonts.includes(f));
    
    // Convert hyphenated keys to proper Google Fonts API names
    const googleFontNames = uniqueFontKeys.map(f => formatFontNameForApi(f));
    
    if (googleFontNames.length === 0) {
        // Default fonts if none specified
        googleFontNames.push('Inter', 'Plus Jakarta Sans');
    }
    
    // Generate font families string (URL-encoded names)
    const fontFamilies = googleFontNames
        .map(f => `family=${f.replace(/\s/g, '+')}:wght@300;400;500;600;700`)
        .join('&');
    
    // Generate CSS font-family stacks using proper names
    const headerStack = theme.fontFamilyHeader ? getFontStackForCss(theme.fontFamilyHeader) : "'Plus Jakarta Sans', system-ui, sans-serif";
    const bodyStack = theme.fontFamilyBody ? getFontStackForCss(theme.fontFamilyBody) : "'Inter', system-ui, sans-serif";
    const buttonStack = theme.fontFamilyButton ? getFontStackForCss(theme.fontFamilyButton) : bodyStack;
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
            --font-header: ${headerStack};
            --font-body: ${bodyStack};
            --font-button: ${buttonStack};
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










