import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css'; // Tailwind v4 + Theme (OKLCH from tweakcn)
import App from './App';
import './i18n'; // Inicializar i18next
import './utils/serviceWorkerCleanup';
import { isLegacyStorageUrl } from './utils/imageUrl';

// Help Center seeding utilities are only needed locally. Loading them in
// production pulls a large article dataset into the public boot.
if (import.meta.env.DEV) {
  void import('./utils/seedHelpArticles');
}

// ─── Global Image Error Interceptor ──────────────────────────────────
// Some legacy storage URLs can return errors for all images.
// This capture-phase listener intercepts broken images globally and
// replaces them with an elegant SVG placeholder — no per-component changes needed.
document.addEventListener('error', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        const src = img.src || '';
        if (isLegacyStorageUrl(src)) {
            // Prevent infinite error loops
            if (img.dataset.legacyStorageFallback) return;
            img.dataset.legacyStorageFallback = 'true';

            // Generate an inline SVG placeholder
            const w = img.width || img.clientWidth || 400;
            const h = img.height || img.clientHeight || 300;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
                <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1a1a2e"/>
                    <stop offset="100%" style="stop-color:#16213e"/>
                </linearGradient></defs>
                <rect width="${w}" height="${h}" fill="url(#bg)" rx="8"/>
                <g transform="translate(${w / 2}, ${h / 2 - 14})">
                    <circle cx="0" cy="-8" r="22" fill="none" stroke="#4a4a6a" stroke-width="1.5"/>
                    <path d="M-10 -2 L-3 -10 L3 -5 L7 -8 L13 1 L-13 1 Z" fill="#4a4a6a" opacity="0.6"/>
                    <circle cx="-5" cy="-14" r="3" fill="#4a4a6a" opacity="0.6"/>
                </g>
                <text x="${w / 2}" y="${h / 2 + 26}" font-family="system-ui,sans-serif" font-size="11" fill="#6a6a8a" text-anchor="middle">Imagen en migración</text>
            </svg>`;
            img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
            img.style.objectFit = 'contain';
        }
    }
}, true); // 'true' = capture phase — runs before React handlers

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
