/**
 * Advanced Features Types
 * Tipos para features avanzadas: design tokens, responsive, animations, conditional rules, A/B testing, etc.
 */

import { PageSection } from './ui';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
export interface ColorToken {
    main: string;
    light: string;
    dark: string;
}

export interface ColorScale {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
}

export interface SpacingScale {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
}

export interface TypographyTokens {
    fontFamilies: {
        heading: string;
        body: string;
        mono: string;
    };
    fontSizes: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
        '6xl': string;
    };
    fontWeights: {
        light: number;
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

export interface ShadowTokens {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface AnimationTokens {
    durations: {
        fast: string;
        normal: string;
        slow: string;
    };
    easings: {
        linear: string;
        easeIn: string;
        easeOut: string;
        easeInOut: string;
    };
}

export interface BreakpointTokens {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface DesignTokens {
    colors: {
        primary: ColorToken;
        secondary: ColorToken;
        success: ColorToken;
        warning: ColorToken;
        error: ColorToken;
        info: ColorToken;
        neutral: ColorScale;
    };
    spacing: SpacingScale;
    typography: TypographyTokens;
    shadows: ShadowTokens;
    animations: AnimationTokens;
    breakpoints: BreakpointTokens;
}

// =============================================================================
// RESPONSIVE CONFIGURATION
// =============================================================================
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveValue<T> {
    base?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
}

export interface ResponsiveStyles {
    spacing?: ResponsiveValue<string>;
    fontSize?: ResponsiveValue<string>;
    display?: ResponsiveValue<'block' | 'flex' | 'grid' | 'none'>;
    width?: ResponsiveValue<string>;
    height?: ResponsiveValue<string>;
    padding?: ResponsiveValue<string>;
    margin?: ResponsiveValue<string>;
}

// =============================================================================
// ANIMATION CONFIGURATION
// =============================================================================
export type AnimationTrigger = 'onLoad' | 'onScroll' | 'onClick' | 'onHover';
export type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'custom';
export type AnimationEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export interface AnimationConfig {
    type: AnimationType;
    duration: number;
    delay: number;
    easing: AnimationEasing;
    trigger: AnimationTrigger;
    repeat?: number;
    direction?: 'normal' | 'reverse' | 'alternate';
    customKeyframes?: string;
}

export interface ComponentAnimations {
    entrance?: AnimationConfig;
    exit?: AnimationConfig;
    interaction?: AnimationConfig;
}

// =============================================================================
// CONDITIONAL RULES
// =============================================================================
export type ConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
export type ConditionTarget = 'userRole' | 'deviceType' | 'screenSize' | 'timeOfDay' | 'location' | 'customField';

export interface Condition {
    id: string;
    target: ConditionTarget;
    operator: ConditionOperator;
    value: any;
}

export interface ConditionalRule {
    id: string;
    name: string;
    conditions: Condition[];
    matchType: 'all' | 'any';
    actions: {
        show?: boolean;
        applyStyles?: any;
        redirect?: string;
    };
}

export interface ConditionalRules {
    rules: ConditionalRule[];
    enabled: boolean;
}

// =============================================================================
// A/B TESTING
// =============================================================================
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
export type ExperimentGoal = 'clicks' | 'conversions' | 'engagement' | 'custom';

export interface ExperimentVariant {
    id: string;
    name: string;
    description: string;
    weight: number;
    componentConfig: any;
}

export interface ExperimentMetrics {
    impressions: number;
    interactions: number;
    conversions: number;
    conversionRate: number;
}

export interface ABTestExperiment {
    id: string;
    name: string;
    description: string;
    componentId: string;
    status: ExperimentStatus;
    goal: ExperimentGoal;
    variants: ExperimentVariant[];
    metrics: Record<string, ExperimentMetrics>;
    startDate?: { seconds: number; nanoseconds: number; };
    endDate?: { seconds: number; nanoseconds: number; };
    createdBy: string;
    winningVariant?: string;
}

// =============================================================================
// COMPONENT STUDIO
// =============================================================================
export type EditableComponentID = 'hero' | 'features' | 'services' | 'testimonials' | 'team' | 'cta' | 'slideshow' | 'pricing' | 'faq' | 'portfolio' | 'leads' | 'newsletter' | 'video' | 'howItWorks' | 'footer' | 'header' | 'chatbot' | 'typography';
export type ComponentStyles = Record<EditableComponentID, any>;
export type ComponentCategory = 'hero' | 'cta' | 'form' | 'content' | 'navigation' | 'media' | 'other';

export interface ComponentVersion {
    version: number;
    timestamp: { seconds: number; nanoseconds: number; };
    author: string;
    changes: string;
    snapshot: any;
}

export interface ComponentVariant {
    id: string;
    name: string;
    description: string;
    styles: any;
    thumbnail?: string;
    isDefault?: boolean;
}

export interface ComponentPermissions {
    canEdit: string[];
    canView: string[];
    isPublic: boolean;
}

export interface ComponentRating {
    id: string;
    componentId: string;
    userId: string;
    userName?: string;
    rating: number;
    comment?: string;
    createdAt: { seconds: number; nanoseconds: number; } | string;
    helpful?: number;
}

export interface PropDocumentation {
    name: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: any;
}

export interface ComponentDocumentation {
    description: string;
    usageExamples: string[];
    properties: PropDocumentation[];
    changelog: string;
}

export interface CustomComponent {
    id: string;
    name: string;
    description?: string;
    baseComponent: EditableComponentID;
    styles: any;
    
    // Versioning
    version: number;
    versionHistory?: ComponentVersion[];
    lastModified?: { seconds: number; nanoseconds: number; };
    modifiedBy?: string;
    
    // Organization
    category?: ComponentCategory;
    tags?: string[];
    thumbnail?: string;
    
    // Variants
    variants?: ComponentVariant[];
    
    // Permissions & Usage
    permissions?: ComponentPermissions;
    isPublic?: boolean;
    createdBy?: string;
    
    // Metadata
    createdAt: { seconds: number; nanoseconds: number; };
    usageCount?: number;
    projectsUsing?: string[];
    
    // Documentation
    documentation?: ComponentDocumentation;
    
    // Ratings
    ratings?: ComponentRating[];
    averageRating?: number;
}

export interface ComponentReview {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number; nanoseconds: number; };
}

export interface MarketplaceComponent extends CustomComponent {
    downloads: number;
    rating: number;
    reviews: ComponentReview[];
    price?: number;
    isPremium: boolean;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    screenshots?: string[];
}

// =============================================================================
// NESTED COMPONENTS / SLOTS
// =============================================================================
export interface ComponentSlot {
    id: string;
    name: string;
    allowedComponents?: EditableComponentID[];
    maxComponents?: number;
    defaultComponent?: EditableComponentID;
}

export interface NestedComponent {
    slotId: string;
    componentId: string;
    order: number;
    config: any;
}

