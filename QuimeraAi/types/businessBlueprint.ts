import type { PageSection } from './ui';
import type { ColorCandidate } from './colorSystem';
import type { IntegrationEventModule, IntegrationEventType } from './integrationEvents';
import type {
    ProductCardVariant,
    StorefrontCatalogSize,
    StorefrontTemplateCompatibility,
    StorefrontThemePresetId,
} from './storefrontTheme';
import type {
    WebsiteEcommerceBlockSettings,
    WebsiteEcommerceBlockSource,
    WebsiteEcommerceBlockType,
} from './websiteEcommerceBlocks';
import type { ComponentId } from './componentRegistry';
import type {
    ComponentBackgroundOption,
    ComponentContentDensity,
    ComponentMediaOption,
    ComponentMobileBehavior,
} from './componentAnatomy';

export type {
    ProductCardVariant,
    StorefrontCatalogSize,
    StorefrontTemplateCompatibility,
    StorefrontThemePresetId,
} from './storefrontTheme';
export type {
    WebsiteEcommerceBlockSettings,
    WebsiteEcommerceBlockSource,
    WebsiteEcommerceBlockType,
} from './websiteEcommerceBlocks';

export const BUSINESS_BLUEPRINT_VERSION = '1.0.0';
export const BUSINESS_BLUEPRINT_SCHEMA_VERSION = 1;

export type BlueprintSource = 'ai-studio' | 'manual' | 'imported';
export type BlueprintStatus = 'draft' | 'generated' | 'configured' | 'published' | 'disabled' | 'needs_review';
export type BlueprintGeneratedBy = 'ai' | 'user' | 'system';

export interface BlueprintReadiness {
    isReady: boolean;
    blockers: string[];
    warnings: string[];
}

export interface BlueprintEditableMetadata {
    generatedBy: BlueprintGeneratedBy;
    generatedByAI?: boolean;
    userModified: boolean;
    lockedFromRegeneration?: boolean;
    generatedAt?: string;
    lastEditedAt?: string;
    lastEditedBy?: string;
    lastSyncedAt?: string;
    updatedAt?: string;
    generationSource?: string;
}

export type BlueprintSourceMap = Record<string, string | string[]>;

export interface BlueprintModuleState {
    enabled: boolean;
    status: BlueprintStatus;
    needsReview: boolean;
    readiness: BlueprintReadiness;
    metadata: BlueprintEditableMetadata;
    sourceMap?: BlueprintSourceMap;
}

export interface BlueprintBusinessProfile extends BlueprintModuleState {
    businessName: string;
    industry: string;
    subIndustry?: string;
    description: string;
    tagline?: string;
    services: Array<{ name: string; description: string }>;
    contactInfo: Record<string, unknown>;
    goals?: string[];
    targetAudience?: string;
}

export interface BlueprintBrandProfile extends BlueprintModuleState {
    colors: Record<string, string>;
    fonts?: string[];
    visualStyle?: string;
    logoUrl?: string;
    isDarkTheme?: boolean;
    colorCandidates?: ColorCandidate[];
    selectedColorCandidateId?: string;
}

export interface WebsiteEcommerceBlockBlueprint extends BlueprintModuleState {
    id: string;
    type: WebsiteEcommerceBlockType;
    source: WebsiteEcommerceBlockSource;
    targetRoute?: string;
    settings?: WebsiteEcommerceBlockSettings;
}

export interface WebsiteSectionBlueprint extends BlueprintModuleState {
    id: string;
    type: PageSection;
    order: number;
    visible: boolean;
    pageIds?: string[];
    settings?: Record<string, unknown>;
    componentId?: ComponentId;
    layoutVariant?: string;
    styleVariant?: string;
    activeSlots?: string[];
    backgroundChoice?: ComponentBackgroundOption;
    mediaTreatment?: ComponentMediaOption;
    density?: ComponentContentDensity;
    mobileBehavior?: ComponentMobileBehavior;
    designPatternIds?: string[];
    designScore?: number;
    designRationale?: string;
    selectionConfidence?: number;
}

export interface WebsiteBlueprint extends BlueprintModuleState {
    pages: Array<{ id: string; title: string; slug: string; sections: PageSection[] }>;
    sections: PageSection[];
    componentOrder?: PageSection[];
    sectionVisibility?: Record<PageSection, boolean>;
    sectionBlueprints?: WebsiteSectionBlueprint[];
    ecommerceBlocks: WebsiteEcommerceBlockBlueprint[];
    leadForms?: string[];
    chatbotPlacement?: 'none' | 'floating' | 'inline' | 'both';
}

export interface StorefrontSectionBlueprint extends BlueprintModuleState {
    id: string;
    type: string;
    order: number;
    settings?: Record<string, unknown>;
    blocks?: Array<Record<string, unknown>>;
    dataSource?: string;
    styleVariant?: string;
}

export interface StorefrontBlueprint extends BlueprintModuleState {
    routeStrategy: 'project-store' | 'subpath-store' | 'custom-domain-store';
    catalogSize?: StorefrontCatalogSize;
    templateCompatibility?: StorefrontTemplateCompatibility;
    themeFallbackChain?: string[];
    templatePreset?: string;
    themePreset?: StorefrontThemePresetId;
    sections: StorefrontSectionBlueprint[];
    productCardVariant?: ProductCardVariant;
    collectionStrategy?: string;
    cartStyle?: string;
    checkoutStyle?: string;
    colorSystem?: Record<string, string>;
    templates: {
        home?: string;
        collection?: string;
        product?: string;
        cart?: string;
        checkoutVisual?: string;
    };
}

export interface StarterProductBlueprint {
    name: string;
    category?: string;
    description?: string;
    suggestedPrice?: number;
    suggestedStock?: number;
    priceSource: 'user-provided' | 'ai-suggested' | 'unset';
    stockSource: 'user-provided' | 'unset';
    status: 'draft' | 'needs_review';
    needsReview?: boolean;
    isPublished?: boolean;
    publishStatus?: 'not_published';
    discountStatus?: 'none' | 'draft';
}

export type EcommerceStarterContentStatus = 'not_started' | 'previewed' | 'created_draft' | 'dismissed';

export interface EcommerceStarterContentRefs {
    categoryIds: string[];
    productIds: string[];
    giftCardIds: string[];
}

export interface EcommerceStarterContentReadiness {
    productsDrafted: boolean;
    needsMerchantReview: boolean;
    paymentsConfigured: false;
    inventoryConfigured: false;
    storefrontPublished: false;
}

export interface EcommerceStarterContentSummary {
    categoriesSuggested?: number;
    productsSuggested?: number;
    giftCardsSuggested?: number;
    categoriesCreated?: number;
    productsCreated?: number;
    giftCardsCreated?: number;
    skipped?: number;
    lastPreviewedAt?: string;
    lastCreatedAt?: string;
    dismissedAt?: string;
}

export interface EcommerceBlueprint extends BlueprintModuleState {
    storeType?: string;
    catalogStrategy?: string;
    categories: string[];
    productCategories?: string[];
    collections?: string[];
    starterProducts: StarterProductBlueprint[];
    inventoryMode: 'manual' | 'tracked' | 'not_configured';
    fulfillmentMode: 'shipping' | 'pickup' | 'shipping_pickup' | 'digital' | 'not_configured';
    paymentMode?: 'not_configured' | 'test' | 'live';
    taxMode?: 'not_configured' | 'manual' | 'automatic';
    shippingMode?: 'not_configured' | 'manual' | 'automatic';
    discounts: Array<{ name: string; status: 'draft' | 'needs_review'; reason?: string }>;
    giftCards: { enabled: boolean; status: 'draft' | 'configured' | 'needs_review' };
    giftCardsEnabled?: boolean;
    digitalProductsEnabled?: boolean;
    recommendations?: string[];
    starterContentStatus?: EcommerceStarterContentStatus;
    createdContentRefs?: EcommerceStarterContentRefs;
    starterContentReadiness?: EcommerceStarterContentReadiness;
    starterContentSummary?: EcommerceStarterContentSummary;
}

export interface ChatbotBlueprint extends BlueprintModuleState {
    businessKnowledge: string[];
    productKnowledge: string[];
    policyKnowledge: string[];
    eventIntents: IntegrationEventType[];
}

export interface LeadBlueprint extends BlueprintModuleState {
    leadSources: string[];
    leadTags: string[];
    activityTimelineEvents: string[];
}

export interface EmailMarketingBlueprint extends BlueprintModuleState {
    flows: Array<{ type: string; status: 'draft' | 'needs_review' | 'configured'; triggerEvent?: IntegrationEventType }>;
    logEvents: IntegrationEventType[];
}

export interface MediaBlueprint extends BlueprintModuleState {
    imageNeeds: string[];
    videoNeeds: string[];
    brandAssetNeeds: string[];
}

export interface AppointmentsBlueprint extends BlueprintModuleState {
    serviceTypes: string[];
    paidBookingTypes: string[];
    availabilityStatus: 'not_configured' | 'draft' | 'configured';
}

export type RestaurantBlueprintDraftStatus = 'draft' | 'needs_review' | 'configured' | 'disabled';
export type RestaurantPublishStatus = 'not_published' | 'published';
export type RestaurantPriceSource = 'user-provided' | 'ai-suggested' | 'unset';
export type RestaurantAvailabilityStatus = 'draft' | 'available' | 'unavailable';
export type RestaurantConfirmationMode = 'manual' | 'auto';
export type RestaurantBlueprintSource = 'ai-studio' | 'manual' | 'imported';
export type RestaurantPublicMenuRouteStrategy = '/menu/:restaurantId';

export interface RestaurantProfileBlueprint {
    name: string;
    cuisineType: string;
    address: string;
    phone: string;
    email?: string;
    hours: string;
    logoUrl?: string;
    heroImageUrl?: string;
    publicSlug?: string;
    languagesEnabled: string[];
    currency: string;
    sourceMap: BlueprintSourceMap;
    readiness: BlueprintReadiness;
}

export interface RestaurantMenuItemDraftBlueprint {
    id: string;
    name: string;
    description: string;
    category: string;
    suggestedPrice?: number;
    currency: string;
    priceSource: RestaurantPriceSource;
    ingredients: string[];
    allergens: string[];
    dietaryTags: string[];
    imagePrompt?: string;
    imageUrl?: string;
    isFeatured: boolean;
    availabilityStatus: RestaurantAvailabilityStatus;
    needsReview: boolean;
    generatedByAI: boolean;
    userModified: boolean;
    lockedFromRegeneration?: boolean;
}

export interface RestaurantMenuDraftBlueprint {
    categories: string[];
    items: RestaurantMenuItemDraftBlueprint[];
    dietaryTags: string[];
    allergens: string[];
    modifiers: string[];
    upsells: string[];
    priceSource: RestaurantPriceSource;
    generatedByAI: boolean;
    userModified: boolean;
    needsReview: boolean;
    status: Extract<RestaurantBlueprintDraftStatus, 'draft' | 'needs_review' | 'configured'>;
    publishStatus: RestaurantPublishStatus;
}

export interface RestaurantReservationBlueprint {
    enabled: boolean;
    status: RestaurantBlueprintDraftStatus;
    maxPartySize: number;
    minPartySize: number;
    reservationInterval: number;
    averageTableDuration: number;
    tablePreferences: string[];
    capacityRules: string[];
    depositRequired: boolean;
    depositProductId?: string;
    cancellationPolicy: string;
    confirmationMode: RestaurantConfirmationMode;
    source: RestaurantBlueprintSource;
    needsReview: boolean;
    readiness: BlueprintReadiness;
}

export interface RestaurantPublicMenuBlueprint {
    enabled: boolean;
    qrMenuEnabled: boolean;
    routeStrategy: RestaurantPublicMenuRouteStrategy;
    qrCodeStatus: RestaurantBlueprintDraftStatus | 'not_generated';
    categoryNavigationEnabled: boolean;
    stickyCtaEnabled: boolean;
    showCallButton: boolean;
    showMapButton: boolean;
    showReserveButton: boolean;
    themePreset: string;
    menuVariant: string;
    mobileBehavior: 'sticky_actions' | 'simple_stack';
}

export interface RestaurantEcommerceOfferItemBlueprint {
    enabled: boolean;
    status: RestaurantBlueprintDraftStatus;
    ecommerceProductDraftId?: string;
    needsReview: boolean;
}

export interface RestaurantEcommerceOffersBlueprint {
    giftCards: RestaurantEcommerceOfferItemBlueprint;
    cateringPackages: RestaurantEcommerceOfferItemBlueprint;
    eventTickets: RestaurantEcommerceOfferItemBlueprint;
    reservationDeposits: RestaurantEcommerceOfferItemBlueprint;
    mealKits: RestaurantEcommerceOfferItemBlueprint;
    merch: RestaurantEcommerceOfferItemBlueprint;
}

export interface RestaurantIntegrationBlueprint {
    chatbotKnowledgeSources: string[];
    crmLeadSources: string[];
    crmTags: string[];
    emailFlows: string[];
    analyticsEvents: string[];
    financeRevenueSources: string[];
    automationFlows: string[];
}

export interface RestaurantBlueprint extends BlueprintModuleState {
    profile: RestaurantProfileBlueprint;
    menuDraft: RestaurantMenuDraftBlueprint;
    reservations: RestaurantReservationBlueprint;
    publicMenu: RestaurantPublicMenuBlueprint;
    ecommerceOffers: RestaurantEcommerceOffersBlueprint;
    integrations: RestaurantIntegrationBlueprint;
    menuSignals: string[];
    reservationRules: string[];
    legacyEcommerceOffers: string[];
}

export type RealEstateBlueprintDraftStatus = 'draft' | 'needs_review' | 'configured' | 'disabled';
export type RealEstateListingDraftStatus = 'draft' | 'needs_review' | 'active' | 'archived';
export type RealEstateCampaignDraftStatus = 'draft' | 'needs_review' | 'scheduled' | 'active' | 'archived';
export type RealEstatePriceSource = 'user-provided' | 'ai-suggested' | 'imported' | 'unset';
export type RealEstateTransactionType = 'sale' | 'rent' | 'lease';
export type RealEstatePropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'land' | 'commercial';
export type RealEstateCampaignType =
    | 'just_listed'
    | 'open_house'
    | 'price_drop'
    | 'luxury_showcase'
    | 'investment_opportunity'
    | 'rental_available'
    | 'seller_lead_magnet'
    | 'social'
    | 'email'
    | 'ads';
export type RealEstateCampaignChannel = 'social' | 'email' | 'sms' | 'ads' | 'landing';
export type RealEstateShowingAvailabilitySource = 'manual' | 'appointments' | 'calendar' | 'unset';
export type RealEstateConfirmationMode = 'manual' | 'auto';
export type RealEstateAveragePriceSource = 'manual' | 'imported' | 'ai-suggested' | 'unset';
export type RealEstateImportSource = 'manual' | 'csv' | 'imported-url' | 'mls' | 'idx' | 'api' | 'external-feed';

export type RealEstateEngineArtifactKey =
    | 'business_blueprint'
    | 'website'
    | 'profile'
    | 'listings'
    | 'property_pages'
    | 'directory'
    | 'open_houses'
    | 'showing_requests'
    | 'lead_funnels'
    | 'campaigns'
    | 'chatbot_knowledge'
    | 'email_automations'
    | 'crm_pipeline'
    | 'appointments'
    | 'ecommerce_products'
    | 'finance'
    | 'analytics'
    | 'monetization';

export interface RealEstateEngineArtifactBlueprint {
    id: string;
    key: RealEstateEngineArtifactKey;
    module: IntegrationEventModule;
    title: string;
    description: string;
    status: RealEstateBlueprintDraftStatus;
    needsReview: boolean;
    generatedByAI: boolean;
    userModified: boolean;
    lockedFromRegeneration?: boolean;
    sourceMap: BlueprintSourceMap;
    dependencies?: string[];
    analyticsEvents?: IntegrationEventType[];
    draftRefs?: string[];
}

export interface RealEstateWebsiteRoutesBlueprint {
    profile: string;
    directory: string;
    propertyDetail: string;
    openHouses: string;
}

export interface RealEstateAgentProfileBlueprint {
    name: string;
    email: string;
    phone: string;
    photoUrl?: string;
    licenseNumber?: string;
    brokerageName?: string;
    brokerageLogoUrl?: string;
    bio: string;
    specialties: string[];
    serviceAreas: string[];
    languages: string[];
    website?: string;
    socialLinks: Record<string, string>;
    complianceNotes: string[];
    sourceMap: BlueprintSourceMap;
    readiness: BlueprintReadiness;
}

export interface RealEstateBrokerageProfileBlueprint {
    name: string;
    licenseNumber?: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    brandStyle?: string;
    officeLocations: string[];
    teamMembers: Array<{ name: string; role?: string; email?: string; phone?: string; photoUrl?: string }>;
    sourceMap: BlueprintSourceMap;
    readiness: BlueprintReadiness;
}

export interface RealEstateListingDraftBlueprint {
    id: string;
    title: string;
    slug: string;
    descriptionShort: string;
    descriptionLong: string;
    price?: number;
    currency: string;
    priceSource: RealEstatePriceSource;
    transactionType: RealEstateTransactionType;
    propertyType: RealEstatePropertyType;
    address: string;
    city: string;
    state?: string;
    country?: string;
    postalCode?: string;
    bedrooms?: number;
    bathrooms?: number;
    halfBathrooms?: number;
    area?: number;
    areaUnit: 'sqft' | 'sqm';
    lotSize?: number;
    parkingSpaces?: number;
    yearBuilt?: number;
    hoaFee?: number;
    taxes?: number;
    amenities: string[];
    features: string[];
    highlights: string[];
    imagePrompts: string[];
    images: string[];
    videoUrl?: string;
    virtualTourUrl?: string;
    isFeatured: boolean;
    status: RealEstateListingDraftStatus;
    publicEnabled: boolean;
    needsReview: boolean;
    generatedByAI: boolean;
    userModified: boolean;
    lockedFromRegeneration?: boolean;
    listingScore?: number;
    sourceMap: BlueprintSourceMap;
}

export interface RealEstateLeadFunnelBlueprint {
    buyerLeadEnabled: boolean;
    sellerLeadEnabled: boolean;
    renterLeadEnabled: boolean;
    investorLeadEnabled: boolean;
    valuationCtaEnabled: boolean;
    buyerGuideEnabled: boolean;
    sellerGuideEnabled: boolean;
    contactFormEnabled: boolean;
    propertyInquiryEnabled: boolean;
    openHouseRegistrationEnabled: boolean;
    showingRequestEnabled: boolean;
    leadTags: string[];
    leadSources: string[];
    crmPipelineStages: string[];
    needsReview: boolean;
    readiness: BlueprintReadiness;
}

export interface RealEstateShowingRequestBlueprint {
    enabled: boolean;
    status: RealEstateBlueprintDraftStatus;
    availabilitySource: RealEstateShowingAvailabilitySource;
    preferredDateEnabled: boolean;
    preferredTimeEnabled: boolean;
    buyerQualificationFields: string[];
    financingStatusField: boolean;
    budgetField: boolean;
    assignedAgentStrategy: string;
    confirmationMode: RealEstateConfirmationMode;
    remindersEnabled: boolean;
    appointmentIntegrationEnabled: boolean;
    needsReview: boolean;
    readiness: BlueprintReadiness;
}

export interface RealEstateOpenHouseBlueprint {
    enabled: boolean;
    defaultDurationMinutes: number;
    registrationEnabled: boolean;
    capacityEnabled: boolean;
    reminderFlowEnabled: boolean;
    followUpFlowEnabled: boolean;
    status: Extract<RealEstateBlueprintDraftStatus, 'draft' | 'needs_review' | 'configured'>;
    needsReview: boolean;
    readiness: BlueprintReadiness;
}

export interface RealEstateCampaignItemBlueprint {
    id: string;
    type: RealEstateCampaignType;
    title: string;
    targetAudience: string;
    channels: RealEstateCampaignChannel[];
    status: RealEstateCampaignDraftStatus;
    generatedByAI: boolean;
    userModified: boolean;
    sourceMap: BlueprintSourceMap;
}

export interface RealEstateCampaignBlueprint {
    campaigns: RealEstateCampaignItemBlueprint[];
}

export interface RealEstatePublicDirectoryBlueprint {
    enabled: boolean;
    route: '/listados';
    filtersEnabled: boolean;
    searchEnabled: boolean;
    mapViewEnabled: boolean;
    gridViewEnabled: boolean;
    listViewEnabled: boolean;
    savedSearchEnabled: boolean;
    compareListingsEnabled: boolean;
    featuredListingsEnabled: boolean;
    mortgageCalculatorEnabled: boolean;
    stickyCtaEnabled: boolean;
    seoEnabled: boolean;
    schemaEnabled: boolean;
    status: RealEstateBlueprintDraftStatus;
    needsReview: boolean;
    readiness: BlueprintReadiness;
}

export interface RealEstatePropertyPageBlueprint {
    enabled: boolean;
    routePattern: '/listados/:slug';
    galleryEnabled: boolean;
    virtualTourEnabled: boolean;
    mapEnabled: boolean;
    contactFormEnabled: boolean;
    showingRequestEnabled: boolean;
    openHouseRegistrationEnabled: boolean;
    relatedListingsEnabled: boolean;
    documentsGateEnabled: boolean;
    mortgageCalculatorEnabled: boolean;
    schemaEnabled: boolean;
    stickyMobileCtaEnabled: boolean;
    status: RealEstateBlueprintDraftStatus;
    needsReview: boolean;
}

export interface RealEstateNeighborhoodItemBlueprint {
    name: string;
    city: string;
    description: string;
    highlights: string[];
    averagePriceSource: RealEstateAveragePriceSource;
    listingFilter: Record<string, unknown>;
    status: Extract<RealEstateBlueprintDraftStatus, 'draft' | 'needs_review'>;
    generatedByAI: boolean;
    needsReview: boolean;
}

export interface RealEstateNeighborhoodBlueprint {
    enabled: boolean;
    neighborhoods: RealEstateNeighborhoodItemBlueprint[];
}

export interface RealEstateChatbotBlueprint {
    knowledgeSources: string[];
    supportedQuestions: string[];
    intents: Array<
        | 'property_inquiry'
        | 'showing_request'
        | 'open_house_registration'
        | 'buyer_lead'
        | 'seller_lead'
        | 'renter_lead'
        | 'investor_lead'
        | 'valuation_request'
        | 'financing_question'
        | 'neighborhood_question'
        | 'agent_handoff'
    >;
}

export interface RealEstateEmailMarketingBlueprint {
    flows: Array<
        | 'new_property_inquiry'
        | 'showing_request_confirmation'
        | 'showing_reminder'
        | 'open_house_registration'
        | 'open_house_reminder'
        | 'post_showing_follow_up'
        | 'new_listing_alert'
        | 'price_drop_alert'
        | 'seller_valuation_follow_up'
        | 'buyer_guide_delivery'
        | 'seller_guide_delivery'
        | 'inactive_buyer_nurture'
        | 'agent_new_lead_alert'
    >;
}

export interface RealEstateAnalyticsBlueprint {
    events: Array<
        | 'property_view'
        | 'listing_search'
        | 'filter_used'
        | 'property_saved'
        | 'property_shared'
        | 'gallery_opened'
        | 'virtual_tour_clicked'
        | 'map_clicked'
        | 'contact_started'
        | 'lead_submitted'
        | 'showing_requested'
        | 'open_house_registered'
        | 'campaign_generated'
        | 'ai_listing_generated'
        | 'valuation_requested'
    >;
}

export interface RealEstateEcommerceOfferItemBlueprint {
    enabled: boolean;
    status: RealEstateBlueprintDraftStatus;
    ecommerceProductDraftId?: string;
    priceSource: RealEstatePriceSource;
    needsReview: boolean;
}

export interface RealEstateEcommerceOfferBlueprint {
    buyerGuides: RealEstateEcommerceOfferItemBlueprint;
    sellerGuides: RealEstateEcommerceOfferItemBlueprint;
    marketReports: RealEstateEcommerceOfferItemBlueprint;
    consultationPackages: RealEstateEcommerceOfferItemBlueprint;
    valuationPackages: RealEstateEcommerceOfferItemBlueprint;
    premiumListingPackages: RealEstateEcommerceOfferItemBlueprint;
    courses: RealEstateEcommerceOfferItemBlueprint;
    digitalDownloads: RealEstateEcommerceOfferItemBlueprint;
}

export interface RealEstateIntegrationBlueprint {
    crmTags: string[];
    crmLeadSources: string[];
    crmPipelineStages: string[];
    emailFlows: string[];
    chatbotKnowledgeSources: string[];
    analyticsEvents: string[];
    financeRevenueSources: string[];
    automationFlows: string[];
    appointmentIntegration: boolean;
}

export interface RealEstateBlueprint extends BlueprintModuleState {
    profileType: 'agent' | 'brokerage' | 'team' | 'developer';
    agentProfile: RealEstateAgentProfileBlueprint;
    brokerageProfile: RealEstateBrokerageProfileBlueprint;
    listingDrafts: RealEstateListingDraftBlueprint[];
    websiteRoutes: RealEstateWebsiteRoutesBlueprint;
    listingTypes: string[];
    leadTypes: string[];
    pageTypes: string[];
    leadFunnels: RealEstateLeadFunnelBlueprint;
    showingRequests: RealEstateShowingRequestBlueprint;
    openHouses: RealEstateOpenHouseBlueprint;
    campaigns: RealEstateCampaignBlueprint;
    publicDirectory: RealEstatePublicDirectoryBlueprint;
    propertyPages: RealEstatePropertyPageBlueprint;
    neighborhoods: RealEstateNeighborhoodBlueprint;
    chatbot: RealEstateChatbotBlueprint;
    emailMarketing: RealEstateEmailMarketingBlueprint;
    analytics: RealEstateAnalyticsBlueprint;
    ecommerceOffers: RealEstateEcommerceOfferBlueprint;
    integrations: RealEstateIntegrationBlueprint;
    campaignTypes: string[];
    chatbotKnowledge: string[];
    emailAutomations: Array<{ type: string; status: RealEstateBlueprintDraftStatus; triggerEvent?: IntegrationEventType; needsReview: boolean }>;
    crmPipelineStages: string[];
    analyticsEvents: IntegrationEventType[];
    digitalProducts: string[];
    monetizationOffers: string[];
    financeRevenueSources: string[];
    engineArtifacts: RealEstateEngineArtifactBlueprint[];
    importArchitecture?: {
        sources: RealEstateImportSource[];
        duplicateMatchKeys: string[];
        defaultStatus: 'draft';
        needsReview: true;
    };
}

export interface FinanceBlueprint extends BlueprintModuleState {
    trackedMetrics: string[];
    revenueSources: string[];
    refundSources: string[];
}

export interface AnalyticsBlueprint extends BlueprintModuleState {
    events: IntegrationEventType[];
    dashboards: string[];
}

export interface AutomationBlueprint extends BlueprintModuleState {
    flows: Array<{
        id: string;
        name: string;
        sourceModule: IntegrationEventModule;
        triggerEvent: IntegrationEventType;
        status: 'draft' | 'needs_review' | 'configured';
    }>;
}

export type CrossModuleSyncStatus = 'not_started' | 'previewed' | 'synced_draft' | 'dismissed';
export type CrossModuleSyncModuleStatus = 'not_started' | 'previewed' | 'synced_draft' | 'skipped';
export type CrossModuleSyncModule = 'chatbot' | 'leads' | 'emailMarketing' | 'analytics' | 'appointments' | 'ecommerce' | 'finance';

export interface CrossModuleSyncDraft {
    id: string;
    syncKey: string;
    module: CrossModuleSyncModule;
    itemType: string;
    name: string;
    status: 'draft';
    enabled: false;
    active: false;
    needsReview: true;
    generatedByAI: true;
    userModified: boolean;
    safeToEdit: true;
    source: 'ai-studio-c3';
    createdAt: string;
    updatedAt: string;
    description?: string;
    content?: string;
    triggerType?: string;
    subjectDraft?: string;
    bodyOutlineDraft?: string;
    variablesNeeded?: string[];
    readinessBlockers?: string[];
    metadata?: Record<string, unknown>;
}

export interface CrossModuleSyncModuleState {
    status: CrossModuleSyncModuleStatus;
    refs: string[];
    drafts: CrossModuleSyncDraft[];
}

export interface CrossModuleSyncReadiness {
    chatbotReady: boolean;
    leadTagsReady: boolean;
    emailFlowsReady: boolean;
    analyticsReady: boolean;
    appointmentsReady?: boolean;
    ecommerceOffersReady?: boolean;
    financeReady?: boolean;
    needsMerchantReview: boolean;
}

export interface CrossModuleSyncState {
    status: CrossModuleSyncStatus;
    syncedAt?: string;
    previewedAt?: string;
    chatbot?: CrossModuleSyncModuleState;
    leads?: CrossModuleSyncModuleState;
    emailMarketing?: CrossModuleSyncModuleState;
    analytics?: CrossModuleSyncModuleState;
    appointments?: CrossModuleSyncModuleState;
    ecommerce?: CrossModuleSyncModuleState;
    finance?: CrossModuleSyncModuleState;
    warnings: string[];
    readiness: CrossModuleSyncReadiness;
}

export interface BusinessBlueprint {
    blueprintVersion: string;
    schemaVersion: typeof BUSINESS_BLUEPRINT_SCHEMA_VERSION;
    generatedAt: string;
    updatedAt?: string;
    lastSyncedAt?: string;
    source: BlueprintSource;
    tenantId?: string;
    projectId?: string;
    workspaceId?: string;
    createdBy?: string;
    status: BlueprintStatus;
    readiness: BlueprintReadiness;
    sourceMap: BlueprintSourceMap;
    metadata: BlueprintEditableMetadata;
    businessProfile: BlueprintBusinessProfile;
    brandProfile: BlueprintBrandProfile;
    websiteBlueprint: WebsiteBlueprint;
    storefrontBlueprint: StorefrontBlueprint;
    ecommerceBlueprint: EcommerceBlueprint;
    chatbotBlueprint: ChatbotBlueprint;
    leadBlueprint: LeadBlueprint;
    emailMarketingBlueprint: EmailMarketingBlueprint;
    mediaBlueprint: MediaBlueprint;
    appointmentsBlueprint: AppointmentsBlueprint;
    restaurantBlueprint: RestaurantBlueprint;
    realEstateBlueprint: RealEstateBlueprint;
    financeBlueprint: FinanceBlueprint;
    analyticsBlueprint: AnalyticsBlueprint;
    automationBlueprint: AutomationBlueprint;
    crossModuleSync?: CrossModuleSyncState;
}

export type BusinessBlueprintModuleKey =
    | 'businessProfile'
    | 'brandProfile'
    | 'websiteBlueprint'
    | 'storefrontBlueprint'
    | 'ecommerceBlueprint'
    | 'chatbotBlueprint'
    | 'leadBlueprint'
    | 'emailMarketingBlueprint'
    | 'mediaBlueprint'
    | 'appointmentsBlueprint'
    | 'restaurantBlueprint'
    | 'realEstateBlueprint'
    | 'financeBlueprint'
    | 'analyticsBlueprint'
    | 'automationBlueprint';
