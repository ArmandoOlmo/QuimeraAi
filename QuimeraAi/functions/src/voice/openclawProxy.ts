/**
 * OpenClaw HTTPS Proxy
 * 
 * Acts as an HTTPS-to-HTTP proxy for the OpenClaw API on the VPS.
 * ElevenLabs Custom LLM requires HTTPS, but the VPS only has HTTP.
 * This function proxies requests from ElevenLabs → Firebase (HTTPS) → VPS (HTTP).
 * 
 * ElevenLabs sends OpenAI-compatible chat/completions requests.
 * We forward them to the OpenClaw instance and stream the response back.
 */

import * as functions from 'firebase-functions';

const OPENCLAW_BASE_URL = 'http://34.56.154.52:18789';

export const openclawProxy = functions.https.onRequest(async (req, res) => {
    // Allow CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Build the target URL: proxy to the OpenClaw VPS
    // ElevenLabs sends to: https://<our-domain>/openclawProxy/v1/chat/completions
    // We forward to: http://34.56.154.52:18789/v1/chat/completions
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
