import { GoogleGenAI } from '@google/genai';

let cachedApiKey: string | null = typeof process !== 'undefined' ? (process.env.API_KEY ?? null) : null;
let pendingKeyPromise: Promise<string> | null = null;

const getAiStudioObject = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).aistudio ?? null;
};

const fetchKeyFromAiStudio = async (): Promise<string | null> => {
    const aiStudio = getAiStudioObject();
    if (!aiStudio) return null;

    try {
        if (typeof aiStudio.getSelectedApiKey === 'function') {
            const key = await aiStudio.getSelectedApiKey();
            if (key) {
                return key;
            }
        }
    } catch (error) {
        console.warn('Failed to get API key from AI Studio', error);
    }

    return null;
};

export const setCachedApiKey = (key?: string | null) => {
    cachedApiKey = key ?? null;
};

export const getCachedApiKey = () => cachedApiKey;

export const syncApiKeyFromAiStudio = async (): Promise<string | null> => {
    const key = await fetchKeyFromAiStudio();
    if (key) {
        setCachedApiKey(key);
    }
    return key;
};

export const fetchGoogleApiKey = async (): Promise<string> => {
    if (cachedApiKey) return cachedApiKey;
    if (pendingKeyPromise) return pendingKeyPromise;

    pendingKeyPromise = (async () => {
        if (typeof process !== 'undefined' && process.env.API_KEY) {
            cachedApiKey = process.env.API_KEY;
            return cachedApiKey;
        }

        const key = await fetchKeyFromAiStudio();
        if (key) {
            cachedApiKey = key;
            return key;
        }

        throw new Error('Google API key is not configured. Please select or provide a key.');
    })();

    try {
        return await pendingKeyPromise;
    } finally {
        pendingKeyPromise = null;
    }
};

export const getGoogleGenAI = async () => {
    const apiKey = await fetchGoogleApiKey();
    return new GoogleGenAI({ apiKey });
};


