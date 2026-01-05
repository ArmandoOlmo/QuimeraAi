/**
 * Server Entry Point for SSR (Multi-Page Architecture)
 * 
 * This file is used by the SSR server to render the React app to HTML.
 * It supports both the new multi-page architecture and legacy single-page projects.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StorefrontCartProvider } from './components/ecommerce/context';
import PageRenderer from './components/PageRenderer';
import { Project, SitePage, PageMatch } from './types/project';
import { matchPage, getHomePage } from './utils/pageMatching';
import { 
    generateMetaTags, 
    generateMetaHtml, 
    DynamicData,
    PublicProduct,
    PublicCategory,
    PublicArticle 
} from './utils/metaGenerator';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectData extends Omit<Project, 'thumbnailUrl' | 'status' | 'lastUpdated'> {
    // Additional SSR-specific fields
    products?: PublicProduct[];
    categories?: PublicCategory[];
    posts?: PublicArticle[];
}

export interface RenderOptions {
    /** Current URL path */
    url: string;
    /** Project data from Firestore */
    project: ProjectData;
    /** Pre-loaded dynamic data (optional, loaded separately if not provided) */
    dynamicData?: DynamicData;
    /** Base URL for canonical URLs */
    baseUrl?: string;
}

export interface RenderResult {
    /** Rendered HTML content */
    html: string;
    /** Meta tags for <head> */
    head: string;
    /** Matched page (for logging/debugging) */
    page?: SitePage;
    /** HTTP status code */
    statusCode: number;
}

// =============================================================================
// RENDER FUNCTION
// =============================================================================

/**
 * Render a page to HTML string
 * 
 * @param options - Render options including URL, project data, and dynamic data
 * @returns Rendered HTML and head tags
 */
export async function render(options: RenderOptions): Promise<RenderResult> {
    const { url, project, dynamicData, baseUrl } = options;
    
    // Parse URL path
    const urlPath = new URL(url, 'http://localhost').pathname;
    
    // Get pages from project
    const pages = project.pages || [];
    
    // Match URL to page
    let pageMatch: PageMatch | null = null;
    let page: SitePage;
    
    if (pages.length > 0) {
        // Multi-page architecture
        pageMatch = matchPage(pages, urlPath);
        
        if (!pageMatch) {
            // Try home page for root
            if (urlPath === '/' || urlPath === '') {
                const homePage = getHomePage(pages);
                if (homePage) {
                    pageMatch = { page: homePage, params: {} };
                }
            }
        }
        
        if (!pageMatch) {
            // 404 - return minimal HTML
            return {
                html: render404(project),
                head: `<title>Página no encontrada | ${project.name}</title>`,
                statusCode: 404,
            };
        }
        
        page = pageMatch.page;
    } else {
        // Legacy single-page project - create virtual page from project data
        page = createLegacyHomePage(project);
        pageMatch = { page, params: {} };
    }
    
    // Check if dynamic page needs data
    if (page.type === 'dynamic' && !dynamicData) {
        // For dynamic pages without pre-loaded data, return 404
        // The server should have loaded the data before calling render
        return {
            html: render404(project),
            head: `<title>Contenido no encontrado | ${project.name}</title>`,
            page,
            statusCode: 404,
        };
    }
    
    // Render the page
    try {
        const html = renderToString(
            <React.StrictMode>
                <StorefrontCartProvider storeId={project.id}>
                    <PageRenderer
                        page={page}
                        project={project as Project}
                        dynamicData={dynamicData}
                        routeParams={pageMatch.params}
                        isPreview={false}
                        storefrontProducts={project.products || []}
                        categories={project.categories || []}
                    />
                </StorefrontCartProvider>
            </React.StrictMode>
        );
        
        // Generate meta tags
        const meta = generateMetaTags(page, project as Project, dynamicData, baseUrl);
        const head = generateMetaHtml(meta, project.theme);
        
        return {
            html,
            head,
            page,
            statusCode: 200,
        };
    } catch (error) {
        console.error('[entry-server] Render error:', error);
        return {
            html: renderError(),
            head: `<title>Error | ${project.name}</title>`,
            page,
            statusCode: 500,
        };
    }
}

/**
 * Legacy render function for backwards compatibility
 */
export async function renderLegacy(url: string, projectData: ProjectData): Promise<{ html: string; head: string }> {
    const result = await render({
        url,
        project: projectData,
    });
    return { html: result.html, head: result.head };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a virtual home page from legacy project data
 */
function createLegacyHomePage(project: ProjectData): SitePage {
    return {
        id: 'legacy-home',
        title: project.name,
        slug: '/',
        type: 'static',
        sections: project.componentOrder || [],
        sectionData: project.data || {},
        seo: {
            title: project.seoConfig?.title || project.name,
            description: project.seoConfig?.description,
            image: project.seoConfig?.defaultOGImage,
        },
        isHomePage: true,
        showInNavigation: true,
        navigationOrder: 0,
    };
}

/**
 * Render 404 page
 */
function render404(project: ProjectData): string {
    const colors = project.theme?.globalColors || {};
    const bg = colors.background || '#0f172a';
    const text = colors.text || '#94a3b8';
    const heading = colors.heading || '#f8fafc';
    const primary = colors.primary || '#4f46e5';
    
    return `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: ${bg}; color: ${text}; font-family: system-ui, sans-serif;">
            <div style="text-align: center; padding: 2rem;">
                <h1 style="font-size: 6rem; margin: 0; color: ${primary};">404</h1>
                <p style="font-size: 1.5rem; color: ${heading}; margin: 1rem 0;">Página no encontrada</p>
                <p>La página que buscas no existe o ha sido movida.</p>
                <a href="/" style="display: inline-block; margin-top: 1.5rem; padding: 0.75rem 2rem; background: ${primary}; color: #fff; text-decoration: none; border-radius: 0.5rem;">
                    Volver al inicio
                </a>
            </div>
        </div>
    `;
}

/**
 * Render error page
 */
function renderError(): string {
    return `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #1f2937; color: #9ca3af; font-family: system-ui, sans-serif;">
            <div style="text-align: center; padding: 2rem;">
                <h1 style="color: #f87171; margin-bottom: 1rem;">⚠️ Error del servidor</h1>
                <p>Ocurrió un error al procesar tu solicitud.</p>
                <p>Por favor, intenta de nuevo más tarde.</p>
            </div>
        </div>
    `;
}

// =============================================================================
// ADDITIONAL EXPORTS FOR ADVANCED SSR
// =============================================================================

/**
 * Generate only the head tags without rendering
 * Useful for edge/streaming scenarios
 */
export function generateHead(project: ProjectData, page: SitePage, dynamicData?: DynamicData, baseUrl?: string): string {
    const meta = generateMetaTags(page, project as Project, dynamicData, baseUrl);
    return generateMetaHtml(meta, project.theme);
}

/**
 * Export page matching for server use
 */
export { matchPage, getHomePage } from './utils/pageMatching';

/**
 * Export meta generation for server use
 */
export { generateMetaTags, generateMetaHtml } from './utils/metaGenerator';
