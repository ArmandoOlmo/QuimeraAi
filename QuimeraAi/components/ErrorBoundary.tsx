import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../utils/monitoring';
import { isChunkLoadError, ChunkLoadError } from '../utils/lazyWithRetry';
import { AlertTriangle, RefreshCw, Home, Download } from 'lucide-react';

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
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur">
              {/* Update Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-500/20 rounded-full animate-pulse">
                  <Download size={56} className="text-blue-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white text-center mb-3">
                New Version Available
              </h1>

              {/* Message */}
              <p className="text-slate-300 text-center mb-6 leading-relaxed">
                We've deployed a new version of the app. Please refresh to load the latest updates.
              </p>

              {/* Primary Action */}
              <button
                onClick={this.handleHardReload}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
              >
                <RefreshCw size={20} />
                Refresh Now
              </button>

              {/* Secondary Action */}
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 mt-3 text-slate-400 hover:text-white transition-colors"
              >
                <Home size={18} />
                Go to Homepage
              </button>

              {/* Help Text */}
              <p className="text-xs text-slate-500 text-center mt-6">
                This happens when we update the app while you're using it. Your data is safe.
              </p>
            </div>
          </div>
        );
      }

      // Default error UI for other errors
      return (
        <div className="min-h-screen bg-editor-bg flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-editor-panel-bg border border-editor-border rounded-lg p-8 shadow-xl">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertTriangle size={64} className="text-red-400" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-editor-text-primary text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-editor-text-secondary text-center mb-6">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </p>

            {/* Error Details */}
            {this.state.error && (
              <div className="bg-editor-bg border border-editor-border rounded-lg p-4 mb-6 overflow-auto max-h-64">
                <h3 className="font-bold text-red-400 mb-2">Error Details:</h3>
                <pre className="text-sm text-editor-text-secondary whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <h3 className="font-bold text-red-400 mt-4 mb-2">Component Stack:</h3>
                    <pre className="text-xs text-editor-text-secondary whitespace-pre-wrap">
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
                className="flex items-center justify-center gap-2 px-6 py-3 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all"
              >
                <RefreshCw size={20} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-editor-bg border border-editor-border text-editor-text-primary font-bold rounded-lg hover:bg-editor-border transition-all"
              >
                <RefreshCw size={20} />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-editor-bg border border-editor-border text-editor-text-primary font-bold rounded-lg hover:bg-editor-border transition-all"
              >
                <Home size={20} />
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="text-sm text-editor-text-secondary text-center mt-6">
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

