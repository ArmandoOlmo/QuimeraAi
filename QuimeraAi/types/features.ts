/**
 * Advanced Features Types
 * Tipos para features avanzadas: design tokens, responsive, animations, conditional rules, A/B testing, etc.
 */

import { PageSection, FontFamily } from './ui';

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
        none?: number;
        tight: number;
        normal: number;
        relaxed: number;
        loose?: number;
    };
}

export interface ShadowTokens {
    sm: string;
    base?: string;  // Default shadow
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
// APP TOKENS - Para Dashboard/Admin de la aplicación
// =============================================================================

/**
 * Colores del tema para cada modo (light/dark/black)
 */
export interface AppThemeColors {
    background: string;      // --editor-bg
    panelBackground: string; // --editor-panel-bg
    border: string;          // --editor-border
    accent: string;          // --editor-accent
    textPrimary: string;     // --editor-text-primary
    textSecondary: string;   // --editor-text-secondary
    // Colores semánticos
    success: string;
    warning: string;
    error: string;
    info: string;
}

/**
 * Tipografía de la app con Google Fonts
 */
export interface AppTypography {
    fontFamily: {
        sans: FontFamily;    // Fuente para texto general (body, labels)
        header: FontFamily;  // Fuente para títulos del dashboard
        mono: FontFamily;    // Fuente monoespaciada (código, IDs)
    };
    fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
    };
    fontWeight: {
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    lineHeight: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

/**
 * Configuración de bordes y esquinas
 */
export interface AppBorders {
    radius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        full: string;
    };
    width: {
        none: string;
        thin: string;
        medium: string;
        thick: string;
    };
}

/**
 * Escala de espaciado
 */
export interface AppSpacing {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

/**
 * Sombras para elevación
 */
export interface AppShadows {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
}

/**
 * App Tokens completos - controla el aspecto del Dashboard/Admin
 */
export interface AppTokens {
    colors: {
        light: AppThemeColors;
        dark: AppThemeColors;
        black: AppThemeColors;
    };
    typography: AppTypography;
    borders: AppBorders;
    spacing: AppSpacing;
    shadows: AppShadows;
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
    base?: Record<string, any>;
    sm?: Record<string, any>;
    md?: Record<string, any>;
    lg?: Record<string, any>;
    xl?: Record<string, any>;
    '2xl'?: Record<string, any>;
    // Legacy properties for backwards compatibility
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
export type AdvancedAnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'custom';
export type AnimationEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export interface AnimationConfig {
    type: AdvancedAnimationType;
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

// A/B Test Configuration for projects
export interface ABTestVariant {
    name: string;
    config: Record<string, any>;
    weight: number;
}

export interface ABTestGoal {
    name: string;
    type: 'clicks' | 'conversions' | 'time_on_page' | 'scroll_depth' | 'custom';
    target?: number;
}

export interface ABTestConfig {
    id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    goals: ABTestGoal[];
    isActive: boolean;
    startDate?: { seconds: number; nanoseconds: number; };
    endDate?: { seconds: number; nanoseconds: number; };
    results?: Record<string, ExperimentMetrics>;
    createdAt?: { seconds: number; nanoseconds: number; };
}

// =============================================================================
// COMPONENT STUDIO
// =============================================================================
export type EditableComponentID = 'hero' | 'heroSplit' | 'features' | 'services' | 'testimonials' | 'team' | 'cta' | 'slideshow' | 'screenshotCarousel' | 'pricing' | 'faq' | 'portfolio' | 'leads' | 'newsletter' | 'video' | 'howItWorks' | 'footer' | 'header' | 'chatbot' | 'typography' | 'map' | 'menu' | 'banner' | 'colors' | 'products' | 'storeSettings' | 'featuredProducts' | 'categoryGrid' | 'productHero' | 'saleCountdown' | 'trustBadges' | 'recentlyViewed' | 'productReviews' | 'collectionBanner' | 'productBundle' | 'announcementBar' | 'productDetail' | 'categoryProducts' | 'articleContent' | 'productGrid' | 'cart' | 'checkout';
export type ComponentStyles = Record<EditableComponentID, any>;
export type ComponentCategory = 'hero' | 'cta' | 'form' | 'content' | 'navigation' | 'media' | 'other';

export interface ComponentVersion {
    version: number;
    timestamp: { seconds: number; nanoseconds: number; };
    author: string;
    changes: string;
    snapshot: any;
    // Additional metadata
    createdAt?: { seconds: number; nanoseconds: number; };
    createdBy?: string;
    notes?: string;
    styles?: any;
}

export interface ComponentVariant {
    id: string;
    name: string;
    description?: string;
    styles: any;
    thumbnail?: string;
    isDefault?: boolean;
    createdAt?: { seconds: number; nanoseconds: number; } | string;
}

export interface ComponentPermissions {
    canEdit: string[];
    canView: string[];
    isPublic: boolean;
    creator?: string;
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
    versions?: ComponentVersion[]; // Array of all versions
    versionHistory?: ComponentVersion[];
    currentVersion?: number;
    lastModified?: { seconds: number; nanoseconds: number; };
    modifiedBy?: string;

    // Organization
    category?: ComponentCategory;
    tags?: string[];
    thumbnail?: string;

    // Variants
    variants?: ComponentVariant[];
    activeVariant?: string; // ID of the currently active variant

    // Permissions & Usage
    permissions?: ComponentPermissions;
    isPublic?: boolean;
    createdBy?: string;

    // Metadata
    createdAt: { seconds: number; nanoseconds: number; };
    updatedAt?: { seconds: number; nanoseconds: number; };
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

