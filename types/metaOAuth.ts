/**
 * Meta OAuth Types
 * Types for Facebook/Instagram/WhatsApp OAuth integration
 */

// =============================================================================
// OAUTH CONFIGURATION
// =============================================================================

export interface MetaOAuthConfig {
    appId: string;
    appSecret: string;
    redirectUri: string;
    scopes: MetaPermission[];
}

export type MetaPermission =
    // Facebook Pages
    | 'pages_messaging'
    | 'pages_manage_metadata'
    | 'pages_read_engagement'
    | 'pages_show_list'
    // WhatsApp Business
    | 'whatsapp_business_messaging'
    | 'whatsapp_business_management'
    // Instagram
    | 'instagram_basic'
    | 'instagram_manage_messages'
    | 'instagram_content_publish'
    // Business
    | 'business_management'
    | 'public_profile'
    | 'email';

// =============================================================================
// OAUTH FLOW TYPES
// =============================================================================

export interface MetaOAuthState {
    projectId: string;
    userId: string;
    returnUrl: string;
    nonce: string;
    timestamp: number;
}

export interface MetaOAuthCallbackParams {
    code: string;
    state: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
}

export interface MetaTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface MetaLongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number; // ~60 days
}

// =============================================================================
// CONNECTED ACCOUNTS
// =============================================================================

export interface MetaUserProfile {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
            width: number;
            height: number;
        };
    };
}

export interface MetaConnectedPage {
    id: string;
    name: string;
    access_token: string;
    category: string;
    picture?: {
        data: {
            url: string;
        };
    };
    instagram_business_account?: {
        id: string;
        username: string;
        profile_picture_url?: string;
    };
    // WhatsApp Business Account linked to this page
    whatsapp_business_account?: {
        id: string;
        name: string;
    };
}

export interface MetaWhatsAppPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: 'GREEN' | 'YELLOW' | 'RED';
    code_verification_status: 'VERIFIED' | 'NOT_VERIFIED';
}

export interface MetaWhatsAppBusinessAccount {
    id: string;
    name: string;
    phone_numbers: MetaWhatsAppPhoneNumber[];
}

export interface MetaInstagramAccount {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
}

// =============================================================================
// STORED CONNECTION DATA
// =============================================================================

export interface MetaConnection {
    // Connection status
    connected: boolean;
    connectedAt: { seconds: number; nanoseconds: number };
    lastRefreshed?: { seconds: number; nanoseconds: number };
    expiresAt?: { seconds: number; nanoseconds: number };
    
    // User info
    userId: string;
    metaUserId: string;
    metaUserName: string;
    metaUserEmail?: string;
    metaUserPicture?: string;
    
    // Access token (encrypted in production)
    accessToken: string;
    tokenType: string;
    
    // Connected assets
    pages: MetaConnectedPageInfo[];
    whatsappAccounts: MetaWhatsAppAccountInfo[];
    instagramAccounts: MetaInstagramAccountInfo[];
    
    // Selected for this project
    selectedPageId?: string;
    selectedWhatsAppPhoneNumberId?: string;
    selectedInstagramAccountId?: string;
}

export interface MetaConnectedPageInfo {
    id: string;
    name: string;
    accessToken: string;
    category: string;
    pictureUrl?: string;
    hasMessaging: boolean;
    hasInstagram: boolean;
    instagramAccountId?: string;
}

export interface MetaWhatsAppAccountInfo {
    businessAccountId: string;
    businessAccountName: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating: string;
}

export interface MetaInstagramAccountInfo {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
    linkedPageId: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface MetaPagesResponse {
    data: MetaConnectedPage[];
    paging?: {
        cursors: {
            before: string;
            after: string;
        };
        next?: string;
    };
}

export interface MetaWhatsAppAccountsResponse {
    data: MetaWhatsAppBusinessAccount[];
}

export interface MetaDebugTokenResponse {
    data: {
        app_id: string;
        type: string;
        application: string;
        data_access_expires_at: number;
        expires_at: number;
        is_valid: boolean;
        scopes: string[];
        user_id: string;
    };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface MetaOAuthError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
}

export type MetaConnectionStatus = 
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error'
    | 'token_expired'
    | 'refreshing';

// =============================================================================
// WEBHOOK SUBSCRIPTION TYPES
// =============================================================================

export interface MetaWebhookSubscription {
    object: 'page' | 'instagram' | 'whatsapp_business_account';
    callback_url: string;
    fields: string[];
    verify_token: string;
    active: boolean;
}

// =============================================================================
// HELPER CONSTANTS
// =============================================================================

export const META_OAUTH_SCOPES: MetaPermission[] = [
    // Core
    'public_profile',
    'email',
    // Pages & Messaging
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_show_list',
    // WhatsApp
    'whatsapp_business_messaging',
    'whatsapp_business_management',
    // Instagram
    'instagram_basic',
    'instagram_manage_messages',
    // Business
    'business_management',
];

export const META_GRAPH_API_VERSION = 'v18.0';
export const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
export const META_OAUTH_BASE = 'https://www.facebook.com';








