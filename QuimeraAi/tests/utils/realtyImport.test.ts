import { describe, expect, it } from 'vitest';
import type { RealtyProperty } from '../../types/realty';
import {
    mapRealtyImportJobRow,
    mapRealtyImportJobToRow,
    mapRealtyImportSourceRow,
    mapRealtyImportSourceToRow,
} from '../../utils/realty';
import {
    buildRealtyImportReviewMetadata,
    canPublishRealtyImportProperty,
    findRealtyDuplicateMatches,
    getRealtyImportReviewStatus,
    isRealtyImportReviewProperty,
    normalizeRealtyExternalListingDraft,
    normalizeRealtyImportSource,
    prepareRealtyImportReviewDrafts,
    REALTY_IMPORT_STAGING_SOURCE,
} from '../../utils/realtyImport';

const now = '2026-06-24T12:00:00.000Z';

const existingProperty = (overrides: Partial<RealtyProperty> = {}): RealtyProperty => ({
    id: 'property_existing',
    projectId: 'project_1',
    userId: 'user_1',
    title: 'Condado Ocean View',
    slug: 'condado-ocean-view',
    description: 'Reviewed listing.',
    price: 850000,
    currency: 'USD',
    transactionType: 'sale',
    address: '100 Ashford Avenue',
    addressLine1: '100 Ashford Avenue',
    city: 'San Juan',
    state: 'PR',
    postalCode: '00907',
    propertyType: 'condo',
    status: 'active',
    bedrooms: 2,
    bathrooms: 2,
    area: 1400,
    areaUnit: 'sqft',
    amenities: ['pool'],
    images: [],
    isFeatured: false,
    publicEnabled: true,
    metadata: {
        import: {
            sourceType: 'idx',
            externalId: 'MLS-123',
        },
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

describe('realtyImport helpers', () => {
    it('normalizes external listings as draft-only review records', () => {
        const draft = normalizeRealtyExternalListingDraft({
            external_id: 'MLS-123',
            title: 'Condado Ocean View',
            price: '$850,000',
            address: '100 Ashford Avenue',
            city: 'San Juan',
            state: 'PR',
            postal_code: '00907',
            property_type: 'condo',
            transaction_type: 'sale',
            amenities: 'Pool, Security, Parking',
        }, {
            projectId: 'project_1',
            userId: 'user_1',
            sourceType: 'csv',
            sourceName: 'June CSV',
        });

        expect(draft).toMatchObject({
            externalId: 'MLS-123',
            sourceType: 'csv',
            title: 'Condado Ocean View',
            slug: 'condado-ocean-view',
            price: 850000,
            status: 'draft',
            importReviewStatus: 'needs_review',
            publicEnabled: false,
            needsReview: true,
            noAutoPublish: true,
            generatedByAI: false,
            lockedFromRegeneration: false,
        });
        expect(draft.syncKey).toBe('realty-import:csv:project_1:MLS-123');
        expect(draft.amenities).toEqual(['Pool', 'Security', 'Parking']);
        expect(draft.id).toBeUndefined();
        expect(draft.createdAt).toBeUndefined();
        expect(draft.updatedAt).toBeUndefined();
        expect(draft.metadata?.import).toMatchObject({
            externalId: 'MLS-123',
            noAutoPublish: true,
            needsReview: true,
        });
        expect(draft.metadata?.source).toBe(REALTY_IMPORT_STAGING_SOURCE);
        expect(draft.sourceMap.publicEnabled).toBe('realtyImport.noAutoPublish');
    });

    it('detects duplicate listings without crossing project boundaries', () => {
        const draft = normalizeRealtyExternalListingDraft({
            externalId: 'MLS-123',
            title: 'Condado Ocean View',
            price: 850000,
            address: '100 Ashford Avenue',
            city: 'San Juan',
            state: 'PR',
            postalCode: '00907',
        }, {
            projectId: 'project_1',
            sourceType: 'idx',
        });
        const matches = findRealtyDuplicateMatches(draft, [
            existingProperty(),
            existingProperty({ id: 'property_other_project', projectId: 'project_2' }),
        ]);

        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({
            existingPropertyId: 'property_existing',
            confidence: 0.98,
        });
        expect(matches[0].matchKeys).toEqual(expect.arrayContaining(['projectId', 'externalId', 'address', 'title', 'price']));
    });

    it('prepares review batches with duplicate warnings and safe import sources', () => {
        const [duplicateDraft, missingDataDraft] = prepareRealtyImportReviewDrafts([
            {
                listing_id: 'MLS-123',
                title: 'Condado Ocean View',
                price: 850000,
                address: '100 Ashford Avenue',
                city: 'San Juan',
                state: 'PR',
                postalCode: '00907',
            },
            {
                title: '',
                city: '',
                sourceType: 'unknown-feed',
            },
        ], {
            projectId: 'project_1',
            sourceType: 'mls',
            sourceName: 'MLS staging feed',
        }, [existingProperty()]);

        expect(duplicateDraft.duplicateReviewStatus).toBe('possible_duplicate');
        expect(duplicateDraft.reviewWarnings).toContain('possible_duplicate');
        expect(duplicateDraft.duplicateMatches[0]?.existingPropertyId).toBe('property_existing');
        expect(missingDataDraft.sourceType).toBe('mls');
        expect(missingDataDraft.reviewWarnings).toEqual(expect.arrayContaining(['missing_title', 'missing_price', 'missing_location', 'missing_external_id']));
        expect(normalizeRealtyImportSource('IDX')).toBe('idx');
        expect(normalizeRealtyImportSource('unknown')).toBe('manual');
    });

    it('requires import review approval before imported listings can publish', () => {
        const importedProperty = existingProperty({
            id: 'property_imported_review',
            status: 'draft',
            publicEnabled: false,
            metadata: {
                source: REALTY_IMPORT_STAGING_SOURCE,
                import: {
                    sourceType: 'idx',
                    sourceName: 'IDX staging',
                    externalId: 'MLS-456',
                    syncKey: 'realty-import:idx:project_1:MLS-456',
                    importReviewStatus: 'needs_review',
                    duplicateReviewStatus: 'possible_duplicate',
                    needsReview: true,
                    noAutoPublish: true,
                },
            },
        });

        expect(isRealtyImportReviewProperty(importedProperty)).toBe(true);
        expect(getRealtyImportReviewStatus(importedProperty)).toBe('needs_review');
        expect(canPublishRealtyImportProperty(importedProperty)).toBe(false);

        const approvedMetadata = buildRealtyImportReviewMetadata(importedProperty, 'approved', 'user_1', now);
        const approvedImportMetadata = approvedMetadata.import as Record<string, unknown>;
        expect(approvedImportMetadata.importReviewStatus).toBe('approved');
        expect(approvedImportMetadata.duplicateReviewStatus).toBe('not_duplicate');
        expect(approvedImportMetadata.needsReview).toBe(false);
        expect(approvedImportMetadata.noAutoPublish).toBe(false);
        expect(canPublishRealtyImportProperty({ ...importedProperty, metadata: approvedMetadata })).toBe(true);

        const rejectedMetadata = buildRealtyImportReviewMetadata(importedProperty, 'rejected', 'user_1', now);
        expect(getRealtyImportReviewStatus({ ...importedProperty, metadata: rejectedMetadata })).toBe('rejected');
        expect(canPublishRealtyImportProperty({ ...importedProperty, metadata: rejectedMetadata })).toBe(false);
    });

    it('maps persistent import sources and jobs without enabling runtime sync', () => {
        const sourceRow = mapRealtyImportSourceToRow({
            sourceType: 'idx',
            name: 'IDX staging',
            providerName: 'MLS Partner',
            feedUrl: 'https://feeds.example.com/listings.json',
            syncMode: 'scheduled',
            enabled: false,
            status: 'needs_review',
            metadata: { noRuntimeSync: true },
        }, 'user_1', 'project_1', 'tenant_1');

        expect(sourceRow).toMatchObject({
            user_id: 'user_1',
            tenant_id: 'tenant_1',
            project_id: 'project_1',
            source_type: 'idx',
            sync_mode: 'scheduled',
            enabled: false,
            status: 'needs_review',
        });

        const source = mapRealtyImportSourceRow({
            id: 'source_1',
            ...sourceRow,
            created_at: now,
            updated_at: now,
        });
        expect(source).toMatchObject({
            id: 'source_1',
            sourceType: 'idx',
            syncMode: 'scheduled',
            enabled: false,
            status: 'needs_review',
            feedUrl: 'https://feeds.example.com/listings.json',
        });

        const jobRow = mapRealtyImportJobToRow({
            sourceId: 'source_1',
            sourceType: 'idx',
            status: 'completed',
            totalRows: 3,
            draftCount: 2,
            duplicateCount: 1,
            errorCount: 0,
            needsReview: true,
            noAutoPublish: true,
            startedAt: now,
            completedAt: now,
            metadata: { createdPropertyIds: ['property_1', 'property_2'], noRuntimeActivated: true },
        }, 'user_1', 'project_1', 'tenant_1');

        expect(jobRow).toMatchObject({
            user_id: 'user_1',
            source_id: 'source_1',
            source_type: 'idx',
            status: 'completed',
            total_rows: 3,
            draft_count: 2,
            duplicate_count: 1,
            needs_review: true,
            no_auto_publish: true,
        });

        const job = mapRealtyImportJobRow({
            id: 'job_1',
            ...jobRow,
            created_at: now,
            updated_at: now,
        });
        expect(job).toMatchObject({
            id: 'job_1',
            sourceId: 'source_1',
            sourceType: 'idx',
            status: 'completed',
            totalRows: 3,
            draftCount: 2,
            duplicateCount: 1,
            needsReview: true,
            noAutoPublish: true,
        });
    });
});
