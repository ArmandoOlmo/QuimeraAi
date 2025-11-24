/**
 * ViewRouter Component
 * Maneja el enrutamiento de vistas de la aplicación de manera centralizada
 */

import React from 'react';
import { View, UserDocument, PageData } from '../types';
import Controls from './Controls';
import LandingPage from './LandingPage';
import BrowserPreview from './BrowserPreview';
import SimpleEditorHeader from './SimpleEditorHeader';
import DashboardSidebar from './dashboard/DashboardSidebar';
import Dashboard from './dashboard/Dashboard';
import SuperAdminDashboard from './dashboard/SuperAdminDashboard';
import CMSDashboard from './cms/CMSDashboard';
import NavigationDashboard from './dashboard/navigation/NavigationDashboard';
import AiAssistantDashboard from './dashboard/ai/AiAssistantDashboard';
import LeadsDashboard from './dashboard/leads/LeadsDashboard';
import DomainsDashboard from './dashboard/domains/DomainsDashboard';
import SEODashboard from './dashboard/SEODashboard';

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
 * Mapa de vistas a componentes
 * Facilita agregar nuevas vistas sin modificar lógica condicional
 */
const VIEW_COMPONENTS: Record<string, React.ComponentType> = {
    'cms': CMSDashboard,
    'navigation': NavigationDashboard,
    'ai-assistant': AiAssistantDashboard,
    'leads': LeadsDashboard,
    'domains': DomainsDashboard,
    'seo': SEODashboard,
};

/**
 * ViewRouter - Componente de enrutamiento principal
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
        return <SuperAdminDashboard />;
    }

    // Simple Dashboard Views (mapped components)
    const ViewComponent = VIEW_COMPONENTS[view];
    if (ViewComponent) {
        return <ViewComponent />;
    }

    // Dashboard Views (websites, assets, dashboard)
    if (view === 'dashboard' || view === 'websites' || view === 'assets' || !activeProjectId || !data) {
        return <Dashboard />;
    }

    // Editor View (default)
    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            {/* Sidebar - Collapsed by default */}
            <DashboardSidebar 
                isMobileOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)}
                defaultCollapsed={true}
            />
            
            {/* Main Editor Content */}
            <div className="flex flex-col flex-1 min-w-0">
                <SimpleEditorHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
                
                <div className="flex flex-1 overflow-hidden relative">
                    <Controls />
                    
                    {/* Backdrop for mobile sidebar */}
                    <div 
                        aria-hidden="true"
                        onClick={() => setIsSidebarOpen(false)} 
                        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${
                            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`} 
                    />
                    
                    {/* Preview Area */}
                    <main className="flex-1 p-4 sm:p-8 flex justify-center">
                        <BrowserPreview ref={previewRef}>
                            <LandingPage />
                        </BrowserPreview>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ViewRouter;

