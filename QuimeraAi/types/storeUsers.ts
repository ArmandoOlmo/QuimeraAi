/**
 * Store Users Types
 * Tipos para el sistema de autenticación de usuarios de tienda multi-tenant
 */

import { FirebaseTimestamp } from './ecommerce';

// =============================================================================
// ROLES & STATUS
// =============================================================================

export type StoreUserRole = 'customer' | 'vip' | 'wholesale';

export type StoreUserStatus = 'active' | 'inactive' | 'banned';

export type RegistrationSource = 'self_register' | 'import' | 'admin_created' | 'checkout';

// =============================================================================
// STORE USER
// =============================================================================

export interface StoreUserMetadata {
    source: RegistrationSource;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

export interface StoreUser {
    id: string;
    
    // Basic Info
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    photoURL?: string;
    phone?: string;
    
    // Role & Status
    role: StoreUserRole;
    status: StoreUserStatus;
    
    // Segmentation
    segments: string[];
    tags?: string[];
    
    // Linked Data
    customerId?: string;            // Reference to Customer in ecommerce
    
    // Stats
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    
    // Timestamps
    lastLoginAt?: FirebaseTimestamp;
    lastOrderAt?: FirebaseTimestamp;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
    
    // Metadata
    metadata: StoreUserMetadata;
    
    // Preferences
    acceptsMarketing?: boolean;
    preferredLanguage?: string;
    
    // Notes (admin only)
    internalNotes?: string;
}

// =============================================================================
// USER SEGMENTS
// =============================================================================

export type SegmentRuleOperator = 
    | 'equals' 
    | 'not_equals' 
    | 'greater_than' 
    | 'less_than' 
    | 'contains' 
    | 'not_contains'
    | 'is_empty'
    | 'is_not_empty';

export type SegmentRuleField = 
    | 'totalSpent' 
    | 'totalOrders' 
    | 'role' 
    | 'createdAt' 
    | 'lastOrderAt'
    | 'tags'
    | 'acceptsMarketing';

export interface SegmentRule {
    id: string;
    field: SegmentRuleField;
    operator: SegmentRuleOperator;
    value: string | number | boolean;
}

export type SegmentType = 'manual' | 'automatic';

export interface UserSegment {
    id: string;
    name: string;
    description?: string;
    color: string;
    type: SegmentType;
    rules?: SegmentRule[];              // For automatic segments
    userCount: number;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// USER ACTIVITY
// =============================================================================

export type ActivityType = 
    | 'login'
    | 'logout'
    | 'register'
    | 'password_reset'
    | 'profile_update'
    | 'order_placed'
    | 'order_cancelled'
    | 'review_submitted'
    | 'wishlist_add'
    | 'wishlist_remove';

export interface UserActivity {
    id: string;
    userId: string;
    type: ActivityType;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: FirebaseTimestamp;
}

// =============================================================================
// ROLE CONFIGURATION
// =============================================================================

export interface RoleDiscount {
    type: 'percentage' | 'fixed';
    value: number;
    appliesTo: 'all' | 'specific_categories' | 'specific_products';
    categoryIds?: string[];
    productIds?: string[];
}

export interface RoleConfig {
    id: StoreUserRole;
    name: string;
    description: string;
    color: string;
    icon?: string;
    discount?: RoleDiscount;
    minOrdersForUpgrade?: number;
    minSpentForUpgrade?: number;
    permissions: {
        canViewWholesalePrices: boolean;
        canRequestQuotes: boolean;
        canAccessExclusiveProducts: boolean;
    };
}

export const DEFAULT_ROLE_CONFIGS: Record<StoreUserRole, RoleConfig> = {
    customer: {
        id: 'customer',
        name: 'Cliente',
        description: 'Cliente regular de la tienda',
        color: '#6b7280',
        permissions: {
            canViewWholesalePrices: false,
            canRequestQuotes: false,
            canAccessExclusiveProducts: false,
        },
    },
    vip: {
        id: 'vip',
        name: 'VIP',
        description: 'Cliente VIP con descuentos especiales',
        color: '#f59e0b',
        discount: {
            type: 'percentage',
            value: 10,
            appliesTo: 'all',
        },
        minOrdersForUpgrade: 5,
        minSpentForUpgrade: 500,
        permissions: {
            canViewWholesalePrices: false,
            canRequestQuotes: false,
            canAccessExclusiveProducts: true,
        },
    },
    wholesale: {
        id: 'wholesale',
        name: 'Mayorista',
        description: 'Cliente mayorista con precios especiales',
        color: '#8b5cf6',
        discount: {
            type: 'percentage',
            value: 25,
            appliesTo: 'all',
        },
        permissions: {
            canViewWholesalePrices: true,
            canRequestQuotes: true,
            canAccessExclusiveProducts: true,
        },
    },
};

// =============================================================================
// STORE USERS STATS
// =============================================================================

export interface StoreUsersStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    bannedUsers: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    usersByRole: Record<StoreUserRole, number>;
    averageOrdersPerUser: number;
    averageSpentPerUser: number;
    topSegments: Array<{
        segmentId: string;
        segmentName: string;
        count: number;
    }>;
}

// =============================================================================
// FILTER & SEARCH OPTIONS
// =============================================================================

export interface StoreUsersFilterOptions {
    searchTerm?: string;
    roles?: StoreUserRole[];
    statuses?: StoreUserStatus[];
    segments?: string[];
    acceptsMarketing?: boolean;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    minTotalOrders?: number;
    maxTotalOrders?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    lastLoginAfter?: Date;
    lastLoginBefore?: Date;
}

export type StoreUsersSortField = 
    | 'displayName' 
    | 'email' 
    | 'createdAt' 
    | 'lastLoginAt' 
    | 'totalSpent' 
    | 'totalOrders';

export type SortDirection = 'asc' | 'desc';

export interface StoreUsersSortOptions {
    field: StoreUsersSortField;
    direction: SortDirection;
}

// =============================================================================
// EXPORT OPTIONS
// =============================================================================

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportOptions {
    format: ExportFormat;
    fields: Array<keyof StoreUser>;
    filters?: StoreUsersFilterOptions;
    includeSegments?: boolean;
    includeActivity?: boolean;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface StoreUserCardProps {
    user: StoreUser;
    onView: (user: StoreUser) => void;
    onEdit?: (user: StoreUser) => void;
    onChangeStatus?: (user: StoreUser, status: StoreUserStatus) => void;
    onChangeRole?: (user: StoreUser, role: StoreUserRole) => void;
    isSelected?: boolean;
    onSelect?: (user: StoreUser, selected: boolean) => void;
}

export interface StoreUserDetailDrawerProps {
    user: StoreUser | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (userId: string, updates: Partial<StoreUser>) => Promise<void>;
    onChangeRole: (userId: string, role: StoreUserRole) => Promise<void>;
    onChangeStatus: (userId: string, status: StoreUserStatus) => Promise<void>;
    onResetPassword: (userId: string) => Promise<void>;
}

export interface UserSegmentFormProps {
    segment?: UserSegment;
    onSave: (segment: Omit<UserSegment, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onClose: () => void;
}

export interface UserRoleManagerProps {
    userId: string;
    currentRole: StoreUserRole;
    onRoleChange: (role: StoreUserRole) => Promise<void>;
}

// =============================================================================
// AUTH CONTEXT TYPES
// =============================================================================

export interface StoreAuthState {
    user: StoreUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

export interface StoreAuthContextType extends StoreAuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (updates: Partial<StoreUser>) => Promise<void>;
    refreshUser: () => Promise<void>;
}

// =============================================================================
// CLOUD FUNCTION PAYLOADS
// =============================================================================

export interface CreateStoreUserPayload {
    storeId: string;
    email: string;
    password: string;
    displayName: string;
    role?: StoreUserRole;
    metadata?: Partial<StoreUserMetadata>;
}

export interface UpdateStoreUserRolePayload {
    storeId: string;
    userId: string;
    role: StoreUserRole;
}

export interface UpdateStoreUserStatusPayload {
    storeId: string;
    userId: string;
    status: StoreUserStatus;
    reason?: string;
}

export interface ResetStoreUserPasswordPayload {
    storeId: string;
    userId: string;
}

export interface DeleteStoreUserPayload {
    storeId: string;
    userId: string;
}











