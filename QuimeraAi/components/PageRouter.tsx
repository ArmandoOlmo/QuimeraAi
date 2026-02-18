/**
 * PageRouter Component
 * 
 * Handles URL-to-page matching for the multi-page architecture.
 * This component:
 * 1. Matches the current URL against project pages
 * 2. Extracts route parameters for dynamic pages
 * 3. Loads dynamic data (products, categories, articles) as needed
 * 4. Renders the appropriate PageRenderer component
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Project, SitePage, PageMatch } from '../types/project';
import { PageData, ThemeData } from '../types';
import { matchPage, getHomePage } from '../utils/pageMatching';
import { DynamicData, PublicProduct, PublicCategory, PublicArticle } from '../utils/metaGenerator';
import PageRenderer from './PageRenderer';
import QuimeraLoader from './ui/QuimeraLoader';

interface PageRouterProps {
    /** The project containing pages */
    project: Project;
    /** Current URL path to match */
    currentPath: string;
    /** Server-provided URL (for SSR) */
    serverUrl?: string;
    /** Pre-loaded dynamic data (for SSR) */
    initialDynamicData?: DynamicData;
    /** Is this in preview/editor mode? */
    isPreview?: boolean;
    /** Storefront products for ecommerce pages */
    storefrontProducts?: PublicProduct[];
    /** Categories for ecommerce pages */
    categories?: PublicCategory[];
    /** Blog posts for blog pages */
    blogPosts?: PublicArticle[];
}

/**
 * PageRouter matches URLs to pages and renders them
 */
const PageRouter: React.FC<PageRouterProps> = ({
    project,
    currentPath,
    serverUrl,
    initialDynamicData,
    isPreview = false,
    storefrontProducts = [],
    categories = [],
    blogPosts = [],
}) => {
    // State for dynamic data
    const [dynamicData, setDynamicData] = useState<DynamicData | null>(initialDynamicData || null);
    const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

    // Get pages from project (use legacy if no pages)
    const pages = useMemo(() => {
        if (project.pages && project.pages.length > 0) {
            return project.pages;
        }
        // No pages - this is a legacy project
        return [];
    }, [project.pages]);

    // Match current path to a page
    const pageMatch = useMemo((): PageMatch | null => {
        const path = serverUrl || currentPath;
        return matchPage(pages, path);
    }, [pages, currentPath, serverUrl]);

    // Load dynamic data when page or params change
    useEffect(() => {
        if (!pageMatch || pageMatch.page.type !== 'dynamic') {
            setDynamicData(null);
            return;
        }

        const loadDynamicData = async () => {
            setIsLoadingDynamic(true);

            try {
                const { page, params } = pageMatch;
                const slug = params.slug;

                if (!slug) {
                    setDynamicData(null);
                    return;
                }

                switch (page.dynamicSource) {
                    case 'products':
                        // Find product by slug from storefrontProducts
                        const product = storefrontProducts.find(p => p.slug === slug);
                        setDynamicData(product ? { product } : null);
                        break;

                    case 'categories':
                        // Find category by slug
                        const category = categories.find(c => c.slug === slug);
                        setDynamicData(category ? { category } : null);
                        break;

                    case 'blogPosts':
                        // Find article by slug
                        const article = blogPosts.find(a => a.slug === slug);
                        setDynamicData(article ? { article } : null);
                        break;

                    default:
                        setDynamicData(null);
                }
            } catch (error) {
                console.error('[PageRouter] Error loading dynamic data:', error);
                setDynamicData(null);
            } finally {
                setIsLoadingDynamic(false);
            }
        };

        loadDynamicData();
    }, [pageMatch, storefrontProducts, categories, blogPosts]);

    // If no pages defined (legacy project), return null
    // The parent component should handle legacy rendering
    if (pages.length === 0) {
        return null;
    }

    // If no page match found, show 404 or home page
    if (!pageMatch) {
        const homePage = getHomePage(pages);
        if (homePage) {
            return (
                <PageRenderer
                    page={homePage}
                    project={project}
                    isPreview={isPreview}
                    storefrontProducts={storefrontProducts}
                    categories={categories}
                />
            );
        }

        // No home page either - show error
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">Página no encontrada</p>
                </div>
            </div>
        );
    }

    // Show loading for dynamic pages
    if (isLoadingDynamic) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <QuimeraLoader size="md" />
            </div>
        );
    }

    // Dynamic page with no data found
    if (pageMatch.page.type === 'dynamic' && !dynamicData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">
                        {pageMatch.page.dynamicSource === 'products' && 'Producto no encontrado'}
                        {pageMatch.page.dynamicSource === 'categories' && 'Categoría no encontrada'}
                        {pageMatch.page.dynamicSource === 'blogPosts' && 'Artículo no encontrado'}
                    </p>
                </div>
            </div>
        );
    }

    // Render the matched page
    return (
        <PageRenderer
            page={pageMatch.page}
            project={project}
            dynamicData={dynamicData || undefined}
            routeParams={pageMatch.params}
            isPreview={isPreview}
            storefrontProducts={storefrontProducts}
            categories={categories}
        />
    );
};

export default PageRouter;



