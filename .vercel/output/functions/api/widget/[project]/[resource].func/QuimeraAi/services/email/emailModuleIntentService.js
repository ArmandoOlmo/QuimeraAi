const EMAIL_CLEANUP_PATTERN = /[^a-z0-9._@:-]+/g;
export const createCanonicalEmailIdempotencyKey = (input) => [
    'email',
    normalizeKeyPart(input.sourceModule),
    normalizeKeyPart(input.projectId || 'project'),
    normalizeKeyPart(input.sourceEvent || input.sourceEntityType || 'event'),
    normalizeKeyPart(input.sourceEntityId || 'entity'),
    normalizeKeyPart(input.recipientEmail || 'recipient'),
    normalizeKeyPart(input.bucket || 'v1'),
].join(':');
export const buildCanonicalEmailDraftMetadata = (context) => {
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
export const buildCanonicalEmailDraftEvent = (type, context, status = 'draft') => ({
    type,
    status,
    needsReview: true,
    noRuntimeActivated: true,
    metadata: buildCanonicalEmailDraftMetadata(context),
});
export const buildReviewedTransactionalEmailPayload = (input) => {
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
function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase() || undefined;
}
function normalizeKeyPart(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(EMAIL_CLEANUP_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'unknown';
}
function normalizeOptionalIso(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
//# sourceMappingURL=emailModuleIntentService.js.map