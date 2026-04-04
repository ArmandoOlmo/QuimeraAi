/**
 * useRouteSEO Hook
 * Manages per-route SEO meta tags for the main Quimera.ai application.
 * Updates document.title, meta description, OG tags, canonical URL,
 * and JSON-LD structured data based on the current route.
 */

import { useEffect } from 'react';

interface RouteSEOConfig {
  title: string;
  description: string;
  ogType?: string;
  ogImage?: string;
  noIndex?: boolean;
  schemaType?: string;
  keywords?: string[];
}

// Per-route SEO configuration for all public app routes
const ROUTE_SEO_MAP: Record<string, RouteSEOConfig> = {
  '/': {
    title: 'Quimera.ai | AI Website Builder for High-Converting Experiences',
    description: 'Build, localize, and scale marketing websites using AI. Templates, CMS, localization, and analytics included. Powered by Quimera.ai.',
    ogType: 'website',
    schemaType: 'WebApplication',
    keywords: ['AI website builder', 'no-code', 'website builder', 'landing page builder', 'AI', 'web design'],
  },
  '/about': {
    title: 'About Us | Quimera.ai',
    description: 'Learn about the team and mission behind Quimera.ai — the AI-powered website builder helping businesses create professional websites in minutes.',
    ogType: 'website',
    keywords: ['about Quimera.ai', 'AI website builder team', 'company'],
  },
  '/pricing': {
    title: 'Pricing | Quimera.ai',
    description: 'Flexible pricing plans for every business. Start free and scale with AI-powered website building tools, CMS, ecommerce, and custom domains.',
    ogType: 'website',
    keywords: ['pricing', 'plans', 'website builder pricing', 'free website builder'],
  },
  '/features': {
    title: 'Features | Quimera.ai',
    description: 'Discover powerful features: AI generation, drag-and-drop editor, CMS, ecommerce, SEO tools, custom domains, analytics, and multi-language support.',
    ogType: 'website',
    keywords: ['features', 'AI editor', 'CMS', 'ecommerce', 'SEO tools', 'website builder features'],
  },
  '/blog': {
    title: 'Blog | Quimera.ai',
    description: 'Ideas, tutorials, and visionary updates from the engineering and design team at Quimera.ai. Stay up to date with the latest in AI web design.',
    ogType: 'website',
    schemaType: 'Blog',
    keywords: ['blog', 'AI web design', 'tutorials', 'updates', 'website builder blog'],
  },
  '/contact': {
    title: 'Contact Us | Quimera.ai',
    description: 'Get in touch with the Quimera.ai team. We help businesses create stunning websites with AI. Reach out for support, partnerships, or enterprise solutions.',
    ogType: 'website',
    keywords: ['contact', 'support', 'help', 'enterprise'],
  },
  '/changelog': {
    title: 'Changelog | Quimera.ai',
    description: 'See what\'s new in Quimera.ai. Product updates, new features, improvements, and bug fixes — all documented here.',
    ogType: 'website',
    keywords: ['changelog', 'updates', 'new features', 'product updates'],
  },
  '/help-center': {
    title: 'Help Center | Quimera.ai',
    description: 'Find answers to common questions about using Quimera.ai. Guides, tutorials, and documentation to help you build your website.',
    ogType: 'website',
    keywords: ['help', 'support', 'documentation', 'FAQ', 'guides'],
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Quimera.ai',
    description: 'Quimera.ai Privacy Policy. Learn how we collect, use, and protect your personal data.',
    ogType: 'website',
    keywords: ['privacy policy', 'data protection', 'GDPR'],
  },
  '/terms-of-service': {
    title: 'Terms of Service | Quimera.ai',
    description: 'Quimera.ai Terms of Service. Read the terms and conditions for using our AI website builder platform.',
    ogType: 'website',
    keywords: ['terms of service', 'terms and conditions', 'legal'],
  },
  '/cookie-policy': {
    title: 'Cookie Policy | Quimera.ai',
    description: 'Quimera.ai Cookie Policy. Understand how we use cookies and similar technologies on our platform.',
    ogType: 'website',
    keywords: ['cookie policy', 'cookies', 'tracking'],
  },
  '/data-deletion': {
    title: 'Data Deletion | Quimera.ai',
    description: 'Request deletion of your personal data from Quimera.ai. We respect your right to privacy.',
    ogType: 'website',
    keywords: ['data deletion', 'GDPR', 'privacy rights'],
  },
  '/login': {
    title: 'Sign In | Quimera.ai',
    description: 'Sign in to your Quimera.ai account to manage your websites, CMS content, and analytics.',
    noIndex: true,
  },
  '/register': {
    title: 'Create Account | Quimera.ai',
    description: 'Create your free Quimera.ai account and start building professional websites with AI in minutes.',
    keywords: ['sign up', 'create account', 'free website builder'],
  },
  '/agency-signup': {
    title: 'Agency Plan | Quimera.ai',
    description: 'Start your agency with Quimera.ai. White-label website builder, client management, and scalable infrastructure for digital agencies.',
    keywords: ['agency', 'white-label', 'reseller', 'digital agency'],
  },
};

// Private routes that should be noindex
const PRIVATE_ROUTE_PREFIXES = [
  '/dashboard', '/editor/', '/cms', '/navigation', '/ai-assistant',
  '/leads', '/appointments', '/domains', '/seo', '/finance',
  '/ecommerce', '/email', '/biopage', '/settings', '/agency/',
  '/admin/', '/assets', '/templates', '/websites',
];

/**
 * Helper to set a meta tag
 */
function setMeta(selector: string, content: string, attribute: 'name' | 'property' = 'name') {
  if (!content) return;
  let el = document.querySelector(selector) as HTMLMetaElement;
  if (!el) {
    el = document.createElement('meta');
    const attrName = selector.replace(`[${attribute}="`, '').replace('"]', '');
    el.setAttribute(attribute, attrName);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Helper to set canonical link
 */
function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

/**
 * Helper to set JSON-LD structured data
 */
function setJsonLd(data: Record<string, any>) {
  let el = document.querySelector('script[data-route-seo="true"]') as HTMLScriptElement;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-route-seo', 'true');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Hook: Updates SEO meta tags based on the current route path
 */
export function useRouteSEO(path: string) {
  useEffect(() => {
    const origin = window.location.origin;
    const config = ROUTE_SEO_MAP[path];

    // Check if private route
    const isPrivate = PRIVATE_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));

    if (config) {
      // Public route with explicit SEO config
      document.title = config.title;
      setMeta('[name="description"]', config.description);
      setMeta('[name="robots"]', config.noIndex ? 'noindex, nofollow' : 'index, follow');

      // Keywords
      if (config.keywords?.length) {
        setMeta('[name="keywords"]', config.keywords.join(', '));
      }

      // Open Graph
      setMeta('[property="og:title"]', config.title, 'property');
      setMeta('[property="og:description"]', config.description, 'property');
      setMeta('[property="og:type"]', config.ogType || 'website', 'property');
      setMeta('[property="og:url"]', `${origin}${path}`, 'property');
      setMeta('[property="og:site_name"]', 'Quimera.ai', 'property');

      if (config.ogImage) {
        setMeta('[property="og:image"]', config.ogImage, 'property');
      }

      // Twitter
      setMeta('[name="twitter:card"]', 'summary_large_image');
      setMeta('[name="twitter:title"]', config.title);
      setMeta('[name="twitter:description"]', config.description);

      // Canonical
      setCanonical(`${origin}${path}`);

      // AI SEO
      setMeta('[name="ai:crawlable"]', config.noIndex ? 'false' : 'true');
      setMeta('[name="ai:page_type"]', getAiPageType(path));
      setMeta('[name="ai:description"]', config.description);

      // JSON-LD
      if (config.schemaType) {
        setJsonLd({
          '@context': 'https://schema.org',
          '@type': config.schemaType,
          name: config.title.split(' | ')[0],
          description: config.description,
          url: `${origin}${path}`,
          ...(config.schemaType === 'WebApplication' ? {
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          } : {}),
        });
      }

    } else if (isPrivate) {
      // Private route — set noindex
      setMeta('[name="robots"]', 'noindex, nofollow');
      setMeta('[name="ai:crawlable"]', 'false');
    }

    // Cleanup JSON-LD on unmount only if we set it
    return () => {
      // Don't remove — let next route update handle it
    };
  }, [path]);
}

/**
 * Dynamic SEO update for blog articles (used by PublicArticlePage)
 */
export function setArticleSEO(article: {
  title: string;
  excerpt?: string;
  featuredImage?: string;
  author?: string;
  publishedAt?: string;
  slug: string;
  tags?: string[];
  category?: string;
}) {
  const origin = window.location.origin;
  const url = `${origin}/blog/${article.slug}`;
  const title = `${article.title} | Blog | Quimera.ai`;
  const description = article.excerpt || article.title;

  document.title = title;
  setMeta('[name="description"]', description);
  setMeta('[name="robots"]', 'index, follow');
  setMeta('[name="keywords"]', article.tags?.join(', ') || '');

  // Open Graph
  setMeta('[property="og:title"]', title, 'property');
  setMeta('[property="og:description"]', description, 'property');
  setMeta('[property="og:type"]', 'article', 'property');
  setMeta('[property="og:url"]', url, 'property');
  setMeta('[property="og:site_name"]', 'Quimera.ai', 'property');
  if (article.featuredImage) {
    setMeta('[property="og:image"]', article.featuredImage, 'property');
  }

  // Article-specific OG
  if (article.publishedAt) {
    setMeta('[property="article:published_time"]', article.publishedAt, 'property');
  }
  if (article.author) {
    setMeta('[property="article:author"]', article.author, 'property');
  }

  // Twitter
  setMeta('[name="twitter:card"]', 'summary_large_image');
  setMeta('[name="twitter:title"]', title);
  setMeta('[name="twitter:description"]', description);
  if (article.featuredImage) {
    setMeta('[name="twitter:image"]', article.featuredImage);
  }

  // Canonical
  setCanonical(url);

  // AI SEO
  setMeta('[name="ai:crawlable"]', 'true');
  setMeta('[name="ai:page_type"]', 'article');
  setMeta('[name="ai:description"]', description);
  if (article.tags?.length) {
    setMeta('[name="ai:topics"]', article.tags.join(', '));
  }

  // JSON-LD Article
  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description,
    url,
    image: article.featuredImage ? [article.featuredImage] : undefined,
    datePublished: article.publishedAt,
    author: article.author ? {
      '@type': 'Person',
      name: article.author,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Quimera.ai',
      url: origin,
    },
    keywords: article.tags?.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  });
}

/**
 * Map route path to AI page type
 */
function getAiPageType(path: string): string {
  if (path === '/') return 'homepage';
  if (path === '/pricing') return 'pricing';
  if (path === '/blog') return 'blog_listing';
  if (path.startsWith('/blog/')) return 'article';
  if (path === '/contact') return 'contact';
  if (path === '/about') return 'about';
  if (path === '/features') return 'features';
  if (path === '/changelog') return 'changelog';
  if (path === '/help-center') return 'help_center';
  if (path.includes('policy') || path.includes('terms') || path.includes('deletion')) return 'legal';
  return 'page';
}

export default useRouteSEO;
