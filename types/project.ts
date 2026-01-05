/**
 * Project Types
 * Tipos para proyectos y templates
 */

import { PageData } from './components';
import { ThemeData, PageSection } from './ui';
import { BrandIdentity } from './business';
import { NavigationMenu } from './navigation';
import { AiAssistantConfig } from './ai-assistant';
import { ResponsiveStyles, ABTestConfig, ComponentStyles } from './features';
import { SEOConfig } from './seo';

// =============================================================================
// MULTI-PAGE ARCHITECTURE
// =============================================================================

/**
 * Tipo de página: estática o dinámica
 * - static: Página con contenido fijo (Home, Contacto, etc.)
 * - dynamic: Página generada dinámicamente desde una fuente de datos
 */
export type PageType = 'static' | 'dynamic';

/**
 * Fuente de datos para páginas dinámicas
 * - products: Página de detalle de producto (/producto/:slug)
 * - categories: Página de categoría (/categoria/:slug)
 * - blogPosts: Página de artículo (/blog/:slug)
 */
export type DynamicSource = 'products' | 'categories' | 'blogPosts';

/**
 * Configuración SEO específica de una página
 */
export interface PageSEO {
    /** Título para SEO (meta title). Si no se define, usa el título de la página */
    title?: string;
    /** Descripción para SEO (meta description) */
    description?: string;
    /** Imagen para compartir (og:image) */
    image?: string;
    /** Keywords específicos de esta página */
    keywords?: string[];
    /** Canonical URL override */
    canonicalUrl?: string;
    /** No index this page */
    noIndex?: boolean;
}

/**
 * SitePage - Define una página del sitio web
 * 
 * Cada proyecto puede tener múltiples páginas. Cada página tiene:
 * - Una URL única (slug)
 * - Tipo (estática o dinámica)
 * - Secciones configurables
 * - Datos específicos de la página
 * - Configuración SEO
 */
export interface SitePage {
    /** ID único de la página */
    id: string;
    
    /** Título visible de la página (usado en navegación) */
    title: string;
    
    /** 
     * URL path de la página. Ejemplos:
     * - "/" para home
     * - "/tienda" para página estática de tienda
     * - "/producto/:slug" para páginas dinámicas de producto
     * - "/categoria/:slug" para páginas dinámicas de categoría
     * - "/blog/:slug" para páginas dinámicas de artículos
     */
    slug: string;
    
    /** Tipo de página */
    type: PageType;
    
    /** Fuente de datos para páginas dinámicas */
    dynamicSource?: DynamicSource;
    
    /**
     * Secciones de la página - reutiliza el sistema existente
     * El orden de este array determina el orden de las secciones en la página
     */
    sections: PageSection[];
    
    /**
     * Datos específicos de esta página
     * Contiene los datos de configuración de cada sección
     * Es un subconjunto de PageData con solo las secciones activas
     */
    sectionData: Partial<PageData>;
    
    /** Configuración SEO de esta página */
    seo: PageSEO;
    
    /** ¿Es la página principal (home)? Solo una página puede ser home */
    isHomePage?: boolean;
    
    /** ¿Mostrar en la navegación principal? */
    showInNavigation?: boolean;
    
    /** Orden en la navegación (menor = primero) */
    navigationOrder?: number;
    
    /** Icono para mostrar en navegación (opcional) */
    navigationIcon?: string;
    
    /** Fecha de creación */
    createdAt?: string;
    
    /** Última modificación */
    updatedAt?: string;
}

/**
 * Resultado de matchear una URL con una página
 */
export interface PageMatch {
    /** La página que matcheó */
    page: SitePage;
    /** Parámetros extraídos de la URL (para rutas dinámicas) */
    params: {
        slug?: string;
        [key: string]: string | undefined;
    };
}

// =============================================================================
// PROJECT
// =============================================================================
export interface Project {
    id: string;
    name: string;
    userId?: string;                // Owner user ID
    thumbnailUrl: string;
    faviconUrl?: string;  // Favicon URL for the website
    status: 'Published' | 'Draft' | 'Template';
    lastUpdated: string;
    
    // ==========================================================================
    // MULTI-PAGE ARCHITECTURE (NEW)
    // ==========================================================================
    /**
     * Array de páginas del sitio web.
     * Cada página tiene su propia URL, secciones y configuración SEO.
     * Si pages está vacío o no existe, se usa data/componentOrder para compatibilidad.
     */
    pages?: SitePage[];
    
    // ==========================================================================
    // LEGACY: Single-page data (mantener para compatibilidad hacia atrás)
    // Estos campos representan la "home page" cuando pages[] no existe
    // ==========================================================================
    data: PageData;
    theme: ThemeData;
    brandIdentity: BrandIdentity;
    componentOrder: PageSection[];
    sectionVisibility: Record<PageSection, boolean>;
    
    isArchived?: boolean;
    sourceTemplateId?: string;
    imagePrompts?: Record<string, string>;
    menus?: NavigationMenu[];
    aiAssistantConfig?: AiAssistantConfig;
    responsiveStyles?: Record<string, ResponsiveStyles>;
    seoConfig?: SEOConfig;
    
    // Design Tokens
    designTokens?: import('./features').DesignTokens;
    
    // A/B Testing
    abTests?: ABTestConfig[];
    
    // Component customization
    componentStatus?: Record<PageSection, boolean>;
    componentStyles?: ComponentStyles;
    
    // Template-specific fields
    category?: string;
    tags?: string[];
    description?: string;
    isFeatured?: boolean;
    previewImages?: string[];
    author?: string;
    version?: string;
    compatibilityVersion?: string;
    createdAt?: string;
    
    // Industry classification for LLM template matching
    industries?: string[];
}









