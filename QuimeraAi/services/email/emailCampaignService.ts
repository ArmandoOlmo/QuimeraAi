import { resolveCampaignRecipients, type AudienceResolutionResult } from './emailAudienceResolver.ts';
import { normalizeEmail } from './emailProviderService.ts';
import {
    assertEmailReadiness,
    getEmailSettings,
    getSenderHeader,
    type CanonicalEmailSettings,
} from './emailSettingsService.ts';
import { recordEmailLog } from './emailLogService.ts';
import { processEmailOutbox } from './emailOutboxProcessor.ts';
import { resolveEmailProvider, type EmailProvider, type EmailProviderRegistry } from './emailProviderService.ts';

type SupabaseClient = any;

export interface SendCampaignResult {
    campaignId: string;
    sent: number;
    skipped: number;
    suppressed: number;
    invalid: number;
    queued: number;
    readiness: CanonicalEmailSettings['readiness'];
    audience: AudienceResolutionResult;
}

export async function getCampaigns(input: { supabase: SupabaseClient; projectId: string }) {
    const { data, error } = await input.supabase
        .from('email_campaigns')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createCampaignDraft(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    campaign: Record<string, unknown>;
}) {
    const now = new Date().toISOString();
    const payload = mapCampaignDraftToRow(input.projectId, input.userId, input.campaign, now);
    const { data, error } = await input.supabase
        .from('email_campaigns')
        .insert(payload)
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data || payload;
}

export async function updateCampaign(input: {
    supabase: SupabaseClient;
    projectId: string;
    campaignId: string;
    updates: Record<string, unknown>;
}) {
    const { data, error } = await input.supabase
        .from('email_campaigns')
        .update(mapCampaignUpdatesToRow(input.updates))
        .eq('id', input.campaignId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function duplicateCampaign(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    campaignId: string;
}) {
    const campaign = await loadCampaign(input.supabase, input.projectId, input.campaignId);
    if (!campaign) throw new Error('Campaign not found');
    return createCampaignDraft({
        supabase: input.supabase,
        projectId: input.projectId,
        userId: input.userId,
        campaign: {
            ...campaign,
            name: `${campaign.name || 'Campaign'} (Copy)`,
            status: 'draft',
            generatedByAI: false,
            needsReview: false,
            stats: emptyCampaignStats(),
        },
    });
}

export async function deleteCampaign(input: {
    supabase: SupabaseClient;
    projectId: string;
    campaignId: string;
}) {
    const { error } = await input.supabase
        .from('email_campaigns')
        .delete()
        .eq('id', input.campaignId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`);
    if (error) throw error;
    return { deleted: true };
}

export async function scheduleCampaign(input: {
    supabase: SupabaseClient;
    projectId: string;
    campaignId: string;
    scheduledAt: string;
}) {
    return updateCampaign({
        supabase: input.supabase,
        projectId: input.projectId,
        campaignId: input.campaignId,
        updates: { status: 'scheduled', scheduledAt: input.scheduledAt },
    });
}

export async function enqueueCampaignSend(input: {
    supabase: SupabaseClient;
    projectId: string;
    userId?: string | null;
    campaignId: string;
}) {
    const campaign = await loadCampaign(input.supabase, input.projectId, input.campaignId);
    if (!campaign) throw new Error('Campaign not found');
    validateCampaignCanSend(campaign);
    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    assertEmailReadiness(settings, 'marketing');
    const audience = await resolveCampaignRecipients({
        supabase: input.supabase,
        projectId: input.projectId,
        campaign,
        requireMarketingConsent: settings.compliance.requireMarketingConsent !== false,
    });
    const html = resolveCampaignHtml(campaign);
    const subject = String(campaign.subject || '').trim();
    if (!subject) throw new Error('Campaign subject is required');
    const outboxRows = [];

    for (const recipient of audience.recipients) {
        const idempotencyKey = campaignRecipientIdempotencyKey(campaign.id, recipient.email);
        const log = await recordEmailLog({
            supabase: input.supabase,
            projectId: input.projectId,
            tenantId: campaign.tenant_id || settings.tenantId || null,
            userId: input.userId || campaign.user_id || campaign.created_by || null,
            type: 'campaign',
            emailKind: 'marketing',
            campaignId: campaign.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject,
            status: 'queued',
            provider: settings.provider === 'unset' ? 'resend' : settings.provider,
            idempotencyKey,
            sourceModule: campaign.source_module || recipient.sourceModule || 'email-marketing',
            sourceEvent: campaign.source_event || 'campaign_send',
            sourceEntityType: campaign.source_entity_type || recipient.sourceEntityType,
            sourceEntityId: campaign.source_entity_id || recipient.sourceEntityId,
            correlationId: campaign.correlation_id || idempotencyKey,
            metadata: {
                campaignId: campaign.id,
                recipientSource: recipient.sourceModule,
                recipientMetadata: recipient.metadata || {},
            },
        });

        outboxRows.push({
            project_id: input.projectId,
            tenant_id: campaign.tenant_id || settings.tenantId || null,
            user_id: input.userId || campaign.user_id || campaign.created_by || null,
            campaign_id: campaign.id,
            email_log_id: log.id,
            email_kind: 'marketing',
            recipient_email: recipient.email,
            recipient_name: recipient.name || null,
            subject,
            html_content: appendMarketingFooter(html, input.projectId, recipient.email, settings, log.id),
            text_content: '',
            status: 'queued',
            scheduled_at: campaign.scheduled_at || new Date().toISOString(),
            provider: settings.provider === 'unset' ? 'resend' : settings.provider,
            source_module: campaign.source_module || recipient.sourceModule || 'email-marketing',
            source_event: campaign.source_event || 'campaign_send',
            source_entity_type: campaign.source_entity_type || recipient.sourceEntityType || null,
            source_entity_id: campaign.source_entity_id || recipient.sourceEntityId || null,
            correlation_id: campaign.correlation_id || idempotencyKey,
            idempotency_key: idempotencyKey,
            metadata: { campaignId: campaign.id, recipientMetadata: recipient.metadata || {} },
        });
    }

    if (outboxRows.length > 0) {
        const { error } = await input.supabase
            .from('email_outbox')
            .upsert(outboxRows, { onConflict: 'project_id,idempotency_key', ignoreDuplicates: true });
        if (error) throw error;
    }

    await updateCampaignStats(input.supabase, campaign.id, {
        totalRecipients: audience.counts.final,
        queued: outboxRows.length,
        suppressed: audience.counts.suppressed,
        invalid: audience.counts.invalid,
        status: outboxRows.length > 0 ? 'sending' : 'failed',
    });

    return { campaign, settings, audience, queued: outboxRows.length };
}

export async function sendCampaign(input: {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
    projectId: string;
    userId?: string | null;
    campaignId: string;
    batchSize?: number;
}): Promise<SendCampaignResult> {
    const queued = await enqueueCampaignSend(input);
    const settings = queued.settings;
    const batchSize = Math.max(1, Math.min(input.batchSize || 50, 100));
    const processed = await processEmailOutbox({
        supabase: input.supabase,
        provider: input.provider,
        providers: input.providers,
        projectId: input.projectId,
        campaignId: input.campaignId,
        limit: batchSize,
    });

    return {
        campaignId: input.campaignId,
        sent: processed.sent,
        skipped: processed.skipped,
        suppressed: queued.audience.counts.suppressed,
        invalid: queued.audience.counts.invalid,
        queued: queued.queued,
        readiness: settings.readiness,
        audience: queued.audience,
    };
}

export async function sendTestEmail(input: {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
    projectId: string;
    userId?: string | null;
    campaignId?: string | null;
    recipientEmail: string;
    subject?: string;
    html?: string;
}) {
    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    assertEmailReadiness(settings, 'test');
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

    const campaign = input.campaignId && input.campaignId !== 'test'
        ? await loadCampaign(input.supabase, input.projectId, input.campaignId)
        : null;
    const subject = String(input.subject || campaign?.subject || 'Email de prueba');
    const html = input.html || (campaign ? resolveCampaignHtml(campaign) : `<p>${escapeHtml(subject)}</p>`);
    const recipientEmail = normalizeEmail(input.recipientEmail);
    if (!recipientEmail) throw new Error('testEmail is required');

    const providerResult = await provider.send({
        from: getSenderHeader(settings),
        replyTo: settings.replyTo || undefined,
        to: [recipientEmail],
        subject,
        html,
    });

    await recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: settings.tenantId || campaign?.tenant_id || null,
        userId: input.userId || null,
        type: 'test',
        emailKind: 'transactional',
        campaignId: campaign?.id || null,
        recipientEmail,
        subject,
        status: 'sent',
        provider: settings.provider === 'unset' ? 'resend' : settings.provider,
        providerMessageId: providerResult.providerMessageId || null,
        idempotencyKey: `test:${input.projectId}:${Date.now()}:${recipientEmail}`,
        sourceModule: 'email-marketing',
        sourceEvent: 'test_email_sent',
        metadata: { test: true },
        sentAt: new Date().toISOString(),
    });

    await input.supabase
        .from('email_settings')
        .update({ test_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`);

    return { sent: 1, providerMessageId: providerResult.providerMessageId };
}

export async function loadCampaign(supabase: SupabaseClient, projectId: string, campaignId: string) {
    const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
        .eq('id', campaignId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function validateCampaignCanSend(campaign: Record<string, any>) {
    if (campaign.generated_by_ai && campaign.needs_review) {
        throw new Error('AI-generated campaign needs review before sending');
    }
    if (campaign.needs_review) {
        throw new Error('Campaign needs review before sending');
    }
    if (['sent', 'cancelled'].includes(campaign.status)) {
        throw new Error(`Campaign cannot be sent while status is ${campaign.status}`);
    }
}

function resolveCampaignHtml(campaign: Record<string, any>) {
    const html = String(campaign.html_content || '');
    if (html.trim()) return html;
    const document = campaign.email_document || {};
    const subject = String(campaign.subject || document.subject || 'Quimera AI');
    return `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escapeHtml(subject)}</h1></div>`;
}

function appendMarketingFooter(
    html: string,
    projectId: string,
    recipientEmail: string,
    settings: CanonicalEmailSettings,
    emailLogId?: string | null,
) {
    if (settings.compliance.unsubscribeFooterEnabled === false) return html;
    const unsubscribeUrl = `https://quimera.ai/email/unsubscribe?projectId=${encodeURIComponent(projectId)}&email=${encodeURIComponent(recipientEmail)}${emailLogId ? `&emailLogId=${encodeURIComponent(emailLogId)}` : ''}`;
    const footerText = settings.footerText || 'Recibes este email porque aceptaste comunicaciones de este proyecto.';
    return `${html}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font:12px Arial,sans-serif;line-height:1.5">
  <p>${escapeHtml(footerText)}</p>
  <p><a href="${unsubscribeUrl}" style="color:#4f46e5">Cancelar suscripcion</a></p>
</div>`;
}

function campaignRecipientIdempotencyKey(campaignId: string, email: string) {
    return `campaign:${campaignId}:recipient:${normalizeEmail(email)}`;
}

async function updateCampaignStats(supabase: SupabaseClient, campaignId: string, patch: Record<string, unknown>) {
    const { data: campaign } = await supabase
        .from('email_campaigns')
        .select('stats')
        .eq('id', campaignId)
        .maybeSingle();
    const current = campaign?.stats || {};
    const nextStats = {
        ...emptyCampaignStats(),
        ...current,
        ...(patch.totalRecipients !== undefined ? { totalRecipients: patch.totalRecipients } : {}),
        queued: patch.queued !== undefined
            ? Math.max(Number(current.queued || 0), Number(patch.queued || 0))
            : Number(current.queued || 0),
        sent: Number(current.sent || 0) + Number(patch.sent || 0),
        suppressed: patch.suppressed !== undefined
            ? Math.max(Number(current.suppressed || 0), Number(patch.suppressed || 0))
            : Number(current.suppressed || 0),
        invalid: patch.invalid !== undefined
            ? Math.max(Number(current.invalid || 0), Number(patch.invalid || 0))
            : Number(current.invalid || 0),
    };
    const updates: Record<string, unknown> = {
        stats: nextStats,
        updated_at: new Date().toISOString(),
    };
    if (patch.status) updates.status = patch.status;
    if (patch.status === 'sent') updates.sent_at = new Date().toISOString();

    const { error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', campaignId);
    if (error) throw error;
}

function mapCampaignDraftToRow(projectId: string, userId: string | null | undefined, campaign: Record<string, any>, now: string) {
    return {
        project_id: projectId,
        store_id: projectId,
        user_id: userId || null,
        name: campaign.name || 'Untitled campaign',
        subject: campaign.subject || campaign.subjectDraft || '',
        preview_text: campaign.previewText || campaign.preview_text || campaign.previewTextDraft || '',
        type: campaign.type || 'newsletter',
        html_content: campaign.htmlContent || campaign.html_content || '',
        email_document: campaign.emailDocument || campaign.email_document || null,
        audience_type: campaign.audienceType || campaign.audience_type || 'all',
        audience_segment_id: campaign.audienceSegmentId || campaign.audience_segment_id || null,
        custom_recipient_emails: campaign.customRecipientEmails || campaign.custom_recipient_emails || [],
        status: 'draft',
        stats: campaign.stats || emptyCampaignStats(),
        tags: campaign.tags || [],
        created_by: userId || campaign.created_by || null,
        generated_by_ai: Boolean(campaign.generatedByAI || campaign.generated_by_ai),
        needs_review: campaign.needsReview !== undefined ? Boolean(campaign.needsReview) : Boolean(campaign.generatedByAI || campaign.generated_by_ai),
        user_modified: Boolean(campaign.userModified || campaign.user_modified),
        safe_to_edit: campaign.safeToEdit !== false && campaign.safe_to_edit !== false,
        source_module: campaign.sourceModule || campaign.source_module || 'email-marketing',
        source_component: campaign.sourceComponent || campaign.source_component || null,
        source_event: campaign.sourceEvent || campaign.source_event || null,
        source_entity_type: campaign.sourceEntityType || campaign.source_entity_type || null,
        source_entity_id: campaign.sourceEntityId || campaign.source_entity_id || null,
        correlation_id: campaign.correlationId || campaign.correlation_id || null,
        idempotency_key: campaign.idempotencyKey || campaign.idempotency_key || null,
        readiness: campaign.readiness || {},
        metadata: campaign.metadata || {},
        created_at: now,
        updated_at: now,
    };
}

function mapCampaignUpdatesToRow(updates: Record<string, any>) {
    const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const aliases: Record<string, string> = {
        previewText: 'preview_text',
        htmlContent: 'html_content',
        emailDocument: 'email_document',
        audienceType: 'audience_type',
        audienceSegmentId: 'audience_segment_id',
        customRecipientEmails: 'custom_recipient_emails',
        scheduledAt: 'scheduled_at',
        generatedByAI: 'generated_by_ai',
        needsReview: 'needs_review',
        userModified: 'user_modified',
        safeToEdit: 'safe_to_edit',
        sourceModule: 'source_module',
        sourceComponent: 'source_component',
        sourceEvent: 'source_event',
        sourceEntityType: 'source_entity_type',
        sourceEntityId: 'source_entity_id',
        correlationId: 'correlation_id',
        idempotencyKey: 'idempotency_key',
    };
    for (const [key, value] of Object.entries(updates)) {
        mapped[aliases[key] || key] = value;
    }
    return mapped;
}

function emptyCampaignStats() {
    return {
        totalRecipients: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        totalOpens: 0,
        uniqueOpens: 0,
        clicked: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        bounced: 0,
        failed: 0,
        complained: 0,
        unsubscribed: 0,
        suppressed: 0,
        invalid: 0,
    };
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
