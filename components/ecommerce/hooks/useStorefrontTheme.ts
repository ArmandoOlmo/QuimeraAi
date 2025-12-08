/**
 * useStorefrontTheme Hook
 * Hook para obtener los colores del tema del storefront desde la configuración de la tienda
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

export interface StorefrontTheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    headingColor: string;
    currencySymbol: string;
    fontFamily: string;
}

const defaultTheme: StorefrontTheme = {
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#374151',
    headingColor: '#111827',
    currencySymbol: '$',
    fontFamily: 'Inter, system-ui, sans-serif',
};

/**
 * Hook para obtener el tema del storefront desde la configuración pública de la tienda
 */
export const useStorefrontTheme = (storeId: string): {
    theme: StorefrontTheme;
    isLoading: boolean;
} => {
    const [theme, setTheme] = useState<StorefrontTheme>(defaultTheme);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, 'publicStores', storeId),
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    setTheme({
                        primaryColor: data.theme?.primaryColor || defaultTheme.primaryColor,
                        secondaryColor: data.theme?.secondaryColor || defaultTheme.secondaryColor,
                        accentColor: data.theme?.accentColor || defaultTheme.accentColor,
                        backgroundColor: data.theme?.backgroundColor || defaultTheme.backgroundColor,
                        textColor: data.theme?.textColor || defaultTheme.textColor,
                        headingColor: data.theme?.headingColor || defaultTheme.headingColor,
                        currencySymbol: data.currencySymbol || defaultTheme.currencySymbol,
                        fontFamily: data.theme?.fontFamily || defaultTheme.fontFamily,
                    });
                }
                setIsLoading(false);
            },
            (error) => {
                console.error('Error loading storefront theme:', error);
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
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        accentColor: colors.warning,
        backgroundColor: '#ffffff',
        textColor: '#374151',
        headingColor: '#111827',
        currencySymbol: '$',
        fontFamily: 'Inter, system-ui, sans-serif',
    };
};

export default useStorefrontTheme;



