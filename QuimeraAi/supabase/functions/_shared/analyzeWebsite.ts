/**
 * Website scraper + AI analyzer for onboarding.
 * Ported from Firebase functions/src/onboarding/analyzeWebsite.ts
 */

import { generateTextViaOpenRouter } from "./openrouterText.ts";

async function fetchPage(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuimeraBot/1.0; +https://quimeraai.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Not HTML");
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractTag(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text && text.length > 1 && text.length < 2000) results.push(text);
  }
  return results;
}

function extractMeta(html: string, nameOrProp: string): string {
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, "i"),
  );
  if (nameMatch) return nameMatch[1];
  const nameMatch2 = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${nameOrProp}["']`, "i"),
  );
  if (nameMatch2) return nameMatch2[1];
  const propMatch = html.match(
    new RegExp(`<meta[^>]*property=["']${nameOrProp}["'][^>]*content=["']([^"']+)["']`, "i"),
  );
  if (propMatch) return propMatch[1];
  const propMatch2 = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${nameOrProp}["']`, "i"),
  );
  if (propMatch2) return propMatch2[1];
  return "";
}

function extractNavLinks(html: string, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const hostname = new URL(baseUrl).hostname;
  const links = new Set<string>();

  const addLink = (href: string) => {
    href = href.trim();
    if (
      !href || href === "/" || href.startsWith("#") || href.startsWith("mailto:") ||
      href.startsWith("tel:") || href.startsWith("javascript:")
    ) return;
    if (/\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|webm|webp)$/i.test(href)) return;

    const cleanHref = href.split("#")[0];
    if (cleanHref === "/" || cleanHref === "") return;

    if (cleanHref.startsWith("/") && !cleanHref.startsWith("//")) {
      links.add(`${origin}${cleanHref}`);
    } else if (cleanHref.startsWith("http") && cleanHref.includes(hostname)) {
      if (cleanHref !== origin && cleanHref !== `${origin}/`) {
        links.add(cleanHref);
      }
    } else if (!cleanHref.startsWith("http") && !cleanHref.startsWith("//")) {
      links.add(`${origin}/${cleanHref}`);
    }
  };

  const navSections =
    html.match(/<(?:nav|header|footer|aside)[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside)>/gi) || [];
  const classSections =
    html.match(/<[^>]+class=["'][^"']*(?:nav|menu|header|footer|sidebar|links)[^"']*["'][^>]*>[\s\S]*?<\/[a-zA-Z]+>/gi) ||
    [];
  const allNavHtml = navSections.join(" ") + " " + classSections.join(" ");

  const hrefRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = hrefRegex.exec(allNavHtml)) !== null) addLink(match[1]);

  const fullHrefRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  while ((match = fullHrefRegex.exec(html)) !== null) addLink(match[1]);

  return [...links].slice(0, 40);
}

function extractSocialLinks(html: string): Record<string, string> {
  const social: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook", /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/i],
    ["instagram", /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/i],
    ["twitter", /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'\s]+)["']/i],
    ["linkedin", /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'\s]+)["']/i],
    ["youtube", /href=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'\s]+)["']/i],
    ["tiktok", /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'\s]+)["']/i],
    ["pinterest", /href=["'](https?:\/\/(?:www\.)?pinterest\.com\/[^"'\s]+)["']/i],
    ["whatsapp", /href=["'](https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^"'\s]+)["']/i],
  ];
  for (const [name, regex] of patterns) {
    const m = html.match(regex);
    if (m) social[name] = m[1];
  }
  return social;
}

function extractContactInfo(text: string) {
  const emails = [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].slice(0, 5);
  const phones = [...new Set(text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])]
    .slice(0, 5);
  return { emails, phones };
}

function extractColors(html: string): string[] {
  const colorSet = new Map<string, number>();

  const varColors = html.match(/--[a-zA-Z0-9-]+:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi) || [];
  for (const c of varColors) {
    const val = (c.split(":")[1] || "").replace(/!important|;/g, "").trim().toLowerCase();
    if (val) colorSet.set(val, (colorSet.get(val) || 0) + 5);
  }

  const inlineColors =
    html.match(/(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi) ||
    [];
  for (const c of inlineColors) {
    const val = c.replace(/^[^:]+:\s*/, "").replace(/!important|;/g, "").trim().toLowerCase();
    colorSet.set(val, (colorSet.get(val) || 0) + 2);
  }

  const tailwindColors =
    html.match(/(?:bg|text|border|ring|fill|stroke)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\]/gi) || [];
  for (const c of tailwindColors) {
    const m = c.match(/\[(.*?)\]/);
    if (m?.[1]) colorSet.set(m[1].toLowerCase(), (colorSet.get(m[1].toLowerCase()) || 0) + 3);
  }

  const hexColors = html.match(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b/g) || [];
  for (const c of hexColors) {
    const lower = c.toLowerCase();
    colorSet.set(lower, (colorSet.get(lower) || 0) + 1);
  }

  return Array.from(colorSet.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 40);
}

function extractFonts(html: string): string[] {
  const fontSet = new Set<string>();
  const fontFamilyMatches = html.match(/font-family\s*:\s*([^;}"]+)/gi) || [];
  for (const m of fontFamilyMatches) {
    const families = m.replace(/font-family\s*:\s*/i, "").split(",");
    for (const f of families) {
      const clean = f.replace(/["'!important]/g, "").trim();
      if (
        clean &&
        !["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "unset", "-apple-system", "BlinkMacSystemFont"]
          .includes(clean.toLowerCase())
      ) {
        fontSet.add(clean);
      }
    }
  }

  const gfMatches = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&>]+)/gi) || [];
  for (const m of gfMatches) {
    const familyPart = m.replace(/.*family=/i, "");
    for (const f of familyPart.split("|")) {
      const name = decodeURIComponent(f.split(":")[0].replace(/\+/g, " ")).trim();
      if (name) fontSet.add(name);
    }
  }

  const fontFaceMatches = html.match(/@font-face\s*\{[^}]*font-family\s*:\s*["']?([^"';},]+)/gi) || [];
  for (const m of fontFaceMatches) {
    const name = (m.match(/font-family\s*:\s*["']?([^"';},]+)/i) || [])[1]?.trim();
    if (name) fontSet.add(name);
  }

  return [...fontSet].slice(0, 10);
}

function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch { /* skip */ }
  }
  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scrapePage(html: string, url: string) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || "";
  const h1s = extractTag(html, "h1");
  const h2s = extractTag(html, "h2");
  const h3s = extractTag(html, "h3");
  const bodyText = stripHtml(html);
  const contact = extractContactInfo(bodyText);
  const social = extractSocialLinks(html);
  const colors = extractColors(html);
  const fonts = extractFonts(html);
  const jsonLd = extractJsonLd(html);

  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
  const images: { src: string; alt: string }[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1];
    const alt = imgMatch[2] || "";
    if (src && !src.includes("data:image/svg") && !src.includes("pixel") && !src.includes("tracking") && !src.includes("spacer")) {
      const fullSrc = src.startsWith("http")
        ? src
        : `${new URL(url).origin}${src.startsWith("/") ? "" : "/"}${src}`;
      images.push({ src: fullSrc, alt });
    }
  }

  return {
    url,
    title,
    metaDescription: extractMeta(html, "description"),
    metaKeywords: extractMeta(html, "keywords"),
    ogTitle: extractMeta(html, "og:title"),
    ogDescription: extractMeta(html, "og:description"),
    ogImage: extractMeta(html, "og:image"),
    headings: { h1: h1s.slice(0, 10), h2: h2s.slice(0, 30), h3: h3s.slice(0, 30) },
    emails: contact.emails,
    phones: contact.phones,
    socialLinks: social,
    colors,
    fonts,
    images: images.slice(0, 40),
    jsonLd: jsonLd.slice(0, 5),
    bodyTextSample: bodyText.slice(0, 10000),
  };
}

export async function analyzeWebsiteUrl(url: string, userId: string) {
  if (!url || typeof url !== "string") {
    throw new Error("URL is required");
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  console.log("[analyzeWebsite] Starting", { url: normalizedUrl, userId });

  const mainHtml = await fetchPage(normalizedUrl, 10000);
  const mainData = scrapePage(mainHtml, normalizedUrl);

  const internalLinks = extractNavLinks(mainHtml, normalizedUrl);
  const MAX_SUBPAGES = 12;
  const linksToFetch = internalLinks.slice(0, MAX_SUBPAGES);

  const subpageResults = await Promise.allSettled(
    linksToFetch.map(async (link) => {
      try {
        const html = await fetchPage(link, 6000);
        return scrapePage(html, link);
      } catch (err) {
        console.warn("[analyzeWebsite] Subpage failed:", link, (err as Error).message);
        return null;
      }
    }),
  );

  const subpageData = subpageResults
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof scrapePage>> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  const allEmails = new Set([...mainData.emails, ...subpageData.flatMap((s) => s.emails)]);
  const allPhones = new Set([...mainData.phones, ...subpageData.flatMap((s) => s.phones)]);
  const allSocial = { ...mainData.socialLinks };
  for (const sub of subpageData) {
    for (const [k, v] of Object.entries(sub.socialLinks)) {
      if (!allSocial[k]) allSocial[k] = v;
    }
  }
  const allColors = [...new Set([...mainData.colors, ...subpageData.flatMap((s) => s.colors)])].slice(0, 20);
  const allFonts = [...new Set([...mainData.fonts, ...subpageData.flatMap((s) => s.fonts)])].slice(0, 10);
  const allHeadings = {
    h1: [...new Set([...mainData.headings.h1, ...subpageData.flatMap((s) => s.headings.h1)])].slice(0, 20),
    h2: [...new Set([...mainData.headings.h2, ...subpageData.flatMap((s) => s.headings.h2)])].slice(0, 60),
    h3: [...new Set([...mainData.headings.h3, ...subpageData.flatMap((s) => s.headings.h3)])].slice(0, 60),
  };
  const allJsonLd = [...mainData.jsonLd, ...subpageData.flatMap((s) => s.jsonLd)].slice(0, 8);
  const allImages = [...mainData.images, ...subpageData.flatMap((s) => s.images)];
  const uniqueImages = Array.from(new Map(allImages.map((img) => [img.src, img])).values()).slice(0, 40);

  const allBodyText = [
    `[HOME PAGE] ${mainData.bodyTextSample}`,
    ...subpageData.map((s) => `[${s.url}] ${s.bodyTextSample}`),
  ].join("\n\n").slice(0, 40000);

  const comprehensiveExtraction = {
    url: normalizedUrl,
    pagesScraped: 1 + subpageData.length,
    subpagesVisited: subpageData.map((s) => ({ url: s.url, title: s.title })),
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
    images: uniqueImages,
    jsonLdSummary: allJsonLd.length > 0 ? JSON.stringify(allJsonLd[0]).slice(0, 800) : null,
    fullTextContent: allBodyText,
  };

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
    "visualStyle": "Brief description of the visual style"
  }
}

CRITICAL RULES:
1. Use ONLY data found in the scraped content. Do NOT guess or hallucinate.
2. SEPARATE address into individual fields (address, city, state, zipCode, country)
3. For social media, use the exact URLs found in the scraped data
4. Extract 3-8 services maximum from the content
5. If a field is not found, use null (not empty string)
6. Return ONLY the JSON, nothing else`;

  const aiResult = await generateTextViaOpenRouter(prompt, {
    model: "gemini-2.5-flash",
    temperature: 0.2,
    maxOutputTokens: 5000,
  });

  const responseText = aiResult.text;
  if (!responseText) {
    throw new Error("Could not analyze the website. Please try a different URL.");
  }

  const jsonText = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(jsonText);
  } catch {
    throw new Error("Failed to parse analysis results. Please try again.");
  }

  const contactInfo = result.contactInfo as Record<string, unknown> | undefined;
  if (contactInfo) {
    for (const key of Object.keys(contactInfo)) {
      if (contactInfo[key] === "" || contactInfo[key] === "null") {
        contactInfo[key] = null;
      }
    }
  }

  console.log("[analyzeWebsite] Complete", {
    url: normalizedUrl,
    pagesScraped: comprehensiveExtraction.pagesScraped,
    businessName: result.businessName,
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
}
