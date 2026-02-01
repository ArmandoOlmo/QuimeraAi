/**
 * Agency Content Types
 * Types for the Agency's landing page content and navigation
 * Mirrors appContent.ts but scoped to each agency tenant
 */

// =============================================================================
// AGENCY ARTICLES (Artículos del blog/contenido de la Agency)
// =============================================================================

export interface AgencyArticle {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featuredImage: string;
    status: 'published' | 'draft';
    featured: boolean;
    category: AgencyArticleCategory;
    tags: string[];
    author: string;
    authorImage?: string;
    readTime?: number;
    views?: number;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    seo?: AgencyArticleSEO;
}

export type AgencyArticleCategory =
    | 'blog'
    | 'news'
    | 'tutorial'
    | 'case-study'
    | 'announcement'
    | 'guide'
    | 'update'
    | 'help'
    | 'portfolio';

export interface AgencyArticleSEO {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
}

// =============================================================================
// AGENCY NAVIGATION (Navegación del Landing de la Agency)
// =============================================================================

export interface AgencyNavigation {
    id: string;
    header: AgencyNavSection;
    footer: AgencyFooterConfig;
    updatedAt: string;
    updatedBy?: string;
}

export interface AgencyNavSection {
    logo?: AgencyLogoConfig;
    items: AgencyNavItem[];
    cta?: AgencyNavCTA;
}

export interface AgencyLogoConfig {
    imageUrl: string;
    text: string;
    href: string;
}

export interface AgencyNavItem {
    id: string;
    label: string;
    href: string;
    type: 'link' | 'anchor' | 'dropdown' | 'article';
    target?: '_blank' | '_self';
    children?: AgencyNavItem[];
    articleSlug?: string;
    icon?: string;
    isNew?: boolean;
}

export interface AgencyNavCTA {
    loginText: string;
    loginHref: string;
    registerText: string;
    registerHref: string;
}

export interface AgencyFooterConfig {
    columns: AgencyFooterColumn[];
    bottomText?: string;
    socialLinks?: AgencySocialLink[];
    showNewsletter?: boolean;
    newsletterTitle?: string;
    newsletterDescription?: string;
}

export interface AgencyFooterColumn {
    id: string;
    title: string;
    items: AgencyNavItem[];
}

export interface AgencySocialLink {
    id: string;
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'github' | 'discord';
    url: string;
}

// =============================================================================
// LEGAL PAGES (Privacy Policy, Data Deletion, Terms)
// =============================================================================

export type AgencyLegalPageType = 'privacy-policy' | 'data-deletion' | 'terms-of-service' | 'cookie-policy';

export interface AgencyLegalPageSection {
    id: string;
    title: string;
    icon?: string;
    content: string;
}

export interface AgencyLegalPage {
    id: string;
    type: AgencyLegalPageType;
    title: string;
    subtitle?: string;
    lastUpdated: string;
    sections: AgencyLegalPageSection[];
    contactEmail?: string;
    contactInfo?: string;
    status: 'published' | 'draft';
    createdAt: string;
    updatedAt: string;
}

export const AGENCY_LEGAL_PAGE_LABELS: Record<AgencyLegalPageType, string> = {
    'privacy-policy': 'Política de Privacidad',
    'data-deletion': 'Eliminación de Datos',
    'terms-of-service': 'Términos de Servicio',
    'cookie-policy': 'Política de Cookies',
};

export const AGENCY_CATEGORY_LABELS: Record<AgencyArticleCategory, string> = {
    'blog': 'Blog',
    'news': 'News',
    'tutorial': 'Tutorial',
    'case-study': 'Case Study',
    'announcement': 'Announcement',
    'guide': 'Guide',
    'update': 'Product Update',
    'help': 'Help',
    'portfolio': 'Portfolio',
};

// =============================================================================
// AGENCY CONTENT CONTEXT TYPES
// =============================================================================

export interface AgencyContentContextType {
    // Articles
    articles: AgencyArticle[];
    featuredArticles: AgencyArticle[];
    isLoadingArticles: boolean;
    loadArticles: () => Promise<void>;
    getArticleBySlug: (slug: string) => AgencyArticle | undefined;
    saveArticle: (article: AgencyArticle) => Promise<void>;
    deleteArticle: (id: string) => Promise<void>;

    // Navigation
    navigation: AgencyNavigation | null;
    isLoadingNavigation: boolean;
    loadNavigation: () => Promise<void>;
    saveNavigation: (navigation: AgencyNavigation) => Promise<void>;

    // Legal Pages
    legalPages: AgencyLegalPage[];
    isLoadingLegalPages: boolean;
    loadLegalPages: () => Promise<void>;
    getLegalPageByType: (type: AgencyLegalPageType) => AgencyLegalPage | undefined;
    saveLegalPage: (page: AgencyLegalPage) => Promise<void>;
    deleteLegalPage: (id: string) => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_AGENCY_NAVIGATION: AgencyNavigation = {
    id: 'main',
    header: {
        logo: {
            imageUrl: '',
            text: 'My Agency',
            href: '/'
        },
        items: [
            { id: '1', label: 'Services', href: '#services', type: 'anchor' },
            { id: '2', label: 'Portfolio', href: '#portfolio', type: 'anchor' },
            { id: '3', label: 'Contact', href: '/contact', type: 'link' },
        ],
        cta: {
            loginText: 'Client Login',
            loginHref: '/login',
            registerText: 'Get a Quote',
            registerHref: '/contact'
        }
    },
    footer: {
        columns: [
            {
                id: 'services',
                title: 'Services',
                items: [
                    { id: '1', label: 'Web Design', href: '#services', type: 'anchor' },
                    { id: '2', label: 'Development', href: '#services', type: 'anchor' },
                    { id: '3', label: 'Marketing', href: '#services', type: 'anchor' },
                ]
            },
            {
                id: 'company',
                title: 'Company',
                items: [
                    { id: '1', label: 'About', href: '/about', type: 'link' },
                    { id: '2', label: 'Contact', href: '/contact', type: 'link' },
                ]
            },
            {
                id: 'legal',
                title: 'Legal',
                items: [
                    { id: '1', label: 'Privacy Policy', href: '/privacy-policy', type: 'link' },
                    { id: '2', label: 'Terms of Service', href: '/terms-of-service', type: 'link' },
                ]
            }
        ],
        socialLinks: [
            { id: '1', platform: 'twitter', url: '' },
            { id: '2', platform: 'linkedin', url: '' },
            { id: '3', platform: 'instagram', url: '' },
        ],
        bottomText: '© 2024 My Agency. All rights reserved.',
        showNewsletter: false
    },
    updatedAt: new Date().toISOString()
};

export const DEFAULT_AGENCY_PRIVACY_POLICY: AgencyLegalPage = {
    id: 'privacy-policy',
    type: 'privacy-policy',
    title: 'Política de Privacidad',
    subtitle: 'Cómo recopilamos, usamos y protegemos su información',
    lastUpdated: new Date().toISOString(),
    contactEmail: 'privacy@example.com',
    status: 'draft',
    sections: [
        {
            id: 'intro',
            title: 'Introducción',
            icon: 'Globe',
            content: 'Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal.'
        },
        {
            id: 'info-collected',
            title: 'Información que Recopilamos',
            icon: 'Database',
            content: 'Recopilamos información que usted nos proporciona directamente, como su nombre, correo electrónico, y cualquier otra información que decida compartir.'
        },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const DEFAULT_AGENCY_DATA_DELETION: AgencyLegalPage = {
    id: 'data-deletion',
    type: 'data-deletion',
    title: 'Eliminación de Datos',
    subtitle: 'Respetamos su derecho a controlar sus datos personales',
    lastUpdated: new Date().toISOString(),
    contactEmail: 'privacy@example.com',
    status: 'draft',
    sections: [
        {
            id: 'what-deleted',
            title: '¿Qué datos se eliminarán?',
            icon: 'FileText',
            content: 'Al solicitar la eliminación de datos, se eliminarán todos los datos personales que hayamos recopilado sobre usted.'
        },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const DEFAULT_AGENCY_TERMS: AgencyLegalPage = {
    id: 'terms-of-service',
    type: 'terms-of-service',
    title: 'Términos de Servicio',
    subtitle: 'Condiciones de uso de nuestros servicios',
    lastUpdated: new Date().toISOString(),
    contactEmail: 'legal@example.com',
    status: 'draft',
    sections: [
        {
            id: 'acceptance',
            title: 'Aceptación de los Términos',
            icon: 'FileText',
            content: 'Al utilizar nuestros servicios, usted acepta estos términos de servicio.'
        },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const DEFAULT_AGENCY_COOKIE_POLICY: AgencyLegalPage = {
    id: 'cookie-policy',
    type: 'cookie-policy',
    title: 'Política de Cookies',
    subtitle: 'Información sobre el uso de cookies',
    lastUpdated: new Date().toISOString(),
    contactEmail: 'privacy@example.com',
    status: 'draft',
    sections: [
        {
            id: 'what-are-cookies',
            title: '¿Qué son las Cookies?',
            icon: 'FileText',
            content: 'Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo.'
        },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};
