import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Loader2, Wand2, Download, ChevronDown, CheckCircle2, Zap,
    Sparkles, Film, Upload, X, Volume2, VolumeX, Settings2,
    Square, RectangleHorizontal, RectangleVertical, Monitor, Maximize2,
    Image as ImageIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSafeAI } from '../../contexts/ai';
import { useAuth } from '../../contexts/core/AuthContext';
import { useVideoModels, getModelCapabilities } from '../../hooks/useVideoModels';
import { calculateVideoGenerationCredits, CURATED_VIDEO_MODELS, estimateOpenRouterVideoCostUsd, estimateVideoUserSpendUsd } from '../../constants/curatedVideoModels';
import { normalizeReferenceImagesForGeneration } from '../../utils/imageReferenceHelpers';
import ProgressBar3D from '../ui/ProgressBar3D';
import FrameImagePicker from './shared/FrameImagePicker';
import DynamicPassthroughControls from './shared/DynamicPassthroughControls';
import type { MediaCategory } from '../../types/media';
import type { VideoFrameType } from '../../types/videoGeneration';
import { useSafeMedia } from '../../contexts/media';
import { useSafeFiles } from '../../contexts/files';
import {
    MEDIA_GENERATOR_LAUNCH_EVENT,
    consumeMediaGeneratorLaunchRequest,
    readMediaGeneratorLaunchEvent,
} from '../../utils/mediaGeneratorLaunch';
import { CollapsibleSection, CollapsiblePanelHeader, useCollapsibleSections } from '../ui/CollapsibleSection';

export interface VideoGenerationSectionProps {
    destination: 'user' | 'global' | 'admin';
    adminCategory?: string;
    projectId?: string;
    className?: string;
    hidePreview?: boolean;
    initialStartFrame?: string;
    initialEndFrame?: string;
    sessionImages?: string[];
    onVideoGenerated?: (url: string) => void;
    onUseVideo?: (url: string) => void;
}

const getAspectRatioIcon = (ratio: string) => {
    const [rawWidth, rawHeight] = ratio.split(':').map(Number);
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth === rawHeight) {
        return Square;
    }
    return rawWidth > rawHeight ? RectangleHorizontal : RectangleVertical;
};

const normalizeVideoImageInput = async (url: string): Promise<string> => {
    if (!url || /^https?:\/\//.test(url)) return url;
    return (await normalizeReferenceImagesForGeneration([url]))[0] || url;
};

const VideoGenerationSection: React.FC<VideoGenerationSectionProps> = ({
    destination,
    adminCategory,
    projectId,
    className = '',
    hidePreview = false,
    initialStartFrame,
    initialEndFrame,
    sessionImages = [],
    onVideoGenerated,
    onUseVideo,
}) => {
    const { t } = useTranslation();
    const ai = useSafeAI();
    const generateVideo = ai?.generateVideo || (async () => {
        throw new Error('AIProvider is not available yet.');
    });
    const { user } = useAuth();
    const { models, availableModels, loading: modelsLoading } = useVideoModels();
    const mediaCtx = useSafeMedia();
    const filesCtx = useSafeFiles();

    const [prompt, setPrompt] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [duration, setDuration] = useState<number | undefined>(undefined);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [showAspectRatioSelector, setShowAspectRatioSelector] = useState(false);
    const [resolution, setResolution] = useState('720p');
    const [showResolutionSelector, setShowResolutionSelector] = useState(false);
    const [size, setSize] = useState('');
    const [showSizeSelector, setShowSizeSelector] = useState(false);
    const [generateAudio, setGenerateAudio] = useState(true);
    const [seed, setSeed] = useState<string>('');
    const [startFrame, setStartFrame] = useState<string | null>(initialStartFrame || null);
    const [endFrame, setEndFrame] = useState<string | null>(initialEndFrame || null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [negativePrompt, setNegativePrompt] = useState('');
    const [passthroughValues, setPassthroughValues] = useState<Record<string, unknown>>({});
    const [isReferenceDragging, setIsReferenceDragging] = useState(false);
    const referenceInputRef = useRef<HTMLInputElement>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);
    const lastAppliedModelRef = useRef<string>('');

    useEffect(() => {
        if (initialStartFrame) setStartFrame(initialStartFrame);
    }, [initialStartFrame]);

    useEffect(() => {
        if (initialEndFrame) setEndFrame(initialEndFrame);
    }, [initialEndFrame]);

    useEffect(() => {
        const runLaunchRequest = (request: ReturnType<typeof readMediaGeneratorLaunchEvent>) => {
            if (!request || request.mode !== 'video') return;
            if (request.projectId && (!projectId || request.projectId !== projectId)) return;

            setPrompt(request.prompt);
            if (request.options?.aspectRatio) {
                setAspectRatio(request.options.aspectRatio);
            }
            if (request.options?.resolution) {
                setResolution(request.options.resolution);
            }
        };

        runLaunchRequest(consumeMediaGeneratorLaunchRequest('video', projectId));

        const handleLaunchEvent = (event: Event) => {
            runLaunchRequest(readMediaGeneratorLaunchEvent(event));
        };

        window.addEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleLaunchEvent);
        return () => window.removeEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleLaunchEvent);
    }, [projectId]);

    useEffect(() => {
        if (selectedModelId) return;
        const first = availableModels[0] || models.find(m => !m.comingSoon);
        if (first) setSelectedModelId(first.id);
        else if (models[0]) setSelectedModelId(models[0].id);
    }, [models, availableModels, selectedModelId]);

    const capabilities = useMemo(
        () => getModelCapabilities(models, selectedModelId),
        [models, selectedModelId]
    );

    const maxReferenceImages = capabilities?.max_input_references || 4;
    const supportsEndFrame = capabilities?.supported_frame_images?.includes('last_frame') ?? capabilities?.supports_frame_images !== false;

    const availableSizes = useMemo(() => {
        const sizes = capabilities?.supported_sizes || [];
        if (sizes.length === 0) return [];
        const ratioParts = aspectRatio.split(':').map(Number);
        const targetRatio = ratioParts.length === 2 && ratioParts.every(Number.isFinite)
            ? ratioParts[0] / ratioParts[1]
            : null;
        const resolutionToken = resolution.toLowerCase().includes('4k')
            ? '2160'
            : resolution.match(/\d+/)?.[0] || '';

        const filtered = sizes.filter(value => {
            const match = value.match(/^(\d+)x(\d+)$/);
            if (!match) return true;
            const width = Number(match[1]);
            const height = Number(match[2]);
            const ratioMatches = !targetRatio || Math.abs((width / height) - targetRatio) < 0.03;
            const resolutionMatches = !resolutionToken || value.includes(resolutionToken);
            return ratioMatches && resolutionMatches;
        });

        return filtered.length > 0 ? filtered : sizes;
    }, [aspectRatio, capabilities?.supported_sizes, resolution]);

    const curatedMeta = useMemo(
        () => CURATED_VIDEO_MODELS.find(m => m.openRouterId === selectedModelId || models.some(x => x.id === selectedModelId && m.id === 'gemini-omni' && x.id.includes('omni'))),
        [selectedModelId, models]
    );

    const selectedCreditCost = selectedModelId
        ? calculateVideoGenerationCredits({
            modelId: selectedModelId,
            duration,
            resolution,
            size: size || undefined,
            aspectRatio,
            generateAudio,
            pricingSkus: capabilities?.pricing_skus,
        })
        : null;

    const estimatedProviderCost = selectedModelId
        ? estimateOpenRouterVideoCostUsd({
            modelId: selectedModelId,
            duration,
            resolution,
            size: size || undefined,
            aspectRatio,
            generateAudio,
            pricingSkus: capabilities?.pricing_skus,
        })
        : null;

    useEffect(() => {
        if (!capabilities || !selectedModelId || lastAppliedModelRef.current === selectedModelId) return;

        lastAppliedModelRef.current = selectedModelId;

        if (capabilities.supported_durations?.length) {
            setDuration(capabilities.supported_durations[0]);
        } else {
            setDuration(undefined);
        }

        if (capabilities.supported_aspect_ratios?.length) {
            setAspectRatio(
                capabilities.supported_aspect_ratios.includes('16:9')
                    ? '16:9'
                    : capabilities.supported_aspect_ratios[0]
            );
        }

        if (capabilities.supported_resolutions?.length) {
            setResolution(
                capabilities.supported_resolutions.includes('720p')
                    ? '720p'
                    : capabilities.supported_resolutions[0]
            );
        }

        setGenerateAudio(Boolean(capabilities.supports_generate_audio));
        if (capabilities.supports_seed === false) setSeed('');

        const supportedFrames = capabilities.supported_frame_images || [];
        if (capabilities.supports_frame_images === false || supportedFrames.length === 0) {
            setStartFrame(null);
            setEndFrame(null);
        } else if (!supportedFrames.includes('last_frame')) {
            setEndFrame(null);
        }

        if (!capabilities.supports_input_references) {
            setReferenceImages([]);
        } else if (capabilities.max_input_references != null) {
            setReferenceImages(prev => prev.slice(0, capabilities.max_input_references));
        }

        setNegativePrompt('');
        setPassthroughValues({});
    }, [capabilities, selectedModelId]);

    useEffect(() => {
        if (availableSizes.length === 0) {
            setSize('');
            return;
        }
        setSize(prev => availableSizes.includes(prev) ? prev : availableSizes[0]);
    }, [availableSizes]);

    useEffect(() => {
        const handleAddRef = (e: Event) => {
            const url = (e as CustomEvent<string>).detail;
            if (!url) return;
            setReferenceImages(prev => (prev.includes(url) || prev.length >= maxReferenceImages ? prev : [...prev, url]));
        };
        window.addEventListener('assets:add-reference-image', handleAddRef);
        return () => window.removeEventListener('assets:add-reference-image', handleAddRef);
    }, [maxReferenceImages]);

    const handlePickFromSession = (url: string, type: VideoFrameType) => {
        if (type === 'first_frame') setStartFrame(url);
        else setEndFrame(url);
    };

    const addReferenceImage = (url: string) => {
        if (!url) return;
        setReferenceImages(prev => (
            prev.includes(url) || prev.length >= maxReferenceImages
                ? prev
                : [...prev, url]
        ));
    };

    const addReferenceImages = (urls: string[]) => {
        const cleanUrls = urls.filter(Boolean);
        if (cleanUrls.length === 0) return;

        setReferenceImages(prev => {
            const next = [...prev];
            for (const url of cleanUrls) {
                if (next.length >= maxReferenceImages) break;
                if (!next.includes(url)) next.push(url);
            }
            return next;
        });
    };

    const handleReferenceUpload = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => addReferenceImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleReferenceFiles = (files: FileList | File[]) => {
        Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .slice(0, Math.max(0, maxReferenceImages - referenceImages.length))
            .forEach(handleReferenceUpload);
    };

    const handleReferenceDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsReferenceDragging(true);
    };

    const handleReferenceDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsReferenceDragging(false);
        }
    };

    const handleReferenceDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsReferenceDragging(false);

        const transfer = e.dataTransfer;
        const draggedRefs = [
            transfer.getData('application/x-library-image-base64'),
            transfer.getData('application/x-library-image'),
            transfer.getData('text/uri-list'),
            transfer.getData('text/plain'),
        ].filter(value => value && (value.startsWith('data:image/') || /^https?:\/\//.test(value)));

        if (draggedRefs.length > 0) {
            addReferenceImages(draggedRefs);
            return;
        }

        if (transfer.files && transfer.files.length > 0) {
            handleReferenceFiles(transfer.files);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !selectedModelId || capabilities?.comingSoon) return;

        setIsGenerating(true);
        setGenerationProgress(8);
        setStatusMessage(t('mediaGeneration.submitting', { defaultValue: 'Submitting...' }));
        setGeneratedVideo(null);
        setSavedVideoUrl(null);

        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => (prev >= 92 ? prev : prev + 2));
        }, 4000);

        try {
            const submitDuration = capabilities?.supported_durations?.length
                ? (duration != null && capabilities.supported_durations.includes(duration) ? duration : capabilities.supported_durations[0])
                : duration;
            const submitAspectRatio = capabilities?.supported_aspect_ratios?.length
                ? (capabilities.supported_aspect_ratios.includes(aspectRatio) ? aspectRatio : capabilities.supported_aspect_ratios[0])
                : aspectRatio;
            const submitResolution = capabilities?.supported_resolutions?.length
                ? (capabilities.supported_resolutions.includes(resolution) ? resolution : capabilities.supported_resolutions[0])
                : resolution;
            const submitSize = availableSizes.length > 0
                ? (availableSizes.includes(size) ? size : availableSizes[0])
                : undefined;

            const frameImages = capabilities?.supports_frame_images === false
                ? []
                : [
                    startFrame ? { url: startFrame, frameType: 'first_frame' as const } : null,
                    endFrame ? { url: endFrame, frameType: 'last_frame' as const } : null,
                ].filter(Boolean) as { url: string; frameType: 'first_frame' | 'last_frame' }[];

            const normalizedFrames = await Promise.all(
                frameImages.map(async f => ({
                    ...f,
                    url: await normalizeVideoImageInput(f.url),
                }))
            );

            const normalizedRefs = capabilities?.supports_input_references && referenceImages.length > 0
                ? await Promise.all(referenceImages.map(normalizeVideoImageInput))
                : [];

            const providerParameters = { ...passthroughValues };
            if (negativePrompt.trim() && !providerParameters.negativePrompt) {
                providerParameters.negativePrompt = negativePrompt.trim();
            }

            setStatusMessage(t('mediaGeneration.generatingVideo', { defaultValue: 'Generating video...' }));

            const videoUrl = await generateVideo(prompt, {
                model: selectedModelId,
                duration: submitDuration,
                resolution: submitSize ? undefined : submitResolution,
                aspectRatio: submitSize ? undefined : submitAspectRatio,
                size: submitSize,
                generateAudio: capabilities?.supports_generate_audio ? generateAudio : undefined,
                seed: seed ? parseInt(seed, 10) : undefined,
                frameImages: normalizedFrames,
                inputReferences: normalizedRefs.length > 0 ? normalizedRefs : undefined,
                negativePrompt: negativePrompt.trim() || undefined,
                providerParameters: Object.keys(providerParameters).length > 0 ? providerParameters : undefined,
                pricingSkus: capabilities?.pricing_skus,
                onProgress: (poll) => {
                    const status = `${poll.status || ''}`.toLowerCase();
                    if (status === 'pending') {
                        setGenerationProgress(prev => Math.max(prev, 18));
                        setStatusMessage(t('mediaGeneration.pollingStatus', { defaultValue: 'Queued. Waiting for provider...' }));
                    } else if (status === 'in_progress' || status === 'processing') {
                        setGenerationProgress(prev => Math.min(Math.max(prev + 3, 28), 94));
                        setStatusMessage(t('mediaGeneration.generatingVideo', { defaultValue: 'Generating video...' }));
                    } else if (status === 'completed' || status === 'complete' || status === 'succeeded' || status === 'success') {
                        setGenerationProgress(96);
                        setStatusMessage(t('mediaGeneration.videoReady', { defaultValue: 'Video ready. Saving...' }));
                    } else if (status) {
                        setStatusMessage(`OpenRouter: ${status}`);
                    }
                },
                destination,
                adminCategory: adminCategory as MediaCategory | undefined,
                adminTags: ['ai-video', submitAspectRatio],
                adminDescription: prompt,
                projectId,
            });

            setGeneratedVideo(videoUrl);
            setSavedVideoUrl(videoUrl);
            setGenerationProgress(100);
            onVideoGenerated?.(videoUrl);

            if (destination === 'admin' && mediaCtx) await mediaCtx.fetchMediaAssets();
            else if (destination === 'global' && filesCtx) await filesCtx.fetchGlobalFiles();
            else if (filesCtx) await filesCtx.refreshFiles();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error
                ? error.message
                : t('mediaGeneration.generationFailed', { defaultValue: 'Video generation failed' });
            alert(message);
        } finally {
            clearInterval(progressInterval);
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const modelLabel = (modelId: string) => {
        const curated = CURATED_VIDEO_MODELS.find(c => c.openRouterId === modelId);
        if (curated) return t(curated.labelKey, { defaultValue: curated.id });
        const cap = getModelCapabilities(models, modelId);
        return cap?.name || modelId;
    };

    const selectedComingSoon = capabilities?.comingSoon || (capabilities && !capabilities.available);

    const { openSections, toggle, expandAll, collapseAll } = useCollapsibleSections({
        model: true,
        output: true,
        frames: true,
        advanced: false,
    });

    return (
        <div className={`flex flex-col h-full overflow-hidden bg-q-bg text-q-text ${className}`}>
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* Controls sidebar */}
                <aside className="order-2 md:order-2 w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-q-border/70 overflow-y-auto p-4 space-y-3 quimera-media-side-panel">
                    <CollapsiblePanelHeader
                        title={t('editor.configuration', { defaultValue: 'Configuration' })}
                        onExpandAll={expandAll}
                        onCollapseAll={collapseAll}
                    />
                    {/* Model selector */}
                    <CollapsibleSection
                        title={t('mediaGeneration.model', { defaultValue: 'Model' })}
                        icon={<Film size={14} />}
                        isOpen={openSections.model}
                        onToggle={() => toggle('model')}
                    >
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowModelSelector(!showModelSelector)}
                                disabled={modelsLoading}
                                className="w-full flex items-center justify-between gap-2 bg-q-bg border border-q-border rounded-xl px-3 py-2.5 text-sm"
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <Film size={16} className="text-q-accent shrink-0" />
                                    {modelsLoading ? '...' : modelLabel(selectedModelId)}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                            {showModelSelector && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowModelSelector(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-q-surface border border-q-border rounded-xl shadow-xl overflow-hidden">
                                        {models.map(model => {
                                            const curated = CURATED_VIDEO_MODELS.find(c =>
                                                c.openRouterId === model.id || (c.id === 'gemini-omni' && model.id.includes('omni'))
                                            );
                                            const disabled = model.comingSoon || !model.available;
                                            return (
                                                <button
                                                    key={model.id}
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => {
                                                        if (!disabled) {
                                                            setSelectedModelId(model.id);
                                                            setShowModelSelector(false);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-3 py-3 border-b border-q-border/50 last:border-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-q-bg'} ${selectedModelId === model.id ? 'bg-q-bg' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold">
                                                            {curated ? t(curated.labelKey, { defaultValue: curated.id }) : model.name}
                                                        </span>
                                                        {model.comingSoon && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-q-accent/20 text-q-accent">
                                                                {t('mediaGeneration.comingSoon', { defaultValue: 'Coming soon' })}
                                                            </span>
                                                        )}
                                                        {selectedModelId === model.id && !disabled && (
                                                            <CheckCircle2 size={14} className="text-q-accent" />
                                                        )}
                                                    </div>
                                                    {curated && (
                                                        <p className="text-[11px] text-q-text-secondary mt-0.5">
                                                            {t(curated.descriptionKey, { defaultValue: '' })}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {model.supports_generate_audio && (
                                                            <span className="rounded bg-q-accent/10 px-1.5 py-0.5 text-[10px] text-q-accent">
                                                                {t('mediaGeneration.badgeAudio', { defaultValue: 'Audio' })}
                                                            </span>
                                                        )}
                                                        {model.supports_frame_images !== false && (
                                                            <span className="rounded bg-q-accent/10 px-1.5 py-0.5 text-[10px] text-q-accent">
                                                                {t('mediaGeneration.badgeFrames', { defaultValue: 'Frames' })}
                                                            </span>
                                                        )}
                                                        {model.supports_input_references && (
                                                            <span className="rounded bg-q-accent/10 px-1.5 py-0.5 text-[10px] text-q-accent">
                                                                {t('mediaGeneration.badgeReferences', { defaultValue: 'Refs' })}
                                                            </span>
                                                        )}
                                                        {model.supported_durations?.length ? (
                                                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-q-text-secondary">
                                                                {model.supported_durations.map(d => `${d}s`).join('/')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title={t('mediaGeneration.outputSettings', { defaultValue: 'Output' })}
                        icon={<Monitor size={14} />}
                        isOpen={openSections.output}
                        onToggle={() => toggle('output')}
                    >
                        <div className="space-y-4">
                    {capabilities?.supported_durations && capabilities.supported_durations.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">{t('mediaGeneration.duration', { defaultValue: 'Duration' })}</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {capabilities.supported_durations.map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDuration(d)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${duration === d ? 'bg-q-accent text-primary-foreground border-transparent' : 'border-q-border text-q-text-secondary'}`}
                                    >
                                        {d}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {capabilities?.supported_aspect_ratios && capabilities.supported_aspect_ratios.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">{t('mediaGeneration.aspectRatio', { defaultValue: 'Aspect ratio' })}</label>
                            <div className="relative">
                                {(() => {
                                    const SelectedRatioIcon = getAspectRatioIcon(aspectRatio);
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowAspectRatioSelector(prev => !prev)}
                                            className="w-full flex items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-xs text-q-text transition-colors hover:border-q-accent/50"
                                        >
                                            <span className="flex items-center gap-2">
                                                <SelectedRatioIcon size={16} strokeWidth={2} className="text-q-accent" />
                                                <span className="font-bold">{aspectRatio}</span>
                                            </span>
                                            <ChevronDown size={15} className={`text-q-text-secondary transition-transform ${showAspectRatioSelector ? 'rotate-180' : ''}`} />
                                        </button>
                                    );
                                })()}
                                {showAspectRatioSelector && (
                                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-q-border bg-q-surface shadow-xl">
                                        {capabilities.supported_aspect_ratios.map(r => {
                                            const RatioIcon = getAspectRatioIcon(r);
                                            return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => {
                                                setAspectRatio(r);
                                                setShowAspectRatioSelector(false);
                                            }}
                                            title={r}
                                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                aspectRatio === r
                                                    ? 'bg-q-accent/10 text-q-accent'
                                                    : 'text-q-text-secondary hover:bg-q-bg hover:text-q-accent'
                                            }`}
                                        >
                                            <RatioIcon size={16} strokeWidth={2} />
                                            <span>{r}</span>
                                        </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {capabilities?.supported_resolutions && capabilities.supported_resolutions.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">{t('mediaGeneration.resolution', { defaultValue: 'Resolution' })}</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowResolutionSelector(prev => !prev)}
                                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-xs text-q-text transition-colors hover:border-q-accent/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Monitor size={16} strokeWidth={2} className="text-q-accent" />
                                        <span className="font-bold">{resolution}</span>
                                    </span>
                                    <ChevronDown size={15} className={`text-q-text-secondary transition-transform ${showResolutionSelector ? 'rotate-180' : ''}`} />
                                </button>
                                {showResolutionSelector && (
                                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-q-border bg-q-surface shadow-xl">
                                        {capabilities.supported_resolutions.map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => {
                                                    setResolution(r);
                                                    setShowResolutionSelector(false);
                                                }}
                                                title={r}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                    resolution === r
                                                        ? 'bg-q-accent/10 text-q-accent'
                                                        : 'text-q-text-secondary hover:bg-q-bg hover:text-q-accent'
                                                }`}
                                            >
                                                <Monitor size={16} strokeWidth={2} />
                                                <span>{r}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {availableSizes.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">{t('mediaGeneration.size', { defaultValue: 'Size' })}</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowSizeSelector(prev => !prev)}
                                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-xs text-q-text transition-colors hover:border-q-accent/50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Maximize2 size={16} strokeWidth={2} className="text-q-accent" />
                                        <span className="font-bold">{size || availableSizes[0]}</span>
                                    </span>
                                    <ChevronDown size={15} className={`text-q-text-secondary transition-transform ${showSizeSelector ? 'rotate-180' : ''}`} />
                                </button>
                                {showSizeSelector && (
                                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-q-border bg-q-surface shadow-xl">
                                        {availableSizes.map(value => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    setSize(value);
                                                    setShowSizeSelector(false);
                                                }}
                                                title={value}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                    (size || availableSizes[0]) === value
                                                        ? 'bg-q-accent/10 text-q-accent'
                                                        : 'text-q-text-secondary hover:bg-q-bg hover:text-q-accent'
                                                }`}
                                            >
                                                <Maximize2 size={16} strokeWidth={2} />
                                                <span>{value}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {capabilities?.supports_generate_audio && (
                        <button
                            type="button"
                            onClick={() => setGenerateAudio(!generateAudio)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium ${generateAudio ? 'border-q-accent/40 bg-q-accent/10 text-q-accent' : 'border-q-border text-q-text-secondary'}`}
                        >
                            <span className="flex items-center gap-2">
                                {generateAudio ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                {t('mediaGeneration.generateAudio', { defaultValue: 'Generate audio' })}
                            </span>
                            <span>{generateAudio ? 'ON' : 'OFF'}</span>
                        </button>
                    )}

                    {capabilities?.supports_seed !== false && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">{t('mediaGeneration.seed', { defaultValue: 'Seed' })}</label>
                            <input
                                type="number"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder={t('mediaGeneration.seedOptional', { defaultValue: 'Optional' })}
                                className="w-full bg-q-bg border border-q-border rounded-lg py-2 px-3 text-xs"
                            />
                        </div>
                    )}
                        </div>
                    </CollapsibleSection>

                    {(capabilities?.supports_frame_images !== false || capabilities?.supports_input_references) && (
                    <CollapsibleSection
                        title={t('mediaGeneration.framesAndReferences', { defaultValue: 'Frames & References' })}
                        icon={<ImageIcon size={14} />}
                        isOpen={openSections.frames}
                        onToggle={() => toggle('frames')}
                    >
                        <div className="space-y-4">
                    {capabilities?.supports_frame_images !== false && (
                        <FrameImagePicker
                            startFrame={startFrame}
                            endFrame={endFrame}
                            onStartFrameChange={setStartFrame}
                            onEndFrameChange={setEndFrame}
                            supportsEndFrame={supportsEndFrame}
                            sessionImages={sessionImages}
                            onPickFromSession={handlePickFromSession}
                        />
                    )}

                    {capabilities?.supports_input_references && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold text-q-text-secondary uppercase">
                                    {t('mediaGeneration.references', { defaultValue: 'Style references' })}
                                </label>
                                <span className="text-[10px] text-q-text-secondary">
                                    {referenceImages.length}/{maxReferenceImages}
                                </span>
                            </div>
                            <div
                                onDragOver={handleReferenceDragOver}
                                onDragLeave={handleReferenceDragLeave}
                                onDrop={handleReferenceDrop}
                                className={`rounded-xl border-2 border-dashed p-2 transition-colors ${
                                    isReferenceDragging
                                        ? 'border-q-accent bg-q-accent/10'
                                        : 'border-q-border bg-q-bg/30 hover:border-q-accent/50'
                                }`}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {referenceImages.map((url, i) => (
                                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-q-border">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setReferenceImages(prev => prev.filter((_, j) => j !== i))}
                                                className="absolute inset-0 bg-q-text/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {referenceImages.length < maxReferenceImages && (
                                        <button
                                            type="button"
                                            onClick={() => referenceInputRef.current?.click()}
                                            className="flex h-12 min-w-12 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-q-border px-3 text-q-text-secondary hover:border-q-accent/50 hover:text-q-accent"
                                            title={t('mediaGeneration.uploadReference', { defaultValue: 'Upload reference' })}
                                        >
                                            <Upload size={16} />
                                            <span className="text-[10px] font-medium">
                                                {t('mediaGeneration.dropReferences', { defaultValue: 'Drop or upload' })}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={referenceInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) handleReferenceFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            {sessionImages.length > 0 && referenceImages.length < maxReferenceImages && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {sessionImages.slice(0, 8).map((url, i) => (
                                        <button
                                            key={`ref-${url}-${i}`}
                                            type="button"
                                            onClick={() => addReferenceImage(url)}
                                            className="shrink-0 h-12 w-12 overflow-hidden rounded-lg border border-q-border hover:ring-2 hover:ring-q-accent/50"
                                            title={t('mediaGeneration.useAsReference', { defaultValue: 'Use as reference' })}
                                        >
                                            <img src={url} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                        </div>
                    </CollapsibleSection>
                    )}

                    <CollapsibleSection
                        title={t('mediaGeneration.advanced', { defaultValue: 'Advanced' })}
                        icon={<Settings2 size={14} />}
                        isOpen={openSections.advanced}
                        onToggle={() => toggle('advanced')}
                    >
                        <DynamicPassthroughControls
                            allowedParameters={capabilities?.allowed_passthrough_parameters}
                            values={passthroughValues}
                            onChange={(key, value) => setPassthroughValues(prev => ({ ...prev, [key]: value }))}
                            negativePrompt={negativePrompt}
                            onNegativePromptChange={setNegativePrompt}
                        />
                    </CollapsibleSection>
                </aside>

                {/* Main area */}
                <div className="order-1 md:order-1 flex-1 flex flex-col min-w-0 min-h-[360px] md:min-h-0 overflow-hidden">
                    <div className="order-2 w-full border-t border-q-border/70 bg-q-bg/85 p-3 backdrop-blur-xl lg:p-5 shrink-0 z-30 space-y-3">
                        <div className="quimera-ai-launcher mx-auto max-w-4xl">
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-surface-overlay/40 text-q-accent">
                                    <Film size={18} className={isGenerating ? 'animate-pulse' : ''} />
                                </div>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                    placeholder={t('mediaGeneration.promptPlaceholder', { defaultValue: 'Describe the video you want to create...' })}
                                    rows={1}
                                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-q-text placeholder:text-q-text-secondary/55 resize-none focus:outline-none min-h-[40px] max-h-[120px]"
                                />
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim() || !selectedModelId || selectedComingSoon}
                                    className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-q-accent text-q-text-on-accent hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
                                    title={t('mediaGeneration.generate', { defaultValue: 'Generate video' })}
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-1 text-xs text-q-text-secondary">
                            <span>
                                {statusMessage || (selectedCreditCost
                                    ? t('mediaGeneration.creditsCost', {
                                        count: selectedCreditCost,
                                        usd: estimateVideoUserSpendUsd(selectedCreditCost).toFixed(2),
                                        defaultValue: `${selectedCreditCost} credits`,
                                    })
                                    : (curatedMeta && t('mediaGeneration.creditsHint', { defaultValue: 'Uses AI credits' })))}
                                {estimatedProviderCost != null && selectedCreditCost ? (
                                    <span className="sr-only">
                                        {` Provider cost estimate: $${estimatedProviderCost.toFixed(2)}`}
                                    </span>
                                ) : null}
                            </span>
                        </div>
                        {isGenerating && (
                            <div className="mx-auto max-w-4xl space-y-2 px-1">
                                <ProgressBar3D percentage={generationProgress} />
                                <p className="text-xs text-q-text-secondary">
                                    {statusMessage || t('mediaGeneration.generatingVideo', { defaultValue: 'Generating video...' })}
                                </p>
                            </div>
                        )}
                    </div>

                    {!hidePreview && (
                        <div className="order-1 flex-1 flex items-center justify-center p-4 md:p-8 lg:p-10 quimera-media-workspace min-h-[300px]">
                            {generatedVideo ? (
                                <div className="w-full max-w-2xl space-y-4">
                                    <video src={generatedVideo} controls className="w-full rounded-2xl border border-q-border/60 bg-q-surface/45 shadow-2xl" />
                                    <div className="flex gap-2 justify-center">
                                        <a
                                            href={generatedVideo}
                                            download
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-q-surface/70 border border-q-border/60 text-sm font-medium hover:bg-q-surface"
                                        >
                                            <Download size={16} />
                                            {t('mediaGeneration.download', { defaultValue: 'Download' })}
                                        </a>
                                        {onUseVideo && savedVideoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => onUseVideo(savedVideoUrl)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-q-accent text-q-text-on-accent text-sm font-bold"
                                            >
                                                <CheckCircle2 size={16} />
                                                {t('mediaGeneration.useVideo', { defaultValue: 'Use video' })}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-q-text-secondary rounded-2xl border border-q-border/60 bg-q-surface/35 backdrop-blur-sm px-10 py-12">
                                    <Film size={44} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">{t('mediaGeneration.previewEmpty', { defaultValue: 'Your generated video will appear here' })}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGenerationSection;
