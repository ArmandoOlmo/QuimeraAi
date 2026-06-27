import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency billing canonical contract', () => {
    const migration = read('supabase/migrations/20260627071535_canonical_agency_engine.sql');
    const stripeApi = read('supabase/functions/stripe-api/index.ts');
    const stripeWebhook = read('supabase/functions/stripe-webhook/index.ts');
    const checkoutPage = read('components/checkout/AgencyCheckoutPage.tsx');
    const tenantContext = read('contexts/tenant/TenantContext.tsx');
    const agencyMetricsHook = read('hooks/useAgencyMetrics.ts');
    const agencyPlansService = read('services/agencyPlansService.ts');
    const agencyPlanSelector = read('components/dashboard/agency/plans/AgencyPlanSelector.tsx');
    const clientBillingManager = read('components/dashboard/agency/ClientBillingManager.tsx');
    const addonsManager = read('components/dashboard/agency/AddonsManager.tsx');

    it('stores agency client payment links in a canonical Supabase table with RLS', () => {
        expect(migration).toContain('create or replace function public.quimera_can_manage_agency(p_agency_tenant_id text)');
        expect(migration).toContain('create or replace function public.quimera_can_view_agency_relationship(');
        expect(migration).toContain('create table if not exists public.agency_client_payment_links');
        expect(migration).toContain('token text not null unique');
        expect(migration).toContain('agency_plan_id text references public.agency_service_plans(id)');
        expect(migration).toContain('monthly_price numeric(10, 2) not null');
        expect(migration).toContain('alter table public.agency_client_payment_links enable row level security');
        expect(migration).toContain('grant select, insert, update, delete on table public.agency_client_payment_links to authenticated');
        expect(migration).toContain('Agency and clients can view payment links');
        expect(migration).toContain('Agency can manage payment links');
    });

    it('creates public agency payment checkout through Stripe Checkout Sessions, not temporary payment methods', () => {
        expect(stripeApi).toContain('.from("agency_client_payment_links")');
        expect(stripeApi).toContain('.from("agency_service_plans")');
        expect(stripeApi).toContain('Canonical agency_service_plans table is required for agency client billing');
        expect(stripeApi).toContain('Agency client payment links require a canonical agency service plan');
        expect(stripeApi).toContain('stripe.checkout.sessions.create');
        expect(stripeApi).toContain('mode: "subscription"');
        expect(stripeApi).toContain('billingFlow: "agency_client_payment_link"');
        expect(stripeApi).not.toContain('token and paymentMethodId are required');
        expect(stripeApi).not.toContain('const fallbackPlan = agencyPlan');
        expect(stripeApi).not.toContain('fallbackPlan?.price');

        expect(checkoutPage).toContain("action: 'agencyBilling-confirmClientPayment'");
        expect(checkoutPage).toContain('window.location.assign(data.url)');
        expect(checkoutPage).not.toContain('CardElement');
        expect(checkoutPage).not.toContain('paymentMethodId');
        expect(checkoutPage).not.toContain('pm_card_visa');
        expect(clientBillingManager).not.toContain('Stripe Elements');
    });

    it('keeps agency service-plan billing out of the platform subscription plan sync path', () => {
        expect(stripeWebhook).toContain('isAgencyClientBillingMetadata(session.metadata)');
        expect(stripeWebhook).toContain('syncAgencyClientSubscription(subscription)');
        expect(stripeWebhook).toContain('markAgencyPaymentLinkCompleted');
        expect(stripeWebhook).toContain('agency_client_payment_links');
        expect(stripeWebhook).toContain('effectivePlanId');
        expect(stripeWebhook).toContain('agencyPlanId');
        expect(stripeWebhook).toContain('resolveAgencySubscriptionPaymentMethod');
        expect(stripeWebhook).toContain('default_payment_method');
        expect(stripeWebhook).toContain('paymentMethodDetails');
    });

    it('reconciles agency-managed client billing as Agency billing, not platform plan billing', () => {
        expect(stripeApi).toContain('billingFlow: "agency_client_managed_billing"');
        expect(stripeApi).toContain('clientTenantId');
        expect(stripeApi).toContain('subscription_data: { metadata }');

        expect(stripeWebhook).toContain('AGENCY_CLIENT_BILLING_FLOWS');
        expect(stripeWebhook).toContain('resolveAgencyClientBillingMode');
        expect(stripeWebhook).toContain('agency_client_managed_billing');
        expect(stripeWebhook).toContain('billing_mode: billingMode');
        expect(stripeWebhook).toContain('mode: billingMode');
    });

    it('surfaces real Stripe payment method summaries instead of placeholder payment methods', () => {
        expect(stripeWebhook).toContain('summarizeStripePaymentMethod');
        expect(stripeWebhook).toContain('paymentMethod.card.last4');
        expect(stripeWebhook).toContain('paymentMethod.card.brand');
        expect(stripeWebhook).toContain('paymentMethodSource: params.paymentMethodDetails ? "stripe_subscription.default_payment_method"');

        expect(clientBillingManager).toContain('formatPaymentMethodSummary');
        expect(clientBillingManager).toContain('billing.paymentMethodDetails');
        expect(clientBillingManager).toContain("return { label: `${cardBrand} **** ${last4}`, status: 'configured' }");
        expect(clientBillingManager).toContain("return { label: 'Stripe Billing', status: 'configured' }");
        expect(clientBillingManager).not.toContain('pm_card_visa');
        expect(clientBillingManager).not.toContain("client.paymentMethod === 'checkout_pending' ? 'Checkout pendiente' : 'Configurado'");
    });

    it('resolves client billing context through canonical agency relationships', () => {
        expect(stripeApi).toContain('let agencyTenantId = clientTenant.owner_tenant_id || clientTenant.billing?.agencyTenantId || null');
        expect(stripeApi).toContain('let relationship: any = null');
        expect(stripeApi).toContain('const { data: canonicalRelationship, error: canonicalRelationshipError } = await supabase');
        expect(stripeApi).toContain('.eq("client_tenant_id", clientTenantId)');
        expect(stripeApi).toContain('agencyTenantId = relationship?.agency_tenant_id || null');
        expect(stripeApi).toContain('if (!relationship) {');
        expect(stripeApi).toContain('.eq("agency_tenant_id", agencyTenantId)');
    });

    it('guards agency client limit edits through the agency service-plan permission', () => {
        expect(stripeApi).toContain('action: "updateTenantLimits"');
        expect(stripeApi).toContain('moduleId: "agency-service-plans"');
        expect(stripeApi).toContain('requiredPermission: "canManageBilling"');
    });

    it('creates agency clients through Service Access and canonical plan assignment', () => {
        expect(tenantContext).toContain("moduleId: 'agency-client-provisioning'");
        expect(tenantContext).toContain('resolveServiceAccess({');
        expect(tenantContext).toContain('agencyPlanId: selectedAgencyPlanId || undefined');
        expect(tenantContext).toContain('assignPlanToClient(tenantId, selectedAgencyPlanId');
        expect(tenantContext).toContain("normalizeTenantSubscriptionPlanForType('agency_client'");
        expect(tenantContext).toContain("agencyClientBillingMode === 'direct' ? requestedClientPlan : inheritedAgencyPlan");
        expect(tenantContext).not.toContain("subscriptionPlan: normalizePlanId(data.plan || parentTenant?.subscriptionPlan || 'individual')");
        expect(tenantContext).toContain(".from('agency_clients')");
        expect(tenantContext).toContain("onConflict: 'agency_tenant_id,client_tenant_id'");
    });

    it('loads TenantContext sub-clients through canonical agency relationships with legacy fallback', () => {
        expect(tenantContext).toContain('async function fetchAgencyClientTenantRows(agencyTenantId: string)');
        expect(tenantContext).toContain(".from('agency_clients')");
        expect(tenantContext).toContain(".select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')");
        expect(tenantContext).toContain(".eq('agency_tenant_id', agencyTenantId)");
        expect(tenantContext).toContain('relationshipsByClientId.set(row.client_tenant_id, row)');
        expect(tenantContext).toContain('agencyOperatingSystem: agencyMetadata.agencyOperatingSystem || null');
        expect(tenantContext).toContain(".eq('owner_tenant_id', agencyTenantId)");
        expect(tenantContext).toContain('const rows = await fetchAgencyClientTenantRows(currentTenant.id)');
        expect(tenantContext).toContain('return rows.map(mapTenantRowToTenant)');
    });

    it('loads Agency Command Center clients from canonical agency relationships', () => {
        expect(agencyMetricsHook).toContain('async function fetchAgencyClientTenantRows');
        expect(agencyMetricsHook).toContain(".from('agency_clients')");
        expect(agencyMetricsHook).toContain(".select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')");
        expect(agencyMetricsHook).toContain('relationshipsByClientId.set(row.client_tenant_id, row)');
        expect(agencyMetricsHook).toContain('agencyOperatingSystem: agencyMetadata.agencyOperatingSystem || null');
        expect(agencyMetricsHook).toContain(".from('store_orders')");
        expect(agencyMetricsHook).not.toContain(".from('orders')");
        expect(agencyMetricsHook).not.toContain('.from("orders")');
    });

    it('assigns agency service plans without leaking them into platform subscription plans', () => {
        expect(agencyPlansService).toContain('function resolveAgencyClientEffectivePlanId');
        expect(agencyPlansService).toContain("if (rawPlanId === params.assignedAgencyPlanId) continue");
        expect(agencyPlansService).toContain("if (rawPlanId === 'agency_client') continue");
        expect(agencyPlansService).toContain('return DEFAULT_CLIENT_EFFECTIVE_PLAN_ID');
        expect(agencyPlansService).toContain('await getCanonicalClientRelationshipPlanId(plan.tenantId, clientTenantId)');
        expect(agencyPlansService).toContain('subscription_plan: effectivePlanId');
        expect(agencyPlansService).toContain(".select('client_tenant_id', { count: 'exact', head: true })");
        expect(agencyPlansService).toContain(".eq('agency_plan_id', planId)");
        expect(agencyPlansService).toContain('.update({ client_count: count ?? 0');
        expect(agencyPlansService).toContain('if (await refreshCanonicalPlanClientCount(plan.id))');
    });

    it('routes agency billing UI actions through Service Access Engine', () => {
        expect(agencyPlanSelector).toContain("import { useServiceAccess }");
        expect(agencyPlanSelector).toContain("serviceAccess.canAccessModule('agency-service-plans'");
        expect(agencyPlanSelector).toContain("requiredPermission: 'canManageBilling'");
        expect(agencyPlanSelector).toContain('disabled={!canAssignPlan || loading}');

        expect(clientBillingManager).toContain("import { useServiceAccess }");
        expect(clientBillingManager).toContain("serviceAccess.canAccessModule('agency-billing'");
        expect(clientBillingManager).toContain("serviceAccess.canAccessModule('agency-service-plans'");
        expect(clientBillingManager).toContain("requiredPermission: 'canManageBilling'");
        expect(clientBillingManager).toContain('const requireAgencyBillingAccess = () =>');
        expect(clientBillingManager).toContain('const requireAgencyPlanAssignmentAccess = () =>');
        expect(clientBillingManager).toContain('if (!requireAgencyBillingAccess()) return');
        expect(clientBillingManager).toContain('if (!requireAgencyPlanAssignmentAccess()) return');
        expect(clientBillingManager).toContain('disabled={!canManageAgencyBilling}');
        expect(clientBillingManager).toContain('disabled={!canAssignClientPlan}');
    });

    it('routes agency add-on capacity changes through Service Access Engine', () => {
        expect(addonsManager).toContain("import { useServiceAccess }");
        expect(addonsManager).toContain("serviceAccess.canAccessModule('agency-service-plans'");
        expect(addonsManager).toContain("requiredPermission: 'canManageBilling'");
        expect(addonsManager).toContain('const requireAgencyAddonsAccess = () =>');
        expect(addonsManager).toContain('if (!requireAgencyAddonsAccess()) return');
        expect(addonsManager).toContain("action: 'updateSubscriptionAddons'");
        expect(addonsManager).toContain('disabled={loading || !canManageAddons}');
    });

    it('summarizes agency billing from canonical agency_clients with legacy fallback', () => {
        expect(stripeApi).toContain('async function fetchAgencyBillingClientTenants');
        expect(stripeApi).toContain('.from("agency_clients")');
        expect(stripeApi).toContain('.select("client_tenant_id,agency_plan_id,billing_mode,project_count")');
        expect(stripeApi).toContain('const canonicalRows = await fetchTenantRowsByIds');
        expect(stripeApi).toContain('.eq("owner_tenant_id", agencyTenantId)');
        expect(stripeApi).toContain('const clients = await fetchAgencyBillingClientTenants(tenantId)');
        expect(stripeApi).toContain('client.agencyRelationship?.project_count');
        expect(stripeApi).toContain('project_count: count || 0');
        expect(stripeApi).toContain('could not update agency_clients project_count');
    });
});
