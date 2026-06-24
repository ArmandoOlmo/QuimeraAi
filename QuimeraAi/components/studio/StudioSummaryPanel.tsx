import React from 'react';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import type { StudioUXSummary } from '../../utils/studioUX';
import StudioReadinessBadge from './StudioReadinessBadge';
import ProgressBar3D from '../ui/ProgressBar3D';

interface StudioSummaryPanelProps {
    summary: StudioUXSummary;
    children?: React.ReactNode;
    reviewLabel?: string;
    missingOnly?: boolean;
    missingTitle?: string;
    missingEmptyLabel?: string;
    missingRequiredLabel?: string;
    missingReviewLabel?: string;
}

const STATUS_CLASS: Record<string, string> = {
    provided: 'text-q-success',
    assumed: 'text-q-accent',
    needsReview: 'text-q-text-secondary',
    missing: 'text-q-error',
};

const readinessTone = (status: string) => {
    if (status === 'ready') return { text: 'text-q-success', from: 'var(--q-success, #22c55e)', to: '#34d399' };
    if (status === 'needs_detail') return { text: 'text-q-accent', from: 'var(--q-accent, #fbbf24)', to: '#f59e0b' };
    return { text: 'text-q-error', from: 'var(--q-error, #ef4444)', to: '#fb7185' };
};

export const StudioSummaryPanel: React.FC<StudioSummaryPanelProps> = ({
    summary,
    children,
    reviewLabel = 'AI-generated / needs review',
    missingOnly = false,
    missingTitle = 'Missing information',
    missingEmptyLabel = 'No critical information is missing.',
    missingRequiredLabel = 'Required',
    missingReviewLabel = 'Review later',
}) => {
    const missingFields = summary.fields.filter(field => field.status === 'missing' || field.status === 'needsReview');

    if (missingOnly) {
        const clampedScore = Math.max(0, Math.min(100, summary.readiness.score));
        const tone = readinessTone(summary.readiness.status);
        const missingItems = [
            ...summary.readiness.criticalMissing.map(item => ({ label: item, tone: 'critical' as const, meta: missingRequiredLabel })),
            ...summary.readiness.nonCriticalMissing.map(item => ({ label: item, tone: 'review' as const, meta: missingReviewLabel })),
        ];
        const fallbackItems = missingFields
            .filter(field => field.status !== 'provided')
            .map(field => ({ label: field.label, value: field.value, tone: field.status === 'missing' ? 'critical' as const : 'review' as const, meta: field.status === 'missing' ? missingRequiredLabel : missingReviewLabel }));
        const displayItems = missingItems.length > 0 ? missingItems : fallbackItems;

        return (
            <div className="space-y-3">
                <div className="rounded-lg border border-q-border bg-q-bg p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-semibold text-q-text">{missingTitle}</h3>
                            <p className="mt-0.5 truncate text-[10px] text-q-text-secondary">{summary.readiness.label}</p>
                        </div>
                        <span className={`font-mono text-xs font-bold ${tone.text}`}>{clampedScore}%</span>
                    </div>
                    <ProgressBar3D
                        percentage={clampedScore}
                        gradient={{ from: tone.from, to: tone.to }}
                        size="sm"
                        animate
                    />
                    <div className="mt-3 space-y-1.5">
                        {displayItems.length > 0 ? displayItems.map(item => (
                            <div key={`${item.meta}-${item.label}`} className="flex items-start gap-2 rounded-md border border-q-border/60 bg-q-surface/45 px-2 py-1.5">
                                <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${item.tone === 'critical' ? 'bg-q-error' : 'bg-q-text-secondary/60'}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[11px] font-medium text-q-text">{item.label}</span>
                                        <span className={`shrink-0 text-[9px] font-semibold uppercase ${item.tone === 'critical' ? 'text-q-error' : 'text-q-text-secondary'}`}>
                                            {item.meta}
                                        </span>
                                    </div>
                                    {'value' in item && item.value && (
                                        <p className="mt-0.5 line-clamp-1 text-[10px] text-q-text-secondary">{item.value}</p>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="flex items-center gap-2 text-[11px] font-medium text-q-success">
                                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{missingEmptyLabel}</span>
                            </div>
                        )}
                    </div>
                </div>

                {children}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-q-border bg-q-bg p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-q-text">
                            <Sparkles className="h-4 w-4 text-q-accent" />
                            {summary.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-q-text-secondary">{summary.subtitle}</p>
                    </div>
                    <span className="rounded-lg border border-q-border bg-q-surface px-2 py-1 text-[10px] font-semibold text-q-text-secondary">
                        {summary.outputLabel}
                    </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {summary.badges.map(badge => (
                        <span key={badge} className="rounded-lg border border-q-border bg-q-surface px-2 py-1 text-[10px] font-medium text-q-text-secondary">
                            {badge}
                        </span>
                    ))}
                </div>
                <StudioReadinessBadge readiness={summary.readiness} />
            </div>

            <div className="rounded-lg border border-q-border bg-q-bg p-3">
                <div className="space-y-2">
                    {summary.fields.map(field => {
                        const Icon = field.status === 'provided' ? CheckCircle2 : Circle;
                        return (
                            <div key={field.label} className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 text-[11px]">
                                <div className="flex min-w-0 items-center gap-1.5 text-q-text-secondary">
                                    <Icon className={`h-3 w-3 flex-shrink-0 ${STATUS_CLASS[field.status || 'provided'] || 'text-q-text-secondary'}`} />
                                    <span className="truncate">{field.label}</span>
                                </div>
                                <div className="min-w-0 text-q-text">
                                    <span className="line-clamp-2">{field.value}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {summary.assumptions.length > 0 && (
                    <div className="mt-3 rounded-lg border border-q-accent/15 bg-q-accent/5 p-2">
                        <div className="text-[10px] font-semibold uppercase text-q-accent">{reviewLabel}</div>
                        <ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-q-text-secondary">
                            {summary.assumptions.slice(0, 3).map(item => <li key={item}>{item}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {children}
        </div>
    );
};

export default StudioSummaryPanel;
