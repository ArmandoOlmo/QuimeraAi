import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css'; // Tailwind v4 + Theme (OKLCH from tweakcn)
import App from './App';
import './i18n'; // Inicializar i18next

// Help Center utilities (available in browser console for seeding)
import './utils/seedHelpArticles';

// CRITICAL: Unregister Service Worker for custom domains to ensure fresh SSR content
// The PWA/SW caches HTML and causes stale data issues on custom domains
const isCustomDomain = !window.location.hostname.includes('quimeraai.web.app') && 
                       !window.location.hostname.includes('localhost') &&
                       !window.location.hostname.includes('127.0.0.1');

if (isCustomDomain && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('[PWA] Service Worker unregistered for custom domain:', window.location.hostname);
    });
  });
  // Also clear caches to ensure fresh content
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
        console.log('[PWA] Cache deleted:', name);
      });
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
