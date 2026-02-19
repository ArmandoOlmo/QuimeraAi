import React, { useState, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useAuth } from '../../contexts/core/AuthContext';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import {
    Shield, Users, LayoutTemplate, Bot, BarChart3, Puzzle,
    ArrowLeft, Menu, Image, MessageSquare, PackageSearch, Palette,
    FlaskConical, Languages, Search, FileText, FolderOpen,
    Navigation, Star, Settings, Grid3x3, List, X, Sparkles, Zap, Newspaper, Layout,
    Loader2
} from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import DashboardWaveRibbons from './DashboardWaveRibbons';
import AdminViewLayout from './admin/AdminViewLayout';

// Lazy-loaded admin panels — each loads on-demand (~905KB → ~30KB initial)
const AdminManagement = React.lazy(() => import('./admin/AdminManagement'));
const TenantManagement = React.lazy(() => import('./admin/TenantManagement'));
const LLMPromptManagement = React.lazy(() => import('./admin/LLMPromptManagement'));
const UsageStatistics = React.lazy(() => import('./admin/UsageStatistics'));
const TemplateManagement = React.lazy(() => import('./admin/TemplateManagement'));
const ComponentsDashboard = React.lazy(() => import('./admin/ComponentsDashboard'));
const ImageLibraryManagement = React.lazy(() => import('./admin/ImageLibraryManagement'));
const AdminAssetLibrary = React.lazy(() => import('./admin/AdminAssetLibrary'));
const GlobalAssistantSettings = React.lazy(() => import('./admin/GlobalAssistantSettings'));
const GlobalSEOSettings = React.lazy(() => import('./admin/GlobalSEOSettings'));
const AnalyticsDashboard = React.lazy(() => import('./admin/AnalyticsDashboard'));
const DesignTokensEditor = React.lazy(() => import('./admin/DesignTokensEditor'));
const LanguageManagement = React.lazy(() => import('./admin/LanguageManagement'));
const AppInformationSettings = React.lazy(() => import('./admin/AppInformationSettings'));
const ContentManagementDashboard = React.lazy(() => import('./admin/ContentManagementDashboard'));
const LandingNavigationManagement = React.lazy(() => import('./admin/LandingNavigationManagement'));
const SubscriptionManagement = React.lazy(() => import('./admin/SubscriptionManagement'));
const LandingChatbotAdmin = React.lazy(() => import('./admin/LandingChatbotAdmin'));
const ChangelogManagement = React.lazy(() => import('./admin/ChangelogManagement'));
const GlobalTrackingPixels = React.lazy(() => import('./admin/GlobalTrackingPixels'));
const GlobalChatbotPromptsSettings = React.lazy(() => import('./admin/GlobalChatbotPromptsSettings'));
const ExecutionModeToggle = React.lazy(() => import('./admin/ExecutionModeToggle'));
const NewsManagement = React.lazy(() => import('./admin/NewsManagement'));
const LandingPageEditor = React.lazy(() => import('./admin/LandingPageEditor'));
const ServiceAvailabilityControl = React.lazy(() => import('./admin/ServiceAvailabilityControl'));

// Loading skeleton for admin panels
const AdminPanelLoader = () => (
    <div className="flex items-center justify-center h-screen bg-editor-bg">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
            <span className="text-sm text-editor-text-secondary">Cargando panel...</span>
        </div>
    </div>
);

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
    allowedRoles: string[]; // Roles that can access this feature
};

type ViewMode = 'grid' | 'list' | 'compact';

// Route mapping for admin features
const ADMIN_ROUTES: Record<string, string> = {
    'admins': ROUTES.ADMIN_ADMINS,
    'tenants': ROUTES.ADMIN_TENANTS,
    'languages': ROUTES.ADMIN_LANGUAGES,
    'prompts': ROUTES.ADMIN_PROMPTS,
    'stats': ROUTES.ADMIN_STATS,
    'templates': ROUTES.ADMIN_TEMPLATES,
    'components': ROUTES.ADMIN_COMPONENTS,
    'content': ROUTES.ADMIN_CONTENT,
    'landing-navigation': ROUTES.ADMIN_LANDING_NAVIGATION,
    'design-tokens': ROUTES.ADMIN_DESIGN_TOKENS,
    'analytics': ROUTES.ADMIN_ANALYTICS,
    'images': ROUTES.ADMIN_IMAGES,
    'admin-assets': ROUTES.ADMIN_ASSETS,
    'global-assistant': ROUTES.ADMIN_GLOBAL_ASSISTANT,
    'global-seo': ROUTES.ADMIN_GLOBAL_SEO,
    'app-info': ROUTES.ADMIN_APP_INFO,
    'subscriptions': ROUTES.ADMIN_SUBSCRIPTIONS,
    'landing-chatbot': ROUTES.ADMIN_LANDING_CHATBOT,
    'changelog': ROUTES.ADMIN_CHANGELOG,
    'global-tracking-pixels': ROUTES.ADMIN_GLOBAL_TRACKING_PIXELS,
    'news': ROUTES.ADMIN_NEWS,
    'landing-editor': ROUTES.ADMIN_LANDING_EDITOR,
    'service-availability': ROUTES.ADMIN_SERVICE_AVAILABILITY,
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
    color?: 'accent' | 'emerald' | 'amber' | 'violet' | 'rose' | 'sky';
}> = ({ label, active, onClick, count, color = 'accent' }) => {
    const colorMap = {
        accent: active
            ? 'bg-editor-accent/15 text-editor-accent border-editor-accent/50 shadow-sm shadow-editor-accent/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-editor-accent/10 hover:text-editor-accent hover:border-editor-accent/30',
        emerald: active
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30',
        amber: active
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30',
        violet: active
            ? 'bg-violet-500/15 text-violet-400 border-violet-500/50 shadow-sm shadow-violet-500/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30',
        rose: active
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/50 shadow-sm shadow-rose-500/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30',
        sky: active
            ? 'bg-sky-500/15 text-sky-400 border-sky-500/50 shadow-sm shadow-sky-500/10'
            : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/30',
    };

    return (
        <button
            onClick={onClick}
            className={`
                px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border transition-all duration-200
                font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap
                ${colorMap[color]}
            `}
        >
            <span className="truncate max-w-[80px] sm:max-w-none">{label}</span>
            {count !== undefined && (
                <span className={`
                    px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold min-w-[20px] text-center
                    ${active
                        ? 'bg-white/20'
                        : 'bg-editor-border/50'
                    }
                `}>
                    {count}
                </span>
            )}
        </button>
    );
};

const SuperAdminDashboard = () => {
    const { t } = useTranslation();
    const { adminView, setAdminView } = useUI();
    const { userDocument } = useAuth();
    const { navigate } = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Get user role (default to empty string if not set)
    const userRole = userDocument?.role || '';

    // Navigate back to admin main
    const handleBack = () => {
        navigate(ROUTES.SUPERADMIN);
        setAdminView('main');
    };

    // Navigate to dashboard
    const handleBackToDashboard = () => {
        navigate(ROUTES.DASHBOARD);
    };

    // Define all admin features with their allowed roles
    const allAdminFeatures: AdminFeature[] = [
        // Core Management
        { id: 'admins', title: t('superadmin.adminManagement'), description: t('superadmin.adminManagementDesc'), icon: <Shield size={24} />, category: 'core', route: ROUTES.ADMIN_ADMINS, allowedRoles: ['owner', 'superadmin'] },
        { id: 'tenants', title: t('superadmin.tenantManagement'), description: t('superadmin.tenantManagementDesc'), icon: <Users size={24} />, category: 'core', route: ROUTES.ADMIN_TENANTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'languages', title: t('superadmin.languageSettings'), description: t('superadmin.languageSettingsDesc'), icon: <Languages size={24} />, category: 'core', route: ROUTES.ADMIN_LANGUAGES, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'app-info', title: t('superadmin.appInformation'), description: t('superadmin.appInformationDesc'), icon: <FileText size={24} />, category: 'core', route: ROUTES.ADMIN_APP_INFO, allowedRoles: ['owner', 'superadmin'] },
        { id: 'subscriptions', title: t('superadmin.subscriptions'), description: t('superadmin.subscriptionsDesc'), icon: <Sparkles size={24} />, category: 'core', route: ROUTES.ADMIN_SUBSCRIPTIONS, isNew: true, allowedRoles: ['owner', 'superadmin'] },
        { id: 'service-availability', title: t('serviceAvailability.title', 'Disponibilidad de Servicios'), description: t('serviceAvailability.description', 'Control global de servicios de la plataforma'), icon: <Settings size={24} />, category: 'core', route: ROUTES.ADMIN_SERVICE_AVAILABILITY, isNew: true, allowedRoles: ['owner', 'superadmin'] },

        // Content Management
        { id: 'news', title: t('admin.news.title', 'Noticias y Novedades'), description: t('superadmin.newsDesc', 'Gestionar noticias y actualizaciones para el dashboard'), icon: <Newspaper size={24} />, category: 'content', route: ROUTES.ADMIN_NEWS, isNew: true, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'templates', title: t('superadmin.websiteTemplates'), description: t('superadmin.websiteTemplatesDesc'), icon: <LayoutTemplate size={24} />, category: 'content', route: ROUTES.ADMIN_TEMPLATES, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'components', title: t('superadmin.components'), description: t('superadmin.componentsDesc'), icon: <Puzzle size={24} />, category: 'content', route: ROUTES.ADMIN_COMPONENTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'content', title: t('superadmin.contentManagement'), description: t('superadmin.contentManagementDesc'), icon: <FileText size={24} />, category: 'content', route: ROUTES.ADMIN_CONTENT, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'images', title: t('superadmin.imageLibrary'), description: t('superadmin.imageLibraryDesc'), icon: <Image size={24} />, category: 'content', route: ROUTES.ADMIN_IMAGES, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'admin-assets', title: t('superadmin.adminAssets'), description: t('superadmin.adminAssetsDesc'), icon: <FolderOpen size={24} />, category: 'content', route: ROUTES.ADMIN_ASSETS, isNew: true, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-navigation', title: t('superadmin.landingNavigation'), description: t('superadmin.landingNavigationDesc'), icon: <Navigation size={24} />, category: 'content', route: ROUTES.ADMIN_LANDING_NAVIGATION, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-editor', title: t('superadmin.landingEditor', 'Editor Landing Page'), description: t('superadmin.landingEditorDesc', 'Editar componentes de la landing page con vista previa en tiempo real'), icon: <Layout size={24} />, category: 'content', route: ROUTES.ADMIN_LANDING_EDITOR, isNew: true, allowedRoles: ['owner', 'superadmin'] },

        // Development & Design
        { id: 'design-tokens', title: t('superadmin.designTokens'), description: t('superadmin.designTokensDesc'), icon: <Palette size={24} />, category: 'development', route: ROUTES.ADMIN_DESIGN_TOKENS, allowedRoles: ['owner', 'superadmin', 'admin'] },

        // Analytics & Testing
        { id: 'stats', title: t('superadmin.usageStatistics'), description: t('superadmin.usageStatisticsDesc'), icon: <BarChart3 size={24} />, category: 'analytics', route: ROUTES.ADMIN_STATS, allowedRoles: ['owner', 'superadmin', 'admin', 'manager'] },
        { id: 'analytics', title: t('superadmin.componentAnalytics'), description: t('superadmin.componentAnalyticsDesc'), icon: <PackageSearch size={24} />, category: 'analytics', route: ROUTES.ADMIN_ANALYTICS, allowedRoles: ['owner', 'superadmin', 'admin', 'manager'] },
        { id: 'global-tracking-pixels', title: t('superadmin.globalTrackingPixels', 'Píxeles de Tracking'), description: t('superadmin.globalTrackingPixelsDesc', 'Analytics y píxeles de ads para toda la app'), icon: <BarChart3 size={24} />, category: 'analytics', route: ROUTES.ADMIN_GLOBAL_TRACKING_PIXELS, isNew: true, allowedRoles: ['owner', 'superadmin'] },

        // System & AI
        { id: 'global-assistant', title: t('superadmin.globalAssistant.title'), description: t('superadmin.globalAssistantDesc'), icon: <MessageSquare size={24} />, category: 'core', route: ROUTES.ADMIN_GLOBAL_ASSISTANT, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-chatbot', title: t('superadmin.landingChatbot', 'Landing Chatbot'), description: t('superadmin.landingChatbotDesc', 'Configurar chatbot para la landing page pública'), icon: <Bot size={24} />, category: 'core', route: ROUTES.ADMIN_LANDING_CHATBOT, isNew: true, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'prompts', title: t('superadmin.llmPrompts'), description: t('superadmin.llmPromptsDesc'), icon: <Bot size={24} />, category: 'system', route: ROUTES.ADMIN_PROMPTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'chatbot-prompts', title: 'Prompts de Chatbot', description: 'Configurar instrucciones globales para todos los chatbots de proyectos', icon: <MessageSquare size={24} />, category: 'system', route: ROUTES.ADMIN_CHATBOT_PROMPTS, isNew: true, allowedRoles: ['owner', 'superadmin'] },
        { id: 'global-seo', title: t('superadmin.globalSEO'), description: t('superadmin.globalSEODesc'), icon: <Search size={24} />, category: 'system', route: ROUTES.ADMIN_GLOBAL_SEO, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'execution-mode', title: '⚡ Execution Mode (Coming Soon)', description: 'Configure assistant execution behavior (feature in development)', icon: <Zap size={24} />, category: 'system', route: ROUTES.ADMIN_EXECUTION_MODE, isNew: true, allowedRoles: ['owner', 'superadmin'] },
    ];

    // Filter features based on user role
    const adminFeatures = useMemo(() => {
        return allAdminFeatures.filter(feature => feature.allowedRoles.includes(userRole));
    }, [userRole, t]);

    const categories = useMemo(() => {
        const categoryMap = new Map<string, number>();
        adminFeatures.forEach(feature => {
            categoryMap.set(feature.category, (categoryMap.get(feature.category) || 0) + 1);
        });

        return [
            { id: 'all', label: t('common.all'), count: adminFeatures.length, color: 'accent' as const },
            { id: 'core', label: t('superadmin.categoryCore'), count: categoryMap.get('core') || 0, color: 'emerald' as const },
            { id: 'content', label: t('superadmin.categoryContent'), count: categoryMap.get('content') || 0, color: 'amber' as const },
            { id: 'development', label: t('superadmin.categoryDevelopment'), count: categoryMap.get('development') || 0, color: 'violet' as const },
            { id: 'analytics', label: t('superadmin.categoryAnalytics'), count: categoryMap.get('analytics') || 0, color: 'rose' as const },
            { id: 'system', label: t('superadmin.categorySystem'), count: categoryMap.get('system') || 0, color: 'sky' as const },
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

    // Views rendering based on adminView state — wrapped in Suspense for lazy loading
    const adminPanel = (() => {
        switch (adminView) {
            case 'admins': return <AdminManagement onBack={handleBack} />;
            case 'tenants': return <TenantManagement onBack={handleBack} />;
            case 'languages': return <LanguageManagement onBack={handleBack} />;
            case 'prompts': return <LLMPromptManagement onBack={handleBack} />;
            case 'chatbot-prompts': return <GlobalChatbotPromptsSettings onBack={handleBack} />;
            case 'stats': return <UsageStatistics onBack={handleBack} />;
            case 'subscriptions': return <SubscriptionManagement onBack={handleBack} />;
            case 'templates': return <TemplateManagement onBack={handleBack} />;
            case 'components': return <ComponentsDashboard onBack={handleBack} />;
            case 'images': return <ImageLibraryManagement onBack={handleBack} />;
            case 'admin-assets': return <AdminAssetLibrary onBack={handleBack} />;
            case 'global-assistant': return <GlobalAssistantSettings onBack={handleBack} />;
            case 'global-seo': return <GlobalSEOSettings onBack={handleBack} />;
            case 'app-info': return <AppInformationSettings onBack={handleBack} />;
            case 'content': return <ContentManagementDashboard onBack={handleBack} />;
            case 'landing-navigation': return <LandingNavigationManagement onBack={handleBack} />;
            case 'landing-chatbot': return <LandingChatbotAdmin onBack={handleBack} />;
            case 'global-tracking-pixels': return <GlobalTrackingPixels onBack={handleBack} />;
            case 'execution-mode': return <ExecutionModeToggle onBack={handleBack} />;
            case 'news': return <NewsManagement onBack={handleBack} />;
            case 'landing-editor': return <LandingPageEditor onBack={handleBack} />;
            case 'service-availability': return <ServiceAvailabilityControl onBack={handleBack} />;
            case 'design-tokens': return <AdminViewLayout title={t('superadmin.designTokensTitle')} onBack={handleBack}><DesignTokensEditor /></AdminViewLayout>;
            case 'analytics': return <AdminViewLayout title={t('superadmin.componentAnalyticsTitle')} onBack={handleBack} noPadding><AnalyticsDashboard /></AdminViewLayout>;
            default: return null;
        }
    })();

    if (adminPanel) {
        return <Suspense fallback={<AdminPanelLoader />}>{adminPanel}</Suspense>;
    }

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />
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
                        <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2 mb-6">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={t('superadmin.searchFeatures')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Categories - Horizontal scroll on mobile */}
                        <div className="mb-4 sm:mb-6">
                            <div
                                className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {categories.map(cat => (
                                    <CategoryChip
                                        key={cat.id}
                                        label={cat.label}
                                        count={cat.count}
                                        active={selectedCategory === cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        color={cat.color}
                                    />
                                ))}
                            </div>
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
