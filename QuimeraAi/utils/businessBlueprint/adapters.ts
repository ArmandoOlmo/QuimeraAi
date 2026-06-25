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
    getStorefrontCatalogSize,
    getStorefrontCatalogSizeRule,
} from '../storefrontTheme';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
import { createWebsiteEcommerceBlockSeedsFromSections } from '../websiteEcommerceBlocks';
import { createStarterEcommerceContent } from './starterEcommerceContent';
import {
    createRestaurantBlueprintFromWebsitePlan,
    normalizeRestaurantBlueprint,
} from './restaurantBlueprint';

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
    if (/\b(restaurant|restaurante|caf[eé]|cafeteria|food|comida|steakhouse|bakery|panader[ií]a|catering|bar|sushi|pizza|brunch|fine dining|casual dining|food truck|menu|reservas?)\b/i.test(industry)) return 'restaurant';
    if (industry.includes('real') || industry.includes('property') || industry.includes('inmobili') || industry.includes('bienes raices') || industry.includes('bienes raíces')) return 'real-estate';
    if (industry.includes('fitness') || industry.includes('gym') || industry.includes('wellness')) return 'fitness';
    if (industry.includes('fashion')) return 'fashion';
    if (industry.includes('beauty') || industry.includes('spa')) return 'beauty';
    if (industry.includes('digital') || industry.includes('software')) return 'digital';
    if (industry.includes('shop') || industry.includes('store') || industry.includes('ecommerce') || industry.includes('retail')) return 'ecommerce';
    return industry || 'services';
}

function buildAppointmentSignalText(plan: WebsitePlan): string {
    const profile = plan.businessProfile as WebsitePlan['businessProfile'] & {
        subIndustry?: string;
        targetAudience?: string;
        goals?: string[];
    };

    return [
        profile.businessName,
        profile.industry,
        profile.subIndustry,
        profile.description,
        profile.tagline,
        profile.targetAudience,
        ...(profile.goals || []),
        ...profile.services.flatMap(service => [service.name, service.description]),
    ].filter(Boolean).join(' ').toLowerCase();
}

function hasAppointmentSignal(plan: WebsitePlan, sections: PageSection[]): boolean {
    const text = buildAppointmentSignalText(plan);
    const industry = normalizeIndustry(plan.businessProfile.industry);

    return sections.some(section => ['restaurantReservation', 'leads', 'chatbot'].includes(section))
        || /\b(appointment|appointments|booking|bookings|reservation|reservations|reserve|schedule|scheduled|consultation|consult|session|class|demo|call|tour|cita|citas|agenda|agendar|programar|reserva|reservas|reservar|reservacion|reservaci[oó]n|consulta|sesion|sesi[oó]n|clase|llamada|tour)\b/i.test(text)
        || ['restaurant', 'fitness', 'beauty', 'real-estate'].includes(industry);
}

function toBlueprintId(prefix: string, value: string, index: number): string {
    const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48);

    return `${prefix}-${slug || index + 1}`;
}

function defaultAppointmentWeeklyHours() {
    return [
        { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
        { day: 'saturday', enabled: false, startTime: '09:00', endTime: '13:00' },
        { day: 'sunday', enabled: false, startTime: '09:00', endTime: '13:00' },
    ];
}

function getPlannedSections(plan: WebsitePlan): PageSection[] {
    return plan.componentPlan
        .map(item => item.component)
        .filter(section => !isRetiredDesignSuiteSection(section));
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
        componentOrder: sections,
        sectionVisibility: sections.reduce((acc, section) => {
            acc[section] = true;
            return acc;
        }, {} as Record<PageSection, boolean>),
        sectionBlueprints: sections.map((section, index) => ({
            id: `website-section-${section}-${index + 1}`,
            type: section,
            order: index,
            visible: true,
            pageIds: ['home'],
            ...createBlueprintModuleState(now, {
                sourceMap: {
                    section: `websitePlan.componentPlan.${index}`,
                },
            }),
        })),
        ecommerceBlocks,
        chatbotPlacement: sections.includes('chatbot') ? 'floating' : 'none',
    };
}

function createStorefrontBlueprint(plan: WebsitePlan, now: string): StorefrontBlueprint {
    const hasEcommerce = Boolean(plan.businessProfile.hasEcommerce);
    const ecommerceSections = getPlannedSections(plan).filter(section => ECOMMERCE_SECTIONS.has(section));
    const productCount = plan.contentMap.products?.length || 0;
    const catalogSize = getStorefrontCatalogSize(productCount);
    const catalogRule = getStorefrontCatalogSizeRule(catalogSize);

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
        catalogSize,
        themeFallbackChain: [
            'DEFAULT_STOREFRONT_THEME',
            'brandColors',
            'projectGlobalColors',
            'storefrontTheme',
        ],
        productCardVariant: hasEcommerce ? catalogRule.recommendedProductCardVariant : undefined,
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
    const sections = getPlannedSections(plan);
    const wantsBooking = hasAppointmentSignal(plan, sections);
    const serviceNames = plan.businessProfile.services
        .map(service => service.name.trim())
        .filter(Boolean);
    const serviceTypes = serviceNames.length > 0 ? serviceNames : (wantsBooking ? ['General appointment'] : []);
    const hasPublicBookingBlock = sections.some(section => section === 'restaurantReservation' || section === 'leads');
    const hasChatCoreSurface = sections.includes('chatbot');
    const hasEcommerce = Boolean(plan.businessProfile.hasEcommerce);
    const paidBookingTypes = serviceTypes.filter(service => /\b(paid|deposit|prepaid|pago|dep[oó]sito|prepago)\b/i.test(service));

    return {
        ...createBlueprintModuleState(now, {
            enabled: wantsBooking,
            status: wantsBooking ? 'generated' : 'disabled',
            needsReview: wantsBooking,
            readiness: wantsBooking
                ? ready([
                    'Availability, buffers, confirmation rules, and reminders must be reviewed before publishing booking.',
                    'ChatCore booking intents must confirm date, time, service, contact, and consent before creating a canonical appointment.',
                    ...(hasEcommerce ? ['Deposits and paid booking products must be mapped before collecting appointment payments.'] : []),
                ])
                : ready([], ['No appointment or booking signal was detected in this business blueprint.']),
            sourceMap: {
                services: 'websitePlan.businessProfile.services',
                websiteSections: 'websitePlan.componentPlan',
                chatcore: 'chatbotBlueprint.eventIntents',
                crm: 'leadBlueprint',
                ecommerce: 'ecommerceBlueprint',
            },
        }),
        engineVersion: 'v2',
        sourceOfTruth: 'project_appointments',
        legacyReadOnlySources: [
            'users/{userId}/projects/{projectId}/appointments',
            'users/{userId}/projects/{projectId}/blockedDates',
            'widget_public_appointments_legacy_payloads',
        ],
        serviceTypes,
        paidBookingTypes,
        services: serviceTypes.map((name, index) => ({
            id: toBlueprintId('appointment-service', name, index),
            name,
            description: plan.businessProfile.services.find(service => service.name === name)?.description,
            durationMinutes: 60,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 15,
            paymentMode: paidBookingTypes.includes(name) ? 'deposit' : 'none',
            currency: hasEcommerce ? 'USD' : undefined,
            needsReview: true,
            sourceMap: {
                name: `websitePlan.businessProfile.services.${index}.name`,
                description: `websitePlan.businessProfile.services.${index}.description`,
            },
        })),
        availabilityStatus: wantsBooking ? 'draft' : 'not_configured',
        availability: {
            weeklyHours: defaultAppointmentWeeklyHours(),
            blockedTimeSource: 'project_appointment_blocks',
            minimumNoticeMinutes: 120,
            maxAdvanceDays: 60,
            intervalMinutes: 30,
            capacityPerSlot: 1,
        },
        bookingRules: {
            confirmationMode: 'manual',
            cancellationPolicy: 'Draft policy required before publishing public booking.',
            reschedulePolicy: 'Draft policy required before publishing public booking.',
            reminders: [
                { channel: 'email', offsetMinutes: 1440, templateKey: 'appointment_reminder_24h' },
                { channel: 'chatcore', offsetMinutes: 120, templateKey: 'appointment_reminder_2h' },
            ],
            leadRequiredFields: ['name', 'email'],
        },
        publicBooking: {
            enabled: wantsBooking && hasPublicBookingBlock,
            status: hasPublicBookingBlock ? 'draft' : 'not_configured',
            needsReview: true,
            routeStrategy: hasPublicBookingBlock ? 'widget_api' : 'disabled',
            componentIds: sections
                .filter(section => section === 'restaurantReservation' || section === 'leads')
                .map(section => `${section}-booking-entry`),
            events: ['lead_created', 'appointment_requested'],
        },
        chatcore: {
            enabled: wantsBooking,
            status: hasChatCoreSurface || wantsBooking ? 'draft' : 'not_configured',
            needsReview: true,
            source: 'ChatCore',
            intentNames: ['appointment.request', 'appointment.reschedule', 'appointment.cancel', 'appointment.prepare'],
            events: ['appointment_requested', 'lead_created'],
            notes: [
                'ChatCore must create appointments through the canonical appointment engine only.',
                'Chat transcript and correlation identifiers should be stored in appointment metadata.',
            ],
        },
        crm: {
            enabled: wantsBooking,
            status: wantsBooking ? 'draft' : 'not_configured',
            needsReview: true,
            leadLinking: 'create_or_link',
            pipelineStage: 'appointment_requested',
            taskStrategy: 'follow_up_after_completed',
            events: ['lead_created', 'appointment_requested', 'appointment_completed'],
        },
        emailMarketing: {
            enabled: wantsBooking,
            status: wantsBooking ? 'draft' : 'not_configured',
            needsReview: true,
            flowTypes: ['appointment_confirmation', 'appointment_reminder', 'appointment_follow_up'],
            events: ['email_flow_queued', 'email_sent'],
        },
        analytics: {
            enabled: wantsBooking,
            status: wantsBooking ? 'draft' : 'not_configured',
            needsReview: false,
            eventNames: ['appointment_requested', 'appointment_confirmed', 'appointment_completed', 'appointment_cancelled'],
            events: ['appointment_requested', 'appointment_confirmed', 'appointment_completed', 'appointment_cancelled'],
        },
        googleCalendar: {
            enabled: wantsBooking,
            status: 'not_configured',
            needsReview: true,
            syncDirection: 'export_only',
            events: ['appointment_confirmed', 'appointment_updated', 'appointment_cancelled'],
        },
        ecommerce: {
            enabled: wantsBooking && hasEcommerce,
            status: wantsBooking && hasEcommerce ? 'draft' : 'not_configured',
            needsReview: wantsBooking && hasEcommerce,
            paymentMode: paidBookingTypes.length > 0 ? 'deposit' : 'none',
            depositProductStrategy: paidBookingTypes.length > 0 ? 'per_service' : 'none',
            events: ['payment_succeeded', 'payment_failed', 'order_created'],
        },
        aiPreparation: {
            enabled: wantsBooking,
            status: wantsBooking ? 'draft' : 'not_configured',
            needsReview: true,
            enabledByDefault: true,
            usesLinkedLeads: true,
            promptContext: [
                'appointment details',
                'linked lead profile',
                'lead activity timeline',
                'ChatCore transcript',
                'project business blueprint',
            ],
            events: ['content_generated', 'content_review_requested'],
        },
        websiteBuilderBlocks: [
            ...(hasPublicBookingBlock ? [{
                componentId: 'appointmentCTA',
                purpose: 'appointment_cta' as const,
                status: 'draft' as const,
            }] : []),
            ...(wantsBooking ? [{
                componentId: 'publicBookingForm',
                purpose: 'public_booking_form' as const,
                status: 'needs_review' as const,
            }] : []),
        ],
    };
}

function createRestaurantBlueprint(plan: WebsitePlan, now: string): RestaurantBlueprint {
    return createRestaurantBlueprintFromWebsitePlan(plan, now);
}

function createRealEstateBlueprint(plan: WebsitePlan, now: string): RealEstateBlueprint {
    const isRealEstate = normalizeIndustry(plan.businessProfile.industry) === 'real-estate';
    const artifactStatus = isRealEstate ? 'needs_review' : 'disabled';
    const text = [
        plan.businessProfile.businessName,
        plan.businessProfile.industry,
        plan.businessProfile.description,
        plan.businessProfile.tagline,
        ...plan.businessProfile.services.flatMap(service => [service.name, service.description]),
    ].filter(Boolean).join(' ').toLowerCase();
    const hasBrokerageSignal = /\b(brokerage|broker|team|equipo|inmobiliaria|realty group)\b/i.test(text);
    const contact = plan.businessProfile.contactInfo || {};
    const sourceMap = {
        businessName: 'websitePlan.businessProfile.businessName',
        industry: 'websitePlan.businessProfile.industry',
        description: 'websitePlan.businessProfile.description',
        services: 'websitePlan.businessProfile.services',
        properties: 'websitePlan.contentMap.properties',
    };
    const toStringArray = (value: unknown): string[] => Array.isArray(value)
        ? value.map(item => String(item || '').trim()).filter(Boolean)
        : typeof value === 'string' && value.trim()
            ? value.split(',').map(item => item.trim()).filter(Boolean)
            : [];
    const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';
    const numberValue = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    const propertyDrafts = isRealEstate
        ? (plan.contentMap.properties || []).slice(0, 12).map((property: any, index): RealEstateBlueprint['listingDrafts'][number] => {
            const title = stringValue(property?.title || property?.name) || `Draft listing ${index + 1}`;
            const price = numberValue(property?.price);
            const slug = title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 90) || `draft-listing-${index + 1}`;

            return {
                id: stringValue(property?.id) || `realty-listing-draft-${index + 1}`,
                title,
                slug,
                descriptionShort: stringValue(property?.descriptionShort || property?.summary || property?.description).slice(0, 240),
                descriptionLong: stringValue(property?.descriptionLong || property?.description || property?.summary),
                price,
                currency: stringValue(property?.currency) || 'USD',
                priceSource: price === undefined ? 'unset' : 'user-provided',
                transactionType: ['sale', 'rent', 'lease'].includes(String(property?.transactionType)) ? property.transactionType : 'sale',
                propertyType: ['house', 'condo', 'apartment', 'townhouse', 'land', 'commercial'].includes(String(property?.propertyType)) ? property.propertyType : 'house',
                address: stringValue(property?.address),
                city: stringValue(property?.city || contact.city),
                state: stringValue(property?.state || contact.state),
                country: stringValue(property?.country || contact.country),
                postalCode: stringValue(property?.postalCode || property?.zipCode),
                bedrooms: numberValue(property?.bedrooms),
                bathrooms: numberValue(property?.bathrooms),
                halfBathrooms: numberValue(property?.halfBathrooms),
                area: numberValue(property?.area || property?.squareFeet),
                areaUnit: property?.areaUnit === 'sqm' ? 'sqm' : 'sqft',
                lotSize: numberValue(property?.lotSize),
                parkingSpaces: numberValue(property?.parkingSpaces),
                yearBuilt: numberValue(property?.yearBuilt),
                hoaFee: numberValue(property?.hoaFee),
                taxes: numberValue(property?.taxes),
                amenities: toStringArray(property?.amenities),
                features: toStringArray(property?.features),
                highlights: toStringArray(property?.highlights),
                imagePrompts: toStringArray(property?.imagePrompts),
                images: toStringArray(property?.images),
                videoUrl: stringValue(property?.videoUrl),
                virtualTourUrl: stringValue(property?.virtualTourUrl),
                isFeatured: Boolean(property?.isFeatured),
                status: 'needs_review',
                publicEnabled: false,
                needsReview: true,
                generatedByAI: true,
                userModified: false,
                listingScore: 0,
                sourceMap,
            };
        })
        : [];
    const offer = (enabled = isRealEstate): RealEstateBlueprint['ecommerceOffers']['buyerGuides'] => ({
        enabled,
        status: enabled ? 'needs_review' : 'disabled',
        priceSource: 'unset',
        needsReview: enabled,
    });
    const artifact = (
        key: RealEstateBlueprint['engineArtifacts'][number]['key'],
        module: RealEstateBlueprint['engineArtifacts'][number]['module'],
        title: string,
        description: string,
        dependencies: string[] = [],
        analyticsEvents: RealEstateBlueprint['analyticsEvents'] = [],
    ): RealEstateBlueprint['engineArtifacts'][number] => ({
        id: `real-estate-${key}`,
        key,
        module,
        title,
        description,
        status: artifactStatus,
        needsReview: isRealEstate,
        generatedByAI: true,
        userModified: false,
        sourceMap,
        dependencies,
        analyticsEvents,
    });

    return {
        ...createBlueprintModuleState(now, {
            enabled: isRealEstate,
            status: isRealEstate ? 'needs_review' : 'disabled',
            needsReview: isRealEstate,
            readiness: isRealEstate
                ? ready([
                    'Real Estate Engine artifacts are generated as drafts and need review before publishing or activation.',
                    'Showing requests, email automations, chatbot knowledge, and monetization offers are not activated automatically.',
                ])
                : ready([], ['Real estate signals were not detected in this business blueprint.']),
            metadata: {
                generatedBy: 'ai',
                generatedByAI: true,
                userModified: false,
                generatedAt: now,
                updatedAt: now,
                lastSyncedAt: now,
                generationSource: 'ai-studio-realty-engine',
            },
        }),
        profileType: hasBrokerageSignal ? 'brokerage' : 'agent',
        agentProfile: {
            name: plan.businessProfile.businessName,
            email: stringValue(contact.email),
            phone: stringValue(contact.phone),
            photoUrl: stringValue(contact.photoUrl),
            licenseNumber: '',
            brokerageName: hasBrokerageSignal ? plan.businessProfile.businessName : '',
            brokerageLogoUrl: plan.brandProfile.logoUrl,
            bio: plan.businessProfile.description,
            specialties: isRealEstate ? ['buyer representation', 'seller representation', 'property marketing'] : [],
            serviceAreas: isRealEstate ? toStringArray([contact.city, contact.state, contact.country].filter(Boolean).join(', ')) : [],
            languages: [],
            website: stringValue(contact.website),
            socialLinks: {},
            complianceNotes: isRealEstate ? ['License number, brokerage disclosures, and fair housing/compliance copy must be reviewed before publishing.'] : [],
            sourceMap,
            readiness: isRealEstate
                ? ready(['Agent profile is AI-generated and needs license/contact review.'])
                : ready([], ['Real estate profile is disabled.']),
        },
        brokerageProfile: {
            name: hasBrokerageSignal ? plan.businessProfile.businessName : '',
            licenseNumber: '',
            address: stringValue(contact.address),
            phone: stringValue(contact.phone),
            email: stringValue(contact.email),
            logoUrl: plan.brandProfile.logoUrl,
            brandStyle: plan.brandProfile.visualStyle,
            officeLocations: isRealEstate ? toStringArray([contact.city, contact.state, contact.country].filter(Boolean).join(', ')) : [],
            teamMembers: [],
            sourceMap,
            readiness: hasBrokerageSignal
                ? ready(['Brokerage profile is a draft and needs compliance review.'])
                : ready(['No brokerage signal was provided; brokerage profile remains an empty draft.']),
        },
        listingDrafts: propertyDrafts,
        websiteRoutes: {
            profile: '/agente',
            directory: '/listados',
            propertyDetail: '/listados/:slug',
            openHouses: '/open-houses',
        },
        listingTypes: isRealEstate ? ['sale listings', 'rental listings', 'luxury listings', 'investment properties', 'new developments'] : [],
        leadTypes: isRealEstate ? ['buyer', 'seller', 'renter', 'investor', 'property inquiry', 'showing request', 'open house registration'] : [],
        pageTypes: isRealEstate ? ['agent profile', 'brokerage profile', 'property directory', 'listing detail', 'open house detail', 'seller landing page', 'buyer guide landing page'] : [],
        leadFunnels: {
            buyerLeadEnabled: isRealEstate,
            sellerLeadEnabled: isRealEstate,
            renterLeadEnabled: isRealEstate,
            investorLeadEnabled: isRealEstate,
            valuationCtaEnabled: isRealEstate,
            buyerGuideEnabled: isRealEstate,
            sellerGuideEnabled: isRealEstate,
            contactFormEnabled: isRealEstate,
            propertyInquiryEnabled: isRealEstate,
            openHouseRegistrationEnabled: isRealEstate,
            showingRequestEnabled: isRealEstate,
            leadTags: isRealEstate ? ['realty', 'buyer', 'seller', 'renter', 'investor', 'property-inquiry', 'showing-request', 'open-house'] : [],
            leadSources: isRealEstate ? ['realty-website', 'property-detail', 'open-house', 'showing-request', 'chatbot', 'seller-valuation'] : [],
            crmPipelineStages: isRealEstate ? ['new', 'contacted', 'qualified', 'showing_scheduled', 'offer_made', 'closed', 'lost'] : [],
            needsReview: isRealEstate,
            readiness: isRealEstate
                ? ready(['Lead funnels are draft-only until CRM, email, chatbot, and analytics sync are reviewed.'])
                : ready(),
        },
        showingRequests: {
            enabled: isRealEstate,
            status: artifactStatus,
            availabilitySource: 'unset',
            preferredDateEnabled: true,
            preferredTimeEnabled: true,
            buyerQualificationFields: ['lead type', 'budget', 'financing status', 'preferred area'],
            financingStatusField: true,
            budgetField: true,
            assignedAgentStrategy: 'manual',
            confirmationMode: 'manual',
            remindersEnabled: false,
            appointmentIntegrationEnabled: false,
            needsReview: isRealEstate,
            readiness: isRealEstate
                ? ready(['Availability source is not configured.', 'Appointment integration is off until reviewed.'])
                : ready(),
        },
        openHouses: {
            enabled: isRealEstate,
            defaultDurationMinutes: 90,
            registrationEnabled: true,
            capacityEnabled: true,
            reminderFlowEnabled: false,
            followUpFlowEnabled: false,
            status: isRealEstate ? 'needs_review' : 'draft',
            needsReview: isRealEstate,
            readiness: isRealEstate
                ? ready(['Reminder and follow-up flows are drafts until Email Marketing is configured.'])
                : ready(),
        },
        campaigns: {
            campaigns: isRealEstate ? [
                { id: 'realty-just-listed', type: 'just_listed', title: 'Just listed campaign', targetAudience: 'buyer leads', channels: ['social', 'email', 'ads'], status: 'draft', generatedByAI: true, userModified: false, sourceMap },
                { id: 'realty-open-house', type: 'open_house', title: 'Open house campaign', targetAudience: 'local buyer leads', channels: ['social', 'email', 'sms'], status: 'draft', generatedByAI: true, userModified: false, sourceMap },
                { id: 'realty-seller-lead-magnet', type: 'seller_lead_magnet', title: 'Seller valuation campaign', targetAudience: 'seller leads', channels: ['landing', 'email', 'ads'], status: 'draft', generatedByAI: true, userModified: false, sourceMap },
            ] : [],
        },
        publicDirectory: {
            enabled: isRealEstate,
            route: '/listados',
            filtersEnabled: true,
            searchEnabled: true,
            mapViewEnabled: false,
            gridViewEnabled: true,
            listViewEnabled: true,
            savedSearchEnabled: false,
            compareListingsEnabled: false,
            featuredListingsEnabled: true,
            mortgageCalculatorEnabled: false,
            stickyCtaEnabled: true,
            seoEnabled: true,
            schemaEnabled: true,
            status: artifactStatus,
            needsReview: isRealEstate,
            readiness: isRealEstate
                ? ready(['Map, saved search, compare, and mortgage calculator remain disabled until configured.'])
                : ready(),
        },
        propertyPages: {
            enabled: isRealEstate,
            routePattern: '/listados/:slug',
            galleryEnabled: true,
            virtualTourEnabled: true,
            mapEnabled: false,
            contactFormEnabled: true,
            showingRequestEnabled: true,
            openHouseRegistrationEnabled: true,
            relatedListingsEnabled: true,
            documentsGateEnabled: false,
            mortgageCalculatorEnabled: false,
            schemaEnabled: true,
            stickyMobileCtaEnabled: true,
            status: artifactStatus,
            needsReview: isRealEstate,
        },
        neighborhoods: {
            enabled: isRealEstate,
            neighborhoods: [],
        },
        chatbot: {
            knowledgeSources: isRealEstate ? ['agent profile', 'brokerage profile', 'active listings', 'property facts', 'property FAQs', 'amenities', 'open houses', 'buyer process', 'seller process', 'contact handoff'] : [],
            supportedQuestions: isRealEstate ? ['property availability', 'showing request', 'open house registration', 'buyer qualification', 'seller valuation', 'neighborhood questions', 'financing FAQ'] : [],
            intents: isRealEstate ? ['property_inquiry', 'showing_request', 'open_house_registration', 'buyer_lead', 'seller_lead', 'renter_lead', 'investor_lead', 'valuation_request', 'financing_question', 'neighborhood_question', 'agent_handoff'] : [],
        },
        emailMarketing: {
            flows: isRealEstate ? ['new_property_inquiry', 'showing_request_confirmation', 'showing_reminder', 'open_house_registration', 'open_house_reminder', 'post_showing_follow_up', 'new_listing_alert', 'price_drop_alert', 'seller_valuation_follow_up', 'buyer_guide_delivery', 'seller_guide_delivery', 'inactive_buyer_nurture', 'agent_new_lead_alert'] : [],
        },
        analytics: {
            events: isRealEstate ? ['property_view', 'listing_search', 'filter_used', 'property_saved', 'property_shared', 'gallery_opened', 'virtual_tour_clicked', 'map_clicked', 'contact_started', 'lead_submitted', 'showing_requested', 'open_house_registered', 'campaign_generated', 'ai_listing_generated', 'valuation_requested'] : [],
        },
        ecommerceOffers: {
            buyerGuides: offer(),
            sellerGuides: offer(),
            marketReports: offer(),
            consultationPackages: offer(),
            valuationPackages: offer(),
            premiumListingPackages: offer(false),
            courses: offer(false),
            digitalDownloads: offer(),
        },
        integrations: {
            crmTags: isRealEstate ? ['realty', 'property-inquiry', 'buyer', 'seller', 'renter', 'investor', 'open-house', 'showing-request', 'high-intent'] : [],
            crmLeadSources: isRealEstate ? ['realty-website', 'property-detail', 'open-house', 'showing-request', 'chatbot', 'seller-valuation'] : [],
            crmPipelineStages: isRealEstate ? ['new', 'contacted', 'qualified', 'showing_scheduled', 'offer_made', 'closed', 'lost'] : [],
            emailFlows: isRealEstate ? ['new_property_inquiry', 'showing_request_confirmation', 'open_house_registration', 'post_showing_follow_up', 'seller_valuation_follow_up'] : [],
            chatbotKnowledgeSources: isRealEstate ? ['agent profile', 'brokerage profile', 'active listings', 'property facts', 'property FAQs', 'open houses'] : [],
            analyticsEvents: isRealEstate ? ['property_view', 'listing_search', 'lead_submitted', 'showing_requested', 'open_house_registered', 'campaign_generated', 'ai_listing_generated'] : [],
            financeRevenueSources: isRealEstate ? ['consultation packages', 'valuation packages', 'premium listing packages', 'buyer guides', 'seller guides', 'market reports'] : [],
            automationFlows: isRealEstate ? ['showing reminder', 'open house reminder', 'post showing follow-up', 'seller valuation follow-up'] : [],
            appointmentIntegration: false,
        },
        campaignTypes: isRealEstate ? ['just listed', 'open house', 'price drop', 'seller lead magnet', 'buyer guide', 'luxury showcase', 'investment opportunity'] : [],
        chatbotKnowledge: isRealEstate ? [
            'Agent or brokerage profile',
            'Active listings and listing availability',
            'Property highlights, amenities, FAQs, and showing rules',
            'Buyer and seller qualification questions',
            'Open house registration and follow-up rules',
        ] : [],
        emailAutomations: isRealEstate ? [
            { type: 'property_inquiry_follow_up', status: 'draft', triggerEvent: 'lead_created', needsReview: true },
            { type: 'showing_request_confirmation', status: 'draft', triggerEvent: 'appointment_requested', needsReview: true },
            { type: 'open_house_registration_confirmation', status: 'draft', triggerEvent: 'open_house_registration_created', needsReview: true },
            { type: 'seller_lead_nurture', status: 'draft', triggerEvent: 'lead_created', needsReview: true },
            { type: 'buyer_guide_delivery', status: 'draft', triggerEvent: 'digital_product_requested', needsReview: true },
        ] : [],
        crmPipelineStages: isRealEstate ? ['new', 'contacted', 'qualified', 'showing_scheduled', 'offer_made', 'closed', 'lost'] : [],
        analyticsEvents: isRealEstate ? [
            'realty_directory_viewed',
            'realty_listing_viewed',
            'realty_listing_inquiry',
            'realty_showing_requested',
            'realty_open_house_registration',
            'realty_campaign_engaged',
            'realty_guide_requested',
        ] : [],
        digitalProducts: isRealEstate ? ['buyer guide', 'seller consultation', 'neighborhood report', 'investment checklist', 'valuation request'] : [],
        monetizationOffers: isRealEstate ? ['paid buyer consultation', 'seller valuation package', 'featured listing promotion', 'neighborhood report', 'investment advisory session'] : [],
        financeRevenueSources: isRealEstate ? ['consultation payments', 'digital real estate products', 'listing promotion fees', 'referral fees'] : [],
        engineArtifacts: [
            artifact('business_blueprint', 'ai-studio', 'BusinessBlueprint real estate profile', 'AI Studio source of truth for real estate generation.', [], ['blueprint_generated']),
            artifact('website', 'website-builder', 'Generated real estate website', 'Website Builder draft for agent or brokerage presentation.', ['business_blueprint'], ['realty_directory_viewed']),
            artifact('profile', 'website-builder', 'Agent or brokerage profile', 'Public profile draft connected to brand, contact, license, and CTA data.', ['business_blueprint']),
            artifact('listings', 'real-estate', 'Listings inventory', 'Draft-safe property inventory with quality score and publish status.', ['business_blueprint'], ['realty_listing_viewed']),
            artifact('property_pages', 'website-builder', 'Property detail pages', 'Public property detail pages with lead capture, media, SEO, and FAQs.', ['listings'], ['realty_listing_viewed', 'realty_listing_inquiry']),
            artifact('directory', 'website-builder', 'Public property directory', 'Searchable public directory route for active listings.', ['listings'], ['realty_directory_viewed']),
            artifact('open_houses', 'real-estate', 'Open houses', 'Open house scheduling and public registration drafts.', ['listings'], ['realty_open_house_registration']),
            artifact('showing_requests', 'appointments', 'Showing requests', 'Appointment-ready showing requests connected to listing CTAs.', ['property_pages'], ['realty_showing_requested']),
            artifact('lead_funnels', 'crm', 'Lead funnels', 'Buyer, seller, renter, investor, and guide funnels routed to CRM.', ['property_pages', 'directory'], ['lead_created']),
            artifact('campaigns', 'email-marketing', 'Campaign drafts', 'Just listed, open house, price drop, and seller lead magnet campaign drafts.', ['listings'], ['realty_campaign_engaged']),
            artifact('chatbot_knowledge', 'chatbot', 'Chatbot knowledge', 'Reviewed real estate knowledge pack for listing, showing, and qualification answers.', ['listings', 'profile']),
            artifact('email_automations', 'email-marketing', 'Email automations', 'Draft follow-up, confirmation, nurture, and guide delivery flows.', ['lead_funnels'], ['email_flow_queued']),
            artifact('crm_pipeline', 'crm', 'CRM pipeline', 'Real estate pipeline stages and tags aligned to Quimera Leads.', ['lead_funnels']),
            artifact('appointments', 'appointments', 'Appointments', 'Private showing and consultation booking types.', ['showing_requests']),
            artifact('ecommerce_products', 'ecommerce', 'Digital products', 'Buyer guides, seller consultations, reports, and paid real estate products.', ['business_blueprint'], ['product_viewed', 'purchase_completed']),
            artifact('finance', 'finance', 'Finance tracking', 'Revenue sources for consultations, digital products, promotions, and referrals.', ['ecommerce_products'], ['payment_succeeded']),
            artifact('analytics', 'analytics', 'Real estate analytics', 'Analytics definitions for listing, lead, showing, campaign, and revenue events.', ['directory', 'lead_funnels']),
            artifact('monetization', 'ecommerce', 'Monetization offers', 'Reviewable monetization opportunities for agents and brokerages.', ['ecommerce_products', 'finance']),
        ],
        importArchitecture: {
            sources: ['manual', 'csv', 'imported-url', 'mls', 'idx', 'api', 'external-feed'],
            duplicateMatchKeys: ['externalId', 'slug', 'address', 'projectId'],
            defaultStatus: 'draft',
            needsReview: true,
        },
    };
}

export function isRealEstateBlueprintV2(value: unknown): value is RealEstateBlueprint {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const blueprint = value as Partial<RealEstateBlueprint>;
    return Boolean(
        blueprint.agentProfile &&
        blueprint.brokerageProfile &&
        Array.isArray(blueprint.listingDrafts) &&
        blueprint.leadFunnels &&
        blueprint.showingRequests &&
        blueprint.openHouses &&
        blueprint.campaigns &&
        blueprint.publicDirectory &&
        blueprint.propertyPages &&
        blueprint.neighborhoods &&
        blueprint.chatbot &&
        blueprint.emailMarketing &&
        blueprint.analytics &&
        blueprint.ecommerceOffers &&
        blueprint.integrations &&
        Array.isArray(blueprint.engineArtifacts)
    );
}

export function normalizeRealEstateBlueprint(
    value: unknown,
    fallback: {
        businessName: string;
        industry: string;
        description: string;
        tagline?: string;
        services?: Array<{ name: string; description: string }>;
        contactInfo?: Record<string, any>;
        brandColors?: Record<string, string>;
        logoUrl?: string;
        visualStyle?: string;
        now?: string;
    },
): RealEstateBlueprint {
    if (isRealEstateBlueprintV2(value)) return value;

    const now = fallback.now || new Date().toISOString();
    const legacy = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<RealEstateBlueprint>
        : {};
    const base = createRealEstateBlueprint({
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: fallback.businessName,
            industry: fallback.industry,
            description: fallback.description,
            tagline: fallback.tagline,
            services: fallback.services || [],
            contactInfo: fallback.contactInfo || {},
            hasEcommerce: true,
        },
        brandProfile: {
            colors: { primary: fallback.brandColors?.primary || '#4f46e5' },
            logoUrl: fallback.logoUrl,
            visualStyle: fallback.visualStyle,
        },
        contentMap: {
            pages: [],
            properties: [],
        },
        componentPlan: [],
        assetPlan: [],
        qualityGoals: [],
    }, now);

    return {
        ...base,
        ...legacy,
        listingTypes: Array.isArray(legacy.listingTypes) ? legacy.listingTypes : base.listingTypes,
        leadTypes: Array.isArray(legacy.leadTypes) ? legacy.leadTypes : base.leadTypes,
        digitalProducts: Array.isArray(legacy.digitalProducts) ? legacy.digitalProducts : base.digitalProducts,
        agentProfile: {
            ...base.agentProfile,
            ...(legacy.agentProfile || {}),
        },
        brokerageProfile: {
            ...base.brokerageProfile,
            ...(legacy.brokerageProfile || {}),
        },
        listingDrafts: Array.isArray(legacy.listingDrafts) ? legacy.listingDrafts : base.listingDrafts,
        leadFunnels: !Array.isArray((legacy as any).leadFunnels) && legacy.leadFunnels ? legacy.leadFunnels : base.leadFunnels,
        showingRequests: legacy.showingRequests || base.showingRequests,
        openHouses: legacy.openHouses || base.openHouses,
        campaigns: legacy.campaigns || base.campaigns,
        publicDirectory: legacy.publicDirectory || base.publicDirectory,
        propertyPages: legacy.propertyPages || base.propertyPages,
        neighborhoods: legacy.neighborhoods || base.neighborhoods,
        chatbot: legacy.chatbot || base.chatbot,
        emailMarketing: legacy.emailMarketing || base.emailMarketing,
        analytics: legacy.analytics || base.analytics,
        ecommerceOffers: legacy.ecommerceOffers || base.ecommerceOffers,
        integrations: legacy.integrations || base.integrations,
        engineArtifacts: Array.isArray(legacy.engineArtifacts) ? legacy.engineArtifacts : base.engineArtifacts,
        metadata: {
            ...base.metadata,
            ...(legacy.metadata || {}),
            updatedAt: (legacy.metadata || base.metadata).updatedAt || now,
        },
        readiness: legacy.readiness || base.readiness,
        sourceMap: {
            ...(base.sourceMap || {}),
            ...(legacy.sourceMap || {}),
            migratedFrom: Array.isArray(legacy.listingTypes) || Array.isArray(legacy.leadTypes) || Array.isArray(legacy.digitalProducts)
                ? 'businessBlueprint.realEstateBlueprint.v1'
                : 'businessBlueprint.realEstateBlueprint.defaults',
        },
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
    if (isBusinessBlueprint(value)) {
        const restaurantBlueprint = value.restaurantBlueprint as unknown as Record<string, unknown> | undefined;
        const normalizedRestaurantBlueprint = restaurantBlueprint?.profile && !Array.isArray(restaurantBlueprint.ecommerceOffers)
            ? value.restaurantBlueprint
            : normalizeRestaurantBlueprint(value.restaurantBlueprint, {
                businessName: value.businessProfile.businessName,
                industry: value.businessProfile.industry,
                description: value.businessProfile.description,
                services: value.businessProfile.services,
                contactInfo: value.businessProfile.contactInfo,
                now: value.updatedAt || value.generatedAt,
            });
        const normalizedRealEstateBlueprint = normalizeRealEstateBlueprint(value.realEstateBlueprint, {
            businessName: value.businessProfile.businessName,
            industry: value.businessProfile.industry,
            description: value.businessProfile.description,
            tagline: value.businessProfile.tagline,
            services: value.businessProfile.services,
            contactInfo: value.businessProfile.contactInfo,
            brandColors: value.brandProfile.colors,
            logoUrl: value.brandProfile.logoUrl,
            visualStyle: value.brandProfile.visualStyle,
            now: value.updatedAt || value.generatedAt,
        });

        if (
            normalizedRestaurantBlueprint === value.restaurantBlueprint &&
            normalizedRealEstateBlueprint === value.realEstateBlueprint
        ) {
            return value;
        }

        return {
            ...value,
            restaurantBlueprint: normalizedRestaurantBlueprint,
            realEstateBlueprint: normalizedRealEstateBlueprint,
        };
    }
    return null;
}

export function shouldProtectFromRegeneration(module: Pick<BlueprintModuleState, 'metadata'>): boolean {
    return Boolean(module.metadata.userModified || module.metadata.lockedFromRegeneration);
}
