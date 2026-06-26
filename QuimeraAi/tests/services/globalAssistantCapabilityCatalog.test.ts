import { describe, expect, it } from 'vitest';
import { buildGlobalAssistantCapabilityCatalog } from '../../services/globalAssistant/globalAssistantCapabilityCatalog.ts';

describe('globalAssistantCapabilityCatalog', () => {
    it('summarizes executable tools separately from preview-only declarations', () => {
        const catalog = buildGlobalAssistantCapabilityCatalog({
            enabledServices: ['emailMarketing', 'ecommerce', 'aiFeatures', 'analytics', 'appointments', 'finance'],
            enabledFeatures: ['emailMarketing', 'ecommerceEnabled'],
        });

        const analytics = catalog.modules.find(module => module.module === 'analytics');
        const appointments = catalog.modules.find(module => module.module === 'appointments');
        const email = catalog.modules.find(module => module.module === 'emailMarketing');
        const ecommerce = catalog.modules.find(module => module.module === 'ecommerce');
        const crm = catalog.modules.find(module => module.module === 'crm');
        const media = catalog.modules.find(module => module.module === 'media');
        const website = catalog.modules.find(module => module.module === 'website');
        const storefront = catalog.modules.find(module => module.module === 'storefront');
        const project = catalog.modules.find(module => module.module === 'project');
        const admin = catalog.modules.find(module => module.module === 'admin');
        const finance = catalog.modules.find(module => module.module === 'finance');
        const bioPage = catalog.modules.find(module => module.module === 'bioPage');
        const createEmail = catalog.actions.find(action => action.actionType === 'create_email_campaign');
        const sendEmail = catalog.actions.find(action => action.actionType === 'send_email_campaign');
        const createProduct = catalog.actions.find(action => action.actionType === 'create_product');
        const generateImage = catalog.actions.find(action => action.actionType === 'generate_image');
        const updateProjectMetadata = catalog.actions.find(action => action.actionType === 'update_project_metadata');
        const searchTenants = catalog.actions.find(action => action.actionType === 'search_tenants');
        const updateFinanceRecord = catalog.actions.find(action => action.actionType === 'update_finance_record');
        const publishBioPage = catalog.actions.find(action => action.actionType === 'publish_bio_page');
        const publishWebsite = catalog.actions.find(action => action.actionType === 'publish_website');

        expect(catalog.actionCount).toBeGreaterThan(40);
        expect(catalog.executableActionCount).toBeGreaterThan(10);
        expect(analytics?.executableActionTypes).toEqual(expect.arrayContaining([
            'run_project_report',
            'summarize_analytics',
            'identify_blockers',
            'export_report',
        ]));
        expect(appointments?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_appointment',
            'update_appointment',
            'configure_availability',
        ]));
        expect(email?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_email_campaign',
            'create_email_automation',
            'create_audience',
            'generate_email_copy',
        ]));
        expect(email?.previewOnlyActionTypes).toContain('send_email_campaign');
        expect(ecommerce?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_product',
            'edit_product',
            'create_category',
            'update_price',
            'update_inventory',
            'create_discount',
            'generate_product_copy',
        ]));
        expect(crm?.executableActionTypes).toEqual(expect.arrayContaining([
            'search_leads',
            'create_lead',
            'update_lead',
            'summarize_leads',
            'create_follow_up_task',
        ]));
        expect(media?.executableActionTypes).toEqual(expect.arrayContaining([
            'generate_image',
            'edit_image',
            'generate_video',
            'attach_asset_to_section',
        ]));
        expect(website?.executableActionTypes).toEqual(expect.arrayContaining([
            'edit_website_section',
            'update_section_copy',
            'update_section_image',
            'reorder_sections',
            'toggle_section_visibility',
            'publish_website',
            'unpublish_website',
        ]));
        expect(storefront?.executableActionTypes).toEqual(expect.arrayContaining([
            'add_storefront_section',
            'edit_storefront_theme',
            'update_product_card_style',
        ]));
        expect(project?.executableActionTypes).toEqual(expect.arrayContaining([
            'open_project',
            'switch_project',
            'search_projects',
            'update_project_metadata',
        ]));
        expect(admin?.executableActionTypes).toEqual(expect.arrayContaining([
            'open_tenant',
            'search_tenants',
        ]));
        expect(finance?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_finance_record',
            'update_finance_record',
        ]));
        expect(bioPage?.executableActionTypes).toEqual(expect.arrayContaining([
            'create_bio_page',
            'edit_bio_link',
            'add_bio_block',
            'publish_bio_page',
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
        expect(updateProjectMetadata).toMatchObject({
            executable: true,
            rollbackExecutable: true,
            requiresConfirmation: true,
            previewSupported: true,
            rollbackSupported: true,
        });
        expect(searchTenants).toMatchObject({
            executable: true,
            availableInContext: true,
            mutatesData: false,
            safeNavigation: true,
            requiredPermissions: ['assistant:admin:use'],
        });
        expect(updateFinanceRecord).toMatchObject({
            executable: true,
            availableInContext: true,
            safetyLevel: 'critical',
            requiresConfirmation: true,
            rollbackExecutable: true,
            requiredService: 'finance',
        });
        expect(publishBioPage).toMatchObject({
            executable: true,
            availableInContext: true,
            safetyLevel: 'critical',
            requiresConfirmation: true,
            rollbackExecutable: true,
        });
        expect(publishWebsite).toMatchObject({
            executable: true,
            availableInContext: true,
            safetyLevel: 'critical',
            requiresConfirmation: true,
            rollbackExecutable: true,
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
