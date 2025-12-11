/**
 * Server Entry Point for SSR
 * 
 * This file is used by the SSR server to render the React app to HTML.
 * It exports a render function that takes the URL and project data.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import StorefrontApp from './components/ecommerce/StorefrontApp';

export interface ProjectData {
    id: string;
    name: string;
    theme?: any;
    data?: any;
    seoConfig?: any;
    brandIdentity?: any;
}

export interface RenderResult {
    html: string;
    head: string;
}

/**
 * Render the storefront app to HTML string
 */
export async function render(url: string, projectData: ProjectData): Promise<RenderResult> {
    // Extract route from URL
    const urlPath = new URL(url, 'http://localhost').pathname;
    
    // Render the React app to string
    const html = renderToString(
        <React.StrictMode>
            <StorefrontApp
                projectId={projectData.id}
                initialData={projectData}
                serverUrl={urlPath}
            />
        </React.StrictMode>
    );

    // Collect any head tags (could be extended with react-helmet-async)
    const head = generateHeadTags(projectData);

    return { html, head };
}

/**
 * Generate additional head tags
 */
function generateHeadTags(project: ProjectData): string {
    const tags: string[] = [];
    
    // Favicon from project if available
    if (project.brandIdentity?.faviconUrl) {
        tags.push(`<link rel="icon" href="${project.brandIdentity.faviconUrl}">`);
    }

    // Theme color from project
    if (project.theme?.primaryColor) {
        tags.push(`<meta name="theme-color" content="${project.theme.primaryColor}">`);
    }

    // Preconnect to common domains for performance
    tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    tags.push('<link rel="preconnect" href="https://firebasestorage.googleapis.com">');

    return tags.join('\n    ');
}

