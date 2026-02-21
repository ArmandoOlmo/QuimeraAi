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
 * Get the fallback model for when capacity is unavailable
 */
function getFallbackModel(model: string): string | null {
    if (model.startsWith('gemini-3')) {
        return 'gemini-2.5-flash';
    }
    return null;
}

/**
 * Apply Gemini 3 specific configuration adjustments
 * Per Google's best practices: temperature should be 1.0 for Gemini 3 models
 */
function applyGemini3Optimizations(model: string, config: GeminiProxyConfig): GeminiProxyConfig {
    if (model.startsWith('gemini-3')) {
        return {
            ...config,
            temperature: 1.0 // Gemini 3 requires temperature 1.0 for optimal performance
        };
    }
    return config;
}

/**
 * Generate content using the Gemini proxy
 * Includes automatic fallback from gemini-3 to gemini-2.5 on capacity errors
 */
export async function generateContentViaProxy(
    projectId: string,
    prompt: string,
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string,
    tools?: any[]
): Promise<GeminiProxyResponse> {
    // Apply Gemini 3 optimizations (temperature = 1.0)
    const optimizedConfig = applyGemini3Optimizations(model, config);

    try {
        const body: Record<string, any> = {
            projectId,
            prompt,
            userId,
            model,
            config: optimizedConfig
        };
        if (tools && tools.length > 0) body.tools = tools;

        const response = await fetch(`${PROXY_BASE_URL}-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        // Check for 503 capacity error and try fallback
        if (response.status === 503) {
            const fallbackModel = getFallbackModel(model);
            if (fallbackModel) {
                console.warn(`[Gemini] Model ${model} unavailable (503), falling back to ${fallbackModel}`);
                return generateContentViaProxy(projectId, prompt, fallbackModel, config, userId);
            }
        }

        if (!response.ok) {
            const errorData: GeminiProxyError = await response.json();
            throw new Error(errorData.error || `Proxy error: ${response.status}`);
        }

        const data: GeminiProxyResponse = await response.json();
        return data;
    } catch (error) {
        // Also catch network-level 503 errors
        if (error instanceof Error && error.message.includes('503')) {
            const fallbackModel = getFallbackModel(model);
            if (fallbackModel) {
                console.warn(`[Gemini] Model ${model} capacity error, falling back to ${fallbackModel}`);
                return generateContentViaProxy(projectId, prompt, fallbackModel, config, userId);
            }
        }
        console.error('Gemini proxy error:', error);
        throw error;
    }
}

/**
 * Image data for multimodal requests
 */
export interface ImageInput {
    mimeType: string;  // e.g., 'image/jpeg', 'image/png'
    data: string;      // base64 encoded image data (without data URL prefix)
}

/**
 * Generate content with images using the Gemini proxy (multimodal)
 * Supports sending images alongside text for vision analysis
 * Includes automatic fallback from gemini-3 to gemini-2.5 on capacity errors
 */
export async function generateMultimodalContentViaProxy(
    projectId: string,
    prompt: string,
    images: ImageInput[],
    model: string = 'gemini-2.5-flash',
    config: GeminiProxyConfig = {},
    userId?: string,
    tools?: any[]
): Promise<GeminiProxyResponse> {
    // Apply Gemini 3 optimizations (temperature = 1.0)
    const optimizedConfig = applyGemini3Optimizations(model, config);

    try {
        // Validate images
        if (images.length > 10) {
            throw new Error('Maximum 10 images allowed per request');
        }

        const body: Record<string, any> = {
            projectId,
            prompt,
            images,  // Send images array to proxy
            userId,
            model,
            config: optimizedConfig
        };
        if (tools && tools.length > 0) body.tools = tools;

        const response = await fetch(`${PROXY_BASE_URL}-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        // Check for 503 capacity error and try fallback
        if (response.status === 503) {
            const fallbackModel = getFallbackModel(model);
            if (fallbackModel) {
                console.warn(`[Gemini Multimodal] Model ${model} unavailable (503), falling back to ${fallbackModel}`);
                return generateMultimodalContentViaProxy(projectId, prompt, images, fallbackModel, config, userId);
            }
        }

        if (!response.ok) {
            const errorData: GeminiProxyError = await response.json();
            throw new Error(errorData.error || `Proxy error: ${response.status}`);
        }

        const data: GeminiProxyResponse = await response.json();
        return data;
    } catch (error) {
        // Also catch network-level 503 errors
        if (error instanceof Error && error.message.includes('503')) {
            const fallbackModel = getFallbackModel(model);
            if (fallbackModel) {
                console.warn(`[Gemini Multimodal] Model ${model} capacity error, falling back to ${fallbackModel}`);
                return generateMultimodalContentViaProxy(projectId, prompt, images, fallbackModel, config, userId);
            }
        }
        console.error('Gemini multimodal proxy error:', error);
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
    config: ImageGenerationConfig = {},
    projectId?: string
): Promise<ImageProxyResponse> {
    try {
        // Image generation request - logging disabled for production

        const response = await fetch(`${PROXY_BASE_URL}-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                projectId: projectId || `image-gen-${userId}`,
                prompt,
                // Model selection (defaults to Imagen 3.0 which is more stable)
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

        return data;
    } catch (error) {
        console.error('Image generation proxy error:', error);
        throw error;
    }
}

/**
 * Helper to extract text from Gemini proxy response
 */
export function extractTextFromResponse(response: GeminiProxyResponse | any): string {
    try {
        // Handle various response structures
        if (!response) {
            console.warn('extractTextFromResponse: response is null/undefined');
            return '';
        }

        // Already a string
        if (typeof response === 'string') {
            return response;
        }

        // Check for errors in response
        if (response.error) {
            console.error('API returned error:', response.error);
            return '';
        }

        // Debug: Log the actual response structure
        console.log('🔍 extractTextFromResponse input:', {
            topLevelKeys: Object.keys(response),
            hasResponse: !!response.response,
            responseType: typeof response.response,
            responseKeys: response.response ? Object.keys(response.response) : 'N/A',
            hasCandidates: !!response.response?.candidates,
            candidatesLength: response.response?.candidates?.length || 0,
        });

        // Check for blocked content (safety filters)
        const candidates = response.response?.candidates || response.candidates;
        if (candidates?.[0]?.finishReason === 'SAFETY') {
            console.warn('Content blocked by safety filters');
            return '';
        }

        // Handle MAX_TOKENS - response was truncated, try to extract partial text anyway
        if (candidates?.[0]?.finishReason === 'MAX_TOKENS') {
            console.warn('⚠️ Response truncated due to MAX_TOKENS, attempting to extract partial text');
        }

        // Standard proxy response format: { response: { candidates: [...] }, metadata: {...} }
        if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = response.response.candidates[0].content.parts[0].text;
            console.log('✅ Extracted text (standard format):', text.substring(0, 100) + '...');
            return text;
        }

        // Try to find text in any part of response.response.candidates
        if (response.response?.candidates) {
            for (const candidate of response.response.candidates) {
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (typeof part?.text === 'string') {
                            console.log('✅ Extracted text (loop format):', part.text.substring(0, 100) + '...');
                            return part.text;
                        }
                    }
                }
            }
        }

        // Direct candidates format (fallback)
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = response.candidates[0].content.parts[0].text;
            console.log('✅ Extracted text (direct format):', text.substring(0, 100) + '...');
            return text;
        }

        // Try to find text in any part of direct candidates
        if (response.candidates) {
            for (const candidate of response.candidates) {
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (typeof part?.text === 'string') {
                            console.log('✅ Extracted text (direct loop):', part.text.substring(0, 100) + '...');
                            return part.text;
                        }
                    }
                }
            }
        }

        // Text directly in response
        if (typeof response.text === 'string') {
            console.log('✅ Extracted text (direct text):', response.text.substring(0, 100) + '...');
            return response.text;
        }

        // Text in response.response directly
        if (typeof response.response?.text === 'string') {
            console.log('✅ Extracted text (response.text):', response.response.text.substring(0, 100) + '...');
            return response.response.text;
        }

        // Log detailed structure for debugging
        console.error('❌ Could not extract text. Full response structure:', JSON.stringify(response, null, 2).substring(0, 2000));
        return '';
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












