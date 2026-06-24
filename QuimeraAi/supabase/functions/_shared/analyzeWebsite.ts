/**
 * Website scraper + AI analyzer for onboarding.
 * Ported from Firebase functions/src/onboarding/analyzeWebsite.ts
 */

import { generateTextViaOpenRouter } from "./openrouterText.ts";

type ColorSignalRole = "primary" | "secondary" | "accent" | "background" | "surface" | "text" | "logo" | "image" | "unknown";
type ColorSignalSource = "import" | "logo" | "image" | "css" | "button" | "link" | "navigation" | "background" | "user";

interface ColorSignal {
  color: string;
  source: ColorSignalSource;
  weight: number;
  roleGuess?: ColorSignalRole;
  label?: string;
}

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

async function fetchText(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuimeraBot/1.0; +https://quimeraai.com)",
        Accept: "text/css,application/xml,text/xml,text/plain,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function getHtmlAttr(tag: string, attr: string): string {
  const match = tag.match(new RegExp(`${attr}=["']([^"']*)["']`, "i"));
  return match?.[1] || "";
}

function extractStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const linkRegex = /<link\b[^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const href = getHtmlAttr(tag, "href");
    const rel = getHtmlAttr(tag, "rel").toLowerCase();
    const asAttr = getHtmlAttr(tag, "as").toLowerCase();
    const isStylesheet = rel.includes("stylesheet") || asAttr === "style" || /\.css(?:$|\?)/i.test(href);
    if (!href || !isStylesheet || href.startsWith("data:") || href.startsWith("javascript:")) continue;

    try {
      const url = new URL(href, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      urls.add(url.href);
    } catch {
      // skip invalid stylesheet URLs
    }
  }

  return [...urls].slice(0, 10);
}

async function fetchLinkedStylesheets(html: string, baseUrl: string, maxStylesheets = 8): Promise<string> {
  const stylesheetUrls = extractStylesheetUrls(html, baseUrl).slice(0, maxStylesheets);
  const cssChunks: string[] = [];

  for (const stylesheetUrl of stylesheetUrls) {
    try {
      const css = await fetchText(stylesheetUrl, 5000);
      cssChunks.push(`/* ${stylesheetUrl} */\n${css.slice(0, 120000)}`);

      const imports = [...css.matchAll(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/gi)]
        .map((importMatch) => importMatch[1])
        .slice(0, 3);
      for (const imported of imports) {
        try {
          const importedUrl = new URL(imported, stylesheetUrl).href;
          const importedCss = await fetchText(importedUrl, 4000);
          cssChunks.push(`/* ${importedUrl} */\n${importedCss.slice(0, 60000)}`);
        } catch {
          // imported CSS is optional
        }
      }
    } catch (err) {
      console.warn("[analyzeWebsite] Stylesheet unavailable:", stylesheetUrl, (err as Error).message);
    }
  }

  return cssChunks.join("\n\n");
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

function uniqueSameOriginUrls(urls: string[], baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    try {
      const parsed = new URL(raw, base.origin);
      parsed.hash = "";
      if (parsed.hostname !== base.hostname) continue;
      if (parsed.href === base.href || parsed.href === `${base.origin}/`) continue;
      if (/\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|webm|webp|css|js)$/i.test(parsed.pathname)) continue;
      const clean = parsed.href.replace(/\/$/, "");
      if (seen.has(clean)) continue;
      seen.add(clean);
      result.push(clean);
    } catch {
      // skip invalid URL
    }
  }

  return result;
}

function classifyPagePurpose(url: string, title = "", headings: { h1: string[]; h2: string[]; h3: string[] } = { h1: [], h2: [], h3: [] }): string {
  const value = `${url} ${title} ${headings.h1.join(" ")} ${headings.h2.slice(0, 4).join(" ")}`.toLowerCase();
  if (/contact|contacto|location|ubicaci[oó]n|directions/.test(value)) return "contact";
  if (/about|nosotros|quienes|empresa|story|historia/.test(value)) return "about";
  if (/service|servicio|solution|soluci[oó]n|practice|tratamiento/.test(value)) return "services";
  if (/menu|men[uú]|carta|food|dish|plato/.test(value)) return "menu";
  if (/product|producto|shop|store|tienda|catalog|collection|colecci[oó]n/.test(value)) return "products";
  if (/portfolio|work|project|gallery|galer[ií]a|case-study/.test(value)) return "portfolio";
  if (/price|pricing|precio|planes|packages|paquetes/.test(value)) return "pricing";
  if (/property|properties|propiedad|inmueble|listing|listado|real-estate/.test(value)) return "properties";
  if (/blog|article|news|noticia|recurso/.test(value)) return "content";
  return "content";
}

async function extractSitemapUrls(baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const sitemapUrl = `${base.origin}/sitemap.xml`;
  try {
    const xml = await fetchText(sitemapUrl, 6000);
    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
    const nestedSitemaps = locs.filter((loc) => /\.xml(?:$|\?)/i.test(loc)).slice(0, 3);
    const pageUrls = locs.filter((loc) => !/\.xml(?:$|\?)/i.test(loc));

    for (const nested of nestedSitemaps) {
      try {
        const nestedXml = await fetchText(nested, 5000);
        pageUrls.push(...[...nestedXml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim()));
      } catch (err) {
        console.warn("[analyzeWebsite] Nested sitemap failed:", nested, (err as Error).message);
      }
    }

    return uniqueSameOriginUrls(pageUrls, baseUrl).slice(0, 80);
  } catch (err) {
    console.warn("[analyzeWebsite] Sitemap unavailable:", sitemapUrl, (err as Error).message);
    return [];
  }
}

function prioritizeLinks(urls: string[], baseUrl: string): string[] {
  const priorities = ["contact", "about", "service", "menu", "product", "shop", "store", "portfolio", "pricing", "property", "listing"];
  return uniqueSameOriginUrls(urls, baseUrl)
    .map((url) => {
      const lower = url.toLowerCase();
      const score = priorities.reduce((total, keyword, index) => total + (lower.includes(keyword) ? 100 - index * 6 : 0), 0);
      return { url, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url);
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

const CSS_COLOR_REGEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)/gi;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function componentToHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function parseHue(value: string): number {
  const raw = value.trim().toLowerCase();
  const number = parseFloat(raw);
  if (!Number.isFinite(number)) return 0;
  if (raw.endsWith("turn")) return number * 360;
  if (raw.endsWith("rad")) return number * (180 / Math.PI);
  return number;
}

function parsePercent(value: string): number {
  const raw = value.trim();
  const number = parseFloat(raw);
  if (!Number.isFinite(number)) return 0;
  return raw.endsWith("%") ? number / 100 : number;
}

function parseRgbChannel(value: string): number {
  const raw = value.trim();
  const number = parseFloat(raw);
  if (!Number.isFinite(number)) return 0;
  return raw.endsWith("%") ? (number / 100) * 255 : number;
}

function splitCssColorParts(value: string): string[] {
  return value
    .replace(/\s*\/\s*[\d.]+%?\s*$/g, "")
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (((h % 360) + 360) % 360) / 60;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue >= 0 && hue < 1) [r, g, b] = [c, x, 0];
  else if (hue < 2) [r, g, b] = [x, c, 0];
  else if (hue < 3) [r, g, b] = [0, c, x];
  else if (hue < 4) [r, g, b] = [0, x, c];
  else if (hue < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function linearToSrgb(value: number): number {
  const v = clamp(value, 0, 1);
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function oklchToHex(lRaw: string, cRaw: string, hRaw: string): string {
  const L = lRaw.trim().endsWith("%") ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
  const C = parseFloat(cRaw);
  const h = parseHue(hRaw) * (Math.PI / 180);
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(h)) return "";

  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return rgbToHex(linearToSrgb(r) * 255, linearToSrgb(g) * 255, linearToSrgb(blue) * 255);
}

function normalizeColorValue(color: string): string {
  const value = (color || "").trim().toLowerCase();
  if (!value || /transparent|currentcolor|inherit|initial|unset|var\(/i.test(value)) return "";

  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split("").map((char) => char + char).join("");
    if (hex.length >= 6) return `#${hex.slice(0, 6)}`;
  }

  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = splitCssColorParts(rgba[1]);
    if (parts.length >= 3) {
      return rgbToHex(parseRgbChannel(parts[0]), parseRgbChannel(parts[1]), parseRgbChannel(parts[2]));
    }
  }

  const hsla = value.match(/^hsla?\(([^)]+)\)$/i);
  if (hsla) {
    const parts = splitCssColorParts(hsla[1]);
    if (parts.length >= 3) {
      return hslToHex(parseHue(parts[0]), parsePercent(parts[1]), parsePercent(parts[2]));
    }
  }

  const oklch = value.match(/^oklch\(([^)]+)\)$/i);
  if (oklch) {
    const parts = splitCssColorParts(oklch[1]);
    if (parts.length >= 3) return oklchToHex(parts[0], parts[1], parts[2]);
  }

  const hslChannels = value.match(/^(-?[\d.]+(?:deg|rad|turn)?)\s+([\d.]+%)\s+([\d.]+%)(?:\s*\/\s*[\d.]+%?)?$/i);
  if (hslChannels) {
    return hslToHex(parseHue(hslChannels[1]), parsePercent(hslChannels[2]), parsePercent(hslChannels[3]));
  }

  return "";
}

function extractColorValues(value: string): string[] {
  const direct = normalizeColorValue(value.replace(/!important/g, "").replace(/;$/g, "").trim());
  const found = new Set<string>();
  if (direct) found.add(direct);

  const matches = value.match(CSS_COLOR_REGEX) || [];
  for (const match of matches) {
    const normalized = normalizeColorValue(match);
    if (normalized) found.add(normalized);
  }

  return [...found];
}

function extractColors(html: string): string[] {
  const colorSet = new Map<string, number>();
  const addColors = (raw: string, weight: number) => {
    for (const normalized of extractColorValues(raw)) {
      colorSet.set(normalized, (colorSet.get(normalized) || 0) + weight);
    }
  };

  const varRegex = /--[a-zA-Z0-9-]+\s*:\s*([^;{}]+)/gi;
  let varMatch;
  while ((varMatch = varRegex.exec(html)) !== null) {
    addColors(varMatch[1], 5);
  }

  const inlineRegex = /(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*([^;{}]+)/gi;
  let inlineMatch;
  while ((inlineMatch = inlineRegex.exec(html)) !== null) {
    addColors(inlineMatch[1], 2);
  }

  const tailwindColors =
    html.match(/(?:bg|text|border|ring|fill|stroke)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\))\]/gi) || [];
  for (const c of tailwindColors) {
    const m = c.match(/\[(.*?)\]/);
    if (m?.[1]) addColors(m[1], 3);
  }

  const generalMatches = html.match(CSS_COLOR_REGEX) || [];
  for (const color of generalMatches) addColors(color, 1);

  return Array.from(colorSet.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 40);
}

function guessColorRole(label: string, property = ""): ColorSignalRole {
  const haystack = `${label} ${property}`.toLowerCase();
  if (/primary|brand|main|theme|base/.test(haystack)) return "primary";
  if (/secondary/.test(haystack)) return "secondary";
  if (/accent|cta|button|link|highlight|sale|promo/.test(haystack)) return "accent";
  if (/background|bg|body|page/.test(haystack)) return "background";
  if (/surface|card|panel|container/.test(haystack)) return "surface";
  if (/text|foreground|heading|title|copy|color/.test(haystack)) return "text";
  return "unknown";
}

function extractColorSignals(html: string): ColorSignal[] {
  const signals = new Map<string, ColorSignal>();
  const addSignal = (color: string, source: ColorSignalSource, weight: number, roleGuess?: ColorSignalRole, label?: string) => {
    const normalized = normalizeColorValue(color);
    if (!normalized) return;
    const key = `${normalized}-${source}-${roleGuess || "unknown"}-${label || ""}`;
    const previous = signals.get(key);
    signals.set(key, {
      color: normalized,
      source,
      roleGuess,
      label,
      weight: Math.min(120, (previous?.weight || 0) + weight),
    });
  };
  const addSignalsFromValue = (value: string, source: ColorSignalSource, weight: number, roleGuess?: ColorSignalRole, label?: string) => {
    for (const color of extractColorValues(value)) {
      addSignal(color, source, weight, roleGuess, label);
    }
  };

  const themeColor = extractMeta(html, "theme-color");
  if (themeColor) addSignal(themeColor, "css", 90, "primary", "meta theme-color");

  const varRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;{}]+)/gi;
  let varMatch;
  while ((varMatch = varRegex.exec(html)) !== null) {
    const name = varMatch[1];
    const role = guessColorRole(name);
    addSignalsFromValue(varMatch[2], role === "accent" ? "button" : "css", role === "primary" ? 82 : 58, role, `--${name}`);
  }

  const styleRegex = /(color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*([^;{}]+)/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const property = styleMatch[1];
    const role = guessColorRole("", property);
    const source: ColorSignalSource = /background/i.test(property) ? "background" : role === "text" ? "css" : "css";
    addSignalsFromValue(styleMatch[2], source, /background/i.test(property) ? 34 : 24, role, property);
  }

  const buttonHtml = html.match(/<(?:button|a)[^>]*(?:btn|button|cta|shop|buy|cart|reserve|book)[^>]*>/gi) || [];
  for (const node of buttonHtml.slice(0, 40)) {
    const colorMatches = node.match(CSS_COLOR_REGEX) || [];
    for (const color of colorMatches) addSignal(color, "button", 70, "accent", "button/cta");
  }

  const linkHtml = html.match(/<a[^>]*>/gi) || [];
  for (const node of linkHtml.slice(0, 80)) {
    const colorMatches = node.match(CSS_COLOR_REGEX) || [];
    for (const color of colorMatches) addSignal(color, "link", 44, "accent", "link");
  }

  return [...signals.values()].sort((a, b) => b.weight - a.weight).slice(0, 40);
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

function rankDetectedAssets(
  images: { src: string; alt: string; width?: number; height?: number; sourcePage?: string }[],
  mainPage: ReturnType<typeof scrapePage>,
): Array<{ url: string; alt?: string; sourcePage?: string; recommendedUse?: string; score: number; width?: number; height?: number }> {
  const assets: Array<{ url: string; alt?: string; sourcePage?: string; recommendedUse?: string; score: number; width?: number; height?: number }> = [];
  const ogImage = mainPage.ogImage
    ? (mainPage.ogImage.startsWith("http") ? mainPage.ogImage : new URL(mainPage.ogImage, mainPage.url).href)
    : "";

  if (ogImage) {
    assets.push({ url: ogImage, alt: mainPage.ogTitle || mainPage.title, sourcePage: mainPage.url, recommendedUse: "hero", score: 95 });
  }

  for (const image of images) {
    const url = image.src;
    const alt = image.alt || "";
    const haystack = `${url} ${alt}`.toLowerCase();
    if (!url || /sprite|favicon|pixel|tracking|spacer|blank|placeholder|loader|payment|paypal|visa|mastercard/.test(haystack)) continue;
    if (/\.(svg)(?:$|\?)/i.test(url)) continue;
    if (image.width && image.height && image.width * image.height < 60000) continue;

    let recommendedUse = "gallery";
    let score = 30;
    if (/logo|brand/.test(haystack)) {
      recommendedUse = "logo";
      score = 85;
    } else if (/hero|banner|cover|header|og:image|main/.test(haystack)) {
      recommendedUse = "hero";
      score = 80;
    } else if (/product|shop|store|sku|collection/.test(haystack)) {
      recommendedUse = "product";
      score = 70;
    } else if (/menu|food|dish|plate|restaurant/.test(haystack)) {
      recommendedUse = "menu";
      score = 68;
    } else if (/team|staff|person|portrait|headshot|founder/.test(haystack)) {
      recommendedUse = "team";
      score = 64;
    } else if (/portfolio|project|gallery|work/.test(haystack)) {
      recommendedUse = "portfolio";
      score = 60;
    }
    if (image.width && image.height) {
      const landscape = image.width >= image.height;
      if (landscape && ["hero", "gallery", "portfolio"].includes(recommendedUse)) score += 8;
      if (image.width * image.height > 500000) score += 6;
    }
    if (image.sourcePage && image.sourcePage === mainPage.url) score += 4;
    assets.push({ url, alt, sourcePage: image.sourcePage, recommendedUse, score, width: image.width, height: image.height });
  }

  return Array.from(new Map(assets.map((asset) => [asset.url, asset])).values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);
}

function recommendComponentsForImport(industry: string, pagePurposes: string[], hasEcommerce: boolean): string[] {
  const lower = (industry || "").toLowerCase();
  const purposes = new Set(pagePurposes);
  if (hasEcommerce || purposes.has("products") || /ecommerce|retail|fashion|jewelry|electronics|shop|store/.test(lower)) {
    return ["announcementBar", "productHero", "featuredProducts", "categoryGrid", "trustBadges", "saleCountdown", "productReviews", "footer"];
  }
  if (/restaurant|cafe|food/.test(lower) || purposes.has("menu")) {
    return ["heroGallery", "menu", "restaurantReservation", "testimonials", "map", "footer"];
  }
  if (/real-estate|real estate|property|inmobili/.test(lower) || purposes.has("properties")) {
    return ["heroLead", "realEstateListings", "features", "testimonials", "leads", "map", "footer"];
  }
  if (/photo|portfolio|creative|agency|event/.test(lower) || purposes.has("portfolio")) {
    return ["heroNova", "portfolio", "slideshow", "services", "testimonials", "cta", "footer"];
  }
  if (/tech|software|saas|ai|cyber|web3/.test(lower)) {
    return ["heroWave", "features", "pricing", "testimonials", "faq", "cta", "footer"];
  }
  return ["heroLead", "services", "features", "howItWorks", "testimonials", "faq", "leads", "map", "footer"];
}

function detectMissingOpportunities(result: Record<string, unknown>, pagePurposes: string[], recommendedComponents: string[]): string[] {
  const opportunities: string[] = [];
  const purposes = new Set(pagePurposes);
  const contactInfo = result.contactInfo as Record<string, unknown> | undefined;

  if (!contactInfo?.email && !contactInfo?.phone) opportunities.push("Add a stronger contact path.");
  if (!purposes.has("pricing") && recommendedComponents.some((component) => component.includes("pricing") || component === "pricing")) opportunities.push("Add pricing or package context.");
  if (!purposes.has("portfolio") && recommendedComponents.includes("portfolio")) opportunities.push("Add proof-of-work or portfolio examples.");
  if (!recommendedComponents.includes("testimonials")) opportunities.push("Add social proof or testimonials.");
  if (!recommendedComponents.includes("faq")) opportunities.push("Add FAQ content to handle objections.");

  return [...new Set(opportunities)].slice(0, 6);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function colorLuminance(hex: string): number {
  const normalized = normalizeColorValue(hex);
  if (!normalized) return 0;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const linear = [r, g, b].map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function scrapePage(html: string, url: string, externalCss = "") {
  const analysisSource = externalCss ? `${html}\n<style data-quimera-external-css>${externalCss}</style>` : html;
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || "";
  const h1s = extractTag(html, "h1");
  const h2s = extractTag(html, "h2");
  const h3s = extractTag(html, "h3");
  const bodyText = stripHtml(html);
  const contact = extractContactInfo(bodyText);
  const social = extractSocialLinks(html);
  const colors = extractColors(analysisSource);
  const colorSignals = extractColorSignals(analysisSource);
  const fonts = extractFonts(analysisSource);
  const jsonLd = extractJsonLd(html);

  const getAttr = (tag: string, attr: string): string => {
    return getHtmlAttr(tag, attr);
  };
  const parseSize = (value: string): number | undefined => {
    const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };
  const imgRegex = /<img\b[^>]*>/gi;
  const images: { src: string; alt: string; width?: number; height?: number; sourcePage?: string }[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const tag = imgMatch[0];
    const src = getAttr(tag, "src") || getAttr(tag, "data-src") || getAttr(tag, "data-lazy-src");
    const alt = getAttr(tag, "alt");
    const width = parseSize(getAttr(tag, "width"));
    const height = parseSize(getAttr(tag, "height"));
    if (src && !src.includes("data:image/svg") && !src.includes("pixel") && !src.includes("tracking") && !src.includes("spacer")) {
      const fullSrc = src.startsWith("http")
        ? src
        : `${new URL(url).origin}${src.startsWith("/") ? "" : "/"}${src}`;
      images.push({ src: fullSrc, alt, width, height, sourcePage: url });
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
    colorSignals,
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
  const mainCss = await fetchLinkedStylesheets(mainHtml, normalizedUrl, 8);
  const mainData = scrapePage(mainHtml, normalizedUrl, mainCss);

  const sitemapLinks = await extractSitemapUrls(normalizedUrl);
  const internalLinks = extractNavLinks(mainHtml, normalizedUrl);
  const MAX_SUBPAGES = 12;
  const linksToFetch = prioritizeLinks([...sitemapLinks, ...internalLinks], normalizedUrl).slice(0, MAX_SUBPAGES);

  const subpageResults = await Promise.allSettled(
    linksToFetch.map(async (link) => {
      try {
        const html = await fetchPage(link, 6000);
        const css = await fetchLinkedStylesheets(html, link, 4);
        return scrapePage(html, link, css);
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
  const allColorSignals = Array.from(
    new Map(
      [mainData, ...subpageData]
        .flatMap((page) => page.colorSignals)
        .map((signal) => [`${signal.color}-${signal.source}-${signal.roleGuess || "unknown"}-${signal.label || ""}`, signal])
    ).values()
  ).sort((a, b) => b.weight - a.weight).slice(0, 40);
  const allFonts = [...new Set([...mainData.fonts, ...subpageData.flatMap((s) => s.fonts)])].slice(0, 10);
  const allHeadings = {
    h1: [...new Set([...mainData.headings.h1, ...subpageData.flatMap((s) => s.headings.h1)])].slice(0, 20),
    h2: [...new Set([...mainData.headings.h2, ...subpageData.flatMap((s) => s.headings.h2)])].slice(0, 60),
    h3: [...new Set([...mainData.headings.h3, ...subpageData.flatMap((s) => s.headings.h3)])].slice(0, 60),
  };
  const allJsonLd = [...mainData.jsonLd, ...subpageData.flatMap((s) => s.jsonLd)].slice(0, 8);
  const allImages = [...mainData.images, ...subpageData.flatMap((s) => s.images)];
  const uniqueImages = Array.from(new Map(allImages.map((img) => [img.src, img])).values()).slice(0, 40);
  const scrapedPages = [mainData, ...subpageData].map((page) => {
    const purpose = page.url === normalizedUrl ? "home" : classifyPagePurpose(page.url, page.title, page.headings);
    return {
      url: page.url,
      title: page.title || page.ogTitle || page.url,
      purpose,
      summary: page.metaDescription || page.ogDescription || page.headings.h1[0] || "",
    };
  });

  const allBodyText = [
    `[HOME PAGE] ${mainData.bodyTextSample}`,
    ...subpageData.map((s) => `[${s.url}] ${s.bodyTextSample}`),
  ].join("\n\n").slice(0, 40000);

  const comprehensiveExtraction = {
    url: normalizedUrl,
    pagesScraped: 1 + subpageData.length,
    subpagesVisited: subpageData.map((s) => ({
      url: s.url,
      title: s.title,
      purpose: classifyPagePurpose(s.url, s.title, s.headings),
      summary: s.metaDescription || s.ogDescription || s.headings.h1[0] || "",
    })),
    sitemapPagesFound: sitemapLinks.length,
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
    colorSignalsFound: allColorSignals,
    fontsFound: allFonts,
    images: uniqueImages,
    pages: scrapedPages,
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

  const industry = String(result.industry || "other");
  const pagePurposes = scrapedPages.map((page) => page.purpose);
  const hasEcommerce = pagePurposes.includes("products") || /ecommerce|retail|fashion|jewelry|electronics|shop|store/i.test(industry);
  const detectedAssets = rankDetectedAssets(uniqueImages, mainData);
  const logoAsset = detectedAssets.find((asset) => asset.recommendedUse === "logo");
  const imageColorSignals: ColorSignal[] = detectedAssets
    .filter((asset) => asset.recommendedUse === "logo" || asset.recommendedUse === "hero")
    .slice(0, 4)
    .map((asset, index) => ({
      color: allColors[index] || allColors[0] || "#6366f1",
      source: asset.recommendedUse === "logo" ? "logo" : "image",
      weight: asset.recommendedUse === "logo" ? 75 : 42,
      roleGuess: asset.recommendedUse === "logo" ? "logo" : "image",
      label: asset.alt || asset.recommendedUse,
    }));
  const colorSignals = [...allColorSignals, ...imageColorSignals].slice(0, 44);
  const pickSignalColor = (roles: ColorSignalRole[], sources?: ColorSignalSource[], exclude: string[] = []) => {
    const normalizedExclude = exclude.map((color) => normalizeColorValue(color)).filter(Boolean);
    return colorSignals.find((signal) => {
      const normalized = normalizeColorValue(signal.color);
      if (!normalized || normalizedExclude.includes(normalized)) return false;
      if (!roles.includes(signal.roleGuess || "unknown")) return false;
      if (sources?.length && !sources.includes(signal.source)) return false;
      return true;
    })?.color || "";
  };
  const pickDistinctColor = (exclude: string[] = []) => {
    const normalizedExclude = exclude.map((color) => normalizeColorValue(color)).filter(Boolean);
    return allColors.find((color) => {
      const normalized = normalizeColorValue(color);
      return normalized && !normalizedExclude.includes(normalized);
    }) || "";
  };
  const recommendedComponents = recommendComponentsForImport(industry, pagePurposes, hasEcommerce);
  const missingOpportunities = detectMissingOpportunities(result, pagePurposes, recommendedComponents);
  const branding = result.branding as Record<string, unknown> | undefined;
  const extractedPrimary = pickSignalColor(["primary", "logo"], ["logo", "css", "button"]) || pickSignalColor(["primary", "logo"]) || pickDistinctColor();
  const extractedSecondary = pickSignalColor(["secondary"], undefined, [extractedPrimary]) || pickDistinctColor([extractedPrimary]);
  const extractedAccent = pickSignalColor(["accent"], ["button", "link", "css"], [extractedPrimary, extractedSecondary]) || pickSignalColor(["accent"], undefined, [extractedPrimary, extractedSecondary]) || pickDistinctColor([extractedPrimary, extractedSecondary]);
  const extractedBackground = pickSignalColor(["background"], ["background", "css"]) || allColors.find((color) => {
    const luminance = colorLuminance(color);
    return luminance > 0.86 || luminance < 0.18;
  }) || "";
  const extractedSurface = pickSignalColor(["surface"], undefined, [extractedBackground]) || pickDistinctColor([extractedBackground, extractedPrimary, extractedSecondary, extractedAccent]);
  const extractedText = pickSignalColor(["text"], ["css"], [extractedBackground, extractedSurface]) || "";
  const backgroundColor = normalizeColorValue(String(branding?.backgroundColor || extractedBackground)) || "#ffffff";
  const inferredDarkTheme = typeof branding?.isDarkTheme === "boolean"
    ? Boolean(branding.isDarkTheme)
    : colorLuminance(backgroundColor) < 0.35;
  const businessProfile = {
    businessName: result.businessName || "",
    industry,
    description: result.description || "",
    tagline: result.tagline || "",
    services: Array.isArray(result.services) ? result.services : [],
    contactInfo: result.contactInfo || {},
    hasEcommerce,
  };
  const brandProfile = {
    colors: {
      primary: normalizeColorValue(String(extractedPrimary || branding?.primaryColor || allColors[0] || "#6366f1")) || "#6366f1",
      secondary: normalizeColorValue(String(extractedSecondary || branding?.secondaryColor || allColors[1] || "#8b5cf6")) || "#8b5cf6",
      accent: normalizeColorValue(String(extractedAccent || branding?.accentColor || allColors[2] || "#f59e0b")) || "#f59e0b",
      background: backgroundColor,
      surface: normalizeColorValue(String(extractedSurface || allColors[3] || (inferredDarkTheme ? "#1a1a24" : "#ffffff"))) || (inferredDarkTheme ? "#1a1a24" : "#ffffff"),
      text: normalizeColorValue(String(extractedText || (inferredDarkTheme ? "#e4e4e7" : "#111827"))) || (inferredDarkTheme ? "#e4e4e7" : "#111827"),
    },
    fonts: Array.isArray(branding?.fonts) ? branding?.fonts : allFonts,
    visualStyle: branding?.visualStyle || "",
    logoUrl: logoAsset?.url || "",
    isDarkTheme: inferredDarkTheme,
    colorBrief: {
      source: "imported-url",
      industry,
      mood: ["modernize"],
      personality: branding?.visualStyle || "",
      mode: branding?.isDarkTheme ? "dark" : "auto",
      generationMode: "modernize",
      importedColors: colorSignals,
      logoColors: colorSignals.filter((signal) => signal.source === "logo"),
      imageColors: colorSignals.filter((signal) => signal.source === "image"),
      hasEcommerce,
    },
  };
  const contentMap = {
    pages: scrapedPages,
    testimonials: [],
    products: hasEcommerce ? [] : undefined,
    menuItems: pagePurposes.includes("menu") ? [] : undefined,
    properties: pagePurposes.includes("properties") ? [] : undefined,
    extractedImages: detectedAssets,
    missingOpportunities,
  };

  result = {
    ...result,
    hasEcommerce,
    businessProfile,
    brandProfile,
    contentMap,
    colorSignals,
    detectedAssets,
    recommendedComponents,
    missingOpportunities,
  };

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
      sitemapPagesFound: comprehensiveExtraction.sitemapPagesFound,
    },
  };
}
