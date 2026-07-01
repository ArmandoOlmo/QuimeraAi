import React, { useState, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useAuth } from '../../contexts/core/AuthContext';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import {
    Shield, Users, LayoutTemplate, Bot, BarChart3, Puzzle,
    ArrowRight, Menu, MessageSquare, PackageSearch, Palette,
    Languages, Search, FileText, FolderOpen,
    Navigation, Star, Settings, Grid3x3, List, X, Sparkles, Zap, Newspaper, Layout,
    Loader2, DollarSign, Globe, UserPlus, CalendarDays, Mail, ServerCog, Workflow, Factory
} from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import MobileSearchModal from '../ui/MobileSearchModal';
import AdminViewLayout from './admin/AdminViewLayout';
import HeaderBackButton from '../ui/HeaderBackButton';
import { normalizeRoleKey } from '../../constants/roles';

// Lazy-loaded admin panels — each loads on-demand (~905KB → ~30KB initial)
const AdminManagement = React.lazy(() => import('./admin/AdminManagement'));
const TenantManagement = React.lazy(() => import('./admin/TenantManagement'));
const LLMPromptManagement = React.lazy(() => import('./admin/LLMPromptManagement'));
const UsageStatistics = React.lazy(() => import('./admin/UsageStatistics'));
const TemplateManagement = React.lazy(() => import('./admin/TemplateManagement'));
const ComponentsDashboard = React.lazy(() => import('./admin/ComponentsDashboard'));
const FinancialDashboard = React.lazy(() => import('./admin/FinancialDashboard'));
const MediaManagerView = React.lazy(() => import('./admin/MediaManagerView'));
const AdminMcpManager = React.lazy(() => import('./admin/AdminMcpManager'));
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
const SubdomainManagement = React.lazy(() => import('./admin/SubdomainManagement'));
const AdminLeadsDashboard = React.lazy(() => import('./admin/AdminLeadsDashboard'));
const AdminAppointmentsDashboard = React.lazy(() => import('./admin/AdminAppointmentsDashboard'));
const AdminEmailHub = React.lazy(() => import('./admin/AdminEmailHub'));
const AdminRealtyEngineControl = React.lazy(() => import('./admin/AdminRealtyEngineControl'));
const ContentFactoryAdmin = React.lazy(() => import('./admin/ContentFactoryAdmin'));

const NEW_BADGE_WINDOW_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENT_FEATURE_RELEASE_DATE = '2026-06-24';

const isWithinNewBadgeWindow = (newSince?: string) => {
    if (!newSince) return false;

    const releaseDate = new Date(`${newSince}T00:00:00Z`);
    if (Number.isNaN(releaseDate.getTime())) return false;

    const elapsedMs = Date.now() - releaseDate.getTime();
    return elapsedMs >= 0 && elapsedMs < NEW_BADGE_WINDOW_DAYS * DAY_IN_MS;
};

// Loading skeleton for admin panels
const AdminPanelLoader = () => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-center h-screen bg-q-bg">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-q-accent animate-spin" />
                <span className="text-sm text-q-text-secondary">{t('superadmin.loadingPanel')}</span>
            </div>
        </div>
    );
};

// Types
type AdminFeature = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: 'core' | 'content' | 'development' | 'analytics' | 'system';
    route: string;
    isPremium?: boolean;
    newSince?: string;
    allowedRoles: string[]; // Roles that can access this feature
};

type ViewMode = 'grid' | 'list' | 'compact';

// Components
const AdminCard: React.FC<{
    feature: AdminFeature;
    onClick?: () => void;
    viewMode: ViewMode;
}> = ({ feature, onClick, viewMode }) => {
    const { t } = useTranslation();
    const isCompact = viewMode === 'compact';
    const isList = viewMode === 'list';
    const showNewBadge = isWithinNewBadgeWindow(feature.newSince);
    const categoryLabels: Record<AdminFeature['category'], string> = {
        core: t('superadmin.categoryCore'),
        content: t('superadmin.categoryContent'),
        development: t('superadmin.categoryDevelopment'),
        analytics: t('superadmin.categoryAnalytics'),
        system: t('superadmin.categorySystem'),
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                group relative h-full w-full overflow-hidden rounded-lg border border-q-border bg-q-surface text-left
                transition-all duration-200 hover:-translate-y-0.5 hover:border-q-accent/50
                hover:bg-q-surface-elevated hover:shadow-[0_12px_28px_rgba(34,29,24,0.08)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/40
                ${isList ? 'flex min-h-[76px] items-center gap-4 p-4' : 'flex min-h-[132px] flex-col p-4'}
                ${isCompact ? 'min-h-[104px] p-3' : ''}
            `}
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-q-accent/0 transition-colors duration-200 group-hover:bg-q-accent/70" />

            <div className={`relative z-10 ${isList ? 'flex min-w-0 flex-1 items-center gap-4' : 'flex h-full flex-col'}`}>
                <div className={`
                    flex flex-shrink-0 items-center justify-center text-q-accent transition-colors duration-200
                    group-hover:text-q-text
                    ${isCompact ? 'h-7 w-7' : 'h-8 w-8'}
                `}>
                    {feature.icon}
                </div>

                <div className={`${isList ? 'min-w-0 flex-1' : 'mt-3 min-w-0 flex-1'}`}>
                    <div className="mb-1.5 flex min-w-0 items-center gap-2">
                        <h3 className={`
                            min-w-0 truncate font-semibold text-q-text transition-colors group-hover:text-q-accent
                            ${isCompact ? 'text-sm' : 'text-base'}
                        `}>
                            {feature.title}
                        </h3>
                        {showNewBadge && (
                            <span className="flex-shrink-0 rounded-full bg-q-success/15 px-2 py-0.5 text-[10px] font-semibold text-q-success">
                                {t('superadmin.new')}
                            </span>
                        )}
                        {feature.isPremium && (
                            <Star className="w-3.5 h-3.5 text-q-accent fill-yellow-400" />
                        )}
                    </div>
                    <p className={`text-q-text-secondary ${isList ? 'truncate text-sm' : isCompact ? 'line-clamp-2 text-xs leading-5' : 'line-clamp-2 text-sm leading-5'}`}>
                        {feature.description}
                    </p>
                    {!isList && (
                        <span className="mt-3 inline-flex w-fit rounded-md border border-q-border bg-q-bg px-2 py-1 text-[11px] font-medium text-q-text-secondary">
                            {categoryLabels[feature.category]}
                        </span>
                    )}
                </div>

                {isList && (
                    <ArrowRight className="h-5 w-5 flex-shrink-0 text-q-text-secondary transition-colors group-hover:text-q-accent" />
                )}
            </div>
        </button>
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
            ? 'bg-q-accent/30 text-q-accent border-q-accent/50 shadow-sm shadow-q-accent/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-accent/20 hover:text-q-accent hover:border-q-accent/30',
        emerald: active
            ? 'bg-q-success/30 text-q-success border-q-success/50 shadow-sm shadow-q-success/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-success/20 hover:text-q-success hover:border-q-success/30',
        amber: active
            ? 'bg-q-accent/30 text-q-accent border-q-accent/50 shadow-sm shadow-q-accent/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-accent/20 hover:text-q-accent hover:border-q-accent/30',
        violet: active
            ? 'bg-q-accent/30 text-q-accent border-q-accent/50 shadow-sm shadow-q-accent/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-accent/20 hover:text-q-accent hover:border-q-accent/30',
        rose: active
            ? 'bg-q-error/30 text-q-error border-q-error/50 shadow-sm shadow-q-error/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-error/20 hover:text-q-error hover:border-q-error/30',
        sky: active
            ? 'bg-q-accent/30 text-q-accent border-q-accent/50 shadow-sm shadow-q-accent/10 backdrop-blur-md'
            : 'bg-q-bg/90 text-q-text-secondary border-q-border backdrop-blur-md hover:bg-q-accent/20 hover:text-q-accent hover:border-q-accent/30',
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
                        ? 'bg-q-surface/20'
                        : 'bg-q-surface-overlay/50'
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
    const { navigate, goBack } = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('compact');

    // Get user role (default to empty string if not set)
    const userRole = normalizeRoleKey(userDocument?.role || '');

    // Navigate back to admin main
    const handleBack = () => {
        goBack();
        setAdminView('main');
    };

    // Navigate to dashboard
    const handleBackToDashboard = () => {
        goBack();
    };

    // Define all admin features with their allowed roles
    const allAdminFeatures: AdminFeature[] = [
        // Core Management
        { id: 'admins', title: t('superadmin.adminManagement'), description: t('superadmin.adminManagementDesc'), icon: <Shield size={24} />, category: 'core', route: ROUTES.ADMIN_ADMINS, allowedRoles: ['owner', 'superadmin'] },
        { id: 'tenants', title: t('superadmin.tenantManagement'), description: t('superadmin.tenantManagementDesc'), icon: <Users size={24} />, category: 'core', route: ROUTES.ADMIN_TENANTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'languages', title: t('superadmin.languageSettings'), description: t('superadmin.languageSettingsDesc'), icon: <Languages size={24} />, category: 'core', route: ROUTES.ADMIN_LANGUAGES, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'app-info', title: t('superadmin.appInformation'), description: t('superadmin.appInformationDesc'), icon: <FileText size={24} />, category: 'core', route: ROUTES.ADMIN_APP_INFO, allowedRoles: ['owner', 'superadmin'] },
        { id: 'subscriptions', title: t('superadmin.subscriptions'), description: t('superadmin.subscriptionsDesc'), icon: <Sparkles size={24} />, category: 'core', route: ROUTES.ADMIN_SUBSCRIPTIONS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'service-availability', title: t('serviceAvailability.title', 'Disponibilidad de Servicios'), description: t('serviceAvailability.description', 'Control global de servicios de la plataforma'), icon: <Settings size={24} />, category: 'core', route: ROUTES.ADMIN_SERVICE_AVAILABILITY, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'subdomains', title: t('superadmin.subdomainManagement', 'Gestión de Subdominios'), description: t('superadmin.subdomainManagementDesc', 'Administrar subdominios de usuarios, agencias y tenants'), icon: <Globe size={24} />, category: 'core', route: ROUTES.ADMIN_SUBDOMAINS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'realty-engine', title: t('superadmin.realtyEngine.cardTitle'), description: t('superadmin.realtyEngine.cardDescription'), icon: <Workflow size={24} />, category: 'core', route: ROUTES.ADMIN_REALTY_ENGINE, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin', 'admin'] },

        // Content Management
        { id: 'news', title: t('superadmin.news.title', 'Noticias y Novedades'), description: t('superadmin.newsDesc', 'Gestionar noticias y actualizaciones para el dashboard'), icon: <Newspaper size={24} />, category: 'content', route: ROUTES.ADMIN_NEWS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'templates', title: t('superadmin.websiteTemplates'), description: t('superadmin.websiteTemplatesDesc'), icon: <LayoutTemplate size={24} />, category: 'content', route: ROUTES.ADMIN_TEMPLATES, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'components', title: t('superadmin.componentsTitle'), description: t('superadmin.componentsDesc'), icon: <Puzzle size={24} />, category: 'content', route: ROUTES.ADMIN_COMPONENTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'content', title: t('superadmin.contentManagement'), description: t('superadmin.contentManagementDesc'), icon: <FileText size={24} />, category: 'content', route: ROUTES.ADMIN_CONTENT, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'admin-assets', title: t('superadmin.imageLibrary', 'Librería de Imágenes'), description: t('superadmin.adminAssetsDesc', 'Biblioteca completa de imágenes de administración, templates y generaciones IA'), icon: <FolderOpen size={24} />, category: 'content', route: ROUTES.ADMIN_ASSETS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'content-factory', title: t('superadmin.contentFactory', 'Content Factory Admin'), description: t('superadmin.contentFactoryDesc', 'Presets, prompt blocks, provider routing, safety, jobs, and publishing for Content Studio.'), icon: <Factory size={24} />, category: 'content', route: ROUTES.ADMIN_CONTENT_FACTORY, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-navigation', title: t('superadmin.landingNavigation'), description: t('superadmin.landingNavigationDesc'), icon: <Navigation size={24} />, category: 'content', route: ROUTES.ADMIN_LANDING_NAVIGATION, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-editor', title: t('superadmin.landingEditor', 'Editor Landing Page'), description: t('superadmin.landingEditorDesc', 'Editar componentes de la landing page con vista previa en tiempo real'), icon: <Layout size={24} />, category: 'content', route: ROUTES.ADMIN_LANDING_EDITOR, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },

        // Development & Design
        { id: 'mcp', title: t('superadmin.mcpTitle'), description: t('superadmin.mcpDesc'), icon: <ServerCog size={24} />, category: 'development', route: ROUTES.ADMIN_MCP, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'design-tokens', title: t('superadmin.designTokens'), description: t('superadmin.designTokensDesc'), icon: <Palette size={24} />, category: 'development', route: ROUTES.ADMIN_DESIGN_TOKENS, allowedRoles: ['owner', 'superadmin', 'admin'] },

        // Analytics & Testing
        { id: 'finances', title: t('superadmin.finances', 'Finanzas y MRR'), description: t('superadmin.financesDesc', 'Dashboard financiero, MRR, y suscripciones.'), icon: <DollarSign size={24} />, category: 'analytics', route: ROUTES.ADMIN_FINANCES, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'stats', title: t('superadmin.usageStatistics'), description: t('superadmin.usageStatisticsDesc'), icon: <BarChart3 size={24} />, category: 'analytics', route: ROUTES.ADMIN_STATS, allowedRoles: ['owner', 'superadmin', 'admin', 'manager'] },
        { id: 'analytics', title: t('superadmin.componentAnalytics'), description: t('superadmin.componentAnalyticsDesc'), icon: <PackageSearch size={24} />, category: 'analytics', route: ROUTES.ADMIN_ANALYTICS, allowedRoles: ['owner', 'superadmin', 'admin', 'manager'] },
        { id: 'global-tracking-pixels', title: t('superadmin.globalTrackingPixels', 'Píxeles de Tracking'), description: t('superadmin.globalTrackingPixelsDesc', 'Analytics y píxeles de ads para toda la app'), icon: <BarChart3 size={24} />, category: 'analytics', route: ROUTES.ADMIN_GLOBAL_TRACKING_PIXELS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },

        // System & AI
        { id: 'global-assistant', title: t('superadmin.globalAssistant.title'), description: t('superadmin.globalAssistantDesc'), icon: <MessageSquare size={24} />, category: 'core', route: ROUTES.ADMIN_GLOBAL_ASSISTANT, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'landing-chatbot', title: t('superadmin.landingChatbot', 'Landing Chatbot'), description: t('superadmin.landingChatbotDesc', 'Configurar chatbot para la landing page pública'), icon: <Bot size={24} />, category: 'core', route: ROUTES.ADMIN_LANDING_CHATBOT, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'prompts', title: t('superadmin.llmPrompts'), description: t('superadmin.llmPromptsDesc'), icon: <Bot size={24} />, category: 'system', route: ROUTES.ADMIN_PROMPTS, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'chatbot-prompts', title: t('superadmin.chatbotPrompts'), description: t('superadmin.chatbotPromptsDesc'), icon: <MessageSquare size={24} />, category: 'system', route: ROUTES.ADMIN_CHATBOT_PROMPTS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'admin-leads', title: t('superadmin.platformLeads', 'Leads de Plataforma'), description: t('superadmin.platformLeadsDesc', 'Gestionar leads recibidos desde la landing page, formulario de contacto y chatbot'), icon: <UserPlus size={24} />, category: 'core', route: ROUTES.ADMIN_LEADS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'admin-appointments', title: t('superadmin.platformAppointments', 'Citas de Plataforma'), description: t('superadmin.platformAppointmentsDesc', 'Gestionar citas agendadas a nivel de plataforma'), icon: <CalendarDays size={24} />, category: 'core', route: ROUTES.ADMIN_APPOINTMENTS, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
        { id: 'global-seo', title: t('superadmin.globalSEO'), description: t('superadmin.globalSEODesc'), icon: <Search size={24} />, category: 'system', route: ROUTES.ADMIN_GLOBAL_SEO, allowedRoles: ['owner', 'superadmin', 'admin'] },
        { id: 'execution-mode', title: t('superadmin.executionMode'), description: t('superadmin.executionModeDesc'), icon: <Zap size={24} />, category: 'system', route: ROUTES.ADMIN_EXECUTION_MODE, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },

        // Email Marketing
        { id: 'admin-email', title: t('superadmin.emailMarketing', 'Email Marketing Hub'), description: t('superadmin.emailMarketingDesc', 'Gestión centralizada de campañas, audiencias, automatizaciones y AI Email Studio'), icon: <Mail size={24} />, category: 'content', route: ROUTES.ADMIN_EMAIL, newSince: RECENT_FEATURE_RELEASE_DATE, allowedRoles: ['owner', 'superadmin'] },
    ];

    // Filter features based on user role
    const adminFeatures = useMemo(() => {
        return allAdminFeatures.filter(feature => feature.allowedRoles.includes(userRole));
    }, [userRole, t]);
    const canAccessContentFactoryAdmin = adminFeatures.some(feature => feature.id === 'content-factory');

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

    const priorityFeatures = useMemo(() => {
        const priorityIds = ['tenants', 'subscriptions', 'finances', 'content-factory', 'admin-email', 'content', 'service-availability'];
        const priority = priorityIds
            .map(id => adminFeatures.find(feature => feature.id === id))
            .filter((feature): feature is AdminFeature => Boolean(feature));

        return priority.length >= 4 ? priority : adminFeatures.slice(0, 6);
    }, [adminFeatures]);

    const categorySections = useMemo(() => {
        return categories
            .filter(category => category.id !== 'all')
            .map(category => ({
                ...category,
                features: filteredFeatures.filter(feature => feature.category === category.id),
            }))
            .filter(section => section.features.length > 0);
    }, [categories, filteredFeatures]);

    const newFeatureCount = useMemo(() => {
        return adminFeatures.filter(feature => isWithinNewBadgeWindow(feature.newSince)).length;
    }, [adminFeatures]);

    const activeCategoryLabel = categories.find(category => category.id === selectedCategory)?.label || t('common.all');
    const isFiltered = searchQuery.trim().length > 0 || selectedCategory !== 'all';

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
            case 'images': return <MediaManagerView onBack={handleBack} />;
            case 'admin-assets': return <MediaManagerView onBack={handleBack} />;
            case 'content-factory': {
                if (!canAccessContentFactoryAdmin) return null;
                return <ContentFactoryAdmin onBack={handleBack} />;
            }
            case 'mcp': return <AdminMcpManager onBack={handleBack} />;
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
            case 'subdomains': return <SubdomainManagement onBack={handleBack} />;
            case 'realty-engine': return <AdminRealtyEngineControl onBack={handleBack} />;
            case 'finances': return <FinancialDashboard onBack={handleBack} />;
            case 'admin-leads': return (
                <div className="flex h-screen bg-q-bg text-foreground">
                    <DashboardSidebar isMobileOpen={false} onClose={() => {}} />
                    <AdminLeadsDashboard onBack={handleBack} />
                </div>
            );
            case 'admin-appointments': return (
                <div className="flex h-screen bg-q-bg text-foreground">
                    <DashboardSidebar isMobileOpen={false} onClose={() => {}} />
                    <AdminAppointmentsDashboard onBack={handleBack} />
                </div>
            );
            case 'design-tokens': return <AdminViewLayout title={t('superadmin.designTokensTitle')} onBack={handleBack}><DesignTokensEditor /></AdminViewLayout>;
            case 'analytics': return <AdminViewLayout title={t('superadmin.componentAnalyticsTitle')} onBack={handleBack} noPadding><AnalyticsDashboard /></AdminViewLayout>;
            case 'admin-email': return <AdminEmailHub onBack={handleBack} />;
            default: return null;
        }
    })();

    if (adminPanel) {
        return <Suspense fallback={<AdminPanelLoader />}>{adminPanel}</Suspense>;
    }

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="admin-dashboard-topbar quimera-dashboard-header-bar h-14 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="text-q-text-secondary hover:text-q-text lg:hidden transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Shield className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                        <h1 className="text-lg font-bold text-q-text">{t('superadmin.title')}</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search Button */}
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="text-q-text-muted hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-q-surface-overlay/40 md:hidden"
                            aria-label={t('common.search', 'Buscar')}
                        >
                            <Search size={20} />
                        </button>
                        <MobileSearchModal
                            isOpen={isMobileSearchOpen}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onClose={() => setIsMobileSearchOpen(false)}
                            placeholder={t('superadmin.searchFeatures')}
                        />
                        <HeaderBackButton onClick={handleBackToDashboard} />
                    </div>
                </header>

                <main className="relative z-10 flex-1 overflow-y-auto quimera-ds-scrollbar">
                    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
                        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-end">
                            <div className="min-w-0 py-1">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-q-border bg-q-surface px-3 py-1.5 text-xs font-semibold uppercase text-q-text-secondary">
                                    <Shield className="h-3.5 w-3.5 text-q-accent" />
                                    {t('superadmin.adminConsole')}
                                </div>
                                <h2 className="text-2xl font-bold text-q-text sm:text-3xl">
                                    {t('superadmin.commandCenter')}
                                </h2>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-q-text-secondary sm:text-base">
                                    {t('superadmin.commandCenterDesc')}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div className="rounded-lg border border-q-border bg-q-surface p-3">
                                    <p className="truncate text-xs font-medium text-q-text-secondary">{t('superadmin.availableModules')}</p>
                                    <p className="mt-1 text-2xl font-bold text-q-text">{adminFeatures.length}</p>
                                </div>
                                <div className="rounded-lg border border-q-border bg-q-surface p-3">
                                    <p className="truncate text-xs font-medium text-q-text-secondary">{t('superadmin.newTools')}</p>
                                    <p className="mt-1 text-2xl font-bold text-q-text">{newFeatureCount}</p>
                                </div>
                                <div className="rounded-lg border border-q-border bg-q-surface p-3">
                                    <p className="truncate text-xs font-medium text-q-text-secondary">{t('superadmin.activeView')}</p>
                                    <p className="mt-1 truncate text-sm font-bold text-q-text">{activeCategoryLabel}</p>
                                </div>
                            </div>
                        </section>

                        {priorityFeatures.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-q-accent">
                                            {t('superadmin.priorityAccess')}
                                        </p>
                                        <h2 className="mt-1 text-lg font-semibold text-q-text">
                                            {t('superadmin.quickAccess')}
                                        </h2>
                                    </div>
                                    <p className="max-w-2xl text-sm text-q-text-secondary">
                                        {t('superadmin.quickAccessDesc')}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                                    {priorityFeatures.map(feature => (
                                        <AdminCard
                                            key={feature.id}
                                            feature={feature}
                                            onClick={() => handleCardClick(feature)}
                                            viewMode="compact"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="rounded-lg border border-q-border bg-q-surface p-3 shadow-[0_1px_2px_rgba(34,29,24,0.04)] sm:p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-text-secondary" />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder={t('superadmin.searchFeatures')}
                                        className="h-11 w-full rounded-lg border border-q-border bg-q-bg pl-9 pr-3 text-sm text-q-text outline-none transition-colors placeholder:text-q-text-muted focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex rounded-lg border border-q-border bg-q-bg p-1">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            aria-pressed={viewMode === 'grid'}
                                            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-q-surface text-q-accent shadow-sm' : 'text-q-text-secondary hover:text-q-text'}`}
                                            title={t('superadmin.viewGrid', 'Vista Cuadrícula')}
                                        >
                                            <Grid3x3 size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            aria-pressed={viewMode === 'list'}
                                            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-q-surface text-q-accent shadow-sm' : 'text-q-text-secondary hover:text-q-text'}`}
                                            title={t('superadmin.viewList', 'Vista Lista')}
                                        >
                                            <List size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('compact')}
                                            aria-pressed={viewMode === 'compact'}
                                            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${viewMode === 'compact' ? 'bg-q-surface text-q-accent shadow-sm' : 'text-q-text-secondary hover:text-q-text'}`}
                                            title={t('superadmin.viewCompact', 'Vista Compacta')}
                                        >
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0"
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

                            <div className="mt-3 flex flex-col gap-2 border-t border-q-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-q-text-secondary">
                                    {t('superadmin.showingResults', { count: filteredFeatures.length, total: adminFeatures.length })}
                                </p>
                                {(searchQuery || selectedCategory !== 'all') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                        }}
                                        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-q-accent transition-colors hover:text-q-accent/80"
                                    >
                                        <X className="h-4 w-4" />
                                        {t('superadmin.clearFilters')}
                                    </button>
                                )}
                            </div>
                        </section>

                        {filteredFeatures.length > 0 ? (
                            <div className="space-y-6">
                                {!isFiltered && viewMode !== 'list' ? (
                                    categorySections.map(section => (
                                        <section key={section.id} className="space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h2 className="text-base font-semibold text-q-text">{section.label}</h2>
                                                    <p className="text-sm text-q-text-secondary">
                                                        {t('superadmin.moduleCount', { count: section.features.length })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
                                                {section.features.map(feature => (
                                                    <AdminCard
                                                        key={feature.id}
                                                        feature={feature}
                                                        onClick={() => handleCardClick(feature)}
                                                        viewMode={viewMode}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ))
                                ) : (
                                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
                                        {filteredFeatures.map(feature => (
                                            <AdminCard
                                                key={feature.id}
                                                feature={feature}
                                                onClick={() => handleCardClick(feature)}
                                                viewMode={viewMode}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-q-border bg-q-surface px-4 py-12 text-center">
                                <Search className="mx-auto mb-4 h-6 w-6 text-q-text-secondary" />
                                <h3 className="text-lg font-semibold text-q-text">
                                    {t('superadmin.noResultsFound')}
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm text-q-text-secondary">
                                    {t('superadmin.noResultsDesc')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-q-accent px-4 py-2 text-sm font-semibold text-q-text-on-accent transition-opacity hover:opacity-90"
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
