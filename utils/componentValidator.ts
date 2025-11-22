import { CustomComponent, EditableComponentID } from '../types';

/**
 * Component Validator
 * Validates component data structure and content
 */

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error';
}

export interface ValidationWarning {
    field: string;
    message: string;
    severity: 'warning';
}

/**
 * Validate a custom component
 */
export function validateComponent(component: Partial<CustomComponent>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!component.name || component.name.trim() === '') {
        errors.push({
            field: 'name',
            message: 'Component name is required',
            severity: 'error'
        });
    }

    if (!component.baseComponent) {
        errors.push({
            field: 'baseComponent',
            message: 'Base component is required',
            severity: 'error'
        });
    }

    // Name validation
    if (component.name && component.name.length < 3) {
        warnings.push({
            field: 'name',
            message: 'Component name should be at least 3 characters',
            severity: 'warning'
        });
    }

    if (component.name && component.name.length > 50) {
        errors.push({
            field: 'name',
            message: 'Component name must be less than 50 characters',
            severity: 'error'
        });
    }

    // Description validation
    if (component.description && component.description.length > 500) {
        warnings.push({
            field: 'description',
            message: 'Description is very long (>500 chars). Consider shortening it.',
            severity: 'warning'
        });
    }

    // Styles validation
    if (!component.styles || Object.keys(component.styles).length === 0) {
        warnings.push({
            field: 'styles',
            message: 'Component has no custom styles defined',
            severity: 'warning'
        });
    }

    // Category validation
    const validCategories = ['hero', 'cta', 'form', 'content', 'navigation', 'media', 'other'];
    if (component.category && !validCategories.includes(component.category)) {
        warnings.push({
            field: 'category',
            message: `Category '${component.category}' is not standard. Use one of: ${validCategories.join(', ')}`,
            severity: 'warning'
        });
    }

    // Tags validation
    if (component.tags && component.tags.length > 10) {
        warnings.push({
            field: 'tags',
            message: 'Too many tags (>10). Consider reducing for better organization.',
            severity: 'warning'
        });
    }

    // Variants validation
    if (component.variants) {
        component.variants.forEach((variant, index) => {
            if (!variant.name || variant.name.trim() === '') {
                errors.push({
                    field: `variants[${index}].name`,
                    message: `Variant ${index + 1} must have a name`,
                    severity: 'error'
                });
            }
            
            if (!variant.styles || Object.keys(variant.styles).length === 0) {
                warnings.push({
                    field: `variants[${index}].styles`,
                    message: `Variant '${variant.name}' has no custom styles`,
                    severity: 'warning'
                });
            }
        });

        // Check for default variant
        const hasDefault = component.variants.some(v => v.isDefault);
        if (component.variants.length > 0 && !hasDefault) {
            warnings.push({
                field: 'variants',
                message: 'No default variant specified',
                severity: 'warning'
            });
        }
    }

    // Permissions validation
    if (component.permissions) {
        if (component.permissions.isPublic && 
            (component.permissions.canView.length > 0 || component.permissions.canEdit.length > 0)) {
            warnings.push({
                field: 'permissions',
                message: 'Public components should not have specific user permissions',
                severity: 'warning'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate component styles structure
 */
export function validateStyles(styles: any, baseComponent: EditableComponentID): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!styles || typeof styles !== 'object') {
        errors.push({
            field: 'styles',
            message: 'Styles must be an object',
            severity: 'error'
        });
        return { isValid: false, errors, warnings };
    }

    // Color validation
    if (styles.colors) {
        const colorFields = ['background', 'text', 'primary', 'secondary', 'accent'];
        colorFields.forEach(field => {
            if (styles.colors[field] && !isValidColor(styles.colors[field])) {
                errors.push({
                    field: `styles.colors.${field}`,
                    message: `Invalid color value: ${styles.colors[field]}`,
                    severity: 'error'
                });
            }
        });
    }

    // Spacing validation
    if (styles.paddingX !== undefined && !isValidSpacing(styles.paddingX)) {
        warnings.push({
            field: 'styles.paddingX',
            message: 'Unusual padding value. Should be between 0 and 200',
            severity: 'warning'
        });
    }

    if (styles.paddingY !== undefined && !isValidSpacing(styles.paddingY)) {
        warnings.push({
            field: 'styles.paddingY',
            message: 'Unusual padding value. Should be between 0 and 200',
            severity: 'warning'
        });
    }

    // Font size validation
    if (styles.fontSize && !isValidFontSize(styles.fontSize)) {
        warnings.push({
            field: 'styles.fontSize',
            message: 'Font size seems unusual. Typically 12-72px',
            severity: 'warning'
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate color format (hex, rgb, rgba)
 */
function isValidColor(color: string): boolean {
    // Hex color
    if (/^#[0-9A-F]{6}$/i.test(color)) return true;
    if (/^#[0-9A-F]{3}$/i.test(color)) return true;
    
    // RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
    
    // Named colors (basic check)
    const namedColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'transparent'];
    if (namedColors.includes(color.toLowerCase())) return true;
    
    return false;
}

/**
 * Validate spacing value (px or number)
 */
function isValidSpacing(value: any): boolean {
    if (typeof value === 'number') {
        return value >= 0 && value <= 200;
    }
    if (typeof value === 'string') {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= 200;
    }
    return false;
}

/**
 * Validate font size
 */
function isValidFontSize(value: any): boolean {
    if (typeof value === 'number') {
        return value >= 12 && value <= 72;
    }
    if (typeof value === 'string') {
        const num = parseInt(value);
        return !isNaN(num) && num >= 12 && num <= 72;
    }
    return false;
}

/**
 * Validate component name uniqueness
 */
export function validateUniqueName(
    name: string, 
    existingComponents: CustomComponent[], 
    excludeId?: string
): boolean {
    return !existingComponents.some(
        c => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId
    );
}

/**
 * Sanitize component data before saving
 */
export function sanitizeComponent(component: Partial<CustomComponent>): Partial<CustomComponent> {
    return {
        ...component,
        name: component.name?.trim(),
        description: component.description?.trim(),
        tags: component.tags?.map(t => t.trim().toLowerCase()),
        // Remove any potentially harmful data
        styles: sanitizeStyles(component.styles)
    };
}

/**
 * Sanitize styles object
 */
function sanitizeStyles(styles: any): any {
    if (!styles || typeof styles !== 'object') return styles;
    
    const sanitized = { ...styles };
    
    // Remove any functions or dangerous content
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'function') {
            delete sanitized[key];
        }
        if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeStyles(sanitized[key]);
        }
    });
    
    return sanitized;
}

/**
 * Get validation summary message
 */
export function getValidationSummary(result: ValidationResult): string {
    if (result.isValid && result.warnings.length === 0) {
        return 'Component is valid';
    }
    
    const parts: string[] = [];
    
    if (result.errors.length > 0) {
        parts.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
    }
    
    if (result.warnings.length > 0) {
        parts.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
}

/**
 * Check if component is ready for publication
 */
export function isReadyForPublication(component: CustomComponent): ValidationResult {
    const result = validateComponent(component);
    const errors: ValidationError[] = [...result.errors];
    const warnings: ValidationWarning[] = [...result.warnings];
    
    // Additional checks for publication
    if (!component.description) {
        errors.push({
            field: 'description',
            message: 'Description is required for publication',
            severity: 'error'
        });
    }
    
    if (!component.category) {
        warnings.push({
            field: 'category',
            message: 'Category helps users find your component',
            severity: 'warning'
        });
    }
    
    if (!component.tags || component.tags.length === 0) {
        warnings.push({
            field: 'tags',
            message: 'Tags help with discoverability',
            severity: 'warning'
        });
    }
    
    if (!component.thumbnail) {
        warnings.push({
            field: 'thumbnail',
            message: 'Thumbnail image recommended for marketplace',
            severity: 'warning'
        });
    }
    
    if (!component.documentation) {
        warnings.push({
            field: 'documentation',
            message: 'Documentation helps users understand your component',
            severity: 'warning'
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

