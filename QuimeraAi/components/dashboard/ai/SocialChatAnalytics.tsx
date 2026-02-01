/**
 * Social Chat Analytics Dashboard
 * Visual analytics for social media chat conversations
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3, TrendingUp, MessageCircle, Users, Clock, Phone,
    Facebook, Instagram, Globe, ArrowUp, ArrowDown, RefreshCw,
    Calendar, Filter, ChevronDown, Loader2, AlertCircle
} from 'lucide-react';
import { useSocialChatAnalytics, AnalyticsPeriod } from '../../chat/hooks/useSocialChatAnalytics';
import { SocialChannel } from '../../../types/socialChat';

interface SocialChatAnalyticsProps {
    projectId: string;
}

const SocialChatAnalytics: React.FC<SocialChatAnalyticsProps> = ({ projectId }) => {
    const { t } = useTranslation();
    const {
        analytics,
        isLoading,
        error,
        period,
        setPeriod,
        refresh
    } = useSocialChatAnalytics(projectId);

    const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

    const periods: { id: AnalyticsPeriod; label: string }[] = [
        { id: 'today', label: 'Hoy' },
        { id: 'yesterday', label: 'Ayer' },
        { id: 'last7days', label: 'Últimos 7 días' },
        { id: 'last30days', label: 'Últimos 30 días' },
        { id: 'thisMonth', label: 'Este mes' },
        { id: 'lastMonth', label: 'Mes pasado' },
    ];

    const getChannelIcon = (channel: SocialChannel) => {
        switch (channel) {
            case 'whatsapp': return <Phone size={16} />;
            case 'facebook': return <Facebook size={16} />;
            case 'instagram': return <Instagram size={16} />;
            case 'web': return <Globe size={16} />;
        }
    };

    const getChannelColor = (channel: SocialChannel) => {
        switch (channel) {
            case 'whatsapp': return 'bg-green-500';
            case 'facebook': return 'bg-blue-600';
            case 'instagram': return 'bg-pink-500';
            case 'web': return 'bg-primary';
        }
    };

    const formatResponseTime = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle size={32} className="mb-2 text-red-500" />
                <p>{error}</p>
                <button
                    onClick={refresh}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <BarChart3 size={48} className="mb-2 opacity-30" />
                <p>No hay datos disponibles</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-primary" size={24} />
                        Analytics de Chat Social
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Métricas y estadísticas de tus conversaciones
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Period Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border border-border rounded-lg hover:bg-secondary transition-colors"
                        >
                            <Calendar size={16} />
                            <span className="text-sm font-medium">
                                {periods.find(p => p.id === period)?.label}
                            </span>
                            <ChevronDown size={16} />
                        </button>
                        {showPeriodDropdown && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-fade-in-up">
                                {periods.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setPeriod(p.id);
                                            setShowPeriodDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2 text-sm text-left hover:bg-secondary transition-colors ${
                                            period === p.id ? 'text-primary font-medium' : ''
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={refresh}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Mensajes</span>
                        <MessageCircle size={18} className="text-primary" />
                    </div>
                    <div className="text-2xl font-bold">{analytics.totalMessages.toLocaleString()}</div>
                    <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <ArrowUp size={12} />
                        <span>+12% vs periodo anterior</span>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Conversaciones</span>
                        <Users size={18} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics.totalConversations}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {analytics.uniqueUsers} usuarios únicos
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Tiempo de Respuesta</span>
                        <Clock size={18} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold">{formatResponseTime(analytics.avgResponseTime)}</div>
                    <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <ArrowDown size={12} />
                        <span>-8% más rápido</span>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground text-sm">Leads Generados</span>
                        <TrendingUp size={18} className="text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics.leadsGenerated}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {analytics.conversationInsights.conversionRate.toFixed(1)}% tasa de conversión
                    </div>
                </div>
            </div>

            {/* Channel Breakdown */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="font-semibold mb-4">Rendimiento por Canal</h4>
                <div className="space-y-4">
                    {analytics.channelBreakdown
                        .filter(ch => ch.totalMessages > 0)
                        .map((channel) => {
                            const percentage = analytics.totalMessages > 0
                                ? (channel.totalMessages / analytics.totalMessages) * 100
                                : 0;

                            return (
                                <div key={channel.channel} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${getChannelColor(channel.channel)}`}>
                                                {React.cloneElement(getChannelIcon(channel.channel) as React.ReactElement, { size: 14, className: 'text-white' })}
                                            </div>
                                            <span className="font-medium capitalize">{channel.channel}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-muted-foreground">
                                                {channel.totalMessages} mensajes
                                            </span>
                                            <span className="text-muted-foreground">
                                                {formatResponseTime(channel.avgResponseTime)} resp.
                                            </span>
                                            <span className="font-medium">
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getChannelColor(channel.channel)} transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="font-semibold mb-4">Actividad Diaria</h4>
                <div className="h-48 flex items-end gap-1">
                    {analytics.dailyMetrics.slice(-14).map((day, idx) => {
                        const maxMessages = Math.max(...analytics.dailyMetrics.map(d => d.messages), 1);
                        const height = (day.messages / maxMessages) * 100;

                        return (
                            <div
                                key={day.date}
                                className="flex-1 flex flex-col items-center gap-1"
                            >
                                <div
                                    className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors cursor-pointer"
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                    title={`${day.date}: ${day.messages} mensajes`}
                                />
                                <span className="text-[9px] text-muted-foreground transform -rotate-45 origin-center whitespace-nowrap">
                                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Conversation Insights & Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Insights */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h4 className="font-semibold mb-4">Insights de Conversaciones</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm">Conversaciones activas</span>
                            <span className="font-bold text-green-500">{analytics.conversationInsights.activeConversations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm">Promedio mensajes/conversación</span>
                            <span className="font-bold">{analytics.conversationInsights.avgMessagesPerConversation}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm">Duración promedio</span>
                            <span className="font-bold">{analytics.conversationInsights.avgConversationDuration}m</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm">Escaladas a humano</span>
                            <span className="font-bold text-amber-500">{analytics.conversationInsights.escalatedConversations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                            <span className="text-sm">AI manejado</span>
                            <span className="font-bold text-primary">{analytics.aiHandledPercentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* Top Keywords */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h4 className="font-semibold mb-4">Palabras Clave Frecuentes</h4>
                    <div className="flex flex-wrap gap-2">
                        {analytics.topKeywords.slice(0, 15).map((kw, idx) => (
                            <span
                                key={kw.keyword}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                                    kw.sentiment === 'positive'
                                        ? 'bg-green-500/20 text-green-500'
                                        : kw.sentiment === 'negative'
                                        ? 'bg-red-500/20 text-red-500'
                                        : 'bg-secondary text-foreground'
                                }`}
                                style={{ fontSize: `${Math.max(12, 16 - idx * 0.5)}px` }}
                            >
                                {kw.keyword}
                                <span className="ml-1 text-xs opacity-60">({kw.count})</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Response Time Details */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h4 className="font-semibold mb-4">Tiempos de Respuesta</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                            {formatResponseTime(analytics.responseTimeMetrics.avgResponseTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Promedio</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">
                            {formatResponseTime(analytics.responseTimeMetrics.minResponseTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Mínimo</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold text-amber-500">
                            {formatResponseTime(analytics.responseTimeMetrics.medianResponseTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Mediana</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-500">
                            {formatResponseTime(analytics.responseTimeMetrics.percentile95)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">P95</div>
                    </div>
                    <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-2xl font-bold text-red-500">
                            {formatResponseTime(analytics.responseTimeMetrics.maxResponseTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Máximo</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialChatAnalytics;








