import React from 'react';
import ProgressBar3D from '../ui/ProgressBar3D';

interface StudioHeaderProgressProps {
    label: string;
    progress: number;
}

export const StudioHeaderProgress: React.FC<StudioHeaderProgressProps> = ({ label, progress }) => {
    const clamped = Math.max(0, Math.min(100, progress));

    return (
        <div className="mt-3">
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
                <span className="text-xs font-bold tracking-wide text-q-text">{label}</span>
                <span className="font-mono text-xs font-bold text-q-accent">{Math.round(clamped)}%</span>
            </div>
            <ProgressBar3D
                percentage={clamped}
                color="var(--q-accent)"
                size="md"
                animate
            />
        </div>
    );
};

export default StudioHeaderProgress;
