import type { Project, SEOConfig } from '../types';

/** Build a complete SEOConfig from project data (used by SEO dashboard + editor context). */
export function resolveProjectSeoConfig(project: Project): SEOConfig {
    const existing = project.seoConfig;

    return {
        title: existing?.title ?? project.name ?? '',
        description: existing?.description ?? '',
        keywords: existing?.keywords ?? [],
        language: existing?.language ?? 'es',
        ogType: existing?.ogType ?? 'website',
        twitterCard: existing?.twitterCard ?? 'summary_large_image',
        schemaType: existing?.schemaType ?? 'WebSite',
        robots: existing?.robots ?? 'index, follow',
        aiCrawlable: existing?.aiCrawlable ?? true,
        author: existing?.author,
        siteDescription: existing?.siteDescription,
        favicon: existing?.favicon,
        ogTitle: existing?.ogTitle,
        ogDescription: existing?.ogDescription,
        ogImage: existing?.ogImage,
        defaultOGImage: existing?.defaultOGImage,
        ogImageAlt: existing?.ogImageAlt,
        ogUrl: existing?.ogUrl,
        ogSiteName: existing?.ogSiteName,
        twitterSite: existing?.twitterSite,
        twitterCreator: existing?.twitterCreator,
        twitterTitle: existing?.twitterTitle,
        twitterDescription: existing?.twitterDescription,
        twitterImage: existing?.twitterImage,
        twitterImageAlt: existing?.twitterImageAlt,
        schemaData: existing?.schemaData,
        canonical: existing?.canonical,
        googleSiteVerification: existing?.googleSiteVerification,
        bingVerification: existing?.bingVerification,
        aiDescription: existing?.aiDescription,
        aiKeyTopics: existing?.aiKeyTopics,
        adPixels: existing?.adPixels,
    };
}
