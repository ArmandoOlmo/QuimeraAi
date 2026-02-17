import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Buscar la API key en múltiples variables posibles (con y sin prefijo VITE_)
  // Vite expone automáticamente variables con prefijo VITE_, pero también podemos leer otras durante build
  // Primero intentar obtener de process.env directamente, luego de loadEnv
  const apiKey = process.env.VITE_GEMINI_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    env.VITE_GOOGLE_AI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_AI_API_KEY ||
    null; // Usar null en lugar de cadena vacía para mejor detección

  // Log para debugging (EN TODOS LOS MODOS para ayudar con el troubleshooting)
  if (apiKey) {
    console.log(`✅ Google API Key encontrada en variables de entorno (mode: ${mode}, length: ${apiKey.length})`);
  } else {
    console.warn(`⚠️ Google API Key NO encontrada. Verifica tus variables de entorno (mode: ${mode})`);
    console.warn('Variables checked:', {
      'process.env.VITE_GEMINI_API_KEY': !!process.env.VITE_GEMINI_API_KEY,
      'env.VITE_GEMINI_API_KEY': !!env.VITE_GEMINI_API_KEY,
      'env.VITE_GOOGLE_AI_API_KEY': !!env.VITE_GOOGLE_AI_API_KEY
    });
  }

  return {
    server: {
      port: 3000,
      host: true, // Permite acceso desde cualquier IP (equivalente a '0.0.0.0' pero más compatible)
      open: true, // Abre el navegador automáticamente
      // SPA fallback - todas las rutas van a index.html
      historyApiFallback: true,
      // HMR configuration to reduce WebSocket errors
      hmr: {
        overlay: false, // Disable error overlay
      },
    },
    // Configuración de preview server
    preview: {
      port: 3000,
      host: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Quimera AI',
          short_name: 'Quimera',
          description: 'AI-powered website builder',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          // IMPORTANT: Do NOT cache HTML files - they must always come fresh from the server
          // This prevents stale SSR data issues on custom domains
          globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
          // Force immediate update
          skipWaiting: true,
          clientsClaim: true,
          // Increase limit for large JS chunks
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
          // CRITICAL: Use NetworkFirst for navigation requests so SSR HTML is always fresh
          navigateFallback: null, // Disable navigate fallback to force network
          runtimeCaching: [
            {
              // HTML documents - ALWAYS go to network first (critical for SSR)
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 3,
                plugins: [{
                  cacheWillUpdate: async () => null // Never cache navigation responses
                }]
              }
            },
            {
              // Cache Firebase Storage images
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Google Storage assets
              urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-storage',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets'
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      // Inyectar null si no hay API key, para mejor detección en el código cliente
      'process.env.API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
      'process.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
      // También exponer en import.meta.env para compatibilidad con Vite
      'import.meta.env.VITE_GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
      'import.meta.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null'
    },
    envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_AI_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Build optimizations for performance
    build: {
      chunkSizeWarningLimit: 500,
      minify: 'terser',
      // Generate manifest for SSR server to read asset paths
      manifest: true,
      terserOptions: {
        compress: {
          // TEMPORARILY disabled to debug SSR issue - re-enable after fix
          drop_console: false, // mode === 'production',
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          // ALL files include hash for proper cache busting (Shopify/Wix strategy)
          // SSR server reads index.html to get correct hashed filenames
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: {
            // Firebase in its own chunk
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
              'firebase/functions',
              'firebase/analytics'
            ],
            // React ecosystem
            react: ['react', 'react-dom'],
            // Radix UI components
            radix: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot'
            ],
            // TipTap editor (large) - Note: @tiptap/pm excluded as it has non-standard exports
            editor: [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/extension-link',
              '@tiptap/extension-image',
              '@tiptap/extension-color',
              '@tiptap/extension-highlight',
              '@tiptap/extension-placeholder',
              '@tiptap/extension-text-align',
              '@tiptap/extension-text-style',
              '@tiptap/extension-underline',
              '@tiptap/extension-table',
              '@tiptap/extension-table-cell',
              '@tiptap/extension-table-header',
              '@tiptap/extension-table-row',
              '@tiptap/extension-bubble-menu'
            ],
            // Charts library
            charts: ['recharts'],
            // Drag and drop
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            // i18n
            i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            // AI/Generative — only loaded when AI features are used
            'google-ai': ['@google/genai'],
            // Animation library
            animation: ['framer-motion'],
            // Heavy utility libraries — loaded on demand
            'export-utils': ['html2canvas', 'html2canvas-pro', 'jspdf', 'jspdf-autotable', 'xlsx'],
            // Markdown renderer
            markdown: ['marked', 'react-markdown'],
            // Stripe payments
            stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js']
          }
        }
      }
    }
  };
});
