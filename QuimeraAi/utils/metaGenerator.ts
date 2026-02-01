/**
 * Meta Tag Generator for Multi-Page Architecture
 * 
 * Generates SEO meta tags, Open Graph tags, and JSON-LD structured data
 * for both static and dynamic pages.
 */

import { SitePage, PageSEO, Project } from '../types/project';
import { ThemeData } from '../types/ui';

// Types for dynamic data
export interface DynamicData {
    product?: PublicProduct;
    category?: PublicCategory;
    article?: PublicArticle;
}

export interface PublicProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    image?: string;
    images?: string[];
    slug: string;
    sku?: string;
    brand?: string;
    category?: string;
    inStock?: boolean;
    rating?: number;
    reviewCount?: number;
}

export interface PublicCategory {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    slug: string;
    productCount?: number;
}

export interface PublicArticle {
    id: string;
    title: string;
    excerpt?: string;
    content?: string;
    featuredImage?: string;
    author?: string;
    publishedAt?: string;
    slug: string;
    tags?: string[];
    category?: string;
}

export interface MetaTags {
    title: string;
    description: string;
    keywords?: string;
    canonicalUrl?: string;
    robots?: string;
    // Open Graph
    ogTitle: string;
    ogDescription: string;
    ogImage?: string;
    ogType: string;
    ogUrl?: string;
    ogSiteName?: string;
    // Twitter
    twitterCard: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage?: string;
    // JSON-LD (as string)
    jsonLd?: string;
}

/**
 * Generate meta tags for a page
 */
export const generateMetaTags = (
    page: SitePage,
    project: Project,
    dynamicData?: DynamicData,
    baseUrl?: string
): MetaTags => {
    const siteName = project.brandIdentity?.name || project.name;
    const siteUrl = baseUrl || '';
    
    // Determine page-specific meta based on type
    if (page.type === 'dynamic' && dynamicData) {
        switch (page.dynamicSource) {
            case 'products':
                if (dynamicData.product) {
                    return generateProductMeta(dynamicData.product, project, siteUrl);
                }
                break;
            case 'categories':
                if (dynamicData.category) {
                    return generateCategoryMeta(dynamicData.category, project, siteUrl);
                }
                break;
            case 'blogPosts':
                if (dynamicData.article) {
                    return generateArticleMeta(dynamicData.article, project, siteUrl);
                }
                break;
        }
    }
    
    // Static page meta
    return generateStaticPageMeta(page, project, siteUrl);
};

/**
 * Generate meta tags for a static page
 */
const generateStaticPageMeta = (
    page: SitePage,
    project: Project,
    siteUrl: string
): MetaTags => {
    const siteName = project.brandIdentity?.name || project.name;
    const title = page.seo?.title || `${page.title} | ${siteName}`;
    const description = page.seo?.description || project.seoConfig?.siteDescription || '';
    const image = page.seo?.image || project.seoConfig?.defaultOGImage || project.thumbnailUrl;
    const url = siteUrl + page.slug;
    
    return {
        title,
        description,
        keywords: page.seo?.keywords?.join(', '),
        canonicalUrl: page.seo?.canonicalUrl || url,
        robots: page.seo?.noIndex ? 'noindex, nofollow' : 'index, follow',
        // Open Graph
        ogTitle: title,
        ogDescription: description,
        ogImage: image,
        ogType: 'website',
        ogUrl: url,
        ogSiteName: siteName,
        // Twitter
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: image,
        // JSON-LD for WebPage
        jsonLd: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: page.title,
            description,
            url,
            isPartOf: {
                '@type': 'WebSite',
                name: siteName,
                url: siteUrl,
            },
        }),
    };
};

/**
 * Generate meta tags for a product page
 */
const generateProductMeta = (
    product: PublicProduct,
    project: Project,
    siteUrl: string
): MetaTags => {
    const siteName = project.brandIdentity?.name || project.name;
    const title = `${product.name} | ${siteName}`;
    const description = product.description || `Compra ${product.name} en ${siteName}`;
    const image = product.image || product.images?.[0];
    const url = `${siteUrl}/producto/${product.slug}`;
    
    // Format price
    const price = product.price.toFixed(2);
    const currency = 'USD'; // TODO: Get from project settings
    
    // Build JSON-LD Product schema
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: image ? [image] : undefined,
        sku: product.sku,
        brand: product.brand ? {
            '@type': 'Brand',
            name: product.brand,
        } : undefined,
        offers: {
            '@type': 'Offer',
            url,
            priceCurrency: currency,
            price,
            availability: product.inStock 
                ? 'https://schema.org/InStock' 
                : 'https://schema.org/OutOfStock',
            ...(product.compareAtPrice && {
                priceSpecification: {
                    '@type': 'PriceSpecification',
                    price,
                    priceCurrency: currency,
                    referencePrice: {
                        '@type': 'PriceSpecification',
                        price: product.compareAtPrice.toFixed(2),
                        priceCurrency: currency,
                    },
                },
            }),
        },
        ...(product.rating && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviewCount || 0,
            },
        }),
    };
    
    return {
        title,
        description,
        canonicalUrl: url,
        robots: 'index, follow',
        // Open Graph
        ogTitle: title,
        ogDescription: description,
        ogImage: image,
        ogType: 'product',
        ogUrl: url,
        ogSiteName: siteName,
        // Twitter
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: image,
        // JSON-LD
        jsonLd: JSON.stringify(jsonLd),
    };
};

/**
 * Generate meta tags for a category page
 */
const generateCategoryMeta = (
    category: PublicCategory,
    project: Project,
    siteUrl: string
): MetaTags => {
    const siteName = project.brandIdentity?.name || project.name;
    const title = `${category.name} | ${siteName}`;
    const description = category.description || `Explora productos de ${category.name} en ${siteName}`;
    const image = category.imageUrl;
    const url = `${siteUrl}/categoria/${category.slug}`;
    
    // JSON-LD for CollectionPage
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        description,
        url,
        isPartOf: {
            '@type': 'WebSite',
            name: siteName,
            url: siteUrl,
        },
        ...(category.productCount && {
            numberOfItems: category.productCount,
        }),
    };
    
    return {
        title,
        description,
        canonicalUrl: url,
        robots: 'index, follow',
        // Open Graph
        ogTitle: title,
        ogDescription: description,
        ogImage: image,
        ogType: 'website',
        ogUrl: url,
        ogSiteName: siteName,
        // Twitter
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: image,
        // JSON-LD
        jsonLd: JSON.stringify(jsonLd),
    };
};

/**
 * Generate meta tags for a blog article page
 */
const generateArticleMeta = (
    article: PublicArticle,
    project: Project,
    siteUrl: string
): MetaTags => {
    const siteName = project.brandIdentity?.name || project.name;
    const title = `${article.title} | ${siteName}`;
    const description = article.excerpt || article.content?.substring(0, 160) || '';
    const image = article.featuredImage;
    const url = `${siteUrl}/blog/${article.slug}`;
    
    // JSON-LD for Article
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description,
        image: image ? [image] : undefined,
        url,
        datePublished: article.publishedAt,
        author: article.author ? {
            '@type': 'Person',
            name: article.author,
        } : undefined,
        publisher: {
            '@type': 'Organization',
            name: siteName,
            url: siteUrl,
        },
        ...(article.tags && {
            keywords: article.tags.join(', '),
        }),
    };
    
    return {
        title,
        description,
        keywords: article.tags?.join(', '),
        canonicalUrl: url,
        robots: 'index, follow',
        // Open Graph
        ogTitle: title,
        ogDescription: description,
        ogImage: image,
        ogType: 'article',
        ogUrl: url,
        ogSiteName: siteName,
        // Twitter
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: image,
        // JSON-LD
        jsonLd: JSON.stringify(jsonLd),
    };
};

/**
 * Generate HTML head string from meta tags
 */
export const generateMetaHtml = (meta: MetaTags, theme?: ThemeData): string => {
    const lines: string[] = [];
    
    // Basic meta tags
    lines.push(`<title>${escapeHtml(meta.title)}</title>`);
    lines.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
    
    if (meta.keywords) {
        lines.push(`<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`);
    }
    
    if (meta.canonicalUrl) {
        lines.push(`<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`);
    }
    
    if (meta.robots) {
        lines.push(`<meta name="robots" content="${meta.robots}" />`);
    }
    
    // Open Graph
    lines.push(`<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />`);
    lines.push(`<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`);
    lines.push(`<meta property="og:type" content="${meta.ogType}" />`);
    
    if (meta.ogImage) {
        lines.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`);
    }
    
    if (meta.ogUrl) {
        lines.push(`<meta property="og:url" content="${escapeHtml(meta.ogUrl)}" />`);
    }
    
    if (meta.ogSiteName) {
        lines.push(`<meta property="og:site_name" content="${escapeHtml(meta.ogSiteName)}" />`);
    }
    
    // Twitter
    lines.push(`<meta name="twitter:card" content="${meta.twitterCard}" />`);
    lines.push(`<meta name="twitter:title" content="${escapeHtml(meta.twitterTitle)}" />`);
    lines.push(`<meta name="twitter:description" content="${escapeHtml(meta.twitterDescription)}" />`);
    
    if (meta.twitterImage) {
        lines.push(`<meta name="twitter:image" content="${escapeHtml(meta.twitterImage)}" />`);
    }
    
    // JSON-LD
    if (meta.jsonLd) {
        lines.push(`<script type="application/ld+json">${meta.jsonLd}</script>`);
    }
    
    // Theme color
    if (theme?.globalColors?.primary) {
        lines.push(`<meta name="theme-color" content="${theme.globalColors.primary}" />`);
    }
    
    return lines.join('\n    ');
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (str: string): string => {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Generate Organization JSON-LD for the site
 */
export const generateOrganizationSchema = (project: Project, siteUrl: string): string => {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: project.brandIdentity?.name || project.name,
        url: siteUrl,
        ...(project.thumbnailUrl && { logo: project.thumbnailUrl }),
        ...(project.data?.footer?.socialLinks && {
            sameAs: project.data.footer.socialLinks
                .map(link => link.href)
                .filter(href => href && href !== '#'),
        }),
    };
    
    return JSON.stringify(schema);
};

/**
 * Generate BreadcrumbList JSON-LD
 */
export const generateBreadcrumbSchema = (
    breadcrumbs: Array<{ title: string; href: string }>,
    siteUrl: string
): string => {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            item: siteUrl + item.href,
        })),
    };
    
    return JSON.stringify(schema);
};



