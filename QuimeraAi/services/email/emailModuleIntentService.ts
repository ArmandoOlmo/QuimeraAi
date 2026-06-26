export type CanonicalEmailSourceModule =
    | 'ecommerce'
    | 'crm'
    | 'leads'
    | 'chatcore'
    | 'appointments'
    | 'restaurants'
    | 'realty'
    | 'website-builder'
    | 'ai-studio'
    | 'bio-page-engine';

export interface CanonicalEmailIntentContext {
    sourceModule: CanonicalEmailSourceModule;
    sourceComponent?: string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    projectId?: string | null;
    recipientEmail?: string | null;
    generatedByAI?: boolean;
    needsReview?: boolean;
    safeToEdit?: boolean;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    consentSource?: string | null;
    marketingConsent?: boolean | null;
    transactionalConsent?: boolean | null;
    extra?: Record<string, unknown>;
}

export interface ReviewedTransactionalEmailIntent extends CanonicalEmailIntentContext {
    type: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    html: string;
    text?: string;
    idempotencyKey?: string;
    sendNow?: boolean;
    scheduledAt?: string | Date | null;
}

const EMAIL_CLEANUP_PATTERN = /[^a-z0-9._@:-]+/g;

export const createCanonicalEmailIdempotencyKey = (input: {
    sourceModule: CanonicalEmailSourceModule | string;
    sourceEvent?: string;
    sourceEntityType?: string;
    sourceEntityId?: string | null;
    recipientEmail?: string | null;
    projectId?: string | null;
    bucket?: string | null;
}) => [
    'email',
    normalizeKeyPart(input.sourceModule),
    normalizeKeyPart(input.projectId || 'project'),
    normalizeKeyPart(input.sourceEvent || input.sourceEntityType || 'event'),
    normalizeKeyPart(input.sourceEntityId || 'entity'),
    normalizeKeyPart(input.recipientEmail || 'recipient'),
    normalizeKeyPart(input.bucket || 'v1'),
].join(':');

export const buildCanonicalEmailDraftMetadata = (context: CanonicalEmailIntentContext) => {
    const idempotencyKey = createCanonicalEmailIdempotencyKey({
        sourceModule: context.sourceModule,
        sourceEvent: context.sourceEvent,
        sourceEntityType: context.sourceEntityType,
        sourceEntityId: context.sourceEntityId,
        recipientEmail: context.recipientEmail,
        projectId: context.projectId,
    });

    return {
        ...(context.extra || {}),
        canonicalEmailIntent: true,
        canonicalEmailIntentVersion: 1,
        sourceModule: context.sourceModule,
        sourceComponent: context.sourceComponent,
        sourceEvent: context.sourceEvent,
        sourceEntityType: context.sourceEntityType,
        sourceEntityId: context.sourceEntityId,
        projectId: context.projectId || undefined,
        recipientEmail: normalizeEmail(context.recipientEmail),
        idempotencyKey,
        generatedByAI: context.generatedByAI === true,
        needsReview: context.needsReview !== false,
        safeToEdit: context.safeToEdit !== false,
        sendMode: 'draft_only',
        noEmailSent: true,
        consent: {
            source: context.consentSource || context.sourceComponent || context.sourceModule,
            marketing: context.marketingConsent ?? null,
            transactional: context.transactionalConsent ?? null,
        },
        createdAt: new Date().toISOString(),
    };
};

export const buildCanonicalEmailDraftEvent = (
    type: string,
    context: CanonicalEmailIntentContext,
    status: 'draft' | 'not_configured' = 'draft',
) => ({
    type,
    status,
    needsReview: true,
    noRuntimeActivated: true,
    metadata: buildCanonicalEmailDraftMetadata(context),
});

export const buildReviewedTransactionalEmailPayload = (input: ReviewedTransactionalEmailIntent) => {
    const idempotencyKey = input.idempotencyKey || createCanonicalEmailIdempotencyKey({
        sourceModule: input.sourceModule,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        recipientEmail: input.recipientEmail,
        projectId: input.projectId,
    });

    return {
        action: 'dispatchTransactionalEmail',
        projectId: input.projectId,
        type: input.type,
        recipientEmail: normalizeEmail(input.recipientEmail),
        recipientName: input.recipientName || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
        idempotencyKey,
        sendNow: input.sendNow !== false,
        scheduledAt: normalizeOptionalIso(input.scheduledAt),
        sourceModule: input.sourceModule,
        sourceComponent: input.sourceComponent,
        sourceEvent: input.sourceEvent || input.type,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        generatedByAI: false,
        needsReview: false,
        safeToEdit: input.safeToEdit !== false,
        sendMode: 'reviewed',
        metadata: {
            ...(input.extra || {}),
            canonicalEmailIntent: true,
            canonicalEmailIntentVersion: 1,
            idempotencyKey,
            reviewedBy: input.reviewedBy || null,
            reviewedAt: input.reviewedAt || new Date().toISOString(),
            consent: {
                source: input.consentSource || input.sourceComponent || input.sourceModule,
                marketing: input.marketingConsent ?? null,
                transactional: input.transactionalConsent ?? null,
            },
            generatedByAI: false,
            needsReview: false,
            safeToEdit: input.safeToEdit !== false,
            sendMode: 'reviewed',
        },
    };
};

function normalizeEmail(value?: string | null) {
    return String(value || '').trim().toLowerCase() || undefined;
}

function normalizeKeyPart(value: unknown) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(EMAIL_CLEANUP_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'unknown';
}

function normalizeOptionalIso(value?: string | Date | null) {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
