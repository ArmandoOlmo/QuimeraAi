import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency provisioning BusinessBlueprint contract', () => {
    const onboardingApi = read('supabase/functions/onboarding-api/index.ts');
    const onboardingWorkflow = read('components/dashboard/agency/OnboardingWorkflow.tsx');

    it('maps agency AI generation flags to canonical client modules', () => {
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
        expect(onboardingApi).toContain('fetchAgencyServicePlan(agencyTenantId, selectedPlanId)');
        expect(onboardingApi).toContain('agencyPlan?.id || selectedPlanId');
        expect(onboardingApi).toContain('const businessBlueprint = buildInitialBusinessBlueprint({');
        expect(onboardingApi).toContain('data: {');
        expect(onboardingApi).toContain('businessBlueprint,');
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
            'source: "agency_transfer"',
            'changeType: "transfer_checkpoint"',
            'createAgencyTransferSnapshot({',
            'appendAgencyTransferSnapshot(sourceData, transferSnapshot)',
            'versionSnapshotId: transferSnapshot.id',
            'versionHistoryPreserved: true',
            'stripVersionHistoryFromProjectData(input.sourceData)',
            'data: nextData,',
            'status: "Draft"',
            'published_data: null',
            'published_at: null',
            '.from("agency_project_transfers")',
            '.from("agency_client_approvals")',
        ].forEach((expected) => expect(onboardingApi).toContain(expected));
    });
});
