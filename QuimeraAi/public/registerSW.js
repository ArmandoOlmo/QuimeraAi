if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(function (registrations) {
      return Promise.all(registrations.map(function (registration) {
        return registration.unregister();
      }));
    })
    .then(function () {
      if (!('caches' in window)) return;
      return caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.map(function (cacheName) {
          return caches.delete(cacheName);
        }));
      });
    })
    .catch(function () {});
}
