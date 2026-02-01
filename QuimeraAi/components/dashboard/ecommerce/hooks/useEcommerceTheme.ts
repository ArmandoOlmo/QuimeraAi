/**
 * useEcommerceTheme Hook
 * Proporciona acceso a los colores del tema para componentes de ecommerce
 * Usa los Design Tokens de la aplicación con fallbacks seguros
 */

import { useMemo } from 'react';
import { useSafeDesignTokens } from '../../../../hooks/useDesignTokens';

export interface EcommerceTheme {
    // Colores principales
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    
    // Colores de estado
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Colores neutros
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
    neutral900: string;
    
    // Helpers para estilos inline
    primaryBg: string;
    primaryBgLight: string;
    primaryText: string;
    primaryBorder: string;
    
    // CSS Variables para uso en className
    cssVars: Record<string, string>;
}

/**
 * Hook que proporciona los colores del tema para ecommerce
 * Sincronizado con los Design Tokens globales de la aplicación
 */
export const useEcommerceTheme = (): EcommerceTheme => {
    const { colors, getColor } = useSafeDesignTokens();
    
    return useMemo(() => {
        const primary = colors.primary;
        const primaryLight = colors.primaryLight;
        const primaryDark = colors.primaryDark;
        const secondary = colors.secondary;
        const secondaryLight = colors.secondaryLight;
        const secondaryDark = colors.secondaryDark;
        
        return {
            // Colores principales
            primary,
            primaryLight,
            primaryDark,
            secondary,
            secondaryLight,
            secondaryDark,
            
            // Colores de estado
            success: colors.success,
            warning: colors.warning,
            error: colors.error,
            info: colors.info,
            
            // Colores neutros
            neutral50: getColor('neutral.50', '#fafafa'),
            neutral100: getColor('neutral.100', '#f5f5f5'),
            neutral200: getColor('neutral.200', '#e5e5e5'),
            neutral300: getColor('neutral.300', '#d4d4d4'),
            neutral400: getColor('neutral.400', '#a3a3a3'),
            neutral500: getColor('neutral.500', '#737373'),
            neutral600: getColor('neutral.600', '#525252'),
            neutral700: getColor('neutral.700', '#404040'),
            neutral800: getColor('neutral.800', '#262626'),
            neutral900: getColor('neutral.900', '#171717'),
            
            // Helpers para estilos inline
            primaryBg: primary,
            primaryBgLight: `${primary}15`, // 15% opacity
            primaryText: primary,
            primaryBorder: primary,
            
            // CSS Variables
            cssVars: {
                '--ecommerce-primary': primary,
                '--ecommerce-primary-light': primaryLight,
                '--ecommerce-primary-dark': primaryDark,
                '--ecommerce-secondary': secondary,
                '--ecommerce-success': colors.success,
                '--ecommerce-warning': colors.warning,
                '--ecommerce-error': colors.error,
                '--ecommerce-info': colors.info,
            },
        };
    }, [colors, getColor]);
};

/**
 * Genera clases de estilo dinámicas basadas en el tema
 */
export const getThemedStyles = (theme: EcommerceTheme) => ({
    // Botón primario
    buttonPrimary: {
        backgroundColor: theme.primary,
        color: 'white',
        '&:hover': {
            backgroundColor: theme.primaryDark,
        },
    },
    
    // Botón outline
    buttonOutline: {
        borderColor: theme.primary,
        color: theme.primary,
        '&:hover': {
            backgroundColor: theme.primaryBgLight,
        },
    },
    
    // Badge
    badge: {
        backgroundColor: theme.primaryBgLight,
        color: theme.primary,
    },
    
    // Link
    link: {
        color: theme.primary,
        '&:hover': {
            color: theme.primaryDark,
        },
    },
    
    // Focus ring
    focusRing: {
        '--tw-ring-color': theme.primary,
    },
    
    // Active tab/nav
    activeTab: {
        backgroundColor: theme.primary,
        color: 'white',
    },
    
    // Inactive tab/nav
    inactiveTab: {
        backgroundColor: 'transparent',
        color: theme.neutral500,
        '&:hover': {
            backgroundColor: theme.neutral100,
        },
    },
});

/**
 * Helper para generar estilos de color con opacidad
 */
export const withOpacity = (color: string, opacity: number): string => {
    // Si es un color hex, convertir a rgba
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
};

export default useEcommerceTheme;














