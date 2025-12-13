/**
 * AnalyticsView
 * Vista para análiticas de email marketing con datos reales
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    TrendingDown,
    Send,
    Eye,
    MousePointer,
    AlertCircle,
    Calendar,
    Loader2,
    Mail,
    BarChart3,
} from 'lucide-react';
import { useEmailDashboardContext } from '../EmailDashboard';
import { useEmailLogs, useEmailCampaigns } from '../../../../hooks/useEmailSettings';

type TimeRange = '7d' | '30d' | '90d' | '12m';

interface MonthlyData {
    month: string;
    sent: number;
    opened: number;
    clicked: number;
}

const AnalyticsView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();
    
    // Use real data from Firebase
    const { logs, stats, isLoading: logsLoading } = useEmailLogs(userId, projectId);
    const { campaigns, isLoading: campaignsLoading } = useEmailCampaigns(userId, projectId);

    const [timeRange, setTimeRange] = useState<TimeRange>('30d');

    const timeRanges: { value: TimeRange; label: string }[] = [
        { value: '7d', label: t('email.last7days', 'Últimos 7 días') },
        { value: '30d', label: t('email.last30days', 'Últimos 30 días') },
        { value: '90d', label: t('email.last90days', 'Últimos 90 días') },
        { value: '12m', label: t('email.last12months', 'Últimos 12 meses') },
    ];

    // Filter logs based on time range
    const filteredLogs = useMemo(() => {
        const now = new Date();
        let cutoffDate = new Date();
        
        switch (timeRange) {
            case '7d':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case '12m':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        return logs.filter(log => {
            if (!log.sentAt) return false;
            const logDate = log.sentAt.seconds 
                ? new Date(log.sentAt.seconds * 1000) 
                : new Date(log.sentAt);
            return logDate >= cutoffDate;
        });
    }, [logs, timeRange]);

    // Calculate real analytics from filtered logs
    const analytics = useMemo(() => {
        const totalSent = filteredLogs.length;
        const delivered = filteredLogs.filter(log => 
            log.status === 'delivered' || log.status === 'sent' || log.status === 'opened' || log.status === 'clicked'
        ).length;
        const opened = filteredLogs.filter(log => log.status === 'opened' || log.opened).length;
        const clicked = filteredLogs.filter(log => log.status === 'clicked' || log.clicked).length;
        const bounced = filteredLogs.filter(log => log.status === 'bounced').length;
        const complained = filteredLogs.filter(log => log.status === 'complained').length;

        // Calculate rates
        const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
        const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
        const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
        const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
        const unsubscribeRate = totalSent > 0 ? (complained / totalSent) * 100 : 0;

        return {
            totalSent,
            delivered,
            opened,
            clicked,
            bounced,
            complained,
            deliveryRate: deliveryRate.toFixed(1),
            openRate: openRate.toFixed(1),
            clickRate: clickRate.toFixed(1),
            bounceRate: bounceRate.toFixed(1),
            unsubscribeRate: unsubscribeRate.toFixed(2),
        };
    }, [filteredLogs]);

    // Group logs by month for the chart
    const monthlyData = useMemo((): MonthlyData[] => {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthMap = new Map<string, { sent: number; opened: number; clicked: number }>();

        // Initialize last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            monthMap.set(key, { sent: 0, opened: 0, clicked: 0 });
        }

        // Populate with log data
        filteredLogs.forEach(log => {
            if (!log.sentAt) return;
            const logDate = log.sentAt.seconds 
                ? new Date(log.sentAt.seconds * 1000) 
                : new Date(log.sentAt);
            const key = `${logDate.getFullYear()}-${logDate.getMonth()}`;
            
            const existing = monthMap.get(key);
            if (existing) {
                existing.sent++;
                if (log.status === 'opened' || log.opened) existing.opened++;
                if (log.status === 'clicked' || log.clicked) existing.clicked++;
            }
        });

        // Convert to array
        return Array.from(monthMap.entries())
            .map(([key, data]) => {
                const [year, month] = key.split('-').map(Number);
                return {
                    month: monthNames[month],
                    ...data,
                };
            })
            .slice(-6); // Last 6 months
    }, [filteredLogs]);

    // Get top performing campaigns
    const topCampaigns = useMemo(() => {
        return campaigns
            .filter(c => c.status === 'sent' && c.stats?.sent > 0)
            .map(c => ({
                name: c.name,
                openRate: c.stats?.sent > 0 
                    ? ((c.stats?.uniqueOpens || 0) / c.stats.sent * 100).toFixed(1)
                    : '0.0',
                clickRate: c.stats?.uniqueOpens > 0 
                    ? ((c.stats?.uniqueClicks || 0) / c.stats.uniqueOpens * 100).toFixed(1)
                    : '0.0',
            }))
            .sort((a, b) => parseFloat(b.openRate) - parseFloat(a.openRate))
            .slice(0, 3);
    }, [campaigns]);

    const isLoading = logsLoading || campaignsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // Check if there's no data
    const hasNoData = analytics.totalSent === 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {t('email.analytics', 'Analíticas')}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t('email.analyticsSubtitle', 'Métricas de rendimiento de tus emails')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground" size={18} />
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                        className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {timeRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {hasNoData ? (
                <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
                    <BarChart3 className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('email.noAnalyticsData', 'Sin datos de analíticas')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('email.noAnalyticsDataDesc', 'Envía tu primera campaña para ver métricas aquí')}
                    </p>
                </div>
            ) : (
                <>
                    {/* Main Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Emails Sent */}
                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Send className="text-blue-500" size={20} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {analytics.totalSent.toLocaleString()}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('email.emailsSent', 'Emails enviados')}
                            </p>
                        </div>

                        {/* Open Rate */}
                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Eye className="text-purple-500" size={20} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {analytics.openRate}%
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('email.openRate', 'Tasa de apertura')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {analytics.opened.toLocaleString()} {t('email.opened', 'abiertos')}
                            </p>
                        </div>

                        {/* Click Rate */}
                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <MousePointer className="text-amber-500" size={20} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {analytics.clickRate}%
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('email.clickRate', 'Tasa de clicks')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {analytics.clicked.toLocaleString()} clicks
                            </p>
                        </div>

                        {/* Bounce Rate */}
                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertCircle className="text-red-500" size={20} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {analytics.bounceRate}%
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('email.bounceRate', 'Tasa de rebote')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {analytics.bounced.toLocaleString()} {t('email.bounced', 'rebotados')}
                            </p>
                        </div>
                    </div>

                    {/* Charts & Details */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-card/50 border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                {t('email.performanceOverTime', 'Rendimiento en el Tiempo')}
                            </h3>
                            
                            {monthlyData.some(d => d.sent > 0) ? (
                                <>
                                    {/* Simple bar chart visualization */}
                                    <div className="h-64 flex items-end gap-4 justify-between px-4">
                                        {monthlyData.map((data, index) => {
                                            const maxSent = Math.max(...monthlyData.map(d => d.sent), 1);
                                            const height = (data.sent / maxSent) * 100;
                                            const openedHeight = data.sent > 0 ? (data.opened / data.sent) * height : 0;
                                            return (
                                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="w-full flex flex-col gap-1 min-h-[4px]">
                                                        <div
                                                            className="w-full bg-primary/80 rounded-t transition-all"
                                                            style={{ height: `${Math.max(height * 2, data.sent > 0 ? 4 : 0)}px` }}
                                                        />
                                                        <div
                                                            className="w-full bg-purple-500/60 rounded transition-all"
                                                            style={{ height: `${Math.max(openedHeight * 2, data.opened > 0 ? 2 : 0)}px` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{data.month}</span>
                                                    <span className="text-xs font-medium text-foreground">{data.sent}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="flex items-center justify-center gap-6 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-primary/80 rounded" />
                                            <span className="text-sm text-muted-foreground">{t('email.sent', 'Enviados')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500/60 rounded" />
                                            <span className="text-sm text-muted-foreground">{t('email.opened', 'Abiertos')}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <Mail size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>{t('email.noChartData', 'Sin datos para mostrar')}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Campaigns */}
                        <div className="bg-card/50 border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                {t('email.topCampaigns', 'Mejores Campañas')}
                            </h3>
                            
                            {topCampaigns.length > 0 ? (
                                <div className="space-y-4">
                                    {topCampaigns.map((campaign, index) => (
                                        <div key={index} className="p-3 bg-muted/30 rounded-lg">
                                            <p className="text-foreground font-medium mb-2 truncate">
                                                {campaign.name}
                                            </p>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">{t('email.openRate', 'Apertura')}</p>
                                                    <p className="text-foreground font-semibold">{campaign.openRate}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">{t('email.clickRate', 'Clicks')}</p>
                                                    <p className="text-foreground font-semibold">{campaign.clickRate}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Mail size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('email.noCampaignsSent', 'No hay campañas enviadas')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="text-green-500" size={20} />
                                <span className="text-muted-foreground text-sm">
                                    {t('email.deliveryRate', 'Tasa de Entrega')}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{analytics.deliveryRate}%</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                {analytics.delivered.toLocaleString()} de {analytics.totalSent.toLocaleString()} enviados
                            </p>
                        </div>

                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="text-amber-500" size={20} />
                                <span className="text-muted-foreground text-sm">
                                    {t('email.bounces', 'Rebotes')}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{analytics.bounced.toLocaleString()}</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                {analytics.bounceRate}% del total
                            </p>
                        </div>

                        <div className="bg-card/50 border border-border rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingDown className="text-red-500" size={20} />
                                <span className="text-muted-foreground text-sm">
                                    {t('email.complaints', 'Quejas')}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{analytics.complained}</p>
                            <p className="text-muted-foreground text-xs mt-1">
                                {analytics.unsubscribeRate}% del total
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AnalyticsView;
