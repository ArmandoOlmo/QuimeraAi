
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { Shield, Users, LayoutTemplate, Bot, BarChart3, CreditCard, Puzzle, ArrowLeft, Menu, Image, MessageSquare, PackageSearch, Palette, Zap, Store, FlaskConical, Accessibility, Languages, Search, FileText, Navigation } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import AdminViewLayout from './admin/AdminViewLayout';
import AdminManagement from './admin/AdminManagement';
import TenantManagement from './admin/TenantManagement';
import LLMPromptManagement from './admin/LLMPromptManagement';
import UsageStatistics from './admin/UsageStatistics';
import BillingManagement from './admin/BillingManagement';
import TemplateManagement from './admin/TemplateManagement';
import ComponentsDashboard from './admin/ComponentsDashboard';
import ImageLibraryManagement from './admin/ImageLibraryManagement';
import GlobalAssistantSettings from './admin/GlobalAssistantSettings';
import GlobalSEOSettings from './admin/GlobalSEOSettings';
import AnalyticsDashboard from './admin/AnalyticsDashboard';
import DesignTokensEditor from './admin/DesignTokensEditor';
import ConditionalRulesEditor from './admin/ConditionalRulesEditor';
import ComponentMarketplace from './admin/ComponentMarketplace';
import ABTestingDashboard from './admin/ABTestingDashboard';
import AccessibilityChecker from './admin/AccessibilityChecker';
import LanguageManagement from './admin/LanguageManagement';
import AppInformationSettings from './admin/AppInformationSettings';
import ContentManagementDashboard from './admin/ContentManagementDashboard';
import LandingNavigationManagement from './admin/LandingNavigationManagement';

const AdminCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick?: () => void }> = ({ icon, title, description, onClick }) => (
    <div onClick={onClick} className="bg-editor-panel-bg p-6 rounded-lg border border-editor-border hover:border-editor-accent transition-colors cursor-pointer group">
        <div className="flex items-center space-x-4">
            <div className="bg-editor-accent/10 p-3 rounded-lg text-editor-accent">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-editor-text-primary group-hover:text-editor-accent transition-colors">{title}</h3>
                <p className="text-sm text-editor-text-secondary mt-1">{description}</p>
            </div>
        </div>
    </div>
);

const SuperAdminDashboard = () => {
    const { t } = useTranslation();
    const { setView, adminView, setAdminView } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const adminFeatures = [
        { id: 'admins', title: t('superadmin.adminManagement'), description: t('superadmin.adminManagementDesc'), icon: <Shield size={24} /> },
        { id: 'tenants', title: t('superadmin.tenantManagement'), description: t('superadmin.tenantManagementDesc'), icon: <Users size={24} /> },
        { id: 'languages', title: t('superadmin.languageSettings'), description: t('superadmin.languageSettingsDesc'), icon: <Languages size={24} /> },
        { id: 'app-info', title: t('superadmin.appInformation'), description: t('superadmin.appInformationDesc'), icon: <FileText size={24} /> },
        { id: 'global-assistant', title: t('superadmin.globalAssistant'), description: t('superadmin.globalAssistantDesc'), icon: <MessageSquare size={24} /> },
        { id: 'global-seo', title: t('superadmin.globalSEO'), description: t('superadmin.globalSEODesc'), icon: <Search size={24} /> },
        { id: 'templates', title: t('superadmin.websiteTemplates'), description: t('superadmin.websiteTemplatesDesc'), icon: <LayoutTemplate size={24} /> },
        { id: 'components', title: t('superadmin.components'), description: t('superadmin.componentsDesc'), icon: <Puzzle size={24} /> },
        { id: 'content', title: 'Content Management', description: 'Manage articles and pages for landing pages', icon: <FileText size={24} /> },
        { id: 'landing-navigation', title: 'Landing Navigation', description: 'Manage navigation menus for landing pages', icon: <Navigation size={24} /> },
        { id: 'marketplace', title: t('superadmin.marketplace'), description: t('superadmin.marketplaceDesc'), icon: <Store size={24} /> },
        { id: 'design-tokens', title: t('superadmin.designTokens'), description: t('superadmin.designTokensDesc'), icon: <Palette size={24} /> },
        { id: 'conditional-rules', title: t('superadmin.conditionalRules'), description: t('superadmin.conditionalRulesDesc'), icon: <Zap size={24} /> },
        { id: 'ab-testing', title: t('superadmin.abTesting'), description: t('superadmin.abTestingDesc'), icon: <FlaskConical size={24} /> },
        { id: 'accessibility', title: t('superadmin.accessibilityChecker'), description: t('superadmin.accessibilityCheckerDesc'), icon: <Accessibility size={24} /> },
        { id: 'analytics', title: t('superadmin.componentAnalytics'), description: t('superadmin.componentAnalyticsDesc'), icon: <PackageSearch size={24} /> },
        { id: 'images', title: t('superadmin.imageLibrary'), description: t('superadmin.imageLibraryDesc'), icon: <Image size={24} /> },
        { id: 'prompts', title: t('superadmin.llmPrompts'), description: t('superadmin.llmPromptsDesc'), icon: <Bot size={24} /> },
        { id: 'stats', title: t('superadmin.usageStatistics'), description: t('superadmin.usageStatisticsDesc'), icon: <BarChart3 size={24} /> },
        { id: 'billing', title: t('superadmin.billing'), description: t('superadmin.billingDesc'), icon: <CreditCard size={24} /> },
    ];

    const handleCardClick = (id: string) => {
        switch (id) {
            case 'admins': setAdminView('admins'); break;
            case 'tenants': setAdminView('tenants'); break;
            case 'languages': setAdminView('languages'); break;
            case 'prompts': setAdminView('prompts'); break;
            case 'stats': setAdminView('stats'); break;
            case 'billing': setAdminView('billing'); break;
            case 'templates': setAdminView('templates'); break;
            case 'components': setAdminView('components'); break;
            case 'content': setAdminView('content'); break;
            case 'landing-navigation': setAdminView('landing-navigation'); break;
            case 'marketplace': setAdminView('marketplace'); break;
            case 'design-tokens': setAdminView('design-tokens'); break;
            case 'conditional-rules': setAdminView('conditional-rules'); break;
            case 'ab-testing': setAdminView('ab-testing'); break;
            case 'accessibility': setAdminView('accessibility'); break;
            case 'analytics': setAdminView('analytics'); break;
            case 'images': setAdminView('images'); break;
            case 'global-assistant': setAdminView('global-assistant'); break;
            case 'global-seo': setAdminView('global-seo'); break;
            case 'app-info': setAdminView('app-info'); break;
            default: break;
        }
    };

    // Views that already have their own header/layout
    if (adminView === 'admins') return <AdminManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'tenants') return <TenantManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'languages') return <LanguageManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'prompts') return <LLMPromptManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'stats') return <UsageStatistics onBack={() => setAdminView('main')} />;
    if (adminView === 'billing') return <BillingManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'templates') return <TemplateManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'components') return <ComponentsDashboard onBack={() => setAdminView('main')} />;
    if (adminView === 'images') return <ImageLibraryManagement onBack={() => setAdminView('main')} />;
    if (adminView === 'global-assistant') return <GlobalAssistantSettings onBack={() => setAdminView('main')} />;
    if (adminView === 'global-seo') return <GlobalSEOSettings onBack={() => setAdminView('main')} />;
    if (adminView === 'app-info') return <AppInformationSettings onBack={() => setAdminView('main')} />;
    if (adminView === 'content') return <ContentManagementDashboard onBack={() => setAdminView('main')} />;
    if (adminView === 'landing-navigation') return <LandingNavigationManagement onBack={() => setAdminView('main')} />;
    
    // Views using the new AdminViewLayout wrapper
    if (adminView === 'marketplace') return (
        <AdminViewLayout title="Component Marketplace" onBack={() => setAdminView('main')}>
            <ComponentMarketplace />
        </AdminViewLayout>
    );
    
    if (adminView === 'design-tokens') return (
        <AdminViewLayout title="Design Tokens" onBack={() => setAdminView('main')}>
            <DesignTokensEditor />
        </AdminViewLayout>
    );
    
    if (adminView === 'conditional-rules') return (
        <AdminViewLayout title="Conditional Rules" onBack={() => setAdminView('main')}>
            <ConditionalRulesEditor rules={[]} onUpdate={async (rules) => { console.log('Rules updated:', rules); }} />
        </AdminViewLayout>
    );
    
    if (adminView === 'ab-testing') return (
        <AdminViewLayout title="A/B Testing" onBack={() => setAdminView('main')} noPadding>
            <ABTestingDashboard />
        </AdminViewLayout>
    );
    
    if (adminView === 'accessibility') return (
        <AdminViewLayout title="Accessibility Checker" onBack={() => setAdminView('main')} noPadding>
            <AccessibilityChecker />
        </AdminViewLayout>
    );
    
    if (adminView === 'analytics') return (
        <AdminViewLayout title="Component Analytics" onBack={() => setAdminView('main')} noPadding>
            <AnalyticsDashboard />
        </AdminViewLayout>
    );
    

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                 <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                         <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden mr-2 transition-colors"
                            title={t('common.openMenu')}
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                             <Shield className="text-editor-accent w-5 h-5" />
                             <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.title')}</h1>
                        </div>
                    </div>
                     <button 
                        onClick={() => setView('dashboard')}
                        className="flex items-center text-sm font-medium h-9 px-4 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        {t('superadmin.backToDashboard')}
                    </button>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    <p className="text-editor-text-secondary mb-8">{t('superadmin.accessMessage')}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminFeatures.map(feature => (
                            <AdminCard 
                                key={feature.id}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                onClick={() => handleCardClick(feature.id)}
                            />
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default SuperAdminDashboard;
