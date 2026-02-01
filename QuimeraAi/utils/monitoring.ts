/**
 * Monitoring and Error Tracking Utility
 * Integrates with Sentry for error tracking and performance monitoring
 */

// NOTE: To use Sentry, install the package:
// npm install @sentry/react

/**
 * Initialize Sentry monitoring
 * Call this in your main.tsx or App.tsx
 */
export function initializeMonitoring() {
  // Check if Sentry DSN is configured
  const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('Sentry DSN not configured. Error tracking is disabled.');
    return;
  }

  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    
    // Performance Monitoring
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring sample rate
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Session Replay sample rate
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: `quimera-ai@${import.meta.env.VITE_APP_VERSION || 'dev'}`,
    
    // Custom beforeSend hook
    beforeSend(event, hint) {
      // Filter out non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        
        // Ignore network errors in development
        if (import.meta.env.MODE === 'development' && error?.message?.includes('Network')) {
          return null;
        }
      }
      
      return event;
    },
  });
  */

  console.log('Monitoring initialized');
}

/**
 * Log an error to Sentry
 */
export function logError(error: Error, context?: Record<string, any>) {
  console.error('Error logged:', error, context);
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.captureException(error, {
    extra: context,
  });
  */
}

/**
 * Log a message to Sentry
 */
export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  console.log(`[${level.toUpperCase()}] ${message}`, context);
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
  */
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  console.log('User context set:', user);
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  */
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  console.log('User context cleared');
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.setUser(null);
  */
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  console.log(`[Breadcrumb] ${category || 'general'}: ${message}`, data);
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.addBreadcrumb({
    message,
    category: category || 'general',
    data,
    level: 'info',
  });
  */
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  console.log(`[Event] ${eventName}`, properties);
  
  // Uncomment when @sentry/react is installed:
  /*
  import * as Sentry from '@sentry/react';
  
  Sentry.captureMessage(`Event: ${eventName}`, {
    level: 'info',
    extra: properties,
  });
  */
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string = 'task') {
  console.log(`[Transaction Start] ${name} (${op})`);
  
  const startTime = Date.now();
  
  return {
    finish: () => {
      const duration = Date.now() - startTime;
      console.log(`[Transaction End] ${name} took ${duration}ms`);
      
      // Uncomment when @sentry/react is installed:
      /*
      import * as Sentry from '@sentry/react';
      
      const transaction = Sentry.startTransaction({ name, op });
      transaction.finish();
      */
    },
  };
}

/**
 * Wrap an async function with error tracking
 */
export function monitorAsync<T>(
  fn: () => Promise<T>,
  context?: { operation: string; data?: Record<string, any> }
): Promise<T> {
  return fn().catch((error) => {
    logError(error, {
      operation: context?.operation || 'unknown',
      ...context?.data,
    });
    throw error;
  });
}

/**
 * Track Firebase errors
 */
export function trackFirebaseError(error: any, operation: string) {
  const firebaseError = {
    code: error.code,
    message: error.message,
    operation,
  };
  
  logError(new Error(`Firebase Error: ${operation}`), firebaseError);
}

/**
 * Track API errors
 */
export function trackAPIError(error: any, endpoint: string, method: string = 'GET') {
  const apiError = {
    endpoint,
    method,
    status: error.status || error.response?.status,
    message: error.message,
  };
  
  logError(new Error(`API Error: ${endpoint}`), apiError);
}

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  private measurements: Map<string, number> = new Map();

  start(label: string) {
    this.measurements.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`No start time found for "${label}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(label);

    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);

    // Track in Sentry
    trackEvent('performance_measurement', {
      label,
      duration,
    });

    return duration;
  }

  measure(label: string, fn: () => any): any {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

