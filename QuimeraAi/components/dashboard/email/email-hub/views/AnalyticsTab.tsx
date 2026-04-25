/**
 * AnalyticsTab — User Email Hub analytics dashboard
 * Removed tenant-specific references from admin version
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send, Eye, MousePointer, AlertCircle, TrendingUp,
    BarChart3, Layers, Activity, CheckCircle,
} from 'lucide-react';
import type { EmailStats, MonthlyDataPoint, UserEmailCampaign } from '../types';

interface AnalyticsTabProps {
    stats: EmailStats;
    campaigns: UserEmailCampaign[];
    monthlyData: MonthlyDataPoint[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
    stats, campaigns, monthlyData,
}) => {
    const { t } = useTranslation();
    return (
    <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: t('email.hub.analytics.emailsSent'), value: stats.totalSent.toLocaleString(), icon: <Send size={20} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                { label: t('email.hub.analytics.openRate'), value: `${stats.openRate}%`, icon: <Eye size={20} className="text-purple-400" />, bg: 'bg-purple-500/10', sub: `${stats.opened.toLocaleString()} ${t('email.hub.analytics.opened')}` },
                { label: t('email.hub.analytics.clickRate'), value: `${stats.clickRate}%`, icon: <MousePointer size={20} className="text-amber-400" />, bg: 'bg-amber-500/10', sub: `${stats.clicked.toLocaleString()} ${t('email.hub.analytics.clicks')}` },
                { label: t('email.hub.analytics.bounceRate'), value: `${stats.bounceRate}%`, icon: <AlertCircle size={20} className="text-red-400" />, bg: 'bg-red-500/10', sub: `${stats.bounced.toLocaleString()} ${t('email.hub.analytics.bounced')}` },
            ].map((metric, i) => (
                <div key={i} className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                    <div className={`p-2 ${metric.bg} rounded-lg w-fit mb-3`}>{metric.icon}</div>
                    <p className="text-2xl font-bold text-editor-text-primary">{metric.value}</p>
                    <p className="text-sm text-editor-text-secondary">{metric.label}</p>
                    {metric.sub && <p className="text-xs text-editor-text-secondary mt-1">{metric.sub}</p>}
                </div>
            ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('email.hub.analytics.monthlyPerformance')}</h3>
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
                                            <div className="w-full bg-editor-accent/80 rounded-t transition-all" style={{ height: `${Math.max(height * 1.5, data.sent > 0 ? 4 : 0)}px` }} />
                                            <div className="w-full bg-purple-500/60 rounded transition-all" style={{ height: `${Math.max(openedHeight * 1.5, data.opened > 0 ? 2 : 0)}px` }} />
                                        </div>
                                        <span className="text-xs text-editor-text-secondary">{data.month}</span>
                                        <span className="text-xs font-medium text-editor-text-primary">{data.sent}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-editor-accent/80 rounded" />
                                <span className="text-sm text-editor-text-secondary">{t('email.hub.analytics.sent')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500/60 rounded" />
                                <span className="text-sm text-editor-text-secondary">{t('email.hub.analytics.openedLabel')}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-48 flex items-center justify-center text-editor-text-secondary">
                        <div className="text-center">
                            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('email.hub.analytics.noDataToShow')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Health */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-green-400" />
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
                        const color = isGood ? 'text-green-400' : isWarn ? 'text-amber-400' : 'text-red-400';
                        const bgColor = isGood ? 'bg-green-400' : isWarn ? 'bg-amber-400' : 'bg-red-400';
                        return (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-editor-text-secondary">{metric.label}</span>
                                    <span className={`text-sm font-bold ${color}`}>{metric.value.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-editor-border rounded-full">
                                    <div
                                        className={`h-full rounded-full transition-all ${bgColor}`}
                                        style={{ width: `${Math.min(metric.inverted ? 100 - metric.value : metric.value, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-editor-text-secondary mt-0.5">{metric.hint}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-green-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('email.hub.analytics.deliveryRate')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.deliveryRate}%</p>
                <p className="text-editor-text-secondary text-xs mt-1">
                    {t('email.hub.analytics.deliveredOf', { delivered: stats.delivered.toLocaleString(), total: stats.totalSent.toLocaleString() })}
                </p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-amber-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('email.hub.analytics.bounces')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.bounced.toLocaleString()}</p>
                <p className="text-editor-text-secondary text-xs mt-1">{t('email.hub.analytics.ofTotal', { rate: stats.bounceRate })}</p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="text-indigo-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('email.hub.analytics.totalCampaigns')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.totalCampaigns}</p>
                <p className="text-editor-text-secondary text-xs mt-1">{t('email.hub.analytics.inProject')}</p>
            </div>
        </div>

        {/* Per-Campaign Performance Table */}
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
                <h3 className="text-lg font-semibold text-editor-text-primary">{t('email.hub.analytics.campaignPerformance')}</h3>
                <p className="text-sm text-editor-text-secondary mt-1">{t('email.hub.analytics.detailedMetrics')}</p>
            </div>
            {campaigns.filter(c => c.status === 'sent' || c.status === 'sending').length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-editor-border bg-editor-bg/30">
                                <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.campaignCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.sentCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.deliveredCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><Eye size={12} /> {t('email.hub.analytics.opensCol')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.openRateCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><MousePointer size={12} /> {t('email.hub.analytics.clicksCol')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.ctrCol')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('email.hub.analytics.bouncesCol')}</th>
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
                                        <tr key={`analytics-${campaign.id}`} className="hover:bg-editor-bg/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-editor-text-primary truncate max-w-[180px]">{campaign.name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-editor-text-primary font-medium">{sent.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center text-sm text-editor-text-primary">{delivered.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center">
                                                <p className="text-sm font-semibold text-purple-400">{uniqueOpens.toLocaleString()}</p>
                                                {totalOpens > uniqueOpens && (
                                                    <p className="text-[10px] text-editor-text-secondary">{totalOpens} {t('email.hub.analytics.total')}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-sm font-bold ${openRateNum > 25 ? 'text-green-400' : openRateNum > 15 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {openRate}%
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-editor-border rounded-full mt-1">
                                                        <div
                                                            className={`h-full rounded-full ${openRateNum > 25 ? 'bg-green-400' : openRateNum > 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                            style={{ width: `${Math.min(openRateNum, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <p className="text-sm font-semibold text-amber-400">{uniqueClicks.toLocaleString()}</p>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm font-medium text-editor-text-primary">{clickRate}%</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-sm font-medium ${bounceRate > 5 ? 'text-red-400' : bounceRate > 2 ? 'text-amber-400' : 'text-green-400'}`}>
                                                    {bounced}
                                                </span>
                                                {bounceRate > 0 && (
                                                    <p className="text-[10px] text-editor-text-secondary">{bounceRate.toFixed(1)}%</p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-editor-text-secondary">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('email.hub.analytics.sendCampaignToSeeMetrics')}</p>
                </div>
            )}
        </div>
    </div>
    );
};

export default AnalyticsTab;
