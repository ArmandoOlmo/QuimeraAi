import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency provisioning BusinessBlueprint contract', () => {
    const onboardingApi = read('supabase/functions/onboarding-api/index.ts');
    const onboardingWorkflow = read('components/dashboard/agency/OnboardingWorkflow.tsx');

    it('maps agency AI generation flags to canonical client modules', () => {
        expect(onboardingApi).toContain('const AGENCY_ENGINE_FOUNDATION_MODULES = [');
        expect(onboardingApi).toContain('"ai-business-blueprint"');
        expect(onboardingApi).toContain('"design-system"');
        expect(onboardingApi).toContain('const modules = new Set<string>(AGENCY_ENGINE_FOUNDATION_MODULES)');
        expect(onboardingApi).toContain('modules.add("ecommerce-engine")');
        expect(onboardingApi).toContain('modules.add("storefront-builder")');
        expect(onboardingApi).toContain('modules.add("chatbot-engine")');
        expect(onboardingApi).toContain('modules.add("email-marketing")');
        expect(onboardingApi).toContain('modules.add("appointments-engine")');
        expect(onboardingApi).toContain('modules.add("restaurant-engine")');
        expect(onboardingApi).toContain('modules.add("real-estate-engine")');
        expect(onboardingApi).toContain('modules.add("bio-page-engine")');
        expect(onboardingApi).toContain('modules.add("media-assets")');
        expect(onboardingApi).toContain('modules.add("finance")');
        expect(onboardingApi).toContain('payload.setupBilling');
        expect(onboardingApi).toContain('Number(payload.monthlyPrice || 0) > 0');
    });

    it('creates the canonical BusinessBlueprint envelope expected by AI Studio and engines', () => {
        [
            'schemaVersion: 1',
            'source: "ai-studio"',
            'readiness: readiness(',
            'sourceMap: {',
            'metadata: {',
            'businessProfile: {',
            'brandProfile: {',
            'websiteBlueprint: {',
            'storefrontBlueprint: {',
            'ecommerceBlueprint: {',
            'chatbotBlueprint: {',
            'leadBlueprint: {',
            'emailMarketingBlueprint: {',
            'mediaBlueprint: {',
            'bioPageBlueprint: {',
            'appointmentsBlueprint: {',
            'restaurantBlueprint: {',
            'realEstateBlueprint: {',
            'financeBlueprint: {',
            'analyticsBlueprint: {',
            'automationBlueprint: {',
            'crossModuleSync: {',
            'agencyOperatingSystem,',
        ].forEach((expected) => expect(onboardingApi).toContain(expected));
    });

    it('persists the Agency Operating System map for Client 360 and Command Center', () => {
        [
            'const AGENCY_ENGINE_CLIENT_360_MODULES = [',
            '{ id: "businessBlueprint", canonicalSystem: "businessBlueprint", ownerModuleId: "ai-business-blueprint" }',
            '{ id: "website-builder", canonicalSystem: "websiteBuilder", ownerModuleId: "website-builder" }',
            '{ id: "storefront-builder", canonicalSystem: "storefrontBuilder", ownerModuleId: "storefront-builder" }',
            '{ id: "ecommerce", canonicalSystem: "ecommerce", ownerModuleId: "ecommerce-engine" }',
            '{ id: "crm-leads", canonicalSystem: "crm", ownerModuleId: "crm-leads" }',
            '{ id: "email-marketing", canonicalSystem: "emailMarketing", ownerModuleId: "email-marketing" }',
            '{ id: "appointments", canonicalSystem: "appointments", ownerModuleId: "appointments-engine" }',
            '{ id: "restaurants", canonicalSystem: "restaurants", ownerModuleId: "restaurant-engine" }',
            '{ id: "realty", canonicalSystem: "realEstate", ownerModuleId: "real-estate-engine" }',
            '{ id: "bio-page", canonicalSystem: "bioPage", ownerModuleId: "bio-page-engine" }',
            '{ id: "chatcore", canonicalSystem: "chatbot", ownerModuleId: "chatbot-engine" }',
            '{ id: "media-ai", canonicalSystem: "media", ownerModuleId: "media-assets" }',
            '{ id: "finance", canonicalSystem: "finance", ownerModuleId: "finance" }',
            '{ id: "analytics", canonicalSystem: "analytics", ownerModuleId: "analytics-engine" }',
            'function buildAgencyOperatingSystem(input: {',
            'foundationModuleIds: Array.from(AGENCY_ENGINE_FOUNDATION_MODULES)',
            'generatedModuleIds: input.modules',
            'client360ModuleIds: AGENCY_ENGINE_CLIENT_360_MODULES.map((module) => module.id)',
            'enabledClient360ModuleIds',
            'serviceAccessRequired: true',
            'moduleId: "agency-command-center"',
            'moduleId: "agency-client-360"',
            'moduleId: "agency-client-portal"',
            'agencyOperatingSystem: "agencyOperatingSystem"',
            'agencyOperatingSystem,',
            'client360ModuleIds: agencyOperatingSystem.enabledClient360ModuleIds',
            'foundationModuleIds: agencyOperatingSystem.foundationModuleIds',
        ].forEach((expected) => expect(onboardingApi).toContain(expected));
    });

    it('keeps generated assets draft-safe until the agency or client reviews them', () => {
        [
            'status: "needs_review"',
            'noRuntimeActivated: true',
            'noAutoPublish: true',
            'noPublicRoutesEnabled: true',
            'noCheckoutSessionCreated: true',
            'noStripeObjectCreated: true',
            'noEmailSent: true',
            'noAppointmentSlotsCreated: true',
            'noRestaurantMenuPublished: true',
            'noRealtyListingsPublished: true',
            'runtimeEnabled: false',
            'publicWidgetEnabled: false',
            'paymentMode: "not_configured"',
            'publishStatus: "not_published"',
            'isPublished: false',
            'needsMerchantReview: true',
        ].forEach((expected) => expect(onboardingApi).toContain(expected));

        expect(onboardingApi).not.toContain('paymentMode: "live"');
        expect(onboardingApi).not.toContain('publicWidgetEnabled: true');
        expect(onboardingApi).not.toContain('stripe.checkout.sessions.create');
    });

    it('persists the selected agency service plan and blueprint on the provisioned project', () => {
        expect(onboardingApi).toContain('const selectedPlanId = payload.selectedPlanId ? String(payload.selectedPlanId) : null');
        expect(onboardingApi).toContain('countAgencyManagedClients(agencyTenantId)');
        expect(onboardingApi).toContain('requestedUsage: { resource: "subClients", amount: 1, used: subClientCount }');
        expect(onboardingApi).toContain('fetchAgencyServicePlan(agencyTenantId, selectedPlanId)');
        expect(onboardingApi).toContain('agencyPlan?.id || selectedPlanId');
        expect(onboardingApi).toContain('const businessBlueprint = buildInitialBusinessBlueprint({');
        expect(onboardingApi).toContain('const agencyOperatingSystem = businessBlueprint.agencyOperatingSystem');
        expect(onboardingApi).toContain('data: {');
        expect(onboardingApi).toContain('businessBlueprint,');
        expect(onboardingApi).toContain('agencyOperatingSystem,');
        expect(onboardingApi).toContain('effectivePlanId,');
        expect(onboardingApi).toContain('billingMode,');
        expect(onboardingApi).toContain('moduleActivationsPrepared: true');
    });

    it('uploads agency client logos to Supabase Storage and sends logoUrl to the blueprint', () => {
        expect(onboardingWorkflow).toContain("const CLIENT_LOGO_BUCKET = 'platform-assets'");
        expect(onboardingWorkflow).toContain('uploadClientLogoToStorage(supabase, currentTenant.id, data.logo)');
        expect(onboardingWorkflow).toContain('.storage');
        expect(onboardingWorkflow).toContain('.upload(storagePath, file');
        expect(onboardingWorkflow).toContain('.getPublicUrl(storagePath)');
        expect(onboardingWorkflow).toContain('logoUrl,');
        expect(onboardingWorkflow).not.toContain('https://example.com/logo.png');
        expect(onboardingWorkflow).not.toContain('simulate');
        expect(onboardingWorkflow).not.toContain('Placeholder');
    });

    it('routes client approval responses through Service Access Engine', () => {
        expect(onboardingApi).toContain('return jsonResponse(await respondClientApproval(req, user.id, payload))');
        expect(onboardingApi).toContain('async function respondClientApproval(req: Request, userId: string, payload: Record<string, unknown>)');
        expect(onboardingApi).toContain('moduleId: "agency-client-portal"');
        expect(onboardingApi).toContain('serviceId: "agency"');
        expect(onboardingApi).toContain('action: "agency-client-approval-response"');
        expect(onboardingApi).not.toContain(`moduleId: "agency-client-portal",
    serviceId: "agency",
    featureKey: "agencyModule"`);
    });

    it('preserves a Version History checkpoint during Agency Project Transfer', () => {
        [
            'moduleId: "agency-project-transfer"',
            'requiredPermission: "canManageProjects"',
            '.select("agency_tenant_id, client_tenant_id, project_count, primary_project_id, agency_plan_id, billing_mode, metadata")',
            'payload.projectName || payload.name || sourceProject.name || "Transferred Project"',
            'const agencyClientMetadata = asRecord(agencyClient?.metadata)',
            'const relationshipAgencyOperatingSystem = asRecord(agencyClientMetadata.agencyOperatingSystem)',
            'const sourceAgencyOperatingSystem = asRecord(sourceBlueprint?.agencyOperatingSystem || sourceData.agencyOperatingSystem)',
            'const transferAgencyOperatingSystem = hasAgencyOperatingSystem',
            'serviceAccessRequired: true',
            'source: "agency_transfer"',
            'changeType: "transfer_checkpoint"',
            'createAgencyTransferSnapshot({',
            'appendAgencyTransferSnapshot(sourceData, transferSnapshot)',
            'versionSnapshotId: transferSnapshot.id',
            'versionHistoryPreserved: true',
            'agencyPlanId: transferAgencyPlanId || null',
            'billingMode: transferBillingMode || null',
            'agencyOperatingSystem: transferAgencyOperatingSystem',
            'enabledClient360ModuleIds: transferEnabledClient360ModuleIds',
            'generatedModuleIds: transferGeneratedModuleIds',
            'client360ModuleIds: transferClient360ModuleIds',
            'foundationModuleIds: transferFoundationModuleIds',
            'agencyOperatingSystem: transferAgencyOperatingSystem,',
            'agencyProvisioning: {',
            'transferredFromAgency: true',
            'stripVersionHistoryFromProjectData(input.sourceData)',
            'data: nextData,',
            'agencyOperatingSystemAttached: Boolean(transferAgencyOperatingSystem)',
            'status: "Draft"',
            'published_data: null',
            'published_at: null',
            '.from("agency_project_transfers")',
            '.from("agency_client_approvals")',
        ].forEach((expected) => expect(onboardingApi).toContain(expected));
    });
});
