import { loadCampaign } from './emailCampaignService.ts';
import { ingestEmailEvent } from './emailEventService.ts';
import { recordEmailLog } from './emailLogService.ts';
import { isValidEmail, normalizeEmail } from './emailProviderService.ts';
import { getEmailSettings } from './emailSettingsService.ts';
import { isSuppressed } from './emailSuppressionService.ts';

type SupabaseClient = any;

interface AutomationExecutionMetadata {
    journeyPath: string[];
    branchDecisions: Array<Record<string, unknown>>;
    accumulatedDelayMinutes: number;
}

export interface AutomationEventInput {
    supabase: SupabaseClient;
    projectId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    idempotencyKey?: string;
    now?: string | Date;
}

export interface AutomationEventResult {
    accepted: number;
    queued: number;
    skipped: number;
    skippedDrafts: number;
    skippedConditions: number;
    event: unknown;
    results: Array<{
        automationId: string;
        stepId?: string;
        status: 'queued' | 'skipped';
        reason?: string;
        logId?: string;
        outboxId?: string;
        scheduledAt?: string;
    }>;
}

export async function ingestAutomationEvent(input: AutomationEventInput): Promise<AutomationEventResult> {
    const now = normalizeNow(input.now);
    const payload = input.payload || {};
    const eventId = resolveEventId(input, payload);
    const event = await ingestEmailEvent({
        supabase: input.supabase,
        projectId: input.projectId,
        provider: 'quimera',
        providerEventId: eventId,
        eventType: input.eventType,
        payload,
        receivedAt: now,
    });

    const { data: automations, error } = await input.supabase
        .from('email_automations')
        .select('*')
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .eq('status', 'active');
    if (error) throw error;

    const activeAutomations = automations || [];
    const matching = activeAutomations.filter((automation: any) => {
        const triggerEvent = automation.source_event || automation.trigger_config?.event || automation.triggerEvent;
        return triggerEvent === input.eventType
            && automation.needs_review !== true
            && automation.send_mode !== 'draft_only';
    });

    const recipient = resolveAutomationRecipient(payload);
    const settings = await getEmailSettings({ supabase: input.supabase, projectId: input.projectId });
    const consent = resolveMarketingConsent(payload);
    const requireMarketingConsent = settings.compliance.requireMarketingConsent !== false;
    const results: AutomationEventResult['results'] = [];
    let queued = 0;
    let skipped = 0;
    let skippedConditions = 0;

    for (const automation of matching) {
        const steps = normalizeSteps(automation.steps);
        let automationQueued = 0;
        if (!isValidEmail(recipient.email)) {
            const skippedRows = await recordSkippedAutomationSteps({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                steps,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                reason: 'Missing or invalid automation recipient email',
                eventType: input.eventType,
                eventId,
                now,
                settings,
                payload,
            });
            skipped += skippedRows.length;
            results.push(...skippedRows);
            continue;
        }

        if (!settings.readiness.canSendMarketing) {
            const reason = `Readiness blocked: ${settings.readiness.readinessBlockers.join(' ') || 'marketing email is not ready'}`;
            const skippedRows = await recordSkippedAutomationSteps({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                steps,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                reason,
                eventType: input.eventType,
                eventId,
                now,
                settings,
                payload,
            });
            skipped += skippedRows.length;
            results.push(...skippedRows);
            continue;
        }

        if (requireMarketingConsent && consent !== true) {
            const skippedRows = await recordSkippedAutomationSteps({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                steps,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                reason: 'Marketing consent is required before automation email dispatch',
                eventType: input.eventType,
                eventId,
                now,
                settings,
                payload,
            });
            skipped += skippedRows.length;
            results.push(...skippedRows);
            continue;
        }

        if (await isSuppressed({
            supabase: input.supabase,
            projectId: input.projectId,
            email: recipient.email,
            scope: 'marketing',
        })) {
            const skippedRows = await recordSkippedAutomationSteps({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                steps,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                reason: 'Recipient is suppressed',
                eventType: input.eventType,
                eventId,
                now,
                settings,
                payload,
            });
            skipped += skippedRows.length;
            results.push(...skippedRows);
            continue;
        }

        const stepIndexById = new Map(steps.map((step, index) => [String(step.id || ''), index]));
        const maxTraversal = Math.max(steps.length * 3, 25);
        let accumulatedDelayMinutes = 0;
        let blockedByCondition = '';
        let stepIndex = 0;
        let traversed = 0;
        const journeyPath: string[] = [];
        const branchDecisions: Array<Record<string, unknown>> = [];

        while (stepIndex >= 0 && stepIndex < steps.length && traversed < maxTraversal) {
            const step = steps[stepIndex];
            const linearNextIndex = stepIndex + 1;
            traversed += 1;
            journeyPath.push(String(step.id || `step-${stepIndex}`));

            if (step.type === 'delay') {
                accumulatedDelayMinutes += readDelayMinutes(step, addMinutes(now, accumulatedDelayMinutes));
                stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
                continue;
            }

            if (step.type === 'condition') {
                const condition = evaluateAutomationCondition(step, payload, input.eventType);
                const branchTargetId = readConditionBranchTarget(step, condition.passed);
                branchDecisions.push({
                    stepId: step.id,
                    passed: condition.passed,
                    targetStepId: branchTargetId || null,
                    reason: condition.reason || null,
                });

                if (branchTargetId) {
                    blockedByCondition = '';
                    stepIndex = resolveStepIndexById(branchTargetId, linearNextIndex, stepIndexById);
                    continue;
                }

                blockedByCondition = condition.passed ? '' : condition.reason;
                stepIndex = linearNextIndex;
                continue;
            }

            if (step.type === 'action') {
                if (!blockedByCondition) {
                    await executeAutomationAction({
                        supabase: input.supabase,
                        projectId: input.projectId,
                        automation,
                        step,
                        recipientEmail: recipient.email,
                        recipientName: recipient.name,
                        payload,
                    });
                }
                stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
                continue;
            }

            if (step.type !== 'email') {
                stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
                continue;
            }

            const scheduledAt = addMinutes(now, accumulatedDelayMinutes);
            const idempotencyKey = createAutomationStepIdempotencyKey({
                automationId: automation.id,
                stepId: step.id,
                recipientEmail: recipient.email,
                eventId,
            });

            if (blockedByCondition) {
                const log = await recordSkippedAutomationStep({
                    supabase: input.supabase,
                    projectId: input.projectId,
                    automation,
                    step,
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    reason: blockedByCondition,
                    idempotencyKey,
                    eventType: input.eventType,
                    eventId,
                    scheduledAt,
                    settings,
                    payload,
                    execution: { journeyPath, branchDecisions, accumulatedDelayMinutes },
                });
                skipped += 1;
                skippedConditions += 1;
                results.push({
                    automationId: automation.id,
                    stepId: step.id,
                    status: 'skipped',
                    reason: blockedByCondition,
                    logId: log.id,
                });
                stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
                continue;
            }

            const content = await resolveAutomationStepContent({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                step,
                payload,
            });

            if (content.skipReason) {
                const log = await recordSkippedAutomationStep({
                    supabase: input.supabase,
                    projectId: input.projectId,
                    automation,
                    step,
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    reason: content.skipReason,
                    idempotencyKey,
                    eventType: input.eventType,
                    eventId,
                    scheduledAt,
                    settings,
                    payload,
                    execution: { journeyPath, branchDecisions, accumulatedDelayMinutes },
                });
                skipped += 1;
                results.push({
                    automationId: automation.id,
                    stepId: step.id,
                    status: 'skipped',
                    reason: content.skipReason,
                    logId: log.id,
                });
                stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
                continue;
            }

            const subject = content.subject || String(step.label || automation.subject || 'Automation email');
            const html = content.html || `<p>${escapeHtml(subject)}</p>`;
            const log = await recordEmailLog({
                supabase: input.supabase,
                projectId: input.projectId,
                tenantId: automation.tenant_id || settings.tenantId || null,
                userId: automation.user_id || null,
                type: 'automation',
                emailKind: 'marketing',
                automationId: automation.id,
                automationStepId: step.id,
                campaignId: content.campaignId || null,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                subject,
                status: 'queued',
                provider: settings.provider === 'unset' ? 'resend' : settings.provider,
                idempotencyKey,
                sourceModule: automation.source_module || 'email-marketing',
                sourceComponent: automation.source_component || 'email-automation-runtime',
                sourceEvent: automation.source_event || input.eventType,
                sourceEntityType: automation.source_entity_type || 'email_automation',
                sourceEntityId: automation.source_entity_id || automation.id,
                correlationId: eventId,
                metadata: {
                    automationId: automation.id,
                    automationStepId: step.id,
                    eventType: input.eventType,
                    eventId,
                    scheduledAt,
                    payload: safePayload(payload),
                    journeyPath: [...journeyPath],
                    branchDecisions: [...branchDecisions],
                    accumulatedDelayMinutes,
                },
            });

            const outbox = await queueAutomationOutbox({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                step,
                logId: log.id,
                campaignId: content.campaignId || null,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                subject,
                html: appendAutomationFooter(html, input.projectId, recipient.email, settings, log.id),
                text: content.text,
                scheduledAt,
                provider: settings.provider === 'unset' ? 'resend' : settings.provider,
                idempotencyKey,
                eventType: input.eventType,
                eventId,
                payload,
                execution: { journeyPath, branchDecisions, accumulatedDelayMinutes },
            });

            queued += 1;
            automationQueued += 1;
            results.push({
                automationId: automation.id,
                stepId: step.id,
                status: 'queued',
                logId: log.id,
                outboxId: outbox?.id,
                scheduledAt,
            });
            stepIndex = resolveNextStepIndex(step, linearNextIndex, stepIndexById);
        }

        if (stepIndex >= 0 && stepIndex < steps.length && traversed >= maxTraversal) {
            const step = steps[stepIndex] || { id: 'automation', type: 'email' };
            const reason = 'Automation workflow exceeded safe traversal limit';
            const idempotencyKey = createAutomationStepIdempotencyKey({
                automationId: automation.id,
                stepId: step.id || 'workflow-limit',
                recipientEmail: recipient.email,
                eventId,
            });
            const log = await recordSkippedAutomationStep({
                supabase: input.supabase,
                projectId: input.projectId,
                automation,
                step,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                reason,
                idempotencyKey,
                eventType: input.eventType,
                eventId,
                scheduledAt: addMinutes(now, accumulatedDelayMinutes),
                settings,
                payload,
                execution: { journeyPath, branchDecisions, accumulatedDelayMinutes },
            });
            skipped += 1;
            results.push({
                automationId: automation.id,
                stepId: step.id,
                status: 'skipped',
                reason,
                logId: log.id,
            });
        }

        await updateAutomationStats(input.supabase, automation.id, { triggered: 1, queued: automationQueued });
    }

    return {
        accepted: matching.length,
        queued,
        skipped,
        skippedDrafts: activeAutomations.length - matching.length,
        skippedConditions,
        event,
        results,
    };
}

async function recordSkippedAutomationSteps(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    steps: Array<Record<string, any>>;
    recipientEmail?: string;
    recipientName?: string;
    reason: string;
    eventType: string;
    eventId: string;
    now: string;
    settings: Awaited<ReturnType<typeof getEmailSettings>>;
    payload: Record<string, unknown>;
}) {
    const emailSteps = input.steps.filter(step => step.type === 'email');
    const targets = emailSteps.length > 0 ? emailSteps : [{ id: 'automation', type: 'email' }];
    const rows = [];

    for (const step of targets) {
        const idempotencyKey = createAutomationStepIdempotencyKey({
            automationId: input.automation.id,
            stepId: step.id,
            recipientEmail: input.recipientEmail || 'recipient',
            eventId: input.eventId,
        });
        const log = await recordSkippedAutomationStep({
            supabase: input.supabase,
            projectId: input.projectId,
            automation: input.automation,
            step,
            recipientEmail: input.recipientEmail || '',
            recipientName: input.recipientName,
            reason: input.reason,
            idempotencyKey,
            eventType: input.eventType,
            eventId: input.eventId,
            scheduledAt: input.now,
            settings: input.settings,
            payload: input.payload,
        });
        rows.push({
            automationId: input.automation.id,
            stepId: step.id,
            status: 'skipped' as const,
            reason: input.reason,
            logId: log.id,
        });
    }

    return rows;
}

async function recordSkippedAutomationStep(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    step: Record<string, any>;
    recipientEmail: string;
    recipientName?: string;
    reason: string;
    idempotencyKey: string;
    eventType: string;
    eventId: string;
    scheduledAt: string;
    settings: Awaited<ReturnType<typeof getEmailSettings>>;
    payload: Record<string, unknown>;
    execution?: AutomationExecutionMetadata;
}) {
    return recordEmailLog({
        supabase: input.supabase,
        projectId: input.projectId,
        tenantId: input.automation.tenant_id || input.settings.tenantId || null,
        userId: input.automation.user_id || null,
        type: 'automation',
        emailKind: 'marketing',
        automationId: input.automation.id,
        automationStepId: input.step.id,
        recipientEmail: normalizeEmail(input.recipientEmail || ''),
        recipientName: input.recipientName || null,
        subject: String(input.step.emailConfig?.subject || input.step.email_config?.subject || input.automation.subject || 'Automation email'),
        status: 'skipped',
        provider: input.settings.provider === 'unset' ? 'resend' : input.settings.provider,
        idempotencyKey: input.idempotencyKey,
        sourceModule: input.automation.source_module || 'email-marketing',
        sourceComponent: input.automation.source_component || 'email-automation-runtime',
        sourceEvent: input.automation.source_event || input.eventType,
        sourceEntityType: input.automation.source_entity_type || 'email_automation',
        sourceEntityId: input.automation.source_entity_id || input.automation.id,
        correlationId: input.eventId,
        metadata: {
            automationId: input.automation.id,
            automationStepId: input.step.id,
            eventType: input.eventType,
            eventId: input.eventId,
            scheduledAt: input.scheduledAt,
            payload: safePayload(input.payload),
            ...(input.execution ? {
                journeyPath: [...input.execution.journeyPath],
                branchDecisions: [...input.execution.branchDecisions],
                accumulatedDelayMinutes: input.execution.accumulatedDelayMinutes,
            } : {}),
        },
        errorMessage: input.reason,
        skippedReason: normalizeSkipReason(input.reason),
    });
}

async function resolveAutomationStepContent(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    step: Record<string, any>;
    payload: Record<string, unknown>;
}) {
    const emailConfig = input.step.emailConfig || input.step.email_config || {};
    const campaignId = String(emailConfig.campaignId || emailConfig.emailDocumentId || emailConfig.campaign_id || '').trim();
    const isDraft = input.step.needsReview === true
        || input.step.needs_review === true
        || emailConfig.needsReview === true
        || emailConfig.needs_review === true
        || (emailConfig.generatedByAI === true && emailConfig.needsReview !== false)
        || (emailConfig.generated_by_ai === true && emailConfig.needs_review !== false)
        || emailConfig.sendMode === 'draft_only'
        || emailConfig.send_mode === 'draft_only';

    if (isDraft) {
        return { skipReason: 'Automation email step needs review before dispatch', campaignId };
    }

    if (campaignId) {
        const campaign = await loadCampaign(input.supabase, input.projectId, campaignId);
        if (!campaign) return { skipReason: 'Linked automation campaign was not found', campaignId };
        if (campaign.needs_review === true || campaign.send_mode === 'draft_only') {
            return { skipReason: 'Linked automation campaign needs review before dispatch', campaignId };
        }

        const subject = interpolate(String(campaign.subject || emailConfig.subject || input.automation.subject || 'Automation email'), input.payload);
        const html = interpolate(resolveCampaignHtml(campaign, subject), input.payload);
        return {
            subject,
            html,
            text: interpolate(String(emailConfig.text || campaign.text_content || ''), input.payload),
            campaignId,
        };
    }

    const subject = interpolate(String(emailConfig.subject || input.automation.subject || input.step.label || 'Automation email'), input.payload);
    const html = interpolate(String(emailConfig.html || emailConfig.htmlContent || emailConfig.body || `<p>${escapeHtml(subject)}</p>`), input.payload);
    return {
        subject,
        html,
        text: interpolate(String(emailConfig.text || ''), input.payload),
        campaignId: null,
    };
}

async function queueAutomationOutbox(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    step: Record<string, any>;
    logId?: string | null;
    campaignId?: string | null;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    html: string;
    text?: string;
    scheduledAt: string;
    provider: string;
    idempotencyKey: string;
    eventType: string;
    eventId: string;
    payload: Record<string, unknown>;
    execution?: AutomationExecutionMetadata;
}) {
    const row = {
        project_id: input.projectId,
        store_id: input.projectId,
        tenant_id: input.automation.tenant_id || null,
        user_id: input.automation.user_id || null,
        campaign_id: input.campaignId || null,
        automation_id: input.automation.id,
        automation_step_id: input.step.id,
        email_log_id: input.logId || null,
        email_kind: 'marketing',
        recipient_email: input.recipientEmail,
        recipient_name: input.recipientName || null,
        subject: input.subject,
        html_content: input.html,
        text_content: input.text || '',
        status: 'queued',
        scheduled_at: input.scheduledAt,
        provider: input.provider,
        source_module: input.automation.source_module || 'email-marketing',
        source_component: input.automation.source_component || 'email-automation-runtime',
        source_event: input.automation.source_event || input.eventType,
        source_entity_type: input.automation.source_entity_type || 'email_automation',
        source_entity_id: input.automation.source_entity_id || input.automation.id,
        correlation_id: input.eventId,
        idempotency_key: input.idempotencyKey,
        metadata: {
            automationId: input.automation.id,
            automationStepId: input.step.id,
            eventType: input.eventType,
            eventId: input.eventId,
            payload: safePayload(input.payload),
            ...(input.execution ? {
                journeyPath: [...input.execution.journeyPath],
                branchDecisions: [...input.execution.branchDecisions],
                accumulatedDelayMinutes: input.execution.accumulatedDelayMinutes,
            } : {}),
        },
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await input.supabase
        .from('email_outbox')
        .upsert(row, { onConflict: 'project_id,idempotency_key', ignoreDuplicates: true })
        .select('*')
        .maybeSingle();
    if (error) throw error;
    return data || row;
}

async function updateAutomationStats(supabase: SupabaseClient, automationId: string, patch: { triggered?: number; queued?: number }) {
    const { data: automation, error: readError } = await supabase
        .from('email_automations')
        .select('stats')
        .eq('id', automationId)
        .maybeSingle();
    if (readError) throw readError;

    const current = automation?.stats || {};
    const stats = {
        ...current,
        triggered: Number(current.triggered || 0) + Number(patch.triggered || 0),
        queued: Number(current.queued || 0) + Number(patch.queued || 0),
    };

    const { error } = await supabase
        .from('email_automations')
        .update({ stats, updated_at: new Date().toISOString() })
        .eq('id', automationId);
    if (error) throw error;
}

function normalizeSteps(value: unknown): Array<Record<string, any>> {
    return Array.isArray(value)
        ? [...value].map((step, index) => ({ order: index, ...(step || {}) }))
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        : [];
}

function resolveAutomationRecipient(payload: Record<string, unknown>) {
    const customer = readObject(payload.customer);
    const lead = readObject(payload.lead);
    const recipient = readObject(payload.recipient);
    return {
        email: normalizeEmail(
            payload.recipientEmail as string
            || payload.email as string
            || payload.customerEmail as string
            || payload.leadEmail as string
            || recipient.email as string
            || customer.email as string
            || lead.email as string
        ),
        name: String(
            payload.recipientName
            || payload.customerName
            || payload.leadName
            || recipient.name
            || customer.name
            || lead.name
            || ''
        ).trim() || undefined,
    };
}

function resolveMarketingConsent(payload: Record<string, unknown>) {
    const consent = readObject(payload.consent);
    const customer = readObject(payload.customer);
    const lead = readObject(payload.lead);
    const values = [
        payload.marketingConsent,
        payload.acceptsMarketing,
        payload.accepts_marketing,
        consent.marketing,
        customer.marketingConsent,
        customer.acceptsMarketing,
        customer.accepts_marketing,
        lead.marketingConsent,
        lead.acceptsMarketing,
        lead.accepts_marketing,
    ];
    if (values.some(value => value === true || value === 'true')) return true;
    if (values.some(value => value === false || value === 'false')) return false;
    return null;
}

function readDelayMinutes(step: Record<string, any>, baseIso?: string) {
    const config = step.delayConfig || step.delay_config || {};
    const delayType = String(config.delayType || config.delay_type || step.delayType || step.delay_type || 'fixed').toLowerCase();
    if (delayType === 'until-time' || delayType === 'until_time' || delayType === 'wait-until' || delayType === 'wait_until') {
        return readWaitUntilDelayMinutes(config, step, baseIso);
    }

    const value = config.delayMinutes || config.delay_minutes || step.delayMinutes || step.delay_minutes || 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 60 * 24 * 30) : 0;
}

function readWaitUntilDelayMinutes(config: Record<string, any>, step: Record<string, any>, baseIso?: string) {
    const base = new Date(baseIso || new Date().toISOString());
    if (Number.isNaN(base.getTime())) return 0;

    const absolute = String(config.untilAt || config.until_at || config.waitUntil || config.wait_until || step.untilAt || step.until_at || '').trim();
    if (absolute) {
        const target = new Date(absolute);
        if (!Number.isNaN(target.getTime()) && target.getTime() > base.getTime()) {
            return clampDelayMinutes(Math.ceil((target.getTime() - base.getTime()) / 60_000));
        }
    }

    const hour = Number(config.untilHour ?? config.until_hour ?? config.hour ?? step.untilHour ?? step.until_hour ?? 9);
    const minute = Number(config.untilMinute ?? config.until_minute ?? config.minute ?? step.untilMinute ?? step.until_minute ?? 0);
    const target = new Date(base);
    target.setSeconds(0, 0);
    target.setHours(
        Number.isFinite(hour) ? Math.min(Math.max(Math.trunc(hour), 0), 23) : 9,
        Number.isFinite(minute) ? Math.min(Math.max(Math.trunc(minute), 0), 59) : 0,
        0,
        0,
    );
    if (target.getTime() <= base.getTime()) target.setDate(target.getDate() + 1);
    return clampDelayMinutes(Math.ceil((target.getTime() - base.getTime()) / 60_000));
}

function clampDelayMinutes(minutes: number) {
    return Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 60 * 24 * 30) : 0;
}

function readConditionBranchTarget(step: Record<string, any>, passed: boolean) {
    const config = readStepConfig(step, 'condition');
    const value = passed
        ? step.trueBranchStepId || step.true_branch_step_id || config.trueBranchStepId || config.true_branch_step_id || config.trueStepId || config.true_step_id
        : step.falseBranchStepId || step.false_branch_step_id || config.falseBranchStepId || config.false_branch_step_id || config.falseStepId || config.false_step_id;
    return String(value || '').trim();
}

function resolveNextStepIndex(step: Record<string, any>, fallbackIndex: number, stepIndexById: Map<string, number>) {
    const nextStepId = String(step.nextStepId || step.next_step_id || '').trim();
    return nextStepId ? resolveStepIndexById(nextStepId, fallbackIndex, stepIndexById) : fallbackIndex;
}

function resolveStepIndexById(stepId: string, fallbackIndex: number, stepIndexById: Map<string, number>) {
    if (isTerminalStepId(stepId)) return -1;
    const index = stepIndexById.get(stepId);
    return typeof index === 'number' ? index : fallbackIndex;
}

function isTerminalStepId(stepId: string) {
    return ['end', 'stop', 'exit', '__end__'].includes(String(stepId || '').trim().toLowerCase());
}

function evaluateAutomationCondition(
    step: Record<string, any>,
    payload: Record<string, unknown>,
    eventType: string,
) {
    const config = readStepConfig(step, 'condition');
    const conditionType = String(
        config.conditionType
        || config.condition_type
        || config.type
        || config.kind
        || step.conditionType
        || step.condition_type
        || 'custom'
    ).toLowerCase();

    if (conditionType === 'has-tag' || conditionType === 'has_tag') {
        const required = normalizeStringList(config.tags || config.tag || step.tags || step.tag);
        const actual = new Set(resolvePayloadTags(payload));
        const mode = String(config.match || config.mode || 'any').toLowerCase();
        const passed = required.length === 0
            ? false
            : mode === 'all'
                ? required.every(tag => actual.has(tag))
                : required.some(tag => actual.has(tag));
        return conditionDecision(passed, `recipient tag ${required.join(', ') || 'required tag'} is missing`);
    }

    if (conditionType === 'purchase-made' || conditionType === 'purchase_made') {
        const order = readObject(payload.order);
        const total = Number(payload.total || payload.totalAmount || payload.total_amount || order.total || order.totalAmount || order.total_amount || 0);
        const passed = [
            'purchase_completed',
            'purchase.completed',
            'order_created',
            'order.created',
            'payment.succeeded',
        ].includes(eventType) || Boolean(payload.order) || total > 0;
        return conditionDecision(passed, 'purchase event or order payload was not present');
    }

    if (conditionType === 'email-opened' || conditionType === 'email_opened') {
        const passed = ['opened', 'email.opened'].includes(eventType)
            || payload.emailOpened === true
            || payload.opened === true;
        return conditionDecision(passed, 'email open event was not present');
    }

    if (conditionType === 'email-clicked' || conditionType === 'email_clicked') {
        const passed = ['clicked', 'email.clicked'].includes(eventType)
            || payload.emailClicked === true
            || payload.clicked === true;
        return conditionDecision(passed, 'email click event was not present');
    }

    if (conditionType === 'custom' || conditionType === 'payload' || conditionType === 'field') {
        const path = String(config.path || config.field || step.path || step.field || '').trim();
        if (!path) return { passed: false, reason: 'Automation condition is missing a payload path' };
        const actual = readPath(payload, path);
        const expected = config.value ?? config.equals ?? step.value;
        const operator = String(config.operator || config.op || (expected !== undefined ? 'equals' : 'truthy')).toLowerCase();
        return conditionDecision(
            compareConditionValue(actual, expected, operator),
            `payload condition ${path} ${operator} was not met`,
        );
    }

    return {
        passed: false,
        reason: `Automation condition '${conditionType}' is not supported by the reviewed runtime`,
    };
}

function conditionDecision(passed: boolean, failureReason: string) {
    return {
        passed,
        reason: passed ? '' : `Automation condition not met: ${failureReason}`,
    };
}

async function executeAutomationAction(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    step: Record<string, any>;
    recipientEmail: string;
    recipientName?: string;
    payload: Record<string, unknown>;
}) {
    const config = readStepConfig(input.step, 'action');
    const actionType = String(
        config.actionType
        || config.action_type
        || config.type
        || config.kind
        || input.step.actionType
        || input.step.action_type
        || ''
    ).toLowerCase();

    if (actionType === 'add-tag' || actionType === 'add_tag') {
        await updateAudienceMemberTags(input, normalizeStringList(config.tags || config.tag || input.step.tags || input.step.tag), 'add');
        return;
    }

    if (actionType === 'remove-tag' || actionType === 'remove_tag') {
        await updateAudienceMemberTags(input, normalizeStringList(config.tags || config.tag || input.step.tags || input.step.tag), 'remove');
        return;
    }

    if (actionType === 'move-to-audience' || actionType === 'move_to_audience') {
        await updateAudienceMemberTags(input, normalizeStringList(config.tags || input.step.tags), 'add', true);
    }
}

async function updateAudienceMemberTags(input: {
    supabase: SupabaseClient;
    projectId: string;
    automation: Record<string, any>;
    step: Record<string, any>;
    recipientEmail: string;
    recipientName?: string;
    payload: Record<string, unknown>;
}, tags: string[], mode: 'add' | 'remove', allowCreate = false) {
    if (!isValidEmail(input.recipientEmail) || (tags.length === 0 && !allowCreate)) return;
    const config = readStepConfig(input.step, 'action');
    const audienceId = String(config.audienceId || config.audience_id || input.automation.audience_id || input.payload.audienceId || input.payload.audience_id || '').trim();
    if (!audienceId) return;

    const { data: audience, error } = await input.supabase
        .from('email_audiences')
        .select('*')
        .eq('id', audienceId)
        .or(`project_id.eq.${input.projectId},store_id.eq.${input.projectId}`)
        .maybeSingle();
    if (error) throw error;
    if (!audience) return;

    const members = normalizeStaticMembers(audience.static_members);
    const email = normalizeEmail(input.recipientEmail);
    const existingIndex = members.findIndex(member => normalizeEmail(member.email) === email);
    const existing = existingIndex >= 0 ? members[existingIndex] : {
        email,
        name: input.recipientName || '',
        acceptsMarketing: true,
        sourceModule: input.automation.source_module || 'email-marketing',
        tags: [],
    };
    const currentTags = new Set(normalizeStringList(existing.tags));
    for (const tag of tags) {
        if (mode === 'add') currentTags.add(tag);
        if (mode === 'remove') currentTags.delete(tag);
    }
    const nextMember = {
        ...existing,
        email,
        name: existing.name || input.recipientName || '',
        tags: Array.from(currentTags),
        updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
        members[existingIndex] = nextMember;
    } else if (mode === 'add') {
        members.push(nextMember);
    }

    const { error: updateError } = await input.supabase
        .from('email_audiences')
        .update({
            static_members: members,
            static_member_count: members.length,
            updated_at: new Date().toISOString(),
        })
        .eq('id', audience.id);
    if (updateError) throw updateError;
}

function compareConditionValue(actual: unknown, expected: unknown, operator: string) {
    if (operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
    if (operator === 'not_exists') return actual === undefined || actual === null || actual === '';
    if (operator === 'truthy') return actual === true || actual === 'true' || (typeof actual === 'number' && actual > 0);
    if (operator === 'falsey' || operator === 'falsy') return actual === false || actual === 'false' || actual === 0 || actual === undefined || actual === null || actual === '';
    if (operator === 'contains') {
        if (Array.isArray(actual)) return actual.map(value => String(value).toLowerCase()).includes(String(expected).toLowerCase());
        return String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
    }
    if (operator === 'not_equals' || operator === 'neq') return String(actual ?? '') !== String(expected ?? '');
    if (operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') {
        const left = Number(actual);
        const right = Number(expected);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        if (operator === 'gt') return left > right;
        if (operator === 'gte') return left >= right;
        if (operator === 'lt') return left < right;
        return left <= right;
    }
    return String(actual ?? '') === String(expected ?? '');
}

function readStepConfig(step: Record<string, any>, kind: 'condition' | 'action') {
    if (kind === 'condition') return step.conditionConfig || step.condition_config || step.config || {};
    return step.actionConfig || step.action_config || step.config || {};
}

function resolvePayloadTags(payload: Record<string, unknown>) {
    const customer = readObject(payload.customer);
    const lead = readObject(payload.lead);
    const recipient = readObject(payload.recipient);
    return normalizeStringList([
        ...normalizeStringList(payload.tags),
        ...normalizeStringList(customer.tags),
        ...normalizeStringList(lead.tags),
        ...normalizeStringList(recipient.tags),
    ]);
}

function normalizeStaticMembers(value: unknown): Array<Record<string, any>> {
    return Array.isArray(value)
        ? value.filter(member => member && typeof member === 'object').map(member => ({ ...(member as Record<string, any>) }))
        : [];
}

function normalizeStringList(value: unknown): string[] {
    const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    return list
        .map(item => String(item || '').trim().toLowerCase())
        .filter(Boolean);
}

function resolveEventId(input: AutomationEventInput, payload: Record<string, unknown>) {
    return String(
        input.idempotencyKey
        || payload.idempotencyKey
        || payload.eventId
        || payload.event_id
        || payload.orderId
        || payload.order_id
        || payload.leadId
        || payload.lead_id
        || `${input.projectId}:${input.eventType}:${normalizeEmail(String(payload.email || payload.recipientEmail || 'recipient'))}`
    );
}

function createAutomationStepIdempotencyKey(input: {
    automationId: string;
    stepId?: string;
    recipientEmail: string;
    eventId: string;
}) {
    return [
        'automation',
        input.automationId,
        input.stepId || 'step',
        normalizeEmail(input.recipientEmail),
        normalizeIdPart(input.eventId),
    ].join(':');
}

function appendAutomationFooter(
    html: string,
    projectId: string,
    recipientEmail: string,
    settings: Awaited<ReturnType<typeof getEmailSettings>>,
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

function resolveCampaignHtml(campaign: Record<string, any>, subject: string) {
    const html = String(campaign.html_content || '');
    if (html.trim()) return html;
    return `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escapeHtml(subject)}</h1></div>`;
}

function interpolate(template: string, payload: Record<string, unknown>) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, path) => {
        const value = readPath(payload, String(path));
        return value === undefined || value === null ? '' : escapeHtml(String(value));
    });
}

function readPath(source: Record<string, unknown>, path: string) {
    return path.split('.').reduce<unknown>((value, key) => {
        if (!value || typeof value !== 'object') return undefined;
        return (value as Record<string, unknown>)[key];
    }, source);
}

function normalizeNow(value?: string | Date | null) {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function addMinutes(iso: string, minutes: number) {
    return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function normalizeIdPart(value: unknown) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._:-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'event';
}

function readObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safePayload(payload: Record<string, unknown>) {
    const redacted = { ...payload };
    delete redacted.card;
    delete redacted.password;
    delete redacted.token;
    delete redacted.secret;
    return redacted;
}

function normalizeSkipReason(reason: string) {
    const value = reason.toLowerCase();
    if (value.includes('condition')) return 'policy_blocked';
    if (value.includes('review')) return 'needs_review';
    if (value.includes('consent')) return 'consent_required';
    if (value.includes('suppressed')) return 'suppressed';
    if (value.includes('recipient')) return 'invalid_recipient';
    if (value.includes('readiness') || value.includes('configured')) return 'readiness_blocked';
    return 'policy_blocked';
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
