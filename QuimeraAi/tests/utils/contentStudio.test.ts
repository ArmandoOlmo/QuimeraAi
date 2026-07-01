import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import {
    CONTENT_FORMATS,
    CONTENT_PLATFORMS,
    CONTENT_TYPE_DEFINITIONS,
    createContentProviderBridgeJob,
    createContentCampaign,
    createDefaultContentFactoryAdminConfig,
    createContentExportPackage,
    duplicateContentAsset,
    getPublicContentPresets,
    mergeContentCampaignIntoMediaBlueprint,
    quimeraPlaceholderProvider,
    regenerateContentAsset,
    regenerateContentScene,
    reorderContentScenes,
    resolveContentProviderBridge,
    serializeContentExportPackage,
} from '../../utils/contentStudio';

const businessBlueprint = {
    projectId: 'project_1',
    tenantId: 'tenant_1',
    businessProfile: {
        businessName: 'Quimera Demo Cafe',
        industry: 'restaurant',
        description: 'Fast casual restaurant with seasonal offers.',
    },
    brandProfile: {
        visualStyle: 'clean editorial food photography',
        colors: { primary: '#111111', accent: '#f97316' },
        fonts: ['Inter'],
        logoUrl: 'https://example.com/logo.png',
    },
} as unknown as BusinessBlueprint;

describe('contentStudio engine', () => {
    it('creates a campaign with strategy, storyboard, assets, timeline, and export package', () => {
        const campaign = createContentCampaign({
            brief: 'Launch a lunch promo with a bold offer and reusable social cuts.',
            contentType: 'campaign_pack',
            formats: ['9:16', '1:1'],
            platforms: ['instagram', 'website'],
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            createdBy: 'user_1',
            now: '2026-06-30T12:00:00.000Z',
        });

        expect(campaign.strategy).toContain('Quimera Demo Cafe');
        expect(campaign.scriptBlocks.length).toBeGreaterThanOrEqual(3);
        expect(campaign.scenes).toHaveLength(3);
        expect(campaign.assets).toHaveLength(3);
        expect(campaign.jobs).toHaveLength(3);
        expect(campaign.assets[0].jobId).toBe(campaign.jobs[0].id);
        expect(campaign.timeline.layers).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'image' }),
            expect.objectContaining({ type: 'caption' }),
        ]));
        expect(campaign.readiness.warnings).toEqual(expect.arrayContaining([
            'Generated storyboard needs review.',
            'No approved assets.',
        ]));

        const exported = JSON.parse(serializeContentExportPackage(campaign));
        expect(exported).toMatchObject({
            brief: campaign.brief,
            contentType: 'campaign_pack',
            platforms: ['instagram', 'website'],
            formats: ['9:16', '1:1'],
            strategy: campaign.strategy,
            sourceMap: expect.objectContaining({
                businessProfile: 'businessBlueprint.businessProfile',
                brandProfile: 'businessBlueprint.brandProfile',
            }),
            version: 1,
            createdAt: '2026-06-30T12:00:00.000Z',
        });
        expect(exported.project).toBeUndefined();
        expect(exported.businessContext).toBeUndefined();
        expect(exported.brandContext).toBeUndefined();
        expect(exported.storyboard).toHaveLength(3);
        expect(exported.assetPrompts).toHaveLength(3);
        expect(exported.warnings).toEqual(expect.arrayContaining([
            'Generated storyboard needs review.',
            'No approved assets.',
            'Provider not connected.',
        ]));

        const contextualExport = createContentExportPackage(campaign, {
            project: {
                projectId: 'project_1',
                tenantId: 'tenant_1',
                workspaceId: 'workspace_1',
                name: 'Demo project',
            },
            businessContext: {
                businessName: 'Quimera Demo Cafe',
                industry: 'restaurant',
                description: 'Fast casual restaurant with seasonal offers.',
            },
            brandContext: {
                businessName: 'Quimera Demo Cafe',
                colors: { primary: '#111111' },
                source: 'businessBlueprint',
            },
        });
        expect(contextualExport.project?.tenantId).toBe('tenant_1');
        expect(contextualExport.businessContext?.businessName).toBe('Quimera Demo Cafe');
        expect(contextualExport.brandContext?.colors?.primary).toBe('#111111');
    });

    it('merges campaigns into mediaBlueprint and preserves protected user edits', () => {
        const campaign = createContentCampaign({
            brief: 'Create a restaurant campaign pack.',
            contentType: 'campaign_pack',
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            createdBy: 'ai',
            now: '2026-06-30T12:00:00.000Z',
        });
        const initialBlueprint = mergeContentCampaignIntoMediaBlueprint({
            campaign,
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            userId: 'ai',
            now: '2026-06-30T12:01:00.000Z',
        });
        const protectedCampaign = {
            ...campaign,
            scenes: campaign.scenes.map((scene, index) => index === 0 ? {
                ...scene,
                title: 'Manual user scene',
                status: 'approved' as const,
                editableState: {
                    ...scene.editableState,
                    editedByUser: true,
                    lastEditedBy: 'user_1',
                },
            } : scene),
        };
        const generatedOverwrite = {
            ...campaign,
            scenes: campaign.scenes.map((scene, index) => index === 0 ? {
                ...scene,
                title: 'Generated overwrite attempt',
            } : scene),
        };

        const nextBlueprint = mergeContentCampaignIntoMediaBlueprint({
            existing: {
                ...initialBlueprint,
                campaigns: [protectedCampaign],
            },
            campaign: generatedOverwrite,
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            userId: 'ai',
            now: '2026-06-30T12:02:00.000Z',
        });

        expect(nextBlueprint.campaigns[0].scenes[0].title).toBe('Manual user scene');
        expect(nextBlueprint.needsReview).toBe(true);
        expect(nextBlueprint.brandContext?.businessName).toBe('Quimera Demo Cafe');
        expect(nextBlueprint.publicStudioEnabled).toBe(true);
        expect(nextBlueprint.sourceMap?.businessProfile).toBe('businessBlueprint.businessProfile');
        expect(nextBlueprint.jobs.length).toBeGreaterThanOrEqual(3);
    });

    it('supports the required V1 content type, format, and platform catalog', () => {
        expect(CONTENT_TYPE_DEFINITIONS.map(type => type.id)).toEqual(expect.arrayContaining([
            'social_post',
            'social_carousel',
            'reel_short',
            'ad_creative',
            'product_promo',
            'website_asset_pack',
            'email_banner',
            'blog_visual',
            'campaign_pack',
            'template_preview',
        ]));
        expect(CONTENT_FORMATS).toEqual(expect.arrayContaining(['1:1', '4:5', '9:16', '16:9', '3:2', 'website_hero', 'email_banner', 'story', 'carousel']));
        expect(CONTENT_PLATFORMS).toEqual(expect.arrayContaining(['instagram', 'tiktok', 'youtube_shorts', 'youtube', 'facebook', 'linkedin', 'google_ads', 'meta_ads', 'website', 'email', 'blog', 'storefront', 'template_marketplace']));
    });

    it('regenerates scenes and assets without deleting previous asset versions', () => {
        const campaign = createContentCampaign({
            brief: 'Create a reel for a new seasonal menu.',
            contentType: 'reel_short',
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            createdBy: 'user_1',
            now: '2026-06-30T12:00:00.000Z',
        });
        const originalAssetIds = campaign.assets.map(asset => asset.id);
        const regeneratedScene = regenerateContentScene({
            campaign,
            sceneId: campaign.scenes[1].id,
            userId: 'user_1',
            now: '2026-06-30T12:05:00.000Z',
        });

        expect(regeneratedScene.assets.length).toBe(campaign.assets.length + 1);
        expect(regeneratedScene.assets.map(asset => asset.id)).toEqual(expect.arrayContaining(originalAssetIds));
        expect(regeneratedScene.scenes[1].generatedAssets.length).toBe(campaign.scenes[1].generatedAssets.length + 1);
        expect(regeneratedScene.jobs.length).toBe(campaign.jobs.length + 1);

        const regeneratedAsset = regenerateContentAsset({
            campaign: regeneratedScene,
            assetId: campaign.assets[0].id,
            userId: 'user_1',
            now: '2026-06-30T12:06:00.000Z',
        });

        expect(regeneratedAsset.assets.find(asset => asset.id === campaign.assets[0].id)).toBeDefined();
        expect(regeneratedAsset.assets.length).toBe(regeneratedScene.assets.length + 1);
        expect(Math.max(...regeneratedAsset.assets.map(asset => asset.version))).toBeGreaterThan(1);

        const duplicated = duplicateContentAsset(regeneratedAsset, campaign.assets[0].id, 'user_1', '2026-06-30T12:07:00.000Z');
        expect(duplicated.assets.length).toBe(regeneratedAsset.assets.length + 1);
    });

    it('reorders storyboard scenes and rebuilds the basic timeline order', () => {
        const campaign = createContentCampaign({
            brief: 'Create a website asset pack.',
            contentType: 'website_asset_pack',
            businessBlueprint,
            projectId: 'project_1',
            tenantId: 'tenant_1',
            createdBy: 'user_1',
            now: '2026-06-30T12:00:00.000Z',
        });
        const reordered = reorderContentScenes(
            campaign,
            [campaign.scenes[2].id, campaign.scenes[0].id, campaign.scenes[1].id],
            'user_1',
            '2026-06-30T12:10:00.000Z',
        );

        expect(reordered.scenes.map(scene => scene.id)).toEqual([campaign.scenes[2].id, campaign.scenes[0].id, campaign.scenes[1].id]);
        expect(reordered.scenes.map(scene => scene.order)).toEqual([0, 1, 2]);
        expect(reordered.timeline.scenes).toEqual(reordered.scenes.map(scene => scene.id));
    });

    it('creates complete default Content Factory Admin contracts for presets, jobs, usage, safety, and audit', () => {
        const config = createDefaultContentFactoryAdminConfig('2026-06-30T12:00:00.000Z', 'admin_1');

        expect(config.presets[0]).toMatchObject({ status: 'admin_draft', visibility: 'internal' });
        expect(config.stylePresets.length).toBeGreaterThan(0);
        expect(config.formatPresets.length).toBeGreaterThan(0);
        expect(config.templatePacks.length).toBeGreaterThan(0);
        expect(config.providerRouting[0].preferredProviderId).toBe('quimera-orchestrator-placeholder');
        expect(config.generationJobs[0]).toMatchObject({ jobType: 'preset_test', status: 'queued' });
        expect(config.usage.topContentTypes).toContain('campaign_pack');
        expect(config.safetyPolicies.map(policy => policy.category)).toEqual(expect.arrayContaining(['brand_safety', 'claims', 'synthetic_media']));
        expect(config.auditLogs[0].action).toBe('preset_created');
    });

    it('filters published public presets without exposing admin actor metadata', () => {
        const config = createDefaultContentFactoryAdminConfig('2026-06-30T12:00:00.000Z', 'admin_1');
        const publicPreset = {
            ...config.presets[0],
            id: 'preset_public_campaign',
            status: 'published' as const,
            visibility: 'public' as const,
            createdBy: 'super_admin_1',
            publishedAt: '2026-06-30T12:30:00.000Z',
        };
        const internalPublishedPreset = {
            ...config.presets[0],
            id: 'preset_internal_only',
            status: 'published' as const,
            visibility: 'internal' as const,
        };

        const visiblePresets = getPublicContentPresets({
            ...config,
            presets: [config.presets[0], publicPreset, internalPublishedPreset],
        });

        expect(visiblePresets.map(preset => preset.id)).toEqual(['preset_public_campaign']);
        expect(visiblePresets[0].createdBy).toBeUndefined();
    });

    it('resolves Provider Bridge capability routing and queues mock jobs until real providers are enabled', async () => {
        const decision = resolveContentProviderBridge(
            { capability: 'image', qualityMode: 'balanced' },
            [{
                id: 'routing_test_image',
                label: 'Test image routing',
                capability: 'image',
                preferredProviderId: quimeraPlaceholderProvider.id,
                fallbackProviderIds: [],
                qualityMode: 'balanced',
                isEnabled: true,
            }],
        );

        expect(decision.provider.id).toBe(quimeraPlaceholderProvider.id);
        expect(decision.warnings).toEqual(expect.arrayContaining([
            'Provider not connected. Quimera placeholder bridge queued a mock job.',
        ]));

        const { job } = await createContentProviderBridgeJob({
            capability: 'image',
            campaignId: 'campaign_1',
            sceneId: 'scene_1',
            assetId: 'asset_1',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            createdBy: 'user_1',
            prompt: 'Create a brand-safe hero image.',
            format: '9:16',
            qualityMode: 'balanced',
        }, [{
            id: 'routing_test_image',
            label: 'Test image routing',
            capability: 'image',
            preferredProviderId: quimeraPlaceholderProvider.id,
            fallbackProviderIds: [],
            qualityMode: 'balanced',
            isEnabled: true,
        }]);

        expect(job).toMatchObject({
            jobType: 'image',
            status: 'queued',
            providerId: quimeraPlaceholderProvider.id,
            tenantId: 'tenant_1',
            projectId: 'project_1',
            input: expect.objectContaining({
                prompt: 'Create a brand-safe hero image.',
                bridgeMode: 'mock',
                capability: 'image',
            }),
        });
    });
});
