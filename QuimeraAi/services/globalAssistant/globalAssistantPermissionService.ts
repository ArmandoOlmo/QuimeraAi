import type {
    AssistantActionDefinition,
    AssistantContextSnapshot,
    AssistantMemoryItem,
    AssistantPermissionCheck,
    GlobalAssistantMode,
} from '../../types/globalAssistant';
import { normalizeRoleKey } from '../../constants/roles';

export const ADMIN_ASSISTANT_MODES: GlobalAssistantMode[] = ['owner', 'super_admin', 'system'];
export const ADMIN_ROLES = new Set(['owner', 'superadmin', 'admin']);

export const isAdminMode = (mode?: GlobalAssistantMode | null): boolean =>
    Boolean(mode && ADMIN_ASSISTANT_MODES.includes(mode));

export const isAdminRole = (role?: string | null): boolean =>
    Boolean(role && ADMIN_ROLES.has(normalizeRoleKey(role)));

export const canUseAdminMode = (context: Pick<AssistantContextSnapshot, 'actor'>): boolean =>
    isAdminMode(context.actor.mode) || context.actor.isOwner === true || context.actor.isSuperAdmin === true || isAdminRole(context.actor.role);

const MODULE_USE_PERMISSION_PATTERN = /^assistant:[^:]+:use$/;

const hasScopedAgencyMutationPermission = (
    definition: AssistantActionDefinition,
    userPermissions: Set<string>,
): boolean => {
    if (definition.module !== 'agency') return false;
    return definition.requiredPermissions.some(permission =>
        permission.startsWith('assistant:agency:')
        && !MODULE_USE_PERMISSION_PATTERN.test(permission)
        && userPermissions.has(permission),
    );
};

export interface ActionPermissionInput {
    definition: AssistantActionDefinition;
    context: AssistantContextSnapshot;
    userPermissions?: string[];
    enabledServices?: string[];
    enabledFeatures?: string[];
}

export function checkActionPermission(input: ActionPermissionInput): AssistantPermissionCheck {
    const { definition, context } = input;
    const userPermissions = new Set(input.userPermissions || []);
    const enabledServices = new Set(input.enabledServices || context.tenant.activeServices || []);
    const enabledFeatures = new Set(input.enabledFeatures || context.tenant.featureFlags || []);
    const reasons: string[] = [];
    const missingPermissions: string[] = [];

    if (definition.module === 'admin' && !canUseAdminMode(context)) {
        reasons.push('Admin action requested outside Owner/Super Admin mode.');
    }

    if (context.actor.mode === 'user' && definition.module === 'admin') {
        reasons.push('User mode cannot execute admin actions.');
    }

    if (definition.mutatesData && !isAdminMode(context.actor.mode) && !hasScopedAgencyMutationPermission(definition, userPermissions)) {
        reasons.push('Mutating assistant actions require Owner or Super Admin mode.');
    }

    if (definition.requiredService && !enabledServices.has(definition.requiredService)) {
        reasons.push(`Required service is not available: ${definition.requiredService}.`);
    }

    if (definition.requiredFeature && !enabledFeatures.has(definition.requiredFeature)) {
        reasons.push(`Required feature is not enabled: ${definition.requiredFeature}.`);
    }

    if (!canUseAdminMode(context)) {
        for (const permission of definition.requiredPermissions) {
            if (permission.startsWith('assistant:admin:') || (userPermissions.size > 0 && !userPermissions.has(permission))) {
                missingPermissions.push(permission);
            }
        }
    }

    const requiresPreview = definition.mutatesData === true || definition.previewSupported === true;
    const requiresConfirmation = definition.requiresConfirmation || definition.safetyLevel === 'high' || definition.safetyLevel === 'critical';

    if (definition.mutatesData && !definition.previewSupported) {
        reasons.push('Mutating actions must support preview before apply.');
    }

    if ((definition.safetyLevel === 'high' || definition.safetyLevel === 'critical') && !requiresConfirmation) {
        reasons.push('High and critical actions must require confirmation.');
    }

    return {
        allowed: reasons.length === 0 && missingPermissions.length === 0,
        requiresConfirmation,
        requiresPreview,
        reasons,
        missingPermissions,
    };
}

export interface MemoryAccessInput {
    item: Pick<AssistantMemoryItem, 'scope' | 'tenantId' | 'projectId' | 'userId' | 'module'>;
    context: AssistantContextSnapshot;
}

export function checkMemoryAccess(input: MemoryAccessInput): AssistantPermissionCheck {
    const { item, context } = input;
    const reasons: string[] = [];

    if (item.scope === 'admin' && !canUseAdminMode(context)) {
        reasons.push('Admin memory is not available in user mode.');
    }

    if (item.scope === 'system' && context.actor.mode !== 'system' && !canUseAdminMode(context)) {
        reasons.push('System memory requires system or admin mode.');
    }

    if (item.tenantId && context.tenant.tenantId && item.tenantId !== context.tenant.tenantId && !canUseAdminMode(context)) {
        reasons.push('Memory belongs to a different tenant.');
    }

    if (item.userId && context.actor.userId && item.userId !== context.actor.userId && !canUseAdminMode(context)) {
        reasons.push('Memory belongs to a different user.');
    }

    if (
        item.projectId &&
        context.project.projectId &&
        item.projectId !== context.project.projectId &&
        item.scope !== 'tenant' &&
        item.scope !== 'user' &&
        !canUseAdminMode(context)
    ) {
        reasons.push('Memory belongs to a different project.');
    }

    return {
        allowed: reasons.length === 0,
        requiresConfirmation: false,
        requiresPreview: false,
        reasons,
        missingPermissions: [],
    };
}

export function assertProjectActionContext(context: AssistantContextSnapshot, projectId?: string | null): string[] {
    const reasons: string[] = [];
    const targetProjectId = projectId || context.project.projectId;

    if (!targetProjectId) {
        reasons.push('Project-scoped action requires a projectId.');
    }

    if (
        projectId &&
        context.project.projectId &&
        projectId !== context.project.projectId &&
        !canUseAdminMode(context)
    ) {
        reasons.push('Action targets a non-active project and requires explicit project switch confirmation.');
    }

    return reasons;
}
