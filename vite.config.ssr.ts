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
    const apiKey = process.env.VITE_GEMINI_API_KEY ||
                   env.VITE_GEMINI_API_KEY || 
                   env.GEMINI_API_KEY || 
                   null;

    return {
        plugins: [react()],
        define: {
            'process.env.API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
            'process.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
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











