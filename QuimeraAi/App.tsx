import React, { useEffect, useState, Suspense } from 'react';
import { AppProviders, LightProviders } from './contexts/AppProviders';
import { useLightAuthState } from './hooks/useLightAuthState';
import { useAuth } from './contexts/core/AuthContext';
import { Router } from './routes';
import { useRouter } from './hooks/useRouter';
import { ROUTES, getRouteConfig } from './routes/config';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeMonitoring, setUserContext, clearUserContext } from './utils/monitoring';
import { useCustomDomain, DomainNotConfiguredPage, DomainLoadingPage } from './hooks/useCustomDomain';
import { detectSubdomain, SubdomainInfo } from './utils/subdomainUtils';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { consumeStoredPostAuthRedirect } from './utils/authRedirect';
import { getBioSlugFromPathname } from './utils/bioPageRouting';

// Lazy-loaded components for code-splitting with retry logic
// Using lazyWithRetry to handle chunk loading failures after deployments
const AuthenticatedAppContent = lazyWithRetry(() => import('./components/app/AuthenticatedAppContent'));
const ProfileModal = lazyWithRetry(() => import('./components/dashboard/ProfileModal'));
const PublicLandingPage = lazyWithRetry(() => import('./components/PublicLandingPage'));
const PublicWebsitePreview = lazyWithRetry(() => import('./components/PublicWebsitePreview'));
const StorefrontApp = lazyWithRetry(() => import('./components/ecommerce/StorefrontApp'));
const PublicBioPage = lazyWithRetry(() => import('./components/PublicBioPage'));
const AgencyCheckoutPage = lazyWithRetry(() => import('./components/checkout/AgencyCheckoutPage'));
const AgencyLandingPreview = lazyWithRetry(() => import('./components/AgencyLandingPreview'));
const LandingChatbotWidget = lazyWithRetry(() => import('./components/LandingChatbotWidget'), { retries: 2 });

// Minimal loading fallback for lazy components — invisible (no spinner, no branding)
const MinimalLoader = () => (
  <div className="min-h-screen bg-background" />
);

// =============================================================================
// PREVIEW ROUTE CHECK (Clean URLs - no hash)
// =============================================================================

const isPreviewRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/preview/');
};

const isAgencyPreviewRoute = () => window.location.pathname.startsWith('/preview/agency/');
const isAgencyLandingRoute = () => window.location.pathname.startsWith('/agency-landing/');

const isLandingEditorPreviewRoute = () => {
  return (
    window.location.pathname === '/landing-editor-preview' ||
    (window.location.pathname === '/' && new URLSearchParams(window.location.search).get('preview') === 'landing')
  );
};

// Temporary diagnostic tool route
const isDiagnoseRoute = () => window.location.pathname === '/admin/diagnose';
const ProjectDiagnostic = lazyWithRetry(() => import('./components/admin/ProjectDiagnostic'));

// Check for public bio page route
const isBioRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/bio/');
};

// Check for checkout payment link route
const isCheckoutRoute = () => {
  const path = window.location.pathname;
  return path.startsWith('/pay/');
};

const shouldShowLandingChatbot = (user: unknown) => {
  if (user) return false;
  if (isPreviewRoute()) return false;
  if (window.location.pathname.startsWith('/store/')) return false;
  return true;
};

// =============================================================================
// AUTH GATE - Manages Authentication Flow with Router
// =============================================================================

const AuthGate: React.FC = () => {
  const { user, loadingAuth, verificationEmail, setVerificationEmail, isProfileModalOpen, closeProfileModal, userDocument, isUserOwner, logout } = useAuth();
  const { navigate } = useRouter();
  const [mountLandingChatbot, setMountLandingChatbot] = useState(false);
  const showLandingChatbot = shouldShowLandingChatbot(user);

  useEffect(() => {
    if (user && userDocument) {
      setUserContext({
        id: user.id,
        email: user.email || undefined,
        role: userDocument.role,
      });
    } else {
      clearUserContext();
    }
  }, [user, userDocument]);

  const handleLogout = async () => {
    await logout();
    setVerificationEmail(null);
    navigate(ROUTES.LOGIN);
  };

  useEffect(() => {
    if (loadingAuth || !user) return;

    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    const isLandingPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'landing';
    const isVerified = !!(user.email_confirmed_at || user.user_metadata?.email_verified);
    const isSupabaseHashCallback =
      currentHash === '#' ||
      currentHash.includes('access_token=') ||
      currentHash.includes('refresh_token=') ||
      currentHash.includes('type=');

    if (!isVerified || isLandingPreviewMode) return;

    if (currentPath === '/' && isSupabaseHashCallback) {
      navigate(consumeStoredPostAuthRedirect());
    }
  }, [loadingAuth, navigate, user]);

  useEffect(() => {
    if (!showLandingChatbot) {
      setMountLandingChatbot(false);
    }
  }, [showLandingChatbot]);

  return (
    <>
      <Router
        user={user ? { 
          id: user.id, 
          email: user.email || null, 
          emailVerified: !!(user.email_confirmed_at || user.user_metadata?.email_verified) 
        } : null}
        userRole={isUserOwner ? 'owner' : userDocument?.role}
        loadingAuth={loadingAuth}
        onVerificationEmailSent={setVerificationEmail}
        verificationEmail={verificationEmail}
        onLogout={handleLogout}
      >
        {({ view, adminView, projectId }) => (
          <>
            {user && (
              <Suspense fallback={<MinimalLoader />}>
                <AuthenticatedAppContent routeView={view} routeAdminView={adminView} routeProjectId={projectId} />
              </Suspense>
            )}
            {isProfileModalOpen && (
              <Suspense fallback={null}>
                <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
              </Suspense>
            )}
          </>
        )}
      </Router>
      {/* Landing Chatbot - Only render on public marketing pages (home, login, register, etc.) */}
      {showLandingChatbot && !mountLandingChatbot && (
        <button
          type="button"
          aria-label="Abrir chat de Quimera"
          onClick={() => setMountLandingChatbot(true)}
          className="fixed z-[9999] flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#fbb92b] shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95"
          style={{
            top: 'calc(100dvh - max(76px, calc(env(safe-area-inset-bottom) + 76px)))',
            right: 'max(20px, env(safe-area-inset-right))',
          }}
        >
          <img src="/logos/quimera-icon.svg" alt="" className="h-8 w-8 object-contain" />
        </button>
      )}
      {showLandingChatbot && mountLandingChatbot && (
        <Suspense fallback={null}>
          <LandingChatbotWidget initialOpen />
        </Suspense>
      )}
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
  const [isLandingEditorPreview, setIsLandingEditorPreview] = useState(isLandingEditorPreviewRoute());
  const customDomain = useCustomDomain();

  // Subdomain detection for user subdomains (username.quimera.ai)
  const [subdomainInfo] = useState<SubdomainInfo>(() => 
    detectSubdomain(typeof window !== 'undefined' ? window.location.hostname : '')
  );

  // Performance optimization: lightweight auth check before loading heavy providers
  const lightAuth = useLightAuthState();

  useEffect(() => {
    initializeMonitoring();
  }, []);

  useEffect(() => {
    if (!isPreviewRoute()) return;

    void import('./utils/previewPrefetch')
      .then((module) => module.startPreviewPrefetch())
      .catch((error) => {
        console.warn('[PreviewPrefetch] Could not start preview prefetch:', error);
      });
  }, []);

  useEffect(() => {
    const handleNavigation = () => {
      setIsPreview(isPreviewRoute());
      setIsLandingEditorPreview(isLandingEditorPreviewRoute());
    };
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // ==========================================================================
  // CONDITIONAL RENDERS (after all hooks)
  // ==========================================================================

  // Preview route - no providers, no auth, no domain detection needed
  // MUST be checked FIRST to avoid being blocked by customDomain.isLoading or lightAuth
  if (isAgencyPreviewRoute() || isAgencyLandingRoute()) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <AgencyLandingPreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isPreview) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicWebsitePreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Landing editor iframe preview: keep it out of AuthGate/Router and heavy app providers.
  // It receives live state from the editor via postMessage and must not redirect the parent app.
  if (isLandingEditorPreview) {
    const noOp = () => {};
    return (
      <ErrorBoundary>
        <LightProviders>
          <Suspense fallback={<MinimalLoader />}>
            <PublicLandingPage
              onNavigateToLogin={noOp}
              onNavigateToRegister={noOp}
              onNavigateToBlog={noOp}
              onNavigateToArticle={noOp}
            />
          </Suspense>
        </LightProviders>
      </ErrorBoundary>
    );
  }

  // Temporary diagnostic tool (DELETE after fixing data)
  if (isDiagnoseRoute()) {
    return (
      <ErrorBoundary>
        <AppProviders>
          <Suspense fallback={<MinimalLoader />}>
            <ProjectDiagnostic />
          </Suspense>
        </AppProviders>
      </ErrorBoundary>
    );
  }

  // Public Bio Page route - no providers needed
  if (isBioRoute()) {
    const bioSlug = getBioSlugFromPathname(window.location.pathname);
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicBioPage slug={bioSlug} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Checkout Payment Link route - no providers/auth needed
  if (isCheckoutRoute()) {
    const token = window.location.pathname.split('/pay/')[1];
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <AgencyCheckoutPage token={token} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Handle custom domain detection - loading state
  if (customDomain.isLoading) {
    return <DomainLoadingPage />;
  }

  // User subdomain (username.quimera.ai) - render their published site
  if (subdomainInfo.type === 'user' && subdomainInfo.subdomain) {
    // useCustomDomain will resolve the user's project if the subdomain
    // is detected as a custom domain. If not, we pass the subdomain
    // directly to PublicWebsitePreview which resolves by username.
    if (customDomain.isCustomDomain && customDomain.projectId && customDomain.userId) {
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

    // Fallback: render with username resolution
    return (
      <ErrorBoundary>
        <Suspense fallback={<MinimalLoader />}>
          <PublicWebsitePreview
            username={subdomainInfo.subdomain}
          />
        </Suspense>
      </ErrorBoundary>
    );
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

  // Auth loading state
  if (lightAuth.isLoading) {
    return <MinimalLoader />;
  }

  // Determine if the current path is a private/admin route that requires auth.
  // If so, always use AppProviders to prevent provider tree destruction during
  // auth state resolution (lightAuth can briefly report isAuthenticated=false
  // before Supabase resolves, which would mount LightProviders then switch to
  // AppProviders — destroying the entire provider tree and causing a logout redirect).
  const currentPath = window.location.pathname;
  const currentRouteConfig = getRouteConfig(currentPath);
  const isKnownAuthRoute =
    currentRouteConfig?.type === 'private' ||
    currentRouteConfig?.type === 'admin' ||
    currentPath === '/admin' ||
    currentPath.startsWith('/admin/') ||
    currentPath.startsWith('/editor/');

  // Unauthenticated users on public routes get LightProviders (5 contexts instead of 17+)
  // This significantly reduces initial load time for login/register pages.
  // BUT: if on a known auth route, always use AppProviders — the Router inside will
  // handle the redirect to login if needed, without provider tree switching.
  if (!lightAuth.isAuthenticated && !isKnownAuthRoute) {
    return (
      <ErrorBoundary>
        <LightProviders>
          <AuthGate />
        </LightProviders>
      </ErrorBoundary>
    );
  }

  // Authenticated users (or reloading on auth routes) get full AppProviders
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthGate />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
