/**
 * Voice Proxy Cloud Functions
 * 
 * Provides Google Cloud Text-to-Speech and Speech-to-Text services
 * for the public landing chatbot without exposing API keys.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { GEMINI_CONFIG } from './config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// Initialize TTS Client (uses ADC - Application Default Credentials)
const ttsClient = new TextToSpeechClient();

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

/**
 * Set CORS headers
 */
function setCorsHeaders(req: functions.https.Request, res: functions.Response): boolean {
    const origin = req.headers.origin || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.includes('quimera');
    
    if (isAllowed) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    
    return isAllowed;
}

// Voice configurations for different personas
const VOICE_CONFIGS: Record<string, protos.google.cloud.texttospeech.v1.IVoiceSelectionParams> = {
    'Quibo': {
        languageCode: 'es-ES',
        name: 'es-ES-Neural2-A', // Female neural voice
        ssmlGender: 'FEMALE' as const,
    },
    'Quibo-male': {
        languageCode: 'es-ES',
        name: 'es-ES-Neural2-B', // Male neural voice
        ssmlGender: 'MALE' as const,
    },
    'Luna': {
        languageCode: 'es-ES',
        name: 'es-ES-Wavenet-C', // Wavenet female
        ssmlGender: 'FEMALE' as const,
    },
    'default': {
        languageCode: 'es-ES',
        name: 'es-ES-Neural2-A',
        ssmlGender: 'FEMALE' as const,
    }
};

/**
 * Text-to-Speech endpoint
 * Converts text to audio using Google Cloud TTS
 */
export const textToSpeech = functions.https.onRequest(async (req, res) => {
    // Handle CORS preflight
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

    try {
        const { text, voiceName = 'Quibo', speakingRate = 1.0, pitch = 0 } = req.body;

        if (!text || typeof text !== 'string') {
            res.status(400).json({ error: 'Text is required' });
            return;
        }

        // Limit text length for safety
        const cleanText = text.trim().slice(0, 5000);

        // Get voice config
        const voiceConfig = VOICE_CONFIGS[voiceName] || VOICE_CONFIGS['default'];

        // Synthesize speech
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text: cleanText },
            voice: voiceConfig,
            audioConfig: {
                audioEncoding: 'MP3' as const,
                speakingRate: Math.max(0.5, Math.min(2.0, speakingRate)),
                pitch: Math.max(-10, Math.min(10, pitch)),
                effectsProfileId: ['headphone-class-device'], // Optimized for headphones
            },
        });

        if (!response.audioContent) {
            res.status(500).json({ error: 'No audio generated' });
            return;
        }

        // Return audio as base64
        const audioBase64 = Buffer.from(response.audioContent as Uint8Array).toString('base64');
        
        res.status(200).json({
            audio: audioBase64,
            mimeType: 'audio/mp3',
            voice: voiceConfig.name,
        });

    } catch (error: any) {
        console.error('[Voice Proxy] TTS Error:', error);
        res.status(500).json({ 
            error: 'Text-to-speech failed', 
            details: error.message 
        });
    }
});

/**
 * Get available voices endpoint
 * Returns list of available Spanish voices
 */
export const getVoices = functions.https.onRequest(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return;
    }

    setCorsHeaders(req, res);

    try {
        const [response] = await ttsClient.listVoices({ languageCode: 'es' });
        
        const voices = response.voices?.map(voice => ({
            name: voice.name,
            languageCode: voice.languageCodes?.[0],
            gender: voice.ssmlGender,
            naturalSampleRateHertz: voice.naturalSampleRateHertz,
        })) || [];

        res.status(200).json({ voices });
    } catch (error: any) {
        console.error('[Voice Proxy] List voices error:', error);
        res.status(500).json({ error: 'Failed to get voices' });
    }
});

/**
 * Voice chat endpoint - combines Gemini + TTS for seamless voice interaction
 * Receives text, generates AI response with Gemini, and returns audio
 */
export const voiceChat = functions.https.onRequest(async (req, res) => {
    // Handle CORS preflight
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

    try {
        const { 
            userMessage, 
            conversationHistory = [], 
            systemPrompt = '',
            voiceName = 'Quibo',
            projectId = 'quimera-chat-landing'
        } = req.body;

        if (!userMessage || typeof userMessage !== 'string') {
            res.status(400).json({ error: 'userMessage is required' });
            return;
        }

        // Import Gemini functions dynamically to avoid circular deps
        const { GoogleGenAI } = await import('@google/genai');
        
        // Get API key from centralized config
        const apiKey = GEMINI_CONFIG.apiKey;
        
        if (!apiKey) {
            res.status(500).json({ error: 'API key not configured' });
            return;
        }

        const genAI = new GoogleGenAI({ apiKey });

        // Build conversation
        const history = conversationHistory.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || msg.text }]
        }));

        // Generate AI response
        const model = genAI.models.generateContent;
        const fullPrompt = systemPrompt 
            ? `${systemPrompt}\n\nHistorial:\n${history.map((h: any) => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nUsuario: ${userMessage}\n\nAsistente:`
            : userMessage;

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: fullPrompt,
        });

        const responseText = result.text || 'Lo siento, no pude procesar tu mensaje.';

        // Generate audio for the response
        const voiceConfig = VOICE_CONFIGS[voiceName] || VOICE_CONFIGS['default'];
        
        const [audioResponse] = await ttsClient.synthesizeSpeech({
            input: { text: responseText.slice(0, 5000) },
            voice: voiceConfig,
            audioConfig: {
                audioEncoding: 'MP3' as const,
                speakingRate: 1.0,
                pitch: 0,
                effectsProfileId: ['headphone-class-device'],
            },
        });

        const audioBase64 = audioResponse.audioContent 
            ? Buffer.from(audioResponse.audioContent as Uint8Array).toString('base64')
            : null;

        res.status(200).json({
            text: responseText,
            audio: audioBase64,
            mimeType: 'audio/mp3',
            voice: voiceConfig.name,
        });

    } catch (error: any) {
        console.error('[Voice Proxy] Voice chat error:', error);
        res.status(500).json({ 
            error: 'Voice chat failed', 
            details: error.message 
        });
    }
});
