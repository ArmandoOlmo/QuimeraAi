/**
 * Google Generative AI Client
 * 
 * SECURITY: All AI generation goes through the Supabase Edge Function (OpenRouter).
 * API keys are NEVER exposed to the client bundle.
 * 
 * The Live API (voice sessions) key is fetched from the Edge Function at runtime.
 */

import { GoogleGenAI } from '@google/genai';
import {
    shouldUseProxy,
    generateContentViaProxy,
    extractTextFromResponse,
    type GeminiProxyConfig
} from './geminiProxyClient';
import { supabase } from '../supabase';

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
 * Routes through Supabase Edge Function.
 */
export const fetchGoogleApiKey = async (): Promise<string> => {
    if (cachedApiKey) return cachedApiKey;

    const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://auth.quimera.ai';
    const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const AI_PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token || SUPABASE_ANON_KEY;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
    }

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'getLiveApiKey' }),
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
        'API key not available. Voice Assistant requires a configured API key on the server.'
    );
};

/**
 * Get GoogleGenAI instance for Live API (voice sessions)
 */
export const getGoogleGenAI = async () => {
    const apiKey = await fetchGoogleApiKey();
    return new GoogleGenAI({ apiKey });
};

/**
 * Generate content using AI
 * SECURE: Always uses the Supabase Edge Function (OpenRouter) proxy
 */
export const generateContent = async (
    prompt: string,
    projectId?: string,
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string
): Promise<string> => {
    // Always use proxy for security
    console.debug('🔐 Using OpenRouter proxy for AI generation');

    if (!projectId) {
        throw new Error('projectId is required for AI API calls');
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
