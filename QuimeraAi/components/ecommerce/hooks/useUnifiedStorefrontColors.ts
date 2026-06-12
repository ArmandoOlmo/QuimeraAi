/**
 * useUnifiedStorefrontColors Hook
 * Sistema unificado de colores para componentes de ecommerce
 * 
 * PRIORIDAD DE COLORES:
 * 1. Colores de componente (data.colors del Web Editor)
 * 2. Paleta global del proyecto (theme.globalColors)
 * 3. Colores por defecto (DEFAULT_STOREFRONT_THEME)
 */

import { useMemo } from 'react';
import { useSafeProject } from '../../../contexts/project';
import { DEFAULT_STOREFRONT_THEME } from '../../../types/ecommerce';
import type { GlobalColors } from '../../../types/ui';

/**
 * Interface para colores de componente
 * Estos colores vienen del Web Editor (data.colors) y tienen máxima prioridad
 */
export interface ComponentColors {
    background?: string;
    heading?: string;
    text?: string;
    accent?: string;
    cardBackground?: string;
    cardText?: string;
    buttonBackground?: string;
    buttonText?: string;
    badgeBackground?: string;
    badgeText?: string;
    // Overlay colors para CategoryGrid y similares
    overlayStart?: string;
    overlayEnd?: string;
    overlayColor?: string;
    // Price colors
    priceColor?: string;
    salePriceColor?: string;
    originalPriceColor?: string;
    savingsColor?: string;
    // Icon colors
    iconColor?: string;
    // Border colors
    borderColor?: string;
    // Link colors
    linkColor?: string;
    // Countdown colors (SaleCountdown)
    countdownBackground?: string;
    countdownText?: string;
    // Star/Review colors
    starColor?: string;
    verifiedBadgeColor?: string;
}

/**
 * Interface unificada de colores que devuelve el hook
 */
export interface UnifiedColors {
    // Backgrounds
    background: string;
    cardBackground: string;
    headerBackground: string;
    footerBackground: string;
    
    // Text
    heading: string;
    text: string;
    mutedText: string;
    cardText: string;
    link: string;
    icon: string;
    
    // Accent & Primary
    primary: string;
    secondary: string;
    accent: string;
    
    // Buttons
    buttonBackground: string;
    buttonText: string;
    buttonSecondaryBackground: string;
    buttonSecondaryText: string;
    buttonHover: string;
    
    // Badges
    badgeBackground: string;
    badgeText: string;
    saleBadgeBackground: string;
    saleBadgeText: string;
    
    // Prices
    price: string;
    salePrice: string;
    originalPrice: string;
    priceColor: string;
    salePriceColor: string;
    originalPriceColor: string;
    
    // Overlays
    overlayStart: string;
    overlayEnd: string;
    overlayColor: string;
    
    // Borders
    border: string;
    divider: string;
    inputBorder: string;
    
    // States
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Cart
    cartBadgeBackground: string;
    cartBadgeText: string;
    checkoutAccent: string;
    
    // Reviews, countdown and explicit aliases
    starColor: string;
    verifiedBadgeColor: string;
    savingsColor: string;
    countdownBackground: string;
    countdownText: string;
    iconColor: string;
    borderColor: string;

    // Typography
    fontFamily: string;
    headingFontFamily: string;
}

export type StorefrontGlobalColors = Partial<GlobalColors> | Record<string, string> | undefined;

const getContrastText = (background?: string, light = '#ffffff', dark = '#111827'): string => {
    if (!background || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(background)) return light;

    const hex = background.length === 4
        ? background.slice(1).split('').map(char => char + char).join('')
        : background.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.58 ? dark : light;
};

const withAlpha = (color: string | undefined, alpha: number, fallback: string): string => {
    if (!color) return fallback;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color;

    const hex = color.length === 4
        ? color.slice(1).split('').map(char => char + char).join('')
        : color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Hook principal para obtener colores unificados
 * 
 * PRIORIDAD:
 * 1. componentColors (del Web Editor - data.colors)
 * 2. globalColors (theme.globalColors del proyecto)
 * 3. DEFAULT_STOREFRONT_THEME - fallback
 * 
 * @param _storeId - ID de la tienda (mantenido por compatibilidad, no se usa)
 * @param componentColors - Colores del componente desde el Web Editor (data.colors)
 * @returns UnifiedColors - Objeto con todos los colores unificados
 * 
 * @example
 * // En un componente de ecommerce:
 * const colors = useUnifiedStorefrontColors(storeId, data.colors, theme.globalColors);
 * 
 * // Usar los colores:
 * <div style={{ backgroundColor: colors.background }}>
 *   <h1 style={{ color: colors.heading }}>Título</h1>
 * </div>
 */
export const useUnifiedStorefrontColors = (
    _storeId: string,
    componentColors?: ComponentColors,
    globalColors?: StorefrontGlobalColors
): UnifiedColors => {
    const projectContext = useSafeProject();

    return useMemo(() => {
        const c = componentColors || {};
        const g = globalColors
            || projectContext?.theme?.globalColors
            || projectContext?.activeProject?.theme?.globalColors
            || {};
        const d = DEFAULT_STOREFRONT_THEME;
        const primary = g.primary || d.primaryColor;
        const secondary = g.secondary || d.secondaryColor;
        const accent = g.accent || primary || d.accentColor;
        const background = g.background || d.backgroundColor;
        const surface = g.surface || d.cardBackground;
        const heading = g.heading || g.text || d.headingColor;
        const text = g.text || d.textColor;
        const mutedText = g.textMuted || d.mutedTextColor;
        const border = g.border || d.borderColor;
        const success = g.success || d.successColor;
        const error = g.error || d.errorColor;
        const buttonText = getContrastText(primary, d.buttonText, d.buttonSecondaryText);
        const errorText = getContrastText(error, d.saleBadgeText, d.buttonSecondaryText);

        // Prioridad: componentColors > globalColors > defaults
        const priceColor = c.priceColor || heading || d.priceColor;
        const salePriceColor = c.salePriceColor || error || d.salePriceColor;
        const originalPriceColor = c.originalPriceColor || d.originalPriceColor;

        return {
            // Backgrounds
            background: c.background || background,
            cardBackground: c.cardBackground || surface,
            headerBackground: primary || d.headerBackground,
            footerBackground: surface || d.footerBackground,

            // Text
            heading: c.heading || heading,
            text: c.text || text,
            mutedText,
            cardText: c.cardText || c.heading || heading,
            link: c.linkColor || primary || d.linkColor,
            icon: c.iconColor || accent,

            // Accent & Primary
            primary: c.accent || primary,
            secondary,
            accent: c.accent || accent,

            // Buttons
            buttonBackground: c.buttonBackground || primary || d.buttonBackground,
            buttonText: c.buttonText || buttonText,
            buttonSecondaryBackground: surface || d.buttonSecondaryBackground,
            buttonSecondaryText: heading || d.buttonSecondaryText,
            buttonHover: secondary || d.buttonHoverBackground,

            // Badges
            badgeBackground: c.badgeBackground || primary || d.badgeBackground,
            badgeText: c.badgeText || buttonText,
            saleBadgeBackground: error || d.saleBadgeBackground,
            saleBadgeText: errorText,

            // Prices
            price: priceColor,
            salePrice: salePriceColor,
            originalPrice: originalPriceColor,
            priceColor,
            salePriceColor,
            originalPriceColor,

            // Overlays
            overlayStart: c.overlayStart || d.overlayStart,
            overlayEnd: c.overlayEnd || withAlpha(background, 0.7, d.overlayEnd),
            overlayColor: c.overlayColor || background,

            // Borders
            border: c.borderColor || border,
            divider: border || d.dividerColor,
            inputBorder: border || d.inputBorderColor,

            // States
            success,
            warning: g.warning || d.warningColor,
            error,
            info: g.info || d.infoColor,

            // Cart
            cartBadgeBackground: error || d.cartBadgeBackground,
            cartBadgeText: errorText || d.cartBadgeText,
            checkoutAccent: primary || d.checkoutAccent,

            // Reviews, countdown and explicit aliases
            starColor: c.starColor || g.warning || d.warningColor,
            verifiedBadgeColor: c.verifiedBadgeColor || success,
            savingsColor: c.savingsColor || success,
            countdownBackground: c.countdownBackground || background,
            countdownText: c.countdownText || heading,
            iconColor: c.iconColor || accent,
            borderColor: c.borderColor || border,

            // Typography
            fontFamily: d.fontFamily,
            headingFontFamily: d.headingFontFamily,
        };
    }, [componentColors, globalColors, projectContext?.theme?.globalColors, projectContext?.activeProject?.theme?.globalColors]);
};

/**
 * Hook simplificado que solo devuelve el tema global sin override
 * Útil para componentes que no tienen colores configurables (como CartDrawer)
 */
export const useGlobalStorefrontColors = (storeId: string): UnifiedColors => {
    return useUnifiedStorefrontColors(storeId, undefined);
};

/**
 * Función helper para generar CSS variables a partir de los colores
 */
export const getColorsCSSVariables = (colors: UnifiedColors): Record<string, string> => {
    return {
        '--storefront-background': colors.background,
        '--storefront-card-bg': colors.cardBackground,
        '--storefront-heading': colors.heading,
        '--storefront-text': colors.text,
        '--storefront-muted': colors.mutedText,
        '--storefront-primary': colors.primary,
        '--storefront-secondary': colors.secondary,
        '--storefront-accent': colors.accent,
        '--storefront-button-bg': colors.buttonBackground,
        '--storefront-button-text': colors.buttonText,
        '--storefront-badge-bg': colors.badgeBackground,
        '--storefront-badge-text': colors.badgeText,
        '--storefront-price': colors.price,
        '--storefront-sale-price': colors.salePrice,
        '--storefront-border': colors.border,
        '--storefront-success': colors.success,
        '--storefront-warning': colors.warning,
        '--storefront-error': colors.error,
    };
};

export default useUnifiedStorefrontColors;
