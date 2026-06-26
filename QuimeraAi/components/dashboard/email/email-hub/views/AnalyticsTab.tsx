/**
 * AnalyticsTab — User Email Hub analytics dashboard
 * Removed tenant-specific references from admin version
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send, Eye, MousePointer, AlertCircle, TrendingUp,
    BarChart3, Layers, Activity, CheckCircle, Inbox, Radio, GitBranch,
} from 'lucide-react';
import type { EmailStats, MonthlyDataPoint, UserEmailCampaign } from '../types';
import type { CanonicalEmailAnalytics } from '../../../../../services/email/emailAnalyticsService.ts';

interface AnalyticsTabProps {
    stats: EmailStats;
    campaigns: UserEmailCampaign[];
    monthlyData: MonthlyDataPoint[];
    canonicalAnalytics?: CanonicalEmailAnalytics | null;
    canonicalAnalyticsLoading?: boolean;
    canonicalAnalyticsError?: string | null;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
    stats, campaigns, monthlyData, canonicalAnalytics, canonicalAnalyticsLoading, canonicalAnalyticsError,
}) => {
    const { t } = useTranslation();
    return (
    <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: t('email.hub.analytics.emailsSent'), value: stats.totalSent.toLocaleString(), icon: <Send size={20} className="text-q-accent" />, bg: 'bg-q-accent/10' },
                { label: t('email.hub.analytics.openRate'), value: `${stats.openRate}%`, icon: <Eye size={20} className="text-q-accent" />, bg: 'bg-q-accent/10', sub: `${stats.opened.toLocaleString()} ${t('email.hub.analytics.opened')}` },
                { label: t('email.hub.analytics.clickRate'), value: `${stats.clickRate}%`, icon: <MousePointer size={20} className="text-q-accent" />, bg: 'bg-q-accent/10', sub: `${stats.clicked.toLocaleString()} ${t('email.hub.analytics.clicks')}` },
                { label: t('email.hub.analytics.bounceRate'), value: `${stats.bounceRate}%`, icon: <AlertCircle size={20} className="text-q-error" />, bg: 'bg-q-error/10', sub: `${stats.bounced.toLocaleString()} ${t('email.hub.analytics.bounced')}` },
            ].map((metric, i) => (
                <div key={i} className="bg-q-surface border border-q-border rounded-xl p-5">
                    <div className={`p-2 ${metric.bg} rounded-lg w-fit mb-3`}>{metric.icon}</div>
                    <p className="text-2xl font-bold text-q-text">{metric.value}</p>
                    <p className="text-sm text-q-text-secondary">{metric.label}</p>
                    {metric.sub && <p className="text-xs text-q-text-secondary mt-1">{metric.sub}</p>}
                </div>
            ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-q-surface border border-q-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-q-text mb-4">{t('email.hub.analytics.monthlyPerformance')}</h3>
                {monthlyData.some(d => d.sent > 0) ? (
                    <>
                        <div className="h-48 flex items-end gap-4 justify-between px-2">
                            {monthlyData.map((data, i) => {
                                const maxSent = Math.max(...monthlyData.map(d => d.sent), 1);
                                const height = (data.sent / maxSent) * 100;
                                const openedHeight = data.sent > 0 ? (data.opened / data.sent) * height : 0;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex flex-col gap-0.5 min-h-[4px]">
                                            <div className="w-full bg-q-accent/80 rounded-t transition-all" style={{ height: `${Math.max(height * 1.5, data.sent > 0 ? 4 : 0)}px` }} />
                                            <div className="w-full bg-q-accent/60 rounded transition-all" style={{ height: `${Math.max(openedHeight * 1.5, data.opened > 0 ? 2 : 0)}px` }} />
                                        </div>
                                        <span className="text-xs text-q-text-secondary">{data.month}</span>
                                        <span className="text-xs font-medium text-q-text">{data.sent}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-q-accent/80 rounded" />
                                <span className="text-sm text-q-text-secondary">{t('email.hub.analytics.sent')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-q-accent/60 rounded" />
                                <span className="text-sm text-q-text-secondary">{t('email.hub.analytics.openedLabel')}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-48 flex items-center justify-center text-q-text-secondary">
                        <div className="text-center">
                            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('email.hub.analytics.noDataToShow')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Health */}
            <div className="bg-q-surface border border-q-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-q-success" />
                    {t('email.hub.analytics.emailHealth')}
                </h3>
                <div className="space-y-4">
                    {[
                        { label: t('email.hub.analytics.deliveryRate'), value: parseFloat(String(stats.deliveryRate || 0)), threshold: { good: 95, warn: 90 }, hint: t('email.hub.analytics.excellentDelivery') },
                        { label: t('email.hub.analytics.openRate'), value: parseFloat(String(stats.openRate || 0)), threshold: { good: 20, warn: 12 }, hint: t('email.hub.analytics.excellentOpens') },
                        { label: t('email.hub.analytics.bounceRate'), value: parseFloat(String(stats.bounceRate || 0)), threshold: { good: 2, warn: 5 }, inverted: true, hint: t('email.hub.analytics.healthyBounce') },
                    ].map((metric, i) => {
                        const isGood = metric.inverted
                            ? metric.value <= metric.threshold.good
                            : metric.value >= metric.threshold.good;
                        const isWarn = metric.inverted
                            ? metric.value <= metric.threshold.warn
                            : metric.value >= metric.threshold.warn;
                        const color = isGood ? 'text-q-success' : isWarn ? 'text-q-accent' : 'text-q-error';
                        const bgColor = isGood ? 'bg-q-success' : isWarn ? 'bg-q-accent' : 'bg-q-error';
                        return (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-q-text-secondary">{metric.label}</span>
                                    <span className={`text-sm font-bold ${color}`}>{metric.value.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-q-surface-overlay rounded-full">
                                    <div
                                        className={`h-full rounded-full transition-all ${bgColor}`}
                                        style={{ width: `${Math.min(metric.inverted ? 100 - metric.value : metric.value, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-q-text-secondary mt-0.5">{metric.hint}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-q-success" size={20} />
                    <span className="text-q-text-secondary text-sm">{t('email.hub.analytics.deliveryRate')}</span>
                </div>
                <p className="text-2xl font-bold text-q-text">{stats.deliveryRate}%</p>
                <p className="text-q-text-secondary text-xs mt-1">
                    {t('email.hub.analytics.deliveredOf', { delivered: stats.delivered.toLocaleString(), total: stats.totalSent.toLocaleString() })}
                </p>
            </div>
            <div className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-q-accent" size={20} />
                    <span className="text-q-text-secondary text-sm">{t('email.hub.analytics.bounces')}</span>
                </div>
                <p className="text-2xl font-bold text-q-text">{stats.bounced.toLocaleString()}</p>
                <p className="text-q-text-secondary text-xs mt-1">{t('email.hub.analytics.ofTotal', { rate: stats.bounceRate })}</p>
            </div>
            <div className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="text-q-accent" size={20} />
                    <span className="text-q-text-secondary text-sm">{t('email.hub.analytics.totalCampaigns')}</span>
                </div>
                <p className="text-2xl font-bold text-q-text">{stats.totalCampaigns}</p>
                <p className="text-q-text-secondary text-xs mt-1">{t('email.hub.analytics.inProject')}</p>
            </div>
        </div>

        <div className="bg-q-surface border border-q-border rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-q-text flex items-center gap-2">
                        <Activity size={18} className="text-q-accent" />
                        {t('email.hub.analytics.canonicalPipeline', 'Canonical pipeline')}
                    </h3>
                    <p className="text-sm text-q-text-secondary">
                        {t('email.hub.analytics.canonicalPipelineSubtitle', 'Outbox, provider events and cross-module delivery health.')}
                    </p>
                </div>
                {canonicalAnalyticsLoading && <span className="text-xs text-q-text-secondary">{t('common.loading', 'Loading...')}</span>}
            </div>

            {canonicalAnalyticsError ? (
                <div className="border border-q-error/30 bg-q-error/10 rounded-lg px-4 py-3 text-sm text-q-error">
                    {canonicalAnalyticsError}
                </div>
            ) : canonicalAnalytics ? (
                <div className="space-y-5">
                    <div className="grid md:grid-cols-4 gap-3">
                        {[
                            {
                                label: t('email.hub.analytics.outboxQueued', 'Outbox queued'),
                                value: canonicalAnalytics.outbox.queued,
                                sub: t('email.hub.analytics.outboxDue', '{{count}} due', { count: canonicalAnalytics.outbox.due }),
                                icon: <Inbox size={18} />,
                            },
                            {
                                label: t('email.hub.analytics.outboxFailed', 'Outbox failed'),
                                value: canonicalAnalytics.outbox.failed,
                                sub: t('email.hub.analytics.outboxLocked', '{{count}} locked', { count: canonicalAnalytics.outbox.locked }),
                                icon: <AlertCircle size={18} />,
                            },
                            {
                                label: t('email.hub.analytics.providerEvents', 'Provider events'),
                                value: canonicalAnalytics.events.total,
                                sub: Object.keys(canonicalAnalytics.events.byType).slice(0, 2).join(', ') || t('email.hub.analytics.noEvents', 'No events'),
                                icon: <Radio size={18} />,
                            },
                            {
                                label: t('email.hub.analytics.crossModuleLogs', 'Cross-module logs'),
                                value: canonicalAnalytics.summary.totalLogs,
                                sub: t('email.hub.analytics.failedSkipped', '{{failed}} failed · {{skipped}} skipped', {
                                    failed: canonicalAnalytics.summary.failed,
                                    skipped: canonicalAnalytics.summary.skipped,
                                }),
                                icon: <GitBranch size={18} />,
                            },
                        ].map((item) => (
                            <div key={item.label} className="border border-q-border bg-q-bg/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-q-accent mb-2">{item.icon}<span className="text-xs text-q-text-secondary">{item.label}</span></div>
                                <p className="text-xl font-bold text-q-text">{item.value.toLocaleString()}</p>
                                <p className="text-xs text-q-text-secondary truncate">{item.sub}</p>
                            </div>
                        ))}
                    </div>

                    {canonicalAnalytics.sourceModules.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-3">
                            {canonicalAnalytics.sourceModules.slice(0, 6).map((source) => (
                                <div key={source.sourceModule} className="flex items-center justify-between gap-3 border border-q-border rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-q-text">{source.sourceModule}</p>
                                        <p className="text-xs text-q-text-secondary">
                                            {t('email.hub.analytics.moduleDeliverySummary', '{{sent}} sent · {{failed}} failed · {{skipped}} skipped', {
                                                sent: source.sent,
                                                failed: source.failed,
                                                skipped: source.skipped,
                                            })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-q-text">{source.total.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                        <div className="border border-q-border bg-q-bg/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2 text-q-accent">
                                <TrendingUp size={18} />
                                <span className="text-sm font-semibold text-q-text">Revenue attribution</span>
                            </div>
                            <p className="text-2xl font-bold text-q-text">{formatCurrency(canonicalAnalytics.revenue.total)}</p>
                            <p className="text-xs text-q-text-secondary">{canonicalAnalytics.revenue.orders.toLocaleString()} attributed order events</p>
                            <div className="mt-3 space-y-2">
                                {canonicalAnalytics.revenue.bySourceModule.slice(0, 4).map((item) => (
                                    <div key={item.sourceModule} className="flex items-center justify-between gap-3 text-xs">
                                        <span className="truncate text-q-text-secondary">{item.sourceModule}</span>
                                        <span className="font-semibold text-q-text">{formatCurrency(item.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border border-q-border bg-q-bg/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3 text-q-accent">
                                <GitBranch size={18} />
                                <span className="text-sm font-semibold text-q-text">Journey attribution</span>
                            </div>
                            {canonicalAnalytics.journeys.length > 0 ? (
                                <div className="space-y-3">
                                    {canonicalAnalytics.journeys.slice(0, 4).map((journey) => (
                                        <div key={journey.automationId} className="rounded-lg border border-q-border bg-q-surface px-3 py-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="min-w-0 truncate text-sm font-medium text-q-text">{journey.automationId}</p>
                                                <span className="text-xs font-semibold text-q-text">{journey.total.toLocaleString()}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-q-text-secondary">
                                                {journey.sent} sent · {journey.opened} opened · {journey.clicked} clicked · {formatCurrency(journey.revenue)}
                                            </p>
                                            {journey.paths[0] && <p className="mt-1 truncate text-[11px] text-q-text-secondary">{journey.paths[0]}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-q-text-secondary">No automation journey logs yet.</p>
                            )}
                        </div>
                    </div>

                    {canonicalAnalytics.automationSteps.length > 0 && (
                        <div className="border border-q-border bg-q-bg/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3 text-q-accent">
                                <Layers size={18} />
                                <span className="text-sm font-semibold text-q-text">Automation steps</span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {canonicalAnalytics.automationSteps.slice(0, 6).map((step) => (
                                    <div key={`${step.automationId}-${step.stepId}`} className="rounded-lg border border-q-border bg-q-surface px-3 py-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="min-w-0 truncate text-sm font-medium text-q-text">{step.stepId}</p>
                                            <span className="text-xs text-q-text-secondary">{step.averageDelayMinutes}m avg wait</span>
                                        </div>
                                        <p className="mt-1 text-xs text-q-text-secondary">
                                            {step.sent} sent · {step.skipped} skipped · {step.failed} failed · {formatCurrency(step.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {canonicalAnalytics.recipientTimelines.length > 0 && (
                        <div className="border border-q-border bg-q-bg/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3 text-q-accent">
                                <Activity size={18} />
                                <span className="text-sm font-semibold text-q-text">Recipient timelines</span>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {canonicalAnalytics.recipientTimelines.slice(0, 4).map((timeline) => (
                                    <div key={timeline.recipientEmail} className="rounded-lg border border-q-border bg-q-surface px-3 py-2">
                                        <p className="truncate text-sm font-medium text-q-text">{timeline.recipientEmail}</p>
                                        <div className="mt-2 space-y-1">
                                            {timeline.events.slice(0, 3).map((event, index) => (
                                                <div key={`${timeline.recipientEmail}-${event.type}-${event.logId || event.eventId || index}`} className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="truncate text-q-text-secondary">{event.eventType || event.status || event.subject || event.type}</span>
                                                    <span className="shrink-0 text-q-text-secondary">{formatShortDate(event.at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-sm text-q-text-secondary">
                    {t('email.hub.analytics.noCanonicalAnalytics', 'No canonical email runtime data yet.')}
                </div>
            )}
        </div>

        {/* Per-Campaign Performance Table */}
        <div className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-q-border">
                <h3 className="text-lg font-semibold text-q-text">{t('email.hub.analytics.campaignPerformance')}</h3>
                <p className="text-sm text-q-text-secondary mt-1">{t('email.hub.analytics.detailedMetrics')}</p>
            </div>
            {campaigns.filter(c => c.status === 'sent' || c.status === 'sending').length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-q-border bg-q-bg/30">
                                <th className="text-left px-4 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.campaignCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.sentCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.deliveredCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><Eye size={12} /> {t('email.hub.analytics.opensCol')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.openRateCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><MousePointer size={12} /> {t('email.hub.analytics.clicksCol')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.ctrCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-q-text-secondary uppercase tracking-wider">{t('email.hub.analytics.bouncesCol')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-editor-border">
                            {campaigns
                                .filter(c => c.status === 'sent' || c.status === 'sending')
                                .sort((a, b) => {
                                    const aTime = (a as any).sentAt?.seconds || (a as any).createdAt?.seconds || 0;
                                    const bTime = (b as any).sentAt?.seconds || (b as any).createdAt?.seconds || 0;
                                    return bTime - aTime;
                                })
                                .map(campaign => {
                                    const s = campaign.stats || {} as any;
                                    const sent = s.sent || 0;
                                    const delivered = s.delivered || sent;
                                    const uniqueOpens = s.uniqueOpens || 0;
                                    const totalOpens = s.totalOpens || s.opened || uniqueOpens;
                                    const uniqueClicks = s.uniqueClicks || 0;
                                    const bounced = s.bounced || 0;
                                    const openRate = delivered > 0 ? ((uniqueOpens / delivered) * 100).toFixed(1) : '0.0';
                                    const clickRate = uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) : '0.0';
                                    const bounceRate = sent > 0 ? ((bounced / sent) * 100) : 0;
                                    const openRateNum = parseFloat(openRate);

                                    return (
                                        <tr key={`analytics-${campaign.id}`} className="hover:bg-q-bg/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-q-text truncate max-w-[180px]">{campaign.name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-q-text font-medium">{sent.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center text-sm text-q-text">{delivered.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center">
                                                <p className="text-sm font-semibold text-q-accent">{uniqueOpens.toLocaleString()}</p>
                                                {totalOpens > uniqueOpens && (
                                                    <p className="text-[10px] text-q-text-secondary">{totalOpens} {t('email.hub.analytics.total')}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-sm font-bold ${openRateNum > 25 ? 'text-q-success' : openRateNum > 15 ? 'text-q-accent' : 'text-q-error'}`}>
                                                        {openRate}%
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-q-surface-overlay rounded-full mt-1">
                                                        <div
                                                            className={`h-full rounded-full ${openRateNum > 25 ? 'bg-q-success' : openRateNum > 15 ? 'bg-q-accent' : 'bg-q-error'}`}
                                                            style={{ width: `${Math.min(openRateNum, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <p className="text-sm font-semibold text-q-accent">{uniqueClicks.toLocaleString()}</p>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-medium text-q-text">{clickRate}%</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-sm font-medium ${bounceRate > 5 ? 'text-q-error' : bounceRate > 2 ? 'text-q-accent' : 'text-q-success'}`}>
                                                    {bounced}
                                                </span>
                                                {bounceRate > 0 && (
                                                    <p className="text-[10px] text-q-text-secondary">{bounceRate.toFixed(1)}%</p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-q-text-secondary">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('email.hub.analytics.sendCampaignToSeeMetrics')}</p>
                </div>
            )}
        </div>
    </div>
    );
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatShortDate(value?: string | null) {
    if (!value) return 'n/a';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'n/a' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default AnalyticsTab;
