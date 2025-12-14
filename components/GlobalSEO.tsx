import React, { useEffect, useState } from 'react';
import { SEOConfig } from '../types';
import { db, doc, getDoc } from '../firebase';

interface GlobalSEOProps {
  config: SEOConfig;
  customMeta?: Array<{ name?: string; property?: string; content: string }>;
}

interface AppInfoConfig {
  appName?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  faviconUrl?: string;
  socialImageUrl?: string;
}

const GlobalSEO: React.FC<GlobalSEOProps> = ({ config, customMeta = [] }) => {
  const [appInfo, setAppInfo] = useState<AppInfoConfig | null>(null);

  // Load global app information from Firestore
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const settingsRef = doc(db, 'globalSettings', 'appInfo');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setAppInfo(settingsSnap.data() as AppInfoConfig);
        }
      } catch (error) {
        console.error('Error loading global app info for SEO:', error);
      }
    };
    loadAppInfo();
  }, []);

  useEffect(() => {
    // Use app info title if available, otherwise fall back to config
    const title = appInfo?.metaTitle || config.title;
    document.title = title;

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
    const setLinkTag = (rel: string, href: string, type?: string) => {
      if (!href) return;
      
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.rel = rel;
        document.head.appendChild(element);
      }
      element.href = href;
      if (type) {
        element.type = type;
      }
    };

    // Apply favicon from global app info (priority) or fallback
    if (appInfo?.faviconUrl) {
      // Determine type based on URL extension
      const faviconType = appInfo.faviconUrl.includes('.svg') 
        ? 'image/svg+xml' 
        : appInfo.faviconUrl.includes('.ico') 
          ? 'image/x-icon' 
          : 'image/png';
      setLinkTag('icon', appInfo.faviconUrl, faviconType);
      // Also set apple-touch-icon for iOS devices
      if (!appInfo.faviconUrl.includes('.ico')) {
        setLinkTag('apple-touch-icon', appInfo.faviconUrl);
      }
    }

    // Basic SEO - Use appInfo values if available, otherwise fall back to config
    const description = appInfo?.metaDescription || config.description;
    const keywords = appInfo?.metaKeywords?.length ? appInfo.metaKeywords : config.keywords;
    
    setMetaTag('[name="description"]', description);
    setMetaTag('[name="keywords"]', keywords.join(', '));
    if (config.author) setMetaTag('[name="author"]', config.author);
    setMetaTag('[name="robots"]', config.robots);
    
    // Language
    document.documentElement.lang = config.language;

    // Open Graph - Use appInfo values if available
    const ogTitle = appInfo?.metaTitle || config.ogTitle || config.title;
    const ogDescription = appInfo?.metaDescription || config.ogDescription || config.description;
    const ogImage = appInfo?.socialImageUrl || config.ogImage;
    
    setMetaTag('[property="og:type"]', config.ogType, 'property');
    setMetaTag('[property="og:title"]', ogTitle, 'property');
    setMetaTag('[property="og:description"]', ogDescription, 'property');
    if (ogImage) setMetaTag('[property="og:image"]', ogImage, 'property');
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
  }, [config, customMeta, appInfo]);

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

