/**
 * AgencyOverview
 * Overview cards showing aggregated metrics across all sub-clients
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import {
    Users,
    FolderKanban,
    Contact,
    DollarSign,
    HardDrive,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Loader2,
} from 'lucide-react';


interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        label: string;
    };
    color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'emerald';
}

function MetricCard({ title, value, subtitle, icon, trend, color }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };

    const colorClass = colorClasses[color];

    return (
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend.value >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span
                                className={`text-sm font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}
                            >
                                {trend.value >= 0 ? '+' : ''}
                                {trend.value}%
                            </span>
                            <span className="text-xs text-muted-foreground">{trend.label}</span>
                        </div>
                    )}
                </div>
                <div
                    className={`flex items-center justify-center h-12 w-12 rounded-lg border ${colorClass}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function AgencyOverview() {
    const { t } = useTranslation();
    const { aggregatedMetrics: metrics, subClients, loadingClients } = useAgency();

    // Loading state
    if (loadingClients) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Default values if metrics are not available
    const safeMetrics = metrics || {
        mrr: 0,
        activeSubClients: 0,
        totalProjects: 0,
        totalLeads: 0,
        totalUsers: 0,
        storageUsedGB: 0,
        aiCreditsUsed: 0,
        totalRevenue: 0,
    };

    const totalClients = subClients?.length || 0;
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatStorage = (gb: number): string => {
        if (gb < 1) {
            return `${(gb * 1024).toFixed(0)} MB`;
        }
        return `${gb.toFixed(1)} GB`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* MRR */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.mrr')}
                value={formatCurrency(safeMetrics.mrr)}
                subtitle={t('dashboard.agency.overviewPage.activeClients', { count: safeMetrics.activeSubClients })}
                icon={<DollarSign className="h-6 w-6" />}
                color="emerald"
            />

            {/* Total Clients */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.totalClients')}
                value={totalClients}
                subtitle={t('dashboard.agency.overviewPage.active', { count: safeMetrics.activeSubClients })}
                icon={<Users className="h-6 w-6" />}
                color="blue"
            />

            {/* Total Projects */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.totalProjects')}
                value={formatNumber(safeMetrics.totalProjects)}
                subtitle={t('dashboard.agency.overviewPage.acrossClients', { count: totalClients })}
                icon={<FolderKanban className="h-6 w-6" />}
                color="purple"
            />

            {/* Total Leads */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.totalLeads')}
                value={formatNumber(safeMetrics.totalLeads)}
                subtitle={t('dashboard.agency.overviewPage.acrossClients', { count: totalClients })}
                icon={<Contact className="h-6 w-6" />}
                color="orange"
            />

            {/* Total Users */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.totalUsers')}
                value={formatNumber(safeMetrics.totalUsers)}
                subtitle={t('dashboard.agency.overviewPage.teamMembers')}
                icon={<Users className="h-6 w-6" />}
                color="cyan"
            />

            {/* Storage Used */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.storageUsed')}
                value={formatStorage(safeMetrics.storageUsedGB)}
                subtitle={t('dashboard.agency.overviewPage.acrossClients', { count: totalClients })}
                icon={<HardDrive className="h-6 w-6" />}
                color="pink"
            />

            {/* AI Credits Used */}
            <MetricCard
                title={t('dashboard.agency.overviewPage.aiCreditsUsed')}
                value={formatNumber(safeMetrics.aiCreditsUsed)}
                subtitle={t('dashboard.agency.overviewPage.lastMonth')}
                icon={<Sparkles className="h-6 w-6" />}
                color="purple"
            />

            {/* Revenue (if available) */}
            {safeMetrics.totalRevenue > 0 && (
                <MetricCard
                    title={t('dashboard.agency.overviewPage.revenueGenerated')}
                    value={formatCurrency(safeMetrics.totalRevenue)}
                    subtitle={t('dashboard.agency.overviewPage.clientEcommerce')}
                    icon={<DollarSign className="h-6 w-6" />}
                    color="green"
                />
            )}
        </div>
    );
}

