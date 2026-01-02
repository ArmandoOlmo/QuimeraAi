/**
 * App Token Applier Utility
 * Aplica los App Tokens a las variables CSS del documento
 */

import { AppTokens, AppTypography, ThemeMode, FontFamily } from '../types';
import { fontStacks, loadGoogleFonts } from './fontLoader';

/**
 * Valores por defecto de App Tokens
 */
export const defaultAppTokens: AppTokens = {
    colors: {
        light: {
            background: '#F3F4F6',
            panelBackground: '#FFFFFF',
            border: '#E5E7EB',
            accent: '#FBB92B',
            textPrimary: '#111827',
            textSecondary: '#6B7280',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
        },
        dark: {
            background: '#251535',
            panelBackground: '#3A2951',
            border: '#584275',
            accent: '#FBB92B',
            textPrimary: '#FAFAFA',
            textSecondary: '#C4BBD0',
            success: '#34d399',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#60a5fa',
        },
        black: {
            background: '#000000',
            panelBackground: '#0F0F0F',
            border: '#333333',
            accent: '#FBB92B',
            textPrimary: '#FFFFFF',
            textSecondary: '#B3B3B3',
            success: '#34d399',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#60a5fa',
        },
    },
    typography: {
        fontFamily: {
            sans: 'ubuntu',
            header: 'poppins',
            mono: 'inconsolata',
        },
        fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
        },
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeight: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
    },
    borders: {
        radius: {
            none: '0',
            sm: '0.125rem',
            md: '0.375rem',
            lg: '0.5rem',
            xl: '0.75rem',
            '2xl': '1rem',
            full: '9999px',
        },
        width: {
            none: '0',
            thin: '1px',
            medium: '2px',
            thick: '4px',
        },
    },
    spacing: {
        none: '0',
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
    },
    shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
};

/**
 * Aplica los colores del tema a las variables CSS
 */
const applyColorTokens = (tokens: AppTokens, mode: ThemeMode): void => {
    const root = document.documentElement;
    const colors = tokens.colors[mode];
    
    root.style.setProperty('--editor-bg', colors.background);
    root.style.setProperty('--editor-panel-bg', colors.panelBackground);
    root.style.setProperty('--editor-border', colors.border);
    root.style.setProperty('--editor-accent', colors.accent);
    root.style.setProperty('--editor-text-primary', colors.textPrimary);
    root.style.setProperty('--editor-text-secondary', colors.textSecondary);
    
    // Colores semánticos para la app
    root.style.setProperty('--app-success', colors.success);
    root.style.setProperty('--app-warning', colors.warning);
    root.style.setProperty('--app-error', colors.error);
    root.style.setProperty('--app-info', colors.info);
};

/**
 * Aplica los tokens de tipografía a las variables CSS
 */
const applyTypographyTokens = (typography: AppTypography): void => {
    const root = document.documentElement;
    
    // Font families
    const sansFontStack = fontStacks[typography.fontFamily.sans as FontFamily] || fontStacks.ubuntu;
    const headerFontStack = fontStacks[typography.fontFamily.header as FontFamily] || fontStacks.poppins;
    const monoFontStack = fontStacks[typography.fontFamily.mono as FontFamily] || fontStacks.inconsolata;
    
    root.style.setProperty('--font-sans', sansFontStack);
    root.style.setProperty('--font-header', headerFontStack);
    root.style.setProperty('--font-mono', monoFontStack);
    
    // Cargar las fuentes de Google
    loadGoogleFonts([
        typography.fontFamily.sans as FontFamily,
        typography.fontFamily.header as FontFamily,
        typography.fontFamily.mono as FontFamily,
    ]);
    
    // Font sizes
    Object.entries(typography.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--app-font-size-${key}`, value);
    });
    
    // Font weights
    Object.entries(typography.fontWeight).forEach(([key, value]) => {
        root.style.setProperty(`--app-font-weight-${key}`, value.toString());
    });
    
    // Line heights
    Object.entries(typography.lineHeight).forEach(([key, value]) => {
        root.style.setProperty(`--app-line-height-${key}`, value.toString());
    });
};

/**
 * Aplica los tokens de bordes a las variables CSS
 */
const applyBorderTokens = (tokens: AppTokens): void => {
    const root = document.documentElement;
    
    // Border radius
    Object.entries(tokens.borders.radius).forEach(([key, value]) => {
        root.style.setProperty(`--app-radius-${key}`, value);
    });
    
    // Actualizar el radius por defecto de Tailwind
    root.style.setProperty('--radius', tokens.borders.radius.md);
    root.style.setProperty('--radius-sm', tokens.borders.radius.sm);
    root.style.setProperty('--radius-lg', tokens.borders.radius.lg);
    
    // Border widths
    Object.entries(tokens.borders.width).forEach(([key, value]) => {
        root.style.setProperty(`--app-border-${key}`, value);
    });
};

/**
 * Aplica los tokens de espaciado a las variables CSS
 */
const applySpacingTokens = (tokens: AppTokens): void => {
    const root = document.documentElement;
    
    Object.entries(tokens.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--app-spacing-${key}`, value);
    });
};

/**
 * Aplica los tokens de sombras a las variables CSS
 */
const applyShadowTokens = (tokens: AppTokens): void => {
    const root = document.documentElement;
    
    Object.entries(tokens.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--app-shadow-${key}`, value);
    });
};

/**
 * Aplica todos los App Tokens a las variables CSS del documento
 * @param tokens - Los App Tokens a aplicar
 * @param mode - El modo de tema actual (light/dark/black)
 */
export const applyAppTokensToCSS = (tokens: AppTokens | null, mode: ThemeMode): void => {
    if (typeof document === 'undefined') return; // SSR check
    
    const tokensToApply = tokens || defaultAppTokens;
    
    applyColorTokens(tokensToApply, mode);
    applyTypographyTokens(tokensToApply.typography);
    applyBorderTokens(tokensToApply);
    applySpacingTokens(tokensToApply);
    applyShadowTokens(tokensToApply);
};

/**
 * Obtiene los App Tokens con valores por defecto para propiedades faltantes
 */
export const getAppTokensWithDefaults = (tokens: Partial<AppTokens> | null): AppTokens => {
    if (!tokens) return defaultAppTokens;
    
    return {
        colors: {
            light: { ...defaultAppTokens.colors.light, ...tokens.colors?.light },
            dark: { ...defaultAppTokens.colors.dark, ...tokens.colors?.dark },
            black: { ...defaultAppTokens.colors.black, ...tokens.colors?.black },
        },
        typography: {
            fontFamily: { ...defaultAppTokens.typography.fontFamily, ...tokens.typography?.fontFamily },
            fontSize: { ...defaultAppTokens.typography.fontSize, ...tokens.typography?.fontSize },
            fontWeight: { ...defaultAppTokens.typography.fontWeight, ...tokens.typography?.fontWeight },
            lineHeight: { ...defaultAppTokens.typography.lineHeight, ...tokens.typography?.lineHeight },
        },
        borders: {
            radius: { ...defaultAppTokens.borders.radius, ...tokens.borders?.radius },
            width: { ...defaultAppTokens.borders.width, ...tokens.borders?.width },
        },
        spacing: { ...defaultAppTokens.spacing, ...tokens.spacing },
        shadows: { ...defaultAppTokens.shadows, ...tokens.shadows },
    };
};






