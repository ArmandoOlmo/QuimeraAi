/**
 * Vite SSR Configuration
 * 
 * This config is used for building the server-side rendering bundle.
 * Run with: vite build --config vite.config.ssr.ts
 */

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // SECURITY: API keys are NOT injected into the SSR bundle.
    // All AI calls go through the secure Cloud Functions proxy.

    return {
        plugins: [react()],
        define: {
            // SECURITY: Keys are never embedded — proxy handles all AI API calls
            'process.env.API_KEY': 'null',
            'process.env.GEMINI_API_KEY': 'null',
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        build: {
            ssr: true,
            outDir: 'dist/server',
            rollupOptions: {
                input: 'entry-server.tsx',
                output: {
                    format: 'esm'
                }
            },
            minify: false,
            sourcemap: true
        },
        ssr: {
            // Externalize dependencies that shouldn't be bundled for SSR
            external: [
                'firebase-admin',
                'express',
                'compression'
            ],
            // Don't externalize these (they need to be bundled)
            noExternal: [
                'firebase',
                '@firebase/app',
                '@firebase/auth',
                '@firebase/firestore',
                'react-router-dom'
            ]
        }
    };
});











