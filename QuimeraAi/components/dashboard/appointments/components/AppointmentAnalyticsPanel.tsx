import React from 'react';
import {
    Bot,
    CalendarCheck2,
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
    const engine = analytics.engine || EMPTY_ENGINE_ANALYTICS;
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

    return (
        <section className="border-b border-q-border bg-q-surface/40 px-3 py-3 sm:px-6">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-q-text-muted">
                        {t('appointments.analyticsEngine.eyebrow')}
                    </p>
                    <h2 className="text-sm font-semibold text-foreground">
                        {t('appointments.analyticsEngine.title')}
                    </h2>
                </div>
                <p className="text-xs text-q-text-muted">
                    {t('appointments.analyticsEngine.description')}
                </p>
            </div>

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

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
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
