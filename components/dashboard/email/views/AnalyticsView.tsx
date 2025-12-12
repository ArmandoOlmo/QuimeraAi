/**
 * AnalyticsView
 * Vista para análiticas de email marketing
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Send,
    Eye,
    MousePointer,
    AlertCircle,
    Calendar,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { useEmailDashboardContext } from '../EmailDashboard';

// Mock analytics data
const mockAnalytics = {
    overview: {
        totalSent: 12500,
        sentChange: 15.3,
        delivered: 12150,
        deliveryRate: 97.2,
        opened: 4860,
        openRate: 40.0,
        openChange: 5.2,
        clicked: 972,
        clickRate: 20.0,
        clickChange: -2.1,
        bounced: 350,
        bounceRate: 2.8,
        unsubscribed: 45,
        unsubscribeRate: 0.36,
    },
    byMonth: [
        { month: 'Jul', sent: 1800, opened: 720, clicked: 144 },
        { month: 'Ago', sent: 2100, opened: 840, clicked: 168 },
        { month: 'Sep', sent: 1950, opened: 780, clicked: 156 },
        { month: 'Oct', sent: 2400, opened: 960, clicked: 192 },
        { month: 'Nov', sent: 2250, opened: 900, clicked: 180 },
        { month: 'Dic', sent: 2000, opened: 660, clicked: 132 },
    ],
    topCampaigns: [
        { name: 'Black Friday Sale', openRate: 52.3, clickRate: 18.5 },
        { name: 'Newsletter Noviembre', openRate: 41.2, clickRate: 12.8 },
        { name: 'Lanzamiento Producto', openRate: 38.9, clickRate: 22.1 },
    ],
};

type TimeRange = '7d' | '30d' | '90d' | '12m';

const AnalyticsView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();

    const [timeRange, setTimeRange] = useState<TimeRange>('30d');

    const timeRanges: { value: TimeRange; label: string }[] = [
        { value: '7d', label: t('email.last7days', 'Últimos 7 días') },
        { value: '30d', label: t('email.last30days', 'Últimos 30 días') },
        { value: '90d', label: t('email.last90days', 'Últimos 90 días') },
        { value: '12m', label: t('email.last12months', 'Últimos 12 meses') },
    ];

    const stats = mockAnalytics.overview;

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

            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Emails Sent */}
                <div className="bg-card/50 border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Send className="text-blue-500" size={20} />
                        </div>
                        <span className={`flex items-center gap-1 text-sm ${stats.sentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.sentChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.sentChange)}%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {stats.totalSent.toLocaleString()}
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
                        <span className={`flex items-center gap-1 text-sm ${stats.openChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.openChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.openChange)}%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {stats.openRate}%
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {t('email.openRate', 'Tasa de apertura')}
                    </p>
                </div>

                {/* Click Rate */}
                <div className="bg-card/50 border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <MousePointer className="text-amber-500" size={20} />
                        </div>
                        <span className={`flex items-center gap-1 text-sm ${stats.clickChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.clickChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stats.clickChange)}%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {stats.clickRate}%
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {t('email.clickRate', 'Tasa de clicks')}
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
                        {stats.bounceRate}%
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {t('email.bounceRate', 'Tasa de rebote')}
                    </p>
                </div>
            </div>

            {/* Charts & Details */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Chart Placeholder */}
                <div className="lg:col-span-2 bg-card/50 border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('email.performanceOverTime', 'Rendimiento en el Tiempo')}
                    </h3>
                    
                    {/* Simple bar chart visualization */}
                    <div className="h-64 flex items-end gap-4 justify-between px-4">
                        {mockAnalytics.byMonth.map((data, index) => {
                            const maxSent = Math.max(...mockAnalytics.byMonth.map(d => d.sent));
                            const height = (data.sent / maxSent) * 100;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex flex-col gap-1">
                                        <div
                                            className="w-full bg-primary/80 rounded-t"
                                            style={{ height: `${height * 2}px` }}
                                        />
                                        <div
                                            className="w-full bg-purple-500/60 rounded"
                                            style={{ height: `${(data.opened / data.sent) * height * 2}px` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{data.month}</span>
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
                </div>

                {/* Top Campaigns */}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('email.topCampaigns', 'Mejores Campañas')}
                    </h3>
                    
                    <div className="space-y-4">
                        {mockAnalytics.topCampaigns.map((campaign, index) => (
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
                    <p className="text-2xl font-bold text-foreground">{stats.deliveryRate}%</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        {stats.delivered.toLocaleString()} de {stats.totalSent.toLocaleString()} enviados
                    </p>
                </div>

                <div className="bg-card/50 border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        <span className="text-muted-foreground text-sm">
                            {t('email.bounces', 'Rebotes')}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.bounced.toLocaleString()}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        {stats.bounceRate}% del total
                    </p>
                </div>

                <div className="bg-card/50 border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingDown className="text-red-500" size={20} />
                        <span className="text-muted-foreground text-sm">
                            {t('email.unsubscribes', 'Desuscripciones')}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.unsubscribed}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                        {stats.unsubscribeRate}% del total
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;


