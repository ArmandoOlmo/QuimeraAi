import { supabase as defaultSupabase } from '../../supabase';
import type { LeadStatus } from '../../types/business';
import type { LeadStage, LeadType, RealtyProperty } from '../../types/realty';
import { buildCanonicalEmailDraftEvent } from '../email/emailModuleIntentService.ts';
import { REALTY_LEAD_SOURCE } from '../../utils/realty';

export const REALTY_LEAD_PIPELINE_SOURCE = 'realty-lead-pipeline';
export const REALTY_LEAD_PIPELINE_VERSION = 1;

export type RealtyLeadPipelineEventType = 'property_inquiry' | 'open_house_registration' | 'showing_request';

export type RealtyLeadPipelineAnalyticsEvent =
    | 'lead_submitted'
    | 'open_house_registered'
    | 'showing_requested';

export interface RealtyLeadPipelineContact {
    name: string;
    email: string;
    phone?: string;
    message?: string;
    leadType?: LeadType;
    budget?: number | string | null;
}

export interface RealtyShowingRequestDetails {
    preferredDate?: string;
    preferredTime?: string;
    financingStatus?: string;
    assignedAgentId?: string;
    consentAccepted?: boolean;
}

export interface RealtyOpenHouseRegistrationDetails {
    openHouseId: string;
    openHouseStartsAt?: string | null;
}

export interface RealtyLeadPipelineInput {
    eventType: RealtyLeadPipelineEventType;
    property: Pick<
        RealtyProperty,
        | 'id'
        | 'tenantId'
        | 'projectId'
        | 'userId'
        | 'createdBy'
        | 'title'
        | 'slug'
        | 'price'
        | 'status'
        | 'publicEnabled'
    >;
    contact: RealtyLeadPipelineContact;
    ownerId?: string | null;
    projectId?: string | null;
    requestId?: string;
    sourceComponent?: string;
    showing?: RealtyShowingRequestDetails;
    openHouse?: RealtyOpenHouseRegistrationDetails;
    now?: string;
}

export interface RealtyLeadPipelineDraftEvent {
    type: string;
    status: 'draft' | 'queued' | 'not_configured';
    needsReview: boolean;
    noRuntimeActivated: true;
    metadata: Record<string, unknown>;
}

export interface RealtyLeadPipelineMetadata {
    realtyLead: true;
    pipelineVersion: typeof REALTY_LEAD_PIPELINE_VERSION;
    source: typeof REALTY_LEAD_PIPELINE_SOURCE;
    sourceComponent: string;
    pipelineEventType: RealtyLeadPipelineEventType;
    leadSourceDetail: RealtyLeadPipelineEventType;
    leadIntent: LeadType;
    leadTags: string[];
    idempotencyKey: string;
    idempotencyBucket: string;
    submittedAt: string;
    realtyPropertyId: string;
    realtyPropertyTitle: string;
    realtyPropertySlug: string;
    propertyId: string;
    propertyTitle: string;
    propertySlug: string;
    message: string;
    noEmailSent: true;
    noAppointmentCreated: true;
    noAnalyticsTracked: true;
    needsReview: true;
    crmSync: {
        mode: 'supabase-trigger';
        status: 'pending';
    };
    timelineEvents: RealtyLeadPipelineDraftEvent[];
    emailEvents: RealtyLeadPipelineDraftEvent[];
    analyticsEvents: RealtyLeadPipelineDraftEvent[];
    chatbotHandoff: RealtyLeadPipelineDraftEvent;
    appointmentRequest?: RealtyLeadPipelineDraftEvent;
    openHouse?: {
        id: string;
        startsAt?: string | null;
    };
    showingRequest?: {
        preferredDate?: string;
        preferredTime?: string;
        financingStatus?: string;
        assignedAgentId?: string;
        consentAccepted: boolean;
    };
    [key: string]: unknown;
}

export interface RealtyLeadPipelinePayload {
    row: Record<string, unknown>;
    metadata: RealtyLeadPipelineMetadata;
    tags: string[];
    status: LeadStage;
    crmStatus: LeadStatus;
    analyticsEvent: RealtyLeadPipelineAnalyticsEvent;
    warnings: string[];
}

export interface RealtyLeadPipelineResult {
    payload: RealtyLeadPipelinePayload;
    warnings: string[];
}

type SupabaseLike = {
    from: (table: string) => any;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase();

const parseBudget = (value: RealtyLeadPipelineContact['budget']): number | null => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
};

const resolveOwnerId = (input: RealtyLeadPipelineInput) =>
    normalizeText(input.ownerId) || normalizeText(input.property.userId) || normalizeText(input.property.createdBy);

const resolveProjectId = (input: RealtyLeadPipelineInput) =>
    normalizeText(input.projectId) || normalizeText(input.property.projectId);

const createBucket = (now: string) => {
    const date = new Date(now);
    if (!Number.isFinite(date.getTime())) return now.slice(0, 13) || 'unknown';
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
};

const createIdempotencyKey = (input: RealtyLeadPipelineInput, email: string, bucket: string) =>
    input.requestId
        ? [
            REALTY_LEAD_PIPELINE_SOURCE,
            input.property.id,
            email,
            input.eventType,
            input.requestId,
        ].join(':')
        : [
            REALTY_LEAD_PIPELINE_SOURCE,
            input.property.id,
            email,
            input.eventType,
            bucket,
        ].join(':');

const resolveAnalyticsEvent = (eventType: RealtyLeadPipelineEventType): RealtyLeadPipelineAnalyticsEvent => {
    if (eventType === 'showing_request') return 'showing_requested';
    if (eventType === 'open_house_registration') return 'open_house_registered';
    return 'lead_submitted';
};

const resolveEmailFlow = (eventType: RealtyLeadPipelineEventType) => {
    if (eventType === 'showing_request') return 'showing_request_confirmation';
    if (eventType === 'open_house_registration') return 'open_house_registration';
    return 'new_property_inquiry';
};

const resolveSourceComponent = (input: RealtyLeadPipelineInput) => {
    if (input.sourceComponent) return input.sourceComponent;
    if (input.eventType === 'showing_request') return 'realty-showing-request';
    if (input.eventType === 'open_house_registration') return 'realty-open-house';
    return 'realty-property-detail';
};

const resolveLeadType = (input: RealtyLeadPipelineInput): LeadType => {
    const leadType = input.contact.leadType || 'buyer';
    return ['buyer', 'seller', 'renter', 'investor', 'agent', 'other'].includes(leadType) ? leadType : 'buyer';
};

const resolveMessage = (input: RealtyLeadPipelineInput) => {
    const message = normalizeText(input.contact.message);
    if (message) return message;
    if (input.eventType === 'showing_request') return `Showing requested for ${input.property.title}.`;
    if (input.eventType === 'open_house_registration') return `Open house registration for ${input.property.title}.`;
    return `Property inquiry for ${input.property.title}.`;
};

export const getRealtyLeadPipelineTags = (eventType: RealtyLeadPipelineEventType, leadType: LeadType): string[] => {
    const eventTag = eventType.replace(/_/g, '-');
    const tags = new Set<string>(['realty', 'website', eventTag, leadType]);
    if (eventType === 'open_house_registration') tags.add('open-house');
    if (eventType === 'showing_request' || eventType === 'open_house_registration') tags.add('high-intent');
    if (eventType === 'property_inquiry' && leadType === 'buyer') tags.add('buyer');
    return Array.from(tags);
};

export const mapRealtyStageToCrmStatus = (stage: LeadStage): LeadStatus => {
    if (stage === 'showing_scheduled' || stage === 'completed') return 'qualified';
    if (stage === 'offer_made') return 'negotiation';
    if (stage === 'closed') return 'won';
    return ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'].includes(stage) ? stage as LeadStatus : 'new';
};

export const combinePreferredDateTime = (preferredDate?: string, preferredTime?: string): string | null => {
    const date = normalizeText(preferredDate);
    if (!date) return null;
    const time = normalizeText(preferredTime) || '12:00';
    const parsed = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

export const validateRealtyLeadPipelineInput = (input: RealtyLeadPipelineInput): string[] => {
    const errors: string[] = [];
    const email = normalizeEmail(input.contact.email);
    if (!normalizeText(input.contact.name)) errors.push('name_required');
    if (!email || !EMAIL_PATTERN.test(email)) errors.push('email_invalid');
    if (!normalizeText(input.property.id)) errors.push('property_required');
    if (!resolveProjectId(input)) errors.push('project_required');
    if (!resolveOwnerId(input)) errors.push('owner_required');
    if (input.property.status !== 'active' || input.property.publicEnabled !== true) errors.push('property_not_public');
    if (input.eventType === 'open_house_registration' && !input.openHouse?.openHouseId) errors.push('open_house_required');
    return errors;
};

const createDraftEvent = (
    type: string,
    metadata: Record<string, unknown>,
    status: RealtyLeadPipelineDraftEvent['status'] = 'draft'
): RealtyLeadPipelineDraftEvent => ({
    type,
    status,
    needsReview: true,
    noRuntimeActivated: true,
    metadata,
});

export const buildRealtyLeadPipelinePayload = (input: RealtyLeadPipelineInput): RealtyLeadPipelinePayload => {
    const errors = validateRealtyLeadPipelineInput(input);
    if (errors.length > 0) {
        throw new Error(`Invalid Realty lead pipeline input: ${errors.join(', ')}`);
    }

    const submittedAt = input.now || new Date().toISOString();
    const email = normalizeEmail(input.contact.email);
    const bucket = createBucket(submittedAt);
    const idempotencyKey = createIdempotencyKey(input, email, bucket);
    const projectId = resolveProjectId(input);
    const ownerId = resolveOwnerId(input);
    const leadType = resolveLeadType(input);
    const message = resolveMessage(input);
    const budget = parseBudget(input.contact.budget) ?? input.property.price ?? null;
    const tags = getRealtyLeadPipelineTags(input.eventType, leadType);
    const sourceComponent = resolveSourceComponent(input);
    const analyticsEvent = resolveAnalyticsEvent(input.eventType);
    const emailFlow = resolveEmailFlow(input.eventType);
    const preferredDate = combinePreferredDateTime(input.showing?.preferredDate, input.showing?.preferredTime);
    const baseMetadata = {
        eventType: input.eventType,
        propertyId: input.property.id,
        propertyTitle: input.property.title,
        propertySlug: input.property.slug,
        idempotencyKey,
    };
    const metadata: RealtyLeadPipelineMetadata = {
        realtyLead: true,
        pipelineVersion: REALTY_LEAD_PIPELINE_VERSION,
        source: REALTY_LEAD_PIPELINE_SOURCE,
        sourceComponent,
        pipelineEventType: input.eventType,
        leadSourceDetail: input.eventType,
        leadIntent: leadType,
        leadTags: tags,
        idempotencyKey,
        idempotencyBucket: bucket,
        submittedAt,
        realtyPropertyId: input.property.id,
        realtyPropertyTitle: input.property.title,
        realtyPropertySlug: input.property.slug,
        propertyId: input.property.id,
        propertyTitle: input.property.title,
        propertySlug: input.property.slug,
        message,
        noEmailSent: true,
        noAppointmentCreated: true,
        noAnalyticsTracked: true,
        needsReview: true,
        crmSync: {
            mode: 'supabase-trigger',
            status: 'pending',
        },
        timelineEvents: [
            createDraftEvent(`realty_${input.eventType}`, baseMetadata, 'queued'),
        ],
        emailEvents: [
            buildCanonicalEmailDraftEvent(emailFlow, {
                sourceModule: 'realty',
                sourceComponent,
                sourceEvent: emailFlow,
                sourceEntityType: 'property_lead',
                sourceEntityId: idempotencyKey,
                projectId,
                recipientEmail: email,
                needsReview: true,
                safeToEdit: true,
                generatedByAI: false,
                transactionalConsent: input.eventType === 'showing_request'
                    ? input.showing?.consentAccepted === true
                    : null,
                consentSource: sourceComponent,
                extra: { ...baseMetadata, noAutoSend: true },
            }),
        ],
        analyticsEvents: [
            createDraftEvent(analyticsEvent, { ...baseMetadata, noRuntimeTracking: true }),
        ],
        chatbotHandoff: createDraftEvent('agent_handoff', {
            ...baseMetadata,
            intent: input.eventType,
        }),
    };

    if (input.eventType === 'showing_request') {
        metadata.showingRequest = {
            preferredDate: input.showing?.preferredDate,
            preferredTime: input.showing?.preferredTime,
            financingStatus: normalizeText(input.showing?.financingStatus),
            assignedAgentId: normalizeText(input.showing?.assignedAgentId),
            consentAccepted: input.showing?.consentAccepted === true,
        };
        metadata.appointmentRequest = createDraftEvent('showing_request_appointment', {
            ...baseMetadata,
            preferredDate,
            confirmationMode: 'manual',
            noCalendarSlotCreated: true,
        });
    }

    if (input.eventType === 'open_house_registration' && input.openHouse) {
        metadata.openHouse = {
            id: input.openHouse.openHouseId,
            startsAt: input.openHouse.openHouseStartsAt || null,
        };
    }

    return {
        row: {
            user_id: ownerId,
            tenant_id: input.property.tenantId || null,
            project_id: projectId,
            property_id: input.property.id,
            name: normalizeText(input.contact.name),
            email,
            phone: normalizeText(input.contact.phone) || null,
            message,
            stage: 'new',
            lead_type: leadType,
            preferred_date: preferredDate,
            budget,
            source: REALTY_LEAD_SOURCE,
            pipeline_idempotency_key: idempotencyKey,
            pipeline_event_type: input.eventType,
            pipeline_source: REALTY_LEAD_PIPELINE_SOURCE,
            lead_tags: tags,
            needs_review: true,
            metadata,
        },
        metadata,
        tags,
        status: 'new',
        crmStatus: mapRealtyStageToCrmStatus('new'),
        analyticsEvent,
        warnings: [
            'CRM sync is handled by Supabase triggers; no service role key is exposed in the frontend.',
            'Email, appointment, chatbot, and analytics outputs are metadata drafts only until reviewed.',
        ],
    };
};

export const createRealtyLeadPipelineEntry = async (
    input: RealtyLeadPipelineInput,
    client: SupabaseLike = defaultSupabase
): Promise<RealtyLeadPipelineResult> => {
    const payload = buildRealtyLeadPipelinePayload(input);
    const { error } = await client.from('property_leads').insert(payload.row);
    if (error) throw error;
    return {
        payload,
        warnings: payload.warnings,
    };
};

export const createPropertyInquiryLead = (
    input: Omit<RealtyLeadPipelineInput, 'eventType'>,
    client?: SupabaseLike
) => createRealtyLeadPipelineEntry({ ...input, eventType: 'property_inquiry' }, client);

export const createOpenHouseRegistrationLead = (
    input: Omit<RealtyLeadPipelineInput, 'eventType'>,
    client?: SupabaseLike
) => createRealtyLeadPipelineEntry({ ...input, eventType: 'open_house_registration' }, client);

export const createShowingRequestLead = (
    input: Omit<RealtyLeadPipelineInput, 'eventType'>,
    client?: SupabaseLike
) => createRealtyLeadPipelineEntry({ ...input, eventType: 'showing_request' }, client);

export const syncRealtyLeadToCrm = (payload: RealtyLeadPipelinePayload) => ({
    mode: 'supabase-trigger' as const,
    status: 'pending' as const,
    source: REALTY_LEAD_PIPELINE_SOURCE,
    crmStatus: payload.crmStatus,
    tags: payload.tags,
    noFrontendServiceRole: true,
});

export const recordRealtyLeadEvent = (payload: RealtyLeadPipelinePayload) => payload.metadata.timelineEvents;

export const queueRealtyEmailEvent = (payload: RealtyLeadPipelinePayload) => payload.metadata.emailEvents;

export const recordRealtyAnalyticsEvent = (payload: RealtyLeadPipelinePayload) => payload.metadata.analyticsEvents;
