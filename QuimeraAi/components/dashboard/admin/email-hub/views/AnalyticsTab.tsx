/**
 * AnalyticsTab — Cross-tenant analytics dashboard with charts and detailed metrics.
 */

import React from 'react';
import {
    Send, Eye, MousePointer, AlertCircle, TrendingUp,
    BarChart3, Building2, Layers, Activity, AlertTriangle, CheckCircle,
} from 'lucide-react';
import type {
    EmailStats, MonthlyDataPoint, TenantPerformanceData, CrossTenantCampaign,
} from '../types';
import type { Tenant } from '../../../../../types';
import { useTranslation } from 'react-i18next';

interface AnalyticsTabProps {
    stats: EmailStats;
    campaigns: CrossTenantCampaign[];
    monthlyData: MonthlyDataPoint[];
    tenantPerformance: TenantPerformanceData[];
    tenants: Tenant[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
    stats, campaigns, monthlyData, tenantPerformance, tenants,
}) => {
    const { t } = useTranslation();
    return (
    <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: t('adminEmail.overview.emailsSent'), value: stats.totalSent.toLocaleString(), icon: <Send size={20} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                { label: t('adminEmail.overview.openRate'), value: `${stats.openRate}%`, icon: <Eye size={20} className="text-purple-400" />, bg: 'bg-purple-500/10', sub: `${stats.opened.toLocaleString()} abiertos` },
                { label: t('adminEmail.overview.clickRate'), value: `${stats.clickRate}%`, icon: <MousePointer size={20} className="text-amber-400" />, bg: 'bg-amber-500/10', sub: `${stats.clicked.toLocaleString()} clicks` },
                { label: 'Tasa de Rebote', value: `${stats.bounceRate}%`, icon: <AlertCircle size={20} className="text-red-400" />, bg: 'bg-red-500/10', sub: `${stats.bounced.toLocaleString()} rebotados` },
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
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('adminEmail.analytics.monthlyPerformance')}</h3>
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
                                <span className="text-sm text-editor-text-secondary">{t('adminEmail.analytics.sends')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500/60 rounded" />
                                <span className="text-sm text-editor-text-secondary">{t('adminEmail.analytics.opens')}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-48 flex items-center justify-center text-editor-text-secondary">
                        <div className="text-center">
                            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('adminEmail.analytics.noDataToShow')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tenant Performance */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('adminEmail.analytics.tenantPerformance')}</h3>
                {tenantPerformance.length > 0 ? (
                    <div className="space-y-4">
                        {tenantPerformance.map((tp, i) => (
                            <div key={i} className="p-3 bg-editor-bg/50 rounded-lg">
                                <p className="text-sm font-medium text-editor-text-primary mb-2 truncate">{tp.name}</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-editor-text-secondary">{t('adminEmail.analytics.sends')}</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.sent.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-editor-text-secondary">{t('adminEmail.analytics.opens')}</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.opened.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-editor-text-secondary">{t('adminEmail.analytics.campaigns')}</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.campaigns}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-editor-text-secondary">
                        <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('adminEmail.analytics.noTenantData')}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-green-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('adminEmail.analytics.deliveryRate')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.deliveryRate}%</p>
                <p className="text-editor-text-secondary text-xs mt-1">
                    {t('adminEmail.analytics.deliveredOf', { delivered: stats.delivered.toLocaleString(), total: stats.totalSent.toLocaleString() })}
                </p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-amber-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('adminEmail.analytics.bounces')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.bounced.toLocaleString()}</p>
                <p className="text-editor-text-secondary text-xs mt-1">{t('adminEmail.analytics.bounceTotal', { rate: stats.bounceRate })}</p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="text-indigo-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">{t('adminEmail.analytics.totalCampaigns')}</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.totalCampaigns}</p>
                <p className="text-editor-text-secondary text-xs mt-1">{t('adminEmail.analytics.inTenants', { count: tenants.length })}</p>
            </div>
        </div>

        {/* Per-Campaign Performance Table */}
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
                <h3 className="text-lg font-semibold text-editor-text-primary">{t('adminEmail.analytics.campaignPerformance')}</h3>
                <p className="text-sm text-editor-text-secondary mt-1">{t('adminEmail.analytics.campaignPerformanceDesc')}</p>
            </div>
            {campaigns.filter(c => c.status === 'sent' || c.status === 'sending').length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-editor-border bg-editor-bg/30">
                                <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.campaigns.campaign')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.sentCount')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.deliveredCount')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><Eye size={12} /> {t('adminEmail.analytics.opens')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.openRate')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><MousePointer size={12} /> {t('adminEmail.campaigns.clicks')}</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.clickRate')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.bounceCount')}</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.analytics.complaints')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-editor-border">
                            {campaigns
                                .filter(c => c.status === 'sent' || c.status === 'sending')
                                .sort((a, b) => {
                                    const aTime = a.sentAt?.seconds || a.createdAt?.seconds || 0;
                                    const bTime = b.sentAt?.seconds || b.createdAt?.seconds || 0;
                                    return bTime - aTime;
                                })
                                .map(campaign => {
                                    const s = campaign.stats || {} as any;
                                    const sent = s.sent || 0;
                                    const delivered = s.delivered || sent;
                                    const uniqueOpens = s.uniqueOpens || 0;
                                    const totalOpens = s.totalOpens || s.opened || uniqueOpens;
                                    const uniqueClicks = s.uniqueClicks || 0;
                                    const totalClicks = s.totalClicks || s.clicked || uniqueClicks;
                                    const bounced = s.bounced || 0;
                                    const complaints = s.complaints || s.complained || 0;
                                    const openRate = delivered > 0 ? ((uniqueOpens / delivered) * 100).toFixed(1) : '0.0';
                                    const clickRate = uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) : '0.0';
                                    const bounceRate = sent > 0 ? ((bounced / sent) * 100) : 0;
                                    const openRateNum = parseFloat(openRate);

                                    return (
                                        <tr key={`analytics-${campaign.id}`} className="hover:bg-editor-bg/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-editor-text-primary truncate max-w-[180px]">{campaign.name}</p>
                                                <p className="text-xs text-editor-text-secondary">{campaign.tenantName || 'Admin'}</p>
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-editor-text-primary font-medium">{sent.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center text-sm text-editor-text-primary">{delivered.toLocaleString()}</td>
                                            <td className="px-3 py-3 text-center">
                                                <p className="text-sm font-semibold text-purple-400">{uniqueOpens.toLocaleString()}</p>
                                                {totalOpens > uniqueOpens && (
                                                    <p className="text-[10px] text-editor-text-secondary">{totalOpens} {t('adminEmail.analytics.total')}</p>
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
                                                {totalClicks > uniqueClicks && (
                                                    <p className="text-[10px] text-editor-text-secondary">{totalClicks} {t('adminEmail.analytics.total')}</p>
                                                )}
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
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-sm ${complaints > 0 ? 'text-red-400 font-bold' : 'text-editor-text-secondary'}`}>
                                                    {complaints}
                                                </span>
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
                    <p className="text-sm">{t('adminEmail.analytics.sendCampaignToSeeMetrics')}</p>
                </div>
            )}
        </div>

        {/* Health & Deliverability Indicators */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-green-400" />
                    {t('adminEmail.analytics.emailHealth')}
                </h3>
                <div className="space-y-4">
                    {[
                        { label: t('adminEmail.analytics.deliveryRate'), value: parseFloat(String(stats.deliveryRate || 0)), threshold: { good: 95, warn: 90 }, hint: t('adminEmail.analytics.excellentDelivery') },
                        { label: t('adminEmail.overview.openRate'), value: parseFloat(String(stats.openRate || 0)), threshold: { good: 20, warn: 12 }, hint: t('adminEmail.analytics.excellentOpen') },
                        { label: t('adminEmail.analytics.bounces'), value: parseFloat(String(stats.bounceRate || 0)), threshold: { good: 2, warn: 5 }, inverted: true, hint: t('adminEmail.analytics.healthyBounce') },
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

            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-400" />
                    {t('adminEmail.analytics.webhookConfig')}
                </h3>
                <div className="space-y-3">
                    <div className="bg-editor-bg/50 rounded-lg p-4 border border-editor-border">
                        <p className="text-sm text-editor-text-primary font-medium mb-2">Resend Webhook URL</p>
                        <code className="text-xs text-editor-accent bg-editor-bg px-3 py-1.5 rounded block break-all">
                            https://us-central1-quimeraai.cloudfunctions.net/resendWebhook
                        </code>
                    </div>
                    <div className="text-sm text-editor-text-secondary space-y-2">
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-400" />
                            {t('adminEmail.analytics.webhookDesc1')}
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-purple-400" />
                            {t('adminEmail.analytics.webhookDesc2')}
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-amber-400" />
                            {t('adminEmail.analytics.webhookDesc3')}
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-red-400" />
                            {t('adminEmail.analytics.webhookDesc4')}
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-red-500" />
                            {t('adminEmail.analytics.webhookDesc5')}
                        </p>
                    </div>
                    <p className="text-xs text-editor-text-secondary italic mt-2">
                        {t('adminEmail.analytics.webhookConfigHint')}
                    </p>
                </div>
            </div>
        </div>
    </div>
)};

export default AnalyticsTab;
