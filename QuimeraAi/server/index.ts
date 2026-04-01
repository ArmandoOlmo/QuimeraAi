/**
 * SSR Server for Custom Domains
 * 
 * This Express server handles requests from custom domains,
 * resolves which project/store to render, and performs SSR.
 */

import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { resolveDomainToProject, DomainResolutionResult } from './domainResolver';
import { extractUserSubdomain, resolveUserSubdomain } from './subdomainResolver';
import { renderStorefront } from './ssrRenderer';
import {
    isAgencyLandingSubdomain,
    extractSubdomain,
    resolveAgencyLanding,
    resolveAgencyLandingByDomain,
    AgencyLandingResolutionResult,
} from './portalResolver';

// Only import vite types - actual import is dynamic in development only
type ViteDevServer = import('vite').ViteDevServer;

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

// Cloud Run domain - used to identify if request is from custom domain
const CLOUD_RUN_DOMAIN = process.env.CLOUD_RUN_URL || 'quimera-ai.run.app';
const APP_DOMAIN = process.env.APP_DOMAIN || 'quimera.ai';

async function createServer() {
    const app = express();

    // Compression middleware
    app.use(compression());

    // Parse JSON bodies
    app.use(express.json());

    let vite: ViteDevServer | null = null;

    if (!isProduction) {
        // Development: use Vite's dev server (dynamic import to avoid requiring vite in production)
        const { createServer: createViteServer } = await import('vite');
        vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom'
        });
        app.use(vite.middlewares);
    } else {
        // Production: serve static files
        // In Docker: __dirname = /app/server/dist, so we need to go up 2 levels to /app
        const clientDistPath = path.resolve(__dirname, '../../dist/client');
        const assetsPath = path.join(clientDistPath, 'assets');
        
        console.log(`[SSR] Serving assets from: ${assetsPath}`);
        console.log(`[SSR] Serving client from: ${clientDistPath}`);
        
        app.use('/assets', express.static(assetsPath, {
            maxAge: '1y',
            immutable: true
        }));
        app.use(express.static(clientDistPath, {
            index: false, // Don't serve index.html for root
            maxAge: '1h'
        }));
    }

    // Health check endpoint for Cloud Run
    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API routes pass-through (these are handled by Cloud Functions)
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
        // Let Cloud Functions handle API routes
        next();
    });

    // Main SSR handler
    app.get('*', async (req: Request, res: Response) => {
        try {
            const hostname = req.hostname;
            const url = req.originalUrl;

            console.log(`[SSR] Request: ${hostname}${url}`);

            // Check if this is a custom domain request
            const isCustomDomain = !hostname.includes(CLOUD_RUN_DOMAIN) && 
                                   !hostname.includes(APP_DOMAIN) &&
                                   !hostname.includes('localhost');

            let projectId: string | null = null;
            let domainInfo: DomainResolutionResult | null = null;

            // -----------------------------------------------------------
            // CHECK 0: User subdomain (username.quimera.ai)
            // -----------------------------------------------------------
            const userSubdomain = extractUserSubdomain(hostname);
            if (userSubdomain) {
                console.log(`[SSR] User subdomain detected: ${userSubdomain}`);
                const userResolution = await resolveUserSubdomain(userSubdomain);
                
                if (userResolution) {
                    projectId = userResolution.projectId;
                    console.log(`[SSR] User subdomain ${userSubdomain} -> Project ${projectId}`);
                } else {
                    // User not found — show 404
                    return res.status(404).send(getDomainNotFoundPage(`${userSubdomain}.quimera.ai`));
                }
            }

            // -----------------------------------------------------------
            // CHECK 0.5: Agency landing subdomain (agency.quimera.ai)
            // -----------------------------------------------------------
            if (!projectId && isAgencyLandingSubdomain(hostname)) {
                const subdomain = extractSubdomain(hostname);
                if (subdomain) {
                    console.log(`[SSR] Agency landing subdomain detected: ${subdomain}`);
                    const landingResult = await resolveAgencyLanding(subdomain);
                    if (landingResult) {
                        console.log(`[SSR] Agency landing resolved: ${subdomain} -> Tenant ${landingResult.tenantId}`);
                        return res.status(200).set({ 'Content-Type': 'text/html' }).send(
                            getAgencyLandingRedirectPage(landingResult)
                        );
                    }
                }
            }

            // -----------------------------------------------------------
            // CHECK 1: Custom domain (existing behavior)
            // -----------------------------------------------------------
            if (!projectId && isCustomDomain) {
                // ===================================================
                // CHECK 1a: Agency landing by custom domain
                // (from customDomains.agencyLandingTenantId or 
                //  agencyLandings.customDomain)
                // ===================================================
                const agencyLanding = await resolveAgencyLandingByDomain(hostname);
                if (agencyLanding) {
                    console.log(`[SSR] Agency landing domain resolved: ${hostname} -> Tenant ${agencyLanding.tenantId}`);
                    return res.status(200).set({ 'Content-Type': 'text/html' }).send(
                        getAgencyLandingRedirectPage(agencyLanding)
                    );
                }

                // ===================================================
                // CHECK 1b: Project domain (original behavior)
                // ===================================================
                domainInfo = await resolveDomainToProject(hostname);
                
                if (!domainInfo) {
                    // Domain not found
                    return res.status(404).send(getDomainNotFoundPage(hostname));
                }

                // If domain has agencyLandingTenantId, serve agency landing
                if (domainInfo.agencyLandingTenantId && !domainInfo.projectId) {
                    console.log(`[SSR] Custom domain ${hostname} -> Agency Landing (tenant: ${domainInfo.agencyLandingTenantId})`);
                    // Try to resolve the agency landing config
                    const { getFirestore: getFs } = await import('firebase-admin/firestore');
                    const adminDb = getFs();
                    const landingDoc = await adminDb.collection('agencyLandings').doc(domainInfo.agencyLandingTenantId).get();
                    if (landingDoc.exists) {
                        return res.status(200).set({ 'Content-Type': 'text/html' }).send(
                            getAgencyLandingRedirectPage({
                                tenantId: domainInfo.agencyLandingTenantId,
                                landingId: landingDoc.id,
                                customDomain: hostname,
                                isAgencyLanding: true,
                                config: landingDoc.data(),
                            })
                        );
                    }
                }

                if (!domainInfo.projectId) {
                    return res.status(404).send(getDomainNotFoundPage(hostname));
                }

                if (domainInfo.status !== 'active') {
                    // Domain is pending verification
                    return res.status(503).send(getDomainPendingPage(hostname, domainInfo.status));
                }

                projectId = domainInfo.projectId;
                console.log(`[SSR] Custom domain ${hostname} -> Project ${projectId}`);
            } else if (!projectId) {
                // Regular app request - check if it's a store route
                const storeMatch = url.match(/^\/store\/([^\/]+)/);
                if (storeMatch) {
                    projectId = storeMatch[1];
                }
            }

            // If we have a project ID, render the storefront with SSR
            if (projectId) {
                const html = await renderStorefront({
                    projectId,
                    url,
                    hostname: isCustomDomain ? hostname : undefined,
                    isProduction,
                    vite
                });
                
                res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
            } else {
                // Serve the main app (dashboard, etc.)
                if (isProduction) {
                    const indexPath = path.resolve(__dirname, '../../dist/client/index.html');
                    const html = fs.readFileSync(indexPath, 'utf-8');
                    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
                } else {
                    // In dev, let Vite handle it
                    const indexPath = path.resolve(__dirname, '../index.html');
                    let html = fs.readFileSync(indexPath, 'utf-8');
                    html = await vite!.transformIndexHtml(url, html);
                    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
                }
            }

        } catch (error) {
            const err = error as Error;
            console.error('[SSR] ========== ERROR ==========');
            console.error('[SSR] Message:', err.message);
            console.error('[SSR] Stack:', err.stack);
            console.error('[SSR] Request URL:', req.originalUrl);
            console.error('[SSR] Hostname:', req.hostname);
            console.error('[SSR] ========== END ERROR ==========');
            res.status(500).send(getErrorPage(err));
        }
    });

    app.listen(PORT, () => {
        console.log(`🚀 SSR Server running on port ${PORT}`);
        console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);
    });
}

// Error pages
function getDomainNotFoundPage(domain: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dominio no configurado</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
        h1 { color: #1f2937; margin-bottom: 0.5rem; }
        p { color: #6b7280; }
        code { background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; }
        a { color: #4f46e5; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 Dominio no configurado</h1>
        <p>El dominio <code>${domain}</code> no está asociado a ningún proyecto.</p>
        <p>Si eres el propietario, configura este dominio en tu <a href="https://quimera.ai/domains">panel de dominios</a>.</p>
    </div>
</body>
</html>`;
}

function getDomainPendingPage(domain: string, status: string): string {
    const statusMessages: Record<string, string> = {
        'pending': 'Esperando configuración DNS',
        'verifying': 'Verificando registros DNS...',
        'ssl_pending': 'Generando certificado SSL...'
    };
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <title>Configurando dominio...</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
        h1 { color: #1f2937; margin-bottom: 0.5rem; }
        p { color: #6b7280; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 1rem auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status { background: #fef3c7; color: #92400e; padding: 0.5rem 1rem; border-radius: 8px; display: inline-block; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Configurando ${domain}</h1>
        <p>Tu dominio está siendo configurado. Esta página se actualizará automáticamente.</p>
        <div class="status">${statusMessages[status] || 'Procesando...'}</div>
    </div>
</body>
</html>`;
}

function getErrorPage(error: Error): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
        .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
        h1 { color: #991b1b; margin-bottom: 0.5rem; }
        p { color: #6b7280; }
        pre { background: #fee2e2; padding: 1rem; border-radius: 8px; text-align: left; overflow-x: auto; font-size: 0.75rem; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ Error del servidor</h1>
        <p>Ha ocurrido un error al procesar tu solicitud.</p>
        ${process.env.NODE_ENV !== 'production' ? `<pre>${error.stack}</pre>` : ''}
    </div>
</body>
</html>`;
}

/**
 * Generate agency landing page HTML
 * Serves the agency landing with its config injected for client-side hydration
 */
function getAgencyLandingRedirectPage(landing: AgencyLandingResolutionResult): string {
    const config = landing.config || {};
    const companyName = config?.branding?.companyName || config?.hero?.headline || 'Agency';
    const description = config?.hero?.subheadline || config?.seo?.description || `Bienvenido a ${companyName}`;
    const primaryColor = config?.theme?.primaryColor || config?.branding?.primaryColor || '#4f46e5';
    const logoUrl = config?.branding?.logoUrl || config?.header?.logoUrl || '';
    const faviconUrl = config?.branding?.faviconUrl || '/favicon.ico';

    // Safely serialize the landing config for client-side (JSON-escaped + HTML-safe)
    let serializedConfig = '{}';
    try {
        serializedConfig = JSON.stringify({
            tenantId: landing.tenantId,
            landingId: landing.landingId,
            config: config,
        }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    } catch (e) {
        console.error('[SSR] Error serializing agency landing config:', e);
    }

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtmlBasic(companyName)}</title>
    <meta name="description" content="${escapeHtmlBasic(description)}">
    <meta property="og:title" content="${escapeHtmlBasic(companyName)}">
    <meta property="og:description" content="${escapeHtmlBasic(description)}">
    <meta property="og:type" content="website">
    <meta name="theme-color" content="${escapeHtmlBasic(primaryColor)}">
    ${logoUrl ? `<meta property="og:image" content="${escapeHtmlBasic(logoUrl)}">` : ''}
    <link rel="icon" href="${escapeHtmlBasic(faviconUrl)}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        .agency-loading { 
            display: flex; align-items: center; justify-content: center; 
            min-height: 100vh; background: linear-gradient(135deg, ${primaryColor}08, ${primaryColor}15);
        }
        .agency-loading .spinner {
            width: 48px; height: 48px; border: 3px solid #e5e7eb; 
            border-top-color: ${primaryColor}; border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="root" class="agency-loading">
        <div class="spinner"></div>
    </div>
    <script>
        window.__AGENCY_LANDING_DATA__ = ${serializedConfig};
        // Redirect to main app with agency landing route
        // The Quimera SPA will detect __AGENCY_LANDING_DATA__ and render the landing page
        window.location.href = 'https://quimera.ai/agency-landing/' + ${JSON.stringify(landing.tenantId)};
    </script>
</body>
</html>`;
}

/**
 * Basic HTML escaping for template injection
 */
function escapeHtmlBasic(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

createServer();










