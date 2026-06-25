import { describe, expect, it } from 'vitest';
import type { RealEstateBlueprint, RealEstateEcommerceOfferItemBlueprint } from '../../types/businessBlueprint';
import {
    applyRealtyBlueprintDraft,
    previewRealtyBlueprintSync,
    REALTY_BLUEPRINT_SOURCE,
} from '../../services/realty/realtyBlueprintService';

const readiness = { isReady: false, blockers: [], warnings: ['Needs review'] };
const metadata = { generatedBy: 'ai' as const, generatedByAI: true, userModified: false };
const offer = (): RealEstateEcommerceOfferItemBlueprint => ({
    enabled: true,
    status: 'draft',
    priceSource: 'unset',
    needsReview: true,
});

const createBlueprint = (overrides: Partial<RealEstateBlueprint> = {}): RealEstateBlueprint => ({
    enabled: true,
    status: 'needs_review',
    needsReview: true,
    readiness,
    metadata,
    sourceMap: {},
    profileType: 'agent',
    agentProfile: {
        name: 'Ana Rivera',
        email: 'ana@example.com',
        phone: '787-555-0101',
        bio: 'Luxury real estate advisor in Puerto Rico.',
        specialties: ['Luxury homes'],
        serviceAreas: ['Dorado', 'San Juan'],
        languages: ['es', 'en'],
        socialLinks: {},
        complianceNotes: ['License number requires review before publishing.'],
        sourceMap: {},
        readiness,
    },
    brokerageProfile: {
        name: '',
        address: '',
        phone: '',
        email: '',
        officeLocations: [],
        teamMembers: [],
        sourceMap: {},
        readiness,
    },
    listingDrafts: [{
        id: 'listing-dorado-villa',
        title: 'Dorado Villa Draft',
        slug: 'dorado-villa-draft',
        descriptionShort: 'Draft luxury villa listing.',
        descriptionLong: 'A reviewable listing draft for a luxury villa in Dorado with media, highlights, and lead capture copy.',
        price: 1250000,
        currency: 'USD',
        priceSource: 'ai-suggested',
        transactionType: 'sale',
        propertyType: 'house',
        address: 'Needs address review',
        city: 'Dorado',
        state: 'PR',
        country: 'US',
        postalCode: '00646',
        bedrooms: 4,
        bathrooms: 3,
        area: 3200,
        areaUnit: 'sqft',
        amenities: ['Pool', 'Terrace', 'Gated community'],
        features: ['High ceilings', 'Outdoor kitchen'],
        highlights: ['Near beach', 'Private outdoor living'],
        imagePrompts: ['Luxury villa exterior at golden hour'],
        images: ['https://example.com/dorado-villa.jpg'],
        isFeatured: true,
        status: 'needs_review',
        publicEnabled: false,
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        sourceMap: {},
    }],
    websiteRoutes: {
        profile: '/agente',
        directory: '/listados',
        propertyDetail: '/listados/:slug',
        openHouses: '/open-houses',
    },
    listingTypes: ['luxury'],
    leadTypes: ['buyer', 'seller'],
    pageTypes: ['directory', 'property_detail'],
    leadFunnels: {
        buyerLeadEnabled: true,
        sellerLeadEnabled: true,
        renterLeadEnabled: false,
        investorLeadEnabled: true,
        valuationCtaEnabled: true,
        buyerGuideEnabled: true,
        sellerGuideEnabled: true,
        contactFormEnabled: true,
        propertyInquiryEnabled: true,
        openHouseRegistrationEnabled: true,
        showingRequestEnabled: true,
        leadTags: ['realty'],
        leadSources: ['property_detail'],
        crmPipelineStages: ['new', 'contacted', 'qualified'],
        needsReview: true,
        readiness,
    },
    showingRequests: {
        enabled: true,
        status: 'needs_review',
        availabilitySource: 'unset',
        preferredDateEnabled: true,
        preferredTimeEnabled: true,
        buyerQualificationFields: ['financing_status', 'timeline'],
        financingStatusField: true,
        budgetField: true,
        assignedAgentStrategy: 'manual',
        confirmationMode: 'manual',
        remindersEnabled: false,
        appointmentIntegrationEnabled: false,
        needsReview: true,
        readiness,
    },
    openHouses: {
        enabled: true,
        defaultDurationMinutes: 90,
        registrationEnabled: true,
        capacityEnabled: true,
        reminderFlowEnabled: true,
        followUpFlowEnabled: true,
        status: 'needs_review',
        needsReview: true,
        readiness,
    },
    campaigns: {
        campaigns: [{
            id: 'campaign-just-listed',
            type: 'just_listed',
            title: 'Just listed draft',
            targetAudience: 'Luxury buyers',
            channels: ['social', 'email'],
            status: 'draft',
            generatedByAI: true,
            userModified: false,
            sourceMap: {},
        }],
    },
    publicDirectory: {
        enabled: true,
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
        status: 'needs_review',
        needsReview: true,
        readiness,
    },
    propertyPages: {
        enabled: true,
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
        status: 'needs_review',
        needsReview: true,
    },
    neighborhoods: { enabled: true, neighborhoods: [] },
    chatbot: { knowledgeSources: ['agent profile'], supportedQuestions: ['What listings are available?'], intents: ['property_inquiry'] },
    emailMarketing: { flows: ['new_property_inquiry', 'showing_request_confirmation'] },
    analytics: { events: ['property_view', 'lead_submitted', 'showing_requested'] },
    ecommerceOffers: {
        buyerGuides: offer(),
        sellerGuides: offer(),
        marketReports: offer(),
        consultationPackages: offer(),
        valuationPackages: offer(),
        premiumListingPackages: offer(),
        courses: offer(),
        digitalDownloads: offer(),
    },
    integrations: {
        crmTags: ['realty'],
        crmLeadSources: ['property_detail'],
        crmPipelineStages: ['new', 'contacted'],
        emailFlows: ['new_property_inquiry'],
        chatbotKnowledgeSources: ['agent profile'],
        analyticsEvents: ['property_view'],
        financeRevenueSources: ['consultations'],
        automationFlows: [],
        appointmentIntegration: false,
    },
    campaignTypes: ['just_listed'],
    chatbotKnowledge: ['agent profile'],
    emailAutomations: [],
    crmPipelineStages: ['new', 'contacted'],
    analyticsEvents: ['property_view'],
    digitalProducts: ['buyer guide'],
    monetizationOffers: ['consultation package'],
    financeRevenueSources: ['consultations'],
    engineArtifacts: [],
    ...overrides,
});

const baseInput = (blueprint: RealEstateBlueprint = createBlueprint()) => ({
    projectId: 'project-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    blueprint,
    now: '2026-06-24T12:00:00.000Z',
});

describe('realtyBlueprintService', () => {
    it('previews draft-safe Realty candidates without activating public runtime', () => {
        const result = previewRealtyBlueprintSync(baseInput());

        expect(result.summary.dryRun).toBe(true);
        expect(result.summary.created).toBe(0);
        expect(result.summary.propertyDrafts).toBe(1);
        expect(result.summary.campaignDrafts).toBe(1);
        expect(result.summary.openHouseDrafts).toBe(1);
        expect(result.summary.noRuntimeActivated).toBe(true);

        const property = result.propertyDrafts[0];
        expect(property.status).toBe('draft');
        expect(property.publicEnabled).toBe(false);
        expect(property.metadata.needsReview).toBe(true);
        expect(property.metadata.priceSource).toBe('ai-suggested');
        expect(property.metadata.noAutoPublish).toBe(true);
        expect(property.metadata.source).toBe(REALTY_BLUEPRINT_SOURCE);

        expect(result.websiteDataDraft?.realtyModule.showingRequests.appointmentIntegrationEnabled).toBe(false);
        expect(result.openHouseDrafts[0].metadata.noAvailabilityInvented).toBe(true);
    });

    it('skips existing generated drafts by syncKey to keep reruns idempotent', () => {
        const first = previewRealtyBlueprintSync(baseInput());
        const syncKey = first.propertyDrafts[0].metadata.syncKey;
        const result = previewRealtyBlueprintSync({
            ...baseInput(),
            existing: {
                properties: [{
                    id: 'property-existing',
                    slug: 'dorado-villa-draft',
                    metadata: {
                        syncKey,
                        source: REALTY_BLUEPRINT_SOURCE,
                    },
                }],
            },
        });

        expect(result.propertyDrafts).toHaveLength(0);
        expect(result.skippedItems).toEqual(expect.arrayContaining([
            expect.objectContaining({
                itemType: 'listing',
                reason: 'existing_generated',
                existingId: 'property-existing',
            }),
        ]));
    });

    it('does not create fake listings when the blueprint has no listing drafts', () => {
        const result = previewRealtyBlueprintSync(baseInput(createBlueprint({ listingDrafts: [] })));

        expect(result.propertyDrafts).toHaveLength(0);
        expect(result.warnings).toContain('No listing drafts were provided by the blueprint; no fake listings were created.');
    });

    it('skips blueprint items marked userModified or locked from regeneration', () => {
        const blueprint = createBlueprint({
            listingDrafts: [{
                ...createBlueprint().listingDrafts[0],
                userModified: true,
            }],
        });
        const result = previewRealtyBlueprintSync(baseInput(blueprint));

        expect(result.propertyDrafts).toHaveLength(0);
        expect(result.skippedItems[0]).toMatchObject({
            itemType: 'listing',
            reason: 'blueprint_locked',
        });
    });

    it('apply mode returns draft candidates as created without publishing anything', () => {
        const result = applyRealtyBlueprintDraft(baseInput());

        expect(result.summary.dryRun).toBe(false);
        expect(result.summary.created).toBeGreaterThan(0);
        expect(result.propertyDrafts.every(property => property.status === 'draft' && property.publicEnabled === false)).toBe(true);
        expect(result.campaignDrafts.every(campaign => campaign.status === 'draft')).toBe(true);
        expect(result.summary.noRuntimeActivated).toBe(true);
    });
});
