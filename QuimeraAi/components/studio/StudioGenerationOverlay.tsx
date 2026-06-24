import React from 'react';
import { Image, X } from 'lucide-react';
import StudioHeaderProgress from './StudioHeaderProgress';
import StudioProgressTimeline, { type StudioTimelineEvent } from './StudioProgressTimeline';
import { useAppLogo, QUIMERA_DEFAULT_LOGO } from '../../hooks/useAppLogo';

interface GeneratedImagePreview {
    key: string;
    url: string;
}

interface StudioGenerationPhaseView {
    phase: string;
    progress: number;
    currentStep: string;
    imagesTotal: number;
    imagesCompleted: number;
    imagesFailed: number;
    generatedImages: GeneratedImagePreview[];
    events: StudioTimelineEvent[];
}

interface StudioGenerationOverlayProps {
    phase: StudioGenerationPhaseView;
    title: string;
    progressLabel: string;
    progressSteps: string[];
    currentStep: number | string;
    completedSteps?: number | string[];
    eventsLabel: string;
    imagesLabel: string;
    failedLabel: string;
    generatedImagesLabel: string;
}

const StudioGenerationOverlay: React.FC<StudioGenerationOverlayProps> = ({
    phase,
    title,
    progressLabel,
    progressSteps,
    currentStep,
    completedSteps,
    eventsLabel,
    imagesLabel,
    failedLabel,
    generatedImagesLabel,
}) => {
    const isDone = phase.phase === 'done';
    const hasImageWork = phase.imagesTotal > 0;
    const hasGeneratedImages = phase.generatedImages.length > 0;
    const { logoUrl } = useAppLogo();
    const appLogoUrl = logoUrl || QUIMERA_DEFAULT_LOGO;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-q-text/70 backdrop-blur-md" style={{ animation: 'aws-fadeIn 0.4s ease' }}>
            <div className="flex h-full w-full flex-col overflow-hidden border-0 border-q-border bg-q-surface shadow-none lg:mx-4 lg:h-[640px] lg:max-h-[calc(100%-2rem)] lg:max-w-4xl lg:rounded-2xl lg:border lg:shadow-2xl">
                <div className="border-b border-q-border bg-q-surface px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-q-border bg-q-bg/80 shadow-sm shadow-black/10">
                            <img
                                src={appLogoUrl}
                                alt="Quimera"
                                className={`h-7 w-7 object-contain ${isDone ? '' : 'animate-pulse'}`}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-bold text-q-text">{title}</h2>
                                    <p className="mt-0.5 truncate text-sm text-q-text-secondary">{phase.currentStep}</p>
                                </div>
                            </div>
                            <StudioHeaderProgress label={progressLabel} progress={phase.progress} />
                        </div>
                    </div>
                </div>

                {hasImageWork && (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-q-border bg-q-bg/80 px-5 py-3 text-xs sm:px-6">
                        <div className="flex items-center gap-1.5">
                            <Image size={13} className="text-q-accent" />
                            <span className="text-q-text-secondary">{imagesLabel}</span>
                            <span className="font-mono font-bold text-q-text">{phase.imagesCompleted}</span>
                            <span className="text-q-text-secondary/50">/ {phase.imagesTotal}</span>
                        </div>
                        {phase.imagesFailed > 0 && (
                            <div className="flex items-center gap-1.5">
                                <X size={13} className="text-q-error" />
                                <span className="text-q-error/70">{failedLabel} {phase.imagesFailed}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className={`grid min-h-0 flex-1 ${hasGeneratedImages ? 'sm:grid-cols-[minmax(0,1fr)_220px]' : 'grid-cols-1'} overflow-hidden`}>
                    <div className="min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar sm:px-6">
                        <StudioProgressTimeline
                            steps={progressSteps}
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            messages={phase.events}
                            eventsLabel={eventsLabel}
                        />
                    </div>

                    {hasGeneratedImages && (
                        <aside className="hidden min-h-0 border-l border-q-border bg-q-bg/70 p-3 sm:flex sm:flex-col">
                            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-q-text-secondary">{generatedImagesLabel}</span>
                            <div
                                className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-scroll overscroll-contain pr-1 custom-scrollbar"
                                style={{ scrollbarGutter: 'stable' }}
                            >
                                {phase.generatedImages.map((img, index) => (
                                    <div key={`${img.key}-${index}`} className="overflow-hidden border border-q-border bg-q-surface" style={{ animation: 'aws-fadeIn 0.5s ease' }}>
                                        <img src={img.url} alt={img.key} className="h-24 w-full object-cover" loading="lazy" />
                                        <div className="px-2 py-1">
                                            <span className="block truncate text-[9px] text-q-text-secondary">{img.key}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudioGenerationOverlay;
