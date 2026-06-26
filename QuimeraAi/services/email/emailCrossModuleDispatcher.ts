import type { EmailProvider, EmailProviderRegistry } from './emailProviderService.ts';
import { isValidEmail, normalizeEmail } from './emailProviderService.ts';
import { findEmailLogByIdempotencyKey, recordEmailLog } from './emailLogService.ts';
import { getEmailSettings } from './emailSettingsService.ts';
import { processEmailOutbox } from './emailOutboxProcessor.ts';
import { queueTransactionalEmail } from './emailTransactionalService.ts';

type SupabaseClient = any;

export type EmailSourceModule =
    | 'ecommerce'
    | 'crm'
    | 'leads'
    | 'chatcore'
    | 'appointments'
    | 'restaurants'
    | 'realty'
    | 'website-builder'
    | 'ai-studio'
    | string;

export interface CrossModuleTransactionalEmailInput {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
    projectId: string;
    userId?: string | null;
    type: string;
    recipientEmail?: string | null;
    recipientName?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey: string;
    scheduledAt?: string | Date | null;
    sourceModule: EmailSourceModule;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    metadata?: Record<string, unknown>;
    skipReason?: string | null;
}

export interface CrossModuleTransactionalEmailResult {
    status: 'queued' | 'sent' | 'skipped' | 'failed' | 'deferred';
    logId?: string;
    existingLogId?: string;
    providerMessageId?: string;
    recipientEmail?: string;
    reason?: string;
}

const SENT_STATUSES = new Set(['sent', 'delivered', 'opened', 'clicked']);
const TERMINAL_SKIP_STATUSES = new Set(['skipped']);

export async function queueCrossModuleTransactionalEmail(
    input: CrossModuleTransactionalEmailInput,
): Promise<CrossModuleTransactionalEmailResult> {
    const recipientEmail = normalizeEmail(input.recipientEmail || '');
    const existing = await findEmailLogByIdempotencyKey({
        supabase: input.supabase,
        projectId: input.projectId,
        idempotencyKey: input.idempotencyKey,
    });

    if (existing && SENT_STATUSES.has(String(existing.status || ''))) {
        return {
            status: 'skipped',
            existingLogId: existing.id,
            providerMessageId: existing.provider_message_id || undefined,
            recipientEmail,
            reason: `Duplicate email event (${existing.status})`,
        };
    }

    if (existing && TERMINAL_SKIP_STATUSES.has(String(existing.status || '')) && !canResumeReviewedSkippedIntent(existing, input.metadata)) {
        return {
            status: 'skipped',
            existingLogId: existing.id,
            recipientEmail,
            reason: existing.skipped_reason || existing.error_message || 'Duplicate skipped email event',
        };
    }

    if (input.skipReason) {
        return recordSkippedCrossModuleTransactionalEmail({
            ...input,
            recipientEmail,
            reason: input.skipReason,
        });
    }

    const reviewBlocker = getReviewBlocker(input.metadata);
    if (reviewBlocker) {
        return recordSkippedCrossModuleTransactionalEmail({
            ...input,
            recipientEmail,
            reason: reviewBlocker,
        });
    }

    if (!isValidEmail(recipientEmail)) {
        return recordSkippedCrossModuleTransactionalEmail({
            ...input,
            recipientEmail,
            reason: 'Missing or invalid recipient email',
        });
    }

    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    if (!settings.readiness.canSendTransactional) {
        return recordSkippedCrossModuleTransactionalEmail({
            ...input,
            recipientEmail,
            reason: `Readiness blocked: ${settings.readiness.readinessBlockers.join(' ') || 'transactional email is not ready'}`,
        });
    }

    const moduleOptIn = getTransactionalModuleOptIn(settings.transactional, input.sourceModule, input.type, input.sourceEvent);
    if (!moduleOptIn.enabled) {
        return recordSkippedCrossModuleTransactionalEmail({
            ...input,
            recipientEmail,
            reason: moduleOptIn.reason,
        });
    }

    const queued = await queueTransactionalEmail({
        supabase: input.supabase,
        projectId: input.projectId,
        userId: input.userId,
        type: input.type,
        recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        html: input.html,
        text: input.text,
        idempotencyKey: input.idempotencyKey,
        scheduledAt: input.scheduledAt,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        metadata: withCrossModuleMetadata(input),
    });

    return {
        status: 'queued',
        logId: queued.logId,
        existingLogId: queued.existingLogId,
        recipientEmail,
    };
}

export async function dispatchCrossModuleTransactionalEmail(
    input: CrossModuleTransactionalEmailInput,
): Promise<CrossModuleTransactionalEmailResult> {
    const queued = await queueCrossModuleTransactionalEmail(input);
    if (queued.status !== 'queued' || !input.provider) return queued;

    const processed = await processEmailOutbox({
        supabase: input.supabase,
        provider: input.provider,
        providers: input.providers,
        projectId: input.projectId,
        idempotencyKey: input.idempotencyKey,
        limit: 1,
    });
    const first = processed.results[0];
    if (!first) return queued;

    return {
        status: first.status,
        logId: queued.logId || first.emailLogId || undefined,
        existingLogId: queued.existingLogId,
        providerMessageId: first.providerMessageId,
        recipientEmail: first.recipientEmail || queued.recipientEmail,
        reason: first.reason,
    };
}

export async function recordSkippedCrossModuleTransactionalEmail(input: CrossModuleTransactionalEmailInput & {
    reason: string;
}): Promise<CrossModuleTransactionalEmailResult> {
    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    const existing = await findEmailLogByIdempotencyKey({
        supabase: input.supabase,
        projectId: input.projectId,
        idempotencyKey: input.idempotencyKey,
    });

    if (existing) {
        return {
            status: 'skipped',
            existingLogId: existing.id,
            recipientEmail: normalizeEmail(input.recipientEmail || ''),
            reason: existing.skipped_reason || existing.error_message || input.reason,
        };
    }

    const log = await recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: settings.tenantId,
        userId: input.userId || null,
        type: 'transactional',
        emailKind: 'transactional',
        templateId: input.type,
        recipientEmail: normalizeEmail(input.recipientEmail || ''),
        recipientName: input.recipientName || null,
        subject: input.subject,
        status: 'skipped',
        provider: settings.provider === 'unset' ? 'resend' : settings.provider,
        idempotencyKey: input.idempotencyKey,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        correlationId: input.idempotencyKey,
        metadata: withCrossModuleMetadata(input),
        errorMessage: input.reason,
        skippedReason: normalizeSkippedReason(input.reason),
    });

    return {
        status: 'skipped',
        logId: log.id,
        recipientEmail: normalizeEmail(input.recipientEmail || ''),
        reason: input.reason,
    };
}

function withCrossModuleMetadata(input: CrossModuleTransactionalEmailInput) {
    return {
        ...(input.metadata || {}),
        transactionalType: input.type,
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        idempotencyKey: input.idempotencyKey,
        scheduledAt: normalizeOptionalIso(input.scheduledAt),
    };
}

function normalizeSkippedReason(reason: string) {
    const value = reason.toLowerCase();
    if (value.includes('review') || value.includes('draft') || value.includes('ai-generated')) return 'needs_review';
    if (value.includes('recipient')) return 'invalid_recipient';
    if (value.includes('duplicate')) return 'duplicate';
    if (value.includes('disabled')) return 'disabled';
    if (value.includes('readiness') || value.includes('configured') || value.includes('sender')) return 'readiness_blocked';
    return 'policy_blocked';
}

function getTransactionalModuleOptIn(
    transactional: Record<string, unknown> | undefined,
    sourceModule: EmailSourceModule,
    type: string,
    sourceEvent?: string,
) {
    const settings = transactional || {};
    const flow = [type, sourceEvent].filter(Boolean).join(' ').toLowerCase();
    const module = String(sourceModule || '').toLowerCase();
    const enabledBy = (...keys: string[]) => keys.some(key => settings[key] === true);
    const disabledBy = (...keys: string[]) => keys.some(key => settings[key] === false);

    if (module === 'ecommerce') {
        if (flow.includes('order_confirmation')) return decision(enabledBy('orderConfirmation'), 'orderConfirmation');
        if (flow.includes('merchant_new_order') || flow.includes('new_order')) return decision(enabledBy('newOrderNotification'), 'newOrderNotification');
        if (flow.includes('payment_failed')) return decision(enabledBy('paymentFailed', 'orderPaymentFailed'), 'paymentFailed');
        if (flow.includes('low_stock')) return decision(enabledBy('lowStockNotification'), 'lowStockNotification');
        if (flow.includes('shipping')) return decision(enabledBy('orderShipped'), 'orderShipped');
        if (flow.includes('delivered')) return decision(enabledBy('orderDelivered'), 'orderDelivered');
        if (flow.includes('cancel')) return decision(enabledBy('orderCancelled'), 'orderCancelled');
        if (flow.includes('refund')) return decision(enabledBy('orderRefunded'), 'orderRefunded');
        if (flow.includes('review')) return decision(enabledBy('reviewRequest'), 'reviewRequest');
        return decision(enabledBy('orderConfirmation', 'newOrderNotification', 'lowStockNotification'), 'ecommerce transactional emails');
    }

    if (module === 'appointments') {
        const general = enabledBy('appointments', 'appointmentEmails');
        if (!general && !enabledBy('appointmentRequestReceived', 'appointmentConfirmation', 'appointmentCancellation', 'appointmentFollowUp', 'appointmentReminder')) {
            return decision(false, 'appointments');
        }
        if (flow.includes('request')) return decision(!disabledBy('appointmentRequestReceived') && enabledBy('appointments', 'appointmentEmails', 'appointmentRequestReceived'), 'appointmentRequestReceived');
        if (flow.includes('confirm')) return decision(!disabledBy('appointmentConfirmation') && enabledBy('appointments', 'appointmentEmails', 'appointmentConfirmation'), 'appointmentConfirmation');
        if (flow.includes('cancel')) return decision(!disabledBy('appointmentCancellation') && enabledBy('appointments', 'appointmentEmails', 'appointmentCancellation'), 'appointmentCancellation');
        if (flow.includes('follow')) return decision(!disabledBy('appointmentFollowUp') && enabledBy('appointments', 'appointmentEmails', 'appointmentFollowUp'), 'appointmentFollowUp');
        if (flow.includes('remind')) return decision(!disabledBy('appointmentReminder') && enabledBy('appointments', 'appointmentEmails', 'appointmentReminder'), 'appointmentReminder');
        return decision(general, 'appointments');
    }

    if (module === 'restaurants') {
        return decision(enabledBy('restaurants', 'restaurantReservations', 'reservationReceived'), 'restaurants');
    }

    if (module === 'crm' || module === 'leads') {
        return decision(enabledBy('crm', 'leadEmails'), 'crm/leadEmails');
    }

    if (module === 'chatcore') {
        return decision(enabledBy('chatcore', 'chatLeadEmails'), 'chatcore/chatLeadEmails');
    }

    if (module === 'realty') {
        if (flow.includes('showing')) return decision(enabledBy('realty', 'realtyShowingRequest'), 'realtyShowingRequest');
        if (flow.includes('open_house')) return decision(enabledBy('realty', 'realtyOpenHouseRegistration'), 'realtyOpenHouseRegistration');
        if (flow.includes('inquiry') || flow.includes('property')) return decision(enabledBy('realty', 'realtyPropertyInquiry'), 'realtyPropertyInquiry');
        return decision(enabledBy('realty'), 'realty');
    }

    if (module === 'website-builder') {
        return decision(enabledBy('websiteBuilder', 'websiteFormEmails'), 'websiteBuilder/websiteFormEmails');
    }

    if (module === 'ai-studio') {
        return decision(enabledBy('aiStudio', 'aiStudioReviewedEmails'), 'aiStudio/aiStudioReviewedEmails');
    }

    return decision(false, `${sourceModule} transactional emails`);
}

function decision(enabled: boolean, settingName: string) {
    return {
        enabled,
        reason: enabled ? '' : `Transactional email disabled: enable ${settingName} in Email Settings`,
    };
}

function getReviewBlocker(metadata?: Record<string, unknown>) {
    const data = metadata || {};
    if (
        data.generatedByAI === true
        || data.generated_by_ai === true
        || data.needsReview === true
        || data.needs_review === true
        || data.safeToEdit === false
        || data.safe_to_edit === false
        || data.sendMode === 'draft_only'
        || data.send_mode === 'draft_only'
    ) {
        return 'AI-generated or draft-only email content must be reviewed before dispatch';
    }
    return '';
}

function canResumeReviewedSkippedIntent(existing: Record<string, unknown>, metadata?: Record<string, unknown>) {
    const data = metadata || {};
    const skippedReason = String(existing.skipped_reason || existing.error_message || '').toLowerCase();
    const wasBlockedForReview = skippedReason.includes('needs_review')
        || skippedReason.includes('review')
        || skippedReason.includes('draft')
        || objectHasReviewDraftFlag(existing.metadata);

    if (!wasBlockedForReview) return false;

    return data.generatedByAI === false
        && data.needsReview === false
        && data.safeToEdit !== false
        && data.sendMode === 'reviewed';
}

function objectHasReviewDraftFlag(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>;
    return data.needsReview === true
        || data.needs_review === true
        || data.sendMode === 'draft_only'
        || data.send_mode === 'draft_only';
}

function normalizeOptionalIso(value?: string | Date | null) {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
