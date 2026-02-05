/**
 * Router Component
 * Componente principal de enrutamiento de la aplicación
 * 
 * Performance: Uses React.lazy for code-splitting of route components
 */

import React, { useEffect, useMemo, Suspense } from 'react';
import { useRouter } from '../hooks/useRouter';
import { ROUTES, hasRouteAccess } from './config';
import { View, AdminView } from '../types/ui';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// LoadingScreen is kept synchronous as it's used as fallback
import LoadingScreen from './LoadingScreen';

// AppContent Provider for legal pages
import { AppContentProvider } from '../contexts/appContent';

// Lazy-loaded route components with retry logic for chunk loading failures
const PublicLandingPage = lazyWithRetry(() => import('../components/PublicLandingPage'));
const PublicBlogPage = lazyWithRetry(() => import('../components/PublicBlogPage'));
const PublicArticlePage = lazyWithRetry(() => import('../components/PublicArticlePage'));
const PublicWebsitePreview = lazyWithRetry(() => import('../components/PublicWebsitePreview'));
const ModernAuth = lazyWithRetry(() => import('../components/ModernAuth'));
const VerificationScreen = lazyWithRetry(() => import('../components/VerificationScreen'));
const AcceptInvite = lazyWithRetry(() => import('../components/auth/AcceptInvite'));

// Lazy-loaded legal pages
const PrivacyPolicyPage = lazyWithRetry(() => import('../components/legal/PrivacyPolicyPage'));
const DataDeletionPage = lazyWithRetry(() => import('../components/legal/DataDeletionPage'));
const TermsOfServicePage = lazyWithRetry(() => import('../components/legal/TermsOfServicePage'));
const CookiePolicyPage = lazyWithRetry(() => import('../components/legal/CookiePolicyPage'));
const HelpCenterPage = lazyWithRetry(() => import('../components/legal/HelpCenterPage'));
const ChangelogPage = lazyWithRetry(() => import('../components/ChangelogPage'));

// Admin pages
const SeedArticlesPage = lazyWithRetry(() => import('../components/admin/SeedArticlesPage'));

// Agency Landing Preview (for Agency Landing Editor iframe)
const AgencyLandingPreview = lazyWithRetry(() => import('../components/AgencyLandingPreview'));

// Agency Signup (Public page for agency plan registration)
const AgencySignup = lazyWithRetry(() => import('../components/AgencySignup'));


// Lazy-loaded ecommerce components
const ProductDetailPageWithCart = lazyWithRetry(() => import('../components/ecommerce/ProductDetailPageWithCart'));
const CheckoutPageEnhanced = lazyWithRetry(() => import('../components/ecommerce/CheckoutPageEnhanced'));

// Named exports need to be handled differently with lazyWithRetry
const ProductSearchPage = lazyWithRetry(() =>
  import('../components/ecommerce').then(module => ({ default: module.ProductSearchPage }))
);
const StorefrontLayout = lazyWithRetry(() =>
  import('../components/ecommerce').then(module => ({ default: module.StorefrontLayout }))
);
const OrderConfirmation = lazyWithRetry(() =>
  import('../components/ecommerce').then(module => ({ default: module.OrderConfirmation }))
);

// =============================================================================
// TYPES
// =============================================================================

export interface RouterProps {
  // Auth State
  user: { uid: string; email: string | null; emailVerified: boolean } | null;
  userRole?: string;
  loadingAuth: boolean;

  // Callbacks
  onVerificationEmailSent: (email: string | null) => void;
  verificationEmail: string | null;
  onLogout: () => Promise<void>;

  // Render props for authenticated content
  children: (props: {
    view: View;
    adminView: AdminView | null;
    projectId: string | null;
  }) => React.ReactNode;
}

// =============================================================================
// ROUTER COMPONENT
// =============================================================================

const Router: React.FC<RouterProps> = ({
  user,
  userRole,
  loadingAuth,
  onVerificationEmailSent,
  verificationEmail,
  onLogout,
  children,
}) => {
  const {
    path,
    params,
    route,
    navigate,
    replace,
    isPublicRoute,
    isPrivateRoute,
    isAdminRoute,
    isPreviewRoute,
  } = useRouter();

  // =========================================================================
  // COMPUTED AUTH STATE
  // =========================================================================

  const isAuthenticated = !!user;
  const isEmailVerified = user?.emailVerified ?? false;

  // Check if landing page preview mode is enabled (for Landing Page Editor iframe)
  const isLandingPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'landing';

  // =========================================================================
  // ROUTE ACCESS CHECK
  // =========================================================================

  const canAccessRoute = useMemo(() => {
    if (!route) return false;
    return hasRouteAccess(route, userRole, isAuthenticated, isEmailVerified);
  }, [route, userRole, isAuthenticated, isEmailVerified]);

  // =========================================================================
  // REDIRECTS
  // =========================================================================

  useEffect(() => {
    // Skip during loading
    if (loadingAuth) return;

    // Don't redirect preview routes
    if (isPreviewRoute) return;

    // Authenticated user on public routes (login/register) -> dashboard or superadmin
    if (isAuthenticated && isEmailVerified && (path === '/login' || path === '/register')) {
      if (userRole === 'owner' || userRole === 'superadmin') {
        replace(ROUTES.SUPERADMIN);
      } else {
        replace(ROUTES.DASHBOARD);
      }
      return;
    }

    // Authenticated but unverified -> stay where they are (handled by render)
    if (isAuthenticated && !isEmailVerified && !isPublicRoute && !isPreviewRoute) {
      // They need to verify email
      return;
    }

    // Unauthenticated user on private routes -> login
    if (!isAuthenticated && (isPrivateRoute || isAdminRoute)) {
      replace(ROUTES.LOGIN);
      return;
    }

    // Authenticated user without access to admin route -> dashboard
    if (isAdminRoute && isAuthenticated && !canAccessRoute) {
      replace(ROUTES.DASHBOARD);
      return;
    }

    // Default path handling - skip if preview mode
    if (path === '/' && isAuthenticated && isEmailVerified && !isLandingPreviewMode) {
      if (userRole === 'owner' || userRole === 'superadmin') {
        replace(ROUTES.SUPERADMIN);
      } else {
        replace(ROUTES.DASHBOARD);
      }
    }
  }, [
    loadingAuth,
    isAuthenticated,
    isEmailVerified,
    isPublicRoute,
    isPrivateRoute,
    isAdminRoute,
    isPreviewRoute,
    isLandingPreviewMode,
    canAccessRoute,
    path,
    replace,
    userRole,
  ]);

  // =========================================================================
  // LOADING STATE
  // =========================================================================

  if (loadingAuth) {
    return <LoadingScreen />;
  }

  // =========================================================================
  // STOREFRONT ROUTES (Public ecommerce pages)
  // =========================================================================

  const isStoreRoute = path.startsWith('/store/');

  if (isStoreRoute) {
    const pathParts = path.split('/');
    const storeId = pathParts[2];

    // /store/:storeId/checkout - Checkout page
    if (path.includes('/checkout')) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <StorefrontLayout
            storeId={storeId}
            onNavigateHome={() => navigate(`/preview/${storeId}`)}
            onNavigateToCheckout={() => navigate(`/store/${storeId}/checkout`)}
          >
            <CheckoutPageEnhanced
              storeId={storeId}
              onSuccess={(orderId) => navigate(`/store/${storeId}/order/${orderId}`)}
              onBack={() => navigate(`/store/${storeId}`)}
              onNavigateToStore={() => navigate(`/store/${storeId}`)}
            />
          </StorefrontLayout>
        </Suspense>
      );
    }

    // /store/:storeId/order/:orderId - Order confirmation page
    if (path.includes('/order/')) {
      const orderId = pathParts[4];
      return (
        <Suspense fallback={<LoadingScreen />}>
          <StorefrontLayout
            storeId={storeId}
            onNavigateHome={() => navigate(`/preview/${storeId}`)}
            onNavigateToCheckout={() => navigate(`/store/${storeId}/checkout`)}
          >
            <OrderConfirmation
              storeId={storeId}
              orderId={orderId}
              onContinueShopping={() => navigate(`/store/${storeId}`)}
              onViewOrders={() => navigate(`/store/${storeId}`)}
            />
          </StorefrontLayout>
        </Suspense>
      );
    }

    // /store/:storeId/product/:slug - Product detail page
    if (path.includes('/product/')) {
      const productSlug = pathParts[4];
      return (
        <Suspense fallback={<LoadingScreen />}>
          <StorefrontLayout
            storeId={storeId}
            onNavigateHome={() => navigate(`/preview/${storeId}`)}
            onNavigateToCheckout={() => navigate(`/store/${storeId}/checkout`)}
          >
            <ProductDetailPageWithCart
              storeId={storeId}
              productSlug={productSlug}
              onNavigateToStore={() => navigate(`/store/${storeId}`)}
              onNavigateToCategory={(categorySlug) => navigate(`/store/${storeId}/category/${categorySlug}`)}
              onNavigateToProduct={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
            />
          </StorefrontLayout>
        </Suspense>
      );
    }

    // /store/:storeId/category/:categorySlug - Category page
    if (path.includes('/category/')) {
      const categorySlug = pathParts[4];
      return (
        <Suspense fallback={<LoadingScreen />}>
          <StorefrontLayout
            storeId={storeId}
            onNavigateHome={() => navigate(`/preview/${storeId}`)}
            onNavigateToCheckout={() => navigate(`/store/${storeId}/checkout`)}
          >
            <ProductSearchPage
              storeId={storeId}
              onProductClick={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
              onBack={() => navigate(`/store/${storeId}`)}
              initialCategory={categorySlug}
            />
          </StorefrontLayout>
        </Suspense>
      );
    }

    // /store/:storeId - Main store page (product listing)
    if (pathParts.length === 3 || (pathParts.length === 4 && pathParts[3] === '')) {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <StorefrontLayout
            storeId={storeId}
            onNavigateHome={() => navigate(`/preview/${storeId}`)}
            onNavigateToCheckout={() => navigate(`/store/${storeId}/checkout`)}
          >
            <ProductSearchPage
              storeId={storeId}
              onProductClick={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
            />
          </StorefrontLayout>
        </Suspense>
      );
    }
  }

  // =========================================================================
  // PREVIEW ROUTE (No auth required)
  // =========================================================================

  if (isPreviewRoute) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicWebsitePreview />
      </Suspense>
    );
  }

  // =========================================================================
  // PUBLIC ROUTES
  // =========================================================================

  // Invite page (accept team invitation)
  if (path.startsWith('/invite/')) {
    const token = path.split('/invite/')[1];
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AcceptInvite token={token} />
      </Suspense>
    );
  }

  // Agency Landing Preview (for Agency Landing Editor iframe)
  if (path === '/agency-landing-preview') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AgencyLandingPreview />
      </Suspense>
    );
  }

  // Agency Signup (public page for agency plan registration)
  if (path === '/agency-signup') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AgencySignup />
      </Suspense>
    );
  }


  // Landing page (for unauthenticated users OR when preview=landing param is present)
  // The preview=landing param allows the Landing Page Editor to show the landing page in an iframe
  if (path === '/' && (!isAuthenticated || isLandingPreviewMode)) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicLandingPage
          onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
          onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
          onNavigateToBlog={() => navigate(ROUTES.BLOG)}
          onNavigateToArticle={(slug) => navigate(`/blog/${slug}`)}
        />
      </Suspense>
    );
  }

  // Blog page (public)
  if (path === '/blog') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicBlogPage
          onNavigateToHome={() => navigate(ROUTES.LANDING)}
          onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
          onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
          onNavigateToArticle={(slug) => navigate(`/blog/${slug}`)}
        />
      </Suspense>
    );
  }

  // Article page (public)
  if (path.startsWith('/blog/') && path !== '/blog/') {
    const slug = path.replace('/blog/', '');
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicArticlePage
          slug={slug}
          onNavigateToHome={() => navigate(ROUTES.LANDING)}
          onNavigateToBlog={() => navigate(ROUTES.BLOG)}
          onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
          onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
          onNavigateToArticle={(newSlug) => navigate(`/blog/${newSlug}`)}
        />
      </Suspense>
    );
  }

  // Privacy Policy page (public)
  if (path === '/privacy-policy') {
    return (
      <AppContentProvider>
        <Suspense fallback={<LoadingScreen />}>
          <PrivacyPolicyPage />
        </Suspense>
      </AppContentProvider>
    );
  }

  // Data Deletion page (public)
  if (path === '/data-deletion') {
    return (
      <AppContentProvider>
        <Suspense fallback={<LoadingScreen />}>
          <DataDeletionPage />
        </Suspense>
      </AppContentProvider>
    );
  }

  // Terms of Service page (public)
  if (path === '/terms-of-service') {
    return (
      <AppContentProvider>
        <Suspense fallback={<LoadingScreen />}>
          <TermsOfServicePage />
        </Suspense>
      </AppContentProvider>
    );
  }

  // Cookie Policy page (public)
  if (path === '/cookie-policy') {
    return (
      <AppContentProvider>
        <Suspense fallback={<LoadingScreen />}>
          <CookiePolicyPage />
        </Suspense>
      </AppContentProvider>
    );
  }

  // Help Center page (public)
  if (path === '/help-center') {
    return (
      <AppContentProvider>
        <Suspense fallback={<LoadingScreen />}>
          <HelpCenterPage />
        </Suspense>
      </AppContentProvider>
    );
  }

  // Changelog page (public)
  if (path === '/changelog') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ChangelogPage
          onNavigateToHome={() => navigate(ROUTES.LANDING)}
          onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
          onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
        />
      </Suspense>
    );
  }

  // Admin: Seed Help Center Articles (temporary)
  if (path === '/admin/seed-articles') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SeedArticlesPage />
      </Suspense>
    );
  }

  // Login page
  if (path === '/login' && !isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ModernAuth
          onVerificationEmailSent={onVerificationEmailSent}
          initialMode="login"
          onNavigateToLanding={() => navigate(ROUTES.LANDING)}
        />
      </Suspense>
    );
  }

  // Register page
  if (path === '/register' && !isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ModernAuth
          onVerificationEmailSent={onVerificationEmailSent}
          initialMode="register"
          onNavigateToLanding={() => navigate(ROUTES.LANDING)}
        />
      </Suspense>
    );
  }

  // =========================================================================
  // EMAIL VERIFICATION PENDING
  // =========================================================================

  if (isAuthenticated && !isEmailVerified) {
    const handleGoToLogin = async () => {
      await onLogout();
      onVerificationEmailSent(null);
      navigate(ROUTES.LOGIN);
    };
    return (
      <Suspense fallback={<LoadingScreen />}>
        <VerificationScreen email={user!.email!} onGoToLogin={handleGoToLogin} />
      </Suspense>
    );
  }

  // Verification email sent (not logged in)
  if (!isAuthenticated && verificationEmail) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <VerificationScreen
          email={verificationEmail}
          onGoToLogin={() => {
            onVerificationEmailSent(null);
            navigate(ROUTES.LOGIN);
          }}
        />
      </Suspense>
    );
  }

  // =========================================================================
  // AUTHENTICATED ROUTES
  // =========================================================================

  if (isAuthenticated && isEmailVerified) {
    // Determine the view based on route
    const view: View = route?.view || 'dashboard';
    const adminView: AdminView | null = route?.adminView || null;
    const projectId = params.projectId || null;

    return <>{children({ view, adminView, projectId })}</>;
  }

  // =========================================================================
  // FALLBACK (redirect to landing)
  // =========================================================================

  return (
    <Suspense fallback={<LoadingScreen />}>
      <PublicLandingPage
        onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
        onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
        onNavigateToBlog={() => navigate(ROUTES.BLOG)}
        onNavigateToArticle={(slug) => navigate(`/blog/${slug}`)}
      />
    </Suspense>
  );
};

export default Router;









