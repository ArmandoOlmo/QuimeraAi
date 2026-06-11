/**
 * OpenRouter video generation client via Supabase ai-proxy Edge Function.
 */

import type {
    VideoGenerationOptions,
    VideoJobPollResult,
    VideoJobSubmitResult,
    VideoModelCapabilities,
} from '../types/videoGeneration';
import { CURATED_VIDEO_MODELS, resolveOmniModelId } from '../constants/curatedVideoModels';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const AI_PROXY_URL = import.meta.env.VITE_VIDEO_PROXY_URL ||
    import.meta.env.VITE_AI_PROXY_URL ||
    `${SUPABASE_URL}/functions/v1/ai-proxy`;
const OPENROUTER_VIDEO_MODELS_URL = 'https://openrouter.ai/api/v1/videos/models';
const OPENROUTER_ORIGIN = 'https://openrouter.ai';

async function callVideoProxy(body: Record<string, unknown>): Promise<Response> {
    return fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractVideoErrorMessage(errorPayload: any, fallback: string): string {
    if (!errorPayload) return fallback;
    if (typeof errorPayload === 'string') return errorPayload;

    const details = typeof errorPayload.details === 'string'
        ? tryParseJson(errorPayload.details)
        : errorPayload.details;
    const nested = details?.error || details || errorPayload.error;
    const providerCode = nested?.code || details?.code || errorPayload.code;
    const providerMessage = nested?.message || details?.message || errorPayload.message;
    const mappedProviderMessage = mapProviderVideoError(providerCode, providerMessage);

    if (mappedProviderMessage) return mappedProviderMessage;

    if (nested?.message) return nested.message;
    if (details?.message) return details.message;
    if (typeof nested === 'string' && nested !== 'OpenRouter video error') return nested;
    if (typeof errorPayload.error === 'string' && errorPayload.error !== 'OpenRouter video error') return errorPayload.error;
    if (errorPayload.message) return errorPayload.message;

    return fallback;
}

function mapProviderVideoError(code?: unknown, message?: unknown): string | null {
    const normalizedCode = typeof code === 'string' ? code : '';
    const normalizedMessage = typeof message === 'string' ? message : '';
    const combined = `${normalizedCode} ${normalizedMessage}`.toLowerCase();

    if (
        normalizedCode === 'InputImageSensitiveContentDetected.PrivacyInformation' ||
        (combined.includes('input image') && combined.includes('real person')) ||
        combined.includes('privacyinformation')
    ) {
        return 'El proveedor rechazó la imagen de entrada porque puede contener una persona real. Para Seedance, usa una imagen sin persona real, un personaje/ilustración, elimina la referencia o prueba otro modelo que permita ese tipo de entrada.';
    }

    if (
        normalizedCode.includes('SensitiveContent') ||
        combined.includes('sensitive content') ||
        combined.includes('safety')
    ) {
        return 'El proveedor rechazó la solicitud por sus filtros de seguridad. Ajusta el prompt o cambia las imágenes de referencia y vuelve a intentar.';
    }

    return null;
}

function tryParseJson(value: string): any {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function normalizePollingUrl(pollingUrl?: string): string | undefined {
    if (!pollingUrl) return undefined;
    if (pollingUrl.startsWith('/')) return `${OPENROUTER_ORIGIN}${pollingUrl}`;
    return pollingUrl;
}

function normalizeVideoStatus(status: unknown): string {
    return typeof status === 'string' ? status.toLowerCase() : 'pending';
}

function isCompletedStatus(status: string): boolean {
    return status === 'completed' || status === 'complete' || status === 'succeeded' || status === 'success';
}

function isFailedStatus(status: string): boolean {
    return status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled' || status === 'expired';
}

function extractUnsignedUrls(job: Record<string, any>): string[] {
    const candidates = [
        job.unsigned_urls,
        job.unsignedUrls,
        job.urls,
        job.video_urls,
        job.videoUrls,
        job.output_urls,
        job.outputUrls,
        job.outputs,
        job.output,
        job.result?.unsigned_urls,
        job.result?.urls,
        job.result?.output,
        job.content,
    ];

    const urls: string[] = [];
    const collect = (value: unknown) => {
        if (!value) return;
        if (typeof value === 'string') {
            if (/^https?:\/\//.test(value)) urls.push(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(collect);
            return;
        }
        if (typeof value === 'object') {
            const objectValue = value as Record<string, unknown>;
            collect(objectValue.url);
            collect(objectValue.video_url);
            collect(objectValue.videoUrl);
            collect(objectValue.content_url);
            collect(objectValue.contentUrl);
        }
    };

    candidates.forEach(collect);

    if (urls.length === 0 && job.id && isCompletedStatus(normalizeVideoStatus(job.status))) {
        urls.push(`${OPENROUTER_ORIGIN}/api/v1/videos/${job.id}/content?index=0`);
    }

    return Array.from(new Set(urls));
}

export async function fetchVideoModels(): Promise<VideoModelCapabilities[]> {
    let allModels: Record<string, any>[] = [];

    try {
        const response = await callVideoProxy({ action: 'video_models' });
        if (response.ok) {
            const data = await response.json();
            allModels = data.models || data.data || [];
        }
    } catch (error) {
        console.warn('[videoProxyClient] Proxy video_models failed, trying OpenRouter public metadata', error);
    }

    if (allModels.length === 0) {
        try {
            const response = await fetch(OPENROUTER_VIDEO_MODELS_URL);
            if (response.ok) {
                const data = await response.json();
                allModels = data.data || data.models || [];
            }
        } catch (error) {
            console.warn('[videoProxyClient] OpenRouter public metadata failed, using curated fallback', error);
        }
    }

    const omniResolvedId = resolveOmniModelId(allModels as Array<{ id: string; name?: string }>);

    return CURATED_VIDEO_MODELS.map(curated => {
        let modelId = curated.openRouterId;
        if (curated.id === 'gemini-omni' && omniResolvedId) {
            modelId = omniResolvedId;
        }

        const apiModel = allModels.find(m => m.id === modelId);
        const available = Boolean(apiModel);
        const comingSoon = curated.comingSoonUntilDiscovered && !available;
        const fallback = getFallbackVideoCapabilities(curated.id, modelId);
        const supportedFrameImages = normalizeFrameImages(apiModel?.supported_frame_images || fallback.supported_frame_images);

        return {
            id: modelId,
            name: apiModel?.name || fallback.name || curated.id,
            description: apiModel?.description || fallback.description,
            supported_resolutions: apiModel?.supported_resolutions || fallback.supported_resolutions,
            supported_aspect_ratios: apiModel?.supported_aspect_ratios || fallback.supported_aspect_ratios,
            supported_sizes: apiModel?.supported_sizes || fallback.supported_sizes,
            supported_durations: apiModel?.supported_durations || fallback.supported_durations,
            supported_frame_images: supportedFrameImages,
            supports_generate_audio: normalizeBoolean(apiModel?.supports_generate_audio, apiModel?.generate_audio, fallback.supports_generate_audio),
            supports_seed: normalizeBoolean(apiModel?.supports_seed, apiModel?.seed, fallback.supports_seed),
            supports_frame_images: supportedFrameImages.length > 0,
            supports_input_references: normalizeInputReferences(apiModel, fallback.supports_input_references),
            max_input_references: apiModel?.max_input_references ?? fallback.max_input_references,
            allowed_passthrough_parameters: apiModel?.allowed_passthrough_parameters || fallback.allowed_passthrough_parameters,
            pricing_skus: apiModel?.pricing_skus || fallback.pricing_skus,
            available: available || fallback.available,
            comingSoon,
        };
    });
}

function normalizeBoolean(...values: unknown[]): boolean {
    for (const value of values) {
        if (typeof value === 'boolean') return value;
        if (value != null) return Boolean(value);
    }
    return false;
}

function normalizeFrameImages(value: unknown): Array<'first_frame' | 'last_frame'> {
    if (Array.isArray(value)) {
        return value.filter((item): item is 'first_frame' | 'last_frame' => item === 'first_frame' || item === 'last_frame');
    }
    if (value === true) return ['first_frame', 'last_frame'];
    return [];
}

function normalizeInputReferences(apiModel: Record<string, any> | undefined, fallback: boolean | undefined): boolean {
    if (typeof apiModel?.supports_input_references === 'boolean') return apiModel.supports_input_references;
    const description = `${apiModel?.description || ''}`.toLowerCase();
    if (description.includes('reference-to-video') || description.includes('multimodal reference')) return true;
    return Boolean(fallback);
}

function getFallbackVideoCapabilities(curatedId: string, modelId: string): Partial<VideoModelCapabilities> {
    if (curatedId === 'seedance-2.0') {
        return {
            id: modelId,
            name: 'ByteDance: Seedance 2.0',
            description: 'Text-to-video and image-to-video with first/last frame and multimodal references.',
            supported_resolutions: ['480p', '720p', '1080p'],
            supported_aspect_ratios: ['1:1', '3:4', '9:16', '4:3', '16:9', '21:9', '9:21'],
            supported_sizes: ['480x480', '480x640', '480x854', '640x480', '854x480', '1120x480', '720x720', '720x960', '720x1280', '720x1680', '960x720', '1280x720', '1680x720', '1080x1080', '1080x1440', '1080x1920', '1440x1080', '1920x1080', '2520x1080'],
            supported_durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            supported_frame_images: ['first_frame', 'last_frame'],
            supports_generate_audio: true,
            supports_seed: true,
            supports_frame_images: true,
            supports_input_references: true,
            max_input_references: 4,
            allowed_passthrough_parameters: ['watermark', 'req_key'],
            pricing_skus: { video_tokens: '0.000007', video_tokens_without_audio: '0.000007' },
            available: true,
        };
    }

    if (curatedId === 'veo-3.1') {
        return {
            id: modelId,
            name: 'Google: Veo 3.1',
            description: 'High-fidelity text/image-to-video with native synchronized audio and first/last frame.',
            supported_resolutions: ['720p', '1080p', '4K'],
            supported_aspect_ratios: ['16:9', '9:16'],
            supported_sizes: ['1280x720', '1080x1920', '1920x1080', '720x1280', '3840x2160', '2160x3840'],
            supported_durations: [4, 6, 8],
            supported_frame_images: ['first_frame', 'last_frame'],
            supports_generate_audio: true,
            supports_seed: true,
            supports_frame_images: true,
            supports_input_references: false,
            max_input_references: 0,
            allowed_passthrough_parameters: ['personGeneration', 'aspectRatio', 'negativePrompt', 'conditioningScale', 'enhancePrompt'],
            pricing_skus: {
                duration_seconds_with_audio: '0.40',
                duration_seconds_with_audio_4k: '0.60',
                duration_seconds_without_audio: '0.20',
                duration_seconds_without_audio_4k: '0.40',
            },
            available: true,
        };
    }

    return {
        id: modelId,
        name: 'Gemini Omni',
        supported_durations: [4, 6, 8],
        supported_resolutions: ['720p', '1080p'],
        supported_aspect_ratios: ['16:9', '9:16'],
        supports_generate_audio: true,
        supports_seed: true,
        supports_frame_images: true,
        supports_input_references: true,
        max_input_references: 4,
        allowed_passthrough_parameters: [],
        available: false,
    };
}

export async function submitVideoJob(
    userId: string,
    prompt: string,
    options: VideoGenerationOptions,
    projectId?: string
): Promise<VideoJobSubmitResult> {
    const response = await callVideoProxy({
        action: 'video_submit',
        userId,
        projectId: projectId || `video-gen-${userId}`,
        prompt,
        model: options.model,
        duration: options.duration,
        resolution: options.resolution,
        aspect_ratio: options.aspectRatio,
        size: options.size,
        generate_audio: options.generateAudio,
        seed: options.seed,
        frame_images: options.frameImages?.map(f => ({
            frame_type: f.frameType,
            url: f.url,
        })),
        input_references: options.inputReferences,
        negative_prompt: options.negativePrompt,
        provider_parameters: options.providerParameters,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorText = `${err.error || ''} ${err.details || ''}`;
        if (errorText.includes('OpenRouter API error') && errorText.includes('Internal Server Error')) {
            throw new Error('El proxy de Supabase ai-proxy desplegado no tiene soporte de video actualizado. Despliega supabase/functions/ai-proxy y vuelve a intentar.');
        }
        throw new Error(extractVideoErrorMessage(err, 'Video submission failed'));
    }

    const data = await response.json();
    if (data?.error) {
        throw new Error(extractVideoErrorMessage(data, 'OpenRouter rechazó la solicitud de video.'));
    }

    const job = data.data || data.job || data;
    const jobId = job.id || job.generation_id || job.generationId;
    const pollingUrl = normalizePollingUrl(
        job.polling_url || job.pollingUrl || job.poll_url || job.status_url ||
        (jobId ? `https://openrouter.ai/api/v1/videos/${jobId}` : undefined)
    );

    if (!jobId || !pollingUrl) {
        console.error('[videoProxyClient] Unexpected video_submit response:', data);
        throw new Error('OpenRouter no devolvió un id/polling_url para el job de video.');
    }

    return {
        id: jobId,
        pollingUrl,
        status: normalizeVideoStatus(job.status || 'pending'),
    };
}

export async function pollVideoJob(pollingUrl: string): Promise<VideoJobPollResult> {
    if (!pollingUrl) {
        throw new Error('No se recibió polling_url para consultar el estado del video.');
    }

    const response = await callVideoProxy({
        action: 'video_poll',
        polling_url: pollingUrl,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(extractVideoErrorMessage(err, 'Video poll failed'));
    }

    const data = await response.json();
    if (data?.error && !data?.status) {
        throw new Error(extractVideoErrorMessage(data, 'Video poll failed'));
    }

    const job = data.data || data.job || data;
    const status = normalizeVideoStatus(job.status);
    return {
        id: job.id,
        status,
        error: job.error,
        unsignedUrls: extractUnsignedUrls(job),
        generationId: job.generation_id || job.generationId,
        usage: job.usage,
    };
}

function isOpenRouterVideoContentUrl(videoUrl: string): boolean {
    try {
        const parsed = new URL(videoUrl);
        return parsed.origin === 'https://openrouter.ai' && parsed.pathname.startsWith('/api/v1/videos/');
    } catch {
        return false;
    }
}

async function parseDownloadError(response: Response): Promise<string> {
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        const err = await response.json().catch(() => ({}));
        return extractVideoErrorMessage(err, `HTTP ${response.status}`);
    }
    const text = await response.text().catch(() => '');
    return text || `HTTP ${response.status}`;
}

export async function downloadVideoBlob(videoUrl: string): Promise<Blob> {
    if (!videoUrl) {
        throw new Error('No se recibió URL para descargar el video generado.');
    }

    if (isOpenRouterVideoContentUrl(videoUrl)) {
        const proxied = await callVideoProxy({
            action: 'video_download',
            video_url: videoUrl,
        });

        if (!proxied.ok) {
            throw new Error(await parseDownloadError(proxied));
        }

        return proxied.blob();
    }

    const direct = await fetch(videoUrl);
    if (direct.ok) {
        return direct.blob();
    }

    throw new Error(await parseDownloadError(direct));
}

export interface PollVideoOptions {
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (status: VideoJobPollResult) => void;
    signal?: AbortSignal;
}

export async function pollVideoJobUntilComplete(
    pollingUrl: string,
    options: PollVideoOptions = {}
): Promise<VideoJobPollResult> {
    const intervalMs = options.intervalMs ?? 10000;
    const maxAttempts = options.maxAttempts ?? 180;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (options.signal?.aborted) {
            throw new Error('Video generation cancelled');
        }

        const result = await pollVideoJob(pollingUrl);
        options.onProgress?.(result);

        const status = normalizeVideoStatus(result.status);

        if (isCompletedStatus(status)) {
            if (!result.unsignedUrls?.length) {
                throw new Error('Video completed but no download URL returned');
            }
            return result;
        }

        if (isFailedStatus(status)) {
            throw new Error(result.error || `Video generation ${status}`);
        }

        await sleep(intervalMs);
    }

    throw new Error('La generación de video tardó más de lo esperado. Seedance con imágenes de referencia puede tomar varios minutos; intenta de nuevo con menor duración/resolución o menos referencias.');
}

export async function generateVideoViaProxy(
    userId: string,
    prompt: string,
    options: VideoGenerationOptions,
    projectId?: string,
    pollOptions?: PollVideoOptions
): Promise<{ videoUrl: string; job: VideoJobPollResult }> {
    const submit = await submitVideoJob(userId, prompt, options, projectId);
    const job = await pollVideoJobUntilComplete(submit.pollingUrl, pollOptions);
    return {
        videoUrl: job.unsignedUrls![0],
        job,
    };
}
