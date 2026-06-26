import { supabase as defaultSupabase } from '../../supabase';
import type {
    AssistantAction,
    AssistantActionDefinition,
    AssistantContextSnapshot,
    AssistantRollbackSnapshot,
} from '../../types/globalAssistant';
import { createAppointmentCanonical } from '../appointments/appointmentEngineService';
import { applyChatbotBlueprintToProjectData } from '../chatbotEngine/chatbotEngineConfigurationService';
import { createAudience } from '../email/emailAudienceService';
import { createAutomationDraft } from '../email/emailAutomationService';
import { createCampaignDraft } from '../email/emailCampaignService';
import type {
    ChatbotBlueprint,
    ChatbotKnowledgeSourceBlueprint,
    ChatbotKnowledgeSourceType,
    ChatbotKnowledgeVisibility,
} from '../../types/businessBlueprint';
import type { PropertyCampaign, PropertyOpenHouse, RealtyProperty } from '../../types/realty';
import { migrateBusinessBlueprint } from '../../utils/businessBlueprint';
import { mapPropertyCampaignToRow, mapPropertyOpenHouseToRow, mapRealtyPropertyToRow, toRealtySlug } from '../../utils/realty';

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

const readDisplayText = (value: unknown): string | undefined => {
    const direct = readString(value);
    if (direct) return direct;
    const record = asRecord(value);
    return readString(record.es) || readString(record.en) || readString(record.value) || readString(record.label);
};

const readNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const readDate = (value: unknown, fallback: string): string => {
    const text = readString(value);
    if (!text) return fallback;
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : fallback;
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

const getRequiredTenantId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const tenantId = getTenantId(action, context);
    if (!tenantId) throw new Error('tenantId is required before applying this assistant action.');
    return tenantId;
};

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

const selectFirstRow = async (builder: any): Promise<Record<string, unknown>> => {
    const limited = typeof builder.limit === 'function' ? builder.limit(1) : builder;
    const result = await limited;
    if (result?.error) throw result.error;
    return asRecord(asArray(result?.data)[0]);
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

const findProjectSnapshot = (
    projectId: string | null,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => {
    const projects = asArray(context?.snapshot?.availableProjects);
    return asRecord(projects.find(project => asRecord(project).id === projectId));
};

const createNavigationHandler = (
    view: string,
    options: {
        label: string;
        requiresProject?: boolean;
        adminView?: string;
        moduleItem?: string;
    },
): HandlerPatch => ({
    validate: input => ({
        valid: !options.requiresProject || Boolean(readString(input.projectId)),
        errors: !options.requiresProject || readString(input.projectId)
            ? []
            : [`${options.label} requires a projectId before navigation.`],
    }),
    execute: async (input, { action, context }) => {
        const projectId = readString(input.projectId) || action.projectId || context?.project.projectId || null;
        const project = findProjectSnapshot(projectId, context);
        return {
            afterSnapshot: {
                navigation: {
                    type: 'view',
                    view,
                    adminView: options.adminView || null,
                    moduleItem: options.moduleItem || null,
                    projectId,
                    projectName: readDisplayText(project.name) || context?.project.projectName || null,
                    actionType: action.actionType,
                    module: action.module,
                    sourceModule: 'global-assistant',
                    sourceComponent: 'OperatingLayer',
                    message: options.label,
                },
            },
            diff: {
                opened: [options.adminView ? `${view}.${options.adminView}` : view],
                projectId,
            },
        };
    },
});

const getAssistantUserId = (
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): string => {
    const userId = action.userId || context?.actor.userId || '';
    if (!userId) throw new Error('userId is required before applying this assistant action.');
    return userId;
};

const mergeSettingsWithAssistantMetadata = (
    settings: Record<string, unknown>,
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, unknown> => ({
    ...settings,
    generatedByAI: true,
    needsReview: true,
    safeToEdit: true,
    sourceModule: 'global-assistant',
    sourceComponent: 'OperatingLayer',
    sourceEntityType: 'assistant_action',
    sourceEntityId: action.id,
    metadata: {
        ...asRecord(settings.metadata),
        ...buildBaseMetadata(input, action, context),
    },
});

const assistantSourceMap = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
): Record<string, string | string[]> => ({
    globalAssistant: 'OperatingLayer',
    assistantTaskId: action.taskId || '',
    assistantActionId: action.id,
    assistantActionType: action.actionType,
    assistantModule: action.module,
    request: readString(input.request) || '',
    contextSnapshotId: context?.id || '',
});

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

const readMediaCategory = (value: unknown): string => {
    const category = readString(value);
    const allowed = new Set([
        'brand',
        'template',
        'article',
        'hero',
        'background',
        'icon',
        'component',
        'people',
        'product',
        'ai_generated',
        'other',
    ]);
    return category && allowed.has(category) ? category : 'ai_generated';
};

const buildMediaDraftPlaceholderUrl = (kind: 'image' | 'video' | 'image_edit', title: string): string => {
    const label = kind === 'video'
        ? 'AI video draft'
        : kind === 'image_edit'
            ? 'AI image edit draft'
            : 'AI image draft';
    const safeTitle = escapeHtml(title);
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
        '<rect width="1280" height="720" fill="#101828"/>',
        '<rect x="72" y="72" width="1136" height="576" rx="32" fill="#182230" stroke="#344054" stroke-width="3"/>',
        '<text x="108" y="178" fill="#f9fafb" font-family="Arial, sans-serif" font-size="48" font-weight="700">',
        label,
        '</text>',
        '<text x="108" y="258" fill="#d0d5dd" font-family="Arial, sans-serif" font-size="30">',
        safeTitle.slice(0, 96),
        '</text>',
        '<text x="108" y="574" fill="#98a2b3" font-family="Arial, sans-serif" font-size="24">',
        'Pending generation and human review in Quimera Media AI',
        '</text>',
        '</svg>',
    ].join('');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createMediaDraftAssetHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    kind: 'image' | 'video' | 'image_edit',
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const prompt = readString(input.prompt) || readString(input.request) || 'AI media generation draft';
        const now = getNow(deps);
        const title = titleFromRequest(prompt, kind === 'video' ? 'AI video generation draft' : 'AI image generation draft');
        const category = readMediaCategory(input.category);
        const aspectRatio = readString(input.aspectRatio) || (kind === 'video' ? '16:9' : '1:1');
        const tags = Array.from(new Set([
            'global-assistant',
            'ai-generated',
            `media:${kind}`,
            aspectRatio,
            ...asArray(input.tags).map(String),
        ].filter(Boolean)));
        const row = await insertRow(client, 'media_assets', {
            name: title,
            url: buildMediaDraftPlaceholderUrl(kind, title),
            size: 0,
            type: 'image/svg+xml',
            category,
            folder_path: `media/${category}/global-assistant/${action.id}`,
            tags,
            description: prompt,
            is_ai_generated: true,
            ai_prompt: prompt,
            is_system_asset: false,
            used_in: [],
            usage_count: 0,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                projectId,
                tenantId: getTenantId(action, context),
                mediaKind: kind,
                generationStatus: 'draft_prompt',
                generationMode: readString(input.mode) || (kind === 'video' ? 'draft_prompt' : 'generate_if_available'),
                aspectRatio,
                style: readString(input.style) || null,
                model: readString(input.model) || null,
                sourceAssetId: readString(input.sourceAssetId) || null,
                negativePrompt: readString(input.negativePrompt) || null,
                referenceAssetIds: asArray(input.referenceAssetIds).map(String),
                generatedByAI: true,
                needsReview: true,
                safeToEdit: true,
                readyForMediaAI: true,
                noAutoPublish: true,
            },
            created_by: getAssistantUserId(action, context),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'media_assets', id, row },
            diff: { created: [`media_assets.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('media_assets', deps),
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

const createBioPageHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const bioPage = {
            ...requireObject(input, 'bioPage'),
            ...requireObject(input, 'page'),
        };
        const request = readString(input.request);
        const now = getNow(deps);
        const projectName = context?.project.projectName || 'Bio Page';
        const title = readString(bioPage.title) || readString(bioPage.name) || titleFromRequest(request, `${projectName} Bio Page`);
        const requestedSlug = readString(bioPage.slug);
        const slug = requestedSlug || slugify(`${title}-${action.id.slice(-8)}`);
        const description = readString(bioPage.description) || request || '';
        const row = await insertRow(client, 'bio_pages', {
            tenant_id: tenantId,
            project_id: projectId,
            user_id: userId,
            slug,
            title,
            description,
            profile: {
                ...asRecord(bioPage.profile),
                name: readString(asRecord(bioPage.profile).name) || title,
                headline: readString(asRecord(bioPage.profile).headline) || description,
                generatedByAI: true,
                needsReview: true,
                userModified: false,
            },
            theme: asRecord(bioPage.theme),
            seo: asRecord(bioPage.seo),
            settings: mergeSettingsWithAssistantMetadata(asRecord(bioPage.settings), input, action, context),
            status: 'draft',
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'bio_pages', id, row },
            diff: { created: [`bio_pages.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('bio_pages', deps),
});

const createBioPageBlockHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const block = requireObject(input, 'block');
        const blockType = readString(input.blockType) || readString(block.type);
        return {
            valid: Boolean(blockType),
            errors: blockType ? [] : ['blockType is required before adding a Bio Page block.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const block = {
            ...requireObject(input, 'block'),
            ...requireObject(input, 'data'),
        };
        const request = readString(input.request);
        const now = getNow(deps);
        const pageResult = await selectSingle(client.from('bio_pages').select('*').eq('project_id', projectId));
        if (pageResult?.error) throw pageResult.error;
        const page = asRecord(pageResult?.data);
        const bioPageId = readString(page.id);
        if (!bioPageId) throw new Error('A Bio Page draft or published page is required before adding blocks.');

        const existingBlocks = await client.from('bio_page_blocks').select('order_index').eq('bio_page_id', bioPageId);
        if (existingBlocks?.error) throw existingBlocks.error;
        const nextOrderIndex = asArray(existingBlocks?.data).reduce<number>((max, row) => {
            const value = readNumber(asRecord(row).order_index) ?? -1;
            return Math.max(max, value);
        }, -1) + 1;
        const blockType = readString(input.blockType) || readString(block.type) || 'custom_html_placeholder';
        const title = readString(block.title) || titleFromRequest(request, `AI ${blockType} block`);
        const row = await insertRow(client, 'bio_page_blocks', {
            tenant_id: tenantId,
            project_id: projectId,
            bio_page_id: bioPageId,
            type: blockType,
            title,
            description: readString(block.description) || request || null,
            order_index: nextOrderIndex,
            visible: block.visible !== false,
            data: {
                ...asRecord(block.data),
                request: request || undefined,
            },
            settings: mergeSettingsWithAssistantMetadata(asRecord(block.settings), input, action, context),
            source_module: 'global-assistant',
            source_entity_id: action.id,
            generated_by_ai: true,
            needs_review: true,
            user_modified: false,
            locked_from_regeneration: false,
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'bio_page_blocks', id, bioPageId, row },
            diff: { created: [`bio_page_blocks.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('bio_page_blocks', deps),
});

const chatbotKnowledgeSourceTypes = new Set<ChatbotKnowledgeSourceType>([
    'business_blueprint',
    'website_content',
    'ecommerce_products',
    'ecommerce_policies',
    'ecommerce_orders_private',
    'appointments_services',
    'restaurant_menu',
    'restaurant_reservations',
    'realty_listings',
    'finance_invoices_private',
    'bio_page',
    'crm_leads_private',
    'email_marketing_flows',
    'cms_articles',
    'uploaded_document',
    'website_url',
    'youtube',
    'manual_snippet',
    'faq',
]);

const chatbotKnowledgeVisibility = new Set<ChatbotKnowledgeVisibility>(['public', 'private', 'internal']);

const readChatbotKnowledgeSourceType = (
    value: unknown,
    fallback: ChatbotKnowledgeSourceType,
): ChatbotKnowledgeSourceType => {
    const text = readString(value) as ChatbotKnowledgeSourceType | undefined;
    return text && chatbotKnowledgeSourceTypes.has(text) ? text : fallback;
};

const readChatbotKnowledgeVisibility = (
    value: unknown,
): ChatbotKnowledgeVisibility => {
    const text = readString(value) as ChatbotKnowledgeVisibility | undefined;
    return text && chatbotKnowledgeVisibility.has(text) ? text : 'internal';
};

const loadProjectData = async (
    client: SupabaseClientLike,
    projectId: string,
): Promise<Record<string, unknown>> => {
    const result = await selectSingle(client.from('projects').select('data').eq('id', projectId));
    if (result?.error) throw result.error;
    const projectRow = asRecord(result?.data);
    const projectData = asRecord(projectRow.data);
    if (!Object.keys(projectData).length) {
        throw new Error('Project data is required before configuring ChatCore knowledge.');
    }
    return projectData;
};

const updateProjectData = async (
    client: SupabaseClientLike,
    projectId: string,
    data: Record<string, unknown>,
    now: string,
) => {
    const result = await client
        .from('projects')
        .update({ data, last_updated: now })
        .eq('id', projectId);
    if (result?.error) throw result.error;
    return result?.data || { projectId, data };
};

const buildChatbotKnowledgeSource = (
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    options: { sync: boolean; now: string },
): ChatbotKnowledgeSourceBlueprint => {
    const document = requireObject(input, 'document');
    const request = readString(input.request);
    const sources = asArray(input.sources).map(String).map(value => value.trim()).filter(Boolean);
    const fallbackType = options.sync
        ? readChatbotKnowledgeSourceType(sources[0], 'business_blueprint')
        : 'manual_snippet';
    const type = readChatbotKnowledgeSourceType(document.type || input.sourceType || sources[0], fallbackType);
    const name = readString(document.name)
        || readString(document.title)
        || (options.sync && sources.length ? `ChatCore sync: ${sources.join(', ')}` : titleFromRequest(request, 'Global Assistant ChatCore knowledge'));

    return {
        id: readString(document.id) || `global-assistant-${action.id}`,
        name,
        type,
        ownerModule: 'chatbot-engine',
        visibility: readChatbotKnowledgeVisibility(document.visibility || input.visibility),
        status: 'needs_review',
        lastSyncedAt: options.sync ? options.now : undefined,
        freshness: 'unknown',
        confidence: readNumber(document.confidence) ?? 0.72,
        contentHash: readString(document.contentHash) || readString(document.content_hash),
        sourceEntityIds: [
            action.id,
            ...asArray(document.sourceEntityIds).map(String),
            ...sources,
        ].filter(Boolean),
        readiness: {
            isReady: false,
            blockers: [],
            warnings: [
                'Needs human review before ChatCore uses this knowledge source.',
            ],
        },
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        lockedFromRegeneration: false,
        sourceMap: {
            ...assistantSourceMap(input, action, context),
            source: sources,
            documentId: readString(document.id) || '',
        },
    };
};

const upsertChatbotKnowledgeSource = (
    blueprint: ChatbotBlueprint,
    source: ChatbotKnowledgeSourceBlueprint,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    now: string,
): ChatbotBlueprint => {
    const nextSources = blueprint.knowledgeSources.some(item => item.id === source.id)
        ? blueprint.knowledgeSources.map(item => item.id === source.id ? source : item)
        : [...blueprint.knowledgeSources, source];

    return {
        ...blueprint,
        knowledgeSources: nextSources,
        status: 'needs_review',
        needsReview: true,
        readiness: {
            ...blueprint.readiness,
            isReady: false,
            warnings: Array.from(new Set([
                ...(blueprint.readiness?.warnings || []),
                'ChatCore knowledge was updated by Global Assistant and needs review.',
            ])),
        },
        metadata: {
            ...blueprint.metadata,
            generatedByAI: true,
            userModified: false,
            lockedFromRegeneration: false,
            updatedAt: now,
            lastEditedAt: now,
            lastEditedBy: action.userId || context?.actor.userId || '',
        },
        sourceMap: {
            ...(blueprint.sourceMap || {}),
            ...assistantSourceMap(input, action, context),
            knowledgeCenter: 'globalAssistant.chatbotKnowledge',
        },
    };
};

const createChatbotKnowledgeHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    options: { sync: boolean },
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const projectData = await loadProjectData(client, projectId);
        const businessBlueprint = migrateBusinessBlueprint(
            projectData.businessBlueprint || asRecord(projectData.data).businessBlueprint,
        );
        if (!businessBlueprint?.chatbotBlueprint) {
            throw new Error('BusinessBlueprint V2 is required before configuring ChatCore knowledge.');
        }
        const source = buildChatbotKnowledgeSource(input, action, context, { sync: options.sync, now });
        const chatbotBlueprint = upsertChatbotKnowledgeSource(
            businessBlueprint.chatbotBlueprint,
            source,
            input,
            action,
            context,
            now,
        );
        const nextData = applyChatbotBlueprintToProjectData(projectData, chatbotBlueprint);
        await updateProjectData(client, projectId, nextData, now);

        return {
            beforeSnapshot: {
                table: 'projects',
                id: projectId,
                projectId,
                projectData,
            },
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                row: { projectId, knowledgeSource: source },
            },
            diff: {
                updated: [`projects.${projectId}.data.businessBlueprint.chatbotBlueprint.knowledgeSources`],
                reviewRequired: true,
                rollback: 'restore_previous_project_data',
            },
        };
    },
    rollback: async (_input, { snapshot }) => {
        const before = asRecord(snapshot.beforeSnapshot);
        const projectId = readString(before.projectId) || readString(before.id);
        const projectData = asRecord(before.projectData);
        if (!projectId || !Object.keys(projectData).length) {
            throw new Error('Cannot rollback ChatCore knowledge: previous project data was not recorded.');
        }
        const result = await updateProjectData(getClient(deps), projectId, projectData, getNow(deps));
        return {
            afterSnapshot: {
                table: 'projects',
                id: projectId,
                restored: true,
                row: result,
            },
            diff: {
                restored: [`projects.${projectId}.data`],
            },
        };
    },
});

const normalizeInvoiceItems = (
    items: unknown,
    request: string | undefined,
): Array<Record<string, unknown>> => {
    const normalized = asArray(items)
        .map((item, index) => {
            const record = asRecord(item);
            if (!Object.keys(record).length) return null;
            const quantity = readNumber(record.quantity) ?? 1;
            const unitPrice = readNumber(record.unitPrice ?? record.unit_price ?? record.price ?? record.amount) ?? 0;
            const total = readNumber(record.total) ?? quantity * unitPrice;
            return {
                id: readString(record.id) || `item-${index + 1}`,
                description: readString(record.description) || readString(record.name) || 'AI finance draft item',
                quantity,
                unitPrice,
                unit_price: unitPrice,
                total,
            };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

    return normalized.length > 0
        ? normalized
        : [{
            id: 'item-1',
            description: request || 'AI finance draft item',
            quantity: 1,
            unitPrice: 0,
            unit_price: 0,
            total: 0,
        }];
};

const createFinanceRecordHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const record = requireObject(input, 'record');
        const request = readString(input.request);
        const now = getNow(deps);
        const issueDate = readDate(record.issueDate ?? record.issue_date ?? record.date, now.slice(0, 10));
        const dueDate = readDate(record.dueDate ?? record.due_date, issueDate);
        const items = normalizeInvoiceItems(record.items, request);
        const computedSubtotal = items.reduce((sum, item) => sum + (readNumber(item.total) ?? 0), 0);
        const subtotal = readNumber(record.subtotal) ?? computedSubtotal;
        const taxTotal = readNumber(record.taxTotal ?? record.tax_total) ?? 0;
        const discountTotal = readNumber(record.discountTotal ?? record.discount_total) ?? 0;
        const total = readNumber(record.total) ?? subtotal + taxTotal - discountTotal;
        const title = titleFromRequest(request, 'AI finance invoice draft');
        const invoiceNumber = readString(record.invoiceNumber)
            || readString(record.invoice_number)
            || `AI-${now.slice(2, 10).replace(/-/g, '')}-${slugify(title).slice(0, 12)}`;

        const row = await insertRow(client, 'accounting_invoices', {
            project_id: projectId,
            invoice_number: invoiceNumber,
            status: 'draft',
            issue_date: issueDate,
            due_date: dueDate,
            customer_name: readString(record.customerName ?? record.customer_name ?? record.clientName ?? record.name) || title,
            customer_email: readString(record.customerEmail ?? record.customer_email ?? record.email) || null,
            customer_address: readString(record.customerAddress ?? record.customer_address ?? record.address) || null,
            items,
            subtotal,
            tax_total: taxTotal,
            discount_total: discountTotal,
            total,
            notes: readString(record.notes) || request || null,
            currency: readString(record.currency) || 'USD',
            payment_terms: readString(record.paymentTerms ?? record.payment_terms) || 'Due on receipt',
            reminder_note: readString(record.reminderNote ?? record.reminder_note) || null,
            ai_optimized: true,
            ai_optimized_terms: readString(record.aiOptimizedTerms ?? record.ai_optimized_terms) || null,
            ai_optimized_reminder: readString(record.aiOptimizedReminder ?? record.ai_optimized_reminder) || null,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
            source_event: 'create_finance_record',
            source_entity_type: 'assistant_action',
            source_entity_id: action.id,
            idempotency_key: `global-assistant:${action.id}:finance-record`,
            metadata: buildBaseMetadata(input, action, context),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'accounting_invoices', id, row },
            diff: { created: [`accounting_invoices.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('accounting_invoices', deps),
});

const resolveRestaurant = async (
    client: SupabaseClientLike,
    input: Record<string, unknown>,
    action: AssistantAction,
    context: AssistantContextSnapshot | undefined,
    projectId: string,
): Promise<{ id: string; tenantId: string; row: Record<string, unknown> }> => {
    const details = {
        ...requireObject(input, 'item'),
        ...requireObject(input, 'offer'),
        ...requireObject(input, 'campaign'),
        ...requireObject(input, 'flow'),
    };
    const explicitRestaurantId = readString(input.restaurantId) || readString(details.restaurantId) || readString(details.restaurant_id);
    const query = explicitRestaurantId
        ? client.from('restaurants').select('*').eq('id', explicitRestaurantId)
        : client.from('restaurants').select('*').eq('project_id', projectId);
    const row = await selectFirstRow(query);
    const restaurantId = readString(row.id) || explicitRestaurantId || '';
    const tenantId = readString(row.tenant_id) || getRequiredTenantId(action, context);
    if (!restaurantId) {
        throw new Error('A restaurant record is required before applying restaurant assistant actions.');
    }
    return { id: restaurantId, tenantId, row };
};

const normalizeStringArray = (value: unknown): string[] =>
    asArray(value).map(String).map(item => item.trim()).filter(Boolean);

const createRestaurantMenuItemHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const item = requireObject(input, 'item');
        const request = readString(input.request);
        const now = getNow(deps);
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const name = readString(item.name) || titleFromRequest(request, 'AI menu item draft');
        const row = await insertRow(client, 'restaurant_menu_items', {
            tenant_id: restaurant.tenantId,
            restaurant_id: restaurant.id,
            name,
            description: readString(item.description) || request || '',
            category: readString(item.category) || 'Specials',
            price: readNumber(item.price) ?? 0,
            currency: readString(item.currency) || readString(restaurant.row.currency) || 'USD',
            image_url: readString(item.imageUrl ?? item.image_url) || null,
            dietary_tags: normalizeStringArray(item.dietaryTags ?? item.dietary_tags),
            allergens: normalizeStringArray(item.allergens),
            ingredients: normalizeStringArray(item.ingredients),
            preparation_time: readNumber(item.preparationTime ?? item.preparation_time) ?? null,
            is_available: false,
            is_featured: item.isFeatured === true || item.is_featured === true,
            upsell_items: normalizeStringArray(item.upsellItems ?? item.upsell_items),
            ai_generated: true,
            position: readNumber(item.position) ?? Date.parse(now),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'restaurant_menu_items', id, row },
            diff: { created: [`restaurant_menu_items.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('restaurant_menu_items', deps),
});

const createRestaurantMarketingOutputHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    options: { actionType: 'create_catering_offer' | 'generate_restaurant_campaign'; outputType: string; fallbackTitle: string },
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const now = getNow(deps);
        const request = readString(input.request);
        const details = {
            ...requireObject(input, 'offer'),
            ...requireObject(input, 'campaign'),
        };
        const restaurant = await resolveRestaurant(client, input, action, context, projectId);
        const prompt = readString(input.prompt) || readString(details.prompt) || request || options.fallbackTitle;
        const title = readString(details.title) || titleFromRequest(prompt, options.fallbackTitle);
        const output = [
            title,
            readString(details.description) || prompt,
            '',
            'Status: draft for human review before publishing or sending.',
        ].filter(Boolean).join('\n');
        const row = await insertRow(client, 'restaurant_marketing_outputs', {
            tenant_id: restaurant.tenantId,
            restaurant_id: restaurant.id,
            type: readString(details.type) || options.outputType,
            prompt,
            output,
            created_by: getAssistantUserId(action, context),
            created_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'restaurant_marketing_outputs', id, row },
            diff: { created: [`restaurant_marketing_outputs.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('restaurant_marketing_outputs', deps),
});

const createRealtyListingHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const listing = requireObject(input, 'listing');
        const request = readString(input.request);
        const now = getNow(deps);
        const title = readString(listing.title) || titleFromRequest(request, 'AI real estate listing draft');
        const property: Partial<RealtyProperty> = {
            title,
            slug: readString(listing.slug) || toRealtySlug(`${title}-${action.id.slice(-8)}`),
            description: readString(listing.description) || request || '',
            descriptionShort: readString(listing.descriptionShort ?? listing.description_short),
            descriptionLong: readString(listing.descriptionLong ?? listing.description_long) || readString(listing.description) || request || '',
            price: readNumber(listing.price) ?? 0,
            currency: readString(listing.currency) || 'USD',
            transactionType: readString(listing.transactionType ?? listing.transaction_type) as RealtyProperty['transactionType'] || 'sale',
            propertyType: readString(listing.propertyType ?? listing.property_type) as RealtyProperty['propertyType'] || 'house',
            status: 'draft',
            address: readString(listing.address) || readString(listing.addressLine1 ?? listing.address_line_1) || '',
            addressLine1: readString(listing.addressLine1 ?? listing.address_line_1) || readString(listing.address) || '',
            city: readString(listing.city) || '',
            state: readString(listing.state),
            country: readString(listing.country),
            zipCode: readString(listing.zipCode ?? listing.zip_code ?? listing.postalCode ?? listing.postal_code),
            bedrooms: readNumber(listing.bedrooms) ?? 0,
            bathrooms: readNumber(listing.bathrooms) ?? 0,
            area: readNumber(listing.area ?? listing.square_feet ?? listing.areaSqft ?? listing.area_sqft) ?? 0,
            areaUnit: 'sqft',
            amenities: normalizeStringArray(listing.amenities),
            features: normalizeStringArray(listing.features),
            highlights: normalizeStringArray(listing.highlights),
            images: [],
            isFeatured: false,
            publicEnabled: false,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
            },
        };
        const row = await insertRow(client, 'properties', {
            ...mapRealtyPropertyToRow(property, userId, projectId, tenantId),
            status: 'draft',
            public_enabled: false,
            published_at: null,
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'properties', id, row },
            diff: { created: [`properties.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('properties', deps),
});

const createRealtyCampaignHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const request = readString(input.request);
        const campaignInput = requireObject(input, 'campaign');
        const prompt = readString(input.prompt) || readString(campaignInput.prompt) || request || 'AI realty campaign draft';
        const title = readString(campaignInput.title) || titleFromRequest(prompt, 'AI realty campaign draft');
        const campaign: Partial<PropertyCampaign> = {
            propertyId: readString(input.listingId) || readString(input.propertyId) || readString(campaignInput.propertyId ?? campaignInput.property_id) || null,
            campaignType: readString(campaignInput.campaignType ?? campaignInput.campaign_type) as PropertyCampaign['campaignType'] || 'social',
            title,
            status: 'draft',
            content: {
                prompt,
                copy: readString(campaignInput.copy) || prompt,
                generatedByAI: true,
                needsReview: true,
            },
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                noAutoPublish: true,
            },
        };
        const now = getNow(deps);
        const row = await insertRow(client, 'property_campaigns', {
            ...mapPropertyCampaignToRow(campaign, userId, projectId, tenantId),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'property_campaigns', id, row },
            diff: { created: [`property_campaigns.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('property_campaigns', deps),
});

const createRealtyOpenHouseHandler = (deps: GlobalAssistantActionHandlerDependencies): HandlerPatch => ({
    validate: input => {
        const event = requireObject(input, 'event');
        const startsAt = readString(event.startsAt) || readString(event.starts_at) || readString(event.startDate);
        return {
            valid: Boolean(startsAt),
            errors: startsAt ? [] : ['event.startsAt is required before creating a Realty open house.'],
        };
    },
    execute: async (input, { action, context }) => {
        const client = getClient(deps);
        const projectId = getProjectId(input, action, context);
        const tenantId = getTenantId(action, context);
        const userId = getAssistantUserId(action, context);
        const event = requireObject(input, 'event');
        const propertyId = readString(input.listingId) || readString(input.propertyId) || readString(event.propertyId ?? event.property_id);
        if (!propertyId) throw new Error('listingId is required before creating a Realty open house.');
        const now = getNow(deps);
        const startsAt = readString(event.startsAt) || readString(event.starts_at) || readString(event.startDate) || now;
        const openHouse: Partial<PropertyOpenHouse> = {
            propertyId,
            title: readString(event.title) || titleFromRequest(readString(input.request), 'AI open house draft'),
            startsAt,
            endsAt: readString(event.endsAt) || readString(event.ends_at) || null,
            timezone: readString(event.timezone) || 'America/Puerto_Rico',
            status: 'scheduled',
            notes: readString(event.notes) || readString(input.request) || null,
            registrationEnabled: event.registrationEnabled !== false && event.registration_enabled !== false,
            metadata: {
                ...buildBaseMetadata(input, action, context),
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
                sourceEntityId: action.id,
                needsReview: true,
            },
        };
        const row = await insertRow(client, 'property_open_houses', {
            ...mapPropertyOpenHouseToRow(openHouse, userId, projectId, tenantId),
            created_at: now,
            updated_at: now,
        });
        const id = readString((row as Record<string, unknown>).id) || action.id;
        return {
            afterSnapshot: { table: 'property_open_houses', id, row },
            diff: { created: [`property_open_houses.${id}`], reviewRequired: true },
        };
    },
    rollback: rollbackCreatedRow('property_open_houses', deps),
});

type AnalyticsSourceKey =
    | 'leads'
    | 'appointments'
    | 'emailCampaigns'
    | 'emailAudiences'
    | 'emailEvents'
    | 'products'
    | 'orders'
    | 'mediaAssets'
    | 'bioPages'
    | 'bioPageEvents'
    | 'chatbotEvents'
    | 'financeInvoices'
    | 'realtyListings'
    | 'restaurantEvents';

const ANALYTICS_SOURCES: Array<{
    key: AnalyticsSourceKey;
    table: string;
    projectField: string;
    columns: string;
    statusField?: string;
    eventField?: string;
}> = [
    { key: 'leads', table: 'leads', projectField: 'project_id', columns: 'id,status,source,created_at', statusField: 'status' },
    { key: 'appointments', table: 'project_appointments', projectField: 'project_id', columns: 'id,status,source,created_at,start_date', statusField: 'status' },
    { key: 'emailCampaigns', table: 'email_campaigns', projectField: 'project_id', columns: 'id,status,type,created_at', statusField: 'status' },
    { key: 'emailAudiences', table: 'email_audiences', projectField: 'project_id', columns: 'id,status,created_at', statusField: 'status' },
    { key: 'emailEvents', table: 'email_events', projectField: 'project_id', columns: 'id,event_type,type,received_at,created_at', eventField: 'event_type' },
    { key: 'products', table: 'store_products', projectField: 'project_id', columns: 'id,data,created_at' },
    { key: 'orders', table: 'store_orders', projectField: 'project_id', columns: 'id,status,total,created_at', statusField: 'status' },
    { key: 'mediaAssets', table: 'media_assets', projectField: 'metadata->>projectId', columns: 'id,category,is_ai_generated,metadata,created_at', statusField: 'category' },
    { key: 'bioPages', table: 'bio_pages', projectField: 'project_id', columns: 'id,status,created_at', statusField: 'status' },
    { key: 'bioPageEvents', table: 'bio_page_events', projectField: 'project_id', columns: 'id,event_type,created_at', eventField: 'event_type' },
    { key: 'chatbotEvents', table: 'chatbot_engine_events', projectField: 'project_id', columns: 'id,event_type,action_type,intent,created_at', eventField: 'event_type' },
    { key: 'financeInvoices', table: 'accounting_invoices', projectField: 'project_id', columns: 'id,status,total,created_at', statusField: 'status' },
    { key: 'realtyListings', table: 'properties', projectField: 'project_id', columns: 'id,status,public_enabled,created_at', statusField: 'status' },
    { key: 'restaurantEvents', table: 'restaurant_analytics_events', projectField: 'project_id', columns: 'id,event_type,created_at', eventField: 'event_type' },
];

const countByField = (rows: Record<string, unknown>[], field?: string): Record<string, number> => {
    if (!field) return {};
    return rows.reduce<Record<string, number>>((acc, row) => {
        const value = readString(row[field]) || 'unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
};

const safeReadAnalyticsRows = async (
    client: SupabaseClientLike,
    source: (typeof ANALYTICS_SOURCES)[number],
    projectId: string,
): Promise<{ source: (typeof ANALYTICS_SOURCES)[number]; rows: Record<string, unknown>[]; warning?: string }> => {
    try {
        let query = client
            .from(source.table)
            .select(source.columns)
            .eq(source.projectField, projectId);
        if (typeof query.limit === 'function') query = query.limit(100);
        const result = await query;
        if (result?.error) throw result.error;
        return { source, rows: asArray(result?.data).map(asRecord) };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            source,
            rows: [],
            warning: `${source.table}: ${message}`,
        };
    }
};

const activeServiceSet = (context?: AssistantContextSnapshot): Set<string> =>
    new Set(context?.tenant.activeServices || []);

const buildProjectAnalyticsSnapshot = async (
    deps: GlobalAssistantActionHandlerDependencies,
    input: Record<string, unknown>,
    action: AssistantAction,
    context?: AssistantContextSnapshot,
) => {
    const client = getClient(deps);
    const projectId = getProjectId(input, action, context);
    const now = getNow(deps);
    const results = await Promise.all(
        ANALYTICS_SOURCES.map(source => safeReadAnalyticsRows(client, source, projectId)),
    );
    const modules = results.reduce<Record<string, Record<string, unknown>>>((acc, result) => {
        acc[result.source.key] = {
            table: result.source.table,
            count: result.rows.length,
            byStatus: countByField(result.rows, result.source.statusField),
            byEvent: countByField(result.rows, result.source.eventField),
            sampleIds: result.rows.slice(0, 5).map(row => readString(row.id)).filter(Boolean),
        };
        return acc;
    }, {});
    const services = activeServiceSet(context);
    const warnings = results.map(result => result.warning).filter((warning): warning is string => Boolean(warning));
    const blockers = [
        ...(!projectId ? ['missing_project_id'] : []),
        ...(services.has('crm') && (modules.leads?.count as number || 0) === 0 ? ['crm_has_no_leads'] : []),
        ...(services.has('appointments') && (modules.appointments?.count as number || 0) === 0 ? ['appointments_have_no_records'] : []),
        ...(services.has('emailMarketing') && (modules.emailCampaigns?.count as number || 0) === 0 ? ['email_marketing_has_no_campaigns'] : []),
        ...(services.has('emailMarketing') && (modules.emailAudiences?.count as number || 0) === 0 ? ['email_marketing_has_no_audiences'] : []),
        ...(services.has('ecommerce') && (modules.products?.count as number || 0) === 0 ? ['ecommerce_has_no_products'] : []),
        ...(services.has('ecommerce') && (modules.orders?.count as number || 0) === 0 ? ['ecommerce_has_no_orders'] : []),
        ...(services.has('chatbot') && (modules.chatbotEvents?.count as number || 0) === 0 ? ['chatcore_has_no_runtime_events'] : []),
        ...(services.has('aiFeatures') && (modules.mediaAssets?.count as number || 0) === 0 ? ['media_ai_has_no_assets'] : []),
        ...(services.has('finance') && (modules.financeInvoices?.count as number || 0) === 0 ? ['finance_has_no_invoices'] : []),
        ...(services.has('realEstate') && (modules.realtyListings?.count as number || 0) === 0 ? ['realty_has_no_listings'] : []),
        ...(services.has('restaurants') && (modules.restaurantEvents?.count as number || 0) === 0 ? ['restaurants_have_no_analytics_events'] : []),
    ];

    return {
        generatedAt: now,
        projectId,
        projectName: context?.project.projectName || null,
        modules,
        blockers,
        warnings,
        sourceTables: ANALYTICS_SOURCES.map(source => source.table),
    };
};

const createAnalyticsHandler = (
    deps: GlobalAssistantActionHandlerDependencies,
    kind: 'summary' | 'blockers' | 'report' | 'export',
): HandlerPatch => ({
    validate: noValidationErrors,
    execute: async (input, { action, context }) => {
        const snapshot = await buildProjectAnalyticsSnapshot(deps, input, action, context);
        const request = (readString(input.request) || '').toLowerCase();
        const format = readString(input.format)
            || (request.includes('csv') ? 'csv' : request.includes('pdf') ? 'pdf' : 'json');
        const afterSnapshot = {
            kind,
            format,
            reportId: `${kind}-${snapshot.projectId}-${snapshot.generatedAt}`,
            summary: {
                projectId: snapshot.projectId,
                projectName: snapshot.projectName,
                blockerCount: snapshot.blockers.length,
                warningCount: snapshot.warnings.length,
                totalSignals: Object.values(snapshot.modules).reduce<number>((sum, module) => sum + (readNumber(module.count) ?? 0), 0),
            },
            analytics: snapshot,
            export: kind === 'export'
                ? {
                    fileName: `quimera-project-report-${snapshot.projectId}.${format}`,
                    contentType: format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json',
                    status: 'ready_for_download_renderer',
                }
                : null,
        };

        return {
            afterSnapshot,
            diff: {
                reported: [`analytics.${kind}.${snapshot.projectId}`],
                mutatesData: false,
                sourceTables: snapshot.sourceTables,
            },
        };
    },
});

const HANDLER_FACTORIES: Record<string, (deps: GlobalAssistantActionHandlerDependencies) => HandlerPatch> = {
    open_project: () => createNavigationHandler('editor', { label: 'Open project in Website Builder.', requiresProject: true }),
    switch_project: () => createNavigationHandler('dashboard', { label: 'Switch active project context.', requiresProject: true }),
    open_website_builder: () => createNavigationHandler('editor', { label: 'Open Website Builder.', requiresProject: true }),
    open_storefront_builder: () => createNavigationHandler('ecommerce', { label: 'Open Storefront Builder.', requiresProject: true, moduleItem: 'storefront' }),
    open_orders: () => createNavigationHandler('ecommerce', { label: 'Open ecommerce orders.', requiresProject: true, moduleItem: 'orders' }),
    open_email_hub: () => createNavigationHandler('email', { label: 'Open Email Hub.', requiresProject: true }),
    open_calendar: () => createNavigationHandler('appointments', { label: 'Open appointments calendar.', requiresProject: true }),
    open_chatbot_dashboard: () => createNavigationHandler('ai-assistant', { label: 'Open ChatCore dashboard.', requiresProject: true }),
    open_tenant: () => createNavigationHandler('superadmin', { label: 'Open tenant in Super Admin.', adminView: 'tenants' }),
    create_email_campaign: createEmailCampaignHandler,
    create_audience: createEmailAudienceHandler,
    create_email_automation: createEmailAutomationHandler,
    create_lead: createLeadHandler,
    create_product: createProductHandler,
    generate_image: deps => createMediaDraftAssetHandler(deps, 'image'),
    edit_image: deps => createMediaDraftAssetHandler(deps, 'image_edit'),
    generate_video: deps => createMediaDraftAssetHandler(deps, 'video'),
    create_appointment: createAppointmentHandler,
    create_bio_page: createBioPageHandler,
    add_bio_block: createBioPageBlockHandler,
    create_chatbot_knowledge: deps => createChatbotKnowledgeHandler(deps, { sync: false }),
    sync_chatbot_knowledge: deps => createChatbotKnowledgeHandler(deps, { sync: true }),
    create_finance_record: createFinanceRecordHandler,
    create_menu_item: createRestaurantMenuItemHandler,
    create_catering_offer: deps => createRestaurantMarketingOutputHandler(deps, {
        actionType: 'create_catering_offer',
        outputType: 'weeklyPromotion',
        fallbackTitle: 'AI catering offer draft',
    }),
    generate_restaurant_campaign: deps => createRestaurantMarketingOutputHandler(deps, {
        actionType: 'generate_restaurant_campaign',
        outputType: 'instagram',
        fallbackTitle: 'AI restaurant campaign draft',
    }),
    create_listing: createRealtyListingHandler,
    create_open_house: createRealtyOpenHouseHandler,
    generate_realty_campaign: createRealtyCampaignHandler,
    run_project_report: deps => createAnalyticsHandler(deps, 'report'),
    summarize_analytics: deps => createAnalyticsHandler(deps, 'summary'),
    identify_blockers: deps => createAnalyticsHandler(deps, 'blockers'),
    export_report: deps => createAnalyticsHandler(deps, 'export'),
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
