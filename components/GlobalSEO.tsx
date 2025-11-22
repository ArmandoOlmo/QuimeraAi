import React, { useEffect } from 'react';
import { SEOConfig } from '../types';

interface GlobalSEOProps {
  config: SEOConfig;
  customMeta?: Array<{ name?: string; property?: string; content: string }>;
}

const GlobalSEO: React.FC<GlobalSEOProps> = ({ config, customMeta = [] }) => {
  useEffect(() => {
    // Set document title
    document.title = config.title;

    // Helper to create or update meta tag
    const setMetaTag = (selector: string, content: string, attribute: 'name' | 'property' = 'name') => {
      if (!content) return;
      
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, selector.replace(`[${attribute}="`, '').replace('"]', ''));
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Helper to create or update link tag
    const setLinkTag = (rel: string, href: string) => {
      if (!href) return;
      
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.rel = rel;
        document.head.appendChild(element);
      }
      element.href = href;
    };

    // Basic SEO
    setMetaTag('[name="description"]', config.description);
    setMetaTag('[name="keywords"]', config.keywords.join(', '));
    if (config.author) setMetaTag('[name="author"]', config.author);
    setMetaTag('[name="robots"]', config.robots);
    
    // Language
    document.documentElement.lang = config.language;

    // Open Graph
    setMetaTag('[property="og:type"]', config.ogType, 'property');
    setMetaTag('[property="og:title"]', config.ogTitle || config.title, 'property');
    setMetaTag('[property="og:description"]', config.ogDescription || config.description, 'property');
    if (config.ogImage) setMetaTag('[property="og:image"]', config.ogImage, 'property');
    if (config.ogImageAlt) setMetaTag('[property="og:image:alt"]', config.ogImageAlt, 'property');
    if (config.ogUrl) setMetaTag('[property="og:url"]', config.ogUrl, 'property');
    if (config.ogSiteName) setMetaTag('[property="og:site_name"]', config.ogSiteName, 'property');

    // Twitter Card
    setMetaTag('[name="twitter:card"]', config.twitterCard);
    if (config.twitterSite) setMetaTag('[name="twitter:site"]', config.twitterSite);
    if (config.twitterCreator) setMetaTag('[name="twitter:creator"]', config.twitterCreator);
    setMetaTag('[name="twitter:title"]', config.twitterTitle || config.title);
    setMetaTag('[name="twitter:description"]', config.twitterDescription || config.description);
    if (config.twitterImage) setMetaTag('[name="twitter:image"]', config.twitterImage);
    if (config.twitterImageAlt) setMetaTag('[name="twitter:image:alt"]', config.twitterImageAlt);

    // Verification
    if (config.googleSiteVerification) setMetaTag('[name="google-site-verification"]', config.googleSiteVerification);
    if (config.bingVerification) setMetaTag('[name="msvalidate.01"]', config.bingVerification);

    // Canonical URL
    if (config.canonical) setLinkTag('canonical', config.canonical);

    // AI Bot Optimization - Custom meta tags for AI crawlers
    if (config.aiCrawlable) {
      setMetaTag('[name="ai:crawlable"]', 'true');
      if (config.aiDescription) setMetaTag('[name="ai:description"]', config.aiDescription);
      if (config.aiKeyTopics && config.aiKeyTopics.length > 0) {
        setMetaTag('[name="ai:topics"]', config.aiKeyTopics.join(', '));
      }
    }

    // Custom meta tags
    customMeta.forEach(meta => {
      if (meta.name) {
        setMetaTag(`[name="${meta.name}"]`, meta.content);
      } else if (meta.property) {
        setMetaTag(`[property="${meta.property}"]`, meta.content, 'property');
      }
    });

    // Structured Data (Schema.org JSON-LD)
    if (config.schemaData) {
      let scriptElement = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      
      const schemaMarkup = generateSchemaMarkup(config);
      scriptElement.textContent = JSON.stringify(schemaMarkup);
    }
  }, [config, customMeta]);

  return null; // This component doesn't render anything
};

// Helper function to generate Schema.org markup
const generateSchemaMarkup = (config: SEOConfig) => {
  const baseSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': config.schemaType,
    name: config.title,
    description: config.description,
    url: config.canonical || config.ogUrl,
    ...(config.schemaData || {}),
  };

  // Add image if available
  if (config.ogImage) {
    baseSchema['image'] = config.ogImage;
  }

  return baseSchema;
};

export default GlobalSEO;

