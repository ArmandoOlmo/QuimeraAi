/**
 * Color Utilities for ensuring proper contrast and accessibility
 */

/**
 * Parses a color string (hex or rgba) and returns RGB components
 * @param color - Color string in hex (#RRGGBB) or rgba(r, g, b, a) format
 * @returns Object with r, g, b values (0-255) and alpha (0-1)
 */
export const parseColorToRgb = (color: string): { r: number; g: number; b: number; alpha: number } => {
    if (!color) return { r: 0, g: 0, b: 0, alpha: 1 };
    
    // Handle RGBA format
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1]),
            g: parseInt(rgbaMatch[2]),
            b: parseInt(rgbaMatch[3]),
            alpha: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
        };
    }
    
    // Handle HEX format
    if (color.startsWith('#')) {
        let hex = color.slice(1);
        // Handle short hex (#RGB)
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        // Handle hex with alpha (#RRGGBBAA)
        let alpha = 1;
        if (hex.length === 8) {
            alpha = parseInt(hex.slice(6, 8), 16) / 255;
            hex = hex.slice(0, 6);
        }
        
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
            alpha,
        };
    }
    
    return { r: 0, g: 0, b: 0, alpha: 1 };
};

/**
 * Calculates the relative luminance of a color (hex or rgba)
 * @param color - Color string in hex or rgba format
 */
export const getLuminance = (color: string): number => {
    const { r, g, b } = parseColorToRgb(color);
    
    const sRGB = [r / 255, g / 255, b / 255].map(c => 
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

/**
 * Darkens a color by a given percentage (supports hex and rgba)
 * @param color - Color string in hex or rgba format
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened color (preserves format and alpha)
 */
export const darkenColor = (color: string, percent: number): string => {
    try {
        const { r, g, b, alpha } = parseColorToRgb(color);
        
        const factor = 1 - (percent / 100);
        const newR = Math.round(r * factor);
        const newG = Math.round(g * factor);
        const newB = Math.round(b * factor);
        
        // If original had alpha < 1, return rgba format
        if (alpha < 1) {
            return `rgba(${Math.max(0, Math.min(255, newR))}, ${Math.max(0, Math.min(255, newG))}, ${Math.max(0, Math.min(255, newB))}, ${alpha})`;
        }
        
        const toHex = (n: number) => {
            const hex = Math.max(0, Math.min(255, n)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    } catch {
        return color; // Return original color on error
    }
};

/**
 * Converts a color to rgba format with specified opacity (supports hex and rgba input)
 * @param color - Color string in hex or rgba format
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export const hexToRgba = (color: string, opacity: number): string => {
    try {
        const { r, g, b } = parseColorToRgb(color);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } catch {
        return color; // Return original color on error
    }
};

/**
 * Converts a color to hex format (extracts hex from rgba if needed)
 * @param color - Color string in hex or rgba format
 * @returns Hex color string
 */
export const toHex = (color: string): string => {
    try {
        const { r, g, b } = parseColorToRgb(color);
        const toHexComponent = (n: number) => {
            const hex = Math.max(0, Math.min(255, n)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
    } catch {
        return color;
    }
};

/**
 * Gets the alpha value from a color (returns 1 for hex colors without alpha)
 * @param color - Color string in hex or rgba format
 * @returns Alpha value (0-1)
 */
export const getAlpha = (color: string): number => {
    try {
        const { alpha } = parseColorToRgb(color);
        return alpha;
    } catch {
        return 1;
    }
};

