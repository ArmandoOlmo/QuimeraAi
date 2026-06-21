const CLEANUP_RELOAD_KEY = 'quimera_sw_cleanup_reloaded';

function hasReloadedForCleanup(): boolean {
  try {
    return sessionStorage.getItem(CLEANUP_RELOAD_KEY) === '1';
  } catch {
    return true;
  }
}

function markReloadedForCleanup(): void {
  try {
    sessionStorage.setItem(CLEANUP_RELOAD_KEY, '1');
  } catch {
    // Ignore storage failures, especially in private browsing modes.
  }
}

function shouldReloadAfterCleanup(): boolean {
  if (typeof window === 'undefined') return false;

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  if (localHosts.has(window.location.hostname)) return false;

  return true;
}

export function cleanupLegacyServiceWorkers(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const wasControlledByServiceWorker = Boolean(navigator.serviceWorker.controller);

  void navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      if (registrations.length === 0) return;

      await Promise.allSettled(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      if (wasControlledByServiceWorker && shouldReloadAfterCleanup() && !hasReloadedForCleanup()) {
        markReloadedForCleanup();
        window.location.reload();
      }
    })
    .catch((error) => {
      console.error('[ServiceWorkerCleanup] Failed to clear legacy service workers:', error);
    });
}

cleanupLegacyServiceWorkers();
