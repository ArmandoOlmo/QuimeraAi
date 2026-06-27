/**
 * AgencyDashboard
 * Main dashboard for agency owners to manage all sub-clients
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { AgencyOverview } from './AgencyOverview';
import { agencyContentClass } from './AgencyDesignSystem';
import { Loader2 } from 'lucide-react';

interface AgencyDashboardProps {
    className?: string;
}

export function AgencyDashboard({ className = '' }: AgencyDashboardProps) {
    const { t } = useTranslation();
    const {
        loadingClients,
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
            <div className={`${agencyContentClass} flex items-center justify-center`}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin quimera-status-card-accent-text mx-auto mb-4" />
                    <p className="text-q-text-muted dark:text-gray-400">
                        {t('dashboard.agency.loading')}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${agencyContentClass} flex items-center justify-center`}>
                <div className="text-center max-w-md">
                    <div className="bg-q-error/10 dark:bg-q-error/12 border border-q-error/25 dark:border-q-error/30 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-q-error dark:text-q-error mb-2">
                            {t('dashboard.agency.errorLoadingData')}
                        </h3>
                        <p className="text-q-error dark:text-q-error mb-4">
                            {error.message}
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-q-error text-white rounded-lg hover:bg-q-error transition-colors"
                        >
                            {t('dashboard.agency.retry')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${agencyContentClass} ${className}`}>
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-q-text dark:text-white">
                            {t('dashboard.agency.dashboardTitle')}
                        </h1>
                        <p className="text-q-text-muted dark:text-gray-400 mt-1">
                            {t('dashboard.agency.dashboardSubtitle')}
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="quimera-guide-cta flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Loader2 className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? t('dashboard.agency.refreshing') : t('dashboard.agency.refresh')}
                    </button>
                </div>

                {/* Overview Cards */}
                <AgencyOverview />
            </div>
        </div>
    );
}

export default AgencyDashboard;
