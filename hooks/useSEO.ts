import { useMemo } from 'react';
import { SEOConfig } from '../types';
import { useEditor } from '../contexts/EditorContext';

interface UseSEOOptions {
  pageTitle?: string;
  pageDescription?: string;
  pageImage?: string;
  pageType?: SEOConfig['ogType'];
}

export const useSEO = (options: UseSEOOptions = {}): SEOConfig => {
  const { data, brandIdentity, activeProject, seoConfig } = useEditor();

  return useMemo(() => {
    const appName = 'Quimera.ai';
    const projectName = activeProject?.name || brandIdentity?.businessName;
    const baseTitle = options.pageTitle || data?.hero?.headline || projectName;
    const baseDescription = options.pageDescription || data?.hero?.subheadline || 'Crea sitios web profesionales con inteligencia artificial';
    const baseImage = options.pageImage || data?.hero?.imageUrl || brandIdentity?.logoUrl;

    // Generate title avoiding duplication
    const generateTitle = (): string => {
      if (seoConfig?.title) return seoConfig.title;
      if (baseTitle && baseTitle !== appName) {
        return `${baseTitle} | ${appName}`;
      }
      return appName;
    };

    // Merge with project-specific SEO config
    const config: SEOConfig = {
      // Basic SEO
      title: generateTitle(),
      description: seoConfig?.description || baseDescription,
      keywords: seoConfig?.keywords || ['AI', 'website builder', 'no-code'],
      author: seoConfig?.author || brandIdentity?.businessName,
      language: seoConfig?.language || 'es',
      
      // Open Graph
      ogType: options.pageType || seoConfig?.ogType || 'website',
      ogTitle: seoConfig?.ogTitle || baseTitle || appName,
      ogDescription: seoConfig?.ogDescription || baseDescription,
      ogImage: seoConfig?.ogImage || baseImage,
      ogImageAlt: seoConfig?.ogImageAlt || (baseTitle ? `${appName} - ${baseTitle}` : appName),
      ogUrl: seoConfig?.canonical || (typeof window !== 'undefined' ? window.location.href : ''),
      ogSiteName: seoConfig?.ogSiteName || appName,
      
      // Twitter Card
      twitterCard: seoConfig?.twitterCard || 'summary_large_image',
      twitterSite: seoConfig?.twitterSite,
      twitterCreator: seoConfig?.twitterCreator,
      twitterTitle: seoConfig?.twitterTitle || baseTitle || appName,
      twitterDescription: seoConfig?.twitterDescription || baseDescription,
      twitterImage: seoConfig?.twitterImage || baseImage,
      twitterImageAlt: seoConfig?.twitterImageAlt || (baseTitle ? `${appName} - ${baseTitle}` : appName),
      
      // Schema.org
      schemaType: seoConfig?.schemaType || 'WebSite',
      schemaData: seoConfig?.schemaData || {
        name: projectName || appName,
        url: typeof window !== 'undefined' ? window.location.origin : '',
        potentialAction: {
          '@type': 'SearchAction',
          target: typeof window !== 'undefined' ? `${window.location.origin}/search?q={search_term_string}` : '',
          'query-input': 'required name=search_term_string'
        }
      },
      
      // Technical SEO
      canonical: seoConfig?.canonical || (typeof window !== 'undefined' ? window.location.href : ''),
      robots: seoConfig?.robots || 'index, follow',
      googleSiteVerification: seoConfig?.googleSiteVerification,
      bingVerification: seoConfig?.bingVerification,
      
      // AI Bot Optimization
      aiCrawlable: seoConfig?.aiCrawlable !== false,
      aiDescription: seoConfig?.aiDescription || `${baseDescription}. Built with Quimera.ai, an AI-powered website builder.`,
      aiKeyTopics: seoConfig?.aiKeyTopics || [
        brandIdentity?.industry || 'Technology',
        'AI',
        'Website Builder',
        'No-Code'
      ]
    };

    return config;
  }, [data, brandIdentity, activeProject, seoConfig, options]);
};

