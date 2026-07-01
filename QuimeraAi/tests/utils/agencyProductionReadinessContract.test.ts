import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency production readiness contract', () => {
    const migration = read('supabase/migrations/20260701153400_agency_production_ready_hardening.sql');
    const stripeWebhook = read('supabase/functions/stripe-webhook/index.ts');
    const agencyMetricsHook = read('hooks/useAgencyMetrics.ts');
    const agencyOverview = read('components/dashboard/agency/AgencyOverview.tsx');
    const readinessProbe = read('scripts/production-readiness-probe.mjs');

    it('hardens platform subscription plan RLS without mixing Agency service plans into platform billing', () => {
        expect(migration).toContain('drop policy if exists "Authenticated users can manage subscription plans"');
        expect(migration).toContain('create policy "Platform owners can manage subscription plans"');
        expect(migration).toContain('using (public.quimera_is_platform_owner())');
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
        expect(stripeWebhook).toContain('stripe:agency-client-subscription');
        expect(stripeWebhook).toContain('agency_service_plans');
        expect(stripeWebhook).toContain('unit_cost: unitCost');
        expect(stripeWebhook).toContain('unit_price: unitPrice');
    });

    it('surfaces production Agency margin controls without reading client billing cost data', () => {
        expect(agencyMetricsHook).toContain('export interface AgencyFinancialMetrics');
        expect(agencyMetricsHook).toContain(".from('agency_usage_ledger')");
        expect(agencyMetricsHook).toContain(".from('agency_client_payment_links')");
        expect(agencyMetricsHook).toContain(".from('agency_client_approvals')");
        expect(agencyMetricsHook).toContain(".from('agency_billing_events')");
        expect(agencyMetricsHook).toContain('calculateMarginPercentage');
        expect(agencyOverview).toContain('agencyFinance.baseCost');
        expect(agencyOverview).toContain('agencyFinance.margin');
        expect(agencyOverview).toContain('agencyFinance.pendingApprovals');
        expect(agencyOverview).toContain('agencyFinance.openPaymentLinks');
    });

    it('extends readiness checks to Agency production tables', () => {
        expect(readinessProbe).toContain('checkAgencySupabaseSchema(input)');
        expect(readinessProbe).toContain("'agency_usage_ledger'");
        expect(readinessProbe).toContain("'agency_billing_events'");
        expect(readinessProbe).toContain("'agency_snapshot_applications'");
        expect(readinessProbe).toContain("'subscription_plans'");
        expect(readinessProbe).toContain('agency-supabase-schema');
        expect(readinessProbe).toContain('checkAgencyRlsNegative(input)');
        expect(readinessProbe).toContain('agency-rls-negative-anon');
        expect(readinessProbe).toContain('anonymous Agency billing probes denied with 42501');
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
