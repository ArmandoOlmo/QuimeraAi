/**
 * AgencyDashboardMain
 * Main dashboard view for Agency Plan - follows app design patterns
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Menu, CreditCard, FileText, UserPlus, Package, LayoutDashboard, BarChart3, Globe, Layers, PenTool, Navigation, FolderOpen, Shield, Lock } from 'lucide-react';

import { useRouter } from '../../../hooks/useRouter';
import { useServiceAccess } from '../../../hooks/useServiceAccess';
import { ROUTES } from '../../../routes/config';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import DashboardSidebar from '../DashboardSidebar';
import { AgencyOverview } from './AgencyOverview';
import { AgencyAnalytics } from './AgencyAnalytics';
import { AgencyLandingEditor } from './landing';
import { BillingSettings } from './BillingSettings';
import { ReportsGenerator } from './ReportsGenerator';
import { ClientIntakeForm } from './ClientIntakeForm';
import { AddonsManager } from './AddonsManager';
import { AgencyPlanManager } from './plans';
import AgencyContentDashboard from './AgencyContentDashboard';
import AgencyNavigationManagement from './AgencyNavigationManagement';
import { AgencyProjects } from './AgencyProjects';
import { WhiteLabelSettings } from './WhiteLabelSettings';
import { toast } from 'react-hot-toast';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import HeaderBackButton from '@/components/ui/HeaderBackButton';
import { AgencySectionHeader, agencyContentClass, agencyShellClass } from './AgencyDesignSystem';

export type AgencyTab = 'overview' | 'analytics' | 'landing' | 'billing' | 'reports' | 'new-client' | 'addons' | 'plans' | 'cms' | 'navigation' | 'projects' | 'white-label';

type AgencyTabAccessConfig = {
    route: string;
    moduleId: string;
    requiredPermission: string;
};

export const AGENCY_TAB_ACCESS: Record<AgencyTab, AgencyTabAccessConfig> = {
    overview: { route: ROUTES.AGENCY_OVERVIEW, moduleId: 'agency-command-center', requiredPermission: 'canViewAnalytics' },
    analytics: { route: ROUTES.AGENCY_ANALYTICS, moduleId: 'agency-command-center', requiredPermission: 'canViewAnalytics' },
    landing: { route: ROUTES.AGENCY_LANDING, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' },
    billing: { route: ROUTES.AGENCY_BILLING, moduleId: 'agency-billing', requiredPermission: 'canManageBilling' },
    reports: { route: ROUTES.AGENCY_REPORTS, moduleId: 'agency-reports', requiredPermission: 'canViewAnalytics' },
    'new-client': { route: ROUTES.AGENCY_NEW_CLIENT, moduleId: 'agency-client-provisioning', requiredPermission: 'canManageSettings' },
    addons: { route: ROUTES.AGENCY_ADDONS, moduleId: 'agency-service-plans', requiredPermission: 'canManageBilling' },
    plans: { route: ROUTES.AGENCY_PLANS, moduleId: 'agency-service-plans', requiredPermission: 'canManageBilling' },
    cms: { route: ROUTES.AGENCY_CMS, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' },
    navigation: { route: ROUTES.AGENCY_NAVIGATION, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' },
    projects: { route: ROUTES.AGENCY_PROJECTS, moduleId: 'agency-project-transfer', requiredPermission: 'canManageProjects' },
    'white-label': { route: ROUTES.AGENCY_WHITE_LABEL, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' },
};

const HIDDEN_AGENCY_TAB_REASONS = new Set([
    'service_not_public',
    'service_in_development',
    'module_disabled',
]);

const AgencyDashboardMain: React.FC = () => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { loadingClients } = useAgency();
    const { currentTenant } = useTenant();
    const serviceAccess = useServiceAccess();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determine active tab from URL
    const getTabFromPath = (): AgencyTab => {
        if (path.includes('/analytics')) return 'analytics';
        if (path.includes('/landing')) return 'landing';
        if (path.includes('/billing')) return 'billing';
        if (path.includes('/reports')) return 'reports';
        if (path.includes('/new-client')) return 'new-client';
        if (path.includes('/addons')) return 'addons';
        if (path.includes('/plans')) return 'plans';
        if (path.includes('/cms')) return 'cms';
        if (path.includes('/navigation')) return 'navigation';
        if (path.includes('/projects')) return 'projects';
        if (path.includes('/white-label')) return 'white-label';
        return 'overview';
    };

    const activeTab = getTabFromPath();

    const handleTabChange = (tab: AgencyTab) => {
        navigate(AGENCY_TAB_ACCESS[tab].route);
    };

    const rawTabs = useMemo(() => [
        {
            id: 'overview' as AgencyTab,
            label: t('agency.overview', 'Vista General'),
            icon: LayoutDashboard,
        },
        {
            id: 'landing' as AgencyTab,
            label: t('agency.landing', 'Landing Page'),
            icon: Globe,
        },
        {
            id: 'new-client' as AgencyTab,
            label: t('agency.newClient', 'Nuevo Cliente'),
            icon: UserPlus,
        },
        {
            id: 'cms' as AgencyTab,
            label: t('agency.cms', 'CMS'),
            icon: PenTool,
        },
        {
            id: 'navigation' as AgencyTab,
            label: t('agency.navigation', 'Menú'),
            icon: Navigation,
        },
        {
            id: 'plans' as AgencyTab,
            label: t('agency.plans', 'Planes'),
            icon: Layers,
        },
        {
            id: 'addons' as AgencyTab,
            label: t('agency.addons', 'Add-ons'),
            icon: Package,
        },
        {
            id: 'billing' as AgencyTab,
            label: t('agency.billing', 'Facturación'),
            icon: CreditCard,
        },
        {
            id: 'analytics' as AgencyTab,
            label: t('agency.analytics', 'Analytics'),
            icon: BarChart3,
        },
        {
            id: 'reports' as AgencyTab,
            label: t('agency.reports', 'Reportes'),
            icon: FileText,
        },
        {
            id: 'projects' as AgencyTab,
            label: t('agency.projects', 'Proyectos'),
            icon: FolderOpen,
        },
        {
            id: 'white-label' as AgencyTab,
            label: t('agency.whiteLabel.tab', 'White Label'),
            icon: Shield,
        },
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
        if (serviceAccess.isLoading) return rawTabs;
        return rawTabs.filter((tab) => !HIDDEN_AGENCY_TAB_REASONS.has(tabAccessDecisions[tab.id]?.reasonCode));
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
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="quimera-dashboard-header-bar h-auto min-h-14 px-3 sm:px-6 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sticky top-0 z-40 relative">
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
                <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden">
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
                                            <ClientIntakeForm
                                                onSubmit={async (data) => {
                                                    try {
                                                        console.log('Creating client via Cloud Function:', data);

                                                        const { supabase } = await import('@/supabase');
                                                        if (!currentTenant?.id) {
                                                            throw new Error('No hay agencia activa para crear el cliente.');
                                                        }

                                                        const result = await supabase.functions.invoke('onboarding-api', {
                                                            body: {
                                                                action: 'autoProvision',
                                                                agencyTenantId: currentTenant.id,
                                                                businessName: data.businessName,
                                                                industry: data.industry,
                                                                contactEmail: data.contactEmail,
                                                                contactPhone: data.contactPhone,
                                                                projectTemplate: data.projectTemplate,
                                                                enabledFeatures: data.enabledFeatures,
                                                                initialUsers: data.initialUsers,
                                                                primaryColor: data.primaryColor,
                                                                secondaryColor: data.secondaryColor,
                                                                monthlyPrice: data.setupBilling ? data.monthlyPrice : undefined,
                                                                selectedPlanId: data.selectedPlanId,
                                                                selectedPlanName: data.selectedPlanName,
                                                                setupBilling: data.setupBilling,
                                                                aiStudioMode: data.aiStudioMode,
                                                                generateWebsite: data.generateWebsite,
                                                                generateStorefront: data.generateStorefront,
                                                                generateEcommerce: data.generateEcommerce,
                                                                generateChatbot: data.generateChatbot,
                                                                generateEmailFlows: data.generateEmailFlows,
                                                                generateAppointments: data.generateAppointments,
                                                                generateRestaurantModule: data.generateRestaurantModule,
                                                                generateRealtyModule: data.generateRealtyModule,
                                                                generateBioPage: data.generateBioPage,
                                                                generateMediaAssets: data.generateMediaAssets,
                                                            }
                                                        });

                                                        if (result.error) throw result.error;
                                                        const response = result.data?.data || result.data;

                                                        if (response.success) {
                                                            toast.success(
                                                                `Cliente "${data.businessName}" creado exitosamente. ${response.invitesSent} invitaciones enviadas.`
                                                            );
                                                        }

                                                        handleTabChange('overview');
                                                    } catch (error: any) {
                                                        console.error('Error creating client:', error);
                                                        toast.error(
                                                            error.message || 'Error al crear el cliente'
                                                        );
                                                        throw error;
                                                    }
                                                }}
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
