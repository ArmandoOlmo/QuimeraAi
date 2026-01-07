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

/**
 * Checks if an error is a chunk loading failure
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load') ||
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    // Vite-specific errors
    message.includes('unable to preload css') ||
    message.includes('failed to fetch')
  );
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:59',message:'lazyWithRetry invoked',data:{retries,interval,reloadAttempts:sessionStorage.getItem('chunk_reload_attempted')||'0'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add cache-busting query parameter on retry attempts
        if (attempt > 1) {
          // Small delay between retries
          await new Promise(resolve => setTimeout(resolve, interval));
          
          console.log(`[lazyWithRetry] Retry attempt ${attempt}/${retries}`);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:71',message:'Retry attempt starting',data:{attempt,retries},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }

        const component = await componentImport();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:78',message:'Component loaded successfully',data:{attempt},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return component;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(
          `[lazyWithRetry] Failed to load module (attempt ${attempt}/${retries}):`,
          lastError.message
        );
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:89',message:'Module load failed',data:{attempt,retries,errorMessage:lastError.message,isChunkError:isChunkLoadError(lastError)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        
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
    if (lastError && isChunkLoadError(lastError)) {
      console.error('[lazyWithRetry] Chunk loading failed after all retries. Triggering page reload...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:108',message:'All retries failed - chunk error detected',data:{errorMessage:lastError.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:126',message:'Checking reload attempts',data:{reloadAttempts,willReload:reloadAttempts<2},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      if (reloadAttempts < 2) {
        sessionStorage.setItem(reloadKey, String(reloadAttempts + 1));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:133',message:'Triggering page reload',data:{newReloadAttempts:reloadAttempts+1},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Hard reload to bypass cache
        window.location.reload();
        
        // Return a "never resolving" promise to prevent error during reload
        return new Promise(() => {});
      } else {
        // Clear the flag so future visits can try again
        sessionStorage.removeItem(reloadKey);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lazyWithRetry.ts:146',message:'Max reload attempts reached - throwing ChunkLoadError',data:{reloadAttempts},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
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

