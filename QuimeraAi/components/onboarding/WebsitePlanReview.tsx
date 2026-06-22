import React, { useMemo, useState } from 'react';
import { X, Sparkles, Loader2, Building2, Palette, LayoutTemplate, Image, FileText, Plus, RefreshCw, MessageSquare } from 'lucide-react';
import type { PageSection } from '../../types/ui';
import type { WebsitePlan } from '../../types/websitePlan';
import type { ColorCandidate } from '../../types/colorSystem';
import { SortableComponentChips } from '../ui/SortableComponentChips';
import ColorControl from '../ui/ColorControl';
import { createColorBriefFromWebsitePlan, createImportedPaletteCandidates, generateColorCandidates, selectBestColorSystem } from '../../utils/colorSystemEngine';
import AppSelect from '../ui/AppSelect';
import { useTranslation } from 'react-i18next';

interface ComponentOption {
    key: PageSection;
    label: string;
}

interface WebsitePlanReviewProps {
    plan: WebsitePlan;
    availableComponents: ComponentOption[];
    isGenerating: boolean;
    onPlanChange: (plan: WebsitePlan) => void;
    onConfirm: (plan: WebsitePlan) => void;
    onClose: () => void;
}

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'surface', 'text'] as const;

const GENERATION_MODES: WebsitePlan['generationMode'][] = ['faithful-redesign', 'modernize', 'inspired-by', 'from-scratch'];

const COLOR_WARNING_KEYS: Record<string, string> = {
    'Palette is too monochromatic for a full website system.': 'monochromatic',
    'Adjusted text color for background contrast.': 'textContrast',
    'Adjusted heading color for background contrast.': 'headingContrast',
    'Adjusted primary color so buttons can remain readable.': 'primaryReadable',
    'Adjusted surface color so cards and ecommerce sections stay readable.': 'surfaceReadable',
    'Adjusted surface color to separate cards from the page background.': 'surfaceSeparation',
    'Adjusted accent color for visibility.': 'accentVisibility',
    'Using default colors because no candidates were available.': 'defaultColors',
};

function buildReviewColorBrief(plan: WebsitePlan) {
    const base = createColorBriefFromWebsitePlan(plan);
    const current = plan.brandProfile.colorBrief;
    if (!current) return base;

    return {
        ...base,
        ...current,
        mood: [...new Set([...(base.mood || []), ...(current.mood || [])])],
        importedColors: [...(base.importedColors || []), ...(current.importedColors || [])],
        logoColors: [...(base.logoColors || []), ...(current.logoColors || [])],
        imageColors: [...(base.imageColors || []), ...(current.imageColors || [])],
        lockedColors: { ...(base.lockedColors || {}), ...(current.lockedColors || {}) },
        activeComponents: [...new Set([...(base.activeComponents || []), ...(current.activeComponents || [])])],
    };
}

export const WebsitePlanReview: React.FC<WebsitePlanReviewProps> = ({
    plan,
    availableComponents,
    isGenerating,
    onPlanChange,
    onConfirm,
    onClose,
}) => {
    const { t, i18n } = useTranslation();
    const [showAddMenu, setShowAddMenu] = useState(false);
    const selectedComponents = useMemo(() => plan.componentPlan.map(item => item.component), [plan.componentPlan]);
    const availableToAdd = availableComponents.filter(item => !selectedComponents.includes(item.key));
    const reviewColorBrief = useMemo(() => buildReviewColorBrief(plan), [plan]);
    const componentLabels = useMemo(
        () => new Map(availableComponents.map(item => [item.key, item.label])),
        [availableComponents]
    );

    const tPlan = (key: string, defaultValue: string, options?: Record<string, unknown>) => (
        t(`aiWebsiteStudio.planReview.${key}`, { defaultValue, ...options })
    );

    const isSpanish = i18n.language?.toLowerCase().startsWith('es');

    const getModeLabel = (mode: WebsitePlan['generationMode']) => tPlan(`modes.${mode}`, mode);

    const getColorModeLabel = (mode: ColorCandidate['system']['mode']) => tPlan(`colorModes.${mode}`, mode);

    const getColorCandidateLabel = (candidate: ColorCandidate) => (
        isSpanish ? candidate.labelEs || candidate.label : candidate.label
    );

    const getColorWarning = (warning?: string) => {
        if (!warning) return undefined;
        const key = COLOR_WARNING_KEYS[warning];
        return key ? tPlan(`colorWarnings.${key}`, warning) : warning;
    };

    const setPlan = (patch: Partial<WebsitePlan>) => onPlanChange({ ...plan, ...patch });

    const setBusinessField = (field: keyof WebsitePlan['businessProfile'], value: any) => {
        setPlan({ businessProfile: { ...plan.businessProfile, [field]: value } });
    };

    const setBrandColor = (key: typeof COLOR_KEYS[number], value: string) => {
        const colorBrief = plan.brandProfile.colorBrief || createColorBriefFromWebsitePlan(plan);
        setPlan({
            brandProfile: {
                ...plan.brandProfile,
                colors: { ...plan.brandProfile.colors, [key]: value },
                colorBrief: {
                    ...colorBrief,
                    lockedColors: { ...(colorBrief.lockedColors || {}), [key]: value },
                },
                selectedColorCandidateId: 'manual',
            },
        });
    };

    const selectColorCandidate = (candidate: ColorCandidate) => {
        const existingCandidates = plan.brandProfile.colorCandidates || [];
        const colorCandidates = existingCandidates.some(item => item.id === candidate.id)
            ? existingCandidates.map(item => item.id === candidate.id ? candidate : item)
            : [candidate, ...existingCandidates];

        setPlan({
            brandProfile: {
                ...plan.brandProfile,
                colors: candidate.system.colors,
                isDarkTheme: candidate.system.mode === 'dark',
                colorBrief: reviewColorBrief,
                colorCandidates,
                selectedColorCandidateId: candidate.id,
            },
        });
    };

    const regenerateColorCandidates = () => {
        const colorBrief = buildReviewColorBrief({
            ...plan,
            brandProfile: {
                ...plan.brandProfile,
                selectedColorCandidateId: undefined,
                colorCandidates: undefined,
            },
        });
        const candidates = generateColorCandidates(colorBrief);
        const best = selectBestColorSystem(candidates);
        setPlan({
            brandProfile: {
                ...plan.brandProfile,
                colors: best.colors,
                isDarkTheme: best.mode === 'dark',
                colorBrief,
                colorCandidates: candidates,
                selectedColorCandidateId: best.id,
            },
        });
    };

    const setComponents = (components: PageSection[]) => {
        setPlan({
            componentPlan: components.map(component => {
                const previous = plan.componentPlan.find(item => item.component === component);
                return previous || {
                    component,
                    reason: componentLabels.get(component) || tPlan('selectedByUser', 'Selected by user.'),
                    confidence: 1,
                    source: 'user' as const,
                };
            }),
        });
    };

    const removeComponent = (component: PageSection) => {
        setComponents(selectedComponents.filter(item => item !== component));
    };

    const setAssetSource = (targetPath: string, source: 'existing' | 'generate' | 'none', existingUrl?: string) => {
        setPlan({
            assetPlan: plan.assetPlan.map(asset => (
                asset.targetPath === targetPath
                    ? { ...asset, source, existingUrl: source === 'existing' ? existingUrl || asset.existingUrl : undefined }
                    : asset
            )),
        });
    };

    const useDetectedImage = (url: string) => {
        const targetAsset = plan.assetPlan.find(asset => asset.source !== 'existing') || plan.assetPlan[0];
        if (!targetAsset) return;
        setAssetSource(targetAsset.targetPath, 'existing', url);
    };

    const colorCandidates = plan.brandProfile.colorCandidates || [];
    const importedPaletteCandidates = useMemo(() => createImportedPaletteCandidates(reviewColorBrief), [reviewColorBrief]);
    const importedColorSignals = [
        ...(reviewColorBrief.importedColors || []),
        ...(reviewColorBrief.logoColors || []),
        ...(reviewColorBrief.imageColors || []),
    ].filter((signal, index, all) => (
        signal?.color &&
        all.findIndex(other => `${other.color}-${other.roleGuess || ''}`.toLowerCase() === `${signal.color}-${signal.roleGuess || ''}`.toLowerCase()) === index
    ));
    const colorControlPaletteColors = [
        ...COLOR_KEYS.map(key => plan.brandProfile.colors[key]),
        ...importedColorSignals.map(signal => signal.color),
        ...importedPaletteCandidates.flatMap(candidate => candidate.preview),
        ...colorCandidates.flatMap(candidate => candidate.preview),
    ].filter((color, index, all): color is string => (
        Boolean(color) &&
        all.findIndex(item => String(item).toLowerCase() === String(color).toLowerCase()) === index
    ));
    const hasEcommerceColorPreview = Boolean(
        plan.businessProfile.hasEcommerce ||
        plan.componentPlan.some(item => ['announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'saleCountdown', 'productReviews', 'productBundle'].includes(item.component))
    );

    return (
        <div className="fixed inset-0 z-[10000] bg-q-text/70 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 lg:p-4">
            <div className="w-full h-full min-h-0 bg-q-bg border-0 shadow-2xl overflow-hidden flex flex-col sm:h-[calc(100vh-1.5rem)] sm:w-[calc(100vw-1.5rem)] sm:rounded-2xl sm:border sm:border-q-border lg:h-[calc(100vh-2rem)] lg:w-[calc(100vw-2rem)] lg:max-h-[940px] lg:max-w-[1440px]">
                <div className="flex shrink-0 items-center justify-between px-4 lg:px-6 py-3 border-b border-q-border bg-q-surface/60">
                    <div className="min-w-0">
                        <h2 className="text-base lg:text-lg font-semibold text-q-text flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-q-accent" />
                            {tPlan('title', 'Website plan')}
                        </h2>
                        <p className="text-xs text-q-text-secondary truncate">
                            {plan.businessProfile.businessName || tPlan('newWebsite', 'New website')} · {plan.businessProfile.industry || tPlan('industryPending', 'Industry pending')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 disabled:opacity-30"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] gap-4 lg:gap-6">
                        <div className="space-y-4">
                            <ReviewSection title={tPlan('sections.business', 'Business')} icon={<Building2 size={15} />}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <TextInput label={tPlan('fields.name', 'Name')} value={plan.businessProfile.businessName} onChange={value => setBusinessField('businessName', value)} />
                                    <TextInput label={tPlan('fields.industry', 'Industry')} value={plan.businessProfile.industry} onChange={value => setBusinessField('industry', value)} />
                                </div>
                                <TextArea label={tPlan('fields.description', 'Description')} value={plan.businessProfile.description} onChange={value => setBusinessField('description', value)} />
                                <TextInput label={tPlan('fields.tagline', 'Tagline')} value={plan.businessProfile.tagline || ''} onChange={value => setBusinessField('tagline', value)} />
                                {plan.businessProfile.services.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {plan.businessProfile.services.map((service, index) => (
                                            <span key={`${service.name}-${index}`} className="px-2 py-1 rounded-md bg-q-surface border border-q-border text-[11px] text-q-text-secondary">
                                                {service.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </ReviewSection>

                            <ReviewSection title={tPlan('sections.colorExpert', 'Color Expert')} icon={<Sparkles size={15} />}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-q-text-secondary">{tPlan('colorExpert.description', 'Validated website color systems. The selected option becomes the final global color source.')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regenerateColorCandidates}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-q-border px-2.5 py-1.5 text-[11px] text-q-text-secondary hover:text-q-accent hover:border-q-accent/50"
                                    >
                                        <RefreshCw size={12} />
                                        {tPlan('actions.regenerate', 'Regenerate')}
                                    </button>
                                </div>
                                {importedColorSignals.length > 0 && (
                                    <div className="rounded-lg border border-q-border bg-q-surface/60 p-2">
                                        <p className="mb-2 text-[10px] uppercase tracking-wider text-q-text-secondary">{tPlan('colorExpert.detectedColors', 'Detected colors used by Color Expert')}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {importedColorSignals.slice(0, 14).map((signal, index) => (
                                                <span
                                                    key={`${signal.color}-${signal.roleGuess || 'color'}-${index}`}
                                                    className="inline-flex items-center gap-1 rounded-md border border-q-border bg-q-bg px-1.5 py-1 text-[10px] text-q-text-secondary"
                                                    title={`${signal.label || signal.source}: ${signal.color}`}
                                                >
                                                    <span className="h-3.5 w-3.5 rounded border border-q-border/10" style={{ backgroundColor: signal.color }} />
                                                    <span>{tPlan(`colorRoles.${signal.roleGuess || signal.source}`, signal.roleGuess || signal.source)}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {importedPaletteCandidates.length > 0 && (
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-q-text-secondary">{tPlan('colorExpert.importedPalette', 'Imported website palette')}</p>
                                            <p className="text-[11px] text-q-text-secondary">
                                                {tPlan('colorExpert.importedPaletteHint', 'Choose the original detected palette or a lightly improved version that keeps the same brand identity.')}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {importedPaletteCandidates.map(candidate => (
                                                <ColorCandidateButton
                                                    key={candidate.id}
                                                    candidate={candidate}
                                                    active={plan.brandProfile.selectedColorCandidateId === candidate.id}
                                                    hasEcommerce={hasEcommerceColorPreview}
                                                    label={getColorCandidateLabel(candidate)}
                                                    modeLabel={getColorModeLabel(candidate.system.mode)}
                                                    warning={getColorWarning(candidate.system.warnings[0])}
                                                    onClick={() => selectColorCandidate(candidate)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {colorCandidates.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-wider text-q-text-secondary">{tPlan('colorExpert.expertAlternatives', 'Expert alternatives')}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {colorCandidates.slice(0, 6).map(candidate => (
                                                <ColorCandidateButton
                                                    key={candidate.id}
                                                    candidate={candidate}
                                                    active={plan.brandProfile.selectedColorCandidateId === candidate.id}
                                                    hasEcommerce={hasEcommerceColorPreview}
                                                    label={getColorCandidateLabel(candidate)}
                                                    modeLabel={getColorModeLabel(candidate.system.mode)}
                                                    warning={getColorWarning(candidate.system.warnings[0])}
                                                    onClick={() => selectColorCandidate(candidate)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={regenerateColorCandidates}
                                        className="w-full rounded-lg border border-dashed border-q-border px-3 py-3 text-xs text-q-text-secondary hover:border-q-accent/50 hover:text-q-accent"
                                    >
                                        {tPlan('colorExpert.generateExpertPalettes', 'Generate expert palettes')}
                                    </button>
                                )}
                            </ReviewSection>

                            <ReviewSection title={tPlan('sections.brand', 'Brand')} icon={<Palette size={15} />}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {COLOR_KEYS.map(key => (
                                        <ColorControl
                                            key={key}
                                            label={tPlan(`colorKeys.${key}`, key)}
                                            value={plan.brandProfile.colors[key] || '#000000'}
                                            onChange={value => setBrandColor(key, value)}
                                            paletteColors={colorControlPaletteColors}
                                            variant="editor"
                                        />
                                    ))}
                                </div>
                            </ReviewSection>

                            <ReviewSection title={tPlan('sections.components', 'Components')} icon={<LayoutTemplate size={15} />}>
                                <div className="flex flex-wrap gap-[4px]">
                                    <SortableComponentChips items={selectedComponents} onChange={setComponents} onRemove={removeComponent} />
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddMenu(value => !value)}
                                            className="inline-flex items-center justify-center h-[24px] px-2 rounded border border-dashed border-q-border text-q-text-secondary hover:border-q-accent/50 hover:text-q-accent text-[10px]"
                                        >
                                            <Plus size={11} />
                                        </button>
                                        {showAddMenu && availableToAdd.length > 0 && (
                                            <div className="absolute left-0 top-full mt-1 z-20 bg-q-surface border border-q-border rounded-lg shadow-2xl max-h-56 overflow-y-auto w-56 custom-scrollbar py-1">
                                                {availableToAdd.map(component => (
                                                    <button
                                                        key={component.key}
                                                        type="button"
                                                        onClick={() => {
                                                            setComponents([...selectedComponents, component.key]);
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-[11px] text-q-text-secondary hover:bg-q-accent/10 hover:text-q-accent"
                                                    >
                                                        {component.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ReviewSection>

                            <ReviewSection title={tPlan('sections.importedPages', 'Imported Pages')} icon={<FileText size={15} />}>
                                {plan.contentMap.pages.length > 0 ? (
                                    <div className="grid gap-2">
                                        {plan.contentMap.pages.slice(0, 8).map((page, index) => (
                                            <div key={`${page.url || page.title}-${index}`} className="rounded-lg border border-q-border bg-q-surface px-3 py-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-medium text-q-text truncate">{page.title}</span>
                                                    <span className="text-[10px] text-q-accent bg-q-accent/10 rounded px-1.5 py-0.5">{page.purpose}</span>
                                                </div>
                                                {page.summary && <p className="mt-1 text-[11px] text-q-text-secondary line-clamp-2">{page.summary}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-q-text-secondary">{tPlan('empty.noImportedPages', 'No imported pages.')}</p>
                                )}
                            </ReviewSection>
                        </div>

                        <div className="space-y-4">
                            <ReviewSection title={tPlan('sections.mode', 'Mode')} icon={<Sparkles size={15} />}>
                                <AppSelect
                                    value={plan.generationMode}
                                    onChange={event => setPlan({ generationMode: event.target.value as WebsitePlan['generationMode'] })}
                                    className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
                                >
                                    {GENERATION_MODES.map(mode => (
                                        <option key={mode} value={mode}>{getModeLabel(mode)}</option>
                                    ))}
                                </AppSelect>
                            </ReviewSection>

                            <ReviewSection title={tPlan('sections.assets', 'Assets')} icon={<Image size={15} />}>
                                {plan.assetPlan.length > 0 ? (
                                    <div className="space-y-2">
                                        {plan.assetPlan.map(asset => (
                                            <div key={asset.targetPath} className="rounded-lg border border-q-border bg-q-surface p-3 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] text-q-text font-medium truncate">{asset.targetPath}</span>
                                                    <span className="text-[10px] text-q-text-secondary">{asset.aspectRatio}</span>
                                                </div>
                                                {asset.existingUrl && (
                                                    <img src={asset.existingUrl} alt="" className="h-20 w-full object-cover rounded-md border border-q-border" />
                                                )}
                                                <div className="grid grid-cols-3 gap-1">
                                                    <AssetButton active={asset.source === 'existing'} onClick={() => setAssetSource(asset.targetPath, 'existing', asset.existingUrl)}>
                                                        {tPlan('assetActions.reuse', 'Reuse')}
                                                    </AssetButton>
                                                    <AssetButton active={asset.source === 'generate'} onClick={() => setAssetSource(asset.targetPath, 'generate')}>
                                                        {tPlan('assetActions.generate', 'Generate')}
                                                    </AssetButton>
                                                    <AssetButton active={asset.source === 'none'} onClick={() => setAssetSource(asset.targetPath, 'none')}>
                                                        {tPlan('assetActions.none', 'None')}
                                                    </AssetButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-q-text-secondary">{tPlan('empty.noImageSlots', 'No image slots planned.')}</p>
                                )}
                            </ReviewSection>

                            {plan.contentMap.extractedImages?.length ? (
                                <ReviewSection title={tPlan('sections.detectedImages', 'Detected Images')} icon={<Image size={15} />}>
                                    <div className="grid grid-cols-3 gap-2">
                                        {plan.contentMap.extractedImages.slice(0, 12).map((image, index) => (
                                            <button
                                                key={`${image.url}-${index}`}
                                                type="button"
                                                onClick={() => useDetectedImage(image.url)}
                                                className="group relative aspect-square overflow-hidden rounded-lg border border-q-border bg-q-surface"
                                                title={image.recommendedUse || image.alt || tPlan('detectedImage', 'Detected image')}
                                            >
                                                <img src={image.url} alt={image.alt || ''} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                                <span className="absolute inset-x-1 bottom-1 rounded bg-q-text/70 px-1 py-0.5 text-[9px] text-white truncate">
                                                    {image.recommendedUse || tPlan('assetActions.reuseShort', 'reuse')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </ReviewSection>
                            ) : null}

                            {plan.contentMap.missingOpportunities?.length ? (
                                <ReviewSection title={tPlan('sections.opportunities', 'Opportunities')} icon={<Sparkles size={15} />}>
                                    <div className="space-y-1">
                                        {plan.contentMap.missingOpportunities.slice(0, 6).map((item, index) => (
                                            <div key={index} className="flex items-start gap-2 text-xs text-q-text-secondary">
                                                <Sparkles className="w-3 h-3 mt-0.5 text-q-accent flex-shrink-0" />
                                                <span>{String(item)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ReviewSection>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 px-4 lg:px-6 py-3 border-t border-q-border bg-q-surface/60 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-q-border px-4 py-2 text-sm text-q-text-secondary hover:text-q-text hover:bg-q-surface disabled:opacity-40"
                    >
                        <MessageSquare className="w-4 h-4" />
                        {tPlan('actions.backToChat', 'Back to chat')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(plan)}
                        disabled={isGenerating || selectedComponents.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-q-accent px-5 py-2 text-sm font-semibold text-q-text-on-accent hover:opacity-90 disabled:opacity-40"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {tPlan('actions.generate', 'Generate')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReviewSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="rounded-xl border border-q-border bg-q-bg/70 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-q-text">
            <span className="text-q-accent">{icon}</span>
            {title}
        </div>
        {children}
    </section>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <label className="block space-y-1">
        <span className="text-[10px] uppercase text-q-text-secondary">{label}</span>
        <input
            value={value || ''}
            onChange={event => onChange(event.target.value)}
            className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
        />
    </label>
);

const TextArea: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <label className="block space-y-1">
        <span className="text-[10px] uppercase text-q-text-secondary">{label}</span>
        <textarea
            value={value || ''}
            onChange={event => onChange(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
        />
    </label>
);

const AssetButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
            active
                ? 'bg-q-accent text-q-text-on-accent'
                : 'bg-q-bg text-q-text-secondary hover:text-q-text border border-q-border'
        }`}
    >
        {children}
    </button>
);

const ColorCandidateButton: React.FC<{
    candidate: ColorCandidate;
    active: boolean;
    hasEcommerce: boolean;
    label: string;
    modeLabel: string;
    warning?: string;
    onClick: () => void;
}> = ({ candidate, active, hasEcommerce, label, modeLabel, warning, onClick }) => {
    const colors = candidate.system.colors;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-xl border p-3 text-left transition-all ${
                active
                    ? 'border-q-accent bg-q-accent/10 ring-1 ring-q-accent/40'
                    : 'border-q-border bg-q-surface hover:border-q-accent/50'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-q-text truncate">{label}</p>
                    <p className="mt-0.5 text-[10px] text-q-text-secondary">{candidate.system.score} · {modeLabel}</p>
                </div>
                <div className="flex gap-1">
                    {candidate.preview.slice(0, 5).map((color, index) => (
                        <span key={`${candidate.id}-${color}-${index}`} className="h-4 w-4 rounded border border-q-border/10" style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-q-border/10" style={{ backgroundColor: colors.background }}>
                <div className="p-2">
                    <div className="h-2.5 w-2/3 rounded" style={{ backgroundColor: colors.heading }} />
                    <div className="mt-1.5 h-2 w-1/2 rounded opacity-80" style={{ backgroundColor: colors.text }} />
                    <div className="mt-2 inline-flex rounded px-2 py-1 text-[9px] font-semibold" style={{ backgroundColor: colors.primary, color: candidate.system.mode === 'dark' ? '#111827' : '#ffffff' }}>
                        CTA
                    </div>
                </div>
                <div className="mx-2 mb-2 rounded-md p-2" style={{ backgroundColor: colors.surface, color: colors.text }}>
                    <div className="flex items-center justify-between gap-2">
                        <span className="h-2 w-14 rounded" style={{ backgroundColor: colors.text }} />
                        <span className="h-4 w-8 rounded" style={{ backgroundColor: hasEcommerce ? colors.error : colors.accent }} />
                    </div>
                    {hasEcommerce && (
                        <div className="mt-2 flex items-center gap-1">
                            <span className="text-[9px]" style={{ color: colors.accent }}>★★★★★</span>
                            <span className="h-2 w-10 rounded" style={{ backgroundColor: colors.textMuted }} />
                        </div>
                    )}
                </div>
            </div>
            {warning && (
                <p className="mt-2 text-[10px] text-q-text-secondary line-clamp-1">{warning}</p>
            )}
        </button>
    );
};
