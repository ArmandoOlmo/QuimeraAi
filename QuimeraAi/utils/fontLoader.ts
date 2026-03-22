/**
 * Font Loader Utility
 * Carga dinámicamente fuentes de Google Fonts para la aplicación
 * Curated 2026 Google Fonts catalog — 43 fonts with full variant support
 */

import { FontFamily } from '../types';

/**
 * Maps OLD font keys (removed from catalog) to their closest NEW equivalent.
 * Existing projects in Firestore may have these old keys.
 * Any key that still exists in the new catalog is NOT listed here.
 */
const legacyFontMigration: Record<string, FontFamily> = {
    'roboto': 'inter',
    'lato': 'inter',
    'oswald': 'barlow-condensed',
    'source-sans-pro': 'libre-franklin',
    'pt-sans': 'open-sans',
    'lora': 'libre-baskerville',
    'crimson-text': 'eb-garamond',
    'arvo': 'bree-serif',
    'mulish': 'inter',
    'noto-sans': 'inter',
    'noto-serif': 'newsreader',
    'inconsolata': 'space-mono',
    'indie-flower': 'fraunces',
    'cabin': 'figtree',
    'pacifico': 'syne',
    'josefin-sans': 'outfit',
    'anton': 'unbounded',
    'yanone-kaffeesatz': 'barlow-condensed',
    'arimo': 'inter',
    'lobster': 'syne',
    'vollkorn': 'merriweather',
    'abel': 'outfit',
    'francois-one': 'montserrat',
    'signika': 'dm-sans',
    'oxygen': 'inter',
    'quicksand': 'figtree',
    'pt-serif': 'libre-baskerville',
    'bitter': 'merriweather',
    'exo-2': 'sora',
    'varela-round': 'urbanist',
    'dosis': 'manrope',
    'noticia-text': 'newsreader',
    'titillium-web': 'work-sans',
    'nobile': 'dm-sans',
    'cardo': 'eb-garamond',
    'asap': 'public-sans',
    'questrial': 'inter',
    'dancing-script': 'fraunces',
    'amatic-sc': 'marcellus',
    'slabo-27px': 'newsreader',
};

// Font stacks for CSS font-family property
export const fontStacks: Record<FontFamily, string> = {
    'archivo-narrow': "'Archivo Narrow', sans-serif",
    'barlow-condensed': "'Barlow Condensed', sans-serif",
    biorhyme: "'BioRhyme', serif",
    'bree-serif': "'Bree Serif', serif",
    'bricolage-grotesque': "'Bricolage Grotesque', sans-serif",
    'dm-mono': "'DM Mono', monospace",
    'dm-sans': "'DM Sans', sans-serif",
    'dm-serif-text': "'DM Serif Text', serif",
    'eb-garamond': "'EB Garamond', serif",
    eczar: "'Eczar', serif",
    figtree: "'Figtree', sans-serif",
    'fira-sans': "'Fira Sans', sans-serif",
    fraunces: "'Fraunces', serif",
    'ibm-plex-sans': "'IBM Plex Sans', sans-serif",
    'inknut-antiqua': "'Inknut Antiqua', serif",
    'instrument-sans': "'Instrument Sans', sans-serif",
    'instrument-serif': "'Instrument Serif', serif",
    inter: "'Inter', sans-serif",
    'inter-tight': "'Inter Tight', sans-serif",
    'libre-baskerville': "'Libre Baskerville', serif",
    'libre-franklin': "'Libre Franklin', sans-serif",
    manrope: "'Manrope', sans-serif",
    marcellus: "'Marcellus', serif",
    merriweather: "'Merriweather', serif",
    montserrat: "'Montserrat', sans-serif",
    neuton: "'Neuton', serif",
    newsreader: "'Newsreader', serif",
    'noto-sans-mono': "'Noto Sans Mono', monospace",
    'open-sans': "'Open Sans', sans-serif",
    outfit: "'Outfit', sans-serif",
    'playfair-display': "'Playfair Display', serif",
    poppins: "'Poppins', sans-serif",
    'public-sans': "'Public Sans', sans-serif",
    raleway: "'Raleway', sans-serif",
    'red-hat-display': "'Red Hat Display', sans-serif",
    sora: "'Sora', sans-serif",
    'space-grotesk': "'Space Grotesk', sans-serif",
    'space-mono': "'Space Mono', monospace",
    syne: "'Syne', sans-serif",
    ubuntu: "'Ubuntu', sans-serif",
    unbounded: "'Unbounded', sans-serif",
    urbanist: "'Urbanist', sans-serif",
    'work-sans': "'Work Sans', sans-serif",
};

/**
 * Resolves a font family key — migrates old/removed fonts to new equivalents.
 * Use this EVERYWHERE a font key from Firestore/theme is consumed.
 */
export const resolveFontFamily = (font: string | undefined): FontFamily => {
    if (!font) return 'inter';
    // If font exists in current catalog, use it
    if (font in fontStacks) return font as FontFamily;
    // Try legacy migration
    if (font in legacyFontMigration) return legacyFontMigration[font];
    // Ultimate fallback
    return 'inter';
};

// Mapeo de nombres que NO pueden derivarse con simple capitalización
// Clave = FontFamily key, Valor = nombre exacto en Google Fonts API
const googleFontNameOverrides: Partial<Record<FontFamily, string>> = {
    biorhyme: 'BioRhyme',
    'dm-mono': 'DM Mono',
    'dm-sans': 'DM Sans',
    'dm-serif-text': 'DM Serif Text',
    'eb-garamond': 'EB Garamond',
    'ibm-plex-sans': 'IBM Plex Sans',
    'noto-sans-mono': 'Noto Sans Mono',
    'red-hat-display': 'Red Hat Display',
};

/**
 * Configuración de variantes por fuente — VERIFIED against Google Fonts CSS2 API.
 * Each spec was tested to ensure HTTP 200 from the API.
 * Default for fonts NOT listed: ital,wght@0,100..900;1,100..900
 * (only works for a few variable fonts that support full 100-900 + italic range)
 */
const fontVariantOverrides: Partial<Record<FontFamily, string>> = {
    // === Fonts with FULL ital,wght@0,100..900;1,100..900 support (use default) ===
    // DM Sans, Fraunces, Inter, Inter Tight, Libre Franklin, Montserrat,
    // Outfit (no ital), Public Sans, Raleway, Urbanist, Work Sans

    // === Variable fonts with ital + limited weight ranges ===
    'archivo-narrow': 'ital,wght@0,400..700;1,400..700',
    'barlow-condensed': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'eb-garamond': 'ital,wght@0,400..800;1,400..800',
    'fira-sans': 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'ibm-plex-sans': 'ital,wght@0,100..700;1,100..700',
    'instrument-sans': 'ital,wght@0,400..700;1,400..700',
    merriweather: 'ital,wght@0,300..900;1,300..900',
    newsreader: 'ital,opsz,wght@0,6..72,200..800;1,6..72,200..800',
    'open-sans': 'ital,wght@0,300..800;1,300..800',
    'playfair-display': 'ital,wght@0,400..900;1,400..900',
    poppins: 'ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900',
    'red-hat-display': 'ital,wght@0,300..900;1,300..900',
    ubuntu: 'ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700',
    urbanist: 'ital,wght@0,100..900;1,100..900',

    // === Variable fonts with ital but special axes ===
    fraunces: 'ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',

    // === Variable fonts WITHOUT italics ===
    biorhyme: 'wght@200..800',
    'bricolage-grotesque': 'wght@200..800',
    eczar: 'wght@400..800',
    figtree: 'wght@300..900',
    manrope: 'wght@200..800',
    outfit: 'wght@100..900',
    'public-sans': 'ital,wght@0,100..900;1,100..900',
    sora: 'wght@100..800',
    'space-grotesk': 'wght@300..700',
    syne: 'wght@400..800',
    unbounded: 'wght@200..900',

    // === Static fonts (specific weight values, not ranges) ===
    'bree-serif': 'wght@400',
    'dm-mono': 'ital,wght@0,300;0,400;0,500;1,300;1,400;1,500',
    'dm-serif-text': 'ital@0;1',
    'inknut-antiqua': 'wght@300;400;500;600;700;800;900',
    'instrument-serif': 'ital@0;1',
    'libre-baskerville': 'ital,wght@0,400;0,700;1,400',
    marcellus: 'wght@400',
    neuton: 'ital,wght@0,200;0,300;0,400;0,700;0,800;1,400',
    'noto-sans-mono': 'wght@100..900',
    'space-mono': 'ital,wght@0,400;0,700;1,400;1,700',
};

// Lista de fuentes disponibles (sorted alphabetically)
export const fontOptions: FontFamily[] = [
    'archivo-narrow', 'barlow-condensed', 'biorhyme', 'bree-serif',
    'bricolage-grotesque', 'dm-mono', 'dm-sans', 'dm-serif-text',
    'eb-garamond', 'eczar', 'figtree', 'fira-sans', 'fraunces',
    'ibm-plex-sans', 'inknut-antiqua', 'instrument-sans', 'instrument-serif',
    'inter', 'inter-tight', 'libre-baskerville', 'libre-franklin',
    'manrope', 'marcellus', 'merriweather', 'montserrat', 'neuton',
    'newsreader', 'noto-sans-mono', 'open-sans', 'outfit',
    'playfair-display', 'poppins', 'public-sans', 'raleway',
    'red-hat-display', 'sora', 'space-grotesk', 'space-mono', 'syne',
    'ubuntu', 'unbounded', 'urbanist', 'work-sans'
];

/**
 * Formatea el nombre de una fuente para mostrar en la UI
 * @example formatFontName('open-sans') => 'Open Sans'
 * @example formatFontName('dm-sans') => 'DM Sans'
 */
export const formatFontName = (font: string): string => {
    // Primero verificar overrides para nombres especiales
    const override = googleFontNameOverrides[font as FontFamily];
    if (override) return override;
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Obtiene el nombre exacto para la API de Google Fonts
 * Usa overrides cuando el nombre no se puede derivar automáticamente
 */
const getGoogleFontApiName = (font: FontFamily): string => {
    return googleFontNameOverrides[font] || formatFontName(font);
};

/**
 * Obtiene el font-stack CSS para una fuente
 */
export const getFontStack = (font: FontFamily): string => {
    return fontStacks[font] || "'Inter', sans-serif";
};

/**
 * Obtiene la especificación de variantes para la API de Google Fonts CSS2
 * Default: carga todos los pesos (100-900) con itálicas para fuentes variables
 */
const getFontVariantSpec = (font: FontFamily): string => {
    return fontVariantOverrides[font] || 'ital,wght@0,100..900;1,100..900';
};

/**
 * Genera el URL de Google Fonts para las fuentes seleccionadas
 * Carga TODAS las variantes disponibles (pesos + itálicas)
 */
export const getGoogleFontsUrl = (fonts: FontFamily[]): string => {
    const uniqueFonts = [...new Set(fonts)];
    const families = uniqueFonts.map(font => {
        const fontName = getGoogleFontApiName(font).replace(/\s/g, '+');
        const variantSpec = getFontVariantSpec(font);
        return `family=${fontName}:${variantSpec}`;
    });
    
    return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
};

/**
 * Ensures preconnect hints exist for Google Fonts CDN.
 * Should be called once, before any font loading.
 */
const ensurePreconnect = (): void => {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) {
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);
    }
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect2);
    }
};

/**
 * Injects a <link rel="stylesheet"> for Google Fonts and waits for them to load.
 * 
 * **Best Practice (per Google Fonts CSS2 API + FontFace API docs):**
 * 1. Inject <link> to fetch @font-face CSS from Google CDN
 * 2. Wait for document.fonts.ready to confirm browser has downloaded the font files
 * 3. Return a Promise so callers can trigger re-renders after fonts are available
 * 
 * @param fonts - FontFamily keys to load
 * @param linkId - Unique ID for the <link> element (allows multiple callers)
 * @returns Promise that resolves when fonts are ready for rendering
 */
export const loadGoogleFonts = async (fonts: FontFamily[], linkId: string = 'app-tokens-google-fonts'): Promise<void> => {
    if (typeof document === 'undefined') return;
    if (fonts.length === 0) return;
    
    ensurePreconnect();
    
    const url = getGoogleFontsUrl(fonts);
    const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;
    
    if (existingLink) {
        // If href hasn't changed, fonts are already loaded
        if (existingLink.getAttribute('href') === url) {
            await document.fonts.ready;
            return;
        }
        // Known browser bug: Safari/Chrome sometimes fail to apply new CSS if we just use setAttribute('href').
        // Fix: Remove the old DOM node entirely and insert a fresh one to force re-parsing.
        existingLink.remove();
    }
    
    // Create new link element
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    
    // Wait for the browser to download and parse all font files.
    // document.fonts.ready resolves when all font-face loading is complete.
    await document.fonts.ready;
};

/**
 * Synchronous version of loadGoogleFonts for backward compatibility.
 * Does NOT wait for fonts to finish loading.
 */
export const loadGoogleFontsSync = (fonts: FontFamily[], linkId: string = 'app-tokens-google-fonts'): void => {
    if (typeof document === 'undefined') return;
    if (fonts.length === 0) return;
    
    ensurePreconnect();
    
    const url = getGoogleFontsUrl(fonts);
    const existingLink = document.getElementById(linkId);
    
    if (existingLink) {
        if (existingLink.getAttribute('href') === url) {
            return;
        }
        existingLink.remove();
    }
    
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
};

/**
 * Preload ALL 43 fonts for dropdown preview in editors.
 * Splits into batches to avoid excessively long URLs (browser limit ~2048 chars).
 * Each batch uses a separate <link> element.
 */
export const loadAllFonts = async (): Promise<void> => {
    const BATCH_SIZE = 11;
    const batches: FontFamily[][] = [];
    for (let i = 0; i < fontOptions.length; i += BATCH_SIZE) {
        batches.push(fontOptions.slice(i, i + BATCH_SIZE));
    }
    
    // Load all batches in parallel
    await Promise.all(
        batches.map((batch, idx) => loadGoogleFonts(batch, `editor-all-fonts-preload-${idx}`))
    );
};

/**
 * Elimina las fuentes cargadas dinámicamente
 */
export const unloadGoogleFonts = (): void => {
    if (typeof document === 'undefined') return;
    
    const link = document.getElementById('app-tokens-google-fonts');
    if (link) {
        link.remove();
    }
};
