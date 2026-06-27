import React, { useCallback, useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ImageGeneratorPanel from '../ui/ImageGeneratorPanel';
import VideoGenerationSection from './VideoGenerationSection';
import MediaModeToggle from './shared/MediaModeToggle';
import type { CreateVideoFromImageDetail, MediaGeneratorMode } from '../../types/videoGeneration';
import {
    MEDIA_GENERATOR_LAUNCH_EVENT,
    peekMediaGeneratorLaunchRequest,
    readMediaGeneratorLaunchEvent,
} from '../../utils/mediaGeneratorLaunch';

export interface MediaGeneratorPanelProps {
    destination: 'user' | 'global' | 'admin';
    adminCategory?: string;
    className?: string;
    onClose?: () => void;
    onCollapse?: () => void;
    hidePreview?: boolean;
    hideHeader?: boolean;
    onImageGenerated?: (url: string) => void;
    onVideoGenerated?: (url: string) => void;
    onUseImage?: (url: string) => void;
    onUseVideo?: (url: string) => void;
    projectId?: string;
    generationContext?: 'background' | 'general';
    defaultMode?: MediaGeneratorMode;
    allowedModes?: MediaGeneratorMode[];
    initialStartFrame?: string;
    initialEndFrame?: string;
}

const MediaGeneratorPanel: React.FC<MediaGeneratorPanelProps> = ({
    destination = 'user',
    adminCategory,
    className = '',
    onClose,
    onCollapse,
    hidePreview = false,
    hideHeader = false,
    onImageGenerated,
    onVideoGenerated,
    onUseImage,
    onUseVideo,
    projectId,
    generationContext = 'general',
    defaultMode = 'image',
    allowedModes = ['image', 'video'],
    initialStartFrame,
    initialEndFrame,
}) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<MediaGeneratorMode>(
        allowedModes.includes(defaultMode) ? defaultMode : allowedModes[0]
    );
    const [sessionImages, setSessionImages] = useState<string[]>([]);
    const [videoStartFrame, setVideoStartFrame] = useState<string | undefined>(initialStartFrame);
    const [videoEndFrame, setVideoEndFrame] = useState<string | undefined>(initialEndFrame);

    const trackSessionImage = useCallback((url: string) => {
        if (!url || url.startsWith('data:') === false && !url.startsWith('http')) return;
        setSessionImages(prev => {
            if (prev.includes(url)) return prev;
            return [url, ...prev].slice(0, 12);
        });
    }, []);

    const handleImageGenerated = useCallback((url: string) => {
        trackSessionImage(url);
        onImageGenerated?.(url);
    }, [onImageGenerated, trackSessionImage]);

    useEffect(() => {
        const handleCreateVideo = (e: Event) => {
            const detail = (e as CustomEvent<CreateVideoFromImageDetail>).detail;
            if (!detail?.imageUrl || !allowedModes.includes('video')) return;

            setMode('video');
            if (detail.mode === 'start') setVideoStartFrame(detail.imageUrl);
            else if (detail.mode === 'end') setVideoEndFrame(detail.imageUrl);
            else {
                window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: detail.imageUrl }));
            }
            trackSessionImage(detail.imageUrl);
        };

        window.addEventListener('assets:create-video-from-image', handleCreateVideo);
        return () => window.removeEventListener('assets:create-video-from-image', handleCreateVideo);
    }, [allowedModes, trackSessionImage]);

    useEffect(() => {
        const pending = peekMediaGeneratorLaunchRequest(projectId);
        if (pending && allowedModes.includes(pending.mode)) {
            setMode(pending.mode);
        }
    }, [allowedModes, projectId]);

    useEffect(() => {
        const handleMediaLaunch = (event: Event) => {
            const request = readMediaGeneratorLaunchEvent(event);
            if (!request || !allowedModes.includes(request.mode)) return;
            setMode(request.mode);
        };

        window.addEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleMediaLaunch);
        return () => window.removeEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, handleMediaLaunch);
    }, [allowedModes]);

    useEffect(() => {
        if (initialStartFrame) setVideoStartFrame(initialStartFrame);
    }, [initialStartFrame]);

    useEffect(() => {
        if (initialEndFrame) setVideoEndFrame(initialEndFrame);
    }, [initialEndFrame]);

    const showModeToggle = allowedModes.length > 1;

    return (
        <div className={`flex flex-col h-full overflow-hidden bg-q-bg text-q-text ${className}`}>
            {!hideHeader && (
                <header className="quimera-dashboard-header-bar flex items-center justify-between px-3 lg:px-5 py-2.5 lg:py-3 shrink-0 z-20 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="h-8 w-8 rounded-xl bg-primary/10 text-q-accent flex items-center justify-center shrink-0">
                            <Wand2 size={18} />
                        </span>
                        <h2 className="text-sm md:text-lg font-bold truncate">
                            {t('editor.mediaGenerator', { defaultValue: 'Media Generator' })}
                        </h2>
                        {showModeToggle && (
                            <MediaModeToggle mode={mode} onChange={setMode} allowedModes={allowedModes} />
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {onCollapse && (
                            <button type="button" onClick={onCollapse} className="text-xs text-q-text-secondary hover:text-q-text px-2 py-1">
                                {t('common.collapse', { defaultValue: 'Collapse' })}
                            </button>
                        )}
                        {onClose && (
                            <button type="button" onClick={onClose} className="text-xs text-q-text-secondary hover:text-q-text px-2 py-1">
                                {t('common.close', { defaultValue: 'Close' })}
                            </button>
                        )}
                    </div>
                </header>
            )}

            {hideHeader && showModeToggle && (
                <div className="px-4 py-2 border-b border-q-border/70 bg-q-bg/85 backdrop-blur-xl shrink-0">
                    <MediaModeToggle mode={mode} onChange={setMode} allowedModes={allowedModes} />
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden">
                {mode === 'image' ? (
                    <ImageGeneratorPanel
                        destination={destination}
                        adminCategory={adminCategory}
                        hideHeader
                        hidePreview={hidePreview}
                        onClose={onClose}
                        onCollapse={onCollapse}
                        onImageGenerated={handleImageGenerated}
                        onUseImage={onUseImage}
                        projectId={projectId}
                        generationContext={generationContext}
                        className="h-full"
                    />
                ) : (
                    <VideoGenerationSection
                        destination={destination}
                        adminCategory={adminCategory}
                        projectId={projectId}
                        hidePreview={hidePreview}
                        initialStartFrame={videoStartFrame}
                        initialEndFrame={videoEndFrame}
                        sessionImages={sessionImages}
                        onVideoGenerated={onVideoGenerated}
                        onUseVideo={onUseVideo}
                        className="h-full"
                    />
                )}
            </div>
        </div>
    );
};

export default MediaGeneratorPanel;
