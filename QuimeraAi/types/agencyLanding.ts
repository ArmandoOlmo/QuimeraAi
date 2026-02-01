/**
 * Agency Landing Page Types
 * Uses the SAME component types as Quimera's landing page
 * This ensures identical features and visual structure
 */

import { 
    PageSection,
    ThemeData,
    GlobalColors,
    FontFamily,
    BorderRadiusSize,
    // Component Data Types
    HeaderData,
    HeroData,
    HeroSplitData,
    FeaturesData,
    TestimonialsData,
    SlideshowData,
    PricingData,
    FaqData,
    LeadsData,
    NewsletterData,
    CtaData,
    PortfolioData,
    ServicesData,
    TeamData,
    VideoData,
    HowItWorksData,
    FooterData,
    MapData,
    MenuData,
    BannerData,
    ProductsData,
} from './index';

// =============================================================================
// AGENCY LANDING SECTION
// =============================================================================

/**
 * Same structure as Quimera's LandingSection
 */
export interface AgencyLandingSection {
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    data: Record<string, any>;
}

// =============================================================================
// AGENCY LANDING BRANDING
// =============================================================================

export interface AgencyBranding {
    logoType: 'text' | 'image' | 'both';
    logoText: string;
    logoImageUrl?: string;
    logoWidth?: number;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
}

// =============================================================================
// AGENCY LANDING DOMAIN CONFIG
// =============================================================================

export interface AgencyDomainConfig {
    subdomain?: string; // e.g., "myagency" -> myagency.quimera.app
    customDomain?: string; // e.g., "www.myagency.com"
    sslEnabled?: boolean;
    domainVerified?: boolean;
}

// =============================================================================
// AGENCY LANDING SEO
// =============================================================================

export interface AgencyLandingSEO {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    canonicalUrl?: string;
    noIndex?: boolean;
    structuredData?: Record<string, any>;
}

// =============================================================================
// AGENCY LANDING TYPOGRAPHY
// =============================================================================

export interface AgencyTypography {
    headingFont: FontFamily;
    bodyFont: FontFamily;
    buttonFont: FontFamily;
    headingsCaps?: boolean;
    buttonsCaps?: boolean;
    navLinksCaps?: boolean;
}

// =============================================================================
// AGENCY LANDING CONFIG (MAIN)
// =============================================================================

/**
 * Complete agency landing page configuration
 * Mirrors the structure stored in globalSettings/landingPage for Quimera
 */
export interface AgencyLandingConfig {
    // Identity
    id?: string;
    tenantId: string;
    
    // Sections - Same as Quimera
    sections: AgencyLandingSection[];
    
    // Theme & Colors
    theme: {
        cardBorderRadius: BorderRadiusSize;
        buttonBorderRadius: BorderRadiusSize;
        fontFamilyHeader: FontFamily;
        fontFamilyBody: FontFamily;
        fontFamilyButton: FontFamily;
        headingsAllCaps?: boolean;
        buttonsAllCaps?: boolean;
        navLinksAllCaps?: boolean;
        pageBackground: string;
        globalColors: GlobalColors;
        paletteColors?: string[];
    };
    
    // Agency Branding
    branding: AgencyBranding;
    
    // Domain & Publishing
    domain: AgencyDomainConfig;
    isPublished: boolean;
    publishedAt?: any; // Firestore Timestamp
    
    // SEO
    seo: AgencyLandingSEO;
    
    // Timestamps
    createdAt: any;
    updatedAt: any;
    lastUpdated?: any;
    updatedBy?: string;
}

// =============================================================================
// AGENCY PAGE DATA (Component data by section)
// =============================================================================

/**
 * All component data types available for agency landing pages
 * Same as Quimera's PageData
 */
export interface AgencyPageData {
    header?: HeaderData;
    hero?: HeroData;
    heroSplit?: HeroSplitData;
    features?: FeaturesData;
    testimonials?: TestimonialsData;
    slideshow?: SlideshowData;
    pricing?: PricingData;
    faq?: FaqData;
    leads?: LeadsData;
    newsletter?: NewsletterData;
    cta?: CtaData;
    portfolio?: PortfolioData;
    services?: ServicesData;
    team?: TeamData;
    video?: VideoData;
    howItWorks?: HowItWorksData;
    footer?: FooterData;
    map?: MapData;
    menu?: MenuData;
    banner?: BannerData;
    products?: ProductsData;
    // Add typography and colors for structure items
    typography?: AgencyTypography;
    colors?: GlobalColors;
}

// =============================================================================
// AVAILABLE COMPONENTS FOR AGENCY LANDING
// =============================================================================

/**
 * Components available in the agency landing editor
 * Same as AVAILABLE_COMPONENTS in LandingPageEditor
 */
export const AGENCY_LANDING_COMPONENTS = [
    { type: 'hero', label: 'Hero Principal', category: 'content' },
    { type: 'heroModern', label: 'Hero Moderno', category: 'content' },
    { type: 'heroGradient', label: 'Hero Gradiente', category: 'content' },
    { type: 'heroSplit', label: 'Hero Dividido', category: 'content' },
    { type: 'features', label: 'Características', category: 'content' },
    { type: 'services', label: 'Servicios', category: 'content' },
    { type: 'pricing', label: 'Precios', category: 'content' },
    { type: 'testimonials', label: 'Testimonios', category: 'content' },
    { type: 'portfolio', label: 'Portfolio', category: 'content' },
    { type: 'team', label: 'Equipo', category: 'content' },
    { type: 'faq', label: 'Preguntas Frecuentes', category: 'content' },
    { type: 'cta', label: 'Llamada a Acción', category: 'content' },
    { type: 'leads', label: 'Formulario de Contacto', category: 'content' },
    { type: 'newsletter', label: 'Newsletter', category: 'content' },
    { type: 'video', label: 'Video', category: 'content' },
    { type: 'slideshow', label: 'Carrusel de Imágenes', category: 'content' },
    { type: 'howItWorks', label: 'Cómo Funciona', category: 'content' },
    { type: 'map', label: 'Mapa', category: 'content' },
    { type: 'menu', label: 'Menú', category: 'content' },
    { type: 'banner', label: 'Banner', category: 'content' },
] as const;

/**
 * Structure items for global settings in agency landing editor
 */
export const AGENCY_STRUCTURE_ITEMS = [
    { id: 'colors', type: 'colors', label: 'Colores' },
    { id: 'typography', type: 'typography', label: 'Tipografía' },
    { id: 'navigation', type: 'header', label: 'Navegación' },
    { id: 'footerGlobal', type: 'footer', label: 'Pie de Página' },
    { id: 'branding', type: 'branding', label: 'Marca' },
    { id: 'seo', type: 'seo', label: 'SEO' },
    { id: 'domain', type: 'domain', label: 'Dominio' },
] as const;

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default theme for new agency landing pages
 */
export const DEFAULT_AGENCY_THEME: AgencyLandingConfig['theme'] = {
    cardBorderRadius: 'lg',
    buttonBorderRadius: 'lg',
    fontFamilyHeader: 'poppins',
    fontFamilyBody: 'mulish',
    fontFamilyButton: 'poppins',
    headingsAllCaps: false,
    buttonsAllCaps: false,
    navLinksAllCaps: false,
    pageBackground: '#0f172a',
    globalColors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#22d3ee',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#94a3b8',
        textMuted: '#64748b',
        heading: '#f1f5f9',
        border: '#334155',
        success: '#22c55e',
        error: '#ef4444',
    },
};

/**
 * Default branding for new agency landing pages
 */
export const DEFAULT_AGENCY_BRANDING: AgencyBranding = {
    logoType: 'text',
    logoText: 'Mi Agencia',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#22d3ee',
};

/**
 * Default SEO for new agency landing pages
 */
export const DEFAULT_AGENCY_SEO: AgencyLandingSEO = {
    title: 'Mi Agencia - Servicios Profesionales',
    description: 'Descubre nuestros servicios profesionales y cómo podemos ayudarte a alcanzar tus objetivos.',
    keywords: ['agencia', 'servicios', 'profesional'],
};

/**
 * Default sections for a new agency landing page
 */
export const DEFAULT_AGENCY_SECTIONS: AgencyLandingSection[] = [
    { id: 'header', type: 'header', enabled: true, order: 0, data: {} },
    { id: 'typography', type: 'typography', enabled: true, order: -1, data: {
        headingFont: 'poppins',
        bodyFont: 'mulish',
        buttonFont: 'poppins',
        headingsCaps: false,
        buttonsCaps: false,
        navLinksCaps: false,
    }},
    { id: 'hero', type: 'hero', enabled: true, order: 1, data: {} },
    { id: 'features', type: 'features', enabled: true, order: 2, data: {} },
    { id: 'services', type: 'services', enabled: true, order: 3, data: {} },
    { id: 'testimonials', type: 'testimonials', enabled: true, order: 4, data: {} },
    { id: 'portfolio', type: 'portfolio', enabled: true, order: 5, data: {} },
    { id: 'pricing', type: 'pricing', enabled: true, order: 6, data: {} },
    { id: 'faq', type: 'faq', enabled: true, order: 7, data: {} },
    { id: 'leads', type: 'leads', enabled: true, order: 8, data: {} },
    { id: 'cta', type: 'cta', enabled: true, order: 9, data: {} },
    { id: 'footer', type: 'footer', enabled: true, order: 10, data: {} },
];

/**
 * Creates a default landing config for a new agency
 */
export function createDefaultAgencyLandingConfig(tenantId: string, agencyName?: string): Omit<AgencyLandingConfig, 'createdAt' | 'updatedAt'> {
    return {
        tenantId,
        sections: DEFAULT_AGENCY_SECTIONS,
        theme: { ...DEFAULT_AGENCY_THEME },
        branding: {
            ...DEFAULT_AGENCY_BRANDING,
            logoText: agencyName || 'Mi Agencia',
        },
        domain: {},
        isPublished: false,
        seo: {
            ...DEFAULT_AGENCY_SEO,
            title: agencyName ? `${agencyName} - Servicios Profesionales` : DEFAULT_AGENCY_SEO.title,
        },
    };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type AgencyLandingComponentType = typeof AGENCY_LANDING_COMPONENTS[number]['type'];

export type AgencyLandingStructureType = typeof AGENCY_STRUCTURE_ITEMS[number]['type'];
