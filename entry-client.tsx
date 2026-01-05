/**
 * Client Entry Point for SSR Hydration (Multi-Page Architecture)
 * 
 * This file handles the client-side hydration of the server-rendered HTML.
 * It reads the initial state injected by the server and hydrates React.
 * 
 * Supports two modes:
 * 1. Multi-page SSR: Uses PageRenderer with full project data (new architecture)
 * 2. Legacy Storefront: Uses StorefrontApp for backwards compatibility
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css';
import App from './App';
import StorefrontApp from './components/ecommerce/StorefrontApp';
import PageRenderer from './components/PageRenderer';
import { StorefrontCartProvider } from './components/ecommerce/context';
import { matchPage, getHomePage } from './utils/pageMatching';
import { Project, SitePage } from './types/project';
import './i18n';

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

// Check if we have multi-page SSR data
const hasMultiPageData = initialData?.project?.pages && initialData.project.pages.length > 0;
const hasLegacyData = initialState?.projectId && initialState?.hostname;

if (hasMultiPageData && initialData) {
    // Multi-page architecture - hydrate with PageRenderer
    console.log('[entry-client] Hydrating with PageRenderer (multi-page architecture)');
    
    const project = initialData.project as Project;
    const path = initialData.path || window.location.pathname;
    
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
        ReactDOM.hydrateRoot(
            rootElement,
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
        ReactDOM.hydrateRoot(
            rootElement,
            <React.StrictMode>
                <StorefrontApp
                    projectId={initialData.projectId!}
                    initialData={project}
                />
            </React.StrictMode>
        );
    }
} else if (hasLegacyData && initialState) {
    // Legacy storefront app (custom domain without multi-page)
    console.log('[entry-client] Hydrating with StorefrontApp (legacy mode)');
    ReactDOM.hydrateRoot(
        rootElement,
        <React.StrictMode>
            <StorefrontApp
                projectId={initialState.projectId!}
                initialData={initialState.projectData}
                hostname={initialState.hostname}
            />
        </React.StrictMode>
    );
} else {
    // Regular app (dashboard, etc.) - use createRoot for client-only rendering
    console.log('[entry-client] Rendering main App (client-only)');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}











