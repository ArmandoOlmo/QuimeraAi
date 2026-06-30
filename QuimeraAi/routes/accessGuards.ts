import { ROUTES } from './config';

interface ScopedAccessDeniedRouteInput {
  path: string;
  isAuthenticated: boolean;
}

export const shouldPreserveScopedAccessDeniedRoute = ({
  path,
  isAuthenticated,
}: ScopedAccessDeniedRouteInput): boolean => (
  isAuthenticated &&
  path.startsWith(`${ROUTES.ECOMMERCE}/`)
);
