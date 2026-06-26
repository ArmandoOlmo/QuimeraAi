import { describe, expect, it } from 'vitest';
import { buildGlobalAssistantCapabilityCatalog } from '../../services/globalAssistant/globalAssistantCapabilityCatalog.ts';

describe('globalAssistantCapabilityCatalog', () => {
    it('summarizes executable tools separately from preview-only declarations', () => {
        const catalog = buildGlobalAssistantCapabilityCatalog({
            enabledServices: ['emailMarketing', 'ecommerce', 'aiFeatures', 'analytics'],
            enabledFeatures: ['emailMarketing', 'ecommerceEnabled'],
        });

        const analytics = catalog.modules.find(module => module.module === 'analytics');
        const email = catalog.modules.find(module => module.module === 'emailMarketing');
        const ecommerce = catalog.modules.find(module => module.module === 'ecommerce');
        const media = catalog.modules.find(module => module.module === 'media');
        const createEmail = catalog.actions.find(action => action.actionType === 'create_email_campaign');
        const sendEmail = catalog.actions.find(action => action.actionType === 'send_email_campaign');
        const createProduct = catalog.actions.find(action => action.actionType === 'create_product');
        const generateImage = catalog.actions.find(action => action.actionType === 'generate_image');

        expect(catalog.actionCount).toBeGreaterThan(40);
        expect(catalog.executableActionCount).toBeGreaterThan(10);
        expect(analytics?.executableActionTypes).toEqual(expect.arrayContaining([
            'run_project_report',
            'summarize_analytics',
            'identify_blockers',
            'export_report',
        ]));
        expect(email?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_email_campaign',
            'create_email_automation',
            'create_audience',
        ]));
        expect(email?.previewOnlyActionTypes).toContain('send_email_campaign');
        expect(ecommerce?.executableActionTypes).toContain('create_product');
        expect(media?.executableActionTypes).toEqual(expect.arrayContaining([
            'generate_image',
            'edit_image',
            'generate_video',
        ]));
        expect(createEmail).toMatchObject({
            executable: true,
            availableInContext: true,
            requiresConfirmation: true,
        });
        expect(sendEmail).toMatchObject({
            executable: false,
            previewSupported: true,
            safetyLevel: 'critical',
        });
        expect(createProduct).toMatchObject({
            executable: true,
            availableInContext: true,
            requiredService: 'ecommerce',
        });
        expect(generateImage).toMatchObject({
            executable: true,
            availableInContext: true,
            requiredService: 'aiFeatures',
        });
    });

    it('marks actions unavailable when required service or feature is absent', () => {
        const catalog = buildGlobalAssistantCapabilityCatalog({
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });
        const ecommerce = catalog.modules.find(module => module.module === 'ecommerce');
        const createProduct = catalog.actions.find(action => action.actionType === 'create_product');

        expect(createProduct).toMatchObject({
            availableInContext: false,
            blockedBy: ['service:ecommerce', 'feature:ecommerceEnabled'],
        });
        expect(ecommerce?.unavailableActionTypes).toContain('create_product');
    });
});
