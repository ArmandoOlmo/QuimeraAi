import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppProviders, LightProviders } from './contexts/AppProviders';
import { useLightAuthState } from './hooks/useLightAuthState';
import { useAuth } from './contexts/core/AuthContext';
import { useUI } from './contexts/core/UIContext';
import { useProject } from './contexts/project';
import { useSafeAdmin } from './contexts/admin';
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
import { useCustomDomain, DomainNotConfiguredPage, DomainLoadingPage } from './hooks/useCustomDomain';
import AdPixelsInjector from './components/AdPixelsInjector';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy-loaded components for code-splitting with retry logic
// Using lazyWithRetry to handle chunk loading failures after deployments
const ProfileModal = lazyWithRetry(() => import('./components/dashboard/ProfileModal'));
const GlobalAiAssistant = lazyWithRetry(() => import('./components/ui/GlobalAiAssistant'));
const OnboardingModal = lazyWithRetry(() => import('./components/onboarding/OnboardingModal'));
const ViewRouter = lazyWithRetry(() => import('./components/ViewRouter'));
const PublicWebsitePreview = lazyWithRetry(() => import('./components/PublicWebsitePreview'));
const StorefrontApp = lazyWithRetry(() => import('./components/ecommerce/StorefrontApp'));

// Minimal loading fallback for lazy components
const MinimalLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <img
      src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
      alt="Loading..."
      className="w-12 h-12 object-contain animate-pulse"
    />
  </div>
);

// =============================================================================
// GLOBAL AD PIXELS - App-wide tracking for analytics
// =============================================================================

const GlobalAdPixels: React.FC = () => {
  const adminContext = useSafeAdmin();

  // Safe fallback if AdminProvider is not available or still initializing
  if (!adminContext || !adminContext.globalAdPixels) return null;

  return <AdPixelsInjector config={adminContext.globalAdPixels} />;
};

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
    // Load project when:
    // 1. Route has a projectId AND
    // 2. Either the projectId changed OR data is not loaded yet (reload scenario) AND
    // 3. Projects have finished loading from Firebase
    const shouldLoadProject = routeProjectId && !isLoadingProjects && (
      routeProjectId !== activeProjectId || !data
    );
    if (shouldLoadProject) {
      loadProject(routeProjectId, false, false);
    }
  }, [routeView, routeAdminView, routeProjectId, view, activeProjectId, setView, setAdminView, loadProject, isLoadingProjects, data]);

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
    <>
      {/* Global Ad Tracking Pixels - Always active for app-wide analytics */}
      <GlobalAdPixels />

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
          </>
        )}
      </Router>
      {/* Landing Chatbot - Only render on public marketing pages (home, login, register, etc.) */}
      {!user && !isPreviewRoute() && !window.location.pathname.startsWith('/store/') && <LandingChatbotWidget />}
    </>
  );
};

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

const App: React.FC = () => {
  // ==========================================================================
  // ALL HOOKS MUST BE CALLED AT THE TOP - React Rules of Hooks
  // ==========================================================================
  const [isPreview, setIsPreview] = useState(isPreviewRoute());
  const customDomain = useCustomDomain();

  // Performance optimization: lightweight auth check before loading heavy providers
  const lightAuth = useLightAuthState();

  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    const handleNavigation = () => setIsPreview(isPreviewRoute());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // ==========================================================================
  // CONDITIONAL RENDERS (after all hooks)
  // ==========================================================================

  // Handle custom domain detection - loading state
  if (customDomain.isLoading) {
    return <DomainLoadingPage />;
  }

  // Custom domain - render landing page directly
  if (customDomain.isCustomDomain) {
    if (!customDomain.projectId || !customDomain.userId) {
      return <DomainNotConfiguredPage domain={customDomain.domain || 'unknown'} />;
    }

    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicWebsitePreview
            userId={customDomain.userId}
            projectId={customDomain.projectId}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Preview route - no providers needed
  if (isPreview) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicWebsitePreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Auth loading state
  if (lightAuth.isLoading) {
    return <MinimalLoader />;
  }

  // Unauthenticated users get LightProviders (5 contexts instead of 17+)
  // This significantly reduces initial load time for login/register pages
  if (!lightAuth.isAuthenticated) {
    return (
      <ErrorBoundary>
        <LightProviders>
          <AuthGate />
        </LightProviders>
      </ErrorBoundary>
    );
  }

  // Authenticated users get full AppProviders with all feature contexts
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthGate />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
