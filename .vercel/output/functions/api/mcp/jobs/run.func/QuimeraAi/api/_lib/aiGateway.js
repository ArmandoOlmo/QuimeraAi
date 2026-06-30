import { randomUUID } from 'node:crypto';
import { getAiProxyUrl } from './supabaseAdmin.js';
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const OPENAI_IMAGE_MODEL_ALIASES = new Set([
    'openai/gpt-5-image',
    'gpt-5-image',
    'openai/gpt-image-1',
    'gpt-image-1',
]);
function resolveImageModel(model) {
    const normalizedModel = model?.toLowerCase();
    if (!normalizedModel || OPENAI_IMAGE_MODEL_ALIASES.has(normalizedModel)) {
        return DEFAULT_IMAGE_MODEL;
    }
    return model;
}
export const GENERATOR_PRESETS = [
    {
        id: 'fast-copy',
        kind: 'content',
        model: 'gemini-2.5-flash',
        label: 'Fast website copy',
        estimatedCredits: 1,
        capabilities: ['copy', 'sections', 'summaries', 'email', 'chatbot'],
        defaultConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    },
    {
        id: 'pro-copy',
        kind: 'content',
        model: 'gemini-2.5-pro',
        label: 'Higher quality strategy and copy',
        estimatedCredits: 2,
        capabilities: ['copy', 'strategy', 'landing-pages', 'long-form'],
        defaultConfig: { temperature: 0.8, maxOutputTokens: 8192 },
    },
    {
        id: 'structured-json',
        kind: 'content',
        model: 'gemini-2.5-pro',
        label: 'Structured page JSON',
        estimatedCredits: 2,
        capabilities: ['page-json', 'site-page', 'seo', 'component-data'],
        defaultConfig: { temperature: 0.45, maxOutputTokens: 12000 },
    },
    {
        id: 'hero-image',
        kind: 'image',
        model: DEFAULT_IMAGE_MODEL,
        label: 'Hero image',
        estimatedCredits: 4,
        capabilities: ['image', 'hero', 'banner', 'visual-identity'],
        defaultConfig: { aspectRatio: '16:9', resolution: '1K' },
    },
    {
        id: 'background-image',
        kind: 'image',
        model: DEFAULT_IMAGE_MODEL,
        label: 'Section background',
        estimatedCredits: 4,
        capabilities: ['image', 'background', 'negative-space'],
        defaultConfig: { aspectRatio: '16:9', resolution: '1K' },
    },
    {
        id: 'product-image',
        kind: 'image',
        model: DEFAULT_IMAGE_MODEL,
        label: 'Product image',
        estimatedCredits: 4,
        capabilities: ['image', 'product', 'ecommerce'],
        defaultConfig: { aspectRatio: '1:1', resolution: '1K' },
    },
    {
        id: 'template-thumbnail',
        kind: 'image',
        model: DEFAULT_IMAGE_MODEL,
        label: 'Template thumbnail',
        estimatedCredits: 4,
        capabilities: ['image', 'thumbnail', 'template-preview'],
        defaultConfig: { aspectRatio: '16:9', resolution: '1K' },
    },
    {
        id: 'logo-asset',
        kind: 'image',
        model: DEFAULT_IMAGE_MODEL,
        label: 'Logo and brand asset',
        estimatedCredits: 4,
        capabilities: ['image', 'logo', 'brand-asset', 'transparent-background'],
        defaultConfig: { aspectRatio: '1:1', resolution: '1K' },
    },
    {
        id: 'visual-reference',
        kind: 'multimodal',
        model: 'gemini-2.5-flash',
        label: 'Visual reference analysis',
        estimatedCredits: 1,
        capabilities: ['vision', 'style-analysis', 'prompt-hints'],
        defaultConfig: { temperature: 0.35, maxOutputTokens: 4096 },
    },
    {
        id: 'prompt-enhancer',
        kind: 'prompt',
        model: 'gemini-2.5-flash',
        label: 'Prompt enhancer',
        estimatedCredits: 1,
        capabilities: ['prompt', 'image-prompt', 'content-prompt', 'brief-refinement'],
        defaultConfig: { temperature: 0.45, maxOutputTokens: 2048 },
    },
];
const CREDIT_COSTS = {
    content_generation: 1,
    image_generation: 4,
    image_generation_fast: 2,
    image_generation_ultra: 8,
};
function presetFor(id, kind) {
    const found = GENERATOR_PRESETS.find((preset) => preset.id === id);
    if (found)
        return found;
    if (kind === 'image')
        return GENERATOR_PRESETS.find((preset) => preset.id === 'hero-image');
    if (kind === 'multimodal')
        return GENERATOR_PRESETS.find((preset) => preset.id === 'visual-reference');
    return GENERATOR_PRESETS.find((preset) => preset.id === 'fast-copy');
}
function operationForPreset(preset, options) {
    if (preset.kind !== 'image')
        return 'content_generation';
    if (options?.resolution === '4K' || preset.id.includes('ultra'))
        return 'image_generation_ultra';
    if (preset.id.includes('fast'))
        return 'image_generation_fast';
    return 'image_generation';
}
function stringifyContext(value) {
    if (!value)
        return 'None provided.';
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value, null, 2);
}
function buildContentPrompt(input) {
    return `You are Quimera.ai's server-side AI content generator.

Return production-ready content for the requested website/app area.
Use the requested language, audience, brand context, and purpose.
Do not include markdown fences unless the requested content type is markdown.

Request:
- Purpose: ${input.purpose}
- Content type: ${input.contentType || 'general website content'}
- Language: ${input.language || 'es'}
- Target audience: ${input.targetAudience || 'general'}
- Project ID: ${input.projectId || 'none'}
- Page ID: ${input.pageId || 'none'}
- Section: ${input.section || 'none'}

Brand context:
${stringifyContext(input.brandContext)}

Brief:
${input.brief}

Return a JSON object with:
{
  "title": "short title when relevant",
  "summary": "short summary",
  "content": "generated content or copy",
  "structured": { "fields": "component-ready data when useful" },
  "seo": { "title": "...", "description": "...", "keywords": [] },
  "warnings": []
}`;
}
function buildPageJsonPrompt(input) {
    return `You are Quimera.ai's page JSON generator.

Generate JSON compatible with Quimera website projects. Keep the output valid JSON only.
The JSON must be safe to merge into a project page. Use realistic production copy, no placeholders.

Request:
- Language: ${input.language || 'es'}
- Target audience: ${input.targetAudience || 'general'}
- Purpose: ${input.purpose}
- Page/section focus: ${input.section || 'full page'}

Brand context:
${stringifyContext(input.brandContext)}

Brief:
${input.brief}

Return exactly:
{
  "page": {
    "title": "Page title",
    "slug": "/path",
    "type": "static",
    "sections": ["hero", "features", "services", "testimonials", "leads", "footer"],
    "sectionData": {},
    "seo": { "title": "", "description": "", "keywords": [] },
    "showInNavigation": true
  },
  "legacyData": {},
  "componentOrder": [],
  "sectionVisibility": {},
  "warnings": []
}`;
}
function buildImagePrompt(input) {
    const preset = presetFor(input.modelPreset, 'image');
    const isBackground = preset.id === 'background-image';
    const isThumbnail = preset.id === 'template-thumbnail';
    const usageInstruction = isBackground
        ? 'Create a wide website section background with clean negative space for text. No readable text, no UI chrome, no logos.'
        : isThumbnail
            ? 'Create a polished website template thumbnail mood preview. Avoid readable text and fake brand names.'
            : 'Create a production-ready website image. No readable text, no watermarks, no fake UI controls unless explicitly requested.';
    return `${usageInstruction}

Purpose: ${input.purpose}
Language context: ${input.language || 'es'}
Section: ${input.section || 'general'}
Target audience: ${input.targetAudience || 'general'}
Brand context: ${stringifyContext(input.brandContext)}

Brief: ${input.brief}`;
}
function buildPromptEnhancementPrompt(input) {
    return `Rewrite this draft into one concise, production-ready prompt for Quimera.ai website generation.
Preserve intent, add useful visual/content specifics, and avoid readable text/watermarks/fake UI unless explicitly requested.
Return only the enhanced prompt.

Purpose: ${input.purpose}
Language: ${input.language || 'es'}
Brand context: ${stringifyContext(input.brandContext)}
Draft:
${input.brief}`;
}
function buildVisualAnalysisPrompt(input) {
    return `Analyze the provided visual reference images for Quimera.ai generation.
Return JSON only:
{
  "style": "",
  "palette": [],
  "subjects": [],
  "composition": "",
  "lighting": "",
  "constraints": [],
  "promptHints": [],
  "warnings": []
}

Context:
- Purpose: ${input.purpose}
- Brand context: ${stringifyContext(input.brandContext)}
- Brief: ${input.brief}`;
}
async function callAiProxy(body) {
    const response = await fetch(getAiProxyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok) {
        throw Object.assign(new Error(parsed.error || `AI proxy failed with ${response.status}`), {
            status: response.status,
            details: parsed.details,
        });
    }
    return parsed;
}
function extractText(response) {
    if (!response)
        return '';
    if (typeof response.text === 'string')
        return response.text;
    const parts = response.response?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
        const part = parts.find((item) => typeof item.text === 'string');
        if (part)
            return part.text;
    }
    return '';
}
function parseJsonOrText(text) {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
    const candidate = fenced || trimmed;
    try {
        return JSON.parse(candidate);
    }
    catch {
        return { content: text };
    }
}
function usageFromResponse(response, model) {
    const usage = response.response?.usageMetadata || {};
    return {
        provider: response.metadata?.provider || 'openrouter',
        model: response.metadata?.model || model,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || response.metadata?.tokensUsed || 0,
    };
}
async function checkCredits(supabase, tenantId, requiredCredits) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('ai_credits_usage')
        .eq('tenant_id', tenantId)
        .maybeSingle();
    if (error)
        throw error;
    const usage = data?.ai_credits_usage;
    if (!usage || typeof usage.creditsRemaining !== 'number')
        return;
    if (usage.creditsRemaining < requiredCredits) {
        throw Object.assign(new Error('CREDITS_EXHAUSTED'), {
            status: 402,
            code: 'CREDITS_EXHAUSTED',
            creditsRequired: requiredCredits,
            creditsRemaining: usage.creditsRemaining,
        });
    }
}
async function consumeCredits(supabase, auth, input, operation, creditsUsed, usage, traceId) {
    await supabase.from('ai_credits_transactions').insert({
        tenant_id: input.tenantId,
        user_id: auth.userId || null,
        operation,
        credits_used: creditsUsed,
        description: `MCP ${input.purpose}`,
        metadata: {
            project_id: input.projectId,
            model: usage.model,
            provider: usage.provider,
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            total_tokens: usage.totalTokens,
            trace_id: traceId,
            agent_id: input.agentId || auth.agentId,
            source_tool: input.metadata?.sourceTool,
        },
    });
    const { data } = await supabase
        .from('subscriptions')
        .select('ai_credits_usage')
        .eq('tenant_id', input.tenantId)
        .maybeSingle();
    const current = data?.ai_credits_usage;
    if (!current || typeof current.creditsUsed !== 'number')
        return;
    const updated = {
        ...current,
        creditsUsed: current.creditsUsed + creditsUsed,
        creditsRemaining: Math.max(0, (current.creditsIncluded || 0) - (current.creditsUsed + creditsUsed)),
        creditsOverage: Math.max(0, (current.creditsUsed + creditsUsed) - (current.creditsIncluded || 0)),
        lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    };
    await supabase
        .from('subscriptions')
        .update({ ai_credits_usage: updated })
        .eq('tenant_id', input.tenantId);
}
async function logApiCall(supabase, auth, input, usage, startTime, success, traceId, error) {
    await supabase.from('api_logs').insert({
        user_id: auth.userId || null,
        project_id: input.projectId || null,
        model: usage.model,
        feature: input.metadata?.sourceTool || 'mcp-ai',
        success,
        error,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
        latency_ms: Date.now() - startTime,
        endpoint: 'mcp/aiGateway',
        metadata: {
            tenant_id: input.tenantId,
            provider: usage.provider,
            trace_id: traceId,
            purpose: input.purpose,
            agent_id: input.agentId || auth.agentId,
            source_tool: input.metadata?.sourceTool,
        },
    });
}
function extensionForMime(mimeType) {
    if (mimeType.includes('png'))
        return 'png';
    if (mimeType.includes('webp'))
        return 'webp';
    if (mimeType.includes('gif'))
        return 'gif';
    return 'jpg';
}
async function saveGeneratedImage(supabase, auth, input, imageBase64, mimeType, prompt, usage, traceId) {
    const assetId = randomUUID();
    const ext = extensionForMime(mimeType);
    const safePurpose = input.purpose.replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 48) || 'generated';
    const fileName = `${safePurpose}-${assetId}.${ext}`;
    const storagePath = [
        'generated',
        input.tenantId,
        input.projectId || 'global',
        fileName,
    ].join('/');
    const buffer = Buffer.from(imageBase64, 'base64');
    const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
    });
    if (uploadError)
        throw uploadError;
    const { data: publicUrlData } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(storagePath);
    const url = publicUrlData.publicUrl;
    const category = input.imageOptions?.category || input.section || 'ai_generated';
    const metadata = {
        storagePath,
        tenantId: input.tenantId,
        projectId: input.projectId,
        provider: usage.provider,
        model: usage.model,
        prompt,
        createdByAgent: input.agentId || auth.agentId,
        sourceTool: input.metadata?.sourceTool,
        traceId,
    };
    const saveTo = input.saveTo || (input.projectId ? 'project' : 'media');
    if (saveTo === 'project' && input.projectId) {
        await supabase.from('files').insert({
            id: assetId,
            tenant_id: input.tenantId,
            project_id: input.projectId,
            name: fileName,
            url,
            size: buffer.length,
            type: mimeType,
            metadata,
            created_at: new Date().toISOString(),
        });
    }
    if (saveTo === 'admin') {
        await supabase.from('admin_assets').insert({
            id: assetId,
            name: fileName,
            url,
            size: buffer.length,
            type: mimeType,
            category,
            metadata: {
                ...metadata,
                tags: input.imageOptions?.tags || ['ai-generated', 'mcp'],
                description: input.imageOptions?.description || `Generated by MCP for ${input.purpose}`,
                isAiGenerated: true,
                aiPrompt: prompt,
            },
            created_at: new Date().toISOString(),
        });
    }
    if (saveTo !== 'none') {
        await supabase.from('media_assets').insert({
            id: assetId,
            name: fileName,
            url,
            size: buffer.length,
            type: mimeType,
            category,
            folder_path: `media/${category}`,
            tags: input.imageOptions?.tags || ['ai-generated', 'mcp'],
            description: input.imageOptions?.description || `Generated by MCP for ${input.purpose}`,
            is_ai_generated: true,
            ai_prompt: prompt,
            is_system_asset: false,
            used_in: [],
            usage_count: 0,
            metadata,
            created_by: auth.userId || null,
            created_at: new Date().toISOString(),
        });
    }
    return { assetId, url };
}
export async function generateContent(supabase, auth, input, mode = 'content') {
    const traceId = randomUUID();
    const startTime = Date.now();
    const preset = presetFor(input.modelPreset, mode === 'visual-analysis' ? 'multimodal' : 'content');
    const creditsUsed = preset.estimatedCredits;
    const operation = operationForPreset(preset);
    const warnings = [];
    const prompt = mode === 'page-json'
        ? buildPageJsonPrompt(input)
        : mode === 'prompt'
            ? buildPromptEnhancementPrompt(input)
            : mode === 'visual-analysis'
                ? buildVisualAnalysisPrompt(input)
                : buildContentPrompt(input);
    let usage = {
        provider: 'openrouter',
        model: preset.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };
    try {
        await checkCredits(supabase, input.tenantId, creditsUsed);
        const response = await callAiProxy({
            projectId: input.projectId || `mcp-${input.tenantId}`,
            userId: auth.userId || auth.agentId,
            prompt,
            model: preset.model,
            config: preset.defaultConfig,
            images: mode === 'visual-analysis' ? input.referenceImages : undefined,
            referenceImages: mode === 'visual-analysis' ? input.referenceImages : undefined,
        });
        usage = usageFromResponse(response, preset.model);
        const text = extractText(response);
        const content = mode === 'prompt' ? text : parseJsonOrText(text);
        if (Array.isArray(content?.warnings))
            warnings.push(...content.warnings);
        await consumeCredits(supabase, auth, input, operation, creditsUsed, usage, traceId);
        await logApiCall(supabase, auth, input, usage, startTime, true, traceId);
        return { status: 'success', content, usage, creditsUsed, warnings, traceId };
    }
    catch (error) {
        await logApiCall(supabase, auth, input, usage, startTime, false, traceId, error.message);
        throw error;
    }
}
export async function generateImage(supabase, auth, input) {
    const traceId = randomUUID();
    const startTime = Date.now();
    const preset = presetFor(input.modelPreset, 'image');
    const prompt = buildImagePrompt(input);
    const operation = operationForPreset(preset, input.imageOptions);
    const imageModel = resolveImageModel(input.imageOptions?.model || preset.model);
    const creditsUsed = CREDIT_COSTS[operation] || preset.estimatedCredits;
    const warnings = [];
    let usage = {
        provider: 'openrouter',
        model: imageModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };
    try {
        await checkCredits(supabase, input.tenantId, creditsUsed);
        const response = await callAiProxy({
            projectId: input.projectId || `image-gen-${input.tenantId}`,
            userId: auth.userId || auth.agentId,
            prompt,
            model: imageModel,
            aspectRatio: input.imageOptions?.aspectRatio || preset.defaultConfig?.aspectRatio || '1:1',
            resolution: input.imageOptions?.resolution || preset.defaultConfig?.resolution || '1K',
            style: input.imageOptions?.style,
            thinkingLevel: input.imageOptions?.thinkingLevel,
            personGeneration: input.imageOptions?.personGeneration,
            temperature: input.imageOptions?.temperature,
            negativePrompt: input.imageOptions?.negativePrompt,
            referenceImages: input.referenceImages,
            images: input.referenceImages,
            config: {
                ...preset.defaultConfig,
                ...input.imageOptions,
            },
        });
        if (!response.success || !response.image) {
            throw new Error('No image returned from AI proxy.');
        }
        usage = {
            provider: response.metadata?.provider || 'openrouter',
            model: response.metadata?.model || imageModel,
            promptTokens: prompt.length,
            completionTokens: 0,
            totalTokens: prompt.length,
        };
        const saved = await saveGeneratedImage(supabase, auth, input, response.image, response.mimeType || 'image/jpeg', prompt, usage, traceId);
        await consumeCredits(supabase, auth, input, operation, creditsUsed, usage, traceId);
        await logApiCall(supabase, auth, input, usage, startTime, true, traceId);
        return {
            status: 'success',
            assetIds: [saved.assetId],
            urls: [saved.url],
            content: {
                prompt,
                assetId: saved.assetId,
                url: saved.url,
            },
            usage,
            creditsUsed,
            warnings,
            traceId,
        };
    }
    catch (error) {
        await logApiCall(supabase, auth, input, usage, startTime, false, traceId, error.message);
        throw error;
    }
}
//# sourceMappingURL=aiGateway.js.map