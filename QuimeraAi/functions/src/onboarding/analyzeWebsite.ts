/**
 * Analyze Website Cloud Function
 * 
 * Server-side website scraper + AI analyzer.
 * 1. Fetches the main page HTML (no CORS restrictions server-side)
 * 2. Extracts nav links and crawls up to 5 internal subpages
 * 3. Parses metadata, headings, contact info, social links, colors, images
 * 4. Sends the comprehensive extraction to OpenRouter/Gemini for structured analysis
 * 
 * Used in both the classic onboarding (Step 0) and the AI Website Studio.
 */

import * as functions from 'firebase-functions';
import { generateTextViaOpenRouter } from '../openrouterHelper';

// ============================================================================
// HTML SCRAPING UTILITIES
// ============================================================================

/** Fetch a page with timeout and return HTML text */
async function fetchPage(url: string, timeoutMs = 8000): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; QuimeraBot/1.0; +https://quimeraai.com)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            },
            redirect: 'follow',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
            throw new Error('Not HTML');
        }
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

/** Extract text content between tags using regex (lightweight server-side parser) */
function extractTag(html: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const results: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (text && text.length > 1 && text.length < 500) results.push(text);
    }
    return results;
}

/** Extract attribute values from HTML tags */
function extractAttr(html: string, tagPattern: string, attr: string): string[] {
    const regex = new RegExp(`<${tagPattern}[^>]*\\s${attr}=["']([^"']+)["']`, 'gi');
    const results: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push(match[1]);
    }
    return results;
}

/** Extract meta tag content */
function extractMeta(html: string, nameOrProp: string): string {
    // Try name="..."
    const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, 'i'));
    if (nameMatch) return nameMatch[1];
    // Try content before name
    const nameMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${nameOrProp}["']`, 'i'));
    if (nameMatch2) return nameMatch2[1];
    // Try property="..."
    const propMatch = html.match(new RegExp(`<meta[^>]*property=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, 'i'));
    if (propMatch) return propMatch[1];
    const propMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${nameOrProp}["']`, 'i'));
    if (propMatch2) return propMatch2[1];
    return '';
}

/** Extract internal navigation links from HTML */
function extractNavLinks(html: string, baseUrl: string): string[] {
    const origin = new URL(baseUrl).origin;
    // Match <a> tags within <nav>, <header>, <footer>, <aside>, or elements with common navigational classes
    const navSections = html.match(/<(?:nav|header|footer|aside)[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside)>/gi) || [];
    const classSections = html.match(/<[^>]+class=["'][^"']*(?:nav|menu|header|footer|sidebar|links)[^"']*["'][^>]*>[\s\S]*?<\/[a-zA-Z]+>/gi) || [];
    const allNavHtml = navSections.join(' ') + ' ' + classSections.join(' ');
    
    const hrefRegex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
    const links = new Set<string>();
    let match;
    
    // From nav/header sections
    while ((match = hrefRegex.exec(allNavHtml)) !== null) {
        const href = match[1].trim();
        if (href.startsWith('/') && href !== '/') {
            links.add(`${origin}${href}`);
        } else if (href.startsWith(origin)) {
            links.add(href);
        }
    }
    
    // Also look for common page patterns in the full HTML
    const commonPaths = ['/about', '/contact', '/services', '/menu', '/pricing', '/team', '/portfolio', '/gallery', '/blog',
                         '/nosotros', '/contacto', '/servicios', '/carta', '/precios', '/equipo', '/galeria'];
    const fullHrefRegex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
    while ((match = fullHrefRegex.exec(html)) !== null) {
        const href = match[1].trim();
        for (const path of commonPaths) {
            if (href.includes(path)) {
                if (href.startsWith('/')) links.add(`${origin}${href}`);
                else if (href.startsWith('http') && href.includes(new URL(baseUrl).hostname)) links.add(href);
            }
        }
    }
    
    return [...links].slice(0, 15); // Max 15 internal links to check
}

/** Extract social media links */
function extractSocialLinks(html: string): Record<string, string> {
    const social: Record<string, string> = {};
    const patterns: [string, RegExp][] = [
        ['facebook', /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/i],
        ['instagram', /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/i],
        ['twitter', /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'\s]+)["']/i],
        ['linkedin', /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s]+)["']/i],
        ['youtube', /href=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'\s]+)["']/i],
        ['tiktok', /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s]+)["']/i],
        ['pinterest', /href=["'](https?:\/\/(?:www\.)?pinterest\.com\/[^"'\s]+)["']/i],
        ['whatsapp', /href=["'](https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^"'\s]+)["']/i],
    ];
    for (const [name, regex] of patterns) {
        const match = html.match(regex);
        if (match) social[name] = match[1];
    }
    return social;
}

/** Extract contact information using regex patterns */
function extractContactInfo(text: string) {
    const emails = [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].slice(0, 5);
    const phones = [...new Set(text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])].slice(0, 5);
    return { emails, phones };
}

/** Extract colors from inline styles and style blocks */
function extractColors(html: string): string[] {
    const colorSet = new Set<string>();
    // From inline styles
    const inlineColors = html.match(/(?:color|background|background-color|border-color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gi) || [];
    for (const c of inlineColors) {
        const val = c.replace(/^[^:]+:\s*/, '').trim();
        colorSet.add(val);
    }
    // Standalone hex colors in CSS
    const hexColors = html.match(/#[0-9a-fA-F]{6}/g) || [];
    for (const c of hexColors) colorSet.add(c);
    return [...colorSet].slice(0, 20);
}

/** Extract font families from CSS, inline styles, and Google Fonts links */
function extractFonts(html: string): string[] {
    const fontSet = new Set<string>();
    // From font-family declarations in CSS and inline styles
    const fontFamilyMatches = html.match(/font-family\s*:\s*([^;}"]+)/gi) || [];
    for (const m of fontFamilyMatches) {
        const families = m.replace(/font-family\s*:\s*/i, '').split(',');
        for (const f of families) {
            const clean = f.replace(/["'!important]/g, '').trim();
            // Skip generic families
            if (clean && !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'initial', 'unset', '-apple-system', 'BlinkMacSystemFont'].includes(clean.toLowerCase())) {
                fontSet.add(clean);
            }
        }
    }
    // From Google Fonts <link> tags
    const gfMatches = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&>]+)/gi) || [];
    for (const m of gfMatches) {
        const familyPart = m.replace(/.*family=/i, '');
        const families = familyPart.split('|');
        for (const f of families) {
            const name = decodeURIComponent(f.split(':')[0].replace(/\+/g, ' ')).trim();
            if (name) fontSet.add(name);
        }
    }
    // From @font-face declarations
    const fontFaceMatches = html.match(/@font-face\s*\{[^}]*font-family\s*:\s*["']?([^"';},]+)/gi) || [];
    for (const m of fontFaceMatches) {
        const name = (m.match(/font-family\s*:\s*["']?([^"';},]+)/i) || [])[1]?.trim();
        if (name) fontSet.add(name);
    }
    return [...fontSet].slice(0, 10);
}

/** Extract JSON-LD structured data */
function extractJsonLd(html: string): any[] {
    const results: any[] = [];
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        try { results.push(JSON.parse(match[1])); } catch { /* skip */ }
    }
    return results;
}

/** Strip HTML tags to get plain text */
function stripHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
        .replace(/<[^>]+>/g, ' ')                          // Remove tags
        .replace(/\s+/g, ' ')                              // Collapse whitespace
        .trim();
}

/** Scrape a single page and return extracted data */
function scrapePage(html: string, url: string) {
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '';
    const h1s = extractTag(html, 'h1');
    const h2s = extractTag(html, 'h2');
    const h3s = extractTag(html, 'h3');
    const bodyText = stripHtml(html);
    const contact = extractContactInfo(bodyText);
    const social = extractSocialLinks(html);
    const colors = extractColors(html);
    const fonts = extractFonts(html);
    const jsonLd = extractJsonLd(html);
    
    // Extract images (src + alt)
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    const images: { src: string; alt: string }[] = [];
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
        const src = imgMatch[1];
        const alt = imgMatch[2] || '';
        if (src && !src.includes('data:image/svg') && !src.includes('pixel') && !src.includes('tracking') && !src.includes('spacer')) {
            const fullSrc = src.startsWith('http') ? src : `${new URL(url).origin}${src.startsWith('/') ? '' : '/'}${src}`;
            images.push({ src: fullSrc, alt });
        }
    }

    return {
        url,
        title,
        metaDescription: extractMeta(html, 'description'),
        metaKeywords: extractMeta(html, 'keywords'),
        ogTitle: extractMeta(html, 'og:title'),
        ogDescription: extractMeta(html, 'og:description'),
        ogImage: extractMeta(html, 'og:image'),
        headings: { h1: h1s.slice(0, 5), h2: h2s.slice(0, 10), h3: h3s.slice(0, 10) },
        emails: contact.emails,
        phones: contact.phones,
        socialLinks: social,
        colors: colors,
        fonts: fonts,
        images: images.slice(0, 15),
        jsonLd: jsonLd.slice(0, 3),
        bodyTextSample: bodyText.slice(0, 2000),
    };
}

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

export const analyzeWebsite = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB' })
    .https.onCall(async (data, context) => {
        const userId = context.auth?.uid;

        if (!userId) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { url } = data;

        if (!url || typeof url !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'URL is required');
        }

        // Normalize URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        functions.logger.info('Analyzing website with real scraping', { url: normalizedUrl, userId });

        try {
            // ── STEP 1: Fetch and scrape main page ──────────────────────────
            const mainHtml = await fetchPage(normalizedUrl, 10000);
            const mainData = scrapePage(mainHtml, normalizedUrl);

            functions.logger.info('Main page scraped', {
                title: mainData.title,
                headingsCount: mainData.headings.h1.length + mainData.headings.h2.length,
                emailsFound: mainData.emails.length,
                phonesFound: mainData.phones.length,
            });

            // ── STEP 2: Discover and crawl internal subpages ────────────────
            const internalLinks = extractNavLinks(mainHtml, normalizedUrl);
            functions.logger.info('Internal links discovered', { count: internalLinks.length, links: internalLinks.slice(0, 5) });

            const subpageData: ReturnType<typeof scrapePage>[] = [];
            const MAX_SUBPAGES = 8;
            const linksToFetch = internalLinks.slice(0, MAX_SUBPAGES);

            // Fetch subpages in parallel with individual error handling
            const subpageResults = await Promise.allSettled(
                linksToFetch.map(async (link) => {
                    try {
                        const html = await fetchPage(link, 6000);
                        return scrapePage(html, link);
                    } catch (err) {
                        functions.logger.warn('Failed to fetch subpage', { link, error: (err as Error).message });
                        return null;
                    }
                })
            );

            for (const result of subpageResults) {
                if (result.status === 'fulfilled' && result.value) {
                    subpageData.push(result.value);
                }
            }

            functions.logger.info('Subpages scraped', { count: subpageData.length });

            // ── STEP 3: Merge all extracted data ────────────────────────────
            const allEmails = new Set([...mainData.emails, ...subpageData.flatMap(s => s.emails)]);
            const allPhones = new Set([...mainData.phones, ...subpageData.flatMap(s => s.phones)]);
            const allSocial = { ...mainData.socialLinks };
            for (const sub of subpageData) {
                for (const [k, v] of Object.entries(sub.socialLinks)) {
                    if (!allSocial[k]) allSocial[k] = v;
                }
            }
            const allColors = [...new Set([...mainData.colors, ...subpageData.flatMap(s => s.colors)])].slice(0, 20);
            const allFonts = [...new Set([...mainData.fonts, ...subpageData.flatMap(s => s.fonts)])].slice(0, 10);
            const allHeadings = {
                h1: [...new Set([...mainData.headings.h1, ...subpageData.flatMap(s => s.headings.h1)])].slice(0, 10),
                h2: [...new Set([...mainData.headings.h2, ...subpageData.flatMap(s => s.headings.h2)])].slice(0, 15),
                h3: [...new Set([...mainData.headings.h3, ...subpageData.flatMap(s => s.headings.h3)])].slice(0, 15),
            };
            const allJsonLd = [...mainData.jsonLd, ...subpageData.flatMap(s => s.jsonLd)].slice(0, 5);

            // Combine body text from all pages
            const allBodyText = [
                `[HOME PAGE] ${mainData.bodyTextSample}`,
                ...subpageData.map(s => `[${s.url}] ${s.bodyTextSample}`),
            ].join('\n\n').slice(0, 6000);

            // Build comprehensive extraction for AI
            const comprehensiveExtraction = {
                url: normalizedUrl,
                pagesScraped: 1 + subpageData.length,
                subpagesVisited: subpageData.map(s => ({ url: s.url, title: s.title })),
                mainPage: {
                    title: mainData.title,
                    metaDescription: mainData.metaDescription,
                    metaKeywords: mainData.metaKeywords,
                    ogTitle: mainData.ogTitle,
                    ogDescription: mainData.ogDescription,
                    ogImage: mainData.ogImage,
                },
                allHeadings,
                emails: [...allEmails].slice(0, 5),
                phones: [...allPhones].slice(0, 5),
                socialLinks: allSocial,
                colorsFound: allColors,
                fontsFound: allFonts,
                images: mainData.images.slice(0, 10),
                jsonLdSummary: allJsonLd.length > 0 ? JSON.stringify(allJsonLd[0]).slice(0, 800) : null,
                fullTextContent: allBodyText,
            };

            // ── STEP 4: Send to AI for structured analysis ──────────────────
            const prompt = `You are an expert website analyst. I have ACTUALLY SCRAPED this website (${normalizedUrl}) and crawled ${comprehensiveExtraction.pagesScraped} pages. Here is the REAL extracted data:

SCRAPED DATA:
${JSON.stringify(comprehensiveExtraction, null, 2)}

Based on this REAL scraped data (not guessing), return ONLY a valid JSON object with these EXACT fields:

{
  "businessName": "The business/company name as found on the website",
  "industry": "One of: restaurant, cafe, technology, healthcare, consulting, fitness-gym, photography, real-estate, beauty-spa, automotive, legal, finance, construction, education, travel, event-planning, retail, fashion, jewelry, electronics, home-decor, beauty-products, food-products, crafts, sports-equipment, ecommerce, other",
  "description": "A 2-3 sentence description of the business (in the same language as the website)",
  "tagline": "A short catchy tagline for the business (in the same language as the website)",
  "services": [
    { "name": "Service name", "description": "Brief description" }
  ],
  "contactInfo": {
    "email": "business email if found, or null",
    "phone": "phone number with country code if found, or null",
    "address": "street address only, or null",
    "city": "city name, or null",
    "state": "state/province, or null",
    "zipCode": "postal code, or null",
    "country": "country, or null",
    "facebook": "full Facebook URL if found, or null",
    "instagram": "full Instagram URL if found, or null",
    "twitter": "full Twitter/X URL if found, or null",
    "linkedin": "full LinkedIn URL if found, or null",
    "youtube": "full YouTube URL if found, or null",
    "tiktok": "full TikTok URL if found, or null",
    "businessHours": {
      "monday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "tuesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "wednesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "thursday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "friday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "saturday": { "isOpen": false },
      "sunday": { "isOpen": false }
    }
  },
  "branding": {
    "primaryColor": "Main brand color as hex (e.g. '#2563eb'), based on the most prominent color found",
    "secondaryColor": "Secondary brand color as hex, or null",
    "accentColor": "Accent or call-to-action color as hex, or null",
    "backgroundColor": "Background color as hex (e.g. '#ffffff' for light, '#0f0f0f' for dark), or null",
    "isDarkTheme": false,
    "fonts": ["Primary font name", "Secondary font name if different"],
    "visualStyle": "Brief description of the visual style: e.g. 'modern minimalist with dark theme', 'warm and inviting with earthy tones', 'corporate professional with blue palette'"
  }
}

CRITICAL RULES:
1. Use ONLY data found in the scraped content. Do NOT guess or hallucinate.
2. SEPARATE address into individual fields (address, city, state, zipCode, country)
3. For social media, use the exact URLs found in the scraped data
4. For phone numbers, include country code if visible
5. For business hours, use 24-hour format. If not found, set all days to null
6. Extract 3-8 services maximum from the content
7. If a field is not found, use null (not empty string)
8. The description and tagline should match the website's language
9. For branding: pick colors from the colorsFound array. The primaryColor should be the dominant brand color (not black/white/gray). Set isDarkTheme to true if the background is dark.
10. For fonts: use the fontsFound array. List the primary heading font first, body font second.
11. Return ONLY the JSON, nothing else`;

            const aiResult = await generateTextViaOpenRouter(prompt, {
                model: 'gemini-2.5-flash',
                temperature: 0.2,
                maxOutputTokens: 5000,
            });

            const responseText = aiResult.text;

            if (!responseText) {
                functions.logger.error('Empty AI response');
                throw new functions.https.HttpsError('internal', 'Could not analyze the website. Please try a different URL.');
            }

            // Clean up response (remove markdown code blocks if present)
            const jsonText = responseText
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            let result;
            try {
                result = JSON.parse(jsonText);
            } catch (parseError) {
                functions.logger.error('Failed to parse AI response', { responseText: responseText.slice(0, 500) });
                throw new functions.https.HttpsError('internal', 'Failed to parse analysis results. Please try again.');
            }

            // Sanitize: convert empty strings to null for cleaner data
            if (result.contactInfo) {
                for (const key of Object.keys(result.contactInfo)) {
                    if (result.contactInfo[key] === '' || result.contactInfo[key] === 'null') {
                        result.contactInfo[key] = null;
                    }
                }
            }

            functions.logger.info('Website analysis complete', {
                url: normalizedUrl,
                pagesScraped: comprehensiveExtraction.pagesScraped,
                businessName: result.businessName,
                industry: result.industry,
                servicesCount: result.services?.length || 0,
                hasContactEmail: !!result.contactInfo?.email,
                hasContactPhone: !!result.contactInfo?.phone,
                hasAddress: !!result.contactInfo?.address,
                hasSocial: !!(result.contactInfo?.facebook || result.contactInfo?.instagram),
                hasBusinessHours: !!result.contactInfo?.businessHours,
                provider: aiResult.provider,
            });

            return {
                success: true,
                result,
                meta: {
                    pagesScraped: comprehensiveExtraction.pagesScraped,
                    subpagesVisited: comprehensiveExtraction.subpagesVisited,
                },
            };

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }

            functions.logger.error('Website analysis error', {
                url: normalizedUrl,
                error: error.message,
            });

            throw new functions.https.HttpsError('internal', `Analysis failed: ${error.message}`);
        }
    });
