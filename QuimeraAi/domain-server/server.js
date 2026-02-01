/**
 * Quimera Domain Router
 * 
 * Este servidor recibe requests de cualquier dominio custom
 * y redirige al proyecto correcto en quimera.ai
 */

const express = require('express');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'quimeraai'
});
const db = admin.firestore();

// Cache de dominios (5 minutos)
const domainCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getProjectForDomain(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
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
        
        const data = doc.data();
        domainCache.set(normalizedDomain, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`Error fetching domain ${normalizedDomain}:`, error);
        return null;
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main handler - catches ALL requests
app.get('*', async (req, res) => {
    // Priority: X-Forwarded-Host (from Load Balancer) > hostname > host header
    const hostname = req.headers['x-forwarded-host']?.split(',')[0]?.trim() || 
                     req.hostname || 
                     req.headers.host?.split(':')[0];
    const path = req.path;
    
    console.log(`[Router] ${hostname}${path} (X-Forwarded-Host: ${req.headers['x-forwarded-host']})`);
    
    // Get project for this domain
    const domainData = await getProjectForDomain(hostname);
    
    if (!domainData || !domainData.projectId) {
        return res.status(404).send(getNotFoundPage(hostname));
    }
    
    if (domainData.status !== 'active') {
        return res.status(503).send(getPendingPage(hostname, domainData.status));
    }
    
    // Redirect to the project's preview page (full landing page, not just store)
    // This shows the complete website including blog, sections, etc.
    const redirectUrl = `https://quimera.ai/preview/${domainData.projectId}${path === '/' ? '' : path}`;
    console.log(`[Router] Redirecting to ${redirectUrl}`);
    
    res.redirect(302, redirectUrl);
});

function getNotFoundPage(domain) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dominio no configurado</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .card {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            text-align: center;
            max-width: 450px;
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #1f2937; font-size: 1.5rem; margin-bottom: 1rem; }
        p { color: #6b7280; line-height: 1.6; margin-bottom: 1rem; }
        code { 
            background: #f3f4f6; 
            padding: 0.25rem 0.75rem; 
            border-radius: 6px; 
            font-size: 0.9rem;
            color: #4f46e5;
        }
        a { color: #4f46e5; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🌐</div>
        <h1>Sitio en construcción</h1>
        <p>El dominio <code>${domain}</code> aún no está configurado.</p>
        <p>Si eres el propietario, <a href="https://quimera.ai/dashboard/domains">configura tu dominio aquí</a>.</p>
    </div>
</body>
</html>`;
}

function getPendingPage(domain, status) {
    const messages = {
        'pending': 'Configurando DNS...',
        'verifying': 'Verificando configuración...',
        'ssl_pending': 'Generando certificado SSL...'
    };
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <title>Configurando ${domain}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .card {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            text-align: center;
            max-width: 450px;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e5e7eb;
            border-top-color: #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { color: #1f2937; font-size: 1.5rem; margin-bottom: 1rem; }
        p { color: #6b7280; line-height: 1.6; }
        .status {
            background: #fef3c7;
            color: #92400e;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h1>Configurando tu sitio</h1>
        <p>Estamos preparando <strong>${domain}</strong></p>
        <p>Esta página se actualizará automáticamente.</p>
        <div class="status">${messages[status] || 'Procesando...'}</div>
    </div>
</body>
</html>`;
}

app.listen(PORT, () => {
    console.log(`🚀 Quimera Domain Router running on port ${PORT}`);
});




