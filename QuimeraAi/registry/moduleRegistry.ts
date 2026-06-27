import type { PageSection } from '../types/ui.ts';
import type { PlanFeatures, SubscriptionPlanId } from '../types/subscription.ts';
import type { PlatformServiceId } from '../types/serviceAvailability.ts';

export type ModuleKind =
    | 'website-section'
    | 'website-ecommerce-block'
    | 'storefront-section'
    | 'engine'
    | 'integration'
    | 'automation';

export type ModuleOwnerSystem =
    | 'ai-studio'
    | 'website-builder'
    | 'storefront-builder'
    | 'ecommerce-admin'
    | 'ecommerce-engine'
    | 'chatbot-engine'
    | 'crm'
    | 'email-marketing'
    | 'media-ai'
    | 'bio-page-engine'
    | 'appointments-engine'
    | 'restaurant-engine'
    | 'real-estate-engine'
    | 'design-system'
    | 'finance'
    | 'analytics'
    | 'agency-engine'
    | 'global-assistant'
    | 'automation-engine';

export type CanonicalSystemId =
    | 'businessBlueprint'
    | 'websiteBuilder'
    | 'storefrontBuilder'
    | 'designSystem'
    | 'ecommerce'
    | 'crm'
    | 'emailMarketing'
    | 'chatbot'
    | 'appointments'
    | 'restaurants'
    | 'realEstate'
    | 'finance'
    | 'analytics'
    | 'agency'
    | 'bioPage'
    | 'media';

export interface ModuleRegistryItem {
    id: string;
    label: string;
    moduleKind: ModuleKind;
    ownerSystem: ModuleOwnerSystem;
    canonicalSystem?: CanonicalSystemId;
    description: string;
    view?: string;
    route?: string;
    requiredPlan?: SubscriptionPlanId;
    requiredFeature?: keyof PlanFeatures;
    requiredService?: PlatformServiceId;
    requiredPermission?: string;
    gatingReason?: string;
    implementationStatus?: 'production' | 'beta' | 'development' | 'planned';
    planGate?: {
        minimumPlan?: SubscriptionPlanId;
        reason?: string;
    };
    upgradeTrigger?: string;
    usageResource?: string;
    compatibleIndustries: string[];
    requiredModules?: string[];
    optionalModules?: string[];
    unsupportedModules?: string[];
    editableBy: ModuleOwnerSystem[];
    readsFrom?: CanonicalSystemId[];
    writesTo?: CanonicalSystemId[];
    sections?: PageSection[];
}

export interface ModuleRegistryAccessContext {
    currentPlan?: SubscriptionPlanId;
    hasPlanFeature?: (feature: keyof PlanFeatures) => boolean;
    canAccessService?: (service: PlatformServiceId) => boolean;
    hasPermission?: (permission: string) => boolean;
    permissions?: Record<string, unknown>;
}

export type AgencyEngineOperatingSurfaceId =
    | 'command-center'
    | 'client-360'
    | 'client-provisioning'
    | 'project-transfer'
    | 'service-plans'
    | 'billing'
    | 'reports'
    | 'white-label'
    | 'client-portal';

export type AgencyEngineDashboardTabId =
    | 'overview'
    | 'analytics'
    | 'landing'
    | 'billing'
    | 'reports'
    | 'new-client'
    | 'addons'
    | 'plans'
    | 'cms'
    | 'navigation'
    | 'projects'
    | 'white-label'
    | 'client-portal';

export interface AgencyEngineOperatingSurface {
    id: AgencyEngineOperatingSurfaceId;
    moduleId: string;
    label: string;
    role: 'operate' | 'provision' | 'monetize' | 'report' | 'publish' | 'transfer';
    requiredPermission?: string;
    aiPowered: boolean;
    globalAssistantEnabled: boolean;
    requiredSystems: CanonicalSystemId[];
}

export interface AgencyEngineDashboardTab {
    id: AgencyEngineDashboardTabId;
    surfaceId: AgencyEngineOperatingSurfaceId;
    moduleId: string;
    route: string;
    labelKey: string;
    label: string;
    requiredPermission: string;
}

export interface AgencyEngineOperatingSystemManifest {
    id: 'agency-engine';
    label: string;
    requiredService: Extract<PlatformServiceId, 'agency'>;
    requiredFeature: keyof PlanFeatures;
    moduleIds: string[];
    serviceAccessModuleIds: string[];
    globalAssistantModuleIds: string[];
    aiPoweredModuleIds: string[];
    foundationalSystems: CanonicalSystemId[];
    operatingSurfaces: AgencyEngineOperatingSurface[];
    dashboardTabs: AgencyEngineDashboardTab[];
}

const PLAN_RANK: Record<SubscriptionPlanId, number> = {
    free: 0,
    hobby: 1,
    starter: 2,
    individual: 3,
    pro: 4,
    agency_starter: 5,
    agency: 6,
    agency_pro: 7,
    agency_plus: 8,
    agency_scale: 9,
    enterprise: 10,
};

const ecommerceGate = {
    requiredService: 'ecommerce' as const,
    requiredFeature: 'ecommerceEnabled' as const,
    gatingReason: 'Requires ecommerce service availability and an ecommerce-enabled plan.',
};

export const quimeraModuleRegistry: ModuleRegistryItem[] = [
    {
        id: 'agency-engine',
        label: 'Agency Engine',
        moduleKind: 'engine',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'AI-powered operating system for agencies to create, sell, provision, manage, bill, report, and scale client businesses.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageSettings',
        gatingReason: 'Requires Agency Engine service availability, an agency-enabled plan, and agency management permission.',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'ai-studio', 'global-assistant'],
        readsFrom: [
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'crm',
            'emailMarketing',
            'chatbot',
            'appointments',
            'restaurants',
            'realEstate',
            'bioPage',
            'media',
            'analytics',
            'finance',
        ],
        writesTo: [
            'crm',
            'emailMarketing',
            'analytics',
            'finance',
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'chatbot',
            'appointments',
            'restaurants',
            'realEstate',
            'bioPage',
            'media',
        ],
    },
    {
        id: 'agency-client-360',
        label: 'Agency Client 360',
        moduleKind: 'integration',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Client profile, modules, readiness, billing, notes, activity, and reports surface for agency-managed clients.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageSettings',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'global-assistant'],
        readsFrom: ['businessBlueprint', 'websiteBuilder', 'storefrontBuilder', 'analytics', 'finance', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'chatbot', 'bioPage'],
        writesTo: ['analytics', 'finance', 'crm', 'emailMarketing'],
    },
    {
        id: 'agency-client-provisioning',
        label: 'Agency Client Provisioning',
        moduleKind: 'automation',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Creates agency client tenants, projects, BusinessBlueprint drafts, module activations, invites, billing setup, and audit events.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageSettings',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'ai-studio', 'global-assistant'],
        readsFrom: ['businessBlueprint'],
        writesTo: ['businessBlueprint', 'websiteBuilder', 'storefrontBuilder', 'ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage', 'media', 'analytics', 'finance'],
    },
    {
        id: 'agency-project-transfer',
        label: 'Agency Project Transfer',
        moduleKind: 'automation',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Copies agency-owned websites and module drafts into client workspaces as reviewable draft projects with audit history and access gating.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageProjects',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'website-builder', 'global-assistant'],
        readsFrom: ['websiteBuilder', 'storefrontBuilder', 'businessBlueprint', 'ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage', 'media', 'analytics'],
        writesTo: ['websiteBuilder', 'storefrontBuilder', 'businessBlueprint', 'analytics'],
    },
    {
        id: 'agency-service-plans',
        label: 'Agency Service Plans',
        moduleKind: 'integration',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Finite client service plans owned by an agency and applied to sub-client tenants.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageBilling',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine'],
        writesTo: ['finance', 'analytics'],
    },
    {
        id: 'agency-billing',
        label: 'Agency Billing',
        moduleKind: 'integration',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Stripe Connect, Checkout, payment links, invoices, payment status, and billing audit workflows for agency clients.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageBilling',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine'],
        readsFrom: ['finance', 'analytics'],
        writesTo: ['finance', 'analytics'],
    },
    {
        id: 'agency-reports',
        label: 'Agency Reports',
        moduleKind: 'automation',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Client and portfolio reports with filters, exports, scheduled delivery, AI summaries, and activity events.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canViewAnalytics',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'global-assistant'],
        readsFrom: ['analytics', 'finance', 'websiteBuilder', 'storefrontBuilder', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'restaurants', 'realEstate', 'chatbot', 'bioPage'],
        writesTo: ['analytics'],
    },
    {
        id: 'agency-white-label',
        label: 'Agency White Label Studio',
        moduleKind: 'integration',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'White-label portal branding, client-visible navigation, support identity, email identity, custom domains, and previews.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canManageSettings',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'website-builder'],
        readsFrom: ['websiteBuilder', 'storefrontBuilder', 'designSystem'],
        writesTo: ['websiteBuilder', 'storefrontBuilder'],
    },
    {
        id: 'agency-client-portal',
        label: 'Agency Client Portal',
        moduleKind: 'integration',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Client-facing portal configuration for projects, reports, billing, approvals, activity, and support.',
        route: '/portal/dashboard',
        requiredService: 'agency',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine'],
        readsFrom: ['analytics', 'finance', 'websiteBuilder', 'storefrontBuilder', 'businessBlueprint'],
        writesTo: ['analytics'],
    },
    {
        id: 'agency-command-center',
        label: 'Agency Command Center',
        moduleKind: 'engine',
        ownerSystem: 'agency-engine',
        canonicalSystem: 'agency',
        description: 'Operational home for agency priorities, client health, revenue, readiness, alerts, activity, and Global Assistant actions.',
        requiredService: 'agency',
        requiredFeature: 'agencyModule',
        requiredPermission: 'canViewAnalytics',
        compatibleIndustries: ['all'],
        editableBy: ['agency-engine', 'global-assistant'],
        readsFrom: ['analytics', 'finance', 'websiteBuilder', 'storefrontBuilder', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'restaurants', 'realEstate', 'chatbot', 'bioPage'],
        writesTo: ['analytics', 'finance'],
    },
    {
        id: 'ai-business-blueprint',
        label: 'AI Business Blueprint',
        moduleKind: 'engine',
        ownerSystem: 'ai-studio',
        canonicalSystem: 'businessBlueprint',
        description: 'Central project contract generated by AI Studio and used to coordinate connected modules.',
        compatibleIndustries: ['all'],
        editableBy: ['ai-studio'],
        writesTo: ['websiteBuilder', 'designSystem', 'ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'finance', 'analytics', 'media', 'bioPage'],
    },
    {
        id: 'website-builder',
        label: 'Website Builder',
        moduleKind: 'engine',
        ownerSystem: 'website-builder',
        canonicalSystem: 'websiteBuilder',
        description: 'Edits website content, layout, conversion modules, and ecommerce display blocks.',
        compatibleIndustries: ['all'],
        editableBy: ['website-builder', 'ai-studio'],
        readsFrom: ['businessBlueprint', 'designSystem', 'ecommerce', 'crm', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage'],
    },
    {
        id: 'design-system',
        label: 'Design System',
        moduleKind: 'engine',
        ownerSystem: 'design-system',
        canonicalSystem: 'designSystem',
        description: 'Canonical Quimera styling contract for brand colors, typography, spacing, radius, shadows, motion, and responsive layout tokens.',
        compatibleIndustries: ['all'],
        editableBy: ['design-system', 'ai-studio', 'website-builder'],
        readsFrom: ['businessBlueprint'],
        writesTo: ['websiteBuilder', 'bioPage'],
    },
    {
        id: 'bio-page-engine',
        label: 'Bio Page Engine',
        moduleKind: 'engine',
        ownerSystem: 'bio-page-engine',
        canonicalSystem: 'bioPage',
        description: 'Mobile-first link-in-bio funnel engine for creator profiles, links, shop blocks, booking, leads, email subscribe, ChatCore, analytics, QR, SEO, and AI-generated drafts.',
        compatibleIndustries: ['all', 'creator', 'portfolio', 'ecommerce', 'restaurant', 'real-estate', 'services', 'fitness', 'beauty', 'local_business'],
        requiredService: 'bioPage',
        requiredPermission: 'canManageProjects',
        gatingReason: 'Requires Bio Page service availability.',
        editableBy: ['bio-page-engine', 'ai-studio', 'website-builder'],
        readsFrom: ['businessBlueprint', 'websiteBuilder', 'designSystem', 'ecommerce', 'appointments', 'crm', 'emailMarketing', 'chatbot', 'media', 'analytics'],
        writesTo: ['crm', 'emailMarketing', 'analytics', 'appointments'],
    },
    {
        id: 'cms-engine',
        label: 'CMS',
        moduleKind: 'engine',
        ownerSystem: 'website-builder',
        canonicalSystem: 'websiteBuilder',
        view: 'cms',
        description: 'Canonical content management surface for pages, blog content, navigation content, categories, and SEO-ready editorial workflows.',
        requiredService: 'cms',
        requiredFeature: 'cmsEnabled',
        gatingReason: 'Requires CMS service availability and a CMS-enabled plan.',
        compatibleIndustries: ['all'],
        editableBy: ['website-builder', 'ai-studio'],
        readsFrom: ['businessBlueprint', 'designSystem'],
        writesTo: ['websiteBuilder', 'analytics'],
        upgradeTrigger: 'generic',
    },
    {
        id: 'templates-library',
        label: 'Templates',
        moduleKind: 'engine',
        ownerSystem: 'website-builder',
        canonicalSystem: 'websiteBuilder',
        view: 'templates',
        description: 'Template library for starting website projects from approved layouts and sections.',
        requiredService: 'templates',
        requiredFeature: 'templates',
        gatingReason: 'Requires templates service availability and plan access.',
        compatibleIndustries: ['all'],
        editableBy: ['website-builder', 'ai-studio'],
        readsFrom: ['designSystem'],
        writesTo: ['websiteBuilder'],
    },
    {
        id: 'domains-management',
        label: 'Domains',
        moduleKind: 'integration',
        ownerSystem: 'website-builder',
        canonicalSystem: 'websiteBuilder',
        view: 'domains',
        description: 'Custom domain mapping, DNS verification, SSL status, and production domain binding.',
        requiredService: 'domains',
        requiredFeature: 'customDomains',
        requiredPermission: 'canManageDomains',
        gatingReason: 'Requires domains service availability, plan access, and domain management permission.',
        compatibleIndustries: ['all'],
        editableBy: ['website-builder'],
        readsFrom: ['websiteBuilder'],
        upgradeTrigger: 'domains',
        usageResource: 'domains',
    },
    {
        id: 'media-assets',
        label: 'Media and AI Assets',
        moduleKind: 'integration',
        ownerSystem: 'media-ai',
        canonicalSystem: 'media',
        view: 'assets',
        description: 'Asset library, image generation, and media workflows used across projects.',
        requiredService: 'aiFeatures',
        requiredFeature: 'aiImageGeneration',
        requiredPermission: 'canManageFiles',
        gatingReason: 'Requires AI features availability, image generation plan access, and file management permission.',
        compatibleIndustries: ['all'],
        editableBy: ['media-ai', 'ai-studio', 'website-builder'],
        writesTo: ['media', 'websiteBuilder', 'bioPage'],
        upgradeTrigger: 'generic',
    },
    {
        id: 'analytics-engine',
        label: 'Analytics',
        moduleKind: 'integration',
        ownerSystem: 'analytics',
        canonicalSystem: 'analytics',
        description: 'Analytics dashboards, usage summaries, conversion reporting, and module performance rollups.',
        requiredService: 'analytics',
        requiredFeature: 'analyticsBasic',
        requiredPermission: 'canViewAnalytics',
        gatingReason: 'Requires analytics service availability, plan access, and analytics permission.',
        compatibleIndustries: ['all'],
        editableBy: ['analytics'],
        readsFrom: ['ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage'],
    },
    {
        id: 'storefront-builder',
        label: 'Storefront Builder',
        moduleKind: 'engine',
        ownerSystem: 'storefront-builder',
        canonicalSystem: 'storefrontBuilder',
        description: 'Edits storefront presentation, templates, product-card style, cart visuals, and checkout visuals.',
        requiredPermission: 'canManageEcommerce',
        compatibleIndustries: ['ecommerce', 'retail', 'fashion', 'fitness', 'food', 'beauty', 'digital'],
        editableBy: ['storefront-builder', 'ai-studio'],
        readsFrom: ['ecommerce'],
        ...ecommerceGate,
    },
    {
        id: 'ecommerce-engine',
        label: 'Ecommerce Engine',
        moduleKind: 'engine',
        ownerSystem: 'ecommerce-engine',
        canonicalSystem: 'ecommerce',
        description: 'Canonical system for products, variants, prices, inventory, carts, checkout, orders, discounts, shipping, taxes, and customers.',
        requiredPermission: 'canManageEcommerce',
        usageResource: 'products',
        compatibleIndustries: ['ecommerce', 'retail', 'fashion', 'fitness', 'food', 'restaurant', 'real-estate', 'services', 'digital'],
        editableBy: ['ecommerce-admin', 'ai-studio'],
        writesTo: ['crm', 'emailMarketing', 'finance', 'analytics', 'chatbot'],
        ...ecommerceGate,
    },
    {
        id: 'website-featured-products-block',
        label: 'Website Featured Products Block',
        moduleKind: 'website-ecommerce-block',
        ownerSystem: 'website-builder',
        canonicalSystem: 'ecommerce',
        description: 'Website block that displays products from the Ecommerce Engine and routes shoppers to storefront/product pages.',
        compatibleIndustries: ['ecommerce', 'retail', 'fashion', 'fitness', 'food', 'beauty', 'digital'],
        editableBy: ['website-builder'],
        readsFrom: ['ecommerce'],
        ...ecommerceGate,
    },
    {
        id: 'storefront-home-sections',
        label: 'Storefront Home Sections',
        moduleKind: 'storefront-section',
        ownerSystem: 'storefront-builder',
        canonicalSystem: 'storefrontBuilder',
        description: 'Storefront sections such as hero, collections, product grid, promo strips, trust badges, reviews, newsletter, and footer.',
        compatibleIndustries: ['ecommerce', 'retail', 'fashion', 'fitness', 'food', 'beauty', 'digital'],
        editableBy: ['storefront-builder'],
        readsFrom: ['ecommerce', 'emailMarketing'],
        sections: ['announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'productReviews'],
        ...ecommerceGate,
    },
    {
        id: 'crm-leads',
        label: 'Leads / CRM',
        moduleKind: 'integration',
        ownerSystem: 'crm',
        canonicalSystem: 'crm',
        description: 'Canonical system for leads, lead tags, and lead activity timelines.',
        requiredService: 'crm',
        requiredFeature: 'crmEnabled',
        requiredPermission: 'canManageLeads',
        usageResource: 'leads',
        gatingReason: 'Requires CRM service availability and a CRM-enabled plan.',
        compatibleIndustries: ['all'],
        editableBy: ['crm', 'ai-studio'],
        readsFrom: ['ecommerce', 'chatbot', 'appointments', 'realEstate'],
        writesTo: ['emailMarketing', 'analytics'],
    },
    {
        id: 'email-marketing',
        label: 'Email Marketing',
        moduleKind: 'integration',
        ownerSystem: 'email-marketing',
        canonicalSystem: 'emailMarketing',
        description: 'Canonical system for campaigns, audiences, automations, transactional flow drafts, and email logs.',
        requiredService: 'emailMarketing',
        requiredFeature: 'emailMarketing',
        requiredPermission: 'canManageLeads',
        usageResource: 'emails',
        gatingReason: 'Requires email marketing service availability and plan access.',
        compatibleIndustries: ['all'],
        editableBy: ['email-marketing', 'ai-studio'],
        readsFrom: ['ecommerce', 'crm', 'appointments', 'restaurants', 'realEstate'],
        writesTo: ['analytics'],
    },
    {
        id: 'chatbot-engine',
        label: 'Chatbot Engine',
        moduleKind: 'integration',
        ownerSystem: 'chatbot-engine',
        canonicalSystem: 'chatbot',
        description: [
            'ES: Sistema canónico para ChatCore, AI Business Agent, conocimiento, acciones, conversaciones, leads, citas, ecommerce, restaurantes, real estate, Bio Page, handoff, analytics, voz y despliegue multi-superficie.',
            'EN: Canonical system for ChatCore, AI Business Agent, knowledge, actions, conversations, leads, appointments, ecommerce, restaurants, real estate, Bio Page, handoff, analytics, voice, and multi-surface deployment.',
        ].join('\n'),
        requiredService: 'chatbot',
        requiredFeature: 'chatbotEnabled',
        requiredPermission: 'canManageProjects',
        gatingReason: 'Requires chatbot service availability and plan access.',
        compatibleIndustries: ['all'],
        editableBy: ['chatbot-engine', 'ai-studio'],
        readsFrom: ['ecommerce', 'crm', 'appointments', 'restaurants', 'realEstate', 'emailMarketing', 'bioPage', 'media', 'analytics'],
        writesTo: ['crm', 'appointments', 'emailMarketing', 'analytics'],
    },
    {
        id: 'appointments-engine',
        label: 'Appointments Engine',
        moduleKind: 'integration',
        ownerSystem: 'appointments-engine',
        canonicalSystem: 'appointments',
        description: 'Canonical system for appointments, paid consultations, deposits, classes, and service bookings.',
        requiredService: 'appointments',
        requiredPermission: 'canManageProjects',
        gatingReason: 'Requires appointments service availability.',
        compatibleIndustries: ['services', 'fitness', 'wellness', 'healthcare', 'beauty', 'consulting', 'education'],
        editableBy: ['appointments-engine', 'ai-studio'],
        readsFrom: ['crm', 'ecommerce'],
        writesTo: ['crm', 'emailMarketing', 'analytics'],
    },
    {
        id: 'restaurant-engine',
        label: 'Restaurant Engine',
        moduleKind: 'integration',
        ownerSystem: 'restaurant-engine',
        canonicalSystem: 'restaurants',
        description: 'Canonical system for menus, hours, locations, reservations, restaurant analytics, and restaurant ecommerce offers.',
        requiredService: 'restaurants',
        requiredPermission: 'canManageProjects',
        gatingReason: 'Requires restaurants service availability.',
        compatibleIndustries: ['restaurant', 'cafe', 'food', 'bar', 'bakery', 'catering', 'steakhouse', 'sushi', 'pizza', 'brunch', 'food-truck'],
        editableBy: ['restaurant-engine', 'ai-studio'],
        readsFrom: ['ecommerce', 'emailMarketing'],
        writesTo: ['crm', 'emailMarketing', 'analytics'],
    },
    {
        id: 'real-estate-engine',
        label: 'Real Estate Engine',
        moduleKind: 'integration',
        ownerSystem: 'real-estate-engine',
        canonicalSystem: 'realEstate',
        description: 'Canonical system for listings, property leads, campaigns, open houses, and real estate digital products.',
        requiredService: 'realEstate',
        requiredFeature: 'realEstateModule',
        requiredPermission: 'canManageRealEstate',
        gatingReason: 'Requires real estate service availability and plan access.',
        compatibleIndustries: ['real-estate'],
        editableBy: ['real-estate-engine', 'ai-studio'],
        readsFrom: ['ecommerce', 'crm'],
        writesTo: ['crm', 'emailMarketing', 'analytics'],
    },
    {
        id: 'finance',
        label: 'Finance',
        moduleKind: 'integration',
        ownerSystem: 'finance',
        canonicalSystem: 'finance',
        description: 'Canonical system for revenue, refunds, fees, taxes, payouts, and financial reporting.',
        requiredService: 'finance',
        requiredPermission: 'canViewAnalytics',
        gatingReason: 'Requires finance service availability.',
        compatibleIndustries: ['all'],
        editableBy: ['finance'],
        readsFrom: ['ecommerce', 'appointments', 'restaurants', 'realEstate'],
        writesTo: ['analytics'],
    },
];

export const AGENCY_ENGINE_FOUNDATIONAL_SYSTEMS: CanonicalSystemId[] = [
    'businessBlueprint',
    'websiteBuilder',
    'storefrontBuilder',
    'ecommerce',
    'crm',
    'emailMarketing',
    'appointments',
    'restaurants',
    'realEstate',
    'bioPage',
    'chatbot',
    'media',
    'finance',
    'analytics',
];

export const AGENCY_ENGINE_OPERATING_SURFACES: AgencyEngineOperatingSurface[] = [
    {
        id: 'command-center',
        moduleId: 'agency-command-center',
        label: 'Agency Command Center',
        role: 'operate',
        requiredPermission: 'canViewAnalytics',
        aiPowered: true,
        globalAssistantEnabled: true,
        requiredSystems: ['analytics', 'finance', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'restaurants', 'realEstate', 'chatbot', 'bioPage'],
    },
    {
        id: 'client-360',
        moduleId: 'agency-client-360',
        label: 'Agency Client 360',
        role: 'operate',
        requiredPermission: 'canManageSettings',
        aiPowered: true,
        globalAssistantEnabled: true,
        requiredSystems: ['businessBlueprint', 'websiteBuilder', 'storefrontBuilder', 'analytics', 'finance', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'chatbot', 'bioPage'],
    },
    {
        id: 'client-provisioning',
        moduleId: 'agency-client-provisioning',
        label: 'Agency Client Provisioning',
        role: 'provision',
        requiredPermission: 'canManageSettings',
        aiPowered: true,
        globalAssistantEnabled: true,
        requiredSystems: ['businessBlueprint', 'websiteBuilder', 'storefrontBuilder', 'ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage', 'media'],
    },
    {
        id: 'project-transfer',
        moduleId: 'agency-project-transfer',
        label: 'Agency Project Transfer',
        role: 'transfer',
        requiredPermission: 'canManageProjects',
        aiPowered: false,
        globalAssistantEnabled: true,
        requiredSystems: ['websiteBuilder', 'storefrontBuilder', 'businessBlueprint', 'ecommerce', 'crm', 'emailMarketing', 'chatbot', 'appointments', 'restaurants', 'realEstate', 'bioPage', 'media'],
    },
    {
        id: 'service-plans',
        moduleId: 'agency-service-plans',
        label: 'Agency Service Plans',
        role: 'monetize',
        requiredPermission: 'canManageBilling',
        aiPowered: false,
        globalAssistantEnabled: false,
        requiredSystems: ['finance', 'analytics'],
    },
    {
        id: 'billing',
        moduleId: 'agency-billing',
        label: 'Agency Billing',
        role: 'monetize',
        requiredPermission: 'canManageBilling',
        aiPowered: false,
        globalAssistantEnabled: false,
        requiredSystems: ['finance', 'analytics'],
    },
    {
        id: 'reports',
        moduleId: 'agency-reports',
        label: 'Agency Reports',
        role: 'report',
        requiredPermission: 'canViewAnalytics',
        aiPowered: true,
        globalAssistantEnabled: true,
        requiredSystems: ['analytics', 'finance', 'websiteBuilder', 'storefrontBuilder', 'crm', 'emailMarketing', 'ecommerce', 'appointments', 'restaurants', 'realEstate', 'chatbot', 'bioPage'],
    },
    {
        id: 'white-label',
        moduleId: 'agency-white-label',
        label: 'Agency White Label Studio',
        role: 'publish',
        requiredPermission: 'canManageSettings',
        aiPowered: false,
        globalAssistantEnabled: false,
        requiredSystems: ['websiteBuilder', 'storefrontBuilder', 'businessBlueprint'],
    },
    {
        id: 'client-portal',
        moduleId: 'agency-client-portal',
        label: 'Agency Client Portal',
        role: 'publish',
        aiPowered: false,
        globalAssistantEnabled: false,
        requiredSystems: ['analytics', 'finance', 'websiteBuilder', 'storefrontBuilder', 'businessBlueprint'],
    },
];

export const AGENCY_ENGINE_DASHBOARD_TABS: AgencyEngineDashboardTab[] = [
    {
        id: 'overview',
        surfaceId: 'command-center',
        moduleId: 'agency-command-center',
        route: '/agency/overview',
        labelKey: 'agency.overview',
        label: 'Vista General',
        requiredPermission: 'canViewAnalytics',
    },
    {
        id: 'landing',
        surfaceId: 'white-label',
        moduleId: 'agency-white-label',
        route: '/agency/landing',
        labelKey: 'agency.landing',
        label: 'Landing Page',
        requiredPermission: 'canManageSettings',
    },
    {
        id: 'new-client',
        surfaceId: 'client-provisioning',
        moduleId: 'agency-client-provisioning',
        route: '/agency/new-client',
        labelKey: 'agency.newClient',
        label: 'Nuevo Cliente',
        requiredPermission: 'canManageSettings',
    },
    {
        id: 'cms',
        surfaceId: 'white-label',
        moduleId: 'agency-white-label',
        route: '/agency/cms',
        labelKey: 'agency.cms',
        label: 'CMS',
        requiredPermission: 'canManageSettings',
    },
    {
        id: 'navigation',
        surfaceId: 'white-label',
        moduleId: 'agency-white-label',
        route: '/agency/navigation',
        labelKey: 'agency.navigation',
        label: 'Menu',
        requiredPermission: 'canManageSettings',
    },
    {
        id: 'plans',
        surfaceId: 'service-plans',
        moduleId: 'agency-service-plans',
        route: '/agency/plans',
        labelKey: 'agency.plans',
        label: 'Planes',
        requiredPermission: 'canManageBilling',
    },
    {
        id: 'addons',
        surfaceId: 'service-plans',
        moduleId: 'agency-service-plans',
        route: '/agency/addons',
        labelKey: 'agency.addons',
        label: 'Add-ons',
        requiredPermission: 'canManageBilling',
    },
    {
        id: 'billing',
        surfaceId: 'billing',
        moduleId: 'agency-billing',
        route: '/agency/billing',
        labelKey: 'agency.billing',
        label: 'Facturacion',
        requiredPermission: 'canManageBilling',
    },
    {
        id: 'analytics',
        surfaceId: 'command-center',
        moduleId: 'agency-command-center',
        route: '/agency/analytics',
        labelKey: 'agency.analytics',
        label: 'Analytics',
        requiredPermission: 'canViewAnalytics',
    },
    {
        id: 'reports',
        surfaceId: 'reports',
        moduleId: 'agency-reports',
        route: '/agency/reports',
        labelKey: 'agency.reports',
        label: 'Reportes',
        requiredPermission: 'canViewAnalytics',
    },
    {
        id: 'projects',
        surfaceId: 'project-transfer',
        moduleId: 'agency-project-transfer',
        route: '/agency/projects',
        labelKey: 'agency.projects',
        label: 'Proyectos',
        requiredPermission: 'canManageProjects',
    },
    {
        id: 'white-label',
        surfaceId: 'white-label',
        moduleId: 'agency-white-label',
        route: '/agency/white-label',
        labelKey: 'agency.whiteLabel.tab',
        label: 'White Label',
        requiredPermission: 'canManageSettings',
    },
    {
        id: 'client-portal',
        surfaceId: 'client-portal',
        moduleId: 'agency-client-portal',
        route: '/agency/client-portal',
        labelKey: 'agency.clientPortal.tab',
        label: 'Client Portal',
        requiredPermission: 'canManageSettings',
    },
];

export const AGENCY_ENGINE_OPERATING_SYSTEM: AgencyEngineOperatingSystemManifest = {
    id: 'agency-engine',
    label: 'Agency Engine',
    requiredService: 'agency',
    requiredFeature: 'agencyModule',
    moduleIds: ['agency-engine', ...AGENCY_ENGINE_OPERATING_SURFACES.map(surface => surface.moduleId)],
    serviceAccessModuleIds: ['agency-engine', ...AGENCY_ENGINE_OPERATING_SURFACES.map(surface => surface.moduleId)],
    globalAssistantModuleIds: AGENCY_ENGINE_OPERATING_SURFACES
        .filter(surface => surface.globalAssistantEnabled)
        .map(surface => surface.moduleId),
    aiPoweredModuleIds: AGENCY_ENGINE_OPERATING_SURFACES
        .filter(surface => surface.aiPowered)
        .map(surface => surface.moduleId),
    foundationalSystems: AGENCY_ENGINE_FOUNDATIONAL_SYSTEMS,
    operatingSurfaces: AGENCY_ENGINE_OPERATING_SURFACES,
    dashboardTabs: AGENCY_ENGINE_DASHBOARD_TABS,
};

export function canAccessModuleRegistryItem(item: ModuleRegistryItem, access: ModuleRegistryAccessContext = {}): boolean {
    if (item.requiredPlan && access.currentPlan && PLAN_RANK[access.currentPlan] < PLAN_RANK[item.requiredPlan]) return false;
    if (item.requiredService && (!access.canAccessService || !access.canAccessService(item.requiredService))) return false;
    if (item.requiredFeature && (!access.hasPlanFeature || !access.hasPlanFeature(item.requiredFeature))) return false;
    if (item.requiredPermission && !hasRegistryPermission(access, item.requiredPermission)) return false;
    return true;
}

function hasRegistryPermission(access: ModuleRegistryAccessContext, permission: string): boolean {
    if (access.hasPermission) return access.hasPermission(permission);

    const permissions = access.permissions || {};
    if (permissions[permission] === true) return true;

    const parts = permission.split('.');
    let cursor: unknown = permissions;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return false;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor === true;
}

export function getAccessibleModuleRegistry(access: ModuleRegistryAccessContext = {}): ModuleRegistryItem[] {
    return quimeraModuleRegistry.filter(item => canAccessModuleRegistryItem(item, access));
}

export function getModuleRegistryItem(id: string): ModuleRegistryItem | undefined {
    return quimeraModuleRegistry.find(item => item.id === id);
}

export function getModulesByCanonicalSystem(system: CanonicalSystemId): ModuleRegistryItem[] {
    return quimeraModuleRegistry.filter(item => item.canonicalSystem === system || item.readsFrom?.includes(system) || item.writesTo?.includes(system));
}

export function getAgencyEngineOperatingSystemManifest(): AgencyEngineOperatingSystemManifest {
    return AGENCY_ENGINE_OPERATING_SYSTEM;
}
