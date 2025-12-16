import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppProviders } from './contexts/AppProviders';
import { useAuth } from './contexts/core/AuthContext';
import { useUI } from './contexts/core/UIContext';
import { useProject } from './contexts/project';
import { Router } from './routes';
import { useRouter } from './hooks/useRouter';
import { ROUTES } from './routes/config';
import GlobalSEO from './components/GlobalSEO';
import { useSEO } from './hooks/useSEO';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeMonitoring, setUserContext, clearUserContext } from './utils/monitoring';
import { auth, signOut } from './firebase';
import { View, AdminView } from './types/ui';
import LandingChatbotWidget from './components/LandingChatbotWidget';

// Lazy-loaded components for code-splitting
const ProfileModal = lazy(() => import('./components/dashboard/ProfileModal'));
const GlobalAiAssistant = lazy(() => import('./components/ui/GlobalAiAssistant'));
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal'));
const ViewRouter = lazy(() => import('./components/ViewRouter'));
const PublicWebsitePreview = lazy(() => import('./components/PublicWebsitePreview'));

// Minimal loading fallback for lazy components
const MinimalLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

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
  const { userDocument } = useAuth();
  const { view, setView, setAdminView, isSidebarOpen, setIsSidebarOpen, previewRef } = useUI();
  const { activeProjectId, loadProject, data, isLoadingProjects } = useProject();
  const seoConfig = useSEO();

  // Sync route state with contexts
  useEffect(() => {
    if (routeView && routeView !== view) {
      setView(routeView);
    }
    if (routeView === 'superadmin') {
      const targetAdminView = routeAdminView || 'main';
      setAdminView(targetAdminView);
    }
    // Only attempt to load project after projects have finished loading
    if (routeProjectId && routeProjectId !== activeProjectId && !isLoadingProjects) {
      loadProject(routeProjectId, false, false);
    }
  }, [routeView, routeAdminView, routeProjectId, view, activeProjectId, setView, setAdminView, loadProject, isLoadingProjects]);

  return (
    <>
      <GlobalSEO config={seoConfig} />
      <Suspense fallback={<MinimalLoader />}>
        <ViewRouter
          view={view}
          userDocument={userDocument}
          activeProjectId={activeProjectId}
          data={data}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          previewRef={previewRef}
        />
      </Suspense>
      <Suspense fallback={null}>
        <GlobalAiAssistant />
      </Suspense>
      <Suspense fallback={null}>
        <OnboardingModal />
      </Suspense>
    </>
  );
};

// =============================================================================
// AUTH GATE - Manages Authentication Flow with Router
// =============================================================================

const AuthGate: React.FC = () => {
  const { user, loadingAuth, verificationEmail, setVerificationEmail, isProfileModalOpen, closeProfileModal, userDocument } = useAuth();
  const { navigate } = useRouter();

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

  const handleLogout = async () => {
    await signOut(auth);
    setVerificationEmail(null);
    navigate(ROUTES.LOGIN);
  };

  return (
    <Router
      user={user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null}
      userRole={userDocument?.role}
      loadingAuth={loadingAuth}
      onVerificationEmailSent={setVerificationEmail}
      verificationEmail={verificationEmail}
      onLogout={handleLogout}
    >
      {({ view, adminView, projectId }) => (
        <>
          <AppContent routeView={view} routeAdminView={adminView} routeProjectId={projectId} />
          {isProfileModalOpen && (
            <Suspense fallback={null}>
              <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
            </Suspense>
          )}
          {/* Landing Chatbot - Only show when user is NOT authenticated */}
          {!user && <LandingChatbotWidget />}
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

  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    const handleNavigation = () => setIsPreview(isPreviewRoute());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  if (isPreview) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicWebsitePreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthGate />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
