import type { AiAssistantConfig } from '../../types/ai-assistant';

export type BioPageRuntimeStatus = 'draft' | 'published' | 'archived';
export type BioPageEditorStatus = 'draft' | 'needs_review' | 'configured' | 'hidden';
export type BioPageBlockType =
    | 'profile'
    | 'link'
    | 'social_links'
    | 'featured_banner'
    | 'featured_media'
    | 'product_grid'
    | 'product_collection'
    | 'booking'
    | 'lead_form'
    | 'email_subscribe'
    | 'portfolio_grid'
    | 'testimonials'
    | 'faq'
    | 'contact'
    | 'chatbot_cta'
    | 'divider'
    | 'spacer'
    | 'custom_html_placeholder';

export type BioPageLinkType =
    | 'external'
    | 'internal'
    | 'product'
    | 'collection'
    | 'booking'
    | 'lead_form'
    | 'email_subscribe'
    | 'file'
    | 'video'
    | 'social'
    | 'chatbot';

export interface BioPageProfile {
    name: string;
    displayName?: string;
    handle?: string;
    bio: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    category?: string;
    location?: string;
    logoUrl?: string;
    verifiedBadgeEnabled?: boolean;
    needsReview?: boolean;
    generatedByAI?: boolean;
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
}

export interface BioPageTheme {
    preset: string;
    layoutVariant?: 'classic' | 'creator' | 'storefront' | 'portfolio' | 'business' | 'restaurant' | 'realty' | 'minimal' | 'editorial';
    backgroundColor: string;
    backgroundType: 'solid' | 'gradient' | 'blur' | 'pattern' | 'image' | 'video' | 'glass';
    backgroundGradient?: string;
    gradientColor?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    backgroundPattern?: string;
    patternColor?: string;
    patternSize?: number;
    buttonStyle: 'fill' | 'solid' | 'outline' | 'soft' | 'glass' | 'shadow';
    buttonShape: 'square' | 'rounded' | 'rounder' | 'pill' | 'full' | 'lg' | 'xl';
    buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
    buttonColor: string;
    buttonTextColor: string;
    textColor: string;
    titleFont: string;
    titleColor: string;
    bodyFont: string;
    bodyColor: string;
    profileLayout: 'circle' | 'hero';
    profileSize: 'small' | 'large';
    titleStyle: 'text' | 'logo' | 'both';
    headerOverlay?: boolean;
    headerOverlayColor?: string;
    profileBox?: boolean;
    profileBoxColor?: string;
    profileBoxRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showQuimeraFooter?: boolean;
    cardRadius?: number;
}

export interface BioPageLink {
    id: string;
    title: string;
    url: string;
    enabled: boolean;
    visible?: boolean;
    clicks: number;
    linkType?: BioPageLinkType | 'link' | 'collection' | 'form' | 'embed';
    platform?: string;
    icon?: string;
    thumbnail?: string;
    imageUrl?: string;
    description?: string;
    order?: number;
    orderIndex?: number;
    openInNewTab?: boolean;
    clickTrackingEnabled?: boolean;
    needsReview?: boolean;
    generatedByAI?: boolean;
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
    metadata?: Record<string, unknown>;
}

export interface BioPageProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    url: string;
    slug?: string;
    status?: string;
    categoryId?: string;
    categoryName?: string;
    categorySlug?: string;
}

export interface BioPageBlock {
    id: string;
    type: BioPageBlockType;
    title: string;
    description?: string;
    order: number;
    visible: boolean;
    status: BioPageEditorStatus;
    sourceModule?: string;
    sourceEntityId?: string;
    data: Record<string, unknown>;
    settings?: Record<string, unknown>;
    needsReview?: boolean;
    generatedByAI?: boolean;
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
}

export interface BioPageSEO {
    title?: string;
    description?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    schemaType?: 'Person' | 'Organization' | 'LocalBusiness' | 'WebPage';
}

export interface BioPageSettings {
    emailSignupEnabled?: boolean;
    leadCaptureEnabled?: boolean;
    chatbotEnabled?: boolean;
    shopEnabled?: boolean;
    bookingEnabled?: boolean;
    showQuimeraFooter?: boolean;
    qrColor?: string;
    qrBackgroundColor?: string;
    qrLogoUrl?: string;
    shareUtmSource?: string;
    shareUtmMedium?: string;
    shareUtmCampaign?: string;
    qrUtmSource?: string;
    qrUtmMedium?: string;
    qrUtmCampaign?: string;
    aiAssistant?: AiAssistantConfig | null;
    [key: string]: unknown;
}

export interface BioPageData {
    id: string;
    projectId: string;
    tenantId?: string | null;
    userId?: string | null;
    username: string;
    slug: string;
    title?: string;
    description?: string;
    profile: BioPageProfile;
    theme: BioPageTheme;
    links: BioPageLink[];
    blocks: BioPageBlock[];
    products: BioPageProduct[];
    emailSignupEnabled: boolean;
    isPublished: boolean;
    status: BioPageRuntimeStatus;
    seo?: BioPageSEO;
    settings?: BioPageSettings;
    aiAssistant?: AiAssistantConfig | null;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
}

export interface BioPageAnalyticsSummary {
    views: number;
    uniqueViews: number;
    returningViews: number;
    clicks: number;
    subscribers: number;
    leads: number;
    bookings: number;
    productClicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
    qrScans: number;
    shares: number;
    chatOpens: number;
    tabChanges: number;
    topLinks: Array<{ id: string; title: string; clicks: number }>;
    sourceBreakdown: Record<string, number>;
    utmSourceBreakdown: Record<string, number>;
    utmCampaignBreakdown: Record<string, number>;
    referrerBreakdown: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    blockBreakdown: Record<string, number>;
    eventBreakdown: Record<string, number>;
}
