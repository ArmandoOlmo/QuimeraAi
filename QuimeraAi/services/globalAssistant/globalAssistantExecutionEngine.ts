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
        const actionInput: Record<string, unknown> = {
            request: input.request,
            ...(projectId ? { projectId } : {}),
        };
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
