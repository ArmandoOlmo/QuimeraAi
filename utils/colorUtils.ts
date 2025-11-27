/**
 * Color Utilities for ensuring proper contrast and accessibility
 */

/**
 * Calculates the relative luminance of a hex color
 * @param hexColor - Hex color string (with or without #)
 */
export const getLuminance = (hexColor: string): number => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const sRGB = [r, g, b].map(c => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

/**
 * Returns a contrasting text color (black or white) based on background
 * @param backgroundColor - Hex color of the background
 */
export const getContrastingTextColor = (backgroundColor: string): string => {
    try {
        const luminance = getLuminance(backgroundColor);
        return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    } catch {
        return '#ffffff'; // Default to white on error
    }
};

/**
 * Checks if two colors have sufficient contrast ratio (WCAG AA = 4.5:1)
 * @param color1 - First hex color
 * @param color2 - Second hex color
 */
export const hasGoodContrast = (color1: string, color2: string): boolean => {
    try {
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        const ratio = (brightest + 0.05) / (darkest + 0.05);
        return ratio >= 4.5;
    } catch {
        return true; // Assume good contrast on error
    }
};

/**
 * Returns an appropriate text color that contrasts well with the background
 * Tries the provided text color first, falls back to black/white if contrast is poor
 * @param backgroundColor - Hex color of the background
 * @param preferredTextColor - The preferred text color to use if it has good contrast
 */
export const ensureTextContrast = (backgroundColor: string, preferredTextColor?: string): string => {
    if (preferredTextColor && hasGoodContrast(backgroundColor, preferredTextColor)) {
        return preferredTextColor;
    }
    return getContrastingTextColor(backgroundColor);
};

/**
 * Determines if a color is considered "dark"
 * @param hexColor - Hex color string
 */
export const isDarkColor = (hexColor: string): boolean => {
    try {
        return getLuminance(hexColor) < 0.5;
    } catch {
        return true; // Assume dark on error
    }
};

/**
 * Determines if a color is considered "light"
 * @param hexColor - Hex color string
 */
export const isLightColor = (hexColor: string): boolean => {
    return !isDarkColor(hexColor);
};

