import React from 'react';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import ProgressBar3D from '../ui/ProgressBar3D';

export interface StudioTimelineEvent {
    message: string;
    timestamp?: number;
    type?: string;
}

interface StudioProgressTimelineProps {
    steps: string[];
    currentStep: number | string;
    completedSteps?: number | string[];
    failedStep?: number | string;
    progress?: number;
    messages?: StudioTimelineEvent[];
    progressLabel?: string;
    eventsLabel?: string;
}

function resolveStepIndex(steps: string[], value: number | string | undefined): number {
    if (typeof value === 'number') return value;
    if (!value) return -1;
    const normalized = value.toLowerCase();
    const exact = steps.findIndex(step => step.toLowerCase() === normalized);
    if (exact >= 0) return exact;
    return steps.findIndex(step => normalized.includes(step.toLowerCase()) || step.toLowerCase().includes(normalized));
}

function isCompleted(index: number, completedSteps: number | string[] | undefined, steps: string[], currentIndex: number): boolean {
    if (Array.isArray(completedSteps)) return completedSteps.some(step => resolveStepIndex(steps, step) === index);
    if (typeof completedSteps === 'number') return index < completedSteps;
    return index < currentIndex;
}

export const StudioProgressTimeline: React.FC<StudioProgressTimelineProps> = ({
    steps,
    currentStep,
    completedSteps,
    failedStep,
    progress,
    messages = [],
    progressLabel = 'Generation progress',
    eventsLabel = 'Events',
}) => {
    const currentIndex = Math.max(0, resolveStepIndex(steps, currentStep));
    const failedIndex = resolveStepIndex(steps, failedStep);
    const clampedProgress = typeof progress === 'number'
        ? Math.max(0, Math.min(100, progress))
        : 0;

    return (
        <div className="space-y-4">
            {typeof progress === 'number' && (
                <div className="rounded-lg border border-q-border bg-q-bg p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-q-text">{progressLabel}</span>
                        <span className="font-mono font-bold text-q-accent">{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar3D
                        percentage={clampedProgress}
                        gradient={{ from: 'var(--q-accent, #fbbf24)', to: 'var(--q-primary, #818cf8)' }}
                        size="sm"
                        animate={clampedProgress < 100}
                    />
                </div>
            )}

            <div className="space-y-2">
                {steps.map((step, index) => {
                    const failed = failedIndex === index;
                    const active = !failed && index === currentIndex;
                    const completed = !failed && isCompleted(index, completedSteps, steps, currentIndex);
                    return (
                        <div
                            key={step}
                            className={`relative flex items-start gap-3 overflow-hidden rounded-lg border px-3 py-2 ${
                                active
                                    ? 'border-q-accent/35 bg-q-accent/5'
                                    : completed
                                        ? 'border-q-success/20 bg-q-bg'
                                        : failed
                                            ? 'border-q-error/25 bg-q-bg'
                                            : 'border-q-border bg-q-bg'
                            }`}
                        >
                            {active && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-q-accent/10">
                                    <div className="studio-step-loader h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-q-accent to-transparent" />
                                </div>
                            )}
                            {completed && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-q-success/70" />
                            )}
                            <div className="relative z-10 mt-0.5 flex-shrink-0">
                                {failed ? (
                                    <AlertTriangle className="h-4 w-4 text-q-error" />
                                ) : completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-q-success" />
                                ) : active ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-q-accent" />
                                ) : (
                                    <Circle className="h-4 w-4 text-q-text-secondary/40" />
                                )}
                            </div>
                            <div className="relative z-10 min-w-0 flex-1">
                                <div className={`text-xs font-semibold ${active ? 'text-q-accent' : completed ? 'text-q-text' : failed ? 'text-q-error' : 'text-q-text-secondary'}`}>
                                    {step}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {messages.length > 0 && (
                <div className="rounded-lg border border-q-border bg-q-bg p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase text-q-text-secondary">{eventsLabel}</div>
                    <div className="max-h-44 space-y-1 overflow-y-auto custom-scrollbar">
                        {messages.slice(-8).map((event, index) => (
                            <div key={`${event.timestamp || index}-${event.message}`} className="text-[11px] leading-relaxed text-q-text-secondary">
                                {event.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                @keyframes studio-step-loader-move {
                    0% { transform: translateX(-125%); }
                    100% { transform: translateX(425%); }
                }

                .studio-step-loader {
                    animation: studio-step-loader-move 1.15s ease-in-out infinite;
                    box-shadow: 0 0 12px color-mix(in srgb, var(--q-accent, #fbbf24) 55%, transparent);
                }
            `}</style>
        </div>
    );
};

export default StudioProgressTimeline;
