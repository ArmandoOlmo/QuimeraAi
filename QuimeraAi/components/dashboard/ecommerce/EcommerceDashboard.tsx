/**
 * EcommerceDashboard
 * Dashboard principal del módulo de ecommerce
 * Cada proyecto tiene su propia tienda de ecommerce
 */

import React, { useState, useEffect } from 'react';
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
    Star,
    Bell,
    FileDown,
    Store,
    ChevronDown,
    Plus,
    Check,
    Layers,
    Sparkles,
    ArrowLeft,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { EcommerceView } from '../../../types/ecommerce';

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

// Import Project Selector Page
import ProjectSelectorPage from './ProjectSelectorPage';

// Import hooks for overview stats
import { useEcommerceStore } from './hooks/useEcommerceStore';
import { useEcommerceAnalytics } from './hooks/useEcommerceAnalytics';
import { useOrders } from './hooks/useOrders';
import { useReviews } from './hooks/useReviews';
import { useProjectEcommerce } from './hooks/useProjectEcommerce';
import { useProducts } from './hooks/useProducts';

// Import DemoDataSeeder
import DemoDataSeeder from './components/DemoDataSeeder';

interface NavItem {
    id: EcommerceView;
    icon: React.ElementType;
    label: string;
    badge?: number | string;
    badgeColor?: string;
}

// Context para pasar el storeId a todos los componentes hijos
export const EcommerceContext = React.createContext<{
    storeId: string;
    projectId: string | null;
    projectName: string;
}>({
    storeId: 'default',
    projectId: null,
    projectName: '',
});

export const useEcommerceContext = () => React.useContext(EcommerceContext);

const EcommerceDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { projects, activeProject, activeProjectId, loadProject } = useProject();
    const [activeView, setActiveView] = useState<EcommerceView>(() => {
        const savedView = localStorage.getItem('ecommerceActiveView') as EcommerceView;
        return savedView || 'overview';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showAllProjects, setShowAllProjects] = useState(false);

    // UserId seguro
    const userId = user?.uid;

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
        if (savedView && savedView !== activeView) {
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

    // Fetch analytics usando el storeId del proyecto
    const {
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        lowStockProducts,
        isLoading: analyticsLoading,
    } = useEcommerceAnalytics(userId || '', storeId);

    const { getPendingOrdersCount } = useOrders(userId || '', storeId);
    const { pendingCount: pendingReviewsCount } = useReviews(userId || '', storeId);
    const { products } = useProducts(userId || '', storeId);
    const [showDemoSeeder, setShowDemoSeeder] = useState(false);

    const pendingOrdersCount = getPendingOrdersCount();
    const lowStockCount = lowStockProducts.length;
    const totalProducts = products.length;

    const handleViewChange = (view: EcommerceView) => {
        setActiveView(view);
        localStorage.setItem('ecommerceActiveView', view);
    };

    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
        // Guardar en localStorage para persistencia
        localStorage.setItem('ecommerceSelectedProjectId', projectId);
    };

    const handleEnableEcommerce = async () => {
        if (effectiveProjectId) {
            await enableEcommerce();
            await initializeStore();
        }
    };

    const navItems: NavItem[] = [
        { id: 'overview', icon: BarChart3, label: t('ecommerce.overview', 'Vista General') },
        { id: 'products', icon: Package, label: t('ecommerce.products', 'Productos') },
        { id: 'categories', icon: FolderTree, label: t('ecommerce.categories', 'Categorías') },
        {
            id: 'orders',
            icon: ShoppingCart,
            label: t('ecommerce.orders', 'Pedidos'),
            badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
            badgeColor: 'bg-orange-500',
        },
        { id: 'customers', icon: Users, label: t('ecommerce.customers', 'Clientes') },
        { id: 'discounts', icon: Tag, label: t('ecommerce.discounts', 'Descuentos') },
        {
            id: 'reviews',
            icon: Star,
            label: t('ecommerce.reviews', 'Reseñas'),
            badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
            badgeColor: 'bg-yellow-500',
        },
        {
            id: 'stock_alerts',
            icon: Bell,
            label: t('ecommerce.stockAlerts', 'Alertas Stock'),
            badge: lowStockCount > 0 ? lowStockCount : undefined,
            badgeColor: 'bg-red-500',
        },
        { id: 'reports', icon: FileDown, label: t('ecommerce.reports', 'Reportes') },
        { id: 'analytics', icon: TrendingUp, label: t('ecommerce.analytics', 'Analytics') },
        { id: 'settings', icon: Settings, label: t('ecommerce.settings', 'Configuración') },
    ];

    const renderActiveView = () => {
        switch (activeView) {
            case 'overview':
                return (
                    <OverviewView
                        totalRevenue={totalRevenue}
                        totalOrders={totalOrders}
                        totalCustomers={totalCustomers}
                        averageOrderValue={averageOrderValue}
                        pendingOrders={pendingOrdersCount}
                        lowStockCount={lowStockCount}
                        isLoading={analyticsLoading}
                        onNavigate={handleViewChange}
                        totalProducts={totalProducts}
                        showDemoSeeder={showDemoSeeder}
                        onDemoSeederClose={() => setShowDemoSeeder(false)}
                    />
                );
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
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                </div>
            </div>
        );
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
            <div className="min-h-screen bg-background flex">
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-lg">
                        <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-6">
                            <ShoppingBag className="text-primary" size={48} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {t('ecommerce.enableForProject', 'Habilitar Ecommerce')}
                        </h2>
                        <p className="text-lg text-muted-foreground mb-2">
                            {effectiveProject?.name || 'Proyecto'}
                        </p>
                        <p className="text-muted-foreground mb-8">
                            {t('ecommerce.enableDescription', 'Activa la tienda de ecommerce para este proyecto. Podrás agregar productos, gestionar pedidos y más.')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleEnableEcommerce}
                                disabled={ecommerceLoading}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-colors font-medium disabled:opacity-50"
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
                                onClick={() => setSelectedProjectId(null)}
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
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {t('ecommerce.initializingStore', 'Inicializando tienda...')}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (storeError) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
                        <AlertCircle className="text-destructive" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        {t('ecommerce.storeError', 'Error al cargar la tienda')}
                    </h2>
                    <p className="text-muted-foreground mb-4">{storeError}</p>
                    <button
                        onClick={() => initializeStore()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
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
            <div className="min-h-screen bg-background flex">
                {/* Sidebar */}
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen">
                    {/* Header */}
                    <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                        <div className="flex items-center gap-1 sm:gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <ShoppingBag className="text-primary w-5 h-5" />
                                <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                                    {t('ecommerce.dashboardTitle', 'Panel de Ventas')}
                                </h1>
                            </div>
                            {/* Project Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                    className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Store size={14} />
                                    <span className="max-w-[100px] sm:max-w-[200px] truncate">
                                        {effectiveProject?.name || 'Seleccionar proyecto'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                {isProjectSelectorOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsProjectSelectorOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-96 overflow-auto">
                                            <div className="px-4 py-2 border-b border-border/50 mb-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    {t('ecommerce.quickSwitch', 'Cambio rápido')}
                                                </p>
                                            </div>

                                            {projects.filter(p => p.status !== 'Template').slice(0, 5).map((project) => (
                                                <button
                                                    key={project.id}
                                                    onClick={() => handleProjectSelect(project.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10' : ''
                                                        }`}
                                                >
                                                    {project.thumbnailUrl ? (
                                                        <img
                                                            src={project.thumbnailUrl}
                                                            alt={project.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                            <Layers size={16} className="text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-left min-w-0">
                                                        <span className="text-sm font-medium text-foreground truncate block">
                                                            {project.name}
                                                        </span>
                                                        <span className={`text-xs ${project.status === 'Published' ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                            {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                                                        </span>
                                                    </div>
                                                    {project.id === effectiveProjectId && (
                                                        <Check size={16} className="text-primary flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}

                                            <div className="border-t border-border/50 mt-2 pt-2 px-2">
                                                <button
                                                    onClick={() => {
                                                        setShowAllProjects(true);
                                                        setIsProjectSelectorOpen(false);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
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

                        {/* Right Section: Alerts & Back Button */}
                        <div className="flex items-center gap-1 sm:gap-3">
                            {/* Alerts */}
                            {(pendingOrdersCount > 0 || lowStockCount > 0) && (
                                <div className="hidden sm:flex items-center gap-3">
                                    {pendingOrdersCount > 0 && (
                                        <button
                                            onClick={() => handleViewChange('orders')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
                                        >
                                            <ShoppingCart size={16} />
                                            {pendingOrdersCount} {t('ecommerce.pendingOrders', 'pendientes')}
                                        </button>
                                    )}
                                    {lowStockCount > 0 && (
                                        <button
                                            onClick={() => handleViewChange('stock_alerts')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                                        >
                                            <AlertTriangle size={16} />
                                            {lowStockCount} {t('ecommerce.lowStock', 'bajo stock')}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Back Button */}
                            <button
                                onClick={() => setView('dashboard')}
                                className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:border sm:border-border/40 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                                aria-label={t('common.back', 'Volver')}
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                            </button>
                        </div>
                    </header>

                    {/* Sub-navigation */}
                    <div className="px-4 sm:px-6 border-b border-border bg-card/30">
                        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleViewChange(item.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                        {renderActiveView()}
                    </main>
                </div>
            </div>
        </EcommerceContext.Provider>
    );
};

// Overview Component
interface OverviewProps {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    pendingOrders: number;
    lowStockCount: number;
    isLoading: boolean;
    onNavigate: (view: EcommerceView) => void;
    totalProducts: number;
    showDemoSeeder: boolean;
    onDemoSeederClose: () => void;
}

const OverviewView: React.FC<OverviewProps> = ({
    totalRevenue,
    totalOrders,
    totalCustomers,
    averageOrderValue,
    pendingOrders,
    lowStockCount,
    isLoading,
    onNavigate,
    totalProducts,
    showDemoSeeder,
    onDemoSeederClose,
}) => {
    const { t } = useTranslation();
    const { projectName } = useEcommerceContext();
    const [showSeeder, setShowSeeder] = useState(showDemoSeeder || (totalProducts === 0 && totalOrders === 0));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const stats = [
        {
            label: t('ecommerce.totalRevenue', 'Ingresos Totales'),
            value: formatCurrency(totalRevenue),
            icon: DollarSign,
            colorClass: 'text-green-400',
            bgClass: 'bg-green-500/20',
        },
        {
            label: t('ecommerce.totalOrders', 'Total Pedidos'),
            value: totalOrders.toString(),
            icon: ShoppingCart,
            colorClass: 'text-blue-400',
            bgClass: 'bg-blue-500/20',
            onClick: () => onNavigate('orders'),
        },
        {
            label: t('ecommerce.totalCustomers', 'Total Clientes'),
            value: totalCustomers.toString(),
            icon: Users,
            colorClass: 'text-secondary',
            bgClass: 'bg-secondary/20',
            onClick: () => onNavigate('customers'),
        },
        {
            label: t('ecommerce.avgOrderValue', 'Ticket Promedio'),
            value: formatCurrency(averageOrderValue),
            icon: TrendingUp,
            colorClass: 'text-primary',
            bgClass: 'bg-primary/20',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Project Banner */}
            {projectName && (
                <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-6 border border-primary/30">
                    <div className="flex items-center gap-3">
                        <Store className="text-primary" size={24} />
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t('ecommerce.storeFor', 'Tienda de')}
                            </p>
                            <h2 className="text-xl font-bold text-foreground">{projectName}</h2>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            onClick={stat.onClick}
                            className={`bg-card/50 rounded-xl p-6 border border-border ${stat.onClick ? 'cursor-pointer hover:bg-card/70 transition-colors' : ''
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                                    <Icon className={stat.colorClass} size={24} />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders > 0 && (
                    <div
                        onClick={() => onNavigate('orders')}
                        className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 cursor-pointer hover:bg-orange-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/20 rounded-lg">
                                <ShoppingCart className="text-orange-400" size={24} />
                            </div>
                            <div>
                                <p className="text-orange-400 font-medium">
                                    {pendingOrders} {t('ecommerce.ordersPending', 'pedidos pendientes')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.clickToManage', 'Haz clic para gestionar')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {lowStockCount > 0 && (
                    <div
                        onClick={() => onNavigate('stock_alerts')}
                        className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 cursor-pointer hover:bg-red-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="text-red-400" size={24} />
                            </div>
                            <div>
                                <p className="text-red-400 font-medium">
                                    {lowStockCount} {t('ecommerce.productsLowStock', 'productos con bajo stock')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.clickToRestock', 'Haz clic para reabastecer')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Demo Data Seeder Modal */}
            {showSeeder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                <div className="bg-card/50 rounded-xl p-8 border border-border">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                        {t('ecommerce.getStarted', '¡Comienza con tu tienda!')}
                    </h3>

                    {/* Demo Data Button - Destacado */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl border border-primary/30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/30 rounded-lg">
                                    <Sparkles className="text-primary" size={24} />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {t('ecommerce.quickStartTitle', '¿Primera vez?')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('ecommerce.quickStartDesc', 'Llena tu tienda con datos de ejemplo')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSeeder(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                                <Sparkles size={18} />
                                {t('ecommerce.loadDemoData', 'Cargar Datos Demo')}
                            </button>
                        </div>
                    </div>

                    <p className="text-muted-foreground mb-4 text-center">
                        {t('ecommerce.orManualSetup', 'O configura manualmente tu tienda:')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => onNavigate('settings')}
                            className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            <Settings className="text-primary" size={32} />
                            <span className="text-foreground font-medium">
                                {t('ecommerce.configureStore', 'Configura tu tienda')}
                            </span>
                        </button>
                        <button
                            onClick={() => onNavigate('products')}
                            className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            <Package className="text-green-400" size={32} />
                            <span className="text-foreground font-medium">
                                {t('ecommerce.addProducts', 'Agrega productos')}
                            </span>
                        </button>
                        <button
                            onClick={() => onNavigate('categories')}
                            className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            <FolderTree className="text-secondary" size={32} />
                            <span className="text-foreground font-medium">
                                {t('ecommerce.createCategories', 'Crea categorías')}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EcommerceDashboard;
