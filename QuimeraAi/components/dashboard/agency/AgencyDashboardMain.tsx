/**
 * AgencyDashboardMain
 * Main dashboard view for Agency Plan - follows app design patterns
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Menu, CreditCard, FileText, UserPlus, Package, LayoutDashboard, BarChart3, Globe, Layers, PenTool, Navigation, FolderOpen, Shield, Lock, Monitor, type LucideIcon } from 'lucide-react';

import { useRouter } from '../../../hooks/useRouter';
import { useServiceAccess } from '../../../hooks/useServiceAccess';
import { ROUTES } from '../../../routes/config';
import { getAgencyEngineOperatingSystemManifest, type AgencyEngineDashboardTabId } from '../../../registry/moduleRegistry';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import DashboardSidebar from '../DashboardSidebar';
import { AgencyOverview } from './AgencyOverview';
import { AgencyAnalytics } from './AgencyAnalytics';
import { AgencyLandingEditor } from './landing';
import { BillingSettings } from './BillingSettings';
import { ReportsGenerator } from './ReportsGenerator';
import { OnboardingWorkflow } from './OnboardingWorkflow';
import { AddonsManager } from './AddonsManager';
import { AgencyPlanManager } from './plans';
import AgencyContentDashboard from './AgencyContentDashboard';
import AgencyNavigationManagement from './AgencyNavigationManagement';
import { AgencyProjects } from './AgencyProjects';
import { WhiteLabelSettings } from './WhiteLabelSettings';
import { AgencyClientPortalSettings } from './AgencyClientPortalSettings';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import HeaderBackButton from '@/components/ui/HeaderBackButton';
import { AgencySectionHeader, agencyContentClass, agencyShellClass } from './AgencyDesignSystem';

export type AgencyTab = AgencyEngineDashboardTabId;

type AgencyTabAccessConfig = {
    route: string;
    moduleId: string;
    requiredPermission: string;
};

const agencyEngineManifest = getAgencyEngineOperatingSystemManifest();
const agencyDashboardTabs = agencyEngineManifest.dashboardTabs;

export const AGENCY_TAB_ACCESS = Object.fromEntries(
    agencyDashboardTabs.map(tab => [
        tab.id,
        {
            route: tab.route,
            moduleId: tab.moduleId,
            requiredPermission: tab.requiredPermission,
        },
    ]),
) as Record<AgencyTab, AgencyTabAccessConfig>;

const AGENCY_TAB_ICONS: Record<AgencyTab, LucideIcon> = {
    overview: LayoutDashboard,
    analytics: BarChart3,
    landing: Globe,
    billing: CreditCard,
    reports: FileText,
    'new-client': UserPlus,
    addons: Package,
    plans: Layers,
    cms: PenTool,
    navigation: Navigation,
    projects: FolderOpen,
    'white-label': Shield,
    'client-portal': Monitor,
};

const HIDDEN_AGENCY_TAB_REASONS = new Set([
    'service_not_public',
    'service_in_development',
    'module_disabled',
]);

const AGENCY_ENGINE_OPERATING_MODULE_IDS = new Set(agencyEngineManifest.moduleIds);

const AgencyDashboardMain: React.FC = () => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { loadingClients } = useAgency();
    const serviceAccess = useServiceAccess();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determine active tab from URL
    const getTabFromPath = (): AgencyTab => {
        return agencyDashboardTabs.find(tab => path === tab.route || path.startsWith(`${tab.route}/`))?.id || 'overview';
    };

    const activeTab = getTabFromPath();

    const handleTabChange = (tab: AgencyTab) => {
        navigate(AGENCY_TAB_ACCESS[tab].route);
    };

    const rawTabs = useMemo(() => [
        ...agencyDashboardTabs.map(tab => ({
            id: tab.id,
            label: t(tab.labelKey, tab.label),
            icon: AGENCY_TAB_ICONS[tab.id],
        })),
    ], [t]);

    const tabAccessDecisions = useMemo(() => {
        return rawTabs.reduce((acc, tab) => {
            const access = AGENCY_TAB_ACCESS[tab.id];
            acc[tab.id] = serviceAccess.canAccessModule(access.moduleId, {
                serviceId: 'agency',
                featureKey: 'agencyModule',
                requiredPermission: access.requiredPermission,
            });
            return acc;
        }, {} as Record<AgencyTab, ReturnType<typeof serviceAccess.canAccessModule>>);
    }, [rawTabs, serviceAccess]);

    const tabs = useMemo(() => {
        const operatingTabs = rawTabs.filter((tab) => AGENCY_ENGINE_OPERATING_MODULE_IDS.has(AGENCY_TAB_ACCESS[tab.id].moduleId));
        if (serviceAccess.isLoading) return operatingTabs;
        return operatingTabs.filter((tab) => !HIDDEN_AGENCY_TAB_REASONS.has(tabAccessDecisions[tab.id]?.reasonCode));
    }, [rawTabs, serviceAccess.isLoading, tabAccessDecisions]);

    const firstAllowedTab = useMemo(
        () => tabs.find((tab) => tabAccessDecisions[tab.id]?.allowed)?.id || null,
        [tabs, tabAccessDecisions],
    );

    const activeTabAccess = tabAccessDecisions[activeTab];
    const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || rawTabs[0];

    useEffect(() => {
        if (serviceAccess.isLoading || !activeTabAccess) return;
        if (activeTabAccess.allowed) return;

        if (firstAllowedTab) {
            navigate(AGENCY_TAB_ACCESS[firstAllowedTab].route);
            return;
        }

        navigate(ROUTES.DASHBOARD);
    }, [activeTabAccess, firstAllowedTab, navigate, serviceAccess.isLoading]);

    return (
        <div className={agencyShellClass}>
            {/* Sidebar - collapse in the landing editor so the preview gets full width */}
            <DashboardSidebar
                key={activeTab === 'landing' ? 'sidebar-editor' : 'sidebar-default'}
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                defaultCollapsed={activeTab === 'landing'}
            />

            {/* Main Content */}
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="quimera-dashboard-header-bar sticky top-0 z-40 flex h-auto min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:px-6 sm:py-0">
                    {/* Left Section - Menu Button & Title */}
                    <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex-shrink-0 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('dashboard.agency.openNavMenu')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                            <Building2 size={20} className="quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                            <div className="min-w-0">
                                <h1 className="max-w-[12rem] truncate text-sm font-semibold text-foreground sm:max-w-none sm:text-lg">
                                    {t('agency.title', 'Agency Dashboard')}
                                </h1>
                                <p className="hidden truncate text-xs text-q-text-muted md:block">
                                    {activeTabConfig.label}
                                </p>
                            </div>
                        </div>
                    </div>
                    {activeTab === 'landing' && !loadingClients && (
                        <div
                            id="agency-landing-header-device-controls"
                            className="hidden md:flex absolute left-1/2 -translate-x-1/2"
                        />
                    )}

                    <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
                        {activeTab === 'landing' && !loadingClients && (
                            <div id="agency-landing-header-actions" className="flex items-center gap-1 sm:gap-2" />
                        )}
                        <HeaderBackButton onClick={() => navigate(ROUTES.DASHBOARD)} />
                    </div>
                </header>

                <div className="overflow-hidden border-b border-q-border bg-q-surface/30 px-3 sm:px-6">
                    <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide sm:mx-0 sm:px-0">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const tabAccess = tabAccessDecisions[tab.id];
                            const isDisabled = serviceAccess.isLoading || !tabAccess?.allowed;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (isDisabled) return;
                                        handleTabChange(tab.id);
                                    }}
                                    disabled={isDisabled}
                                    title={isDisabled ? tabAccess?.message : undefined}
                                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isActive
                                        ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                        : 'text-q-text-muted hover:text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <Icon size={18} className={`shrink-0 ${isActive ? 'quimera-status-card-accent-text' : ''}`} strokeWidth={isActive ? 2 : 1.5} />
                                    <span>{tab.label}</span>
                                    {isDisabled && !serviceAccess.isLoading && <Lock size={13} className="shrink-0" strokeWidth={1.8} />}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main Content Area */}
                <main id="main-content" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Landing Editor - Full width without container restrictions */}
                    {activeTab === 'landing' && !loadingClients && (
                        <div className="flex h-full min-h-0 w-full min-w-0">
                            <AgencyLandingEditor />
                        </div>
                    )}

                    {/* Other tabs with standard container */}
                    {activeTab !== 'landing' && (
                        <div className={agencyContentClass}>
                            <div className="mx-auto max-w-7xl space-y-6">
                            {loadingClients ? (
                                <div className="flex items-center justify-center h-64">
                                    <QuimeraLoader size="md" />
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'overview' && (
                                        <AgencyOverview />
                                    )}

                                    {activeTab === 'analytics' && (
                                        <AgencyAnalytics />
                                    )}

                                    {activeTab === 'billing' && (
                                        <div className="space-y-6">
                                            <AgencySectionHeader
                                                icon={CreditCard}
                                                title={t('agency.billing', 'Facturación')}
                                                subtitle={t('agency.billingDesc', 'Gestiona Stripe Connect y facturación de clientes')}
                                            />
                                            <BillingSettings />
                                        </div>
                                    )}

                                    {activeTab === 'reports' && (
                                        <div>

                                            <ReportsGenerator />
                                        </div>
                                    )}

                                    {activeTab === 'new-client' && (
                                        <div className="space-y-6">
                                            <AgencySectionHeader
                                                icon={UserPlus}
                                                title={t('agency.newClient', 'Nuevo Cliente')}
                                                subtitle={t('agency.newClientDesc', 'Onboarding automatizado para sub-clientes')}
                                            />
                                            <OnboardingWorkflow
                                                onComplete={() => handleTabChange('overview')}
                                                onCancel={() => handleTabChange('overview')}
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'addons' && (
                                        <div className="space-y-6">
                                            <AgencySectionHeader
                                                icon={Package}
                                                title={t('agency.addons', 'Add-ons')}
                                                subtitle={t('agency.addonsDesc', 'Gestiona complementos de tu subscription')}
                                            />
                                            <AddonsManager />
                                        </div>
                                    )}

                                    {activeTab === 'plans' && (
                                        <AgencyPlanManager />
                                    )}

                                    {activeTab === 'cms' && (
                                        <AgencyContentDashboard onBack={() => handleTabChange('overview')} />
                                    )}

                                    {activeTab === 'navigation' && (
                                        <AgencyNavigationManagement />
                                    )}

                                    {activeTab === 'projects' && (
                                        <AgencyProjects />
                                    )}

                                    {activeTab === 'white-label' && (
                                        <WhiteLabelSettings />
                                    )}

                                    {activeTab === 'client-portal' && (
                                        <AgencyClientPortalSettings />
                                    )}
                                </>
                            )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AgencyDashboardMain;
