import { supabase as defaultSupabase } from '../../supabase';
import type {
    AssistantAction,
    AssistantActionDefinition,
    AssistantContextSnapshot,
    AssistantRollbackSnapshot,
} from '../../types/globalAssistant';
import { createAppointmentCanonical } from '../appointments/appointmentEngineService';
import { createAudience } from '../email/emailAudienceService';
import { createAutomationDraft } from '../email/emailAutomationService';
import { createCampaignDraft } from '../email/emailCampaignService';

type SupabaseClientLike = {
    from: (table: string) => any;
};

type HandlerPatch = Pick<AssistantActionDefinition, 'validate' | 'execute' | 'rollback'>;

export interface GlobalAssistantActionHandlerDependencies {
    supabase?: SupabaseClientLike;
    now?: () => string;
    createId?: (prefix: string) => string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const readString = (value: unknown): string | undefined => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || undefined;
};

const readNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const titleFromRequest = (request: string | undefined, fallback: string): string => {
    if (!request) return fallback;
    const trimmed = request.replace(/\s+/g, ' ').trim();
    if (!trimmed) return fallback;
    return trimmed.length > 72 ? `${trimmed.slice(0, 69)}...` : trimmed;
};

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'draft';

const createId = (prefix: string): string => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

const getClient = (deps: GlobalAssistantActionHandlerDependencies): SupabaseClientLike =>
    deps.supabase || defaultSupabase;

const getNow = (deps: GlobalAssistantActionHandlerDependencies): string =>
    deps.now ? deps.now() : new Date().toISOString();

const getProjectId = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const projectId = readString(input.projectId) || action.projectId || context?.project.projectId || '';
    if (!projectId) throw new Error('projectId is required before applying this assistant action.');
    return projectId;
};

const getTenantId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string | null =>
    action.tenantId || context?.tenant.tenantId || context?.project.tenantId || null;

const buildBaseMetadata = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => ({
    ...(asRecord(input.metadata)),
    globalAssistant: {
        taskId: action.taskId || null,
        actionId: action.id,
        actionType: action.actionType,
        module: action.module,
        request: readString(input.request) || '',
        contextSnapshotId: context?.id || null,
        generatedByAI: true,
        needsReview: true,
    },
});

const selectSingle = async (builder: any) => {
    const selected = typeof builder.select === 'function' ? builder.select('*') : builder;
    if (typeof selected.maybeSingle === 'function') return selected.maybeSingle();
    if (typeof selected.single === 'function') return selected.single();
    return selected;
};

const insertRow = async (
    client: SupabaseClientLike,
    table: string,
    row: Record<string, unknown>,
) => {
    const result = await selectSingle(client.from(table).insert(row));
    if (result?.error) throw result.error;
    return result?.data || row;
};

const deleteRowById = async (
    client: SupabaseClientLike,
    table: string,
    id: string,
) => {
    const result = await client.from(table).delete().eq('id', id);
    if (result?.error) throw result.error;
    return { deleted: true, table, id };
};

const getSnapshotRowId = (
    snapshot: AssistantRollbackSnapshot,
    keys: string[] = ['id'],
): string | null => {
    const after = asRecord(snapshot.afterSnapshot);
    for (const key of keys) {
        const value = readString(after[key]);
        if (value) return value;
    }
    const row = asRecord(after.row);
    for (const key of keys) {
        const value = readString(row[key]);
        if (value) return value;
    }
    return null;
};

const rollbackCreatedRow = (
    table: string,
    deps: GlobalAssistantActionHandlerDependencies,
    idKeys: string[] = ['id'],
): HandlerPatch['rollback'] => async (_input, { snapshot }) => {
    const id = getSnapshotRowId(snapshot, idKeys);
    if (!id) throw new Error(`Cannot rollback ${table}: created row id was not recorded.`);
    const result = await deleteRowById(getClient(deps), table, id);
    return {
        afterSnapshot: {
            ...snapshot.beforeSnapshot,
            rollback: result,
        },
        diff: {
            deleted: [`${table}.${id}`],
        },
    };
};

const requireObject = (input: Record<string, unknown>, key: string): Record<string, unknown> =>
    asRecord(input[key]);

const noValidationErrors = () => ({ valid: true, errors: [] });

const createEmailCampaignHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const campaign = requireObject(input, 'campaign');
        const request = readString(input.request);
        const subject = readString(campaign.subject) || titleFromRequest(request, 'AI email campaign draft');
        const row = await createCampaignDraft({
            supabase: client,
            projectId,
            userId: action.userId,
            campaign: {
                ...campaign,
                name: readString(campaign.name) || subject,
                subject,
                previewText: readString(campaign.previewText) || readString(campaign.preview_text) || titleFromRequest(request, ''),
                htmlContent: readString(campaign.htmlContent) || readString(campaign.html_content) || (request ? `<p>${escapeHtml(request)}</p>` : ''),
                type: readString(campaign.type) || 'module_generated',
                audienceType: readString(campaign.audienceType) || readString(campaign.audience_type) || 'custom',
                tags: [...asArray(campaign.tags).map(String), 'global-assistant'],
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_email_campaign',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:email-campaign`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_campaigns', id, row },
            diff: { created: [`email_campaigns.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_campaigns', deps),
});

const createEmailAudienceHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const audience = requireObject(input, 'audience');
        const request = readString(input.request);
        const row = await createAudience({
            supabase: client,
            projectId,
            userId: action.userId,
            audience: {
                ...audience,
                name: readString(audience.name) || titleFromRequest(request, 'AI audience draft'),
                description: readString(audience.description) || request || null,
                tags: [...asArray(audience.tags).map(String), 'global-assistant'],
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_audience',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:audience`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_audiences', id, row },
            diff: { created: [`email_audiences.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_audiences', deps),
});

const createEmailAutomationHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const automation = requireObject(input, 'automation');
        const request = readString(input.request);
        const name = readString(automation.name) || titleFromRequest(request, 'AI automation draft');
        const row = await createAutomationDraft({
            supabase: client,
            projectId,
            userId: action.userId,
            automation: {
                ...automation,
                name,
                description: readString(automation.description) || request || null,
                subject: readString(automation.subject) || name,
                type: readString(automation.type) || 'welcome',
                category: readString(automation.category) || 'lifecycle',
                steps: asArray(automation.steps),
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                sendMode: 'draft_only',
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEvent: 'create_email_automation',
                sourceEntityType: 'assistant_action',
                sourceEntityId: action.id,
                correlationId: action.id,
                idempotencyKey: `global-assistant:${action.id}:automation`,
                metadata: buildBaseMetadata(input, action, context),
            },
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'email_automations', id, row },
            diff: { created: [`email_automations.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('email_automations', deps),
});

const createLeadHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const lead = requireObject(input, 'lead');
        const request = readString(input.request);
        const now = getNow(deps);
        const name = readString(lead.name) || titleFromRequest(request, 'AI lead draft');
        const row = await insertRow(client, 'leads', {
            tenant_id: tenantId,
            project_id: projectId,
            name,
            email: readString(lead.email) || '',
            phone: readString(lead.phone) || null,
            company: readString(lead.company) || null,
            source: 'quimera-chat',
            status: readString(lead.status) || 'new',
            value: readNumber(lead.value) ?? 0,
            notes: readString(lead.notes) || request || '',
            tags: [...asArray(lead.tags).map(String), 'global-assistant'],
            custom_data: {
                ...asRecord(lead.customData || lead.custom_data),
                ...buildBaseMetadata(input, action, context),
                needsReview: true,
            },
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'leads', id, row },
            diff: { created: [`leads.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('leads', deps),
});

const createProductHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const product = requireObject(input, 'product');
        const request = readString(input.request);
        const now = getNow(deps);
        const name = readString(product.name) || titleFromRequest(request, 'AI product draft');
        const id = readString(product.id) || (deps.createId || createId)('prod');
        const data = {
            ...product,
            id,
            project_id: projectId,
            store_id: projectId,
            name,
            slug: readString(product.slug) || slugify(name),
            description: readString(product.description) || request || '',
            price: readNumber(product.price) ?? 0,
            quantity: readNumber(product.quantity) ?? 0,
            trackInventory: product.trackInventory !== false,
            images: asArray(product.images),
            status: 'draft',
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            metadata: buildBaseMetadata(input, action, context),
            createdAt: now,
            updatedAt: now,
        };
        const row = await insertRow(client, 'store_products', {
            id,
            store_id: projectId,
            project_id: projectId,
            data,
            created_at: now,
            updated_at: now,
        });
        return {
            afterSnapshot: { table: 'store_products', id, row },
            diff: { created: [`store_products.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('store_products', deps),
});

const createAppointmentHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const appointment = requireObject(input, 'appointment');
        const errors = [
            ...(!readString(appointment.startDate) && !readString(appointment.start_date) ? ['appointment.startDate is required before apply.'] : []),
            ...(!readString(appointment.endDate) && !readString(appointment.end_date) ? ['appointment.endDate is required before apply.'] : []),
        ];
        return { valid: errors.length === 0, errors };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const appointment = requireObject(input, 'appointment');
        const request = readString(input.request);
        const result = await createAppointmentCanonical(client as any, {
            ...appointment,
            projectId,
            tenantId: getTenantId(action, context),
            title: readString(appointment.title) || titleFromRequest(request, 'AI appointment draft'),
            description: readString(appointment.description) || request || '',
            startDate: readString(appointment.startDate) || readString(appointment.start_date) || '',
            endDate: readString(appointment.endDate) || readString(appointment.end_date) || '',
            organizerId: action.userId,
            createdBy: action.userId,
            updatedBy: action.userId,
            source: 'dashboard',
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            generatedByAI: true,
            needsReview: true,
            createOrLinkLead: false,
            idempotencyKey: `global-assistant:${action.id}:appointment`,
            correlationId: action.id,
            metadata: buildBaseMetadata(input, action, context),
        });
        return {
            afterSnapshot: {
                table: 'project_appointments',
                id: result.appointmentId,
                appointmentId: result.appointmentId,
                row: result.appointment,
                warnings: result.warnings,
            },
            diff: { created: [`project_appointments.${result.appointmentId}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('project_appointments', deps, ['id', 'appointmentId']),
});

const HANDLER_FACTORIES: Record<string, (deps: GlobalAssistantActionHandlerDependencies) => HandlerPatch> = {
    create_email_campaign: createEmailCampaignHandler,
    create_audience: createEmailAudienceHandler,
    create_email_automation: createEmailAutomationHandler,
    create_lead: createLeadHandler,
    create_product: createProductHandler,
    create_appointment: createAppointmentHandler,
};

export function attachDefaultGlobalAssistantActionHandlers(
    definitions: AssistantActionDefinition[],
    deps: GlobalAssistantActionHandlerDependencies = {},
): AssistantActionDefinition[] {
    return definitions.map(definition => {
        const factory = HANDLER_FACTORIES[definition.actionType];
        if (!factory) return definition;
        return {
            ...definition,
            ...factory(deps),
        };
    });
}
