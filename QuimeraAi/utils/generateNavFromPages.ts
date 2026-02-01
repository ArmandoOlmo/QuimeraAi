/**
 * Utility to generate navigation links from SitePage array
 * 
 * This utility transforms the pages array into navigation links
 * that can be used by the Header component.
 */

import { SitePage, NavLink } from '../types';

/**
 * Generate navigation links from pages array
 * 
 * @param pages - Array of SitePage objects
 * @param options - Configuration options
 * @returns Array of NavLink objects for the Header
 */
export function generateNavFromPages(
    pages: SitePage[],
    options: {
        /** Include only pages marked as showInNavigation */
        onlyVisible?: boolean;
        /** Use hash-based links (for SPA mode) */
        useHashLinks?: boolean;
        /** Base URL for absolute links */
        baseUrl?: string;
        /** Maximum number of links to show */
        maxLinks?: number;
    } = {}
): NavLink[] {
    const {
        onlyVisible = true,
        useHashLinks = false,
        baseUrl = '',
        maxLinks = 10,
    } = options;

    // Filter pages that should appear in navigation
    let navPages = [...pages];
    
    if (onlyVisible) {
        navPages = navPages.filter(page => page.showInNavigation !== false);
    }

    // Sort by navigation order (home page first, then by navigationOrder)
    navPages.sort((a, b) => {
        if (a.isHomePage) return -1;
        if (b.isHomePage) return 1;
        return (a.navigationOrder || 0) - (b.navigationOrder || 0);
    });

    // Limit number of links
    navPages = navPages.slice(0, maxLinks);

    // Transform to NavLink format
    return navPages.map(page => {
        let href = page.slug || '/';
        
        // For home page, use root or #top
        if (page.isHomePage) {
            href = useHashLinks ? '#' : '/';
        } else if (useHashLinks) {
            // Convert path-based slug to hash-based
            // /tienda -> #tienda
            // /nosotros -> #nosotros
            href = `#${(page.slug || '').replace(/^\//, '')}`;
        } else {
            // Use path-based URLs with optional base
            href = `${baseUrl}${page.slug}`;
        }

        return {
            text: page.title,
            href,
        };
    });
}

/**
 * Merge manual navigation links with page-generated links
 * 
 * Useful for adding custom links (like external URLs) alongside page links
 * 
 * @param pageLinks - Links generated from pages
 * @param manualLinks - Manually configured links
 * @param mode - How to combine: 'replace', 'prepend', 'append'
 * @returns Combined NavLink array
 */
export function mergeNavLinks(
    pageLinks: NavLink[],
    manualLinks: NavLink[],
    mode: 'replace' | 'prepend' | 'append' = 'append'
): NavLink[] {
    switch (mode) {
        case 'replace':
            return manualLinks;
        case 'prepend':
            return [...manualLinks, ...pageLinks];
        case 'append':
        default:
            return [...pageLinks, ...manualLinks];
    }
}

/**
 * Get navigation links with section anchors for single-page mode
 * 
 * For backward compatibility, this creates links to sections within a page
 * based on the page's sections array
 * 
 * @param page - The SitePage to extract section links from
 * @returns Array of NavLink objects pointing to sections
 */
export function getSectionLinks(page: SitePage): NavLink[] {
    const sectionLabels: Record<string, string> = {
        hero: 'Inicio',
        features: 'Características',
        services: 'Servicios',
        testimonials: 'Testimonios',
        pricing: 'Precios',
        faq: 'FAQ',
        portfolio: 'Portafolio',
        team: 'Equipo',
        cta: 'Contacto',
        products: 'Productos',
        blog: 'Blog',
        map: 'Ubicación',
        menu: 'Menú',
    };

    // Filter sections that are typically navigable
    const navigableSections = ['features', 'services', 'testimonials', 'pricing', 'faq', 'portfolio', 'team', 'cta', 'products'];
    
    return page.sections
        .filter(section => navigableSections.includes(section))
        .map(section => ({
            text: sectionLabels[section] || section,
            href: `#${section}`,
        }));
}

