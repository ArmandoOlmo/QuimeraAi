/**
 * Onboarding Types
 * Tipos para el flujo de onboarding con AI
 */

import { PageSection } from './ui';

// =============================================================================
// STEP TYPES
// =============================================================================

export type OnboardingWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ONBOARDING_STEPS = {
    BUSINESS_INFO: 1 as OnboardingWizardStep,
    DESCRIPTION: 2 as OnboardingWizardStep,
    SERVICES: 3 as OnboardingWizardStep,
    TEMPLATE_SELECT: 4 as OnboardingWizardStep,
    CONTACT_INFO: 5 as OnboardingWizardStep,
    STORE_SETUP: 6 as OnboardingWizardStep,
    GENERATION: 7 as OnboardingWizardStep,
};

// =============================================================================
// ECOMMERCE INDUSTRIES (auto-suggest ecommerce toggle)
// =============================================================================

export const ECOMMERCE_INDUSTRIES = [
    'retail',
    'fashion',
    'jewelry',
    'electronics',
    'home-decor',
    'sports-equipment',
    'crafts',
    'beauty-products',
    'food-products',
    'ecommerce',
];

// =============================================================================
// STORE SETUP (for ecommerce onboarding)
// =============================================================================

export type EcommerceType = 'physical' | 'digital' | 'both';
export type ShippingType = 'local' | 'national' | 'international' | 'digital_only';

export interface OnboardingStoreSetup {
    storeName: string;
    currency: string;
    currencySymbol: string;
    shippingType: ShippingType;
    suggestedCategories: string[];
    selectedCategories: string[];
}

// =============================================================================
// CONTACT INFO
// =============================================================================

export interface OnboardingContactInfo {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    // Social Media
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    // Business Hours
    businessHours?: BusinessHours;
}

export interface BusinessHours {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
}

export interface DayHours {
    isOpen: boolean;
    openTime?: string;  // "09:00"
    closeTime?: string; // "18:00"
}

// =============================================================================
// SERVICE ITEM
// =============================================================================

export interface OnboardingService {
    id: string;
    name: string;
    description?: string;
    price?: string;
    isAIGenerated?: boolean;
}

// =============================================================================
// TEMPLATE RECOMMENDATION
// =============================================================================

export interface TemplateRecommendation {
    templateId: string;
    templateName: string;
    matchScore: number;  // 0-100
    matchReasons: string[];
    suggestedComponents: PageSection[];
    disabledComponents: PageSection[];
}

// =============================================================================
// IMAGE GENERATION PROGRESS
// =============================================================================

export interface ImageGenerationItem {
    id: string;
    promptKey: string;  // e.g., "hero.imageUrl", "features.items[0].imageUrl"
    prompt: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    imageUrl?: string;
    error?: string;
    estimatedTime?: number;  // seconds
    startedAt?: number;
    completedAt?: number;
}

export interface GenerationProgress {
    phase: 'idle' | 'content' | 'images' | 'finalizing' | 'completed' | 'error';
    contentProgress: number;  // 0-100
    imagesTotal: number;
    imagesCompleted: number;
    currentImage?: ImageGenerationItem;
    allImages: ImageGenerationItem[];
    error?: string;
    startedAt?: number;
    completedAt?: number;
}

// =============================================================================
// MAIN ONBOARDING PROGRESS
// =============================================================================

export interface OnboardingProgress {
    // Current step
    step: OnboardingWizardStep;
    
    // Step 1: Business Info
    businessName: string;
    industry: string;
    subIndustry?: string;
    
    // Step 1: Ecommerce Option
    hasEcommerce?: boolean;
    ecommerceType?: EcommerceType;
    
    // Step 2: Description
    description?: string;
    tagline?: string;
    
    // Step 3: Services
    services?: OnboardingService[];
    
    // Step 4: Template Selection
    selectedTemplateId?: string;
    selectedTemplateName?: string;
    enabledComponents?: PageSection[];
    disabledComponents?: PageSection[];
    aiRecommendation?: TemplateRecommendation;
    
    // Step 5: Contact Info
    contactInfo?: OnboardingContactInfo;
    
    // Step 6: Store Setup (only if hasEcommerce = true)
    storeSetup?: OnboardingStoreSetup;
    
    // Step 7: Generation
    generationProgress?: GenerationProgress;
    generatedProjectId?: string;
    
    // AI Generated Content (cached for preview)
    generatedContent?: Record<string, any>;
    imagePrompts?: Record<string, string>;
    
    // Metadata
    createdAt: { seconds: number; nanoseconds: number };
    updatedAt: { seconds: number; nanoseconds: number };
    language: string;  // 'es' | 'en'
}

// =============================================================================
// ONBOARDING CONTEXT TYPE
// =============================================================================

export interface OnboardingContextType {
    // State
    isOpen: boolean;
    progress: OnboardingProgress | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    
    // Actions
    openOnboarding: () => void;
    closeOnboarding: () => void;
    resetOnboarding: () => Promise<void>;
    
    // Navigation
    goToStep: (step: OnboardingWizardStep) => void;
    nextStep: () => void;
    previousStep: () => void;
    canGoNext: () => boolean;
    canGoPrevious: () => boolean;
    
    // Data Updates
    updateBusinessInfo: (name: string, industry: string, subIndustry?: string) => void;
    updateDescription: (description: string, tagline?: string) => void;
    updateServices: (services: OnboardingService[]) => void;
    updateTemplateSelection: (templateId: string, templateName: string, enabledComponents: PageSection[], disabledComponents: PageSection[]) => void;
    updateContactInfo: (contactInfo: OnboardingContactInfo) => void;
    
    // Ecommerce Updates
    updateEcommerceSettings: (hasEcommerce: boolean, ecommerceType?: EcommerceType) => void;
    updateStoreSetup: (storeSetup: OnboardingStoreSetup) => void;
    
    // AI Assistance
    generateDescription: () => Promise<string>;
    generateServices: () => Promise<OnboardingService[]>;
    getTemplateRecommendation: () => Promise<TemplateRecommendation>;
    generateSuggestedCategories: () => Promise<string[]>;
    
    // Final Generation
    startGeneration: () => Promise<void>;
    
    // Persistence
    saveProgress: () => Promise<void>;
    loadProgress: () => Promise<void>;
}

// =============================================================================
// AI GENERATION PROMPTS
// =============================================================================

export interface OnboardingAIContext {
    businessName: string;
    industry: string;
    description?: string;
    services?: string[];
    language: string;
}

// =============================================================================
// COMPONENT SELECTION FOR INDUSTRIES
// =============================================================================

export const INDUSTRY_COMPONENT_DEFAULTS: Record<string, {
    recommended: PageSection[];
    optional: PageSection[];
    disabled: PageSection[];
}> = {
    'restaurant': {
        recommended: ['header', 'hero', 'menu', 'testimonials', 'map', 'leads', 'footer'],
        optional: ['slideshow', 'team', 'faq', 'newsletter', 'banner'],
        disabled: ['pricing', 'portfolio', 'howItWorks', 'features', 'services'],
    },
    'cafe': {
        recommended: ['header', 'hero', 'menu', 'testimonials', 'map', 'leads', 'footer'],
        optional: ['slideshow', 'team', 'newsletter', 'banner'],
        disabled: ['pricing', 'portfolio', 'howItWorks', 'features', 'services', 'faq'],
    },
    'technology': {
        recommended: ['header', 'hero', 'features', 'pricing', 'testimonials', 'faq', 'cta', 'footer'],
        optional: ['team', 'portfolio', 'video', 'howItWorks', 'newsletter'],
        disabled: ['menu', 'map', 'services', 'banner', 'slideshow'],
    },
    'healthcare': {
        recommended: ['header', 'hero', 'services', 'team', 'testimonials', 'leads', 'map', 'footer'],
        optional: ['faq', 'newsletter', 'video'],
        disabled: ['menu', 'pricing', 'portfolio', 'slideshow', 'banner', 'howItWorks'],
    },
    'consulting': {
        recommended: ['header', 'hero', 'services', 'testimonials', 'team', 'leads', 'cta', 'footer'],
        optional: ['faq', 'portfolio', 'newsletter', 'video'],
        disabled: ['menu', 'map', 'pricing', 'slideshow', 'banner', 'howItWorks'],
    },
    'ecommerce': {
        recommended: ['header', 'hero', 'features', 'testimonials', 'faq', 'newsletter', 'cta', 'footer'],
        optional: ['video', 'howItWorks', 'team'],
        disabled: ['menu', 'map', 'leads', 'services', 'portfolio', 'slideshow'],
    },
    'fitness-gym': {
        recommended: ['header', 'hero', 'services', 'pricing', 'team', 'testimonials', 'leads', 'map', 'footer'],
        optional: ['slideshow', 'video', 'faq', 'newsletter', 'cta'],
        disabled: ['menu', 'portfolio', 'howItWorks', 'banner'],
    },
    'photography': {
        recommended: ['header', 'hero', 'portfolio', 'testimonials', 'pricing', 'leads', 'footer'],
        optional: ['slideshow', 'video', 'faq', 'team'],
        disabled: ['menu', 'map', 'services', 'features', 'howItWorks', 'newsletter', 'banner'],
    },
    'real-estate': {
        recommended: ['header', 'hero', 'portfolio', 'services', 'testimonials', 'leads', 'map', 'footer'],
        optional: ['team', 'faq', 'video', 'slideshow'],
        disabled: ['menu', 'pricing', 'howItWorks', 'newsletter', 'banner'],
    },
    'beauty-spa': {
        recommended: ['header', 'hero', 'services', 'pricing', 'testimonials', 'team', 'leads', 'map', 'footer'],
        optional: ['slideshow', 'faq', 'newsletter', 'video'],
        disabled: ['menu', 'portfolio', 'howItWorks', 'banner'],
    },
    'automotive': {
        recommended: ['header', 'hero', 'services', 'portfolio', 'testimonials', 'leads', 'map', 'footer'],
        optional: ['team', 'faq', 'slideshow', 'video'],
        disabled: ['menu', 'pricing', 'howItWorks', 'newsletter', 'banner'],
    },
    'legal': {
        recommended: ['header', 'hero', 'services', 'team', 'testimonials', 'leads', 'footer'],
        optional: ['faq', 'portfolio', 'map'],
        disabled: ['menu', 'pricing', 'howItWorks', 'newsletter', 'banner', 'slideshow', 'video'],
    },
    'finance': {
        recommended: ['header', 'hero', 'services', 'features', 'testimonials', 'team', 'leads', 'footer'],
        optional: ['faq', 'cta'],
        disabled: ['menu', 'pricing', 'portfolio', 'howItWorks', 'newsletter', 'banner', 'slideshow', 'map', 'video'],
    },
    'construction': {
        recommended: ['header', 'hero', 'services', 'portfolio', 'testimonials', 'leads', 'map', 'footer'],
        optional: ['team', 'faq', 'video'],
        disabled: ['menu', 'pricing', 'howItWorks', 'newsletter', 'banner', 'slideshow'],
    },
    'education': {
        recommended: ['header', 'hero', 'features', 'services', 'testimonials', 'team', 'faq', 'leads', 'footer'],
        optional: ['video', 'pricing', 'newsletter'],
        disabled: ['menu', 'portfolio', 'howItWorks', 'banner', 'slideshow', 'map'],
    },
    'travel': {
        recommended: ['header', 'hero', 'portfolio', 'testimonials', 'leads', 'footer'],
        optional: ['slideshow', 'team', 'faq', 'video', 'newsletter', 'map'],
        disabled: ['menu', 'pricing', 'services', 'howItWorks', 'banner'],
    },
    'event-planning': {
        recommended: ['header', 'hero', 'services', 'portfolio', 'testimonials', 'leads', 'footer'],
        optional: ['team', 'faq', 'pricing', 'slideshow', 'video'],
        disabled: ['menu', 'map', 'howItWorks', 'newsletter', 'banner'],
    },
    'default': {
        recommended: ['header', 'hero', 'features', 'testimonials', 'cta', 'leads', 'footer'],
        optional: ['services', 'team', 'faq', 'newsletter', 'video', 'portfolio'],
        disabled: ['menu', 'map', 'slideshow', 'banner', 'howItWorks', 'pricing'],
    },
};

// Helper to get component defaults for an industry
export const getIndustryComponentDefaults = (industry: string) => {
    return INDUSTRY_COMPONENT_DEFAULTS[industry] || INDUSTRY_COMPONENT_DEFAULTS['default'];
};





