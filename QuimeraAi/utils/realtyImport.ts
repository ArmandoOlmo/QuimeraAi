import type {
    RealtyDuplicateMatch,
    RealtyDuplicateMatchKey,
    RealtyDuplicateReviewStatus,
    RealtyExternalListingDraft,
    RealtyExternalListingReviewStatus,
    RealtyImportSource,
    RealtyProperty,
    RealtyPropertyType,
    TransactionType,
} from '../types/realty';
import { realtyPropertyTypes, toRealtySlug } from './realty';

export const REALTY_IMPORT_SOURCES: RealtyImportSource[] = [
    'manual',
    'csv',
    'imported-url',
    'mls',
    'idx',
    'api',
    'external-feed',
];
export const REALTY_IMPORT_STAGING_SOURCE = 'realty-import-staging';

const REALTY_IMPORT_REVIEW_STATUSES: RealtyExternalListingReviewStatus[] = ['draft', 'needs_review', 'approved', 'rejected'];
const REALTY_IMPORT_DUPLICATE_STATUSES: RealtyDuplicateReviewStatus[] = ['none', 'possible_duplicate', 'confirmed_duplicate', 'not_duplicate'];

export interface RealtyExternalListingDraftContext {
    projectId: string;
    tenantId?: string | null;
    userId?: string | null;
    importJobId?: string;
    sourceType: RealtyImportSource | string;
    sourceName?: string;
    sourceUrl?: string;
}

export type RealtyExternalListingInput = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cleanText = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

const pickText = (record: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
        const value = cleanText(record[key]);
        if (value) return value;
    }
    return '';
};

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | undefined => {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value.replace(/[^0-9.-]+/g, ''));
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return undefined;
};

const pickStringArray = (record: Record<string, unknown>, keys: string[]): string[] => {
    for (const key of keys) {
        const value = record[key];
        if (Array.isArray(value)) {
            return value
                .map(item => typeof item === 'string' ? item.trim() : '')
                .filter(Boolean);
        }
        if (typeof value === 'string' && value.trim()) {
            return value.split(',').map(item => item.trim()).filter(Boolean);
        }
    }
    return [];
};

const normalizeComparable = (value: unknown): string =>
    cleanText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeAddressKey = (value: {
    address?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    zipCode?: string;
}) => [
    value.addressLine1 || value.address,
    value.city,
    value.state,
    value.postalCode || value.zipCode,
].map(normalizeComparable).filter(Boolean).join('|');

const normalizeTransactionType = (value: unknown): TransactionType | undefined => {
    const normalized = cleanText(value).toLowerCase();
    return normalized === 'sale' || normalized === 'rent' || normalized === 'lease'
        ? normalized
        : undefined;
};

const normalizePropertyType = (value: unknown): RealtyPropertyType | undefined => {
    const normalized = cleanText(value).toLowerCase();
    return (realtyPropertyTypes as string[]).includes(normalized)
        ? normalized as RealtyPropertyType
        : undefined;
};

export const normalizeRealtyImportSource = (value: unknown, fallback: RealtyImportSource = 'manual'): RealtyImportSource => {
    const normalized = cleanText(value).toLowerCase();
    return (REALTY_IMPORT_SOURCES as string[]).includes(normalized)
        ? normalized as RealtyImportSource
        : fallback;
};

export const getRealtyImportExternalId = (value: unknown): string => {
    if (!isRecord(value)) return '';
    const metadata = isRecord(value.metadata) ? value.metadata : {};
    const importMetadata = isRecord(metadata.import) ? metadata.import : {};
    return pickText(value, ['externalId', 'external_id', 'mlsId', 'mls_id', 'listingId', 'listing_id'])
        || pickText(metadata, ['externalId', 'external_id', 'mlsId', 'mls_id', 'listingId', 'listing_id'])
        || pickText(importMetadata, ['externalId', 'external_id', 'mlsId', 'mls_id', 'listingId', 'listing_id']);
};

export const getRealtyImportReviewMetadata = (property: Pick<Partial<RealtyProperty>, 'metadata'>): Record<string, unknown> => {
    const metadata = isRecord(property.metadata) ? property.metadata : {};
    return isRecord(metadata.import) ? metadata.import : {};
};

export const isRealtyImportReviewProperty = (property: Pick<Partial<RealtyProperty>, 'metadata'>): boolean => {
    const metadata = isRecord(property.metadata) ? property.metadata : {};
    const importMetadata = getRealtyImportReviewMetadata(property);
    return metadata.source === REALTY_IMPORT_STAGING_SOURCE
        || Boolean(importMetadata.syncKey)
        || Boolean(importMetadata.importReviewStatus)
        || importMetadata.noAutoPublish === true
        || importMetadata.needsReview === true;
};

export const getRealtyImportReviewStatus = (
    property: Pick<Partial<RealtyProperty>, 'metadata'>
): RealtyExternalListingReviewStatus => {
    const importMetadata = getRealtyImportReviewMetadata(property);
    const reviewStatus = cleanText(importMetadata.importReviewStatus || importMetadata.reviewStatus);
    return (REALTY_IMPORT_REVIEW_STATUSES as string[]).includes(reviewStatus)
        ? reviewStatus as RealtyExternalListingReviewStatus
        : isRealtyImportReviewProperty(property)
            ? 'needs_review'
            : 'draft';
};

export const getRealtyImportDuplicateReviewStatus = (
    property: Pick<Partial<RealtyProperty>, 'metadata'>
): RealtyDuplicateReviewStatus => {
    const importMetadata = getRealtyImportReviewMetadata(property);
    const duplicateStatus = cleanText(importMetadata.duplicateReviewStatus);
    return (REALTY_IMPORT_DUPLICATE_STATUSES as string[]).includes(duplicateStatus)
        ? duplicateStatus as RealtyDuplicateReviewStatus
        : 'none';
};

export const canPublishRealtyImportProperty = (property: Pick<Partial<RealtyProperty>, 'metadata'>): boolean => {
    if (!isRealtyImportReviewProperty(property)) return true;
    const importMetadata = getRealtyImportReviewMetadata(property);
    const duplicateStatus = getRealtyImportDuplicateReviewStatus(property);
    return getRealtyImportReviewStatus(property) === 'approved'
        && importMetadata.needsReview !== true
        && importMetadata.noAutoPublish !== true
        && duplicateStatus !== 'confirmed_duplicate'
        && duplicateStatus !== 'possible_duplicate';
};

export const buildRealtyImportReviewMetadata = (
    property: Pick<Partial<RealtyProperty>, 'metadata'>,
    reviewStatus: RealtyExternalListingReviewStatus,
    reviewerId?: string | null,
    reviewedAt: string = new Date().toISOString()
): Record<string, unknown> => {
    const metadata = isRecord(property.metadata) ? property.metadata : {};
    const importMetadata = getRealtyImportReviewMetadata(property);
    const approved = reviewStatus === 'approved';
    const rejected = reviewStatus === 'rejected';
    const duplicateStatus = getRealtyImportDuplicateReviewStatus(property);

    return {
        ...metadata,
        source: metadata.source || REALTY_IMPORT_STAGING_SOURCE,
        import: {
            ...importMetadata,
            importReviewStatus: reviewStatus,
            duplicateReviewStatus: approved && duplicateStatus === 'possible_duplicate' ? 'not_duplicate' : duplicateStatus,
            needsReview: reviewStatus === 'needs_review' || reviewStatus === 'draft',
            noAutoPublish: !approved,
            approvedAt: approved ? reviewedAt : importMetadata.approvedAt || '',
            approvedBy: approved ? reviewerId || '' : importMetadata.approvedBy || '',
            rejectedAt: rejected ? reviewedAt : importMetadata.rejectedAt || '',
            rejectedBy: rejected ? reviewerId || '' : importMetadata.rejectedBy || '',
            reviewedAt,
            reviewedBy: reviewerId || '',
        },
    };
};

export const createRealtyImportSyncKey = (input: {
    sourceType: RealtyImportSource | string;
    projectId?: string;
    externalId?: string;
    slug?: string;
    title?: string;
    address?: string;
}): string => {
    const sourceType = normalizeRealtyImportSource(input.sourceType);
    const stablePart = cleanText(input.externalId)
        || cleanText(input.slug)
        || toRealtySlug(cleanText(input.title) || cleanText(input.address) || 'imported-listing');
    return [
        'realty-import',
        sourceType,
        cleanText(input.projectId) || 'project',
        stablePart,
    ].join(':');
};

export const normalizeRealtyExternalListingDraft = (
    input: RealtyExternalListingInput,
    context: RealtyExternalListingDraftContext
): RealtyExternalListingDraft => {
    const sourceType = normalizeRealtyImportSource(context.sourceType);
    const externalId = getRealtyImportExternalId(input);
    const title = pickText(input, ['title', 'name', 'listingTitle', 'listing_title']);
    const address = pickText(input, ['address', 'addressLine1', 'address_line_1', 'streetAddress', 'street_address']);
    const city = pickText(input, ['city', 'municipality']);
    const state = pickText(input, ['state', 'region']);
    const postalCode = pickText(input, ['postalCode', 'postal_code', 'zipCode', 'zip_code']);
    const slug = cleanText(input.slug) || toRealtySlug(title || externalId || address || 'imported-listing');
    const price = pickNumber(input, ['price', 'listPrice', 'list_price', 'rent', 'leasePrice']);
    const propertyType = normalizePropertyType(input.propertyType || input.property_type);
    const transactionType = normalizeTransactionType(input.transactionType || input.transaction_type);
    const id = cleanText(input.id);
    const tenantId = context.tenantId ?? (pickText(input, ['tenantId', 'tenant_id']) || null);
    const userId = context.userId ?? (pickText(input, ['userId', 'user_id']) || null);
    const createdBy = context.userId ?? (pickText(input, ['createdBy', 'created_by']) || null);
    const importJobId = context.importJobId || pickText(input, ['importJobId', 'import_job_id']) || undefined;
    const sourceName = context.sourceName || pickText(input, ['sourceName', 'source_name']) || undefined;
    const sourceUrl = context.sourceUrl || pickText(input, ['sourceUrl', 'source_url', 'url']) || undefined;
    const createdAt = cleanText(input.createdAt);
    const updatedAt = cleanText(input.updatedAt);
    const syncKey = createRealtyImportSyncKey({
        sourceType,
        projectId: context.projectId,
        externalId,
        slug,
        title,
        address,
    });

    const sourceMap: Record<string, string> = {
        title: title ? 'import.title' : 'missing',
        slug: cleanText(input.slug) ? 'import.slug' : 'generated.fromImportedIdentity',
        status: 'realtyImport.defaultDraftStatus',
        publicEnabled: 'realtyImport.noAutoPublish',
        needsReview: 'realtyImport.reviewGate',
    };
    if (externalId) sourceMap.externalId = 'import.externalId';
    if (price !== undefined) sourceMap.price = 'import.price';
    if (address) sourceMap.address = 'import.address';

    const reviewWarnings = [
        !title ? 'missing_title' : '',
        price === undefined ? 'missing_price' : '',
        !address && !city ? 'missing_location' : '',
        !externalId && sourceType !== 'manual' ? 'missing_external_id' : '',
    ].filter(Boolean);

    return {
        ...(id ? { id } : {}),
        tenantId,
        projectId: context.projectId,
        userId,
        createdBy,
        externalId,
        importJobId,
        sourceType,
        sourceName,
        sourceUrl,
        syncKey,
        title,
        slug,
        description: pickText(input, ['description', 'descriptionShort', 'description_short']),
        descriptionShort: pickText(input, ['descriptionShort', 'description_short']),
        descriptionLong: pickText(input, ['descriptionLong', 'description_long', 'remarks']),
        price: price ?? 0,
        currency: pickText(input, ['currency']) || 'USD',
        transactionType,
        propertyType,
        address,
        addressLine1: address,
        city,
        state,
        postalCode,
        bedrooms: pickNumber(input, ['bedrooms', 'beds']) ?? 0,
        bathrooms: pickNumber(input, ['bathrooms', 'baths']) ?? 0,
        area: pickNumber(input, ['area', 'areaSqft', 'area_sqft', 'squareFeet', 'square_feet']) ?? 0,
        areaUnit: 'sqft',
        lotSize: pickNumber(input, ['lotSize', 'lot_size', 'lotSqft', 'lot_sqft']),
        parkingSpaces: pickNumber(input, ['parkingSpaces', 'parking_spaces']),
        yearBuilt: pickNumber(input, ['yearBuilt', 'year_built']),
        amenities: pickStringArray(input, ['amenities']),
        features: pickStringArray(input, ['features']),
        highlights: pickStringArray(input, ['highlights']),
        images: Array.isArray(input.images) ? input.images as RealtyProperty['images'] : [],
        mainImageUrl: pickText(input, ['mainImageUrl', 'main_image_url']),
        videoUrl: pickText(input, ['videoUrl', 'video_url']),
        virtualTourUrl: pickText(input, ['virtualTourUrl', 'virtual_tour_url']),
        status: 'draft',
        importReviewStatus: 'needs_review',
        duplicateReviewStatus: 'none',
        duplicateMatches: [],
        publicEnabled: false,
        needsReview: true,
        noAutoPublish: true,
        generatedByAI: false,
        userModified: false,
        lockedFromRegeneration: false,
        isFeatured: false,
        rawPayload: isRecord(input.rawPayload) ? input.rawPayload : { ...input },
        sourceMap,
        reviewWarnings,
        metadata: {
            ...(isRecord(input.metadata) ? input.metadata : {}),
            source: REALTY_IMPORT_STAGING_SOURCE,
            import: {
                sourceType,
                sourceName: sourceName || '',
                externalId,
                syncKey,
                needsReview: true,
                noAutoPublish: true,
            },
        },
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
    };
};

const getImportedSourceType = (property: RealtyProperty | RealtyExternalListingDraft): string => {
    const metadata = isRecord(property.metadata) ? property.metadata : {};
    const importMetadata = isRecord(metadata.import) ? metadata.import : {};
    return cleanText((property as RealtyExternalListingDraft).sourceType)
        || pickText(importMetadata, ['sourceType', 'source_type'])
        || pickText(metadata, ['sourceType', 'source_type']);
};

const priceIsClose = (a?: number, b?: number): boolean => {
    if (!a || !b) return false;
    const delta = Math.abs(a - b);
    const baseline = Math.max(a, b);
    return baseline > 0 && delta / baseline <= 0.02;
};

const uniqueMatchKeys = (keys: RealtyDuplicateMatchKey[]): RealtyDuplicateMatchKey[] =>
    Array.from(new Set(keys));

export const findRealtyDuplicateMatches = (
    draft: RealtyExternalListingDraft,
    existingProperties: RealtyProperty[]
): RealtyDuplicateMatch[] => {
    const draftExternalId = cleanText(draft.externalId);
    const draftSourceType = getImportedSourceType(draft);
    const draftAddressKey = normalizeAddressKey(draft);
    const draftTitle = normalizeComparable(draft.title);
    const draftCity = normalizeComparable(draft.city);

    return existingProperties
        .map((property): RealtyDuplicateMatch | null => {
            if (draft.projectId && property.projectId && draft.projectId !== property.projectId) return null;

            const matchKeys: RealtyDuplicateMatchKey[] = [];
            let confidence = 0;
            const existingExternalId = getRealtyImportExternalId(property);
            const existingSourceType = getImportedSourceType(property);
            const existingAddressKey = normalizeAddressKey(property);
            const existingTitle = normalizeComparable(property.title);
            const existingCity = normalizeComparable(property.city);

            if (draft.projectId && property.projectId === draft.projectId) matchKeys.push('projectId');
            if (draftExternalId && existingExternalId && draftExternalId === existingExternalId) {
                matchKeys.push('externalId');
                confidence = Math.max(confidence, draftSourceType === existingSourceType ? 0.98 : 0.92);
            }
            if (draft.slug && property.slug && draft.slug === property.slug) {
                matchKeys.push('slug');
                confidence = Math.max(confidence, 0.86);
            }
            if (draftAddressKey && existingAddressKey && draftAddressKey === existingAddressKey) {
                matchKeys.push('address');
                confidence = Math.max(confidence, 0.82);
            }
            if (draftTitle && existingTitle && draftTitle === existingTitle && draftCity && draftCity === existingCity) {
                matchKeys.push('title');
                confidence = Math.max(confidence, 0.62);
                if (priceIsClose(draft.price, property.price)) {
                    matchKeys.push('price');
                    confidence = Math.max(confidence, 0.72);
                }
            }

            if (confidence < 0.5) return null;

            const uniqueKeys = uniqueMatchKeys(matchKeys);
            return {
                existingPropertyId: property.id,
                confidence,
                matchKeys: uniqueKeys,
                reason: uniqueKeys.filter(key => key !== 'projectId').join('_') || 'possible_duplicate',
                existingSlug: property.slug,
                existingTitle: property.title,
                existingExternalId,
                existingSourceType,
            };
        })
        .filter((match): match is RealtyDuplicateMatch => match !== null)
        .sort((a, b) => b.confidence - a.confidence);
};

export const prepareRealtyImportReviewDrafts = (
    rows: RealtyExternalListingInput[],
    context: RealtyExternalListingDraftContext,
    existingProperties: RealtyProperty[] = []
): RealtyExternalListingDraft[] =>
    rows.map(row => {
        const draft = normalizeRealtyExternalListingDraft(row, context);
        const duplicateMatches = findRealtyDuplicateMatches(draft, existingProperties);
        return {
            ...draft,
            duplicateMatches,
            duplicateReviewStatus: duplicateMatches.length > 0 ? 'possible_duplicate' : 'none',
            reviewWarnings: duplicateMatches.length > 0
                ? [...draft.reviewWarnings, 'possible_duplicate']
                : draft.reviewWarnings,
        };
    });
