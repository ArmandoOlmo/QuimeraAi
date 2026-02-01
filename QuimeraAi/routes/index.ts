/**
 * Routes Index
 * Exportaciones centralizadas del sistema de routing
 */

// Config & Types
export { 
  ROUTES, 
  routeConfigs,
  getRouteConfig,
  getRouteByView,
  buildPath,
  parseParams,
  hasRouteAccess,
  getNavItems,
  getAdminSubRoutes,
} from './config';
export type { 
  RouteConfig, 
  RouteParams, 
  RouteType 
} from './config';

// Components
export { default as Router } from './Router';
export { default as LoadingScreen } from './LoadingScreen';

// Guards
export { default as AuthGuard } from './guards/AuthGuard';
export { default as RoleGuard } from './guards/RoleGuard';

// Link Component
export { default as Link } from './Link';
export { default as NavLink } from './NavLink';




















