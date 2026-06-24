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

export interface RestaurantBlueprint extends BlueprintModuleState {
    menuSignals: string[];
    reservationRules: string[];
    ecommerceOffers: string[];
}

export interface RealEstateBlueprint extends BlueprintModuleState {
    listingTypes: string[];
    leadTypes: string[];
    digitalProducts: string[];
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
export type CrossModuleSyncModule = 'chatbot' | 'leads' | 'emailMarketing' | 'analytics';

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
