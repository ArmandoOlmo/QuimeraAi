import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency production readiness contract', () => {
    const migration = read('supabase/migrations/20260701153400_agency_production_ready_hardening.sql');
    const contractCompatMigration = read('supabase/migrations/20260701200825_agency_usage_ledger_contract_compat.sql');
    const platformOwnerRoleNormalizationMigration = read('supabase/migrations/20260701222000_platform_owner_role_normalization.sql');
    const agencyPaymentLinkFailureStatusMigration = read('supabase/migrations/20260701230049_agency_payment_link_failure_statuses.sql');
    const stripeWebhook = read('supabase/functions/stripe-webhook/index.ts');
    const agencyMetricsHook = read('hooks/useAgencyMetrics.ts');
    const useServiceAccessHook = read('hooks/useServiceAccess.ts');
    const agencyOverview = read('components/dashboard/agency/AgencyOverview.tsx');
    const readinessProbe = read('scripts/production-readiness-probe.mjs');
    const vercelReadinessRunner = read('scripts/run-vercel-production-readiness-probe.mjs');
    const agencyRlsNegativeProbe = read('scripts/agency-rls-negative-probe.mjs');
    const agencySchemaContractProbe = read('scripts/agency-schema-contract-probe.mjs');
    const agencyReadinessRoute = read('api/agency/readiness.ts');
    const agencyReadinessService = read('services/agency/agencyReadinessService.ts');
    const agencyStripeApiProxy = read('api/agency/_lib/stripeEdgeProxy.ts');
    const agencyAccessHelper = read('api/agency/_lib/agencyAccess.ts');
    const agencyClientCreateRoute = read('api/agency/clients/create.ts');
    const agencyProjectTransferRoute = read('api/agency/projects/transfer.ts');
    const agencyApprovalRespondRoute = read('api/agency/approvals/respond.ts');
    const agencyPlanRouteLib = read('api/agency/plans/_lib.ts');
    const agencyPlanSaveRoute = read('api/agency/plans/save.ts');
    const agencyPlanArchiveRoute = read('api/agency/plans/archive.ts');
    const agencyPlanRestoreRoute = read('api/agency/plans/restore.ts');
    const agencyPlanDeleteRoute = read('api/agency/plans/delete.ts');
    const agencyPaymentLinkCreateRoute = read('api/agency/payment-links/create.ts');
    const agencyPaymentLinkInfoRoute = read('api/agency/payment-links/info.ts');
    const agencyPaymentLinkCheckoutRoute = read('api/agency/payment-links/start-checkout.ts');
    const agencySnapshotCreateRoute = read('api/agency/snapshots/create.ts');
    const agencySnapshotPreviewRoute = read('api/agency/snapshots/apply-preview.ts');
    const agencySnapshotApplyRoute = read('api/agency/snapshots/apply.ts');
    const agencyStripeWebhookRoute = read('api/agency/stripe/webhook.ts');
    const agencyPaymentLinkModal = read('components/dashboard/agency/GeneratePaymentLink.tsx');
    const agencyCheckoutPage = read('components/checkout/AgencyCheckoutPage.tsx');
    const agencyOnboardingWorkflow = read('components/dashboard/agency/OnboardingWorkflow.tsx');
    const agencyProjectTransferModal = read('components/dashboard/agency/ProjectTransferModal.tsx');
    const agencyApprovalService = read('services/agency/agencyApprovalService.ts');
    const agencySnapshotCenter = read('components/dashboard/agency/AgencySnapshotCenter.tsx');
    const agencyPlanEditor = read('components/dashboard/agency/plans/AgencyPlanEditor.tsx');
    const agencyPlanManager = read('components/dashboard/agency/plans/AgencyPlanManager.tsx');
    const agencyPlanApiClient = read('services/agency/agencyPlanMutationApiClient.ts');
    const packageJson = read('package.json');
    const agencyStripeBillingHelper = read('supabase/functions/_shared/agency-stripe-billing.ts');
    const agencyWebhookService = read('services/agency/agencyWebhookService.ts');
    const agencyUsageLedgerService = read('services/agency/agencyUsageLedgerService.ts');
    const agencyActivityService = read('services/agency/agencyActivityService.ts');
    const reportingService = read('services/reportingService.ts');
    const agencySnapshotService = read('services/agency/agencySnapshotService.ts');
    const globalAssistantActionHandlers = read('services/globalAssistant/globalAssistantActionHandlers.ts');
    const onboardingApi = read('supabase/functions/onboarding-api/index.ts');
    const agencyPublicE2e = read('tests/e2e/agency-public.public.spec.ts');

    it('hardens platform subscription plan RLS without mixing Agency service plans into platform billing', () => {
        expect(migration).toContain('drop policy if exists "Authenticated users can manage subscription plans"');
        expect(migration).toContain('create policy "Platform owners can manage subscription plans"');
        expect(migration).toContain('using (public.quimera_is_platform_owner())');
        expect(platformOwnerRoleNormalizationMigration).toContain("translate(lower(coalesce(u.role, 'user')), ' _-', '')");
        expect(platformOwnerRoleNormalizationMigration).toContain("'superadmin'");
        expect(platformOwnerRoleNormalizationMigration).toContain('grant execute on function public.quimera_is_platform_owner() to authenticated, service_role');
        expect(migration).toContain('create policy "Public can read active landing subscription plans"');
        expect(migration).toContain('coalesce(show_in_landing, false) = true');
        expect(migration).not.toContain("auth.role() = 'authenticated'");
        expect(migration).not.toContain('agency_client_payment_links references public.subscription_plans');
    });

    it('adds Agency ledger, snapshot, and Stripe event tables with idempotency and RLS', () => {
        [
            'public.agency_usage_ledger',
            'public.agency_snapshots',
            'public.agency_snapshot_versions',
            'public.agency_snapshot_applications',
            'public.agency_billing_events',
        ].forEach(table => {
            expect(migration).toContain(`create table if not exists ${table}`);
            expect(migration).toContain(`alter table ${table} enable row level security`);
        });

        expect(migration).toContain('agency_usage_ledger_agency_idempotency_uidx');
        expect(migration).toContain('agency_billing_events_provider_event_id_uidx');
        expect(migration).toContain('revenue_amount numeric');
        expect(migration).toContain('platform_cost numeric');
        expect(migration).toContain('margin_amount numeric');
        expect(contractCompatMigration).toContain('add column if not exists source_module text');
        expect(contractCompatMigration).toContain('add column if not exists client_price numeric');
        expect(contractCompatMigration).toContain('add column if not exists agency_markup_type text');
        expect(contractCompatMigration).toContain("'ai_tokens'");
        expect(contractCompatMigration).toContain("'email_send'");
        expect(contractCompatMigration).toContain("'automation_run'");
        expect(contractCompatMigration).toContain("alter column billing_status set default 'unbilled'");
        expect(contractCompatMigration).toContain('add column if not exists provider_event_id text');
        expect(contractCompatMigration).toContain('add column if not exists idempotency_key text');
        expect(contractCompatMigration).toContain('add column if not exists payload jsonb');
        expect(contractCompatMigration).toContain('add column if not exists preview jsonb');
        expect(contractCompatMigration).toContain('add column if not exists applied_changes jsonb');
        expect(agencyPaymentLinkFailureStatusMigration).toContain('agency_client_payment_links_status_check');
        expect(agencyPaymentLinkFailureStatusMigration).toContain("'past_due'");
        expect(agencyPaymentLinkFailureStatusMigration).toContain("'failed'");
        expect(migration).toContain('create policy "Agency can manage usage ledger"');
        expect(migration).toContain('create policy "Agency can read billing events"');
        expect(migration).not.toContain('grant select on table public.agency_usage_ledger to anon');
        expect(migration).not.toContain('Clients can view usage ledger');
    });

    it('records Agency Stripe webhooks and usage ledger entries idempotently', () => {
        expect(stripeWebhook).toContain('registerAgencyBillingEvent(event)');
        expect(stripeWebhook).toContain('.from("agency_billing_events")');
        expect(stripeWebhook).toContain('.eq("provider", "stripe")');
        expect(stripeWebhook).toContain('.eq("event_id", event.id)');
        expect(stripeWebhook).toContain('updateAgencyBillingEventStatus');
        expect(stripeWebhook).toContain('recordAgencyUsageLedger');
        expect(stripeWebhook).toContain('.from("agency_usage_ledger")');
        expect(stripeWebhook).toContain('agency_service_plans');
        expect(stripeWebhook).toContain('buildAgencyUsageLedgerInsert(params, plan)');
        expect(agencyStripeBillingHelper).toContain('services/agency/agencyWebhookService');
        expect(agencyWebhookService).toContain('export function extractAgencyBillingEventRefs');
        expect(agencyWebhookService).toContain('export function buildAgencyBillingEventInsert');
        expect(agencyWebhookService).toContain('export function buildAgencyUsageLedgerInsert');
        expect(agencyWebhookService).toContain('export function isDuplicateStripeWebhookEventStatus');
        expect(agencyWebhookService).toContain('STRIPE_WEBHOOK_PROCESSING_RETRY_AFTER_MS');
        expect(stripeWebhook).toContain('existing.updated_at || existing.created_at');
        expect(agencyWebhookService).toContain('stripe:agency-client-subscription');
        expect(agencyWebhookService).toContain('unit_cost: unitCost');
        expect(agencyWebhookService).toContain('unit_price: unitPrice');
        expect(agencyWebhookService).toContain('client_price: unitPrice');
        expect(agencyWebhookService).toContain('source_module: "stripe"');
        expect(agencyWebhookService).toContain('provider_event_id: event.id');
        expect(agencyWebhookService).toContain('idempotency_key: idempotencyKey');
        expect(agencyWebhookService).toContain('export function resolveAgencyPaymentLinkStatus');
        expect(agencyWebhookService).toContain('export function resolveAgencyRelationshipBillingStatus');
        expect(agencyWebhookService).toContain('export function resolveAgencyTenantBillingStatus');
        expect(stripeWebhook).toContain('resolveAgencyPaymentLinkStatus(normalizedBillingStatus)');
        expect(stripeWebhook).toContain('buildAgencyPaymentFailedActivity');
        expect(stripeWebhook).toContain('buildAgencySubscriptionCancelledActivity');
        expect(stripeWebhook).toContain('status: resolveAgencyRelationshipBillingStatus(status)');
        expect(stripeWebhook).toContain('onboarding_status: resolveAgencyRelationshipOnboardingStatus(status)');
        expect(useServiceAccessHook).toContain('readTenantBillingStatus(currentTenant)');
        expect(useServiceAccessHook).toContain('resolveAccessSubscriptionStatus');
        expect(fs.existsSync(path.join(rootDir, 'tests/utils/agencyStripeWebhookHelpers.test.ts'))).toBe(true);
    });

    it('surfaces production Agency margin controls without reading client billing cost data', () => {
        expect(agencyMetricsHook).toContain('export type { AgencyFinancialMetrics }');
        expect(agencyMetricsHook).toContain("from '../services/agency/agencyUsageLedgerService'");
        expect(agencyMetricsHook).toContain('fetchAgencyFinanceMetrics(supabase, agencyTenantId, subClients)');
        expect(agencyMetricsHook).not.toContain(".from('agency_usage_ledger')");
        expect(agencyUsageLedgerService).toContain('AGENCY_USAGE_LEDGER_FINANCE_SELECT');
        expect(agencyUsageLedgerService).toContain(".from('agency_usage_ledger')");
        expect(agencyUsageLedgerService).toContain(".from('agency_client_payment_links')");
        expect(agencyUsageLedgerService).toContain(".from('agency_client_approvals')");
        expect(agencyUsageLedgerService).toContain(".from('agency_billing_events')");
        expect(agencyUsageLedgerService).toContain('calculateMarginPercentage');
        expect(agencyUsageLedgerService).not.toContain("err?.code === '42501'");
        expect(agencyUsageLedgerService).not.toContain("code === '42501'");
        expect(agencyOverview).toContain('agencyFinance.baseCost');
        expect(agencyOverview).toContain('agencyFinance.margin');
        expect(agencyOverview).toContain('agencyFinance.pendingApprovals');
        expect(agencyOverview).toContain('agencyFinance.openPaymentLinks');
    });

    it('centralizes Agency activity payloads for reports, snapshots, and billing events', () => {
        expect(agencyActivityService).toContain('export type AgencyActivityType');
        expect(agencyActivityService).toContain('buildAgencyActivityInsert');
        expect(agencyActivityService).toContain('buildAgencyPaymentReceivedActivity');
        expect(agencyActivityService).toContain('buildAgencySnapshotAppliedActivity');
        expect(agencyActivityService).toContain('buildAgencyReportGeneratedActivity');
        expect(agencyActivityService).toContain('buildAgencyClientCreatedActivity');
        expect(agencyActivityService).toContain('buildAgencyProjectTransferredActivity');
        expect(agencyActivityService).toContain('buildAgencyApprovalRespondedActivity');
        expect(agencyActivityService).toContain("'usage_recorded'");
        expect(reportingService).toContain("from './agency/agencyActivityService'");
        expect(reportingService).toContain('buildAgencyReportGeneratedActivity');
        expect(globalAssistantActionHandlers).toContain("from '../agency/agencyActivityService'");
        expect(globalAssistantActionHandlers).toContain('buildAgencyReportGeneratedActivity');
        expect(agencySnapshotService).toContain("from './agencyActivityService'");
        expect(agencySnapshotService).toContain('buildAgencySnapshotAppliedActivity');
        expect(stripeWebhook).toContain('buildAgencyPaymentReceivedActivity');
        expect(onboardingApi).toContain('buildAgencyClientCreatedActivity');
        expect(onboardingApi).toContain('buildAgencyProjectTransferredActivity');
        expect(onboardingApi).toContain('buildAgencyApprovalRespondedActivity');
        expect(fs.existsSync(path.join(rootDir, 'tests/services/agencyActivityService.test.ts'))).toBe(true);
    });

    it('extends readiness checks to Agency production tables', () => {
        expect(readinessProbe).toContain('checkAgencySupabaseSchema(input)');
        expect(readinessProbe).toContain("'agency_usage_ledger'");
        expect(readinessProbe).toContain("'agency_billing_events'");
        expect(readinessProbe).toContain("'agency_snapshot_applications'");
        expect(readinessProbe).toContain("'subscription_plans'");
        expect(readinessProbe).toContain("'source_module'");
        expect(readinessProbe).toContain("'client_price'");
        expect(readinessProbe).toContain("'provider_event_id'");
        expect(readinessProbe).toContain('production column contracts reachable with service role');
        expect(readinessProbe).toContain('agency-supabase-schema');
        expect(readinessProbe).toContain('checkAgencyRlsNegative(input)');
        expect(readinessProbe).toContain('agency-rls-negative-anon');
        expect(readinessProbe).toContain('anonymous Agency billing probes denied with 42501');
        expect(packageJson).toContain('readiness:agency-rls-negative');
        expect(packageJson).toContain('readiness:agency-schema-contract');
        expect(packageJson).toContain('test:agency:production');
        expect(packageJson).toContain('tests/e2e/agency-public.public.spec.ts --project=public-chromium');
        expect(fs.existsSync(path.join(rootDir, 'scripts/agency-rls-negative-probe.mjs'))).toBe(true);
        expect(fs.existsSync(path.join(rootDir, 'scripts/agency-schema-contract-probe.mjs'))).toBe(true);
        expect(agencyRlsNegativeProbe).toContain('insert into public.agency_client_notes');
        expect(agencyRlsNegativeProbe).toContain('insert into public.agency_reports');
        expect(agencyRlsNegativeProbe).toContain('insert into public.agency_usage_ledger');
        expect(agencyRlsNegativeProbe).toContain('source_module');
        expect(agencyRlsNegativeProbe).toContain('client_price');
        expect(agencyRlsNegativeProbe).toContain('provider_event_id');
        expect(agencyRlsNegativeProbe).toContain('stripe:evt_agency_rls_probe');
        expect(agencyRlsNegativeProbe).toContain('set local role authenticated');
        expect(agencyRlsNegativeProbe).toContain('agency_service_plan_rows');
        expect(agencyRlsNegativeProbe).toContain('own_internal_note_rows');
        expect(agencyRlsNegativeProbe).toContain('other_client_reports');
        expect(agencyRlsNegativeProbe).toContain('own_payment_link_rows');
        expect(agencySchemaContractProbe).toContain('agency_usage_ledger_agency_idempotency_uidx');
        expect(agencySchemaContractProbe).toContain('agency_billing_events_idempotency_uidx');
        expect(agencySchemaContractProbe).toContain('unexpected_anon_grants');
        expect(agencySchemaContractProbe).toContain('rls_disabled');
        expect(agencySchemaContractProbe).toContain('missing_columns');
    });

    it('exposes a protected Agency-specific readiness API without leaking secrets', () => {
        expect(agencyReadinessRoute).toContain("from '../../services/agency/agencyReadinessService.js'");
        expect(agencyReadinessRoute).toContain('runAgencyReadinessChecks');
        expect(agencyReadinessRoute).toContain('CRON_SECRET is not configured');
        expect(agencyReadinessRoute).toContain('tokenFromRequest(req) !== cronSecret');
        expect(agencyReadinessRoute).not.toContain('Access-Control-Allow-Origin');

        expect(agencyReadinessService).toContain('AGENCY_READINESS_TABLES');
        expect(agencyReadinessService).toContain("'agency_service_plans'");
        expect(agencyReadinessService).toContain("'agency_usage_ledger'");
        expect(agencyReadinessService).toContain("'agency_billing_events'");
        expect(agencyReadinessService).toContain("'source_module'");
        expect(agencyReadinessService).toContain("'client_price'");
        expect(agencyReadinessService).toContain("'provider_event_id'");
        expect(agencyReadinessService).toContain("'preview'");
        expect(agencyReadinessService).toContain('SUPABASE_ANON_KEY_OR_VITE_SUPABASE_ANON_KEY');
        expect(agencyReadinessService).toContain("evidence: 'configured'");
        expect(agencyReadinessService).not.toContain('evidence: env');
    });

    it('exposes Vercel Agency billing routes that proxy the canonical Supabase Stripe functions safely', () => {
        expect(agencyStripeApiProxy).toContain("invokeSupabaseFunctionAction('stripe-api'");
        expect(agencyStripeApiProxy).toContain("getSupabaseFunctionUrl(functionName)");
        expect(agencyStripeApiProxy).toContain("'onboarding-api'");
        expect(agencyStripeApiProxy).toContain('invokeAgencyOnboardingAction');
        expect(agencyStripeApiProxy).toContain('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
        expect(agencyStripeApiProxy).toContain('safePaymentReturnUrl');
        expect(agencyStripeApiProxy).not.toContain('STRIPE_SECRET_KEY');

        expect(agencyPaymentLinkCreateRoute).toContain('requireBearerToken(req)');
        expect(agencyPaymentLinkCreateRoute).toContain('optionalPositiveNumber(body.customPrice');
        expect(agencyPaymentLinkCreateRoute).toContain("agencyBilling-createClientPaymentLink");
        expect(agencyPaymentLinkCreateRoute).toContain('clientTenantId');
        expect(agencyPaymentLinkCreateRoute).toContain('planId');

        expect(agencyPaymentLinkInfoRoute).toContain("agencyBilling-getPaymentLinkInfo");
        expect(agencyPaymentLinkCheckoutRoute).toContain("agencyBilling-confirmClientPayment");
        expect(agencyPaymentLinkCheckoutRoute).toContain('safePaymentReturnUrl');

        expect(agencyClientCreateRoute).toContain("invokeAgencyOnboardingAction('autoProvision'");
        expect(agencyClientCreateRoute).toContain('CLIENT_CREATE_ALLOWED_FIELDS');
        expect(agencyClientCreateRoute).toContain('requireBearerToken(req)');
        expect(agencyClientCreateRoute).toContain('optionalFiniteNumber(body.monthlyPrice');
        expect(agencyProjectTransferRoute).toContain("invokeAgencyOnboardingAction('transferProject'");
        expect(agencyProjectTransferRoute).toContain('targetClientTenantId');
        expect(agencyApprovalRespondRoute).toContain("invokeAgencyOnboardingAction('respondClientApproval'");
        expect(agencyApprovalRespondRoute).toContain('VALID_APPROVAL_DECISIONS');

        expect(agencyPlanRouteLib).toContain("moduleId: 'agency-service-plans'");
        expect(agencyPlanRouteLib).toContain("requiredPermission: 'canManageBilling'");
        expect(agencyPlanRouteLib).toContain("from(AGENCY_SERVICE_PLANS_TABLE)");
        expect(agencyPlanRouteLib).toContain("from(AGENCY_CLIENTS_TABLE)");
        expect(agencyPlanRouteLib).toContain('price must be greater than or equal to baseCost');
        expect(agencyPlanSaveRoute).toContain('saveAgencyServicePlan');
        expect(agencyPlanArchiveRoute).toContain('archiveAgencyServicePlan');
        expect(agencyPlanRestoreRoute).toContain('restoreAgencyServicePlan');
        expect(agencyPlanDeleteRoute).toContain('deleteAgencyServicePlan');

        expect(agencyAccessHelper).toContain('requireBearerToken(req)');
        expect(agencyAccessHelper).toContain('hasPermission');
        expect(agencyAccessHelper).toContain('isAgencyOperatorRole');
        expect(agencyAccessHelper).toContain('isPlatformOwnerRole');
        expect(agencyAccessHelper).toContain("readServiceStatus(serviceSettings?.config");
        expect(agencySnapshotCreateRoute).toContain('new AgencySnapshotService(access.supabase');
        expect(agencySnapshotCreateRoute).toContain('createSnapshotFromProject');
        expect(agencySnapshotCreateRoute).toContain('createdBy: access.user.id');
        expect(agencySnapshotCreateRoute).not.toContain('payload: result.payload');
        expect(agencySnapshotPreviewRoute).toContain('previewSnapshotApplication');
        expect(agencySnapshotPreviewRoute).toContain("action: 'agency-snapshot-preview'");
        expect(agencySnapshotApplyRoute).toContain('applySnapshot');
        expect(agencySnapshotApplyRoute).toContain('appliedBy: access.user.id');
        expect(agencySnapshotApplyRoute).toContain("result.status === 'failed' ? 409 : 200");

        expect(agencyStripeWebhookRoute).toContain("getSupabaseFunctionUrl('stripe-webhook')");
        expect(agencyStripeWebhookRoute).toContain("req.headers['stripe-signature']");
        expect(agencyStripeWebhookRoute).toContain('readRawBody(req)');
        expect(agencyStripeWebhookRoute).not.toContain('JSON.parse');

        expect(agencyPaymentLinkModal).toContain("fetch('/api/agency/payment-links/create'");
        expect(agencyPaymentLinkModal).toContain('supabase.auth.getSession()');
        expect(agencyCheckoutPage).toContain("fetch('/api/agency/payment-links/start-checkout'");
        expect(agencyCheckoutPage).toContain("fetch(`/api/agency/payment-links/info?token=");
        expect(agencyCheckoutPage).toContain("'past_due'");
        expect(agencyCheckoutPage).toContain("'failed'");
        expect(agencyOnboardingWorkflow).toContain("fetch('/api/agency/clients/create'");
        expect(agencyProjectTransferModal).toContain("fetch('/api/agency/projects/transfer'");
        expect(agencyApprovalService).toContain("fetch('/api/agency/approvals/respond'");
        expect(agencyPlanEditor).toContain('saveAgencyPlanThroughApi');
        expect(agencyPlanManager).toContain('archiveAgencyPlanThroughApi');
        expect(agencyPlanManager).toContain('restoreAgencyPlanThroughApi');
        expect(agencyPlanManager).toContain('deleteAgencyPlanThroughApi');
        expect(agencyPlanApiClient).toContain("'/api/agency/plans/save'");
        expect(agencyPlanApiClient).toContain("'/api/agency/plans/archive'");
        expect(agencyPlanApiClient).toContain("'/api/agency/plans/restore'");
        expect(agencyPlanApiClient).toContain("'/api/agency/plans/delete'");
        expect(agencySnapshotCenter).toContain("'/api/agency/snapshots/create'");
        expect(agencySnapshotCenter).toContain("'/api/agency/snapshots/apply-preview'");
        expect(agencySnapshotCenter).toContain("'/api/agency/snapshots/apply'");
        expect(agencySnapshotCenter).toContain('supabase.auth.getSession()');
        expect(packageJson).toContain('api/agency/payment-links/create.ts');
        expect(packageJson).toContain('api/agency/clients/create.ts');
        expect(packageJson).toContain('api/agency/projects/transfer.ts');
        expect(packageJson).toContain('api/agency/approvals/respond.ts');
        expect(packageJson).toContain('api/agency/plans/save.ts');
        expect(packageJson).toContain('api/agency/plans/archive.ts');
        expect(packageJson).toContain('api/agency/plans/restore.ts');
        expect(packageJson).toContain('api/agency/plans/delete.ts');
        expect(packageJson).toContain('api/agency/snapshots/create.ts');
        expect(packageJson).toContain('api/agency/snapshots/apply-preview.ts');
        expect(packageJson).toContain('api/agency/snapshots/apply.ts');
        expect(fs.existsSync(path.join(rootDir, 'tests/api/agencyBillingApiRoutes.test.ts'))).toBe(true);
        expect(fs.existsSync(path.join(rootDir, 'tests/api/agencySnapshotApiRoutes.test.ts'))).toBe(true);
        expect(fs.existsSync(path.join(rootDir, 'tests/api/agencyPlanApiRoutes.test.ts'))).toBe(true);
    });

    it('loads production Vercel env and Supabase Edge secret names for live readiness checks', () => {
        expect(vercelReadinessRunner).toContain("'pull'");
        expect(vercelReadinessRunner).toContain("'.env.production.local'");
        expect(vercelReadinessRunner).toContain('parseEnvFile(envFile)');
        expect(vercelReadinessRunner).toContain('readVercelProductionEnvNames(tempRoot)');
        expect(vercelReadinessRunner).toContain('parseVercelEnvListOutput(result.stdout)');
        expect(vercelReadinessRunner).toContain('VERCEL_PRODUCTION_ENV_NAMES');
        expect(vercelReadinessRunner).toContain('readSupabaseEdgeSecretNames(appRoot)');
        expect(vercelReadinessRunner).toContain('SUPABASE_EDGE_SECRET_NAMES');
        expect(readinessProbe).toContain("parseNameSet(readEnv(env, 'VERCEL_PRODUCTION_ENV_NAMES'))");
        expect(readinessProbe).toContain('configured in Vercel Production; value not available to local probe');
    });

    it('covers the public Agency checkout handoff with Playwright E2E', () => {
        expect(agencyPublicE2e).toContain('renders the Agency signup plan surface without authentication');
        expect(agencyPublicE2e).toContain('shows a controlled invalid-token state for public Agency checkout links');
        expect(agencyPublicE2e).toContain('starts a valid Agency client subscription through the Vercel checkout boundary');
        expect(agencyPublicE2e).toContain("**/api/agency/payment-links/start-checkout");
        expect(agencyPublicE2e).toContain('https://checkout.stripe.com/c/pay/cs_test_agency_e2e');
        expect(agencyPublicE2e).toContain('successUrl: `http://localhost:5173/pay/${token}?checkout=success`');
        expect(agencyPublicE2e).toContain('cancelUrl: `http://localhost:5173/pay/${token}?checkout=cancelled`');
    });

    it('keeps remote Supabase migration history compatible with the source checkout', () => {
        [
            '20260626084722_chatbot_engine_finance_quote_requests.sql',
            '20260626122616_global_assistant_memory_store.sql',
            '20260627201353_superadmin_subscription_credit_access.sql',
            '20260629031027_projects_lightweight_list_columns.sql',
            '20260629033624_projects_template_active_index.sql',
            '20260629204931_normalize_tenant_plan_access.sql',
            '20260629214831_allow_cancelled_assistant_actions.sql',
        ].forEach(file => {
            expect(fs.existsSync(path.join(rootDir, 'supabase/migrations', file))).toBe(true);
        });
    });
});
