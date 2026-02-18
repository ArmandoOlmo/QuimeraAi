/**
 * ViewRouter Component
 * Maneja el enrutamiento de vistas de la aplicación de manera centralizada
 * 
 * Performance: Uses React.lazy for code-splitting of view components
 * Each dashboard is loaded only when needed, reducing initial bundle size
 */

import React, { lazy, Suspense } from 'react';
import { View, UserDocument, PageData } from '../types';

// Core components - imported synchronously (always needed)
import DashboardSidebar from './dashboard/DashboardSidebar';
import QuimeraLoader from './ui/QuimeraLoader';

// Loading fallback for lazy components
const ViewLoading = () => (
    <QuimeraLoader fullScreen size="md" />
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
const EmailDashboard = lazy(() => import('./dashboard/email/EmailDashboard'));
const AssetsDashboard = lazy(() => import('./dashboard/assets/AssetsDashboard'));
const SettingsPage = lazy(() => import('./dashboard/settings/SettingsPage'));
const AgencyDashboard = lazy(() => import('./dashboard/agency/AgencyDashboardMain'));
const BioPageBuilder = lazy(() => import('./dashboard/BioPageBuilder'));

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
    'email': EmailDashboard,
    'assets': AssetsDashboard,
    'templates': UserTemplates,
    'settings': SettingsPage,
    'agency': AgencyDashboard,
    'biopage': BioPageBuilder,
};

/**
 * ViewRouter - Componente de enrutamiento principal
 * Uses React.lazy + Suspense for code-splitting
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

    // SuperAdmin View
    if (view === 'superadmin' && hasAdminAccess(userDocument?.role)) {
        return (
            <Suspense fallback={<ViewLoading />}>
                <SuperAdminDashboard />
            </Suspense>
        );
    }

    // Simple Dashboard Views (mapped components)
    const ViewComponent = VIEW_COMPONENTS[view];
    if (ViewComponent) {
        return (
            <Suspense fallback={<ViewLoading />}>
                <ViewComponent />
            </Suspense>
        );
    }

    // Editor View - Show loading if data is not yet ready
    if (view === 'editor') {
        // If we're in editor mode but data isn't ready yet, show loading
        if (!activeProjectId || !data) {
            return <ViewLoading />;
        }

        // Editor View (data is loaded)
        return (
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                {/* Sidebar - Desktop: always visible collapsed, Mobile: controlled by isMobileMenuOpen */}
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    defaultCollapsed={true}
                />

                {/* Main Editor Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    <Suspense fallback={<ViewLoading />}>
                        <SimpleEditorHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
                    </Suspense>

                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Controls/Editor Sidebar - Siempre visible en desktop, toggle en mobile */}
                        <Suspense fallback={<ViewLoading />}>
                            <Controls />
                        </Suspense>

                        {/* Preview Area - Hidden on mobile when Controls sidebar is open. overflow-hidden + min-h-0 so only BrowserPreview inner scrolls (avoids double scroll). */}
                        <main className={`
                            flex-1 min-h-0 p-4 sm:p-8 flex justify-center overflow-hidden
                            ${isSidebarOpen ? 'hidden md:flex' : 'flex'}
                        `}>
                            <Suspense fallback={<ViewLoading />}>
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
        <Suspense fallback={<ViewLoading />}>
            <Dashboard />
        </Suspense>
    );
};

export default ViewRouter;

