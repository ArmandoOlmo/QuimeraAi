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
        expect(typeof globalAssistantActionRegistry.get('edit_website_section')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_section_copy')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_section_image')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('reorder_sections')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('toggle_section_visibility')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('publish_website')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('publish_website')?.rollback).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('unpublish_website')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('unpublish_website')?.rollback).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('attach_asset_to_section')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('add_storefront_section')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('edit_storefront_theme')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_product_card_style')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('search_projects')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_project_metadata')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_project_metadata')?.rollback).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('search_tenants')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_email_campaign')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('generate_email_copy')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_product')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('edit_product')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_price')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_inventory')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_discount')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_lead')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('search_leads')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_lead')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('summarize_leads')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_follow_up_task')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_appointment')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_appointment')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('configure_availability')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_bio_page')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('edit_bio_link')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('edit_bio_link')?.rollback).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('publish_bio_page')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('publish_bio_page')?.rollback).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('create_finance_record')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_finance_record')?.execute).toBe('function');
        expect(typeof globalAssistantActionRegistry.get('update_finance_record')?.rollback).toBe('function');
    });

    it('blocks admin actions outside owner or super admin mode', () => {
        const definition = globalAssistantActionRegistry.get('update_feature_flag');
        const searchTenants = globalAssistantActionRegistry.get('search_tenants');
        expect(definition).toBeDefined();
        expect(searchTenants).toBeDefined();

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

        expect(checkActionPermission({
            definition: searchTenants!,
            context: makeContext(),
        })).toMatchObject({
            allowed: false,
            missingPermissions: ['assistant:admin:use'],
        });
        expect(checkActionPermission({
            definition: searchTenants!,
            context: makeContext('owner', 'owner'),
        })).toMatchObject({ allowed: true });
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
        expect(plan.previews[0]).toMatchObject({
            before: { exists: false, table: 'email_campaigns' },
            after: {
                operation: 'create_review_draft',
                table: 'email_campaigns',
                status: 'draft',
                needsReview: true,
            },
            diff: {
                created: ['email_campaigns.$pending'],
                reviewRequired: true,
                rollback: 'delete_created_draft',
            },
        });
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

    it('blocks catalogued actions that are not wired to real execution handlers', () => {
        const definition = globalAssistantActionRegistry.get('send_email_campaign');
        expect(definition).toBeDefined();

        const plan = buildExecutionPlan({
            context: makeContext('owner', 'owner'),
            intent: {
                ...intent,
                intent: 'publish',
                module: 'emailMarketing',
                actionCandidates: ['send_email_campaign'],
                safetyLevel: 'critical',
            },
            actionDefinitions: [definition!],
            request: 'Envia la campana de email ya',
            userPermissions: ['assistant:emailMarketing:use'],
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(plan.status).toBe('blocked');
        expect(plan.blockers.join(' ')).toContain('No execute handler registered for send_email_campaign.');
        expect(plan.actions[0].metadata).toMatchObject({ executable: false });
        expect(plan.previews).toHaveLength(1);
        expect(plan.approvals).toHaveLength(1);
    });
});
