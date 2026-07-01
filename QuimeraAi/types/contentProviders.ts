import type {
    ContentAsset,
    ContentFormat,
    ContentGenerationJob,
} from './contentGeneration';

export type ContentProviderCapability =
    | 'text'
    | 'image'
    | 'image_edit'
    | 'video'
    | 'audio'
    | 'voice'
    | 'captions'
    | 'export'
    | 'moderation'
    | 'variations'
    | 'references'
    | 'batch';

export type ContentProviderCostMode = 'free' | 'credits' | 'metered' | 'external' | 'manual';

export interface ContentProviderAdapter {
    id: string;
    label: string;
    capabilities: ContentProviderCapability[];
    supportedFormats: ContentFormat[];
    supportsReferences: boolean;
    supportsBatch: boolean;
    supportsVariations: boolean;
    isAdminOnly: boolean;
    costMode: ContentProviderCostMode;
    isEnabled: boolean;
    adminOnlySettings?: Record<string, unknown>;
    generate(input: Record<string, unknown>): Promise<ContentGenerationJob>;
    getJobStatus(jobId: string): Promise<ContentGenerationJob>;
    cancelJob(jobId: string): Promise<void>;
}

export type ImageGenerationProvider = ContentProviderAdapter & { capabilities: Array<'image' | ContentProviderCapability> };
export type ImageEditProvider = ContentProviderAdapter & { capabilities: Array<'image_edit' | ContentProviderCapability> };
export type VideoGenerationProvider = ContentProviderAdapter & { capabilities: Array<'video' | ContentProviderCapability> };
export type AudioGenerationProvider = ContentProviderAdapter & { capabilities: Array<'audio' | ContentProviderCapability> };
export type VoiceGenerationProvider = ContentProviderAdapter & { capabilities: Array<'voice' | ContentProviderCapability> };
export type CaptionGenerationProvider = ContentProviderAdapter & { capabilities: Array<'captions' | ContentProviderCapability> };
export type CaptionProvider = CaptionGenerationProvider;
export type ModerationProvider = ContentProviderAdapter & { capabilities: Array<'moderation' | ContentProviderCapability> };
export type ExportProvider = ContentProviderAdapter & { capabilities: Array<'export' | ContentProviderCapability> };

export interface ContentProviderRoutingRule {
    id: string;
    label: string;
    contentType?: string;
    capability: ContentProviderCapability;
    preferredProviderId: string;
    fallbackProviderIds: string[];
    qualityMode: 'draft' | 'balanced' | 'premium';
    isEnabled: boolean;
}

export interface ContentProviderResult {
    asset?: ContentAsset;
    job: ContentGenerationJob;
}

export interface ContentProviderBridgeRequest {
    capability: ContentProviderCapability;
    campaignId?: string;
    sceneId?: string;
    assetId?: string;
    tenantId?: string;
    projectId?: string;
    createdBy?: string;
    prompt?: string;
    negativePrompt?: string;
    format?: ContentFormat;
    input?: Record<string, unknown>;
    qualityMode?: ContentProviderRoutingRule['qualityMode'];
}

export interface ContentProviderBridgeDecision {
    provider: ContentProviderAdapter;
    routingRule?: ContentProviderRoutingRule;
    reason: 'preferred_provider' | 'fallback_provider' | 'default_placeholder';
    warnings: string[];
}
