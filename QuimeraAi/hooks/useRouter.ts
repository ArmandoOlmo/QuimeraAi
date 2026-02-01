/**
 * useRouter Hook
 * Hook centralizado para manejo de navegación y routing
 * Usa History API para URLs limpias (sin #)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ROUTES, 
  RouteConfig, 
  RouteParams, 
  getRouteConfig, 
  buildPath, 
  parseParams,
  getRouteByView
} from '../routes/config';
import { View, AdminView } from '../types/ui';

// =============================================================================
// TYPES
// =============================================================================

export interface RouterState {
  path: string;
  params: RouteParams;
  route: RouteConfig | null;
  query: URLSearchParams;
}

export interface RouterActions {
  navigate: (path: string, params?: RouteParams) => void;
  navigateToView: (view: View, adminView?: AdminView) => void;
  navigateToEditor: (projectId: string) => void;
  navigateToPreview: (projectId: string) => void;
  goBack: () => void;
  goForward: () => void;
  replace: (path: string, params?: RouteParams) => void;
  setQueryParam: (key: string, value: string | null) => void;
  getQueryParam: (key: string) => string | null;
}

export interface UseRouterReturn extends RouterState, RouterActions {
  isPublicRoute: boolean;
  isPrivateRoute: boolean;
  isAdminRoute: boolean;
  isPreviewRoute: boolean;
  isEditorRoute: boolean;
}

// =============================================================================
// PATH UTILS (History API - Clean URLs)
// =============================================================================

/**
 * Get the current path from window.location
 */
function getCurrentPath(): string {
  return window.location.pathname || '/';
}

/**
 * Get query params from URL
 */
function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Navigate to a new path using History API
 */
function navigateTo(path: string): void {
  window.history.pushState(null, '', path);
  // Dispatch popstate event to notify listeners
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Replace current path without adding to history
 */
function replacePath(path: string): void {
  window.history.replaceState(null, '', path);
  // Dispatch popstate event to notify listeners
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Get path without query string
 */
function getPathWithoutQuery(fullPath: string): string {
  const queryIndex = fullPath.indexOf('?');
  return queryIndex === -1 ? fullPath : fullPath.slice(0, queryIndex);
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useRouter(): UseRouterReturn {
  // =========================================================================
  // STATE
  // =========================================================================
  
  const [state, setState] = useState<RouterState>(() => {
    const fullPath = getCurrentPath();
    const path = getPathWithoutQuery(fullPath);
    const route = getRouteConfig(path);
    const params = route ? parseParams(route.path, path) : {};
    const query = getQueryParams();
    
    return { path, params, route, query };
  });

  // =========================================================================
  // SYNC WITH NAVIGATION CHANGES
  // =========================================================================
  
  useEffect(() => {
    const handleNavigation = () => {
      const fullPath = getCurrentPath();
      const path = getPathWithoutQuery(fullPath);
      const route = getRouteConfig(path);
      const params = route ? parseParams(route.path, path) : {};
      const query = getQueryParams();
      
      setState({ path, params, route, query });
    };

    // Listen to popstate (back/forward buttons and our custom navigation)
    window.addEventListener('popstate', handleNavigation);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================
  
  const isPublicRoute = useMemo(() => {
    return state.route?.type === 'public';
  }, [state.route]);

  const isPrivateRoute = useMemo(() => {
    return state.route?.type === 'private';
  }, [state.route]);

  const isAdminRoute = useMemo(() => {
    return state.route?.type === 'admin';
  }, [state.route]);

  const isPreviewRoute = useMemo(() => {
    return state.route?.type === 'preview' || state.path.startsWith('/preview/');
  }, [state.route, state.path]);

  const isEditorRoute = useMemo(() => {
    return state.path.startsWith('/editor/');
  }, [state.path]);

  // =========================================================================
  // ACTIONS
  // =========================================================================
  
  const navigate = useCallback((path: string, params?: RouteParams) => {
    const builtPath = buildPath(path, params);
    navigateTo(builtPath);
  }, []);

  const navigateToView = useCallback((view: View, adminView?: AdminView) => {
    const route = getRouteByView(view, adminView);
    if (route) {
      navigate(route.path);
    } else {
      // Fallback to dashboard if route not found
      console.warn(`Route not found for view: ${view}, adminView: ${adminView}`);
      navigate(ROUTES.DASHBOARD);
    }
  }, [navigate]);

  const navigateToEditor = useCallback((projectId: string) => {
    navigate(ROUTES.EDITOR, { projectId });
  }, [navigate]);

  const navigateToPreview = useCallback((projectId: string) => {
    navigate(ROUTES.PREVIEW, { projectId });
  }, [navigate]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  const replace = useCallback((path: string, params?: RouteParams) => {
    const builtPath = buildPath(path, params);
    replacePath(builtPath);
  }, []);

  const setQueryParam = useCallback((key: string, value: string | null) => {
    const query = new URLSearchParams(window.location.search);
    if (value === null) {
      query.delete(key);
    } else {
      query.set(key, value);
    }
    
    const queryString = query.toString();
    const newPath = queryString ? `${state.path}?${queryString}` : state.path;
    navigateTo(newPath);
  }, [state.path]);

  const getQueryParam = useCallback((key: string): string | null => {
    return state.query.get(key);
  }, [state.query]);

  // =========================================================================
  // RETURN
  // =========================================================================
  
  return {
    // State
    ...state,
    
    // Computed
    isPublicRoute,
    isPrivateRoute,
    isAdminRoute,
    isPreviewRoute,
    isEditorRoute,
    
    // Actions
    navigate,
    navigateToView,
    navigateToEditor,
    navigateToPreview,
    goBack,
    goForward,
    replace,
    setQueryParam,
    getQueryParam,
  };
}

// =============================================================================
// CONVENIENCE HOOK FOR ROUTE PARAMS
// =============================================================================

export function useRouteParams(): RouteParams {
  const { params } = useRouter();
  return params;
}

// =============================================================================
// CONVENIENCE HOOK FOR QUERY PARAMS
// =============================================================================

export function useQueryParams() {
  const { query, setQueryParam, getQueryParam } = useRouter();
  return { query, setQueryParam, getQueryParam };
}

// =============================================================================
// NAVIGATION HELPER (for use outside React components)
// =============================================================================

export const router = {
  navigate(path: string, params?: RouteParams): void {
    const builtPath = buildPath(path, params);
    navigateTo(builtPath);
  },
  
  navigateToView(view: View, adminView?: AdminView): void {
    const route = getRouteByView(view, adminView);
    if (route) {
      navigateTo(route.path);
    }
  },
  
  navigateToEditor(projectId: string): void {
    const path = buildPath(ROUTES.EDITOR, { projectId });
    navigateTo(path);
  },
  
  navigateToPreview(projectId: string): void {
    const path = buildPath(ROUTES.PREVIEW, { projectId });
    navigateTo(path);
  },
  
  getCurrentPath(): string {
    return getCurrentPath();
  },
  
  getParams(): RouteParams {
    const path = getPathWithoutQuery(getCurrentPath());
    const route = getRouteConfig(path);
    return route ? parseParams(route.path, path) : {};
  },
  
  replace(path: string, params?: RouteParams): void {
    const builtPath = buildPath(path, params);
    replacePath(builtPath);
  },
};

export default useRouter;
