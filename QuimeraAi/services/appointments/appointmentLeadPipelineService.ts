import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface AppointmentLeadPipelineInput {
    tenantId?: string | null;
    projectId: string;
    appointmentId?: string;
    appointmentTitle?: string;
    appointmentStartIso?: string;
    linkedLeadId?: string | null;
    participantName?: string | null;
    participantEmail?: string | null;
    participantPhone?: string | null;
    source?: string;
    sourceComponent?: string;
    sourceModule?: string;
    conversationTranscript?: string | null;
    idempotencyKey?: string | null;
    correlationId?: string | null;
    createdBy?: string | null;
    tags?: string[];
    notes?: string | null;
    metadata?: Record<string, unknown>;
}

export interface AppointmentLeadPipelineResult {
    leadId?: string;
    createdLead: boolean;
    warnings: string[];
}

const normalizeString = (value: unknown, maxLength = 2000): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const uniqueStrings = (...groups: Array<Array<string | undefined | null> | undefined>): string[] => {
    const tags = new Set<string>();
    groups.flat().forEach((item) => {
        const tag = normalizeString(item, 80);
        if (tag) tags.add(tag);
    });
    return Array.from(tags);
};

const resolveLeadSource = (source?: string): string => {
    if (source === 'chatbot') return 'chatbot-widget';
    if (source === 'public_booking') return 'contact-form';
    if (source === 'website_lead_form') return 'contact-form';
    if (source === 'realty') return 'realty-website';
    return source || 'manual';
};

const resolveModuleTags = (input: AppointmentLeadPipelineInput, leadSource: string): string[] => {
    const normalizedModule = normalizeString(input.sourceModule, 80);
    const normalizedComponent = normalizeString(input.sourceComponent, 80)?.toLowerCase();
    return [
        leadSource === 'chatbot-widget' ? 'chatbot' : undefined,
        normalizedModule === 'chatcore' || normalizedComponent === 'chatcore' ? 'chatcore' : undefined,
    ].filter(Boolean) as string[];
};

const buildLeadMetadata = (input: AppointmentLeadPipelineInput): Record<string, unknown> => ({
    ...(input.metadata || {}),
    appointmentId: input.appointmentId,
    appointmentTitle: input.appointmentTitle,
    appointmentStartIso: input.appointmentStartIso,
    appointmentSource: input.source,
    sourceComponent: input.sourceComponent,
    sourceModule: input.sourceModule,
    conversationTranscript: normalizeString(input.conversationTranscript, 20000),
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
});

export async function createOrLinkLeadForAppointment(
    client: SupabaseLike,
    input: AppointmentLeadPipelineInput,
): Promise<AppointmentLeadPipelineResult> {
    const warnings: string[] = [];
    const email = normalizeString(input.participantEmail, 320);
    const phone = normalizeString(input.participantPhone, 80);
    const name = normalizeString(input.participantName, 200);
    const source = resolveLeadSource(input.source);
    const metadata = buildLeadMetadata(input);
    const tags = uniqueStrings(['appointment', 'booked', input.source], resolveModuleTags(input, source), input.tags);

    if (!input.linkedLeadId && !email && !phone && !name) {
        return {
            createdLead: false,
            warnings: ['lead_skipped_missing_contact'],
        };
    }

    let lead: any | null = null;
    if (input.linkedLeadId) {
        const existing = await client
            .from('leads')
            .select('id, tags, custom_data, notes')
            .eq('id', input.linkedLeadId)
            .eq('project_id', input.projectId)
            .maybeSingle();
        if (existing.error) warnings.push(`lead_lookup_failed:${existing.error.message}`);
        lead = existing.data || null;
    }

    if (!lead && email) {
        const existing = await client
            .from('leads')
            .select('id, tags, custom_data, notes')
            .eq('project_id', input.projectId)
            .eq('email', email)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (existing.error) warnings.push(`lead_lookup_failed:${existing.error.message}`);
        lead = existing.data || null;
    }

    if (lead?.id) {
        const existingCustomData = lead.custom_data && typeof lead.custom_data === 'object' && !Array.isArray(lead.custom_data)
            ? lead.custom_data
            : {};
        const updatedTags = uniqueStrings(lead.tags || [], tags);
        const update = await client
            .from('leads')
            .update({
                tags: updatedTags,
                custom_data: {
                    ...existingCustomData,
                    ...metadata,
                    linkedAppointmentIds: uniqueStrings(
                        Array.isArray(existingCustomData.linkedAppointmentIds) ? existingCustomData.linkedAppointmentIds : [],
                        input.appointmentId ? [input.appointmentId] : [],
                    ),
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', lead.id)
            .eq('project_id', input.projectId);
        if (update.error) warnings.push(`lead_update_failed:${update.error.message}`);
        await recordAppointmentLeadActivity(client, {
            ...input,
            linkedLeadId: lead.id,
            activityType: 'appointment_linked',
        }, warnings);
        return { leadId: lead.id, createdLead: false, warnings };
    }

    if (!input.tenantId) {
        return {
            createdLead: false,
            warnings: [...warnings, 'lead_skipped_missing_tenant'],
        };
    }

    const leadPayload = {
        tenant_id: input.tenantId,
        project_id: input.projectId,
        name: name || email || phone || 'Appointment lead',
        email: email || '',
        phone: phone || null,
        company: null,
        status: 'new',
        source,
        value: 0,
        tags,
        notes: input.notes || `Appointment booked${input.appointmentTitle ? `: ${input.appointmentTitle}` : ''}`,
        custom_data: metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const created = await client
        .from('leads')
        .insert(leadPayload)
        .select('id')
        .single();

    if (created.error) {
        return {
            createdLead: false,
            warnings: [...warnings, `lead_create_failed:${created.error.message}`],
        };
    }

    await recordAppointmentLeadActivity(client, {
        ...input,
        linkedLeadId: created.data.id,
        activityType: 'appointment_created',
    }, warnings);

    return {
        leadId: created.data.id,
        createdLead: true,
        warnings,
    };
}

export async function recordAppointmentLeadActivity(
    client: SupabaseLike,
    input: AppointmentLeadPipelineInput & { activityType?: string },
    warnings: string[] = [],
): Promise<void> {
    if (!input.tenantId || !input.linkedLeadId) return;

    const activity = await client
        .from('lead_activities')
        .insert({
            tenant_id: input.tenantId,
            project_id: input.projectId,
            lead_id: input.linkedLeadId,
            type: input.activityType || 'appointment_created',
            description: input.appointmentTitle
                ? `Appointment: ${input.appointmentTitle}`
                : 'Appointment activity',
            metadata: buildLeadMetadata(input),
            created_at: new Date().toISOString(),
        });

    if (activity.error) warnings.push(`lead_activity_failed:${activity.error.message}`);
}

export async function createAppointmentFollowUpTask(
    client: SupabaseLike,
    input: AppointmentLeadPipelineInput & { title: string; description?: string | null; dueDate?: string | null },
): Promise<{ taskId?: string; warning?: string }> {
    if (!input.tenantId || !input.linkedLeadId) {
        return { warning: 'follow_up_skipped_missing_lead_or_tenant' };
    }

    const task = await client
        .from('lead_tasks')
        .insert({
            tenant_id: input.tenantId,
            project_id: input.projectId,
            lead_id: input.linkedLeadId,
            title: input.title,
            description: input.description || null,
            due_date: input.dueDate || null,
            status: 'open',
            is_completed: false,
            metadata: buildLeadMetadata(input),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (task.error) return { warning: `follow_up_create_failed:${task.error.message}` };
    return { taskId: task.data.id };
}
