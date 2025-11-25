/**
 * Business Types
 * Tipos para lógica de negocio: usuarios, tenants, leads, CRM, etc.
 */

// =============================================================================
// USER & AUTH
// =============================================================================
export type UserRole = 'user' | 'manager' | 'admin' | 'superadmin' | 'owner';
export type TenantType = 'individual' | 'agency';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired';
export type IndividualRole = 'owner';
export type AgencyRole = 'agency_owner' | 'agency_admin' | 'agency_member' | 'client';

export interface RolePermissions {
    // User Management
    canViewUsers: boolean;
    canEditUsers: boolean;
    canDeleteUsers: boolean;
    canManageRoles: boolean;
    canCreateSuperAdmin: boolean;
    
    // Tenant Management
    canViewTenants: boolean;
    canEditTenants: boolean;
    canDeleteTenants: boolean;
    canManageTenantLimits: boolean;
    
    // Global Configuration
    canEditGlobalSettings: boolean;
    canEditPrompts: boolean;
    canEditDesignTokens: boolean;
    canViewBilling: boolean;
    canEditBilling: boolean;
    
    // Content & Projects
    canViewAllProjects: boolean;
    canEditAllProjects: boolean;
    canDeleteAllProjects: boolean;
    
    // Statistics
    canViewUsageStats: boolean;
    canExportData: boolean;
}

export interface TenantLimits {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    maxAiCredits: number;
}

export interface TenantUsage {
    projectCount: number;
    userCount: number;
    storageUsedGB: number;
    aiCreditsUsed: number;
}

export interface Tenant {
    id: string;
    type: TenantType;
    name: string;
    email: string;
    logoUrl?: string;
    
    // Business Information
    companyName?: string;
    taxId?: string;
    industry?: string;
    website?: string;
    
    // Status & Dates
    status: TenantStatus;
    createdAt: { seconds: number; nanoseconds: number } | string;
    lastActiveAt?: { seconds: number; nanoseconds: number } | string;
    trialEndsAt?: { seconds: number; nanoseconds: number } | string;
    
    // Subscription & Limits
    subscriptionPlan: string;
    limits: TenantLimits;
    usage: TenantUsage;
    
    // Associated Users
    ownerUserId: string;
    memberUserIds: string[];
    
    // Projects
    projectIds: string[];
    
    // Settings
    settings?: {
        allowMemberInvites?: boolean;
        requireTwoFactor?: boolean;
        brandingEnabled?: boolean;
    };
    
    // Billing
    billingInfo?: {
        mrr: number;
        nextBillingDate?: string;
        paymentMethod?: string;
    };
}

export interface UserDocument {
    id: string;
    name: string;
    email: string;
    photoURL: string;
    role?: UserRole;
    
    // Tenant Relations
    tenantId?: string;
    tenantRole?: IndividualRole | AgencyRole;
    additionalTenants?: Array<{
        tenantId: string;
        role: AgencyRole;
    }>;
    
    // Admin Metadata
    createdBy?: string;
    createdAt?: { seconds: number; nanoseconds: number } | string;
    lastLogin?: { seconds: number; nanoseconds: number } | string;
}

// =============================================================================
// CRM / LEADS
// =============================================================================
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost';

export interface Lead {
    // Basic Info
    id: string;
    name: string;
    email: string;
    phone?: string;
    
    // Address
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    
    // Additional Contact
    website?: string;
    linkedIn?: string;
    
    // Professional Info
    company?: string;
    jobTitle?: string;
    industry?: string;
    
    // CRM Fields
    status: LeadStatus;
    source: 'chatbot' | 'chatbot-widget' | 'contact-form' | 'form' | 'manual' | 'referral' | 'linkedin' | 'cold_call' | 'voice-call';
    value?: number;
    probability?: number;
    expectedCloseDate?: { seconds: number; nanoseconds: number };
    leadScore?: number;
    conversationTranscript?: string;
    
    // Notes & Tags
    notes?: string;
    tags?: string[];
    message?: string;
    
    // Metadata
    color?: string;
    emojiMarker?: string;
    createdAt: { seconds: number; nanoseconds: number; };
    lastContacted?: { seconds: number; nanoseconds: number; };
    
    // AI Features
    aiScore?: number;
    aiAnalysis?: string;
    recommendedAction?: string;
    
    // Custom Fields
    customFields?: LeadCustomField[];
}

export interface LeadCustomField {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
    options?: string[];
    value: string | number | boolean | Date;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'task_completed';

export interface LeadActivity {
    id: string;
    leadId: string;
    type: ActivityType;
    title: string;
    description?: string;
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    metadata?: {
        oldStatus?: LeadStatus;
        newStatus?: LeadStatus;
        duration?: number;
        emailSubject?: string;
    };
}

export interface LeadTask {
    id: string;
    leadId: string;
    title: string;
    description?: string;
    dueDate: { seconds: number; nanoseconds: number };
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    completedAt?: { seconds: number; nanoseconds: number };
    assignedTo?: string;
    createdAt: { seconds: number; nanoseconds: number };
}

// =============================================================================
// USAGE & ANALYTICS
// =============================================================================
export interface MonthlyData {
    month: string;
    count: number;
}

export interface ApiCallStat {
    model: string;
    count: number;
    color: string;
}

export interface UserActivity {
    id: string;
    name: string;
    email: string;
    photoURL: string;
    projectCount: number;
}

export interface TemplateUsage {
    id: string;
    name: string;
    count: number;
}

export interface UsageData {
    totalUsers: number;
    newUsersThisMonth: number;
    totalProjects: number;
    projectsThisMonth: number;
    totalApiCalls: number;
    userGrowth: MonthlyData[];
    apiCallsByModel: ApiCallStat[];
    topUsers: UserActivity[];
    popularTemplates: TemplateUsage[];
}

export interface ServiceModule {
    id: string;
    name: string;
    description: string;
}

export interface Plan {
    id: string;
    name: string;
    description: string;
    price: { monthly: number; annually: number; };
    features: string[];
    serviceModuleIds: string[];
    isFeatured: boolean;
    isArchived: boolean;
}

export interface BillingData {
    mrr: number;
    activeSubscriptions: number;
    arpu: number;
    churnRate: number;
    revenueTrend: { month: string; revenue: number; }[];
    planDistribution: { planId: string; planName: string; subscribers: number; color: string; }[];
    serviceModules: ServiceModule[];
    plans: Plan[];
}

export interface ApiLog {
    id?: string;
    userId: string;
    projectId?: string;
    model: string;
    feature: string;
    tokensUsed?: number;
    timestamp: any;
    success: boolean;
    errorMessage?: string;
}

export interface AiInsights {
    insights: string[];
    recommendations: string[];
    alerts: string[];
    nextMonthProjection: {
        users: number;
        projects: number;
        apiCalls: number;
    };
    generatedAt: Date;
}

export interface Anomaly {
    id: string;
    type: 'spike' | 'drop' | 'pattern_change' | 'error_rate';
    severity: 'low' | 'medium' | 'high';
    metric: string;
    description: string;
    detectedAt: Date;
    currentValue: number;
    expectedValue: number;
    deviation: number;
}

export interface UserSegment {
    id: string;
    name: string;
    description: string;
    userIds: string[];
    characteristics: string[];
    engagementStrategy: string;
    createdAt: Date;
}

export interface ChurnPrediction {
    userId: string;
    userName: string;
    userEmail: string;
    churnProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    recommendations: string[];
    lastActivity: Date;
    predictedChurnDate?: Date;
}

// =============================================================================
// FILE SYSTEM
// =============================================================================
export interface FileRecord {
    id: string;
    name: string;
    storagePath: string;
    downloadURL: string;
    size: number;
    type: string;
    createdAt: { seconds: number; nanoseconds: number; };
    notes: string;
    aiSummary: string;
    projectId?: string;
    projectName?: string;
}

// =============================================================================
// CMS
// =============================================================================
export interface CMSPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featuredImage: string;
    status: 'draft' | 'published';
    authorId: string;
    seoTitle: string;
    seoDescription: string;
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// LLM PROMPTS
// =============================================================================
export interface LLMPrompt {
    id: string;
    name: string;
    area: 'Onboarding' | 'Content Generation' | 'Image Generation' | 'File Management' | 'Other';
    description: string;
    template: string;
    model: string;
    version: number;
    createdAt: { seconds: number; nanoseconds: number; };
    updatedAt: { seconds: number; nanoseconds: number; };
}

// =============================================================================
// ONBOARDING
// =============================================================================
export type OnboardingStep = 'basics' | 'strategy' | 'aesthetic' | 'details' | 'products' | 'contact' | 'visuals' | 'review' | 'generating' | 'success';
export type AestheticType = 'Minimalist' | 'Bold' | 'Elegant' | 'Playful' | 'Tech' | 'Organic';

export interface ProductInfo {
    id: string;
    name: string;
    description: string;
    price?: string;
    features?: string[];
}

export interface TestimonialInfo {
    id: string;
    quote: string;
    author: string;
    role: string;
    company?: string;
    avatar?: string;
}

export interface ContactInfo {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
    };
}

export interface BrandGuidelines {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    existingImages?: string[];
}

export interface OnboardingState {
    step: OnboardingStep;
    
    // Basics
    businessName: string;
    industry: string;
    summary: string;
    
    // Strategy
    audience: string;
    offerings: string;
    goal: string;
    
    // Aesthetic
    tone?: string;
    aesthetic: AestheticType;
    colorVibe: string;
    
    // Details
    companyHistory?: string;
    uniqueValueProposition?: string;
    coreValues?: string[];
    yearsInBusiness?: string;
    
    // Products/Services
    products?: ProductInfo[];
    
    // Contact
    contactInfo?: ContactInfo;
    
    // Visuals
    brandGuidelines?: BrandGuidelines;
    testimonials?: TestimonialInfo[];
    
    // Generated
    designPlan?: any;
}

// =============================================================================
// BRAND IDENTITY
// =============================================================================
export interface BrandIdentity {
    name: string;
    industry: string;
    targetAudience: string;
    toneOfVoice: 'Professional' | 'Playful' | 'Urgent' | 'Luxury' | 'Friendly' | 'Minimalist';
    coreValues: string;
    language: string;
}



