import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { analyzeWebsiteUrl } from "../_shared/analyzeWebsite.ts"

/**
 * AI Proxy for OpenRouter
 * Replaces the legacy Firebase Cloud Function (geminiProxy)
 */

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY'); // Required for Live API / Voice Assistant
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const CURATED_VIDEO_WHITELIST = [
    'bytedance/seedance-2.0',
    'google/veo-3.1',
    'google/gemini-omni-flash',
];

function openRouterHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://quimera.ai',
        'X-Title': 'Quimera AI',
    };
}

function resolveOmniSlug(models: Array<{ id: string; name?: string }>): string | null {
    const omni = models.find(m => {
        const lower = `${m.id} ${m.name || ''}`.toLowerCase();
        return m.id.startsWith('google/') && lower.includes('omni');
    });
    return omni?.id ?? null;
}

function filterCuratedVideoModels(models: unknown[]): unknown[] {
    if (!Array.isArray(models)) return [];
    const omniId = resolveOmniSlug(models as Array<{ id: string; name?: string }>);
    const allowed = new Set(CURATED_VIDEO_WHITELIST);
    if (omniId) allowed.add(omniId);

    return models.filter((m: unknown) => {
        const model = m as { id?: string };
        return model.id && allowed.has(model.id);
    });
}

function buildFrameImageEntry(url: string, frameType: string) {
    const normalized = imageInputToUrl(url);
    if (!normalized) return null;
    return {
        type: 'image_url',
        image_url: { url: normalized },
        frame_type: frameType,
    };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(
        JSON.stringify(body),
        {
            ...init,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) },
        }
    );
}

function isValidUuid(value: unknown): value is string {
    return typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAuthenticatedUserId(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
    });

    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user?.id) return null;
    return data.user.id;
}

async function handleCreditsConsume(payload: Record<string, unknown>, authUserId: string | null): Promise<Response> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 });
    }

    const tenantId = payload.tenant_id as string;
    const authorizedTenantId = (payload.authorized_tenant_id as string) || tenantId;
    const userId = payload.user_id as string;
    const operation = payload.operation as string;
    const creditsUsed = Number(payload.credits_used);
    const description = typeof payload.description === 'string' ? payload.description : operation;
    const metadata = typeof payload.metadata === 'object' && payload.metadata
        ? payload.metadata as Record<string, unknown>
        : {};
    const projectId = typeof metadata.project_id === 'string' ? metadata.project_id : undefined;

    if (!authUserId || authUserId !== userId) {
        return jsonResponse({ error: 'Unauthorized credits request' }, { status: 401 });
    }

    if (!isValidUuid(tenantId) || !isValidUuid(authorizedTenantId) || !isValidUuid(userId) || !operation || !Number.isFinite(creditsUsed) || creditsUsed <= 0) {
        return jsonResponse({ error: 'Invalid credits payload' }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    const { data: membership, error: membershipError } = await admin
        .from('tenant_members')
        .select('tenant_id')
        .eq('tenant_id', authorizedTenantId)
        .eq('user_id', userId)
        .maybeSingle();

    if (membershipError) {
        console.error('[ai-proxy] credits_consume membership error:', membershipError);
        return jsonResponse({ error: 'Could not validate tenant membership' }, { status: 500 });
    }

    if (!membership) {
        return jsonResponse({ error: 'User is not a member of this tenant' }, { status: 403 });
    }

    if (tenantId !== authorizedTenantId) {
        const { data: authorizedTenant, error: tenantError } = await admin
            .from('tenants')
            .select('owner_tenant_id')
            .eq('id', authorizedTenantId)
            .maybeSingle();

        if (tenantError) {
            console.error('[ai-proxy] credits_consume tenant relation error:', tenantError);
            return jsonResponse({ error: 'Could not validate shared credits pool' }, { status: 500 });
        }

        if (authorizedTenant?.owner_tenant_id !== tenantId) {
            return jsonResponse({ error: 'Invalid shared credits pool tenant' }, { status: 403 });
        }
    }

    const { data: subscription, error: subscriptionError } = await admin
        .from('subscriptions')
        .select('ai_credits_usage')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (subscriptionError) {
        console.error('[ai-proxy] credits_consume subscription error:', subscriptionError);
        return jsonResponse({ error: 'Could not load credits usage' }, { status: 500 });
    }

    const currentUsage = subscription?.ai_credits_usage || null;
    if (currentUsage && typeof currentUsage.creditsRemaining === 'number' && currentUsage.creditsRemaining < creditsUsed) {
        return jsonResponse({
            error: 'No hay suficientes créditos disponibles',
            creditsRequired: creditsUsed,
            creditsRemaining: currentUsage.creditsRemaining,
        }, { status: 402 });
    }

    const { data: transaction, error: txError } = await admin
        .from('ai_credits_transactions')
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            operation,
            credits_used: creditsUsed,
            description,
            metadata,
        })
        .select('id')
        .single();

    if (txError) {
        console.error('[ai-proxy] credits_consume transaction error:', txError);
        return jsonResponse({ error: 'Could not create credits transaction' }, { status: 500 });
    }

    if (currentUsage) {
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];
        const usageByOperation = { ...(currentUsage.usageByOperation || {}) };
        usageByOperation[operation] = Number(usageByOperation[operation] || 0) + creditsUsed;

        let dailyUsage = Array.isArray(currentUsage.dailyUsage) ? [...currentUsage.dailyUsage] : [];
        const todayEntry = dailyUsage.find((item: { date?: string }) => item.date === today);
        if (todayEntry) {
            todayEntry.credits = Number(todayEntry.credits || 0) + creditsUsed;
        } else {
            dailyUsage.push({ date: today, credits: creditsUsed });
            if (dailyUsage.length > 30) dailyUsage = dailyUsage.slice(-30);
        }

        const creditsIncluded = Number(currentUsage.creditsIncluded || 0);
        const newCreditsUsed = Number(currentUsage.creditsUsed || 0) + creditsUsed;
        const updatedUsage: Record<string, unknown> = {
            ...currentUsage,
            creditsUsed: newCreditsUsed,
            creditsRemaining: Math.max(0, creditsIncluded - newCreditsUsed),
            creditsOverage: Math.max(0, newCreditsUsed - creditsIncluded),
            usageByOperation,
            dailyUsage,
            lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
        };

        if (projectId) {
            const usageByProject = { ...(currentUsage.usageByProject || {}) };
            const projectEntry = usageByProject[projectId] || { creditsUsed: 0 };
            updatedUsage.usageByProject = {
                ...usageByProject,
                [projectId]: {
                    ...projectEntry,
                    creditsUsed: Number(projectEntry.creditsUsed || 0) + creditsUsed,
                    lastUsed: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
                },
            };
        }

        const subClientTenantId = typeof metadata.sub_client_tenant_id === 'string' ? metadata.sub_client_tenant_id : null;
        if (subClientTenantId) {
            const { data: subClient } = await admin
                .from('tenants')
                .select('name')
                .eq('id', subClientTenantId)
                .maybeSingle();
            const subClientsUsage = { ...(currentUsage.subClientsUsage || {}) };
            const subClientEntry = subClientsUsage[subClientTenantId] || {
                tenantName: subClient?.name || 'Unknown',
                creditsUsed: 0,
            };
            updatedUsage.isAgencyPool = true;
            updatedUsage.subClientsUsage = {
                ...subClientsUsage,
                [subClientTenantId]: {
                    ...subClientEntry,
                    tenantName: subClientEntry.tenantName || subClient?.name || 'Unknown',
                    creditsUsed: Number(subClientEntry.creditsUsed || 0) + creditsUsed,
                    lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
                },
            };
        }

        const { error: updateError } = await admin
            .from('subscriptions')
            .update({ ai_credits_usage: updatedUsage })
            .eq('tenant_id', tenantId);

        if (updateError) {
            console.error('[ai-proxy] credits_consume usage update error:', updateError);
            return jsonResponse({
                success: true,
                warning: 'Transaction created but usage stats could not be updated',
                transactionId: transaction.id,
                creditsUsed,
                creditsRemaining: Number(currentUsage.creditsRemaining || 0),
            });
        }

        return jsonResponse({
            success: true,
            transactionId: transaction.id,
            creditsUsed,
            creditsRemaining: Number(updatedUsage.creditsRemaining || 0),
        });
    }

    return jsonResponse({
        success: true,
        transactionId: transaction.id,
        creditsUsed,
        creditsRemaining: 0,
    });
}

async function handleVideoModels(): Promise<Response> {
    const orResponse = await fetch(`${OPENROUTER_BASE}/videos/models`, {
        headers: openRouterHeaders(),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        return new Response(
            JSON.stringify({ error: `OpenRouter video models error: ${orResponse.status}`, details: errorText }),
            { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const data = await orResponse.json();
    const models = filterCuratedVideoModels(data.data || []);

    return new Response(
        JSON.stringify({ success: true, models }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function handleVideoSubmit(payload: Record<string, unknown>): Promise<Response> {
    const {
        model,
        prompt,
        duration,
        resolution,
        aspect_ratio,
        size,
        generate_audio,
        seed,
        frame_images,
        input_references,
        negative_prompt,
        provider_parameters,
    } = payload;

    if (!model || !prompt) {
        return new Response(
            JSON.stringify({ error: 'model and prompt are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const body: Record<string, unknown> = {
        model,
        prompt,
    };

    if (duration != null) body.duration = duration;
    if (size) {
        body.size = size;
    } else {
        if (resolution) body.resolution = resolution;
        if (aspect_ratio) body.aspect_ratio = aspect_ratio;
    }
    if (generate_audio != null) body.generate_audio = generate_audio;
    if (seed != null) body.seed = seed;

    if (Array.isArray(frame_images) && frame_images.length > 0) {
        const entries = frame_images
            .map((item: unknown) => {
                const f = item as { url?: string; frame_type?: string };
                if (!f.url || !f.frame_type) return null;
                return buildFrameImageEntry(f.url, f.frame_type);
            })
            .filter(Boolean);
        if (entries.length > 0) body.frame_images = entries;
    }

    if (Array.isArray(input_references) && input_references.length > 0) {
        const refs = input_references
            .map((url: unknown) => {
                const normalized = imageInputToUrl(url);
                if (!normalized) return null;
                return {
                    type: 'image_url',
                    image_url: { url: normalized },
                };
            })
            .filter(Boolean);
        if (refs.length > 0) body.input_references = refs;
    }

    const providerParams: Record<string, unknown> = { ...(provider_parameters as Record<string, unknown> || {}) };
    if (negative_prompt && typeof negative_prompt === 'string') {
        providerParams.negativePrompt = negative_prompt;
    }

    if (Object.keys(providerParams).length > 0) {
        body.provider = {
            options: {
                'google-vertex': {
                    parameters: providerParams,
                },
            },
        };
    }

    console.log(`[ai-proxy] video_submit model=${model} duration=${duration} frames=${Array.isArray(frame_images) ? frame_images.length : 0}`);

    const orResponse = await fetch(`${OPENROUTER_BASE}/videos`, {
        method: 'POST',
        headers: openRouterHeaders(),
        body: JSON.stringify(body),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        console.error(`[ai-proxy] video_submit error: ${orResponse.status} ${errorText}`);
        let parsedError: unknown = null;
        try {
            parsedError = JSON.parse(errorText);
        } catch {
            parsedError = null;
        }
        const message = typeof parsedError === 'object' && parsedError && 'error' in parsedError
            ? ((parsedError as { error?: { message?: string } | string }).error as { message?: string })?.message
                || String((parsedError as { error?: unknown }).error || `OpenRouter video error: ${orResponse.status}`)
            : `OpenRouter video error: ${orResponse.status}`;
        return new Response(
            JSON.stringify({ error: message, details: errorText }),
            { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const data = await orResponse.json();
    if (data?.error) {
        console.error(`[ai-proxy] video_submit body error: ${JSON.stringify(data.error)}`);
        const message = typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'OpenRouter video error';
        return new Response(
            JSON.stringify({ error: message, details: data }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function handleVideoPoll(payload: Record<string, unknown>): Promise<Response> {
    const pollingUrl = payload.polling_url as string;
    if (!pollingUrl) {
        return new Response(
            JSON.stringify({ error: 'polling_url is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const orResponse = await fetch(pollingUrl, {
        headers: openRouterHeaders(),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        return new Response(
            JSON.stringify({ error: `OpenRouter poll error: ${orResponse.status}`, details: errorText }),
            { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const data = await orResponse.json();
    return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function handleVideoDownload(payload: Record<string, unknown>): Promise<Response> {
    const videoUrl = payload.video_url as string;
    if (!videoUrl) {
        return new Response(
            JSON.stringify({ error: 'video_url is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(videoUrl);
    } catch {
        return new Response(
            JSON.stringify({ error: 'Invalid video_url' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const isOpenRouterVideoContent =
        parsedUrl.origin === 'https://openrouter.ai' &&
        parsedUrl.pathname.startsWith('/api/v1/videos/');

    if (!isOpenRouterVideoContent) {
        return new Response(
            JSON.stringify({ error: 'Only OpenRouter video content URLs are allowed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const orResponse = await fetch(videoUrl, {
        headers: openRouterHeaders(),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        console.error(`[ai-proxy] video_download error: ${orResponse.status} ${errorText}`);
        return new Response(
            JSON.stringify({ error: `OpenRouter video download error: ${orResponse.status}`, details: errorText }),
            { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const contentType = orResponse.headers.get('Content-Type') || 'video/mp4';
    const contentLength = orResponse.headers.get('Content-Length');
    const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
    };
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    return new Response(orResponse.body, { headers: responseHeaders });
}

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

        // 3. Video generation (OpenRouter /api/v1/videos)
        if (payload.action === 'video_models') {
            if (!OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
            }
            return await handleVideoModels();
        }

        if (payload.action === 'video_submit') {
            if (!OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
            }
            return await handleVideoSubmit(payload);
        }

        if (payload.action === 'video_poll') {
            if (!OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
            }
            return await handleVideoPoll(payload);
        }

        if (payload.action === 'video_download') {
            if (!OPENROUTER_API_KEY) {
                throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
            }
            return await handleVideoDownload(payload);
        }

        if (payload.action === 'credits_consume') {
            return await handleCreditsConsume(payload, await getAuthenticatedUserId(req));
        }

        if (payload.action === 'analyzeWebsite') {
            const url = String(payload.url || '').trim();
            if (!url) {
                return jsonResponse({ error: 'URL is required' }, { status: 400 });
            }
            const userId = (await getAuthenticatedUserId(req)) || 'anonymous';
            const analysis = await analyzeWebsiteUrl(url, userId);
            return jsonResponse(analysis);
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
