/**
 * ProgressBar3D
 * A reusable 3D-styled progress bar with inset track, glossy fill,
 * diagonal stripes, and shine highlight.
 */

import React from 'react';

type ProgressBarSize = 'sm' | 'md' | 'lg';

interface ProgressBar3DProps {
    /** 0–100 percentage filled */
    percentage: number;
    /** CSS color or gradient for the fill. Defaults to primary. */
    color?: string;
    /** Gradient string (from/to) for the fill. Overrides color if set. */
    gradient?: { from: string; to: string };
    /** Bar height preset */
    size?: ProgressBarSize;
    /** Show animated stripe movement */
    animate?: boolean;
    /** Extra class names on the outer wrapper */
    className?: string;
}

const SIZE_MAP: Record<ProgressBarSize, { track: number; radius: number }> = {
    sm: { track: 6, radius: 4 },
    md: { track: 10, radius: 6 },
    lg: { track: 14, radius: 8 },
};

const ProgressBar3D: React.FC<ProgressBar3DProps> = ({
    percentage,
    color,
    gradient,
    size = 'md',
    animate = true,
    className = '',
}) => {
    const clamped = Math.max(0, Math.min(100, percentage));
    const { track, radius } = SIZE_MAP[size];

    // Build fill background
    const fillBg = gradient
        ? `linear-gradient(to right, ${gradient.from}, ${gradient.to})`
        : color || 'hsl(var(--primary))';

    return (
        <div
            className={`relative w-full overflow-hidden ${className}`}
            style={{
                height: track,
                borderRadius: radius,
                background: 'var(--progress3d-track, rgba(0,0,0,0.35))',
                boxShadow:
                    'inset 0 2px 4px rgba(0,0,0,0.45), inset 0 -1px 2px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05)',
            }}
        >
            {/* ── Filled portion ──────────────────────────────────────── */}
            {clamped > 0 && (
                <div
                    className="absolute inset-y-0 left-0"
                    style={{
                        width: `${clamped}%`,
                        borderRadius: radius,
                        background: fillBg,
                        transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                        boxShadow:
                            `0 0 10px ${color || 'hsl(var(--primary))'}, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                    }}
                >
                    {/* Diagonal stripes overlay */}
                    <div
                        className={animate ? 'progress3d-stripes' : ''}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: radius,
                            backgroundImage:
                                'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 12px)',
                            backgroundSize: '17px 17px',
                        }}
                    />
                    {/* Top-half gloss / shine */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            borderRadius: `${radius}px ${radius}px 0 0`,
                            background:
                                'linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.05))',
                        }}
                    />
                </div>
            )}

            {/* inline keyframes (scoped via className) */}
            <style>{`
                @keyframes progress3d-move {
                    0%   { background-position: 0 0; }
                    100% { background-position: 17px 0; }
                }
                .progress3d-stripes {
                    animation: progress3d-move 0.8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default ProgressBar3D;
