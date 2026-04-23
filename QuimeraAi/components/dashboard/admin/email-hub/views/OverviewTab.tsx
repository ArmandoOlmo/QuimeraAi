/**
 * OverviewTab — Dashboard overview with KPIs, recent campaigns, and quick actions.
 */

import React from 'react';
import {
    Send, Eye, MousePointer, Target, Users, CheckCircle,
    Sparkles, Zap, BarChart3, Mail, Building2,
} from 'lucide-react';
import type { AdminEmailTab } from '../types';
import type { EmailStats, TenantPerformanceData, CrossTenantCampaign } from '../types';
import { formatDate, getStatusColor, getStatusIcon } from '../helpers';
import { useTranslation } from 'react-i18next';

interface OverviewTabProps {
    stats: EmailStats;
    campaigns: CrossTenantCampaign[];
    tenantPerformance: TenantPerformanceData[];
    setActiveTab: (tab: AdminEmailTab) => void;
    setShowAIStudio: (v: boolean) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
    stats, campaigns, tenantPerformance, setActiveTab, setShowAIStudio,
}) => {
    const { t } = useTranslation();
    return (
    <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
                { label: t('adminEmail.overview.emailsSent'), value: stats.totalSent.toLocaleString(), icon: <Send size={20} />, color: 'text-blue-400 bg-blue-500/10' },
                { label: t('adminEmail.overview.openRate'), value: `${stats.openRate}%`, icon: <Eye size={20} />, color: 'text-purple-400 bg-purple-500/10' },
                { label: t('adminEmail.overview.clickRate'), value: `${stats.clickRate}%`, icon: <MousePointer size={20} />, color: 'text-amber-400 bg-amber-500/10' },
                { label: t('adminEmail.overview.activeCampaigns'), value: stats.activeCampaigns.toString(), icon: <Target size={20} />, color: 'text-green-400 bg-green-500/10' },
                { label: t('adminEmail.overview.totalContacts'), value: stats.totalContacts.toLocaleString(), icon: <Users size={20} />, color: 'text-pink-400 bg-pink-500/10' },
                { label: t('adminEmail.overview.deliveryRate'), value: `${stats.deliveryRate}%`, icon: <CheckCircle size={20} />, color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((kpi, i) => (
                <div key={i} className="bg-editor-panel-bg border border-editor-border rounded-xl p-4 hover:border-editor-accent/30 transition-all">
                    <div className={`p-2 rounded-lg ${kpi.color} w-fit mb-3`}>{kpi.icon}</div>
                    <p className="text-2xl font-bold text-editor-text-primary">{kpi.value}</p>
                    <p className="text-xs text-editor-text-secondary mt-1">{kpi.label}</p>
                </div>
            ))}
        </div>

        {/* Recent Campaigns + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Campaigns */}
            <div className="lg:col-span-2 bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-editor-text-primary">{t('adminEmail.overview.recentCampaigns')}</h3>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className="text-sm text-editor-accent hover:text-editor-accent/80 transition-colors"
                    >
                        {t('adminEmail.overview.viewAll')}
                    </button>
                </div>
                {campaigns.length > 0 ? (
                    <div className="space-y-3">
                        {campaigns.slice(0, 5).map(campaign => (
                            <div key={`${campaign.userId}-${campaign.projectId}-${campaign.id}`} className="flex items-center justify-between p-3 bg-editor-bg/50 rounded-lg hover:bg-editor-bg transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-editor-text-primary truncate">{campaign.name}</p>
                                    <p className="text-xs text-editor-text-secondary flex items-center gap-2 mt-1">
                                        <Building2 size={12} />
                                        {campaign.tenantName}
                                        <span className="mx-1">•</span>
                                        {formatDate(campaign.createdAt)}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                                    {getStatusIcon(campaign.status)}
                                    {t(`adminEmail.campaigns.${campaign.status}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-editor-text-secondary">
                        <Mail size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('adminEmail.overview.noCampaigns')}</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">{t('adminEmail.overview.quickActions')}</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => { setActiveTab('ai-studio'); setShowAIStudio(true); }}
                        className="w-full flex items-center gap-3 p-3 bg-editor-accent/10 border border-editor-accent/30 rounded-lg text-editor-accent hover:bg-editor-accent/20 transition-colors text-left"
                    >
                        <Sparkles size={20} />
                        <div>
                            <p className="text-sm font-medium">{t('adminEmail.overview.createWithAI')}</p>
                            <p className="text-xs opacity-70">{t('adminEmail.overview.generateWithAI')}</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('automations')}
                        className="w-full flex items-center gap-3 p-3 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-primary hover:border-editor-accent/30 transition-colors text-left"
                    >
                        <Zap size={20} className="text-amber-400" />
                        <div>
                            <p className="text-sm font-medium">{t('adminEmail.overview.automations')}</p>
                            <p className="text-xs text-editor-text-secondary">{t('adminEmail.overview.configureFlows')}</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className="w-full flex items-center gap-3 p-3 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-primary hover:border-editor-accent/30 transition-colors text-left"
                    >
                        <BarChart3 size={20} className="text-purple-400" />
                        <div>
                            <p className="text-sm font-medium">{t('adminEmail.overview.viewAnalytics')}</p>
                            <p className="text-xs text-editor-text-secondary">{t('adminEmail.overview.crossTenantMetrics')}</p>
                        </div>
                    </button>
                </div>

                {/* Top Tenants */}
                {tenantPerformance.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-medium text-editor-text-secondary mb-3">{t('adminEmail.overview.topTenantsBySends')}</h4>
                        <div className="space-y-2">
                            {tenantPerformance.slice(0, 3).map((tp, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-editor-text-primary truncate">{tp.name}</span>
                                    <span className="text-editor-text-secondary">{tp.sent.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
)};

export default OverviewTab;
