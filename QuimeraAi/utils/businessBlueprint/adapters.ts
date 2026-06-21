import type {
    AnalyticsBlueprint,
    AppointmentsBlueprint,
    AutomationBlueprint,
    BusinessBlueprint,
    BlueprintEditableMetadata,
    BlueprintModuleState,
    BlueprintReadiness,
    BlueprintSource,
    ChatbotBlueprint,
    EcommerceBlueprint,
    EmailMarketingBlueprint,
    FinanceBlueprint,
    LeadBlueprint,
    MediaBlueprint,
    RealEstateBlueprint,
    RestaurantBlueprint,
    StorefrontBlueprint,
    WebsiteBlueprint,
} from '../../types/businessBlueprint';
import {
    BUSINESS_BLUEPRINT_SCHEMA_VERSION,
    BUSINESS_BLUEPRINT_VERSION,
} from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import type { PageSection } from '../../types/ui';
import {
    buildStorefrontThemeFallbackChain,
    getStorefrontCatalogSize,
    selectStorefrontThemePreset,
} from '../storefrontTheme';
import { createWebsiteEcommerceBlockSeedsFromSections } from '../websiteEcommerceBlocks';
import { createStarterEcommerceContent } from './starterEcommerceContent';

export interface BusinessBlueprintAdapterOptions {
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    createdBy?: string;
    source?: BlueprintSource;
    now?: string;
}

const ECOMMERCE_SECTIONS = new Set<PageSection>([
    'announcementBar',
    'productHero',
    'featuredProducts',
    'categoryGrid',
    'trustBadges',
    'saleCountdown',
    'collectionBanner',
    'recentlyViewed',
    'productReviews',
    'productBundle',
    'productGrid',
    'productDetail',
    'categoryProducts',
    'cart',
    'checkout',
]);

function ready(warnings: string[] = [], blockers: string[] = []): BlueprintReadiness {
    return { isReady: blockers.length === 0, blockers, warnings };
}

function metadata(now: string, generatedBy: BlueprintEditableMetadata['generatedBy'] = 'ai'): BlueprintEditableMetadata {
    return {
        generatedBy,
        userModified: false,
        generatedAt: now,
    };
}

export function createBlueprintModuleState(
    now: string,
    overrides: Partial<BlueprintModuleState> = {},
): BlueprintModuleState {
    const {
        readiness: readinessOverride,
        metadata: metadataOverride,
        ...stateOverrides
    } = overrides;

    return {
        enabled: true,
        status: 'generated',
        needsReview: false,
        ...stateOverrides,
        readiness: readinessOverride || ready(),
        metadata: { ...metadata(now), ...(metadataOverride || {}) },
    };
}

function normalizeIndustry(value?: string): string {
    const industry = (value || '').toLowerCase();
    if (industry.includes('restaurant') || industry.includes('cafe') || industry.includes('food')) return 'restaurant';
    if (industry.includes('real') || industry.includes('property') || industry.includes('inmobili')) return 'real-estate';
    if (industry.includes('fitness') || industry.includes('gym') || industry.includes('wellness')) return 'fitness';
    if (industry.includes('fashion')) return 'fashion';
    if (industry.includes('beauty') || industry.includes('spa')) return 'beauty';
    if (industry.includes('digital') || industry.includes('software')) return 'digital';
    if (industry.includes('shop') || industry.includes('store') || industry.includes('ecommerce') || industry.includes('retail')) return 'ecommerce';
    return industry || 'services';
}

function getPlannedSections(plan: WebsitePlan): PageSection[] {
    return plan.componentPlan.map(item => item.component);
}

function createWebsiteBlueprint(plan: WebsitePlan, now: string): WebsiteBlueprint {
    const sections = getPlannedSections(plan);
    const ecommerceBlocks = createWebsiteEcommerceBlockSeedsFromSections(sections)
        .map(seed => ({
            ...seed,
            ...createBlueprintModuleState(now, {
                needsReview: true,
                readiness: ready(['Website ecommerce block source should be reviewed before publishing.']),
            }),
        }));

    return {
        ...createBlueprintModuleState(now),
        pages: [{
            id: 'home',
            title: 'Home',
            slug: '/',
            sections,
        }],
        sections,
        ecommerceBlocks,
        chatbotPlacement: sections.includes('chatbot') ? 'floating' : 'none',
    };
}

function createStorefrontBlueprint(plan: WebsitePlan, now: string): StorefrontBlueprint {
    const hasEcommerce = Boolean(plan.businessProfile.hasEcommerce);
    const ecommerceSections = getPlannedSections(plan).filter(section => ECOMMERCE_SECTIONS.has(section));
    const productCount = plan.contentMap.products?.length || 0;
    const catalogSize = getStorefrontCatalogSize(productCount);
    const enabledModules = [
        ...(hasEcommerce ? ['ecommerce-engine'] : []),
        ...(normalizeIndustry(plan.businessProfile.industry) === 'restaurant' ? ['restaurant-engine'] : []),
        ...(normalizeIndustry(plan.businessProfile.industry) === 'real-estate' ? ['real-estate-engine'] : []),
    ];
    const selectedPreset = selectStorefrontThemePreset({
        industry: plan.businessProfile.industry,
        catalogSize,
        enabledModules,
    });

    return {
        ...createBlueprintModuleState(now, {
            enabled: hasEcommerce,
            status: hasEcommerce ? 'generated' : 'disabled',
            needsReview: hasEcommerce,
            readiness: hasEcommerce
                ? ready(['Storefront theme, product card style, and section sources need merchant review.'])
                : ready([], ['Ecommerce is not enabled for this business blueprint.']),
        }),
        routeStrategy: 'project-store',
        themePreset: selectedPreset.id,
        catalogSize,
        templateCompatibility: selectedPreset.compatibility,
        themeFallbackChain: buildStorefrontThemeFallbackChain({
            industry: plan.businessProfile.industry,
            catalogSize,
            enabledModules,
            preferredPresetId: selectedPreset.id,
        }),
        productCardVariant: hasEcommerce ? selectedPreset.productCardVariant : undefined,
        templates: {
            home: 'default-store-home',
            collection: 'default-collection',
            product: 'default-product',
            cart: 'default-cart',
            checkoutVisual: 'default-checkout-visual',
        },
        sections: ecommerceSections.map((section, index) => ({
            id: `storefront-${section}-${index + 1}`,
            type: section,
            order: index,
            dataSource: section === 'categoryGrid' ? 'store_categories' : 'store_products',
            ...createBlueprintModuleState(now, {
                needsReview: true,
                readiness: ready(['Storefront section settings should be reviewed before publishing.']),
            }),
        })),
    };
}

function createEcommerceBlueprint(plan: WebsitePlan, now: string): EcommerceBlueprint {
    const hasEcommerce = Boolean(plan.businessProfile.hasEcommerce);
    const starterContent = createStarterEcommerceContent(plan, { enabled: hasEcommerce });

    return {
        ...createBlueprintModuleState(now, {
            enabled: hasEcommerce,
            status: hasEcommerce ? 'generated' : 'disabled',
            needsReview: hasEcommerce,
            readiness: hasEcommerce
                ? ready([
                    'Starter products are drafts until merchant review.',
                    'Prices and stock are not production-ready unless explicitly provided by the merchant.',
                ])
                : ready([], ['Ecommerce is not enabled for this business blueprint.']),
        }),
        categories: starterContent.categories,
        starterProducts: starterContent.starterProducts,
        inventoryMode: hasEcommerce ? 'not_configured' : 'not_configured',
        fulfillmentMode: hasEcommerce ? 'not_configured' : 'not_configured',
        discounts: starterContent.discounts,
        giftCards: starterContent.giftCards,
    };
}

function createChatbotBlueprint(plan: WebsitePlan, now: string): ChatbotBlueprint {
    return {
        ...createBlueprintModuleState(now, {
            needsReview: true,
            readiness: ready(['Chatbot policy and product knowledge should be reviewed before publishing.']),
        }),
        businessKnowledge: [
            plan.businessProfile.businessName,
            plan.businessProfile.industry,
            plan.businessProfile.description,
            ...plan.businessProfile.services.map(service => service.name),
        ].filter(Boolean),
        productKnowledge: plan.businessProfile.hasEcommerce ? ['categories', 'featured products', 'shipping policy', 'return policy'] : [],
        policyKnowledge: ['business hours', 'contact information'],
        eventIntents: ['lead_created', 'chatbot_product_question'],
    };
}

function createLeadBlueprint(plan: WebsitePlan, now: string): LeadBlueprint {
    return {
        ...createBlueprintModuleState(now),
        leadSources: ['lead form', 'chatbot handoff', ...(plan.businessProfile.hasEcommerce ? ['product inquiry', 'abandoned cart'] : [])],
        leadTags: ['ai-studio', normalizeIndustry(plan.businessProfile.industry), ...(plan.businessProfile.hasEcommerce ? ['ecommerce', 'product-interest'] : [])],
        activityTimelineEvents: ['Viewed website', 'Submitted form', 'Asked chatbot', ...(plan.businessProfile.hasEcommerce ? ['Viewed product', 'Started checkout'] : [])],
    };
}

function createEmailMarketingBlueprint(plan: WebsitePlan, now: string): EmailMarketingBlueprint {
    return {
        ...createBlueprintModuleState(now, {
            needsReview: true,
            readiness: ready(['Email flows are drafts until sender, templates, and audiences are configured.']),
        }),
        flows: [
            { type: 'welcome', status: 'draft', triggerEvent: 'newsletter_signup' },
            ...(plan.businessProfile.hasEcommerce
                ? [
                    { type: 'abandoned_cart', status: 'draft' as const, triggerEvent: 'cart_abandoned' },
                    { type: 'order_confirmation', status: 'draft' as const, triggerEvent: 'order_created' },
                    { type: 'post_purchase', status: 'draft' as const, triggerEvent: 'purchase_completed' },
                ]
                : []),
        ],
        logEvents: ['email_flow_queued', 'email_sent'],
    };
}

function createMediaBlueprint(plan: WebsitePlan, now: string): MediaBlueprint {
    return {
        ...createBlueprintModuleState(now),
        imageNeeds: plan.assetPlan.filter(asset => asset.source === 'generate').map(asset => asset.targetPath),
        videoNeeds: [],
        brandAssetNeeds: plan.brandProfile.logoUrl ? [] : ['logo'],
    };
}

function createAppointmentsBlueprint(plan: WebsitePlan, now: string): AppointmentsBlueprint {
    const wantsBooking = getPlannedSections(plan).some(section => section === 'restaurantReservation' || section === 'leads');
    return {
        ...createBlueprintModuleState(now, {
            enabled: wantsBooking,
            status: wantsBooking ? 'generated' : 'disabled',
            readiness: wantsBooking ? ready(['Availability is not configured yet.']) : ready(),
        }),
        serviceTypes: plan.businessProfile.services.map(service => service.name),
        paidBookingTypes: [],
        availabilityStatus: 'not_configured',
    };
}

function createRestaurantBlueprint(plan: WebsitePlan, now: string): RestaurantBlueprint {
    const isRestaurant = normalizeIndustry(plan.businessProfile.industry) === 'restaurant';
    return {
        ...createBlueprintModuleState(now, {
            enabled: isRestaurant,
            status: isRestaurant ? 'generated' : 'disabled',
            needsReview: isRestaurant,
        }),
        menuSignals: isRestaurant ? plan.businessProfile.services.map(service => service.name) : [],
        reservationRules: isRestaurant ? ['party size', 'business hours', 'reservation interval'] : [],
        ecommerceOffers: isRestaurant ? ['gift cards', 'event tickets', 'catering packages'] : [],
    };
}

function createRealEstateBlueprint(plan: WebsitePlan, now: string): RealEstateBlueprint {
    const isRealEstate = normalizeIndustry(plan.businessProfile.industry) === 'real-estate';
    return {
        ...createBlueprintModuleState(now, {
            enabled: isRealEstate,
            status: isRealEstate ? 'generated' : 'disabled',
            needsReview: isRealEstate,
        }),
        listingTypes: isRealEstate ? ['sale listings', 'rental listings'] : [],
        leadTypes: isRealEstate ? ['buyer', 'seller', 'property inquiry'] : [],
        digitalProducts: isRealEstate ? ['buyer guide', 'seller consultation'] : [],
    };
}

function createFinanceBlueprint(plan: WebsitePlan, now: string): FinanceBlueprint {
    return {
        ...createBlueprintModuleState(now, {
            needsReview: Boolean(plan.businessProfile.hasEcommerce),
        }),
        trackedMetrics: ['gross revenue', 'refunds', 'fees', 'net revenue'],
        revenueSources: plan.businessProfile.hasEcommerce ? ['orders'] : [],
        refundSources: plan.businessProfile.hasEcommerce ? ['order refunds'] : [],
    };
}

function createAnalyticsBlueprint(plan: WebsitePlan, now: string): AnalyticsBlueprint {
    return {
        ...createBlueprintModuleState(now),
        events: [
            'newsletter_signup',
            'lead_created',
            ...(plan.businessProfile.hasEcommerce
                ? ['product_viewed', 'add_to_cart', 'checkout_started', 'purchase_completed', 'cart_abandoned']
                : []),
        ],
        dashboards: ['conversion rate', 'leads', ...(plan.businessProfile.hasEcommerce ? ['revenue', 'top products', 'abandoned carts'] : [])],
    };
}

function createAutomationBlueprint(plan: WebsitePlan, now: string): AutomationBlueprint {
    return {
        ...createBlueprintModuleState(now, {
            needsReview: true,
            readiness: ready(['Automation flows are drafts until reviewed.']),
        }),
        flows: [
            {
                id: 'welcome-lead-flow',
                name: 'Welcome lead follow-up',
                sourceModule: 'crm',
                triggerEvent: 'lead_created',
                status: 'draft',
            },
            ...(plan.businessProfile.hasEcommerce
                ? [{
                    id: 'abandoned-cart-flow',
                    name: 'Abandoned cart recovery',
                    sourceModule: 'ecommerce' as const,
                    triggerEvent: 'cart_abandoned' as const,
                    status: 'draft' as const,
                }]
                : []),
        ],
    };
}

export function createBusinessBlueprintFromWebsitePlan(
    plan: WebsitePlan,
    options: BusinessBlueprintAdapterOptions = {},
): BusinessBlueprint {
    const now = options.now || new Date().toISOString();
    const ecommerceEnabled = Boolean(plan.businessProfile.hasEcommerce);
    const blueprintReadiness = ecommerceEnabled
        ? ready([
            'Ecommerce settings, payment provider, shipping, tax, and inventory must be reviewed before publishing.',
        ])
        : ready();

    return {
        blueprintVersion: BUSINESS_BLUEPRINT_VERSION,
        schemaVersion: BUSINESS_BLUEPRINT_SCHEMA_VERSION,
        generatedAt: now,
        source: options.source || (plan.source === 'imported-url' ? 'imported' : 'ai-studio'),
        tenantId: options.tenantId,
        projectId: options.projectId,
        workspaceId: options.workspaceId,
        createdBy: options.createdBy,
        status: 'generated',
        readiness: blueprintReadiness,
        sourceMap: {
            businessName: 'websitePlan.businessProfile.businessName',
            industry: 'websitePlan.businessProfile.industry',
            services: 'websitePlan.businessProfile.services',
            brandColors: 'websitePlan.brandProfile.colors',
            websiteSections: 'websitePlan.componentPlan',
            generatedAssets: 'websitePlan.assetPlan',
            ecommerceIntent: 'websitePlan.businessProfile.hasEcommerce',
        },
        metadata: metadata(now),
        businessProfile: {
            ...createBlueprintModuleState(now),
            businessName: plan.businessProfile.businessName,
            industry: plan.businessProfile.industry,
            description: plan.businessProfile.description,
            tagline: plan.businessProfile.tagline,
            services: plan.businessProfile.services,
            contactInfo: plan.businessProfile.contactInfo || {},
        },
        brandProfile: {
            ...createBlueprintModuleState(now),
            colors: plan.brandProfile.colors as Record<string, string>,
            fonts: plan.brandProfile.fonts,
            visualStyle: plan.brandProfile.visualStyle,
            logoUrl: plan.brandProfile.logoUrl,
            isDarkTheme: plan.brandProfile.isDarkTheme,
            colorCandidates: plan.brandProfile.colorCandidates,
            selectedColorCandidateId: plan.brandProfile.selectedColorCandidateId,
        },
        websiteBlueprint: createWebsiteBlueprint(plan, now),
        storefrontBlueprint: createStorefrontBlueprint(plan, now),
        ecommerceBlueprint: createEcommerceBlueprint(plan, now),
        chatbotBlueprint: createChatbotBlueprint(plan, now),
        leadBlueprint: createLeadBlueprint(plan, now),
        emailMarketingBlueprint: createEmailMarketingBlueprint(plan, now),
        mediaBlueprint: createMediaBlueprint(plan, now),
        appointmentsBlueprint: createAppointmentsBlueprint(plan, now),
        restaurantBlueprint: createRestaurantBlueprint(plan, now),
        realEstateBlueprint: createRealEstateBlueprint(plan, now),
        financeBlueprint: createFinanceBlueprint(plan, now),
        analyticsBlueprint: createAnalyticsBlueprint(plan, now),
        automationBlueprint: createAutomationBlueprint(plan, now),
    };
}

export function isBusinessBlueprint(value: unknown): value is BusinessBlueprint {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as BusinessBlueprint).schemaVersion === BUSINESS_BLUEPRINT_SCHEMA_VERSION &&
        typeof (value as BusinessBlueprint).blueprintVersion === 'string' &&
        Boolean((value as BusinessBlueprint).businessProfile) &&
        Boolean((value as BusinessBlueprint).websiteBlueprint)
    );
}

export function migrateBusinessBlueprint(value: unknown): BusinessBlueprint | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (isBusinessBlueprint(value)) return value;
    return null;
}

export function shouldProtectFromRegeneration(module: Pick<BlueprintModuleState, 'metadata'>): boolean {
    return Boolean(module.metadata.userModified || module.metadata.lockedFromRegeneration);
}
