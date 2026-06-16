import type { Lead, LeadStatus } from '../types/business';

export const leadStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];

export const leadSources: Lead['source'][] = [
    'chatbot',
    'chatbot-widget',
    'contact-form',
    'form',
    'manual',
    'referral',
    'linkedin',
    'cold_call',
    'voice-call',
    'quimera-chat',
    'import-csv',
    'import-excel',
    'hero-lead-form',
    'signup-float',
    'landing-chatbot',
    'bio_page',
    'newsletter',
    'contact-page',
    'embedded-widget',
    'realty-website',
    'library-import',
];

type LeadTimestamp = { seconds: number; nanoseconds: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

const numberValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

export const toLeadTimestamp = (value: unknown): LeadTimestamp => {
    if (isRecord(value) && typeof value.seconds === 'number') {
        return {
            seconds: value.seconds,
            nanoseconds: typeof value.nanoseconds === 'number' ? value.nanoseconds : 0,
        };
    }

    const date = value instanceof Date
        ? value
        : typeof value === 'string' || typeof value === 'number'
            ? new Date(value)
            : new Date();
    const time = Number.isFinite(date.getTime()) ? date.getTime() : Date.now();
    return { seconds: Math.floor(time / 1000), nanoseconds: 0 };
};

export const normalizeLeadStatus = (value: unknown): LeadStatus => {
    const status = String(value || 'new');
    if ((leadStatuses as string[]).includes(status)) return status as LeadStatus;
    if (status === 'showing_scheduled') return 'qualified';
    if (status === 'offer_made') return 'negotiation';
    if (status === 'closed' || status === 'converted') return 'won';
    return 'new';
};

export const normalizeLeadSource = (value: unknown): Lead['source'] => {
    const source = String(value || 'manual');
    return (leadSources as string[]).includes(source) ? source as Lead['source'] : 'manual';
};

const customLeadKeys: Array<keyof Lead> = [
    'address',
    'website',
    'linkedIn',
    'jobTitle',
    'industry',
    'probability',
    'expectedCloseDate',
    'leadScore',
    'conversationTranscript',
    'emailDraft',
    'message',
    'color',
    'emojiMarker',
    'lastContacted',
    'aiScore',
    'aiAnalysis',
    'aiSummary',
    'recommendedAction',
    'customFields',
];

const hasCustomPatch = (leadData: Partial<Lead>) =>
    customLeadKeys.some(key => leadData[key] !== undefined) || leadData.metadata !== undefined;

export const buildLeadCustomData = (
    leadData: Partial<Lead>,
    existingCustomData: Record<string, unknown> = {}
): Record<string, unknown> => {
    const customData: Record<string, unknown> = {
        ...existingCustomData,
        ...(isRecord(leadData.metadata) ? leadData.metadata : {}),
    };

    customLeadKeys.forEach(key => {
        const value = leadData[key];
        if (value !== undefined) {
            customData[key] = value;
        }
    });

    return customData;
};

export const mapLeadRowToLead = (row: Record<string, any>): Lead => {
    const customData = isRecord(row.custom_data) ? row.custom_data : {};
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const mergedMetadata = { ...customData, ...metadata };

    return {
        id: row.id,
        projectId: row.project_id,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        company: row.company || '',
        source: normalizeLeadSource(row.source),
        status: normalizeLeadStatus(row.status),
        value: numberValue(row.value) ?? 0,
        notes: row.notes || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        createdAt: toLeadTimestamp(row.created_at),
        updatedAt: toLeadTimestamp(row.updated_at || row.created_at),
        address: isRecord(mergedMetadata.address) ? mergedMetadata.address as Lead['address'] : undefined,
        website: stringValue(mergedMetadata.website),
        linkedIn: stringValue(mergedMetadata.linkedIn),
        jobTitle: stringValue(mergedMetadata.jobTitle),
        industry: stringValue(mergedMetadata.industry),
        probability: numberValue(mergedMetadata.probability),
        expectedCloseDate: mergedMetadata.expectedCloseDate ? toLeadTimestamp(mergedMetadata.expectedCloseDate) : undefined,
        leadScore: numberValue(mergedMetadata.leadScore),
        conversationTranscript: stringValue(row.conversation_transcript) || stringValue(mergedMetadata.conversationTranscript),
        emailDraft: stringValue(mergedMetadata.emailDraft),
        message: stringValue(mergedMetadata.message),
        color: stringValue(mergedMetadata.color),
        emojiMarker: stringValue(mergedMetadata.emojiMarker),
        lastContacted: mergedMetadata.lastContacted ? toLeadTimestamp(mergedMetadata.lastContacted) : undefined,
        aiScore: numberValue(mergedMetadata.aiScore),
        aiAnalysis: stringValue(mergedMetadata.aiAnalysis),
        aiSummary: stringValue(row.ai_summary) || stringValue(mergedMetadata.aiSummary),
        recommendedAction: stringValue(mergedMetadata.recommendedAction),
        metadata: mergedMetadata,
        customFields: Array.isArray(mergedMetadata.customFields) ? mergedMetadata.customFields as Lead['customFields'] : undefined,
    };
};

export const buildLeadInsertRow = (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'projectId'>,
    tenantId: string,
    projectId: string
) => {
    const now = new Date().toISOString();
    return {
        tenant_id: tenantId,
        project_id: projectId,
        name: leadData.name || '',
        email: leadData.email || '',
        phone: leadData.phone || null,
        company: leadData.company || null,
        source: normalizeLeadSource(leadData.source),
        status: normalizeLeadStatus(leadData.status),
        value: leadData.value ?? 0,
        notes: leadData.notes || leadData.message || '',
        tags: Array.isArray(leadData.tags) ? leadData.tags : [],
        custom_data: buildLeadCustomData(leadData),
        created_at: now,
        updated_at: now,
    };
};

export const buildLeadUpdateRow = (
    leadData: Partial<Lead>,
    existingCustomData: Record<string, unknown> = {}
) => {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (leadData.name !== undefined) updateData.name = leadData.name || '';
    if (leadData.email !== undefined) updateData.email = leadData.email || '';
    if (leadData.phone !== undefined) updateData.phone = leadData.phone || null;
    if (leadData.company !== undefined) updateData.company = leadData.company || null;
    if (leadData.source !== undefined) updateData.source = normalizeLeadSource(leadData.source);
    if (leadData.status !== undefined) updateData.status = normalizeLeadStatus(leadData.status);
    if (leadData.value !== undefined) updateData.value = leadData.value ?? 0;
    if (leadData.notes !== undefined) updateData.notes = leadData.notes || '';
    if (leadData.tags !== undefined) updateData.tags = Array.isArray(leadData.tags) ? leadData.tags : [];
    if (hasCustomPatch(leadData)) updateData.custom_data = buildLeadCustomData(leadData, existingCustomData);

    return updateData;
};
