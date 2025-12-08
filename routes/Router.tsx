/**
 * Router Component
 * Componente principal de enrutamiento de la aplicación
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '../hooks/useRouter';
import { ROUTES, hasRouteAccess } from './config';
import { View, AdminView } from '../types/ui';

// Components
import PublicLandingPage from '../components/PublicLandingPage';
import PublicWebsitePreview from '../components/PublicWebsitePreview';
import ModernAuth from '../components/ModernAuth';
import VerificationScreen from '../components/VerificationScreen';
import LoadingScreen from './LoadingScreen';
import ProductDetailPage from '../components/ecommerce/ProductDetailPage';
import { ProductSearchPage, StorefrontLayout } from '../components/ecommerce';

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
    
    // /store/:storeId/product/:slug - Product detail page
    if (path.includes('/product/')) {
      const productSlug = pathParts[4];
      return (
        <StorefrontLayout 
          storeId={storeId}
          onNavigateHome={() => navigate(`/preview/${storeId}`)}
        >
          <ProductDetailPage
            storeId={storeId}
            productSlug={productSlug}
            onNavigateToStore={() => navigate(`/store/${storeId}`)}
            onNavigateToCategory={(categorySlug) => navigate(`/store/${storeId}/category/${categorySlug}`)}
            onNavigateToProduct={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
          />
        </StorefrontLayout>
      );
    }
    
    // /store/:storeId/category/:categorySlug - Category page
    if (path.includes('/category/')) {
      const categorySlug = pathParts[4];
      return (
        <StorefrontLayout 
          storeId={storeId}
          onNavigateHome={() => navigate(`/preview/${storeId}`)}
        >
          <ProductSearchPage
            storeId={storeId}
            onProductClick={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
            onBack={() => navigate(`/store/${storeId}`)}
            initialCategory={categorySlug}
          />
        </StorefrontLayout>
      );
    }
    
    // /store/:storeId - Main store page (product listing)
    if (pathParts.length === 3 || (pathParts.length === 4 && pathParts[3] === '')) {
      return (
        <StorefrontLayout 
          storeId={storeId}
          onNavigateHome={() => navigate(`/preview/${storeId}`)}
        >
          <ProductSearchPage
            storeId={storeId}
            onProductClick={(slug) => navigate(`/store/${storeId}/product/${slug}`)}
          />
        </StorefrontLayout>
      );
    }
  }

  // =========================================================================
  // PREVIEW ROUTE (No auth required)
  // =========================================================================
  
  if (isPreviewRoute) {
    return <PublicWebsitePreview />;
  }

  // =========================================================================
  // PUBLIC ROUTES
  // =========================================================================
  
  // Landing page
  if (path === '/' && !isAuthenticated) {
    return (
      <PublicLandingPage 
        onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
        onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
      />
    );
  }

  // Login page
  if (path === '/login' && !isAuthenticated) {
    return (
      <ModernAuth 
        onVerificationEmailSent={onVerificationEmailSent}
        initialMode="login"
        onNavigateToLanding={() => navigate(ROUTES.LANDING)}
      />
    );
  }

  // Register page
  if (path === '/register' && !isAuthenticated) {
    return (
      <ModernAuth 
        onVerificationEmailSent={onVerificationEmailSent}
        initialMode="register"
        onNavigateToLanding={() => navigate(ROUTES.LANDING)}
      />
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
    return <VerificationScreen email={user!.email!} onGoToLogin={handleGoToLogin} />;
  }

  // Verification email sent (not logged in)
  if (!isAuthenticated && verificationEmail) {
    return (
      <VerificationScreen 
        email={verificationEmail} 
        onGoToLogin={() => {
          onVerificationEmailSent(null);
          navigate(ROUTES.LOGIN);
        }} 
      />
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
    <PublicLandingPage 
      onNavigateToLogin={() => navigate(ROUTES.LOGIN)}
      onNavigateToRegister={() => navigate(ROUTES.REGISTER)}
    />
  );
};

export default Router;









