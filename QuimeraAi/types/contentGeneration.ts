import type { ContentReadiness } from './contentReadiness';

export type ContentStatus =
    | 'draft'
    | 'generating'
    | 'generated'
    | 'needs_review'
    | 'approved'
    | 'scheduled'
    | 'exported'
    | 'published'
    | 'failed'
    | 'archived';

export type ContentAssetStatus =
    | 'pending'
    | 'generating'
    | 'generated'
    | 'approved'
    | 'rejected'
    | 'failed';

export type ContentGenerationJobStatus =
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'retrying';

export type ContentFormat =
    | '1:1'
    | '4:5'
    | '9:16'
    | '16:9'
    | '3:2'
    | 'website_hero'
    | 'email_banner'
    | 'story'
    | 'carousel';

export type ContentPlatform =
    | 'instagram'
    | 'tiktok'
    | 'youtube_shorts'
    | 'youtube'
    | 'facebook'
    | 'linkedin'
    | 'google_ads'
    | 'meta_ads'
    | 'website'
    | 'email'
    | 'blog'
    | 'storefront'
    | 'template_marketplace';

export type ContentTypeId =
    | 'social_post'
    | 'social_carousel'
    | 'reel_short'
    | 'ad_creative'
    | 'product_promo'
    | 'website_asset_pack'
    | 'email_banner'
    | 'blog_visual'
    | 'campaign_pack'
    | 'template_preview';

export type ContentFlowStep =
    | 'brief'
    | 'strategy'
    | 'script'
    | 'storyboard'
    | 'assets'
    | 'timeline'
    | 'review'
    | 'export'
    | 'adminOverview'
    | 'globalPresets'
    | 'presetConfig'
    | 'promptBlocks'
    | 'stylePacks'
    | 'templatePacks'
    | 'providerRouting'
    | 'generationJobs'
    | 'usage'
    | 'safetyPolicies'
    | 'usageRules'
    | 'publishing'
    | 'audit'
    | 'auditLogs';

export type ContentAssetType =
    | 'image'
    | 'video'
    | 'audio'
    | 'voiceover'
    | 'caption'
    | 'logo'
    | 'product_image'
    | 'background'
    | 'reference'
    | 'template_preview';

export interface ContentEditableState {
    generatedByAI: boolean;
    editedByUser: boolean;
    lockedFromRegeneration?: boolean;
    lastEditedAt?: string;
    lastEditedBy?: string;
}

export interface ContentSourceMap {
    brief?: string;
    businessProfile?: string;
    brandProfile?: string;
    product?: string;
    service?: string;
    websiteSection?: string;
    adminPreset?: string;
    generatedPrompt?: string;
    providerJob?: string;
    [key: string]: string | undefined;
}

export interface ContentTypeDefinition {
    id: ContentTypeId;
    label: string;
    description: string;
    defaultFormats: ContentFormat[];
    supportedPlatforms: ContentPlatform[];
    requiredInputs: string[];
    defaultFlow: ContentFlowStep[];
    availableExportTypes: string[];
    adminOnly?: boolean;
}

export interface ContentPromptBlock {
    id: string;
    label: string;
    role: 'system' | 'strategy' | 'script' | 'visual' | 'motion' | 'negative' | 'safety' | 'export';
    content: string;
    status: ContentStatus;
    sourceMap: ContentSourceMap;
    editableState: ContentEditableState;
}

export interface ContentShot {
    id: string;
    sceneId: string;
    order: number;
    label: string;
    cameraDirection?: string;
    visualPrompt: string;
    duration?: number;
    editableState: ContentEditableState;
}

export interface ContentAsset {
    id: string;
    type: ContentAssetType;
    url?: string;
    thumbnailUrl?: string;
    prompt: string;
    negativePrompt?: string;
    provider?: string;
    jobId?: string;
    format: ContentFormat;
    width?: number;
    height?: number;
    duration?: number;
    status: ContentAssetStatus;
    version: number;
    createdBy?: string;
    tenantId?: string;
    projectId?: string;
    sourceMap: ContentSourceMap;
    editableState: ContentEditableState;
    createdAt?: string;
}

export interface ContentScene {
    id: string;
    order: number;
    title: string;
    purpose: string;
    duration?: number;
    format: ContentFormat;
    visualPrompt: string;
    motionPrompt?: string;
    cameraDirection?: string;
    copyText?: string;
    voiceoverText?: string;
    captionText?: string;
    requiredAssets: string[];
    generatedAssets: ContentAsset[];
    status: ContentStatus;
    readiness: ContentReadiness;
    sourceMap: ContentSourceMap;
    editableState: ContentEditableState;
}

export interface ContentTimelineLayer {
    id: string;
    sceneId: string;
    type: 'image' | 'video' | 'audio' | 'caption' | 'voiceover';
    assetId?: string;
    start: number;
    duration: number;
}

export interface ContentTimeline {
    id: string;
    duration: number;
    scenes: string[];
    layers: ContentTimelineLayer[];
    version: number;
}

export interface ContentCampaign {
    id: string;
    title: string;
    brief: string;
    contentType: ContentTypeId;
    platforms: ContentPlatform[];
    formats: ContentFormat[];
    status: ContentStatus;
    strategy: string;
    scriptBlocks: ContentPromptBlock[];
    scenes: ContentScene[];
    assets: ContentAsset[];
    jobs: ContentGenerationJob[];
    timeline: ContentTimeline;
    readiness: ContentReadiness;
    sourceMap: ContentSourceMap;
    editableState: ContentEditableState;
    createdAt: string;
    updatedAt: string;
}

export interface ContentGenerationJob {
    id: string;
    jobType: 'strategy' | 'script' | 'storyboard' | 'image' | 'video' | 'audio' | 'caption' | 'export' | 'variation' | 'preset_test';
    status: ContentGenerationJobStatus;
    campaignId?: string;
    sceneId?: string;
    assetId?: string;
    providerId?: string;
    tenantId?: string;
    projectId?: string;
    createdBy?: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    attempt?: number;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
