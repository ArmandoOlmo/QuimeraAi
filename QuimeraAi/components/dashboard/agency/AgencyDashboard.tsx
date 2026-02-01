/**
 * AgencyDashboard
 * Main dashboard for agency owners to manage all sub-clients
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { AgencyOverview } from './AgencyOverview';
import { ClientActivityFeed } from './ClientActivityFeed';
import { ResourceAlertsPanel } from './ResourceAlertsPanel';
import { ClientListTable } from './ClientListTable';
import { UpcomingRenewalsPanel } from './UpcomingRenewalsPanel';
import { Loader2 } from 'lucide-react';

interface AgencyDashboardProps {
    className?: string;
}

export function AgencyDashboard({ className = '' }: AgencyDashboardProps) {
    const { t } = useTranslation();
    const {
        subClients,
        loadingClients,
        aggregatedMetrics,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,
        error,
        refreshMetrics,
    } = useAgency();

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshMetrics();
        } finally {
            setRefreshing(false);
        }
    };

    if (loadingClients) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('dashboard.agency.loading')}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center max-w-md">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                            {t('dashboard.agency.errorLoadingData')}
                        </h3>
                        <p className="text-red-700 dark:text-red-300 mb-4">
                            {error.message}
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {t('dashboard.agency.retry')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('dashboard.agency.dashboardTitle')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('dashboard.agency.dashboardSubtitle')}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? t('dashboard.agency.refreshing') : t('dashboard.agency.refresh')}
                </button>
            </div>

            {/* Overview Cards */}
            <AgencyOverview
                metrics={aggregatedMetrics}
                totalClients={subClients.length}
            />

            {/* Alerts and Renewals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resource Alerts */}
                {resourceAlerts.length > 0 && (
                    <ResourceAlertsPanel alerts={resourceAlerts} />
                )}

                {/* Upcoming Renewals */}
                {upcomingRenewals.length > 0 && (
                    <UpcomingRenewalsPanel renewals={upcomingRenewals} />
                )}
            </div>

            {/* Clients Table */}
            <ClientListTable clients={subClients} />

            {/* Activity Feed */}
            <ClientActivityFeed activities={recentActivity} />
        </div>
    );
}

export default AgencyDashboard;
