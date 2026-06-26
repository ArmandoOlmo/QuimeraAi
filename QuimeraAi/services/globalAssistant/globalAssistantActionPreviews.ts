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
};

export function enrichAssistantExecutionPreview(
    preview: AssistantExecutionPreview,
    action: AssistantAction,
    definition: AssistantActionDefinition,
): AssistantExecutionPreview {
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

