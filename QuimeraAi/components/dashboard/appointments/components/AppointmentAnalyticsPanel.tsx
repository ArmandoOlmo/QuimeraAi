import React from 'react';
import {
    Bot,
    CalendarCheck2,
    ChevronDown,
    CreditCard,
    Globe2,
    MessageSquareText,
    TrendingUp,
    UserRoundCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppointmentAnalytics, AppointmentEngineAnalytics } from '../../../../types';

interface AppointmentAnalyticsPanelProps {
    analytics: AppointmentAnalytics;
}

const ANALYTICS_COLLAPSED_STORAGE_KEY = 'quimera_appointments_analytics_collapsed';

const EMPTY_ENGINE_ANALYTICS: AppointmentEngineAnalytics = {
    totalEvents: 0,
    requestedCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    needsReviewCount: 0,
    aiPreparedCount: 0,
    chatCoreBookings: 0,
    publicBookings: 0,
    dashboardBookings: 0,
    googleCalendarImports: 0,
    linkedLeadCount: 0,
    paidBookingCount: 0,
    depositPendingCount: 0,
    confirmationRate: 0,
    completionRateFromRequests: 0,
    leadLinkRate: 0,
    paidBookingRate: 0,
    sourceBreakdown: {},
    eventBreakdown: {},
    paymentStatusBreakdown: {},
    funnel: {
        requested: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
    },
};

export const AppointmentAnalyticsPanel: React.FC<AppointmentAnalyticsPanelProps> = ({ analytics }) => {
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = React.useState(() => readCollapsedPreference(ANALYTICS_COLLAPSED_STORAGE_KEY));
    const engine = analytics.engine || EMPTY_ENGINE_ANALYTICS;
    const contentId = 'appointments-analytics-engine-content';
    const funnelItems = [
        { key: 'requested', value: engine.funnel.requested },
        { key: 'confirmed', value: engine.funnel.confirmed },
        { key: 'completed', value: engine.funnel.completed },
        { key: 'cancelled', value: engine.funnel.cancelled },
        { key: 'noShow', value: engine.funnel.noShow },
    ];
    const maxFunnel = Math.max(1, ...funnelItems.map(item => item.value));
    const sourceItems = Object.entries(engine.sourceBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const stats = [
        {
            icon: Bot,
            label: t('appointments.analyticsEngine.chatCoreBookings'),
            value: engine.chatCoreBookings,
            hint: t('appointments.analyticsEngine.chatCoreHint'),
        },
        {
            icon: Globe2,
            label: t('appointments.analyticsEngine.publicBookings'),
            value: engine.publicBookings,
            hint: t('appointments.analyticsEngine.publicHint'),
        },
        {
            icon: UserRoundCheck,
            label: t('appointments.analyticsEngine.linkedLeads'),
            value: engine.linkedLeadCount,
            hint: `${engine.leadLinkRate}%`,
        },
        {
            icon: CreditCard,
            label: t('appointments.analyticsEngine.paidBookings'),
            value: engine.paidBookingCount,
            hint: `${engine.paidBookingRate}%`,
        },
        {
            icon: MessageSquareText,
            label: t('appointments.analyticsEngine.events'),
            value: engine.totalEvents,
            hint: t('appointments.analyticsEngine.eventHint'),
        },
        {
            icon: CalendarCheck2,
            label: t('appointments.analyticsEngine.confirmationRate'),
            value: `${engine.confirmationRate}%`,
            hint: t('appointments.analyticsEngine.confirmationHint'),
        },
    ];
    const compactStats = stats.slice(0, 4);
    const toggleLabel = isCollapsed
        ? t('appointments.analyticsEngine.expand')
        : t('appointments.analyticsEngine.collapse');
    const toggleCollapsed = React.useCallback(() => {
        setIsCollapsed(prev => {
            const next = !prev;
            saveCollapsedPreference(ANALYTICS_COLLAPSED_STORAGE_KEY, next);
            return next;
        });
    }, []);

    return (
        <section className="border-b border-q-border bg-q-surface/40 px-3 py-3 sm:px-6">
            <div className={`${isCollapsed ? 'mb-0' : 'mb-3'} flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between`}>
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-expanded={!isCollapsed}
                    aria-controls={contentId}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                    className="-ml-1 rounded-md px-1 py-0.5 text-left transition hover:bg-q-bg/45 focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-q-text-muted">
                        {t('appointments.analyticsEngine.eyebrow')}
                    </p>
                    <h2 className="text-sm font-semibold text-foreground">
                        {t('appointments.analyticsEngine.title')}
                    </h2>
                </button>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                    {isCollapsed ? (
                        <div className="hidden max-w-3xl flex-wrap items-center justify-end gap-2 lg:flex">
                            {compactStats.map(({ label, value }) => (
                                <span
                                    key={label}
                                    className="inline-flex max-w-44 items-center gap-1 rounded-full border border-q-border/60 bg-q-bg/70 px-2 py-1 text-[11px]"
                                >
                                    <span className="font-semibold text-foreground">{value}</span>
                                    <span className="truncate text-q-text-muted">{label}</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="max-w-2xl text-xs text-q-text-muted">
                            {t('appointments.analyticsEngine.description')}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-expanded={!isCollapsed}
                        aria-controls={contentId}
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-q-border/60 bg-q-bg/70 text-q-text-muted transition hover:border-q-accent/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                    >
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                            strokeWidth={2}
                        />
                    </button>
                </div>
            </div>

            {!isCollapsed && (
            <div id={contentId} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    {stats.map(({ icon: Icon, label, value, hint }) => (
                        <div key={label} className="rounded-lg border border-q-border/60 bg-q-bg/70 px-3 py-2">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <Icon className="h-4 w-4 quimera-dashboard-header-icon" strokeWidth={2} />
                                <span className="text-[10px] font-medium text-q-text-muted">{hint}</span>
                            </div>
                            <p className="text-xl font-bold leading-none text-foreground">{value}</p>
                            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-q-text-muted">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                    <div className="rounded-lg border border-q-border/60 bg-q-bg/70 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    {t('appointments.analyticsEngine.funnelTitle')}
                                </h3>
                                <p className="text-xs text-q-text-muted">
                                    {t('appointments.analyticsEngine.funnelDescription')}
                                </p>
                            </div>
                            <TrendingUp className="h-4 w-4 text-q-success" strokeWidth={2} />
                        </div>
                        <div className="space-y-2">
                            {funnelItems.map(item => (
                                <div key={item.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2">
                                    <span className="text-xs font-medium text-q-text-muted">
                                        {t(`appointments.analyticsEngine.funnel.${item.key}`)}
                                    </span>
                                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--quimera-status-accent-from),var(--quimera-status-accent-to))]"
                                            style={{ width: `${Math.max(4, Math.round((item.value / maxFunnel) * 100))}%` }}
                                        />
                                    </div>
                                    <span className="text-right text-xs font-semibold text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-q-border/60 bg-q-bg/70 p-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('appointments.analyticsEngine.sourcesTitle')}
                        </h3>
                        <p className="mb-3 text-xs text-q-text-muted">
                            {t('appointments.analyticsEngine.sourcesDescription')}
                        </p>
                        {sourceItems.length > 0 ? (
                            <div className="space-y-2">
                                {sourceItems.map(([source, count]) => (
                                    <div key={source} className="flex items-center justify-between gap-3">
                                        <span className="truncate text-xs font-medium text-q-text-muted">
                                            {t(`appointments.analyticsEngine.sources.${source}`, humanizeSource(source))}
                                        </span>
                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-q-text-muted">{t('appointments.analyticsEngine.noSources')}</p>
                        )}
                    </div>
                </div>
            </div>
            )}
        </section>
    );
};

function humanizeSource(value: string): string {
    return value
        .split(/[_-]/g)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function readCollapsedPreference(key: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(key) === 'true';
    } catch {
        return false;
    }
}

function saveCollapsedPreference(key: string, value: boolean) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, String(value));
    } catch {
        // Ignore storage failures; the live UI state still updates.
    }
}
