import type {
    BusinessBlueprint,
    RealEstateBlueprint,
    RealEstateListingDraftBlueprint,
} from '../types/businessBlueprint';

export type RealtyChatbotKnowledgeDraftType =
    | 'profile'
    | 'listing_summary'
    | 'showing_and_open_house'
    | 'lead_qualification'
    | 'compliance_guardrails';

export interface RealtyChatbotKnowledgeDraft {
    type: RealtyChatbotKnowledgeDraftType;
    sourcePath: string;
    name: string;
    description: string;
    content: string;
    variablesNeeded: string[];
    readinessBlockers: string[];
    metadata: Record<string, unknown>;
}

const REALTY_CHATBOT_SOURCE = 'realty-engine-chatbot-knowledge';
const MAX_LISTING_SUMMARIES = 8;

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const uniqueValues = (values: Array<string | undefined | null>, limit = 16): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = cleanText(value);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
};

const formatCurrency = (value: number | undefined, currency: string): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'price not reviewed';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `${currency || 'USD'} ${Math.round(value)}`;
    }
};

const formatList = (label: string, values: string[]): string | null =>
    values.length ? `${label}: ${values.join(', ')}` : null;

const listingHasReviewedPublicData = (listing: RealEstateListingDraftBlueprint): boolean =>
    listing.status === 'active' && listing.publicEnabled === true && listing.needsReview === false;

const summarizeListing = (listing: RealEstateListingDraftBlueprint): string => {
    const details = [
        listing.title,
        [listing.city, listing.state, listing.country].filter(Boolean).join(', '),
        listing.propertyType,
        listing.transactionType,
        formatCurrency(listing.price, listing.currency),
        listing.bedrooms !== undefined ? `${listing.bedrooms} bedrooms` : '',
        listing.bathrooms !== undefined ? `${listing.bathrooms} bathrooms` : '',
        listing.area !== undefined ? `${listing.area} ${listing.areaUnit}` : '',
        formatList('Highlights', uniqueValues(listing.highlights, 5)),
        formatList('Amenities', uniqueValues(listing.amenities, 5)),
    ].filter(Boolean);

    return [
        `Listing: ${details.join(' | ')}`,
        cleanText(listing.descriptionShort || listing.descriptionLong)
            ? `Summary: ${cleanText(listing.descriptionShort || listing.descriptionLong).slice(0, 260)}`
            : 'Summary: not reviewed',
        `Status: ${listing.status}; publicEnabled: ${listing.publicEnabled}; needsReview: ${listing.needsReview}`,
    ].join('\n');
};

const baseMetadata = (
    type: RealtyChatbotKnowledgeDraftType,
    realty: RealEstateBlueprint,
    sourcePath: string,
): Record<string, unknown> => ({
    source: REALTY_CHATBOT_SOURCE,
    sourcePath,
    realEstateEngine: true,
    knowledgeType: type,
    blueprintStatus: realty.status,
    blueprintNeedsReview: realty.needsReview,
    chatbotPublished: false,
    chatbotRuntimeEnabled: false,
    noRuntimeActivated: true,
    noAutoPublish: true,
    needsReview: true,
    adviceBoundary: 'informational_not_legal_financial_tax_or_mortgage_advice',
});

const profileContent = (blueprint: BusinessBlueprint, realty: RealEstateBlueprint): string => {
    const agent = realty.agentProfile;
    const brokerage = realty.brokerageProfile;
    const serviceAreas = uniqueValues([
        ...(agent.serviceAreas || []),
        ...(brokerage.officeLocations || []),
    ], 12);
    const specialties = uniqueValues(agent.specialties || [], 12);
    const contactLines = uniqueValues([
        agent.email || brokerage.email,
        agent.phone || brokerage.phone,
        agent.website,
    ], 6);

    return [
        `Business: ${blueprint.businessProfile.businessName}`,
        `Profile type: ${realty.profileType}`,
        agent.name ? `Agent/team name: ${agent.name}` : '',
        brokerage.name ? `Brokerage: ${brokerage.name}` : '',
        agent.licenseNumber ? `Agent license: ${agent.licenseNumber}` : 'Agent license: pending review',
        brokerage.licenseNumber ? `Brokerage license: ${brokerage.licenseNumber}` : 'Brokerage license: pending review',
        agent.bio ? `Bio draft: ${agent.bio}` : '',
        formatList('Specialties', specialties),
        formatList('Service areas', serviceAreas),
        formatList('Reviewed contact channels', contactLines),
        formatList('Compliance notes', uniqueValues(agent.complianceNotes, 8)),
    ].filter(Boolean).join('\n');
};

const listingContent = (realty: RealEstateBlueprint): string => {
    const listings = realty.listingDrafts || [];
    const reviewedPublicListings = listings.filter(listingHasReviewedPublicData);
    const draftListings = listings.filter(listing => !listingHasReviewedPublicData(listing));
    const sourceListings = [
        ...reviewedPublicListings,
        ...draftListings,
    ].slice(0, MAX_LISTING_SUMMARIES);

    if (sourceListings.length === 0) {
        return [
            'No listing records are available for chatbot answers yet.',
            'The chatbot may explain how to request property updates or contact the agent, but it must not invent inventory.',
        ].join('\n');
    }

    return [
        `Reviewed public listings: ${reviewedPublicListings.length}`,
        `Draft or needs-review listings: ${draftListings.length}`,
        ...sourceListings.map(summarizeListing),
    ].join('\n\n');
};

export function buildRealtyChatbotKnowledgeDrafts(
    blueprint?: BusinessBlueprint | null,
): RealtyChatbotKnowledgeDraft[] {
    if (!blueprint?.realEstateBlueprint) return [];
    const realty = blueprint.realEstateBlueprint;
    if (!realty.enabled) return [];

    const supportedQuestions = uniqueValues(realty.chatbot?.supportedQuestions || [], 20);
    const knowledgeSources = uniqueValues([
        ...(realty.chatbot?.knowledgeSources || []),
        ...(realty.integrations?.chatbotKnowledgeSources || []),
        ...(realty.chatbotKnowledge || []),
    ], 24);
    const reviewedPublicListings = (realty.listingDrafts || []).filter(listingHasReviewedPublicData);
    const draftListings = (realty.listingDrafts || []).filter(listing => !listingHasReviewedPublicData(listing));

    return [
        {
            type: 'profile',
            sourcePath: 'realEstateBlueprint.agentProfile|realEstateBlueprint.brokerageProfile',
            name: 'Realty agent and brokerage profile knowledge draft',
            description: 'Draft chatbot source for reviewed agent, team, brokerage, contact, service-area, and disclosure context.',
            content: profileContent(blueprint, realty),
            variablesNeeded: ['agentName', 'brokerageName', 'licenseNumber', 'serviceAreas', 'contactChannels'],
            readinessBlockers: [
                'Agent and brokerage license fields must be reviewed before chatbot publication.',
                'Brokerage disclosures and contact channels require owner approval.',
            ],
            metadata: {
                ...baseMetadata('profile', realty, 'realEstateBlueprint.agentProfile|realEstateBlueprint.brokerageProfile'),
                profileType: realty.profileType,
                hasAgentLicense: Boolean(cleanText(realty.agentProfile?.licenseNumber)),
                hasBrokerageLicense: Boolean(cleanText(realty.brokerageProfile?.licenseNumber)),
            },
        },
        {
            type: 'listing_summary',
            sourcePath: 'realEstateBlueprint.listingDrafts',
            name: 'Realty listing knowledge draft',
            description: 'Draft chatbot source for listing availability, property facts, highlights, amenities, and detail-page handoff rules.',
            content: listingContent(realty),
            variablesNeeded: ['propertySlug', 'listingStatus', 'publicEnabled', 'propertyFacts', 'showingCta'],
            readinessBlockers: [
                'Listings must be reviewed and public before chatbot runtime can answer as current availability.',
                'The chatbot must not invent prices, addresses, mortgage numbers, market data, or unavailable listings.',
            ],
            metadata: {
                ...baseMetadata('listing_summary', realty, 'realEstateBlueprint.listingDrafts'),
                listingCount: realty.listingDrafts.length,
                reviewedPublicListingCount: reviewedPublicListings.length,
                draftListingCount: draftListings.length,
                containsUnreviewedListings: draftListings.length > 0,
                listingSlugs: realty.listingDrafts.slice(0, MAX_LISTING_SUMMARIES).map(listing => listing.slug),
            },
        },
        {
            type: 'showing_and_open_house',
            sourcePath: 'realEstateBlueprint.showingRequests|realEstateBlueprint.openHouses',
            name: 'Realty showing and open house chatbot draft',
            description: 'Draft chatbot source for showing requests, manual confirmation, open house registration, and appointment handoff.',
            content: [
                `Showing requests enabled: ${realty.showingRequests.enabled}`,
                `Confirmation mode: ${realty.showingRequests.confirmationMode}`,
                `Availability source: ${realty.showingRequests.availabilitySource}`,
                `Appointment integration enabled: ${realty.showingRequests.appointmentIntegrationEnabled}`,
                `Open house registration enabled: ${realty.openHouses.enabled && realty.openHouses.registrationEnabled}`,
                `Supported intents: ${(realty.chatbot?.intents || []).join(', ')}`,
            ].join('\n'),
            variablesNeeded: ['leadName', 'leadEmail', 'propertySlug', 'preferredDate', 'preferredTime', 'openHouseId'],
            readinessBlockers: [
                'Availability and appointment rules must be reviewed before automated confirmations.',
                'Open house dates, location, capacity, reminders, and follow-up rules need review.',
            ],
            metadata: {
                ...baseMetadata('showing_and_open_house', realty, 'realEstateBlueprint.showingRequests|realEstateBlueprint.openHouses'),
                confirmationMode: realty.showingRequests.confirmationMode,
                appointmentIntegrationEnabled: realty.showingRequests.appointmentIntegrationEnabled,
                openHouseRegistrationEnabled: realty.openHouses.enabled && realty.openHouses.registrationEnabled,
                calendarSlotCreated: false,
                confirmationSent: false,
            },
        },
        {
            type: 'lead_qualification',
            sourcePath: 'realEstateBlueprint.leadFunnels|realEstateBlueprint.chatbot',
            name: 'Realty lead qualification chatbot draft',
            description: 'Draft chatbot source for buyer, seller, renter, investor, valuation, and agent-handoff qualification questions.',
            content: [
                formatList('Supported questions', supportedQuestions),
                formatList('Knowledge sources', knowledgeSources),
                formatList('Lead tags', uniqueValues(realty.leadFunnels.leadTags, 20)),
                formatList('Lead sources', uniqueValues(realty.leadFunnels.leadSources, 20)),
                formatList('Buyer qualification fields', uniqueValues(realty.showingRequests.buyerQualificationFields, 12)),
            ].filter(Boolean).join('\n'),
            variablesNeeded: ['leadType', 'budget', 'timeline', 'desiredArea', 'financingStatus', 'handoffReason'],
            readinessBlockers: [
                'Lead qualification copy must be reviewed before routing public chatbot conversations.',
                'The chatbot must hand off legal, financing, valuation, offer, or contract questions to a human.',
            ],
            metadata: {
                ...baseMetadata('lead_qualification', realty, 'realEstateBlueprint.leadFunnels|realEstateBlueprint.chatbot'),
                supportedQuestionCount: supportedQuestions.length,
                knowledgeSourceCount: knowledgeSources.length,
                humanHandoffRequired: true,
            },
        },
        {
            type: 'compliance_guardrails',
            sourcePath: 'realEstateBlueprint.agentProfile.complianceNotes|realEstateBlueprint.publicDirectory|realEstateBlueprint.propertyPages',
            name: 'Realty chatbot compliance guardrails draft',
            description: 'Draft chatbot guardrail source for fair-housing, licensing, valuation, mortgage, tax, and public-directory answer boundaries.',
            content: [
                'Do not provide legal, financial, tax, mortgage, investment, or fair-housing advice.',
                'Do not invent license numbers, market statistics, sold volume, reviews, school ratings, mortgage payments, taxes, or availability.',
                'For unavailable or unreviewed facts, explain that the team will confirm details and create a lead handoff.',
                `Directory route: ${realty.publicDirectory.route}`,
                `Property detail route: ${realty.propertyPages.routePattern}`,
            ].join('\n'),
            variablesNeeded: ['handoffReason', 'sourceUrl', 'propertySlug', 'agentReviewStatus'],
            readinessBlockers: [
                'Compliance language must be reviewed before chatbot publication.',
                'Public directory and property page copy must be reviewed in Website Builder and Realty Engine.',
            ],
            metadata: {
                ...baseMetadata('compliance_guardrails', realty, 'realEstateBlueprint.agentProfile.complianceNotes|realEstateBlueprint.publicDirectory|realEstateBlueprint.propertyPages'),
                fairHousingReviewed: false,
                legalAdviceAllowed: false,
                financialAdviceAllowed: false,
                taxAdviceAllowed: false,
                valuationAdviceAllowed: false,
            },
        },
    ];
}
