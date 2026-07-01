import type {
    ContentAsset,
    ContentCampaign,
    ContentFormat,
    ContentGenerationJob,
    ContentPlatform,
    ContentSourceMap,
    ContentEditableState,
} from './contentGeneration';
import type { ContentPreset } from './contentFactoryAdmin';
import type { ContentReadiness } from './contentReadiness';

export interface MediaBrandContext {
    businessName?: string;
    industry?: string;
    brandVoice?: string;
    colors?: Record<string, string>;
    fonts?: string[];
    logoUrl?: string;
    source?: string;
}

export interface MediaBlueprint {
    blueprintVersion: string;
    schemaVersion: number;
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    status: 'draft' | 'generated' | 'configured' | 'published' | 'disabled' | 'needs_review';
    source: 'ai-studio' | 'manual' | 'admin-preset' | 'imported';
    generatedAt?: string;
    lastSyncedAt?: string;
    enabled: boolean;
    publicStudioEnabled: boolean;
    adminFactoryEnabled: boolean;
    brandContext?: MediaBrandContext;
    defaultFormats: ContentFormat[];
    defaultPlatforms: ContentPlatform[];
    campaigns: ContentCampaign[];
    assets: ContentAsset[];
    jobs: ContentGenerationJob[];
    presets: ContentPreset[];
    readiness: ContentReadiness;
    sourceMap: ContentSourceMap;
    editableState: ContentEditableState;
    imageNeeds: string[];
    videoNeeds: string[];
    brandAssetNeeds: string[];
}
