import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppCard, AppIcon, StatusBadge } from '../../ui/system';
import { cn } from '../../../utils';

export const agencyShellClass = 'quimera-agency-dashboard flex h-[100dvh] min-h-0 overflow-hidden overscroll-contain bg-q-bg text-foreground';

export const agencyContentClass = 'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-6 lg:p-8';

export const agencyPanelClass =
    'quimera-dashboard-panel-card min-w-0 overflow-hidden border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-card)]';

export const agencyModalOverlayClass =
    'fixed inset-0 z-50 flex min-h-0 items-center justify-center overflow-y-auto overscroll-contain bg-q-text/50 p-4 backdrop-blur-sm';

export const agencyModalPanelClass =
    'flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-q-border bg-q-surface shadow-2xl';

export const agencyModalBodyClass = 'min-h-0 flex-1 overflow-y-auto';

export const agencyModalFooterClass = 'shrink-0 border-t border-q-border';

export type AgencyTone = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'info';

const toneClasses: Record<AgencyTone, { text: string; bg: string; border: string; icon: string; badge: 'muted' | 'success' | 'warning' | 'danger' | 'info' }> = {
    default: {
        text: 'text-foreground',
        bg: 'bg-q-bg/50',
        border: 'border-q-border/60',
        icon: 'text-q-text-muted bg-q-surface-overlay',
        badge: 'muted',
    },
    success: {
        text: 'text-q-success',
        bg: 'bg-q-success/10',
        border: 'border-q-success/25',
        icon: 'text-q-success bg-q-success/10',
        badge: 'success',
    },
    warning: {
        text: 'text-q-warning',
        bg: 'bg-q-warning/10',
        border: 'border-q-warning/25',
        icon: 'text-q-warning bg-q-warning/10',
        badge: 'warning',
    },
    danger: {
        text: 'text-q-error',
        bg: 'bg-q-error/10',
        border: 'border-q-error/25',
        icon: 'text-q-error bg-q-error/10',
        badge: 'danger',
    },
    accent: {
        text: 'quimera-status-card-accent-text',
        bg: 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_12%,transparent)]',
        border: 'border-q-accent/25',
        icon: 'quimera-status-card-accent-text bg-q-accent/10',
        badge: 'info',
    },
    info: {
        text: 'text-q-info',
        bg: 'bg-q-info/10',
        border: 'border-q-info/25',
        icon: 'text-q-info bg-q-info/10',
        badge: 'info',
    },
};

export function getAgencyToneClasses(tone: AgencyTone = 'default') {
    return toneClasses[tone];
}

export function AgencySectionHeader({
    title,
    subtitle,
    icon: Icon,
    actions,
    eyebrow,
    className,
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    eyebrow?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <AppIcon icon={Icon} size="lg" className="mt-0.5 quimera-dashboard-header-icon" strokeWidth={2} />
                )}
                <div className="min-w-0">
                    {eyebrow && (
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider quimera-status-card-accent-text">
                            {eyebrow}
                        </div>
                    )}
                    <h2 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-muted">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function AgencyStatCard({
    label,
    value,
    icon,
    tone = 'default',
    hint,
    badge,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    icon: LucideIcon;
    tone?: AgencyTone;
    hint?: React.ReactNode;
    badge?: React.ReactNode;
}) {
    const toneClass = getAgencyToneClasses(tone).text;

    return (
        <AppCard hoverMotion className="group relative overflow-hidden !p-3 sm:!p-4">
            <div className="flex items-start justify-between gap-3">
                <AppIcon icon={icon} size="lg" className="quimera-dashboard-header-icon" strokeWidth={2} />
                {badge && <StatusBadge size="sm" variant="muted">{badge}</StatusBadge>}
            </div>
            <div className={cn('mt-3 text-2xl font-bold leading-none tracking-normal sm:text-3xl', toneClass)}>
                {value}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                {label}
            </div>
            {hint && (
                <p className="mt-2 text-xs leading-5 text-q-text-muted">
                    {hint}
                </p>
            )}
        </AppCard>
    );
}

export function AgencyPanel({
    title,
    icon: Icon,
    action,
    children,
    className,
    contentClassName,
}: {
    title?: React.ReactNode;
    icon?: LucideIcon;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section className={cn(agencyPanelClass, '!p-0', className)}>
            {title && (
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-q-border/70 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        {Icon && <AppIcon icon={Icon} size="md" className="quimera-dashboard-header-icon" strokeWidth={2} />}
                        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h3>
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className={cn(title ? 'min-w-0 p-4 sm:p-5' : 'min-w-0 p-4 sm:p-5', contentClassName)}>
                {children}
            </div>
        </section>
    );
}

export interface AgencyCommandMetric {
    label: React.ReactNode;
    value: React.ReactNode;
    icon: LucideIcon;
    onClick?: () => void;
}

export function AgencyCommandCenter({
    eyebrow,
    title,
    subtitle,
    icon: Icon,
    metrics,
    action,
    className,
}: {
    eyebrow: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    icon: LucideIcon;
    metrics: AgencyCommandMetric[];
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn(agencyPanelClass, 'p-5 sm:p-6', className)}>
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-q-accent/10 quimera-status-card-accent-text">
                            <Icon size={22} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-q-text-muted">
                                {eyebrow}
                            </p>
                            <h2 className="truncate text-2xl font-extrabold leading-tight text-foreground">
                                {title}
                            </h2>
                        </div>
                    </div>

                    {subtitle && (
                        <p className="max-w-3xl text-sm leading-6 text-q-text-muted">
                            {subtitle}
                        </p>
                    )}

                    <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4">
                        {metrics.map((metric) => {
                            const MetricIcon = metric.icon;
                            const metricBody = (
                                <>
                                    <MetricIcon className="mb-1 h-4 w-4 text-q-text-muted" strokeWidth={1.75} />
                                    <div className="truncate text-lg font-extrabold leading-tight text-foreground">
                                        {metric.value}
                                    </div>
                                    <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                                        {metric.label}
                                    </div>
                                </>
                            );

                            if (metric.onClick) {
                                return (
                                    <button
                                        key={String(metric.label)}
                                        type="button"
                                        onClick={metric.onClick}
                                        className="min-w-0 rounded-lg border border-q-border/60 bg-q-surface/60 px-3 py-2 text-left transition-colors hover:bg-muted"
                                    >
                                        {metricBody}
                                    </button>
                                );
                            }

                            return (
                                <div
                                    key={String(metric.label)}
                                    className="min-w-0 rounded-lg border border-q-border/60 bg-q-surface/60 px-3 py-2"
                                >
                                    {metricBody}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {action && (
                    <div className="w-full min-w-0 lg:w-[320px]">
                        {action}
                    </div>
                )}
            </div>
        </section>
    );
}

export interface AgencyReadinessItem {
    label: React.ReactNode;
    description?: React.ReactNode;
    complete: boolean;
    icon: LucideIcon;
    onClick?: () => void;
}

export function AgencyReadinessPanel({
    title,
    subtitle,
    score,
    items,
    tone = 'accent',
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    score: number;
    items: AgencyReadinessItem[];
    tone?: AgencyTone;
}) {
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const toneClass = getAgencyToneClasses(tone);
    const ringStyle = {
        background: `conic-gradient(var(--q-accent, #fbbf24) ${normalizedScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
    };

    return (
        <AgencyPanel contentClassName="p-5">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{title}</h3>
                    {subtitle && <p className="mt-1 text-sm text-q-text-muted">{subtitle}</p>}
                </div>
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={ringStyle}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-q-surface text-lg font-extrabold text-foreground">
                        {normalizedScore}%
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemContent = (
                        <>
                            <span className={cn(
                                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                item.complete ? toneClasses.success.icon : toneClass.icon,
                            )}>
                                {item.complete ? <CheckCircle2 size={15} /> : <ItemIcon size={15} />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                                {item.description && (
                                    <span className="line-clamp-2 text-xs text-q-text-muted">{item.description}</span>
                                )}
                            </span>
                        </>
                    );

                    if (item.onClick) {
                        return (
                            <button
                                key={String(item.label)}
                                type="button"
                                onClick={item.onClick}
                                className="flex w-full items-start gap-3 rounded-lg border border-q-border/50 bg-q-bg/40 p-3 text-left transition-colors hover:bg-muted"
                            >
                                {itemContent}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={String(item.label)}
                            className="flex items-start gap-3 rounded-lg border border-q-border/50 bg-q-bg/40 p-3"
                        >
                            {itemContent}
                        </div>
                    );
                })}
            </div>
        </AgencyPanel>
    );
}

export function AgencyNextAction({
    label,
    description,
    icon: Icon,
    tone = 'accent',
    onClick,
}: {
    label: React.ReactNode;
    description?: React.ReactNode;
    icon: LucideIcon;
    tone?: AgencyTone;
    onClick: () => void;
}) {
    const toneClass = getAgencyToneClasses(tone);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn('flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted', toneClass.bg, toneClass.border)}
        >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneClass.icon)}>
                <Icon size={18} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{label}</span>
                {description && <span className="line-clamp-2 text-xs text-q-text-muted">{description}</span>}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-q-text-muted" />
        </button>
    );
}

export function AgencyEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="py-8 text-center">
            <Icon className="mx-auto mb-4 h-10 w-10 text-q-text-muted/40" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-q-text-muted">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function AgencyInlineStatus({
    children,
    tone = 'default',
}: {
    children: React.ReactNode;
    tone?: AgencyTone;
}) {
    const toneClass = getAgencyToneClasses(tone);
    return (
        <StatusBadge size="sm" variant={toneClass.badge}>
            {children}
        </StatusBadge>
    );
}
