export function installDevReloadGuard(): void {
  if (typeof window === 'undefined') return;

  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  if (!localHosts.has(window.location.hostname)) return;

  try {
    const locationPrototype = Object.getPrototypeOf(window.location);

    if (!locationPrototype || (window as any).__quimeraDevReloadGuardInstalled) {
      return;
    }

    Object.defineProperty(locationPrototype, 'reload', {
      configurable: true,
      value: function guardedReload() {
        console.warn('[DevReloadGuard] Blocked window.location.reload() on localhost.');
        console.trace('[DevReloadGuard] reload caller');
      },
    });

    (window as any).__quimeraDevReloadGuardInstalled = true;
  } catch (error) {
    console.warn('[DevReloadGuard] Unable to install reload guard:', error);
  }
}
