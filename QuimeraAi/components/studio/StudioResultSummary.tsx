import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { StudioResultMetric } from '../../utils/studioUX';

interface StudioResultSummaryProps {
    title: string;
    subtitle?: string;
    badges?: string[];
    metrics: StudioResultMetric[];
    warnings?: string[];
    actions?: React.ReactNode;
}

export const StudioResultSummary: React.FC<StudioResultSummaryProps> = ({
    title,
    subtitle,
    badges = [],
    metrics,
    warnings = [],
    actions,
}) => (
    <div className="rounded-lg border border-q-border bg-q-surface p-4">
        <div className="mb-3 flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-q-success/10 text-q-success">
                <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <h3 className="text-base font-bold text-q-text">{title}</h3>
                {subtitle && <p className="mt-1 text-sm leading-relaxed text-q-text-secondary">{subtitle}</p>}
            </div>
        </div>
        {badges.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
                {badges.map(badge => (
                    <span key={badge} className="rounded-lg border border-q-border bg-q-bg px-2.5 py-1 text-xs text-q-text-secondary">
                        {badge}
                    </span>
                ))}
            </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {metrics.map(metric => (
                <div key={metric.label} className="rounded-lg border border-q-border bg-q-bg px-3 py-2">
                    <div className="text-[10px] uppercase text-q-text-secondary">{metric.label}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-q-text">{metric.value}</div>
                </div>
            ))}
        </div>
        {warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-q-accent/20 bg-q-accent/5 p-2 text-[11px] leading-relaxed text-q-text-secondary">
                {warnings.slice(0, 3).map(warning => <div key={warning}>{warning}</div>)}
            </div>
        )}
        {actions && <div className="mt-4">{actions}</div>}
    </div>
);

export default StudioResultSummary;
