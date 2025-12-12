/**
 * Client Entry Point for SSR Hydration
 * 
 * This file handles the client-side hydration of the server-rendered HTML.
 * It reads the initial state injected by the server and hydrates React.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/main.css';
import App from './App';
import StorefrontApp from './components/ecommerce/StorefrontApp';
import './i18n';

// Get initial state from server
declare global {
    interface Window {
        __INITIAL_STATE__?: {
            projectId?: string;
            projectData?: any;
            hostname?: string;
        };
    }
}

const initialState = window.__INITIAL_STATE__;

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

// Determine which app to render based on initial state
const isStorefront = initialState?.projectId && initialState?.hostname;

if (isStorefront) {
    // Hydrate storefront app (custom domain)
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
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}


