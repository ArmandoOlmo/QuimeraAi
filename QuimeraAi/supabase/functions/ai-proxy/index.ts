import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

/**
 * AI Proxy for OpenRouter
 * Replaces the legacy Firebase Cloud Function (geminiProxy)
 */

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

function mapModelToOpenRouter(model: string): string {
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
        // Legacy
        'gemini-1.5-flash': 'google/gemini-flash-1.5',
        'gemini-1.5-pro': 'google/gemini-pro-1.5',
    };
    return MODEL_MAP[model] || 'google/gemini-2.5-flash';
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        
        // Handle Action payload (used by supabase.functions.invoke)
        // If the request comes from Supabase client, the payload is wrapped in the body, but usually we just read it directly
        // However, Supabase JS client `functions.invoke` passes the object directly.
        const { prompt, history, systemInstruction, model = 'gemini-2.5-flash', config = {}, images, tools } = payload;

        if (!OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
        }

        const orModel = mapModelToOpenRouter(model);
        const temperature = config.temperature ?? 0.7;
        const maxTokens = config.maxOutputTokens ?? 8192;

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

        // Handle prompt with or without images
        if (images && images.length > 0) {
            const contentParts: any[] = [{ type: 'text', text: prompt || ' ' }];
            for (const img of images) {
                // OpenRouter expects data url for images: "data:image/jpeg;base64,..."
                contentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`
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
