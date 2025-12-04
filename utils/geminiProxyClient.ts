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
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string
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
                userId,
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
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string
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
                userId,
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
 * Image generation configuration
 * Supports Quimera Vision Pro advanced controls
 */
export interface ImageGenerationConfig {
    aspectRatio?: string;
    style?: string;
    resolution?: '1K' | '2K' | '4K';
    // Quimera AI specific options
    model?: string;
    thinkingLevel?: string;
    personGeneration?: string;
    temperature?: number;
    negativePrompt?: string;
    // Visual controls
    lighting?: string;
    cameraAngle?: string;
    colorGrading?: string;
    themeColors?: string;
    depthOfField?: string;
    // Reference images for style transfer (base64 data URLs)
    referenceImages?: string[];
}

/**
 * Image generation response
 */
export interface ImageProxyResponse {
    success: boolean;
    image: string; // base64 encoded image
    mimeType: string;
    metadata: {
        model: string;
        aspectRatio: string;
        style?: string;
        remaining?: number;
    };
}

/**
 * Generate image using the secure Gemini proxy
 * This keeps the API key secure on the server side
 * Supports Quimera Vision Pro with full controls
 */
export async function generateImageViaProxy(
    userId: string,
    prompt: string,
    config: ImageGenerationConfig = {}
): Promise<ImageProxyResponse> {
    try {
        console.log('✨ Generating image via proxy (Quimera AI):', {
            userId,
            promptLength: prompt.length,
            model: config.model,
            thinkingLevel: config.thinkingLevel,
            config
        });

        const response = await fetch(`${PROXY_BASE_URL}-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                prompt,
                // Model selection (defaults to Quimera Vision Pro)
                model: config.model || 'gemini-3-pro-image-preview',
                aspectRatio: config.aspectRatio || '1:1',
                style: config.style,
                resolution: config.resolution || '1K',
                // Quimera AI specific options
                thinkingLevel: config.thinkingLevel,
                personGeneration: config.personGeneration,
                temperature: config.temperature,
                negativePrompt: config.negativePrompt,
                // Reference images for style transfer (base64 data URLs)
                referenceImages: config.referenceImages,
                // Visual controls
                config: {
                    lighting: config.lighting,
                    cameraAngle: config.cameraAngle,
                    colorGrading: config.colorGrading,
                    themeColors: config.themeColors,
                    depthOfField: config.depthOfField
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Image proxy error:', errorData);
            throw new Error(errorData.error || `Image generation failed: ${response.status}`);
        }

        const data: ImageProxyResponse = await response.json();
        
        if (!data.success || !data.image) {
            throw new Error('No image returned from proxy');
        }

        console.log('✅ Image generated successfully via proxy');
        return data;
    } catch (error) {
        console.error('Image generation proxy error:', error);
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
 * Check if we should use the proxy
 * SECURITY: Always use proxy to keep API key secure on the server
 */
export function shouldUseProxy(): boolean {
    // ALWAYS use proxy - API key is stored securely in Firebase Functions
    // This ensures the API key is NEVER exposed in the browser
    return true;
}












