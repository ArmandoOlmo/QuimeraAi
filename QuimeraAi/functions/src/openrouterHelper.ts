/**
 * OpenRouter Helper
 *
 * Centralized utility for calling the OpenRouter API from any backend function.
 * All AI text-generation requests that previously used the Gemini API directly
 * should use this helper instead.
 *
 * Features:
 * - Maps Gemini model names → OpenRouter model identifiers
 * - Sends requests via the OpenAI-compatible chat/completions endpoint
 * - Falls back to direct Gemini REST API when OpenRouter is not configured
 * - Provides a simple text-in / text-out interface
 */

import { OPENROUTER_CONFIG, GEMINI_CONFIG } from './config';

// ============================================================================
// MODEL MAPPING
// ============================================================================

/**
 * Map internal Gemini model names to OpenRouter model identifiers.
 * OpenRouter hosts Gemini models under the 'google/' prefix.
 */
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

// ============================================================================
// PUBLIC API
// ============================================================================

export interface OpenRouterOptions {
    /** Gemini model name (will be mapped to OpenRouter equivalent) */
    model?: string;
    /** System instruction / system prompt */
    systemInstruction?: string;
    /** Conversation history (role + text pairs) */
    history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }>;
    /** Generation temperature (0–2) */
    temperature?: number;
    /** Maximum output tokens */
    maxOutputTokens?: number;
}

export interface OpenRouterResult {
    text: string;
    tokensUsed: number;
    provider: 'openrouter' | 'gemini-direct';
}

/**
 * Generate text content via OpenRouter (or fall back to Gemini REST API).
 *
 * This is the single function all backend files should use for text generation.
 * It handles model mapping, request formatting, and response parsing.
 *
 * @param prompt  The user message / prompt text
 * @param opts    Optional generation settings
 * @returns       The generated text and metadata
 */
export async function generateTextViaOpenRouter(
    prompt: string,
    opts: OpenRouterOptions = {},
): Promise<OpenRouterResult> {
    const model = opts.model || 'gemini-2.5-flash';
    const temperature = Math.min(Math.max(opts.temperature ?? 0.7, 0), 2);
    const maxTokens = Math.min(opts.maxOutputTokens || 8192, 32000);

    // ------------------------------------------------------------------ //
    // Gemini REST API path (primary)
    // ------------------------------------------------------------------ //
    const apiKey = GEMINI_CONFIG.apiKey;
    if (apiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Build contents
        const contents: any[] = [];

        if (opts.history && opts.history.length > 0) {
            for (const msg of opts.history) {
                contents.push({
                    role: msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: msg.text }],
                });
            }
        }

        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const requestBody: Record<string, any> = {
            contents,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
        };

        if (opts.systemInstruction) {
            requestBody.system_instruction = { parts: [{ text: opts.systemInstruction }] };
        }

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('[OpenRouterHelper] Gemini API error:', errorText);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        const text =
            geminiData?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text)
                .filter(Boolean)
                .join('') || '';
        const tokensUsed = geminiData?.usageMetadata?.totalTokenCount || 0;

        return { text, tokensUsed, provider: 'gemini-direct' };
    }

    // ------------------------------------------------------------------ //
    // OpenRouter fallback (when Gemini API key is not set)
    // ------------------------------------------------------------------ //
    if (!OPENROUTER_CONFIG.enabled) {
        throw new Error('Neither Gemini nor OpenRouter API keys are configured');
    }

    console.warn('[OpenRouterHelper] Gemini API key not configured, falling back to OpenRouter');

    const orModel = mapModelToOpenRouter(model);

    // Build messages array (OpenAI Chat format)
    const messages: Array<{ role: string; content: string }> = [];

    if (opts.systemInstruction) {
        messages.push({ role: 'system', content: opts.systemInstruction });
    }

    if (opts.history && opts.history.length > 0) {
        for (const msg of opts.history) {
            messages.push({
                role: msg.role === 'model' ? 'assistant' : msg.role,
                content: msg.text,
            });
        }
    }

    messages.push({ role: 'user', content: prompt });

    const body = {
        model: orModel,
        messages,
        temperature,
        max_tokens: maxTokens,
    };

    const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
            'HTTP-Referer': 'https://quimera.ai',
            'X-Title': 'Quimera AI',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenRouterHelper] API error (${response.status}):`, errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const tokensUsed =
        (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);

    return { text, tokensUsed, provider: 'openrouter' };
}
