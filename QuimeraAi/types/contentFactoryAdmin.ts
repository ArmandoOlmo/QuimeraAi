import type {
    ContentFormat,
    ContentGenerationJob,
    ContentPlatform,
    ContentPromptBlock,
    ContentTypeId,
} from './contentGeneration';
import type { ContentExportType } from './contentExports';
import type { ContentProviderRoutingRule } from './contentProviders';
import type { ContentReadiness } from './contentReadiness';

export type ContentPresetStatus = 'admin_draft' | 'testing' | 'approved' | 'published' | 'disabled' | 'archived';
export type ContentPresetVisibility = 'internal' | 'public' | 'tenant_beta' | 'marketplace';

export interface ContentStylePreset {
    id: string;
    label: string;
    description: string;
    styleSettings: Record<string, unknown>;
    status: ContentPresetStatus;
}

export interface ContentFormatPreset {
    id: string;
    label: string;
    formats: ContentFormat[];
    platforms: ContentPlatform[];
    exportTypes: ContentExportType[];
}

export interface ContentTemplatePack {
    id: string;
    label: string;
    description: string;
    industry: string;
    contentTypes: ContentTypeId[];
    status: ContentPresetStatus;
    visibility: ContentPresetVisibility;
    presetIds: string[];
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface ContentSafetyPolicy {
    id: string;
    label: string;
    description: string;
    category: 'brand_safety' | 'copyright' | 'claims' | 'adult_sensitive' | 'political' | 'regulated' | 'synthetic_media' | 'platform_policy';
    severity: 'info' | 'warning' | 'blocker';
    isEnabled: boolean;
    userMessage: string;
}

export interface ContentUsageSnapshot {
    generatedThisMonth: number;
    failedJobs: number;
    averageGenerationTimeSeconds: number;
    topContentTypes: ContentTypeId[];
    pendingReviewPresets: number;
    updatedAt: string;
}

export interface ContentAuditLogEntry {
    id: string;
    action: 'preset_created' | 'preset_updated' | 'preset_published' | 'provider_routing_updated' | 'safety_policy_updated' | 'test_generation';
    actorId?: string;
    targetId?: string;
    targetType: 'preset' | 'provider_rule' | 'safety_policy' | 'job' | 'config';
    message: string;
    createdAt: string;
}

export interface ContentPreset {
    id: string;
    label: string;
    description: string;
    industry: string;
    contentType: ContentTypeId;
    format: ContentFormat;
    platforms: ContentPlatform[];
    promptBlocks: ContentPromptBlock[];
    styleSettings: Record<string, unknown>;
    exampleOutput?: string;
    status: ContentPresetStatus;
    visibility: ContentPresetVisibility;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface ContentFactoryAdminConfig {
    id: 'contentFactoryAdmin';
    presets: ContentPreset[];
    stylePresets: ContentStylePreset[];
    formatPresets: ContentFormatPreset[];
    templatePacks: ContentTemplatePack[];
    providerRouting: ContentProviderRoutingRule[];
    generationJobs: ContentGenerationJob[];
    usage: ContentUsageSnapshot;
    safetyPolicies: ContentSafetyPolicy[];
    auditLogs: ContentAuditLogEntry[];
    readiness: ContentReadiness;
    updatedAt: string;
    updatedBy?: string;
}
