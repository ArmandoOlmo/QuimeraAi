import { describe, expect, it } from 'vitest';
import type { RealtyProperty } from '../../types/realty';
import {
    buildRealtyLeadPipelinePayload,
    combinePreferredDateTime,
    getRealtyLeadPipelineTags,
    mapRealtyStageToCrmStatus,
    REALTY_LEAD_PIPELINE_SOURCE,
    validateRealtyLeadPipelineInput,
} from '../../services/realty/realtyLeadPipelineService';

const property = (overrides: Partial<RealtyProperty> = {}): RealtyProperty => ({
    id: 'property-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    userId: 'user-1',
    createdBy: 'user-1',
    title: 'Dorado Villa',
    slug: 'dorado-villa',
    description: 'Reviewed active listing.',
    price: 1250000,
    currency: 'USD',
    transactionType: 'sale',
    address: 'Dorado',
    city: 'Dorado',
    propertyType: 'house',
    status: 'active',
    bedrooms: 4,
    bathrooms: 3,
    area: 3200,
    areaUnit: 'sqft',
    amenities: [],
    images: [],
    isFeatured: true,
    publicEnabled: true,
    createdAt: '2026-06-24T12:00:00.000Z',
    updatedAt: '2026-06-24T12:00:00.000Z',
    ...overrides,
});

describe('realtyLeadPipelineService', () => {
    it('builds a showing request payload with reviewable cross-module drafts', () => {
        const payload = buildRealtyLeadPipelinePayload({
            eventType: 'showing_request',
            property: property(),
            contact: {
                name: 'Ana Buyer',
                email: 'ANA@EXAMPLE.COM',
                phone: '787-555-0101',
                leadType: 'buyer',
                budget: '$1,300,000',
                message: 'I want to tour this week.',
            },
            showing: {
                preferredDate: '2026-07-01',
                preferredTime: '14:30',
                financingStatus: 'preapproved',
                consentAccepted: true,
            },
            now: '2026-06-24T12:15:00.000Z',
        });

        expect(payload.row).toMatchObject({
            user_id: 'user-1',
            project_id: 'project-1',
            property_id: 'property-1',
            email: 'ana@example.com',
            lead_type: 'buyer',
            source: 'realty-website',
            pipeline_event_type: 'showing_request',
            pipeline_source: REALTY_LEAD_PIPELINE_SOURCE,
            needs_review: true,
        });
        expect(payload.row.pipeline_idempotency_key).toBe(payload.metadata.idempotencyKey);
        expect(payload.row.lead_tags).toEqual(expect.arrayContaining(['realty', 'showing-request', 'buyer', 'high-intent']));
        expect(payload.metadata.source).toBe(REALTY_LEAD_PIPELINE_SOURCE);
        expect(payload.metadata.pipelineEventType).toBe('showing_request');
        expect(payload.metadata.showingRequest?.financingStatus).toBe('preapproved');
        expect(payload.metadata.appointmentRequest?.metadata.noCalendarSlotCreated).toBe(true);
        expect(payload.metadata.emailEvents[0]).toMatchObject({ type: 'showing_request_confirmation', needsReview: true });
        expect(payload.metadata.analyticsEvents[0]).toMatchObject({ type: 'showing_requested', noRuntimeActivated: true });
        expect(payload.tags).toEqual(expect.arrayContaining(['realty', 'showing-request', 'buyer', 'high-intent']));
        expect(payload.crmStatus).toBe('new');
    });

    it('identifies open house registrations without activating email or appointment runtime', () => {
        const payload = buildRealtyLeadPipelinePayload({
            eventType: 'open_house_registration',
            property: property(),
            contact: {
                name: 'Carlos Visitor',
                email: 'carlos@example.com',
                leadType: 'investor',
            },
            openHouse: {
                openHouseId: 'open-house-1',
                openHouseStartsAt: '2026-07-02T18:00:00.000Z',
            },
            now: '2026-06-24T13:00:00.000Z',
        });

        expect(payload.metadata.openHouse).toEqual({
            id: 'open-house-1',
            startsAt: '2026-07-02T18:00:00.000Z',
        });
        expect(payload.metadata.noEmailSent).toBe(true);
        expect(payload.metadata.noAppointmentCreated).toBe(true);
        expect(payload.metadata.noAnalyticsTracked).toBe(true);
        expect(payload.tags).toEqual(expect.arrayContaining(['open-house', 'investor', 'high-intent']));
    });

    it('rejects invalid public submissions before touching Supabase', () => {
        const errors = validateRealtyLeadPipelineInput({
            eventType: 'property_inquiry',
            property: property({ status: 'draft', publicEnabled: false }),
            contact: {
                name: '',
                email: 'not-an-email',
            },
        });

        expect(errors).toEqual(expect.arrayContaining(['name_required', 'email_invalid', 'property_not_public']));
    });

    it('keeps idempotency scoped to property, email, event type, and time bucket', () => {
        const first = buildRealtyLeadPipelinePayload({
            eventType: 'property_inquiry',
            property: property(),
            contact: { name: 'Ana Buyer', email: 'ana@example.com' },
            now: '2026-06-24T12:15:00.000Z',
        });
        const second = buildRealtyLeadPipelinePayload({
            eventType: 'showing_request',
            property: property(),
            contact: { name: 'Ana Buyer', email: 'ana@example.com' },
            now: '2026-06-24T12:25:00.000Z',
        });

        expect(first.metadata.idempotencyKey).toContain('property_inquiry');
        expect(second.metadata.idempotencyKey).toContain('showing_request');
        expect(first.metadata.idempotencyKey).not.toBe(second.metadata.idempotencyKey);
        expect(first.metadata.idempotencyBucket).toBe('2026-06-24T12:00:00.000Z');
    });

    it('scopes caller request ids by property and event type', () => {
        const first = buildRealtyLeadPipelinePayload({
            eventType: 'property_inquiry',
            property: property(),
            contact: { name: 'Ana Buyer', email: 'ana@example.com' },
            requestId: 'form-submit-1',
            now: '2026-06-24T12:15:00.000Z',
        });
        const second = buildRealtyLeadPipelinePayload({
            eventType: 'showing_request',
            property: property(),
            contact: { name: 'Ana Buyer', email: 'ana@example.com' },
            requestId: 'form-submit-1',
            now: '2026-06-24T12:15:00.000Z',
        });
        const third = buildRealtyLeadPipelinePayload({
            eventType: 'property_inquiry',
            property: property({ id: 'property-2', slug: 'condado-loft' }),
            contact: { name: 'Ana Buyer', email: 'ana@example.com' },
            requestId: 'form-submit-1',
            now: '2026-06-24T12:15:00.000Z',
        });

        expect(first.metadata.idempotencyKey).toContain('form-submit-1');
        expect(first.metadata.idempotencyKey).not.toBe(second.metadata.idempotencyKey);
        expect(first.metadata.idempotencyKey).not.toBe(third.metadata.idempotencyKey);
    });

    it('maps extended Realty stages into CRM-safe statuses', () => {
        expect(mapRealtyStageToCrmStatus('showing_scheduled')).toBe('qualified');
        expect(mapRealtyStageToCrmStatus('completed')).toBe('qualified');
        expect(mapRealtyStageToCrmStatus('offer_made')).toBe('negotiation');
        expect(mapRealtyStageToCrmStatus('closed')).toBe('won');
        expect(getRealtyLeadPipelineTags('showing_request', 'renter')).toEqual(expect.arrayContaining(['renter', 'high-intent']));
    });

    it('combines preferred showing date and time into an ISO timestamp', () => {
        expect(combinePreferredDateTime('2026-07-01', '09:45')).toContain('2026-07-01');
        expect(combinePreferredDateTime('', '09:45')).toBeNull();
    });
});
