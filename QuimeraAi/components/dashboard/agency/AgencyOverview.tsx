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
    Loader2,
} from 'lucide-react';
import { SettingsStatCard } from '../settings/SettingsStatCard';
import { ClientListTable } from './ClientListTable';
import { ClientActivityFeed } from './ClientActivityFeed';
import { ResourceAlertsPanel } from './ResourceAlertsPanel';
import { UpcomingRenewalsPanel } from './UpcomingRenewalsPanel';

export function AgencyOverview() {
    const { t } = useTranslation();
    const {
        aggregatedMetrics: metrics,
        subClients,
        loadingClients,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,
    } = useAgency();

    if (loadingClients) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin quimera-status-card-accent-text" />
            </div>
        );
    }

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
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.mrr')}
                    value={formatCurrency(safeMetrics.mrr)}
                    icon={DollarSign}
                    valueClass="text-emerald-500"
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.totalClients')}
                    value={totalClients}
                    icon={Users}
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.totalProjects')}
                    value={formatNumber(safeMetrics.totalProjects)}
                    icon={FolderKanban}
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.totalLeads')}
                    value={formatNumber(safeMetrics.totalLeads)}
                    icon={Contact}
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.totalUsers')}
                    value={formatNumber(safeMetrics.totalUsers)}
                    icon={Users}
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.storageUsed')}
                    value={formatStorage(safeMetrics.storageUsedGB)}
                    icon={HardDrive}
                />
                <SettingsStatCard
                    label={t('dashboard.agency.overviewPage.aiCreditsUsed')}
                    value={formatNumber(safeMetrics.aiCreditsUsed)}
                    icon={Sparkles}
                />
                {safeMetrics.totalRevenue > 0 && (
                    <SettingsStatCard
                        label={t('dashboard.agency.overviewPage.revenueGenerated')}
                        value={formatCurrency(safeMetrics.totalRevenue)}
                        icon={DollarSign}
                        valueClass="text-emerald-500"
                    />
                )}
            </div>

            {(resourceAlerts.length > 0 || upcomingRenewals.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {resourceAlerts.length > 0 && (
                        <ResourceAlertsPanel alerts={resourceAlerts} />
                    )}
                    {upcomingRenewals.length > 0 && (
                        <UpcomingRenewalsPanel renewals={upcomingRenewals} />
                    )}
                </div>
            )}

            <ClientListTable clients={subClients} />
            <ClientActivityFeed activities={recentActivity} />
        </div>
    );
}
