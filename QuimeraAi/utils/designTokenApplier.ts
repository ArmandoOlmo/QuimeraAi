/**
 * Design Token Applier Utility
 * Applies global design tokens to all components in a project
 */

import { DesignTokens, Project, PageData } from '../types';

/**
 * Apply design tokens to a single component's data
 */
export function applyTokensToComponent(
    componentData: any,
    tokens: DesignTokens
): any {
    const applied = { ...componentData };

    // Apply color tokens
    if (applied.colors) {
        if (tokens.colors) {
            // Map common color properties to tokens
            if (applied.colors.primary) {
                applied.colors.primary = tokens.colors.primary?.main || applied.colors.primary;
            }
            if (applied.colors.secondary) {
                applied.colors.secondary = tokens.colors.secondary?.main || applied.colors.secondary;
            }
            if (applied.colors.accent) {
                applied.colors.accent = tokens.colors.primary?.main || applied.colors.accent;
            }
            if (applied.colors.background) {
                applied.colors.background = tokens.colors.neutral?.[50] || applied.colors.background;
            }
            if (applied.colors.text) {
                applied.colors.text = tokens.colors.neutral?.[900] || applied.colors.text;
            }
        }
    }

    // Apply typography tokens
    if (tokens.typography) {
        if (applied.fontSize && tokens.typography.fontSizes) {
            // Map font sizes
            const fontSizeMap: Record<string, keyof typeof tokens.typography.fontSizes> = {
                'text-sm': 'sm',
                'text-base': 'base',
                'text-lg': 'lg',
                'text-xl': 'xl',
                'text-2xl': '2xl',
                'text-3xl': '3xl',
                'text-4xl': '4xl',
            };
            
            const mappedSize = fontSizeMap[applied.fontSize];
            if (mappedSize && tokens.typography.fontSizes[mappedSize]) {
                applied.fontSize = tokens.typography.fontSizes[mappedSize];
            }
        }

        if (applied.fontWeight && tokens.typography.fontWeights) {
            const weightMap: Record<string, keyof typeof tokens.typography.fontWeights> = {
                'font-normal': 'normal',
                'font-medium': 'medium',
                'font-semibold': 'semibold',
                'font-bold': 'bold',
            };
            
            const mappedWeight = weightMap[applied.fontWeight];
            if (mappedWeight && tokens.typography.fontWeights[mappedWeight]) {
                applied.fontWeight = tokens.typography.fontWeights[mappedWeight];
            }
        }

        if (applied.lineHeight && tokens.typography.lineHeights) {
            const lineHeightMap: Record<string, keyof typeof tokens.typography.lineHeights> = {
                'leading-none': 'none',
                'leading-tight': 'tight',
                'leading-normal': 'normal',
                'leading-relaxed': 'relaxed',
                'leading-loose': 'loose',
            };
            
            const mappedLineHeight = lineHeightMap[applied.lineHeight];
            if (mappedLineHeight && tokens.typography.lineHeights[mappedLineHeight]) {
                applied.lineHeight = tokens.typography.lineHeights[mappedLineHeight];
            }
        }
    }

    // Apply spacing tokens
    if (tokens.spacing) {
        if (applied.paddingY !== undefined && tokens.spacing[applied.paddingY as keyof typeof tokens.spacing]) {
            applied.paddingY = tokens.spacing[applied.paddingY as keyof typeof tokens.spacing];
        }
        if (applied.paddingX !== undefined && tokens.spacing[applied.paddingX as keyof typeof tokens.spacing]) {
            applied.paddingX = tokens.spacing[applied.paddingX as keyof typeof tokens.spacing];
        }
        if (applied.gap !== undefined && tokens.spacing[applied.gap as keyof typeof tokens.spacing]) {
            applied.gap = tokens.spacing[applied.gap as keyof typeof tokens.spacing];
        }
    }

    // Apply shadow tokens
    if (tokens.shadows && applied.shadow) {
        const shadowMap: Record<string, keyof typeof tokens.shadows> = {
            'shadow-sm': 'sm',
            'shadow': 'base',
            'shadow-md': 'md',
            'shadow-lg': 'lg',
            'shadow-xl': 'xl',
        };
        
        const mappedShadow = shadowMap[applied.shadow];
        if (mappedShadow && tokens.shadows[mappedShadow]) {
            applied.shadow = tokens.shadows[mappedShadow];
        }
    }

    return applied;
}

/**
 * Apply design tokens to all components in project data
 */
export function applyTokensToProject(
    projectData: PageData,
    tokens: DesignTokens
): PageData {
    const newData: PageData = {} as PageData;

    // Apply tokens to each component
    Object.keys(projectData).forEach((componentId) => {
        const componentData = projectData[componentId as keyof PageData];
        if (componentData && typeof componentData === 'object') {
            (newData as any)[componentId] = applyTokensToComponent(
                componentData,
                tokens
            );
        } else {
            (newData as any)[componentId] = componentData;
        }
    });

    return newData;
}

/**
 * Apply design tokens to an entire project (including all data)
 */
export function applyTokensToFullProject(
    project: Project,
    tokens: DesignTokens
): Project {
    return {
        ...project,
        data: applyTokensToProject(project.data, tokens),
        designTokens: tokens,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Extract color value from design token path
 * Example: "colors.primary.500" -> "#4f46e5"
 */
export function getTokenValue(tokenPath: string, tokens: DesignTokens): any {
    const parts = tokenPath.split('.');
    let value: any = tokens;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part as keyof typeof value];
        } else {
            return undefined;
        }
    }

    return value;
}

/**
 * Replace direct color values with token references
 * This is useful for creating a token-based system
 */
export function replaceColorsWithTokens(
    componentData: any,
    tokens: DesignTokens
): any {
    if (!tokens.colors) return componentData;

    const applied = { ...componentData };

    // Helper to find closest token for a color
    const findClosestToken = (color: string): string | null => {
        if (!color || !color.startsWith('#')) return null;

        // Try to find exact match in ColorToken colors (main/light/dark)
        const colorTokenNames = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
        for (const colorName of colorTokenNames) {
            const colorToken = tokens.colors[colorName as keyof typeof tokens.colors];
            if (colorToken && typeof colorToken === 'object' && 'main' in colorToken) {
                if (colorToken.main === color) return `tokens.colors.${colorName}.main`;
                if (colorToken.light === color) return `tokens.colors.${colorName}.light`;
                if (colorToken.dark === color) return `tokens.colors.${colorName}.dark`;
            }
        }

        // Try to find exact match in ColorScale (neutral)
        if (tokens.colors.neutral) {
            for (const [shade, tokenColor] of Object.entries(tokens.colors.neutral)) {
                if (tokenColor === color) {
                    return `tokens.colors.neutral.${shade}`;
                }
            }
        }

        return null;
    };

    // Replace color values
    if (applied.colors) {
        Object.keys(applied.colors).forEach((key) => {
            const colorValue = applied.colors[key];
            const tokenRef = findClosestToken(colorValue);
            if (tokenRef) {
                applied.colors[key] = tokenRef;
            }
        });
    }

    return applied;
}

/**
 * Validate that all token references in a component are valid
 */
export function validateTokenReferences(
    componentData: any,
    tokens: DesignTokens
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const checkTokenRef = (value: any, path: string) => {
        if (typeof value === 'string' && value.startsWith('tokens.')) {
            const tokenValue = getTokenValue(value.replace('tokens.', ''), tokens);
            if (tokenValue === undefined) {
                errors.push(`Invalid token reference at ${path}: ${value}`);
            }
        } else if (typeof value === 'object' && value !== null) {
            Object.keys(value).forEach((key) => {
                checkTokenRef(value[key], `${path}.${key}`);
            });
        }
    };

    checkTokenRef(componentData, 'root');

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Get a preview of how tokens would be applied to a component
 */
export function previewTokenApplication(
    componentData: any,
    tokens: DesignTokens
): {
    original: any;
    applied: any;
    changes: Array<{ path: string; before: any; after: any }>;
} {
    const applied = applyTokensToComponent(componentData, tokens);
    const changes: Array<{ path: string; before: any; after: any }> = [];

    const compareObjects = (obj1: any, obj2: any, path: string = '') => {
        Object.keys(obj2).forEach((key) => {
            const newPath = path ? `${path}.${key}` : key;
            if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key])) {
                compareObjects(obj1[key] || {}, obj2[key], newPath);
            } else if (obj1[key] !== obj2[key]) {
                changes.push({
                    path: newPath,
                    before: obj1[key],
                    after: obj2[key],
                });
            }
        });
    };

    compareObjects(componentData, applied);

    return {
        original: componentData,
        applied,
        changes,
    };
}

