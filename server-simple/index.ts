/**
 * Simple SSR Server for Custom Domains
 * 
 * This minimal server handles custom domain routing:
 * 1. Receives request with custom domain Host header
 * 2. Looks up domain in Firestore (customDomains collection)
 * 3. Serves HTML that renders the full website (landing + ecommerce)
 * 
 * The HTML served loads the project data from publicStores and renders
 * all components (hero, features, testimonials, products, etc.)
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

// Domain resolution result with more data
interface DomainData {
    projectId: string;
    userId: string;
    status: string;
    // Project theme colors for loader styling
    primaryColor?: string;
    backgroundColor?: string;
    projectName?: string;
    // SEO data
    favicon?: string;
    seoTitle?: string;
    seoDescription?: string;
}

// Domain cache (1 minute TTL for faster updates)
const domainCache = new Map<string, { data: DomainData | null; timestamp: number }>();
const CACHE_TTL = 1 * 60 * 1000;

async function resolveDomain(hostname: string): Promise<DomainData | null> {
    const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');
    
    // Check cache
    const cached = domainCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
        
        // Get project colors from publicStores for loader styling
        let primaryColor = '#ffffff'; // Default white
        let backgroundColor = '#0f172a'; // Default dark
        let projectName = normalizedDomain;
        
        // SEO data
        let favicon: string | undefined;
        let seoTitle: string | undefined;
        let seoDescription: string | undefined;
        
        try {
            const projectDoc = await db.collection('publicStores').doc(docData.projectId).get();
            if (projectDoc.exists) {
                const projectData = projectDoc.data()!;
                projectName = projectData.name || normalizedDomain;
                
                // Try to get primary color from various sources
                const theme = projectData.theme || {};
                const heroColors = projectData.data?.hero?.colors || {};
                const heroSplitColors = projectData.data?.heroSplit?.colors || {};
                const globalColors = theme.globalColors || {};
                
                // Priority: globalColors.primary > hero button color > heroSplit button color > default
                primaryColor = globalColors.primary || 
                              heroColors.buttonBackground || 
                              heroSplitColors.buttonBackground ||
                              heroColors.primary ||
                              '#ffffff';
                
                // Background color
                backgroundColor = globalColors.background || 
                                 heroColors.background ||
                                 theme.colors?.background ||
                                 '#0f172a';
                
                // SEO configuration
                const seoConfig = projectData.seoConfig || {};
                favicon = seoConfig.favicon;
                seoTitle = seoConfig.title || projectName;
                seoDescription = seoConfig.description || '';
            }
        } catch (err) {
            console.warn(`[SSR] Could not fetch project colors for ${docData.projectId}:`, err);
        }
        
        const data: DomainData = {
            projectId: docData.projectId,
            userId: docData.userId,
            status: docData.status,
            primaryColor,
            backgroundColor,
            projectName,
            favicon,
            seoTitle,
            seoDescription
        };
        
        domainCache.set(normalizedDomain, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`[SSR] Error resolving domain ${normalizedDomain}:`, error);
        return null;
    }
}

const app = express();

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Debug endpoint to see headers
app.get('/__debug', (req: Request, res: Response) => {
    res.json({
        headers: req.headers,
        hostname: req.hostname,
        host: req.headers.host
    });
});

// Main handler - Serve full website HTML
app.get('*', async (req: Request, res: Response) => {
    // Get the original hostname from various sources
    // Cloudflare/Load Balancer may send the original host in different headers
    const hostname = (req.headers['cf-connecting-host'] as string) ||
                     (req.headers['x-forwarded-host'] as string) || 
                     (req.headers['x-original-host'] as string) ||
                     (req.headers['host'] as string)?.split(':')[0] ||
                     req.hostname;
    const path = req.path;
    
    console.log(`[SSR] Request: ${hostname}${path} (host header: ${req.headers.host})`);
    
    // Resolve domain to project data
    const domainData = await resolveDomain(hostname);
    
    if (!domainData) {
        return res.status(404).send(getNotFoundPage(hostname));
    }
    
    const { projectId, userId, primaryColor, backgroundColor, projectName, favicon, seoTitle, seoDescription } = domainData;
    
    // Serve the full website HTML
    // This HTML loads the app which renders ALL components (landing + ecommerce)
    // The domain stays in the browser URL bar (no redirect!)
    console.log(`[SSR] Serving full website for ${hostname} -> Project ${projectId} (primary: ${primaryColor})`);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // No cache for testing
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(getFullWebsitePage(
        hostname, 
        projectId, 
        userId, 
        path, 
        primaryColor || '#ffffff', 
        backgroundColor || '#0f172a', 
        projectName || hostname,
        favicon,
        seoTitle,
        seoDescription
    ));
});

/**
 * Generate the full website HTML page with embedded iframe
 * Uses an invisible iframe that loads the preview URL,
 * then seamlessly replaces the content
 */
function getFullWebsitePage(
    domain: string, 
    projectId: string, 
    userId: string, 
    path: string,
    primaryColor: string,
    backgroundColor: string,
    projectName: string,
    favicon?: string,
    seoTitle?: string,
    seoDescription?: string
): string {
    // Build the preview URL - this is the full landing page
    // Include colors as query params so the iframe can use them for its loader
    const colorParams = `?pc=${encodeURIComponent(primaryColor)}&bc=${encodeURIComponent(backgroundColor)}`;
    const previewUrl = `${APP_URL}/preview/${userId}/${projectId}${colorParams}`;
    
    // Handle store-specific paths
    let hashSuffix = '';
    if (path.startsWith('/store') || path === '/tienda') {
        hashSuffix = '#store';
    } else if (path.startsWith('/product/')) {
        hashSuffix = `#store/product/${path.replace('/product/', '')}`;
    } else if (path.startsWith('/category/')) {
        hashSuffix = `#store/category/${path.replace('/category/', '')}`;
    }
    
    // Calculate complementary colors for the loader
    // Use primary color for the spinner, with slightly transparent version for the track
    const spinnerColor = primaryColor;
    const trackColor = `${primaryColor}33`; // 20% opacity version
    
    // Use SEO title or project name
    const pageTitle = seoTitle || projectName;
    const pageDescription = seoDescription || '';
    
    // Favicon tags
    const faviconTags = favicon ? `
    <link rel="icon" href="${favicon}">
    <link rel="shortcut icon" href="${favicon}">
    <link rel="apple-touch-icon" href="${favicon}">` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDescription}">
    <meta name="robots" content="index, follow">
    ${faviconTags}
    
    <!-- Open Graph -->
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://${domain}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${pageDescription}">
    
    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://firebasestorage.googleapis.com">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden;
            background: ${backgroundColor};
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
        .loading-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: ${backgroundColor};
            z-index: 1000;
            transition: opacity 0.3s ease;
        }
        .loading-container.hidden {
            opacity: 0;
            pointer-events: none;
        }
        /* Modern concentric spinner with project colors */
        .loader-wrapper {
            position: relative;
            width: 64px;
            height: 64px;
        }
        .loader-outer {
            position: absolute;
            inset: 0;
            border: 3px solid ${trackColor};
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }
        .loader-middle {
            position: absolute;
            inset: 6px;
            border: 3px solid transparent;
            border-top-color: ${spinnerColor};
            border-right-color: ${trackColor};
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .loader-inner {
            position: absolute;
            inset: 14px;
            border: 3px solid transparent;
            border-top-color: ${spinnerColor};
            border-radius: 50%;
            animation: spin 0.7s linear infinite reverse;
        }
        .loader-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: ${spinnerColor};
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }
        .loading-text {
            margin-top: 20px;
            color: ${spinnerColor};
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 0.8;
        }
        .loading-dots {
            display: inline-flex;
            gap: 2px;
        }
        .loading-dots span {
            animation: bounce 1s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-4px); }
        }
    </style>
</head>
<body>
    <div id="loading" class="loading-container">
        <div class="loader-wrapper">
            <div class="loader-outer"></div>
            <div class="loader-middle"></div>
            <div class="loader-inner"></div>
            <div class="loader-dot"></div>
        </div>
        <p class="loading-text">Cargando<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>
    </div>
    
    <iframe 
        id="site-frame"
        src="${previewUrl}${hashSuffix}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; payment"
        loading="eager"
        onload="document.getElementById('loading').classList.add('hidden');"
    ></iframe>
    
    <script>
        // Sync hash changes from parent to iframe
        window.addEventListener('hashchange', function() {
            var iframe = document.getElementById('site-frame');
            var hash = window.location.hash;
            if (iframe && hash) {
                iframe.contentWindow.location.hash = hash;
            }
        });
        
        // Listen for messages from iframe (e.g., navigation)
        window.addEventListener('message', function(event) {
            // Only accept messages from our app
            if (event.origin !== '${APP_URL}') return;
            
            if (event.data.type === 'navigation') {
                // Update parent URL if needed
                if (event.data.hash) {
                    window.location.hash = event.data.hash;
                }
            }
            if (event.data.type === 'title') {
                document.title = event.data.title;
            }
        });
    </script>
</body>
</html>`;
}

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
        .icon { font-size: 3rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🌐</div>
        <h1>Dominio no configurado</h1>
        <p>El dominio <code>${domain}</code> no está asociado a ningún proyecto activo.</p>
        <p style="margin-top: 1.5rem;">Si eres el propietario, configura este dominio en tu <a href="https://quimera.ai/dashboard">panel de control</a>.</p>
    </div>
</body>
</html>`;
}

app.listen(PORT, () => {
    console.log(`🚀 SSR Server running on port ${PORT}`);
    console.log(`   App URL: ${APP_URL}`);
});




