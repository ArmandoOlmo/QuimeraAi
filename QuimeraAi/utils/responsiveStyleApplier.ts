/**
 * Responsive Style Applier Utility
 * Utilities for working with responsive styles in components
 */

import { ResponsiveStyles, Breakpoint, Project, PageData } from '../types';
import { getCurrentBreakpoint, applyResponsiveStyles } from '../hooks/useResponsiveStyles';

/**
 * Convert inline styles object to ResponsiveStyles structure
 * Useful for migrating existing components to responsive system
 */
export function convertToResponsiveStyles(
    baseStyles: Record<string, any>
): ResponsiveStyles {
    return {
        base: baseStyles,
        sm: {},
        md: {},
        lg: {},
        xl: {},
        '2xl': {},
    };
}

/**
 * Merge multiple ResponsiveStyles objects
 * Later styles override earlier ones
 */
export function mergeResponsiveStyles(
    ...stylesArray: (ResponsiveStyles | undefined)[]
): ResponsiveStyles {
    const merged: ResponsiveStyles = {
        base: {},
        sm: {},
        md: {},
        lg: {},
        xl: {},
        '2xl': {},
    };

    stylesArray.forEach(styles => {
        if (!styles) return;

        Object.keys(styles).forEach(bp => {
            const breakpoint = bp as Breakpoint;
            merged[breakpoint] = {
                ...merged[breakpoint],
                ...styles[breakpoint],
            };
        });
    });

    return merged;
}

/**
 * Extract base styles from ResponsiveStyles
 */
export function getBaseStyles(responsiveStyles: ResponsiveStyles): Record<string, any> {
    return responsiveStyles.base || {};
}

/**
 * Get styles for a specific breakpoint (cumulative, mobile-first)
 */
export function getStylesForBreakpoint(
    responsiveStyles: ResponsiveStyles,
    breakpoint: Breakpoint
): Record<string, any> {
    const breakpointOrder: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
    const index = breakpointOrder.indexOf(breakpoint);
    
    let styles = {};
    for (let i = 0; i <= index; i++) {
        styles = {
            ...styles,
            ...responsiveStyles[breakpointOrder[i]],
        };
    }
    
    return styles;
}

/**
 * Generate CSS @media queries from ResponsiveStyles
 */
export function generateMediaQueries(
    responsiveStyles: ResponsiveStyles,
    selector: string
): string {
    const breakpointSizes: Record<Exclude<Breakpoint, 'base'>, string> = {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    };

    let css = '';

    // Base styles (no media query)
    if (responsiveStyles.base && Object.keys(responsiveStyles.base).length > 0) {
        css += `${selector} {\n`;
        Object.entries(responsiveStyles.base).forEach(([prop, value]) => {
            const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            css += `  ${cssProperty}: ${value};\n`;
        });
        css += `}\n\n`;
    }

    // Responsive styles with media queries
    (['sm', 'md', 'lg', 'xl', '2xl'] as const).forEach(bp => {
        if (responsiveStyles[bp] && Object.keys(responsiveStyles[bp]).length > 0) {
            css += `@media (min-width: ${breakpointSizes[bp]}) {\n`;
            css += `  ${selector} {\n`;
            Object.entries(responsiveStyles[bp]).forEach(([prop, value]) => {
                const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                css += `    ${cssProperty}: ${value};\n`;
            });
            css += `  }\n`;
            css += `}\n\n`;
        }
    });

    return css;
}

/**
 * Apply responsive styles to a component data object
 */
export function applyResponsiveStylesToComponent(
    componentData: any,
    responsiveStyles: ResponsiveStyles
): any {
    const currentBreakpoint = getCurrentBreakpoint();
    const appliedStyles = applyResponsiveStyles(responsiveStyles, {}, currentBreakpoint);

    return {
        ...componentData,
        ...appliedStyles,
    };
}

/**
 * Validate ResponsiveStyles structure
 */
export function validateResponsiveStyles(
    responsiveStyles: ResponsiveStyles
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validBreakpoints: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

    Object.keys(responsiveStyles).forEach(bp => {
        if (!validBreakpoints.includes(bp as Breakpoint)) {
            errors.push(`Invalid breakpoint: ${bp}`);
        }

        const styles = responsiveStyles[bp as Breakpoint];
        if (styles && typeof styles !== 'object') {
            errors.push(`Styles for breakpoint ${bp} must be an object`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Create responsive padding/margin utilities
 */
export function createResponsiveSpacing(
    values: Partial<Record<Breakpoint, number | string>>
): ResponsiveStyles {
    const styles: ResponsiveStyles = {
        base: {},
        sm: {},
        md: {},
        lg: {},
        xl: {},
        '2xl': {},
    };

    Object.entries(values).forEach(([bp, value]) => {
        const breakpoint = bp as Breakpoint;
        if (styles[breakpoint]) {
            styles[breakpoint] = { padding: value };
        }
    });

    return styles;
}

/**
 * Generate responsive font sizes
 */
export function createResponsiveFontSizes(
    sizes: Partial<Record<Breakpoint, string>>
): ResponsiveStyles {
    const styles: ResponsiveStyles = {
        base: {},
        sm: {},
        md: {},
        lg: {},
        xl: {},
        '2xl': {},
    };

    Object.entries(sizes).forEach(([bp, size]) => {
        const breakpoint = bp as Breakpoint;
        if (styles[breakpoint]) {
            styles[breakpoint] = { fontSize: size };
        }
    });

    return styles;
}

/**
 * Apply responsive styles to entire project
 */
export function applyResponsiveStylesToProject(
    project: Project
): Project {
    if (!project.responsiveStyles) {
        return project;
    }

    const updatedData: PageData = {} as PageData;

    Object.keys(project.data).forEach(componentId => {
        const componentData = project.data[componentId as keyof PageData];
        const componentResponsiveStyles = project.responsiveStyles?.[componentId];

        if (componentResponsiveStyles) {
            (updatedData as any)[componentId] = applyResponsiveStylesToComponent(
                componentData,
                componentResponsiveStyles
            );
        } else {
            (updatedData as any)[componentId] = componentData;
        }
    });

    return {
        ...project,
        data: updatedData,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Get preview of responsive styles at different breakpoints
 */
export function getResponsivePreview(
    responsiveStyles: ResponsiveStyles
): Record<Breakpoint, Record<string, any>> {
    const preview: Record<Breakpoint, Record<string, any>> = {
        base: {},
        sm: {},
        md: {},
        lg: {},
        xl: {},
        '2xl': {},
    };

    const breakpoints: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

    breakpoints.forEach(bp => {
        preview[bp] = getStylesForBreakpoint(responsiveStyles, bp);
    });

    return preview;
}

/**
 * Check if responsive styles have changes for specific breakpoint
 */
export function hasBreakpointChanges(
    responsiveStyles: ResponsiveStyles,
    breakpoint: Breakpoint
): boolean {
    return responsiveStyles[breakpoint] !== undefined && 
           Object.keys(responsiveStyles[breakpoint]).length > 0;
}

/**
 * Copy styles from one breakpoint to another
 */
export function copyBreakpointStyles(
    responsiveStyles: ResponsiveStyles,
    from: Breakpoint,
    to: Breakpoint
): ResponsiveStyles {
    return {
        ...responsiveStyles,
        [to]: { ...responsiveStyles[from] },
    };
}

/**
 * Clear styles for a specific breakpoint
 */
export function clearBreakpointStyles(
    responsiveStyles: ResponsiveStyles,
    breakpoint: Breakpoint
): ResponsiveStyles {
    return {
        ...responsiveStyles,
        [breakpoint]: {},
    };
}

