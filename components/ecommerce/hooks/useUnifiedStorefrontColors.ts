/**
 * useUnifiedStorefrontColors Hook
 * Sistema unificado de colores para componentes de ecommerce
 * 
 * PRIORIDAD DE COLORES (simplificado):
 * 1. Colores de componente (data.colors del Web Editor) - ÚNICA FUENTE
 * 2. Colores por defecto (DEFAULT_STOREFRONT_THEME) - Fallback
 * 
 * Los colores se configuran ÚNICAMENTE en el Web Editor (GlobalStylesControl).
 * Al seleccionar una paleta o importar de Coolors, los colores se propagan
 * a todos los componentes de ecommerce via generateComponentColorMappings.
 */

import { useMemo } from 'react';
import { DEFAULT_STOREFRONT_THEME } from '../../../types/ecommerce';

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
    
    // Overlays
    overlayStart: string;
    overlayEnd: string;
    
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
    
    // Typography
    fontFamily: string;
    headingFontFamily: string;
}

/**
 * Hook principal para obtener colores unificados
 * 
 * PRIORIDAD SIMPLIFICADA:
 * 1. componentColors (del Web Editor - data.colors) - ÚNICA FUENTE
 * 2. DEFAULT_STOREFRONT_THEME - fallback
 * 
 * @param _storeId - ID de la tienda (mantenido por compatibilidad, no se usa)
 * @param componentColors - Colores del componente desde el Web Editor (data.colors)
 * @returns UnifiedColors - Objeto con todos los colores unificados
 * 
 * @example
 * // En un componente de ecommerce:
 * const colors = useUnifiedStorefrontColors(storeId, data.colors);
 * 
 * // Usar los colores:
 * <div style={{ backgroundColor: colors.background }}>
 *   <h1 style={{ color: colors.heading }}>Título</h1>
 * </div>
 */
export const useUnifiedStorefrontColors = (
    _storeId: string,
    componentColors?: ComponentColors
): UnifiedColors => {
    return useMemo(() => {
        const c = componentColors || {};
        const d = DEFAULT_STOREFRONT_THEME;

        // Prioridad: componentColors > defaults
        return {
            // Backgrounds
            background: c.background || d.backgroundColor,
            cardBackground: c.cardBackground || d.cardBackground,
            headerBackground: d.headerBackground,
            footerBackground: d.footerBackground,

            // Text
            heading: c.heading || d.headingColor,
            text: c.text || d.textColor,
            mutedText: d.mutedTextColor,
            cardText: c.cardText || c.heading || d.headingColor,
            link: d.linkColor,

            // Accent & Primary
            primary: c.accent || d.primaryColor,
            secondary: d.secondaryColor,
            accent: c.accent || d.accentColor,

            // Buttons
            buttonBackground: c.buttonBackground || d.buttonBackground,
            buttonText: c.buttonText || d.buttonText,
            buttonSecondaryBackground: d.buttonSecondaryBackground,
            buttonSecondaryText: d.buttonSecondaryText,
            buttonHover: d.buttonHoverBackground,

            // Badges
            badgeBackground: c.badgeBackground || d.badgeBackground,
            badgeText: c.badgeText || d.badgeText,
            saleBadgeBackground: d.saleBadgeBackground,
            saleBadgeText: d.saleBadgeText,

            // Prices
            price: c.priceColor || d.priceColor,
            salePrice: c.salePriceColor || d.salePriceColor,
            originalPrice: c.originalPriceColor || d.originalPriceColor,

            // Overlays
            overlayStart: c.overlayStart || d.overlayStart,
            overlayEnd: c.overlayEnd || d.overlayEnd,

            // Borders
            border: c.borderColor || d.borderColor,
            divider: d.dividerColor,
            inputBorder: d.inputBorderColor,

            // States
            success: d.successColor,
            warning: d.warningColor,
            error: d.errorColor,
            info: d.infoColor,

            // Cart
            cartBadgeBackground: d.cartBadgeBackground,
            cartBadgeText: d.cartBadgeText,
            checkoutAccent: d.checkoutAccent,

            // Typography
            fontFamily: d.fontFamily,
            headingFontFamily: d.headingFontFamily,
        };
    }, [componentColors]);
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
