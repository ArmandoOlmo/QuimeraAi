/**
 * Design Tokens Hook
 * Provides easy access to design tokens with fallbacks
 */

import { useEditor } from '../contexts/EditorContext';
import { DesignTokens } from '../types';

interface UseDesignTokensReturn {
  designTokens: DesignTokens | null;
  getColor: (path: string, fallback?: string) => string;
  getSpacing: (key: keyof DesignTokens['spacing'], fallback?: string) => string;
  getFontSize: (key: keyof DesignTokens['typography']['fontSizes'], fallback?: string) => string;
  getShadow: (key: keyof DesignTokens['shadows'], fallback?: string) => string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

/**
 * Hook to access design tokens throughout the application
 * Provides helper functions and quick access to common tokens
 */
export const useDesignTokens = (): UseDesignTokensReturn => {
  const { designTokens } = useEditor();

  /**
   * Get a color value from design tokens by path
   * @param path - Dot notation path (e.g., 'primary.main', 'neutral.500')
   * @param fallback - Fallback color if token not found
   */
  const getColor = (path: string, fallback: string = '#000000'): string => {
    if (!designTokens) return fallback;

    const keys = path.split('.');
    let value: any = designTokens.colors;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fallback;
      }
    }

    return typeof value === 'string' ? value : fallback;
  };

  /**
   * Get a spacing value from design tokens
   */
  const getSpacing = (
    key: keyof DesignTokens['spacing'],
    fallback: string = '1rem'
  ): string => {
    if (!designTokens) return fallback;
    return designTokens.spacing[key] || fallback;
  };

  /**
   * Get a font size from design tokens
   */
  const getFontSize = (
    key: keyof DesignTokens['typography']['fontSizes'],
    fallback: string = '1rem'
  ): string => {
    if (!designTokens) return fallback;
    return designTokens.typography.fontSizes[key] || fallback;
  };

  /**
   * Get a shadow value from design tokens
   */
  const getShadow = (
    key: keyof DesignTokens['shadows'],
    fallback: string = 'none'
  ): string => {
    if (!designTokens) return fallback;
    return designTokens.shadows[key] || fallback;
  };

  // Quick access to common colors with fallbacks
  const colors = {
    primary: getColor('primary.main', '#4f46e5'),
    primaryLight: getColor('primary.light', '#6366f1'),
    primaryDark: getColor('primary.dark', '#4338ca'),
    secondary: getColor('secondary.main', '#10b981'),
    secondaryLight: getColor('secondary.light', '#34d399'),
    secondaryDark: getColor('secondary.dark', '#059669'),
    success: getColor('success.main', '#10b981'),
    warning: getColor('warning.main', '#f59e0b'),
    error: getColor('error.main', '#ef4444'),
    info: getColor('info.main', '#3b82f6'),
  };

  return {
    designTokens,
    getColor,
    getSpacing,
    getFontSize,
    getShadow,
    colors,
  };
};

/**
 * Merge component colors with design tokens
 * This allows gradual migration - components can still receive color props
 * but will be overridden by design tokens if available
 */
export const mergeColorsWithTokens = (
  componentColors: any,
  tokens: DesignTokens | null
): any => {
  if (!tokens) return componentColors;

  return {
    ...componentColors,
    primary: tokens.colors.primary?.main || componentColors.primary,
    secondary: tokens.colors.secondary?.main || componentColors.secondary,
    // Keep other colors from component as they might be specific
  };
};



