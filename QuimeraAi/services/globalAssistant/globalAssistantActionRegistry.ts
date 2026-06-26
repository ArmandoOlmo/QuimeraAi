import type {
    AssistantActionDefinition,
    AssistantJsonSchema,
    AssistantModuleTarget,
    AssistantSafetyLevel,
} from '../../types/globalAssistant';
import { attachDefaultGlobalAssistantActionHandlers } from './globalAssistantActionHandlers';

const objectSchema = (
    properties: Record<string, AssistantJsonSchema> = {},
    required: string[] = [],
): AssistantJsonSchema => ({
    type: 'object',
    properties,
    required,
    additionalProperties: true,
});

const stringSchema = (description?: string, values?: string[]): AssistantJsonSchema => ({
    type: 'string',
    description,
    ...(values ? { enum: values } : {}),
});

const booleanSchema = (description?: string): AssistantJsonSchema => ({
    type: 'boolean',
    description,
});

const numberSchema = (description?: string): AssistantJsonSchema => ({
    type: 'number',
    description,
});

const action = (
    module: AssistantModuleTarget,
    actionType: string,
    description: string,
    inputSchema: AssistantJsonSchema,
    safetyLevel: AssistantSafetyLevel,
    options: Partial<AssistantActionDefinition> = {},
): AssistantActionDefinition => {
    const mutatesData = options.mutatesData ?? !['open', 'search', 'analyze', 'report'].some(prefix => actionType.startsWith(prefix));
    const requiresConfirmation = options.requiresConfirmation ?? (safetyLevel === 'high' || safetyLevel === 'critical');

    return {
        actionType,
        module,
        description,
        inputSchema,
        requiredPermissions: options.requiredPermissions || [`assistant:${module}:use`],
        requiredService: options.requiredService,
        requiredFeature: options.requiredFeature,
        safetyLevel,
        requiresConfirmation,
        previewSupported: options.previewSupported ?? mutatesData,
        rollbackSupported: options.rollbackSupported ?? mutatesData,
        mutatesData,
        idempotencyKeyStrategy: options.idempotencyKeyStrategy || (mutatesData ? 'user_project_action' : 'none'),
        outputSchema: options.outputSchema,
    };
};

export const GLOBAL_ASSISTANT_ACTIONS: AssistantActionDefinition[] = [
    action('project', 'open_project', 'Open a project without mutating data.', objectSchema({
        projectId: stringSchema('Project id to open.'),
    }, ['projectId']), 'low', { mutatesData: false, previewSupported: false, rollbackSupported: false }),
    action('project', 'switch_project', 'Switch the assistant context to another project.', objectSchema({
        projectId: stringSchema('Project id to switch to.'),
        reason: stringSchema('Why the switch is needed.'),
    }, ['projectId']), 'medium', { mutatesData: false, previewSupported: true, rollbackSupported: false, requiresConfirmation: true }),
    action('project', 'search_projects', 'Search projects available to the current user or tenant.', objectSchema({
        query: stringSchema('Project search query.'),
    }, ['query']), 'low', { mutatesData: false, previewSupported: false, rollbackSupported: false }),
    action('project', 'create_project_from_prompt', 'Create a new project through AI Studio generation.', objectSchema({
        prompt: stringSchema('Business or website creation brief.'),
        tenantId: stringSchema('Tenant/workspace id.'),
    }, ['prompt']), 'high', { requiredFeature: 'websiteBuilder' }),
    action('project', 'update_project_metadata', 'Update project name, status, tags, or description.', objectSchema({
        projectId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'updates']), 'high'),

    action('website', 'open_website_builder', 'Open the Website Builder for the active project.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'low', { mutatesData: false, previewSupported: false, rollbackSupported: false }),
    action('website', 'create_website_from_prompt', 'Generate a website draft from a user prompt.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['prompt']), 'high', { requiredFeature: 'websiteBuilder' }),
    action('website', 'edit_website_section', 'Edit a Website Builder section using a structured draft.', objectSchema({
        projectId: stringSchema(),
        sectionId: stringSchema(),
        changes: objectSchema(),
        userModified: booleanSchema('Whether the target was manually modified.'),
        lockedFromRegeneration: booleanSchema('Whether AI regeneration is locked.'),
    }, ['projectId', 'sectionId', 'changes']), 'high'),
    action('website', 'update_section_copy', 'Update copy fields for a website section.', objectSchema({
        projectId: stringSchema(),
        sectionId: stringSchema(),
        path: stringSchema('Dot-path inside the section.'),
        value: stringSchema('New copy.'),
    }, ['projectId', 'sectionId', 'path', 'value']), 'high'),
    action('website', 'update_section_image', 'Attach or replace a section image.', objectSchema({
        projectId: stringSchema(),
        sectionId: stringSchema(),
        assetId: stringSchema(),
        path: stringSchema(),
    }, ['projectId', 'sectionId', 'assetId', 'path']), 'high', { requiredService: 'aiFeatures' }),
    action('website', 'reorder_sections', 'Change website section order.', objectSchema({
        projectId: stringSchema(),
        newOrder: { type: 'array', items: stringSchema() },
    }, ['projectId', 'newOrder']), 'high'),
    action('website', 'toggle_section_visibility', 'Show or hide a website section.', objectSchema({
        projectId: stringSchema(),
        sectionId: stringSchema(),
        visible: booleanSchema(),
    }, ['projectId', 'sectionId', 'visible']), 'high'),
    action('website', 'publish_website', 'Publish the active website.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'critical', { rollbackSupported: true }),
    action('website', 'unpublish_website', 'Unpublish a website public route.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'critical', { rollbackSupported: true }),

    action('media', 'generate_image', 'Generate an image draft asset.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
        aspectRatio: stringSchema(undefined, ['1:1', '16:9', '9:16', '4:3', '3:4']),
        style: stringSchema(),
    }, ['prompt']), 'medium', { requiredService: 'aiFeatures' }),
    action('media', 'edit_image', 'Create an edited image draft from an existing asset.', objectSchema({
        projectId: stringSchema(),
        sourceAssetId: stringSchema(),
        prompt: stringSchema(),
    }, ['sourceAssetId', 'prompt']), 'medium', { requiredService: 'aiFeatures' }),
    action('media', 'generate_video', 'Create a video draft or video prompt task.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
        mode: stringSchema(undefined, ['draft_prompt', 'generate_if_available']),
    }, ['prompt']), 'medium', { requiredService: 'aiFeatures' }),
    action('media', 'attach_asset_to_section', 'Attach a media asset to a website or Bio Page section.', objectSchema({
        projectId: stringSchema(),
        module: stringSchema(),
        sectionId: stringSchema(),
        assetId: stringSchema(),
        path: stringSchema(),
    }, ['projectId', 'sectionId', 'assetId']), 'high', { requiredService: 'aiFeatures' }),

    action('ecommerce', 'create_product', 'Create an ecommerce product draft.', objectSchema({
        projectId: stringSchema(),
        product: objectSchema({
            name: stringSchema(),
            price: numberSchema(),
        }, ['name']),
    }, ['projectId', 'product']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'edit_product', 'Edit an ecommerce product.', objectSchema({
        projectId: stringSchema(),
        productId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'productId', 'updates']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'create_category', 'Create an ecommerce product category.', objectSchema({
        projectId: stringSchema(),
        name: stringSchema(),
    }, ['projectId', 'name']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'update_price', 'Update product pricing.', objectSchema({
        projectId: stringSchema(),
        productId: stringSchema(),
        price: numberSchema(),
        currency: stringSchema(),
    }, ['projectId', 'productId', 'price']), 'critical', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'update_inventory', 'Update product inventory.', objectSchema({
        projectId: stringSchema(),
        productId: stringSchema(),
        quantity: numberSchema(),
    }, ['projectId', 'productId', 'quantity']), 'critical', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'create_discount', 'Create a discount draft.', objectSchema({
        projectId: stringSchema(),
        discount: objectSchema(),
    }, ['projectId', 'discount']), 'critical', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('ecommerce', 'open_orders', 'Open ecommerce orders.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'low', { mutatesData: false, requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled', previewSupported: false, rollbackSupported: false }),
    action('ecommerce', 'generate_product_copy', 'Generate product copy draft.', objectSchema({
        projectId: stringSchema(),
        productId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId', 'prompt']), 'medium', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),

    action('storefront', 'open_storefront_builder', 'Open Storefront Builder.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'ecommerce', previewSupported: false, rollbackSupported: false }),
    action('storefront', 'add_storefront_section', 'Add a storefront section draft.', objectSchema({
        projectId: stringSchema(),
        sectionType: stringSchema(),
        data: objectSchema(),
    }, ['projectId', 'sectionType']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('storefront', 'edit_storefront_theme', 'Edit storefront theme settings.', objectSchema({
        projectId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'updates']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),
    action('storefront', 'update_product_card_style', 'Update product-card presentation.', objectSchema({
        projectId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'updates']), 'high', { requiredService: 'ecommerce', requiredFeature: 'ecommerceEnabled' }),

    action('crm', 'search_leads', 'Search CRM leads.', objectSchema({
        projectId: stringSchema(),
        query: stringSchema(),
    }, ['query']), 'low', { mutatesData: false, requiredService: 'crm', previewSupported: false, rollbackSupported: false }),
    action('crm', 'create_lead', 'Create a CRM lead draft.', objectSchema({
        projectId: stringSchema(),
        lead: objectSchema({
            name: stringSchema(),
            email: stringSchema(),
        }),
    }, ['lead']), 'high', { requiredService: 'crm' }),
    action('crm', 'update_lead', 'Update a CRM lead.', objectSchema({
        projectId: stringSchema(),
        leadId: stringSchema(),
        updates: objectSchema(),
    }, ['leadId', 'updates']), 'high', { requiredService: 'crm' }),
    action('crm', 'summarize_leads', 'Summarize lead pipeline.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'low', { mutatesData: false, requiredService: 'crm', previewSupported: false, rollbackSupported: false }),
    action('crm', 'create_follow_up_task', 'Create a lead follow-up task.', objectSchema({
        projectId: stringSchema(),
        leadId: stringSchema(),
        task: objectSchema(),
    }, ['leadId', 'task']), 'high', { requiredService: 'crm' }),

    action('emailMarketing', 'create_email_campaign', 'Create an email campaign draft for review.', objectSchema({
        projectId: stringSchema(),
        campaign: objectSchema(),
    }, ['projectId', 'campaign']), 'high', { requiredService: 'emailMarketing', requiredFeature: 'emailMarketing' }),
    action('emailMarketing', 'create_email_automation', 'Create an email automation draft.', objectSchema({
        projectId: stringSchema(),
        automation: objectSchema(),
    }, ['projectId', 'automation']), 'high', { requiredService: 'emailMarketing', requiredFeature: 'emailMarketing' }),
    action('emailMarketing', 'create_audience', 'Create an email audience draft.', objectSchema({
        projectId: stringSchema(),
        audience: objectSchema(),
    }, ['projectId', 'audience']), 'high', { requiredService: 'emailMarketing', requiredFeature: 'emailMarketing' }),
    action('emailMarketing', 'generate_email_copy', 'Generate email copy draft.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId', 'prompt']), 'medium', { requiredService: 'emailMarketing', requiredFeature: 'emailMarketing' }),
    action('emailMarketing', 'open_email_hub', 'Open Email Hub.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'emailMarketing', previewSupported: false, rollbackSupported: false }),
    action('emailMarketing', 'send_email_campaign', 'Send or schedule an email campaign.', objectSchema({
        projectId: stringSchema(),
        campaignId: stringSchema(),
    }, ['projectId', 'campaignId']), 'critical', { requiredService: 'emailMarketing', requiredFeature: 'emailMarketing', rollbackSupported: false }),

    action('appointments', 'create_appointment', 'Create an appointment.', objectSchema({
        projectId: stringSchema(),
        appointment: objectSchema({
            title: stringSchema(),
            startDate: stringSchema(),
            endDate: stringSchema(),
        }, ['title', 'startDate']),
    }, ['projectId', 'appointment']), 'high', { requiredService: 'appointments' }),
    action('appointments', 'update_appointment', 'Update an appointment.', objectSchema({
        projectId: stringSchema(),
        appointmentId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'appointmentId', 'updates']), 'high', { requiredService: 'appointments' }),
    action('appointments', 'configure_availability', 'Update appointment availability settings.', objectSchema({
        projectId: stringSchema(),
        availability: objectSchema(),
    }, ['projectId', 'availability']), 'critical', { requiredService: 'appointments' }),
    action('appointments', 'open_calendar', 'Open appointments calendar.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'appointments', previewSupported: false, rollbackSupported: false }),

    action('restaurants', 'create_menu_item', 'Create a restaurant menu item draft.', objectSchema({
        projectId: stringSchema(),
        item: objectSchema(),
    }, ['projectId', 'item']), 'high', { requiredService: 'restaurants' }),
    action('restaurants', 'update_menu', 'Update restaurant menu data.', objectSchema({
        projectId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'updates']), 'high', { requiredService: 'restaurants' }),
    action('restaurants', 'create_reservation_flow', 'Create or update restaurant reservation flow.', objectSchema({
        projectId: stringSchema(),
        flow: objectSchema(),
    }, ['projectId', 'flow']), 'high', { requiredService: 'restaurants' }),
    action('restaurants', 'create_catering_offer', 'Create a catering offer draft.', objectSchema({
        projectId: stringSchema(),
        offer: objectSchema(),
    }, ['projectId', 'offer']), 'high', { requiredService: 'restaurants' }),
    action('restaurants', 'generate_restaurant_campaign', 'Generate restaurant marketing campaign draft.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId', 'prompt']), 'medium', { requiredService: 'restaurants' }),

    action('realEstate', 'create_listing', 'Create a real estate listing draft.', objectSchema({
        projectId: stringSchema(),
        listing: objectSchema(),
    }, ['projectId', 'listing']), 'high', { requiredService: 'realEstate', requiredFeature: 'realEstateModule' }),
    action('realEstate', 'edit_listing', 'Edit a real estate listing.', objectSchema({
        projectId: stringSchema(),
        listingId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'listingId', 'updates']), 'high', { requiredService: 'realEstate', requiredFeature: 'realEstateModule' }),
    action('realEstate', 'create_open_house', 'Create open house event draft.', objectSchema({
        projectId: stringSchema(),
        listingId: stringSchema(),
        event: objectSchema(),
    }, ['projectId', 'listingId', 'event']), 'high', { requiredService: 'realEstate', requiredFeature: 'realEstateModule' }),
    action('realEstate', 'create_showing_request_flow', 'Create showing request flow.', objectSchema({
        projectId: stringSchema(),
        flow: objectSchema(),
    }, ['projectId', 'flow']), 'high', { requiredService: 'realEstate', requiredFeature: 'realEstateModule' }),
    action('realEstate', 'generate_realty_campaign', 'Generate real estate marketing campaign draft.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId', 'prompt']), 'medium', { requiredService: 'realEstate', requiredFeature: 'realEstateModule' }),

    action('bioPage', 'create_bio_page', 'Create Bio Page draft.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId']), 'high'),
    action('bioPage', 'edit_bio_link', 'Edit a Bio Page link.', objectSchema({
        projectId: stringSchema(),
        linkId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'linkId', 'updates']), 'high'),
    action('bioPage', 'add_bio_block', 'Add a Bio Page block.', objectSchema({
        projectId: stringSchema(),
        blockType: stringSchema(),
        data: objectSchema(),
    }, ['projectId', 'blockType']), 'high'),
    action('bioPage', 'publish_bio_page', 'Publish Bio Page.', objectSchema({
        projectId: stringSchema(),
    }, ['projectId']), 'critical'),

    action('chatbot', 'open_chatbot_dashboard', 'Open ChatCore dashboard.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'chatbot', previewSupported: false, rollbackSupported: false }),
    action('chatbot', 'create_chatbot_knowledge', 'Create ChatCore knowledge draft.', objectSchema({
        projectId: stringSchema(),
        document: objectSchema(),
    }, ['projectId', 'document']), 'high', { requiredService: 'chatbot', requiredFeature: 'chatbotEnabled' }),
    action('chatbot', 'sync_chatbot_knowledge', 'Sync project/module knowledge into ChatCore.', objectSchema({
        projectId: stringSchema(),
        sources: { type: 'array', items: stringSchema() },
    }, ['projectId', 'sources']), 'high', { requiredService: 'chatbot', requiredFeature: 'chatbotEnabled' }),
    action('chatbot', 'test_chatbot', 'Run a ChatCore test prompt.', objectSchema({
        projectId: stringSchema(),
        prompt: stringSchema(),
    }, ['projectId', 'prompt']), 'low', { mutatesData: false, requiredService: 'chatbot', previewSupported: false, rollbackSupported: false }),
    action('chatbot', 'deploy_chatbot_to_surface', 'Deploy ChatCore to a surface.', objectSchema({
        projectId: stringSchema(),
        surface: stringSchema(),
    }, ['projectId', 'surface']), 'critical', { requiredService: 'chatbot', requiredFeature: 'chatbotEnabled' }),

    action('analytics', 'run_project_report', 'Run a project report.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'analytics', previewSupported: false, rollbackSupported: false }),
    action('analytics', 'summarize_analytics', 'Summarize analytics.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'analytics', previewSupported: false, rollbackSupported: false }),
    action('analytics', 'identify_blockers', 'Identify readiness blockers.', objectSchema({ projectId: stringSchema() }, ['projectId']), 'low', { mutatesData: false, requiredService: 'analytics', previewSupported: false, rollbackSupported: false }),
    action('analytics', 'export_report', 'Export analytics report.', objectSchema({ projectId: stringSchema(), format: stringSchema(undefined, ['pdf', 'csv', 'json']) }, ['projectId']), 'medium', { mutatesData: false, requiredService: 'analytics', previewSupported: true, rollbackSupported: false }),

    action('finance', 'create_finance_record', 'Create a finance record draft.', objectSchema({
        projectId: stringSchema(),
        record: objectSchema(),
    }, ['projectId', 'record']), 'high', { requiredService: 'finance' }),
    action('finance', 'update_finance_record', 'Update a finance record.', objectSchema({
        projectId: stringSchema(),
        recordId: stringSchema(),
        updates: objectSchema(),
    }, ['projectId', 'recordId', 'updates']), 'critical', { requiredService: 'finance' }),

    action('admin', 'search_tenants', 'Search tenants in Owner/Super Admin mode.', objectSchema({
        query: stringSchema(),
    }, ['query']), 'low', { mutatesData: false, requiredPermissions: ['assistant:admin:use'], previewSupported: false, rollbackSupported: false }),
    action('admin', 'open_tenant', 'Open a tenant in Super Admin.', objectSchema({
        tenantId: stringSchema(),
    }, ['tenantId']), 'low', { mutatesData: false, requiredPermissions: ['assistant:admin:use'], previewSupported: false, rollbackSupported: false }),
    action('admin', 'update_feature_flag', 'Update a platform feature flag.', objectSchema({
        tenantId: stringSchema(),
        featureFlag: stringSchema(),
        enabled: booleanSchema(),
    }, ['featureFlag', 'enabled']), 'critical', { requiredPermissions: ['assistant:admin:write'] }),
    action('admin', 'update_service_availability', 'Update service availability.', objectSchema({
        serviceId: stringSchema(),
        enabled: booleanSchema(),
    }, ['serviceId', 'enabled']), 'critical', { requiredPermissions: ['assistant:admin:write'] }),
    action('admin', 'update_plan', 'Update tenant plan or billing-facing metadata.', objectSchema({
        tenantId: stringSchema(),
        planId: stringSchema(),
    }, ['tenantId', 'planId']), 'critical', { requiredPermissions: ['assistant:admin:billing'] }),
    action('admin', 'review_ai_logs', 'Review AI/API logs.', objectSchema({ query: stringSchema() }), 'low', { mutatesData: false, requiredPermissions: ['assistant:admin:use'], previewSupported: false, rollbackSupported: false }),
    action('admin', 'review_errors', 'Review platform errors.', objectSchema({ query: stringSchema() }), 'low', { mutatesData: false, requiredPermissions: ['assistant:admin:use'], previewSupported: false, rollbackSupported: false }),
    action('admin', 'manage_global_prompts', 'Update global assistant/chatbot prompts.', objectSchema({
        promptId: stringSchema(),
        updates: objectSchema(),
    }, ['promptId', 'updates']), 'critical', { requiredPermissions: ['assistant:admin:write'] }),
];

export class GlobalAssistantActionRegistry {
    private readonly actions = new Map<string, AssistantActionDefinition>();

    constructor(definitions: AssistantActionDefinition[] = attachDefaultGlobalAssistantActionHandlers(GLOBAL_ASSISTANT_ACTIONS)) {
        definitions.forEach(definition => this.register(definition));
    }

    register(definition: AssistantActionDefinition): void {
        if (this.actions.has(definition.actionType)) {
            throw new Error(`Duplicate assistant action type: ${definition.actionType}`);
        }
        this.actions.set(definition.actionType, definition);
    }

    get(actionType: string): AssistantActionDefinition | undefined {
        return this.actions.get(actionType);
    }

    list(): AssistantActionDefinition[] {
        return Array.from(this.actions.values());
    }

    listByModule(module: AssistantModuleTarget): AssistantActionDefinition[] {
        return this.list().filter(definition => definition.module === module);
    }

    toToolSchemas() {
        return this.list().map(definition => ({
            name: definition.actionType,
            description: definition.description,
            inputSchema: definition.inputSchema,
            safetyLevel: definition.safetyLevel,
            module: definition.module,
        }));
    }
}

export const globalAssistantActionRegistry = new GlobalAssistantActionRegistry();
