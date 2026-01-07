/**
 * Client Entry Point for Custom Domains & Dashboard
 * 
 * This file handles client-side rendering for:
 * 1. Custom domains: Receives initial data from SSR server, renders with PageRenderer/StorefrontApp
 * 2. Dashboard/Main app: Regular client-side React rendering
 * 
 * Note: SSR server provides SEO tags and initial state, but React does full rendering.
 */

// Global error handler to capture errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error('[entry-client] Error:', message, 'at', source, lineno, colno);
    return false;
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css';
import StorefrontApp from './components/ecommerce/StorefrontApp';
import PageRenderer from './components/PageRenderer';
import { StorefrontCartProvider } from './components/ecommerce/context';
import { matchPage, getHomePage } from './utils/pageMatching';
import { Project, SitePage } from './types/project';
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

// Check if we have multi-page SSR data (from custom domain server)
const hasMultiPageData = initialData?.project?.pages && initialData.project.pages.length > 0;
const hasLegacyData = initialState?.projectId && initialState?.hostname;
const hasSSRData = initialData?.projectId && initialData?.project;

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

if (hasMultiPageData && initialData) {
    // Multi-page architecture - render with PageRenderer
    const project = initialData.project as Project;
    const path = initialData.path || window.location.pathname || '/';
    
    // Load fonts for the project theme
    loadProjectFonts(project.theme);
    
    // Find the page to render
    let page: SitePage | null = null;
    
    // First try to find by pageId
    if (initialData.pageId) {
        page = project.pages?.find(p => p.id === initialData.pageId) || null;
    }
    
    // If not found by ID, match by path
    if (!page && project.pages) {
        const match = matchPage(project.pages, path);
        page = match?.page || null;
    }
    
    // Fallback to home page
    if (!page && project.pages) {
        page = getHomePage(project.pages);
    }
    
    if (page) {
        root.render(
            <React.StrictMode>
                <StorefrontCartProvider storeId={project.id}>
                    <PageRenderer
                        page={page}
                        project={project}
                        dynamicData={initialData.dynamicData}
                        routeParams={{}}
                        isPreview={false}
                        storefrontProducts={initialData.products || []}
                        categories={initialData.categories || []}
                    />
                </StorefrontCartProvider>
            </React.StrictMode>
        );
    } else {
        // Fallback to StorefrontApp if page not found
        console.warn('[entry-client] Page not found, falling back to StorefrontApp');
        root.render(
            <React.StrictMode>
                <StorefrontApp
                    projectId={initialData.projectId!}
                    initialData={project}
                />
            </React.StrictMode>
        );
    }
} else if (hasSSRData && initialData) {
    // SSR data but no pages (legacy single-page project)
    console.log('[entry-client] Rendering with StorefrontApp (SSR data, no pages)');
    // Load fonts for the project theme
    loadProjectFonts(initialData.project?.theme);
    root.render(
        <React.StrictMode>
            <StorefrontApp
                projectId={initialData.projectId!}
                initialData={initialData.project}
            />
        </React.StrictMode>
    );
} else if (hasLegacyData && initialState) {
    // Legacy storefront app (custom domain without multi-page)
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











