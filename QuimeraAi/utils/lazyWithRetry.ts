/**
 * Lazy Loading with Retry Logic
 * 
 * This utility handles the "Failed to fetch dynamically imported module" error
 * that occurs when:
 * 1. A new deployment changes chunk hashes
 * 2. User's browser has cached old HTML referencing old chunk names
 * 3. Network issues cause intermittent failures
 * 
 * Solution: Retry the import with cache-busting, and auto-reload if all retries fail
 */

import { lazy, ComponentType } from 'react';

interface RetryOptions {
  retries?: number;
  interval?: number;
  onError?: (error: Error, attempt: number) => void;
}

function canAutoReloadForChunkError(): boolean {
  if (typeof window === 'undefined') return false;

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  if (localHosts.has(window.location.hostname)) return false;

  return true;
}

/**
 * Checks if an error is a chunk / dynamic-import loading failure.
 *
 * Important: do NOT treat every "Failed to fetch" as a chunk error — that is the
 * generic message for failed `fetch()` calls (APIs, image proxy, etc.) and will
 * mis-trigger the "New Version Available" UI and auto-reload logic.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  if (error.name === 'ChunkLoadError') {
    return true;
  }

  const message = error.message.toLowerCase();

  const explicitChunkOrImportSignals = [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'loading chunk',
    'loading css chunk',
    'dynamically imported module',
    'importing a module script failed',
    'unable to preload css',
    'importmap',
  ];

  if (explicitChunkOrImportSignals.some((s) => message.includes(s))) {
    return true;
  }

  // "Failed to fetch" only when clearly tied to scripts/modules (not generic API fetch)
  if (message.includes('failed to fetch')) {
    const moduleContext =
      message.includes('module') ||
      message.includes('chunk') ||
      message.includes('import') ||
      message.includes('script') ||
      /\.m?js(\?|$)/i.test(message);
    return moduleContext;
  }

  return false;
}

/**
 * Creates a lazy-loaded component with retry logic
 * 
 * @param componentImport - Dynamic import function, e.g., () => import('./MyComponent')
 * @param options - Retry configuration
 * @returns Lazy component with retry logic
 * 
 * @example
 * const MyComponent = lazyWithRetry(() => import('./MyComponent'));
 * // or with custom options
 * const MyComponent = lazyWithRetry(() => import('./MyComponent'), { retries: 5 });
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const { retries = 3, interval = 1500, onError } = options;

  return lazy(async () => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add cache-busting query parameter on retry attempts
        if (attempt > 1) {
          // Small delay between retries
          await new Promise(resolve => setTimeout(resolve, interval));
          
          console.log(`[lazyWithRetry] Retry attempt ${attempt}/${retries}`);
        }

        const component = await componentImport();
        return component;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(
          `[lazyWithRetry] Failed to load module (attempt ${attempt}/${retries}):`,
          lastError.message
        );
        
        onError?.(lastError, attempt);

        // On subsequent attempts, try to bust the cache by reloading service worker
        if (attempt < retries && isChunkLoadError(lastError)) {
          try {
            // Unregister service workers to clear cached assets
            const registrations = await navigator.serviceWorker?.getRegistrations();
            if (registrations) {
              for (const registration of registrations) {
                await registration.unregister();
              }
              console.log('[lazyWithRetry] Cleared service worker registrations');
            }
          } catch (swError) {
            console.warn('[lazyWithRetry] Could not unregister service workers:', swError);
          }
        }
      }
    }

    // All retries failed - check if it's a chunk loading error
    if (lastError && isChunkLoadError(lastError) && canAutoReloadForChunkError()) {
      console.error('[lazyWithRetry] Chunk loading failed after all retries. Triggering page reload...');
      
      // Clear caches before reload
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('[lazyWithRetry] Cleared browser caches');
        }
      } catch (cacheError) {
        console.warn('[lazyWithRetry] Could not clear caches:', cacheError);
      }

      // Prevent infinite reload loop by checking sessionStorage
      const reloadKey = 'chunk_reload_attempted';
      const reloadAttempts = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      
      if (reloadAttempts < 2) {
        sessionStorage.setItem(reloadKey, String(reloadAttempts + 1));
        
        // Hard reload to bypass cache
        window.location.reload();
        
        // Return a "never resolving" promise to prevent error during reload
        return new Promise(() => {});
      } else {
        // Clear the flag so future visits can try again
        sessionStorage.removeItem(reloadKey);
        
        // Show a helpful error to the user
        throw new ChunkLoadError(
          'Unable to load the application. Please clear your browser cache and refresh the page.',
          lastError
        );
      }
    }

    // Re-throw the last error
    throw lastError;
  });
}

/**
 * Custom error class for chunk loading failures
 */
export class ChunkLoadError extends Error {
  public originalError: Error;
  public isChunkLoadError = true;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'ChunkLoadError';
    this.originalError = originalError;
  }
}

/**
 * Higher-order function to wrap existing lazy imports
 * Useful for migrating existing code
 * 
 * @example
 * // Before:
 * const MyComponent = lazy(() => import('./MyComponent'));
 * 
 * // After:
 * const MyComponent = withRetry(() => import('./MyComponent'));
 */
export const withRetry = lazyWithRetry;

export default lazyWithRetry;
