/**
 * Google Generative AI Client
 * 
 * SECURITY: For production, this client uses the secure proxy.
 * Direct API access is only available in development with VITE_GEMINI_API_KEY set.
 */

import { GoogleGenAI } from '@google/genai';
import {
    shouldUseProxy,
    generateContentViaProxy,
    extractTextFromResponse,
    type GeminiProxyConfig
} from './geminiProxyClient';

// Cache for API key (only used in development)
let cachedApiKey: string | null = null;

// Helper to get API key from environment (only for development)
const getProcessApiKey = (): string | null => {
    // Only check for API key if NOT using proxy (development mode with key)
    // In production, shouldUseProxy() always returns true, so this won't be used

    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            const metaEnv = import.meta.env as any;
            const key = metaEnv.VITE_GEMINI_API_KEY || metaEnv.VITE_GOOGLE_AI_API_KEY || metaEnv.VITE_GOOGLE_API_KEY;
            if (key && key !== 'null' && key !== 'undefined' && key.trim() !== '') {
                return key.trim();
            }
        }
    } catch (e) {
        // Ignore errors
    }

    return null;
};

// Initialize cached key
cachedApiKey = getProcessApiKey();

export const setCachedApiKey = (key?: string | null) => {
    cachedApiKey = key ?? null;
};

export const getCachedApiKey = () => cachedApiKey;

export const syncApiKeyFromAiStudio = async (): Promise<string | null> => {
    // This is deprecated - we use the proxy now
    return null;
};

export const fetchGoogleApiKey = async (): Promise<string> => {
    if (cachedApiKey) return cachedApiKey;

    // 1. Try environment variable (dev mode)
    const envKey = getProcessApiKey();
    if (envKey) {
        cachedApiKey = envKey;
        return envKey;
    }

    // 2. Try fetching from backend (production/secure mode)
    try {
        console.log('🔐 Fetching Gemini API Key from secure backend...');
        const { getFunctionsInstance, httpsCallable } = await import('../firebase');
        const functions = await getFunctionsInstance();
        const getApiKey = httpsCallable(functions, 'gemini-getApiKey');

        const result = await getApiKey();
        const data = result.data as { apiKey: string };

        if (data && data.apiKey) {
            console.log('✅ Successfully retrieved Gemini API Key from backend');
            cachedApiKey = data.apiKey;
            return data.apiKey;
        }
    } catch (error) {
        console.error('❌ Failed to fetch Gemini API Key from backend:', error);
    }

    throw new Error(
        '🔐 API key not available. Please ensure you are logged in to use the Voice Assistant.'
    );
};

/**
 * Get GoogleGenAI instance
 * WARNING: This only works in development with VITE_GEMINI_API_KEY set.
 * In production, use generateContent() which uses the secure proxy.
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
