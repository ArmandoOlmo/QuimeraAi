/**
 * Default Page Templates for Multi-Page Architecture
 * 
 * This file contains default page configurations for the multi-page architecture.
 * Each page template includes sections, default data, and SEO configuration.
 */

import { SitePage, PageSEO } from '../types/project';
import { PageSection } from '../types/ui';
import { PageData } from '../types/components';
import { PageTemplateId, PAGE_TEMPLATE_SECTIONS } from '../types/onboarding';
import { initialData } from './initialData';

// =============================================================================
// DEFAULT SEO CONFIGURATION
// =============================================================================

const createDefaultSEO = (title: string, description?: string): PageSEO => ({
    title,
    description: description || `${title} - Descubre más sobre nosotros`,
});

// =============================================================================
// DEFAULT SECTION DATA BY PAGE TYPE
// =============================================================================

/**
 * Get default section data for a specific page type
 * Uses initialData as the base and filters to only include relevant sections
 */
export const getDefaultSectionData = (sections: PageSection[]): Partial<PageData> => {
    const sectionData: Partial<PageData> = {};
    
    for (const section of sections) {
        if (section in initialData.data) {
            (sectionData as any)[section] = (initialData.data as any)[section];
        }
    }
    
    return sectionData;
};

// =============================================================================
// PAGE TEMPLATES
// =============================================================================

/**
 * Create a home page with default sections
 */
export const createHomePage = (businessName?: string): SitePage => {
    const sections = PAGE_TEMPLATE_SECTIONS['home'];
    return {
        id: `page-home-${Date.now()}`,
        title: 'Inicio',
        slug: '/',
        type: 'static',
        sections,
        sectionData: getDefaultSectionData(sections),
        seo: createDefaultSEO(businessName || 'Inicio', 'Bienvenido a nuestro sitio web'),
        isHomePage: true,
        showInNavigation: true,
        navigationOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a store page with ecommerce sections
 */
export const createStorePage = (): SitePage => {
    const sections: PageSection[] = ['header', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'footer'];
    return {
        id: `page-store-${Date.now()}`,
        title: 'Tienda',
        slug: '/tienda',
        type: 'static',
        sections,
        sectionData: getDefaultSectionData(sections),
        seo: createDefaultSEO('Tienda', 'Explora nuestra tienda online'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a product detail page (dynamic)
 */
export const createProductDetailPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'productDetail', 'recentlyViewed', 'footer'];
    return {
        id: `page-product-detail-${Date.now()}`,
        title: 'Producto',
        slug: '/producto/:slug',
        type: 'dynamic',
        dynamicSource: 'products',
        sections,
        sectionData: {
            productDetail: {
                showGallery: true,
                showVariants: true,
                showDescription: true,
                showSpecifications: true,
                showRelatedProducts: true,
                relatedProductsCount: 4,
                showReviews: true,
                galleryLayout: 'vertical',
                paddingY: 'lg',
                paddingX: 'md',
                colors: {
                    background: '#0f172a',
                    heading: '#F9FAFB',
                    text: '#94a3b8',
                    accent: '#4f46e5',
                    priceColor: '#10b981',
                    buttonBackground: '#4f46e5',
                    buttonText: '#ffffff',
                },
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
            recentlyViewed: initialData.data.recentlyViewed,
        },
        seo: {
            // SEO for dynamic pages will be overridden with product data
            title: 'Producto',
            description: 'Detalle del producto',
        },
        isHomePage: false,
        showInNavigation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a category page (dynamic)
 */
export const createCategoryPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'categoryProducts', 'footer'];
    return {
        id: `page-category-${Date.now()}`,
        title: 'Categoría',
        slug: '/categoria/:slug',
        type: 'dynamic',
        dynamicSource: 'categories',
        sections,
        sectionData: {
            categoryProducts: {
                showCategoryDescription: true,
                showCategoryHero: true,
                showFilters: true,
                showSort: true,
                productsPerPage: 12,
                columns: 4,
                cardStyle: 'modern',
                paddingY: 'lg',
                paddingX: 'md',
                colors: {
                    background: '#0f172a',
                    heading: '#F9FAFB',
                    text: '#94a3b8',
                    accent: '#4f46e5',
                    cardBackground: '#1e293b',
                    cardText: '#94a3b8',
                },
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: {
            title: 'Categoría',
            description: 'Productos de esta categoría',
        },
        isHomePage: false,
        showInNavigation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a blog listing page
 */
export const createBlogPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'hero', 'footer'];
    return {
        id: `page-blog-${Date.now()}`,
        title: 'Blog',
        slug: '/blog',
        type: 'static',
        sections,
        sectionData: {
            hero: {
                ...initialData.data.hero,
                headline: 'Nuestro Blog',
                subheadline: 'Artículos, noticias y recursos para ti',
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Blog', 'Lee nuestros últimos artículos y noticias'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create an article page (dynamic)
 */
export const createArticlePage = (): SitePage => {
    const sections: PageSection[] = ['header', 'articleContent', 'footer'];
    return {
        id: `page-article-${Date.now()}`,
        title: 'Artículo',
        slug: '/blog/:slug',
        type: 'dynamic',
        dynamicSource: 'blogPosts',
        sections,
        sectionData: {
            articleContent: {
                showFeaturedImage: true,
                showAuthor: true,
                showDate: true,
                showTags: true,
                showRelatedArticles: true,
                relatedArticlesCount: 3,
                showShareButtons: true,
                showTableOfContents: false,
                maxWidth: 'lg',
                paddingY: 'lg',
                paddingX: 'md',
                colors: {
                    background: '#0f172a',
                    heading: '#F9FAFB',
                    text: '#94a3b8',
                    accent: '#4f46e5',
                    linkColor: '#4f46e5',
                },
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: {
            title: 'Artículo',
            description: 'Contenido del artículo',
        },
        isHomePage: false,
        showInNavigation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a contact page
 */
export const createContactPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'leads', 'map', 'footer'];
    return {
        id: `page-contact-${Date.now()}`,
        title: 'Contacto',
        slug: '/contacto',
        type: 'static',
        sections,
        sectionData: {
            leads: {
                ...initialData.data.leads,
                title: 'Contáctanos',
                description: '¿Tienes preguntas? Nos encantaría saber de ti. Completa el formulario y te responderemos pronto.',
            },
            map: initialData.data.map,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Contacto', 'Ponte en contacto con nosotros'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create an about page
 */
export const createAboutPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'hero', 'team', 'testimonials', 'footer'];
    return {
        id: `page-about-${Date.now()}`,
        title: 'Nosotros',
        slug: '/nosotros',
        type: 'static',
        sections,
        sectionData: {
            hero: {
                ...initialData.data.hero,
                headline: 'Sobre Nosotros',
                subheadline: 'Conoce a nuestro equipo y nuestra historia',
            },
            team: initialData.data.team,
            testimonials: initialData.data.testimonials,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Nosotros', 'Conoce más sobre nuestra empresa'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a services page
 */
export const createServicesPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'hero', 'services', 'testimonials', 'cta', 'footer'];
    return {
        id: `page-services-${Date.now()}`,
        title: 'Servicios',
        slug: '/servicios',
        type: 'static',
        sections,
        sectionData: {
            hero: {
                ...initialData.data.hero,
                headline: 'Nuestros Servicios',
                subheadline: 'Soluciones diseñadas para tus necesidades',
            },
            services: initialData.data.services,
            testimonials: initialData.data.testimonials,
            cta: initialData.data.cta,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Servicios', 'Descubre nuestros servicios'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a portfolio page
 */
export const createPortfolioPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'hero', 'portfolio', 'testimonials', 'footer'];
    return {
        id: `page-portfolio-${Date.now()}`,
        title: 'Portafolio',
        slug: '/portafolio',
        type: 'static',
        sections,
        sectionData: {
            hero: {
                ...initialData.data.hero,
                headline: 'Nuestro Trabajo',
                subheadline: 'Proyectos que hemos realizado con éxito',
            },
            portfolio: initialData.data.portfolio,
            testimonials: initialData.data.testimonials,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Portafolio', 'Mira nuestros trabajos anteriores'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a pricing page
 */
export const createPricingPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'hero', 'pricing', 'faq', 'cta', 'footer'];
    return {
        id: `page-pricing-${Date.now()}`,
        title: 'Precios',
        slug: '/precios',
        type: 'static',
        sections,
        sectionData: {
            hero: {
                ...initialData.data.hero,
                headline: 'Nuestros Planes',
                subheadline: 'Elige el plan que mejor se adapte a tus necesidades',
            },
            pricing: initialData.data.pricing,
            faq: initialData.data.faq,
            cta: initialData.data.cta,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Precios', 'Consulta nuestros planes y precios'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a FAQ page
 */
export const createFaqPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'faq', 'cta', 'footer'];
    return {
        id: `page-faq-${Date.now()}`,
        title: 'Preguntas Frecuentes',
        slug: '/preguntas-frecuentes',
        type: 'static',
        sections,
        sectionData: {
            faq: {
                ...initialData.data.faq,
                title: 'Preguntas Frecuentes',
                description: 'Encuentra respuestas a las preguntas más comunes',
            },
            cta: initialData.data.cta,
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Preguntas Frecuentes', 'Resuelve tus dudas más comunes'),
        isHomePage: false,
        showInNavigation: true,
        navigationOrder: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a cart page
 */
export const createCartPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'cart', 'footer'];
    return {
        id: `page-cart-${Date.now()}`,
        title: 'Carrito',
        slug: '/carrito',
        type: 'static',
        sections,
        sectionData: {
            cart: {
                showSummary: true,
                showSuggestions: true,
                suggestionsCount: 4,
                showCouponInput: true,
                showShippingEstimate: true,
                paddingY: 'lg',
                paddingX: 'md',
                colors: {
                    background: '#0f172a',
                    heading: '#F9FAFB',
                    text: '#94a3b8',
                    accent: '#4f46e5',
                    cardBackground: '#1e293b',
                    buttonBackground: '#4f46e5',
                    buttonText: '#ffffff',
                },
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Carrito', 'Tu carrito de compras'),
        isHomePage: false,
        showInNavigation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Create a checkout page
 */
export const createCheckoutPage = (): SitePage => {
    const sections: PageSection[] = ['header', 'checkout', 'footer'];
    return {
        id: `page-checkout-${Date.now()}`,
        title: 'Finalizar Compra',
        slug: '/checkout',
        type: 'static',
        sections,
        sectionData: {
            checkout: {
                showOrderSummary: true,
                showShippingOptions: true,
                showCouponInput: true,
                requiredFields: ['phone'],
                paymentMethods: ['card', 'paypal'],
                layout: 'two-column',
                paddingY: 'lg',
                paddingX: 'md',
                colors: {
                    background: '#0f172a',
                    heading: '#F9FAFB',
                    text: '#94a3b8',
                    accent: '#4f46e5',
                    cardBackground: '#1e293b',
                    buttonBackground: '#4f46e5',
                    buttonText: '#ffffff',
                    inputBackground: '#0f172a',
                    inputBorder: '#334155',
                },
            },
            header: initialData.data.header,
            footer: initialData.data.footer,
        },
        seo: createDefaultSEO('Checkout', 'Finaliza tu compra'),
        isHomePage: false,
        showInNavigation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

// =============================================================================
// PAGE FACTORY
// =============================================================================

/**
 * Factory function to create a page from a template ID
 */
export const createPageFromTemplate = (templateId: PageTemplateId, businessName?: string): SitePage => {
    const factories: Record<PageTemplateId, (businessName?: string) => SitePage> = {
        'home': createHomePage,
        'store': createStorePage,
        'product-detail': createProductDetailPage,
        'category': createCategoryPage,
        'blog': createBlogPage,
        'article': createArticlePage,
        'contact': createContactPage,
        'about': createAboutPage,
        'services': createServicesPage,
        'portfolio': createPortfolioPage,
        'pricing': createPricingPage,
        'faq': createFaqPage,
        'cart': createCartPage,
        'checkout': createCheckoutPage,
    };
    
    const factory = factories[templateId];
    if (!factory) {
        throw new Error(`Unknown page template: ${templateId}`);
    }
    
    return factory(businessName);
};

/**
 * Create multiple pages from an array of template IDs
 */
export const createPagesFromTemplates = (templateIds: PageTemplateId[], businessName?: string): SitePage[] => {
    return templateIds.map(templateId => createPageFromTemplate(templateId, businessName));
};

// =============================================================================
// DEFAULT PAGE SET
// =============================================================================

/**
 * Create a default set of pages for a new project
 */
export const createDefaultPages = (options?: {
    businessName?: string;
    hasEcommerce?: boolean;
    industry?: string;
}): SitePage[] => {
    const { businessName, hasEcommerce = false } = options || {};
    
    const pages: SitePage[] = [
        createHomePage(businessName),
        createAboutPage(),
        createContactPage(),
    ];
    
    if (hasEcommerce) {
        pages.push(
            createStorePage(),
            createProductDetailPage(),
            createCategoryPage(),
            createCartPage(),
            createCheckoutPage(),
        );
    }
    
    // Sort by navigation order
    return pages.sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0));
};

/**
 * Create pages for a specific industry
 */
export const createIndustryPages = (industry: string, hasEcommerce: boolean = false): SitePage[] => {
    // Import dynamically to avoid circular dependencies
    const { getIndustryPageDefaults } = require('../types/onboarding');
    const pageTemplates = getIndustryPageDefaults(industry, hasEcommerce);
    return createPagesFromTemplates(pageTemplates);
};



