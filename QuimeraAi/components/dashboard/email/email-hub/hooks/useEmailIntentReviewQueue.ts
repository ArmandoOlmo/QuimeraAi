import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/supabase';
import { dispatchReviewedTransactionalEmailIntent } from '@/services/email/emailIntentClient.ts';
import type { CanonicalEmailSourceModule } from '@/services/email/emailModuleIntentService.ts';
import {
    hasEmailReviewQueueFilter,
    normalizeEmailReviewQueueFilter,
    type EmailReviewQueueFilter,
} from '@/services/email/emailReviewQueueLinkService.ts';

type EmailLogRow = Record<string, any>;

export interface EmailReviewIntent {
    id: string;
    projectId: string;
    type: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    sourceModule: string;
    sourceComponent?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
    idempotencyKey: string;
    status: string;
    skippedReason?: string | null;
    errorMessage?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    generatedByAI: boolean;
    needsReview: boolean;
    sendMode: string;
    safeToEdit: boolean;
    consent?: Record<string, unknown>;
    metadata: Record<string, unknown>;
    missingFields: string[];
}

export interface ReviewedIntentDraft {
    subject: string;
    html: string;
    text?: string;
}

export function useEmailIntentReviewQueue(userId: string, projectId: string, filters?: EmailReviewQueueFilter) {
    const [intents, setIntents] = useState<EmailReviewIntent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [approvingIntentId, setApprovingIntentId] = useState<string | null>(null);

    const isValid = Boolean(userId && projectId && projectId !== 'default');
    const normalizedFilters = useMemo(() => normalizeEmailReviewQueueFilter(filters), [
        filters?.sourceEntityId,
        filters?.sourceEntityType,
        filters?.sourceModule,
    ]);
    const hasActiveFilter = hasEmailReviewQueueFilter(normalizedFilters);

    const fetchIntents = useCallback(async () => {
        if (!isValid) {
            setIntents([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('email_logs')
                .select([
                    'id',
                    'project_id',
                    'type',
                    'template_id',
                    'recipient_email',
                    'recipient_name',
                    'subject',
                    'status',
                    'skipped_reason',
                    'error_message',
                    'idempotency_key',
                    'source_module',
                    'source_component',
                    'source_event',
                    'source_entity_type',
                    'source_entity_id',
                    'metadata',
                    'created_at',
                    'updated_at',
                    'sent_at',
                ].join(','))
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (normalizedFilters.sourceModule) query = query.eq('source_module', normalizedFilters.sourceModule);
            if (normalizedFilters.sourceEntityType) query = query.eq('source_entity_type', normalizedFilters.sourceEntityType);
            if (normalizedFilters.sourceEntityId) query = query.eq('source_entity_id', normalizedFilters.sourceEntityId);

            const { data, error: queryError } = await query.limit(100);

            if (queryError) throw queryError;
            setIntents((data || []).map(mapEmailLogToReviewIntent).filter((intent): intent is EmailReviewIntent => Boolean(intent)));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setIntents([]);
        } finally {
            setIsLoading(false);
        }
    }, [
        isValid,
        normalizedFilters.sourceEntityId,
        normalizedFilters.sourceEntityType,
        normalizedFilters.sourceModule,
        projectId,
    ]);

    useEffect(() => {
        fetchIntents();
        if (!isValid) return undefined;

        const channel = supabase
            .channel(`email_intent_review_${projectId}_${Math.random().toString(36).slice(2)}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'email_logs', filter: `project_id=eq.${projectId}` },
                () => fetchIntents(),
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchIntents, isValid, projectId]);

    const approveIntent = useCallback(async (intent: EmailReviewIntent, draft: ReviewedIntentDraft) => {
        const subject = draft.subject.trim();
        const html = draft.html.trim();
        if (!subject) throw new Error('Subject is required before approval.');
        if (!html) throw new Error('Reviewed HTML content is required before approval.');
        if (!intent.safeToEdit) throw new Error('This draft is marked unsafe to edit and cannot be approved from the review queue.');
        if (intent.missingFields.includes('recipientEmail')) throw new Error('Recipient email is missing.');
        if (intent.missingFields.includes('idempotencyKey')) throw new Error('Idempotency key is missing.');

        setApprovingIntentId(intent.id);
        setError(null);
        try {
            const result = await dispatchReviewedTransactionalEmailIntent({
                projectId,
                type: intent.type,
                recipientEmail: intent.recipientEmail,
                recipientName: intent.recipientName,
                subject,
                html,
                text: draft.text?.trim() || undefined,
                idempotencyKey: intent.idempotencyKey,
                sourceModule: normalizeSourceModule(intent.sourceModule),
                sourceComponent: intent.sourceComponent || undefined,
                sourceEvent: intent.sourceEvent || intent.type,
                sourceEntityType: intent.sourceEntityType || undefined,
                sourceEntityId: intent.sourceEntityId || intent.id,
                reviewedBy: userId,
                reviewedAt: new Date().toISOString(),
                generatedByAI: false,
                needsReview: false,
                safeToEdit: true,
                consentSource: readConsentSource(intent),
                marketingConsent: readConsentFlag(intent, 'marketing'),
                transactionalConsent: readConsentFlag(intent, 'transactional'),
                extra: {
                    ...intent.metadata,
                    originalEmailLogId: intent.id,
                    originalSkippedReason: intent.skippedReason,
                },
            });
            await fetchIntents();
            return result;
        } finally {
            setApprovingIntentId(null);
        }
    }, [fetchIntents, projectId, userId]);

    return useMemo(() => ({
        intents,
        pendingCount: intents.length,
        isLoading,
        error,
        approvingIntentId,
        filters: normalizedFilters,
        hasActiveFilter,
        refresh: fetchIntents,
        approveIntent,
    }), [approveIntent, approvingIntentId, error, fetchIntents, hasActiveFilter, intents, isLoading, normalizedFilters]);
}

function mapEmailLogToReviewIntent(row: EmailLogRow): EmailReviewIntent | null {
    if (!isPendingReviewLog(row)) return null;

    const metadata = readObject(row.metadata);
    const canonical = readObject(metadata.canonicalEmail || metadata.canonical_email || metadata.intent || {});
    const merged = { ...metadata, ...canonical };
    const recipientEmail = readString(row.recipient_email || merged.recipientEmail || merged.recipient_email);
    const idempotencyKey = readString(row.idempotency_key || merged.idempotencyKey || merged.idempotency_key);
    const subject = readString(row.subject || merged.subject);
    const type = readString(row.template_id || row.type || merged.type || merged.transactionalType || merged.transactional_type);
    const sourceModule = readString(row.source_module || merged.sourceModule || merged.source_module || 'ai-studio');
    const missingFields = [
        !recipientEmail ? 'recipientEmail' : '',
        !idempotencyKey ? 'idempotencyKey' : '',
        !subject ? 'subject' : '',
        !type ? 'type' : '',
    ].filter(Boolean);

    return {
        id: String(row.id),
        projectId: readString(row.project_id || merged.projectId || merged.project_id),
        type,
        recipientEmail,
        recipientName: readString(row.recipient_name || merged.recipientName || merged.recipient_name) || null,
        subject,
        sourceModule,
        sourceComponent: readString(row.source_component || merged.sourceComponent || merged.source_component) || null,
        sourceEvent: readString(row.source_event || merged.sourceEvent || merged.source_event || type) || null,
        sourceEntityType: readString(row.source_entity_type || merged.sourceEntityType || merged.source_entity_type) || null,
        sourceEntityId: readString(row.source_entity_id || merged.sourceEntityId || merged.source_entity_id) || null,
        idempotencyKey,
        status: readString(row.status),
        skippedReason: readString(row.skipped_reason) || null,
        errorMessage: readString(row.error_message) || null,
        createdAt: readString(row.created_at) || null,
        updatedAt: readString(row.updated_at) || null,
        generatedByAI: merged.generatedByAI === true || merged.generated_by_ai === true,
        needsReview: merged.needsReview !== false && merged.needs_review !== false,
        sendMode: readString(merged.sendMode || merged.send_mode || 'draft_only'),
        safeToEdit: merged.safeToEdit !== false && merged.safe_to_edit !== false,
        consent: readObject(merged.consent),
        metadata: merged,
        missingFields,
    };
}

function isPendingReviewLog(row: EmailLogRow) {
    if (!row || row.sent_at) return false;
    const status = readString(row.status).toLowerCase();
    if (['queued', 'sending', 'sent', 'delivered', 'opened', 'clicked'].includes(status)) return false;

    const metadata = readObject(row.metadata);
    const canonical = readObject(metadata.canonicalEmail || metadata.canonical_email || metadata.intent || {});
    const merged = { ...metadata, ...canonical };
    const skippedReason = readString(row.skipped_reason || row.error_message).toLowerCase();

    return skippedReason.includes('needs_review')
        || skippedReason.includes('review')
        || skippedReason.includes('draft')
        || merged.canonicalEmailIntent === true
        || merged.canonical_email_intent === true
        || merged.needsReview === true
        || merged.needs_review === true
        || merged.sendMode === 'draft_only'
        || merged.send_mode === 'draft_only';
}

function normalizeSourceModule(sourceModule: string): CanonicalEmailSourceModule {
    const supported: CanonicalEmailSourceModule[] = [
        'ecommerce',
        'crm',
        'leads',
        'chatcore',
        'appointments',
        'restaurants',
        'realty',
        'website-builder',
        'ai-studio',
        'bio-page-engine',
    ];
    return supported.includes(sourceModule as CanonicalEmailSourceModule)
        ? sourceModule as CanonicalEmailSourceModule
        : 'ai-studio';
}

function readConsentSource(intent: EmailReviewIntent) {
    const consent = readObject(intent.consent);
    return readString(consent.source) || intent.sourceComponent || intent.sourceModule;
}

function readConsentFlag(intent: EmailReviewIntent, key: 'marketing' | 'transactional') {
    const consent = readObject(intent.consent);
    return typeof consent[key] === 'boolean' ? consent[key] as boolean : null;
}

function readObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}
