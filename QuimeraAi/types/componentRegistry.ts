import type { PageSection } from './ui';
import type { WebsiteEcommerceBlockType } from './websiteEcommerceBlocks';

export type ComponentRegistryFamily =
    | 'website_content'
    | 'website_ecommerce_block'
    | 'storefront_section'
    | 'product_page_section'
    | 'collection_section'
    | 'appointment_block'
    | 'restaurant_block'
    | 'real_estate_block'
    | 'lead_block'
    | 'global_layout';

export type ComponentBuilder = 'website' | 'storefront' | 'ecommerce';

export type PageIntent =
    | 'website_home'
    | 'service_landing'
    | 'ecommerce_home'
    | 'storefront_home'
    | 'product_collection'
    | 'product_detail'
    | 'restaurant_home'
    | 'appointment_landing'
    | 'real_estate_home'
    | 'portfolio_home'
    | 'blog_home'
    | 'lead_capture'
    | 'local_business_home'
    | 'gallery_home'
    | 'ai_saas_landing';

export type BusinessCapability =
    | 'ecommerce'
    | 'appointments'
    | 'restaurant'
    | 'realEstate'
    | 'digitalProducts'
    | 'services'
    | 'leadGeneration'
    | 'localBusiness'
    | 'contentMarketing'
    | 'portfolio'
    | 'marketplace'
    | 'physicalProducts'
    | 'premiumRetail'
    | 'subscription'
    | 'booking'
    | 'restaurantReservations';

export type ConversionRole =
    | 'awareness'
    | 'trust'
    | 'education'
    | 'lead_capture'
    | 'booking'
    | 'sales'
    | 'catalog_discovery'
    | 'product_discovery'
    | 'retention'
    | 'navigation'
    | 'compliance';

export type VisualDensity = 'minimal' | 'balanced' | 'rich' | 'dense';
export type MobilePriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendedPosition = 'top' | 'early' | 'middle' | 'late' | 'footer';
export type ComponentImplementationStatus = 'rendered' | 'metadata_only' | 'planned';

export type ComponentId =
    | 'hero'
    | 'about'
    | 'services'
    | 'features'
    | 'testimonials'
    | 'faq'
    | 'footer'
    | 'featuredProducts'
    | 'categoryShowcase'
    | 'productCarousel'
    | 'shopCTA'
    | 'leadForm'
    | 'appointmentCTA'
    | 'gallery'
    | 'imageWithText'
    | 'pricing'
    | 'process'
    | 'stats'
    | 'contact'
    | 'collectionBanner'
    | 'productHero'
    | 'saleCountdown'
    | 'trustBadges'
    | 'newsletter'
    | 'header'
    | 'restaurantMenu'
    | 'restaurantReservation'
    | 'restaurantLocation'
    | 'realEstateListings'
    | 'propertySearch'
    | 'neighborhoods'
    | 'storefrontFeaturedProducts'
    | 'storefrontCategoryGrid';

export interface ComponentDataRequirement {
    key: string;
    label: string;
    source: string;
    required: boolean;
    minCount?: number;
    mustBeMerchantApproved?: boolean;
}

export interface ComponentDataAccess {
    reads: string[];
    writes: [];
    canonicalSystem?: 'business-blueprint' | 'ecommerce-engine' | 'restaurant-engine' | 'real-estate-engine' | 'storefront-blueprint' | 'website-builder';
    presentationOwner?: 'website-builder' | 'storefront-builder' | 'ecommerce-admin';
}

export interface ComponentRenderTargets {
    websiteSection?: PageSection;
    websiteEcommerceBlock?: WebsiteEcommerceBlockType;
    storefrontSectionType?: string;
}

export interface ComponentSelectionPolicy {
    canSelect: boolean;
    selectionGuidance: string[];
    antiPatterns: string[];
    confidenceThreshold: number;
}

export interface ComponentRegistryEntry {
    id: ComponentId;
    label: string;
    description: string;
    family: ComponentRegistryFamily;
    implementationStatus: ComponentImplementationStatus;
    visualSupportNotes?: string;
    compatibleBuilders: ComponentBuilder[];
    compatibleIndustries: string[];
    incompatibleIndustries: string[];
    pageIntents: PageIntent[];
    conversionRoles: ConversionRole[];
    requiredModules: BusinessCapability[];
    optionalModules: BusinessCapability[];
    dataRequirements: ComponentDataRequirement[];
    minDataRequired: Record<string, number>;
    recommendedPosition: RecommendedPosition;
    mobilePriority: MobilePriority;
    visualDensity: VisualDensity;
    allowedSources: string[];
    requiredPlan?: string;
    requiredFeature?: string;
    fallbackComponentId?: ComponentId;
    aiSelection: ComponentSelectionPolicy;
    dataAccess: ComponentDataAccess;
    renderTargets?: ComponentRenderTargets;
}

export interface ComponentAvailableData {
    productsCount?: number;
    categoriesCount?: number;
    collectionsCount?: number;
    servicesCount?: number;
    menuItemsCount?: number;
    listingsCount?: number;
    portfolioItemsCount?: number;
    testimonialsCount?: number;
    reviewsCount?: number;
    salesCount?: number;
    hasDraftProducts?: boolean;
    hasMerchantApprovedPromotion?: boolean;
    giftCardsEnabled?: boolean;
    paymentsConfigured?: boolean;
    shippingConfigured?: boolean;
    taxConfigured?: boolean;
}

export interface ComponentSelectionContext {
    builder: ComponentBuilder;
    inputText: string;
    businessName?: string;
    industry: string;
    pageIntent?: PageIntent;
    capabilities?: BusinessCapability[];
    enabledModules?: BusinessCapability[];
    availableData?: ComponentAvailableData;
    existingComponentIds?: ComponentId[];
    existingLayoutVariants?: string[];
}

export interface ComponentScoreBreakdown {
    industryMatch: number;
    pageIntentMatch: number;
    dataAvailability: number;
    conversionGoalMatch: number;
    visualFit: number;
    mobileFit: number;
    penalties: number;
    total: number;
}

export interface SelectedComponentPlanItem {
    componentId: ComponentId;
    implementationStatus: ComponentImplementationStatus;
    confidence: number;
    reason: string;
    score: number;
    scoreBreakdown: ComponentScoreBreakdown;
    recommendedPosition: RecommendedPosition;
    sourceMap: Record<string, string | string[]>;
}

export interface OptionalComponentPlanItem extends SelectedComponentPlanItem {
    optionalReason: string;
}

export interface RejectedComponentPlanItem {
    componentId: ComponentId;
    reason: string;
    score: number;
    scoreBreakdown?: ComponentScoreBreakdown;
}

export interface ComponentPlan {
    pageIntent: PageIntent;
    industry: string;
    capabilities: BusinessCapability[];
    selectedComponents: SelectedComponentPlanItem[];
    optionalComponents: OptionalComponentPlanItem[];
    rejectedComponents: RejectedComponentPlanItem[];
    reasons: string[];
    confidence: number;
    sourceMap: Record<string, string | string[]>;
    warnings: string[];
}

export interface ComponentPlanValidationIssue {
    code:
        | 'unknown_component'
        | 'unknown_variant'
        | 'unknown_style_variant'
        | 'unknown_slot'
        | 'incompatible_builder'
        | 'incompatible_industry'
        | 'incompatible_page_intent'
        | 'missing_required_module'
        | 'missing_data'
        | 'fake_data_risk'
        | 'metadata_only_component'
        | 'planned_component'
        | 'forbidden_storefront_in_website'
        | 'forbidden_ecommerce_write'
        | 'protected_manual_section'
        | 'duplicate_component';
    severity: 'error' | 'warning';
    componentId?: string;
    field?: string;
    message: string;
    fallbackComponentId?: ComponentId;
}

export interface ComponentPlanValidationResult {
    valid: boolean;
    issues: ComponentPlanValidationIssue[];
    warnings: string[];
}
