/**
 * Router Component
 * Componente principal de enrutamiento de la aplicación
 * 
 * Performance: Uses React.lazy for code-splitting of route components
 */

import React, { useEffect, useMemo, lazy, Suspense } from 'react';
import { useRouter } from '../hooks/useRouter';
import { ROUTES, hasRouteAccess } from './config';
import { View, AdminView } from '../types/ui';

// LoadingScreen is kept synchronous as it's used as fallback
import LoadingScreen from './LoadingScreen';

// Lazy-loaded route components for code-splitting
const PublicLandingPage = lazy(() => import('../components/PublicLandingPage'));
const PublicWebsitePreview = lazy(() => import('../components/PublicWebsitePreview'));
const ModernAuth = lazy(() => import('../components/ModernAuth'));
const VerificationScreen = lazy(() => import('../components/VerificationScreen'));
const AcceptInvite = lazy(() => import('../components/auth/AcceptInvite'));

// Lazy-loaded ecommerce components
const ProductDetailPageWithCart = lazy(() => import('../components/ecommerce/ProductDetailPageWithCart'));
const CheckoutPageEnhanced = lazy(() => import('../components/ecommerce/CheckoutPageEnhanced'));

// Named exports need to be handled differently with lazy
const ProductSearchPage = lazy(() => 
  import('../components/ecommerce').then(module => ({ default: module.ProductSearchPage }))
);
const StorefrontLayout = lazy(() => 
  import('../components/ecommerce').then(module => ({ default: module.StorefrontLayout }))
);
const OrderConfirmation = lazy(() => 
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

    // Authenticated user on public routes (login/register) -> dashboard
    if (isAuthenticated && isEmailVerified && (path === '/login' || path === '/register')) {
      replace(ROUTES.DASHBOARD);
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

    // Default path handling
    if (path === '/' && isAuthenticated && isEmailVerified) {
      replace(ROUTES.DASHBOARD);
    }
  }, [
    loadingAuth,
    isAuthenticated,
    isEmailVerified,
    isPublicRoute,
    isPrivateRoute,
    isAdminRoute,
    isPreviewRoute,
    canAccessRoute,
    path,
    replace,
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
  
  // Landing page
  if (path === '/' && !isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicLandingPage 
          onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
          onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
        />
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
      />
    </Suspense>
  );
};

export default Router;









