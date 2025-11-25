/**
 * SEO Types
 * Tipos para configuración SEO y optimización
 */

// =============================================================================
// SEO CONFIGURATION
// =============================================================================
export interface SEOConfig {
    // Basic SEO
    title: string;
    description: string;
    keywords: string[];
    author?: string;
    language: string;
    
    // Open Graph (Facebook, LinkedIn, etc.)
    ogType: 'website' | 'article' | 'product' | 'profile';
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogUrl?: string;
    ogSiteName?: string;
    
    // Twitter Card
    twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
    twitterSite?: string;
    twitterCreator?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    twitterImageAlt?: string;
    
    // Structured Data (Schema.org)
    schemaType: 'Organization' | 'LocalBusiness' | 'WebSite' | 'Article' | 'Product' | 'Service';
    schemaData?: Record<string, any>;
    
    // Technical SEO
    canonical?: string;
    robots: string;
    googleSiteVerification?: string;
    bingVerification?: string;
    
    // AI Bot Optimization
    aiCrawlable: boolean;
    aiDescription?: string;
    aiKeyTopics?: string[];
}

export interface ProjectSEO extends SEOConfig {
    projectId: string;
    lastUpdated: string;
}



