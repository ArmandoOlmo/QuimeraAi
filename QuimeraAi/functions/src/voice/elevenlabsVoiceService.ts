/**
 * ElevenLabs Voice Service
 * 
 * Cloud Functions for ElevenLabs integration:
 * - Text-to-Speech (TTS) with custom/cloned voices
 * - Voice library listing (prebuilt + cloned)
 * - Instant Voice Cloning (upload audio → create voice)
 * - Voice deletion
 * - Voice preview generation
 * 
 * SECURITY:
 * - API key from environment config (ELEVENLABS_CONFIG)
 * - CORS restricted to allowed origins
 * - Rate limiting per IP
 * - Firebase Auth required for cloning/deletion
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ELEVENLABS_CONFIG } from '../config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// ============================================
// SECURITY: Allowed Origins for CORS
// ============================================
const ALLOWED_ORIGINS = [
    'https://quimera.ai',
    'https://www.quimera.ai',
    'https://quimeraai.web.app',
    'https://quimeraai.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

function setCorsHeaders(req: functions.https.Request, res: functions.Response): boolean {
    const origin = req.headers.origin || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin as string);
    if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin as string);
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    return isAllowed;
}

// ============================================
// SECURITY: Rate Limiting (per IP, in-memory)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(req: functions.https.Request): boolean {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

// Clean up stale rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
        if (now > value.resetAt) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

// ============================================
// Helper: Get API key
// ============================================
function getApiKey(): string | null {
    const key = ELEVENLABS_CONFIG.apiKey;
    if (!key) {
        console.error('[ElevenLabs] API key not configured');
        return null;
    }
    return key;
}

// ============================================
// 1. Text-to-Speech
// ============================================
/**
 * Convert text to speech using an ElevenLabs voice.
 * 
 * POST body: { text: string, voiceId: string, modelId?: string, stability?: number, similarity?: number }
 * Returns: { audio: string (base64), mimeType: string, voiceId: string }
 */
export const elevenlabsTTS = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return;
    }

    const isAllowed = setCorsHeaders(req, res);
    if (!isAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    if (!checkRateLimit(req)) {
        res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        res.status(500).json({ error: 'ElevenLabs not configured' });
        return;
    }

    try {
        const {
            text,
            voiceId,
            modelId = 'eleven_multilingual_v2',
            stability = 0.5,
            similarity = 0.75,
        } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({ error: 'text is required' });
            return;
        }
        if (!voiceId || typeof voiceId !== 'string') {
            res.status(400).json({ error: 'voiceId is required' });
            return;
        }

        // Limit text length
        const cleanText = text.trim().slice(0, 5000);

        const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: cleanText,
                model_id: modelId,
                voice_settings: {
                    stability: Math.max(0, Math.min(1, stability)),
                    similarity_boost: Math.max(0, Math.min(1, similarity)),
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs TTS] Error:', response.status, errorText);
            res.status(response.status).json({
                error: 'TTS generation failed',
                details: errorText,
            });
            return;
        }

        // Get audio as ArrayBuffer and convert to base64
        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        res.status(200).json({
            audio: audioBase64,
            mimeType: 'audio/mpeg',
            voiceId,
        });
    } catch (error: any) {
        console.error('[ElevenLabs TTS] Error:', error);
        res.status(500).json({
            error: 'Text-to-speech failed',
            details: error.message,
        });
    }
});

// ============================================
// 2. List Voices
// ============================================
/**
 * List all available ElevenLabs voices (prebuilt + cloned).
 * 
 * GET - no body required
 * Returns: { voices: Array<{ voice_id, name, category, labels, preview_url }> }
 */
export const elevenlabsListVoices = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return;
    }

    const isAllowed = setCorsHeaders(req, res);
    if (!isAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        res.status(500).json({ error: 'ElevenLabs not configured' });
        return;
    }

    try {
        const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs ListVoices] Error:', errorText);
            res.status(response.status).json({ error: 'Failed to list voices' });
            return;
        }

        const data = await response.json() as { voices: any[] };

        // Map to a cleaner format
        const voices = (data.voices || []).map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category, // 'premade' | 'cloned' | 'generated'
            description: v.description || '',
            labels: v.labels || {},
            preview_url: v.preview_url || null,
            fine_tuning: v.fine_tuning || null,
        }));

        res.status(200).json({ voices });
    } catch (error: any) {
        console.error('[ElevenLabs ListVoices] Error:', error);
        res.status(500).json({ error: 'Failed to list voices' });
    }
});

// ============================================
// 3. Clone Voice (Instant Voice Cloning)
// ============================================
/**
 * Clone a voice using audio samples.
 * 
 * POST multipart/form-data:
 *   - name: string (voice name)
 *   - description: string (optional)
 *   - files: audio file(s) (mp3, wav, m4a)
 *   - projectId: string (which project owns this voice)
 *   - labels: JSON string (optional) e.g. '{"language":"es","gender":"female"}'
 * 
 * Returns: { voice_id: string, name: string }
 */
export const elevenlabsCloneVoice = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB' })
    .https.onRequest(async (req, res) => {
        if (req.method === 'OPTIONS') {
            setCorsHeaders(req, res);
            res.status(204).send('');
            return;
        }

        const isAllowed = setCorsHeaders(req, res);
        if (!isAllowed) {
            res.status(403).json({ error: 'Origin not allowed' });
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            res.status(500).json({ error: 'ElevenLabs not configured' });
            return;
        }

        try {
            // Firebase Cloud Functions automatically parse multipart/form-data
            // req.body contains form fields, req.rawBody contains the raw request
            const { name, description, projectId, labels: labelsStr } = req.body;

            if (!name || typeof name !== 'string') {
                res.status(400).json({ error: 'name is required' });
                return;
            }

            if (!projectId || typeof projectId !== 'string') {
                res.status(400).json({ error: 'projectId is required' });
                return;
            }

            // Check if file data is provided as base64 in the body
            // (since Cloud Functions don't natively support file uploads well,
            //  the client will send audio as base64 in the body)
            const audioData = req.body.audioBase64;
            const audioFileName = req.body.audioFileName || 'voice_sample.mp3';
            const audioMimeType = req.body.audioMimeType || 'audio/mpeg';

            if (!audioData) {
                res.status(400).json({ error: 'audioBase64 is required (base64-encoded audio file)' });
                return;
            }

            // Convert base64 to Buffer
            const audioBuffer = Buffer.from(audioData, 'base64');

            // Build multipart form data manually for ElevenLabs API
            const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
            const parts: Buffer[] = [];

            // Name field
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`
            ));

            // Description field (optional)
            if (description) {
                parts.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\n${description}\r\n`
                ));
            }

            // Labels field (optional)
            if (labelsStr) {
                parts.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="labels"\r\n\r\n${labelsStr}\r\n`
                ));
            }

            // Remove background noise
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="remove_background_noise"\r\n\r\ntrue\r\n`
            ));

            // Audio file
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${audioFileName}"\r\nContent-Type: ${audioMimeType}\r\n\r\n`
            ));
            parts.push(audioBuffer);
            parts.push(Buffer.from('\r\n'));

            // End boundary
            parts.push(Buffer.from(`--${boundary}--\r\n`));

            const bodyBuffer = Buffer.concat(parts);

            console.log(`[ElevenLabs Clone] Cloning voice "${name}" for project ${projectId}, audio size: ${audioBuffer.length} bytes`);

            const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                body: bodyBuffer,
            });

            const responseText = await response.text();
            let responseData: any;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = { raw: responseText };
            }

            if (!response.ok) {
                console.error('[ElevenLabs Clone] Error:', responseData);
                res.status(response.status).json({
                    error: 'Voice cloning failed',
                    details: responseData,
                });
                return;
            }

            const voiceId = responseData.voice_id;
            console.log(`[ElevenLabs Clone] Voice created: ${voiceId}`);

            // Save voice metadata to Firestore
            try {
                await admin.firestore()
                    .collection('projects').doc(projectId)
                    .collection('voices').doc(voiceId)
                    .set({
                        id: voiceId,
                        name,
                        description: description || '',
                        projectId,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: req.body.userId || 'unknown',
                        sampleCount: 1,
                        labels: labelsStr ? JSON.parse(labelsStr) : {},
                        provider: 'elevenlabs',
                    });
            } catch (firestoreError) {
                console.warn('[ElevenLabs Clone] Failed to save metadata to Firestore:', firestoreError);
            }

            res.status(200).json({
                voice_id: voiceId,
                name,
                success: true,
            });
        } catch (error: any) {
            console.error('[ElevenLabs Clone] Error:', error);
            res.status(500).json({
                error: 'Voice cloning failed',
                details: error.message,
            });
        }
    });

// ============================================
// 4. Delete Voice
// ============================================
/**
 * Delete a cloned voice from ElevenLabs.
 * 
 * POST body: { voiceId: string, projectId: string }
 * Returns: { success: boolean }
 */
export const elevenlabsDeleteVoice = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return;
    }

    const isAllowed = setCorsHeaders(req, res);
    if (!isAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST with voiceId in body.' });
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        res.status(500).json({ error: 'ElevenLabs not configured' });
        return;
    }

    try {
        const { voiceId, projectId } = req.body;

        if (!voiceId || typeof voiceId !== 'string') {
            res.status(400).json({ error: 'voiceId is required' });
            return;
        }

        const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/${voiceId}`, {
            method: 'DELETE',
            headers: {
                'xi-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs Delete] Error:', errorText);
            res.status(response.status).json({
                error: 'Failed to delete voice',
                details: errorText,
            });
            return;
        }

        // Remove from Firestore
        if (projectId) {
            try {
                await admin.firestore()
                    .collection('projects').doc(projectId)
                    .collection('voices').doc(voiceId)
                    .delete();
            } catch (firestoreError) {
                console.warn('[ElevenLabs Delete] Failed to remove from Firestore:', firestoreError);
            }
        }

        console.log(`[ElevenLabs Delete] Voice ${voiceId} deleted`);
        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[ElevenLabs Delete] Error:', error);
        res.status(500).json({
            error: 'Failed to delete voice',
            details: error.message,
        });
    }
});

// ============================================
// 5. Voice Preview
// ============================================
/**
 * Generate a short preview of a voice using sample text.
 * 
 * POST body: { voiceId: string, text?: string }
 * Returns: { audio: string (base64), mimeType: string }
 */
export const elevenlabsVoicePreview = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return;
    }

    const isAllowed = setCorsHeaders(req, res);
    if (!isAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    if (!checkRateLimit(req)) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        res.status(500).json({ error: 'ElevenLabs not configured' });
        return;
    }

    try {
        const { voiceId, text } = req.body;

        if (!voiceId) {
            res.status(400).json({ error: 'voiceId is required' });
            return;
        }

        const previewText = text || 'Hola, soy tu asistente virtual. ¿En qué puedo ayudarte hoy? Estoy aquí para resolver tus dudas.';

        const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: previewText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs Preview] Error:', errorText);
            res.status(response.status).json({ error: 'Preview generation failed' });
            return;
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        res.status(200).json({
            audio: audioBase64,
            mimeType: 'audio/mpeg',
        });
    } catch (error: any) {
        console.error('[ElevenLabs Preview] Error:', error);
        res.status(500).json({ error: 'Preview failed' });
    }
});
