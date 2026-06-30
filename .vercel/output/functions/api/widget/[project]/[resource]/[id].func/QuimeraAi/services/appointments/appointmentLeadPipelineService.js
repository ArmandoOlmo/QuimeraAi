import { buildReadableChatbotCustomerRequestNote } from '../../utils/chatbotEngine/customerRequestNotes.js';
const normalizeString = (value, maxLength = 2000) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};
const normalizeNoteBlock = (value, maxLength = 6000) => {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};
const uniqueStrings = (...groups) => {
    const tags = new Set();
    groups.flat().forEach((item) => {
        const tag = normalizeString(item, 80);
        if (tag)
            tags.add(tag);
    });
    return Array.from(tags);
};
const appendLeadNotes = (existingNotes, nextNotes) => {
    const existing = normalizeNoteBlock(existingNotes, 10000) || '';
    const next = normalizeNoteBlock(nextNotes, 6000);
    if (!next)
        return existing || undefined;
    if (!existing)
        return next;
    const dedupeNeedle = next.slice(0, 160);
    if (dedupeNeedle && existing.includes(dedupeNeedle))
        return existing;
    return `${existing}\n\n${next}`.slice(0, 10000);
};
const resolveLeadSource = (source) => {
    if (source === 'chatbot')
        return 'chatbot-widget';
    if (source === 'public_booking')
        return 'contact-form';
    if (source === 'website_lead_form')
        return 'contact-form';
    if (source === 'realty')
        return 'realty-website';
    return source || 'manual';
};
const resolveModuleTags = (input, leadSource) => {
    const normalizedModule = normalizeString(input.sourceModule, 80);
    const normalizedComponent = normalizeString(input.sourceComponent, 80)?.toLowerCase();
    return [
        leadSource === 'chatbot-widget' ? 'chatbot' : undefined,
        normalizedModule === 'chatcore' || normalizedComponent === 'chatcore' ? 'chatcore' : undefined,
    ].filter(Boolean);
};
const buildLeadMetadata = (input) => {
    const generatedSummary = normalizeString(input.notes, 6000);
    const readableSummary = buildReadableChatbotCustomerRequestNote(input.notes, null, {
        customer: {
            name: input.participantName || null,
            email: input.participantEmail || null,
            phone: input.participantPhone || null,
        },
        appointmentTitle: input.appointmentTitle || null,
        appointmentDateTime: input.appointmentStartIso || null,
    });
    return {
        ...(input.metadata || {}),
        appointmentId: input.appointmentId,
        appointmentTitle: input.appointmentTitle,
        appointmentStartIso: input.appointmentStartIso,
        appointmentSource: input.source,
        sourceComponent: input.sourceComponent,
        sourceModule: input.sourceModule,
        conversationTranscript: normalizeString(input.conversationTranscript, 20000),
        customerRequestSummary: readableSummary || generatedSummary,
        customerRequestNote: readableSummary,
        ...(generatedSummary && generatedSummary !== readableSummary ? { customerRequestGeneratedSummary: generatedSummary } : {}),
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
    };
};
export async function createOrLinkLeadForAppointment(client, input) {
    const warnings = [];
    const email = normalizeString(input.participantEmail, 320);
    const phone = normalizeString(input.participantPhone, 80);
    const name = normalizeString(input.participantName, 200);
    const source = resolveLeadSource(input.source);
    const metadata = buildLeadMetadata(input);
    const tags = uniqueStrings(['appointment', 'booked', input.source], resolveModuleTags(input, source), input.tags);
    const readableLeadNotes = buildReadableChatbotCustomerRequestNote(input.notes, null, {
        customer: {
            name: input.participantName || null,
            email: input.participantEmail || null,
            phone: input.participantPhone || null,
        },
        appointmentTitle: input.appointmentTitle || null,
        appointmentDateTime: input.appointmentStartIso || null,
    });
    if (!input.linkedLeadId && !email && !phone && !name) {
        return {
            createdLead: false,
            warnings: ['lead_skipped_missing_contact'],
        };
    }
    let lead = null;
    if (input.linkedLeadId) {
        const existing = await client
            .from('leads')
            .select('id, tags, custom_data, notes')
            .eq('id', input.linkedLeadId)
            .eq('project_id', input.projectId)
            .maybeSingle();
        if (existing.error)
            warnings.push(`lead_lookup_failed:${existing.error.message}`);
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
        if (existing.error)
            warnings.push(`lead_lookup_failed:${existing.error.message}`);
        lead = existing.data || null;
    }
    if (lead?.id) {
        const existingCustomData = lead.custom_data && typeof lead.custom_data === 'object' && !Array.isArray(lead.custom_data)
            ? lead.custom_data
            : {};
        const updatedTags = uniqueStrings(lead.tags || [], tags);
        const updatedNotes = appendLeadNotes(lead.notes, readableLeadNotes || input.notes);
        const update = await client
            .from('leads')
            .update({
            tags: updatedTags,
            ...(updatedNotes !== undefined ? { notes: updatedNotes } : {}),
            custom_data: {
                ...existingCustomData,
                ...metadata,
                linkedAppointmentIds: uniqueStrings(Array.isArray(existingCustomData.linkedAppointmentIds) ? existingCustomData.linkedAppointmentIds : [], input.appointmentId ? [input.appointmentId] : []),
            },
            updated_at: new Date().toISOString(),
        })
            .eq('id', lead.id)
            .eq('project_id', input.projectId);
        if (update.error)
            warnings.push(`lead_update_failed:${update.error.message}`);
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
        notes: readableLeadNotes || input.notes || `Appointment booked${input.appointmentTitle ? `: ${input.appointmentTitle}` : ''}`,
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
export async function recordAppointmentLeadActivity(client, input, warnings = []) {
    if (!input.tenantId || !input.linkedLeadId)
        return;
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
    if (activity.error)
        warnings.push(`lead_activity_failed:${activity.error.message}`);
}
export async function createAppointmentFollowUpTask(client, input) {
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
    if (task.error)
        return { warning: `follow_up_create_failed:${task.error.message}` };
    return { taskId: task.data.id };
}
//# sourceMappingURL=appointmentLeadPipelineService.js.map