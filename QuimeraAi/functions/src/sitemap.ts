/**
 * Dynamic Sitemap Generator
 * 
 * Generates XML sitemap for the Quimera.ai platform including:
 * - Static marketing/public pages
 * - Blog articles from AppContent
 * - Legal/help pages
 * 
 * Deployed as a Cloud Function and served via Firebase Hosting rewrite.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const BASE_URL = 'https://quimera.ai';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Static pages with their SEO metadata
 */
const STATIC_PAGES: SitemapUrl[] = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/about', changefreq: 'monthly', priority: 0.8 },
  { loc: '/pricing', changefreq: 'weekly', priority: 0.9 },
  { loc: '/features', changefreq: 'weekly', priority: 0.9 },
  { loc: '/blog', changefreq: 'daily', priority: 0.8 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.7 },
  { loc: '/changelog', changefreq: 'weekly', priority: 0.6 },
  { loc: '/help-center', changefreq: 'weekly', priority: 0.7 },
  { loc: '/agency-signup', changefreq: 'monthly', priority: 0.7 },
  // Legal
  { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms-of-service', changefreq: 'yearly', priority: 0.3 },
  { loc: '/cookie-policy', changefreq: 'yearly', priority: 0.3 },
  { loc: '/data-deletion', changefreq: 'yearly', priority: 0.3 },
];

/**
 * Generate XML for a single URL entry
 */
function urlToXml(url: SitemapUrl): string {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(BASE_URL + url.loc)}</loc>`,
  ];
  if (url.lastmod) {
    lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
  }
  lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
  lines.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Fetch blog articles from Firestore
 */
async function fetchBlogArticles(): Promise<SitemapUrl[]> {
  try {
    const db = admin.firestore();
    
    // Try globalSettings/articles or appContent/articles collections
    const articlesRef = db.collection('globalSettings').doc('appContent');
    const doc = await articlesRef.get();
    
    if (!doc.exists) return [];
    
    const data = doc.data();
    const articles = data?.articles || [];
    
    return articles
      .filter((article: any) => article.status === 'published' && article.slug)
      .map((article: any) => ({
        loc: `/blog/${article.slug}`,
        lastmod: article.updatedAt || article.publishedAt || article.createdAt,
        changefreq: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('[Sitemap] Error fetching blog articles:', error);
    return [];
  }
}

/**
 * Cloud Function: Generate dynamic sitemap.xml
 */
export const generateSitemap = functions.https.onRequest(async (req, res) => {
  try {
    // Set cache headers (cache for 1 hour)
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.set('Content-Type', 'application/xml; charset=utf-8');
    
    // Collect all URLs
    const allUrls: SitemapUrl[] = [...STATIC_PAGES];
    
    // Add today's date as lastmod for static pages
    const today = new Date().toISOString().split('T')[0];
    allUrls.forEach(url => {
      if (!url.lastmod) url.lastmod = today;
    });
    
    // Fetch dynamic content
    const articleUrls = await fetchBlogArticles();
    allUrls.push(...articleUrls);
    
    // Generate XML
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
      '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
      ...allUrls.map(urlToXml),
      '</urlset>',
    ].join('\n');
    
    res.status(200).send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});
