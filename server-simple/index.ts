/**
 * Simple SSR Server for Custom Domains
 * 
 * This minimal server handles custom domain routing:
 * 1. Receives request with custom domain Host header
 * 2. Looks up domain in Firestore
 * 3. Redirects to the project's store page or serves content
 */

import express, { Request, Response } from 'express';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PORT = process.env.PORT || 8080;
const APP_URL = 'https://quimera.ai';

// Initialize Firebase Admin
if (getApps().length === 0) {
    initializeApp(); // Auto-credentials on Cloud Run
}
const db = getFirestore();

// Domain cache (5 minute TTL)
const domainCache = new Map<string, { projectId: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveDomain(hostname: string): Promise<string | null> {
    const normalizedDomain = hostname.toLowerCase().replace(/^www\./, '');
    
    // Check cache
    const cached = domainCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.projectId;
    }
    
    try {
        const doc = await db.collection('customDomains').doc(normalizedDomain).get();
        
        if (!doc.exists) {
            domainCache.set(normalizedDomain, { projectId: null, timestamp: Date.now() });
            return null;
        }
        
        const data = doc.data()!;
        if (data.status !== 'active') {
            return null;
        }
        
        domainCache.set(normalizedDomain, { projectId: data.projectId, timestamp: Date.now() });
        return data.projectId;
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

// Main handler
app.get('*', async (req: Request, res: Response) => {
    // Get the original hostname from various sources
    // Cloudflare sends the original host in different ways:
    // - CF-Connecting-Host (custom, not standard)
    // - X-Forwarded-Host (sometimes)
    // - The Host header itself might be preserved in some configs
    const hostname = (req.headers['cf-connecting-host'] as string) ||
                     (req.headers['x-forwarded-host'] as string) || 
                     (req.headers['x-original-host'] as string) ||
                     (req.headers['host'] as string)?.split(':')[0] ||
                     req.hostname;
    const path = req.path;
    
    console.log(`[SSR] Request: ${hostname}${path} (host header: ${req.headers.host}, original: ${req.hostname})`);
    
    // Resolve domain to project
    const projectId = await resolveDomain(hostname);
    
    if (!projectId) {
        return res.status(404).send(getNotFoundPage(hostname));
    }
    
    // Redirect to the store page on quimera.ai
    // The store page will handle the rendering
    const redirectUrl = `${APP_URL}/store/${projectId}${path === '/' ? '' : path}`;
    console.log(`[SSR] Redirecting ${hostname} -> ${redirectUrl}`);
    
    // Use 302 temporary redirect so we can change behavior later
    res.redirect(302, redirectUrl);
});

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
});

