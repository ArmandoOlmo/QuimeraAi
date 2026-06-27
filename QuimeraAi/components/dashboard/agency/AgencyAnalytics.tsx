/**
 * AgencyAnalytics
 * Main analytics dashboard with modern charts for agencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Download,
    RefreshCw,
    BarChart3,
    ShoppingCart,
    DollarSign,
    Users,
    FolderKanban,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    CreditCard,
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
import { supabase } from '../../../supabase';
import { getAgencyPoolBreakdown } from '../../../services/aiCreditsService';
import PurchaseCreditsModal from '../../ui/PurchaseCreditsModal';
import { AgencyCommandCenter, AgencyNextAction, AgencyReadinessPanel, AgencySectionHeader } from './AgencyDesignSystem';

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
    const { subClients, aggregatedMetrics, loadingClients } = useAgency();
    const { currentTenant } = useTenant();

    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
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
                const result = await supabase.functions.invoke('stripe-api', {
                    body: { action: 'getAgencyBillingSummary', tenantId: currentTenant.id }
                });
                if (result.error) throw result.error;
                const data = result.data?.data || result.data;
                setBillingSummary(data as BillingSummary);
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

    // Generate mock MRR history data (in production, this would come from Supabase)
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
                const updateProjectResult = await supabase.functions.invoke('stripe-api', {
                    body: { action: 'updateAgencyProjectCount', tenantId: currentTenant.id }
                });
                if (updateProjectResult.error) throw updateProjectResult.error;

                const getBillingResult = await supabase.functions.invoke('stripe-api', {
                    body: { action: 'getAgencyBillingSummary', tenantId: currentTenant.id }
                });
                if (getBillingResult.error) throw getBillingResult.error;

                const billingData = getBillingResult.data?.data || getBillingResult.data;
                setBillingSummary(billingData as BillingSummary);

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

    const creditsTotal = creditsBreakdown?.totalCredits || billingSummary?.poolCredits || 0;
    const creditsUsed = creditsBreakdown?.usedCredits || aggregatedMetrics.aiCreditsUsed;
    const creditsRemaining = creditsBreakdown?.remainingCredits ?? Math.max(creditsTotal - creditsUsed, 0);
    const creditsUsagePercent = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0;
    const clientsWithWarnings = clientHealth.filter((client) => client.status !== 'healthy').length;
    const analyticsReadinessItems = [
        {
            label: t('dashboard.agency.analyticsPage.readinessClients', 'Clientes conectados'),
            description: t('dashboard.agency.analyticsPage.readinessClientsDesc', '{{count}} clientes en analítica', { count: subClients.length }),
            complete: subClients.length > 0,
            icon: Users,
        },
        {
            label: t('dashboard.agency.analyticsPage.readinessBilling', 'Billing sincronizado'),
            description: billingSummary
                ? t('dashboard.agency.analyticsPage.readinessBillingReady', 'Modelo y proyectos cargados')
                : t('dashboard.agency.analyticsPage.readinessBillingPending', 'Pendiente de sincronizar'),
            complete: Boolean(billingSummary),
            icon: CreditCard,
            onClick: handleRefresh,
        },
        {
            label: t('dashboard.agency.analyticsPage.readinessCredits', 'Pool de AI Credits'),
            description: creditsTotal > 0
                ? t('dashboard.agency.analyticsPage.readinessCreditsDesc', '{{percent}}% utilizado', { percent: creditsUsagePercent })
                : t('dashboard.agency.analyticsPage.readinessCreditsMissing', 'Pool no configurado'),
            complete: creditsTotal > 0 && creditsUsagePercent < 90,
            icon: Sparkles,
            onClick: () => setShowPurchaseModal(true),
        },
        {
            label: t('dashboard.agency.analyticsPage.readinessHealth', 'Salud de clientes'),
            description: t('dashboard.agency.analyticsPage.readinessHealthDesc', '{{count}} clientes requieren revisión', { count: clientsWithWarnings }),
            complete: clientsWithWarnings === 0,
            icon: ShieldCheck,
        },
    ];
    const analyticsReadinessScore = Math.round(
        (analyticsReadinessItems.filter((item) => item.complete).length / analyticsReadinessItems.length) * 100,
    );
    const analyticsNextAction = creditsTotal === 0 || creditsUsagePercent >= 90
        ? {
            label: t('dashboard.agency.analyticsPage.nextBuyCredits', 'Comprar AI Credits'),
            description: creditsTotal === 0
                ? t('dashboard.agency.analyticsPage.nextBuyCreditsSetup', 'Configura el pool para operar generaciones de clientes.')
                : t('dashboard.agency.analyticsPage.nextBuyCreditsLow', '{{remaining}} créditos disponibles', { remaining: creditsRemaining.toLocaleString() }),
            icon: ShoppingCart,
            tone: 'warning' as const,
            onClick: () => setShowPurchaseModal(true),
        }
        : {
            label: t('dashboard.agency.analyticsPage.nextExport', 'Exportar performance'),
            description: t('dashboard.agency.analyticsPage.nextExportDesc', 'Descarga MRR, uso, proyectos y salud de clientes.'),
            icon: Download,
            tone: 'success' as const,
            onClick: handleExport,
        };

    return (
        <div className="space-y-4 sm:space-y-6">
            <AgencySectionHeader
                icon={BarChart3}
                title={t('dashboard.agency.analyticsPage.title')}
                subtitle={t('dashboard.agency.analyticsPage.subtitle')}
                actions={
                    <>
                    {/* Date range selector */}
                    <div className="flex h-9 items-center gap-1 rounded-lg border border-q-border bg-q-surface p-1">
                        {(['7d', '30d', '90d', '12m'] as DateRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`h-full px-3 flex items-center justify-center text-sm rounded-md transition-colors ${dateRange === range
                                    ? 'bg-q-accent text-q-text-on-accent shadow-sm'
                                    : 'text-q-text-secondary hover:text-q-text'
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
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-q-surface border border-q-border text-q-text-secondary hover:text-q-text transition-colors"
                        title={t('dashboard.agency.analyticsPage.refreshData')}
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleExport}
                        className="h-9 px-4 flex items-center justify-center gap-2 rounded-lg bg-q-accent text-q-text-on-accent hover:opacity-90 transition-colors text-sm font-semibold"
                    >
                        <Download className="w-4 h-4" />
                        {t('dashboard.agency.analyticsPage.export')}
                    </button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <AgencyCommandCenter
                    icon={TrendingUp}
                    eyebrow={t('dashboard.agency.analyticsPage.commandCenter', 'Performance center')}
                    title={t('dashboard.agency.analyticsPage.commandTitle', 'Agency Analytics')}
                    subtitle={t('dashboard.agency.analyticsPage.commandSubtitle', 'MRR, salud, uso de AI y rentabilidad de proyectos para toda la cartera.')}
                    metrics={[
                        {
                            label: t('dashboard.agency.analyticsPage.mrrTotal'),
                            value: `$${aggregatedMetrics.mrr.toLocaleString()}`,
                            icon: DollarSign,
                        },
                        {
                            label: t('dashboard.agency.analyticsPage.activeClients'),
                            value: aggregatedMetrics.activeSubClients,
                            icon: Users,
                        },
                        {
                            label: t('dashboard.agency.analyticsPage.projects'),
                            value: aggregatedMetrics.totalProjects,
                            icon: FolderKanban,
                        },
                        {
                            label: t('dashboard.agency.analyticsPage.aiCreditsUsed'),
                            value: aggregatedMetrics.aiCreditsUsed.toLocaleString(),
                            icon: Sparkles,
                            onClick: () => setShowPurchaseModal(true),
                        },
                    ]}
                    action={
                        <AgencyNextAction
                            label={analyticsNextAction.label}
                            description={analyticsNextAction.description}
                            icon={analyticsNextAction.icon}
                            tone={analyticsNextAction.tone}
                            onClick={analyticsNextAction.onClick}
                        />
                    }
                />

                <AgencyReadinessPanel
                    title={t('dashboard.agency.analyticsPage.readinessTitle', 'Readiness de datos')}
                    subtitle={t('dashboard.agency.analyticsPage.readinessSubtitle', '{{ready}}/{{total}} señales listas', {
                        ready: analyticsReadinessItems.filter((item) => item.complete).length,
                        total: analyticsReadinessItems.length,
                    })}
                    score={analyticsReadinessScore}
                    items={analyticsReadinessItems}
                    tone={analyticsReadinessScore >= 80 ? 'success' : analyticsReadinessScore >= 50 ? 'warning' : 'danger'}
                />
            </div>

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
                <div className="relative">
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
                    {/* Buy Credits for Pool */}
                    <div className="mt-3 flex justify-center">
                        <button
                            onClick={() => setShowPurchaseModal(true)}
                            className="quimera-guide-cta flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {t('dashboard.agency.analyticsPage.buyCredits', 'Comprar Créditos para Pool')}
                        </button>
                    </div>
                </div>

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

            {/* Purchase Credits Modal */}
            <PurchaseCreditsModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
            />
        </div>
    );
}

export default AgencyAnalytics;
