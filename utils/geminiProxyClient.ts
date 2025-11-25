/**
 * Gemini Proxy Client
 * 
 * Client for interacting with the Gemini API through our secure backend proxy.
 * This keeps API keys secure and allows chatbots to work on any domain.
 */

// Configuration
const PROXY_BASE_URL = import.meta.env.VITE_GEMINI_PROXY_URL || 
                       'https://us-central1-quimeraai.cloudfunctions.net/gemini';

export interface GeminiProxyConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    safetySettings?: Array<{
        category: string;
        threshold: string;
    }>;
}

export interface GeminiProxyResponse {
    response: {
        candidates: Array<{
            content: {
                parts: Array<{
                    text: string;
                }>;
            };
            finishReason?: string;
            safetyRatings?: Array<any>;
        }>;
        usageMetadata?: {
            promptTokenCount: number;
            candidatesTokenCount: number;
            totalTokenCount: number;
        };
    };
    metadata: {
        tokensUsed: number;
        model: string;
        remaining?: number;
    };
}

export interface GeminiProxyError {
    error: string;
    details?: any;
    resetAt?: string;
}

/**
 * Generate content using the Gemini proxy
 */
export async function generateContentViaProxy(
    projectId: string,
    prompt: string,
    model: string = 'gemini-1.5-flash',
    config: GeminiProxyConfig = {}
): Promise<GeminiProxyResponse> {
    try {
        const response = await fetch(`${PROXY_BASE_URL}-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectId,
                prompt,
                model,
                config
            })
        });

        if (!response.ok) {
            const errorData: GeminiProxyError = await response.json();
            throw new Error(errorData.error || `Proxy error: ${response.status}`);
        }

        const data: GeminiProxyResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Gemini proxy error:', error);
        throw error;
    }
}

/**
 * Stream content using the Gemini proxy
 * Returns an async generator that yields text chunks
 */
export async function* streamContentViaProxy(
    projectId: string,
    prompt: string,
    model: string = 'gemini-1.5-flash',
    config: GeminiProxyConfig = {}
): AsyncGenerator<string, void, unknown> {
    try {
        const response = await fetch(`${PROXY_BASE_URL}-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectId,
                prompt,
                model,
                config
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Stream error');
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                            yield data.candidates[0].content.parts[0].text;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } catch (error) {
        console.error('Stream proxy error:', error);
        throw error;
    }
}

/**
 * Get usage statistics for a project
 */
export async function getUsageStats(projectId: string) {
    try {
        const response = await fetch(`${PROXY_BASE_URL}-usage/${projectId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Usage stats error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Usage stats error:', error);
        throw error;
    }
}

/**
 * Helper to extract text from Gemini proxy response
 */
export function extractTextFromResponse(response: GeminiProxyResponse): string {
    try {
        return response.response.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
        console.error('Error extracting text from response:', error);
        return '';
    }
}

/**
 * Check if we should use the proxy (production mode)
 */
export function shouldUseProxy(): boolean {
    // Use proxy if:
    // 1. Running in production (not localhost)
    // 2. VITE_USE_GEMINI_PROXY is explicitly set to 'true'
    // 3. No direct API key is available
    
    const isProduction = !window.location.hostname.includes('localhost') && 
                         !window.location.hostname.includes('127.0.0.1');
    
    const forceProxy = import.meta.env.VITE_USE_GEMINI_PROXY === 'true';
    
    const hasDirectKey = !!(import.meta.env.VITE_GEMINI_API_KEY);
    
    // Use proxy in production, or if forced, or if no direct key
    return isProduction || forceProxy || !hasDirectKey;
}

