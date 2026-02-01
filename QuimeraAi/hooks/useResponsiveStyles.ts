import { useState, useEffect } from 'react';
import { ResponsiveStyles, Breakpoint } from '../types';

/**
 * Custom hook to apply responsive styles based on current breakpoint
 * 
 * Usage:
 * const styles = useResponsiveStyles(componentResponsiveStyles, baseStyles);
 */

// Breakpoint definitions (Tailwind defaults)
const breakpoints: Record<Breakpoint, number> = {
    base: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

/**
 * Get current active breakpoint based on window width
 */
export function getCurrentBreakpoint(): Breakpoint {
    if (typeof window === 'undefined') return 'base';
    
    const width = window.innerWidth;
    
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'base';
}

/**
 * Get all active breakpoints (mobile-first approach)
 * Returns array from base up to current breakpoint
 */
export function getActiveBreakpoints(currentBreakpoint: Breakpoint): Breakpoint[] {
    const order: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = order.indexOf(currentBreakpoint);
    return order.slice(0, currentIndex + 1);
}

/**
 * Hook to get current breakpoint with reactive updates
 */
export function useBreakpoint(): Breakpoint {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(getCurrentBreakpoint());

    useEffect(() => {
        const handleResize = () => {
            setBreakpoint(getCurrentBreakpoint());
        };

        // Use matchMedia for better performance
        const queries: Array<{ query: MediaQueryList; breakpoint: Breakpoint }> = [
            { query: window.matchMedia('(min-width: 1536px)'), breakpoint: '2xl' },
            { query: window.matchMedia('(min-width: 1280px) and (max-width: 1535px)'), breakpoint: 'xl' },
            { query: window.matchMedia('(min-width: 1024px) and (max-width: 1279px)'), breakpoint: 'lg' },
            { query: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'), breakpoint: 'md' },
            { query: window.matchMedia('(min-width: 640px) and (max-width: 767px)'), breakpoint: 'sm' },
            { query: window.matchMedia('(max-width: 639px)'), breakpoint: 'base' },
        ];

        queries.forEach(({ query, breakpoint: bp }) => {
            const handler = (e: MediaQueryListEvent) => {
                if (e.matches) {
                    setBreakpoint(bp);
                }
            };
            query.addEventListener('change', handler);
        });

        // Initial check
        handleResize();

        // Fallback to resize event
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            queries.forEach(({ query, breakpoint: bp }) => {
                const handler = (e: MediaQueryListEvent) => {
                    if (e.matches) {
                        setBreakpoint(bp);
                    }
                };
                query.removeEventListener('change', handler);
            });
        };
    }, []);

    return breakpoint;
}

/**
 * Apply responsive styles based on current breakpoint
 * Mobile-first: styles cascade from base to larger breakpoints
 */
export function applyResponsiveStyles<T extends Record<string, any>>(
    responsiveStyles: ResponsiveStyles | undefined,
    baseStyles: T,
    currentBreakpoint: Breakpoint
): T {
    if (!responsiveStyles) return baseStyles;

    const activeBreakpoints = getActiveBreakpoints(currentBreakpoint);
    let mergedStyles = { ...baseStyles };

    // Apply styles in order from base to current breakpoint
    activeBreakpoints.forEach(bp => {
        if (responsiveStyles[bp]) {
            mergedStyles = {
                ...mergedStyles,
                ...responsiveStyles[bp],
            };
        }
    });

    return mergedStyles;
}

/**
 * Main hook to use responsive styles in components
 */
export function useResponsiveStyles<T extends Record<string, any>>(
    responsiveStyles: ResponsiveStyles | undefined,
    baseStyles: T
): T {
    const currentBreakpoint = useBreakpoint();
    const [appliedStyles, setAppliedStyles] = useState<T>(
        applyResponsiveStyles(responsiveStyles, baseStyles, currentBreakpoint)
    );

    useEffect(() => {
        const newStyles = applyResponsiveStyles(responsiveStyles, baseStyles, currentBreakpoint);
        setAppliedStyles(newStyles);
    }, [currentBreakpoint, responsiveStyles, baseStyles]);

    return appliedStyles;
}

/**
 * Generate Tailwind classes from responsive styles
 * Useful for className-based styling
 */
export function generateResponsiveClasses(
    responsiveStyles: ResponsiveStyles | undefined
): string {
    if (!responsiveStyles) return '';

    const classes: string[] = [];
    const breakpointPrefixes: Record<Breakpoint, string> = {
        base: '',
        sm: 'sm:',
        md: 'md:',
        lg: 'lg:',
        xl: 'xl:',
        '2xl': '2xl:',
    };

    Object.entries(responsiveStyles).forEach(([bp, styles]) => {
        const breakpoint = bp as Breakpoint;
        const prefix = breakpointPrefixes[breakpoint];

        if (styles && typeof styles === 'object') {
            Object.entries(styles).forEach(([property, value]) => {
                // Convert camelCase to kebab-case for Tailwind
                const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
                classes.push(`${prefix}${kebabProperty}-${value}`);
            });
        }
    });

    return classes.join(' ');
}

/**
 * Check if a specific breakpoint is active
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

/**
 * Responsive value helper - get value for current breakpoint
 */
export function useResponsiveValue<T>(
    values: Partial<Record<Breakpoint, T>>,
    defaultValue: T
): T {
    const breakpoint = useBreakpoint();
    const activeBreakpoints = getActiveBreakpoints(breakpoint);

    // Find the most specific value for current breakpoint
    for (let i = activeBreakpoints.length - 1; i >= 0; i--) {
        const bp = activeBreakpoints[i];
        if (values[bp] !== undefined) {
            return values[bp] as T;
        }
    }

    return defaultValue;
}

