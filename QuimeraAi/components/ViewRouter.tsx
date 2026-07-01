/**
 * ViewRouter Component
 * Maneja el enrutamiento de vistas de la aplicación de manera centralizada
 * 
 * Performance: Uses React.lazy for code-splitting of view components
 * Each dashboard is loaded only when needed, reducing initial bundle size
 */

import React, { lazy, Suspense } from 'react';
import { View, UserDocument, PageData } from '../types';
import { useSafeTenant } from '../contexts/tenant/TenantContext';
import { useServiceAccess } from '../hooks/useServiceAccess';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { shouldPreserveScopedAccessDeniedRoute } from '../routes/accessGuards';

// Core components - imported synchronously (always needed)
import DashboardSidebar from './dashboard/DashboardSidebar';
import QuimeraLoader from './ui/QuimeraLoader';
import NoCreditsGlobalBanner from './ui/NoCreditsGlobalBanner';

// Loading fallback for lazy components — uses tenant branding when available
const ViewLoading = ({ logoUrl }: { logoUrl?: string }) => (
    <QuimeraLoader fullScreen size="md" logoUrl={logoUrl} />
);

// ============================================================================
// LAZY-LOADED COMPONENTS - Each view is loaded only when accessed
// This significantly reduces initial bundle size
// ============================================================================

// Dashboard views
const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const SuperAdminDashboard = lazy(() => import('./dashboard/SuperAdminDashboard'));
const UserTemplates = lazy(() => import('./dashboard/UserTemplates'));

// Feature dashboards
const CMSDashboard = lazy(() => import('./cms/CMSDashboard'));
const NavigationDashboard = lazy(() => import('./dashboard/navigation/NavigationDashboard'));
const AiAssistantDashboard = lazy(() => import('./dashboard/ai/AiAssistantDashboard'));
const LeadsDashboard = lazy(() => import('./dashboard/leads/LeadsDashboard'));
const AppointmentsDashboard = lazy(() => import('./dashboard/appointments/AppointmentsDashboard'));
const DomainsDashboard = lazy(() => import('./dashboard/domains/DomainsDashboard'));
const SEODashboard = lazy(() => import('./dashboard/SEODashboard'));
const FinanceDashboard = lazy(() => import('./dashboard/finance/FinanceDashboard'));
const EcommerceDashboard = lazy(() => import('./dashboard/ecommerce/EcommerceDashboard'));
const RestaurantsDashboard = lazy(() => import('./dashboard/restaurants/RestaurantsDashboard'));
const EmailDashboard = lazy(() => import('./dashboard/email/EmailDashboard'));
const AssetsDashboard = lazy(() => import('./dashboard/assets/AssetsDashboard'));
const ContentStudioDashboard = lazy(() => import('./dashboard/content-studio/ContentStudioDashboard'));
const SettingsPage = lazy(() => import('./dashboard/settings/SettingsPage'));
const AgencyDashboard = lazy(() => import('./dashboard/agency/AgencyDashboardMain'));
const BioPageBuilder = lazy(() => import('./dashboard/BioPageBuilder'));
const BlogHub = lazy(() => import('./dashboard/BlogHub'));
const RealtyDashboard = lazy(() => import('./dashboard/realty/RealtyDashboard'));
const VersionHistoryDashboard = lazy(() => import('./dashboard/version-history/VersionHistoryDashboard'));

// Editor components
const Controls = lazy(() => import('./Controls'));
const LandingPage = lazy(() => import('./LandingPage'));
const BrowserPreview = lazy(() => import('./BrowserPreview'));
const SimpleEditorHeader = lazy(() => import('./SimpleEditorHeader'));

interface ViewRouterProps {
    view: View;
    userDocument: UserDocument | null;
    activeProjectId: string | null;
    data: PageData | null;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    previewRef: React.RefObject<HTMLDivElement>;
}

/**
 * Determina si el usuario tiene permisos para acceder a SuperAdmin
 */
const hasAdminAccess = (role?: string): boolean => {
    return ['owner', 'superadmin', 'admin', 'manager'].includes(role || '');
};

/**
 * Mapa de vistas a componentes lazy
 * Facilita agregar nuevas vistas sin modificar lógica condicional
 */
const VIEW_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    'cms': CMSDashboard,
    'navigation': NavigationDashboard,
    'ai-assistant': AiAssistantDashboard,
    'leads': LeadsDashboard,
    'appointments': AppointmentsDashboard,
    'domains': DomainsDashboard,
    'seo': SEODashboard,
    'finance': FinanceDashboard,
    'ecommerce': EcommerceDashboard,
    'restaurants': RestaurantsDashboard,
    'email': EmailDashboard,
    'assets': AssetsDashboard,
    'content-studio': ContentStudioDashboard,
    'templates': UserTemplates,
    'settings': SettingsPage,
    'agency': AgencyDashboard,
    'biopage': BioPageBuilder,
    'blog-hub': BlogHub,
    'real-estate': RealtyDashboard,
    'version-history': VersionHistoryDashboard,
};

const VIEW_MODULE_MAP: Partial<Record<View, string>> = {
    agency: 'agency-engine',
    ecommerce: 'ecommerce-engine',
    cms: 'cms-engine',
    leads: 'crm-leads',
    'ai-assistant': 'chatbot-engine',
    email: 'email-marketing',
    appointments: 'appointments-engine',
    domains: 'domains-management',
    finance: 'finance',
    'real-estate': 'real-estate-engine',
    restaurants: 'restaurant-engine',
    assets: 'media-assets',
    'content-studio': 'contentStudio',
    templates: 'templates-library',
    biopage: 'bio-page-engine',
    'blog-hub': 'cms-engine',
};

/**
 * ViewRouter - Componente de enrutamiento principal
 * Uses React.lazy + Suspense for code-splitting
 * Includes global service availability guard: if a view's service is disabled,
 * the user is automatically redirected to the dashboard.
 */
const ViewRouter: React.FC<ViewRouterProps> = ({
    view,
    userDocument,
    activeProjectId,
    data,
    isSidebarOpen,
    setIsSidebarOpen,
    previewRef,
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const tenantContext = useSafeTenant();
    const agencyLogoUrl = tenantContext?.currentTenant?.branding?.logoUrl;
    const serviceAccess = useServiceAccess();
    const { path, route, replace } = useRouter();

    const routeAccess = React.useMemo(() => {
        const moduleId = route?.moduleId || VIEW_MODULE_MAP[view];
        const serviceId = route?.requiredService;
        const featureKey = route?.requiredFeature;
        const requiredPermission = route?.requiredPermission;

        if (!moduleId && !serviceId && !featureKey && !requiredPermission) {
            return null;
        }

        return {
            moduleId,
            serviceId,
            featureKey,
            requiredPermission,
        };
    }, [
        route?.moduleId,
        route?.requiredService,
        route?.requiredFeature,
        route?.requiredPermission,
        view,
    ]);

    const accessDecision = React.useMemo(() => {
        if (!routeAccess) return null;

        const input = {
            serviceId: routeAccess.serviceId,
            featureKey: routeAccess.featureKey,
            requiredPermission: routeAccess.requiredPermission,
        };

        if (routeAccess.moduleId) {
            return serviceAccess.canAccessModule(routeAccess.moduleId, input);
        }

        if (routeAccess.serviceId) {
            return serviceAccess.canAccessService(routeAccess.serviceId, input);
        }

        return serviceAccess.resolveAccess(input);
    }, [routeAccess, serviceAccess]);
    const shouldPreserveEcommerceSubroute = shouldPreserveScopedAccessDeniedRoute({
        path,
        isAuthenticated: true,
    });

    React.useEffect(() => {
        if (serviceAccess.isLoading) return;
        if (routeAccess && accessDecision && !accessDecision.allowed && !shouldPreserveEcommerceSubroute) {
            replace(ROUTES.DASHBOARD);
        }
    }, [routeAccess, accessDecision?.allowed, shouldPreserveEcommerceSubroute, serviceAccess.isLoading, replace]);

    // SuperAdmin View
    if (view === 'superadmin' && hasAdminAccess(userDocument?.role)) {
        return (
            <Suspense fallback={<ViewLoading logoUrl={agencyLogoUrl} />}>
                <SuperAdminDashboard />
            </Suspense>
        );
    }

    if (routeAccess && !serviceAccess.isLoading && accessDecision && !accessDecision.allowed && !shouldPreserveEcommerceSubroute) {
        return <ViewLoading logoUrl={agencyLogoUrl} />;
    }

    // Simple Dashboard Views (mapped components)
    const ViewComponent = VIEW_COMPONENTS[view];
    if (ViewComponent) {
        return (
            <div className="flex flex-col h-screen">
                <NoCreditsGlobalBanner />
                <div className="flex-1 min-h-0">
                    <Suspense fallback={<ViewLoading logoUrl={agencyLogoUrl} />}>
                        <ViewComponent />
                    </Suspense>
                </div>
            </div>
        );
    }

    // Editor View - Show loading if data is not yet ready
    if (view === 'editor') {
        // If we're in editor mode but data isn't ready yet, show loading
        console.log("ViewRouter render check:", { view, activeProjectId, dataPresent: !!data }); if (!activeProjectId || !data) {
            return <ViewLoading logoUrl={agencyLogoUrl} />;
        }

        // Editor View (data is loaded)
        return (
            <div className="flex h-screen bg-q-bg text-q-text">
                {/* Sidebar - Desktop: always visible collapsed, Mobile: controlled by isMobileMenuOpen */}
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    defaultCollapsed={true}
                />

                {/* Main Editor Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    <Suspense fallback={<ViewLoading logoUrl={agencyLogoUrl} />}>
                        <SimpleEditorHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                    </Suspense>

                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Controls/Editor Sidebar - Siempre visible en desktop, toggle en mobile */}
                        <Suspense fallback={null}>
                            <Controls />
                        </Suspense>

                        {/* Preview Area - Hidden on mobile when Controls sidebar is open. overflow-hidden + min-h-0 so only BrowserPreview inner scrolls (avoids double scroll). */}
                        <main className={`
                            flex-1 min-h-0 p-4 sm:p-8 flex justify-center overflow-hidden
                            ${isSidebarOpen ? 'hidden md:flex' : 'flex'}
                        `}>
                            <Suspense fallback={<ViewLoading logoUrl={agencyLogoUrl} />}>
                                <BrowserPreview ref={previewRef}>
                                    <LandingPage />
                                </BrowserPreview>
                            </Suspense>
                        </main>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard Views (websites, dashboard, or no project selected)
    return (
        <div className="flex flex-col h-screen">
            <NoCreditsGlobalBanner />
            <div className="flex-1 min-h-0">
                <Suspense fallback={<ViewLoading logoUrl={agencyLogoUrl} />}>
                    <Dashboard />
                </Suspense>
            </div>
        </div>
    );
};

export default ViewRouter;
