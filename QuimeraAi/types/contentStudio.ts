import type {
    ContentCampaign,
    ContentFormat,
    ContentPlatform,
    ContentStatus,
    ContentTypeId,
} from './contentGeneration';
import type { ContentExport } from './contentExports';
import type { ContentReadiness } from './contentReadiness';

export interface ContentStudioProject {
    id: string;
    title: string;
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    createdBy?: string;
    contentType: ContentTypeId;
    platforms: ContentPlatform[];
    formats: ContentFormat[];
    status: ContentStatus;
    activeCampaignId: string;
    campaigns: ContentCampaign[];
    exports: ContentExport[];
    readiness: ContentReadiness;
    version: number;
    createdAt: string;
    updatedAt: string;
}
