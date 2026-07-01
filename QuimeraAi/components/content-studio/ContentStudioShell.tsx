import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowUp,
    Archive,
    BadgeCheck,
    Boxes,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clipboard,
    ListChecks,
    Copy,
    Download,
    FileText,
    Film,
    Layers,
    Package,
    Play,
    Plus,
    RefreshCw,
    Save,
    Settings2,
    Sparkles,
    Wand2,
} from 'lucide-react';
import type {
    ContentAssetType,
    ContentAssetStatus,
    ContentCampaign,
    ContentFlowStep,
    ContentFormat,
    ContentPlatform,
    ContentScene,
    ContentStatus,
    ContentTypeId,
} from '../../types/contentGeneration';
import type { ContentFactoryAdminConfig, ContentPreset, ContentPresetStatus } from '../../types/contentFactoryAdmin';
import {
    CONTENT_FACTORY_ADMIN_FLOW,
    CONTENT_FORMATS,
    CONTENT_PLATFORMS,
    CONTENT_STUDIO_USER_FLOW,
    CONTENT_TYPE_DEFINITIONS,
} from '../../utils/contentStudio';
import { CollapsibleSection, CollapsiblePanelHeader } from '../ui/CollapsibleSection';

type StudioMode = 'user' | 'admin';
type CreativeStepState = 'empty' | 'generated' | 'needs_review' | 'approved' | 'warning' | 'failed';

interface ContentStudioShellProps {
    mode: StudioMode;
    title: string;
    subtitle?: string;
    statusLabel: string;
    autosaveLabel?: string;
    activeStep: ContentFlowStep;
    onStepChange: (step: ContentFlowStep) => void;
    brief: string;
    onBriefChange: (value: string) => void;
    contentType: ContentTypeId;
    onContentTypeChange: (value: ContentTypeId) => void;
    formats: ContentFormat[];
    onToggleFormat: (format: ContentFormat) => void;
    platforms: ContentPlatform[];
    onTogglePlatform: (platform: ContentPlatform) => void;
    campaign?: ContentCampaign | null;
    availablePresets?: ContentPreset[];
    selectedContentPresetId?: string | null;
    onSelectContentPreset?: (presetId: string | null) => void;
    exportText?: string;
    isSaving?: boolean;
    onGenerate: () => void;
    onRegenerate?: () => void;
    onSaveVersion?: () => void;
    onExport?: () => void;
    onPublish?: () => void;
    onBack?: () => void;
    onScriptBlockChange?: (blockId: string, content: string) => void;
    onSceneChange?: (sceneId: string, updates: Partial<ContentScene>) => void;
    onSceneStatusChange?: (sceneId: string, status: ContentStatus) => void;
    onRegenerateScene?: (sceneId: string) => void;
    onAssetStatusChange?: (assetId: string, status: ContentAssetStatus) => void;
    onRegenerateAsset?: (assetId: string) => void;
    onDuplicateAsset?: (assetId: string) => void;
    onUseAssetInScene?: (assetId: string, sceneId: string) => void;
    onReorderScenes?: (orderedSceneIds: string[]) => void;
    adminConfig?: ContentFactoryAdminConfig | null;
    selectedPresetId?: string | null;
    onSelectPreset?: (presetId: string) => void;
    onCreatePreset?: () => void;
    onUpdatePreset?: (presetId: string, updates: Partial<ContentPreset>) => void;
    onPresetStatusChange?: (presetId: string, status: ContentPresetStatus) => void;
    onSaveAdminConfig?: () => void;
}

const stepIcons: Partial<Record<ContentFlowStep, React.ReactNode>> = {
    brief: <FileText size={16} />,
    strategy: <Sparkles size={16} />,
    script: <Clipboard size={16} />,
    storyboard: <Layers size={16} />,
    assets: <Boxes size={16} />,
    timeline: <Film size={16} />,
    review: <CheckCircle2 size={16} />,
    export: <Download size={16} />,
    adminOverview: <CheckCircle2 size={16} />,
    globalPresets: <Settings2 size={16} />,
    presetConfig: <Settings2 size={16} />,
    promptBlocks: <Clipboard size={16} />,
    stylePacks: <Sparkles size={16} />,
    templatePacks: <Package size={16} />,
    providerRouting: <Wand2 size={16} />,
    generationJobs: <Play size={16} />,
    usage: <Boxes size={16} />,
    safetyPolicies: <AlertTriangle size={16} />,
    usageRules: <AlertTriangle size={16} />,
    publishing: <BadgeCheck size={16} />,
    audit: <Archive size={16} />,
    auditLogs: <Archive size={16} />,
};

const stepLabels: Record<ContentFlowStep, string> = {
    brief: 'Brief',
    strategy: 'Strategy',
    script: 'Script / Copy',
    storyboard: 'Storyboard',
    assets: 'Assets',
    timeline: 'Timeline',
    review: 'Review',
    export: 'Export',
    adminOverview: 'Overview',
    globalPresets: 'Global Presets',
    presetConfig: 'Preset Config',
    promptBlocks: 'Prompt Blocks',
    stylePacks: 'Style Packs',
    templatePacks: 'Template Packs',
    providerRouting: 'Provider Routing',
    generationJobs: 'Generation Jobs',
    usage: 'Usage',
    safetyPolicies: 'Safety Policies',
    usageRules: 'Usage Rules',
    publishing: 'Publishing',
    audit: 'Audit',
    auditLogs: 'Audit Logs',
};

const CONTENT_STUDIO_CREATIVE_FLOW: ContentFlowStep[] = [
    'brief',
    'script',
    'storyboard',
    'assets',
    'timeline',
    'review',
    'export',
];

const creativeCommandExamples = [
    {
        id: 'directions',
        label: 'Ideas',
        prompt: 'Create 3 premium visual directions for this campaign',
        icon: Sparkles,
    },
    {
        id: 'scene',
        label: 'Scene',
        prompt: 'Make this scene more cinematic',
        icon: Film,
    },
    {
        id: 'hook',
        label: 'Hook',
        prompt: 'Generate stronger hook variations',
        icon: Wand2,
    },
    {
        id: 'reel',
        label: 'Reel',
        prompt: 'Adapt this to Instagram Reel',
        icon: Play,
    },
    {
        id: 'assets',
        label: 'Assets',
        prompt: 'Create product-focused asset prompts',
        icon: Package,
    },
    {
        id: 'regen',
        label: 'Regen',
        prompt: 'Regenerate only selected scene',
        icon: RefreshCw,
    },
];

const statusClasses: Record<string, string> = {
    approved: 'bg-q-success/15 text-q-success border-q-success/30',
    published: 'bg-q-success/15 text-q-success border-q-success/30',
    exported: 'bg-q-success/15 text-q-success border-q-success/30',
    failed: 'bg-q-error/15 text-q-error border-q-error/30',
    needs_review: 'bg-q-accent/15 text-q-accent border-q-accent/30',
    generated: 'bg-q-accent/15 text-q-accent border-q-accent/30',
    draft: 'bg-q-surface-overlay/50 text-q-text-secondary border-q-border',
};

const stepStateClasses: Record<CreativeStepState, string> = {
    empty: 'bg-q-surface-overlay border-q-border',
    generated: 'bg-q-accent border-q-accent',
    needs_review: 'bg-q-accent border-q-accent',
    approved: 'bg-q-success border-q-success',
    warning: 'bg-q-warning border-q-warning',
    failed: 'bg-q-error border-q-error',
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const slugifyFileName = (value: string): string => (
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 64) || 'content-package'
);

const writeClipboard = (value: string) => {
    void navigator.clipboard?.writeText(value);
};

const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const buildPromptsText = (campaign: ContentCampaign): string => [
    '# Scene Prompts',
    ...campaign.scenes.map(scene => `Scene ${scene.order + 1}: ${scene.title}\n${scene.visualPrompt}`),
    '# Asset Prompts',
    ...campaign.assets.map(asset => `${formatLabel(asset.type)} v${asset.version}\n${asset.prompt}`),
].join('\n\n');

const buildScriptText = (campaign: ContentCampaign): string => campaign.scriptBlocks
    .map(block => `${block.label}\n${block.content}`)
    .join('\n\n');

const buildStoryboardText = (campaign: ContentCampaign): string => campaign.scenes
    .map(scene => [
        `Scene ${scene.order + 1}: ${scene.title}`,
        `Purpose: ${scene.purpose}`,
        `Prompt: ${scene.visualPrompt}`,
        `Copy: ${scene.captionText || scene.copyText || ''}`,
        `Status: ${formatLabel(scene.status)}`,
    ].join('\n'))
    .join('\n\n');

const Pill = ({ children, tone = 'draft' }: { children: React.ReactNode; tone?: string }) => (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses[tone] || statusClasses.draft}`}>
        {children}
    </span>
);

const IconButton = ({
    children,
    onClick,
    disabled,
    title,
    variant = 'secondary',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title: string;
    variant?: 'primary' | 'secondary';
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={[
            'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
            variant === 'primary'
                ? 'bg-q-accent text-q-text-on-accent hover:opacity-90'
                : 'border border-q-border bg-q-surface text-q-text hover:border-q-accent/40 hover:bg-q-surface-elevated',
        ].join(' ')}
    >
        {children}
    </button>
);

const ToggleChip = ({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${active
            ? 'border-q-accent/50 bg-q-accent/15 text-q-accent'
            : 'border-q-border bg-q-surface text-q-text-secondary hover:text-q-text'
            }`}
    >
        {label}
    </button>
);

const ReadinessList = ({ campaign }: { campaign?: ContentCampaign | null }) => {
    const readiness = campaign?.readiness;
    if (!readiness) {
        return <p className="text-sm text-q-text-muted">Generate a content project to see readiness.</p>;
    }
    const checklist = {
        ...readiness.checklist,
        providerConnected: !readiness.warnings.some(item => item.toLowerCase().includes('provider not connected')),
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(checklist).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border border-q-border bg-q-bg px-2 py-1.5">
                        <span className="truncate text-q-text-secondary">{formatLabel(key)}</span>
                        {value ? <CheckCircle2 size={14} className="text-q-success" /> : <AlertTriangle size={14} className="text-q-accent" />}
                    </div>
                ))}
            </div>
            {[...readiness.blockers, ...readiness.warnings].length > 0 && (
                <div className="space-y-2">
                    {readiness.blockers.map(item => (
                        <p key={item} className="rounded-md border border-q-error/30 bg-q-error/10 px-3 py-2 text-xs text-q-error">{item}</p>
                    ))}
                    {readiness.warnings.map(item => (
                        <p key={item} className="rounded-md border border-q-accent/30 bg-q-accent/10 px-3 py-2 text-xs text-q-accent">{item}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

const SceneCard = ({
    scene,
    onSceneChange,
    onSceneStatusChange,
    onRegenerateScene,
}: {
    scene: ContentScene;
    onSceneChange?: (sceneId: string, updates: Partial<ContentScene>) => void;
    onSceneStatusChange?: (sceneId: string, status: ContentStatus) => void;
    onRegenerateScene?: (sceneId: string) => void;
}) => (
    <article className="rounded-lg border border-q-border bg-q-surface p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-q-text-muted">Scene {scene.order + 1}</p>
                <input
                    value={scene.title}
                    onChange={event => onSceneChange?.(scene.id, { title: event.target.value })}
                    className="mt-1 w-full bg-transparent text-base font-semibold text-q-text outline-none focus:text-q-accent"
                />
            </div>
            <Pill tone={scene.status}>{formatLabel(scene.status)}</Pill>
        </div>
        <label className="block text-xs font-semibold uppercase text-q-text-muted">Purpose</label>
        <textarea
            value={scene.purpose}
            onChange={event => onSceneChange?.(scene.id, { purpose: event.target.value })}
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
        />
        <label className="mt-3 block text-xs font-semibold uppercase text-q-text-muted">Visual prompt</label>
        <textarea
            value={scene.visualPrompt}
            onChange={event => onSceneChange?.(scene.id, { visualPrompt: event.target.value })}
            rows={4}
            className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
        />
        <label className="mt-3 block text-xs font-semibold uppercase text-q-text-muted">Copy / caption</label>
        <textarea
            value={scene.captionText || scene.copyText || ''}
            onChange={event => onSceneChange?.(scene.id, { captionText: event.target.value, copyText: event.target.value })}
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
        />
        <div className="mt-3 flex flex-wrap gap-2">
            <button
                type="button"
                onClick={() => onSceneStatusChange?.(scene.id, 'approved')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-q-success/30 px-2.5 text-xs font-semibold text-q-success hover:bg-q-success/10"
            >
                <CheckCircle2 size={14} /> Approve
            </button>
            <button
                type="button"
                onClick={() => onSceneStatusChange?.(scene.id, 'needs_review')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-q-border px-2.5 text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated"
            >
                <RefreshCw size={14} /> Needs review
            </button>
            <button
                type="button"
                onClick={() => onRegenerateScene?.(scene.id)}
                disabled={scene.status === 'approved' || scene.editableState.lockedFromRegeneration}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-q-border px-2.5 text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated disabled:cursor-not-allowed disabled:opacity-45"
            >
                <Wand2 size={14} /> Regenerate
            </button>
        </div>
    </article>
);

const CreativeSceneCard = ({
    scene,
    isSelected,
    onSelect,
    onSceneChange,
    onSceneStatusChange,
    onRegenerateScene,
}: {
    scene: ContentScene;
    isSelected: boolean;
    onSelect: () => void;
    onSceneChange?: (sceneId: string, updates: Partial<ContentScene>) => void;
    onSceneStatusChange?: (sceneId: string, status: ContentStatus) => void;
    onRegenerateScene?: (sceneId: string) => void;
}) => (
    <article
        className={`overflow-hidden rounded-xl border bg-q-surface/85 transition-colors ${isSelected ? 'border-q-accent shadow-[var(--shadow-card)]' : 'border-q-border hover:border-q-border-strong'}`}
    >
        <button
            type="button"
            onClick={onSelect}
            className="relative flex aspect-[4/5] w-full items-end overflow-hidden bg-q-bg text-left"
        >
            <div className="absolute inset-0 quimera-content-studio-preview-grid" />
            <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-md border border-q-border bg-q-surface/90 px-2 py-1 text-[10px] font-semibold uppercase text-q-text-secondary">
                    Scene {String(scene.order + 1).padStart(2, '0')}
                </span>
                <Pill tone={scene.status}>{formatLabel(scene.status)}</Pill>
            </div>
            <div className="relative w-full border-t border-q-border bg-q-surface/90 p-3 backdrop-blur">
                <p className="truncate text-sm font-semibold text-q-text">{scene.title}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-q-text-muted">
                    <span>{scene.duration || 5}s</span>
                    <span>·</span>
                    <span>{scene.format}</span>
                    <span>·</span>
                    <span>{scene.generatedAssets.length} variations</span>
                </div>
            </div>
        </button>
        <div className="space-y-3 p-3">
            <label className="block">
                <span className="text-[10px] font-semibold uppercase text-q-text-muted">Scene title</span>
                <input
                    value={scene.title}
                    onChange={event => onSceneChange?.(scene.id, { title: event.target.value })}
                    className="mt-1 w-full rounded-md border border-q-border bg-q-bg/70 px-3 py-2 text-sm font-semibold text-q-text outline-none focus:border-q-accent"
                />
            </label>
            <label className="block">
                <span className="text-[10px] font-semibold uppercase text-q-text-muted">Visual direction</span>
                <textarea
                    value={scene.visualPrompt}
                    onChange={event => onSceneChange?.(scene.id, { visualPrompt: event.target.value })}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg/70 px-3 py-2 text-xs leading-5 text-q-text outline-none focus:border-q-accent"
                />
            </label>
            <label className="block">
                <span className="text-[10px] font-semibold uppercase text-q-text-muted">Caption / copy</span>
                <textarea
                    value={scene.captionText || scene.copyText || ''}
                    onChange={event => onSceneChange?.(scene.id, { captionText: event.target.value, copyText: event.target.value })}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg/70 px-3 py-2 text-xs leading-5 text-q-text outline-none focus:border-q-accent"
                />
            </label>
            <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onSceneStatusChange?.(scene.id, 'approved')} className="rounded-md border border-q-success/40 px-2 py-1.5 text-[11px] font-semibold text-q-success hover:bg-q-success/10">Approve</button>
                <button type="button" onClick={() => onRegenerateScene?.(scene.id)} disabled={scene.status === 'approved' || scene.editableState.lockedFromRegeneration} className="rounded-md border border-q-border px-2 py-1.5 text-[11px] font-semibold text-q-text-secondary hover:bg-q-surface-elevated disabled:cursor-not-allowed disabled:opacity-45">Regen</button>
                <button type="button" onClick={() => onSceneStatusChange?.(scene.id, 'needs_review')} className="rounded-md border border-q-border px-2 py-1.5 text-[11px] font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Review</button>
            </div>
        </div>
    </article>
);

const EmptyCanvas = ({ title, body }: { title: string; body: string }) => (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-q-border bg-q-surface/50 p-8 text-center">
        <div className="max-w-sm">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-q-accent" />
            <h3 className="text-base font-semibold text-q-text">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-q-text-muted">{body}</p>
        </div>
    </div>
);

const AdminPresetEditor = ({
    config,
    selectedPresetId,
    onSelectPreset,
    onCreatePreset,
    onUpdatePreset,
    onPresetStatusChange,
}: {
    config?: ContentFactoryAdminConfig;
    selectedPresetId?: string | null;
    onSelectPreset?: (presetId: string) => void;
    onCreatePreset?: () => void;
    onUpdatePreset?: (presetId: string, updates: Partial<ContentPreset>) => void;
    onPresetStatusChange?: (presetId: string, status: ContentPresetStatus) => void;
}) => {
    const selected = config?.presets.find(preset => preset.id === selectedPresetId) || config?.presets[0];

    return (
        <div className="grid h-full gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto rounded-lg border border-q-border bg-q-surface p-3">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-q-text">Global presets</h3>
                    <button type="button" onClick={onCreatePreset} className="rounded-md bg-q-accent px-2 py-1 text-xs font-semibold text-q-text-on-accent">New</button>
                </div>
                <div className="space-y-2">
                    {(config?.presets || []).map(preset => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onSelectPreset?.(preset.id)}
                            className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${preset.id === selected?.id ? 'border-q-accent bg-q-accent/10' : 'border-q-border bg-q-bg hover:border-q-accent/40'}`}
                        >
                            <p className="truncate text-sm font-semibold text-q-text">{preset.label}</p>
                            <p className="truncate text-xs text-q-text-muted">{formatLabel(preset.status)} - {preset.industry}</p>
                        </button>
                    ))}
                </div>
            </aside>
            <section className="min-h-0 overflow-y-auto rounded-lg border border-q-border bg-q-surface p-4">
                {selected ? (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-q-text-muted">Label</span>
                                <input
                                    value={selected.label}
                                    onChange={event => onUpdatePreset?.(selected.id, { label: event.target.value })}
                                    className="mt-1 h-10 w-full rounded-md border border-q-border bg-q-bg px-3 text-sm text-q-text outline-none focus:border-q-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-q-text-muted">Industry</span>
                                <input
                                    value={selected.industry}
                                    onChange={event => onUpdatePreset?.(selected.id, { industry: event.target.value })}
                                    className="mt-1 h-10 w-full rounded-md border border-q-border bg-q-bg px-3 text-sm text-q-text outline-none focus:border-q-accent"
                                />
                            </label>
                        </div>
                        <label className="block">
                            <span className="text-xs font-semibold uppercase text-q-text-muted">Description</span>
                            <textarea
                                value={selected.description}
                                onChange={event => onUpdatePreset?.(selected.id, { description: event.target.value })}
                                rows={3}
                                className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {(['admin_draft', 'testing', 'approved', 'published', 'disabled', 'archived'] as ContentPresetStatus[]).map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => onPresetStatusChange?.(selected.id, status)}
                                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${selected.status === status ? 'border-q-accent bg-q-accent/15 text-q-accent' : 'border-q-border text-q-text-secondary hover:text-q-text'}`}
                                >
                                    {formatLabel(status)}
                                </button>
                            ))}
                        </div>
                        <div className="rounded-md border border-q-border bg-q-bg p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase text-q-text-muted">Prompt blocks</p>
                                <button
                                    type="button"
                                    onClick={() => onUpdatePreset?.(selected.id, {
                                        promptBlocks: [
                                            ...selected.promptBlocks,
                                            {
                                                id: `prompt_visual_${Date.now()}`,
                                                label: 'New prompt block',
                                                role: 'visual',
                                                content: 'Describe the reusable visual instruction for this preset.',
                                                status: 'draft',
                                                sourceMap: { adminPreset: selected.id },
                                                editableState: { generatedByAI: false, editedByUser: true },
                                            },
                                        ],
                                    })}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-q-border px-2 text-xs font-semibold text-q-text-secondary hover:bg-q-surface"
                                >
                                    <Plus size={13} /> Add
                                </button>
                            </div>
                            {selected.promptBlocks.map(block => (
                                <div key={block.id} className="mb-2 rounded-md border border-q-border bg-q-surface p-3">
                                    <input
                                        value={block.label}
                                        onChange={event => onUpdatePreset?.(selected.id, {
                                            promptBlocks: selected.promptBlocks.map(item => item.id === block.id ? { ...item, label: event.target.value } : item),
                                        })}
                                        className="w-full bg-transparent text-sm font-semibold text-q-text outline-none focus:text-q-accent"
                                    />
                                    <textarea
                                        value={block.content}
                                        onChange={event => onUpdatePreset?.(selected.id, {
                                            promptBlocks: selected.promptBlocks.map(item => item.id === block.id ? {
                                                ...item,
                                                content: event.target.value,
                                                status: 'needs_review',
                                                editableState: { ...item.editableState, editedByUser: true, generatedByAI: false },
                                            } : item),
                                        })}
                                        rows={4}
                                        className="mt-2 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-xs leading-5 text-q-text outline-none focus:border-q-accent"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <EmptyCanvas title="No presets yet" body="Create a global preset to start the Content Factory Admin workflow." />
                )}
            </section>
        </div>
    );
};

export const ContentStudioShell: React.FC<ContentStudioShellProps> = ({
    mode,
    title,
    subtitle,
    statusLabel,
    autosaveLabel,
    activeStep,
    onStepChange,
    brief,
    onBriefChange,
    contentType,
    onContentTypeChange,
    formats,
    onToggleFormat,
    platforms,
    onTogglePlatform,
    campaign,
    availablePresets = [],
    selectedContentPresetId,
    onSelectContentPreset,
    exportText,
    isSaving,
    onGenerate,
    onRegenerate,
    onSaveVersion,
    onExport,
    onPublish,
    onBack,
    onScriptBlockChange,
    onSceneChange,
    onSceneStatusChange,
    onRegenerateScene,
    onAssetStatusChange,
    onRegenerateAsset,
    onDuplicateAsset,
    onUseAssetInScene,
    onReorderScenes,
    adminConfig,
    selectedPresetId,
    onSelectPreset,
    onCreatePreset,
    onUpdatePreset,
    onPresetStatusChange,
    onSaveAdminConfig,
}) => {
    const flow = mode === 'admin' ? [...CONTENT_STUDIO_USER_FLOW, ...CONTENT_FACTORY_ADMIN_FLOW] : CONTENT_STUDIO_USER_FLOW;
    const [assetTypeFilter, setAssetTypeFilter] = useState<'all' | ContentAssetType>('all');
    const [assetStatusFilter, setAssetStatusFilter] = useState<'all' | ContentAssetStatus>('all');
    const [selectedTimelineSceneId, setSelectedTimelineSceneId] = useState<string | null>(null);
    const [dragSceneId, setDragSceneId] = useState<string | null>(null);
    const [isRailCollapsed, setIsRailCollapsed] = useState(false);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [composerPrompt, setComposerPrompt] = useState('');
    const [creativeMode, setCreativeMode] = useState<'creative' | 'quality' | 'fast'>('quality');
    const [brandStrictness, setBrandStrictness] = useState(74);
    const [referenceStrength, setReferenceStrength] = useState(58);
    const [variationCount, setVariationCount] = useState(3);
    const [openInspectorSections, setOpenInspectorSections] = useState<Record<string, boolean>>({
        creative: true,
        package: true,
        scene: true,
        readiness: true,
    });
    const toggleInspectorSection = (key: string) =>
        setOpenInspectorSections(prev => ({ ...prev, [key]: !prev[key] }));
    const selectedTimelineScene = campaign?.scenes.find(scene => scene.id === selectedTimelineSceneId) || campaign?.scenes[0] || null;
    const selectedScene = campaign?.scenes.find(scene => scene.id === selectedSceneId)
        || selectedTimelineScene
        || campaign?.scenes[0]
        || null;
    const selectedContentPreset = availablePresets.find(preset => preset.id === selectedContentPresetId) || null;
    const filteredAssets = useMemo(() => {
        const assets = campaign?.assets || [];
        return assets.filter(asset => (
            (assetTypeFilter === 'all' || asset.type === assetTypeFilter) &&
            (assetStatusFilter === 'all' || asset.status === assetStatusFilter)
        ));
    }, [assetStatusFilter, assetTypeFilter, campaign?.assets]);
    const assetTypes = useMemo(() => Array.from(new Set((campaign?.assets || []).map(asset => asset.type))), [campaign?.assets]);
    const creativeGridClass = isRailCollapsed
        ? 'lg:grid-cols-[72px_minmax(0,1fr)_340px]'
        : 'lg:grid-cols-[220px_minmax(0,1fr)_340px]';
    const creativeStatus = campaign?.jobs?.some(job => job.status === 'running' || job.status === 'queued')
        ? 'Jobs queued'
        : campaign
            ? `${campaign.scenes.length} scenes / ${campaign.assets.length} assets`
            : 'Ready for brief';
    const activeComposerCommandId = creativeCommandExamples.find(command => command.prompt === composerPrompt)?.id || null;
    const getCreativeStepState = (step: ContentFlowStep): CreativeStepState => {
        if (!campaign) return step === 'brief' && brief.trim() ? 'generated' : 'empty';
        if (campaign.readiness.blockers.length > 0 && (step === 'review' || step === 'export')) return 'warning';
        if (step === 'brief') return campaign.brief.trim() ? 'generated' : 'empty';
        if (step === 'script') return campaign.scriptBlocks.length > 0 ? 'generated' : 'empty';
        if (step === 'storyboard') {
            if (campaign.scenes.some(scene => scene.status === 'failed')) return 'failed';
            if (campaign.scenes.length && campaign.scenes.every(scene => scene.status === 'approved')) return 'approved';
            return campaign.scenes.length ? 'needs_review' : 'empty';
        }
        if (step === 'assets') {
            if (campaign.assets.some(asset => asset.status === 'failed')) return 'failed';
            if (campaign.assets.length && campaign.assets.every(asset => asset.status === 'approved')) return 'approved';
            return campaign.assets.length ? 'needs_review' : 'empty';
        }
        if (step === 'timeline') return campaign.timeline.layers.length > 0 ? 'generated' : 'empty';
        if (step === 'review') return campaign.readiness.isReady ? 'approved' : 'warning';
        if (step === 'export') return campaign.status === 'exported' ? 'approved' : 'generated';
        return 'empty';
    };
    const reorderTimeline = (sourceSceneId: string, targetSceneId: string) => {
        if (!campaign || sourceSceneId === targetSceneId) return;
        const ids = campaign.scenes.map(scene => scene.id);
        const from = ids.indexOf(sourceSceneId);
        const to = ids.indexOf(targetSceneId);
        if (from < 0 || to < 0) return;
        const next = [...ids];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorderScenes?.(next);
    };
    const handleComposerAction = () => {
        if (selectedScene && (activeStep === 'storyboard' || activeStep === 'timeline' || composerPrompt.toLowerCase().includes('scene'))) {
            onRegenerateScene?.(selectedScene.id);
            return;
        }
        onGenerate();
    };

    const renderCreativeRail = () => (
        <aside className="hidden min-h-0 border-r border-q-border bg-q-surface/45 p-2 lg:block">
            <div className="mb-2 flex items-center justify-between">
                {!isRailCollapsed && <p className="px-2 text-[10px] font-semibold uppercase text-q-text-muted">Production</p>}
                <button
                    type="button"
                    onClick={() => setIsRailCollapsed(value => !value)}
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-q-border bg-q-surface text-q-text-secondary hover:text-q-text"
                    title={isRailCollapsed ? 'Expand flow rail' : 'Collapse flow rail'}
                >
                    {isRailCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                </button>
            </div>
            <nav className="space-y-1">
                {CONTENT_STUDIO_CREATIVE_FLOW.map(step => {
                    const state = getCreativeStepState(step);
                    return (
                        <button
                            key={step}
                            type="button"
                            title={stepLabels[step]}
                            onClick={() => onStepChange(step)}
                            className={`group flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition-colors ${activeStep === step
                                ? 'border-q-accent bg-q-accent/15 text-q-accent'
                                : 'border-transparent text-q-text-secondary hover:border-q-border hover:bg-q-surface hover:text-q-text'
                                }`}
                        >
                            <span className={`h-2.5 w-2.5 rounded-full border ${stepStateClasses[state]}`} />
                            <span className="flex h-7 w-7 items-center justify-center text-q-text-secondary group-hover:text-q-text">{stepIcons[step]}</span>
                            {!isRailCollapsed && (
                                <span className="min-w-0 flex-1 truncate">{stepLabels[step]}</span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );

    const renderCreativeCanvas = () => {
        if (activeStep === 'brief') {
            return (
                <div className="mx-auto grid max-w-7xl gap-4">
                    <section className="min-h-[520px] rounded-xl border border-q-border bg-q-surface/75 p-4 md:p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-q-text-muted">Brief Canvas</p>
                                <h2 className="mt-1 text-xl font-semibold text-q-text">Creative direction</h2>
                            </div>
                            <Pill tone={brief.trim() ? 'generated' : 'draft'}>{brief.trim() ? 'Brief ready' : 'Empty'}</Pill>
                        </div>
                        <textarea
                            value={brief}
                            onChange={event => onBriefChange(event.target.value)}
                            rows={14}
                            placeholder="Describe the campaign, offer, audience, visual mood, product, platform, and what the AI production workspace should create."
                            className="min-h-[360px] w-full resize-none rounded-xl border border-q-border bg-q-bg/75 px-4 py-4 text-base leading-7 text-q-text outline-none focus:border-q-accent"
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                            {creativeCommandExamples.slice(0, 4).map(command => {
                                const CommandIcon = command.icon;
                                return (
                                <button
                                    key={command.id}
                                    type="button"
                                    onClick={() => setComposerPrompt(command.prompt)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-q-border bg-q-surface/80 px-3 py-1.5 text-xs font-semibold text-q-text-secondary hover:border-q-accent/50 hover:text-q-text"
                                    title={command.prompt}
                                >
                                    <CommandIcon size={13} aria-hidden="true" />
                                    {command.label}
                                </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            );
        }

        if (activeStep === 'strategy' || activeStep === 'script') {
            return campaign ? (
                <div className="mx-auto grid max-w-7xl gap-4">
                    <section className="rounded-xl border border-q-border bg-q-surface/75 p-4 md:p-5">
                        <p className="text-[10px] font-semibold uppercase text-q-text-muted">Script Board</p>
                        <h2 className="mt-1 text-xl font-semibold text-q-text">Strategy, hooks, and copy</h2>
                        <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-q-border bg-q-bg/70 p-4 text-sm leading-6 text-q-text-secondary">{campaign.strategy}</pre>
                    </section>
                    <div className="grid gap-4 lg:grid-cols-3">
                        {campaign.scriptBlocks.map(block => (
                            <section key={block.id} className="rounded-xl border border-q-border bg-q-surface/80 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase text-q-text-muted">{block.label}</p>
                                    <Pill tone={block.status}>{formatLabel(block.status)}</Pill>
                                </div>
                                <textarea
                                    value={block.content}
                                    onChange={event => onScriptBlockChange?.(block.id, event.target.value)}
                                    rows={8}
                                    className="w-full resize-none rounded-md border border-q-border bg-q-bg/70 px-3 py-2 text-sm leading-6 text-q-text outline-none focus:border-q-accent"
                                />
                            </section>
                        ))}
                    </div>
                </div>
            ) : <EmptyCanvas title="No script yet" body="Generate from the brief to create strategy, script, captions, and prompt blocks." />;
        }

        if (activeStep === 'storyboard') {
            return campaign ? (
                <div className="mx-auto max-w-7xl">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-q-text-muted">Storyboard Board</p>
                            <h2 className="mt-1 text-xl font-semibold text-q-text">Scenes and visual directions</h2>
                        </div>
                        <Pill tone={getCreativeStepState('storyboard')}>{formatLabel(getCreativeStepState('storyboard'))}</Pill>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {campaign.scenes.map(scene => (
                            <CreativeSceneCard
                                key={scene.id}
                                scene={scene}
                                isSelected={selectedScene?.id === scene.id}
                                onSelect={() => setSelectedSceneId(scene.id)}
                                onSceneChange={onSceneChange}
                                onSceneStatusChange={onSceneStatusChange}
                                onRegenerateScene={onRegenerateScene}
                            />
                        ))}
                    </div>
                </div>
            ) : <EmptyCanvas title="No storyboard yet" body="Generate to create visual scene cards, prompts, captions, and review states." />;
        }

        if (activeStep === 'assets') {
            return campaign ? (
                <div className="mx-auto max-w-7xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-q-text-muted">Asset Board</p>
                            <h2 className="mt-1 text-xl font-semibold text-q-text">Generated placeholders and production jobs</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-q-border bg-q-surface/70 p-2">
                            <select value={assetTypeFilter} onChange={event => setAssetTypeFilter(event.target.value as 'all' | ContentAssetType)} className="h-8 rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent">
                                <option value="all">All types</option>
                                {assetTypes.map(type => <option key={type} value={type}>{formatLabel(type)}</option>)}
                            </select>
                            <select value={assetStatusFilter} onChange={event => setAssetStatusFilter(event.target.value as 'all' | ContentAssetStatus)} className="h-8 rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent">
                                <option value="all">All statuses</option>
                                {(['pending', 'generating', 'generated', 'approved', 'rejected', 'failed'] as ContentAssetStatus[]).map(status => (
                                    <option key={status} value={status}>{formatLabel(status)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filteredAssets.map(asset => (
                            <article key={asset.id} className="overflow-hidden rounded-xl border border-q-border bg-q-surface/80">
                                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-q-bg">
                                    <div className="absolute inset-0 quimera-content-studio-preview-grid" />
                                    {asset.thumbnailUrl || asset.url ? (
                                        <img src={asset.thumbnailUrl || asset.url} alt="" className="relative h-full w-full object-cover" />
                                    ) : (
                                        <Package className="relative h-8 w-8 text-q-text-muted" />
                                    )}
                                    <div className="absolute left-3 top-3 flex items-center gap-2">
                                        <Pill tone={asset.status}>{formatLabel(asset.status)}</Pill>
                                        <span className="rounded-md border border-q-border bg-q-surface/90 px-2 py-1 text-[10px] font-semibold text-q-text-secondary">v{asset.version}</span>
                                    </div>
                                </div>
                                <div className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-q-text">{formatLabel(asset.type)} · {asset.format}</p>
                                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-q-text-muted">{asset.prompt}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => onAssetStatusChange?.(asset.id, 'approved')} className="rounded-md border border-q-success/40 px-2 py-1.5 text-[11px] font-semibold text-q-success hover:bg-q-success/10">Approve</button>
                                        <button type="button" onClick={() => onAssetStatusChange?.(asset.id, 'rejected')} className="rounded-md border border-q-border px-2 py-1.5 text-[11px] font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Reject</button>
                                        <button type="button" onClick={() => onRegenerateAsset?.(asset.id)} className="rounded-md border border-q-border px-2 py-1.5 text-[11px] font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Regenerate</button>
                                        <button type="button" onClick={() => onDuplicateAsset?.(asset.id)} className="rounded-md border border-q-border px-2 py-1.5 text-[11px] font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Duplicate</button>
                                    </div>
                                    <select
                                        value=""
                                        onChange={event => {
                                            if (event.target.value) onUseAssetInScene?.(asset.id, event.target.value);
                                        }}
                                        className="h-9 w-full rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent"
                                    >
                                        <option value="">Use in scene</option>
                                        {campaign.scenes.map(scene => <option key={scene.id} value={scene.id}>Scene {scene.order + 1}: {scene.title}</option>)}
                                    </select>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            ) : <EmptyCanvas title="No assets yet" body="Generated placeholders will appear as a creative asset grid before real provider jobs run." />;
        }

        if (activeStep === 'timeline') {
            return campaign ? (
                <div className="mx-auto max-w-7xl rounded-xl border border-q-border bg-q-surface/75 p-4 md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-q-text-muted">Timeline Board</p>
                            <h2 className="mt-1 text-xl font-semibold text-q-text">{campaign.timeline.duration}s production sequence</h2>
                        </div>
                        <Pill tone={campaign.status}>{formatLabel(campaign.status)}</Pill>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4">
                        {campaign.scenes.map(scene => (
                            <button
                                key={scene.id}
                                type="button"
                                draggable
                                onDragStart={() => setDragSceneId(scene.id)}
                                onDragOver={event => event.preventDefault()}
                                onDrop={() => {
                                    if (dragSceneId) reorderTimeline(dragSceneId, scene.id);
                                    setDragSceneId(null);
                                }}
                                onClick={() => {
                                    setSelectedTimelineSceneId(scene.id);
                                    setSelectedSceneId(scene.id);
                                }}
                                className={`min-w-[260px] rounded-xl border bg-q-bg/75 p-3 text-left transition-colors ${selectedScene?.id === scene.id ? 'border-q-accent' : 'border-q-border hover:border-q-border-strong'}`}
                            >
                                <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-q-border bg-q-surface/70">
                                    <Play className="h-6 w-6 text-q-accent" />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-q-text">{scene.order + 1}. {scene.title}</p>
                                    <Pill tone={scene.status}>{formatLabel(scene.status)}</Pill>
                                </div>
                                <div className="mt-3 space-y-2 text-xs">
                                    {campaign.timeline.layers.filter(layer => layer.sceneId === scene.id).map(layer => (
                                        <div key={layer.id} className="flex items-center justify-between rounded-md border border-q-border bg-q-surface/70 px-2 py-1.5">
                                            <span className="font-semibold text-q-text">{formatLabel(layer.type)} layer</span>
                                            <span className="text-q-text-muted">{layer.start}s / {layer.duration}s</span>
                                        </div>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : <EmptyCanvas title="No timeline yet" body="Generate a storyboard to see ordered scenes, layer references, and durations." />;
        }

        if (activeStep === 'review') {
            const readiness = campaign?.readiness;
            return (
                <div className="mx-auto max-w-5xl rounded-xl border border-q-border bg-q-surface/75 p-4 md:p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-q-text-muted">Review Board</p>
                            <h2 className="mt-1 text-xl font-semibold text-q-text">Readiness and warnings</h2>
                        </div>
                        <Pill tone={readiness?.isReady ? 'approved' : 'needs_review'}>{readiness?.isReady ? 'Ready to export' : 'Needs review'}</Pill>
                    </div>
                    <ReadinessList campaign={campaign} />
                </div>
            );
        }

        if (activeStep === 'export') {
            return campaign ? (
                <div className="mx-auto max-w-7xl rounded-xl border border-q-border bg-q-surface/75 p-4 md:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase text-q-text-muted">Export Preview</p>
                            <h2 className="mt-1 text-xl font-semibold text-q-text">Copy, prompts, storyboard, and package JSON</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => writeClipboard(exportText || '')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"><Copy size={16} /> JSON</button>
                            <button type="button" onClick={() => downloadTextFile(`${slugifyFileName(campaign.title)}.content-package.json`, exportText || '')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"><Download size={16} /> Download</button>
                            <button type="button" onClick={() => writeClipboard(buildPromptsText(campaign))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"><Clipboard size={16} /> Prompts</button>
                            <button type="button" onClick={() => writeClipboard(buildStoryboardText(campaign))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"><Layers size={16} /> Storyboard</button>
                        </div>
                    </div>
                    <pre className="max-h-[560px] overflow-auto rounded-xl border border-q-border bg-q-bg/80 p-4 text-xs leading-5 text-q-text">{exportText}</pre>
                </div>
            ) : <EmptyCanvas title="No export yet" body="Generate a campaign first, then export copy, JSON, prompts, assets, and storyboard." />;
        }

        return null;
    };

    const renderCreativeInspector = () => (
        <aside className="hidden min-h-0 overflow-y-auto border-l border-q-border bg-q-surface/40 p-3 xl:block">
            <CollapsiblePanelHeader
                title="Settings"
                onExpandAll={() => setOpenInspectorSections({ creative: true, package: true, scene: true, readiness: true })}
                onCollapseAll={() => setOpenInspectorSections({ creative: false, package: false, scene: false, readiness: false })}
            />
            <div className="space-y-2.5">
                <CollapsibleSection
                    title="Creative settings"
                    icon={<Wand2 size={14} />}
                    isOpen={!!openInspectorSections.creative}
                    onToggle={() => toggleInspectorSection('creative')}
                >
                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-xs font-semibold text-q-text-secondary">Creative Mode</span>
                            <select value={creativeMode} onChange={event => setCreativeMode(event.target.value as 'creative' | 'quality' | 'fast')} className="mt-1 h-9 w-full rounded-md border border-q-border bg-q-bg px-2 text-sm text-q-text outline-none focus:border-q-accent">
                                <option value="creative">Creative Mode</option>
                                <option value="quality">Quality Mode</option>
                                <option value="fast">Fast Mode</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="flex items-center justify-between text-xs font-semibold text-q-text-secondary"><span>Brand Strictness</span><span className="text-q-accent">{brandStrictness}%</span></span>
                            <input type="range" min={0} max={100} value={brandStrictness} onChange={event => setBrandStrictness(Number(event.target.value))} className="mt-2 w-full accent-q-accent" />
                        </label>
                        <label className="block">
                            <span className="flex items-center justify-between text-xs font-semibold text-q-text-secondary"><span>Reference Strength</span><span className="text-q-accent">{referenceStrength}%</span></span>
                            <input type="range" min={0} max={100} value={referenceStrength} onChange={event => setReferenceStrength(Number(event.target.value))} className="mt-2 w-full accent-q-accent" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-semibold text-q-text-secondary">Variation Count</span>
                            <select value={variationCount} onChange={event => setVariationCount(Number(event.target.value))} className="mt-1 h-9 w-full rounded-md border border-q-border bg-q-bg px-2 text-sm text-q-text outline-none focus:border-q-accent">
                                {[1, 2, 3, 4, 6].map(count => <option key={count} value={count}>{count} variations</option>)}
                            </select>
                        </label>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Package setup"
                    icon={<Package size={14} />}
                    isOpen={!!openInspectorSections.package}
                    onToggle={() => toggleInspectorSection('package')}
                    badge={<span className="rounded-full bg-q-surface-elevated px-2 py-0.5 text-[10px] font-semibold text-q-text-secondary">{formats.length + platforms.length}</span>}
                >
                    <label className="block">
                        <span className="text-xs font-semibold text-q-text-secondary">Content type</span>
                        <select
                            value={contentType}
                            onChange={event => onContentTypeChange(event.target.value as ContentTypeId)}
                            className="mt-1 h-9 w-full rounded-md border border-q-border bg-q-bg px-2 text-sm text-q-text outline-none focus:border-q-accent"
                        >
                            {CONTENT_TYPE_DEFINITIONS.filter(type => mode === 'admin' || !type.adminOnly).map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </label>
                    <p className="mt-4 text-xs font-semibold text-q-text-secondary">Formats</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {CONTENT_FORMATS.map(format => (
                            <ToggleChip key={format} label={format} active={formats.includes(format)} onClick={() => onToggleFormat(format)} />
                        ))}
                    </div>
                    <p className="mt-4 text-xs font-semibold text-q-text-secondary">Platforms</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {CONTENT_PLATFORMS.map(platform => (
                            <ToggleChip key={platform} label={formatLabel(platform)} active={platforms.includes(platform)} onClick={() => onTogglePlatform(platform)} />
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-q-text-muted">Style preset: {selectedContentPreset?.label || campaign?.sourceMap.adminPreset || 'None'}</p>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Selected scene"
                    icon={<Film size={14} />}
                    isOpen={!!openInspectorSections.scene}
                    onToggle={() => toggleInspectorSection('scene')}
                    badge={selectedScene ? <Pill tone={selectedScene.status}>{formatLabel(selectedScene.status)}</Pill> : undefined}
                >
                    {selectedScene ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-q-border bg-q-bg/65 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-q-text">{selectedScene.title}</p>
                                        <p className="mt-1 text-xs text-q-text-muted">Scene {selectedScene.order + 1} · {selectedScene.duration || 5}s · {selectedScene.format}</p>
                                    </div>
                                </div>
                            </div>
                            <label className="block">
                                <span className="text-xs font-semibold text-q-text-secondary">Prompt</span>
                                <textarea value={selectedScene.visualPrompt} onChange={event => onSceneChange?.(selectedScene.id, { visualPrompt: event.target.value })} rows={5} className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-xs leading-5 text-q-text outline-none focus:border-q-accent" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold text-q-text-secondary">Motion notes</span>
                                <textarea value={selectedScene.motionPrompt || ''} onChange={event => onSceneChange?.(selectedScene.id, { motionPrompt: event.target.value })} rows={3} className="mt-1 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-xs leading-5 text-q-text outline-none focus:border-q-accent" />
                            </label>
                            <div className="rounded-lg border border-q-border bg-q-bg/65 p-3 text-xs leading-5 text-q-text-secondary">
                                <p><span className="font-semibold text-q-text">Assets needed:</span> {selectedScene.requiredAssets.length || 0}</p>
                                <p><span className="font-semibold text-q-text">Generated variations:</span> {selectedScene.generatedAssets.length}</p>
                                <p><span className="font-semibold text-q-text">Source:</span> {selectedScene.sourceMap.generatedPrompt || selectedScene.sourceMap.brief || 'contentStudio'}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="rounded-lg border border-q-border bg-q-bg/65 p-3 text-sm text-q-text-muted">Select a scene to edit prompts, motion notes, warnings, and source map.</p>
                    )}
                </CollapsibleSection>

                <CollapsibleSection
                    title="Readiness"
                    icon={<ListChecks size={14} />}
                    isOpen={!!openInspectorSections.readiness}
                    onToggle={() => toggleInspectorSection('readiness')}
                >
                    <ReadinessList campaign={campaign} />
                </CollapsibleSection>
            </div>
        </aside>
    );

    const renderCreativeComposer = () => (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-q-bg via-q-bg/95 to-transparent px-3 pb-3 pt-7 backdrop-blur-xl">
            <form
                onSubmit={event => {
                    event.preventDefault();
                    handleComposerAction();
                }}
                className="quimera-ai-launcher quimera-ai-launcher-with-tab quimera-content-studio-composer mx-auto max-w-5xl"
            >
                <button
                    type="button"
                    onClick={() => setComposerPrompt(creativeCommandExamples[0].prompt)}
                    className="quimera-ai-launcher-tab group"
                    aria-label="Content Studio"
                >
                    <FileText className="quimera-ai-launcher-tab-icon size-3.5 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span>Studio</span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {creativeCommandExamples.map(command => {
                        const CommandIcon = command.icon;
                        const isActive = activeComposerCommandId === command.id;
                        return (
                            <button
                                key={command.id}
                                type="button"
                                onClick={() => setComposerPrompt(command.prompt)}
                                aria-pressed={isActive}
                                title={command.prompt}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors ${
                                    isActive
                                        ? 'border-q-accent/60 bg-q-accent/15 text-q-text'
                                        : 'border-transparent text-q-text-secondary hover:border-q-accent/35 hover:bg-q-surface-overlay/70 hover:text-q-text'
                                }`}
                            >
                                <CommandIcon size={13} className="text-q-accent" aria-hidden="true" />
                                <span>{command.label}</span>
                            </button>
                        );
                    })}
                </div>
                <label className="sr-only" htmlFor="content-studio-ai-composer">AI production command</label>
                <div className="flex items-start gap-2">
                    <textarea
                        id="content-studio-ai-composer"
                        value={composerPrompt}
                        onChange={event => setComposerPrompt(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleComposerAction();
                            }
                        }}
                        rows={2}
                        placeholder={selectedScene ? `Command for Scene ${selectedScene.order + 1}: ${selectedScene.title}` : 'Describe what the AI production workspace should create or refine.'}
                        className="min-h-[58px] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-q-text outline-none placeholder:text-q-text-secondary/65"
                    />
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-q-text-secondary">
                            <Sparkles size={13} className="text-q-accent" aria-hidden="true" />
                            <span className="truncate">
                                {selectedScene
                                    ? `Scene ${selectedScene.order + 1} selected`
                                    : 'Creative AI producer'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                            type="submit"
                            disabled={!brief.trim() && !composerPrompt.trim()}
                            className="no-min-touch inline-flex !size-9 !h-9 !w-9 !min-w-9 shrink-0 items-center justify-center !rounded-full !p-0 bg-q-accent text-q-text-on-accent shadow-lg shadow-q-accent/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-q-accent/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                            title="Send"
                            aria-label="Send AI production command"
                        >
                            <ArrowUp className="size-[17px]" />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );

    const renderCanvas = () => {
        if (activeStep === 'brief') {
            return (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <section className="rounded-lg border border-q-border bg-q-surface p-4">
                        <label className="text-xs font-semibold uppercase text-q-text-muted">Brief</label>
                        <textarea
                            value={brief}
                            onChange={event => onBriefChange(event.target.value)}
                            rows={10}
                            placeholder="Describe the campaign, offer, audience, product, listing, restaurant promo, website asset, or template preview."
                            className="mt-2 w-full resize-none rounded-lg border border-q-border bg-q-bg px-3 py-3 text-sm leading-6 text-q-text outline-none focus:border-q-accent"
                        />
                    </section>
                    <aside className="rounded-lg border border-q-border bg-q-surface p-4">
                        <label className="text-xs font-semibold uppercase text-q-text-muted">Content type</label>
                        <select
                            value={contentType}
                            onChange={event => onContentTypeChange(event.target.value as ContentTypeId)}
                            className="mt-2 h-10 w-full rounded-md border border-q-border bg-q-bg px-3 text-sm text-q-text outline-none focus:border-q-accent"
                        >
                            {CONTENT_TYPE_DEFINITIONS.filter(type => mode === 'admin' || !type.adminOnly).map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                        <p className="mt-4 text-xs font-semibold uppercase text-q-text-muted">Formats</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {CONTENT_FORMATS.map(format => (
                                <ToggleChip key={format} label={format} active={formats.includes(format)} onClick={() => onToggleFormat(format)} />
                            ))}
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase text-q-text-muted">Platforms</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {CONTENT_PLATFORMS.map(platform => (
                                <ToggleChip key={platform} label={formatLabel(platform)} active={platforms.includes(platform)} onClick={() => onTogglePlatform(platform)} />
                            ))}
                        </div>
                        {mode === 'user' && availablePresets.length > 0 && (
                            <label className="mt-4 block">
                                <span className="text-xs font-semibold uppercase text-q-text-muted">Factory preset</span>
                                <select
                                    value={selectedContentPresetId || ''}
                                    onChange={event => onSelectContentPreset?.(event.target.value || null)}
                                    className="mt-2 h-10 w-full rounded-md border border-q-border bg-q-bg px-3 text-sm text-q-text outline-none focus:border-q-accent"
                                >
                                    <option value="">No preset</option>
                                    {availablePresets.map(preset => (
                                        <option key={preset.id} value={preset.id}>{preset.label}</option>
                                    ))}
                                </select>
                                {selectedContentPreset && (
                                    <p className="mt-2 text-xs leading-5 text-q-text-muted">{selectedContentPreset.description}</p>
                                )}
                            </label>
                        )}
                    </aside>
                </div>
            );
        }

        if (activeStep === 'strategy') {
            return campaign ? (
                <div className="rounded-lg border border-q-border bg-q-surface p-5">
                    <p className="text-xs font-semibold uppercase text-q-text-muted">Generated strategy</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-q-border bg-q-bg p-4 text-sm leading-6 text-q-text">{campaign.strategy}</pre>
                </div>
            ) : <EmptyCanvas title="No strategy yet" body="Generate a content project from the brief to create a strategy." />;
        }

        if (activeStep === 'script') {
            return campaign ? (
                <div className="grid gap-4">
                    {campaign.scriptBlocks.map(block => (
                        <section key={block.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <p className="text-xs font-semibold uppercase text-q-text-muted">{block.label}</p>
                            <textarea
                                value={block.content}
                                onChange={event => onScriptBlockChange?.(block.id, event.target.value)}
                                rows={5}
                                className="mt-2 w-full resize-none rounded-md border border-q-border bg-q-bg px-3 py-2 text-sm leading-6 text-q-text outline-none focus:border-q-accent"
                            />
                        </section>
                    ))}
                </div>
            ) : <EmptyCanvas title="No script yet" body="Generate to create editable copy and script blocks." />;
        }

        if (activeStep === 'storyboard') {
            return campaign ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    {campaign.scenes.map(scene => (
                        <SceneCard
                            key={scene.id}
                            scene={scene}
                            onSceneChange={onSceneChange}
                            onSceneStatusChange={onSceneStatusChange}
                            onRegenerateScene={onRegenerateScene}
                        />
                    ))}
                </div>
            ) : <EmptyCanvas title="No storyboard yet" body="Generate to create scene cards, prompts, captions, and review states." />;
        }

        if (activeStep === 'assets') {
            return campaign ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-q-border bg-q-surface p-3">
                        <select
                            value={assetTypeFilter}
                            onChange={event => setAssetTypeFilter(event.target.value as 'all' | ContentAssetType)}
                            className="h-9 rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent"
                        >
                            <option value="all">All types</option>
                            {assetTypes.map(type => <option key={type} value={type}>{formatLabel(type)}</option>)}
                        </select>
                        <select
                            value={assetStatusFilter}
                            onChange={event => setAssetStatusFilter(event.target.value as 'all' | ContentAssetStatus)}
                            className="h-9 rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent"
                        >
                            <option value="all">All statuses</option>
                            {(['pending', 'generating', 'generated', 'approved', 'rejected', 'failed'] as ContentAssetStatus[]).map(status => (
                                <option key={status} value={status}>{formatLabel(status)}</option>
                            ))}
                        </select>
                        <span className="text-xs font-medium text-q-text-muted">{filteredAssets.length} of {campaign.assets.length} assets</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredAssets.map(asset => (
                            <article key={asset.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                                <div className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-md border border-dashed border-q-border bg-q-bg">
                                    {asset.thumbnailUrl || asset.url ? (
                                        <img src={asset.thumbnailUrl || asset.url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Package className="h-8 w-8 text-q-text-muted" />
                                    )}
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-q-text">{formatLabel(asset.type)} v{asset.version}</p>
                                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-q-text-muted">{asset.prompt}</p>
                                    </div>
                                    <Pill tone={asset.status}>{formatLabel(asset.status)}</Pill>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => onAssetStatusChange?.(asset.id, 'approved')} className="rounded-md border border-q-success/30 px-2 py-1 text-xs font-semibold text-q-success">Approve</button>
                                    <button type="button" onClick={() => onAssetStatusChange?.(asset.id, 'rejected')} className="rounded-md border border-q-border px-2 py-1 text-xs font-semibold text-q-text-secondary">Reject</button>
                                    <button type="button" onClick={() => onRegenerateAsset?.(asset.id)} className="rounded-md border border-q-border px-2 py-1 text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Regenerate</button>
                                    <button type="button" onClick={() => onDuplicateAsset?.(asset.id)} className="rounded-md border border-q-border px-2 py-1 text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Duplicate</button>
                                    <select
                                        value=""
                                        onChange={event => {
                                            if (event.target.value) onUseAssetInScene?.(asset.id, event.target.value);
                                        }}
                                        className="col-span-2 h-8 rounded-md border border-q-border bg-q-bg px-2 text-xs font-semibold text-q-text outline-none focus:border-q-accent"
                                    >
                                        <option value="">Use in scene</option>
                                        {campaign.scenes.map(scene => <option key={scene.id} value={scene.id}>Scene {scene.order + 1}: {scene.title}</option>)}
                                    </select>
                                    <button type="button" onClick={() => navigator.clipboard?.writeText(asset.prompt)} className="rounded-md border border-q-border px-2 py-1 text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Copy prompt</button>
                                    {asset.url ? (
                                        <a href={asset.url} download className="rounded-md border border-q-border px-2 py-1 text-center text-xs font-semibold text-q-text-secondary hover:bg-q-surface-elevated">Download</a>
                                    ) : (
                                        <button type="button" disabled className="rounded-md border border-q-border px-2 py-1 text-xs font-semibold text-q-text-secondary opacity-45">Download</button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                    {filteredAssets.length === 0 && (
                        <div className="rounded-lg border border-dashed border-q-border bg-q-surface p-6 text-center text-sm text-q-text-muted">
                            No assets match the current filters.
                        </div>
                    )}
                </div>
            ) : <EmptyCanvas title="No assets yet" body="Generated asset placeholders will appear here before real provider jobs run." />;
        }

        if (activeStep === 'timeline') {
            return campaign ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-lg border border-q-border bg-q-surface p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-q-text-muted">Basic timeline</p>
                                <h3 className="text-base font-semibold text-q-text">{campaign.timeline.duration}s package</h3>
                            </div>
                            <Pill tone={campaign.status}>{formatLabel(campaign.status)}</Pill>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-3">
                            {campaign.scenes.map(scene => (
                                <button
                                    key={scene.id}
                                    type="button"
                                    draggable
                                    onDragStart={() => setDragSceneId(scene.id)}
                                    onDragOver={event => event.preventDefault()}
                                    onDrop={() => {
                                        if (dragSceneId) reorderTimeline(dragSceneId, scene.id);
                                        setDragSceneId(null);
                                    }}
                                    onClick={() => setSelectedTimelineSceneId(scene.id)}
                                    className={`min-w-[220px] rounded-lg border p-3 text-left ${selectedTimelineScene?.id === scene.id ? 'border-q-accent bg-q-accent/10' : 'border-q-border bg-q-bg'}`}
                                >
                                    <div className="mb-3 flex h-24 items-center justify-center rounded-md bg-q-surface">
                                        <Play className="h-6 w-6 text-q-accent" />
                                    </div>
                                    <p className="truncate text-sm font-semibold text-q-text">{scene.order + 1}. {scene.title}</p>
                                    <p className="mt-1 text-xs text-q-text-muted">{scene.duration || 5}s - image / caption layer</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <aside className="rounded-lg border border-q-border bg-q-surface p-4">
                        <p className="text-xs font-semibold uppercase text-q-text-muted">Selected scene preview</p>
                        {selectedTimelineScene ? (
                            <div className="mt-3 space-y-3">
                                <div className="rounded-md border border-q-border bg-q-bg p-3">
                                    <p className="text-sm font-semibold text-q-text">{selectedTimelineScene.title}</p>
                                    <p className="mt-1 text-xs leading-5 text-q-text-muted">{selectedTimelineScene.visualPrompt}</p>
                                </div>
                                {campaign.timeline.layers.filter(layer => layer.sceneId === selectedTimelineScene.id).map(layer => (
                                    <div key={layer.id} className="flex items-center justify-between rounded-md border border-q-border bg-q-bg px-3 py-2 text-xs">
                                        <span className="font-semibold text-q-text">{formatLabel(layer.type)}</span>
                                        <span className="text-q-text-muted">{layer.start}s / {layer.duration}s</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="mt-3 text-sm text-q-text-muted">Select a scene to preview timeline layers.</p>}
                    </aside>
                </div>
            ) : <EmptyCanvas title="No timeline yet" body="Generate a storyboard to see ordered scenes and basic layers." />;
        }

        if (activeStep === 'review') {
            return (
                <div className="rounded-lg border border-q-border bg-q-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-q-text">Readiness report</h3>
                    <ReadinessList campaign={campaign} />
                </div>
            );
        }

        if (activeStep === 'export') {
            return campaign ? (
                <div className="rounded-lg border border-q-border bg-q-surface p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase text-q-text-muted">Export package</p>
                            <h3 className="text-base font-semibold text-q-text">Copy / JSON package</h3>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => writeClipboard(exportText || '')}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"
                            >
                                <Copy size={16} /> Copy JSON
                            </button>
                            <button
                                type="button"
                                onClick={() => downloadTextFile(`${slugifyFileName(campaign.title)}.content-package.json`, exportText || '')}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"
                            >
                                <Download size={16} /> Download JSON
                            </button>
                            <button
                                type="button"
                                onClick={() => writeClipboard(buildPromptsText(campaign))}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"
                            >
                                <Clipboard size={16} /> Prompts
                            </button>
                            <button
                                type="button"
                                onClick={() => writeClipboard(buildScriptText(campaign))}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"
                            >
                                <FileText size={16} /> Script
                            </button>
                            <button
                                type="button"
                                onClick={() => writeClipboard(buildStoryboardText(campaign))}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border px-3 text-sm font-semibold text-q-text hover:bg-q-surface-elevated"
                            >
                                <Layers size={16} /> Storyboard
                            </button>
                        </div>
                    </div>
                    <pre className="max-h-[520px] overflow-auto rounded-lg border border-q-border bg-q-bg p-4 text-xs leading-5 text-q-text">{exportText}</pre>
                </div>
            ) : <EmptyCanvas title="No export yet" body="Generate a campaign first, then export copy, JSON, prompts, asset list, and storyboard." />;
        }

        if (activeStep === 'adminOverview') {
            const usage = adminConfig?.usage;
            const pendingReviewPresets = adminConfig?.presets.filter(preset => preset.status === 'admin_draft' || preset.status === 'testing').length || 0;
            const cards = [
                ['Active presets', adminConfig?.presets.filter(preset => preset.status === 'published' || preset.status === 'approved').length || 0],
                ['Generated this month', usage?.generatedThisMonth || 0],
                ['Failed jobs', usage?.failedJobs || 0],
                ['Average generation time', `${usage?.averageGenerationTimeSeconds || 0}s`],
                ['Top content types', usage?.topContentTypes.map(formatLabel).join(', ') || 'Pending'],
                ['Pending review presets', pendingReviewPresets],
            ];

            return (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map(([label, value]) => (
                        <section key={label} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <p className="text-xs font-semibold uppercase text-q-text-muted">{label}</p>
                            <p className="mt-3 text-2xl font-bold text-q-text">{value}</p>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'globalPresets' || activeStep === 'presetConfig') {
            return (
                <AdminPresetEditor
                    config={adminConfig || undefined}
                    selectedPresetId={selectedPresetId}
                    onSelectPreset={onSelectPreset}
                    onCreatePreset={onCreatePreset}
                    onUpdatePreset={onUpdatePreset}
                    onPresetStatusChange={onPresetStatusChange}
                />
            );
        }

        if (activeStep === 'promptBlocks') {
            const selected = adminConfig?.presets.find(preset => preset.id === selectedPresetId) || adminConfig?.presets[0];
            return selected ? (
                <div className="grid gap-4">
                    {selected.promptBlocks.map(block => (
                        <section key={block.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <p className="text-xs font-semibold uppercase text-q-text-muted">{block.role}</p>
                            <input
                                value={block.label}
                                onChange={event => onUpdatePreset?.(selected.id, {
                                    promptBlocks: selected.promptBlocks.map(item => item.id === block.id ? { ...item, label: event.target.value } : item),
                                })}
                                className="mt-1 w-full bg-transparent text-base font-semibold text-q-text outline-none focus:text-q-accent"
                            />
                            <textarea
                                value={block.content}
                                onChange={event => onUpdatePreset?.(selected.id, {
                                    promptBlocks: selected.promptBlocks.map(item => item.id === block.id ? {
                                        ...item,
                                        content: event.target.value,
                                        status: 'needs_review',
                                        editableState: { ...item.editableState, editedByUser: true, generatedByAI: false },
                                    } : item),
                                })}
                                rows={5}
                                className="mt-3 w-full resize-none rounded-md border border-q-border bg-q-bg p-3 text-sm leading-6 text-q-text outline-none focus:border-q-accent"
                            />
                        </section>
                    ))}
                </div>
            ) : <EmptyCanvas title="No prompt blocks" body="Create or select a preset first." />;
        }

        if (activeStep === 'stylePacks') {
            return (
                <div className="grid gap-4 md:grid-cols-2">
                    {(adminConfig?.stylePresets || []).map(style => (
                        <section key={style.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-q-text">{style.label}</h3>
                                    <p className="mt-1 text-sm leading-6 text-q-text-muted">{style.description}</p>
                                </div>
                                <Pill tone={style.status}>{formatLabel(style.status)}</Pill>
                            </div>
                            <pre className="mt-3 overflow-auto rounded-md border border-q-border bg-q-bg p-3 text-xs leading-5 text-q-text-muted">{JSON.stringify(style.styleSettings, null, 2)}</pre>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'templatePacks') {
            return (
                <div className="grid gap-4 md:grid-cols-2">
                    {(adminConfig?.templatePacks || []).map(pack => (
                        <section key={pack.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-q-text">{pack.label}</h3>
                                    <p className="mt-1 text-sm leading-6 text-q-text-muted">{pack.description}</p>
                                </div>
                                <Pill tone={pack.status}>{formatLabel(pack.status)}</Pill>
                            </div>
                            <p className="mt-3 text-xs font-semibold uppercase text-q-text-muted">Content types</p>
                            <p className="mt-1 text-sm text-q-text">{pack.contentTypes.map(formatLabel).join(', ')}</p>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'providerRouting') {
            return (
                <div className="grid gap-4">
                    <section className="rounded-lg border border-q-border bg-q-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-q-text">Provider Bridge</h3>
                                <p className="mt-1 text-sm leading-6 text-q-text-muted">
                                    Capability routing is active in mock mode. Real provider execution stays server-side and will not expose provider secrets to the client.
                                </p>
                            </div>
                            <Pill tone="needs_review">Mock</Pill>
                        </div>
                    </section>
                    {(adminConfig?.providerRouting || []).map(rule => (
                        <section key={rule.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-q-text">{rule.label}</p>
                                    <p className="mt-1 text-sm text-q-text-muted">{formatLabel(rule.capability)} - {rule.preferredProviderId}</p>
                                </div>
                                <Pill tone={rule.isEnabled ? 'approved' : 'draft'}>{rule.isEnabled ? 'Enabled' : 'Disabled'}</Pill>
                            </div>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'generationJobs') {
            return (
                <div className="grid gap-3">
                    {(adminConfig?.generationJobs || campaign?.jobs || []).map(job => (
                        <section key={job.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-q-text">{formatLabel(job.jobType)} job</h3>
                                    <p className="mt-1 text-xs text-q-text-muted">{job.providerId || 'provider pending'} - {job.id}</p>
                                </div>
                                <Pill tone={job.status === 'failed' ? 'failed' : job.status === 'succeeded' ? 'approved' : 'needs_review'}>{formatLabel(job.status)}</Pill>
                            </div>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'usage') {
            return (
                <div className="rounded-lg border border-q-border bg-q-surface p-5">
                    <h3 className="text-base font-semibold text-q-text">Usage</h3>
                    <pre className="mt-3 overflow-auto rounded-md border border-q-border bg-q-bg p-4 text-xs leading-5 text-q-text">{JSON.stringify(adminConfig?.usage || {}, null, 2)}</pre>
                </div>
            );
        }

        if (activeStep === 'safetyPolicies' || activeStep === 'usageRules') {
            return (
                <div className="grid gap-4">
                    {(adminConfig?.safetyPolicies || []).map(policy => (
                        <section key={policy.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-q-text">{policy.label}</h3>
                                    <p className="mt-1 text-sm leading-6 text-q-text-muted">{policy.description}</p>
                                    <p className="mt-2 text-xs font-medium text-q-accent">{policy.userMessage}</p>
                                </div>
                                <Pill tone={policy.severity === 'blocker' ? 'failed' : policy.isEnabled ? 'approved' : 'draft'}>{policy.isEnabled ? formatLabel(policy.severity) : 'Disabled'}</Pill>
                            </div>
                        </section>
                    ))}
                </div>
            );
        }

        if (activeStep === 'publishing') {
            return (
                <div className="rounded-lg border border-q-border bg-q-surface p-5">
                    <h3 className="text-base font-semibold text-q-text">Publishing</h3>
                    <p className="mt-2 text-sm leading-6 text-q-text-muted">Published presets become visible to Content Studio users according to visibility and feature gates.</p>
                    <div className="mt-4 grid gap-3">
                        {(adminConfig?.presets || []).map(preset => (
                            <div key={preset.id} className="flex items-center justify-between rounded-md border border-q-border bg-q-bg px-3 py-2">
                                <span className="text-sm font-semibold text-q-text">{preset.label}</span>
                                <Pill tone={preset.status}>{formatLabel(preset.status)}</Pill>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeStep === 'auditLogs' || activeStep === 'audit') {
            return (
                <div className="grid gap-3">
                    {(adminConfig?.auditLogs || []).map(log => (
                        <section key={log.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                            <p className="text-sm font-semibold text-q-text">{formatLabel(log.action)}</p>
                            <p className="mt-1 text-xs text-q-text-muted">{log.message}</p>
                            <p className="mt-2 text-xs text-q-text-muted">{new Date(log.createdAt).toLocaleString()}</p>
                        </section>
                    ))}
                </div>
            );
        }

        return null;
    };

    if (mode === 'user') {
        return (
            <div className="quimera-content-studio-creative flex h-full min-h-0 flex-col bg-q-bg text-q-text">
                <header className="flex min-h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-q-border bg-q-bg/95 px-3 backdrop-blur-xl md:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        {onBack && (
                            <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text-secondary hover:text-q-text">
                                <ChevronLeft size={16} />
                                <span className="hidden sm:inline">Project</span>
                            </button>
                        )}
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                                <h1 className="truncate text-sm font-bold text-q-text md:text-base">{title}</h1>
                                <Pill tone={campaign?.status || 'draft'}>{statusLabel}</Pill>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-q-text-muted">
                                <span>{autosaveLabel || 'Manual save'}</span>
                                <span>·</span>
                                <span>v{campaign?.timeline.version || 1}</span>
                                <span>·</span>
                                <span>{creativeStatus}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 overflow-x-auto">
                        <IconButton title="Generate" onClick={onGenerate} disabled={!brief.trim()} variant="primary"><Sparkles size={16} /> Generate</IconButton>
                        <IconButton title="Regenerate" onClick={selectedScene ? () => onRegenerateScene?.(selectedScene.id) : onRegenerate} disabled={!campaign}><RefreshCw size={16} /> <span className="hidden sm:inline">Regenerate</span></IconButton>
                        <IconButton title="Save version" onClick={onSaveVersion} disabled={isSaving}><Save size={16} /> <span className="hidden sm:inline">Save Version</span></IconButton>
                        <IconButton title="Export" onClick={onExport} disabled={!campaign}><Download size={16} /> <span className="hidden sm:inline">Export</span></IconButton>
                    </div>
                </header>

                <div className={`grid flex-1 min-h-0 grid-cols-1 ${creativeGridClass}`}>
                    {renderCreativeRail()}
                    <main className="min-h-0 overflow-y-auto">
                        <div className="quimera-content-studio-canvas min-h-full p-3 pb-6 md:p-5">
                            {renderCreativeCanvas()}
                        </div>
                        {renderCreativeComposer()}
                    </main>
                    {renderCreativeInspector()}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-q-bg text-q-text">
            <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-q-border bg-q-bg/95 px-3 backdrop-blur md:px-4">
                <div className="flex min-w-0 items-center gap-3">
                    {onBack && (
                        <button type="button" onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-q-text-secondary hover:bg-q-surface hover:text-q-text">
                            <ChevronLeft size={18} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                            <h1 className="truncate text-sm font-bold text-q-text md:text-base">{title}</h1>
                            <Pill tone={campaign?.status || 'draft'}>{statusLabel}</Pill>
                        </div>
                        <p className="hidden truncate text-xs text-q-text-muted sm:block">{subtitle || autosaveLabel || 'Content production workspace'}</p>
                    </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 overflow-x-auto">
                    <IconButton title="Generate" onClick={onGenerate} disabled={!brief.trim()} variant="primary"><Sparkles size={16} /> Generate</IconButton>
                    <IconButton title="Regenerate" onClick={onRegenerate} disabled={!campaign}><RefreshCw size={16} /> <span className="hidden sm:inline">Regenerate</span></IconButton>
                    <IconButton title="Save version" onClick={mode === 'admin' ? onSaveAdminConfig : onSaveVersion} disabled={isSaving}><Save size={16} /> <span className="hidden sm:inline">Save</span></IconButton>
                    <IconButton title="Export" onClick={onExport} disabled={!campaign}><Download size={16} /> <span className="hidden sm:inline">Export</span></IconButton>
                    {mode === 'admin' && <IconButton title="Publish" onClick={onPublish}><BadgeCheck size={16} /> <span className="hidden sm:inline">Publish</span></IconButton>}
                </div>
            </header>

            <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
                <aside className="hidden min-h-0 border-r border-q-border bg-q-surface/60 p-3 lg:block">
                    <nav className="space-y-1">
                        {flow.map(step => (
                            <button
                                key={step}
                                type="button"
                                onClick={() => onStepChange(step)}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${activeStep === step ? 'bg-q-accent text-q-text-on-accent' : 'text-q-text-secondary hover:bg-q-surface hover:text-q-text'}`}
                            >
                                {stepIcons[step]}
                                <span className="truncate">{stepLabels[step]}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="min-h-0 overflow-y-auto p-3 md:p-5">
                    {renderCanvas()}
                </main>

                <aside className="hidden min-h-0 overflow-y-auto border-l border-q-border bg-q-surface/40 p-3 xl:block">
                    <CollapsiblePanelHeader
                        title="Settings"
                        onExpandAll={() => setOpenInspectorSections(prev => ({ ...prev, settings: true, readiness: true, metadata: true }))}
                        onCollapseAll={() => setOpenInspectorSections(prev => ({ ...prev, settings: false, readiness: false, metadata: false }))}
                    />
                    <div className="space-y-2.5">
                        <CollapsibleSection
                            title="Settings"
                            icon={<Settings2 size={14} />}
                            isOpen={openInspectorSections.settings !== false}
                            onToggle={() => toggleInspectorSection('settings')}
                        >
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between gap-3"><span className="text-q-text-muted">Type</span><span className="font-semibold text-q-text">{formatLabel(contentType)}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-q-text-muted">Mode</span><span className="font-semibold text-q-text">{mode === 'admin' ? 'Provider routing' : 'Quality mode'}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-q-text-muted">Formats</span><span className="text-right font-semibold text-q-text">{formats.join(', ')}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-q-text-muted">Platforms</span><span className="text-right font-semibold text-q-text">{platforms.map(formatLabel).join(', ')}</span></div>
                            </div>
                        </CollapsibleSection>
                        <CollapsibleSection
                            title="Readiness"
                            icon={<ListChecks size={14} />}
                            isOpen={openInspectorSections.readiness !== false}
                            onToggle={() => toggleInspectorSection('readiness')}
                        >
                            <ReadinessList campaign={campaign} />
                        </CollapsibleSection>
                        <CollapsibleSection
                            title="Metadata"
                            icon={<FileText size={14} />}
                            isOpen={openInspectorSections.metadata !== false}
                            onToggle={() => toggleInspectorSection('metadata')}
                        >
                            <div className="rounded-md border border-q-border bg-q-bg p-3 text-xs leading-5 text-q-text-muted">
                                <p>Source: {campaign?.sourceMap.businessProfile || 'pending'}</p>
                                <p>Scenes: {campaign?.scenes.length || 0}</p>
                                <p>Assets: {campaign?.assets.length || 0}</p>
                                <p>Preset: {selectedContentPreset?.label || campaign?.sourceMap.adminPreset || 'none'}</p>
                                <p>Autosave: {autosaveLabel || 'manual save'}</p>
                            </div>
                        </CollapsibleSection>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default ContentStudioShell;
