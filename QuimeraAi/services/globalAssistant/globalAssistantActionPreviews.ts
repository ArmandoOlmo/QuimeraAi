import type {
    AssistantAction,
    AssistantActionDefinition,
    AssistantExecutionPreview,
} from '../../types/globalAssistant';

const asText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
};

const compactRequestTitle = (request: unknown, fallback: string): string => {
    const text = asText(request).replace(/\s+/g, ' ');
    if (!text) return fallback;
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
};

const draftTarget = (
    table: string,
    action: AssistantAction,
    fallbackName: string,
) => ({
    operation: 'create_review_draft',
    table,
    projectId: action.projectId,
    name: compactRequestTitle(action.input.request, fallbackName),
    status: 'draft',
    generatedByAI: true,
    needsReview: true,
    sourceModule: 'global-assistant',
    sourceComponent: 'OperatingLayer',
    sourceEntityType: 'assistant_action',
    sourceEntityId: action.id,
});

const DRAFT_PREVIEW_BY_ACTION: Record<string, {
    table: string;
    fallbackName: string;
    createdLabel: string;
    risks?: string[];
}> = {
    create_email_campaign: {
        table: 'email_campaigns',
        fallbackName: 'AI email campaign draft',
        createdLabel: 'email campaign draft',
        risks: ['Email remains draft-only and cannot be sent until reviewed.'],
    },
    create_audience: {
        table: 'email_audiences',
        fallbackName: 'AI audience draft',
        createdLabel: 'email audience draft',
    },
    create_email_automation: {
        table: 'email_automations',
        fallbackName: 'AI automation draft',
        createdLabel: 'email automation draft',
        risks: ['Automation remains draft_only and cannot activate until reviewed.'],
    },
    create_lead: {
        table: 'leads',
        fallbackName: 'AI lead draft',
        createdLabel: 'CRM lead draft',
    },
    create_follow_up_task: {
        table: 'lead_tasks',
        fallbackName: 'AI lead follow-up task',
        createdLabel: 'CRM follow-up task',
        risks: ['Task remains reviewable in CRM before being treated as an operator-approved follow-up.'],
    },
    create_product: {
        table: 'store_products',
        fallbackName: 'AI product draft',
        createdLabel: 'ecommerce product draft',
    },
    create_category: {
        table: 'store_categories',
        fallbackName: 'AI category draft',
        createdLabel: 'ecommerce category draft',
    },
    create_discount: {
        table: 'store_discounts',
        fallbackName: 'AI discount draft',
        createdLabel: 'ecommerce discount draft',
        risks: ['Discount remains inactive until reviewed and manually activated.'],
    },
    generate_image: {
        table: 'media_assets',
        fallbackName: 'AI image generation draft',
        createdLabel: 'Media AI image draft',
        risks: ['Creates a reviewable Media AI generation request before the asset is used in a page or module.'],
    },
    edit_image: {
        table: 'media_assets',
        fallbackName: 'AI image edit draft',
        createdLabel: 'Media AI image edit draft',
        risks: ['Creates a reviewable Media AI edit request and does not replace the source asset automatically.'],
    },
    generate_video: {
        table: 'media_assets',
        fallbackName: 'AI video generation draft',
        createdLabel: 'Media AI video draft',
        risks: ['Creates a reviewable Media AI video request before any generated video is used or published.'],
    },
    create_appointment: {
        table: 'project_appointments',
        fallbackName: 'AI appointment draft',
        createdLabel: 'appointment draft',
        risks: ['Appointment creation requires structured start and end date fields.'],
    },
    create_bio_page: {
        table: 'bio_pages',
        fallbackName: 'AI Bio Page draft',
        createdLabel: 'Bio Page draft',
    },
    add_bio_block: {
        table: 'bio_page_blocks',
        fallbackName: 'AI Bio Page block draft',
        createdLabel: 'Bio Page block draft',
        risks: ['Bio Page block creation requires a structured blockType before apply.'],
    },
    create_finance_record: {
        table: 'accounting_invoices',
        fallbackName: 'AI finance invoice draft',
        createdLabel: 'finance invoice draft',
        risks: ['Finance record remains an invoice draft and does not create payments or ledger entries.'],
    },
    create_menu_item: {
        table: 'restaurant_menu_items',
        fallbackName: 'AI restaurant menu item draft',
        createdLabel: 'restaurant menu item draft',
        risks: ['Menu item is created unavailable until reviewed.'],
    },
    create_catering_offer: {
        table: 'restaurant_marketing_outputs',
        fallbackName: 'AI catering offer draft',
        createdLabel: 'restaurant catering offer draft',
    },
    generate_restaurant_campaign: {
        table: 'restaurant_marketing_outputs',
        fallbackName: 'AI restaurant campaign draft',
        createdLabel: 'restaurant campaign draft',
    },
    create_listing: {
        table: 'properties',
        fallbackName: 'AI real estate listing draft',
        createdLabel: 'real estate listing draft',
        risks: ['Listing is created as draft with public access disabled.'],
    },
    create_open_house: {
        table: 'property_open_houses',
        fallbackName: 'AI open house draft',
        createdLabel: 'real estate open house draft',
        risks: ['Open house creation requires structured start time and listing id before apply.'],
    },
    generate_realty_campaign: {
        table: 'property_campaigns',
        fallbackName: 'AI realty campaign draft',
        createdLabel: 'real estate campaign draft',
    },
};

export function enrichAssistantExecutionPreview(
    preview: AssistantExecutionPreview,
    action: AssistantAction,
    definition: AssistantActionDefinition,
): AssistantExecutionPreview {
    if (action.actionType === 'update_project_metadata') {
        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: 'metadata',
            },
            after: {
                operation: 'update_project_metadata',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                request: compactRequestTitle(action.input.request, 'Project metadata update'),
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`projects.${action.projectId}.metadata`],
                mirrored: ['projects.$current.data.name/status/description/category/tags'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_metadata' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Project metadata is updated in the projects row and mirrored into projects.data for renderer compatibility.',
                ...(definition.rollbackSupported ? ['Rollback restores previous project metadata columns.'] : []),
            ],
        };
    }

    if (['edit_website_section', 'update_section_copy', 'reorder_sections', 'toggle_section_visibility'].includes(action.actionType)) {
        const sectionId = asText(action.input.sectionId) || '$selected_section';
        const path = asText(action.input.path);
        const target = action.actionType === 'reorder_sections'
            ? 'component_order'
            : action.actionType === 'toggle_section_visibility'
                ? `section_visibility.${sectionId}`
                : `data.${sectionId}${path ? `.${path}` : ''}`;

        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: target,
            },
            after: {
                operation: 'update_project_website_snapshot',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                path: target,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                generatedByAI: true,
                needsReview: true,
            },
            diff: {
                updated: [`projects.${action.projectId}.${target}`],
                synced: ['projects.$current.data.businessBlueprint.websiteBlueprint'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_website_columns' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Website Builder state and BusinessBlueprint website state are synced from the same project snapshot.',
                ...(definition.rollbackSupported ? ['Rollback restores previous website project columns.'] : []),
            ],
        };
    }

    if (action.actionType === 'publish_website' || action.actionType === 'unpublish_website') {
        const isPublish = action.actionType === 'publish_website';
        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: 'publish_state',
                status: isPublish ? 'Draft' : 'Published',
            },
            after: {
                operation: isPublish ? 'publish_website' : 'unpublish_website',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                status: isPublish ? 'Published' : 'Draft',
                publishedData: isPublish ? 'snapshot_from_current_project_state' : null,
                request: compactRequestTitle(action.input.request, isPublish ? 'Website publish' : 'Website unpublish'),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [
                    `projects.${action.projectId}.published_data`,
                    `projects.${action.projectId}.published_at`,
                    `projects.${action.projectId}.status`,
                ],
                critical: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_publish_state' : 'not_available',
            },
            risks: [
                ...preview.risks,
                isPublish
                    ? 'Publishing exposes the current Website Builder snapshot publicly after confirmation.'
                    : 'Unpublishing removes the public website snapshot after confirmation.',
                'Publish is blocked if Global Assistant drafts still need review.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project publish state.'] : []),
            ],
        };
    }

    if (['update_section_image', 'attach_asset_to_section'].includes(action.actionType)) {
        const sectionId = asText(action.input.sectionId) || '$selected_section';
        const path = asText(action.input.path) || 'imageUrl';
        const assetId = asText(action.input.assetId) || '$selected_media_asset';
        const target = `data.${sectionId}.${path}`;

        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: target,
                currentAsset: 'preserve_until_apply',
            },
            after: {
                operation: 'attach_media_asset_to_section',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                sectionId,
                assetId,
                path: target,
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`projects.${action.projectId}.${target}`],
                attached: [`media_assets.${assetId}`],
                synced: ['projects.$current.data.businessBlueprint.websiteBlueprint'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_website_columns' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Attaches an existing Media AI asset to a Website Builder section; it does not publish the website automatically.',
                ...(definition.rollbackSupported ? ['Rollback restores previous website project columns.'] : []),
            ],
        };
    }

    if (['add_storefront_section', 'edit_storefront_theme', 'update_product_card_style'].includes(action.actionType)) {
        const sectionType = asText(action.input.sectionType) || asText(action.input.section_type);
        const target = action.actionType === 'edit_storefront_theme'
            ? 'data.storefrontEditor.draft.themeSettings'
            : action.actionType === 'update_product_card_style'
                ? 'data.storefrontEditor.draft.sectionSettings.productCards'
                : `data.storefrontEditor.draft.sections.${sectionType || '$section'}`;

        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: target,
            },
            after: {
                operation: 'update_storefront_draft',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                path: target,
                templateState: 'draft',
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`projects.${action.projectId}.${target}`],
                synced: ['projects.$current.data.businessBlueprint.storefrontBlueprint'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_storefront_columns' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Storefront Builder changes remain draft-only and do not publish to public_stores.',
                ...(definition.rollbackSupported ? ['Rollback restores previous project storefront columns.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_lead') {
        const leadId = asText(action.input.leadId) || asText(action.input.lead_id) || '$active_lead';
        return {
            ...preview,
            before: {
                table: 'leads',
                id: leadId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_project_scoped_row',
                table: 'leads',
                id: leadId,
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                needsReview: true,
            },
            diff: {
                updated: [`leads.${leadId}`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_lead_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Updates one project-scoped CRM lead and records Global Assistant metadata.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous lead row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'generate_email_copy') {
        const campaignId = asText(action.input.campaignId) || asText(action.input.campaign_id);
        const hasCampaignTarget = Boolean(campaignId);
        return {
            ...preview,
            before: hasCampaignTarget
                ? {
                    table: 'email_campaigns',
                    id: campaignId,
                    projectId: action.projectId,
                }
                : {
                    exists: false,
                    table: 'email_campaigns',
                    projectId: action.projectId,
                },
            after: hasCampaignTarget
                ? {
                    operation: 'update_project_scoped_row',
                    table: 'email_campaigns',
                    id: campaignId,
                    projectId: action.projectId,
                    status: 'draft',
                    generatedByAI: true,
                    needsReview: true,
                    noAutoSend: true,
                    sourceModule: 'global-assistant',
                    sourceComponent: 'OperatingLayer',
                    sourceEntityType: 'assistant_action',
                    sourceEntityId: action.id,
                }
                : draftTarget('email_campaigns', action, 'AI email copy draft'),
            diff: hasCampaignTarget
                ? {
                    updated: [
                        `email_campaigns.${campaignId}.subject`,
                        `email_campaigns.${campaignId}.preview_text`,
                        `email_campaigns.${campaignId}.html_content`,
                        `email_campaigns.${campaignId}.email_document`,
                    ],
                    reviewRequired: true,
                    noAutoSend: true,
                    rollback: definition.rollbackSupported ? 'restore_previous_email_campaign_snapshot' : 'not_available',
                }
                : {
                    created: ['email_campaigns.$pending'],
                    reviewRequired: true,
                    noAutoSend: true,
                    rollback: definition.rollbackSupported ? 'delete_created_email_copy_draft' : 'not_available',
                },
            risks: [
                ...preview.risks,
                'Generated email copy remains draft-only and cannot be sent until reviewed.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous campaign or deletes the created draft.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_appointment') {
        const appointmentId = asText(action.input.appointmentId) || asText(action.input.appointment_id) || '$active_appointment';
        return {
            ...preview,
            before: {
                table: 'project_appointments',
                id: appointmentId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_project_scoped_row',
                table: 'project_appointments',
                id: appointmentId,
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                generatedByAI: true,
                needsReview: true,
            },
            diff: {
                updated: [`project_appointments.${appointmentId}`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_appointment_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Updates one project-scoped appointment and records Global Assistant metadata.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous appointment row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'configure_availability') {
        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: 'data.businessBlueprint.appointmentsBlueprint.availability',
            },
            after: {
                operation: 'update_business_blueprint_availability',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                path: 'data.businessBlueprint.appointmentsBlueprint.availability',
                availabilityStatus: 'draft',
                needsReview: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`projects.${action.projectId}.data.businessBlueprint.appointmentsBlueprint.availability`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_data' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Availability changes remain in BusinessBlueprint draft/review state before public booking relies on them.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project data snapshot.'] : []),
            ],
        };
    }

    if (['edit_product', 'update_price', 'update_inventory', 'generate_product_copy'].includes(action.actionType)) {
        const productId = asText(action.input.productId) || asText(action.input.product_id) || '$active_product';
        const operation = action.actionType === 'generate_product_copy'
            ? 'create_review_draft'
            : 'update_project_scoped_row';
        return {
            ...preview,
            before: {
                table: 'store_products',
                id: productId,
                projectId: action.projectId,
            },
            after: {
                operation,
                table: 'store_products',
                id: productId,
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                generatedByAI: action.actionType === 'generate_product_copy',
                needsReview: true,
            },
            diff: {
                updated: [`store_products.${productId}`],
                reviewRequired: action.actionType !== 'update_price' && action.actionType !== 'update_inventory',
                rollback: definition.rollbackSupported ? 'restore_previous_product_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                ...(action.actionType === 'update_price' || action.actionType === 'update_inventory'
                    ? ['This changes live ecommerce data after confirmation.']
                    : ['Changes remain traceable to the Global Assistant action and can be rolled back.']),
                ...(definition.rollbackSupported ? ['Rollback restores the previous product row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_menu') {
        const itemId = asText(action.input.itemId) || asText(action.input.menuItemId) || '$active_menu_item';
        return {
            ...preview,
            before: {
                table: 'restaurant_menu_items',
                id: itemId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_restaurant_menu_item',
                table: 'restaurant_menu_items',
                id: itemId,
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                needsReview: true,
            },
            diff: {
                updated: [`restaurant_menu_items.${itemId}`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_restaurant_menu_item_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'This updates an existing restaurant menu item after confirmation.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous menu item row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'create_reservation_flow') {
        return {
            ...preview,
            before: {
                table: 'restaurants',
                projectId: action.projectId,
                path: 'reservation settings',
            },
            after: {
                operation: 'update_restaurant_reservation_flow',
                table: 'restaurants',
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                needsReview: true,
                noAutoConfirm: true,
            },
            diff: {
                updated: ['restaurants.$current.reservation_enabled', 'restaurants.$current.reservation_interval', 'restaurants.$current.max_party_size'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_restaurant_settings_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Reservation settings change only after confirmation; confirmation mode remains manual by default.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous restaurant settings row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'edit_listing') {
        const listingId = asText(action.input.listingId) || asText(action.input.propertyId) || '$active_listing';
        return {
            ...preview,
            before: {
                table: 'properties',
                id: listingId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_realty_listing',
                table: 'properties',
                id: listingId,
                projectId: action.projectId,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                needsReview: true,
                noAutoPublish: true,
            },
            diff: {
                updated: [`properties.${listingId}`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_realty_listing_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Realty listing edits carry Global Assistant review metadata and do not auto-publish.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous Realty listing row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'create_showing_request_flow') {
        return {
            ...preview,
            before: {
                table: 'projects',
                id: action.projectId,
                path: 'data.businessBlueprint.realEstateBlueprint.showingRequests',
            },
            after: {
                operation: 'update_realty_showing_request_flow',
                table: 'projects',
                id: action.projectId,
                projectId: action.projectId,
                path: 'data.businessBlueprint.realEstateBlueprint.showingRequests',
                status: 'needs_review',
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                noAutoPublish: true,
            },
            diff: {
                updated: [
                    `projects.${action.projectId}.data.businessBlueprint.realEstateBlueprint.showingRequests`,
                    `projects.${action.projectId}.data.businessBlueprint.realEstateBlueprint.leadFunnels`,
                    `projects.${action.projectId}.data.businessBlueprint.realEstateBlueprint.propertyPages`,
                ],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_data' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Showing request flow remains review-gated in the Realty BusinessBlueprint before public automation.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project blueprint snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'create_chatbot_knowledge' || action.actionType === 'sync_chatbot_knowledge') {
        return {
            ...preview,
            before: {
                table: 'projects',
                path: 'data.businessBlueprint.chatbotBlueprint.knowledgeSources',
            },
            after: {
                operation: 'update_review_draft',
                table: 'projects',
                path: 'data.businessBlueprint.chatbotBlueprint.knowledgeSources',
                projectId: action.projectId,
                name: compactRequestTitle(action.input.request, 'Global Assistant ChatCore knowledge'),
                status: 'needs_review',
                generatedByAI: true,
                needsReview: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: ['projects.$current.data.businessBlueprint.chatbotBlueprint.knowledgeSources'],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_data' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'ChatCore knowledge remains review-gated before it is used for training or deployment.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project blueprint snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'test_chatbot') {
        return {
            ...preview,
            before: {
                table: 'projects',
                path: 'data.businessBlueprint.chatbotBlueprint.testing',
                projectId: action.projectId,
            },
            after: {
                operation: 'run_chatcore_test_lab',
                table: 'projects',
                path: 'data.businessBlueprint.chatbotBlueprint.testing',
                projectId: action.projectId,
                prompt: compactRequestTitle(action.input.prompt || action.input.request, 'ChatCore Test Lab run'),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                auditTable: 'chatbot_engine_events',
            },
            diff: {
                updated: [
                    'projects.$current.data.businessBlueprint.chatbotBlueprint.testing',
                    'projects.$current.data.businessBlueprint.chatbotBlueprint.metadata',
                    'chatbot_engine_events.$pending',
                ],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_project_data' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'This runs the project-scoped ChatCore Test Lab and records audit evidence without creating visitor conversations.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project blueprint snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'deploy_chatbot_to_surface') {
        const surface = asText(action.input.surface) || '$surface';
        const status = asText(action.input.status) || 'deployed';
        return {
            ...preview,
            before: {
                table: 'projects',
                path: `data.businessBlueprint.chatbotBlueprint.channels.${surface}`,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_chatcore_surface_deployment',
                table: 'projects',
                path: `data.businessBlueprint.chatbotBlueprint.channels.${surface}`,
                projectId: action.projectId,
                surface,
                status,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                auditTable: 'chatbot_engine_events',
            },
            diff: {
                updated: [
                    `projects.$current.data.businessBlueprint.chatbotBlueprint.channels.${surface}`,
                    'projects.$current.data.businessBlueprint.chatbotBlueprint.deployment',
                    'chatbot_engine_events.$pending',
                ],
                critical: status === 'deployed',
                reviewRequired: status !== 'deployed',
                rollback: definition.rollbackSupported ? 'restore_previous_project_data' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'This changes where the project ChatCore can run; public surfaces require explicit confirmation.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous project blueprint snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'edit_bio_link') {
        const linkId = asText(action.input.linkId) || '$selected_link';
        return {
            ...preview,
            before: {
                table: 'bio_page_links',
                id: linkId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_bio_page_link',
                table: 'bio_page_links',
                id: linkId,
                projectId: action.projectId,
                request: compactRequestTitle(action.input.request, 'Bio Page link update'),
                generatedByAI: true,
                needsReview: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`bio_page_links.${linkId}`],
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'restore_previous_bio_page_link_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Bio Page link updates remain review-gated before the public page should be published.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous Bio Page link row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'publish_bio_page') {
        const bioPageId = asText(action.input.bioPageId) || '$project_bio_page';
        return {
            ...preview,
            before: {
                table: 'bio_pages',
                id: bioPageId,
                projectId: action.projectId,
                status: 'draft',
            },
            after: {
                operation: 'publish_bio_page',
                table: 'bio_pages',
                id: bioPageId,
                projectId: action.projectId,
                status: 'published',
                request: compactRequestTitle(action.input.request, 'Bio Page publish'),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`bio_pages.${bioPageId}.status`, `bio_pages.${bioPageId}.published_at`],
                critical: true,
                rollback: definition.rollbackSupported ? 'restore_previous_bio_page_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Publishing exposes the Bio Page publicly after confirmation.',
                'Publish is blocked if the Bio Page, links, or blocks still need review or use unsafe URLs.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous Bio Page row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_finance_record') {
        const recordId = asText(action.input.recordId)
            || asText(action.input.invoiceId)
            || '$selected_invoice';
        return {
            ...preview,
            before: {
                table: 'accounting_invoices',
                id: recordId,
                projectId: action.projectId,
            },
            after: {
                operation: 'update_finance_invoice',
                table: 'accounting_invoices',
                id: recordId,
                projectId: action.projectId,
                request: compactRequestTitle(action.input.request, 'Finance invoice update'),
                generatedByAI: true,
                needsReview: true,
                noAutoCharge: true,
                noLedgerEntry: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`accounting_invoices.${recordId}`],
                critical: true,
                reviewRequired: true,
                noAutoCharge: true,
                noLedgerEntry: true,
                rollback: definition.rollbackSupported ? 'restore_previous_finance_invoice_snapshot' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Finance invoice update changes accounting data only after confirmation.',
                'This action does not create Stripe payment intents, payments, or ledger entries automatically.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous invoice row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_feature_flag') {
        const tenantId = asText(action.input.tenantId) || asText(action.input.tenant_id) || '$target_tenant';
        const featureFlag = asText(action.input.featureFlag) || asText(action.input.feature_flag) || '$feature_flag';
        return {
            ...preview,
            before: {
                table: 'tenants',
                id: tenantId,
                path: 'settings.enabledFeatures',
            },
            after: {
                operation: 'update_tenant_feature_flag',
                table: 'tenants',
                id: tenantId,
                featureFlag,
                enabled: action.input.enabled !== false,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`tenants.${tenantId}.settings.enabledFeatures`],
                critical: true,
                rollback: definition.rollbackSupported ? 'restore_previous_tenant_settings' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Changes tenant feature access after confirmation.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous tenant settings row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_service_availability') {
        const serviceId = asText(action.input.serviceId) || asText(action.input.service_id) || '$service';
        const status = asText(action.input.status) || asText(action.input.newStatus) || (action.input.enabled === false ? 'not_public' : 'public');
        return {
            ...preview,
            before: {
                table: 'settings',
                id: 'serviceAvailability',
                path: `config.services.${serviceId}`,
            },
            after: {
                operation: 'update_service_availability',
                table: 'settings',
                id: 'serviceAvailability',
                serviceId,
                status,
                auditTable: 'service_audit_logs',
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`settings.serviceAvailability.config.services.${serviceId}.status`],
                auditLogged: ['service_audit_logs.$pending'],
                critical: true,
                rollback: definition.rollbackSupported ? 'restore_previous_service_availability' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Changes global platform service visibility after confirmation.',
                'Audit log is append-only; rollback restores availability config but does not erase audit evidence.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous service availability settings row.'] : []),
            ],
        };
    }

    if (action.actionType === 'update_plan') {
        const tenantId = asText(action.input.tenantId) || asText(action.input.tenant_id) || '$target_tenant';
        const planId = asText(action.input.planId) || asText(action.input.plan_id) || '$plan';
        return {
            ...preview,
            before: {
                table: 'tenants',
                id: tenantId,
                path: 'subscription_plan/limits/billing_info',
            },
            after: {
                operation: 'update_tenant_plan_metadata',
                table: 'tenants',
                id: tenantId,
                planId,
                noStripeMutation: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`tenants.${tenantId}.subscription_plan`, `tenants.${tenantId}.limits`, `tenants.${tenantId}.billing_info`],
                critical: true,
                noStripeMutation: true,
                rollback: definition.rollbackSupported ? 'restore_previous_tenant_plan' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Updates Quimera tenant plan metadata only; it does not create, cancel, or charge Stripe subscriptions.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous tenant plan row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'manage_global_prompts') {
        const promptId = asText(action.input.promptId) || asText(action.input.prompt_id) || 'global_assistant';
        return {
            ...preview,
            before: {
                table: 'settings',
                id: promptId,
                path: 'config',
            },
            after: {
                operation: 'update_global_prompt_settings',
                table: 'settings',
                id: promptId,
                updatedKeys: Object.keys(action.input.updates && typeof action.input.updates === 'object' ? action.input.updates : {}),
                chatCoreVisitorMemoryAffected: false,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                updated: [`settings.${promptId}.config`],
                critical: true,
                chatCoreVisitorMemoryAffected: false,
                rollback: definition.rollbackSupported ? 'restore_previous_global_prompt_settings' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'Updates global prompt configuration only after confirmation.',
                'ChatCore visitor conversations and visitor memory are not modified by this admin prompt action.',
                ...(definition.rollbackSupported ? ['Rollback restores the previous settings row snapshot.'] : []),
            ],
        };
    }

    if (action.actionType === 'review_ai_logs' || action.actionType === 'review_errors') {
        const isErrors = action.actionType === 'review_errors';
        return {
            ...preview,
            before: {
                table: 'api_logs',
                operation: 'read',
            },
            after: {
                operation: isErrors ? 'review_platform_errors' : 'review_ai_logs',
                table: 'api_logs',
                query: compactRequestTitle(action.input.query || action.input.request, isErrors ? 'Error review' : 'AI log review'),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                reviewed: ['api_logs'],
                mutatesData: false,
                rollback: 'not_required',
            },
            risks: [
                ...preview.risks,
                'Read-only review of API logs; no tenant, project, or billing data is mutated.',
            ],
        };
    }

    if (action.actionType === 'transfer_agency_project') {
        const sourceProjectId = asText(action.input.projectId || action.input.sourceProjectId || action.projectId);
        const targetClientTenantId = asText(action.input.targetClientTenantId || action.input.clientTenantId);
        const projectName = asText(action.input.projectName);

        return {
            ...preview,
            before: {
                sourceProjectId,
                targetClientTenantId,
                existingTargetProject: false,
            },
            after: {
                operation: 'agency_project_transfer',
                functionName: 'onboarding-api',
                sourceProjectId,
                targetClientTenantId,
                projectName: projectName || undefined,
                copiedAsDraft: true,
                published: false,
                approvalRequested: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                created: [
                    'projects.$pending',
                    'agency_project_transfers.$pending',
                    'agency_client_approvals.$pending',
                    'agency_activity.$pending',
                ],
                createdLabel: 'agency project transfer draft',
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'delete_created_transfer' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'The target client receives a draft copy only; nothing is published automatically.',
                'Client approval is requested through Agency Client Portal before client-facing acceptance.',
                'Rollback is not automatic because transfer cleanup can span projects, approvals, activity, and client usage counts.',
            ],
        };
    }

    if (action.actionType === 'create_agency_client') {
        const businessName = compactRequestTitle(action.input.businessName, 'Agency client');
        const selectedPlanId = asText(action.input.selectedPlanId) || 'default_agency_service_plan';
        const setupBilling = action.input.setupBilling === true || Boolean(asText(action.input.monthlyPrice));

        return {
            ...preview,
            before: {
                clientExists: false,
                selectedPlanId,
            },
            after: {
                operation: 'agency_client_auto_provision',
                functionName: 'onboarding-api',
                businessName,
                selectedPlanId,
                tenantType: 'agency_client',
                projectStatus: 'Draft',
                businessBlueprintStatus: 'needs_review',
                setupBilling,
                noAutoPublish: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
            },
            diff: {
                created: [
                    'tenants.$pending',
                    'projects.$pending',
                    'agency_clients.$pending',
                    'tenant_modules.$pending',
                    'project_modules.$pending',
                    'tenant_invites.$pending',
                    'agency_activity.$pending',
                ],
                createdLabel: 'agency client workspace draft',
                selectedPlanId,
                reviewRequired: true,
                rollback: definition.rollbackSupported ? 'delete_created_client_workspace' : 'not_available',
            },
            risks: [
                ...preview.risks,
                'The client workspace and initial project are created as draft/needs-review assets.',
                'BusinessBlueprint and module activations are prepared, but public publishing and live runtime activation remain off.',
                'Billing is stored as agency-managed pending setup or included in parent; no Stripe checkout is created by this action.',
                'Rollback is not automatic because provisioning spans tenant, project, module activation, invite, relationship, and activity records.',
            ],
        };
    }

    const draft = DRAFT_PREVIEW_BY_ACTION[action.actionType];
    if (!draft) return preview;

    const created = `${draft.table}.$pending`;

    return {
        ...preview,
        before: {
            exists: false,
            table: draft.table,
        },
        after: draftTarget(draft.table, action, draft.fallbackName),
        diff: {
            created: [created],
            createdLabel: draft.createdLabel,
            reviewRequired: true,
            rollback: definition.rollbackSupported ? 'delete_created_draft' : 'not_available',
        },
        risks: [
            ...preview.risks,
            ...(draft.risks || []),
            ...(definition.rollbackSupported ? ['Rollback will delete only the draft created by this action.'] : []),
        ],
    };
}
