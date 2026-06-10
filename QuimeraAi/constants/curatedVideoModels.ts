/**
 * Curated video models for Quimera media generator.
 * Slugs are resolved against OpenRouter GET /api/v1/videos/models at runtime.
 */

import type { AiCreditOperation } from '../types/subscription';

const QUIMERA_INTERNAL_CREDIT_USD = 0.01;
const QUIMERA_VIDEO_TARGET_GROSS_MARGIN = 0.5;
export const QUIMERA_LOWEST_PACKAGE_CREDIT_USD = 0.02;

export interface CuratedVideoModelConfig {
    id: string;
    /** Primary OpenRouter slug; may be overridden by runtime discovery for Omni */
    openRouterId: string;
    labelKey: string;
    descriptionKey: string;
    provider: 'ByteDance' | 'Google';
    creditOperation: AiCreditOperation;
    /** Match patterns for runtime Omni slug discovery */
    discoveryPatterns?: string[];
    comingSoonUntilDiscovered?: boolean;
}

export const CURATED_VIDEO_MODELS: CuratedVideoModelConfig[] = [
    {
        id: 'seedance-2.0',
        openRouterId: 'bytedance/seedance-2.0',
        labelKey: 'mediaGeneration.models.seedance20.label',
        descriptionKey: 'mediaGeneration.models.seedance20.description',
        provider: 'ByteDance',
        creditOperation: 'video_generation_seedance',
    },
    {
        id: 'veo-3.1',
        openRouterId: 'google/veo-3.1',
        labelKey: 'mediaGeneration.models.veo31.label',
        descriptionKey: 'mediaGeneration.models.veo31.description',
        provider: 'Google',
        creditOperation: 'video_generation_veo',
    },
    {
        id: 'gemini-omni',
        openRouterId: 'google/gemini-omni-flash',
        labelKey: 'mediaGeneration.models.omni.label',
        descriptionKey: 'mediaGeneration.models.omni.description',
        provider: 'Google',
        creditOperation: 'video_generation_omni',
        discoveryPatterns: ['omni'],
        comingSoonUntilDiscovered: true,
    },
];

export const CURATED_VIDEO_MODEL_IDS = CURATED_VIDEO_MODELS.map(m => m.openRouterId);

export function resolveOmniModelId(
    models: Array<{ id: string; name?: string }>
): string | null {
    const omni = models.find(m => {
        const lower = `${m.id} ${m.name || ''}`.toLowerCase();
        return m.id.startsWith('google/') && lower.includes('omni');
    });
    return omni?.id ?? null;
}

export function getCreditOperationForVideoModel(modelId: string): AiCreditOperation {
    const curated = CURATED_VIDEO_MODELS.find(
        m => m.openRouterId === modelId || m.id === modelId
    );
    if (curated) return curated.creditOperation;
    if (modelId.includes('seedance')) return 'video_generation_seedance';
    if (modelId.includes('omni')) return 'video_generation_omni';
    return 'video_generation_veo';
}

interface VideoPricingInput {
    modelId: string;
    duration?: number;
    resolution?: string;
    size?: string;
    aspectRatio?: string;
    generateAudio?: boolean;
    pricingSkus?: Record<string, string>;
}

interface ResolutionDimensions {
    width: number;
    height: number;
}

const SEEDANCE_DEFAULT_TOKEN_PRICES: Record<string, number> = {
    'bytedance/seedance-2.0': 0.000007,
    'bytedance/seedance-2.0-fast': 0.0000056,
    'bytedance/seedance-1-5-pro': 0.0000024,
};

const DEFAULT_VIDEO_PRICE_PER_SECOND_USD: Record<string, number> = {
    'google/veo-3.1': 0.40,
    'google/veo-3.1-fast': 0.12,
    'google/veo-3.1-lite': 0.08,
    'google/gemini-omni-flash': 0.60,
};

const DEFAULT_VEO_PRICE_BY_MODE: Record<string, { audio: number; silent: number; audio4k?: number; silent4k?: number; audio720p?: number; silent720p?: number }> = {
    'google/veo-3.1': { audio: 0.40, silent: 0.20, audio4k: 0.60, silent4k: 0.40 },
    'google/veo-3.1-fast': { audio: 0.12, silent: 0.10, audio4k: 0.30, silent4k: 0.25, audio720p: 0.10, silent720p: 0.08 },
    'google/veo-3.1-lite': { audio: 0.08, silent: 0.05, audio720p: 0.05, silent720p: 0.03 },
};

function parseUsd(value?: string): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCents(value?: string): number | null {
    const parsed = parseUsd(value);
    return parsed == null ? null : parsed / 100;
}

function parseSize(size?: string): ResolutionDimensions | null {
    const match = size?.match(/^(\d+)x(\d+)$/);
    if (!match) return null;
    return {
        width: Number(match[1]),
        height: Number(match[2]),
    };
}

function dimensionsForResolution(resolution?: string): ResolutionDimensions {
    const normalized = (resolution || '720p').toLowerCase();
    if (normalized.includes('1080')) return { width: 1920, height: 1080 };
    if (normalized.includes('480')) return { width: 854, height: 480 };
    return { width: 1280, height: 720 };
}

function is4kResolution(resolution?: string, size?: string): boolean {
    const normalized = `${resolution || ''} ${size || ''}`.toLowerCase();
    return normalized.includes('4k') || normalized.includes('3840x2160') || normalized.includes('2160');
}

function estimateSeedanceOpenRouterCostUsd(input: VideoPricingInput): number {
    const duration = input.duration || 8;
    const dimensions = parseSize(input.size) || dimensionsForResolution(input.resolution);
    const tokenPrice = parseUsd(input.pricingSkus?.video_tokens)
        || SEEDANCE_DEFAULT_TOKEN_PRICES[input.modelId]
        || SEEDANCE_DEFAULT_TOKEN_PRICES['bytedance/seedance-2.0'];

    // OpenRouter documents Seedance video tokens as: height * width * duration * 24 / 1024.
    const videoTokens = (dimensions.width * dimensions.height * duration * 24) / 1024;
    return videoTokens * tokenPrice;
}

function estimateVeoOpenRouterCostUsd(input: VideoPricingInput): number {
    const duration = input.duration || 8;
    const audio = input.generateAudio !== false;
    const skus = input.pricingSkus || {};
    const normalizedResolution = (input.resolution || '').toLowerCase();
    const is4k = is4kResolution(input.resolution, input.size);
    const is720p = normalizedResolution.includes('720');

    const skuCandidates = audio
        ? [
            is4k ? 'duration_seconds_with_audio_4k' : null,
            is720p ? 'duration_seconds_with_audio_720p' : null,
            'duration_seconds_with_audio',
        ]
        : [
            is4k ? 'duration_seconds_without_audio_4k' : null,
            is720p ? 'duration_seconds_without_audio_720p' : null,
            'duration_seconds_without_audio',
        ];

    const defaultVeoPricing = DEFAULT_VEO_PRICE_BY_MODE[input.modelId] || DEFAULT_VEO_PRICE_BY_MODE['google/veo-3.1'];
    const defaultPerSecond = is4k
        ? (audio ? defaultVeoPricing.audio4k : defaultVeoPricing.silent4k) || (audio ? defaultVeoPricing.audio : defaultVeoPricing.silent)
        : is720p
            ? (audio ? defaultVeoPricing.audio720p : defaultVeoPricing.silent720p) || (audio ? defaultVeoPricing.audio : defaultVeoPricing.silent)
            : (audio ? defaultVeoPricing.audio : defaultVeoPricing.silent);

    const perSecond = skuCandidates
        .map(key => key ? parseUsd(skus[key]) : null)
        .find((value): value is number => value != null)
        || defaultPerSecond;

    return perSecond * duration;
}

function estimateGenericOpenRouterCostUsd(input: VideoPricingInput): number {
    const duration = input.duration || 8;
    const skus = input.pricingSkus || {};
    const resolution = (input.resolution || '720p').toLowerCase();
    const genericPerSecond = parseUsd(skus['per-video-second'])
        || parseUsd(skus.duration_seconds)
        || parseCents(skus[`cents_per_video_output_second_${resolution}`])
        || parseCents(skus.cents_per_video_output_second_720p)
        || DEFAULT_VIDEO_PRICE_PER_SECOND_USD[input.modelId]
        || DEFAULT_VIDEO_PRICE_PER_SECOND_USD['google/gemini-omni-flash'];

    return genericPerSecond * duration;
}

export function estimateOpenRouterVideoCostUsd(input: VideoPricingInput): number {
    if (input.modelId.includes('seedance')) {
        return estimateSeedanceOpenRouterCostUsd(input);
    }
    if (input.modelId.includes('veo')) {
        return estimateVeoOpenRouterCostUsd(input);
    }
    return estimateGenericOpenRouterCostUsd(input);
}

export function calculateVideoGenerationCredits(input: VideoPricingInput): number {
    const openRouterCostUsd = estimateOpenRouterVideoCostUsd(input);
    const credits = Math.ceil(openRouterCostUsd / QUIMERA_INTERNAL_CREDIT_USD / QUIMERA_VIDEO_TARGET_GROSS_MARGIN);
    return Math.max(1, credits);
}

export function estimateVideoUserSpendUsd(credits: number): number {
    return credits * QUIMERA_LOWEST_PACKAGE_CREDIT_USD;
}
