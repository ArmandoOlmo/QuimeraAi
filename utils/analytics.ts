// Analytics functionality - gracefully degrades if Firebase Analytics is not available
let analytics: any = null;
let analyticsInitialized = false;

// Initialize analytics asynchronously
const initAnalytics = async () => {
  if (analyticsInitialized) return analytics;
  analyticsInitialized = true;
  
  try {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      const { getAnalytics } = await import('firebase/analytics');
      const { app } = await import('../firebase');
      analytics = getAnalytics(app);
    }
  } catch (error) {
    console.warn('Firebase Analytics not available, tracking disabled:', error);
    analytics = null;
  }
  return analytics;
};

// Auto-initialize on module load (in browser only)
if (typeof window !== 'undefined') {
  initAnalytics();
}

// Analytics Event Types
export type AnalyticsEvent = 
  | 'project_opened'
  | 'project_created'
  | 'project_deleted'
  | 'project_published'
  | 'project_renamed'
  | 'search_performed'
  | 'filter_applied'
  | 'sort_changed'
  | 'view_mode_changed'
  | 'component_added'
  | 'component_removed'
  | 'theme_changed'
  | 'image_uploaded'
  | 'template_used'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_abandoned'
  | 'page_view'
  | 'dashboard_view'
  | 'editor_view'
  | 'settings_changed';

// Log custom event
export const logEvent = async (eventName: AnalyticsEvent, params?: Record<string, any>) => {
  const analyticsInstance = await initAnalytics();
  if (!analyticsInstance) return;
  
  try {
    const { logEvent: firebaseLogEvent } = await import('firebase/analytics');
    // Use 'as any' to allow custom event names that aren't in the standard Firebase Analytics types
    firebaseLogEvent(analyticsInstance, eventName as any, {
      ...params,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

// Set user properties
export const setAnalyticsUser = async (userId: string, properties?: Record<string, any>) => {
  const analyticsInstance = await initAnalytics();
  if (!analyticsInstance) return;
  
  try {
    const { setUserProperties } = await import('firebase/analytics');
    setUserProperties(analyticsInstance, {
      user_id: userId,
      ...properties,
    });
  } catch (error) {
    console.error('Analytics user properties error:', error);
  }
};

// Project Events
export const trackProjectOpened = (projectId: string, projectName: string, projectStatus: string) => {
  logEvent('project_opened', {
    project_id: projectId,
    project_name: projectName,
    project_status: projectStatus,
  });
};

export const trackProjectCreated = (projectId: string, projectName: string, fromTemplate: boolean, templateId?: string) => {
  logEvent('project_created', {
    project_id: projectId,
    project_name: projectName,
    from_template: fromTemplate,
    template_id: templateId,
  });
};

export const trackProjectDeleted = (projectId: string, projectName: string) => {
  logEvent('project_deleted', {
    project_id: projectId,
    project_name: projectName,
  });
};

export const trackProjectPublished = (projectId: string, projectName: string) => {
  logEvent('project_published', {
    project_id: projectId,
    project_name: projectName,
  });
};

// Dashboard Events
export const trackSearchPerformed = (query: string, resultsCount: number) => {
  logEvent('search_performed', {
    search_query: query,
    results_count: resultsCount,
  });
};

export const trackFilterApplied = (filterType: string, filterValue: string, resultsCount: number) => {
  logEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
    results_count: resultsCount,
  });
};

export const trackSortChanged = (sortBy: string, sortOrder: string) => {
  logEvent('sort_changed', {
    sort_by: sortBy,
    sort_order: sortOrder,
  });
};

export const trackViewModeChanged = (viewMode: 'grid' | 'list') => {
  logEvent('view_mode_changed', {
    view_mode: viewMode,
  });
};

// Page Views
export const trackPageView = (pageName: string, additionalParams?: Record<string, any>) => {
  logEvent('page_view', {
    page_name: pageName,
    ...additionalParams,
  });
};

export const trackDashboardView = (view: string) => {
  logEvent('dashboard_view', {
    dashboard_view: view,
  });
};

// Onboarding Events
export const trackOnboardingStarted = () => {
  logEvent('onboarding_started', {});
};

export const trackOnboardingCompleted = (projectId: string, projectName: string, duration: number) => {
  logEvent('onboarding_completed', {
    project_id: projectId,
    project_name: projectName,
    duration_seconds: duration,
  });
};

export const trackOnboardingAbandoned = (step: string) => {
  logEvent('onboarding_abandoned', {
    abandoned_at_step: step,
  });
};

// Component Events
export const trackComponentAdded = (componentType: string, projectId: string) => {
  logEvent('component_added', {
    component_type: componentType,
    project_id: projectId,
  });
};

export const trackComponentRemoved = (componentType: string, projectId: string) => {
  logEvent('component_removed', {
    component_type: componentType,
    project_id: projectId,
  });
};

// Theme Events
export const trackThemeChanged = (themeMode: string) => {
  logEvent('theme_changed', {
    theme_mode: themeMode,
  });
};

// Image Events
export const trackImageUploaded = (fileType: string, fileSize: number) => {
  logEvent('image_uploaded', {
    file_type: fileType,
    file_size_kb: Math.round(fileSize / 1024),
  });
};

