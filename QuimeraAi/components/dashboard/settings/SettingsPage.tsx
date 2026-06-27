/**
 * SettingsPage
 * Main settings page with tabs for Team and Branding
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Palette, Building2, CreditCard, Menu } from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { useSafeTenant } from '../../../contexts/tenant';
import TeamSettings from './TeamSettings';
import SubscriptionSettings from './SubscriptionSettings';
import { BrandingSettings } from '../tenant';
import DashboardSidebar from '../DashboardSidebar';
import QuimeraLoader from '../../ui/QuimeraLoader';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { AppButton, AppIcon, PageContainer, StatusBadge } from '../../ui/system';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import { AppShell, AppShellContent, AppShellMain, AppShellTopbar } from '@/src/design-system/components/AppShell';

type SettingsTab = 'team' | 'branding' | 'subscription';

interface SettingsPageProps {
    initialTab?: SettingsTab;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
    const { t } = useTranslation();
    const { path, navigate } = useRouter();
    const { currentTenant, isLoadingTenant } = useSafeTenant();
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

    if (isLoadingTenant) {
        return <QuimeraLoader fullScreen size="md" />;
    }

    return (
        <AppShell>
            {/* Main Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <AppShellMain>
                {/* Header */}
                <AppShellTopbar className="z-10">
                    <div className="flex items-center gap-1 sm:gap-3">
                        {/* Botón menú sidebar - solo en móvil */}
                        <AppButton
                            variant="icon"
                            size="icon-md"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <Menu className="icon-lg" />
                        </AppButton>
                        <AppIcon icon={Building2} size="lg" className="quimera-dashboard-header-icon" strokeWidth={2} />
                        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                            {t('settings.title', 'Configuración del Workspace')}
                        </h1>
                        {currentTenant && (
                            <StatusBadge variant="muted" size="sm" className="hidden sm:inline-flex">
                                {currentTenant.name}
                            </StatusBadge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderBackButton onClick={() => navigate(ROUTES.DASHBOARD)} />
                    </div>
                </AppShellTopbar>

                {/* Settings Content */}
                <AppShellContent>
                    {/* Tab Navigation - Horizontal */}
                    <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SettingsTab)} className="border-b border-q-border bg-q-surface/50 px-3 sm:px-6">
                        <TabsList className="min-h-0 max-w-full overflow-x-auto rounded-none border-0 bg-transparent p-0 quimera-ds-scrollbar">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="h-auto shrink-0 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 shadow-none data-[state=active]:border-q-accent data-[state=active]:bg-transparent data-[state=active]:text-q-accent data-[state=active]:shadow-none"
                                    >
                                        <AppIcon icon={Icon} size="md" />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>

                    {/* Content Area */}
                    <PageContainer variant="wide">
                        {activeTab === 'team' && <TeamSettings />}
                        {activeTab === 'branding' && <BrandingSettings />}
                        {activeTab === 'subscription' && <SubscriptionSettings />}
                    </PageContainer>
                </AppShellContent>
            </AppShellMain>
        </AppShell>
    );
};

export default SettingsPage;
