import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../utils/monitoring';
import { isChunkLoadError, ChunkLoadError } from '../utils/lazyWithRetry';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const DEFAULT_APP_ICON_URL = '/logos/quimera-icon.svg';

const updateCopy = {
  es: {
    title: 'Nueva versión disponible',
    message: 'Hay una actualización lista para Quimera.ai. Actualiza la aplicación para cargar los últimos cambios.',
    refresh: 'Actualizar ahora',
    home: 'Ir al inicio',
    help: 'Esto puede pasar cuando publicamos cambios mientras estás usando la aplicación. Tus datos están seguros.',
  },
  en: {
    title: 'New version available',
    message: 'An update is ready for Quimera.ai. Refresh the app to load the latest changes.',
    refresh: 'Refresh now',
    home: 'Go to homepage',
    help: "This can happen when we publish changes while you're using the app. Your data is safe.",
  },
};

function getUpdateCopy() {
  if (typeof window === 'undefined') return updateCopy.es;

  const preferredLanguage = (() => {
    try {
      return localStorage.getItem('i18nextLng') || document.documentElement.lang || navigator.language || 'es';
    } catch {
      return document.documentElement.lang || navigator.language || 'es';
    }
  })();

  return preferredLanguage.toLowerCase().startsWith('en') ? updateCopy.en : updateCopy.es;
}

function getAppIconUrl() {
  if (typeof document === 'undefined') return DEFAULT_APP_ICON_URL;

  const iconLink = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );

  return iconLink?.href || DEFAULT_APP_ICON_URL;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Integrates with Sentry for error tracking
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunk = isChunkLoadError(error) || error instanceof ChunkLoadError;
    return {
      hasError: true,
      error,
      errorInfo: null,
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunk = isChunkLoadError(error) || error instanceof ChunkLoadError;
    
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Log to Sentry (with extra context for chunk errors)
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      isChunkLoadError: isChunk,
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      isChunkError: isChunk,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  /**
   * Hard reload with cache clearing - specifically for chunk loading errors
   */
  handleHardReload = async () => {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Unregister service workers
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations) {
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // Clear session storage flag that prevents reload loops
      sessionStorage.removeItem('chunk_reload_attempted');
      
    } catch (e) {
      console.warn('Could not clear caches:', e);
    }
    
    // Hard reload bypassing cache
    window.location.href = window.location.href.split('?')[0] + '?cacheBust=' + Date.now();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Special UI for chunk loading errors (deployment mismatch)
      if (this.state.isChunkError) {
        const copy = getUpdateCopy();
        const appIconUrl = getAppIconUrl();

        return (
          <div className="min-h-screen bg-q-bg text-q-text flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-q-text/60 backdrop-blur-sm" aria-hidden="true" />

            <div
              className="relative w-full max-w-md overflow-hidden rounded-[var(--radius-panel)] border border-border-subtle bg-q-surface shadow-[var(--shadow-elevated)] animate-fade-in-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quimera-update-title"
            >
              <div className="flex flex-col items-center px-6 py-7 text-center sm:px-8">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] border border-q-accent/25 bg-q-accent/10 shadow-sm">
                  <img
                    src={appIconUrl}
                    alt="Quimera.ai"
                    className="h-11 w-11 object-contain drop-shadow-[0_0_18px_rgba(251,185,43,0.28)]"
                    width={44}
                    height={44}
                    loading="eager"
                    decoding="sync"
                  />
                </div>

                <p className="mb-3 inline-flex items-center rounded-md border border-q-border bg-q-surface-overlay px-2.5 py-1 text-xs font-semibold text-q-text-muted">
                  Quimera.ai
                </p>

                <h1 id="quimera-update-title" className="text-xl font-semibold leading-tight text-q-text sm:text-2xl">
                  {copy.title}
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-q-text-secondary">
                  {copy.message}
                </p>

                <div className="mt-6 flex w-full flex-col gap-2.5">
                  <button
                    onClick={this.handleHardReload}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--q-radius-md)] bg-q-accent px-4 py-2.5 text-sm font-semibold text-q-text-on-accent transition-all hover:shadow-lg hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                  >
                    <RefreshCw size={18} />
                    {copy.refresh}
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface-overlay px-4 py-2.5 text-sm font-semibold text-q-text-secondary transition-colors hover:border-q-border-strong hover:text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/30"
                  >
                    <Home size={18} />
                    {copy.home}
                  </button>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-q-text-muted">
                  {copy.help}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // Default error UI for other errors
      return (
        <div className="min-h-screen bg-q-bg flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-q-surface border border-q-border rounded-lg p-8 shadow-xl">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertTriangle size={64} className="text-red-400" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-q-text text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-q-text-secondary text-center mb-6">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </p>

            {/* Error Details */}
            {this.state.error && (
              <div className="bg-q-bg border border-q-border rounded-lg p-4 mb-6 overflow-auto max-h-64">
                <h3 className="font-bold text-red-400 mb-2">Error Details:</h3>
                <pre className="text-sm text-q-text-secondary whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <h3 className="font-bold text-red-400 mt-4 mb-2">Component Stack:</h3>
                    <pre className="text-xs text-q-text-secondary whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-q-accent text-q-bg font-bold rounded-lg hover:bg-opacity-90 transition-all"
              >
                <RefreshCw size={20} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-q-bg border border-q-border text-q-text font-bold rounded-lg hover:bg-q-surface-overlay transition-all"
              >
                <RefreshCw size={20} />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-q-bg border border-q-border text-q-text font-bold rounded-lg hover:bg-q-surface-overlay transition-all"
              >
                <Home size={20} />
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="text-sm text-q-text-secondary text-center mt-6">
              If the problem persists, please contact support with the error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook-based Error Boundary (functional component alternative)
 * Note: This is a simplified version for demonstration
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      logError(error, { source: 'useErrorHandler' });
    }
  }, [error]);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, resetError };
}
