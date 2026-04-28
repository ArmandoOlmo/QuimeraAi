/**
 * OverviewTab — User Email Hub dashboard overview
 * Adapted from admin version — no tenant/cross-tenant references
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send, Eye, MousePointer, Target, Users, CheckCircle,
    Sparkles, Zap, BarChart3, Mail,
} from 'lucide-react';
import type { UserEmailTab, EmailStats, UserEmailCampaign } from '../types';
import { formatDate, getStatusColor, getStatusIcon } from '../helpers';

interface OverviewTabProps {
    stats: EmailStats;
    campaigns: UserEmailCampaign[];
    setActiveTab: (tab: UserEmailTab) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
    stats, campaigns, setActiveTab,
}) => {
    const { t } = useTranslation();
    return (
    <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
                { label: t('email.hub.overview.emailsSent'), value: stats.totalSent.toLocaleString(), icon: <Send size={20} />, color: 'text-blue-400 bg-blue-500/10' },
                { label: t('email.hub.overview.openRate'), value: `${stats.openRate}%`, icon: <Eye size={20} />, color: 'text-purple-400 bg-purple-500/10' },
                { label: t('email.hub.overview.clickRate'), value: `${stats.clickRate}%`, icon: <MousePointer size={20} />, color: 'text-amber-400 bg-amber-500/10' },
                { label: t('email.hub.overview.activeCampaigns'), value: stats.activeCampaigns.toString(), icon: <Target size={20} />, color: 'text-green-400 bg-green-500/10' },
                { label: t('email.hub.overview.totalContacts'), value: stats.totalContacts.toLocaleString(), icon: <Users size={20} />, color: 'text-pink-400 bg-pink-500/10' },
                { label: t('email.hub.overview.deliveryRate'), value: `${stats.deliveryRate}%`, icon: <CheckCircle size={20} />, color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((kpi, i) => (
                <div key={i} className="bg-q-surface border border-q-border rounded-xl p-4 hover:border-q-accent/30 transition-all">
                    <div className={`p-2 rounded-lg ${kpi.color} w-fit mb-3`}>{kpi.icon}</div>
                    <p className="text-2xl font-bold text-q-text">{kpi.value}</p>
                    <p className="text-xs text-q-text-secondary mt-1">{kpi.label}</p>
                </div>
            ))}
        </div>

        {/* Recent Campaigns + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Campaigns */}
            <div className="lg:col-span-2 bg-q-surface border border-q-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-q-text">{t('email.hub.overview.recentCampaigns')}</h3>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className="text-sm text-q-accent hover:text-q-accent/80 transition-colors"
                    >
                        {t('email.hub.overview.viewAll')}
                    </button>
                </div>
                {campaigns.length > 0 ? (
                    <div className="space-y-3">
                        {campaigns.slice(0, 5).map(campaign => (
                            <div key={campaign.id} className="flex items-center justify-between p-3 bg-q-bg/50 rounded-lg hover:bg-q-bg transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-q-text truncate">{campaign.name}</p>
                                    <p className="text-xs text-q-text-secondary mt-1">
                                        {formatDate(campaign.createdAt)}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                                    {getStatusIcon(campaign.status)}
                                    {campaign.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-q-text-secondary">
                        <Mail size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('email.hub.overview.noCampaigns')}</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-q-surface border border-q-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-q-text mb-4">{t('email.hub.overview.quickActions')}</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => setActiveTab('ai-studio')}
                        className="w-full flex items-center gap-3 p-3 bg-q-accent/10 border border-q-accent/30 rounded-lg text-q-accent hover:bg-q-accent/20 transition-colors text-left"
                    >
                        <Sparkles size={20} />
                        <div>
                            <p className="text-sm font-medium">{t('email.hub.overview.createWithAI')}</p>
                            <p className="text-xs opacity-70">{t('email.hub.overview.generateWithAI')}</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('automations')}
                        className="w-full flex items-center gap-3 p-3 bg-q-bg/50 border border-q-border rounded-lg text-q-text hover:border-q-accent/30 transition-colors text-left"
                    >
                        <Zap size={20} className="text-amber-400" />
                        <div>
                            <p className="text-sm font-medium">{t('email.hub.overview.automations')}</p>
                            <p className="text-xs text-q-text-secondary">{t('email.hub.overview.configureFlows')}</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full flex items-center gap-3 p-3 bg-q-bg/50 border border-q-border rounded-lg text-q-text hover:border-q-accent/30 transition-colors text-left"
                    >
                        <BarChart3 size={20} className="text-purple-400" />
                        <div>
                            <p className="text-sm font-medium">{t('email.hub.overview.viewAnalytics')}</p>
                            <p className="text-xs text-q-text-secondary">{t('email.hub.overview.performanceMetrics')}</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
};

export default OverviewTab;
