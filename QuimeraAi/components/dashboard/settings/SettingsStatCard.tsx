import React from 'react';
import { MotionCard } from '../../ui/primitives/Card';

export const SettingsStatCard = ({
    label,
    value,
    icon: Icon,
    valueClass = '',
    hint,
    compact = false,
}: {
    label: string;
    value: React.ReactNode;
    icon: React.ElementType;
    valueClass?: string;
    hint?: string;
    compact?: boolean;
}) => (
    <MotionCard
        hoverMotion
        className={`group relative overflow-hidden rounded-xl md:rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl hover:border-q-border transition-all duration-300 ease-out ${
            compact ? 'p-3 min-w-[7.5rem]' : 'p-2.5 md:p-4'
        }`}
    >
        <div
            className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 md:w-32 md:h-32 rounded-full blur-2xl group-hover:scale-110 transition-all duration-500"
            aria-hidden="true"
        />
        <div className="relative z-10">
            <div className="mb-1 md:mb-2">
                <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
            </div>
            <div
                className={
                    compact
                        ? `text-base font-bold text-foreground leading-tight ${valueClass}`
                        : `text-xl md:text-3xl font-extrabold text-foreground ${valueClass}`
                }
            >
                {value}
            </div>
            <div
                className={`font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight ${
                    compact ? 'text-[10px] truncate' : 'text-[10px] md:text-xs'
                }`}
            >
                {label}
            </div>
            {hint && (
                <p className="text-[10px] text-q-text-muted/80 mt-0.5 hidden sm:block">{hint}</p>
            )}
        </div>
    </MotionCard>
);

export const settingsPanelClass =
    'overflow-hidden rounded-xl sm:rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl';

/** Orange 20px icon for sticky h-14 headers and matching sidebar panel headers */
export const dashboardHeaderIconClass = 'w-5 h-5 quimera-dashboard-header-icon';

/** Unified sticky header background — use on all dashboard/CMS shell headers */
export const dashboardHeaderBarClass = 'quimera-dashboard-header-bar';
