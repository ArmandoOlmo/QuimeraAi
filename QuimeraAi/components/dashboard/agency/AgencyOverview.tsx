/**
 * AgencyOverview
 * Overview cards showing aggregated metrics across all sub-clients
 */

import React, { useMemo, useState } from 'react';
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
    LayoutDashboard,
    UserPlus,
    AlertTriangle,
    CalendarClock,
    Activity,
    ShieldCheck,
    FileText,
} from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { ClientListTable } from './ClientListTable';
import { ClientActivityFeed } from './ClientActivityFeed';
import { ResourceAlertsPanel } from './ResourceAlertsPanel';
import { UpcomingRenewalsPanel } from './UpcomingRenewalsPanel';
import { Client360Panel } from './Client360Panel';
import {
    AgencyCommandCenter,
    AgencyNextAction,
    AgencyReadinessPanel,
    AgencySectionHeader,
    AgencyStatCard,
} from './AgencyDesignSystem';

export function AgencyOverview() {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const {
        aggregatedMetrics: metrics,
        subClients,
        loadingClients,
        resourceAlerts,
        upcomingRenewals,
        recentActivity,
        getClientMetrics,
        exportClientData,
    } = useAgency();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [exportingClientId, setExportingClientId] = useState<string | null>(null);

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
        agencyOperatingSystem: {
            clientsWithOperatingSystem: 0,
            activeModuleSlots: 0,
            totalModuleSlots: 0,
            moduleReadinessRate: 0,
            enabledClient360ModuleIds: [],
            generatedModuleIds: [],
        },
    };

    const totalClients = subClients?.length || 0;
    const selectedClient = subClients.find((client) => client.id === selectedClientId) || null;
    const criticalAlerts = resourceAlerts.filter((alert) => alert.severity === 'critical').length;
    const activeClientRate = totalClients > 0
        ? Math.round((safeMetrics.activeSubClients / totalClients) * 100)
        : 0;
    const agencyOperatingSystem = safeMetrics.agencyOperatingSystem || {
        clientsWithOperatingSystem: 0,
        activeModuleSlots: 0,
        totalModuleSlots: 0,
        moduleReadinessRate: 0,
        enabledClient360ModuleIds: [],
        generatedModuleIds: [],
    };

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
    const operatingModuleValue = agencyOperatingSystem.totalModuleSlots > 0
        ? `${formatNumber(agencyOperatingSystem.activeModuleSlots)}/${formatNumber(agencyOperatingSystem.totalModuleSlots)}`
        : '0';

    const formatStorage = (gb: number): string => {
        if (gb < 1) {
            return `${(gb * 1024).toFixed(0)} MB`;
        }
        return `${gb.toFixed(1)} GB`;
    };

    const readinessItems = useMemo(() => [
        {
            label: t('dashboard.agency.overviewPage.readinessClients', 'Clientes activos'),
            description: t('dashboard.agency.overviewPage.readinessClientsDesc', '{{count}} clientes en operación', { count: safeMetrics.activeSubClients }),
            complete: totalClients > 0 && safeMetrics.activeSubClients > 0,
            icon: Users,
            onClick: totalClients === 0 ? () => navigate(ROUTES.AGENCY_NEW_CLIENT) : undefined,
        },
        {
            label: t('dashboard.agency.overviewPage.readinessBilling', 'MRR configurado'),
            description: t('dashboard.agency.overviewPage.readinessBillingDesc', formatCurrency(safeMetrics.mrr)),
            complete: safeMetrics.mrr > 0,
            icon: DollarSign,
            onClick: () => navigate(ROUTES.AGENCY_BILLING),
        },
        {
            label: t('dashboard.agency.overviewPage.readinessProjects', 'Proyectos bajo control'),
            description: t('dashboard.agency.overviewPage.readinessProjectsDesc', '{{count}} proyectos gestionados', { count: safeMetrics.totalProjects }),
            complete: safeMetrics.totalProjects > 0,
            icon: FolderKanban,
            onClick: () => navigate(ROUTES.AGENCY_PROJECTS),
        },
        {
            label: t('dashboard.agency.overviewPage.readinessModules', 'Módulos AI operativos'),
            description: t('dashboard.agency.overviewPage.readinessModulesDesc', '{{active}}/{{total}} módulos Client 360 generados', {
                active: agencyOperatingSystem.activeModuleSlots,
                total: agencyOperatingSystem.totalModuleSlots,
            }),
            complete: agencyOperatingSystem.activeModuleSlots > 0,
            icon: Sparkles,
            onClick: totalClients > 0 ? () => setSelectedClientId(subClients.find(client => client.agencyOperatingSystem)?.id || subClients[0]?.id) : undefined,
        },
        {
            label: t('dashboard.agency.overviewPage.readinessLimits', 'Límites sanos'),
            description: t('dashboard.agency.overviewPage.readinessLimitsDesc', '{{count}} alertas críticas', { count: criticalAlerts }),
            complete: criticalAlerts === 0,
            icon: ShieldCheck,
            onClick: criticalAlerts > 0 && resourceAlerts[0] ? () => setSelectedClientId(resourceAlerts[0].clientId) : undefined,
        },
        {
            label: t('dashboard.agency.overviewPage.readinessActivity', 'Actividad reciente'),
            description: t('dashboard.agency.overviewPage.readinessActivityDesc', '{{count}} eventos recientes', { count: recentActivity.length }),
            complete: recentActivity.length > 0,
            icon: Activity,
        },
    ], [
        activeClientRate,
        criticalAlerts,
        navigate,
        recentActivity.length,
        resourceAlerts,
        safeMetrics.activeSubClients,
        agencyOperatingSystem.activeModuleSlots,
        agencyOperatingSystem.totalModuleSlots,
        safeMetrics.mrr,
        safeMetrics.totalProjects,
        subClients,
        t,
        totalClients,
    ]);

    const readinessScore = Math.round(
        (readinessItems.filter((item) => item.complete).length / readinessItems.length) * 100,
    );

    const nextAction = (() => {
        if (totalClients === 0) {
            return {
                label: t('dashboard.agency.overviewPage.nextCreateClient', 'Crear primer cliente'),
                description: t('dashboard.agency.overviewPage.nextCreateClientDesc', 'Inicia onboarding, plan y módulos con AI.'),
                icon: UserPlus,
                tone: 'accent' as const,
                onClick: () => navigate(ROUTES.AGENCY_NEW_CLIENT),
            };
        }

        if (criticalAlerts > 0 && resourceAlerts[0]) {
            return {
                label: t('dashboard.agency.overviewPage.nextReviewLimits', 'Revisar límites críticos'),
                description: t('dashboard.agency.overviewPage.nextReviewLimitsDesc', '{{count}} clientes necesitan atención', { count: criticalAlerts }),
                icon: AlertTriangle,
                tone: 'danger' as const,
                onClick: () => setSelectedClientId(resourceAlerts[0].clientId),
            };
        }

        if (upcomingRenewals.length > 0) {
            return {
                label: t('dashboard.agency.overviewPage.nextRenewals', 'Preparar renovaciones'),
                description: t('dashboard.agency.overviewPage.nextRenewalsDesc', '{{count}} renovaciones próximas', { count: upcomingRenewals.length }),
                icon: CalendarClock,
                tone: 'warning' as const,
                onClick: () => setSelectedClientId(upcomingRenewals[0].clientId),
            };
        }

        return {
            label: t('dashboard.agency.overviewPage.nextReports', 'Generar reporte ejecutivo'),
            description: t('dashboard.agency.overviewPage.nextReportsDesc', 'Entrega performance de clientes y módulos operados.'),
            icon: FileText,
            tone: 'success' as const,
            onClick: () => navigate(ROUTES.AGENCY_REPORTS),
        };
    })();

    const handleExportClient = async (clientId: string) => {
        setExportingClientId(clientId);
        try {
            await exportClientData(clientId);
        } finally {
            setExportingClientId(null);
        }
    };

    return (
        <div className="space-y-6">
            <AgencySectionHeader
                icon={LayoutDashboard}
                title={t('dashboard.agency.dashboardTitle')}
                subtitle={t('dashboard.agency.dashboardSubtitle')}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <AgencyCommandCenter
                    icon={LayoutDashboard}
                    eyebrow={t('dashboard.agency.overviewPage.commandCenter', 'Centro de mando')}
                    title={t('dashboard.agency.overviewPage.commandTitle', 'Agency Operating System')}
                    subtitle={t('dashboard.agency.overviewPage.commandSubtitle', 'Clientes, proyectos, facturación, límites y actividad en una sola vista operativa.')}
                    metrics={[
                        {
                            label: t('dashboard.agency.overviewPage.totalClients'),
                            value: totalClients,
                            icon: Users,
                            onClick: () => navigate(ROUTES.AGENCY_NEW_CLIENT),
                        },
                        {
                            label: t('dashboard.agency.overviewPage.activeRate', 'Activos'),
                            value: `${activeClientRate}%`,
                            icon: ShieldCheck,
                        },
                        {
                            label: t('dashboard.agency.overviewPage.projectsShort', 'Proyectos'),
                            value: formatNumber(safeMetrics.totalProjects),
                            icon: FolderKanban,
                            onClick: () => navigate(ROUTES.AGENCY_PROJECTS),
                        },
                        {
                            label: t('dashboard.agency.overviewPage.aiModulesShort', 'Módulos AI'),
                            value: operatingModuleValue,
                            icon: Sparkles,
                        },
                        {
                            label: t('dashboard.agency.overviewPage.mrrShort', 'MRR'),
                            value: formatCurrency(safeMetrics.mrr),
                            icon: DollarSign,
                            onClick: () => navigate(ROUTES.AGENCY_BILLING),
                        },
                    ]}
                    action={
                        <AgencyNextAction
                            label={nextAction.label}
                            description={nextAction.description}
                            icon={nextAction.icon}
                            tone={nextAction.tone}
                            onClick={nextAction.onClick}
                        />
                    }
                />

                <AgencyReadinessPanel
                    title={t('dashboard.agency.overviewPage.readinessTitle', 'Readiness operativo')}
                    subtitle={t('dashboard.agency.overviewPage.readinessSubtitle', '{{ready}}/{{total}} señales listas', {
                        ready: readinessItems.filter((item) => item.complete).length,
                        total: readinessItems.length,
                    })}
                    score={readinessScore}
                    items={readinessItems}
                    tone={readinessScore >= 80 ? 'success' : readinessScore >= 50 ? 'warning' : 'danger'}
                />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.mrr')}
                    value={formatCurrency(safeMetrics.mrr)}
                    icon={DollarSign}
                    tone="success"
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.totalClients')}
                    value={totalClients}
                    icon={Users}
                    tone="accent"
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.totalProjects')}
                    value={formatNumber(safeMetrics.totalProjects)}
                    icon={FolderKanban}
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.totalLeads')}
                    value={formatNumber(safeMetrics.totalLeads)}
                    icon={Contact}
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.totalUsers')}
                    value={formatNumber(safeMetrics.totalUsers)}
                    icon={Users}
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.storageUsed')}
                    value={formatStorage(safeMetrics.storageUsedGB)}
                    icon={HardDrive}
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.aiCreditsUsed')}
                    value={formatNumber(safeMetrics.aiCreditsUsed)}
                    icon={Sparkles}
                    tone="warning"
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.operatingModules', 'Módulos operativos')}
                    value={operatingModuleValue}
                    icon={LayoutDashboard}
                    tone={agencyOperatingSystem.moduleReadinessRate >= 70 ? 'success' : 'info'}
                    hint={t('dashboard.agency.overviewPage.operatingModulesHint', '{{clients}} clientes con Agency OS', {
                        clients: agencyOperatingSystem.clientsWithOperatingSystem,
                    })}
                />
                <AgencyStatCard
                    label={t('dashboard.agency.overviewPage.revenueGenerated')}
                    value={formatCurrency(safeMetrics.totalRevenue)}
                    icon={DollarSign}
                    tone="success"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ResourceAlertsPanel alerts={resourceAlerts} onSelectClient={setSelectedClientId} />
                <UpcomingRenewalsPanel renewals={upcomingRenewals} onSelectClient={setSelectedClientId} />
            </div>

            <ClientListTable clients={subClients} onSelectClient={setSelectedClientId} renderClient360={false} />
            <ClientActivityFeed activities={recentActivity} />
            <Client360Panel
                client={selectedClient}
                metrics={selectedClient ? getClientMetrics(selectedClient.id) : null}
                activities={recentActivity}
                isOpen={Boolean(selectedClient)}
                isExporting={Boolean(selectedClient && exportingClientId === selectedClient.id)}
                onClose={() => setSelectedClientId(null)}
                onExport={handleExportClient}
            />
        </div>
    );
}
