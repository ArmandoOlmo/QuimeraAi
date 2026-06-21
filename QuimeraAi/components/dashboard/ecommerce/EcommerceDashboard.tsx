/**
 * EcommerceDashboard
 * Dashboard principal del módulo de ecommerce
 * Cada proyecto tiene su propia tienda de ecommerce
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ShoppingBag,
    Package,
    ShoppingCart,
    Users,
    Tag,
    BarChart3,
    Settings,
    FolderTree,
    Menu,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    RefreshCw,
    AlertCircle,
    Activity,
    ArrowRight,
    Star,
    Bell,
    FileDown,
    Store,
    ChevronDown,
    Plus,
    Check,
    CheckCircle2,
    Sparkles,
    LayoutTemplate,
    CreditCard,
    Truck,
    ShieldCheck,
    Percent,
    Inbox,
    Clock,
    PackageCheck,
    Eye,
    X,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import QuimeraLoader from '../../ui/QuimeraLoader';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { supabase } from '../../../supabase';
import type { Category, Customer, EcommerceView, Order, Product, Review, StoreSettings } from '../../../types/ecommerce';
import type { Project } from '../../../types/project';
import type { BusinessBlueprint, EcommerceStarterContentStatus } from '../../../types/businessBlueprint';
import { EcommerceContext, useEcommerceContext } from './EcommerceContext';
import {
    buildStarterContentBusinessBlueprintUpdate,
    createStarterContentFromBlueprint,
    type StarterContentResult,
} from '../../../utils/ecommerce/createStarterContentFromBlueprint';

// Import views
import ProductsView from './views/ProductsView';
import CategoriesView from './views/CategoriesView';
import OrdersView from './views/OrdersView';
import CustomersView from './views/CustomersView';
import StoreUsersView from './views/StoreUsersView';
import DiscountsView from './views/DiscountsView';
import ReviewsView from './views/ReviewsView';
import StockAlertsView from './views/StockAlertsView';
import ReportsView from './views/ReportsView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';
import StorefrontEditorView from './views/StorefrontEditorView';

// Import Project Selector Page
import ProjectSelectorPage from './ProjectSelectorPage';

// Import hooks for overview stats
import { useEcommerceStore } from './hooks/useEcommerceStore';
import { useEcommerceAnalytics } from './hooks/useEcommerceAnalytics';
import { useProjectEcommerce } from './hooks/useProjectEcommerce';
import { useCategories } from './hooks/useCategories';
import { useReviews } from './hooks/useReviews';
import { useStoreSettings } from './hooks/useStoreSettings';
import ProjectThumbnailFallback from '../ProjectThumbnailFallback';
import { getDynamicThumbnailUrl } from '../../../utils/thumbnailHelper';
import { timestampToDate } from '../../../utils/timestampUtils';

// Import DemoDataSeeder
import DemoDataSeeder from './components/DemoDataSeeder';

interface NavItem {
    id: EcommerceView;
    icon: React.ElementType;
    label: string;
    badge?: number | string;
    badgeColor?: string;
}

export { EcommerceContext, useEcommerceContext } from './EcommerceContext';

const VALID_ECOMMERCE_VIEWS: EcommerceView[] = [
    'overview',
    'storefront',
    'products',
    'categories',
    'orders',
    'customers',
    'store-users',
    'discounts',
    'reviews',
    'stock_alerts',
    'reports',
    'analytics',
    'settings',
];

const getInitialEcommerceView = (): EcommerceView => {
    const savedView = localStorage.getItem('ecommerceActiveView') as EcommerceView | null;

    if (!savedView || !VALID_ECOMMERCE_VIEWS.includes(savedView)) return 'overview';

    // The storefront editor owns a live iframe preview and should not auto-mount
    // from persisted localStorage while we are stabilizing the ecommerce suite.
    if (savedView === 'storefront') {
        localStorage.setItem('ecommerceActiveView', 'overview');
        return 'overview';
    }

    return savedView;
};

const EcommerceDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { projects, activeProject, activeProjectId, refreshProjects } = useProject();
    const [activeView, setActiveView] = useState<EcommerceView>(getInitialEcommerceView);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showAllProjects, setShowAllProjects] = useState(false);

    // UserId seguro
    const userId = user?.id;

    // Determinar qué proyecto usar para ecommerce
    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

    // El storeId es el projectId (relación 1:1) - solo si hay proyecto válido
    const storeId = effectiveProjectId || '';

    // Hook para gestionar ecommerce del proyecto
    const {
        config: ecommerceConfig,
        isLoading: ecommerceLoading,
        isInitialized: ecommerceInitialized,
        error: ecommerceError,
        enableEcommerce,
        getStoreId,
    } = useProjectEcommerce(userId || '', effectiveProjectId, effectiveProject?.name);

    // Inicializar store (usando projectId como storeId)
    const {
        store,
        isLoading: storeLoading,
        isInitialized: storeInitialized,
        error: storeError,
        initializeStore
    } = useEcommerceStore(userId || '', storeId);

    // Escuchar cambios de vista
    useEffect(() => {
        const handleViewChange = (event: CustomEvent<string>) => {
            const newView = event.detail as EcommerceView;
            if (newView) {
                setActiveView(newView);
            }
        };

        window.addEventListener('ecommerceViewChange', handleViewChange as EventListener);

        const savedView = localStorage.getItem('ecommerceActiveView') as EcommerceView;
        if (savedView && savedView !== 'storefront' && VALID_ECOMMERCE_VIEWS.includes(savedView) && savedView !== activeView) {
            setActiveView(savedView);
        }

        return () => {
            window.removeEventListener('ecommerceViewChange', handleViewChange as EventListener);
        };
    }, []);

    // Sincronizar proyecto seleccionado con proyecto activo (always sync when activeProjectId changes)
    useEffect(() => {
        if (activeProjectId) {
            setSelectedProjectId(activeProjectId);
        }
    }, [activeProjectId]);

    const [showDemoSeeder, setShowDemoSeeder] = useState(false);

    const handleViewChange = (view: EcommerceView) => {
        setActiveView(view);
        localStorage.setItem('ecommerceActiveView', view);
    };

    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
    };

    const handleEnableEcommerce = async () => {
        if (effectiveProjectId) {
            try {
                const enabled = await enableEcommerce();
                if (enabled) await initializeStore();
            } catch {
                // useProjectEcommerce already exposes the activation error in the enable panel.
            }
        }
    };

    const navItems: NavItem[] = [
        { id: 'overview', icon: BarChart3, label: t('ecommerce.overview', 'Vista General') },
        { id: 'storefront', icon: LayoutTemplate, label: t('ecommerce.storefrontLabel', 'Storefront') },
        { id: 'products', icon: Package, label: t('ecommerce.products', 'Productos') },
        { id: 'categories', icon: FolderTree, label: t('ecommerce.categories', 'Categorías') },
        { id: 'orders', icon: ShoppingCart, label: t('ecommerce.orders', 'Pedidos') },
        { id: 'customers', icon: Users, label: t('ecommerce.customers', 'Clientes') },
        { id: 'discounts', icon: Tag, label: t('ecommerce.discounts', 'Descuentos') },
        { id: 'reviews', icon: Star, label: t('ecommerce.reviews', 'Reseñas') },
        { id: 'stock_alerts', icon: Bell, label: t('ecommerce.stockAlerts', 'Alertas Stock') },
        { id: 'reports', icon: FileDown, label: t('ecommerce.reports', 'Reportes') },
        { id: 'analytics', icon: TrendingUp, label: t('ecommerce.analytics', 'Analytics') },
        { id: 'settings', icon: Settings, label: t('ecommerce.settings', 'Configuración') },
    ];

    const renderActiveView = () => {
        switch (activeView) {
            case 'overview':
                return (
                    <OverviewDataView
                        userId={userId || ''}
                        storeId={storeId}
                        project={effectiveProject}
                        onNavigate={handleViewChange}
                        onBusinessBlueprintRefresh={refreshProjects}
                        showDemoSeeder={showDemoSeeder}
                        onDemoSeederClose={() => setShowDemoSeeder(false)}
                    />
                );
            case 'storefront':
                return <StorefrontEditorView />;
            case 'products':
                return <ProductsView />;
            case 'categories':
                return <CategoriesView />;
            case 'orders':
                return <OrdersView />;
            case 'customers':
                return <CustomersView />;
            case 'store-users':
                return <StoreUsersView />;
            case 'discounts':
                return <DiscountsView />;
            case 'reviews':
                return <ReviewsView />;
            case 'stock_alerts':
                return <StockAlertsView />;
            case 'reports':
                return <ReportsView />;
            case 'analytics':
                return <AnalyticsView />;
            case 'settings':
                return <SettingsView />;
            default:
                return null;
        }
    };

    // Loading state
    if (!userId) {
        return <QuimeraLoader fullScreen size="md" />;
    }

    // No project selected or user wants to see all projects - show full project selector page
    if (!effectiveProjectId || projects.length === 0 || showAllProjects) {
        return (
            <ProjectSelectorPage
                onProjectSelect={(projectId) => {
                    handleProjectSelect(projectId);
                    setShowAllProjects(false);
                }}
                onBack={() => {
                    if (showAllProjects && effectiveProjectId) {
                        // If we were showing all projects but have a selected project, go back to it
                        setShowAllProjects(false);
                    } else {
                        setView('dashboard');
                    }
                }}
            />
        );
    }

    // Ecommerce not enabled for this project
    if (!ecommerceInitialized && !ecommerceLoading) {
        return (
            <div className="min-h-screen bg-q-bg flex overflow-x-hidden">
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-lg">
                        <ShoppingBag className="w-10 h-10 quimera-dashboard-header-icon mx-auto mb-6" strokeWidth={1.5} />
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {t('ecommerce.enableForProject', 'Habilitar Ecommerce')}
                        </h2>
                        <p className="text-lg text-q-text-muted mb-2">
                            {effectiveProject?.name || 'Proyecto'}
                        </p>
                        <p className="text-q-text-muted mb-8">
                            {t('ecommerce.enableDescription', 'Activa la tienda de ecommerce para este proyecto. Podrás agregar productos, gestionar pedidos y más.')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleEnableEcommerce}
                                disabled={ecommerceLoading}
                                className="quimera-guide-cta inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {ecommerceLoading ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        {t('common.loading', 'Cargando...')}
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        {t('ecommerce.enableStore', 'Activar Tienda')}
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setIsProjectSelectorOpen(false);
                                    setShowAllProjects(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors font-medium"
                            >
                                {t('ecommerce.changeProject', 'Cambiar Proyecto')}
                            </button>
                        </div>

                        {ecommerceError && (
                            <p className="mt-4 text-destructive text-sm">{ecommerceError}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Loading store
    if (storeLoading || ecommerceLoading) {
        return <QuimeraLoader fullScreen size="md" text={t('ecommerce.initializingStore', 'Inicializando tienda...')} />;
    }

    // Error state
    if (storeError) {
        return (
            <div className="min-h-screen bg-q-bg flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
                        <AlertCircle className="text-destructive" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        {t('ecommerce.storeError', 'Error al cargar la tienda')}
                    </h2>
                    <p className="text-q-text-muted mb-4">{storeError}</p>
                    <button
                        onClick={() => initializeStore()}
                        className="quimera-guide-cta inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                    >
                        <RefreshCw size={18} />
                        {t('common.retry', 'Reintentar')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <EcommerceContext.Provider value={{
            storeId,
            projectId: effectiveProjectId,
            projectName: effectiveProject?.name || ''
        }}>
            <div className="flex h-screen min-h-0 overflow-hidden bg-q-bg">
                {/* Sidebar */}
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />

                {/* Main Content */}
                <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Header */}
 <header className="quimera-dashboard-header-bar h-auto min-h-14 px-3 sm:px-6 py-2 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sticky top-0 z-40">
                        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden h-9 w-9 flex-shrink-0 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                                <ShoppingBag className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                <h1 className="max-w-[8rem] truncate text-sm sm:max-w-none sm:text-lg font-semibold text-foreground">
                                    {t('ecommerce.dashboardTitle', 'Panel de Ventas')}
                                </h1>
                            </div>
                            {/* Project Selector */}
                            <div className="relative min-w-0">
                                <button
                                    onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                    className="flex min-w-0 items-center gap-1 sm:gap-2 text-sm text-q-text-muted hover:text-foreground transition-colors"
                                >
                                    <Store size={14} className="flex-shrink-0" />
                                    <span className="max-w-[7rem] truncate sm:max-w-[200px]">
                                        {effectiveProject?.name || 'Seleccionar proyecto'}
                                    </span>
                                    <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                {isProjectSelectorOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsProjectSelectorOpen(false)}
                                        />
                                        <div className="fixed left-3 right-3 top-14 mt-2 max-h-[70vh] overflow-auto rounded-xl border border-q-border bg-q-surface py-2 shadow-xl z-50 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:w-80 sm:max-h-96">
                                            <div className="px-4 py-2 border-b border-q-border/50 mb-2">
                                                <p className="text-xs font-medium text-q-text-muted uppercase tracking-wide">
                                                    {t('ecommerce.quickSwitch', 'Cambio rápido')}
                                                </p>
                                            </div>

                                            {projects.filter(p => p.status !== 'Template').slice(0, 5).map((project) => {
                                                const thumbnailUrl = getDynamicThumbnailUrl(project);

                                                return (
                                                    <button
                                                        key={project.id}
                                                        onClick={() => handleProjectSelect(project.id)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_12%,transparent)]' : ''
                                                            }`}
                                                    >
                                                    {thumbnailUrl ? (
                                                        <img
                                                            src={thumbnailUrl}
                                                            alt={project.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                                                            <ProjectThumbnailFallback logoClassName="h-5 w-5" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-left min-w-0">
                                                        <span className="text-sm font-medium text-foreground truncate block">
                                                            {project.name}
                                                        </span>
                                                        <span className={`text-xs ${project.status === 'Published' ? 'quimera-status-card-accent-text' : 'text-q-text-muted'}`}>
                                                            {project.status === 'Published' ? t('common.published', 'Publicado') : t('common.draft', 'Borrador')}
                                                        </span>
                                                    </div>
                                                    {project.id === effectiveProjectId && (
                                                        <Check size={16} className="quimera-status-card-accent-text flex-shrink-0" />
                                                    )}
                                                </button>
                                                );
                                            })}

                                            <div className="border-t border-q-border/50 mt-2 pt-2 px-2">
                                                <button
                                                    onClick={() => {
                                                        setShowAllProjects(true);
                                                        setIsProjectSelectorOpen(false);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium quimera-status-card-link hover:bg-q-surface-overlay/40 rounded-lg transition-colors"
                                                >
                                                    <Store size={16} />
                                                    {t('ecommerce.viewAllProjects', 'Ver todos los proyectos')}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
                            <HeaderBackButton onClick={() => setView('dashboard')} />
                        </div>
                    </header>

                    {/* Sub-navigation */}
                    <div className="overflow-hidden border-b border-q-border bg-q-surface/30 px-3 sm:px-6">
                        <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide sm:mx-0 sm:px-0">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleViewChange(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                                            ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                            : 'text-q-text-muted hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span>{item.label}</span>
                                        {item.badge && (
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${item.badgeColor || 'bg-primary'
                                                    }`}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content */}
                    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
                        {renderActiveView()}
                    </main>
                </div>
            </div>
        </EcommerceContext.Provider>
    );
};

// Overview Component
interface OverviewDataViewProps {
    userId: string;
    storeId: string;
    project?: Project | null;
    onNavigate: (view: EcommerceView) => void;
    onBusinessBlueprintRefresh: () => Promise<void>;
    showDemoSeeder: boolean;
    onDemoSeederClose: () => void;
}

const OverviewDataView: React.FC<OverviewDataViewProps> = ({
    userId,
    storeId,
    project,
    onNavigate,
    onBusinessBlueprintRefresh,
    showDemoSeeder,
    onDemoSeederClose,
}) => {
    const {
        orders,
        products,
        customers,
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        lowStockProducts,
        revenueByDay,
        topProducts,
        conversionMetrics,
        isLoading: analyticsLoading,
    } = useEcommerceAnalytics(userId, storeId);

    const { categories, isLoading: categoriesLoading } = useCategories(userId, storeId);
    const {
        reviews,
        totalReviews,
        pendingCount: pendingReviews,
        approvedCount: approvedReviews,
        isLoading: reviewsLoading,
    } = useReviews(userId, storeId);
    const { settings, isLoading: settingsLoading } = useStoreSettings(userId, storeId);
    const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'paid').length;
    const starterContentPrompt = project?.businessBlueprint ? (
        <AiStarterContentPrompt
            userId={userId}
            storeId={storeId}
            project={project}
            businessBlueprint={project.businessBlueprint}
            onBusinessBlueprintRefresh={onBusinessBlueprintRefresh}
            onNavigate={onNavigate}
        />
    ) : null;

    return (
        <OverviewView
            orders={orders}
            products={products}
            customers={customers}
            categories={categories}
            reviews={reviews}
            settings={settings}
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
            totalCustomers={totalCustomers}
            averageOrderValue={averageOrderValue}
            pendingOrders={pendingOrders}
            lowStockCount={lowStockProducts.length}
            lowStockProducts={lowStockProducts}
            revenueByDay={revenueByDay}
            topProducts={topProducts}
            conversionRate={conversionMetrics.conversionRate}
            cancelledOrders={conversionMetrics.cancelledOrders}
            totalReviews={totalReviews}
            pendingReviews={pendingReviews}
            approvedReviews={approvedReviews}
            isLoading={analyticsLoading || categoriesLoading || reviewsLoading || settingsLoading}
            onNavigate={onNavigate}
            totalProducts={products.length}
            starterContentPrompt={starterContentPrompt}
            showDemoSeeder={showDemoSeeder}
            onDemoSeederClose={onDemoSeederClose}
        />
    );
};

interface AiStarterContentPromptProps {
    userId: string;
    storeId: string;
    project: Project;
    businessBlueprint: BusinessBlueprint;
    onBusinessBlueprintRefresh: () => Promise<void>;
    onNavigate: (view: EcommerceView) => void;
}

const uniqueStarterNames = (values: Array<string | undefined | null>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const trimmed = value?.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(trimmed);
    }

    return result;
};

const formatStarterError = (result: StarterContentResult): string | null =>
    result.errors.length > 0 ? result.errors.join(' ') : null;

const AiStarterContentPrompt: React.FC<AiStarterContentPromptProps> = ({
    userId,
    storeId,
    project,
    businessBlueprint,
    onBusinessBlueprintRefresh,
    onNavigate,
}) => {
    const { t } = useTranslation();
    const [result, setResult] = useState<StarterContentResult | null>(null);
    const [localStatus, setLocalStatus] = useState<EcommerceStarterContentStatus | null>(null);
    const [action, setAction] = useState<'preview' | 'create' | 'dismiss' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ecommerceBlueprint = businessBlueprint.ecommerceBlueprint;
    const storefrontBlueprint = businessBlueprint.storefrontBlueprint;
    const starterStatus = localStatus || ecommerceBlueprint.starterContentStatus || 'not_started';
    const isVisible = ecommerceBlueprint.enabled &&
        starterStatus !== 'created_draft' &&
        starterStatus !== 'dismissed' &&
        ((ecommerceBlueprint.productCategories || ecommerceBlueprint.categories || []).length > 0 ||
            ecommerceBlueprint.starterProducts.length > 0);

    if (!isVisible) return null;

    const categoryNames = uniqueStarterNames([
        ...(ecommerceBlueprint.productCategories || ecommerceBlueprint.categories || []),
        ...ecommerceBlueprint.starterProducts.map(product => product.category),
    ]);
    const starterProducts = ecommerceBlueprint.starterProducts;
    const suggestedProductCount = starterProducts.length;
    const suggestedGiftCards = ecommerceBlueprint.giftCardsEnabled || ecommerceBlueprint.giftCards?.enabled;
    const preset = storefrontBlueprint.themePreset || storefrontBlueprint.templatePreset || t('common.draft', 'Borrador');
    const isBusy = Boolean(action);

    const persistStatus = async (status: EcommerceStarterContentStatus, nextResult?: StarterContentResult) => {
        const now = new Date().toISOString();
        const nextBlueprint = buildStarterContentBusinessBlueprintUpdate({
            businessBlueprint,
            result: nextResult,
            status,
            now,
        });
        const nextData = {
            ...(project.data || {}),
            businessBlueprint: nextBlueprint,
            lastUpdated: now,
        };

        const { error: updateError } = await supabase
            .from('projects')
            .update({
                data: nextData,
                last_updated: now,
            })
            .eq('id', project.id);

        if (updateError) throw updateError;

        setLocalStatus(status);
        await onBusinessBlueprintRefresh();
    };

    const runPreview = async () => {
        setAction('preview');
        setError(null);
        try {
            const previewResult = await createStarterContentFromBlueprint({
                projectId: project.id,
                storeId,
                userId,
                businessBlueprint,
                ecommerceBlueprint,
                storefrontBlueprint,
                options: { dryRun: true, overwriteExisting: false },
            });
            setResult(previewResult);

            const previewError = formatStarterError(previewResult);
            if (previewError) {
                setError(previewError);
                return;
            }

            setLocalStatus('previewed');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
        } finally {
            setAction(null);
        }
    };

    const createDraftContent = async () => {
        setAction('create');
        setError(null);
        try {
            const createResult = await createStarterContentFromBlueprint({
                projectId: project.id,
                storeId,
                userId,
                businessBlueprint,
                ecommerceBlueprint,
                storefrontBlueprint,
                options: { dryRun: false, overwriteExisting: false },
            });
            setResult(createResult);

            const createError = formatStarterError(createResult);
            if (createError) {
                setError(createError);
                return;
            }

            await persistStatus('created_draft', createResult);
            onNavigate('products');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
        } finally {
            setAction(null);
        }
    };

    const dismissPrompt = async () => {
        setAction('dismiss');
        setError(null);
        try {
            await persistStatus('dismissed', result || undefined);
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
        } finally {
            setAction(null);
        }
    };

    return (
        <section className="quimera-dashboard-panel-card border-q-accent/30 bg-q-accent/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-q-accent/15 text-q-accent">
                            <Sparkles size={20} />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground">
                                {t('ecommerce.aiStarterContent.title', 'Contenido ecommerce sugerido por AI')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('ecommerce.aiStarterContent.subtitle', '{{categories}} categorías sugeridas · {{products}} productos draft · preset {{preset}}', {
                                    categories: categoryNames.length,
                                    products: suggestedProductCount,
                                    preset,
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-md border border-q-border/60 bg-q-bg/50 px-2.5 py-1 text-q-text-muted">
                            {t('ecommerce.aiStarterContent.needsReview', 'Necesita revisión')}
                        </span>
                        <span className="rounded-md border border-q-border/60 bg-q-bg/50 px-2.5 py-1 text-q-text-muted">
                            {t('ecommerce.aiStarterContent.draftOnly', 'Draft only')}
                        </span>
                        {suggestedGiftCards && (
                            <span className="rounded-md border border-q-border/60 bg-q-bg/50 px-2.5 py-1 text-q-text-muted">
                                {t('ecommerce.aiStarterContent.giftCards', 'Gift cards draft')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-shrink-0">
                    <button
                        type="button"
                        onClick={runPreview}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                        {action === 'preview' ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                        {t('ecommerce.aiStarterContent.preview', 'Ver preview')}
                    </button>
                    <button
                        type="button"
                        onClick={createDraftContent}
                        disabled={isBusy}
                        className="quimera-guide-cta inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                        {action === 'create' ? <RefreshCw size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                        {t('ecommerce.aiStarterContent.createDraft', 'Crear contenido draft')}
                    </button>
                    <button
                        type="button"
                        onClick={dismissPrompt}
                        disabled={isBusy}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-q-border bg-q-surface text-q-text-muted transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                        aria-label={t('ecommerce.aiStarterContent.dismiss', 'Omitir')}
                    >
                        {action === 'dismiss' ? <RefreshCw size={16} className="animate-spin" /> : <X size={16} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm text-q-error">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {result && (
                <div className="mt-4 rounded-lg border border-q-border/70 bg-q-bg/50 p-3">
                    <div className="grid gap-3 text-sm text-q-text-muted sm:grid-cols-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('ecommerce.categories', 'Categorías')}</p>
                            <p className="mt-1 font-semibold text-foreground">
                                {result.summary.categoriesCreated > 0 ? result.summary.categoriesCreated : result.summary.categoriesPlanned}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('ecommerce.products', 'Productos')}</p>
                            <p className="mt-1 font-semibold text-foreground">
                                {result.summary.productsCreated > 0 ? result.summary.productsCreated : result.summary.productsPlanned}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{t('ecommerce.aiStarterContent.skipped', 'Omitidos')}</p>
                            <p className="mt-1 font-semibold text-foreground">{result.summary.skipped}</p>
                        </div>
                    </div>
                    {result.dryRunPreview.warnings.length > 0 && (
                        <p className="mt-3 text-xs leading-5 text-q-text-muted">
                            {result.dryRunPreview.warnings[0]}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};

interface OverviewProps {
    orders: Order[];
    products: Product[];
    customers: Customer[];
    categories: Category[];
    reviews: Review[];
    settings: StoreSettings | null;
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    pendingOrders: number;
    lowStockCount: number;
    lowStockProducts: Product[];
    revenueByDay: Array<{ day: string; revenue: number; orders: number }>;
    topProducts: Array<{ productId: string; productName: string; totalSold: number; revenue: number }>;
    conversionRate: number;
    cancelledOrders: number;
    totalReviews: number;
    pendingReviews: number;
    approvedReviews: number;
    isLoading: boolean;
    onNavigate: (view: EcommerceView) => void;
    totalProducts: number;
    starterContentPrompt?: React.ReactNode;
    showDemoSeeder: boolean;
    onDemoSeederClose: () => void;
}

type OverviewTone = 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'neutral';

interface OverviewActionItem {
    label: string;
    description: string;
    view: EcommerceView;
    icon: React.ElementType;
    tone: OverviewTone;
    value?: string;
}

interface OverviewReadinessItem {
    label: string;
    description: string;
    complete: boolean;
    view: EcommerceView;
    icon: React.ElementType;
}

const toneClassMap: Record<OverviewTone, { border: string; bg: string; text: string; icon: string; bar: string }> = {
    emerald: {
        border: 'border-q-success/30',
        bg: 'bg-q-success/10',
        text: 'text-q-success',
        icon: 'text-q-success bg-q-success/15',
        bar: 'bg-q-success',
    },
    amber: {
        border: 'border-q-accent/30',
        bg: 'bg-q-accent/10',
        text: 'text-q-accent',
        icon: 'text-q-accent bg-q-accent/15',
        bar: 'bg-q-accent',
    },
    red: {
        border: 'border-q-error/30',
        bg: 'bg-q-error/10',
        text: 'text-q-error',
        icon: 'text-q-error bg-q-error/15',
        bar: 'bg-q-error',
    },
    blue: {
        border: 'border-q-accent/30',
        bg: 'bg-q-accent/10',
        text: 'text-q-accent',
        icon: 'text-q-accent bg-q-accent/15',
        bar: 'bg-q-accent',
    },
    purple: {
        border: 'border-q-accent/30',
        bg: 'bg-q-accent/10',
        text: 'text-q-accent',
        icon: 'text-q-accent bg-q-accent/15',
        bar: 'bg-q-accent',
    },
    neutral: {
        border: 'border-q-border/70',
        bg: 'bg-q-surface/70',
        text: 'text-q-text',
        icon: 'text-q-text bg-muted/60',
        bar: 'bg-q-accent',
    },
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const OverviewView: React.FC<OverviewProps> = ({
    orders,
    products,
    customers,
    categories,
    reviews,
    settings,
    totalRevenue,
    totalOrders,
    totalCustomers,
    averageOrderValue,
    pendingOrders,
    lowStockCount,
    lowStockProducts,
    revenueByDay,
    topProducts,
    conversionRate,
    cancelledOrders,
    totalReviews,
    pendingReviews,
    approvedReviews,
    isLoading,
    onNavigate,
    totalProducts,
    starterContentPrompt,
    showDemoSeeder,
    onDemoSeederClose,
}) => {
    const { t, i18n } = useTranslation();
    const { projectName } = useEcommerceContext();
    const [showSeeder, setShowSeeder] = useState(showDemoSeeder);
    const locale = i18n.language || 'es';

    useEffect(() => {
        setShowSeeder(showDemoSeeder);
    }, [showDemoSeeder]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: settings?.currency || products[0]?.currency || orders[0]?.currency || 'USD',
        }).format(amount);
    };

    const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
    const formatDate = (order: Order) => new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    }).format(timestampToDate(order.createdAt));

    const activeProducts = products.filter((product) => product.status === 'active').length;
    const draftProducts = products.filter((product) => product.status === 'draft').length;
    const productsWithoutImages = products.filter((product) => !product.images || product.images.length === 0).length;
    const uncategorizedProducts = products.filter((product) => !product.categoryId).length;
    const outOfStockProducts = products.filter((product) => product.trackInventory && product.quantity <= 0).length;
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
    const failedPayments = orders.filter((order) => order.paymentStatus === 'failed').length;
    const fulfillmentQueue = paidOrders.filter((order) => order.fulfillmentStatus !== 'fulfilled').length;
    const processingOrders = orders.filter((order) => order.status === 'processing').length;
    const refundedOrders = orders.filter((order) => order.status === 'refunded' || order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded').length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;
    const marketingCustomers = customers.filter((customer) => customer.acceptsMarketing).length;
    const marketingRate = totalCustomers > 0 ? (marketingCustomers / totalCustomers) * 100 : 0;

    const dailySales = useMemo(() => {
        const revenueByKey = new Map(revenueByDay.map((item) => [item.day, item]));
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            const key = date.toISOString().split('T')[0];
            const item = revenueByKey.get(key);
            return {
                key,
                label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
                revenue: item?.revenue || 0,
                orders: item?.orders || 0,
            };
        });
    }, [locale, revenueByDay]);
    const maxDailyRevenue = Math.max(...dailySales.map((day) => day.revenue), 1);
    const last7Revenue = dailySales.reduce((sum, day) => sum + day.revenue, 0);
    const last7Orders = dailySales.reduce((sum, day) => sum + day.orders, 0);

    const settingsReady = Boolean(settings?.storeName && settings?.storeEmail);
    const productsReady = activeProducts > 0;
    const categoriesReady = categories.length > 0;
    const paymentReady = Boolean(settings && (settings.stripeEnabled || settings.paypalEnabled || settings.cashOnDeliveryEnabled));
    const shippingReady = Boolean(settings && (
        !settings.requireShippingAddress ||
        (settings.shippingZones || []).some((zone) => zone.rates.length > 0) ||
        (settings.freeShippingThreshold || 0) > 0
    ));
    const storefrontReady = productsReady && categoriesReady && settingsReady;

    const readinessItems: OverviewReadinessItem[] = [
        {
            label: t('ecommerce.overviewPro.readiness.storeIdentity', 'Identidad de tienda'),
            description: t('ecommerce.overviewPro.readiness.storeIdentityDesc', 'Nombre, email y datos básicos configurados.'),
            complete: settingsReady,
            view: 'settings',
            icon: Store,
        },
        {
            label: t('ecommerce.overviewPro.readiness.products', 'Catálogo vendible'),
            description: t('ecommerce.overviewPro.readiness.productsDesc', 'Al menos un producto activo listo para la tienda.'),
            complete: productsReady,
            view: 'products',
            icon: Package,
        },
        {
            label: t('ecommerce.overviewPro.readiness.categories', 'Categorías'),
            description: t('ecommerce.overviewPro.readiness.categoriesDesc', 'Estructura clara para navegar el catálogo.'),
            complete: categoriesReady,
            view: 'categories',
            icon: FolderTree,
        },
        {
            label: t('ecommerce.overviewPro.readiness.payments', 'Pagos'),
            description: t('ecommerce.overviewPro.readiness.paymentsDesc', 'Método de cobro disponible para checkout.'),
            complete: paymentReady,
            view: 'settings',
            icon: CreditCard,
        },
        {
            label: t('ecommerce.overviewPro.readiness.shipping', 'Envíos'),
            description: t('ecommerce.overviewPro.readiness.shippingDesc', 'Reglas de entrega o checkout sin envío.'),
            complete: shippingReady,
            view: 'settings',
            icon: Truck,
        },
        {
            label: t('ecommerce.overviewPro.readiness.storefront', 'Storefront'),
            description: t('ecommerce.overviewPro.readiness.storefrontDesc', 'Contenido base suficiente para presentar la tienda.'),
            complete: storefrontReady,
            view: 'storefront',
            icon: LayoutTemplate,
        },
    ];
    const completedReadiness = readinessItems.filter((item) => item.complete).length;
    const readinessScore = clampPercent((completedReadiness / readinessItems.length) * 100);
    const readinessTone: OverviewTone = readinessScore >= 85 ? 'emerald' : readinessScore >= 55 ? 'amber' : 'red';

    const priorityActions = useMemo<OverviewActionItem[]>(() => {
        const actions: OverviewActionItem[] = [];

        if (pendingOrders > 0) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.pendingOrders', 'Procesar pedidos pendientes'),
                description: t('ecommerce.overviewPro.actions.pendingOrdersDesc', 'Hay pedidos esperando revisión o preparación.'),
                value: formatNumber(pendingOrders),
                view: 'orders',
                icon: ShoppingCart,
                tone: 'amber',
            });
        }
        if (lowStockCount > 0 || outOfStockProducts > 0) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.inventoryRisk', 'Revisar inventario crítico'),
                description: t('ecommerce.overviewPro.actions.inventoryRiskDesc', 'Evita vender productos sin stock o con inventario bajo.'),
                value: formatNumber(lowStockCount + outOfStockProducts),
                view: 'stock_alerts',
                icon: AlertTriangle,
                tone: outOfStockProducts > 0 ? 'red' : 'amber',
            });
        }
        if (pendingReviews > 0) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.moderateReviews', 'Moderar reseñas'),
                description: t('ecommerce.overviewPro.actions.moderateReviewsDesc', 'Reseñas pendientes pueden aumentar confianza si se aprueban rápido.'),
                value: formatNumber(pendingReviews),
                view: 'reviews',
                icon: Star,
                tone: 'purple',
            });
        }
        if (!settingsReady) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.finishSettings', 'Completar configuración'),
                description: t('ecommerce.overviewPro.actions.finishSettingsDesc', 'Define identidad, contacto y ajustes básicos de la tienda.'),
                view: 'settings',
                icon: Settings,
                tone: 'blue',
            });
        }
        if (!productsReady) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.addProducts', 'Agregar productos activos'),
                description: t('ecommerce.overviewPro.actions.addProductsDesc', 'Tu tienda necesita productos activos para empezar a vender.'),
                view: 'products',
                icon: Package,
                tone: 'blue',
            });
        }
        if (productsWithoutImages > 0) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.addImages', 'Mejorar fotos de producto'),
                description: t('ecommerce.overviewPro.actions.addImagesDesc', 'Los productos sin imagen reducen confianza y conversión.'),
                value: formatNumber(productsWithoutImages),
                view: 'products',
                icon: PackageCheck,
                tone: 'neutral',
            });
        }
        if (!paymentReady) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.enablePayments', 'Activar pagos'),
                description: t('ecommerce.overviewPro.actions.enablePaymentsDesc', 'Configura Stripe, PayPal o pago manual antes de publicar checkout.'),
                view: 'settings',
                icon: CreditCard,
                tone: 'red',
            });
        }
        if (!shippingReady) {
            actions.push({
                label: t('ecommerce.overviewPro.actions.setupShipping', 'Configurar envíos'),
                description: t('ecommerce.overviewPro.actions.setupShippingDesc', 'Define zonas, tarifas o reglas para entrega.'),
                view: 'settings',
                icon: Truck,
                tone: 'amber',
            });
        }

        return actions.slice(0, 5);
    }, [
        formatNumber,
        lowStockCount,
        outOfStockProducts,
        paymentReady,
        pendingOrders,
        pendingReviews,
        productsReady,
        productsWithoutImages,
        settingsReady,
        shippingReady,
        t,
    ]);

    const nextAction = priorityActions[0] || {
        label: t('ecommerce.overviewPro.actions.reviewAnalytics', 'Revisar analíticas'),
        description: t('ecommerce.overviewPro.actions.reviewAnalyticsDesc', 'La operación base está lista. Mira tendencias para optimizar.'),
        view: 'analytics',
        icon: TrendingUp,
        tone: 'emerald' as OverviewTone,
    };

    const statusMetrics = [
        {
            label: t('ecommerce.totalRevenue', 'Ingresos Totales'),
            value: formatCurrency(totalRevenue),
            detail: t('ecommerce.overviewPro.metricDetails.paidRevenue', 'Solo pedidos pagados'),
            icon: DollarSign,
            tone: 'emerald' as OverviewTone,
        },
        {
            label: t('ecommerce.totalOrders', 'Total Pedidos'),
            value: formatNumber(totalOrders),
            detail: t('ecommerce.overviewPro.metricDetails.pending', '{{count}} pendientes', { count: pendingOrders }),
            icon: ShoppingCart,
            onClick: () => onNavigate('orders'),
            tone: pendingOrders > 0 ? 'amber' as OverviewTone : 'blue' as OverviewTone,
        },
        {
            label: t('ecommerce.totalCustomers', 'Total Clientes'),
            value: formatNumber(totalCustomers),
            detail: t('ecommerce.overviewPro.metricDetails.marketing', '{{rate}}% acepta marketing', { rate: Math.round(marketingRate) }),
            icon: Users,
            onClick: () => onNavigate('customers'),
            tone: 'purple' as OverviewTone,
        },
        {
            label: t('ecommerce.avgOrderValue', 'Ticket Promedio'),
            value: formatCurrency(averageOrderValue),
            detail: t('ecommerce.overviewPro.metricDetails.conversion', '{{rate}}% conversión pago', { rate: Math.round(conversionRate) }),
            icon: TrendingUp,
            tone: 'blue' as OverviewTone,
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <QuimeraLoader size="md" />
            </div>
        );
    }

    const orderStatusLabels: Record<Order['status'], string> = {
        pending: t('ecommerce.overviewPro.status.pending', 'Pendiente'),
        paid: t('ecommerce.overviewPro.status.paid', 'Pagado'),
        processing: t('ecommerce.overviewPro.status.processing', 'Procesando'),
        shipped: t('ecommerce.overviewPro.status.shipped', 'Enviado'),
        delivered: t('ecommerce.overviewPro.status.delivered', 'Entregado'),
        cancelled: t('ecommerce.overviewPro.status.cancelled', 'Cancelado'),
        refunded: t('ecommerce.overviewPro.status.refunded', 'Reembolsado'),
    };
    const paymentStatusLabels: Record<Order['paymentStatus'], string> = {
        pending: t('ecommerce.overviewPro.payment.pending', 'Pago pendiente'),
        paid: t('ecommerce.overviewPro.payment.paid', 'Pagado'),
        failed: t('ecommerce.overviewPro.payment.failed', 'Fallido'),
        refunded: t('ecommerce.overviewPro.payment.refunded', 'Reembolsado'),
        partially_refunded: t('ecommerce.overviewPro.payment.partiallyRefunded', 'Parcial'),
    };
    const recentOrders = orders.slice(0, 5);
    const productsToPromote = topProducts.length > 0
        ? topProducts.slice(0, 5)
        : products
            .filter((product) => product.status === 'active')
            .slice(0, 5)
            .map((product) => ({
                productId: product.id,
                productName: product.name,
                totalSold: 0,
                revenue: product.price,
            }));
    const bestLowStockProducts = lowStockProducts.slice(0, 3);
    const readinessRingStyle = {
        background: `conic-gradient(var(--q-accent, #fbbf24) ${readinessScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
    };
    const NextActionIcon = nextAction.icon;
    const nextActionTone = toneClassMap[nextAction.tone];

    return (
        <div className="space-y-5">
            {starterContentPrompt}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] gap-4">
                <section className="quimera-dashboard-panel-card p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                    <Store size={22} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-q-text-muted">
                                        {t('ecommerce.overviewPro.commandCenter', 'Centro de mando')}
                                    </p>
                                    <h2 className="truncate text-2xl font-extrabold text-foreground">
                                        {projectName || settings?.storeName || t('ecommerce.dashboardTitle', 'Ventas Dashboard')}
                                    </h2>
                                </div>
                            </div>
                            <p className="max-w-3xl text-sm leading-6 text-q-text-muted">
                                {t('ecommerce.overviewPro.heroCopy', 'Una vista ejecutiva para saber si la tienda está lista, qué requiere atención y dónde conviene actuar ahora.')}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                    { label: t('ecommerce.overviewPro.activeProducts', 'Activos'), value: activeProducts, icon: Package },
                                    { label: t('ecommerce.categories', 'Categorías'), value: categories.length, icon: FolderTree },
                                    { label: t('ecommerce.overviewPro.reviews', 'Reseñas'), value: totalReviews, icon: Star },
                                    { label: t('ecommerce.overviewPro.weekOrders', '7d pedidos'), value: last7Orders, icon: Activity },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => {
                                                if (item.icon === Package) onNavigate('products');
                                                if (item.icon === FolderTree) onNavigate('categories');
                                                if (item.icon === Star) onNavigate('reviews');
                                                if (item.icon === Activity) onNavigate('orders');
                                            }}
                                            className="rounded-lg border border-q-border/60 bg-q-surface/60 px-3 py-2 text-left transition-colors hover:bg-muted"
                                        >
                                            <Icon className="mb-1 h-4 w-4 text-q-text-muted" />
                                            <div className="text-lg font-extrabold text-foreground">{formatNumber(item.value)}</div>
                                            <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">{item.label}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-full rounded-xl border border-q-border/70 bg-q-bg/50 p-4 lg:w-[300px]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-q-text-muted">
                                        {t('ecommerce.overviewPro.readinessScore', 'Readiness')}
                                    </p>
                                    <p className={`mt-1 text-sm font-semibold ${toneClassMap[readinessTone].text}`}>
                                        {readinessScore >= 85
                                            ? t('ecommerce.overviewPro.readinessLive', 'Lista para empujar ventas')
                                            : readinessScore >= 55
                                                ? t('ecommerce.overviewPro.readinessClose', 'Cerca de producción')
                                                : t('ecommerce.overviewPro.readinessNeedsWork', 'Necesita base operativa')}
                                    </p>
                                </div>
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={readinessRingStyle}>
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-q-surface text-lg font-extrabold text-foreground">
                                        {readinessScore}%
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onNavigate(nextAction.view)}
                                className={`mt-4 flex w-full items-center gap-3 rounded-lg border ${nextActionTone.border} ${nextActionTone.bg} p-3 text-left transition-colors hover:bg-muted`}
                            >
                                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${nextActionTone.icon}`}>
                                    <NextActionIcon size={18} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-foreground">{nextAction.label}</span>
                                    <span className="line-clamp-2 text-xs text-q-text-muted">{nextAction.description}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 flex-shrink-0 text-q-text-muted" />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="quimera-dashboard-panel-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                {t('ecommerce.overviewPro.launchReadiness', 'Checklist de lanzamiento')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {completedReadiness}/{readinessItems.length} {t('ecommerce.overviewPro.completed', 'completados')}
                            </p>
                        </div>
                        <ShieldCheck className={`h-6 w-6 ${toneClassMap[readinessTone].text}`} />
                    </div>
                    <div className="space-y-2">
                        {readinessItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => onNavigate(item.view)}
                                    className="flex w-full items-start gap-3 rounded-lg border border-q-border/50 bg-q-bg/40 p-3 text-left transition-colors hover:bg-muted"
                                >
                                    <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${item.complete ? 'bg-q-success/15 text-q-success' : 'bg-q-accent/15 text-q-accent'}`}>
                                        {item.complete ? <Check size={15} /> : <Icon size={15} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                                        <span className="line-clamp-2 text-xs text-q-text-muted">{item.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statusMetrics.map((stat) => {
                    const Icon = stat.icon;
                    const tone = toneClassMap[stat.tone];
                    return (
                        <button
                            key={stat.label}
                            type="button"
                            onClick={stat.onClick}
                            className={`group relative min-h-[132px] overflow-hidden rounded-xl border ${tone.border}
                                bg-q-surface/80 p-4 text-left backdrop-blur-xl hover:border-q-border
                                transition-all duration-300 ease-out ${stat.onClick ? 'cursor-pointer' : ''}`}
                        >
                            <div
                                className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}
                                aria-hidden="true"
                            />
                            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                                <div className="flex items-start justify-between gap-3">
                                    <Icon className={`h-5 w-5 ${tone.text}`} strokeWidth={2} />
                                    {stat.onClick && <ArrowRight className="h-4 w-4 text-q-text-muted opacity-0 transition-opacity group-hover:opacity-100" />}
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">{stat.label}</p>
                                    <p className="mt-2 text-xs text-q-text-muted">{stat.detail}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
                <section className="quimera-dashboard-panel-card p-5">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                {t('ecommerce.overviewPro.salesPulse', 'Pulso de ventas')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('ecommerce.overviewPro.salesPulseDesc', 'Ingresos y pedidos pagados de los últimos 7 días.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-right">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-q-text-muted">{t('ecommerce.overviewPro.last7Revenue', 'Ingresos 7d')}</p>
                                <p className="text-base font-bold text-foreground">{formatCurrency(last7Revenue)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-q-text-muted">{t('ecommerce.overviewPro.orders7d', 'Pedidos 7d')}</p>
                                <p className="text-base font-bold text-foreground">{formatNumber(last7Orders)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 items-end gap-2 rounded-xl border border-q-border/60 bg-q-bg/40 p-4">
                        {dailySales.map((day) => {
                            const height = Math.max(8, Math.round((day.revenue / maxDailyRevenue) * 96));
                            return (
                                <div key={day.key} className="flex min-h-[140px] flex-col items-center justify-end gap-2">
                                    <div className="flex h-24 w-full items-end justify-center">
                                        <div
                                            className="w-full max-w-[34px] rounded-t-md bg-primary/80 transition-all"
                                            style={{ height }}
                                            title={`${day.label}: ${formatCurrency(day.revenue)}`}
                                        />
                                    </div>
                                    <span className="text-[11px] font-semibold text-q-text-muted">{day.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: t('ecommerce.overviewPro.pipelinePending', 'Pendientes'), value: pendingOrders, icon: Clock, view: 'orders' as EcommerceView },
                            { label: t('ecommerce.overviewPro.pipelineProcessing', 'Procesando'), value: processingOrders, icon: PackageCheck, view: 'orders' as EcommerceView },
                            { label: t('ecommerce.overviewPro.pipelineFulfillment', 'Por cumplir'), value: fulfillmentQueue, icon: Truck, view: 'orders' as EcommerceView },
                            { label: t('ecommerce.overviewPro.pipelineIssues', 'Incidencias'), value: failedPayments + cancelledOrders + refundedOrders, icon: AlertCircle, view: 'orders' as EcommerceView },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => onNavigate(item.view)}
                                    className="rounded-lg border border-q-border/60 bg-q-surface/60 p-3 text-left transition-colors hover:bg-muted"
                                >
                                    <Icon className="mb-2 h-4 w-4 text-q-text-muted" />
                                    <div className="text-xl font-extrabold text-foreground">{formatNumber(item.value)}</div>
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">{item.label}</div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="quimera-dashboard-panel-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                {t('ecommerce.overviewPro.priorityQueue', 'Prioridades')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('ecommerce.overviewPro.priorityQueueDesc', 'Acciones ordenadas por impacto operativo.')}
                            </p>
                        </div>
                        <Inbox className="h-5 w-5 text-q-text-muted" />
                    </div>
                    {priorityActions.length > 0 ? (
                        <div className="space-y-2">
                            {priorityActions.map((action) => {
                                const Icon = action.icon;
                                const tone = toneClassMap[action.tone];
                                return (
                                    <button
                                        key={action.label}
                                        type="button"
                                        onClick={() => onNavigate(action.view)}
                                        className={`flex w-full items-start gap-3 rounded-lg border ${tone.border} ${tone.bg} p-3 text-left transition-colors hover:bg-muted`}
                                    >
                                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                                            <Icon size={16} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-foreground">{action.label}</span>
                                                {action.value && <span className={`text-xs font-bold ${tone.text}`}>{action.value}</span>}
                                            </span>
                                            <span className="line-clamp-2 text-xs text-q-text-muted">{action.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-q-success/30 bg-q-success/10 p-4">
                            <CheckCircle2 className="mb-3 h-6 w-6 text-q-success" />
                            <p className="font-bold text-foreground">{t('ecommerce.overviewPro.noPriorityTitle', 'Operación estable')}</p>
                            <p className="text-sm text-q-text-muted">{t('ecommerce.overviewPro.noPriorityDesc', 'No hay alertas críticas. Mira analíticas para optimizar crecimiento.')}</p>
                        </div>
                    )}
                    {bestLowStockProducts.length > 0 && (
                        <div className="mt-4 rounded-xl border border-q-border/60 bg-q-bg/40 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-q-text-muted">
                                {t('ecommerce.overviewPro.inventoryWatch', 'Inventario en observación')}
                            </p>
                            <div className="space-y-2">
                                {bestLowStockProducts.map((product) => (
                                    <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="truncate text-q-text">{product.name}</span>
                                        <span className="font-bold text-q-accent">{formatNumber(product.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="quimera-dashboard-panel-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">{t('ecommerce.overviewPro.recentOrders', 'Pedidos recientes')}</h3>
                            <p className="text-sm text-q-text-muted">{t('ecommerce.overviewPro.recentOrdersDesc', 'Lo último que requiere seguimiento comercial.')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onNavigate('orders')}
                            className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-bold text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {t('ecommerce.overviewPro.viewOrders', 'Ver pedidos')}
                        </button>
                    </div>
                    {recentOrders.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-q-border/60">
                            {recentOrders.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => onNavigate('orders')}
                                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-q-border/50 bg-q-bg/30 p-3 text-left last:border-b-0 hover:bg-muted"
                                >
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-foreground">{order.orderNumber}</span>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-q-text-muted">
                                                {orderStatusLabels[order.status]}
                                            </span>
                                        </span>
                                        <span className="mt-1 block truncate text-xs text-q-text-muted">
                                            {order.customerName || order.customerEmail} · {formatDate(order)}
                                        </span>
                                    </span>
                                    <span className="text-right">
                                        <span className="block font-bold text-foreground">{formatCurrency(order.total)}</span>
                                        <span className="text-[11px] font-semibold text-q-text-muted">{paymentStatusLabels[order.paymentStatus]}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-q-border/60 bg-q-bg/40 p-6 text-center">
                            <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-q-text-muted" />
                            <p className="font-bold text-foreground">{t('ecommerce.overviewPro.noOrdersTitle', 'Aún no hay pedidos')}</p>
                            <p className="mt-1 text-sm text-q-text-muted">{t('ecommerce.overviewPro.noOrdersDesc', 'Cuando entren pedidos, este panel mostrará el seguimiento inmediato.')}</p>
                        </div>
                    )}
                </section>

                <section className="quimera-dashboard-panel-card p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">{t('ecommerce.overviewPro.productFocus', 'Productos foco')}</h3>
                            <p className="text-sm text-q-text-muted">
                                {topProducts.length > 0
                                    ? t('ecommerce.overviewPro.productFocusSalesDesc', 'Productos que ya están moviendo ventas.')
                                    : t('ecommerce.overviewPro.productFocusLaunchDesc', 'Productos activos listos para promover.')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onNavigate('products')}
                            className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-bold text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {t('ecommerce.overviewPro.viewProducts', 'Ver productos')}
                        </button>
                    </div>
                    {productsToPromote.length > 0 ? (
                        <div className="space-y-2">
                            {productsToPromote.map((product, index) => (
                                <button
                                    key={product.productId}
                                    type="button"
                                    onClick={() => onNavigate('products')}
                                    className="flex w-full items-center gap-3 rounded-lg border border-q-border/60 bg-q-bg/40 p-3 text-left transition-colors hover:bg-muted"
                                >
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-extrabold text-primary">
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-foreground">{product.productName}</span>
                                        <span className="text-xs text-q-text-muted">
                                            {topProducts.length > 0
                                                ? t('ecommerce.overviewPro.unitsSold', '{{count}} vendidos', { count: product.totalSold })
                                                : t('ecommerce.overviewPro.readyToPromote', 'Listo para promover')}
                                        </span>
                                    </span>
                                    <span className="text-sm font-bold text-foreground">
                                        {formatCurrency(product.revenue)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-q-border/60 bg-q-bg/40 p-6 text-center">
                            <Package className="mx-auto mb-3 h-8 w-8 text-q-text-muted" />
                            <p className="font-bold text-foreground">{t('ecommerce.overviewPro.noProductsTitle', 'No hay productos activos')}</p>
                            <p className="mt-1 text-sm text-q-text-muted">{t('ecommerce.overviewPro.noProductsDesc', 'Agrega productos activos para que la tienda tenga algo que vender.')}</p>
                        </div>
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                    {
                        label: t('ecommerce.overviewPro.catalogQuality', 'Calidad del catálogo'),
                        value: totalProducts > 0 ? `${clampPercent(((totalProducts - productsWithoutImages - uncategorizedProducts) / totalProducts) * 100)}%` : '0%',
                        description: t('ecommerce.overviewPro.catalogQualityDesc', '{{images}} sin imagen · {{uncategorized}} sin categoría · {{drafts}} borradores', {
                            images: productsWithoutImages,
                            uncategorized: uncategorizedProducts,
                            drafts: draftProducts,
                        }),
                        icon: PackageCheck,
                        view: 'products' as EcommerceView,
                    },
                    {
                        label: t('ecommerce.overviewPro.trustSignal', 'Señal de confianza'),
                        value: totalReviews > 0 ? `${averageRating.toFixed(1)} ★` : '0 ★',
                        description: t('ecommerce.overviewPro.trustSignalDesc', '{{approved}} aprobadas · {{pending}} pendientes', {
                            approved: approvedReviews,
                            pending: pendingReviews,
                        }),
                        icon: Star,
                        view: 'reviews' as EcommerceView,
                    },
                    {
                        label: t('ecommerce.overviewPro.revenueQuality', 'Calidad de ingresos'),
                        value: `${Math.round(conversionRate)}%`,
                        description: t('ecommerce.overviewPro.revenueQualityDesc', '{{failed}} pagos fallidos · {{cancelled}} cancelados', {
                            failed: failedPayments,
                            cancelled: cancelledOrders,
                        }),
                        icon: Percent,
                        view: 'analytics' as EcommerceView,
                    },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => onNavigate(item.view)}
                            className="quimera-dashboard-panel-card p-4 text-left transition-colors hover:bg-muted/40"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <Icon className="h-5 w-5 text-q-text-muted" />
                                <ArrowRight className="h-4 w-4 text-q-text-muted" />
                            </div>
                            <div className="text-2xl font-extrabold text-foreground">{item.value}</div>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-q-text-muted">{item.label}</p>
                            <p className="mt-2 text-sm text-q-text-muted">{item.description}</p>
                        </button>
                    );
                })}
            </div>

            {/* Demo Data Seeder Modal */}
            {showSeeder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-q-text/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg animate-in fade-in zoom-in-95">
                        <DemoDataSeeder
                            onComplete={() => {
                                setShowSeeder(false);
                                onDemoSeederClose();
                                onNavigate('products');
                            }}
                            onClose={() => {
                                setShowSeeder(false);
                                onDemoSeederClose();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Quick Start Guide */}
            {totalProducts === 0 && totalOrders === 0 && totalCustomers === 0 && (
                <div className="quimera-dashboard-panel-card p-6 sm:p-8">
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-q-text-muted">
                                {t('ecommerce.overviewPro.launchMode', 'Modo lanzamiento')}
                            </p>
                            <h3 className="mt-1 text-xl font-bold text-foreground">
                                {t('ecommerce.getStarted', '¡Comienza con tu tienda!')}
                            </h3>
                        </div>
                        <p className="max-w-xl text-sm text-q-text-muted">
                            {t('ecommerce.overviewPro.launchModeDesc', 'Puedes cargar datos demo para validar el look and feel, o construir tu tienda real paso por paso.')}
                        </p>
                    </div>

                    {/* Demo Data Button - Destacado */}
                    <div className="quimera-guide-panel-accent mb-6 p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {t('ecommerce.quickStartTitle', '¿Primera vez?')}
                                    </p>
                                    <p className="text-sm text-q-text-muted">
                                        {t('ecommerce.quickStartDesc', 'Llena tu tienda con datos de ejemplo')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSeeder(true)}
                                className="quimera-guide-cta flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap"
                            >
                                <Sparkles size={18} />
                                {t('ecommerce.loadDemoData', 'Cargar Datos Demo')}
                            </button>
                        </div>
                    </div>

                    <p className="text-q-text-muted mb-4 text-center">
                        {t('ecommerce.orManualSetup', 'O configura manualmente tu tienda:')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'settings', icon: Settings, label: t('ecommerce.configureStore', 'Configura tu tienda') },
                            { id: 'products', icon: Package, label: t('ecommerce.addProducts', 'Agrega productos') },
                            { id: 'categories', icon: FolderTree, label: t('ecommerce.createCategories', 'Crea categorías') },
                        ].map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id as EcommerceView)}
                                    className="quimera-dashboard-panel-card group flex flex-col items-center gap-3 p-6 text-center"
                                >
                                    <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                    <span className="text-foreground font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EcommerceDashboard;
