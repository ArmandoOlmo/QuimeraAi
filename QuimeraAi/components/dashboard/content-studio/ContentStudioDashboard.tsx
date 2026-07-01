import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Sparkles } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import ProjectSelectorPage from './ProjectSelectorPage';
import ContentStudioShell from '../../content-studio/ContentStudioShell';
import { useProject } from '../../../contexts/project';
import { useUI } from '../../../contexts/core/UIContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { supabase } from '../../../supabase';
import type { BusinessBlueprint, MediaBlueprint } from '../../../types/businessBlueprint';
import type { ContentFactoryAdminConfig, ContentPreset } from '../../../types/contentFactoryAdmin';
import type {
    ContentAssetStatus,
    ContentCampaign,
    ContentFlowStep,
    ContentFormat,
    ContentPlatform,
    ContentScene,
    ContentStatus,
    ContentTypeId,
} from '../../../types/contentGeneration';
import {
    createContentCampaign,
    createManualContentEditableState,
    assignContentAssetToScene,
    duplicateContentAsset,
    getPublicContentPresets,
    mergeContentCampaignIntoMediaBlueprint,
    refreshContentCampaignReadiness,
    regenerateContentAsset,
    regenerateContentScene,
    reorderContentScenes,
    serializeContentExportPackage,
    updateContentCampaignScriptBlock,
} from '../../../utils/contentStudio';

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveProjectBlueprint = (project: any): BusinessBlueprint | null => {
    const data = isRecord(project?.data) ? project.data : {};
    const nested = isRecord(data.data) ? data.data : {};
    return project?.businessBlueprint || data.businessBlueprint || nested.businessBlueprint || null;
};

const resolveMediaBlueprint = (project: any): MediaBlueprint | null => {
    const data = isRecord(project?.data) ? project.data : {};
    const nested = isRecord(data.data) ? data.data : {};
    return project?.businessBlueprint?.mediaBlueprint || data.businessBlueprint?.mediaBlueprint || nested.businessBlueprint?.mediaBlueprint || data.mediaBlueprint || nested.mediaBlueprint || null;
};

const markCampaignEdited = (campaign: ContentCampaign, userId?: string): ContentCampaign => ({
    ...campaign,
    editableState: {
        ...campaign.editableState,
        editedByUser: true,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: userId,
    },
    updatedAt: new Date().toISOString(),
});

const ContentStudioDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const { user } = useAuth();
    const {
        activeProject,
        activeProjectId,
        projects,
        isLoadingProjects,
        loadProject,
        updateProjectMediaBlueprint,
    } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId);
    const [activeStep, setActiveStep] = useState<ContentFlowStep>('brief');
    const [brief, setBrief] = useState('');
    const [contentType, setContentType] = useState<ContentTypeId>('campaign_pack');
    const [formats, setFormats] = useState<ContentFormat[]>(['9:16']);
    const [platforms, setPlatforms] = useState<ContentPlatform[]>(['instagram', 'website']);
    const [campaign, setCampaign] = useState<ContentCampaign | null>(null);
    const [mediaBlueprint, setMediaBlueprint] = useState<MediaBlueprint | null>(null);
    const [availablePresets, setAvailablePresets] = useState<ContentPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const lastSyncedProjectRef = useRef<string | null>(null);

    const selectableProjects = projects.filter(project => project.status !== 'Template');
    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(project => project.id === effectiveProjectId) || activeProject;
    const businessBlueprint = useMemo(() => resolveProjectBlueprint(effectiveProject), [effectiveProject]);
    const selectedPreset = useMemo(() => (
        availablePresets.find(preset => preset.id === selectedPresetId) || null
    ), [availablePresets, selectedPresetId]);

    useEffect(() => {
        if (activeProjectId) setSelectedProjectId(activeProjectId);
    }, [activeProjectId]);

    useEffect(() => {
        if (effectiveProjectId && !isLoadingProjects && lastSyncedProjectRef.current !== effectiveProjectId) {
            loadProject(effectiveProjectId, false, false);
            lastSyncedProjectRef.current = effectiveProjectId;
        }
    }, [effectiveProjectId, isLoadingProjects, loadProject]);

    useEffect(() => {
        let cancelled = false;
        const loadPublishedPresets = async () => {
            const { data, error } = await supabase
                .from('settings')
                .select('config')
                .eq('id', 'contentFactoryAdmin')
                .maybeSingle();

            if (cancelled) return;
            if (error) {
                console.warn('[ContentStudioDashboard] Could not load public Content Factory presets:', error);
                return;
            }

            const config = data?.config as Partial<ContentFactoryAdminConfig> | undefined;
            const published = getPublicContentPresets(config);
            setAvailablePresets(published);
            setSelectedPresetId(current => current && published.some(preset => preset.id === current) ? current : published[0]?.id || null);
        };

        loadPublishedPresets();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const nextMediaBlueprint = resolveMediaBlueprint(effectiveProject);
        setMediaBlueprint(nextMediaBlueprint);
        const latestCampaign = nextMediaBlueprint?.campaigns?.[nextMediaBlueprint.campaigns.length - 1] || null;
        if (latestCampaign) {
            setCampaign(latestCampaign);
            setBrief(latestCampaign.brief);
            setContentType(latestCampaign.contentType);
            setFormats(latestCampaign.formats);
            setPlatforms(latestCampaign.platforms);
        } else if (businessBlueprint) {
            setBrief(`Create a content campaign for ${businessBlueprint.businessProfile.businessName}: ${businessBlueprint.businessProfile.description || businessBlueprint.businessProfile.tagline || ''}`.trim());
        }
    }, [businessBlueprint, effectiveProject]);

    const handleProjectSelect = async (projectId: string) => {
        setSelectedProjectId(projectId);
        await loadProject(projectId, false, false);
    };

    const toggleFormat = (format: ContentFormat) => {
        setFormats(prev => prev.includes(format) ? prev.filter(item => item !== format) : [...prev, format]);
    };

    const togglePlatform = (platform: ContentPlatform) => {
        setPlatforms(prev => prev.includes(platform) ? prev.filter(item => item !== platform) : [...prev, platform]);
    };

    const generateCampaign = () => {
        if (!effectiveProjectId) return;
        const nextCampaign = createContentCampaign({
            brief,
            contentType,
            formats,
            platforms,
            businessBlueprint,
            preset: selectedPreset,
            projectId: effectiveProjectId,
            tenantId: effectiveProject?.tenantId,
            createdBy: user?.id,
        });
        const nextMediaBlueprint = mergeContentCampaignIntoMediaBlueprint({
            existing: mediaBlueprint,
            campaign: nextCampaign,
            businessBlueprint,
            projectId: effectiveProjectId,
            tenantId: effectiveProject?.tenantId,
            userId: user?.id,
        });
        const visibleCampaign = nextMediaBlueprint.campaigns.find(item => item.id === nextCampaign.id)
            || nextMediaBlueprint.campaigns[nextMediaBlueprint.campaigns.length - 1]
            || nextCampaign;

        setErrorMessage(null);
        setCampaign(visibleCampaign);
        setMediaBlueprint(nextMediaBlueprint);
        setActiveStep('storyboard');
    };

    const saveMediaBlueprint = async () => {
        if (!effectiveProjectId || !mediaBlueprint) return;
        setIsSaving(true);
        setErrorMessage(null);
        try {
            await updateProjectMediaBlueprint(effectiveProjectId, mediaBlueprint);
            setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (error) {
            console.error('[ContentStudioDashboard] Could not save mediaBlueprint:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Could not save Content Studio changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateCampaign = (updater: (current: ContentCampaign) => ContentCampaign) => {
        setCampaign(prev => {
            if (!prev) return prev;
            const next = refreshContentCampaignReadiness(updater(prev));
            setMediaBlueprint(current => current ? {
                ...current,
                campaigns: current.campaigns.map(item => item.id === next.id ? next : item),
                assets: [
                    ...current.assets.filter(asset => !next.assets.some(nextAsset => nextAsset.id === asset.id)),
                    ...next.assets,
                ],
                jobs: [
                    ...(current.jobs || []).filter(job => !(next.jobs || []).some(nextJob => nextJob.id === job.id)),
                    ...(next.jobs || []),
                ],
                readiness: next.readiness,
                needsReview: !next.readiness.isReady,
                lastSyncedAt: new Date().toISOString(),
            } : current);
            return next;
        });
    };

    const handleSceneChange = (sceneId: string, updates: Partial<ContentScene>) => {
        updateCampaign(current => markCampaignEdited({
            ...current,
            scenes: current.scenes.map(scene => scene.id === sceneId ? {
                ...scene,
                ...updates,
                editableState: createManualContentEditableState(user?.id, new Date().toISOString()),
            } : scene),
        }, user?.id));
    };

    const handleSceneStatusChange = (sceneId: string, status: ContentStatus) => {
        updateCampaign(current => markCampaignEdited({
            ...current,
            scenes: current.scenes.map(scene => scene.id === sceneId ? { ...scene, status } : scene),
        }, user?.id));
    };

    const handleScriptBlockChange = (blockId: string, content: string) => {
        updateCampaign(current => updateContentCampaignScriptBlock(current, blockId, content, user?.id));
    };

    const handleRegenerateScene = (sceneId: string) => {
        updateCampaign(current => regenerateContentScene({
            campaign: current,
            sceneId,
            userId: user?.id,
        }));
    };

    const handleAssetStatusChange = (assetId: string, status: ContentAssetStatus) => {
        updateCampaign(current => markCampaignEdited({
            ...current,
            assets: current.assets.map(asset => asset.id === assetId ? { ...asset, status } : asset),
            scenes: current.scenes.map(scene => ({
                ...scene,
                generatedAssets: scene.generatedAssets.map(asset => asset.id === assetId ? { ...asset, status } : asset),
            })),
        }, user?.id));
    };

    const handleRegenerateAsset = (assetId: string) => {
        updateCampaign(current => regenerateContentAsset({
            campaign: current,
            assetId,
            userId: user?.id,
        }));
    };

    const handleDuplicateAsset = (assetId: string) => {
        updateCampaign(current => duplicateContentAsset(current, assetId, user?.id));
    };

    const handleUseAssetInScene = (assetId: string, sceneId: string) => {
        updateCampaign(current => assignContentAssetToScene(current, assetId, sceneId, user?.id));
    };

    const handleReorderScenes = (orderedSceneIds: string[]) => {
        updateCampaign(current => reorderContentScenes(current, orderedSceneIds, user?.id));
    };

    const exportContext = {
        project: {
            projectId: effectiveProjectId || undefined,
            tenantId: effectiveProject?.tenantId,
            workspaceId: businessBlueprint?.workspaceId,
            name: effectiveProject?.name,
        },
        businessContext: {
            businessName: businessBlueprint?.businessProfile?.businessName,
            industry: businessBlueprint?.businessProfile?.industry,
            description: businessBlueprint?.businessProfile?.description,
        },
        brandContext: mediaBlueprint?.brandContext,
    };
    const exportText = campaign ? serializeContentExportPackage(campaign, exportContext) : '';

    if (!effectiveProjectId || selectableProjects.length === 0) {
        return (
            <ProjectSelectorPage
                onProjectSelect={handleProjectSelect}
                onBack={() => setView('dashboard')}
            />
        );
    }

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="lg:hidden flex h-12 items-center justify-between border-b border-q-border px-3">
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-q-text-secondary hover:bg-q-surface"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles size={16} className="text-q-accent" />
                        {t('contentStudio.title', 'Content Studio')}
                    </div>
                </div>
                <ContentStudioShell
                    mode="user"
                    title={`${t('contentStudio.title', 'Content Studio')} / ${campaign?.title || effectiveProject?.name || t('contentStudio.newCampaign', 'New campaign')}`}
                    subtitle={errorMessage || effectiveProject?.name}
                    statusLabel={campaign?.status ? campaign.status.replace(/_/g, ' ') : t('contentStudio.draft', 'Draft')}
                    autosaveLabel={lastSavedAt ? t('contentStudio.savedAt', { time: lastSavedAt, defaultValue: 'Saved {{time}}' }) : t('contentStudio.manualSave', 'Manual save')}
                    activeStep={activeStep}
                    onStepChange={setActiveStep}
                    brief={brief}
                    onBriefChange={setBrief}
                    contentType={contentType}
                    onContentTypeChange={setContentType}
                    formats={formats}
                    onToggleFormat={toggleFormat}
                    platforms={platforms}
                    onTogglePlatform={togglePlatform}
                    campaign={campaign}
                    availablePresets={availablePresets}
                    selectedContentPresetId={selectedPresetId}
                    onSelectContentPreset={setSelectedPresetId}
                    exportText={exportText}
                    isSaving={isSaving}
                    onGenerate={generateCampaign}
                    onRegenerate={generateCampaign}
                    onSaveVersion={saveMediaBlueprint}
                    onExport={() => setActiveStep('export')}
                    onBack={() => setView('dashboard')}
                    onScriptBlockChange={handleScriptBlockChange}
                    onSceneChange={handleSceneChange}
                    onSceneStatusChange={handleSceneStatusChange}
                    onRegenerateScene={handleRegenerateScene}
                    onAssetStatusChange={handleAssetStatusChange}
                    onRegenerateAsset={handleRegenerateAsset}
                    onDuplicateAsset={handleDuplicateAsset}
                    onUseAssetInScene={handleUseAssetInScene}
                    onReorderScenes={handleReorderScenes}
                />
            </div>
        </div>
    );
};

export default ContentStudioDashboard;
