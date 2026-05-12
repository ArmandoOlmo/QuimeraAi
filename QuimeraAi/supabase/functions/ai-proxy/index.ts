import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

/**
 * AI Proxy for OpenRouter
 * Replaces the legacy Firebase Cloud Function (geminiProxy)
 */

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY'); // Required for Live API / Voice Assistant

function mapModelToOpenRouter(model: string): string {
    // If model is already in OpenRouter format (e.g. "qwen/qwen-max"), pass through
    if (model.includes('/')) {
        return model;
    }

    const MODEL_MAP: Record<string, string> = {
        // Gemini 2.5
        'gemini-2.5-flash': 'google/gemini-2.5-flash',
        'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite-preview',
        'gemini-2.5-pro': 'google/gemini-2.5-pro',
        // Gemini 2.0
        'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
        'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite-001',
        'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp:free',
        // Gemini 3.x
        'gemini-3-flash-preview': 'google/gemini-2.5-flash',
        'gemini-3-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-flash-lite-preview': 'google/gemini-2.5-flash',
        // Image Models
        'gemini-3.1-flash-image-preview': 'google/gemini-3.1-flash-image-preview', // Nano Banana 2
        'imagen-4.0-nano-banana-002': 'google/gemini-3.1-flash-image-preview',
        'gemini-3-pro-image-preview': 'google/gemini-3-pro-image-preview',
        'gemini-2.5-flash-image': 'google/gemini-2.5-flash',
        // Legacy
        'gemini-1.5-flash': 'google/gemini-flash-1.5',
        'gemini-1.5-pro': 'google/gemini-pro-1.5',
    };
    return MODEL_MAP[model] || 'google/gemini-2.5-flash';
}

function isImageModel(model: string): boolean {
    const lowerModel = model.toLowerCase();
    return lowerModel.includes('image') || lowerModel.includes('imagen') || lowerModel.includes('banana');
}

function imageInputToUrl(input: unknown): string | null {
    if (!input) return null;

    if (typeof input === 'string') {
        if (input.startsWith('data:image/') || input.startsWith('http')) return input;
        return `data:image/jpeg;base64,${input}`;
    }

    if (typeof input === 'object') {
        const image = input as Record<string, unknown>;
        if (typeof image.url === 'string') return image.url;
        if (typeof image.imageUrl === 'string') return image.imageUrl;
        if (typeof image.image_url === 'string') return image.image_url;
        if (typeof image.data === 'string') {
            const mimeType = typeof image.mimeType === 'string' ? image.mimeType : 'image/jpeg';
            return image.data.startsWith('data:image/')
                ? image.data
                : `data:${mimeType};base64,${image.data}`;
        }
    }

    return null;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        
        // Handle Action payload (used by supabase.functions.invoke or direct fetch)
        // 1. Live API Key
        if (payload.action === 'getLiveApiKey') {
            if (!GEMINI_API_KEY) {
                console.warn('GEMINI_API_KEY is not configured for Voice Assistant');
                return new Response(
                    JSON.stringify({ error: 'Voice Assistant requires GEMINI_API_KEY in Supabase secrets.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ apiKey: GEMINI_API_KEY }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Usage Stats (Stubbed to prevent UI crashes)
        if (payload.action === 'usage') {
            // Future: Implement real token usage reading from Supabase DB
            return new Response(
                JSON.stringify({ success: true, usage: { creditsRemaining: 'Unlimited (Proxy)' } }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { prompt, history, systemInstruction, model = 'gemini-2.5-flash', config = {}, images, referenceImages, tools } = payload;

        if (!OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
        }

        const orModel = mapModelToOpenRouter(model);
        const temperature = config.temperature ?? 0.7;
        const maxTokens = config.maxOutputTokens ?? 8192;
        const isImageGen = isImageModel(model);

        const messages: Array<{ role: string; content: string | any[] }> = [];

        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        if (history && history.length > 0) {
            for (const msg of history) {
                messages.push({
                    role: msg.role === 'model' ? 'assistant' : msg.role,
                    content: msg.text,
                });
            }
        }

        const imageInputs = [
            ...(Array.isArray(referenceImages) ? referenceImages : []),
            ...(Array.isArray(images) ? images : []),
        ]
            .map(imageInputToUrl)
            .filter((url): url is string => Boolean(url))
            .filter((url, index, all) => all.indexOf(url) === index)
            .slice(0, 14);

        // Handle prompt with or without images (vision/reference images)
        if (imageInputs.length > 0) {
            const contentParts: any[] = [{ type: 'text', text: prompt || ' ' }];
            for (const imageUrl of imageInputs) {
                contentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: imageUrl
                    }
                });
            }
            messages.push({ role: 'user', content: contentParts });
        } else {
            messages.push({ role: 'user', content: prompt || ' ' });
        }

        const orBody: any = {
            model: orModel,
            messages,
            temperature,
            max_tokens: maxTokens,
        };

        // If requesting image generation, we must inject modalities
        if (isImageGen) {
            orBody.modalities = ["text", "image"];
        }

        // Debug log for troubleshooting
        console.log(`[ai-proxy] Requesting: model=${orModel}, messages=${messages.length}, images=${imageInputs.length}, max_tokens=${maxTokens}, temp=${temperature}${isImageGen ? ', modalities=text+image' : ''}`);

        const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://quimera.ai',
                'X-Title': 'Quimera AI',
            },
            body: JSON.stringify(orBody),
        });

        if (!orResponse.ok) {
            const errorText = await orResponse.text();
            console.error(`[OpenRouter] Error: ${orResponse.status} ${errorText}`);
            return new Response(
                JSON.stringify({ error: `OpenRouter API error: ${orResponse.status}`, details: errorText }),
                { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await orResponse.json();
        
        // Handle Image Generation Response Format
        if (isImageGen) {
            const msg = data.choices?.[0]?.message;
            let extractedImage = '';
            
            if (msg) {
                // OpenRouter returns images as objects: { type: "image_url", image_url: { url: "data:..." } }
                if (msg.images && msg.images.length > 0) {
                    const firstImage = msg.images[0];
                    if (typeof firstImage === 'string') {
                        extractedImage = firstImage;
                    } else if (firstImage?.image_url?.url) {
                        extractedImage = firstImage.image_url.url;
                    } else if (firstImage?.url) {
                        extractedImage = firstImage.url;
                    } else if (typeof firstImage === 'object') {
                        // Last resort: stringify and log for debugging
                        console.warn('[ai-proxy] Unexpected image object format:', JSON.stringify(firstImage).slice(0, 200));
                        extractedImage = '';
                    }
                } else if (msg.image_url && msg.image_url.url) {
                    extractedImage = msg.image_url.url;
                } else if (Array.isArray(msg.content)) {
                    // Content can be an array of multipart objects
                    for (const part of msg.content) {
                        if (part?.type === 'image_url' && part?.image_url?.url) {
                            extractedImage = part.image_url.url;
                            break;
                        }
                    }
                } else if (typeof msg.content === 'string') {
                    // It might be a markdown link: ![alt](data:image/jpeg;base64,...)
                    const match = msg.content.match(/!\[.*?\]\((.*?)\)/);
                    if (match) {
                        extractedImage = match[1];
                    } else if (msg.content.startsWith('data:image')) {
                        extractedImage = msg.content;
                    } else if (msg.content.startsWith('http')) {
                        extractedImage = msg.content;
                    } else {
                        // Fallback assuming content is raw base64
                        extractedImage = msg.content;
                    }
                }
            }

            if (!extractedImage) {
                console.error('[ai-proxy] No image extracted from response. Full message:', JSON.stringify(msg).slice(0, 500));
                return new Response(
                    JSON.stringify({ error: 'No image data returned from model', details: JSON.stringify(data.choices?.[0]).slice(0, 300) }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            
            // Extract mimetype if it's a data URL
            let mimeType = 'image/jpeg';
            if (typeof extractedImage === 'string' && extractedImage.startsWith('data:')) {
                const parts = extractedImage.split(',');
                const mimeMatch = parts[0].match(/data:(.*?);/);
                if (mimeMatch) mimeType = mimeMatch[1];
                extractedImage = parts[1]; // Remove data URL prefix for consistency
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    image: extractedImage,
                    mimeType,
                    metadata: {
                        model: orModel,
                        provider: 'openrouter'
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Handle Standard Text Response Format
        const text = data.choices?.[0]?.message?.content || '';
        
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = promptTokens + completionTokens;

        // Structure response to be compatible with GeminiProxyClient's extractTextFromResponse
        const responseBody = {
            response: {
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: text }
                            ]
                        },
                        finishReason: data.choices?.[0]?.finish_reason || 'STOP'
                    }
                ],
                usageMetadata: {
                    promptTokenCount: promptTokens,
                    candidatesTokenCount: completionTokens,
                    totalTokenCount: totalTokens
                }
            },
            metadata: {
                tokensUsed: totalTokens,
                model: orModel,
                provider: 'openrouter'
            },
            // Fallback for extractTextFromResponse
            text: text
        };

        return new Response(
            JSON.stringify(responseBody),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error handling AI proxy request:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
