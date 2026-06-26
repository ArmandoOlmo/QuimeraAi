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
    create_product: {
        table: 'store_products',
        fallbackName: 'AI product draft',
        createdLabel: 'ecommerce product draft',
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
