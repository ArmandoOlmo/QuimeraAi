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
        expect(stripeApi).toContain('stripe.checkout.sessions.create');
        expect(stripeApi).toContain('mode: "subscription"');
        expect(stripeApi).toContain('billingFlow: "agency_client_payment_link"');
        expect(stripeApi).not.toContain('token and paymentMethodId are required');

        expect(checkoutPage).toContain("action: 'agencyBilling-confirmClientPayment'");
        expect(checkoutPage).toContain('window.location.assign(data.url)');
        expect(checkoutPage).not.toContain('CardElement');
        expect(checkoutPage).not.toContain('paymentMethodId');
        expect(checkoutPage).not.toContain('pm_card_visa');
    });

    it('keeps agency service-plan billing out of the platform subscription plan sync path', () => {
        expect(stripeWebhook).toContain('isAgencyClientBillingMetadata(session.metadata)');
        expect(stripeWebhook).toContain('syncAgencyClientSubscription(subscription)');
        expect(stripeWebhook).toContain('markAgencyPaymentLinkCompleted');
        expect(stripeWebhook).toContain('agency_client_payment_links');
        expect(stripeWebhook).toContain('effectivePlanId');
        expect(stripeWebhook).toContain('agencyPlanId');
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
        expect(tenantContext).toContain(".from('agency_clients')");
        expect(tenantContext).toContain("onConflict: 'agency_tenant_id,client_tenant_id'");
    });

    it('loads Agency Command Center clients from canonical agency relationships', () => {
        expect(agencyMetricsHook).toContain('async function fetchAgencyClientTenantRows');
        expect(agencyMetricsHook).toContain(".from('agency_clients')");
        expect(agencyMetricsHook).toContain(".select('client_tenant_id')");
        expect(agencyMetricsHook).toContain(".from('store_orders')");
        expect(agencyMetricsHook).not.toContain(".from('orders')");
        expect(agencyMetricsHook).not.toContain('.from("orders")');
    });
});
