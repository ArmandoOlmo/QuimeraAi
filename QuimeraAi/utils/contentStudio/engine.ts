import type { BusinessBlueprint, MediaBlueprint } from '../../types/businessBlueprint';
import type {
    ContentAsset,
    ContentCampaign,
    ContentEditableState,
    ContentFormat,
    ContentGenerationJob,
    ContentPlatform,
    ContentPromptBlock,
    ContentScene,
    ContentSourceMap,
    ContentTimeline,
    ContentTypeId,
} from '../../types/contentGeneration';
import type { ContentExportPackage } from '../../types/contentExports';
import type { ContentFactoryAdminConfig, ContentPreset } from '../../types/contentFactoryAdmin';
import type { ContentReadiness, ContentReadinessChecklist } from '../../types/contentReadiness';
import {
    CONTENT_STUDIO_BLUEPRINT_VERSION,
    CONTENT_STUDIO_SCHEMA_VERSION,
    getContentTypeDefinition,
} from './catalog';

export interface CreateContentCampaignInput {
    brief: string;
    title?: string;
    contentType: ContentTypeId;
    formats?: ContentFormat[];
    platforms?: ContentPlatform[];
    businessBlueprint?: BusinessBlueprint | null;
    preset?: ContentPreset | null;
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    createdBy?: string;
    now?: string;
}

export interface MergeMediaBlueprintInput {
    existing?: MediaBlueprint | null;
    campaign: ContentCampaign;
    businessBlueprint?: BusinessBlueprint | null;
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    userId?: string;
    allowProtectedOverwrite?: boolean;
    now?: string;
}

export interface RegenerateSceneInput {
    campaign: ContentCampaign;
    sceneId: string;
    userId?: string;
    allowProtectedOverwrite?: boolean;
    now?: string;
}

export interface RegenerateAssetInput {
    campaign: ContentCampaign;
    assetId: string;
    userId?: string;
    providerId?: string;
    now?: string;
}

export interface ContentExportContext {
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
    brandContext?: {
        businessName?: string;
        industry?: string;
        brandVoice?: string;
        colors?: Record<string, string>;
        fonts?: string[];
        logoUrl?: string;
        source?: string;
    };
}

const PUBLIC_PRESET_VISIBILITIES = new Set(['public', 'tenant_beta', 'marketplace']);

const generatedEditableState = (userId?: string, now?: string): ContentEditableState => ({
    generatedByAI: true,
    editedByUser: false,
    lastEditedAt: now,
    lastEditedBy: userId,
});

const manualEditableState = (userId?: string, now?: string): ContentEditableState => ({
    generatedByAI: false,
    editedByUser: true,
    lastEditedAt: now,
    lastEditedBy: userId,
});

export const createManualContentEditableState = manualEditableState;

const slugify = (value: string): string => (
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 56) || 'content'
);

const makeId = (prefix: string, seed: string, now: string, index = 0): string => (
    `${prefix}_${slugify(seed)}_${Date.parse(now) || Date.now()}_${index + 1}`
);

const createGenerationJob = (
    jobType: ContentGenerationJob['jobType'],
    input: Record<string, unknown>,
    options: {
        campaignId?: string;
        sceneId?: string;
        assetId?: string;
        providerId?: string;
        tenantId?: string;
        projectId?: string;
        createdBy?: string;
        now: string;
        status?: ContentGenerationJob['status'];
        id?: string;
    },
): ContentGenerationJob => ({
    id: options.id || makeId('job', `${jobType}-${options.sceneId || options.assetId || options.campaignId || 'content'}`, options.now),
    jobType,
    status: options.status || 'queued',
    campaignId: options.campaignId,
    sceneId: options.sceneId,
    assetId: options.assetId,
    providerId: options.providerId || 'quimera-orchestrator-placeholder',
    tenantId: options.tenantId,
    projectId: options.projectId,
    createdBy: options.createdBy,
    input,
    attempt: 1,
    createdAt: options.now,
    updatedAt: options.now,
});

const compact = (values: Array<string | undefined | null>): string[] => (
    values.map(value => (value || '').trim()).filter(Boolean)
);

export function getPublicContentPresets(config?: Partial<ContentFactoryAdminConfig> | null): ContentPreset[] {
    if (!Array.isArray(config?.presets)) return [];

    return config.presets
        .filter(preset => preset.status === 'published' && PUBLIC_PRESET_VISIBILITIES.has(preset.visibility))
        .map(preset => {
            const publicPreset = { ...preset };
            delete publicPreset.createdBy;
            return publicPreset;
        });
}

const getBrandName = (blueprint?: BusinessBlueprint | null): string => (
    blueprint?.businessProfile?.businessName || 'the brand'
);

const getIndustry = (blueprint?: BusinessBlueprint | null): string => (
    blueprint?.businessProfile?.industry || 'general business'
);

const getBrandSourceMap = (preset?: ContentPreset | null): ContentSourceMap => ({
    brief: 'contentStudio.brief',
    businessProfile: 'businessBlueprint.businessProfile',
    brandProfile: 'businessBlueprint.brandProfile',
    adminPreset: preset?.id,
});

const createPromptBlock = (
    role: ContentPromptBlock['role'],
    label: string,
    content: string,
    sourceMap: ContentSourceMap,
    userId?: string,
    now?: string,
): ContentPromptBlock => ({
    id: makeId(`prompt_${role}`, label, now || new Date().toISOString()),
    label,
    role,
    content,
    status: 'generated',
    sourceMap,
    editableState: generatedEditableState(userId, now),
});

const buildSceneTitles = (contentType: ContentTypeId): string[] => {
    if (contentType === 'website_asset_pack') return ['Hero visual', 'Feature support', 'Conversion close'];
    if (contentType === 'email_banner') return ['Inbox hook', 'Offer frame', 'Click driver'];
    if (contentType === 'product_promo') return ['Product reveal', 'Benefit proof', 'Purchase cue'];
    if (contentType === 'template_preview') return ['Template overview', 'Responsive proof', 'Admin detail'];
    return ['Hook', 'Value proof', 'Call to action'];
};

const buildSceneReadiness = (scene: Partial<ContentScene>): ContentReadiness => {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!scene.visualPrompt?.trim()) blockers.push('Storyboard scene is missing a visual prompt.');
    if (!scene.copyText?.trim() && !scene.captionText?.trim()) warnings.push('Scene has no copy or caption text.');
    if (scene.status !== 'approved') warnings.push('Generated content needs review.');

    return {
        isReady: blockers.length === 0 && warnings.length === 0,
        blockers,
        warnings,
        checklist: {
            briefComplete: true,
            brandApplied: true,
            storyboardApproved: scene.status === 'approved',
            assetsApproved: false,
            captionsReady: Boolean(scene.captionText?.trim()),
            exportFormatSelected: true,
            rightsConfirmed: false,
        },
    };
};

const createScene = (
    input: CreateContentCampaignInput,
    order: number,
    title: string,
    sourceMap: ContentSourceMap,
    now: string,
): ContentScene => {
    const brand = getBrandName(input.businessBlueprint);
    const industry = getIndustry(input.businessBlueprint);
    const format = (input.formats || getContentTypeDefinition(input.contentType).defaultFormats)[0] || '1:1';
    const purpose = order === 0
        ? `Capture attention for ${brand}.`
        : order === 1
            ? `Show practical proof for ${industry}.`
            : 'Move the viewer toward the next action.';
    const visualPrompt = [
        `${title} for ${brand}`,
        `industry: ${industry}`,
        `brief: ${input.brief}`,
        `format: ${format}`,
        'native Quimera content production style, brand-safe, polished, non-stock composition',
    ].join('. ');

    const scene: ContentScene = {
        id: makeId('scene', `${title}-${input.brief}`, now, order),
        order,
        title,
        purpose,
        duration: input.contentType === 'reel_short' ? 4 : undefined,
        format,
        visualPrompt,
        motionPrompt: input.contentType === 'reel_short' ? `Short vertical motion beat for ${title.toLowerCase()}.` : undefined,
        cameraDirection: order === 0 ? 'Clear opening frame with strong subject hierarchy.' : 'Keep the frame readable and brand-forward.',
        copyText: order === 0 ? input.brief.slice(0, 140) : `${brand} ${order === 1 ? 'proof point' : 'next step'}`,
        voiceoverText: input.contentType === 'reel_short' ? `${title}: ${purpose}` : undefined,
        captionText: `${title}: ${purpose}`,
        requiredAssets: [`asset-${order + 1}`],
        generatedAssets: [],
        status: 'needs_review',
        readiness: buildSceneReadiness({ visualPrompt, copyText: input.brief, captionText: purpose, status: 'needs_review' }),
        sourceMap: {
            ...sourceMap,
            generatedPrompt: `contentStudio.campaigns.scenes.${order}.visualPrompt`,
        },
        editableState: generatedEditableState(input.createdBy, now),
    };

    return scene;
};

const createAssetPlaceholder = (
    scene: ContentScene,
    input: CreateContentCampaignInput,
    now: string,
    campaignId?: string,
): ContentAsset => ({
    id: makeId('asset', `${scene.id}-${scene.title}`, now, scene.order),
    type: input.contentType === 'template_preview' ? 'template_preview' : input.contentType === 'product_promo' ? 'product_image' : 'image',
    prompt: scene.visualPrompt,
    negativePrompt: 'low quality, off-brand, unreadable text, unsafe claims, misleading results',
    provider: 'quimera-orchestrator-placeholder',
    jobId: makeId('job', `${campaignId || 'campaign'}-${scene.id}`, now, scene.order),
    format: scene.format,
    status: 'pending',
    version: 1,
    createdBy: input.createdBy,
    tenantId: input.tenantId,
    projectId: input.projectId,
    sourceMap: {
        ...scene.sourceMap,
        providerJob: makeId('job', `${campaignId || 'campaign'}-${scene.id}`, now, scene.order),
    },
    editableState: generatedEditableState(input.createdBy, now),
    createdAt: now,
});

const createTimeline = (campaignId: string, scenes: ContentScene[], now: string): ContentTimeline => {
    const defaultDuration = scenes.some(scene => scene.duration) ? undefined : 5;
    const layers = scenes.flatMap((scene, index) => {
        const duration = scene.duration || defaultDuration || 5;
        const start = scenes.slice(0, index).reduce((total, item) => total + (item.duration || defaultDuration || 5), 0);
        return [
            { id: `${scene.id}-visual`, sceneId: scene.id, type: 'image' as const, start, duration },
            { id: `${scene.id}-caption`, sceneId: scene.id, type: 'caption' as const, start, duration },
        ];
    });

    return {
        id: makeId('timeline', campaignId, now),
        duration: layers.reduce((max, layer) => Math.max(max, layer.start + layer.duration), 0),
        scenes: scenes.map(scene => scene.id),
        layers,
        version: 1,
    };
};

export function evaluateContentCampaignReadiness(campaign: ContentCampaign): ContentReadiness {
    const checklist: ContentReadinessChecklist = {
        briefComplete: Boolean(campaign.brief.trim()),
        brandApplied: campaign.sourceMap.brandProfile === 'businessBlueprint.brandProfile',
        storyboardApproved: campaign.scenes.length > 0 && campaign.scenes.every(scene => scene.status === 'approved'),
        assetsApproved: campaign.assets.length > 0 && campaign.assets.every(asset => asset.status === 'approved'),
        captionsReady: campaign.scenes.every(scene => Boolean(scene.captionText?.trim())),
        exportFormatSelected: campaign.formats.length > 0,
        rightsConfirmed: false,
    };

    const blockers = compact([
        checklist.briefComplete ? undefined : 'Brief is missing.',
        campaign.scenes.length ? undefined : 'Storyboard has no scenes.',
        checklist.exportFormatSelected ? undefined : 'Export format not selected.',
    ]);
    const warnings = compact([
        checklist.brandApplied ? undefined : 'Missing brand colors or brand profile.',
        checklist.storyboardApproved ? undefined : 'Generated storyboard needs review.',
        checklist.assetsApproved ? undefined : 'No approved assets.',
        checklist.captionsReady ? undefined : 'Captions are missing for one or more scenes.',
        campaign.contentType === 'product_promo' && !campaign.sourceMap.product ? 'Product data missing.' : undefined,
        (campaign.jobs || []).some(job => job.providerId === 'quimera-orchestrator-placeholder') ? 'Provider not connected.' : undefined,
        campaign.scriptBlocks.some(block => block.editableState.editedByUser && block.editableState.generatedByAI === false)
            || campaign.scenes.some(scene => scene.editableState.editedByUser && scene.editableState.generatedByAI === false)
            ? 'Prompt was edited after generation.'
            : undefined,
        checklist.rightsConfirmed ? undefined : 'Rights and usage have not been confirmed.',
    ]);

    return {
        isReady: blockers.length === 0 && warnings.length === 0,
        blockers,
        warnings,
        checklist,
    };
}

export function createContentCampaign(input: CreateContentCampaignInput): ContentCampaign {
    const now = input.now || new Date().toISOString();
    const definition = getContentTypeDefinition(input.contentType);
    const formats = input.formats?.length ? input.formats : definition.defaultFormats;
    const platforms = input.platforms?.length ? input.platforms : definition.supportedPlatforms.slice(0, 2);
    const title = input.title?.trim() || `${definition.label}: ${input.brief.slice(0, 42)}`;
    const sourceMap = getBrandSourceMap(input.preset);
    const campaignId = makeId('campaign', `${title}-${input.brief}`, now);
    const strategy = [
        `Goal: turn the brief into a ${definition.label.toLowerCase()} package for ${getBrandName(input.businessBlueprint)}.`,
        `Audience context comes from ${getIndustry(input.businessBlueprint)} business signals.`,
        `Use Quimera mediaBlueprint as the source of truth and keep manual edits protected.`,
    ].join('\n');
    const scriptBlocks = [
        createPromptBlock('strategy', 'Campaign strategy', strategy, sourceMap, input.createdBy, now),
        createPromptBlock('script', 'Copy / Script', `${title}\n\n${input.brief}\n\nCTA: Choose the next clear action.`, sourceMap, input.createdBy, now),
        createPromptBlock('safety', 'Safety review', 'Check brand safety, copyright risk, sensitive claims, synthetic media disclosure, and platform policy warnings.', sourceMap, input.createdBy, now),
    ];
    const scenes = buildSceneTitles(input.contentType).map((sceneTitle, index) => (
        createScene(input, index, sceneTitle, sourceMap, now)
    ));
    const assets = scenes.map(scene => createAssetPlaceholder(scene, input, now, campaignId));
    const jobs = assets.map((asset, index) => createGenerationJob('image', {
        prompt: asset.prompt,
        negativePrompt: asset.negativePrompt,
        format: asset.format,
        contentType: input.contentType,
    }, {
        campaignId,
        sceneId: scenes[index]?.id,
        assetId: asset.id,
        providerId: asset.provider,
        tenantId: input.tenantId,
        projectId: input.projectId,
        createdBy: input.createdBy,
        now,
        id: asset.jobId,
    }));
    const scenesWithAssets = scenes.map((scene, index) => ({
        ...scene,
        generatedAssets: [assets[index]],
    }));
    const campaign: ContentCampaign = {
        id: campaignId,
        title,
        brief: input.brief,
        contentType: input.contentType,
        platforms,
        formats,
        status: 'needs_review',
        strategy,
        scriptBlocks,
        scenes: scenesWithAssets,
        assets,
        jobs,
        timeline: createTimeline(campaignId, scenesWithAssets, now),
        readiness: {
            isReady: false,
            blockers: [],
            warnings: [],
            checklist: {
                briefComplete: true,
                brandApplied: true,
                storyboardApproved: false,
                assetsApproved: false,
                captionsReady: true,
                exportFormatSelected: true,
                rightsConfirmed: false,
            },
        },
        sourceMap,
        editableState: generatedEditableState(input.createdBy, now),
        createdAt: now,
        updatedAt: now,
    };

    return {
        ...campaign,
        readiness: evaluateContentCampaignReadiness(campaign),
    };
}

export function refreshContentCampaignReadiness(campaign: ContentCampaign, now = new Date().toISOString()): ContentCampaign {
    const scenes = campaign.scenes.map(scene => ({
        ...scene,
        readiness: buildSceneReadiness(scene),
    }));
    const nextCampaign = {
        ...campaign,
        scenes,
        timeline: createTimeline(campaign.id, scenes, now),
        updatedAt: now,
    };

    return {
        ...nextCampaign,
        readiness: evaluateContentCampaignReadiness(nextCampaign),
    };
}

export function updateContentCampaignScriptBlock(
    campaign: ContentCampaign,
    blockId: string,
    content: string,
    userId?: string,
    now = new Date().toISOString(),
): ContentCampaign {
    return refreshContentCampaignReadiness({
        ...campaign,
        scriptBlocks: campaign.scriptBlocks.map(block => block.id === blockId ? {
            ...block,
            content,
            status: 'needs_review',
            editableState: manualEditableState(userId, now),
        } : block),
        editableState: {
            ...campaign.editableState,
            editedByUser: true,
            lastEditedAt: now,
            lastEditedBy: userId,
        },
        status: 'needs_review',
        updatedAt: now,
    }, now);
}

export function regenerateContentScene(input: RegenerateSceneInput): ContentCampaign {
    const now = input.now || new Date().toISOString();
    const existingScene = input.campaign.scenes.find(scene => scene.id === input.sceneId);
    if (!existingScene) return input.campaign;
    if (
        !input.allowProtectedOverwrite &&
        (existingScene.status === 'approved' || existingScene.editableState.editedByUser || existingScene.editableState.lockedFromRegeneration)
    ) {
        return input.campaign;
    }

    const regeneratedScene: ContentScene = {
        ...existingScene,
        visualPrompt: `${existingScene.visualPrompt}\nVariation: regenerate this scene with a fresh composition while preserving the approved campaign direction.`,
        motionPrompt: existingScene.motionPrompt || `Add a clean motion beat for ${existingScene.title}.`,
        status: 'needs_review',
        sourceMap: {
            ...existingScene.sourceMap,
            generatedPrompt: `contentStudio.campaigns.${input.campaign.id}.scenes.${existingScene.order}.regeneratedVisualPrompt`,
        },
        editableState: generatedEditableState(input.userId, now),
    };
    const newAssetId = makeId('asset', `${input.campaign.id}-${existingScene.id}-scene-regeneration`, now, input.campaign.assets.length);
    const currentJobs = input.campaign.jobs || [];
    const newJobId = makeId('job', `${input.campaign.id}-${existingScene.id}-scene-regeneration`, now, currentJobs.length);
    const newAsset: ContentAsset = {
        id: newAssetId,
        type: input.campaign.contentType === 'template_preview' ? 'template_preview' : input.campaign.contentType === 'product_promo' ? 'product_image' : 'image',
        prompt: regeneratedScene.visualPrompt,
        negativePrompt: 'low quality, off-brand, unreadable text, unsafe claims, misleading results',
        provider: 'quimera-orchestrator-placeholder',
        jobId: newJobId,
        format: regeneratedScene.format,
        status: 'pending',
        version: Math.max(1, ...input.campaign.assets.filter(asset => asset.prompt === existingScene.visualPrompt).map(asset => asset.version)) + 1,
        createdBy: input.userId,
        tenantId: input.campaign.assets[0]?.tenantId,
        projectId: input.campaign.assets[0]?.projectId,
        sourceMap: {
            ...regeneratedScene.sourceMap,
            providerJob: newJobId,
        },
        editableState: generatedEditableState(input.userId, now),
        createdAt: now,
    };
    const newJob = createGenerationJob('image', {
        prompt: newAsset.prompt,
        negativePrompt: newAsset.negativePrompt,
        format: newAsset.format,
        regeneration: 'scene',
    }, {
        id: newJobId,
        campaignId: input.campaign.id,
        sceneId: regeneratedScene.id,
        assetId: newAsset.id,
        providerId: newAsset.provider,
        tenantId: newAsset.tenantId,
        projectId: newAsset.projectId,
        createdBy: input.userId,
        now,
    });
    const scenes = input.campaign.scenes.map(scene => scene.id === input.sceneId ? {
        ...regeneratedScene,
        requiredAssets: Array.from(new Set([...regeneratedScene.requiredAssets, newAsset.id])),
        generatedAssets: [...regeneratedScene.generatedAssets, newAsset],
    } : scene);

    return refreshContentCampaignReadiness({
        ...input.campaign,
        status: 'needs_review',
        scenes,
        assets: [...input.campaign.assets, newAsset],
        jobs: [...currentJobs, newJob],
        updatedAt: now,
    }, now);
}

export function regenerateContentAsset(input: RegenerateAssetInput): ContentCampaign {
    const now = input.now || new Date().toISOString();
    const existingAsset = input.campaign.assets.find(asset => asset.id === input.assetId);
    if (!existingAsset) return input.campaign;

    const newAssetId = makeId('asset', `${input.campaign.id}-${existingAsset.id}-asset-regeneration`, now, input.campaign.assets.length);
    const currentJobs = input.campaign.jobs || [];
    const newJobId = makeId('job', `${input.campaign.id}-${existingAsset.id}-asset-regeneration`, now, currentJobs.length);
    const newAsset: ContentAsset = {
        ...existingAsset,
        id: newAssetId,
        url: undefined,
        thumbnailUrl: undefined,
        provider: input.providerId || existingAsset.provider || 'quimera-orchestrator-placeholder',
        jobId: newJobId,
        status: 'pending',
        version: existingAsset.version + 1,
        createdBy: input.userId || existingAsset.createdBy,
        sourceMap: {
            ...existingAsset.sourceMap,
            providerJob: newJobId,
        },
        editableState: generatedEditableState(input.userId, now),
        createdAt: now,
    };
    const newJob = createGenerationJob(newAsset.type === 'video' ? 'video' : newAsset.type === 'audio' || newAsset.type === 'voiceover' ? 'audio' : 'image', {
        prompt: newAsset.prompt,
        negativePrompt: newAsset.negativePrompt,
        format: newAsset.format,
        regeneration: 'asset',
        previousAssetId: existingAsset.id,
    }, {
        id: newJobId,
        campaignId: input.campaign.id,
        assetId: newAsset.id,
        providerId: newAsset.provider,
        tenantId: newAsset.tenantId,
        projectId: newAsset.projectId,
        createdBy: input.userId,
        now,
    });

    return refreshContentCampaignReadiness({
        ...input.campaign,
        status: 'needs_review',
        assets: [...input.campaign.assets, newAsset],
        scenes: input.campaign.scenes.map(scene => scene.generatedAssets.some(asset => asset.id === existingAsset.id) ? {
            ...scene,
            requiredAssets: Array.from(new Set([...scene.requiredAssets, newAsset.id])),
            generatedAssets: [...scene.generatedAssets, newAsset],
            status: scene.status === 'approved' ? scene.status : 'needs_review',
        } : scene),
        jobs: [...currentJobs, newJob],
        updatedAt: now,
    }, now);
}

export function duplicateContentAsset(
    campaign: ContentCampaign,
    assetId: string,
    userId?: string,
    now = new Date().toISOString(),
): ContentCampaign {
    const existingAsset = campaign.assets.find(asset => asset.id === assetId);
    if (!existingAsset) return campaign;
    const duplicatedAsset: ContentAsset = {
        ...existingAsset,
        id: makeId('asset_copy', `${campaign.id}-${assetId}`, now, campaign.assets.length),
        status: 'pending',
        version: existingAsset.version + 1,
        createdBy: userId || existingAsset.createdBy,
        editableState: {
            ...existingAsset.editableState,
            editedByUser: true,
            lastEditedAt: now,
            lastEditedBy: userId,
        },
        createdAt: now,
    };

    return refreshContentCampaignReadiness({
        ...campaign,
        assets: [...campaign.assets, duplicatedAsset],
        updatedAt: now,
    }, now);
}

export function assignContentAssetToScene(
    campaign: ContentCampaign,
    assetId: string,
    sceneId: string,
    userId?: string,
    now = new Date().toISOString(),
): ContentCampaign {
    const asset = campaign.assets.find(item => item.id === assetId);
    if (!asset) return campaign;

    return refreshContentCampaignReadiness({
        ...campaign,
        scenes: campaign.scenes.map(scene => scene.id === sceneId ? {
            ...scene,
            requiredAssets: Array.from(new Set([...scene.requiredAssets, asset.id])),
            generatedAssets: scene.generatedAssets.some(item => item.id === asset.id)
                ? scene.generatedAssets
                : [...scene.generatedAssets, asset],
            editableState: {
                ...scene.editableState,
                editedByUser: true,
                lastEditedAt: now,
                lastEditedBy: userId,
            },
        } : scene),
        updatedAt: now,
    }, now);
}

export function reorderContentScenes(
    campaign: ContentCampaign,
    orderedSceneIds: string[],
    userId?: string,
    now = new Date().toISOString(),
): ContentCampaign {
    const sceneById = new Map(campaign.scenes.map(scene => [scene.id, scene]));
    const orderedScenes = orderedSceneIds
        .map(id => sceneById.get(id))
        .filter((scene): scene is ContentScene => Boolean(scene));
    const missingScenes = campaign.scenes.filter(scene => !orderedSceneIds.includes(scene.id));
    const scenes = [...orderedScenes, ...missingScenes].map((scene, index) => ({
        ...scene,
        order: index,
        editableState: {
            ...scene.editableState,
            editedByUser: true,
            lastEditedAt: now,
            lastEditedBy: userId,
        },
    }));

    return refreshContentCampaignReadiness({
        ...campaign,
        scenes,
        editableState: {
            ...campaign.editableState,
            editedByUser: true,
            lastEditedAt: now,
            lastEditedBy: userId,
        },
        updatedAt: now,
    }, now);
}

const moduleProtected = (value?: { metadata?: { userModified?: boolean; lockedFromRegeneration?: boolean }; editableState?: ContentEditableState } | null): boolean => (
    Boolean(value?.metadata?.userModified || value?.metadata?.lockedFromRegeneration || value?.editableState?.editedByUser || value?.editableState?.lockedFromRegeneration)
);

const campaignProtected = (campaign: ContentCampaign): boolean => (
    campaign.editableState.editedByUser ||
    campaign.editableState.lockedFromRegeneration === true ||
    campaign.scenes.some(scene => scene.status === 'approved' || scene.editableState.editedByUser || scene.editableState.lockedFromRegeneration)
);

export function mergeCampaignPreservingManualEdits(
    existingCampaign: ContentCampaign | undefined,
    generatedCampaign: ContentCampaign,
    allowProtectedOverwrite = false,
): ContentCampaign {
    if (!existingCampaign || allowProtectedOverwrite) return generatedCampaign;
    if (campaignProtected(existingCampaign)) return existingCampaign;

    const sceneById = new Map(existingCampaign.scenes.map(scene => [scene.id, scene]));
    const nextScenes = generatedCampaign.scenes.map(scene => {
        const existingScene = sceneById.get(scene.id);
        if (!existingScene) return scene;
        if (existingScene.status === 'approved' || existingScene.editableState.editedByUser || existingScene.editableState.lockedFromRegeneration) {
            return existingScene;
        }
        return scene;
    });

    return {
        ...generatedCampaign,
        scenes: nextScenes,
        assets: [
            ...existingCampaign.assets.filter(asset => asset.status === 'approved' || asset.editableState.editedByUser),
            ...generatedCampaign.assets,
        ],
        jobs: [
            ...(existingCampaign.jobs || []),
            ...(generatedCampaign.jobs || []).filter(job => !(existingCampaign.jobs || []).some(existingJob => existingJob.id === job.id)),
        ],
    };
}

export function mergeContentCampaignIntoMediaBlueprint(input: MergeMediaBlueprintInput): MediaBlueprint {
    const now = input.now || new Date().toISOString();
    const existing = input.existing;
    if (existing && moduleProtected(existing) && !input.allowProtectedOverwrite) {
        return existing;
    }

    const existingCampaign = existing?.campaigns?.find(campaign => campaign.id === input.campaign.id);
    const campaign = mergeCampaignPreservingManualEdits(existingCampaign, input.campaign, input.allowProtectedOverwrite);
    const campaigns = [
        ...(existing?.campaigns || []).filter(item => item.id !== campaign.id),
        campaign,
    ];
    const assets = [
        ...(existing?.assets || []).filter(asset => !campaign.assets.some(nextAsset => nextAsset.id === asset.id)),
        ...campaign.assets,
    ];
    const jobs = [
        ...(existing?.jobs || []).filter(job => !(campaign.jobs || []).some(nextJob => nextJob.id === job.id)),
        ...(campaign.jobs || []),
    ];
    const readiness = evaluateMediaBlueprintReadiness(campaigns, assets);

    return {
        ...(existing || {}),
        blueprintVersion: CONTENT_STUDIO_BLUEPRINT_VERSION,
        schemaVersion: CONTENT_STUDIO_SCHEMA_VERSION,
        projectId: input.projectId || existing?.projectId || input.businessBlueprint?.projectId,
        tenantId: input.tenantId || existing?.tenantId || input.businessBlueprint?.tenantId,
        workspaceId: input.workspaceId || existing?.workspaceId || input.businessBlueprint?.workspaceId,
        status: readiness.isReady ? 'configured' : 'needs_review',
        needsReview: !readiness.isReady,
        source: existing?.source || 'ai-studio',
        generatedAt: existing?.generatedAt || now,
        lastSyncedAt: now,
        enabled: true,
        publicStudioEnabled: true,
        adminFactoryEnabled: existing?.adminFactoryEnabled ?? false,
        brandContext: {
            businessName: input.businessBlueprint?.businessProfile?.businessName,
            industry: input.businessBlueprint?.businessProfile?.industry,
            brandVoice: input.businessBlueprint?.brandProfile?.visualStyle,
            colors: input.businessBlueprint?.brandProfile?.colors,
            fonts: input.businessBlueprint?.brandProfile?.fonts,
            logoUrl: input.businessBlueprint?.brandProfile?.logoUrl,
            source: 'businessBlueprint',
            ...(existing?.brandContext || {}),
        },
        defaultFormats: campaign.formats,
        defaultPlatforms: campaign.platforms,
        campaigns,
        assets,
        jobs,
        presets: existing?.presets || [],
        readiness,
        sourceMap: {
            ...(existing?.sourceMap || {}),
            businessProfile: 'businessBlueprint.businessProfile',
            brandProfile: 'businessBlueprint.brandProfile',
            brief: 'contentStudio.campaign.brief',
        },
        editableState: existing?.editableState || generatedEditableState(input.userId, now),
        metadata: {
            generatedBy: 'ai',
            userModified: false,
            generatedAt: existing?.metadata?.generatedAt || now,
            lastSyncedAt: now,
            ...(existing?.metadata || {}),
        },
        imageNeeds: Array.from(new Set([...(existing?.imageNeeds || []), ...campaign.assets.filter(asset => asset.type === 'image' || asset.type === 'product_image').map(asset => asset.id)])),
        videoNeeds: existing?.videoNeeds || [],
        brandAssetNeeds: existing?.brandAssetNeeds || [],
    };
}

export function evaluateMediaBlueprintReadiness(
    campaigns: ContentCampaign[],
    assets: ContentAsset[],
): ContentReadiness {
    const hasBrief = campaigns.some(campaign => campaign.brief.trim());
    const hasStoryboard = campaigns.some(campaign => campaign.scenes.length > 0);
    const allStoryboardApproved = campaigns.length > 0 && campaigns.every(campaign => campaign.scenes.every(scene => scene.status === 'approved'));
    const hasApprovedAsset = assets.some(asset => asset.status === 'approved');
    const captionsReady = campaigns.every(campaign => campaign.scenes.every(scene => Boolean(scene.captionText?.trim())));
    const hasFormat = campaigns.some(campaign => campaign.formats.length > 0);
    const checklist = {
        briefComplete: hasBrief,
        brandApplied: true,
        storyboardApproved: allStoryboardApproved,
        assetsApproved: hasApprovedAsset,
        captionsReady,
        exportFormatSelected: hasFormat,
        rightsConfirmed: false,
    };
    const blockers = compact([
        hasBrief ? undefined : 'Brief is missing.',
        hasStoryboard ? undefined : 'Storyboard has no scenes.',
        hasFormat ? undefined : 'Export format not selected.',
    ]);
    const warnings = compact([
        allStoryboardApproved ? undefined : 'Generated storyboard needs review.',
        hasApprovedAsset ? undefined : 'No approved assets.',
        captionsReady ? undefined : 'Captions are missing for one or more scenes.',
        'Rights and usage have not been confirmed.',
    ]);

    return {
        isReady: blockers.length === 0 && warnings.length === 0,
        blockers,
        warnings,
        checklist,
    };
}

export function createContentExportPackage(campaign: ContentCampaign, context: ContentExportContext = {}): ContentExportPackage {
    return {
        project: context.project,
        businessContext: context.businessContext,
        brandContext: context.brandContext,
        brief: campaign.brief,
        contentType: campaign.contentType,
        platforms: campaign.platforms,
        formats: campaign.formats,
        strategy: campaign.strategy,
        copy: campaign.scriptBlocks.filter(block => block.role === 'script').map(block => block.content),
        script: campaign.scriptBlocks.map(block => block.content),
        storyboard: campaign.scenes.map(scene => ({
            id: scene.id,
            title: scene.title,
            purpose: scene.purpose,
            visualPrompt: scene.visualPrompt,
            copyText: scene.copyText,
            captionText: scene.captionText,
            status: scene.status,
        })),
        scenePrompts: campaign.scenes.map(scene => scene.visualPrompt),
        assetPrompts: campaign.assets.map(asset => asset.prompt),
        assetReferences: campaign.assets.map(asset => ({
            id: asset.id,
            type: asset.type,
            status: asset.status,
            url: asset.url,
            prompt: asset.prompt,
        })),
        timeline: campaign.timeline,
        platformFormats: campaign.platforms.map(platform => ({
            platform,
            formats: campaign.formats,
        })),
        readiness: campaign.readiness,
        warnings: [...campaign.readiness.blockers, ...campaign.readiness.warnings],
        sourceMap: campaign.sourceMap,
        version: campaign.timeline.version,
        createdAt: campaign.createdAt,
    };
}

export function serializeContentExportPackage(campaign: ContentCampaign, context: ContentExportContext = {}): string {
    return JSON.stringify(createContentExportPackage(campaign, context), null, 2);
}

export function createDefaultContentFactoryAdminConfig(now = new Date().toISOString(), userId?: string): ContentFactoryAdminConfig {
    const promptBlock = createPromptBlock(
        'visual',
        'Brand-safe visual system',
        'Generate polished, brand-safe visual concepts with clear hierarchy, platform-aware composition, and no provider-specific dependency.',
        { adminPreset: 'default-content-factory-preset' },
        userId,
        now,
    );

    return {
        id: 'contentFactoryAdmin',
        presets: [{
            id: 'preset_general_campaign_pack',
            label: 'General Campaign Pack',
            description: 'Reusable campaign package for service businesses, ecommerce, and creators.',
            industry: 'all',
            contentType: 'campaign_pack',
            format: '9:16',
            platforms: ['instagram', 'facebook', 'website'],
            promptBlocks: [promptBlock],
            styleSettings: { qualityMode: 'balanced', visualDensity: 'medium' },
            exampleOutput: 'Strategy, script, storyboard, prompts, asset list, and export package.',
            status: 'admin_draft',
            visibility: 'internal',
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        }],
        stylePresets: [{
            id: 'style_clean_brand_editorial',
            label: 'Clean Brand Editorial',
            description: 'Quiet, polished, brand-forward visuals for websites, campaigns, and social.',
            styleSettings: { lighting: 'natural', composition: 'clear hierarchy', density: 'medium' },
            status: 'approved',
        }],
        formatPresets: [{
            id: 'format_multichannel_launch_pack',
            label: 'Multichannel Launch Pack',
            formats: ['9:16', '1:1', '4:5', 'email_banner'],
            platforms: ['instagram', 'facebook', 'email', 'website'],
            exportTypes: ['copy_package', 'json_package', 'prompts_package', 'asset_list', 'storyboard'],
        }],
        templatePacks: [{
            id: 'template_pack_campaign_previews',
            label: 'Campaign Preview Pack',
            description: 'Admin pack for marketplace/template previews and demo projects.',
            industry: 'all',
            contentTypes: ['template_preview', 'campaign_pack'],
            status: 'admin_draft',
            visibility: 'internal',
            presetIds: ['preset_general_campaign_pack'],
            createdAt: now,
            updatedAt: now,
        }],
        providerRouting: [{
            id: 'routing_quimera_default_image',
            label: 'Quimera visual orchestrator',
            capability: 'image',
            preferredProviderId: 'quimera-orchestrator-placeholder',
            fallbackProviderIds: [],
            qualityMode: 'balanced',
            isEnabled: true,
        }],
        generationJobs: [createGenerationJob('preset_test', {
            presetId: 'preset_general_campaign_pack',
            mode: 'readiness-smoke',
        }, {
            providerId: 'quimera-orchestrator-placeholder',
            createdBy: userId,
            now,
            status: 'queued',
        })],
        usage: {
            generatedThisMonth: 0,
            failedJobs: 0,
            averageGenerationTimeSeconds: 0,
            topContentTypes: ['campaign_pack', 'reel_short', 'website_asset_pack'],
            pendingReviewPresets: 1,
            updatedAt: now,
        },
        safetyPolicies: [
            {
                id: 'policy_brand_safety',
                label: 'Brand safety',
                description: 'Flag unsafe, off-brand, or reputation-risk content before export.',
                category: 'brand_safety',
                severity: 'warning',
                isEnabled: true,
                userMessage: 'Review brand-safety warnings before publishing.',
            },
            {
                id: 'policy_regulated_claims',
                label: 'Regulated claims',
                description: 'Mark medical, legal, financial, political, adult/sensitive, and regulated-product claims as needs review.',
                category: 'claims',
                severity: 'warning',
                isEnabled: true,
                userMessage: 'Generated copy may include regulated claims and needs review.',
            },
            {
                id: 'policy_synthetic_media',
                label: 'Synthetic media disclosure',
                description: 'Warn when a platform or format may require synthetic media disclosure.',
                category: 'synthetic_media',
                severity: 'info',
                isEnabled: true,
                userMessage: 'Confirm whether the selected platform requires AI disclosure.',
            },
        ],
        auditLogs: [{
            id: makeId('audit', 'default-content-factory-config', now),
            action: 'preset_created',
            actorId: userId,
            targetId: 'preset_general_campaign_pack',
            targetType: 'preset',
            message: 'Default Content Factory preset initialized.',
            createdAt: now,
        }],
        readiness: {
            isReady: false,
            blockers: [],
            warnings: ['Provider routing is configured as placeholder until production adapters are enabled.'],
            checklist: {
                briefComplete: true,
                brandApplied: true,
                storyboardApproved: false,
                assetsApproved: false,
                captionsReady: true,
                exportFormatSelected: true,
                rightsConfirmed: false,
            },
        },
        updatedAt: now,
        updatedBy: userId,
    };
}
