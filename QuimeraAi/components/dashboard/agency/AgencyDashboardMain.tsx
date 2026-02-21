/**
 * AgencyDashboardMain
 * Main dashboard view for Agency Plan - follows app design patterns
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Menu, CreditCard, FileText, UserPlus, Package, LayoutDashboard, BarChart3, Globe, Layers, PenTool, Navigation, ArrowLeft, FolderOpen } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { useAgency } from '../../../contexts/agency/AgencyContext';
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
import { toast } from 'react-hot-toast';
import QuimeraLoader from '@/components/ui/QuimeraLoader';

type AgencyTab = 'overview' | 'analytics' | 'landing' | 'billing' | 'reports' | 'new-client' | 'addons' | 'plans' | 'cms' | 'navigation' | 'projects';

const AgencyDashboardMain: React.FC = () => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { subClients, loadingClients } = useAgency();
    const functions = getFunctions();
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
        return 'overview';
    };

    const activeTab = getTabFromPath();

    const handleTabChange = (tab: AgencyTab) => {
        switch (tab) {
            case 'overview':
                navigate(ROUTES.AGENCY);
                break;
            case 'analytics':
                navigate(ROUTES.AGENCY_ANALYTICS);
                break;
            case 'landing':
                navigate(ROUTES.AGENCY_LANDING);
                break;
            case 'billing':
                navigate(ROUTES.AGENCY_BILLING);
                break;
            case 'reports':
                navigate(ROUTES.AGENCY_REPORTS);
                break;
            case 'new-client':
                navigate(ROUTES.AGENCY_NEW_CLIENT);
                break;
            case 'addons':
                navigate(ROUTES.AGENCY_ADDONS);
                break;
            case 'plans':
                navigate(ROUTES.AGENCY_PLANS);
                break;
            case 'cms':
                navigate(ROUTES.AGENCY_CMS);
                break;
            case 'navigation':
                navigate(ROUTES.AGENCY_NAVIGATION);
                break;
            case 'projects':
                navigate(ROUTES.AGENCY_PROJECTS);
                break;
        }
    };

    const tabs = [
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
    ];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section - Menu Button & Title */}
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Building2 size={24} className="text-primary" />
                            <h1 className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">
                                {t('agency.title', 'Agency Dashboard')}
                            </h1>
                        </div>
                    </div>

                    {/* Center Section - Tabs */}
                    <div className="flex-1 flex justify-center px-4">
                        <div className="hidden md:flex items-center gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                            ${isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                            }
                                        `}
                                    >
                                        <Icon size={16} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Section - Back Button (solo icono) */}
                    <div className="flex items-center justify-end flex-shrink-0 ml-auto">
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('common.back', 'Volver')}
                            title={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* Mobile Tabs - Grid 5 columnas, 2 filas, sin scroll */}
                <div className="md:hidden border-b border-border bg-background px-2 py-2">
                    <div className="grid grid-cols-5 gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors leading-tight ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    <Icon size={16} className="shrink-0" />
                                    <span className="truncate w-full text-center px-0.5">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <main id="main-content" className="flex-1 overflow-hidden flex flex-col">
                    {/* Landing Editor - Full width without container restrictions */}
                    {activeTab === 'landing' && !loadingClients && (
                        <div className="flex-1 w-full h-full">
                            <AgencyLandingEditor />
                        </div>
                    )}

                    {/* Other tabs with standard container */}
                    {activeTab !== 'landing' && (
                        <div className="w-full h-full overflow-y-auto p-6">
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
                                        <div>
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    {t('agency.billing', 'Facturación')}
                                                </h2>
                                                <p className="text-muted-foreground mt-1">
                                                    {t('agency.billingDesc', 'Gestiona Stripe Connect y facturación de clientes')}
                                                </p>
                                            </div>
                                            <BillingSettings />
                                        </div>
                                    )}

                                    {activeTab === 'reports' && (
                                        <div>

                                            <ReportsGenerator />
                                        </div>
                                    )}

                                    {activeTab === 'new-client' && (
                                        <div>
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    {t('agency.newClient', 'Nuevo Cliente')}
                                                </h2>
                                                <p className="text-muted-foreground mt-1">
                                                    {t('agency.newClientDesc', 'Onboarding automatizado para sub-clientes')}
                                                </p>
                                            </div>
                                            <ClientIntakeForm
                                                onSubmit={async (data) => {
                                                    try {
                                                        console.log('Creating client via Cloud Function:', data);

                                                        const provisionClient = httpsCallable(
                                                            functions,
                                                            'agencyOnboarding-autoProvision'
                                                        );

                                                        const result = await provisionClient({
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
                                                        });

                                                        const response = result.data as any;

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
                                        <div>
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    {t('agency.addons', 'Add-ons')}
                                                </h2>
                                                <p className="text-muted-foreground mt-1">
                                                    {t('agency.addonsDesc', 'Gestiona complementos de tu subscription')}
                                                </p>
                                            </div>
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
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AgencyDashboardMain;
