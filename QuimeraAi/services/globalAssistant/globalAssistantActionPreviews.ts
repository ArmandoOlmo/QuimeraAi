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
