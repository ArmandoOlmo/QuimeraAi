/**
 * AgencyAnalytics
 * Main analytics dashboard with modern charts for agencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    Calendar,
    Download,
    RefreshCw,
    BarChart3,
    TrendingUp,
} from 'lucide-react';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import {
    MRRChart,
    RevenueByClientChart,
    AICreditsPoolChart,
    ProjectBillingBreakdown,
    ClientHealthScore,
} from './charts';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';
import { getAgencyPoolBreakdown } from '../../../services/aiCreditsService';

type DateRange = '7d' | '30d' | '90d' | '12m';

interface BillingSummary {
    isProjectBilling: boolean;
    plan: string;
    baseFee: number;
    projectCost: number;
    poolCredits: number;
    activeProjects: number;
    totalMonthlyBill: number;
    breakdown: Record<string, { name: string; count: number }>;
}

export function AgencyAnalytics() {
    const { t } = useTranslation();
    const { subClients, aggregatedMetrics, loadingClients, resourceAlerts } = useAgency();
    const { currentTenant } = useTenant();

    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
    const [creditsBreakdown, setCreditsBreakdown] = useState<{
        totalCredits: number;
        usedCredits: number;
        remainingCredits: number;
        subClients: Array<{ tenantId: string; name: string; creditsUsed: number; percentage: number }>;
    } | null>(null);

    // Load billing summary
    useEffect(() => {
        async function loadBillingSummary() {
            if (!currentTenant?.id) return;

            try {
                const getAgencyBillingSummary = httpsCallable(functions, 'getAgencyBillingSummary');
                const result = await getAgencyBillingSummary({ tenantId: currentTenant.id });
                setBillingSummary(result.data as BillingSummary);
            } catch (error) {
                console.error('Error loading billing summary:', error);
            }
        }

        loadBillingSummary();
    }, [currentTenant?.id]);

    // Load AI credits breakdown
    useEffect(() => {
        async function loadCreditsBreakdown() {
            if (!currentTenant?.id) return;

            try {
                const breakdown = await getAgencyPoolBreakdown(currentTenant.id);
                setCreditsBreakdown(breakdown);
            } catch (error) {
                console.error('Error loading credits breakdown:', error);
            }
        }

        loadCreditsBreakdown();
    }, [currentTenant?.id]);

    // Generate mock MRR history data (in production, this would come from Firestore)
    const mrrHistoryData = useMemo(() => {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        const currentMRR = aggregatedMetrics.mrr || 0;

        // Generate historical data (simulated growth)
        return Array.from({ length: 12 }, (_, i) => {
            const monthIndex = (currentMonth - 11 + i + 12) % 12;
            const growthFactor = 0.6 + (i * 0.04); // Start at 60% and grow
            return {
                month: months[monthIndex],
                mrr: Math.round(currentMRR * growthFactor),
                clients: Math.round((subClients.length || 1) * growthFactor),
            };
        });
    }, [aggregatedMetrics.mrr, subClients.length]);

    // Transform sub-clients for revenue chart
    const revenueByClient = useMemo(() => {
        return subClients.map((client) => ({
            name: client.name,
            revenue: client.billing?.mrr || client.billing?.monthlyPrice || 0,
            projects: client.usage?.projectCount || 0,
        }));
    }, [subClients]);

    // Transform for project billing breakdown
    const projectBreakdown = useMemo(() => {
        if (!billingSummary?.breakdown) return [];

        return Object.entries(billingSummary.breakdown).map(([clientId, data]) => ({
            clientId,
            clientName: data.name,
            projectCount: data.count,
        }));
    }, [billingSummary]);

    // Transform for client health
    const clientHealth = useMemo(() => {
        return subClients.map((client) => {
            const usagePercent = client.limits?.maxAiCredits
                ? ((client.usage?.aiCreditsUsed || 0) / client.limits.maxAiCredits) * 100
                : 0;

            // Calculate days since last activity
            const lastActive = client.lastActiveAt?.seconds
                ? new Date(client.lastActiveAt.seconds * 1000)
                : new Date();
            const daysSinceActive = Math.floor(
                (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Determine health status
            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (usagePercent > 95 || daysSinceActive > 30) {
                status = 'critical';
            } else if (usagePercent > 80 || daysSinceActive > 14) {
                status = 'warning';
            }

            // Determine payment status
            let payment: 'ok' | 'pending' | 'overdue' = 'ok';
            if (client.billing?.cancelAtPeriodEnd) {
                payment = 'pending';
            }

            return {
                clientId: client.id,
                clientName: client.name,
                status,
                metrics: {
                    usage: Math.round(usagePercent),
                    activity: daysSinceActive,
                    payment,
                    trend: usagePercent > 50 ? 'up' : 'stable' as 'up' | 'stable' | 'down',
                },
            };
        });
    }, [subClients]);

    const handleRefresh = async () => {
        setIsRefreshing(true);

        try {
            // Refresh billing data
            if (currentTenant?.id) {
                const updateProjectCount = httpsCallable(functions, 'updateAgencyProjectCount');
                await updateProjectCount({ tenantId: currentTenant.id });

                const getAgencyBillingSummary = httpsCallable(functions, 'getAgencyBillingSummary');
                const result = await getAgencyBillingSummary({ tenantId: currentTenant.id });
                setBillingSummary(result.data as BillingSummary);

                // Refresh credits breakdown
                const breakdown = await getAgencyPoolBreakdown(currentTenant.id);
                setCreditsBreakdown(breakdown);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }

        setIsRefreshing(false);
    };

    const handleExport = () => {
        // Create CSV export of analytics data
        const csvData = [
            ['Métrica', 'Valor'],
            ['MRR Total', `$${aggregatedMetrics.mrr}`],
            ['Clientes Activos', subClients.filter(c => c.status === 'active').length],
            ['Total Proyectos', aggregatedMetrics.totalProjects],
            ['AI Credits Usados', aggregatedMetrics.aiCreditsUsed],
            ['Storage Usado (GB)', aggregatedMetrics.storageUsedGB.toFixed(2)],
            '',
            ['Cliente', 'MRR', 'Proyectos', 'Status'],
            ...subClients.map(c => [
                c.name,
                c.billing?.mrr || 0,
                c.usage?.projectCount || 0,
                c.status,
            ]),
        ];

        const csvContent = csvData.map(row =>
            Array.isArray(row) ? row.join(',') : row
        ).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agency-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div>
                    <h2 className="text-2xl font-bold text-editor-text-primary flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-purple-400" />
                        {t('dashboard.agency.analyticsPage.title')}
                    </h2>
                    <p className="text-editor-text-secondary mt-1">
                        {t('dashboard.agency.analyticsPage.subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date range selector */}
                    <div className="flex items-center gap-1 bg-editor-panel-bg border border-editor-border rounded-lg p-1">
                        {(['7d', '30d', '90d', '12m'] as DateRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${dateRange === range
                                    ? 'bg-editor-accent text-white'
                                    : 'text-editor-text-secondary hover:text-editor-text-primary'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg bg-editor-panel-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                        title={t('dashboard.agency.analyticsPage.refreshData')}
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-editor-accent text-white hover:opacity-90 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('dashboard.agency.analyticsPage.export')}
                    </button>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.analyticsPage.mrrTotal')}</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        ${aggregatedMetrics.mrr.toLocaleString()}
                    </p>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.analyticsPage.activeClients')}</p>
                    <p className="text-2xl font-bold text-blue-400">
                        {aggregatedMetrics.activeSubClients}
                    </p>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.analyticsPage.projects')}</p>
                    <p className="text-2xl font-bold text-purple-400">
                        {aggregatedMetrics.totalProjects}
                    </p>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.analyticsPage.aiCreditsUsed')}</p>
                    <p className="text-2xl font-bold text-orange-400">
                        {aggregatedMetrics.aiCreditsUsed.toLocaleString()}
                    </p>
                </div>
            </motion.div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MRR Chart */}
                <MRRChart
                    data={mrrHistoryData}
                    currentMRR={aggregatedMetrics.mrr}
                    previousMRR={mrrHistoryData[mrrHistoryData.length - 2]?.mrr || 0}
                    isLoading={loadingClients}
                />

                {/* Revenue by Client */}
                <RevenueByClientChart
                    data={revenueByClient}
                    isLoading={loadingClients}
                />

                {/* AI Credits Pool */}
                <AICreditsPoolChart
                    poolTotal={creditsBreakdown?.totalCredits || billingSummary?.poolCredits || 0}
                    poolUsed={creditsBreakdown?.usedCredits || aggregatedMetrics.aiCreditsUsed}
                    clientBreakdown={
                        creditsBreakdown?.subClients.map((c) => ({
                            name: c.name,
                            creditsUsed: c.creditsUsed,
                        })) || []
                    }
                    isLoading={loadingClients}
                />

                {/* Project Billing Breakdown */}
                {billingSummary?.isProjectBilling && (
                    <ProjectBillingBreakdown
                        plan={billingSummary.plan}
                        baseFee={billingSummary.baseFee}
                        projectCost={billingSummary.projectCost}
                        breakdown={projectBreakdown}
                        isLoading={!billingSummary}
                    />
                )}

                {/* Client Health Score */}
                <ClientHealthScore
                    clients={clientHealth}
                    isLoading={loadingClients}
                />
            </div>
        </div>
    );
}

export default AgencyAnalytics;
