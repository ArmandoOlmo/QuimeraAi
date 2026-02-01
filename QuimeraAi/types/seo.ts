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
    
    // Favicon
    favicon?: string;
    
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
    
    // Ad Tracking Pixels
    adPixels?: AdPixelConfig;
}

export interface ProjectSEO extends SEOConfig {
    projectId: string;
    lastUpdated: string;
}

// =============================================================================
// AD TRACKING PIXELS CONFIGURATION
// =============================================================================

/**
 * Configuración de píxeles de tracking para plataformas publicitarias
 * Soporta todas las principales redes sociales y plataformas de ads
 */
export interface AdPixelConfig {
    // Facebook/Meta Pixel
    facebookPixelId?: string;
    facebookPixelEnabled?: boolean;
    
    // Google Ads / Google Tag Manager
    googleAdsId?: string;  // AW-XXXXXXXXX
    googleAdsEnabled?: boolean;
    googleTagManagerId?: string;  // GTM-XXXXXXX
    googleTagManagerEnabled?: boolean;
    
    // Google Analytics 4
    googleAnalyticsId?: string;  // G-XXXXXXXXXX
    googleAnalyticsEnabled?: boolean;
    
    // TikTok Pixel
    tiktokPixelId?: string;
    tiktokPixelEnabled?: boolean;
    
    // Twitter/X Pixel
    twitterPixelId?: string;
    twitterPixelEnabled?: boolean;
    
    // LinkedIn Insight Tag
    linkedinPartnerId?: string;
    linkedinEnabled?: boolean;
    
    // Pinterest Tag
    pinterestTagId?: string;
    pinterestEnabled?: boolean;
    
    // Snapchat Pixel
    snapchatPixelId?: string;
    snapchatEnabled?: boolean;
    
    // Microsoft/Bing Ads UET Tag
    microsoftUetId?: string;
    microsoftUetEnabled?: boolean;
    
    // Reddit Pixel
    redditPixelId?: string;
    redditPixelEnabled?: boolean;
    
    // Custom Scripts (para otros píxeles no listados)
    customHeadScripts?: string;
    customBodyScripts?: string;
}



























