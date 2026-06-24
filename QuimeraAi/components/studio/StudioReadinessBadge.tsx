import React from 'react';
import type { StudioReadiness } from '../../utils/studioUX';
import ProgressBar3D from '../ui/ProgressBar3D';

interface StudioReadinessBadgeProps {
    readiness: StudioReadiness;
    compact?: boolean;
}

export const StudioReadinessBadge: React.FC<StudioReadinessBadgeProps> = ({ readiness, compact }) => {
    const clampedScore = Math.max(0, Math.min(100, readiness.score));
    const tone = readiness.status === 'ready'
        ? { text: 'text-q-success', from: 'var(--q-success, #22c55e)', to: '#34d399' }
        : readiness.status === 'needs_detail'
            ? { text: 'text-q-accent', from: 'var(--q-accent, #fbbf24)', to: '#f59e0b' }
            : { text: 'text-q-error', from: 'var(--q-error, #ef4444)', to: '#fb7185' };

    return (
        <div className="rounded-lg border border-q-border/70 bg-q-surface/70 px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className={`min-w-0 text-xs font-semibold ${tone.text}`}>
                    <span className="truncate">{readiness.label}</span>
                </span>
                <span className={`font-mono text-xs font-bold ${tone.text}`}>{clampedScore}%</span>
            </div>
            <ProgressBar3D
                percentage={clampedScore}
                gradient={{ from: tone.from, to: tone.to }}
                size={compact ? 'sm' : 'md'}
                animate
            />
        </div>
    );
};

export default StudioReadinessBadge;
