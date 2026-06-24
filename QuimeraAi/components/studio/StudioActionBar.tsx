import React from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export interface StudioAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

interface StudioActionBarProps {
    primaryLabel: string;
    onPrimary: () => void;
    primaryDisabled?: boolean;
    loading?: boolean;
    success?: boolean;
    helperText?: string;
    secondaryActions?: StudioAction[];
}

export const StudioActionBar: React.FC<StudioActionBarProps> = ({
    primaryLabel,
    onPrimary,
    primaryDisabled,
    loading,
    success,
    helperText,
    secondaryActions = [],
}) => (
    <div className="sticky bottom-0 z-30 border-t border-q-border/70 bg-q-bg/95 px-3 py-3 backdrop-blur-xl lg:px-5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 text-[11px] leading-relaxed text-q-text-secondary">
                {helperText}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
                {secondaryActions.map(action => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        disabled={action.disabled || loading}
                        className="rounded-lg border border-q-border px-3 py-2 text-xs font-semibold text-q-text-secondary transition-colors hover:border-q-accent/50 hover:text-q-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {action.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={onPrimary}
                    disabled={primaryDisabled || loading || success}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-q-accent px-4 py-2 text-sm font-semibold text-q-text-on-accent transition-all hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {primaryLabel}
                </button>
            </div>
        </div>
    </div>
);

export default StudioActionBar;
