/**
 * AuthGuard Component
 * Protege rutas que requieren autenticación
 */

import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../config';

interface AuthGuardProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isEmailVerified?: boolean;
  requireEmailVerified?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  isAuthenticated,
  isEmailVerified = false,
  requireEmailVerified = true,
  fallback = null,
  redirectTo = ROUTES.LOGIN,
}) => {
  const { replace } = useRouter();

  React.useEffect(() => {
    // Not authenticated -> redirect to login
    if (!isAuthenticated) {
      replace(redirectTo);
      return;
    }

    // Authenticated but email not verified and verification required
    if (requireEmailVerified && !isEmailVerified) {
      // Don't redirect, just show fallback (VerificationScreen handled elsewhere)
      return;
    }
  }, [isAuthenticated, isEmailVerified, requireEmailVerified, replace, redirectTo]);

  // Not authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Email verification required but not verified
  if (requireEmailVerified && !isEmailVerified) {
    return <>{fallback}</>;
  }

  // Authenticated and verified (or verification not required)
  return <>{children}</>;
};

export default AuthGuard;




















