import { GoogleGenAI } from '@google/genai';

// Helper para obtener la API key del proceso (después del build de Vite, esto será un string literal o null)
const getProcessApiKey = (): string | null => {
    if (typeof process === 'undefined') return null;
    const key = process.env.API_KEY;
    // Verificar que exista, no sea null, undefined, ni una cadena vacía
    if (!key || key === 'null' || key === 'undefined') return null;
    const trimmed = String(key).trim();
    return trimmed !== '' ? trimmed : null;
};

let cachedApiKey: string | null = getProcessApiKey();
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
        // Intentar obtener la API key del proceso primero
        const processKey = getProcessApiKey();
        if (processKey) {
            cachedApiKey = processKey;
            return cachedApiKey;
        }

        // Intentar obtener de AI Studio
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


