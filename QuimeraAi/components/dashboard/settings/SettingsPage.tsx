/**
 * SettingsPage
 * Main settings page with tabs for Team and Branding
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Palette, ArrowLeft, Building2, CreditCard, Menu } from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { useTenant, useSafeTenant } from '../../../contexts/tenant';
import TeamSettings from './TeamSettings';
import SubscriptionSettings from './SubscriptionSettings';
import { BrandingSettings } from '../tenant';
import DashboardSidebar from '../DashboardSidebar';

type SettingsTab = 'team' | 'branding' | 'subscription';

interface SettingsPageProps {
    initialTab?: SettingsTab;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { currentTenant, isLoading } = useSafeTenant();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determine active tab from URL
    const getTabFromPath = (): SettingsTab => {
        if (path.includes('/branding')) return 'branding';
        if (path.includes('/subscription')) return 'subscription';
        if (path.includes('/team')) return 'team';
        return initialTab || 'team';
    };

    const [activeTab, setActiveTab] = useState<SettingsTab>(getTabFromPath());

    // Update tab when URL changes
    useEffect(() => {
        setActiveTab(getTabFromPath());
    }, [path]);

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        if (tab === 'team') {
            navigate(ROUTES.SETTINGS_TEAM);
        } else if (tab === 'branding') {
            navigate(ROUTES.SETTINGS_BRANDING);
        } else if (tab === 'subscription') {
            navigate(ROUTES.SETTINGS_SUBSCRIPTION);
        }
    };

    const tabs = [
        {
            id: 'team' as SettingsTab,
            label: t('settings.team', 'Equipo'),
            icon: Users,
            description: t('settings.teamDesc', 'Gestionar miembros e invitaciones'),
        },
        {
            id: 'branding' as SettingsTab,
            label: t('settings.branding', 'Branding'),
            icon: Palette,
            description: t('settings.brandingDesc', 'Personalizar apariencia y dominio'),
        },
        {
            id: 'subscription' as SettingsTab,
            label: t('settings.subscription.tab', 'Plan'),
            icon: CreditCard,
            description: t('settings.subscription.tabDesc', 'Gestionar plan y suscripción'),
        },
    ];

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                    <p className="text-muted-foreground text-sm">{t('common.loading', 'Cargando...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Main Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-1 sm:gap-3">
                        {/* Botón menú sidebar - solo en móvil */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Building2 size={20} className="text-primary" />
                        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                            {t('settings.title', 'Configuración del Workspace')}
                        </h1>
                        {currentTenant && (
                            <span className="px-2 py-1 text-xs bg-secondary rounded-md text-muted-foreground hidden sm:inline">
                                {currentTenant.name}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD)}
                        className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t('common.goBack', 'Volver')}
                        title={t('common.back', 'Volver')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                </header>

                {/* Settings Content */}
                <div className="flex-1 overflow-auto">
                    {/* Tab Navigation - Horizontal */}
                    <div className="border-b border-border bg-card/50 px-6">
                        <div className="flex gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${isActive
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 lg:p-8">
                        <div className="max-w-4xl mx-auto">
                            {activeTab === 'team' && <TeamSettings />}
                            {activeTab === 'branding' && <BrandingSettings />}
                            {activeTab === 'subscription' && <SubscriptionSettings />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;






