export const ADMIN_EMAIL_PLATFORM_PROJECT_ID = 'admin';
export const ADMIN_EMAIL_PLATFORM_SCOPE = 'platform_template';
export const ADMIN_EMAIL_TEMPLATE_SEND_BLOCKED_MESSAGE = 'Admin Email Hub is a platform template library. Open a project Email Hub to send tests or campaigns through the canonical email engine.';

export function buildAdminEmailTemplateMetadata(extra: Record<string, unknown> = {}) {
    return {
        ...extra,
        emailEngineScope: ADMIN_EMAIL_PLATFORM_SCOPE,
        canonicalProjectScoped: false,
        providerDeliveryEnabled: false,
        deliveryRequiresProjectEmailHub: true,
    };
}

export function buildAdminEmailTemplateFields(options: {
    generatedByAI?: boolean;
    sourceComponent?: string;
    metadata?: Record<string, unknown>;
} = {}) {
    return {
        platformTemplate: true,
        templateScope: ADMIN_EMAIL_PLATFORM_SCOPE,
        sendMode: 'template_only',
        needsReview: true,
        safeToEdit: true,
        generatedByAI: options.generatedByAI === true,
        sourceModule: 'admin-email-hub',
        sourceComponent: options.sourceComponent || 'admin-email-hub',
        metadata: buildAdminEmailTemplateMetadata(options.metadata),
    };
}

export function buildAdminAudienceTemplateFields(options: {
    generatedByAI?: boolean;
    sourceComponent?: string;
    metadata?: Record<string, unknown>;
} = {}) {
    return {
        platformTemplate: true,
        templateScope: ADMIN_EMAIL_PLATFORM_SCOPE,
        needsReview: true,
        safeToEdit: true,
        generatedByAI: options.generatedByAI === true,
        sourceModule: 'admin-email-hub',
        sourceComponent: options.sourceComponent || 'admin-email-hub',
        metadata: buildAdminEmailTemplateMetadata(options.metadata),
    };
}
