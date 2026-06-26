import { addSuppression } from './emailSuppressionService.ts';

type SupabaseClient = any;

export async function ingestEmailEvent(input: {
    supabase: SupabaseClient;
    projectId?: string | null;
    provider?: string;
    providerEventId?: string | null;
    providerMessageId?: string | null;
    emailLogId?: string | null;
    eventType: string;
    recipientEmail?: string | null;
    payload?: Record<string, unknown>;
    receivedAt?: string;
}) {
    const provider = input.provider || 'resend';
    const eventType = normalizeEventType(input.eventType);
    const idempotencyKey = input.providerEventId
        ? `${provider}:event:${input.providerEventId}`
        : input.providerMessageId
            ? `${provider}:${input.providerMessageId}:${eventType}`
            : undefined;

    const log = input.emailLogId
        ? await findLogById(input.supabase, input.emailLogId)
        : input.providerMessageId
            ? await findLogByProviderMessage(input.supabase, input.providerMessageId)
            : null;
    const projectId = input.projectId || log?.project_id || null;

    if (idempotencyKey && projectId) {
        const { data: existing, error: existingError } = await input.supabase
            .from('email_events')
            .select('id')
            .eq('project_id', projectId)
            .eq('idempotency_key', idempotencyKey)
            .limit(1)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing?.id) return { duplicate: true, eventId: existing.id };
    }

    const eventPayload = {
        project_id: projectId,
        tenant_id: log?.tenant_id || null,
        email_log_id: log?.id || null,
        campaign_id: isUuid(log?.campaign_id) ? log?.campaign_id : null,
        automation_id: isUuid(log?.automation_id) ? log?.automation_id : null,
        provider,
        provider_event_id: input.providerEventId || null,
        provider_message_id: input.providerMessageId || null,
        event_type: eventType,
        recipient_email: input.recipientEmail || log?.recipient_email || null,
        idempotency_key: idempotencyKey || null,
        payload: input.payload || {},
        received_at: input.receivedAt || new Date().toISOString(),
    };

    const { data: event, error } = await input.supabase
        .from('email_events')
        .insert(eventPayload)
        .select('*')
        .maybeSingle();
    if (error) throw error;

    const eventAt = input.receivedAt || new Date().toISOString();

    if (log?.id) {
        await updateLogFromProviderEvent({
            supabase: input.supabase,
            log,
            eventType,
            eventAt,
            providerMessageId: input.providerMessageId,
            payload: input.payload || {},
        });
        await updateAttributionStats({
            supabase: input.supabase,
            log,
            eventType,
        });
    }

    if (projectId && shouldSuppress(eventType) && (input.recipientEmail || log?.recipient_email)) {
        await addSuppression({
            supabase: input.supabase,
            projectId,
            email: input.recipientEmail || log?.recipient_email,
            reason: eventType === 'complained' ? 'complaint' : eventType === 'unsubscribed' ? 'unsubscribe' : 'hard_bounce',
            source: `${provider}-webhook`,
            campaignId: log?.campaign_id || null,
            emailLogId: log?.id || null,
            metadata: input.payload || {},
        });
    }

    return { duplicate: false, event: event || eventPayload };
}

function isUuid(value: unknown) {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function findLogByProviderMessage(supabase: SupabaseClient, providerMessageId: string) {
    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('provider_message_id', providerMessageId)
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

async function findLogById(supabase: SupabaseClient, emailLogId: string) {
    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('id', emailLogId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function normalizeEventType(value: string) {
    const type = String(value || '').toLowerCase().replace(/^email\./, '');
    if (['delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed'].includes(type)) {
        return type;
    }
    if (type === 'delivery_delayed') return 'delivery_delayed';
    return type || 'unknown';
}

function mapEventTypeToLogStatus(eventType: string) {
    if (eventType === 'opened') return 'opened';
    if (eventType === 'clicked') return 'clicked';
    if (eventType === 'bounced') return 'bounced';
    if (eventType === 'complained') return 'complained';
    if (eventType === 'failed') return 'failed';
    if (eventType === 'delivered') return 'delivered';
    if (eventType === 'unsubscribed') return 'unsubscribed';
    return eventType;
}

function shouldSuppress(eventType: string) {
    return ['bounced', 'complained', 'unsubscribed'].includes(eventType);
}

async function updateLogFromProviderEvent(input: {
    supabase: SupabaseClient;
    log: Record<string, any>;
    eventType: string;
    eventAt: string;
    providerMessageId?: string | null;
    payload: Record<string, unknown>;
}) {
    const updates: Record<string, unknown> = {
        status: mapEventTypeToLogStatus(input.eventType),
        updated_at: new Date().toISOString(),
    };
    if (input.providerMessageId) updates.provider_message_id = input.providerMessageId;

    if (input.eventType === 'delivered') updates.delivered_at = input.eventAt;
    if (input.eventType === 'opened') {
        updates.opened_at = mergeEventHistory(input.log.opened_at, input.eventAt);
        updates.open_count = Number(input.log.open_count || 0) + 1;
    }
    if (input.eventType === 'clicked') {
        updates.clicked_at = input.eventAt;
        updates.click_count = Number(input.log.click_count || 0) + 1;
        updates.clicked_links = mergeClickedLinks(input.log.clicked_links, input.payload, input.eventAt);
    }
    if (input.eventType === 'bounced') {
        updates.bounced_at = input.eventAt;
        updates.bounce_type = readBounceType(input.payload);
        updates.bounce_message = readBounceMessage(input.payload);
    }
    if (input.eventType === 'complained') updates.complained_at = input.eventAt;
    if (input.eventType === 'failed') updates.error_message = readErrorMessage(input.payload) || input.log.error_message || 'Email delivery failed';
    if (input.eventType === 'unsubscribed') {
        updates.unsubscribed_at = input.eventAt;
        updates.skipped_reason = 'recipient_unsubscribed';
    }

    const { error } = await input.supabase
        .from('email_logs')
        .update(updates)
        .eq('id', input.log.id);
    if (error) throw error;
}

async function updateAttributionStats(input: {
    supabase: SupabaseClient;
    log: Record<string, any>;
    eventType: string;
}) {
    if (isUuid(input.log.campaign_id)) {
        await updateCampaignEventStats(input.supabase, input.log.campaign_id, input.eventType, input.log);
    }
    if (isUuid(input.log.automation_id)) {
        await updateAutomationEventStats(input.supabase, input.log.automation_id, input.eventType, input.log);
    }
}

async function updateCampaignEventStats(
    supabase: SupabaseClient,
    campaignId: string,
    eventType: string,
    log: Record<string, any>,
) {
    const patch = campaignStatsPatch(eventType, log);
    if (Object.keys(patch).length === 0) return;

    const { data: campaign, error: readError } = await supabase
        .from('email_campaigns')
        .select('stats')
        .eq('id', campaignId)
        .maybeSingle();
    if (readError) throw readError;

    const stats = incrementStats(campaign?.stats || {}, patch);
    const { error } = await supabase
        .from('email_campaigns')
        .update({ stats, updated_at: new Date().toISOString() })
        .eq('id', campaignId);
    if (error) throw error;
}

async function updateAutomationEventStats(
    supabase: SupabaseClient,
    automationId: string,
    eventType: string,
    log: Record<string, any>,
) {
    const patch = automationStatsPatch(eventType, log);
    if (Object.keys(patch).length === 0) return;

    const { data: automation, error: readError } = await supabase
        .from('email_automations')
        .select('stats')
        .eq('id', automationId)
        .maybeSingle();
    if (readError) throw readError;

    const stats = incrementStats(automation?.stats || {}, patch);
    const { error } = await supabase
        .from('email_automations')
        .update({ stats, updated_at: new Date().toISOString() })
        .eq('id', automationId);
    if (error) throw error;
}

function campaignStatsPatch(eventType: string, log: Record<string, any>): Record<string, number> {
    if (eventType === 'delivered') return { delivered: 1 };
    if (eventType === 'opened') {
        return {
            opened: 1,
            totalOpens: 1,
            uniqueOpens: Number(log.open_count || 0) > 0 ? 0 : 1,
        };
    }
    if (eventType === 'clicked') {
        return {
            clicked: 1,
            totalClicks: 1,
            uniqueClicks: Number(log.click_count || 0) > 0 ? 0 : 1,
        };
    }
    if (eventType === 'bounced') return { bounced: 1 };
    if (eventType === 'complained') return { complained: 1 };
    if (eventType === 'unsubscribed') return { unsubscribed: 1 };
    if (eventType === 'failed') return { failed: 1 };
    return {};
}

function automationStatsPatch(eventType: string, log: Record<string, any>): Record<string, number> {
    if (eventType === 'delivered') return { sent: 1 };
    if (eventType === 'opened') return { opened: Number(log.open_count || 0) > 0 ? 0 : 1 };
    if (eventType === 'clicked') return { clicked: Number(log.click_count || 0) > 0 ? 0 : 1 };
    return {};
}

function incrementStats(current: Record<string, any>, patch: Record<string, number>) {
    const next = { ...current };
    for (const [key, value] of Object.entries(patch)) {
        next[key] = Number(next[key] || 0) + value;
    }
    return next;
}

function mergeEventHistory(value: unknown, eventAt: string) {
    if (Array.isArray(value)) return [...value, eventAt];
    if (value) return [value, eventAt];
    return [eventAt];
}

function mergeClickedLinks(value: unknown, payload: Record<string, unknown>, eventAt: string) {
    const current = Array.isArray(value) ? value : [];
    const url = readOptionalString(payload.url || payload.link || payload.link_url || payload.click_url);
    if (!url) return current;
    return [...current, { url, at: eventAt }];
}

function readBounceType(payload: Record<string, unknown>) {
    return readOptionalString(payload.bounceType || payload.bounce_type || payload.type) || null;
}

function readBounceMessage(payload: Record<string, unknown>) {
    return readOptionalString(payload.bounceMessage || payload.bounce_message || payload.reason || payload.message) || null;
}

function readErrorMessage(payload: Record<string, unknown>) {
    return readOptionalString(payload.errorMessage || payload.error_message || payload.reason || payload.message);
}

function readOptionalString(value: unknown) {
    const text = String(value || '').trim();
    return text || undefined;
}
