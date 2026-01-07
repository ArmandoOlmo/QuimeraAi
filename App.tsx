import React, { useEffect, useState, lazy, Suspense } from 'react';
import { AppProviders } from './contexts/AppProviders';
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
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
  const [isPreview, setIsPreview] = useState(isPreviewRoute());
  const customDomain = useCustomDomain();

  // #region agent log - Hypothesis G: Check customDomain values in App
  console.log('[DEBUG-G] App render', JSON.stringify({
    isCustomDomain: customDomain.isCustomDomain,
    isLoading: customDomain.isLoading,
    projectId: customDomain.projectId,
    userId: customDomain.userId,
    domain: customDomain.domain,
    error: customDomain.error
  }));
  // #endregion

  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    const handleNavigation = () => setIsPreview(isPreviewRoute());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // Handle custom domain detection
  if (customDomain.isLoading) {
    return <DomainLoadingPage />;
  }

  // If it's a custom domain, render the landing page
  if (customDomain.isCustomDomain) {
    if (!customDomain.projectId || !customDomain.userId) {
      return <DomainNotConfiguredPage domain={customDomain.domain || 'unknown'} />;
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:204',message:'Rendering PublicWebsitePreview for custom domain',data:{userId:customDomain.userId,projectId:customDomain.projectId,domain:customDomain.domain},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion

    // Render the landing page using PublicWebsitePreview with the resolved project
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

  if (isPreview) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:222',message:'Rendering PublicWebsitePreview for preview route',data:{pathname:window.location.pathname,hash:window.location.hash},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
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
