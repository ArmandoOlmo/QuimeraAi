/**
 * RoleGuard Component
 * Protege rutas que requieren roles específicos
 */

import React from 'react';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../config';

interface RoleGuardProps {
  children: React.ReactNode;
  userRole?: string;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  userRole,
  allowedRoles,
  fallback = null,
  redirectTo = ROUTES.DASHBOARD,
}) => {
  const { replace } = useRouter();

  const hasAccess = React.useMemo(() => {
    if (!allowedRoles.length) return true;
    return allowedRoles.includes(userRole || '');
  }, [userRole, allowedRoles]);

  React.useEffect(() => {
    if (!hasAccess) {
      replace(redirectTo);
    }
  }, [hasAccess, replace, redirectTo]);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;

/**
 * HOC version for convenience
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: string[]
) {
  return function WithRoleGuard(props: P & { userRole?: string }) {
    return (
      <RoleGuard userRole={props.userRole} allowedRoles={allowedRoles}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}




















