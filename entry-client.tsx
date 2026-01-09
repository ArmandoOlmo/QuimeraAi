/**
 * Client Entry Point for Custom Domains & Dashboard
 * 
 * This file handles client-side rendering for:
 * 1. Custom domains: Receives initial data from SSR server, renders with PublicWebsitePreview
 * 2. Dashboard/Main app: Regular client-side React rendering
 * 
 * Note: SSR server provides SEO tags and initial state, but React does full rendering.
 */

// Global error handler to capture errors
window.onerror = function (message, source, lineno, colno, error) {
    console.error('[entry-client] Error:', message, 'at', source, lineno, colno);
    return false;
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css';
import PublicWebsitePreview from './components/PublicWebsitePreview';
import StorefrontApp from './components/ecommerce/StorefrontApp';
import { StorefrontCartProvider } from './components/ecommerce/context';
import { Project } from './types/project';
import './i18n';

// Lazy import App to avoid loading unnecessary code for custom domains
const loadApp = () => import('./App').then(m => m.default);

// Get initial state from server (both naming conventions for compatibility)
declare global {
    interface Window {
        __INITIAL_STATE__?: {
            projectId?: string;
            projectData?: any;
            hostname?: string;
        };
        __INITIAL_DATA__?: {
            projectId?: string;
            path?: string;
            pageId?: string;
            dynamicData?: any;
            project?: Partial<Project>;
            products?: any[];
            categories?: any[];
            posts?: any[];
        };
    }
}

const initialState = window.__INITIAL_STATE__;
const initialData = window.__INITIAL_DATA__;

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

// Use createRoot for all cases - SSR server now provides data but not pre-rendered HTML
const root = ReactDOM.createRoot(rootElement);

// Check if we have SSR data (from custom domain server)
const hasSSRData = initialData?.projectId && initialData?.project;
const hasLegacyData = initialState?.projectId && initialState?.hostname;

// Helper to load Google Fonts for the project theme
const loadProjectFonts = (theme: any) => {
    if (!theme) return;

    const fonts: string[] = [];
    if (theme.fontFamilyHeader) fonts.push(theme.fontFamilyHeader);
    if (theme.fontFamilyBody) fonts.push(theme.fontFamilyBody);
    if (theme.fontFamilyButton) fonts.push(theme.fontFamilyButton);
    if (theme.fontFamily) fonts.push(theme.fontFamily);

    const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica'];
    const uniqueFonts = [...new Set(fonts)]
        .filter(f => f && !systemFonts.includes(f))
        .map(f => f.replace(/\s+/g, '+'));

    if (uniqueFonts.length === 0) return;

    const fontFamilies = uniqueFonts.map(f => `family=${f}:wght@300;400;500;600;700`).join('&');
    const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

    // Check if already loaded
    if (document.querySelector(`link[href="${fontUrl}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);

    console.log('[entry-client] Loaded project fonts:', uniqueFonts);
};

if (hasSSRData && initialData) {
    // SSR data available - use PublicWebsitePreview for full navigation support (blog, store, pages)
    console.log('[entry-client] Rendering with PublicWebsitePreview (SSR mode)');
    const project = initialData.project as Project;

    // Load fonts for the project theme
    loadProjectFonts(project.theme);

    root.render(
        <React.StrictMode>
            <StorefrontCartProvider storeId={initialData.projectId!}>
                <PublicWebsitePreview
                    projectId={initialData.projectId}
                />
            </StorefrontCartProvider>
        </React.StrictMode>
    );
} else if (hasLegacyData && initialState) {
    // Legacy storefront app (custom domain without new SSR format)
    console.log('[entry-client] Rendering with StorefrontApp (legacy mode)');
    // Load fonts for the project theme
    loadProjectFonts(initialState.projectData?.theme);
    root.render(
        <React.StrictMode>
            <StorefrontApp
                projectId={initialState.projectId!}
                initialData={initialState.projectData}
                hostname={initialState.hostname}
            />
        </React.StrictMode>
    );
} else {
    // Regular app (dashboard, etc.) - standard client-side rendering
    console.log('[entry-client] Rendering main App (client-only)');
    loadApp().then(App => {
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    });
}











