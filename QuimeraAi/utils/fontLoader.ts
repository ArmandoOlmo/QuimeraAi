/**
 * Font Loader Utility
 * Carga dinámicamente fuentes de Google Fonts para la aplicación
 */

import { FontFamily } from '../types';

// Font stacks for CSS font-family property
export const fontStacks: Record<FontFamily, string> = {
    roboto: "'Roboto', sans-serif",
    'open-sans': "'Open Sans', sans-serif",
    lato: "'Lato', sans-serif",
    'slabo-27px': "'Slabo 27px', serif",
    oswald: "'Oswald', sans-serif",
    'source-sans-pro': "'Source Sans Pro', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    raleway: "'Raleway', sans-serif",
    'pt-sans': "'PT Sans', sans-serif",
    merriweather: "'Merriweather', serif",
    lora: "'Lora', serif",
    ubuntu: "'Ubuntu', sans-serif",
    'playfair-display': "'Playfair Display', serif",
    'crimson-text': "'Crimson Text', serif",
    poppins: "'Poppins', sans-serif",
    arvo: "'Arvo', serif",
    mulish: "'Mulish', sans-serif",
    'noto-sans': "'Noto Sans', sans-serif",
    'noto-serif': "'Noto Serif', serif",
    inconsolata: "'Inconsolata', monospace",
    'indie-flower': "'Indie Flower', cursive",
    cabin: "'Cabin', sans-serif",
    'fira-sans': "'Fira Sans', sans-serif",
    pacifico: "'Pacifico', cursive",
    'josefin-sans': "'Josefin Sans', sans-serif",
    anton: "'Anton', sans-serif",
    'yanone-kaffeesatz': "'Yanone Kaffeesatz', sans-serif",
    arimo: "'Arimo', sans-serif",
    lobster: "'Lobster', cursive",
    'bree-serif': "'Bree Serif', serif",
    vollkorn: "'Vollkorn', serif",
    abel: "'Abel', sans-serif",
    'archivo-narrow': "'Archivo Narrow', sans-serif",
    'francois-one': "'Francois One', sans-serif",
    signika: "'Signika', sans-serif",
    oxygen: "'Oxygen', sans-serif",
    quicksand: "'Quicksand', sans-serif",
    'pt-serif': "'PT Serif', serif",
    bitter: "'Bitter', serif",
    'exo-2': "'Exo 2', sans-serif",
    'varela-round': "'Varela Round', sans-serif",
    dosis: "'Dosis', sans-serif",
    'noticia-text': "'Noticia Text', serif",
    'titillium-web': "'Titillium Web', sans-serif",
    nobile: "'Nobile', sans-serif",
    cardo: "'Cardo', serif",
    asap: "'Asap', sans-serif",
    questrial: "'Questrial', sans-serif",
    'dancing-script': "'Dancing Script', cursive",
    'amatic-sc': "'Amatic SC', cursive",
};

// Lista de fuentes disponibles
export const fontOptions: FontFamily[] = [
    'roboto', 'open-sans', 'lato', 'slabo-27px', 'oswald', 'source-sans-pro',
    'montserrat', 'raleway', 'pt-sans', 'merriweather', 'lora', 'ubuntu',
    'playfair-display', 'crimson-text', 'poppins', 'arvo', 'mulish',
    'noto-sans', 'noto-serif', 'inconsolata', 'indie-flower', 'cabin',
    'fira-sans', 'pacifico', 'josefin-sans', 'anton', 'yanone-kaffeesatz',
    'arimo', 'lobster', 'bree-serif', 'vollkorn', 'abel', 'archivo-narrow',
    'francois-one', 'signika', 'oxygen', 'quicksand', 'pt-serif', 'bitter',
    'exo-2', 'varela-round', 'dosis', 'noticia-text', 'titillium-web',
    'nobile', 'cardo', 'asap', 'questrial', 'dancing-script', 'amatic-sc'
];

/**
 * Formatea el nombre de una fuente para mostrar
 * @example formatFontName('open-sans') => 'Open Sans'
 */
export const formatFontName = (font: string): string => {
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Obtiene el font-stack CSS para una fuente
 */
export const getFontStack = (font: FontFamily): string => {
    return fontStacks[font] || "'Poppins', sans-serif";
};

/**
 * Genera el URL de Google Fonts para las fuentes seleccionadas
 */
export const getGoogleFontsUrl = (fonts: FontFamily[]): string => {
    const uniqueFonts = [...new Set(fonts)];
    const families = uniqueFonts.map(font => {
        const fontName = formatFontName(font).replace(/\s/g, '+');
        return `family=${fontName}:wght@300;400;500;600;700`;
    });
    
    return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
};

/**
 * Carga las fuentes de Google Fonts dinámicamente
 * Inyecta un <link> en el <head> del documento
 */
export const loadGoogleFonts = (fonts: FontFamily[]): void => {
    if (typeof document === 'undefined') return; // SSR check
    
    const linkId = 'app-tokens-google-fonts';
    const existingLink = document.getElementById(linkId);
    
    // Si ya existe, actualizarlo
    if (existingLink) {
        existingLink.setAttribute('href', getGoogleFontsUrl(fonts));
        return;
    }
    
    // Crear nuevo link
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = getGoogleFontsUrl(fonts);
    
    // Agregar preconnect para mejor rendimiento
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    
    // Insertar en el head si no existen
    if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
        document.head.appendChild(preconnect1);
    }
    if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
        document.head.appendChild(preconnect2);
    }
    
    document.head.appendChild(link);
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






