/**
 * Legacy Migration Utility
 * 
 * Utilities for migrating legacy projects (without pages array)
 * to the new multi-page architecture.
 */

import { SitePage, PageSection } from '../types';
import { PageData } from '../types/components';

/**
 * Generate pages array from legacy project's componentOrder
 * 
 * This creates a basic multi-page structure based on the existing single-page
 * component configuration, maintaining backward compatibility.
 * 
 * @param componentOrder - Legacy component order array
 * @param sectionVisibility - Section visibility settings
 * @param data - Page data with section content
 * @returns Array of SitePage objects
 */
export function generatePagesFromLegacyProject(
    componentOrder: PageSection[],
    sectionVisibility: Record<string, boolean>,
    data: Partial<PageData>
): SitePage[] {
    // Determine which sections are ecommerce-related
    const ecommerceSections: PageSection[] = [
        'products', 'featuredProducts', 'categoryGrid', 'productHero',
        'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews',
        'collectionBanner', 'productBundle', 'announcementBar', 'storeSettings'
    ];
    
    // Content sections (excluding ecommerce)
    const contentSections = componentOrder.filter(section => 
        !ecommerceSections.includes(section) &&
        section !== 'colors' &&
        section !== 'typography'
    );
    
    // Ecommerce sections in use
    const activeEcommerceSections = componentOrder.filter(section =>
        ecommerceSections.includes(section) && sectionVisibility[section] !== false
    );
    
    // Helper to check if a section is active
    const isActive = (section: string) => 
        componentOrder.includes(section as PageSection) && sectionVisibility[section] !== false;
    
    const pages: SitePage[] = [];
    
    // 1. Create Home page with content sections
    // Filter out header (added separately) and footer (added at end)
    const homeSections = contentSections.filter(s => 
        s !== 'footer' && s !== 'header' && sectionVisibility[s] !== false
    );
    // Add footer at the end if visible
    if (sectionVisibility['footer'] !== false) {
        homeSections.push('footer');
    }
    
    pages.push({
        id: 'home',
        title: 'Inicio',
        slug: '/',
        type: 'static',
        sections: ['header', ...homeSections] as PageSection[],
        sectionData: {},
        seo: {
            title: data.hero?.headline || 'Inicio',
            description: data.hero?.subheadline || '',
        },
        isHomePage: true,
        showInNavigation: true,
        navigationOrder: 0,
    });
    
    // 2. Create Store page if ecommerce sections exist
    if (activeEcommerceSections.length > 0 || data.products) {
        const storeSections: PageSection[] = [
            'header',
            'announcementBar',
            'categoryGrid',
            'ProductGridSection', // Main product grid
            'trustBadges',
            'footer'
        ].filter(s => 
            s === 'header' || s === 'footer' || s === 'ProductGridSection' ||
            (activeEcommerceSections.includes(s as PageSection) && sectionVisibility[s] !== false)
        ) as PageSection[];
        
        pages.push({
            id: 'store',
            title: 'Tienda',
            slug: '/tienda',
            type: 'static',
            sections: storeSections,
            sectionData: {},
            seo: {
                title: 'Tienda',
                description: 'Explora nuestros productos',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 1,
        });
        
        // 3. Create Product Detail page (dynamic)
        pages.push({
            id: 'product-detail',
            title: 'Producto',
            slug: '/producto/:slug',
            type: 'dynamic',
            dynamicSource: 'products',
            sections: ['header', 'ProductDetailSection', 'recentlyViewed', 'productReviews', 'footer'] as PageSection[],
            sectionData: {},
            seo: {
                title: '{{product.name}}',
                description: '{{product.description}}',
            },
            isHomePage: false,
            showInNavigation: false,
            navigationOrder: 99,
        });
        
        // 4. Create Category page (dynamic)
        pages.push({
            id: 'category',
            title: 'Categoría',
            slug: '/categoria/:slug',
            type: 'dynamic',
            dynamicSource: 'categories',
            sections: ['header', 'CategoryProductsSection', 'trustBadges', 'footer'] as PageSection[],
            sectionData: {},
            seo: {
                title: '{{category.name}}',
                description: '{{category.description}}',
            },
            isHomePage: false,
            showInNavigation: false,
            navigationOrder: 99,
        });
        
        // 5. Create Cart page
        pages.push({
            id: 'cart',
            title: 'Carrito',
            slug: '/carrito',
            type: 'static',
            sections: ['header', 'CartSection', 'footer'] as PageSection[],
            sectionData: {},
            seo: {
                title: 'Carrito de Compras',
                description: 'Revisa los productos en tu carrito',
            },
            isHomePage: false,
            showInNavigation: false,
            navigationOrder: 99,
        });
        
        // 6. Create Checkout page
        pages.push({
            id: 'checkout',
            title: 'Checkout',
            slug: '/checkout',
            type: 'static',
            sections: ['header', 'CheckoutSection', 'footer'] as PageSection[],
            sectionData: {},
            seo: {
                title: 'Finalizar Compra',
                description: 'Completa tu pedido',
            },
            isHomePage: false,
            showInNavigation: false,
            navigationOrder: 99,
        });
    }
    
    // 7. Create Contact page if leads section exists
    if (isActive('leads')) {
        const contactSections: PageSection[] = ['header', 'leads'];
        if (isActive('map')) contactSections.push('map');
        contactSections.push('footer');
        
        pages.push({
            id: 'contact',
            title: 'Contacto',
            slug: '/contacto',
            type: 'static',
            sections: contactSections as PageSection[],
            sectionData: {},
            seo: {
                title: data.leads?.title || 'Contacto',
                description: data.leads?.subtitle || 'Ponte en contacto con nosotros',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 5,
        });
    }
    
    // 8. Create Services page if services section is enabled
    if (isActive('services')) {
        const servicesSections: PageSection[] = ['header', 'services'];
        if (isActive('howItWorks')) servicesSections.push('howItWorks');
        if (isActive('cta')) servicesSections.push('cta');
        servicesSections.push('footer');
        
        pages.push({
            id: 'services',
            title: 'Servicios',
            slug: '/servicios',
            type: 'static',
            sections: servicesSections as PageSection[],
            sectionData: {},
            seo: {
                title: data.services?.title || 'Servicios',
                description: data.services?.description || 'Nuestros servicios profesionales',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 2,
        });
    }
    
    // 9. Create Portfolio page if portfolio section is enabled
    if (isActive('portfolio')) {
        pages.push({
            id: 'portfolio',
            title: 'Portafolio',
            slug: '/portafolio',
            type: 'static',
            sections: ['header', 'portfolio', 'testimonials', 'footer'].filter(s =>
                s === 'header' || s === 'footer' || s === 'portfolio' || isActive(s)
            ) as PageSection[],
            sectionData: {},
            seo: {
                title: data.portfolio?.title || 'Portafolio',
                description: data.portfolio?.description || 'Nuestros trabajos y proyectos',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 3,
        });
    }
    
    // 10. Create Blog page if cmsFeed section is enabled
    if (isActive('cmsFeed')) {
        pages.push({
            id: 'blog',
            title: 'Blog',
            slug: '/blog',
            type: 'static',
            sections: ['header', 'cmsFeed', 'newsletter', 'footer'].filter(s =>
                s === 'header' || s === 'footer' || s === 'cmsFeed' || isActive(s)
            ) as PageSection[],
            sectionData: {},
            seo: {
                title: (data as any).cmsFeed?.title || 'Blog',
                description: (data as any).cmsFeed?.description || 'Últimos artículos y noticias',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 4,
        });
    }
    
    // 11. Create FAQ page if faq section is enabled
    if (isActive('faq')) {
        pages.push({
            id: 'faq',
            title: 'FAQ',
            slug: '/faq',
            type: 'static',
            sections: ['header', 'faq', 'cta', 'footer'].filter(s =>
                s === 'header' || s === 'footer' || s === 'faq' || isActive(s)
            ) as PageSection[],
            sectionData: {},
            seo: {
                title: data.faq?.title || 'Preguntas Frecuentes',
                description: data.faq?.description || 'Respuestas a tus dudas más comunes',
            },
            isHomePage: false,
            showInNavigation: false,
            navigationOrder: 6,
        });
    }
    
    // 12. Create Pricing page if pricing section is enabled
    if (isActive('pricing')) {
        pages.push({
            id: 'pricing',
            title: 'Precios',
            slug: '/precios',
            type: 'static',
            sections: ['header', 'pricing', 'faq', 'cta', 'footer'].filter(s =>
                s === 'header' || s === 'footer' || s === 'pricing' || isActive(s)
            ) as PageSection[],
            sectionData: {},
            seo: {
                title: data.pricing?.title || 'Precios',
                description: data.pricing?.description || 'Planes y precios',
            },
            isHomePage: false,
            showInNavigation: true,
            navigationOrder: 4,
        });
    }
    
    return pages;
}

/**
 * Check if a project needs migration to multi-page architecture
 * 
 * @param project - Project to check
 * @returns true if the project has no pages and needs migration
 */
export function needsPagesMigration(project: { pages?: SitePage[] }): boolean {
    return !project.pages || project.pages.length === 0;
}

/**
 * Migrate a legacy project to multi-page architecture
 * 
 * @param project - Legacy project data
 * @returns Updated project with pages array
 */
export function migrateProjectToMultiPage<T extends {
    componentOrder: PageSection[];
    sectionVisibility: Record<string, boolean>;
    data: Partial<PageData>;
    pages?: SitePage[];
}>(project: T): T & { pages: SitePage[] } {
    if (!needsPagesMigration(project)) {
        return project as T & { pages: SitePage[] };
    }
    
    const pages = generatePagesFromLegacyProject(
        project.componentOrder,
        project.sectionVisibility,
        project.data
    );
    
    return {
        ...project,
        pages,
    };
}

