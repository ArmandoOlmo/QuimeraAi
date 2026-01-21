/**
 * AgencyDashboardMain
 * Main dashboard view for Agency Plan - follows app design patterns
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Menu, CreditCard, FileText, UserPlus, Package, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import DashboardSidebar from '../DashboardSidebar';
import { AgencyOverview } from './AgencyOverview';
import { BillingSettings } from './BillingSettings';
import { ReportsGenerator } from './ReportsGenerator';
import { ClientIntakeForm } from './ClientIntakeForm';
import { AddonsManager } from './AddonsManager';

type AgencyTab = 'overview' | 'billing' | 'reports' | 'new-client' | 'addons';

const AgencyDashboardMain: React.FC = () => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { subClients, loadingClients } = useAgency();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determine active tab from URL
    const getTabFromPath = (): AgencyTab => {
        if (path.includes('/billing')) return 'billing';
        if (path.includes('/reports')) return 'reports';
        if (path.includes('/new-client')) return 'new-client';
        if (path.includes('/addons')) return 'addons';
        return 'overview';
    };

    const activeTab = getTabFromPath();

    const handleTabChange = (tab: AgencyTab) => {
        switch (tab) {
            case 'overview':
                navigate(ROUTES.AGENCY);
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
        }
    };

    const tabs = [
        {
            id: 'overview' as AgencyTab,
            label: t('agency.overview', 'Vista General'),
            icon: LayoutDashboard,
        },
        {
            id: 'billing' as AgencyTab,
            label: t('agency.billing', 'Facturación'),
            icon: CreditCard,
        },
        {
            id: 'reports' as AgencyTab,
            label: t('agency.reports', 'Reportes'),
            icon: FileText,
        },
        {
            id: 'new-client' as AgencyTab,
            label: t('agency.newClient', 'Nuevo Cliente'),
            icon: UserPlus,
        },
        {
            id: 'addons' as AgencyTab,
            label: t('agency.addons', 'Add-ons'),
            icon: Package,
        },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section - Menu Button & Title */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Building2 size={24} className="text-primary" />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">
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

                    {/* Right Section - Back Button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Tabs */}
                <div className="md:hidden border-b border-border bg-background overflow-x-auto">
                    <div className="flex gap-1 px-4 py-2 min-w-max">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
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

                {/* Main Content Area */}
                <main id="main-content" className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-6">
                        {loadingClients ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground text-sm">
                                        {t('common.loading', 'Cargando...')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'overview' && (
                                    <AgencyOverview />
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
                                                console.log('Creating client:', data);
                                                // Mock API call
                                                await new Promise(resolve => setTimeout(resolve, 1000));
                                                handleTabChange('overview');
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
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AgencyDashboardMain;
