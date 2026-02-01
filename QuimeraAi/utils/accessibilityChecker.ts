/**
 * Accessibility Checker Utility
 * Performs basic WCAG AA accessibility checks on components
 */

export interface A11yIssue {
    id: string;
    severity: 'error' | 'warning' | 'info';
    category: 'color-contrast' | 'alt-text' | 'headings' | 'aria' | 'focus' | 'keyboard' | 'structure';
    message: string;
    element?: string;
    suggestion?: string;
    wcagCriterion?: string;
    autoFixable?: boolean;
}

export interface A11yReport {
    componentId: string;
    componentName: string;
    timestamp: string;
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    score: number; // 0-100
    issues: A11yIssue[];
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 formula
 */
export function getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
        // Convert hex to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        // Apply gamma correction
        const getRGB = (val: number) => {
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        };

        const rL = getRGB(r);
        const gL = getRGB(g);
        const bL = getRGB(b);

        return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastRequirement(ratio: number, isLargeText: boolean = false): boolean {
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check color contrast in component data
 */
export function checkColorContrast(componentData: any): A11yIssue[] {
    const issues: A11yIssue[] = [];

    if (componentData.colors) {
        const { background, text, primary, secondary } = componentData.colors;

        // Check text on background
        if (background && text) {
            const ratio = getContrastRatio(background, text);
            if (!meetsContrastRequirement(ratio)) {
                issues.push({
                    id: `contrast-text-bg-${Date.now()}`,
                    severity: 'error',
                    category: 'color-contrast',
                    message: `Text color (${text}) has insufficient contrast with background (${background}). Ratio: ${ratio.toFixed(2)}:1`,
                    suggestion: 'Use a darker text color or lighter background to achieve at least 4.5:1 ratio',
                    wcagCriterion: 'WCAG 2.1 Level AA (1.4.3)',
                    autoFixable: true,
                });
            }
        }

        // Check primary button contrast
        if (primary && background) {
            const ratio = getContrastRatio(primary, background);
            if (ratio < 3) {
                issues.push({
                    id: `contrast-primary-${Date.now()}`,
                    severity: 'warning',
                    category: 'color-contrast',
                    message: `Primary color (${primary}) may not be distinguishable enough from background (${background}). Ratio: ${ratio.toFixed(2)}:1`,
                    suggestion: 'Ensure UI elements have at least 3:1 contrast ratio',
                    wcagCriterion: 'WCAG 2.1 Level AA (1.4.11)',
                });
            }
        }
    }

    return issues;
}

/**
 * Check for proper heading hierarchy
 */
export function checkHeadingStructure(componentData: any): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check if heading is defined
    if (!componentData.heading && !componentData.title) {
        issues.push({
            id: `heading-missing-${Date.now()}`,
            severity: 'warning',
            category: 'headings',
            message: 'Component lacks a heading or title',
            suggestion: 'Add a descriptive heading to improve document structure',
            wcagCriterion: 'WCAG 2.1 Level AA (2.4.6)',
        });
    }

    return issues;
}

/**
 * Check for alt text on images
 */
export function checkImageAltText(componentData: any): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check main image
    if (componentData.image && !componentData.imageAlt) {
        issues.push({
            id: `alt-text-missing-${Date.now()}`,
            severity: 'error',
            category: 'alt-text',
            message: 'Image is missing alt text',
            element: 'Main image',
            suggestion: 'Add descriptive alt text for the image',
            wcagCriterion: 'WCAG 2.1 Level A (1.1.1)',
            autoFixable: false,
        });
    }

    // Check items with images
    if (componentData.items && Array.isArray(componentData.items)) {
        componentData.items.forEach((item: any, index: number) => {
            if (item.image && !item.imageAlt && !item.alt) {
                issues.push({
                    id: `alt-text-item-${index}-${Date.now()}`,
                    severity: 'error',
                    category: 'alt-text',
                    message: `Image in item ${index + 1} is missing alt text`,
                    element: `Item ${index + 1}`,
                    suggestion: 'Add descriptive alt text for this image',
                    wcagCriterion: 'WCAG 2.1 Level A (1.1.1)',
                    autoFixable: false,
                });
            }
        });
    }

    return issues;
}

/**
 * Check for ARIA labels and roles
 */
export function checkAriaAttributes(componentData: any, componentType: string): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check if interactive elements have labels
    if (componentType === 'cta' || componentType === 'hero') {
        if (componentData.primaryButton && !componentData.primaryButtonAriaLabel) {
            issues.push({
                id: `aria-button-${Date.now()}`,
                severity: 'info',
                category: 'aria',
                message: 'Button could benefit from an ARIA label',
                element: 'Primary button',
                suggestion: 'Add aria-label for better screen reader support',
                wcagCriterion: 'WCAG 2.1 Level A (4.1.2)',
            });
        }
    }

    // Check forms for labels
    if (componentType === 'leads' || componentType === 'newsletter') {
        if (!componentData.inputLabel && !componentData.emailLabel) {
            issues.push({
                id: `aria-form-${Date.now()}`,
                severity: 'warning',
                category: 'aria',
                message: 'Form input lacks a visible label',
                element: 'Input field',
                suggestion: 'Add a visible label or aria-label attribute',
                wcagCriterion: 'WCAG 2.1 Level A (3.3.2)',
                autoFixable: true,
            });
        }
    }

    return issues;
}

/**
 * Check focus indicators
 */
export function checkFocusIndicators(componentData: any): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check if button colors might hide focus
    if (componentData.colors?.primary && componentData.colors?.accent) {
        const ratio = getContrastRatio(componentData.colors.primary, componentData.colors.accent);
        if (ratio < 3) {
            issues.push({
                id: `focus-indicator-${Date.now()}`,
                severity: 'warning',
                category: 'focus',
                message: 'Focus indicators may not be visible with current color scheme',
                suggestion: 'Ensure focus states have sufficient contrast',
                wcagCriterion: 'WCAG 2.1 Level AA (2.4.7)',
            });
        }
    }

    return issues;
}

/**
 * Check keyboard navigation
 */
export function checkKeyboardNavigation(componentData: any, componentType: string): A11yIssue[] {
    const issues: A11yIssue[] = [];

    // Check interactive components
    const interactiveTypes = ['slideshow', 'faq', 'pricing', 'portfolio'];
    if (interactiveTypes.includes(componentType)) {
        issues.push({
            id: `keyboard-nav-${Date.now()}`,
            severity: 'info',
            category: 'keyboard',
            message: 'Ensure all interactive elements are keyboard accessible',
            suggestion: 'Test navigation with Tab, Enter, Space, and Arrow keys',
            wcagCriterion: 'WCAG 2.1 Level A (2.1.1)',
        });
    }

    return issues;
}

/**
 * Perform comprehensive accessibility check on a component
 */
export function checkComponentAccessibility(
    componentId: string,
    componentName: string,
    componentData: any,
    componentType: string
): A11yReport {
    const issues: A11yIssue[] = [];

    // Run all checks
    issues.push(...checkColorContrast(componentData));
    issues.push(...checkHeadingStructure(componentData));
    issues.push(...checkImageAltText(componentData));
    issues.push(...checkAriaAttributes(componentData, componentType));
    issues.push(...checkFocusIndicators(componentData));
    issues.push(...checkKeyboardNavigation(componentData, componentType));

    // Calculate counts
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;

    // Calculate score (100 - weighted penalties)
    const score = Math.max(0, 100 - (errors * 20) - (warnings * 5) - (info * 2));

    return {
        componentId,
        componentName,
        timestamp: new Date().toISOString(),
        totalIssues: issues.length,
        errors,
        warnings,
        info,
        score,
        issues,
    };
}

/**
 * Auto-fix certain accessibility issues
 */
export function autoFixIssue(issue: A11yIssue, componentData: any): any {
    if (!issue.autoFixable) return componentData;

    const fixed = { ...componentData };

    switch (issue.category) {
        case 'color-contrast':
            // Simple auto-fix: darken text color
            if (fixed.colors && fixed.colors.text) {
                fixed.colors.text = '#000000'; // Black for maximum contrast
            }
            break;

        case 'aria':
            // Add default ARIA labels
            if (issue.element?.includes('button')) {
                fixed.primaryButtonAriaLabel = 'Click to take action';
            }
            if (issue.element?.includes('input')) {
                fixed.emailLabel = 'Email address';
            }
            break;
    }

    return fixed;
}

