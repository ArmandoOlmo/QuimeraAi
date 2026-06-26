import type {
    AssistantAction,
    AssistantActionDefinition,
    AssistantApprovalRequest,
    AssistantContextSnapshot,
    AssistantExecutionPlan,
    AssistantExecutionPreview,
    AssistantIntent,
} from '../../types/globalAssistant';
import { checkActionPermission, assertProjectActionContext } from './globalAssistantPermissionService';
import { enrichAssistantExecutionPreview } from './globalAssistantActionPreviews';

const nowIso = () => new Date().toISOString();
const PROJECT_SCOPED_MODULES = new Set([
    'businessBlueprint',
    'website',
    'storefront',
    'ecommerce',
    'appointments',
    'restaurants',
    'realEstate',
    'bioPage',
    'crm',
    'emailMarketing',
    'chatbot',
    'analytics',
    'finance',
]);

const requiresProjectContext = (definition: AssistantActionDefinition): boolean =>
    PROJECT_SCOPED_MODULES.has(definition.module) || Boolean(definition.inputSchema.required?.includes('projectId'));

const createId = (prefix: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomId}`;
};

export interface BuildExecutionPlanInput {
    context: AssistantContextSnapshot;
    intent: AssistantIntent;
    actionDefinitions: AssistantActionDefinition[];
    request: string;
    userPermissions?: string[];
    enabledServices?: string[];
    enabledFeatures?: string[];
}

const createAction = (
    definition: AssistantActionDefinition,
    context: AssistantContextSnapshot,
    input: Record<string, unknown>,
): AssistantAction => ({
    id: createId('asst_action'),
    userId: context.actor.userId,
    tenantId: context.tenant.tenantId,
    projectId: (input.projectId as string | undefined) || context.project.projectId,
    mode: context.actor.mode,
    module: definition.module,
    actionType: definition.actionType,
    target: {
        projectId: (input.projectId as string | undefined) || context.project.projectId,
        module: definition.module,
    },
    input,
    requiresConfirmation: definition.requiresConfirmation,
    status: 'planned',
    metadata: {
        safetyLevel: definition.safetyLevel,
        previewSupported: definition.previewSupported,
        rollbackSupported: definition.rollbackSupported,
        mutatesData: definition.mutatesData,
        executable: typeof definition.execute === 'function',
    },
    createdAt: nowIso(),
});

const createPreview = (
    action: AssistantAction,
    definition: AssistantActionDefinition,
    blockers: string[],
): AssistantExecutionPreview => enrichAssistantExecutionPreview(
    {
        actionId: action.id,
        module: action.module,
        actionType: action.actionType,
        projectId: action.projectId,
        target: action.target,
        before: null,
        after: null,
        diff: null,
        risks: [
            ...(definition.safetyLevel === 'critical' ? ['Critical action: requires explicit confirmation.'] : []),
            ...(definition.mutatesData ? ['Mutates project, tenant, user, or module data.'] : []),
        ],
        blockers,
        requiresConfirmation: definition.requiresConfirmation,
        rollbackSupported: definition.rollbackSupported,
    },
    action,
    definition,
);

const createApproval = (
    action: AssistantAction,
    definition: AssistantActionDefinition,
    preview: AssistantExecutionPreview,
): AssistantApprovalRequest => ({
    id: createId('asst_approval'),
    actionId: action.id,
    requestedBy: action.userId,
    safetyLevel: definition.safetyLevel,
    reason: `${definition.actionType} is ${definition.safetyLevel} and requires confirmation before apply.`,
    preview,
    createdAt: nowIso(),
});

const getToolReadinessBlockers = (definition: AssistantActionDefinition): string[] => {
    if (typeof definition.execute === 'function') return [];
    return [
        `No execute handler registered for ${definition.actionType}. This action is catalogued but not yet available for real execution.`,
    ];
};

const normalizeContextToken = (value: string | null | undefined): string =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const readSnapshotText = (context: AssistantContextSnapshot, keys: string[]): string | undefined => {
    for (const key of keys) {
        const value = context.snapshot?.[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
};

const isMediaAssetEntityType = (entityType: string | null | undefined): boolean => {
    const normalized = normalizeContextToken(entityType);
    return [
        'asset',
        'media_asset',
        'media_assets',
        'image_asset',
        'video_asset',
        'media',
    ].includes(normalized);
};

const inferSectionImagePathFromRequest = (request: string): string => {
    const normalized = request.toLowerCase();
    if (normalized.includes('background') || normalized.includes('fondo')) return 'backgroundImageUrl';
    return 'imageUrl';
};

const isFinanceRecordEntityType = (entityType: string | null | undefined): boolean => {
    const normalized = normalizeContextToken(entityType);
    return [
        'finance_record',
        'finance_invoice',
        'invoice',
        'accounting_invoice',
        'accounting_invoices',
    ].includes(normalized);
};

const isBioPageLinkEntityType = (entityType: string | null | undefined): boolean => {
    const normalized = normalizeContextToken(entityType);
    return [
        'bio_page_link',
        'bio_link',
        'biopage_link',
        'link_in_bio',
        'link',
    ].includes(normalized);
};

const isBioPageEntityType = (entityType: string | null | undefined): boolean => {
    const normalized = normalizeContextToken(entityType);
    return [
        'bio_page',
        'biopage',
        'bio',
        'link_in_bio_page',
    ].includes(normalized);
};

const inferChatbotSurfaceFromRequest = (request: string): string | undefined => {
    const normalized = normalizeContextToken(request);
    if (normalized.includes('embed')) return 'embeddedWidget';
    if (normalized.includes('bio')) return 'bioPage';
    if (normalized.includes('storefront') || normalized.includes('store') || normalized.includes('tienda')) return 'storefront';
    if (normalized.includes('checkout')) return 'checkout';
    if (normalized.includes('booking') || normalized.includes('appointment') || normalized.includes('cita') || normalized.includes('reserva') || normalized.includes('calendar')) return 'bookingPage';
    if (normalized.includes('restaurant') || normalized.includes('restaurante') || normalized.includes('menu')) return 'restaurantMenu';
    if (normalized.includes('realty') || normalized.includes('real_estate') || normalized.includes('property') || normalized.includes('propiedad') || normalized.includes('listing')) return 'realtyPropertyPage';
    if (normalized.includes('voice') || normalized.includes('voz')) return 'voice';
    if (normalized.includes('admin') || normalized.includes('preview') || normalized.includes('test_lab') || normalized.includes('laboratorio')) return 'adminPreview';
    if (normalized.includes('website') || normalized.includes('web') || normalized.includes('site') || normalized.includes('pagina')) return 'webWidget';
    return undefined;
};

const inferChatbotDeploymentStatusFromRequest = (request: string): string | undefined => {
    const normalized = normalizeContextToken(request);
    if (normalized.includes('test') || normalized.includes('prueba') || normalized.includes('laboratorio')) return 'test';
    if (normalized.includes('pausa') || normalized.includes('pause')) return 'paused';
    if (normalized.includes('desactiva') || normalized.includes('disable') || normalized.includes('apaga')) return 'disabled';
    if (normalized.includes('draft') || normalized.includes('borrador')) return 'draft';
    if (normalized.includes('deploy') || normalized.includes('despliega') || normalized.includes('publica') || normalized.includes('activar') || normalized.includes('activa')) return 'deployed';
    return undefined;
};

const buildActionInput = (
    definition: AssistantActionDefinition,
    context: AssistantContextSnapshot,
    request: string,
    projectId?: string | null,
): Record<string, unknown> => {
    const actionInput: Record<string, unknown> = {
        request,
        ...(projectId ? { projectId } : {}),
    };

    if (['attach_asset_to_section', 'update_section_image'].includes(definition.actionType)) {
        const selectedSection = context.selectedSection
            || readSnapshotText(context, ['selectedSection', 'sectionId', 'activeSectionId']);
        if (selectedSection) actionInput.sectionId = selectedSection;

        const activeAssetId = isMediaAssetEntityType(context.activeEntityType)
            ? context.activeEntityId
            : null;
        const assetId = activeAssetId
            || readSnapshotText(context, ['activeAssetId', 'assetId', 'selectedAssetId', 'mediaAssetId']);
        if (assetId) actionInput.assetId = assetId;

        actionInput.path = readSnapshotText(context, ['selectedImagePath', 'assetTargetPath', 'sectionImagePath'])
            || inferSectionImagePathFromRequest(request);
        if (definition.actionType === 'attach_asset_to_section') actionInput.module = 'website';
    }

    if (definition.actionType === 'update_finance_record') {
        const activeFinanceRecordId = isFinanceRecordEntityType(context.activeEntityType)
            ? context.activeEntityId
            : null;
        const recordId = activeFinanceRecordId
            || readSnapshotText(context, [
                'activeInvoiceId',
                'selectedInvoiceId',
                'invoiceId',
                'financeRecordId',
                'selectedFinanceRecordId',
            ]);
        if (recordId) actionInput.recordId = recordId;
    }

    if (definition.actionType === 'edit_bio_link') {
        const activeLinkId = isBioPageLinkEntityType(context.activeEntityType)
            ? context.activeEntityId
            : null;
        const linkId = activeLinkId
            || readSnapshotText(context, [
                'activeBioPageLinkId',
                'selectedBioPageLinkId',
                'bioPageLinkId',
                'bioLinkId',
                'linkId',
            ]);
        if (linkId) actionInput.linkId = linkId;
    }

    if (definition.actionType === 'publish_bio_page') {
        const activeBioPageId = isBioPageEntityType(context.activeEntityType)
            ? context.activeEntityId
            : null;
        const bioPageId = activeBioPageId
            || readSnapshotText(context, [
                'activeBioPageId',
                'selectedBioPageId',
                'bioPageId',
            ]);
        if (bioPageId) actionInput.bioPageId = bioPageId;
    }

    if (definition.actionType === 'test_chatbot') {
        actionInput.prompt = readSnapshotText(context, ['chatbotTestPrompt', 'testPrompt', 'prompt'])
            || request;
    }

    if (definition.actionType === 'deploy_chatbot_to_surface') {
        const surface = readSnapshotText(context, [
            'chatbotSurface',
            'chatbotDeploymentSurface',
            'deploymentSurface',
            'surface',
        ]) || inferChatbotSurfaceFromRequest(request);
        if (surface) actionInput.surface = surface;

        const status = readSnapshotText(context, [
            'chatbotDeploymentStatus',
            'deploymentStatus',
            'targetStatus',
        ]) || inferChatbotDeploymentStatusFromRequest(request);
        if (status) actionInput.status = status;
    }

    return actionInput;
};

export function buildExecutionPlan(input: BuildExecutionPlanInput): AssistantExecutionPlan {
    const { context, intent } = input;
    const actions: AssistantAction[] = [];
    const previews: AssistantExecutionPreview[] = [];
    const approvals: AssistantApprovalRequest[] = [];
    const blockers: string[] = [];
    const intentBlockers = intent.requiresClarification
        ? [`Clarification required: ${intent.clarifyingQuestion || 'More information is needed before planning this request.'}`]
        : [];

    for (const definition of input.actionDefinitions) {
        const projectId = definition.module === 'project'
            ? input.intent.projectResolution.projectId || context.project.projectId
            : context.project.projectId;
        const actionInput = buildActionInput(definition, context, input.request, projectId);
        const permission = checkActionPermission({
            definition,
            context,
            userPermissions: input.userPermissions,
            enabledServices: input.enabledServices,
            enabledFeatures: input.enabledFeatures,
        });
        const actionBlockers = [
            ...intentBlockers,
            ...getToolReadinessBlockers(definition),
            ...permission.reasons,
            ...permission.missingPermissions.map(permission => `Missing permission: ${permission}.`),
            ...(requiresProjectContext(definition)
                ? assertProjectActionContext(context, actionInput.projectId as string | undefined)
                : []),
            ...(definition.validate?.(actionInput)?.errors || []),
        ];

        if (actionBlockers.length > 0) {
            blockers.push(...actionBlockers.map(reason => `${definition.actionType}: ${reason}`));
        }

        const action = createAction(definition, context, actionInput);
        const preview = createPreview(action, definition, actionBlockers);
        actions.push(action);

        if (definition.previewSupported) {
            previews.push(preview);
        }
        if (permission.requiresConfirmation) {
            approvals.push(createApproval(action, definition, preview));
        }
    }

    const requiresConfirmation = approvals.length > 0;
    const status: AssistantExecutionPlan['status'] = blockers.length > 0
        ? 'blocked'
        : requiresConfirmation || previews.length > 0
            ? 'preview'
            : 'draft';

    return {
        id: createId('asst_plan'),
        contextSnapshotId: context.id,
        intent,
        actions,
        previews,
        approvals,
        safetyLevel: intent.safetyLevel,
        requiresConfirmation,
        status,
        blockers,
        createdAt: nowIso(),
    };
}

export function assertPlanIsPreviewFirst(plan: AssistantExecutionPlan): string[] {
    const errors: string[] = [];
    for (const action of plan.actions) {
        const mutatesData = action.metadata?.mutatesData === true || action.metadata?.previewSupported === true;
        if (mutatesData && !plan.previews.some(preview => preview.actionId === action.id)) {
            errors.push(`Mutating action ${action.actionType} is missing execution preview.`);
        }
    }
    if (plan.safetyLevel === 'high' || plan.safetyLevel === 'critical') {
        if (!plan.requiresConfirmation || plan.approvals.length === 0) {
            errors.push('High or critical execution plan requires approval request.');
        }
    }
    return errors;
}
