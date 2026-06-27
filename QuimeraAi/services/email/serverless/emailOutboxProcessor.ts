import {
    getProviderRetryAfterSeconds,
    isProviderRateLimitError,
    resolveEmailProvider,
    type EmailProvider,
    type EmailProviderRegistry,
} from './emailProviderService.js';
import { findEmailLogByIdempotencyKey, updateEmailLogStatus } from './emailLogService.js';
import { isSuppressed } from './emailSuppressionService.js';
import { assertEmailReadiness, getEmailSettings, getSenderHeader, type CanonicalEmailSettings } from './emailSettingsService.js';

type SupabaseClient = any;

type OutboxRow = Record<string, any>;

export interface ProcessEmailOutboxInput {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
    projectId?: string;
    campaignId?: string;
    idempotencyKey?: string;
    limit?: number;
    rateLimit?: EmailOutboxRateLimit;
    now?: string | Date;
}

export interface ProcessEmailOutboxResult {
    processed: number;
    sent: number;
    skipped: number;
    failed: number;
    deferred: number;
    results: Array<{
        outboxId: string;
        projectId: string;
        campaignId?: string | null;
        emailLogId?: string | null;
        recipientEmail?: string;
        status: 'sent' | 'skipped' | 'failed' | 'deferred';
        reason?: string;
        providerMessageId?: string;
    }>;
}

const SENT_STATUSES = new Set(['sent', 'delivered', 'opened', 'clicked']);

export interface EmailOutboxRateLimit {
    maxPerRun?: number;
    maxPerMinute?: number;
    retryAfterSeconds?: number;
}

export async function processEmailOutbox(input: ProcessEmailOutboxInput): Promise<ProcessEmailOutboxResult> {
    const now = normalizeNow(input.now);
    const limit = Math.max(1, Math.min(Number(input.limit || 50), 100));
    const rows = await loadDueOutboxRows(input.supabase, {
        projectId: input.projectId,
        campaignId: input.campaignId,
        idempotencyKey: input.idempotencyKey,
        limit,
        now,
    });
    const result: ProcessEmailOutboxResult = {
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        deferred: 0,
        results: [],
    };
    const settingsCache = new Map<string, CanonicalEmailSettings>();
    const sentThisRun = new Map<string, number>();

    for (const row of rows) {
        const claimed = await claimOutboxRow(input.supabase, row, now);
        if (!claimed) {
            result.skipped += 1;
            result.results.push(resultRow(row, 'skipped', 'already claimed'));
            continue;
        }

        result.processed += 1;
        const currentAttempts = Number(claimed.attempts || 0);

        try {
            const projectId = String(claimed.project_id || '');
            const settings = await getCachedSettings(input.supabase, settingsCache, projectId);
            assertEmailReadiness(settings, claimed.email_kind === 'transactional' ? 'transactional' : 'marketing');
            const providerName = settings.provider === 'unset' ? 'resend' : settings.provider;
            const provider = resolveEmailProvider({
                providerName,
                provider: input.provider,
                providers: input.providers,
            });
            if (!provider) throw new Error(`Email provider secret is not configured server-side for ${providerName}`);
            if (provider.name !== providerName) {
                throw new Error(`Email provider runtime mismatch: settings require ${providerName}, runtime has ${provider.name}`);
            }

            const rateLimit = resolveRateLimit(settings, input.rateLimit);
            const rateKey = `${projectId}:${providerName}`;
            const alreadySentThisRun = sentThisRun.get(rateKey) || 0;
            if (rateLimit.maxPerRun && alreadySentThisRun >= rateLimit.maxPerRun) {
                await deferOutbox(input.supabase, claimed, now, rateLimit.retryAfterSeconds || 60, 'Provider rate limit deferred by project policy');
                result.deferred += 1;
                result.results.push(resultRow(claimed, 'deferred', 'rate_limited'));
                continue;
            }

            if (rateLimit.maxPerMinute) {
                const recent = await countRecentProviderSends(input.supabase, {
                    projectId,
                    provider: providerName,
                    since: addSeconds(now, -60),
                });
                if (recent + alreadySentThisRun >= rateLimit.maxPerMinute) {
                    await deferOutbox(input.supabase, claimed, now, rateLimit.retryAfterSeconds || 60, 'Provider rate limit deferred by project policy');
                    result.deferred += 1;
                    result.results.push(resultRow(claimed, 'deferred', 'rate_limited'));
                    continue;
                }
            }

            if (claimed.email_kind !== 'transactional' && await isSuppressed({
                supabase: input.supabase,
                projectId,
                email: claimed.recipient_email,
                scope: 'marketing',
            })) {
                await markOutbox(input.supabase, claimed.id, {
                    status: 'skipped',
                    skipped_reason: 'suppressed',
                    failed_at: now,
                    error_message: 'Recipient is suppressed',
                });
                if (claimed.email_log_id) {
                    await updateEmailLogStatus({
                        supabase: input.supabase,
                        id: claimed.email_log_id,
                        status: 'skipped',
                        errorMessage: 'Recipient is suppressed',
                        skippedReason: 'suppressed',
                    });
                }
                result.skipped += 1;
                result.results.push(resultRow(claimed, 'skipped', 'suppressed'));
                continue;
            }

            if (claimed.idempotency_key) {
                const existingLog = await findEmailLogByIdempotencyKey({
                    supabase: input.supabase,
                    projectId,
                    idempotencyKey: claimed.idempotency_key,
                });
                if (SENT_STATUSES.has(String(existingLog?.status || ''))) {
                    await markOutbox(input.supabase, claimed.id, {
                        status: 'sent',
                        sent_at: existingLog.sent_at || now,
                        provider_message_id: existingLog.provider_message_id || null,
                        error_message: null,
                        skipped_reason: null,
                    });
                    result.skipped += 1;
                    result.results.push(resultRow(claimed, 'skipped', 'already sent', existingLog.provider_message_id));
                    continue;
                }
            }

            const providerResult = await provider.send({
                from: getSenderHeader(settings),
                replyTo: settings.replyTo || undefined,
                to: [claimed.recipient_email],
                subject: claimed.subject,
                html: claimed.html_content,
                text: claimed.text_content || undefined,
                headers: buildProviderHeaders(claimed),
                customArgs: buildProviderCustomArgs(claimed),
            });
            const sentAt = new Date().toISOString();
            await markOutbox(input.supabase, claimed.id, {
                status: 'sent',
                sent_at: sentAt,
                provider_message_id: providerResult.providerMessageId || null,
                error_message: null,
                skipped_reason: null,
            });
            if (claimed.email_log_id) {
                await updateEmailLogStatus({
                    supabase: input.supabase,
                    id: claimed.email_log_id,
                    status: 'sent',
                    providerMessageId: providerResult.providerMessageId || null,
                    eventAt: sentAt,
                    errorMessage: null,
                    skippedReason: null,
                });
            }
            if (claimed.campaign_id) {
                await updateCampaignDeliveryStats(input.supabase, claimed.campaign_id, { sent: 1 });
            }
            sentThisRun.set(rateKey, alreadySentThisRun + 1);
            result.sent += 1;
            result.results.push(resultRow(claimed, 'sent', undefined, providerResult.providerMessageId));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isProviderRateLimitError(error)) {
                const retryAfterSeconds = getProviderRetryAfterSeconds(error, 60);
                await deferOutbox(input.supabase, claimed, now, retryAfterSeconds, message);
                if (claimed.email_log_id) {
                    await updateEmailLogStatus({
                        supabase: input.supabase,
                        id: claimed.email_log_id,
                        status: 'queued',
                        errorMessage: message,
                        skippedReason: 'rate_limited',
                    });
                }
                result.deferred += 1;
                result.results.push(resultRow(claimed, 'deferred', message));
                continue;
            }

            const finalAttempt = currentAttempts >= Number(claimed.max_attempts || 3);
            await markOutbox(input.supabase, claimed.id, {
                status: finalAttempt ? 'failed' : 'queued',
                failed_at: new Date().toISOString(),
                error_message: message,
            });
            if (claimed.email_log_id) {
                await updateEmailLogStatus({
                    supabase: input.supabase,
                    id: claimed.email_log_id,
                    status: finalAttempt ? 'failed' : 'queued',
                    errorMessage: message,
                });
            }
            if (claimed.campaign_id && finalAttempt) {
                await updateCampaignDeliveryStats(input.supabase, claimed.campaign_id, { failed: 1 });
            }
            if (finalAttempt) {
                result.failed += 1;
                result.results.push(resultRow(claimed, 'failed', message));
            } else {
                result.deferred += 1;
                result.results.push(resultRow(claimed, 'deferred', message));
            }
        }
    }

    return result;
}

async function loadDueOutboxRows(
    supabase: SupabaseClient,
    input: { projectId?: string; campaignId?: string; idempotencyKey?: string; limit: number; now: string },
) {
    let query = supabase
        .from('email_outbox')
        .select('*')
        .eq('status', 'queued')
        .lte('scheduled_at', input.now)
        .order('created_at', { ascending: true })
        .limit(input.limit);

    if (input.projectId) query = query.eq('project_id', input.projectId);
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId);
    if (input.idempotencyKey) query = query.eq('idempotency_key', input.idempotencyKey);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).filter((row: OutboxRow) => Number(row.attempts || 0) < Number(row.max_attempts || 3));
}

async function claimOutboxRow(supabase: SupabaseClient, row: OutboxRow, now: string) {
    const { data, error } = await supabase
        .from('email_outbox')
        .update({
            status: 'sending',
            locked_at: now,
            attempts: Number(row.attempts || 0) + 1,
            updated_at: now,
        })
        .eq('id', row.id)
        .eq('status', 'queued')
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

async function markOutbox(supabase: SupabaseClient, outboxId: string, updates: Record<string, unknown>) {
    const { error } = await supabase
        .from('email_outbox')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', outboxId);
    if (error) throw error;
}

async function deferOutbox(
    supabase: SupabaseClient,
    row: OutboxRow,
    now: string,
    seconds: number,
    message: string,
) {
    await markOutbox(supabase, row.id, {
        status: 'queued',
        scheduled_at: addSeconds(now, Math.max(1, Math.min(seconds, 60 * 60))),
        error_message: message,
        skipped_reason: 'rate_limited',
    });
}

async function getCachedSettings(
    supabase: SupabaseClient,
    cache: Map<string, CanonicalEmailSettings>,
    projectId: string,
) {
    const cached = cache.get(projectId);
    if (cached) return cached;
    const settings = await getEmailSettings({ supabase, projectId });
    cache.set(projectId, settings);
    return settings;
}

async function countRecentProviderSends(
    supabase: SupabaseClient,
    input: { projectId: string; provider: string; since: string },
) {
    const { count, error } = await supabase
        .from('email_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', input.projectId)
        .eq('provider', input.provider)
        .eq('status', 'sent')
        .gte('sent_at', input.since);
    if (error) throw error;
    return Number(count || 0);
}

async function updateCampaignDeliveryStats(
    supabase: SupabaseClient,
    campaignId: string,
    patch: { sent?: number; failed?: number },
) {
    const { data: campaign, error: readError } = await supabase
        .from('email_campaigns')
        .select('stats')
        .eq('id', campaignId)
        .maybeSingle();
    if (readError) throw readError;

    const current = campaign?.stats || {};
    const stats = {
        ...current,
        sent: Number(current.sent || 0) + Number(patch.sent || 0),
        failed: Number(current.failed || 0) + Number(patch.failed || 0),
    };

    const { count: remainingCount, error: remainingError } = await supabase
        .from('email_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .in('status', ['queued', 'sending']);
    if (remainingError) throw remainingError;

    const updates: Record<string, unknown> = {
        stats,
        updated_at: new Date().toISOString(),
    };
    if (Number(remainingCount || 0) === 0) {
        updates.status = stats.sent > 0 ? 'sent' : 'failed';
        if (stats.sent > 0) updates.sent_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', campaignId);
    if (error) throw error;
}

function resultRow(row: OutboxRow, status: ProcessEmailOutboxResult['results'][number]['status'], reason?: string, providerMessageId?: string | null) {
    return {
        outboxId: row.id,
        projectId: row.project_id,
        campaignId: row.campaign_id,
        emailLogId: row.email_log_id,
        recipientEmail: row.recipient_email,
        status,
        reason,
        providerMessageId: providerMessageId || undefined,
    };
}

function normalizeNow(value?: string | Date) {
    if (!value) return new Date().toISOString();
    return value instanceof Date ? value.toISOString() : value;
}

function buildProviderHeaders(row: OutboxRow) {
    const headers: Record<string, string> = {};
    if (row.email_log_id) headers['X-Quimera-Email-Log-Id'] = String(row.email_log_id);
    if (row.idempotency_key) headers['X-Quimera-Idempotency-Key'] = String(row.idempotency_key);
    if (row.project_id) headers['X-Quimera-Project-Id'] = String(row.project_id);
    return headers;
}

function buildProviderCustomArgs(row: OutboxRow) {
    const values: Record<string, unknown> = {
        projectId: row.project_id,
        emailLogId: row.email_log_id,
        campaignId: row.campaign_id,
        automationId: row.automation_id,
        automationStepId: row.automation_step_id,
        idempotencyKey: row.idempotency_key,
        sourceModule: row.source_module,
        sourceEvent: row.source_event,
    };
    return Object.fromEntries(
        Object.entries(values)
            .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
            .map(([key, value]) => [key, String(value)]),
    );
}

function addSeconds(iso: string, seconds: number) {
    return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

function resolveRateLimit(settings: CanonicalEmailSettings, override?: EmailOutboxRateLimit): EmailOutboxRateLimit {
    const raw = settings.raw || {};
    const metadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata as Record<string, any> : {};
    const provider = settings.provider === 'unset' ? 'resend' : settings.provider;
    const configured = [
        metadata.emailRateLimits,
        metadata.email_rate_limits,
        metadata.rateLimits,
        metadata.rate_limits,
        raw.rate_limits,
    ].find(value => value && typeof value === 'object') as Record<string, any> | undefined;
    const providerPolicy = configured?.[provider] || configured?.default || configured || {};

    return {
        maxPerRun: readPositiveInt(override?.maxPerRun ?? providerPolicy.maxPerRun ?? providerPolicy.max_per_run),
        maxPerMinute: readPositiveInt(override?.maxPerMinute ?? providerPolicy.maxPerMinute ?? providerPolicy.max_per_minute),
        retryAfterSeconds: readPositiveInt(override?.retryAfterSeconds ?? providerPolicy.retryAfterSeconds ?? providerPolicy.retry_after_seconds) || 60,
    };
}

function readPositiveInt(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}
