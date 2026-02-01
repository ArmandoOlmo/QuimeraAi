/**
 * Multi-Tenant Types
 * Types for agency multi-tenant system with white-label portals
 */

// =============================================================================
// TENANT TYPES
// =============================================================================

export type TenantType = 'individual' | 'agency_client';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'expired';

export type AgencyRole = 'agency_owner' | 'agency_admin' | 'agency_member' | 'client';

export interface TenantLimits {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    maxAiCredits: number;
    maxSubClients?: number;        // For agency plans
    maxReports?: number;           // Monthly report generation limit
    maxApiCalls?: number;          // Monthly API calls limit
}

export interface TenantUsage {
    projectCount: number;
    userCount: number;
    storageUsedGB: number;
    aiCreditsUsed: number;
    subClientCount?: number;       // For agency plans
}

export interface TenantBranding {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    faviconUrl?: string;
    companyName?: string;
    customDomain?: string;         // "app.clienteabc.com"
    customDomainVerified?: boolean;
    emailFromName?: string;
    emailFromAddress?: string;
    footerText?: string;
    supportEmail?: string;
    supportUrl?: string;
}

export interface AutoReportsConfig {
    enabled: boolean;
    frequency: 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];          // Email addresses
    includeAllClients?: boolean;   // For agencies: include all sub-clients
    dayOfMonth?: number;           // For monthly: 1-28
    dayOfWeek?: number;            // For weekly: 0-6 (Sunday-Saturday)
}

export interface TenantSettings {
    allowMemberInvites: boolean;
    defaultMemberRole: AgencyRole;
    enabledFeatures: TenantFeature[];
    requireTwoFactor: boolean;
    allowGuestCheckout?: boolean;  // For ecommerce
    defaultLanguage: string;
    timezone: string;
    autoReports?: AutoReportsConfig;  // Automated report generation
    portalLanguage?: string;       // Language for white-label portal
    autoTranslateContent?: boolean;   // Auto-translate portal content
}

export type TenantFeature =
    | 'projects'
    | 'cms'
    | 'leads'
    | 'ecommerce'
    | 'chat'
    | 'email'
    | 'domains'
    | 'analytics'
    | 'api';

export interface SubscriptionAddons {
    extraSubClients?: number;      // Additional sub-clients beyond plan limit
    extraStorageGB?: number;       // Additional storage in GB
    extraAiCredits?: number;       // Additional AI credits per month
}

export interface TenantBilling {
    mode: 'included_in_parent' | 'direct';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeConnectAccountId?: string;  // For agencies using Stripe Connect
    stripePriceId?: string;
    currentPeriodEnd?: { seconds: number; nanoseconds: number };
    cancelAtPeriodEnd?: boolean;
    mrr?: number;
    nextBillingDate?: string;
    paymentMethod?: string;
    monthlyPrice?: number;         // For sub-clients billed by agency
    addons?: SubscriptionAddons;   // Add-ons purchased
    addonsMonthlyPrice?: number;   // Total cost of add-ons

    // === Agency Fee + Project billing model (Fase 3) ===
    isAgencyBilling?: boolean;     // If this tenant uses agency billing model
    agencyBaseFee?: number;        // Monthly base fee (e.g., $99, $199, $399)
    projectCost?: number;          // Cost per active project (e.g., $29)
    activeProjectsCount?: number;  // Number of billable projects
    totalMonthlyBill?: number;     // agencyBaseFee + (activeProjectsCount * projectCost)
    lastProjectCountUpdate?: { seconds: number; nanoseconds: number };
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;                  // URL-friendly name "cliente-abc"
    type: TenantType;

    // Ownership
    ownerUserId: string;           // Firebase Auth UID of owner
    ownerTenantId?: string;        // If this is a sub-client of an agency

    // Subscription & Limits - Updated with new plans
    subscriptionPlan:
    | 'free'
    | 'hobby'
    | 'starter'
    | 'individual'             // Nuevo: $49/mes, 1 proyecto, todo incluido
    | 'pro'
    | 'agency'
    | 'agency_plus'
    | 'agency_starter'         // Nuevo: $99 fee + $29/proyecto
    | 'agency_pro'             // Nuevo: $199 fee + $29/proyecto
    | 'agency_scale'           // Nuevo: $399 fee + $29/proyecto
    | 'enterprise';
    status: TenantStatus;
    limits: TenantLimits;
    usage: TenantUsage;

    // Branding (for white-label)
    branding: TenantBranding;

    // Configuration
    settings: TenantSettings;

    // Billing
    billing?: TenantBilling;

    // Trial
    trialEndsAt?: { seconds: number; nanoseconds: number };

    // Agency Pool (for sub-clients using shared credits)
    parentCreditsPoolId?: string;  // tenantId of the agency pool to use

    // Metadata
    createdAt: { seconds: number; nanoseconds: number };
    updatedAt: { seconds: number; nanoseconds: number };
    lastActiveAt?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// TENANT MEMBERSHIP TYPES
// =============================================================================

export interface TenantPermissions {
    canManageProjects: boolean;
    canManageLeads: boolean;
    canManageCMS: boolean;
    canManageEcommerce: boolean;
    canManageFiles: boolean;
    canManageDomains: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canManageSettings: boolean;
    canExportData: boolean;
}

export interface TenantMembership {
    id: string;                    // Composite: `${tenantId}_${userId}`
    tenantId: string;
    userId: string;
    role: AgencyRole;
    permissions: TenantPermissions;
    invitedBy: string;
    joinedAt: { seconds: number; nanoseconds: number };
    lastAccessAt?: { seconds: number; nanoseconds: number };

    // Member Details (Workspace Specific)
    title?: string;        // Job title in this workspace
    department?: string;   // Department in this workspace

    // Denormalized for UI
    tenant?: Tenant;
    userName?: string;
    userEmail?: string;
    userPhotoURL?: string;
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<AgencyRole, TenantPermissions> = {
    agency_owner: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canViewAnalytics: true,
        canManageBilling: true,
        canManageSettings: true,
        canExportData: true,
    },
    agency_admin: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: true,
        canInviteMembers: true,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: true,
    },
    agency_member: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: false,
        canManageFiles: true,
        canManageDomains: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: false,
    },
    client: {
        canManageProjects: true,
        canManageLeads: true,
        canManageCMS: true,
        canManageEcommerce: true,
        canManageFiles: true,
        canManageDomains: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canViewAnalytics: true,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: false,
    },
};

// =============================================================================
// TENANT INVITE TYPES
// =============================================================================

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface TenantInvite {
    id: string;
    tenantId: string;
    email: string;
    role: AgencyRole;
    customPermissions?: Partial<TenantPermissions>;
    invitedBy: string;
    invitedByName?: string;
    token: string;                 // Unique token for invite URL
    message?: string;              // Personal message from inviter
    expiresAt: { seconds: number; nanoseconds: number };
    status: InviteStatus;
    acceptedAt?: { seconds: number; nanoseconds: number };
    acceptedByUserId?: string;
    createdAt: { seconds: number; nanoseconds: number };

    // Denormalized for UI
    tenantName?: string;
    tenantLogo?: string;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface CreateTenantData {
    name: string;
    type: TenantType;
    plan?: Tenant['subscriptionPlan'];
    branding?: Partial<TenantBranding>;
    parentTenantId?: string;       // If creating sub-client
    useParentCreditsPool?: boolean; // If sub-client should use agency's credits pool
}

export interface InviteMemberData {
    email: string;
    role: AgencyRole;
    customPermissions?: Partial<TenantPermissions>;
    message?: string;
}

export interface TenantContextState {
    currentTenant: Tenant | null;
    userTenants: TenantMembership[];
    isLoadingTenant: boolean;
    error: string | null;
}

// =============================================================================
// PORTAL TYPES (White-Label)
// =============================================================================

export interface PortalConfig {
    tenant: Tenant;
    branding: TenantBranding;
    features: TenantFeature[];
    userRole: AgencyRole;
    permissions: TenantPermissions;
}

export interface PortalTheme {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    companyName: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Remove accents
        .replace(/[^a-z0-9]+/g, '-')       // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '')           // Trim hyphens from start/end
        .substring(0, 50);                 // Limit length
}

/**
 * Generate membership document ID
 */
export function getMembershipId(tenantId: string, userId: string): string {
    return `${tenantId}_${userId}`;
}

/**
 * Get default limits for a plan
 * Updated with new pricing structure (Jan 2026)
 * 
 * Individual Plans: free, hobby, starter, individual, pro
 * Agency Plans (Fee + Project model): agency_starter, agency_pro, agency_scale
 * Legacy: agency, agency_plus, enterprise
 * 
 * AI Credits: ~$0.01 USD real cost per credit
 */
export function getDefaultLimitsForPlan(plan: Tenant['subscriptionPlan']): TenantLimits {
    switch (plan) {
        case 'free':
            // Free: Para explorar - 1 proyecto, 30 AI credits
            return {
                maxProjects: 1,
                maxUsers: 1,
                maxStorageGB: 0.5,
                maxAiCredits: 30
            };

        case 'hobby':
            // Hobby $9/mes: Proyectos personales
            return {
                maxProjects: 2,
                maxUsers: 1,
                maxStorageGB: 2,
                maxAiCredits: 100
            };

        case 'starter':
            // Starter $19/mes: Emprendedores - 5 proyectos, 300 AI credits
            return {
                maxProjects: 5,
                maxUsers: 2,
                maxStorageGB: 5,
                maxAiCredits: 300
            };

        case 'individual':
            // Individual $49/mes: Todo incluido, 1 proyecto, 7 días trial
            return {
                maxProjects: 1,
                maxUsers: 1,
                maxStorageGB: 10,
                maxAiCredits: 500
            };

        case 'pro':
            // Pro $49/mes: Negocios en crecimiento - 20 proyectos, 1500 AI credits
            return {
                maxProjects: 20,
                maxUsers: 10,
                maxStorageGB: 50,
                maxAiCredits: 1500
            };

        // =========================================
        // NUEVOS PLANES DE AGENCIA (Fee + Proyecto)
        // =========================================

        case 'agency_starter':
            // Agency Starter $99/mes + $29/proyecto: Pool 2000 créditos
            return {
                maxProjects: -1,           // Sin límite (pago por proyecto)
                maxUsers: 5,
                maxStorageGB: 50,
                maxAiCredits: 2000,        // Pool compartido
                maxSubClients: -1,         // Sin límite
                maxReports: 25,
                maxApiCalls: 5000
            };

        case 'agency_pro':
            // Agency Pro $199/mes + $29/proyecto: Pool 5000 créditos
            return {
                maxProjects: -1,
                maxUsers: 15,
                maxStorageGB: 200,
                maxAiCredits: 5000,
                maxSubClients: -1,
                maxReports: 100,
                maxApiCalls: 25000
            };

        case 'agency_scale':
            // Agency Scale $399/mes + $29/proyecto: Pool 15000 créditos
            return {
                maxProjects: -1,
                maxUsers: 50,
                maxStorageGB: 1000,
                maxAiCredits: 15000,
                maxSubClients: -1,
                maxReports: -1,
                maxApiCalls: -1
            };

        // =========================================
        // PLANES LEGACY
        // =========================================

        case 'agency':
            // Agency $129/mes: Agencias digitales - 50 proyectos, 5000 AI credits
            return {
                maxProjects: 50,
                maxUsers: 25,
                maxStorageGB: 200,
                maxAiCredits: 5000,
                maxSubClients: 10,
                maxReports: 50,
                maxApiCalls: 10000
            };

        case 'agency_plus':
            // Agency Plus $199/mes: Premium para agencias con alto volumen
            return {
                maxProjects: 100,
                maxUsers: 50,
                maxStorageGB: 500,
                maxAiCredits: 10000,
                maxSubClients: 25,
                maxReports: 200,
                maxApiCalls: 50000
            };

        case 'enterprise':
            // Enterprise $299+/mes: Grandes organizaciones - Ilimitado
            return {
                maxProjects: 1000,
                maxUsers: 500,
                maxStorageGB: 2000,
                maxAiCredits: 25000,
                maxSubClients: 100,
                maxReports: -1,
                maxApiCalls: -1
            };

        default:
            return {
                maxProjects: 1,
                maxUsers: 1,
                maxStorageGB: 0.5,
                maxAiCredits: 30
            };
    }
}

/**
 * Check if a plan is an agency plan with fee + project billing
 */
export function isAgencyBillingPlan(plan: Tenant['subscriptionPlan']): boolean {
    return ['agency_starter', 'agency_pro', 'agency_scale'].includes(plan);
}

/**
 * Get agency plan billing details
 */
export function getAgencyPlanBillingDetails(plan: Tenant['subscriptionPlan']): {
    baseFee: number;
    projectCost: number;
    poolCredits: number;
} | null {
    const agencyPlans: Record<string, { baseFee: number; projectCost: number; poolCredits: number }> = {
        agency_starter: { baseFee: 99, projectCost: 29, poolCredits: 2000 },
        agency_pro: { baseFee: 199, projectCost: 29, poolCredits: 5000 },
        agency_scale: { baseFee: 399, projectCost: 29, poolCredits: 15000 },
    };

    return agencyPlans[plan] || null;
}

/**
 * Calculate total monthly cost for agency plan
 */
export function calculateAgencyMonthlyBill(
    plan: Tenant['subscriptionPlan'],
    activeProjects: number
): number {
    const details = getAgencyPlanBillingDetails(plan);
    if (!details) return 0;

    return details.baseFee + (details.projectCost * activeProjects);
}

/**
 * Get default tenant settings
 */
export function getDefaultTenantSettings(): TenantSettings {
    return {
        allowMemberInvites: true,
        defaultMemberRole: 'agency_member',
        enabledFeatures: ['projects', 'cms', 'leads'],
        requireTwoFactor: false,
        defaultLanguage: 'es',
        timezone: 'America/Mexico_City',
    };
}

/**
 * Get default tenant branding
 */
export function getDefaultTenantBranding(): TenantBranding {
    return {
        primaryColor: '#4f46e5',
        secondaryColor: '#10b981',
    };
}

/**
 * Check if user has a specific permission in tenant
 */
export function hasPermission(
    membership: TenantMembership | null,
    permission: keyof TenantPermissions
): boolean {
    if (!membership) return false;
    return membership.permissions[permission] === true;
}

/**
 * Check if role is at least as privileged as required
 */
export function hasMinimumRole(userRole: AgencyRole, requiredRole: AgencyRole): boolean {
    const roleHierarchy: AgencyRole[] = ['client', 'agency_member', 'agency_admin', 'agency_owner'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
}

// =============================================================================
// ROLE LABELS
// =============================================================================

export const AGENCY_ROLE_LABELS: Record<AgencyRole, string> = {
    agency_owner: 'Propietario',
    agency_admin: 'Administrador',
    agency_member: 'Miembro',
    client: 'Cliente',
};

export const AGENCY_ROLE_DESCRIPTIONS: Record<AgencyRole, string> = {
    agency_owner: 'Control total sobre el workspace, incluyendo facturación y configuración',
    agency_admin: 'Puede gestionar proyectos, miembros y contenido',
    agency_member: 'Puede editar proyectos y contenido asignado',
    client: 'Acceso a su propio contenido y métricas',
};

export const AGENCY_ROLE_COLORS: Record<AgencyRole, string> = {
    agency_owner: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
    agency_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    agency_member: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    client: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
    active: 'Activo',
    trial: 'Prueba',
    suspended: 'Suspendido',
    expired: 'Expirado',
};

export const TENANT_STATUS_COLORS: Record<TenantStatus, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const FEATURE_LABELS: Record<TenantFeature, string> = {
    projects: 'Proyectos Web',
    cms: 'CMS / Blog',
    leads: 'Leads / CRM',
    ecommerce: 'E-commerce',
    chat: 'Chat Widget',
    email: 'Email Marketing',
    domains: 'Dominios',
    analytics: 'Analytics',
    api: 'API Access',
};

/**
 * Calculate effective limits including add-ons
 */
export function getEffectiveLimits(
    baseLimits: TenantLimits,
    addons?: SubscriptionAddons
): TenantLimits {
    if (!addons) return baseLimits;

    return {
        ...baseLimits,
        maxSubClients: (baseLimits.maxSubClients || 0) + (addons.extraSubClients || 0),
        maxStorageGB: baseLimits.maxStorageGB + (addons.extraStorageGB || 0),
        maxAiCredits: baseLimits.maxAiCredits + (addons.extraAiCredits || 0),
    };
}

/**
 * Calculate monthly cost of add-ons
 */
export function calculateAddonsCost(addons: SubscriptionAddons): number {
    const ADDON_PRICES = {
        extraSubClients: 15,  // $15 per additional sub-client
        extraStorageGB: 0.10, // $0.10 per GB
        extraAiCredits: 0.02, // $0.02 per credit
    };

    let totalCost = 0;

    if (addons.extraSubClients) {
        totalCost += addons.extraSubClients * ADDON_PRICES.extraSubClients;
    }

    if (addons.extraStorageGB) {
        totalCost += addons.extraStorageGB * ADDON_PRICES.extraStorageGB;
    }

    if (addons.extraAiCredits) {
        totalCost += addons.extraAiCredits * ADDON_PRICES.extraAiCredits;
    }

    return totalCost;
}






