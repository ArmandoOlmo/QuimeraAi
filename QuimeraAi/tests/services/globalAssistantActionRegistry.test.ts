import { describe, expect, it } from 'vitest';
import { globalAssistantActionRegistry } from '../../services/globalAssistant/globalAssistantActionRegistry.ts';
import { buildExecutionPlan, assertPlanIsPreviewFirst } from '../../services/globalAssistant/globalAssistantExecutionEngine.ts';
import { checkActionPermission } from '../../services/globalAssistant/globalAssistantPermissionService.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';
import type { AssistantIntent } from '../../types/globalAssistant.ts';

const activeProject = {
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft' as const,
    tenantId: 'tenant-1',
    userId: 'user-1',
};

const makeContext = (role = 'member', mode?: 'user' | 'owner' | 'super_admin') =>
    resolveCurrentAssistantContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role,
        mode,
        activeProject,
        activeServices: ['emailMarketing', 'ecommerce', 'appointments'],
        featureFlags: ['emailMarketing', 'ecommerceEnabled'],
    });

const intent: AssistantIntent = {
    intent: 'create',
    module: 'emailMarketing',
    confidence: 0.9,
    projectResolution: {
        projectId: 'project-1',
        requiresProjectSwitch: false,
        ambiguous: false,
    },
    actionCandidates: ['create_email_campaign'],
    requiresClarification: false,
    safetyLevel: 'high',
};

describe('GlobalAssistantActionRegistry', () => {
    it('registers high-risk platform actions as confirmation-first', () => {
        const sendCampaign = globalAssistantActionRegistry.get('send_email_campaign');
        const updatePrice = globalAssistantActionRegistry.get('update_price');
        const updateServiceAvailability = globalAssistantActionRegistry.get('update_service_availability');

        expect(sendCampaign).toMatchObject({
            safetyLevel: 'critical',
            requiresConfirmation: true,
            previewSupported: true,
            rollbackSupported: false,
        });
        expect(updatePrice).toMatchObject({
            safetyLevel: 'critical',
            requiresConfirmation: true,
            previewSupported: true,
        });
        expect(updateServiceAvailability).toMatchObject({
            module: 'admin',
            safetyLevel: 'critical',
            requiresConfirmation: true,
        });
    });

    it('blocks admin actions outside owner or super admin mode', () => {
        const definition = globalAssistantActionRegistry.get('update_feature_flag');
        expect(definition).toBeDefined();

        const userPermission = checkActionPermission({
            definition: definition!,
            context: makeContext(),
        });
        expect(userPermission.allowed).toBe(false);
        expect(userPermission.reasons.join(' ')).toContain('Admin action');
        expect(userPermission.missingPermissions).toContain('assistant:admin:write');

        const ownerPermission = checkActionPermission({
            definition: definition!,
            context: makeContext('owner', 'owner'),
        });
        expect(ownerPermission.allowed).toBe(true);
    });

    it('builds preview and approval requests for mutating actions', () => {
        const definition = globalAssistantActionRegistry.get('create_email_campaign');
        expect(definition).toBeDefined();

        const plan = buildExecutionPlan({
            context: makeContext(),
            intent,
            actionDefinitions: [definition!],
            request: 'Crea una campana de email para reservas',
        });

        expect(plan.status).toBe('preview');
        expect(plan.requiresConfirmation).toBe(true);
        expect(plan.previews).toHaveLength(1);
        expect(plan.approvals).toHaveLength(1);
        expect(assertPlanIsPreviewFirst(plan)).toEqual([]);
    });

    it('blocks actions when required services or feature flags are unavailable', () => {
        const definition = globalAssistantActionRegistry.get('update_price');
        expect(definition).toBeDefined();

        const permission = checkActionPermission({
            definition: definition!,
            context: resolveCurrentAssistantContext({
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'member',
                activeProject,
                activeServices: [],
                featureFlags: [],
            }),
        });

        expect(permission.allowed).toBe(false);
        expect(permission.reasons).toContain('Required service is not available: ecommerce.');
        expect(permission.reasons).toContain('Required feature is not enabled: ecommerceEnabled.');
    });
});
