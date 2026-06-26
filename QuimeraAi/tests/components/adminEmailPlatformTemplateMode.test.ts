import { describe, expect, it } from 'vitest';
import {
    ADMIN_EMAIL_PLATFORM_SCOPE,
    buildAdminAudienceTemplateFields,
    buildAdminEmailTemplateFields,
} from '../../components/dashboard/admin/email-hub/platformTemplateMode.ts';

describe('adminEmailPlatformTemplateMode', () => {
    it('marks admin email assets as template-only and non-deliverable', () => {
        const fields = buildAdminEmailTemplateFields({
            generatedByAI: true,
            sourceComponent: 'admin-ai-email-studio',
            metadata: { assetType: 'campaign' },
        });

        expect(fields).toMatchObject({
            platformTemplate: true,
            templateScope: ADMIN_EMAIL_PLATFORM_SCOPE,
            sendMode: 'template_only',
            needsReview: true,
            safeToEdit: true,
            generatedByAI: true,
            sourceModule: 'admin-email-hub',
            sourceComponent: 'admin-ai-email-studio',
            metadata: {
                assetType: 'campaign',
                emailEngineScope: ADMIN_EMAIL_PLATFORM_SCOPE,
                canonicalProjectScoped: false,
                providerDeliveryEnabled: false,
                deliveryRequiresProjectEmailHub: true,
            },
        });
    });

    it('marks admin audiences as platform templates without enabling provider delivery', () => {
        const fields = buildAdminAudienceTemplateFields({ metadata: { assetType: 'audience' } });

        expect(fields).toMatchObject({
            platformTemplate: true,
            templateScope: ADMIN_EMAIL_PLATFORM_SCOPE,
            needsReview: true,
            safeToEdit: true,
            generatedByAI: false,
            metadata: {
                assetType: 'audience',
                providerDeliveryEnabled: false,
                deliveryRequiresProjectEmailHub: true,
            },
        });
        expect(fields).not.toHaveProperty('sendMode');
    });
});
