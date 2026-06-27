import type { EmailProvider, EmailProviderRegistry } from './emailProviderService.js';
import { normalizeEmail } from './emailProviderService.js';
import { assertEmailReadiness, getEmailSettings } from './emailSettingsService.js';
import { findEmailLogByIdempotencyKey, recordEmailLog } from './emailLogService.js';
import { processEmailOutbox } from './emailOutboxProcessor.js';

type SupabaseClient = any;

export async function queueTransactionalEmail(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    type: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey: string;
    scheduledAt?: string | Date | null;
    sourceModule: string;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadata?: Record<string, unknown>;
}) {
    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    assertEmailReadiness(settings, 'transactional');
    const existing = await findEmailLogByIdempotencyKey({
        supabase: input.supabase,
        projectId: input.projectId,
        idempotencyKey: input.idempotencyKey,
    });
    if (existing && ['sent', 'delivered', 'opened', 'clicked'].includes(String(existing.status || ''))) {
        return { existingLogId: existing.id, status: existing.status, settings };
    }

    const log = existing ? await markExistingTransactionalLogQueued({
        supabase: input.supabase,
        existing,
        userId: input.userId || null,
        type: input.type,
        recipientEmail: normalizeEmail(input.recipientEmail),
        recipientName: input.recipientName || null,
        subject: input.subject,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        idempotencyKey: input.idempotencyKey,
        metadata: { ...(input.metadata || {}), transactionalType: input.type },
    }) : await recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: settings.tenantId,
        userId: input.userId || null,
        type: 'transactional',
        emailKind: 'transactional',
        templateId: input.type,
        recipientEmail: normalizeEmail(input.recipientEmail),
        recipientName: input.recipientName || null,
        subject: input.subject,
        status: 'queued',
        provider: settings.provider === 'unset' ? 'resend' : settings.provider,
        idempotencyKey: input.idempotencyKey,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        correlationId: input.idempotencyKey,
        metadata: { ...(input.metadata || {}), transactionalType: input.type },
    });

    await ensureTransactionalOutbox({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: settings.tenantId || null,
        userId: input.userId || null,
        emailLogId: log.id,
        provider: settings.provider === 'unset' ? 'resend' : settings.provider,
        recipientEmail: normalizeEmail(input.recipientEmail),
        recipientName: input.recipientName || null,
        subject: input.subject,
        html: input.html,
        text: input.text,
        idempotencyKey: input.idempotencyKey,
        scheduledAt: input.scheduledAt,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        metadata: { ...(input.metadata || {}), transactionalType: input.type },
    });

    return { logId: log.id, status: 'queued', settings };
}

export async function sendTransactionalEmail(input: {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
    projectId: string;
    userId?: string | null;
    type: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey: string;
    scheduledAt?: string | Date | null;
    sourceModule: string;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadata?: Record<string, unknown>;
}) {
    const queued = await queueTransactionalEmail(input);
    if (queued.existingLogId && ['sent', 'delivered', 'opened', 'clicked'].includes(String(queued.status))) {
        return { status: 'skipped', existingLogId: queued.existingLogId };
    }

    const processed = await processEmailOutbox({
        supabase: input.supabase,
        provider: input.provider,
        providers: input.providers,
        projectId: input.projectId,
        idempotencyKey: input.idempotencyKey,
        limit: 1,
    });
    const firstResult = processed.results[0];

    return {
        status: firstResult?.status || 'queued',
        logId: queued.logId,
        providerMessageId: firstResult?.providerMessageId,
        reason: firstResult?.reason,
    };
}

async function ensureTransactionalOutbox(input: {
    supabase: SupabaseClient;
    projectId: string;
    tenantId?: string | null;
    userId?: string | null;
    emailLogId?: string | null;
    provider: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey: string;
    scheduledAt?: string | Date | null;
    sourceModule: string;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadata?: Record<string, unknown>;
}) {
    const { error } = await input.supabase
        .from('email_outbox')
        .upsert({
            project_id: input.projectId,
            tenant_id: input.tenantId || null,
            user_id: input.userId || null,
            email_log_id: input.emailLogId || null,
            email_kind: 'transactional',
            recipient_email: input.recipientEmail,
            recipient_name: input.recipientName || null,
            subject: input.subject,
            html_content: input.html,
            text_content: input.text || '',
            status: 'queued',
            scheduled_at: normalizeScheduledAt(input.scheduledAt),
            provider: input.provider,
            source_module: input.sourceModule,
            source_component: input.sourceComponent || null,
            source_event: input.sourceEvent || null,
            source_entity_type: input.sourceEntityType || null,
            source_entity_id: input.sourceEntityId || null,
            correlation_id: input.idempotencyKey,
            idempotency_key: input.idempotencyKey,
            metadata: input.metadata || {},
            updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,idempotency_key', ignoreDuplicates: true });
    if (error) throw error;
}

async function markExistingTransactionalLogQueued(input: {
    supabase: SupabaseClient;
    existing: Record<string, any>;
    userId?: string | null;
    type: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    sourceModule: string;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
}) {
    const metadata = {
        ...(input.existing.metadata || {}),
        ...(input.metadata || {}),
        idempotencyKey: input.idempotencyKey,
    };

    const { data, error } = await input.supabase
        .from('email_logs')
        .update({
            user_id: input.userId || input.existing.user_id || null,
            type: 'transactional',
            email_kind: 'transactional',
            template_id: input.type,
            recipient_email: input.recipientEmail,
            recipient_name: input.recipientName || null,
            subject: input.subject,
            status: 'queued',
            idempotency_key: input.idempotencyKey,
            source_module: input.sourceModule,
            source_component: input.sourceComponent || null,
            source_event: input.sourceEvent || input.type,
            source_entity_type: input.sourceEntityType || null,
            source_entity_id: input.sourceEntityId || null,
            correlation_id: input.idempotencyKey,
            suppression_checked: true,
            skipped_reason: null,
            error_message: null,
            metadata,
            updated_at: new Date().toISOString(),
        })
        .eq('id', input.existing.id)
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data || { ...input.existing, status: 'queued', metadata };
}

function normalizeScheduledAt(value?: string | Date | null) {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
