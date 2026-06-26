type SupabaseClient = any;

export async function getAutomations(input: { supabase: SupabaseClient; projectId: string }) {
    const { data, error } = await input.supabase
        .from('email_automations')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createAutomationDraft(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    automation: Record<string, unknown>;
}) {
    const now = new Date().toISOString();
    const payload = mapAutomationDraftToRow(input.projectId, input.userId, input.automation, now);
    const { data, error } = await input.supabase
        .from('email_automations')
        .insert(payload)
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data || payload;
}

export async function updateAutomation(input: {
    supabase: SupabaseClient;
    projectId: string;
    automationId: string;
    updates: Record<string, unknown>;
}) {
    const current = await loadAutomation(input.supabase, input.projectId, input.automationId);
    if (!current) throw new Error('Automation not found');

    const mapped = mapAutomationUpdatesToRow(input.updates);
    const nextNeedsReview = mapped.needs_review !== undefined ? Boolean(mapped.needs_review) : Boolean(current.needs_review);
    const nextStatus = String(mapped.status || current.status || 'draft');
    if (nextStatus === 'active' && nextNeedsReview) {
        throw new Error('Automation needs review before activation');
    }

    const { data, error } = await input.supabase
        .from('email_automations')
        .update(mapped)
        .eq('id', input.automationId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function duplicateAutomation(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    automationId: string;
}) {
    const automation = await loadAutomation(input.supabase, input.projectId, input.automationId);
    if (!automation) throw new Error('Automation not found');
    return createAutomationDraft({
        supabase: input.supabase,
        projectId: input.projectId,
        userId: input.userId,
        automation: {
            ...automation,
            name: `${automation.name || 'Automation'} (Copy)`,
            status: 'draft',
            generatedByAI: false,
            needsReview: false,
            sendMode: 'manual_send',
            stats: emptyAutomationStats(),
        },
    });
}

export async function deleteAutomation(input: {
    supabase: SupabaseClient;
    projectId: string;
    automationId: string;
}) {
    const { error } = await input.supabase
        .from('email_automations')
        .delete()
        .eq('id', input.automationId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`);
    if (error) throw error;
    return { deleted: true };
}

export async function loadAutomation(supabase: SupabaseClient, projectId: string, automationId: string) {
    const { data, error } = await supabase
        .from('email_automations')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
        .eq('id', automationId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function mapAutomationDraftToRow(
    projectId: string,
    userId: string | null | undefined,
    automation: Record<string, any>,
    now: string,
) {
    const generatedByAI = Boolean(automation.generatedByAI || automation.generated_by_ai);
    const needsReview = automation.needsReview !== undefined ? Boolean(automation.needsReview) : generatedByAI;
    const requestedStatus = readOptionalString(automation.status) || 'draft';
    return stripUndefined({
        project_id: projectId,
        store_id: projectId,
        user_id: userId || null,
        name: readOptionalString(automation.name) || 'Untitled automation',
        description: readOptionalString(automation.description) || null,
        type: readOptionalString(automation.type) || 'welcome',
        category: readOptionalString(automation.category) || 'lifecycle',
        status: needsReview && requestedStatus === 'active' ? 'draft' : requestedStatus,
        trigger_config: readObject(automation.triggerConfig || automation.trigger_config),
        audience_id: readOptionalString(automation.audienceId || automation.audience_id) || null,
        steps: readArray(automation.steps),
        template_id: readOptionalString(automation.templateId || automation.template_id) || null,
        subject: readOptionalString(automation.subject) || '',
        delay_minutes: readNumber(automation.delayMinutes || automation.delay_minutes) || 0,
        stats: readObject(automation.stats, emptyAutomationStats()),
        created_by: userId || automation.created_by || null,
        generated_by_ai: generatedByAI,
        needs_review: needsReview,
        user_modified: Boolean(automation.userModified || automation.user_modified),
        safe_to_edit: automation.safeToEdit !== false && automation.safe_to_edit !== false,
        send_mode: readOptionalString(automation.sendMode || automation.send_mode) || (needsReview ? 'draft_only' : 'manual_send'),
        source_module: readOptionalString(automation.sourceModule || automation.source_module) || 'email-marketing',
        source_component: readOptionalString(automation.sourceComponent || automation.source_component) || null,
        source_event: readOptionalString(automation.sourceEvent || automation.source_event) || null,
        source_entity_type: readOptionalString(automation.sourceEntityType || automation.source_entity_type) || null,
        source_entity_id: readOptionalString(automation.sourceEntityId || automation.source_entity_id) || null,
        correlation_id: readOptionalString(automation.correlationId || automation.correlation_id) || null,
        idempotency_key: readOptionalString(automation.idempotencyKey || automation.idempotency_key) || null,
        readiness: readObject(automation.readiness),
        source_map: readObject(automation.sourceMap || automation.source_map),
        metadata: readObject(automation.metadata),
        created_at: now,
        updated_at: now,
    });
}

function mapAutomationUpdatesToRow(updates: Record<string, any>) {
    const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const aliases: Record<string, string> = {
        triggerConfig: 'trigger_config',
        audienceId: 'audience_id',
        templateId: 'template_id',
        delayMinutes: 'delay_minutes',
        generatedByAI: 'generated_by_ai',
        needsReview: 'needs_review',
        userModified: 'user_modified',
        safeToEdit: 'safe_to_edit',
        sendMode: 'send_mode',
        sourceModule: 'source_module',
        sourceComponent: 'source_component',
        sourceEvent: 'source_event',
        sourceEntityType: 'source_entity_type',
        sourceEntityId: 'source_entity_id',
        correlationId: 'correlation_id',
        idempotencyKey: 'idempotency_key',
        sourceMap: 'source_map',
    };
    const allowed = new Set([
        'name',
        'description',
        'type',
        'category',
        'status',
        'trigger_config',
        'audience_id',
        'steps',
        'template_id',
        'subject',
        'delay_minutes',
        'stats',
        'generated_by_ai',
        'needs_review',
        'user_modified',
        'safe_to_edit',
        'send_mode',
        'source_module',
        'source_component',
        'source_event',
        'source_entity_type',
        'source_entity_id',
        'correlation_id',
        'idempotency_key',
        'readiness',
        'source_map',
        'metadata',
    ]);

    for (const [key, value] of Object.entries(updates)) {
        const column = aliases[key] || key;
        if (!allowed.has(column)) continue;
        mapped[column] = normalizeAutomationUpdateValue(column, value);
    }
    return stripUndefined(mapped);
}

function normalizeAutomationUpdateValue(column: string, value: unknown) {
    if (['trigger_config', 'stats', 'readiness', 'source_map', 'metadata'].includes(column)) return readObject(value);
    if (column === 'steps') return readArray(value);
    if (column === 'delay_minutes') return readNumber(value);
    if (['generated_by_ai', 'needs_review', 'user_modified', 'safe_to_edit'].includes(column)) return typeof value === 'boolean' ? value : undefined;
    if (['description', 'audience_id', 'template_id'].includes(column)) return readOptionalString(value) || null;
    return value;
}

function emptyAutomationStats() {
    return { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 };
}

function readObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fallback;
}

function readArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function readOptionalString(value: unknown) {
    const text = String(value || '').trim();
    return text || undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
