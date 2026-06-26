type SupabaseClient = any;

export interface RecordEmailLogInput {
    supabase: SupabaseClient;
    projectId: string;
    tenantId?: string | null;
    userId?: string | null;
    type: 'campaign' | 'transactional' | 'test' | string;
    emailKind?: 'marketing' | 'transactional';
    templateId?: string | null;
    campaignId?: string | null;
    automationId?: string | null;
    automationStepId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    status: string;
    provider?: string;
    providerMessageId?: string | null;
    idempotencyKey?: string | null;
    sourceModule?: string | null;
    sourceComponent?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
    correlationId?: string | null;
    metadata?: Record<string, unknown>;
    sentAt?: string | null;
    errorMessage?: string | null;
    skippedReason?: string | null;
}

export async function findEmailLogByIdempotencyKey(input: {
    supabase: SupabaseClient;
    projectId: string;
    idempotencyKey: string;
}) {
    const { data, error } = await input.supabase
        .from('email_logs')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('idempotency_key', input.idempotencyKey)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const { data: metadataMatch, error: metadataError } = await input.supabase
        .from('email_logs')
        .select('*')
        .eq('project_id', input.projectId)
        .contains('metadata', { idempotencyKey: input.idempotencyKey })
        .limit(1)
        .maybeSingle();

    if (metadataError) throw metadataError;
    return metadataMatch || null;
}

export async function recordEmailLog(input: RecordEmailLogInput) {
    if (input.idempotencyKey) {
        const existing = await findEmailLogByIdempotencyKey({
            supabase: input.supabase,
            projectId: input.projectId,
            idempotencyKey: input.idempotencyKey,
        });
        if (existing) return existing;
    }

    const now = new Date().toISOString();
    const payload = {
        project_id: input.projectId,
        store_id: input.projectId,
        tenant_id: input.tenantId || null,
        user_id: input.userId || null,
        type: input.type,
        email_kind: input.emailKind || 'marketing',
        template_id: input.templateId || null,
        campaign_id: input.campaignId || null,
        automation_id: input.automationId || null,
        automation_step_id: input.automationStepId || null,
        recipient_email: input.recipientEmail,
        recipient_name: input.recipientName || null,
        subject: input.subject,
        status: input.status,
        provider: input.provider || 'resend',
        provider_message_id: input.providerMessageId || null,
        idempotency_key: input.idempotencyKey || null,
        source_module: input.sourceModule || null,
        source_component: input.sourceComponent || null,
        source_event: input.sourceEvent || null,
        source_entity_type: input.sourceEntityType || null,
        source_entity_id: input.sourceEntityId || null,
        correlation_id: input.correlationId || null,
        suppression_checked: true,
        skipped_reason: input.skippedReason || null,
        error_message: input.errorMessage || null,
        sent_at: input.sentAt || (input.status === 'sent' ? now : null),
        metadata: {
            ...(input.metadata || {}),
            ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        },
        created_at: now,
        updated_at: now,
    };

    const { data, error } = await input.supabase
        .from('email_logs')
        .insert(payload)
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data || payload;
}

export async function updateEmailLogStatus(input: {
    supabase: SupabaseClient;
    id: string;
    status: string;
    providerMessageId?: string | null;
    eventAt?: string | null;
    errorMessage?: string | null;
    skippedReason?: string | null;
    metadata?: Record<string, unknown>;
}) {
    const updates: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
    };
    if (input.providerMessageId !== undefined) updates.provider_message_id = input.providerMessageId;
    if (input.errorMessage !== undefined) updates.error_message = input.errorMessage;
    if (input.skippedReason !== undefined) updates.skipped_reason = input.skippedReason;
    if (input.metadata) updates.metadata = input.metadata;
    if (input.status === 'sent') updates.sent_at = input.eventAt || new Date().toISOString();
    if (input.status === 'delivered') updates.delivered_at = input.eventAt || new Date().toISOString();
    if (input.status === 'clicked') updates.clicked_at = input.eventAt || new Date().toISOString();
    if (input.status === 'bounced') updates.bounced_at = input.eventAt || new Date().toISOString();
    if (input.status === 'complained') updates.complained_at = input.eventAt || new Date().toISOString();

    const { data, error } = await input.supabase
        .from('email_logs')
        .update(updates)
        .eq('id', input.id)
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data || updates;
}
