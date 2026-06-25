import type { AnimationType } from './ui';
import type { LeadStatus } from './business';

export type ISODateString = string;
export type PropertyStatus = 'draft' | 'active' | 'pending' | 'sold' | 'archived';
export type PropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'land' | 'commercial';
export type TransactionType = 'sale' | 'rent' | 'lease';
export type LeadStage = LeadStatus | 'showing_scheduled' | 'completed' | 'offer_made' | 'closed';
export type LeadType = 'buyer' | 'seller' | 'renter' | 'investor' | 'agent' | 'other';
export type CampaignType =
    | 'just_listed'
    | 'open_house'
    | 'price_drop'
    | 'luxury_showcase'
    | 'investment_opportunity'
    | 'rental_available'
    | 'last_units'
    | 'seller_lead_magnet'
    | 'social'
    | 'email'
    | 'ads'
    | 'print'
    | 'other';
export type RealtyCampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
export type RealtyOpenHouseStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type RealtyPropertyStatus = PropertyStatus;
export type RealtyPropertyType = PropertyType;
export type RealtyLeadStatus = LeadStage;
export type RealtyAiTone =
    | 'luxury'
    | 'family'
    | 'investment'
    | 'modern'
    | 'beach'
    | 'urban'
    | 'commercial'
    | 'rental'
    | 'new_development';
export type RealtyAiLanguage = 'es' | 'en';
export type RealtyListingGrade = 'excellent' | 'good' | 'needs_work' | 'poor';
export type RealtyImportSource = 'manual' | 'csv' | 'imported-url' | 'mls' | 'idx' | 'api' | 'external-feed';
export type RealtyImportSyncMode = 'manual' | 'scheduled' | 'webhook' | 'disabled';
export type RealtyImportJobStatus = 'draft' | 'mapping_required' | 'ready_for_review' | 'completed' | 'failed' | 'cancelled';
export type RealtyExternalListingReviewStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';
export type RealtyDuplicateReviewStatus = 'none' | 'possible_duplicate' | 'confirmed_duplicate' | 'not_duplicate';
export type RealtyDuplicateMatchKey = 'externalId' | 'slug' | 'address' | 'projectId' | 'title' | 'price';

export interface RealtyFaqItem {
    question: string;
    answer: string;
}

export interface RealtyAiListingOutput {
    title: string;
    descriptionShort: string;
    descriptionLong: string;
    highlights: string[];
    features: string[];
    amenitiesCopy: string;
    cta: string;
    faq: RealtyFaqItem[];
    seoTitle: string;
    seoDescription: string;
    socialPost: string;
    emailCopy: string;
    smsCopy: string;
    adCopy: string;
}

export interface RealtyCampaignAiOutput {
    title: string;
    goal: string;
    audience: string;
    mainCopy: string;
    socialPost: string;
    emailSubject: string;
    emailBody: string;
    smsCopy: string;
    adHeadline: string;
    adPrimaryText: string;
    cta: string;
    hashtags: string[];
}

export interface RealtyListingScore {
    score: number;
    grade: RealtyListingGrade;
    missingRequired: string[];
    missingRecommended: string[];
    recommendations: string[];
}

export interface RealtyImportSourceConfig {
    id: string;
    tenantId?: string | null;
    projectId: string;
    userId?: string | null;
    sourceType: RealtyImportSource;
    name: string;
    providerName?: string;
    feedUrl?: string;
    uploadedFileName?: string;
    externalAccountId?: string;
    syncMode: RealtyImportSyncMode;
    enabled: boolean;
    status: 'draft' | 'needs_review' | 'configured' | 'disabled';
    lastRunAt?: ISODateString | null;
    metadata?: Record<string, unknown>;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
}

export interface RealtyImportMapping {
    sourceField: string;
    targetField: keyof RealtyProperty | 'externalId' | 'rawPayload' | 'metadata';
    required?: boolean;
    transform?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'json';
    fallback?: unknown;
}

export interface RealtyImportJob {
    id: string;
    tenantId?: string | null;
    projectId: string;
    userId?: string | null;
    sourceId?: string | null;
    sourceType: RealtyImportSource;
    status: RealtyImportJobStatus;
    mapping: RealtyImportMapping[];
    totalRows: number;
    draftCount: number;
    duplicateCount: number;
    errorCount: number;
    needsReview: true;
    noAutoPublish: true;
    startedAt?: ISODateString | null;
    completedAt?: ISODateString | null;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface RealtyDuplicateMatch {
    existingPropertyId: string;
    confidence: number;
    matchKeys: RealtyDuplicateMatchKey[];
    reason: string;
    existingSlug?: string;
    existingTitle?: string;
    existingExternalId?: string;
    existingSourceType?: RealtyImportSource | string;
}

export interface RealtyExternalListingDraft extends Omit<Partial<RealtyProperty>, 'status' | 'publicEnabled'> {
    externalId?: string;
    importJobId?: string;
    sourceType: RealtyImportSource;
    sourceName?: string;
    sourceUrl?: string;
    syncKey: string;
    status: 'draft';
    importReviewStatus: RealtyExternalListingReviewStatus;
    duplicateReviewStatus: RealtyDuplicateReviewStatus;
    duplicateMatches: RealtyDuplicateMatch[];
    publicEnabled: false;
    needsReview: true;
    noAutoPublish: true;
    generatedByAI: false;
    userModified: false;
    lockedFromRegeneration: false;
    rawPayload?: Record<string, unknown>;
    sourceMap: Record<string, string>;
    reviewWarnings: string[];
}

export type RealtyPermissionKey =
    | 'real_estate.view'
    | 'real_estate.manage'
    | 'real_estate.properties'
    | 'real_estate.leads'
    | 'real_estate.ai'
    | 'real_estate.settings';

export interface RealtyModuleFlags {
    real_estate_enabled: boolean;
    real_estate_ai_enabled: boolean;
    real_estate_public_directory_enabled: boolean;
}

export interface RealtyModuleSettings {
    id?: string;
    tenantId?: string | null;
    projectId?: string | null;
    moduleKey?: 'real_estate';
    enabled: boolean;
    flags: RealtyModuleFlags;
    settings?: Record<string, unknown>;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
}

export interface RealtyImage {
    id: string;
    url: string;
    storagePath?: string | null;
    mediaType?: 'image' | 'video' | 'tour' | 'document' | string;
    altText?: string;
    position: number;
    isPrimary?: boolean;
    metadata?: Record<string, unknown>;
}

export interface RealtyMediaUploadResult extends RealtyImage {
    bucket: 'property-media';
    storagePath: string;
}

export interface RealtyProperty {
    id: string;
    tenantId?: string | null;
    projectId: string;
    userId?: string | null;
    createdBy?: string | null;
    title: string;
    slug: string;
    description: string;
    descriptionShort?: string;
    descriptionLong?: string;
    price: number;
    currency: string;
    transactionType?: TransactionType;
    address: string;
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    state?: string;
    country?: string;
    zipCode?: string;
    postalCode?: string;
    propertyType: RealtyPropertyType;
    status: RealtyPropertyStatus;
    bedrooms: number;
    bathrooms: number;
    halfBathrooms?: number;
    area: number;
    areaUnit: 'sqft' | 'sqm';
    lotSize?: number;
    lotSqft?: number;
    parkingSpaces?: number;
    yearBuilt?: number;
    hoaFee?: number;
    taxes?: number;
    latitude?: number;
    longitude?: number;
    amenities: string[];
    features?: string[];
    highlights?: string[];
    images: RealtyImage[];
    mainImageUrl?: string;
    videoUrl?: string;
    virtualTourUrl?: string;
    agentId?: string | null;
    seoTitle?: string;
    seoDescription?: string;
    listingScore?: number;
    leadCount?: number;
    isFeatured: boolean;
    publicEnabled?: boolean;
    publishedAt?: ISODateString | null;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface RealtyLead {
    id: string;
    tenantId?: string | null;
    projectId: string;
    propertyId?: string | null;
    name: string;
    email: string;
    phone?: string;
    message?: string;
    preferredDate?: string;
    budget?: number;
    status: RealtyLeadStatus;
    leadType?: LeadType;
    crmLeadId?: string | null;
    source: 'manual' | 'website' | 'ai' | 'import';
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface RealtyAgent {
    id: string;
    tenantId?: string | null;
    projectId?: string | null;
    userId?: string | null;
    name: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    licenseNumber?: string;
    bio?: string;
    metadata?: Record<string, unknown>;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
}

export interface RealtyAiGeneration {
    id: string;
    tenantId?: string | null;
    projectId: string;
    propertyId?: string | null;
    userId?: string | null;
    kind: 'listing_description' | 'social_post' | 'lead_follow_up' | 'market_brief';
    prompt: string;
    output: string;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt?: ISODateString;
}

export interface RealEstateProfile {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    brokerageName?: string | null;
    licenseNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    settings?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyMedia extends RealtyImage {
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyDocument {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId: string;
    fileName: string;
    fileUrl?: string | null;
    storagePath?: string | null;
    documentType?: string;
    isPrivate: boolean;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyLead {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId: string;
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
    stage: LeadStage;
    leadType: LeadType;
    preferredDate?: ISODateString | null;
    budget?: number | null;
    source: string;
    crmLeadId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyLeadEvent {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId?: string | null;
    propertyLeadId: string;
    eventType: string;
    note?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyAiGeneration extends RealtyAiGeneration {
    userId: string;
    projectId: string;
    tenantId?: string | null;
}

export interface PropertyCampaign {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId?: string | null;
    campaignType: CampaignType;
    title: string;
    status?: RealtyCampaignStatus | string;
    content?: Record<string, unknown>;
    scheduledAt?: ISODateString | null;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface PropertyOpenHouse {
    id: string;
    userId: string;
    projectId?: string | null;
    tenantId?: string | null;
    propertyId: string;
    title?: string;
    startsAt: ISODateString;
    endsAt?: ISODateString | null;
    timezone?: string;
    status?: RealtyOpenHouseStatus | string;
    notes?: string | null;
    registrationEnabled: boolean;
    metadata?: Record<string, unknown>;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export type Property = RealtyProperty;
export type Agent = RealtyAgent;
export type PropertyLeadRecord = PropertyLead;
export type PropertyAiGenerationRecord = PropertyAiGeneration;
export type RealtyCampaign = PropertyCampaign;
export type RealtyOpenHouse = PropertyOpenHouse;

export interface RealtyWebsiteColorConfig {
    background?: string;
    surface?: string;
    heading?: string;
    text?: string;
    textMuted?: string;
    border?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
    success?: string;
    error?: string;
    cardBackground?: string;
    cardHeading?: string;
    cardText?: string;
    buttonBackground?: string;
    buttonText?: string;
    badgeBackground?: string;
    badgeText?: string;
    priceColor?: string;
}

export interface RealtyListingsSectionData {
    glassEffect?: boolean;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    directoryRoute?: string;
    detailRoutePattern?: string;
    leadCtaText?: string;
    showingRequestCtaText?: string;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    emptyStateButtonText?: string;
    maxItems?: number;
    featuredOnly?: boolean;
    showPrice?: boolean;
    showLocation?: boolean;
    showStats?: boolean;
    showDescription?: boolean;
    paddingY?: string;
    paddingX?: string;
    cardBorderRadius?: string;
    buttonBorderRadius?: string;
    enableCardAnimation?: boolean;
    animationType?: AnimationType;
    colors?: RealtyWebsiteColorConfig;
    backgroundImageUrl?: string;
    backgroundPosition?: string;
    backgroundOverlayEnabled?: boolean;
    backgroundOverlayOpacity?: number;
    backgroundOverlayColor?: string;
}
