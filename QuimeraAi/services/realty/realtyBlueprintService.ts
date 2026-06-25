import type {
    BlueprintReadiness,
    RealEstateBlueprint,
    RealEstateBrokerageProfileBlueprint,
    RealEstateCampaignItemBlueprint,
    RealEstateEngineArtifactBlueprint,
    RealEstateListingDraftBlueprint,
    RealEstateOpenHouseBlueprint,
    RealEstatePropertyPageBlueprint,
    RealEstatePublicDirectoryBlueprint,
    RealEstateShowingRequestBlueprint,
    RealEstateWebsiteRoutesBlueprint,
} from '../../types/businessBlueprint';
import type { PropertyCampaign, RealtyImage, RealtyProperty } from '../../types/realty';
import { calculateRealtyListingScore, toRealtySlug } from '../../utils/realty';

export const REALTY_BLUEPRINT_SOURCE = 'ai-studio-realty';

type ExistingRealtyRecord = {
    id?: string;
    slug?: string;
    title?: string;
    campaignType?: string;
    metadata?: Record<string, unknown>;
};

export interface RealtyBlueprintSyncInput {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    blueprint: RealEstateBlueprint;
    existing?: {
        properties?: ExistingRealtyRecord[];
        campaigns?: ExistingRealtyRecord[];
        openHouses?: ExistingRealtyRecord[];
    };
    now?: string;
    options?: {
        dryRun?: boolean;
        overwriteExisting?: boolean;
    };
}

export interface RealtyBlueprintDraftMetadata {
    source: typeof REALTY_BLUEPRINT_SOURCE;
    syncKey: string;
    blueprintItemId: string;
    needsReview: true;
    generatedByAI: true;
    safeToEdit: true;
    userModified: false;
    lockedFromRegeneration: false;
    sourceMap?: Record<string, unknown>;
    [key: string]: unknown;
}

export type RealtyPropertyDraftCandidate = Omit<Partial<RealtyProperty>, 'metadata' | 'status' | 'publicEnabled'> & {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    createdBy: string;
    title: string;
    slug: string;
    status: 'draft';
    publicEnabled: false;
    metadata: RealtyBlueprintDraftMetadata;
};

export type RealtyCampaignDraftCandidate = Omit<Partial<PropertyCampaign>, 'metadata' | 'status'> & {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    campaignType: PropertyCampaign['campaignType'];
    title: string;
    status: 'draft';
    metadata: RealtyBlueprintDraftMetadata;
};

export interface RealtyOpenHouseDraftCandidate {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    title: string;
    status: 'draft';
    registrationEnabled: boolean;
    defaultDurationMinutes: number;
    metadata: RealtyBlueprintDraftMetadata & {
        openHouseStatus: RealEstateOpenHouseBlueprint['status'];
        noAvailabilityInvented: true;
    };
}

export interface RealtyAgentProfileDraftCandidate {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    profileType: RealEstateBlueprint['profileType'];
    name: string;
    email: string;
    phone: string;
    brokerageName?: string;
    licenseNumber?: string;
    bio: string;
    specialties: string[];
    serviceAreas: string[];
    languages: string[];
    status: 'draft';
    metadata: RealtyBlueprintDraftMetadata & {
        readiness: BlueprintReadiness;
        complianceNotes: string[];
    };
}

export interface RealtyBrokerageProfileDraftCandidate {
    projectId: string;
    tenantId?: string | null;
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    licenseNumber?: string;
    status: 'draft';
    metadata: RealtyBlueprintDraftMetadata & {
        readiness: BlueprintReadiness;
        officeLocations: string[];
        teamMembers: RealEstateBrokerageProfileBlueprint['teamMembers'];
    };
}

export interface RealtyWebsiteDataDraftCandidate {
    realtyModule: {
        enabled: boolean;
        flags: {
            real_estate_enabled: true;
            real_estate_ai_enabled: true;
            real_estate_public_directory_enabled: boolean;
        };
        routes: RealEstateWebsiteRoutesBlueprint;
        publicDirectory: RealEstatePublicDirectoryBlueprint;
        propertyPages: RealEstatePropertyPageBlueprint;
        showingRequests: RealEstateShowingRequestBlueprint;
        updatedAt: string;
        source: typeof REALTY_BLUEPRINT_SOURCE;
        needsReview: true;
    };
}

export interface RealtyBlueprintSyncSkippedItem {
    itemType: 'agent_profile' | 'brokerage_profile' | 'listing' | 'campaign' | 'open_house' | 'website_data';
    name: string;
    syncKey: string;
    reason: 'blueprint_locked' | 'existing_generated' | 'existing_user_modified' | 'missing_required_data' | 'disabled';
    existingId?: string;
}

export interface RealtyBlueprintSyncSummary {
    dryRun: boolean;
    planned: number;
    created: number;
    skipped: number;
    propertyDrafts: number;
    campaignDrafts: number;
    openHouseDrafts: number;
    profileDrafts: number;
    websiteDataDrafts: number;
    needsReview: true;
    noRuntimeActivated: true;
}

export interface RealtyBlueprintSyncResult {
    agentProfileDraft?: RealtyAgentProfileDraftCandidate;
    brokerageProfileDraft?: RealtyBrokerageProfileDraftCandidate;
    propertyDrafts: RealtyPropertyDraftCandidate[];
    campaignDrafts: RealtyCampaignDraftCandidate[];
    openHouseDrafts: RealtyOpenHouseDraftCandidate[];
    websiteDataDraft?: RealtyWebsiteDataDraftCandidate;
    skippedItems: RealtyBlueprintSyncSkippedItem[];
    warnings: string[];
    summary: RealtyBlueprintSyncSummary;
}

const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const hasText = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const createSyncKey = (projectId: string, itemType: string, itemId: string) =>
    `${REALTY_BLUEPRINT_SOURCE}:${projectId}:${itemType}:${toRealtySlug(itemId)}`;

const getExistingSyncKey = (record: ExistingRealtyRecord) =>
    typeof record.metadata?.syncKey === 'string' ? record.metadata.syncKey : '';

const isExistingUserModified = (record: ExistingRealtyRecord) =>
    record.metadata?.userModified === true
    || record.metadata?.lockedFromRegeneration === true
    || record.metadata?.safeToEdit === false;

const findExisting = (
    records: ExistingRealtyRecord[] | undefined,
    syncKey: string,
    fallback: (record: ExistingRealtyRecord) => boolean
) => (records || []).find(record => getExistingSyncKey(record) === syncKey || fallback(record));

const createMetadata = (
    syncKey: string,
    blueprintItemId: string,
    sourceMap: unknown,
    extra: Record<string, unknown> = {}
): RealtyBlueprintDraftMetadata => ({
    source: REALTY_BLUEPRINT_SOURCE,
    syncKey,
    blueprintItemId,
    needsReview: true,
    generatedByAI: true,
    safeToEdit: true,
    userModified: false,
    lockedFromRegeneration: false,
    sourceMap: toRecord(sourceMap),
    ...extra,
});

const shouldSkipGeneratedItem = (
    item: { generatedByAI?: boolean; userModified?: boolean; lockedFromRegeneration?: boolean },
    name: string,
    itemType: RealtyBlueprintSyncSkippedItem['itemType'],
    syncKey: string
): RealtyBlueprintSyncSkippedItem | null => {
    if (item.userModified || item.lockedFromRegeneration) {
        return {
            itemType,
            name,
            syncKey,
            reason: 'blueprint_locked',
        };
    }
    return null;
};

const normalizeImageDrafts = (images: string[], title: string): RealtyImage[] =>
    images
        .map((url, index): RealtyImage | null => url.trim() ? ({
            id: `blueprint-image-${index + 1}`,
            url: url.trim(),
            position: index,
            isPrimary: index === 0,
            altText: title,
            mediaType: 'image',
            metadata: {
                source: REALTY_BLUEPRINT_SOURCE,
                needsReview: true,
            },
        }) : null)
        .filter((image): image is RealtyImage => image !== null);

export const createAgentProfileFromBlueprint = (input: RealtyBlueprintSyncInput): RealtyAgentProfileDraftCandidate | undefined => {
    const profile = input.blueprint.agentProfile;
    if (!hasText(profile.name) && !hasText(profile.email) && !hasText(profile.phone)) return undefined;

    const syncKey = createSyncKey(input.projectId, 'agent-profile', profile.name || profile.email || input.userId);
    return {
        projectId: input.projectId,
        tenantId: input.tenantId || null,
        userId: input.userId,
        profileType: input.blueprint.profileType,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        brokerageName: profile.brokerageName,
        licenseNumber: profile.licenseNumber,
        bio: profile.bio || '',
        specialties: profile.specialties || [],
        serviceAreas: profile.serviceAreas || [],
        languages: profile.languages || [],
        status: 'draft',
        metadata: {
            ...createMetadata(syncKey, 'agent-profile', profile.sourceMap, {
                photoUrl: profile.photoUrl,
                brokerageLogoUrl: profile.brokerageLogoUrl,
                website: profile.website,
                socialLinks: profile.socialLinks || {},
            }),
            readiness: profile.readiness,
            complianceNotes: profile.complianceNotes || [],
        },
    };
};

export const createBrokerageProfileFromBlueprint = (input: RealtyBlueprintSyncInput): RealtyBrokerageProfileDraftCandidate | undefined => {
    const profile = input.blueprint.brokerageProfile;
    if (!hasText(profile.name) && !hasText(profile.email) && !hasText(profile.phone)) return undefined;

    const syncKey = createSyncKey(input.projectId, 'brokerage-profile', profile.name || profile.email || input.userId);
    return {
        projectId: input.projectId,
        tenantId: input.tenantId || null,
        userId: input.userId,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        licenseNumber: profile.licenseNumber,
        status: 'draft',
        metadata: {
            ...createMetadata(syncKey, 'brokerage-profile', profile.sourceMap, {
                logoUrl: profile.logoUrl,
                brandStyle: profile.brandStyle,
            }),
            readiness: profile.readiness,
            officeLocations: profile.officeLocations || [],
            teamMembers: profile.teamMembers || [],
        },
    };
};

export const createListingDraftsFromBlueprint = (input: RealtyBlueprintSyncInput): {
    drafts: RealtyPropertyDraftCandidate[];
    skipped: RealtyBlueprintSyncSkippedItem[];
} => {
    const skipped: RealtyBlueprintSyncSkippedItem[] = [];
    const drafts = (input.blueprint.listingDrafts || []).flatMap((listing: RealEstateListingDraftBlueprint) => {
        const slug = listing.slug || toRealtySlug(listing.title || listing.id);
        const syncKey = createSyncKey(input.projectId, 'listing', listing.id || slug);
        const name = listing.title || slug;
        const protectedSkip = shouldSkipGeneratedItem(listing, name, 'listing', syncKey);
        if (protectedSkip) {
            skipped.push(protectedSkip);
            return [];
        }

        if (!hasText(listing.title) || !hasText(slug)) {
            skipped.push({ itemType: 'listing', name, syncKey, reason: 'missing_required_data' });
            return [];
        }

        const existing = findExisting(
            input.existing?.properties,
            syncKey,
            record => record.slug === slug
        );
        if (existing && !input.options?.overwriteExisting) {
            skipped.push({
                itemType: 'listing',
                name,
                syncKey,
                reason: isExistingUserModified(existing) ? 'existing_user_modified' : 'existing_generated',
                existingId: existing.id,
            });
            return [];
        }

        const images = normalizeImageDrafts(listing.images || [], listing.title);
        const price = typeof listing.price === 'number' && Number.isFinite(listing.price) ? listing.price : 0;
        const propertyDraft: RealtyPropertyDraftCandidate = {
            projectId: input.projectId,
            tenantId: input.tenantId || null,
            userId: input.userId,
            createdBy: input.userId,
            title: listing.title,
            slug,
            description: listing.descriptionLong || listing.descriptionShort || '',
            descriptionShort: listing.descriptionShort || '',
            descriptionLong: listing.descriptionLong || '',
            price,
            currency: listing.currency || 'USD',
            transactionType: listing.transactionType || 'sale',
            propertyType: listing.propertyType || 'house',
            address: listing.address || '',
            addressLine1: listing.address || '',
            city: listing.city || '',
            state: listing.state || '',
            country: listing.country || '',
            postalCode: listing.postalCode || '',
            zipCode: listing.postalCode || '',
            bedrooms: listing.bedrooms ?? 0,
            bathrooms: listing.bathrooms ?? 0,
            halfBathrooms: listing.halfBathrooms,
            area: listing.area ?? 0,
            areaUnit: listing.areaUnit || 'sqft',
            lotSize: listing.lotSize,
            parkingSpaces: listing.parkingSpaces,
            yearBuilt: listing.yearBuilt,
            hoaFee: listing.hoaFee,
            taxes: listing.taxes,
            amenities: listing.amenities || [],
            features: listing.features || [],
            highlights: listing.highlights || [],
            images,
            mainImageUrl: images[0]?.url || '',
            videoUrl: listing.videoUrl,
            virtualTourUrl: listing.virtualTourUrl,
            seoTitle: listing.title,
            seoDescription: listing.descriptionShort,
            isFeatured: Boolean(listing.isFeatured),
            status: 'draft',
            publicEnabled: false,
            publishedAt: null,
            metadata: createMetadata(syncKey, listing.id || slug, listing.sourceMap, {
                originalBlueprintStatus: listing.status,
                priceSource: listing.priceSource || 'unset',
                imagePrompts: listing.imagePrompts || [],
                listingScore: listing.listingScore,
                noAutoPublish: true,
            }),
        };

        return [{
            ...propertyDraft,
            listingScore: calculateRealtyListingScore(propertyDraft).score,
        }];
    });

    return { drafts, skipped };
};

export const createCampaignDraftsFromBlueprint = (input: RealtyBlueprintSyncInput): {
    drafts: RealtyCampaignDraftCandidate[];
    skipped: RealtyBlueprintSyncSkippedItem[];
} => {
    const skipped: RealtyBlueprintSyncSkippedItem[] = [];
    const drafts = (input.blueprint.campaigns?.campaigns || []).flatMap((campaign: RealEstateCampaignItemBlueprint) => {
        const syncKey = createSyncKey(input.projectId, 'campaign', campaign.id || `${campaign.type}-${campaign.title}`);
        const name = campaign.title || campaign.type;
        const protectedSkip = shouldSkipGeneratedItem(campaign, name, 'campaign', syncKey);
        if (protectedSkip) {
            skipped.push(protectedSkip);
            return [];
        }

        if (!hasText(name)) {
            skipped.push({ itemType: 'campaign', name, syncKey, reason: 'missing_required_data' });
            return [];
        }

        const existing = findExisting(
            input.existing?.campaigns,
            syncKey,
            record => record.title === name && record.campaignType === campaign.type
        );
        if (existing && !input.options?.overwriteExisting) {
            skipped.push({
                itemType: 'campaign',
                name,
                syncKey,
                reason: isExistingUserModified(existing) ? 'existing_user_modified' : 'existing_generated',
                existingId: existing.id,
            });
            return [];
        }

        const draft: RealtyCampaignDraftCandidate = {
            projectId: input.projectId,
            tenantId: input.tenantId || null,
            userId: input.userId,
            propertyId: null,
            campaignType: campaign.type as PropertyCampaign['campaignType'],
            title: name,
            status: 'draft',
            content: {
                targetAudience: campaign.targetAudience,
                channels: campaign.channels,
            },
            scheduledAt: null,
            metadata: createMetadata(syncKey, campaign.id || name, campaign.sourceMap, {
                originalBlueprintStatus: campaign.status,
                channels: campaign.channels,
                targetAudience: campaign.targetAudience,
                noAutoSchedule: true,
            }),
        };

        return [draft];
    });

    return { drafts, skipped };
};

export const createOpenHouseDraftsFromBlueprint = (input: RealtyBlueprintSyncInput): RealtyOpenHouseDraftCandidate[] => {
    const openHouse = input.blueprint.openHouses;
    if (!openHouse?.enabled) return [];

    const syncKey = createSyncKey(input.projectId, 'open-house-settings', 'default');
    return [{
        projectId: input.projectId,
        tenantId: input.tenantId || null,
        userId: input.userId,
        title: 'Open house settings draft',
        status: 'draft',
        registrationEnabled: openHouse.registrationEnabled,
        defaultDurationMinutes: openHouse.defaultDurationMinutes || 60,
        metadata: {
            ...createMetadata(syncKey, 'open-house-settings', {}, {
                capacityEnabled: openHouse.capacityEnabled,
                reminderFlowEnabled: openHouse.reminderFlowEnabled,
                followUpFlowEnabled: openHouse.followUpFlowEnabled,
            }),
            openHouseStatus: openHouse.status,
            noAvailabilityInvented: true,
        },
    }];
};

export const createPublicDirectorySettingsFromBlueprint = (
    directory: RealEstatePublicDirectoryBlueprint
): RealtyWebsiteDataDraftCandidate['realtyModule']['publicDirectory'] => ({
    ...directory,
    status: directory.status === 'configured' ? 'needs_review' : directory.status,
    needsReview: true,
    readiness: directory.readiness,
    route: '/listados',
});

export const createRealtyWebsiteDataFromBlueprint = (input: RealtyBlueprintSyncInput): RealtyWebsiteDataDraftCandidate => {
    const now = input.now || new Date().toISOString();
    return {
        realtyModule: {
            enabled: true,
            flags: {
                real_estate_enabled: true,
                real_estate_ai_enabled: true,
                real_estate_public_directory_enabled: input.blueprint.publicDirectory.enabled,
            },
            routes: input.blueprint.websiteRoutes,
            publicDirectory: createPublicDirectorySettingsFromBlueprint(input.blueprint.publicDirectory),
            propertyPages: {
                ...input.blueprint.propertyPages,
                status: input.blueprint.propertyPages.status === 'configured' ? 'needs_review' : input.blueprint.propertyPages.status,
                needsReview: true,
            },
            showingRequests: {
                ...input.blueprint.showingRequests,
                status: input.blueprint.showingRequests.status === 'configured' ? 'needs_review' : input.blueprint.showingRequests.status,
                needsReview: true,
                appointmentIntegrationEnabled: false,
            },
            updatedAt: now,
            source: REALTY_BLUEPRINT_SOURCE,
            needsReview: true,
        },
    };
};

export const previewRealtyBlueprintSync = (input: RealtyBlueprintSyncInput): RealtyBlueprintSyncResult => {
    const normalizedInput = {
        ...input,
        options: {
            dryRun: true,
            overwriteExisting: false,
            ...(input.options || {}),
        },
    };
    const warnings: string[] = [];
    const skippedItems: RealtyBlueprintSyncSkippedItem[] = [];
    const agentProfileDraft = createAgentProfileFromBlueprint(normalizedInput);
    const brokerageProfileDraft = createBrokerageProfileFromBlueprint(normalizedInput);
    const listingPlan = createListingDraftsFromBlueprint(normalizedInput);
    const campaignPlan = createCampaignDraftsFromBlueprint(normalizedInput);
    const openHouseDrafts = createOpenHouseDraftsFromBlueprint(normalizedInput);
    const websiteDataDraft = createRealtyWebsiteDataFromBlueprint(normalizedInput);

    skippedItems.push(...listingPlan.skipped, ...campaignPlan.skipped);

    if ((normalizedInput.blueprint.listingDrafts || []).length === 0) {
        warnings.push('No listing drafts were provided by the blueprint; no fake listings were created.');
    }
    if (openHouseDrafts.length > 0) {
        warnings.push('Open house settings were prepared without inventing dates or availability.');
    }

    const profileDrafts = Number(Boolean(agentProfileDraft)) + Number(Boolean(brokerageProfileDraft));
    const candidateCount = profileDrafts
        + listingPlan.drafts.length
        + campaignPlan.drafts.length
        + openHouseDrafts.length
        + Number(Boolean(websiteDataDraft));
    const dryRun = normalizedInput.options.dryRun !== false;

    return {
        agentProfileDraft,
        brokerageProfileDraft,
        propertyDrafts: listingPlan.drafts,
        campaignDrafts: campaignPlan.drafts,
        openHouseDrafts,
        websiteDataDraft,
        skippedItems,
        warnings,
        summary: {
            dryRun,
            planned: candidateCount + skippedItems.length,
            created: dryRun ? 0 : candidateCount,
            skipped: skippedItems.length,
            propertyDrafts: listingPlan.drafts.length,
            campaignDrafts: campaignPlan.drafts.length,
            openHouseDrafts: openHouseDrafts.length,
            profileDrafts,
            websiteDataDrafts: websiteDataDraft ? 1 : 0,
            needsReview: true,
            noRuntimeActivated: true,
        },
    };
};

export const applyRealtyBlueprintDraft = (input: RealtyBlueprintSyncInput): RealtyBlueprintSyncResult =>
    previewRealtyBlueprintSync({
        ...input,
        options: {
            ...(input.options || {}),
            dryRun: false,
        },
    });

export const createRealtyEngineArtifactsFromBlueprint = (blueprint: RealEstateBlueprint): RealEstateEngineArtifactBlueprint[] =>
    blueprint.engineArtifacts || [];
