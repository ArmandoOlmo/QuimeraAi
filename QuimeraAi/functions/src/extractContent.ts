/**
 * Extract Content Cloud Function
 * 
 * Server-side URL content extraction for knowledge links.
 * Supports websites and YouTube URLs.
 * 
 * Uses Gemini API for content summarization and extraction.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GEMINI_CONFIG } from './config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

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
    'http://localhost:3001',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];

function setCorsHeaders(req: functions.https.Request, res: functions.Response): boolean {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.quimera\.app$/.test(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        res.set('Access-Control-Allow-Origin', 'https://quimera.ai');
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return true;
    }
    return false;
}

// ============================================
// YouTube URL Detection & Metadata
// ============================================
function isYouTubeUrl(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|embed|shorts|playlist)|youtu\.be\/)/i.test(url);
}

function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

interface YouTubeMetadata {
    title: string;
    author: string;
    thumbnailUrl: string;
}

async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata | null> {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);
        if (!response.ok) return null;
        const data = await response.json();
        return {
            title: data.title || 'YouTube Video',
            author: data.author_name || 'Unknown',
            thumbnailUrl: data.thumbnail_url || '',
        };
    } catch {
        return null;
    }
}

// ============================================
// Content Extraction via Gemini
// ============================================
async function extractContentWithGemini(url: string, type: 'website' | 'youtube'): Promise<{ title: string; content: string }> {
    const apiKey = GEMINI_CONFIG.apiKey;
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    let prompt: string;
    if (type === 'youtube') {
        prompt = `You are a content extraction assistant. Given this YouTube video URL: ${url}

Please provide:
1. A clear title for this video
2. A comprehensive summary of what this video covers, including key points, topics discussed, and any important information mentioned.

Format your response as:
TITLE: [video title]
CONTENT: [detailed summary of the video content, key takeaways, and main points discussed. Be thorough - this content will be used as a knowledge source for an AI chatbot.]`;
    } else {
        prompt = `You are a content extraction assistant. Visit and analyze this webpage URL: ${url}

Please provide:
1. The page title
2. Extract ALL the meaningful text content from the page. Include: headings, paragraphs, product descriptions, service details, pricing information, contact info, FAQ answers, and any other useful text content. Skip navigation menus, footer links, cookie notices, and other boilerplate.

Format your response as:
TITLE: [page title]
CONTENT: [all extracted text content from the page, organized logically. Be thorough - this content will be used as a knowledge source for an AI chatbot.]`;
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
        },
    };

    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[extractContent] Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse response
    const titleMatch = text.match(/TITLE:\s*(.+?)(?:\n|$)/);
    const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/);

    return {
        title: titleMatch?.[1]?.trim() || url,
        content: contentMatch?.[1]?.trim() || text,
    };
}

// ============================================
// Main Cloud Function
// ============================================
export const extractContent = functions.https.onRequest(async (req, res) => {
    // CORS
    if (setCorsHeaders(req, res)) return;

    // Only POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { url, projectId } = req.body;

        // Validate inputs
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        if (!projectId || typeof projectId !== 'string') {
            res.status(400).json({ error: 'projectId is required' });
            return;
        }

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            res.status(400).json({ error: 'Invalid URL format. Must start with http:// or https://' });
            return;
        }

        // Sanitize projectId
        const cleanProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '');
        if (cleanProjectId.length < 1 || cleanProjectId.length > 128) {
            res.status(400).json({ error: 'Invalid projectId' });
            return;
        }

        // Detect URL type
        const type: 'website' | 'youtube' = isYouTubeUrl(url) ? 'youtube' : 'website';

        console.log(`[extractContent] Extracting ${type} content from: ${url} (project: ${cleanProjectId})`);

        // Get YouTube metadata if applicable
        let youtubeMetadata: YouTubeMetadata | null = null;
        let thumbnailUrl: string | undefined;
        if (type === 'youtube') {
            youtubeMetadata = await fetchYouTubeMetadata(url);
            if (youtubeMetadata) {
                thumbnailUrl = youtubeMetadata.thumbnailUrl;
            }
        }

        // Extract content using Gemini
        const extracted = await extractContentWithGemini(url, type);

        // Use YouTube metadata title if available (more accurate)
        const title = (type === 'youtube' && youtubeMetadata?.title)
            ? youtubeMetadata.title
            : extracted.title;

        const responseData = {
            url,
            title,
            content: extracted.content,
            type,
            contentLength: extracted.content.length,
            thumbnailUrl: thumbnailUrl || undefined,
            author: youtubeMetadata?.author || undefined,
        };

        console.log(`[extractContent] Success: "${title}" (${extracted.content.length} chars)`);

        res.status(200).json(responseData);

    } catch (error) {
        console.error('[extractContent] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ error: message });
    }
});
