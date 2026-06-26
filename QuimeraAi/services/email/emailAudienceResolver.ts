import { isValidEmail, normalizeEmail } from './emailProviderService.ts';
import { filterSuppressedRecipients } from './emailSuppressionService.ts';

type SupabaseClient = any;

export interface EmailRecipient {
    email: string;
    name?: string;
    sourceModule: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    acceptsMarketing?: boolean;
    metadata?: Record<string, unknown>;
}

export interface AudienceResolutionResult {
    recipients: EmailRecipient[];
    suppressed: EmailRecipient[];
    invalid: string[];
    counts: {
        totalCandidates: number;
        deduped: number;
        suppressed: number;
        invalid: number;
        final: number;
    };
    explanation: string[];
}

export async function resolveCampaignRecipients(input: {
    supabase: SupabaseClient;
    projectId: string;
    campaign: Record<string, any>;
    requireMarketingConsent?: boolean;
}): Promise<AudienceResolutionResult> {
    const requireConsent = input.requireMarketingConsent !== false;
    const candidates: EmailRecipient[] = [];
    const invalid: string[] = [];
    const explanation: string[] = [];
    const direct = arrayFrom(input.campaign.custom_recipient_emails);
    candidates.push(...direct.map((email) => normalizeRecipient({ email, sourceModule: 'manual', acceptsMarketing: true })));

    if (direct.length > 0) explanation.push(`${direct.length} custom campaign recipients found.`);

    const audienceId = input.campaign.audience_segment_id || input.campaign.audience_id;
    if (audienceId) {
        const audienceRecipients = await recipientsFromAudience(input.supabase, input.projectId, String(audienceId), requireConsent);
        candidates.push(...audienceRecipients.recipients);
        invalid.push(...audienceRecipients.invalid);
        explanation.push(...audienceRecipients.explanation);
    } else if (input.campaign.audience_type === 'all' || !input.campaign.audience_type) {
        const allRecipients = await recipientsFromAllProjectSources(input.supabase, input.projectId, requireConsent);
        candidates.push(...allRecipients.recipients);
        invalid.push(...allRecipients.invalid);
        explanation.push(...allRecipients.explanation);
    }

    const normalized = candidates
        .filter((recipient) => {
            if (!isValidEmail(recipient.email)) {
                invalid.push(recipient.email);
                return false;
            }
            if (requireConsent && recipient.acceptsMarketing === false) return false;
            return true;
        })
        .map((recipient) => ({ ...recipient, email: normalizeEmail(recipient.email) }));

    const deduped = dedupeRecipients(normalized);
    const { allowed, suppressed } = await filterSuppressedRecipients({
        supabase: input.supabase,
        projectId: input.projectId,
        recipients: deduped,
        scope: 'marketing',
    });

    return {
        recipients: allowed,
        suppressed,
        invalid,
        counts: {
            totalCandidates: candidates.length,
            deduped: deduped.length,
            suppressed: suppressed.length,
            invalid: invalid.length,
            final: allowed.length,
        },
        explanation,
    };
}

export async function explainAudienceResolution(input: {
    supabase: SupabaseClient;
    projectId: string;
    audienceId?: string | null;
}) {
    if (!input.audienceId) {
        return recipientsFromAllProjectSources(input.supabase, input.projectId, true);
    }
    return recipientsFromAudience(input.supabase, input.projectId, input.audienceId, true);
}

export function normalizeRecipient(input: {
    email?: string | null;
    name?: string | null;
    sourceModule: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    acceptsMarketing?: boolean;
    metadata?: Record<string, unknown>;
}): EmailRecipient {
    return {
        email: normalizeEmail(input.email),
        name: input.name || undefined,
        sourceModule: input.sourceModule,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        acceptsMarketing: input.acceptsMarketing,
        metadata: input.metadata,
    };
}

async function recipientsFromAudience(
    supabase: SupabaseClient,
    projectId: string,
    audienceId: string,
    requireConsent: boolean,
) {
    const { data, error } = await supabase
        .from('email_audiences')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
        .eq('id', audienceId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return emptyResolution([`Audience ${audienceId} was not found.`]);

    const recipients = await recipientsFromStaticAudience(supabase, projectId, data, requireConsent);
    return {
        recipients,
        invalid: [],
        explanation: [`${recipients.length} static recipients found in audience "${data.name || audienceId}".`],
    };
}

async function recipientsFromAllProjectSources(supabase: SupabaseClient, projectId: string, requireConsent: boolean) {
    const explanation: string[] = [];
    const invalid: string[] = [];
    const recipients: EmailRecipient[] = [];

    const audiences = await safeSelect(supabase, 'email_audiences', '*', (query: any) =>
        query.or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
    );
    const audienceRecipientGroups = await Promise.all(
        (audiences || []).map((audience: any) => recipientsFromStaticAudience(supabase, projectId, audience, requireConsent)),
    );
    const audienceRecipients = audienceRecipientGroups.flat();
    recipients.push(...audienceRecipients);
    explanation.push(`${audienceRecipients.length} recipients found from email audiences.`);

    const leads = await safeSelect(supabase, 'leads', '*', (query: any) => query.eq('project_id', projectId));
    const leadRecipients = (leads || [])
        .map((lead: any) => {
            const custom = readObject(lead.custom_data);
            const consent = Boolean(custom.acceptsMarketing || custom.marketingConsent || custom.emailMarketingConsent || lead.source === 'newsletter');
            return normalizeRecipient({
                email: lead.email,
                name: lead.name,
                sourceModule: lead.source === 'chatbot' ? 'chatbot' : 'crm',
                sourceEntityType: 'lead',
                sourceEntityId: lead.id,
                acceptsMarketing: requireConsent ? consent : true,
                metadata: { leadStatus: lead.status, leadSource: lead.source },
            });
        })
        .filter((recipient: EmailRecipient) => !requireConsent || recipient.acceptsMarketing);
    recipients.push(...leadRecipients);
    explanation.push(`${leadRecipients.length} consented CRM/chatbot leads found.`);

    const storeUsers = await safeSelect(supabase, 'store_users', '*', (query: any) => query.eq('project_id', projectId));
    const storeRecipients = (storeUsers || [])
        .filter((user: any) => !requireConsent || user.accepts_marketing === true)
        .map((user: any) => normalizeRecipient({
            email: user.email,
            name: user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' '),
            sourceModule: 'ecommerce',
            sourceEntityType: 'store_user',
            sourceEntityId: user.id,
            acceptsMarketing: user.accepts_marketing === true,
            metadata: { tags: user.tags, segments: user.segments },
        }));
    recipients.push(...storeRecipients);
    explanation.push(`${storeRecipients.length} consented ecommerce customers found.`);

    const appointments = await safeSelect(supabase, 'project_appointments', '*', (query: any) => query.eq('project_id', projectId));
    const appointmentRecipients = (appointments || []).flatMap((appointment: any) => {
        const participants = Array.isArray(appointment.participants) ? appointment.participants : [];
        return participants.map((participant: any) => normalizeRecipient({
            email: participant.email,
            name: participant.name,
            sourceModule: 'appointments',
            sourceEntityType: 'appointment',
            sourceEntityId: appointment.id,
            acceptsMarketing: Boolean(participant.acceptsMarketing || participant.marketingConsent),
        }));
    }).filter((recipient: EmailRecipient) => !requireConsent || recipient.acceptsMarketing);
    recipients.push(...appointmentRecipients);
    explanation.push(`${appointmentRecipients.length} consented appointment participants found.`);

    return { recipients, invalid, explanation };
}

async function recipientsFromStaticAudience(
    supabase: SupabaseClient,
    projectId: string,
    audience: Record<string, any>,
    requireConsent: boolean,
) {
    const staticMembers = readStaticMembers(audience);
    const directRecipients = staticMembers
        .filter((member: any) => member.email)
        .map((member: any) => normalizeRecipient({
            email: typeof member === 'string' ? member : member.email,
            name: typeof member === 'string' ? undefined : member.name,
            sourceModule: member.source || audience.source_module || 'email-marketing',
            sourceEntityType: 'email_audience',
            sourceEntityId: audience.id,
            acceptsMarketing: requireConsent ? member.acceptsMarketing !== false && audience.accepts_marketing !== false : true,
            metadata: { audienceId: audience.id, audienceName: audience.name },
        }))
        .filter((recipient: EmailRecipient) => !requireConsent || recipient.acceptsMarketing);

    const [leadRecipients, customerRecipients] = await Promise.all([
        recipientsFromStaticLeadIds(supabase, projectId, audience, staticMembers, requireConsent),
        recipientsFromStaticCustomerIds(supabase, projectId, audience, staticMembers, requireConsent),
    ]);

    return [...directRecipients, ...leadRecipients, ...customerRecipients];
}

function readStaticMembers(audience: Record<string, any>) {
    const members = audience.static_members || audience.members || audience.metadata?.members || [];
    if (Array.isArray(members)) return members;
    if (members && typeof members === 'object') {
        const explicitMembers = Array.isArray(members.members) ? members.members : [];
        const emails = Array.isArray(members.emails) ? members.emails : [];
        const rawLeadIds = members.leadIds || members.lead_ids;
        const rawCustomerIds = members.customerIds || members.customer_ids;
        const leadIds = Array.isArray(rawLeadIds) ? rawLeadIds : [];
        const customerIds = Array.isArray(rawCustomerIds) ? rawCustomerIds : [];
        return [
            ...explicitMembers,
            ...emails.map((email: string) => ({ email, source: 'audience-static' })),
            ...leadIds.map((leadId: string) => ({ leadId, source: 'crm' })),
            ...customerIds.map((customerId: string) => ({ customerId, source: 'ecommerce' })),
        ];
    }
    return [];
}

async function recipientsFromStaticLeadIds(
    supabase: SupabaseClient,
    projectId: string,
    audience: Record<string, any>,
    members: any[],
    requireConsent: boolean,
) {
    const leadIds = uniqueStrings(members.map((member) => member?.leadId || member?.lead_id));
    if (leadIds.length === 0) return [];

    const leads = await safeSelect(supabase, 'leads', '*', (query: any) =>
        query.eq('project_id', projectId).in('id', leadIds)
    );
    const leadById = new Map<string, any>((leads || []).map((lead: any) => [String(lead.id), lead]));

    return members
        .map((member) => {
            const leadId = String(member?.leadId || member?.lead_id || '');
            const lead = leadById.get(leadId);
            if (!lead) return null;
            const consent = hasLeadMarketingConsent(lead);
            return normalizeRecipient({
                email: lead.email,
                name: lead.name,
                sourceModule: lead.source === 'chatbot' ? 'chatbot' : 'crm',
                sourceEntityType: 'lead',
                sourceEntityId: lead.id,
                acceptsMarketing: requireConsent
                    ? consent && member.acceptsMarketing !== false && member.accepts_marketing !== false && audience.accepts_marketing !== false
                    : true,
                metadata: {
                    audienceId: audience.id,
                    audienceName: audience.name,
                    leadStatus: lead.status,
                    leadSource: lead.source,
                    ...(readObject(member.metadata)),
                },
            });
        })
        .filter((recipient): recipient is EmailRecipient => Boolean(recipient))
        .filter((recipient) => !requireConsent || recipient.acceptsMarketing);
}

async function recipientsFromStaticCustomerIds(
    supabase: SupabaseClient,
    projectId: string,
    audience: Record<string, any>,
    members: any[],
    requireConsent: boolean,
) {
    const customerIds = uniqueStrings(members.map((member) => member?.customerId || member?.customer_id));
    if (customerIds.length === 0) return [];

    const storeUsers = await safeSelect(supabase, 'store_users', '*', (query: any) =>
        query.eq('project_id', projectId).in('id', customerIds)
    );
    const customerById = new Map<string, any>((storeUsers || []).map((customer: any) => [String(customer.id), customer]));

    return members
        .map((member) => {
            const customerId = String(member?.customerId || member?.customer_id || '');
            const customer = customerById.get(customerId);
            if (!customer) return null;
            const consent = customer.accepts_marketing === true || customer.acceptsMarketing === true;
            return normalizeRecipient({
                email: customer.email,
                name: customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' '),
                sourceModule: 'ecommerce',
                sourceEntityType: 'store_user',
                sourceEntityId: customer.id,
                acceptsMarketing: requireConsent
                    ? consent && member.acceptsMarketing !== false && member.accepts_marketing !== false && audience.accepts_marketing !== false
                    : true,
                metadata: {
                    audienceId: audience.id,
                    audienceName: audience.name,
                    tags: customer.tags,
                    segments: customer.segments,
                    ...(readObject(member.metadata)),
                },
            });
        })
        .filter((recipient): recipient is EmailRecipient => Boolean(recipient))
        .filter((recipient) => !requireConsent || recipient.acceptsMarketing);
}

function hasLeadMarketingConsent(lead: Record<string, any>) {
    const custom = readObject(lead.custom_data);
    return Boolean(
        lead.accepts_marketing === true
        || lead.acceptsMarketing === true
        || custom.acceptsMarketing
        || custom.marketingConsent
        || custom.emailMarketingConsent
        || lead.source === 'newsletter'
    );
}

function dedupeRecipients(recipients: EmailRecipient[]) {
    const seen = new Map<string, EmailRecipient>();
    for (const recipient of recipients) {
        const email = normalizeEmail(recipient.email);
        if (!email || seen.has(email)) continue;
        seen.set(email, { ...recipient, email });
    }
    return Array.from(seen.values());
}

function arrayFrom(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
    return [];
}

function uniqueStrings(value: unknown[]) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
}

function readObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function emptyResolution(explanation: string[]) {
    return { recipients: [] as EmailRecipient[], invalid: [] as string[], explanation };
}

async function safeSelect(supabase: SupabaseClient, table: string, columns: string, apply: (query: any) => any) {
    const query = apply(supabase.from(table).select(columns));
    const { data, error } = await query;
    if (error) {
        console.warn(`[EmailAudienceResolver] ${table} source skipped:`, error.message || error);
        return [];
    }
    return data || [];
}
