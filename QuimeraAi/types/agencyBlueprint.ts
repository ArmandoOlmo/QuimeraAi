import type { AgencyPlanFeatures, AgencyPlanLimits } from './agencyPlans';

export type AgencyBillingMode = 'direct' | 'agency_managed' | 'included_in_parent';
export type AgencyReportFrequency = 'weekly' | 'monthly' | 'quarterly';
export type AgencyPlanBlueprintStatus = 'draft' | 'needs_review' | 'active' | 'archived';

export interface AgencyProfile {
    agencyName: string;
    description?: string;
    niche?: string;
    targetClients: string[];
    services: string[];
    defaultLanguage: string;
    timezone: string;
    supportEmail?: string;
    supportUrl?: string;
}

export interface WhiteLabelProfile {
    companyName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
    portalSubdomain?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    footerText?: string;
}

export interface AgencyServicePlanBlueprint {
    id: string;
    name: string;
    description?: string;
    price: number;
    baseCost: number;
    markup: number;
    features: AgencyPlanFeatures;
    limits: AgencyPlanLimits;
    isDefault: boolean;
    status: AgencyPlanBlueprintStatus;
    needsReview: boolean;
}

export interface ClientProvisioningDefaults {
    defaultModules: string[];
    defaultTemplate?: string;
    defaultBrandingMode: 'agency_brand' | 'client_brand' | 'ai_generated';
    defaultAIStudioScope: 'website_only' | 'business_suite' | 'full_operating_system';
    defaultBusinessBlueprintMode: 'draft' | 'needs_review';
    defaultUsers: Array<{ email?: string; role: 'client' | 'client_admin' | 'client_user' }>;
    defaultBillingMode: AgencyBillingMode;
    defaultClientPortalAccess: boolean;
}

export interface AgencyBillingModel {
    stripeConnectEnabled: boolean;
    billingMode: AgencyBillingMode;
    projectCost: number;
    setupFee: number;
    monthlyBilling: boolean;
    invoicesEnabled: boolean;
    paymentLinksEnabled: boolean;
}

export interface AgencyReportingModel {
    scheduledReportsEnabled: boolean;
    reportFrequency: AgencyReportFrequency;
    includedMetrics: string[];
    recipients: string[];
    aiSummaryEnabled: boolean;
}

export interface ClientApprovalWorkflow {
    enabled: boolean;
    approvalRequiredForPublish: boolean;
    approvalRequiredForEmailSend: boolean;
    approvalRequiredForBilling: boolean;
    approvalRequiredForDomain: boolean;
    activityNotifications: boolean;
}

export interface AgencyGlobalAssistantSettings {
    enabled: boolean;
    agencyModeEnabled: boolean;
    canCreateClients: boolean;
    canSwitchClients: boolean;
    canGenerateReports: boolean;
    canProvisionProjects: boolean;
    canManageBilling: boolean;
    canOperateClientProjects: boolean;
}

export interface AgencyBlueprint {
    blueprintVersion: '1.0.0';
    tenantId: string;
    status: 'draft' | 'needs_review' | 'active';
    agencyProfile: AgencyProfile;
    whiteLabelProfile: WhiteLabelProfile;
    servicePlans: AgencyServicePlanBlueprint[];
    provisioningDefaults: ClientProvisioningDefaults;
    billingModel: AgencyBillingModel;
    reportingModel: AgencyReportingModel;
    approvalWorkflow: ClientApprovalWorkflow;
    globalAssistantSettings: AgencyGlobalAssistantSettings;
    metadata: {
        createdAt: string;
        updatedAt: string;
        generatedBy?: 'agency-engine' | 'ai-studio' | 'global-assistant';
        lastEditedBy?: string;
    };
}

export function createDefaultAgencyBlueprint(input: {
    tenantId: string;
    agencyName: string;
    supportEmail?: string;
    defaultLanguage?: string;
    timezone?: string;
    now?: string;
}): AgencyBlueprint {
    const now = input.now || new Date().toISOString();
    return {
        blueprintVersion: '1.0.0',
        tenantId: input.tenantId,
        status: 'needs_review',
        agencyProfile: {
            agencyName: input.agencyName,
            targetClients: [],
            services: ['Website', 'CRM', 'Email Marketing', 'Analytics'],
            defaultLanguage: input.defaultLanguage || 'es',
            timezone: input.timezone || 'America/Puerto_Rico',
            supportEmail: input.supportEmail,
        },
        whiteLabelProfile: {
            companyName: input.agencyName,
        },
        servicePlans: [],
        provisioningDefaults: {
            defaultModules: ['website-builder', 'crm-leads', 'chatbot-engine', 'analytics-engine'],
            defaultBrandingMode: 'ai_generated',
            defaultAIStudioScope: 'business_suite',
            defaultBusinessBlueprintMode: 'needs_review',
            defaultUsers: [{ role: 'client_admin' }],
            defaultBillingMode: 'included_in_parent',
            defaultClientPortalAccess: true,
        },
        billingModel: {
            stripeConnectEnabled: false,
            billingMode: 'included_in_parent',
            projectCost: 29,
            setupFee: 0,
            monthlyBilling: true,
            invoicesEnabled: true,
            paymentLinksEnabled: true,
        },
        reportingModel: {
            scheduledReportsEnabled: false,
            reportFrequency: 'monthly',
            includedMetrics: ['leads', 'revenue', 'traffic', 'ai_usage', 'health'],
            recipients: input.supportEmail ? [input.supportEmail] : [],
            aiSummaryEnabled: true,
        },
        approvalWorkflow: {
            enabled: true,
            approvalRequiredForPublish: true,
            approvalRequiredForEmailSend: true,
            approvalRequiredForBilling: true,
            approvalRequiredForDomain: true,
            activityNotifications: true,
        },
        globalAssistantSettings: {
            enabled: true,
            agencyModeEnabled: true,
            canCreateClients: true,
            canSwitchClients: true,
            canGenerateReports: true,
            canProvisionProjects: true,
            canManageBilling: false,
            canOperateClientProjects: true,
        },
        metadata: {
            createdAt: now,
            updatedAt: now,
            generatedBy: 'agency-engine',
        },
    };
}
