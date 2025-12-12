import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import {
    Shield, Users, LayoutTemplate, Bot, BarChart3, CreditCard, Puzzle,
    ArrowLeft, Menu, Image, MessageSquare, PackageSearch, Palette, Zap,
    Store, FlaskConical, Accessibility, Languages, Search, FileText,
    Navigation, Star, Settings, Grid3x3, List
} from 'lucide-react';
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

// Types
type AdminFeature = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: 'core' | 'content' | 'development' | 'analytics' | 'system';
    route: string;
    isPremium?: boolean;
    isNew?: boolean;
};

type ViewMode = 'grid' | 'list' | 'compact';

// Route mapping for admin features
const ADMIN_ROUTES: Record<string, string> = {
    'admins': ROUTES.ADMIN_ADMINS,
    'tenants': ROUTES.ADMIN_TENANTS,
    'languages': ROUTES.ADMIN_LANGUAGES,
    'prompts': ROUTES.ADMIN_PROMPTS,
    'stats': ROUTES.ADMIN_STATS,
    'billing': ROUTES.ADMIN_BILLING,
    'templates': ROUTES.ADMIN_TEMPLATES,
    'components': ROUTES.ADMIN_COMPONENTS,
    'content': ROUTES.ADMIN_CONTENT,
    'landing-navigation': ROUTES.ADMIN_LANDING_NAVIGATION,
    'marketplace': ROUTES.ADMIN_MARKETPLACE,
    'design-tokens': ROUTES.ADMIN_DESIGN_TOKENS,
    'conditional-rules': ROUTES.ADMIN_CONDITIONAL_RULES,
    'ab-testing': ROUTES.ADMIN_AB_TESTING,
    'accessibility': ROUTES.ADMIN_ACCESSIBILITY,
    'analytics': ROUTES.ADMIN_ANALYTICS,
    'images': ROUTES.ADMIN_IMAGES,
    'global-assistant': ROUTES.ADMIN_GLOBAL_ASSISTANT,
    'global-seo': ROUTES.ADMIN_GLOBAL_SEO,
    'app-info': ROUTES.ADMIN_APP_INFO,
};

// Components
const AdminCard: React.FC<{
    feature: AdminFeature;
    onClick?: () => void;
    viewMode: ViewMode;
}> = ({ feature, onClick, viewMode }) => {
    const { t } = useTranslation();
    const isCompact = viewMode === 'compact';
    const isList = viewMode === 'list';

    return (
        <div
            onClick={onClick}
            className={`
                group relative bg-editor-panel-bg rounded-xl border border-editor-border
                hover:border-editor-accent hover:shadow-lg hover:shadow-editor-accent/10
                transition-all duration-300 cursor-pointer overflow-hidden
                ${isCompact ? 'p-3' : isList ? 'p-4' : 'p-6'}
                ${isList ? 'flex items-center gap-4' : ''}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-editor-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className={`relative z-10 ${isList ? 'flex items-center gap-4 flex-1' : ''}`}>
                <div className={`
                    bg-editor-accent/10 rounded-lg text-editor-accent
                    flex items-center justify-center flex-shrink-0
                    group-hover:bg-editor-accent group-hover:text-white
                    transition-all duration-300 group-hover:scale-110
                    ${isCompact ? 'w-8 h-8' : 'w-12 h-12'}
                `}>
                    {feature.icon}
                </div>

                <div className={`${isList ? 'flex-1' : isCompact ? 'mt-2' : 'mt-4'}`}>
                    <div className="flex items-center gap-2">
                        <h3 className={`
                            font-bold text-editor-text-primary 
                            group-hover:text-editor-accent transition-colors
                            ${isCompact ? 'text-sm' : 'text-lg'}
                        `}>
                            {feature.title}
                        </h3>
                        {feature.isNew && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full">
                                {t ? t('superadmin.new') : 'New'}
                            </span>
                        )}
                        {feature.isPremium && (
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        )}
                    </div>
                    {!isCompact && (
                        <p className={`text-editor-text-secondary mt-1 ${isList ? 'text-sm' : 'text-sm'}`}>
                            {feature.description}
                        </p>
                    )}
                </div>

                {isList && (
                    <ArrowLeft className="w-5 h-5 text-editor-text-secondary group-hover:text-editor-accent transition-colors rotate-180" />
                )}
            </div>
        </div>
    );
};

const CategoryChip: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
}> = ({ label, active, onClick, count }) => (
    <button
        onClick={onClick}
        className={`
            px-4 py-2 font-medium text-sm transition-all duration-200
            ${active
                ? 'text-editor-accent'
                : 'text-editor-text-secondary hover:text-editor-text-primary'
            }
        `}
    >
        {label} {count !== undefined && <span className="ml-1">({count})</span>}
    </button>
);

const SuperAdminDashboard = () => {
    const { t } = useTranslation();
    const { adminView, setAdminView } = useUI();
    const { navigate } = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Navigate back to admin main
    const handleBack = () => {
        navigate(ROUTES.SUPERADMIN);
        setAdminView('main');
    };

    // Navigate to dashboard
    const handleBackToDashboard = () => {
        navigate(ROUTES.DASHBOARD);
    };

    const adminFeatures: AdminFeature[] = [
        // Core Management
        { id: 'admins', title: t('superadmin.adminManagement'), description: t('superadmin.adminManagementDesc'), icon: <Shield size={24} />, category: 'core', route: ROUTES.ADMIN_ADMINS },
        { id: 'tenants', title: t('superadmin.tenantManagement'), description: t('superadmin.tenantManagementDesc'), icon: <Users size={24} />, category: 'core', route: ROUTES.ADMIN_TENANTS },
        { id: 'languages', title: t('superadmin.languageSettings'), description: t('superadmin.languageSettingsDesc'), icon: <Languages size={24} />, category: 'core', route: ROUTES.ADMIN_LANGUAGES },
        { id: 'app-info', title: t('superadmin.appInformation'), description: t('superadmin.appInformationDesc'), icon: <FileText size={24} />, category: 'core', route: ROUTES.ADMIN_APP_INFO },
        { id: 'billing', title: t('superadmin.billing'), description: t('superadmin.billingDesc'), icon: <CreditCard size={24} />, category: 'core', route: ROUTES.ADMIN_BILLING, isPremium: true },

        // Content Management
        { id: 'templates', title: t('superadmin.websiteTemplates'), description: t('superadmin.websiteTemplatesDesc'), icon: <LayoutTemplate size={24} />, category: 'content', route: ROUTES.ADMIN_TEMPLATES },
        { id: 'components', title: t('superadmin.components'), description: t('superadmin.componentsDesc'), icon: <Puzzle size={24} />, category: 'content', route: ROUTES.ADMIN_COMPONENTS },
        { id: 'content', title: t('superadmin.contentManagement'), description: t('superadmin.contentManagementDesc'), icon: <FileText size={24} />, category: 'content', route: ROUTES.ADMIN_CONTENT },
        { id: 'images', title: t('superadmin.imageLibrary'), description: t('superadmin.imageLibraryDesc'), icon: <Image size={24} />, category: 'content', route: ROUTES.ADMIN_IMAGES },
        { id: 'landing-navigation', title: t('superadmin.landingNavigation'), description: t('superadmin.landingNavigationDesc'), icon: <Navigation size={24} />, category: 'content', route: ROUTES.ADMIN_LANDING_NAVIGATION },

        // Development & Design
        { id: 'design-tokens', title: t('superadmin.designTokens'), description: t('superadmin.designTokensDesc'), icon: <Palette size={24} />, category: 'development', route: ROUTES.ADMIN_DESIGN_TOKENS },
        { id: 'marketplace', title: t('superadmin.marketplace'), description: t('superadmin.marketplaceDesc'), icon: <Store size={24} />, category: 'development', route: ROUTES.ADMIN_MARKETPLACE },
        { id: 'conditional-rules', title: t('superadmin.conditionalRules'), description: t('superadmin.conditionalRulesDesc'), icon: <Zap size={24} />, category: 'development', route: ROUTES.ADMIN_CONDITIONAL_RULES },
        { id: 'accessibility', title: t('superadmin.accessibilityChecker'), description: t('superadmin.accessibilityCheckerDesc'), icon: <Accessibility size={24} />, category: 'development', route: ROUTES.ADMIN_ACCESSIBILITY },

        // Analytics & Testing
        { id: 'stats', title: t('superadmin.usageStatistics'), description: t('superadmin.usageStatisticsDesc'), icon: <BarChart3 size={24} />, category: 'analytics', route: ROUTES.ADMIN_STATS },
        { id: 'analytics', title: t('superadmin.componentAnalytics'), description: t('superadmin.componentAnalyticsDesc'), icon: <PackageSearch size={24} />, category: 'analytics', route: ROUTES.ADMIN_ANALYTICS },
        { id: 'ab-testing', title: t('superadmin.abTesting'), description: t('superadmin.abTestingDesc'), icon: <FlaskConical size={24} />, category: 'analytics', route: ROUTES.ADMIN_AB_TESTING, isNew: true },

        // System & AI
        { id: 'global-assistant', title: t('superadmin.globalAssistant.title'), description: t('superadmin.globalAssistantDesc'), icon: <MessageSquare size={24} />, category: 'core', route: ROUTES.ADMIN_GLOBAL_ASSISTANT },
        { id: 'prompts', title: t('superadmin.llmPrompts'), description: t('superadmin.llmPromptsDesc'), icon: <Bot size={24} />, category: 'system', route: ROUTES.ADMIN_PROMPTS },
        { id: 'global-seo', title: t('superadmin.globalSEO'), description: t('superadmin.globalSEODesc'), icon: <Search size={24} />, category: 'system', route: ROUTES.ADMIN_GLOBAL_SEO },
    ];

    const categories = useMemo(() => {
        const categoryMap = new Map<string, number>();
        adminFeatures.forEach(feature => {
            categoryMap.set(feature.category, (categoryMap.get(feature.category) || 0) + 1);
        });

        return [
            { id: 'all', label: t('common.all'), count: adminFeatures.length },
            { id: 'core', label: t('superadmin.categoryCore'), count: categoryMap.get('core') || 0 },
            { id: 'content', label: t('superadmin.categoryContent'), count: categoryMap.get('content') || 0 },
            { id: 'development', label: t('superadmin.categoryDevelopment'), count: categoryMap.get('development') || 0 },
            { id: 'analytics', label: t('superadmin.categoryAnalytics'), count: categoryMap.get('analytics') || 0 },
            { id: 'system', label: t('superadmin.categorySystem'), count: categoryMap.get('system') || 0 },
        ];
    }, [adminFeatures, t]);

    const filteredFeatures = useMemo(() => {
        return adminFeatures.filter(feature => {
            const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
            const matchesSearch = searchQuery === '' ||
                feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                feature.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [adminFeatures, selectedCategory, searchQuery]);

    const handleCardClick = (feature: AdminFeature) => {
        // Navigate to the feature route
        navigate(feature.route);
        // Also update EditorContext for backwards compatibility
        setAdminView(feature.id as any);
    };

    // Views rendering based on adminView state
    if (adminView === 'admins') return <AdminManagement onBack={handleBack} />;
    if (adminView === 'tenants') return <TenantManagement onBack={handleBack} />;
    if (adminView === 'languages') return <LanguageManagement onBack={handleBack} />;
    if (adminView === 'prompts') return <LLMPromptManagement onBack={handleBack} />;
    if (adminView === 'stats') return <UsageStatistics onBack={handleBack} />;
    if (adminView === 'billing') return <BillingManagement onBack={handleBack} />;
    if (adminView === 'templates') return <TemplateManagement onBack={handleBack} />;
    if (adminView === 'components') return <ComponentsDashboard onBack={handleBack} />;
    if (adminView === 'images') return <ImageLibraryManagement onBack={handleBack} />;
    if (adminView === 'global-assistant') return <GlobalAssistantSettings onBack={handleBack} />;
    if (adminView === 'global-seo') return <GlobalSEOSettings onBack={handleBack} />;
    if (adminView === 'app-info') return <AppInformationSettings onBack={handleBack} />;
    if (adminView === 'content') return <ContentManagementDashboard onBack={handleBack} />;
    if (adminView === 'landing-navigation') return <LandingNavigationManagement onBack={handleBack} />;
    if (adminView === 'marketplace') return <AdminViewLayout title={t('superadmin.marketplace')} onBack={handleBack}><ComponentMarketplace /></AdminViewLayout>;
    if (adminView === 'design-tokens') return <AdminViewLayout title={t('superadmin.designTokensTitle')} onBack={handleBack}><DesignTokensEditor /></AdminViewLayout>;
    if (adminView === 'conditional-rules') return <AdminViewLayout title={t('superadmin.conditionalRulesTitle')} onBack={handleBack}><ConditionalRulesEditor rules={[]} onUpdate={async (rules) => { console.log('Rules updated:', rules); }} /></AdminViewLayout>;
    if (adminView === 'ab-testing') return <AdminViewLayout title={t('superadmin.abTestingTitle')} onBack={handleBack} noPadding><ABTestingDashboard /></AdminViewLayout>;
    if (adminView === 'accessibility') return <AdminViewLayout title={t('superadmin.accessibilityCheckerTitle')} onBack={handleBack} noPadding><AccessibilityChecker /></AdminViewLayout>;
    if (adminView === 'analytics') return <AdminViewLayout title={t('superadmin.componentAnalyticsTitle')} onBack={handleBack} noPadding><AnalyticsDashboard /></AdminViewLayout>;

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="text-editor-text-secondary hover:text-editor-text-primary lg:hidden transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Shield className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-bold text-editor-text-primary">{t('superadmin.title')}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBackToDashboard}
                            className="flex items-center text-sm font-medium text-editor-text-secondary hover:text-editor-accent transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">{t('superadmin.backToDashboard')}</span>
                        </button>
                        <div className="hidden md:flex items-center gap-3">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`transition-colors ${viewMode === 'grid' ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title={t('superadmin.viewGrid')}
                            >
                                <Grid3x3 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`transition-colors ${viewMode === 'list' ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title={t('superadmin.viewList')}
                            >
                                <List className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`transition-colors ${viewMode === 'compact' ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title={t('superadmin.viewCompact')}
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-editor-text-secondary w-5 h-5" />
                            <input
                                type="text"
                                placeholder={t('superadmin.searchFeatures')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:border-editor-accent focus:ring-2 focus:ring-editor-accent/20 transition-all"
                            />
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {categories.map(cat => (
                                <CategoryChip key={cat.id} label={cat.label} count={cat.count} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} />
                            ))}
                        </div>

                        {/* Results count */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-editor-text-secondary">
                                {t('superadmin.showingResults', { count: filteredFeatures.length, total: adminFeatures.length })}
                            </p>
                            {(searchQuery || selectedCategory !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                    className="text-sm text-editor-accent hover:text-editor-accent/80 font-medium"
                                >
                                    {t('superadmin.clearFilters')}
                                </button>
                            )}
                        </div>

                        {/* Features Grid */}
                        {filteredFeatures.length > 0 ? (
                            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'}`}>
                                {filteredFeatures.map(feature => (
                                    <AdminCard key={feature.id} feature={feature} onClick={() => handleCardClick(feature)} viewMode={viewMode} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-editor-panel-bg border-2 border-dashed border-editor-border mb-4">
                                    <Search className="w-8 h-8 text-editor-text-secondary" />
                                </div>
                                <h3 className="text-lg font-semibold text-editor-text-primary mb-2">
                                    {t('superadmin.noResultsFound')}
                                </h3>
                                <p className="text-editor-text-secondary mb-4">
                                    {t('superadmin.noResultsDesc')}
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                    className="px-4 py-2 text-editor-accent hover:text-editor-accent/80 transition-colors font-medium"
                                >
                                    {t('superadmin.viewAllFeatures')}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
