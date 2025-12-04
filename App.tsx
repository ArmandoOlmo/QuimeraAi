import React, { useEffect, useState } from 'react';
import { EditorProvider, useEditor } from './contexts/EditorContext';
import { ToastProvider } from './contexts/ToastContext';
import { Router } from './routes';
import { useRouter } from './hooks/useRouter';
import { ROUTES } from './routes/config';
import ProfileModal from './components/dashboard/ProfileModal';
import GlobalAiAssistant from './components/ui/GlobalAiAssistant';
import OnboardingWizard from './components/ui/OnboardingWizard';
import GlobalSEO from './components/GlobalSEO';
import { useSEO } from './hooks/useSEO';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeMonitoring, setUserContext, clearUserContext } from './utils/monitoring';
import ViewRouter from './components/ViewRouter';
import PublicWebsitePreview from './components/PublicWebsitePreview';
import { auth, signOut } from './firebase';
import { View, AdminView } from './types/ui';

// =============================================================================
// PREVIEW ROUTE CHECK (Clean URLs - no hash)
// =============================================================================

const isPreviewRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/preview/');
};

// =============================================================================
// APP CONTENT - Authenticated User Content
// =============================================================================

interface AppContentProps {
  routeView: View;
  routeAdminView: AdminView | null;
  routeProjectId: string | null;
}

const AppContent: React.FC<AppContentProps> = ({ 
  routeView, 
  routeAdminView, 
  routeProjectId 
}) => {
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    view,
    setView,
    previewRef, 
    activeProjectId,
    loadProject,
    data, 
    userDocument, 
    isOnboardingOpen, 
    setIsOnboardingOpen,
    setAdminView,
  } = useEditor();
  const seoConfig = useSEO();

  // Sync route state with EditorContext
  useEffect(() => {
    // Sync view from route
    if (routeView && routeView !== view) {
      setView(routeView);
    }
    
    // Sync adminView from route - always sync when on superadmin view
    if (routeView === 'superadmin') {
      // Use routeAdminView or default to 'main' for /admin root
      const targetAdminView = routeAdminView || 'main';
      setAdminView(targetAdminView);
    }
    
    // Sync projectId from route - load project if different
    if (routeProjectId && routeProjectId !== activeProjectId) {
      loadProject(routeProjectId, false, false);
    }
  }, [routeView, routeAdminView, routeProjectId, view, activeProjectId, setView, setAdminView, loadProject]);

  return (
    <>
      <GlobalSEO config={seoConfig} />
      <ViewRouter
        view={view}
        userDocument={userDocument}
        activeProjectId={activeProjectId}
        data={data}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        previewRef={previewRef}
      />
      <GlobalAiAssistant />
      <OnboardingWizard isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
    </>
  );
};

// =============================================================================
// AUTH GATE - Manages Authentication Flow with Router
// =============================================================================

const AuthGate: React.FC = () => {
  const { 
    user, 
    loadingAuth, 
    verificationEmail, 
    setVerificationEmail, 
    isProfileModalOpen, 
    closeProfileModal, 
    userDocument 
  } = useEditor();
  
  const { navigate } = useRouter();

  // Set user context for monitoring when user changes
  useEffect(() => {
    if (user && userDocument) {
      setUserContext({
        id: user.uid,
        email: user.email || undefined,
        role: userDocument.role,
      });
    } else {
      clearUserContext();
    }
  }, [user, userDocument]);

  // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    setVerificationEmail(null);
    navigate(ROUTES.LOGIN);
  };

  return (
    <Router
      user={user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      } : null}
      userRole={userDocument?.role}
      loadingAuth={loadingAuth}
      onVerificationEmailSent={setVerificationEmail}
      verificationEmail={verificationEmail}
      onLogout={handleLogout}
    >
      {({ view, adminView, projectId }) => (
        <>
          <AppContent 
            routeView={view} 
            routeAdminView={adminView} 
            routeProjectId={projectId} 
          />
          {isProfileModalOpen && (
            <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
          )}
        </>
      )}
    </Router>
  );
};

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

const App: React.FC = () => {
  const [isPreview, setIsPreview] = useState(isPreviewRoute());

  // Initialize monitoring on app start
  useEffect(() => {
    initializeMonitoring();
  }, []);

  // Listen for navigation changes to detect preview route
  useEffect(() => {
    const handleNavigation = () => {
      setIsPreview(isPreviewRoute());
    };
    
    // Listen to popstate for back/forward navigation
    window.addEventListener('popstate', handleNavigation);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Render preview route without authentication or EditorProvider
  if (isPreview) {
    return (
      <ErrorBoundary>
        <PublicWebsitePreview />
      </ErrorBoundary>
    );
  }

  // Normal app with authentication and routing
  return (
    <ErrorBoundary>
      <EditorProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </EditorProvider>
    </ErrorBoundary>
  );
};

export default App;
