import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { 
    Shield, Users, LayoutTemplate, Bot, BarChart3, CreditCard, Puzzle, 
    ArrowLeft, Menu, Image, MessageSquare, PackageSearch, Palette, Zap, 
    Store, FlaskConical, Accessibility, Languages, Search, FileText, 
    Navigation, TrendingUp, Activity, Clock, Star, Settings, Grid3x3, List
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
import QuickAccessPanel from './admin/QuickAccessPanel';
import ActivityTimeline, { Activity } from './admin/ActivityTimeline';
import SystemHealthWidget, { SystemHealth } from './admin/SystemHealthWidget';

// Types
type AdminFeature = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: 'core' | 'content' | 'development' | 'analytics' | 'system';
    isPremium?: boolean;
    isNew?: boolean;
};

type ViewMode = 'grid' | 'list' | 'compact';

// Components
const AdminCard: React.FC<{ 
    feature: AdminFeature;
    onClick?: () => void;
    viewMode: ViewMode;
}> = ({ feature, onClick, viewMode }) => {
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
                                Nuevo
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

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}> = ({ title, value, icon, trend, trendUp }) => (
    <div className="bg-editor-panel-bg p-4 rounded-xl border border-editor-border hover:border-editor-accent/50 transition-colors">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-editor-text-secondary mb-1">{title}</p>
                <p className="text-2xl font-bold text-editor-text-primary">{value}</p>
                {trend && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                        <TrendingUp className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} />
                        {trend}
                    </p>
                )}
            </div>
            <div className="bg-editor-accent/10 p-3 rounded-lg text-editor-accent">
                {icon}
            </div>
        </div>
    </div>
);

const CategoryChip: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
    count?: number;
}> = ({ label, active, onClick, count }) => (
    <button
        onClick={onClick}
        className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${active 
                ? 'bg-editor-accent text-white shadow-lg shadow-editor-accent/30' 
                : 'bg-editor-panel-bg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'
            }
        `}
    >
        {label} {count !== undefined && <span className="ml-1">({count})</span>}
    </button>
);

const SuperAdminDashboard = () => {
    const { t } = useTranslation();
    const { setView, adminView, setAdminView } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Mock data states
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({
        apiStatus: 'healthy',
        databaseStatus: 'healthy',
        serverLoad: 45,
        storageUsed: 68,
        uptime: '15d 4h 23m',
        lastCheck: 'Hace 30s',
        activeConnections: 234,
        requestsPerMinute: 1250
    });

    // Load mock data
    useEffect(() => {
        // Mock activities
        setRecentActivities([
            {
                id: '1',
                type: 'edit',
                severity: 'success',
                title: 'Componente actualizado',
                description: 'Hero component fue actualizado con nuevo diseño',
                timestamp: 'Hace 5 min',
                user: { name: 'Juan Pérez', email: 'juan@example.com' }
            },
            {
                id: '2',
                type: 'create',
                severity: 'info',
                title: 'Nuevo template creado',
                description: 'Template "E-commerce Pro" agregado a la biblioteca',
                timestamp: 'Hace 15 min',
                user: { name: 'María García', email: 'maria@example.com' }
            },
            {
                id: '3',
                type: 'config',
                severity: 'warning',
                title: 'Configuración modificada',
                description: 'Se actualizaron las restricciones de API',
                timestamp: 'Hace 1h',
                user: { name: 'Admin', email: 'admin@example.com' }
            }
        ]);

        // Simulate system health updates
        const interval = setInterval(() => {
            setSystemHealth(prev => ({
                ...prev,
                serverLoad: Math.floor(Math.random() * 30) + 40,
                lastCheck: 'Hace pocos segundos'
            }));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const adminFeatures: AdminFeature[] = [
        // Core Management
        { id: 'admins', title: t('superadmin.adminManagement'), description: t('superadmin.adminManagementDesc'), icon: <Shield size={24} />, category: 'core' },
        { id: 'tenants', title: t('superadmin.tenantManagement'), description: t('superadmin.tenantManagementDesc'), icon: <Users size={24} />, category: 'core' },
        { id: 'languages', title: t('superadmin.languageSettings'), description: t('superadmin.languageSettingsDesc'), icon: <Languages size={24} />, category: 'core' },
        { id: 'app-info', title: t('superadmin.appInformation'), description: t('superadmin.appInformationDesc'), icon: <FileText size={24} />, category: 'core' },
        { id: 'billing', title: t('superadmin.billing'), description: t('superadmin.billingDesc'), icon: <CreditCard size={24} />, category: 'core', isPremium: true },
        
        // Content Management
        { id: 'templates', title: t('superadmin.websiteTemplates'), description: t('superadmin.websiteTemplatesDesc'), icon: <LayoutTemplate size={24} />, category: 'content' },
        { id: 'components', title: t('superadmin.components'), description: t('superadmin.componentsDesc'), icon: <Puzzle size={24} />, category: 'content' },
        { id: 'content', title: 'Content Management', description: 'Manage articles and pages for landing pages', icon: <FileText size={24} />, category: 'content' },
        { id: 'images', title: t('superadmin.imageLibrary'), description: t('superadmin.imageLibraryDesc'), icon: <Image size={24} />, category: 'content' },
        { id: 'landing-navigation', title: 'Landing Navigation', description: 'Manage navigation menus for landing pages', icon: <Navigation size={24} />, category: 'content' },
        
        // Development & Design
        { id: 'design-tokens', title: t('superadmin.designTokens'), description: t('superadmin.designTokensDesc'), icon: <Palette size={24} />, category: 'development' },
        { id: 'marketplace', title: t('superadmin.marketplace'), description: t('superadmin.marketplaceDesc'), icon: <Store size={24} />, category: 'development' },
        { id: 'conditional-rules', title: t('superadmin.conditionalRules'), description: t('superadmin.conditionalRulesDesc'), icon: <Zap size={24} />, category: 'development' },
        { id: 'accessibility', title: t('superadmin.accessibilityChecker'), description: t('superadmin.accessibilityCheckerDesc'), icon: <Accessibility size={24} />, category: 'development' },
        
        // Analytics & Testing
        { id: 'stats', title: t('superadmin.usageStatistics'), description: t('superadmin.usageStatisticsDesc'), icon: <BarChart3 size={24} />, category: 'analytics' },
        { id: 'analytics', title: t('superadmin.componentAnalytics'), description: t('superadmin.componentAnalyticsDesc'), icon: <PackageSearch size={24} />, category: 'analytics' },
        { id: 'ab-testing', title: t('superadmin.abTesting'), description: t('superadmin.abTestingDesc'), icon: <FlaskConical size={24} />, category: 'analytics', isNew: true },
        
        // System & AI
        { id: 'global-assistant', title: t('superadmin.globalAssistant'), description: t('superadmin.globalAssistantDesc'), icon: <MessageSquare size={24} />, category: 'system' },
        { id: 'prompts', title: t('superadmin.llmPrompts'), description: t('superadmin.llmPromptsDesc'), icon: <Bot size={24} />, category: 'system' },
        { id: 'global-seo', title: t('superadmin.globalSEO'), description: t('superadmin.globalSEODesc'), icon: <Search size={24} />, category: 'system' },
    ];

    // Quick access items (most used)
    const quickAccessItems = useMemo(() => {
        return [
            { id: 'components', title: 'Components', icon: <Puzzle size={20} />, description: 'Manage components', lastAccessed: 'Hace 1h', frequency: 45 },
            { id: 'templates', title: 'Templates', icon: <LayoutTemplate size={20} />, description: 'Website templates', lastAccessed: 'Hace 3h', frequency: 32 },
            { id: 'tenants', title: 'Tenants', icon: <Users size={20} />, description: 'Manage tenants', lastAccessed: 'Ayer', frequency: 28 },
            { id: 'analytics', title: 'Analytics', icon: <PackageSearch size={20} />, description: 'View analytics', lastAccessed: 'Hace 2h', frequency: 25 },
            { id: 'images', title: 'Images', icon: <Image size={20} />, description: 'Image library', lastAccessed: 'Hace 4h', frequency: 18 },
            { id: 'global-assistant', title: 'Assistant', icon: <MessageSquare size={20} />, description: 'AI Assistant', lastAccessed: 'Hace 30m', frequency: 15 },
        ];
    }, []);

    const categories = useMemo(() => {
        const categoryMap = new Map<string, number>();
        adminFeatures.forEach(feature => {
            categoryMap.set(feature.category, (categoryMap.get(feature.category) || 0) + 1);
        });
        
        return [
            { id: 'all', label: t('common.all'), count: adminFeatures.length },
            { id: 'core', label: 'Core', count: categoryMap.get('core') || 0 },
            { id: 'content', label: 'Contenido', count: categoryMap.get('content') || 0 },
            { id: 'development', label: 'Desarrollo', count: categoryMap.get('development') || 0 },
            { id: 'analytics', label: 'Analíticas', count: categoryMap.get('analytics') || 0 },
            { id: 'system', label: 'Sistema', count: categoryMap.get('system') || 0 },
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

    // Views rendering
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
    if (adminView === 'marketplace') return <AdminViewLayout title="Component Marketplace" onBack={() => setAdminView('main')}><ComponentMarketplace /></AdminViewLayout>;
    if (adminView === 'design-tokens') return <AdminViewLayout title="Design Tokens" onBack={() => setAdminView('main')}><DesignTokensEditor /></AdminViewLayout>;
    if (adminView === 'conditional-rules') return <AdminViewLayout title="Conditional Rules" onBack={() => setAdminView('main')}><ConditionalRulesEditor rules={[]} onUpdate={async (rules) => { console.log('Rules updated:', rules); }} /></AdminViewLayout>;
    if (adminView === 'ab-testing') return <AdminViewLayout title="A/B Testing" onBack={() => setAdminView('main')} noPadding><ABTestingDashboard /></AdminViewLayout>;
    if (adminView === 'accessibility') return <AdminViewLayout title="Accessibility Checker" onBack={() => setAdminView('main')} noPadding><AccessibilityChecker /></AdminViewLayout>;
    if (adminView === 'analytics') return <AdminViewLayout title="Component Analytics" onBack={() => setAdminView('main')} noPadding><AnalyticsDashboard /></AdminViewLayout>;

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden transition-colors"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-editor-accent/10 p-2 rounded-lg">
                                <Shield className="text-editor-accent w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-editor-text-primary">{t('superadmin.title')}</h1>
                                <p className="text-xs text-editor-text-secondary hidden sm:block">Panel de Control Avanzado</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-1 bg-editor-panel-bg border border-editor-border rounded-lg p-1">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-editor-accent text-white' : 'text-editor-text-secondary'}`}>
                                <Grid3x3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-editor-accent text-white' : 'text-editor-text-secondary'}`}>
                                <List className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded transition-colors ${viewMode === 'compact' ? 'bg-editor-accent text-white' : 'text-editor-text-secondary'}`}>
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={() => setView('dashboard')} className="flex items-center text-sm font-medium h-9 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">{t('superadmin.backToDashboard')}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-6 lg:p-8">
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatCard title="Usuarios Activos" value="1,234" icon={<Users size={24} />} trend="+12.5%" trendUp={true} />
                            <StatCard title="Sitios Publicados" value="89" icon={<LayoutTemplate size={24} />} trend="+5.2%" trendUp={true} />
                            <StatCard title="Uso de API" value="45.2K" icon={<Activity size={24} />} trend="-2.1%" trendUp={false} />
                            <StatCard title="Ingresos MRR" value="$12.5K" icon={<TrendingUp size={24} />} trend="+18.3%" trendUp={true} />
                        </div>

                        {/* Layout with sidebar */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Quick Access */}
                                <QuickAccessPanel items={quickAccessItems} onItemClick={handleCardClick} maxItems={6} />

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-editor-text-secondary w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Buscar funcionalidades..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:border-editor-accent focus:ring-2 focus:ring-editor-accent/20 transition-all"
                                    />
                                </div>

                                {/* Categories */}
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <CategoryChip key={cat.id} label={cat.label} count={cat.count} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} />
                                    ))}
                                </div>

                                {/* Features Grid */}
                                <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}`}>
                                    {filteredFeatures.map(feature => (
                                        <AdminCard key={feature.id} feature={feature} onClick={() => handleCardClick(feature.id)} viewMode={viewMode} />
                                    ))}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                <SystemHealthWidget health={systemHealth} onRefresh={() => console.log('Refresh')} />
                                <ActivityTimeline activities={recentActivities} maxItems={5} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;



