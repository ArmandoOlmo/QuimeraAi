/**
 * useStorefrontTheme Hook
 * Hook para obtener los colores del tema del storefront desde la configuración de la tienda
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { StorefrontThemeSettings, DEFAULT_STOREFRONT_THEME } from '../../../types/ecommerce';

// Extended theme interface with all storefront properties
export interface StorefrontTheme extends StorefrontThemeSettings {
    currencySymbol: string;
}

const defaultTheme: StorefrontTheme = {
    ...DEFAULT_STOREFRONT_THEME,
    currencySymbol: '$',
};

/**
 * Hook para obtener el tema del storefront desde la configuración pública de la tienda
 * Ahora incluye TODOS los colores del StorefrontThemeSettings
 */
export const useStorefrontTheme = (storeId: string): {
    theme: StorefrontTheme;
    isLoading: boolean;
} => {
    const [theme, setTheme] = useState<StorefrontTheme>(defaultTheme);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!storeId) {
            console.log('[useStorefrontTheme] No storeId provided, using defaults');
            setIsLoading(false);
            return;
        }

        console.log(`[useStorefrontTheme] Loading theme for store: ${storeId}`);

        const unsubscribe = onSnapshot(
            doc(db, 'publicStores', storeId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const storefrontTheme = data.storefrontTheme || {};
                    
                    console.log(`[useStorefrontTheme] Theme loaded for ${storeId}:`, {
                        hasStorefrontTheme: !!data.storefrontTheme,
                        primaryColor: storefrontTheme.primaryColor,
                        hasThemeObject: !!data.theme,
                    });
                    
                    // Merge all theme properties from storefrontTheme with defaults
                    setTheme({
                        // Core Colors
                        primaryColor: storefrontTheme.primaryColor || data.theme?.primaryColor || defaultTheme.primaryColor,
                        secondaryColor: storefrontTheme.secondaryColor || data.theme?.secondaryColor || defaultTheme.secondaryColor,
                        accentColor: storefrontTheme.accentColor || data.theme?.accentColor || defaultTheme.accentColor,
                        
                        // Background Colors
                        backgroundColor: storefrontTheme.backgroundColor || data.theme?.backgroundColor || defaultTheme.backgroundColor,
                        cardBackground: storefrontTheme.cardBackground || defaultTheme.cardBackground,
                        headerBackground: storefrontTheme.headerBackground || defaultTheme.headerBackground,
                        footerBackground: storefrontTheme.footerBackground || defaultTheme.footerBackground,
                        
                        // Text Colors
                        textColor: storefrontTheme.textColor || data.theme?.textColor || defaultTheme.textColor,
                        headingColor: storefrontTheme.headingColor || data.theme?.headingColor || defaultTheme.headingColor,
                        mutedTextColor: storefrontTheme.mutedTextColor || defaultTheme.mutedTextColor,
                        linkColor: storefrontTheme.linkColor || defaultTheme.linkColor,
                        
                        // Button Colors
                        buttonBackground: storefrontTheme.buttonBackground || defaultTheme.buttonBackground,
                        buttonText: storefrontTheme.buttonText || defaultTheme.buttonText,
                        buttonSecondaryBackground: storefrontTheme.buttonSecondaryBackground || defaultTheme.buttonSecondaryBackground,
                        buttonSecondaryText: storefrontTheme.buttonSecondaryText || defaultTheme.buttonSecondaryText,
                        buttonHoverBackground: storefrontTheme.buttonHoverBackground || defaultTheme.buttonHoverBackground,
                        
                        // Badge Colors
                        badgeBackground: storefrontTheme.badgeBackground || defaultTheme.badgeBackground,
                        badgeText: storefrontTheme.badgeText || defaultTheme.badgeText,
                        saleBadgeBackground: storefrontTheme.saleBadgeBackground || defaultTheme.saleBadgeBackground,
                        saleBadgeText: storefrontTheme.saleBadgeText || defaultTheme.saleBadgeText,
                        
                        // Price Colors
                        priceColor: storefrontTheme.priceColor || defaultTheme.priceColor,
                        salePriceColor: storefrontTheme.salePriceColor || defaultTheme.salePriceColor,
                        originalPriceColor: storefrontTheme.originalPriceColor || defaultTheme.originalPriceColor,
                        
                        // Overlay Colors
                        overlayStart: storefrontTheme.overlayStart || defaultTheme.overlayStart,
                        overlayEnd: storefrontTheme.overlayEnd || defaultTheme.overlayEnd,
                        
                        // Border Colors
                        borderColor: storefrontTheme.borderColor || defaultTheme.borderColor,
                        dividerColor: storefrontTheme.dividerColor || defaultTheme.dividerColor,
                        inputBorderColor: storefrontTheme.inputBorderColor || defaultTheme.inputBorderColor,
                        
                        // State Colors
                        successColor: storefrontTheme.successColor || defaultTheme.successColor,
                        warningColor: storefrontTheme.warningColor || defaultTheme.warningColor,
                        errorColor: storefrontTheme.errorColor || defaultTheme.errorColor,
                        infoColor: storefrontTheme.infoColor || defaultTheme.infoColor,
                        
                        // Cart & Checkout
                        cartBadgeBackground: storefrontTheme.cartBadgeBackground || defaultTheme.cartBadgeBackground,
                        cartBadgeText: storefrontTheme.cartBadgeText || defaultTheme.cartBadgeText,
                        checkoutAccent: storefrontTheme.checkoutAccent || defaultTheme.checkoutAccent,
                        
                        // Typography
                        fontFamily: storefrontTheme.fontFamily || data.theme?.fontFamily || defaultTheme.fontFamily,
                        headingFontFamily: storefrontTheme.headingFontFamily || defaultTheme.headingFontFamily,
                        
                        // Coolors
                        coolorsUrl: storefrontTheme.coolorsUrl,
                        coolorsColors: storefrontTheme.coolorsColors,
                        
                        // Currency
                        currencySymbol: data.currencySymbol || defaultTheme.currencySymbol,
                    });
                } else {
                    console.log(`[useStorefrontTheme] No document found for store ${storeId}, using defaults`);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error('[useStorefrontTheme] Error loading storefront theme:', error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [storeId]);

    return { theme, isLoading };
};

/**
 * Hook para usar con Design Tokens de la aplicación
 * Convierte los tokens globales a formato de storefront
 */
export const useDesignTokensAsStorefront = (): StorefrontTheme => {
    // Import dinamically to avoid circular dependencies
    const { useSafeDesignTokens } = require('../../../hooks/useDesignTokens');
    const { colors } = useSafeDesignTokens();

    return {
        // Core Colors
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        accentColor: colors.warning || '#f59e0b',
        
        // Background Colors
        backgroundColor: '#ffffff',
        cardBackground: '#f8fafc',
        headerBackground: '#ffffff',
        footerBackground: '#1f2937',
        
        // Text Colors
        textColor: '#374151',
        headingColor: '#111827',
        mutedTextColor: '#6b7280',
        linkColor: colors.primary,
        
        // Button Colors
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
        buttonSecondaryBackground: '#f3f4f6',
        buttonSecondaryText: '#374151',
        buttonHoverBackground: colors.primary,
        
        // Badge Colors
        badgeBackground: colors.primary,
        badgeText: '#ffffff',
        saleBadgeBackground: '#ef4444',
        saleBadgeText: '#ffffff',
        
        // Price Colors
        priceColor: '#111827',
        salePriceColor: '#ef4444',
        originalPriceColor: '#9ca3af',
        
        // Overlay Colors
        overlayStart: 'transparent',
        overlayEnd: 'rgba(0, 0, 0, 0.7)',
        
        // Border Colors
        borderColor: '#e5e7eb',
        dividerColor: '#f3f4f6',
        inputBorderColor: '#d1d5db',
        
        // State Colors
        successColor: '#10b981',
        warningColor: '#f59e0b',
        errorColor: '#ef4444',
        infoColor: '#3b82f6',
        
        // Cart & Checkout
        cartBadgeBackground: '#ef4444',
        cartBadgeText: '#ffffff',
        checkoutAccent: colors.primary,
        
        // Typography
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFontFamily: 'Inter, system-ui, sans-serif',
        
        // Currency
        currencySymbol: '$',
    };
};

export default useStorefrontTheme;



