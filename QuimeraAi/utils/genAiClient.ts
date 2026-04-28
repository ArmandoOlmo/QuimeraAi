/**
 * Google Generative AI Client
 * 
 * SECURITY: All AI generation goes through the secure Cloud Functions proxy.
 * The API key is NEVER exposed to the client bundle.
 * 
 * The only exception is the Live API (voice sessions) which requires a
 * client-side GoogleGenAI SDK instance. For that, the key is fetched
 * securely from the backend at runtime (requires auth + admin role).
 */

import { GoogleGenAI } from '@google/genai';
import {
    shouldUseProxy,
    generateContentViaProxy,
    extractTextFromResponse,
    type GeminiProxyConfig
} from './geminiProxyClient';

// Cache for API key — only populated by secure backend fetch for Live API
let cachedApiKey: string | null = null;

export const setCachedApiKey = (key?: string | null) => {
    cachedApiKey = key ?? null;
};

export const getCachedApiKey = () => cachedApiKey;

export const syncApiKeyFromAiStudio = async (): Promise<string | null> => {
    // Deprecated — proxy handles all API calls
    return null;
};

/**
 * Fetch API key securely from backend (for Live API / voice sessions only).
 * Requires Firebase Auth + admin/owner permissions.
 * SECURITY: The key is NEVER read from environment variables or the client bundle.
 */
export const fetchGoogleApiKey = async (): Promise<string> => {
    if (cachedApiKey) return cachedApiKey;

    // Fetch from secure backend endpoint (requires Firebase Auth)
    const { auth } = await import('../firebase');
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('User not authenticated. Please log in to use the Voice Assistant.');
    }

    const idToken = await currentUser.getIdToken();
    const PROXY_BASE_URL = (import.meta as any).env?.VITE_GEMINI_PROXY_URL ||
        'https://us-central1-quimeraai.cloudfunctions.net/gemini';

    const response = await fetch(`${PROXY_BASE_URL}-liveApiKey`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get Live API key: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.apiKey) {
        cachedApiKey = data.apiKey;
        return data.apiKey;
    }

    throw new Error(
        'API key not available. Please ensure you are logged in and have admin permissions to use the Voice Assistant.'
    );
};

/**
 * Get GoogleGenAI instance for Live API (voice sessions)
 * 
 * In development: uses VITE_GEMINI_API_KEY from environment
 * In production: securely fetches the API key from the backend
 */
export const getGoogleGenAI = async () => {
    const apiKey = await fetchGoogleApiKey();
    return new GoogleGenAI({ apiKey });
};

/**
 * Generate content using Gemini
 * SECURE: Always uses the proxy to keep API key protected
 */
export const generateContent = async (
    prompt: string,
    projectId?: string,
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string
): Promise<string> => {
    // Always use proxy for security
    console.debug('🔐 Using SECURE PROXY for Gemini API');

    if (!projectId) {
        throw new Error('projectId is required for Gemini API calls');
    }

    const response = await generateContentViaProxy(projectId, prompt, model, config, userId);
    return extractTextFromResponse(response);
};

/**
 * Check if proxy mode is active (always true for security)
 */
export const isProxyMode = (): boolean => {
    return shouldUseProxy();
};
