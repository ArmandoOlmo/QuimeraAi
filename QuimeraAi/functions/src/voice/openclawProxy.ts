/**
 * OpenClaw HTTPS Proxy
 * 
 * Acts as an HTTPS-to-HTTP proxy for the OpenClaw API on the VPS.
 * ElevenLabs Custom LLM requires HTTPS, but the VPS only has HTTP.
 * This function proxies requests from ElevenLabs → Firebase (HTTPS) → VPS (HTTP).
 * 
 * SECURITY:
 * - Requires Authorization header (forwarded from ElevenLabs or caller)
 * - CORS restricted to known origins
 * - VPS URL read from OPENCLAW_BASE_URL env var (never hardcoded)
 */

import * as functions from 'firebase-functions';

// Read from environment — set in functions/.env (gitignored)
const OPENCLAW_BASE_URL = process.env.OPENCLAW_BASE_URL;
if (!OPENCLAW_BASE_URL) {
    console.error('[OpenClaw Proxy] FATAL: OPENCLAW_BASE_URL environment variable is not set.');
}

// Allowed origins — ElevenLabs doesn't send an origin header (server-to-server),
// so we only restrict browser-based access
const ALLOWED_ORIGINS = [
    'https://quimera.ai',
    'https://www.quimera.ai',
    'https://quimeraai.web.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

export const openclawProxy = functions.https.onRequest(async (req, res) => {
    // CORS — only allow known browser origins
    const origin = req.headers.origin as string;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // SECURITY: Require Authorization header
    // ElevenLabs always sends one (OpenAI-compatible); reject any unauthenticated request
    if (!req.headers.authorization) {
        res.status(401).json({
            error: { message: 'Authorization header required', type: 'auth_error' }
        });
        return;
    }

    // Build the target URL: proxy to the OpenClaw VPS
    // ElevenLabs sends to: https://<our-domain>/openclawProxy/v1/chat/completions
    // We forward to: <OPENCLAW_BASE_URL>/v1/chat/completions
    const targetPath = req.path || '/';
    const targetUrl = `${OPENCLAW_BASE_URL}${targetPath}`;

    console.log(`[OpenClaw Proxy] ${req.method} ${targetPath} → ${targetUrl}`);

    try {
        // Forward the request to OpenClaw
        const headers: Record<string, string> = {
            'Content-Type': req.headers['content-type'] || 'application/json',
        };

        // Forward Authorization header
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization as string;
        }

        const fetchOptions: RequestInit = {
            method: req.method,
            headers,
        };

        // Include body for POST/PUT requests
        if (req.method === 'POST' || req.method === 'PUT') {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Check if the response is streaming (SSE)
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream') || req.body?.stream === true) {
            // Stream the response back to ElevenLabs
            res.set('Content-Type', 'text/event-stream');
            res.set('Cache-Control', 'no-cache');
            res.set('Connection', 'keep-alive');

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                const pump = async (): Promise<void> => {
                    const { done, value } = await reader.read();
                    if (done) {
                        res.end();
                        return;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    res.write(chunk);
                    return pump();
                };

                await pump();
            } else {
                const text = await response.text();
                res.status(response.status).send(text);
            }
        } else {
            // Regular JSON response
            const data = await response.text();
            res.set('Content-Type', contentType);
            res.status(response.status).send(data);
        }
    } catch (error) {
        console.error('[OpenClaw Proxy] Error:', error);
        res.status(502).json({
            error: {
                message: 'Failed to connect to OpenClaw API',
                type: 'proxy_error',
                details: String(error),
            }
        });
    }
});
