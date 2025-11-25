import { GoogleGenAI } from '@google/genai';
import { 
    shouldUseProxy, 
    generateContentViaProxy, 
    extractTextFromResponse,
    type GeminiProxyConfig 
} from './geminiProxyClient';

// Helper para obtener la API key de las variables de entorno (Vite usa import.meta.env)
const getProcessApiKey = (): string | null => {
    let key: string | undefined | null = null;
    
    try {
        // Opción 1: Intentar obtener de import.meta.env (Vite standard para variables de entorno)
        // Nota: Las variables definidas en vite.config.ts en 'define' no aparecen aquí,
        // solo las variables de entorno con prefijo VITE_ que están disponibles en runtime
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            const metaEnv = import.meta.env as any;
            key = metaEnv.VITE_GEMINI_API_KEY || 
                  metaEnv.VITE_GOOGLE_AI_API_KEY ||
                  metaEnv.GEMINI_API_KEY;
        }
    } catch (e) {
        console.debug('Could not access import.meta.env', e);
    }
    
    try {
        // Opción 2: Intentar obtener de process.env (definido en vite.config.ts en 'define')
        // Estas variables se reemplazan en tiempo de build como strings literales
        if ((!key || key === 'null' || key === 'undefined' || key === '') && typeof process !== 'undefined' && process.env) {
            const procEnv = process.env as any;
            key = procEnv.GEMINI_API_KEY || 
                  procEnv.API_KEY ||
                  procEnv.VITE_GEMINI_API_KEY;
        }
    } catch (e) {
        console.debug('Could not access process.env', e);
    }
    
    // Verificar que exista, no sea null, undefined, ni una cadena vacía
    if (!key || key === 'null' || key === 'undefined' || key === '') {
        return null;
    }
    
    const trimmed = String(key).trim();
    if (trimmed === '') {
        return null;
    }
    
    // Log para debugging (sin exponer la key completa)
    if (trimmed.length > 10) {
        console.debug(`✅ API Key encontrada (length: ${trimmed.length}, starts with: ${trimmed.substring(0, 8)}...)`);
    }
    
    return trimmed;
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

/**
 * Generate content using Gemini - automatically uses proxy in production
 * @param prompt The prompt to send to Gemini
 * @param projectId Project ID (required for proxy mode)
 * @param model Model to use (default: gemini-1.5-flash)
 * @param config Generation configuration
 * @returns Generated text content
 */
export const generateContent = async (
    prompt: string,
    projectId?: string,
    model: string = 'gemini-1.5-flash',
    config: GeminiProxyConfig = {}
): Promise<string> => {
    const useProxy = shouldUseProxy();
    
    console.debug(`🤖 Using ${useProxy ? 'PROXY' : 'DIRECT'} mode for Gemini API`);
    
    if (useProxy) {
        // Use proxy in production
        if (!projectId) {
            throw new Error('projectId is required when using Gemini proxy');
        }
        
        const response = await generateContentViaProxy(projectId, prompt, model, config);
        return extractTextFromResponse(response);
    } else {
        // Use direct API in development
        const genAI = await getGoogleGenAI();
        const modelInstance = genAI.getGenerativeModel({ model });
        const result = await modelInstance.generateContent(prompt);
        return result.response.text();
    }
};

/**
 * Check if proxy mode is active
 */
export const isProxyMode = (): boolean => {
    return shouldUseProxy();
};


