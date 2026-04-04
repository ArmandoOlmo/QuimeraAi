/**
 * AI SEO Helper
 * 
 * Utilities for generating AI-crawler-specific meta tags and structured data.
 * Supports: GPTBot, ChatGPT-User, Google-Extended, Applebot-Extended,
 * PerplexityBot, anthropic-ai, cohere-ai
 */

/**
 * Generate FAQ Page JSON-LD schema
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate HowTo JSON-LD schema
 */
export function generateHowToSchema(opts: {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration, e.g., "PT30M"
  steps: Array<{ name: string; text: string; image?: string }>;
}): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    ...(opts.totalTime ? { totalTime: opts.totalTime } : {}),
    step: opts.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
      ...(step.image ? { image: step.image } : {}),
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate LocalBusiness JSON-LD schema
 */
export function generateLocalBusinessSchema(opts: {
  name: string;
  description?: string;
  url?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  geo?: { lat: number; lng: number };
  openingHours?: string[];
  priceRange?: string;
  socialProfiles?: string[];
}): string {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: opts.name,
  };

  if (opts.description) schema.description = opts.description;
  if (opts.url) schema.url = opts.url;
  if (opts.logo) schema.logo = opts.logo;
  if (opts.phone) schema.telephone = opts.phone;
  if (opts.email) schema.email = opts.email;
  if (opts.priceRange) schema.priceRange = opts.priceRange;

  if (opts.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(opts.address.street ? { streetAddress: opts.address.street } : {}),
      ...(opts.address.city ? { addressLocality: opts.address.city } : {}),
      ...(opts.address.state ? { addressRegion: opts.address.state } : {}),
      ...(opts.address.postalCode ? { postalCode: opts.address.postalCode } : {}),
      ...(opts.address.country ? { addressCountry: opts.address.country } : {}),
    };
  }

  if (opts.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: opts.geo.lat,
      longitude: opts.geo.lng,
    };
  }

  if (opts.openingHours) {
    schema.openingHours = opts.openingHours;
  }

  if (opts.socialProfiles?.length) {
    schema.sameAs = opts.socialProfiles;
  }

  return JSON.stringify(schema);
}

/**
 * Generate SoftwareApplication JSON-LD (for the Quimera.ai platform itself)
 */
export function generateSoftwareAppSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Quimera.ai',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'AI-powered website builder for creating, localizing, and scaling professional marketing websites.',
    url: 'https://quimera.ai',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '99',
      priceCurrency: 'USD',
      offerCount: '4',
    },
    featureList: [
      'AI Website Generation',
      'Drag-and-Drop Editor',
      'CMS & Blog',
      'Ecommerce',
      'Custom Domains',
      'SEO Tools',
      'Multi-language Support',
      'Analytics Dashboard',
      'Team Collaboration',
      'White-Label Agency Mode',
    ],
  });
}

/**
 * Inject AI-specific meta tags into the document head.
 * Call this on page mount for AI-crawlable pages.
 */
export function injectAiMeta(opts: {
  crawlable?: boolean;
  pageType?: string;
  description?: string;
  topics?: string[];
  contentSummary?: string;
}) {
  const setMeta = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };

  if (opts.crawlable !== undefined) {
    setMeta('ai:crawlable', opts.crawlable ? 'true' : 'false');
  }
  if (opts.pageType) setMeta('ai:page_type', opts.pageType);
  if (opts.description) setMeta('ai:description', opts.description);
  if (opts.topics?.length) setMeta('ai:topics', opts.topics.join(', '));
  if (opts.contentSummary) setMeta('ai:content_summary', opts.contentSummary);
}
