import type {
    ContentCampaign,
    ContentFormat,
    ContentPlatform,
    ContentSourceMap,
} from './contentGeneration';
import type { ContentReadiness } from './contentReadiness';
import type { MediaBrandContext } from './mediaBlueprint';

export type ContentExportType =
    | 'copy_package'
    | 'json_package'
    | 'prompts_package'
    | 'asset_list'
    | 'script_copy'
    | 'storyboard'
    | 'downloadable_assets';

export interface ContentExport {
    id: string;
    campaignId: string;
    type: ContentExportType;
    label: string;
    formats: ContentFormat[];
    platforms: ContentPlatform[];
    generatedAt: string;
    createdBy?: string;
    package: ContentExportPackage;
}

export interface ContentExportPackage {
    project?: {
        projectId?: string;
        tenantId?: string;
        workspaceId?: string;
        name?: string;
    };
    businessContext?: {
        businessName?: string;
        industry?: string;
        description?: string;
    };
    brandContext?: MediaBrandContext;
    brief: string;
    contentType: ContentCampaign['contentType'];
    platforms: ContentPlatform[];
    formats: ContentFormat[];
    strategy: string;
    copy: string[];
    script: string[];
    storyboard: Array<{
        id: string;
        title: string;
        purpose: string;
        visualPrompt: string;
        copyText?: string;
        captionText?: string;
        status: string;
    }>;
    scenePrompts: string[];
    assetPrompts: string[];
    assetReferences: Array<{
        id: string;
        type: string;
        status: string;
        url?: string;
        prompt: string;
    }>;
    timeline: ContentCampaign['timeline'];
    platformFormats: Array<{ platform: ContentPlatform; formats: ContentFormat[] }>;
    readiness: ContentReadiness;
    warnings: string[];
    sourceMap: ContentSourceMap;
    version: number;
    createdAt: string;
}
