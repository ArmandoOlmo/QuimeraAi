import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { analyzeWebsiteUrl } from "../_shared/analyzeWebsite.ts"
import { edgeAccessErrorResponse, requireServiceAccess } from "../_shared/access.ts"

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

type SupabaseAdminClient = SupabaseClient<any, 'public', any>;

const CURATED_VIDEO_WHITELIST = [
    'bytedance/seedance-2.0',
    'google/veo-3.1',
    'google/gemini-omni-flash',
];

const AI_CREDIT_COSTS: Record<string, number> = {
    onboarding_complete: 60,
    design_plan: 6,
    content_generation: 1,
    image_generation: 4,
    image_generation_fast: 2,
    image_generation_ultra: 8,
    video_generation_seedance: 121,
    video_generation_veo: 320,
    video_generation_omni: 480,
    chatbot_message: 1,
    ai_assistant_request: 1,
    ai_assistant_complex: 3,
    product_description: 1,
    seo_optimization: 2,
    email_generation: 1,
    translation: 1,
};

const BILLABLE_OPERATIONS = new Set(Object.keys(AI_CREDIT_COSTS));
const SHARED_POOL_PLAN_IDS = new Set(['agency_starter', 'agency_pro', 'agency_scale']);

function resolveAiFeatureKey(operation: string): 'aiImageGeneration' | 'aiAssistant' {
    return operation.startsWith('image_generation') || operation.startsWith('video_generation')
        ? 'aiImageGeneration'
        : 'aiAssistant';
}

function openRouterHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://quimera.ai',
        'X-Title': 'Quimera AI',
    };
}

async function readOpenRouterJson(response: Response, context: string): Promise<any> {
    const responseText = await response.text();
    if (!responseText.trim()) {
        throw httpError(`${context} returned an empty response`, 502, {
            upstreamStatus: response.status,
        });
    }

    try {
        return JSON.parse(responseText);
    } catch (_error) {
        throw httpError(`${context} returned invalid JSON`, 502, {
            upstreamStatus: response.status,
            upstreamBody: responseText.slice(0, 500),
        });
    }
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

async function isAgencyClientRelationshipLinked(
    admin: any,
    agencyTenantId: string,
    clientTenantId: string,
): Promise<boolean> {
    const { data, error } = await admin
        .from('agency_clients')
        .select('agency_tenant_id')
        .eq('agency_tenant_id', agencyTenantId)
        .eq('client_tenant_id', clientTenantId)
        .maybeSingle();

    if (error) {
        const code = String(error?.code || '');
        if (code === '42P01' || code === 'PGRST205') return false;
        console.error('[ai-proxy] agency client relationship lookup error:', error);
        throw httpError('Could not validate agency client relationship', 500);
    }

    return Boolean(data);
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

async function handleCreditsConsume(payload: Record<string, unknown>, authUserId: string | null, req: Request): Promise<Response> {
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

    let adminOverride = false;
    try {
        const accessContext = await requireServiceAccess(req, {
            tenantId: authorizedTenantId,
            projectId,
            serviceId: 'aiFeatures',
            moduleId: resolveAiFeatureKey(operation) === 'aiImageGeneration' ? 'media-assets' : undefined,
            featureKey: resolveAiFeatureKey(operation),
            action: 'credits_consume',
            aiOperation: operation as any,
            customCredits: creditsUsed,
        });
        adminOverride = accessContext.decision.adminOverride === true;
    } catch (error) {
        return edgeAccessErrorResponse(error);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    if (!adminOverride) {
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
    }

    if (!adminOverride && tenantId !== authorizedTenantId) {
        const { data: authorizedTenant, error: tenantError } = await admin
            .from('tenants')
            .select('owner_tenant_id')
            .eq('id', authorizedTenantId)
            .maybeSingle();

        if (tenantError) {
            console.error('[ai-proxy] credits_consume tenant relation error:', tenantError);
            return jsonResponse({ error: 'Could not validate shared credits pool' }, { status: 500 });
        }

        const ownerLinked = authorizedTenant?.owner_tenant_id === tenantId;
        const relationshipLinked = ownerLinked
            ? true
            : await isAgencyClientRelationshipLinked(admin, tenantId, authorizedTenantId);

        if (!relationshipLinked) {
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
    if (!adminOverride && currentUsage && typeof currentUsage.creditsRemaining === 'number' && currentUsage.creditsRemaining < creditsUsed) {
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
            credits_used: adminOverride ? 0 : creditsUsed,
            description,
            metadata: { ...metadata, admin_override: adminOverride },
        })
        .select('id')
        .single();

    if (txError) {
        console.error('[ai-proxy] credits_consume transaction error:', txError);
        return jsonResponse({ error: 'Could not create credits transaction' }, { status: 500 });
    }

    if (adminOverride) {
        return jsonResponse({
            success: true,
            transactionId: transaction.id,
            creditsUsed: 0,
            creditsRemaining: null,
            adminOverride: true,
        });
    }

    if (currentUsage && !adminOverride) {
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
                creditsUsed: adminOverride ? 0 : creditsUsed,
                creditsRemaining: Number(currentUsage.creditsRemaining || 0),
                adminOverride,
            });
        }

        return jsonResponse({
            success: true,
            transactionId: transaction.id,
            creditsUsed,
            creditsRemaining: Number(updatedUsage.creditsRemaining || 0),
            adminOverride,
        });
    }

    return jsonResponse({
        success: true,
        transactionId: transaction.id,
        creditsUsed: adminOverride ? 0 : creditsUsed,
        creditsRemaining: currentUsage ? Number(currentUsage.creditsRemaining || 0) : 0,
        adminOverride,
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
        'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
        'gemini-3-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-pro-preview': 'google/gemini-2.5-pro',
        'gemini-3.1-flash-lite-preview': 'google/gemini-2.5-flash',
        // Image Models
        'gpt-5-image': 'openai/gpt-5-image',
        'gpt-image-1': 'openai/gpt-image-1',
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

function readImageStringOption(
    payload: Record<string, unknown>,
    config: Record<string, unknown>,
    keys: string[],
    fallback?: string,
): string | undefined {
    for (const key of keys) {
        const value = payload[key] ?? config[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return fallback;
}

function readImageNumberOption(
    payload: Record<string, unknown>,
    config: Record<string, unknown>,
    keys: string[],
): number | undefined {
    for (const key of keys) {
        const value = payload[key] ?? config[key];
        const numberValue = Number(value);
        if (Number.isFinite(numberValue)) return numberValue;
    }
    return undefined;
}

function normalizeImageOutputFormat(value?: string): string {
    const normalized = (value || 'jpeg').toLowerCase().replace('jpg', 'jpeg');
    return ['jpeg', 'png', 'webp'].includes(normalized) ? normalized : 'jpeg';
}

function imageMimeTypeForFormat(outputFormat: string): string {
    return `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
}

function pickOpenRouterImageValue(data: any): string {
    const first = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const candidates = [
        first?.b64_json,
        first?.image,
        first?.url,
        first?.image_url?.url,
        data?.b64_json,
        data?.image,
        data?.url,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }

    return '';
}

async function resolveImageToBase64(
    imageValue: string,
    fallbackMimeType: string,
): Promise<{ image: string; mimeType: string } | null> {
    if (!imageValue) return null;

    if (imageValue.startsWith('data:')) {
        const [header, data] = imageValue.split(',', 2);
        const mimeMatch = header.match(/data:([^;]+);/);
        return {
            image: data || '',
            mimeType: mimeMatch?.[1] || fallbackMimeType,
        };
    }

    if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
        const imageResponse = await fetch(imageValue);
        if (!imageResponse.ok) return null;

        const bytes = new Uint8Array(await imageResponse.arrayBuffer());
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }

        return {
            image: btoa(binary),
            mimeType: imageResponse.headers.get('Content-Type') || fallbackMimeType,
        };
    }

    return { image: imageValue, mimeType: fallbackMimeType };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function httpError(message: string, status: number, details?: Record<string, unknown>): Error {
    return Object.assign(new Error(message), { status, details });
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanUuid(value: unknown): string | null {
    const cleaned = cleanString(value);
    return isValidUuid(cleaned) ? cleaned : null;
}

function readRecordField(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        if (record[key] != null) return record[key];
    }
    return undefined;
}

function getBillingRecord(payload: Record<string, unknown>): Record<string, unknown> {
    return isPlainRecord(payload.billing) ? payload.billing : {};
}

function shouldSkipBilling(payload: Record<string, unknown>): boolean {
    const billing = getBillingRecord(payload);
    return billing.skip === true || billing.enabled === false || payload.skipBilling === true;
}

function resolveCreditOperation(payload: Record<string, unknown>, isImageGen: boolean): string {
    const billing = getBillingRecord(payload);
    const explicitOperation = cleanString(readRecordField(billing, ['operation', 'creditOperation']));
    if (BILLABLE_OPERATIONS.has(explicitOperation)) return explicitOperation;

    if (isImageGen) {
        const resolution = cleanString(payload.resolution || (isPlainRecord(payload.config) ? payload.config.resolution : undefined)).toUpperCase();
        if (resolution === '4K') return 'image_generation_ultra';
        return 'image_generation';
    }

    return 'content_generation';
}

function resolveCreditsUsed(payload: Record<string, unknown>, operation: string): number {
    const billing = getBillingRecord(payload);
    const explicitCredits = Number(readRecordField(billing, ['creditsUsed', 'credits', 'customCredits']));
    if (Number.isFinite(explicitCredits) && explicitCredits > 0) {
        return Math.ceil(explicitCredits);
    }
    return AI_CREDIT_COSTS[operation] || 1;
}

function mergeBillingMetadata(
    payload: Record<string, unknown>,
    operation: string,
    creditsUsed: number,
    model: string,
    projectId: string | null,
): Record<string, unknown> {
    const billing = getBillingRecord(payload);
    const billingMetadata = isPlainRecord(billing.metadata) ? billing.metadata : {};
    const payloadMetadata = isPlainRecord(payload.metadata) ? payload.metadata : {};

    return {
        ...payloadMetadata,
        ...billingMetadata,
        project_id: projectId || cleanString(readRecordField(billing, ['projectId', 'project_id'])) || undefined,
        model,
        proxy_operation: operation,
        quimera_credits: creditsUsed,
        billing_source: 'ai-proxy',
    };
}

async function resolveTenantIdFromProject(
    admin: SupabaseAdminClient,
    projectId: string | null,
): Promise<string | null> {
    if (!projectId || !isValidUuid(projectId)) return null;

    const { data, error } = await admin
        .from('projects')
        .select('tenant_id')
        .eq('id', projectId)
        .maybeSingle();

    if (error) {
        console.error('[ai-proxy] billing project tenant lookup error:', error);
        throw httpError('Could not resolve project billing tenant', 500);
    }

    return cleanUuid(data?.tenant_id);
}

async function resolvePrimaryTenantForUser(
    admin: SupabaseAdminClient,
    userId: string,
): Promise<string | null> {
    const { data, error } = await admin
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[ai-proxy] billing primary tenant lookup error:', error);
        throw httpError('Could not resolve user billing tenant', 500);
    }

    return cleanUuid(data?.tenant_id);
}

async function resolveCreditsPoolTenant(
    admin: SupabaseAdminClient,
    tenantId: string,
): Promise<{ poolTenantId: string; isSharedPool: boolean; agencyName?: string }> {
    const { data: subscription } = await admin
        .from('subscriptions')
        .select('ai_credits_usage')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    const parentTenantId = cleanUuid(subscription?.ai_credits_usage?.parentTenantId);
    if (parentTenantId) {
        const { data: parentTenant } = await admin
            .from('tenants')
            .select('name')
            .eq('id', parentTenantId)
            .maybeSingle();

        return {
            poolTenantId: parentTenantId,
            isSharedPool: true,
            agencyName: cleanString(parentTenant?.name) || undefined,
        };
    }

    const { data: tenant, error: tenantError } = await admin
        .from('tenants')
        .select('owner_tenant_id')
        .eq('id', tenantId)
        .maybeSingle();

    if (tenantError) {
        console.error('[ai-proxy] billing tenant pool lookup error:', tenantError);
        throw httpError('Could not resolve credits pool', 500);
    }

    const ownerTenantId = cleanUuid(tenant?.owner_tenant_id);
    if (!ownerTenantId) {
        const relationshipPool = await resolveAgencyRelationshipPoolTenant(admin, tenantId);
        return relationshipPool || { poolTenantId: tenantId, isSharedPool: false };
    }

    const { data: parentTenant, error: parentError } = await admin
        .from('tenants')
        .select('name, subscription_plan')
        .eq('id', ownerTenantId)
        .maybeSingle();

    if (parentError) {
        console.error('[ai-proxy] billing parent tenant lookup error:', parentError);
        throw httpError('Could not resolve credits pool parent', 500);
    }

    if (parentTenant && SHARED_POOL_PLAN_IDS.has(cleanString(parentTenant.subscription_plan))) {
        return {
            poolTenantId: ownerTenantId,
            isSharedPool: true,
            agencyName: cleanString(parentTenant.name) || undefined,
        };
    }

    return { poolTenantId: tenantId, isSharedPool: false };
}

async function resolveAgencyRelationshipPoolTenant(
    admin: any,
    clientTenantId: string,
): Promise<{ poolTenantId: string; isSharedPool: boolean; agencyName?: string } | null> {
    const { data: relationship, error } = await admin
        .from('agency_clients')
        .select('agency_tenant_id')
        .eq('client_tenant_id', clientTenantId)
        .limit(1)
        .maybeSingle();

    if (error) {
        const code = String(error?.code || '');
        if (code === '42P01' || code === 'PGRST205') return null;
        console.error('[ai-proxy] billing agency relationship pool lookup error:', error);
        throw httpError('Could not resolve agency credits pool', 500);
    }

    const agencyTenantId = cleanUuid(relationship?.agency_tenant_id);
    if (!agencyTenantId) return null;

    const { data: parentTenant, error: parentError } = await admin
        .from('tenants')
        .select('name, subscription_plan')
        .eq('id', agencyTenantId)
        .maybeSingle();

    if (parentError) {
        console.error('[ai-proxy] billing agency relationship parent lookup error:', parentError);
        throw httpError('Could not resolve agency credits pool parent', 500);
    }

    if (parentTenant && SHARED_POOL_PLAN_IDS.has(cleanString(parentTenant.subscription_plan))) {
        return {
            poolTenantId: agencyTenantId,
            isSharedPool: true,
            agencyName: cleanString(parentTenant.name) || undefined,
        };
    }

    return null;
}

async function ensureTenantMembership(
    admin: SupabaseAdminClient,
    tenantId: string,
    userId: string,
): Promise<void> {
    const { data, error } = await admin
        .from('tenant_members')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[ai-proxy] billing membership error:', error);
        throw httpError('Could not validate tenant membership', 500);
    }

    if (!data) {
        throw httpError('User is not a member of this tenant', 403);
    }
}

async function loadCreditsUsage(
    admin: SupabaseAdminClient,
    tenantId: string,
): Promise<Record<string, unknown> | null> {
    const { data, error } = await admin
        .from('subscriptions')
        .select('ai_credits_usage')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (error) {
        console.error('[ai-proxy] billing subscription error:', error);
        throw httpError('Could not load credits usage', 500);
    }

    return isPlainRecord(data?.ai_credits_usage) ? data.ai_credits_usage : null;
}

async function resolveProxyBillingContext(
    payload: Record<string, unknown>,
    req: Request,
    isImageGen: boolean,
    model: string,
): Promise<Record<string, unknown> | null> {
    if (shouldSkipBilling(payload)) return null;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

    const billing = getBillingRecord(payload);
    const hasExplicitBilling = Object.keys(billing).length > 0;
    const projectId = cleanUuid(readRecordField(billing, ['projectId', 'project_id'])) ||
        cleanUuid(payload.projectId) ||
        cleanUuid(payload.project_id);
    const explicitTenantId = cleanUuid(readRecordField(billing, ['tenantId', 'tenant_id'])) ||
        cleanUuid(payload.tenantId) ||
        cleanUuid(payload.tenant_id);
    const hasBillableIdentifier = Boolean(explicitTenantId || projectId);

    if (!hasExplicitBilling && !hasBillableIdentifier) return null;

    const authUserId = await getAuthenticatedUserId(req);
    if (!authUserId) {
        if (hasExplicitBilling) {
            throw httpError('Unauthorized billable AI request', 401);
        }
        return null;
    }

    const requestedUserId = cleanUuid(readRecordField(billing, ['userId', 'user_id'])) || cleanUuid(payload.userId);
    if (requestedUserId && requestedUserId !== authUserId) {
        throw httpError('Billing user does not match authenticated user', 403);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    let tenantId = explicitTenantId || await resolveTenantIdFromProject(admin, projectId);
    if (!tenantId && hasExplicitBilling) {
        tenantId = await resolvePrimaryTenantForUser(admin, authUserId);
    }

    if (!tenantId) return null;

    const operation = resolveCreditOperation(payload, isImageGen);
    const creditsUsed = resolveCreditsUsed(payload, operation);
    const description = cleanString(readRecordField(billing, ['description'])) ||
        (isImageGen ? 'Generación de imagen' : 'Generación de contenido IA');
    const metadata = mergeBillingMetadata(payload, operation, creditsUsed, model, projectId);

	    return {
	        admin,
	        req,
	        tenantId,
	        userId: authUserId,
	        operation,
        creditsUsed,
        description,
        metadata,
    };
}

async function assertCreditsAvailable(billingContext: Record<string, unknown>): Promise<void> {
    const admin = billingContext.admin as SupabaseAdminClient;
    const tenantId = billingContext.tenantId as string;
    const creditsUsed = Number(billingContext.creditsUsed);
    const operation = String(billingContext.operation || 'ai_assistant_request');
    const req = billingContext.req as Request | undefined;

    if (req) {
        const accessContext = await requireServiceAccess(req, {
            tenantId,
            projectId: typeof (billingContext.metadata as Record<string, unknown> | undefined)?.project_id === 'string'
                ? (billingContext.metadata as Record<string, unknown>).project_id as string
                : undefined,
            serviceId: 'aiFeatures',
            moduleId: resolveAiFeatureKey(operation) === 'aiImageGeneration' ? 'media-assets' : undefined,
            featureKey: resolveAiFeatureKey(operation),
            action: 'ai_proxy_request',
            aiOperation: operation as any,
            customCredits: creditsUsed,
        });
        if (accessContext.decision.adminOverride) {
            billingContext.adminOverride = true;
            return;
        }
    }

    await ensureTenantMembership(admin, tenantId, billingContext.userId as string);
    const pool = await resolveCreditsPoolTenant(admin, tenantId);
    const currentUsage = await loadCreditsUsage(admin, pool.poolTenantId);

    if (currentUsage && typeof currentUsage.creditsRemaining === 'number' && currentUsage.creditsRemaining < creditsUsed) {
        throw httpError('CREDITS_EXHAUSTED', 402, {
            creditsRequired: creditsUsed,
            creditsRemaining: currentUsage.creditsRemaining,
            tenantId: pool.poolTenantId,
        });
    }
}

async function consumeResolvedCredits(billingContext: Record<string, unknown>): Promise<Record<string, unknown>> {
    const admin = billingContext.admin as SupabaseAdminClient;
    const requestedTenantId = billingContext.tenantId as string;
    const userId = billingContext.userId as string;
    const operation = billingContext.operation as string;
    const creditsUsed = Number(billingContext.creditsUsed);
    const description = billingContext.description as string;
    const metadata = isPlainRecord(billingContext.metadata) ? billingContext.metadata : {};
    const adminOverride = billingContext.adminOverride === true;

    if (!adminOverride) {
        await ensureTenantMembership(admin, requestedTenantId, userId);
    }
    const pool = await resolveCreditsPoolTenant(admin, requestedTenantId);
    const billingTenantId = pool.poolTenantId;
    const currentUsage = await loadCreditsUsage(admin, billingTenantId);

    if (!adminOverride && currentUsage && typeof currentUsage.creditsRemaining === 'number' && currentUsage.creditsRemaining < creditsUsed) {
        throw httpError('CREDITS_EXHAUSTED', 402, {
            creditsRequired: creditsUsed,
            creditsRemaining: currentUsage.creditsRemaining,
            tenantId: billingTenantId,
        });
    }

    const txMetadata: Record<string, unknown> = {
        ...metadata,
        requested_tenant_id: requestedTenantId,
        used_shared_pool: pool.isSharedPool,
    };
    if (pool.isSharedPool) {
        txMetadata.sub_client_tenant_id = requestedTenantId;
        txMetadata.pool_agency_name = pool.agencyName;
    }

    const { data: transaction, error: txError } = await admin
        .from('ai_credits_transactions')
        .insert({
            tenant_id: billingTenantId,
            user_id: userId,
            operation,
            credits_used: adminOverride ? 0 : creditsUsed,
            description,
            metadata: { ...txMetadata, admin_override: adminOverride },
        })
        .select('id')
        .single();

    if (txError) {
        console.error('[ai-proxy] billing transaction error:', txError);
        throw httpError('Could not create credits transaction', 500);
    }

    if (adminOverride) {
        return {
            transactionId: transaction.id,
            creditsUsed: 0,
            creditsRemaining: currentUsage?.creditsRemaining ?? null,
            tenantId: billingTenantId,
            usedSharedPool: pool.isSharedPool,
            adminOverride: true,
        };
    }

    if (!currentUsage) {
        return {
            transactionId: transaction.id,
            creditsUsed,
            creditsRemaining: 0,
            tenantId: billingTenantId,
            usedSharedPool: pool.isSharedPool,
        };
    }

    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const usageByOperation = { ...(isPlainRecord(currentUsage.usageByOperation) ? currentUsage.usageByOperation : {}) };
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

    const projectId = cleanUuid(metadata.project_id);
    if (projectId) {
        const usageByProject = { ...(isPlainRecord(currentUsage.usageByProject) ? currentUsage.usageByProject : {}) };
        const projectEntry = isPlainRecord(usageByProject[projectId]) ? usageByProject[projectId] as Record<string, unknown> : { creditsUsed: 0 };
        updatedUsage.usageByProject = {
            ...usageByProject,
            [projectId]: {
                ...projectEntry,
                creditsUsed: Number(projectEntry.creditsUsed || 0) + creditsUsed,
                lastUsed: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
            },
        };
    }

    if (pool.isSharedPool && requestedTenantId !== billingTenantId) {
        const { data: subClient } = await admin
            .from('tenants')
            .select('name')
            .eq('id', requestedTenantId)
            .maybeSingle();

        const subClientsUsage = { ...(isPlainRecord(currentUsage.subClientsUsage) ? currentUsage.subClientsUsage : {}) };
        const subClientEntry = isPlainRecord(subClientsUsage[requestedTenantId])
            ? subClientsUsage[requestedTenantId] as Record<string, unknown>
            : { tenantName: cleanString(subClient?.name) || 'Unknown', creditsUsed: 0 };

        updatedUsage.isAgencyPool = true;
        updatedUsage.subClientsUsage = {
            ...subClientsUsage,
            [requestedTenantId]: {
                ...subClientEntry,
                tenantName: cleanString(subClientEntry.tenantName) || cleanString(subClient?.name) || 'Unknown',
                creditsUsed: Number(subClientEntry.creditsUsed || 0) + creditsUsed,
                lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
            },
        };
    }

    const { error: updateError } = await admin
        .from('subscriptions')
        .update({ ai_credits_usage: updatedUsage })
        .eq('tenant_id', billingTenantId);

    if (updateError) {
        console.error('[ai-proxy] billing usage update error:', updateError);
        throw httpError('Could not update credits usage', 500);
    }

    return {
        transactionId: transaction.id,
        creditsUsed,
        creditsRemaining: Number(updatedUsage.creditsRemaining || 0),
        tenantId: billingTenantId,
        requestedTenantId,
        usedSharedPool: pool.isSharedPool,
    };
}

function cleanStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map(item => cleanString(item)).filter(Boolean);
}

function extractJsonObject(text: string): Record<string, unknown> | null {
    const cleaned = text
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        return isPlainRecord(parsed) ? parsed : null;
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        try {
            const parsed = JSON.parse(cleaned.slice(start, end + 1));
            return isPlainRecord(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
}

function normalizeRealtyFaq(value: unknown): Array<{ question: string; answer: string }> {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => {
            if (!isPlainRecord(item)) return null;
            const question = cleanString(item.question);
            const answer = cleanString(item.answer);
            return question && answer ? { question, answer } : null;
        })
        .filter((item): item is { question: string; answer: string } => Boolean(item));
}

function normalizeRealtyListingOutput(value: unknown) {
    const record = isPlainRecord(value) ? value : {};
    return {
        title: cleanString(record.title),
        descriptionShort: cleanString(record.descriptionShort || record.description_short),
        descriptionLong: cleanString(record.descriptionLong || record.description_long || record.description),
        highlights: cleanStringArray(record.highlights),
        features: cleanStringArray(record.features),
        amenitiesCopy: cleanString(record.amenitiesCopy || record.amenities_copy),
        cta: cleanString(record.cta),
        faq: normalizeRealtyFaq(record.faq),
        seoTitle: cleanString(record.seoTitle || record.seo_title),
        seoDescription: cleanString(record.seoDescription || record.seo_description),
        socialPost: cleanString(record.socialPost || record.social_post),
        emailCopy: cleanString(record.emailCopy || record.email_copy),
        smsCopy: cleanString(record.smsCopy || record.sms_copy || record.whatsAppCopy || record.whatsappCopy),
        adCopy: cleanString(record.adCopy || record.ad_copy),
    };
}

function normalizeRealtyCampaignOutput(value: unknown) {
    const record = isPlainRecord(value) ? value : {};
    return {
        title: cleanString(record.title),
        goal: cleanString(record.goal),
        audience: cleanString(record.audience),
        mainCopy: cleanString(record.mainCopy || record.main_copy),
        socialPost: cleanString(record.socialPost || record.social_post),
        emailSubject: cleanString(record.emailSubject || record.email_subject),
        emailBody: cleanString(record.emailBody || record.email_body),
        smsCopy: cleanString(record.smsCopy || record.sms_copy || record.whatsAppCopy || record.whatsappCopy),
        adHeadline: cleanString(record.adHeadline || record.ad_headline),
        adPrimaryText: cleanString(record.adPrimaryText || record.ad_primary_text),
        cta: cleanString(record.cta),
        hashtags: cleanStringArray(record.hashtags).map(tag => tag.startsWith('#') ? tag : `#${tag.replace(/^#+/, '')}`),
    };
}

function realtyGeneratedFields(output: ReturnType<typeof normalizeRealtyListingOutput>): string[] {
    const fields: string[] = [];
    if (output.title) fields.push('title');
    if (output.descriptionShort) fields.push('descriptionShort');
    if (output.descriptionLong) fields.push('descriptionLong');
    if (output.highlights.length > 0) fields.push('highlights');
    if (output.features.length > 0) fields.push('features');
    if (output.amenitiesCopy) fields.push('amenitiesCopy');
    if (output.cta) fields.push('cta');
    if (output.faq.length > 0) fields.push('faq');
    if (output.seoTitle) fields.push('seoTitle');
    if (output.seoDescription) fields.push('seoDescription');
    if (output.socialPost) fields.push('socialPost');
    if (output.emailCopy) fields.push('emailCopy');
    if (output.smsCopy) fields.push('smsCopy');
    if (output.adCopy) fields.push('adCopy');
    return fields;
}

function realtyCampaignGeneratedFields(output: ReturnType<typeof normalizeRealtyCampaignOutput>): string[] {
    const fields: string[] = [];
    if (output.title) fields.push('title');
    if (output.goal) fields.push('goal');
    if (output.audience) fields.push('audience');
    if (output.mainCopy) fields.push('mainCopy');
    if (output.socialPost) fields.push('socialPost');
    if (output.emailSubject) fields.push('emailSubject');
    if (output.emailBody) fields.push('emailBody');
    if (output.smsCopy) fields.push('smsCopy');
    if (output.adHeadline) fields.push('adHeadline');
    if (output.adPrimaryText) fields.push('adPrimaryText');
    if (output.cta) fields.push('cta');
    if (output.hashtags.length > 0) fields.push('hashtags');
    return fields;
}

function fallbackRealtyListingOutput(rawText: string, property: Record<string, unknown>, language: string) {
    const title = cleanString(property.title) || (language === 'en' ? 'Featured property' : 'Propiedad destacada');
    const city = cleanString(property.city);
    const description = cleanString(property.description_long || property.description || property.description_short || rawText);
    const base = description || (language === 'en'
        ? `${title}${city ? ` in ${city}` : ''} is ready for a stronger listing presentation.`
        : `${title}${city ? ` en ${city}` : ''} está lista para una presentación comercial más fuerte.`);

    return normalizeRealtyListingOutput({
        title,
        descriptionShort: base.slice(0, 220),
        descriptionLong: base,
        highlights: cleanStringArray(property.highlights).slice(0, 4),
        features: cleanStringArray(property.features).slice(0, 6),
        amenitiesCopy: cleanStringArray(property.amenities).join(', '),
        cta: language === 'en' ? 'Request a private showing today.' : 'Solicita una visita privada hoy.',
        faq: [],
        seoTitle: title,
        seoDescription: base.slice(0, 155),
        socialPost: rawText.slice(0, 500),
        emailCopy: rawText,
        smsCopy: language === 'en' ? `Interested in ${title}? Reply to schedule a showing.` : `¿Te interesa ${title}? Responde para coordinar una visita.`,
        adCopy: base.slice(0, 180),
    });
}

function fallbackRealtyCampaignOutput(rawText: string, property: Record<string, unknown>, campaignType: string, language: string) {
    const title = cleanString(property.title) || (language === 'en' ? 'Featured property' : 'Propiedad destacada');
    const city = cleanString(property.city);
    const cta = language === 'en' ? 'Schedule a showing' : 'Agenda una visita';
    const mainCopy = rawText || (language === 'en'
        ? `${title}${city ? ` in ${city}` : ''} is available now. ${cta}.`
        : `${title}${city ? ` en ${city}` : ''} está disponible ahora. ${cta}.`);

    return normalizeRealtyCampaignOutput({
        title: `${campaignType.replace(/_/g, ' ')}: ${title}`,
        goal: language === 'en' ? 'Capture qualified property inquiries.' : 'Capturar compradores calificados.',
        audience: language === 'en' ? 'Qualified buyers and active real estate prospects.' : 'Compradores calificados y prospectos activos.',
        mainCopy,
        socialPost: mainCopy.slice(0, 500),
        emailSubject: language === 'en' ? `New opportunity: ${title}` : `Nueva oportunidad: ${title}`,
        emailBody: mainCopy,
        smsCopy: `${title}: ${cta}.`,
        adHeadline: title.slice(0, 80),
        adPrimaryText: mainCopy.slice(0, 220),
        cta,
        hashtags: ['#RealEstate', '#QuimeraRealty'],
    });
}

function buildRealtyListingPrompt(args: {
    property: Record<string, unknown>;
    tone: string;
    language: string;
    userPrompt: string;
    mode: string;
    missingRequired: string[];
    missingRecommended: string[];
    recommendations: string[];
}) {
    const {
        property,
        tone,
        language,
        userPrompt,
        mode,
        missingRequired,
        missingRecommended,
        recommendations,
    } = args;

    return `You are Quimera.ai's real estate listing copy generator.

Return valid JSON only. Do not include markdown fences, commentary, or placeholders.
Language: ${language === 'en' ? 'English' : 'Spanish'}
Tone: ${tone}
Mode: ${mode === 'fix' ? 'Fix only missing or weak fields. Leave strong existing fields empty unless a replacement is clearly needed.' : 'Generate a complete reusable listing content package.'}

Property data:
${JSON.stringify(property, null, 2)}

Listing quality gaps:
- Missing required: ${missingRequired.length ? missingRequired.join(', ') : 'none'}
- Missing recommended: ${missingRecommended.length ? missingRecommended.join(', ') : 'none'}
- Recommendations: ${recommendations.length ? recommendations.join(', ') : 'none'}

User instruction:
${userPrompt || 'Create production-ready real estate marketing copy for this property.'}

Return exactly this JSON shape:
{
  "title": "",
  "descriptionShort": "",
  "descriptionLong": "",
  "highlights": [],
  "features": [],
  "amenitiesCopy": "",
  "cta": "",
  "faq": [
    { "question": "", "answer": "" }
  ],
  "seoTitle": "",
  "seoDescription": "",
  "socialPost": "",
  "emailCopy": "",
  "smsCopy": "",
  "adCopy": ""
}`;
}

function buildRealtyCampaignPrompt(args: {
    property: Record<string, unknown>;
    campaignType: string;
    tone: string;
    language: string;
    userPrompt: string;
}) {
    const {
        property,
        campaignType,
        tone,
        language,
        userPrompt,
    } = args;

    return `You are Quimera.ai's real estate campaign strategist.

Return valid JSON only. Do not include markdown fences, commentary, fake testimonials, unavailable claims, or placeholders.
Language: ${language === 'en' ? 'English' : 'Spanish'}
Campaign type: ${campaignType}
Tone: ${tone}

Property data:
${JSON.stringify(property, null, 2)}

User instruction:
${userPrompt || 'Create production-ready real estate campaign copy for this property.'}

Return exactly this JSON shape:
{
  "title": "",
  "goal": "",
  "audience": "",
  "mainCopy": "",
  "socialPost": "",
  "emailSubject": "",
  "emailBody": "",
  "smsCopy": "",
  "adHeadline": "",
  "adPrimaryText": "",
  "cta": "",
  "hashtags": []
}`;
}

async function handleRealtyListingGenerate(payload: Record<string, unknown>, req: Request): Promise<Response> {
    if (!OPENROUTER_API_KEY) {
        return jsonResponse({ error: 'OPENROUTER_API_KEY is not configured in Supabase Edge Functions' }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResponse({ error: 'Supabase service credentials are not configured' }, { status: 500 });
    }

    const authUserId = await getAuthenticatedUserId(req);
    if (!authUserId) {
        return jsonResponse({ error: 'Unauthorized Realty AI request' }, { status: 401 });
    }

    const projectId = cleanString(payload.projectId);
    const propertyId = cleanString(payload.propertyId);
    const tone = cleanString(payload.tone) || 'luxury';
    const language = cleanString(payload.language) === 'en' ? 'en' : 'es';
    const userPrompt = cleanString(payload.userPrompt);
    const mode = cleanString(payload.mode) === 'fix' ? 'fix' : 'full';
    const model = cleanString(payload.model) || Deno.env.get('REALTY_AI_MODEL') || 'gemini-2.5-flash';
    const missingRequired = cleanStringArray(payload.missingRequired);
    const missingRecommended = cleanStringArray(payload.missingRecommended);
    const recommendations = cleanStringArray(payload.recommendations);

    if (!isValidUuid(projectId) || !isValidUuid(propertyId)) {
        return jsonResponse({ error: 'Invalid Realty AI payload' }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    const { data: property, error: propertyError } = await admin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('project_id', projectId)
        .maybeSingle();

    if (propertyError) {
        console.error('[ai-proxy] realty property lookup error:', propertyError);
        return jsonResponse({ error: 'Could not load Realty property' }, { status: 500 });
    }

    if (!property) {
        return jsonResponse({ error: 'Realty property not found' }, { status: 404 });
    }

    let authorized = property.user_id === authUserId;
    if (!authorized && property.tenant_id) {
        const { data: membership, error: membershipError } = await admin
            .from('tenant_members')
            .select('tenant_id')
            .eq('tenant_id', property.tenant_id)
            .eq('user_id', authUserId)
            .maybeSingle();

        if (membershipError) {
            console.error('[ai-proxy] realty membership lookup error:', membershipError);
            return jsonResponse({ error: 'Could not validate Realty permissions' }, { status: 500 });
        }
        authorized = Boolean(membership);
    }

    if (!authorized) {
        return jsonResponse({ error: 'You do not have access to this Realty property' }, { status: 403 });
    }

    const prompt = buildRealtyListingPrompt({
        property,
        tone,
        language,
        userPrompt,
        mode,
        missingRequired,
        missingRecommended,
        recommendations,
    });
    const orModel = mapModelToOpenRouter(model);

    const orResponse = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: openRouterHeaders(),
        body: JSON.stringify({
            model: orModel,
            messages: [
                {
                    role: 'system',
                    content: 'You generate structured real estate listing content for Quimera.ai. Return valid JSON only.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: mode === 'fix' ? 0.35 : 0.65,
            max_tokens: 5000,
            response_format: { type: 'json_object' },
        }),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        console.error(`[OpenRouter Realty] Error: ${orResponse.status} ${errorText}`);
        return jsonResponse({ error: `OpenRouter API error: ${orResponse.status}`, details: errorText }, { status: orResponse.status });
    }

    const data = await orResponse.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(rawText);
    const output = parsed
        ? normalizeRealtyListingOutput(parsed)
        : fallbackRealtyListingOutput(rawText, property, language);
    const generatedFields = realtyGeneratedFields(output);

    return jsonResponse({
        success: true,
        model: orModel,
        provider: 'openrouter',
        mode,
        prompt,
        output,
        generatedFields,
        metadata: {
            tone,
            language,
            tokensUsed: data.usage?.total_tokens ?? ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)),
            finishReason: data.choices?.[0]?.finish_reason || null,
            parsedJson: Boolean(parsed),
        },
    });
}

async function handleRealtyCampaignGenerate(payload: Record<string, unknown>, req: Request): Promise<Response> {
    if (!OPENROUTER_API_KEY) {
        return jsonResponse({ error: 'OPENROUTER_API_KEY is not configured in Supabase Edge Functions' }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResponse({ error: 'Supabase service credentials are not configured' }, { status: 500 });
    }

    const authUserId = await getAuthenticatedUserId(req);
    if (!authUserId) {
        return jsonResponse({ error: 'Unauthorized Realty campaign AI request' }, { status: 401 });
    }

    const projectId = cleanString(payload.projectId);
    const propertyId = cleanString(payload.propertyId);
    const campaignType = cleanString(payload.campaignType) || 'just_listed';
    const tone = cleanString(payload.tone) || 'luxury';
    const language = cleanString(payload.language) === 'en' ? 'en' : 'es';
    const userPrompt = cleanString(payload.userPrompt);
    const model = cleanString(payload.model) || Deno.env.get('REALTY_AI_MODEL') || 'gemini-2.5-flash';

    if (!isValidUuid(projectId) || !isValidUuid(propertyId)) {
        return jsonResponse({ error: 'Invalid Realty campaign AI payload' }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    const { data: property, error: propertyError } = await admin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('project_id', projectId)
        .maybeSingle();

    if (propertyError) {
        console.error('[ai-proxy] realty campaign property lookup error:', propertyError);
        return jsonResponse({ error: 'Could not load Realty property' }, { status: 500 });
    }

    if (!property) {
        return jsonResponse({ error: 'Realty property not found' }, { status: 404 });
    }

    let authorized = property.user_id === authUserId;
    if (!authorized && property.tenant_id) {
        const { data: membership, error: membershipError } = await admin
            .from('tenant_members')
            .select('tenant_id')
            .eq('tenant_id', property.tenant_id)
            .eq('user_id', authUserId)
            .maybeSingle();

        if (membershipError) {
            console.error('[ai-proxy] realty campaign membership lookup error:', membershipError);
            return jsonResponse({ error: 'Could not validate Realty permissions' }, { status: 500 });
        }
        authorized = Boolean(membership);
    }

    if (!authorized) {
        return jsonResponse({ error: 'You do not have access to this Realty property' }, { status: 403 });
    }

    const prompt = buildRealtyCampaignPrompt({
        property,
        campaignType,
        tone,
        language,
        userPrompt,
    });
    const orModel = mapModelToOpenRouter(model);

    const orResponse = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: openRouterHeaders(),
        body: JSON.stringify({
            model: orModel,
            messages: [
                {
                    role: 'system',
                    content: 'You generate structured real estate campaign content for Quimera.ai. Return valid JSON only.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.65,
            max_tokens: 4500,
            response_format: { type: 'json_object' },
        }),
    });

    if (!orResponse.ok) {
        const errorText = await orResponse.text();
        console.error(`[OpenRouter Realty Campaign] Error: ${orResponse.status} ${errorText}`);
        return jsonResponse({ error: `OpenRouter API error: ${orResponse.status}`, details: errorText }, { status: orResponse.status });
    }

    const data = await orResponse.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(rawText);
    const output = parsed
        ? normalizeRealtyCampaignOutput(parsed)
        : fallbackRealtyCampaignOutput(rawText, property, campaignType, language);
    const generatedFields = realtyCampaignGeneratedFields(output);

    return jsonResponse({
        success: true,
        model: orModel,
        provider: 'openrouter',
        prompt,
        output,
        generatedFields,
        metadata: {
            campaignType,
            tone,
            language,
            tokensUsed: data.usage?.total_tokens ?? ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)),
            finishReason: data.choices?.[0]?.finish_reason || null,
            parsedJson: Boolean(parsed),
        },
    });
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
                JSON.stringify({ success: true, usage: { creditsRemaining: 0, source: 'not_configured' } }),
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
            return await handleCreditsConsume(payload, await getAuthenticatedUserId(req), req);
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

        if (payload.action === 'realty_listing_generate') {
            return await handleRealtyListingGenerate(payload, req);
        }

        if (payload.action === 'realty_campaign_generate') {
            return await handleRealtyCampaignGenerate(payload, req);
        }

        const { prompt, history, systemInstruction, model = 'gemini-2.5-flash', config = {}, images, referenceImages, tools } = payload;

        if (!OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions');
        }

        const orModel = mapModelToOpenRouter(model);
        const temperature = config.temperature ?? 0.7;
        const maxTokens = config.maxOutputTokens ?? 8192;
        const isImageGen = isImageModel(model);
        const billingContext = await resolveProxyBillingContext(payload, req, isImageGen, orModel);
        if (billingContext) {
            await assertCreditsAvailable(billingContext);
        }

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

        if (isImageGen) {
            const configRecord = isPlainRecord(config) ? config : {};
            const outputFormat = normalizeImageOutputFormat(
                readImageStringOption(payload, configRecord, ['output_format', 'outputFormat'], 'jpeg'),
            );
            const imageBody: Record<string, unknown> = {
                model: orModel,
                prompt: prompt || ' ',
                resolution: readImageStringOption(payload, configRecord, ['resolution'], '1K'),
                aspect_ratio: readImageStringOption(payload, configRecord, ['aspect_ratio', 'aspectRatio'], '1:1'),
                quality: readImageStringOption(payload, configRecord, ['quality'], 'high'),
                output_format: outputFormat,
            };

            const size = readImageStringOption(payload, configRecord, ['size']);
            const background = readImageStringOption(payload, configRecord, ['background']);
            const outputCompression = readImageNumberOption(payload, configRecord, ['output_compression', 'outputCompression']);
            const seed = readImageNumberOption(payload, configRecord, ['seed']);
            const imageCount = readImageNumberOption(payload, configRecord, ['n', 'count']);

            if (size) imageBody.size = size;
            if (background) imageBody.background = background;
            if (outputCompression != null) imageBody.output_compression = outputCompression;
            if (seed != null) imageBody.seed = seed;
            if (imageCount != null && imageCount > 0) imageBody.n = Math.floor(imageCount);
            if (imageInputs.length > 0) {
                imageBody.input_references = imageInputs.map((imageUrl) => ({
                    type: 'image_url',
                    image_url: { url: imageUrl },
                }));
            }

            console.log(`[ai-proxy] Requesting image: model=${orModel}, route=/images, references=${imageInputs.length}, resolution=${String(imageBody.resolution)}, aspect_ratio=${String(imageBody.aspect_ratio)}`);

            const orResponse = await fetch(`${OPENROUTER_BASE}/images`, {
                method: 'POST',
                headers: openRouterHeaders(),
                body: JSON.stringify(imageBody),
            });

            if (!orResponse.ok) {
                const errorText = await orResponse.text();
                console.error(`[OpenRouter Images] Error: ${orResponse.status} ${errorText}`);
                return new Response(
                    JSON.stringify({ error: `OpenRouter Images API error: ${orResponse.status}`, details: errorText }),
                    { status: orResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const data = await readOpenRouterJson(orResponse, 'OpenRouter Images API');
            const imageValue = pickOpenRouterImageValue(data);
            const resolvedImage = await resolveImageToBase64(imageValue, imageMimeTypeForFormat(outputFormat));

            if (!resolvedImage?.image) {
                console.error('[ai-proxy] No image extracted from OpenRouter Images response:', JSON.stringify(data).slice(0, 500));
                return new Response(
                    JSON.stringify({ error: 'No image data returned from OpenRouter Images API', details: JSON.stringify(data).slice(0, 300) }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const billingResult = billingContext ? await consumeResolvedCredits(billingContext) : null;

            return new Response(
                JSON.stringify({
                    success: true,
                    image: resolvedImage.image,
                    mimeType: resolvedImage.mimeType,
                    metadata: {
                        model: orModel,
                        provider: 'openrouter',
                        route: '/images',
                        billing: billingResult,
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

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

        const data = await readOpenRouterJson(orResponse, 'OpenRouter Chat API');
        
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

            const billingResult = billingContext ? await consumeResolvedCredits(billingContext) : null;

            return new Response(
                JSON.stringify({
                    success: true,
                    image: extractedImage,
                    mimeType,
                    metadata: {
                        model: orModel,
                        provider: 'openrouter',
                        billing: billingResult,
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

        const billingResult = billingContext ? await consumeResolvedCredits(billingContext) : null;
        if (billingResult) {
            (responseBody.metadata as Record<string, unknown>).billing = billingResult;
        }

        return new Response(
            JSON.stringify(responseBody),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error handling AI proxy request:', error);
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? (error as { status: number }).status
            : 400;
        const details = isPlainRecord((error as { details?: unknown })?.details)
            ? (error as { details: Record<string, unknown> }).details
            : undefined;
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', ...(details || {}) }),
            { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
