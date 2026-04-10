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

interface AnalyticsTabProps {
    stats: EmailStats;
    campaigns: CrossTenantCampaign[];
    monthlyData: MonthlyDataPoint[];
    tenantPerformance: TenantPerformanceData[];
    tenants: Tenant[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
    stats, campaigns, monthlyData, tenantPerformance, tenants,
}) => (
    <div className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: 'Emails Enviados', value: stats.totalSent.toLocaleString(), icon: <Send size={20} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                { label: 'Tasa de Apertura', value: `${stats.openRate}%`, icon: <Eye size={20} className="text-purple-400" />, bg: 'bg-purple-500/10', sub: `${stats.opened.toLocaleString()} abiertos` },
                { label: 'Tasa de Click', value: `${stats.clickRate}%`, icon: <MousePointer size={20} className="text-amber-400" />, bg: 'bg-amber-500/10', sub: `${stats.clicked.toLocaleString()} clicks` },
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
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Rendimiento Mensual</h3>
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
                                <span className="text-sm text-editor-text-secondary">Enviados</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500/60 rounded" />
                                <span className="text-sm text-editor-text-secondary">Abiertos</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-48 flex items-center justify-center text-editor-text-secondary">
                        <div className="text-center">
                            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin datos para mostrar</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tenant Performance */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Rendimiento por Tenant</h3>
                {tenantPerformance.length > 0 ? (
                    <div className="space-y-4">
                        {tenantPerformance.map((tp, i) => (
                            <div key={i} className="p-3 bg-editor-bg/50 rounded-lg">
                                <p className="text-sm font-medium text-editor-text-primary mb-2 truncate">{tp.name}</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-editor-text-secondary">Envíos</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.sent.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-editor-text-secondary">Aperturas</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.opened.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-editor-text-secondary">Campañas</p>
                                        <p className="text-editor-text-primary font-semibold">{tp.campaigns}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-editor-text-secondary">
                        <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin datos de tenants</p>
                    </div>
                )}
            </div>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-green-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">Tasa de Entrega</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.deliveryRate}%</p>
                <p className="text-editor-text-secondary text-xs mt-1">
                    {stats.delivered.toLocaleString()} de {stats.totalSent.toLocaleString()} enviados
                </p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="text-amber-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">Rebotes</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.bounced.toLocaleString()}</p>
                <p className="text-editor-text-secondary text-xs mt-1">{stats.bounceRate}% del total</p>
            </div>
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="text-indigo-500" size={20} />
                    <span className="text-editor-text-secondary text-sm">Total Campañas</span>
                </div>
                <p className="text-2xl font-bold text-editor-text-primary">{stats.totalCampaigns}</p>
                <p className="text-editor-text-secondary text-xs mt-1">En {tenants.length} tenants</p>
            </div>
        </div>

        {/* Per-Campaign Performance Table */}
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
                <h3 className="text-lg font-semibold text-editor-text-primary">Rendimiento por Campaña</h3>
                <p className="text-sm text-editor-text-secondary mt-1">Métricas detalladas de cada campaña enviada</p>
            </div>
            {campaigns.filter(c => c.status === 'sent' || c.status === 'sending').length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-editor-border bg-editor-bg/30">
                                <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Campaña</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Enviados</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Entregados</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><Eye size={12} /> Aperturas</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Tasa Apertura</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1"><MousePointer size={12} /> Clics</div>
                                </th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">CTR</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Rebotes</th>
                                <th className="text-center px-3 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Quejas</th>
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
                                                    <p className="text-[10px] text-editor-text-secondary">{totalOpens} total</p>
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
                                                    <p className="text-[10px] text-editor-text-secondary">{totalClicks} total</p>
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
                    <p className="text-sm">Envía una campaña para ver métricas detalladas</p>
                </div>
            )}
        </div>

        {/* Health & Deliverability Indicators */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-green-400" />
                    Salud del Email
                </h3>
                <div className="space-y-4">
                    {[
                        { label: 'Tasa de Entrega', value: parseFloat(String(stats.deliveryRate || 0)), threshold: { good: 95, warn: 90 }, hint: '> 95% es excelente' },
                        { label: 'Tasa de Apertura', value: parseFloat(String(stats.openRate || 0)), threshold: { good: 20, warn: 12 }, hint: '> 20% es excelente' },
                        { label: 'Tasa de Rebote', value: parseFloat(String(stats.bounceRate || 0)), threshold: { good: 2, warn: 5 }, inverted: true, hint: '< 2% es saludable' },
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
                    Configuración de Webhooks
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
                            email.delivered — Entrega confirmada
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-purple-400" />
                            email.opened — Aperturas rastreadas
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-amber-400" />
                            email.clicked — Clics rastreados
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-red-400" />
                            email.bounced — Rebotes detectados
                        </p>
                        <p className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-red-500" />
                            email.complained — Quejas de spam
                        </p>
                    </div>
                    <p className="text-xs text-editor-text-secondary italic mt-2">
                        Configura en resend.com → Webhooks → Add Endpoint
                    </p>
                </div>
            </div>
        </div>
    </div>
);

export default AnalyticsTab;
