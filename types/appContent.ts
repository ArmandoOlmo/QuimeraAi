/**
 * App Content Types
 * Tipos para el contenido y navegación de la landing page principal de Quimera
 */

// =============================================================================
// APP ARTICLES (Artículos del blog/contenido de la App)
// =============================================================================

export interface AppArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  status: 'published' | 'draft';
  featured: boolean; // Para destacar en front page
  category: AppArticleCategory;
  tags: string[];
  author: string;
  authorImage?: string;
  readTime?: number; // minutos estimados de lectura
  views?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  seo?: AppArticleSEO;
}

export type AppArticleCategory = 
  | 'blog'
  | 'news'
  | 'tutorial'
  | 'case-study'
  | 'announcement'
  | 'guide'
  | 'update';

export interface AppArticleSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
}

// =============================================================================
// APP NAVIGATION (Navegación del Landing de Quimera)
// =============================================================================

export interface AppNavigation {
  id: string;
  header: AppNavSection;
  footer: AppFooterConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface AppNavSection {
  logo?: AppLogoConfig;
  items: AppNavItem[];
  cta?: AppNavCTA;
}

export interface AppLogoConfig {
  imageUrl: string;
  text: string;
  href: string;
}

export interface AppNavItem {
  id: string;
  label: string;
  href: string;
  type: 'link' | 'anchor' | 'dropdown' | 'article';
  target?: '_blank' | '_self';
  children?: AppNavItem[];
  articleSlug?: string; // Si type es 'article', enlaza a un artículo
  icon?: string;
  isNew?: boolean;
}

export interface AppNavCTA {
  loginText: string;
  loginHref: string;
  registerText: string;
  registerHref: string;
}

export interface AppFooterConfig {
  columns: AppFooterColumn[];
  bottomText?: string;
  socialLinks?: AppSocialLink[];
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
}

export interface AppFooterColumn {
  id: string;
  title: string;
  items: AppNavItem[];
}

export interface AppSocialLink {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'github' | 'discord';
  url: string;
}

// =============================================================================
// APP LANDING PAGE SECTIONS (Secciones editables del Landing)
// =============================================================================

export interface AppLandingConfig {
  id: string;
  hero: AppHeroConfig;
  features: AppFeaturesConfig;
  pricing: AppPricingConfig;
  testimonials?: AppTestimonialsConfig;
  blog: AppBlogSectionConfig;
  cta?: AppCTASectionConfig;
  updatedAt: string;
}

export interface AppHeroConfig {
  enabled: boolean;
  badge?: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  image?: string;
  video?: string;
}

export interface AppFeaturesConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  features: AppFeatureItem[];
}

export interface AppFeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AppPricingConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  // Los planes se obtienen de la configuración de suscripciones existente
}

export interface AppTestimonialsConfig {
  enabled: boolean;
  title: string;
  testimonials: AppTestimonialItem[];
}

export interface AppTestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  image?: string;
  content: string;
  rating?: number;
}

export interface AppBlogSectionConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  showFeatured: boolean;
  maxArticles: number;
  ctaText?: string;
  ctaHref?: string;
}

export interface AppCTASectionConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  backgroundImage?: string;
}

// =============================================================================
// APP CONTENT CONTEXT TYPES
// =============================================================================

export interface AppContentContextType {
  // Articles
  articles: AppArticle[];
  featuredArticles: AppArticle[];
  isLoadingArticles: boolean;
  loadArticles: () => Promise<void>;
  getArticleBySlug: (slug: string) => AppArticle | undefined;
  saveArticle: (article: AppArticle) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  
  // Navigation
  navigation: AppNavigation | null;
  isLoadingNavigation: boolean;
  loadNavigation: () => Promise<void>;
  saveNavigation: (navigation: AppNavigation) => Promise<void>;
  
  // Landing Config
  landingConfig: AppLandingConfig | null;
  isLoadingLandingConfig: boolean;
  loadLandingConfig: () => Promise<void>;
  saveLandingConfig: (config: AppLandingConfig) => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_APP_NAVIGATION: AppNavigation = {
  id: 'main',
  header: {
    logo: {
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032',
      text: 'Quimera.ai',
      href: '/'
    },
    items: [
      { id: '1', label: 'Features', href: '#features', type: 'anchor' },
      { id: '2', label: 'Pricing', href: '#pricing', type: 'anchor' },
      { id: '3', label: 'Blog', href: '/blog', type: 'link' },
    ],
    cta: {
      loginText: 'Login',
      loginHref: '/login',
      registerText: 'Get Started',
      registerHref: '/register'
    }
  },
  footer: {
    columns: [
      {
        id: 'product',
        title: 'Product',
        items: [
          { id: '1', label: 'Features', href: '#features', type: 'anchor' },
          { id: '2', label: 'Pricing', href: '#pricing', type: 'anchor' },
          { id: '3', label: 'Templates', href: '/templates', type: 'link' },
        ]
      },
      {
        id: 'resources',
        title: 'Resources',
        items: [
          { id: '1', label: 'Blog', href: '/blog', type: 'link' },
          { id: '2', label: 'Documentation', href: '/docs', type: 'link' },
          { id: '3', label: 'Help Center', href: '/help', type: 'link' },
        ]
      },
      {
        id: 'company',
        title: 'Company',
        items: [
          { id: '1', label: 'About', href: '/about', type: 'link' },
          { id: '2', label: 'Contact', href: '/contact', type: 'link' },
          { id: '3', label: 'Privacy', href: '/privacy', type: 'link' },
        ]
      }
    ],
    socialLinks: [
      { id: '1', platform: 'twitter', url: 'https://twitter.com/quimeraai' },
      { id: '2', platform: 'linkedin', url: 'https://linkedin.com/company/quimeraai' },
    ],
    bottomText: '© 2024 Quimera.ai. All rights reserved.',
    showNewsletter: true,
    newsletterTitle: 'Stay updated',
    newsletterDescription: 'Get the latest news and updates from Quimera.'
  },
  updatedAt: new Date().toISOString()
};

export const DEFAULT_APP_LANDING_CONFIG: AppLandingConfig = {
  id: 'main',
  hero: {
    enabled: true,
    badge: 'AI-Powered',
    title: 'Build Amazing Websites',
    titleHighlight: 'with AI',
    subtitle: 'Create, localize, and scale marketing websites faster than ever before.',
    primaryCTA: {
      text: 'Get Started Free',
      href: '/register'
    },
    secondaryCTA: {
      text: 'Watch Demo',
      href: '#demo'
    }
  },
  features: {
    enabled: true,
    title: 'Everything you need',
    subtitle: 'Powerful features to build and grow your online presence',
    features: []
  },
  pricing: {
    enabled: true,
    title: 'Simple, transparent pricing',
    subtitle: 'Choose the plan that fits your needs'
  },
  blog: {
    enabled: true,
    title: 'Latest from the blog',
    subtitle: 'Insights, tutorials, and updates',
    showFeatured: true,
    maxArticles: 3,
    ctaText: 'View all articles',
    ctaHref: '/blog'
  },
  updatedAt: new Date().toISOString()
};
