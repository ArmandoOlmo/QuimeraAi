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
    const projectName = activeProject?.name || brandIdentity?.businessName || 'Quimera.ai';
    const baseTitle = options.pageTitle || data?.hero?.headline || projectName;
    const baseDescription = options.pageDescription || data?.hero?.subheadline || 'Powered by Quimera.ai';
    const baseImage = options.pageImage || data?.hero?.imageUrl || brandIdentity?.logoUrl;

    // Merge with project-specific SEO config
    const config: SEOConfig = {
      // Basic SEO
      title: seoConfig?.title || `${baseTitle} | ${projectName}`,
      description: seoConfig?.description || baseDescription,
      keywords: seoConfig?.keywords || ['AI', 'website builder', 'no-code'],
      author: seoConfig?.author || brandIdentity?.businessName,
      language: seoConfig?.language || 'es',
      
      // Open Graph
      ogType: options.pageType || seoConfig?.ogType || 'website',
      ogTitle: seoConfig?.ogTitle || baseTitle,
      ogDescription: seoConfig?.ogDescription || baseDescription,
      ogImage: seoConfig?.ogImage || baseImage,
      ogImageAlt: seoConfig?.ogImageAlt || `${projectName} - ${baseTitle}`,
      ogUrl: seoConfig?.canonical || (typeof window !== 'undefined' ? window.location.href : ''),
      ogSiteName: seoConfig?.ogSiteName || projectName,
      
      // Twitter Card
      twitterCard: seoConfig?.twitterCard || 'summary_large_image',
      twitterSite: seoConfig?.twitterSite,
      twitterCreator: seoConfig?.twitterCreator,
      twitterTitle: seoConfig?.twitterTitle || baseTitle,
      twitterDescription: seoConfig?.twitterDescription || baseDescription,
      twitterImage: seoConfig?.twitterImage || baseImage,
      twitterImageAlt: seoConfig?.twitterImageAlt || `${projectName} - ${baseTitle}`,
      
      // Schema.org
      schemaType: seoConfig?.schemaType || 'WebSite',
      schemaData: seoConfig?.schemaData || {
        name: projectName,
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

