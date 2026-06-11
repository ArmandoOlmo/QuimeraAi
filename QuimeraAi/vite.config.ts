import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // SECURITY: provider API keys are NEVER embedded in the client bundle.
  // All AI API calls go through the server-side Supabase/Vercel proxy.
  return {
    server: {
      port: 3000,
      host: true, // Permite acceso desde cualquier IP (equivalente a '0.0.0.0' pero más compatible)
      open: false, // Open manually after the dev server is ready; auto-open can race the optimizer.
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
      // PWA/Service Worker is intentionally disabled.
      // The previous Workbox build precached every JS/CSS chunk and took
      // control immediately, which caused mobile Safari/Chrome reload loops
      // and tab crashes during production updates.
    ].filter(Boolean),
    define: {
      // SECURITY: API keys are NOT injected into the client bundle.
      // All AI calls go through the secure server-side proxy.
      // These are set to null to prevent any client-side fallback from working.
      'process.env.API_KEY': 'null',
      'process.env.OPENROUTER_API_KEY': 'null',
    },
    // SECURITY: Only expose VITE_ prefixed variables.
    // Do NOT expose OPENROUTER_ or provider-key prefixed vars to the client.
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    optimizeDeps: {
      // Only crawl the actual app entry. Without this, Vite also scans
      // auxiliary HTML files such as scratch_editor.html and playwright-report.
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-dev-runtime',
        'react/jsx-runtime',
        'i18next',
        'react-i18next',
        'i18next-browser-languagedetector',
        'html-parse-stringify',
        'void-elements',
        'p-retry',
      ],
    },
    // Build optimizations for performance
    build: {
      chunkSizeWarningLimit: 500,
      minify: 'terser',
      modulePreload: false,
      // Generate manifest for SSR server to read asset paths
      manifest: true,
      terserOptions: {
        compress: {
          // SECURITY: Strip console.log/warn/debug/info in production to prevent data leaks.
          // console.error is PRESERVED for error tracking in production.
          drop_console: false,
          drop_debugger: true,
          pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.warn', 'console.info'] : [],
        }
      },
      rollupOptions: {
        output: {
          // ALL files include hash for proper cache busting (Shopify/Wix strategy)
          // SSR server reads index.html to get correct hashed filenames
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: undefined,
        }
      }
    }
  };
});
