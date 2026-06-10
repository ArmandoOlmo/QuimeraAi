import { Request, Response, NextFunction } from 'express';
import { resolveDomainToProject } from './domainResolver';
import { extractUserSubdomain, resolveUserSubdomain } from './subdomainResolver';
import { fetchProjectData, ProjectData } from './ssrRenderer';
import { PLATFORM_ROUTES, PLATFORM_LLMS_TEXT, PLATFORM_METADATA } from './platformSeoData';

// Simple in-memory cache for SEO routes
const seoCache = new Map<string, { content: string, timestamp: number, type: string }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function seoMiddleware(req: Request, res: Response, next: NextFunction) {
    const url = req.originalUrl.split('?')[0]; // Ignore query params
    const isSeoRoute = url === '/robots.txt' || url === '/sitemap.xml' || url === '/llms.txt' || url === '/llms-full.txt';
    
    if (!isSeoRoute) {
        return next();
    }

    try {
        const projectId = await resolveProjectId(req);
        // We now allow projectId to be null because null = platform routes


        const hostname = req.hostname;
        const baseUrl = `https://${hostname}`;
        const cacheKey = `${projectId || 'platform'}:${url}`;

        // Check cache
        const cached = seoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            res.set('Content-Type', cached.type);
            return res.send(cached.content);
        }

        let content = '';
        let contentType = 'text/plain';

        if (!projectId) {
            // ==========================================
            // PLATFORM SEO ROUTES (No Project ID)
            // ==========================================
            if (url === '/robots.txt') {
                content = generatePlatformRobotsTxt(baseUrl);
                contentType = 'text/plain';
            } else if (url === '/sitemap.xml') {
                content = generatePlatformSitemapXml(baseUrl);
                contentType = 'application/xml';
            } else if (url === '/llms.txt' || url === '/llms-full.txt') {
                content = PLATFORM_LLMS_TEXT;
                contentType = 'text/markdown';
            }
        } else {
            // ==========================================
            // PROJECT SEO ROUTES (Generated Websites)
            // ==========================================
            const project = await fetchProjectData(projectId);
            if (!project) {
                return res.status(404).send('Project Not Found');
            }

            if (url === '/robots.txt') {
                content = generateRobotsTxt(project, baseUrl);
                contentType = 'text/plain';
            } else if (url === '/sitemap.xml') {
                content = generateSitemapXml(project, baseUrl);
                contentType = 'application/xml';
            } else if (url === '/llms.txt') {
                content = generateLlmsTxt(project, baseUrl, false);
                contentType = 'text/markdown';
            } else if (url === '/llms-full.txt') {
                content = generateLlmsTxt(project, baseUrl, true);
                contentType = 'text/markdown';
            }
        }

        // Save to cache
        seoCache.set(cacheKey, { content, timestamp: Date.now(), type: contentType });

        res.set('Content-Type', contentType);
        return res.send(content);

    } catch (error) {
        console.error(`[SEO] Error handling ${url}:`, error);
        return res.status(500).send('Internal Server Error');
    }
}

async function resolveProjectId(req: Request): Promise<string | null> {
    const hostname = req.hostname;
    const CLOUD_RUN_DOMAIN = process.env.CLOUD_RUN_URL || 'quimera-ai.run.app';
    const APP_DOMAIN = process.env.APP_DOMAIN || 'quimera.ai';
    const isCustomDomain = !hostname.includes(CLOUD_RUN_DOMAIN) && 
                           !hostname.includes(APP_DOMAIN) &&
                           !hostname.includes('localhost');

    // Allow testing locally via query parameter
    if (req.query.projectId) {
        return req.query.projectId as string;
    }

    const userSubdomain = extractUserSubdomain(hostname);
    if (userSubdomain) {
        const userResolution = await resolveUserSubdomain(userSubdomain);
        if (userResolution) return userResolution.projectId;
    }

    if (isCustomDomain) {
        const domainInfo = await resolveDomainToProject(hostname);
        if (domainInfo && domainInfo.projectId) return domainInfo.projectId;
    }
    
    const storeMatch = req.originalUrl.match(/^\/store\/([^\/]+)/);
    if (storeMatch) {
        return storeMatch[1];
    }

    return null;
}

function generateRobotsTxt(project: ProjectData, baseUrl: string): string {
    const allowAi = project.seoConfig?.aiCrawlable !== false;
    let txt = `User-agent: *\nAllow: /\n`;
    
    // Exclude internal/editor paths
    txt += `Disallow: /admin\n`;
    txt += `Disallow: /dashboard\n`;
    txt += `Disallow: /editor\n`;

    if (!allowAi) {
        txt += `\n# AI Crawlers restricted by owner\n`;
        const aiBots = ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'anthropic-ai', 'OAI-SearchBot', 'CCBot'];
        aiBots.forEach(bot => {
            txt += `User-agent: ${bot}\nDisallow: /\n`;
        });
    } else {
        txt += `\n# AI Crawlers explicitly allowed\n`;
        txt += `User-agent: GPTBot\nAllow: /\n`;
        txt += `User-agent: ChatGPT-User\nAllow: /\n`;
        txt += `User-agent: Google-Extended\nAllow: /\n`;
    }

    txt += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
    return txt;
}

function generateSitemapXml(project: ProjectData, baseUrl: string): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const addUrl = (path: string, priority = '0.5') => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${path}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += `  </url>\n`;
    };

    addUrl('/', '1.0');

    if (project.pages) {
        project.pages.forEach((p: any) => {
            if (!p.isHomePage && p.status !== 'draft') {
                const slug = p.slug.startsWith('/') ? p.slug : `/${p.slug}`;
                addUrl(slug, '0.8');
            }
        });
    }
    
    const hasProducts = Object.values(project.data || {}).some((comp: any) => comp?.type === 'products_grid' || comp?.type === 'featured_product');
    if (hasProducts) {
        addUrl('/tienda', '0.9');
    }

    xml += `</urlset>`;
    return xml;
}

function generateLlmsTxt(project: ProjectData, baseUrl: string, full = false): string {
    const brand = project.brandIdentity || {};
    const data = project.data || {};
    const name = project.name || brand.name || 'Store';
    
    let txt = `# ${name}\n\n`;
    if (brand.tagline || project.seoConfig?.description) {
        txt += `> ${brand.tagline || project.seoConfig?.description}\n\n`;
    }

    if (brand.contactEmail || brand.contactPhone) {
        txt += `## Contact Information\n`;
        if (brand.contactEmail) txt += `- Email: ${brand.contactEmail}\n`;
        if (brand.contactPhone) txt += `- Phone: ${brand.contactPhone}\n`;
        txt += `\n`;
    }

    txt += `## Content\n\n`;

    if (project.componentOrder) {
        project.componentOrder.forEach(compId => {
            const compData = data[compId];
            if (!compData) return;
            
            // Skip utility components
            if (compData.type === 'header' || compData.type === 'footer') return;

            if (compData.title) txt += `### ${compData.title}\n`;
            if (compData.subtitle) txt += `*${compData.subtitle}*\n\n`;
            if (compData.description) txt += `${compData.description}\n\n`;
            
            if (full && compData.items && Array.isArray(compData.items)) {
                compData.items.forEach((item: any) => {
                    if (item.title) txt += `- **${item.title}**: `;
                    if (item.description) txt += `${item.description}`;
                    txt += `\n`;
                });
                txt += `\n`;
            }
        });
    }

    txt += `\n---\n*Generated by QuimeraAi*`;
    return txt;
}

// =============================================================================
// PLATFORM SEO GENERATORS
// =============================================================================

function generatePlatformRobotsTxt(baseUrl: string): string {
    let txt = `User-agent: *\nAllow: /\n`;
    
    // Explicitly allow AI crawlers to read the platform
    txt += `\n# AI Crawlers explicitly allowed for Quimera platform\n`;
    txt += `User-agent: GPTBot\nAllow: /\n`;
    txt += `User-agent: ChatGPT-User\nAllow: /\n`;
    txt += `User-agent: Google-Extended\nAllow: /\n`;

    // Exclude internal apps
    txt += `\n# Exclude internal paths\n`;
    txt += `Disallow: /admin\n`;
    txt += `Disallow: /dashboard\n`;
    txt += `Disallow: /editor\n`;
    txt += `Disallow: /settings\n`;
    txt += `Disallow: /agency\n`;

    txt += `\nSitemap: ${baseUrl}/sitemap.xml\n`;
    return txt;
}

function generatePlatformSitemapXml(baseUrl: string): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    PLATFORM_ROUTES.forEach(route => {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
        xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        xml += `    <priority>${route.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;
    return xml;
}
