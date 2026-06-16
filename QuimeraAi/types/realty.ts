import type { AnimationType } from './ui';
import type { StoredTimestamp } from './ecommerce';
import type { LeadStatus } from './business';

export type RealtyPropertyStatus = 'draft' | 'active' | 'pending' | 'sold' | 'archived';
export type RealtyPropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'land' | 'commercial';
export type RealtyLeadStatus = LeadStatus;

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
    createdAt?: StoredTimestamp;
    updatedAt?: StoredTimestamp;
}

export interface RealtyImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
}

export interface RealtyProperty {
    id: string;
    tenantId?: string | null;
    projectId: string;
    createdBy?: string | null;
    title: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    address: string;
    city: string;
    state?: string;
    country?: string;
    zipCode?: string;
    propertyType: RealtyPropertyType;
    status: RealtyPropertyStatus;
    bedrooms: number;
    bathrooms: number;
    area: number;
    areaUnit: 'sqft' | 'sqm';
    lotSize?: number;
    parkingSpaces?: number;
    yearBuilt?: number;
    latitude?: number;
    longitude?: number;
    amenities: string[];
    images: RealtyImage[];
    videoUrl?: string;
    virtualTourUrl?: string;
    isFeatured: boolean;
    publishedAt?: StoredTimestamp;
    metadata?: Record<string, unknown>;
    createdAt: StoredTimestamp;
    updatedAt: StoredTimestamp;
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
    source: 'manual' | 'website' | 'ai' | 'import';
    metadata?: Record<string, unknown>;
    createdAt: StoredTimestamp;
    updatedAt: StoredTimestamp;
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
    createdAt: StoredTimestamp;
}

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
