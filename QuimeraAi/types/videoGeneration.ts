/**
 * Video generation types for OpenRouter /api/v1/videos
 */

export type VideoFrameType = 'first_frame' | 'last_frame';

export type VideoJobStatus =
    | 'pending'
    | 'in_progress'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | string;

export interface VideoFrameImage {
    url: string;
    frameType: VideoFrameType;
}

export interface VideoModelCapabilities {
    id: string;
    name: string;
    description?: string;
    supported_resolutions?: string[];
    supported_aspect_ratios?: string[];
    supported_sizes?: string[];
    supported_durations?: number[];
    supported_frame_images?: VideoFrameType[];
    supports_generate_audio?: boolean;
    supports_seed?: boolean;
    supports_frame_images?: boolean;
    supports_input_references?: boolean;
    max_input_references?: number;
    allowed_passthrough_parameters?: string[];
    pricing_skus?: Record<string, string>;
    /** Resolved at runtime when Omni slug is discovered on OpenRouter */
    available?: boolean;
    comingSoon?: boolean;
}

export interface VideoGenerationOptions {
    model: string;
    duration?: number;
    resolution?: string;
    aspectRatio?: string;
    size?: string;
    generateAudio?: boolean;
    seed?: number;
    frameImages?: VideoFrameImage[];
    inputReferences?: string[];
    providerParameters?: Record<string, unknown>;
    negativePrompt?: string;
    /** Runtime pricing metadata from OpenRouter /api/v1/videos/models. Used for credit calculation only. */
    pricingSkus?: Record<string, string>;
    destination?: 'user' | 'global' | 'admin';
    adminCategory?: string;
    adminTags?: string[];
    adminDescription?: string;
    projectId?: string;
    tenantId?: string | null;
    onProgress?: (status: VideoJobPollResult) => void;
}

export interface VideoJobSubmitResult {
    id: string;
    pollingUrl: string;
    status: VideoJobStatus;
}

export interface VideoJobPollResult {
    id: string;
    status: VideoJobStatus;
    error?: string;
    unsignedUrls?: string[];
    generationId?: string;
    usage?: Record<string, unknown>;
}

export type MediaGeneratorMode = 'image' | 'video';

export interface CreateVideoFromImageDetail {
    imageUrl: string;
    mode: 'start' | 'end' | 'reference';
}
