import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Agency Client Provisioning Global Assistant contract', () => {
    const registry = read('services/globalAssistant/globalAssistantActionRegistry.ts');
    const handlers = read('services/globalAssistant/globalAssistantActionHandlers.ts');
    const previews = read('services/globalAssistant/globalAssistantActionPreviews.ts');
    const router = read('services/globalAssistant/globalAssistantIntentRouter.ts');
    const onboardingApi = read('supabase/functions/onboarding-api/index.ts');

    it('registers create_agency_client as a confirmed Agency Engine operation', () => {
        expect(registry).toContain("action('agency', 'create_agency_client'");
        expect(registry).toContain("requiredService: 'agency'");
        expect(registry).toContain("requiredFeature: 'agencyModule'");
        expect(registry).toContain("requiredPermissions: ['assistant:agency:use', 'assistant:agency:settings']");
        expect(registry).toContain('rollbackSupported: false');
        expect(registry).toContain('selectedPlanId');
        expect(registry).toContain('BusinessBlueprint');
    });

    it('delegates client provisioning to onboarding-api instead of creating tenant/project rows locally', () => {
        const start = handlers.indexOf('const createAgencyClientProvisioningHandler');
        const end = handlers.indexOf('const createAgencyProjectTransferHandler', start);
        const handlerBlock = handlers.slice(start, end);

        expect(handlers).toContain('create_agency_client: createAgencyClientProvisioningHandler');
        expect(handlerBlock).toContain("await invokeFunction(deps, 'onboarding-api'");
        expect(handlerBlock).toContain("action: 'autoProvision'");
        expect(handlerBlock).toContain('Agency client provisioning requires an active service plan owned by the active agency tenant.');
        expect(handlerBlock).toContain('Agency client provisioning requires selectedPlanId or an active default agency service plan.');
        expect(handlerBlock).toContain('selectedPlanId');
        expect(handlerBlock).not.toContain("insertRow(client, 'tenants'");
        expect(handlerBlock).not.toContain("insertRow(client, 'projects'");
    });

    it('previews draft provisioning without auto-publish or Stripe checkout creation', () => {
        expect(previews).toContain("if (action.actionType === 'create_agency_client')");
        expect(previews).toContain("functionName: 'onboarding-api'");
        expect(previews).toContain("operation: 'agency_client_auto_provision'");
        expect(previews).toContain("tenantType: 'agency_client'");
        expect(previews).toContain("projectStatus: 'Draft'");
        expect(previews).toContain("businessBlueprintStatus: 'needs_review'");
        expect(previews).toContain('noAutoPublish: true');
        expect(previews).toContain("'tenants.$pending'");
        expect(previews).toContain("'agency_clients.$pending'");
        expect(previews).toContain("'tenant_invites.$pending'");
        expect(previews).toContain('no Stripe checkout is created by this action');
    });

    it('routes agency client creation language to create_agency_client while keeping project transfer separate', () => {
        expect(router).toContain("return ['create_agency_client']");
        expect(router).toContain("create: ['create_agency_client']");
        expect(router).toContain("return ['transfer_agency_project']");
        expect(router).toContain('nuevo cliente');
        expect(router).toContain('project transfer');
    });

    it('uses the existing onboarding-api Service Access and selected plan assignment contract', () => {
        expect(onboardingApi).toContain('case "autoProvision"');
        expect(onboardingApi).toContain('moduleId: "agency-client-provisioning"');
        expect(onboardingApi).toContain('requiredPermission: "canManageSettings"');
        expect(onboardingApi).toContain('const selectedPlanId = payload.selectedPlanId ? String(payload.selectedPlanId) : null');
        expect(onboardingApi).toContain('async function countAgencyManagedClients(agencyTenantId: string)');
        expect(onboardingApi).toContain('.from("agency_clients")');
        expect(onboardingApi).toContain('.select("client_tenant_id")');
        expect(onboardingApi).toContain('.eq("owner_tenant_id", agencyTenantId)');
        expect(onboardingApi).toContain('const subClientCount = await countAgencyManagedClients(agencyTenantId)');
        expect(onboardingApi).toContain('requestedUsage: { resource: "subClients", amount: 1, used: subClientCount }');
        expect(onboardingApi).toContain('fetchAgencyServicePlan(agencyTenantId, selectedPlanId)');
        expect(onboardingApi).toContain('agency_plan_id: agencyPlan?.id || selectedPlanId');
        expect(onboardingApi).toContain('businessBlueprintCreated: true');
        expect(onboardingApi).toContain('moduleActivationsPrepared: true');
    });
});
