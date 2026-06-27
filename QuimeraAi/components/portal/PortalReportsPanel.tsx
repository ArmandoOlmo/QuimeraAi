import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    ChevronDown,
    ChevronUp,
    DollarSign,
    FileText,
    Loader2,
    ShoppingCart,
    TrendingUp,
    Users,
} from 'lucide-react';
import { usePortal } from './PortalContext';
import { usePortalReports, type PortalReport } from '../../hooks/usePortalReports';

function formatMoney(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
}

function reportPeriod(report: PortalReport) {
    const start = formatDate(report.periodStart);
    const end = formatDate(report.periodEnd);
    return start && end ? `${start} - ${end}` : start || end;
}

const PortalReportsPanel: React.FC = () => {
    const { t } = useTranslation();
    const { tenant, theme } = usePortal();
    const { reports, latestReport, isLoading, error } = usePortalReports(tenant?.id);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    const visibleReports = useMemo(() => reports.slice(0, 4), [reports]);

    if (isLoading) {
        return (
            <section className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-q-text-muted" />
                    <span className="text-sm text-q-text-muted">
                        {t('portal.reports.loading', 'Loading reports...')}
                    </span>
                </div>
            </section>
        );
    }

    if (!isLoading && reports.length === 0) {
        return (
            <section className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${theme.primaryColor}18` }}
                    >
                        <FileText className="h-5 w-5" style={{ color: theme.primaryColor }} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">
                            {t('portal.reports.title', 'Reports')}
                        </h2>
                        <p className="mt-1 text-sm text-q-text-muted">
                            {t('portal.reports.empty', 'Your agency has not shared a report with this workspace yet.')}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-q-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" style={{ color: theme.primaryColor }} />
                        <h2 className="font-semibold text-foreground">
                            {t('portal.reports.title', 'Reports')}
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-q-text-muted">
                        {t('portal.reports.subtitle', 'Performance reports shared by your agency.')}
                    </p>
                </div>
                {latestReport && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-q-success/10 px-3 py-1 text-xs font-medium text-q-success">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t('portal.reports.latest', 'Latest {{date}}', { date: formatDate(latestReport.createdAt) })}
                    </span>
                )}
            </div>

            {error && (
                <div className="border-b border-q-border bg-q-error/10 px-5 py-3 text-sm text-q-error">
                    {error}
                </div>
            )}

            {latestReport && (
                <div className="grid grid-cols-2 gap-3 border-b border-q-border p-5 lg:grid-cols-4">
                    {[
                        {
                            label: t('portal.reports.metrics.revenue', 'Revenue'),
                            value: formatMoney(latestReport.summary.totalRevenue),
                            icon: DollarSign,
                        },
                        {
                            label: t('portal.reports.metrics.leads', 'Leads'),
                            value: latestReport.summary.totalLeads.toLocaleString(),
                            icon: Users,
                        },
                        {
                            label: t('portal.reports.metrics.orders', 'Orders'),
                            value: latestReport.summary.totalOrders.toLocaleString(),
                            icon: ShoppingCart,
                        },
                        {
                            label: t('portal.reports.metrics.visits', 'Visits'),
                            value: latestReport.summary.totalVisits.toLocaleString(),
                            icon: BarChart3,
                        },
                    ].map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <div key={metric.label} className="rounded-lg border border-q-border bg-secondary/30 p-3">
                                <div className="flex items-center gap-2 text-xs text-q-text-muted">
                                    <Icon className="h-3.5 w-3.5" />
                                    {metric.label}
                                </div>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                    {metric.value}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="divide-y divide-border">
                {visibleReports.map((report) => {
                    const isExpanded = expandedReportId === report.id;

                    return (
                        <article key={report.id} className="p-5">
                            <button
                                type="button"
                                onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                                className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-medium text-foreground">
                                            {t('portal.reports.reportTitle', '{{type}} report', { type: report.reportType })}
                                        </h3>
                                        <span className="rounded-full bg-q-accent/10 px-2.5 py-0.5 text-xs font-medium text-q-accent">
                                            {t(`portal.reports.status.${report.status}`, report.status)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-q-text-muted">
                                        {reportPeriod(report) || t('portal.reports.noPeriod', 'No period')}
                                    </p>
                                    {report.aiSummary && (
                                        <p className="mt-2 line-clamp-2 text-sm text-q-text-muted">
                                            {report.aiSummary}
                                        </p>
                                    )}
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium" style={{ color: theme.primaryColor }}>
                                    {isExpanded ? (
                                        <>
                                            {t('portal.reports.hideDetails', 'Hide details')}
                                            <ChevronUp className="h-4 w-4" />
                                        </>
                                    ) : (
                                        <>
                                            {t('portal.reports.viewDetails', 'View details')}
                                            <ChevronDown className="h-4 w-4" />
                                        </>
                                    )}
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="mt-4 rounded-lg bg-secondary/40 p-4">
                                    <h4 className="text-sm font-semibold text-foreground">
                                        {t('portal.reports.executiveSummary', 'Executive summary')}
                                    </h4>
                                    <p className="mt-2 text-sm text-q-text-muted">
                                        {report.aiSummary || t('portal.reports.noSummary', 'No summary was included in this report.')}
                                    </p>

                                    {report.recommendations.length > 0 && (
                                        <>
                                            <h4 className="mt-4 text-sm font-semibold text-foreground">
                                                {t('portal.reports.recommendations', 'Recommendations')}
                                            </h4>
                                            <ul className="mt-2 space-y-2">
                                                {report.recommendations.slice(0, 3).map((recommendation) => (
                                                    <li key={recommendation} className="text-sm text-q-text-muted">
                                                        {recommendation}
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default PortalReportsPanel;
