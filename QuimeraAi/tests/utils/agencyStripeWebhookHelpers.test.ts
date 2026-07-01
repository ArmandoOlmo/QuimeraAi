import { describe, expect, it } from 'vitest';
import {
  buildAgencyUsageLedgerInsert,
  extractAgencyBillingEventRefs,
  isAgencyClientBillingMetadata,
} from '../../supabase/functions/_shared/agency-stripe-billing.ts';

const agencyTenantId = '11111111-1111-4111-8111-111111111111';
const clientTenantId = '22222222-2222-4222-8222-222222222222';

describe('Agency Stripe webhook helpers', () => {
  it('extracts Agency billing refs from invoice line metadata without accepting invalid tenant IDs', () => {
    const refs = extractAgencyBillingEventRefs({
      data: {
        object: {
          object: 'invoice',
          id: 'in_agency_123',
          customer: { id: 'cus_agency_123' },
          subscription: { id: 'sub_agency_123' },
          lines: {
            data: [{
              metadata: {
                source: 'agency-engine',
                billingFlow: 'agency_client_payment_link',
                agencyTenantId,
                tenantId: clientTenantId,
                paymentLinkToken: 'plink_123',
              },
            }],
          },
        },
      },
    });

    expect(refs).toMatchObject({
      isAgencyBilling: true,
      agencyTenantId,
      clientTenantId,
      paymentLinkToken: 'plink_123',
      invoiceId: 'in_agency_123',
      subscriptionId: 'sub_agency_123',
      customerId: 'cus_agency_123',
    });

    const invalidRefs = extractAgencyBillingEventRefs({
      data: {
        object: {
          object: 'subscription',
          id: 'sub_agency_invalid',
          metadata: {
            source: 'agency-engine',
            billingFlow: 'agency_client_managed_billing',
            agencyTenantId: 'not-a-uuid',
            clientTenantId: 'also-not-a-uuid',
          },
        },
      },
    });

    expect(invalidRefs.isAgencyBilling).toBe(true);
    expect(invalidRefs.agencyTenantId).toBeNull();
    expect(invalidRefs.clientTenantId).toBeNull();
  });

  it('keeps platform billing metadata out of the Agency billing branch', () => {
    expect(isAgencyClientBillingMetadata({
      source: 'platform-billing',
      billingFlow: 'agency_client_payment_link',
      agencyTenantId,
      clientTenantId,
    })).toBe(false);

    expect(isAgencyClientBillingMetadata({
      source: 'agency-engine',
      agencyTenantId,
      clientTenantId,
    })).toBe(true);
  });

  it('builds deterministic ledger rows for active Agency client subscriptions', () => {
    const row = buildAgencyUsageLedgerInsert({
      agencyTenantId,
      clientTenantId,
      agencyPlanId: 'plan-growth',
      agencyPlanName: 'Growth',
      monthlyPrice: 250,
      status: 'active',
      currentPeriodStart: '2026-07-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      stripeSubscriptionId: 'sub_agency_123',
      stripeCheckoutSessionId: 'cs_agency_123',
      paymentLinkToken: 'plink_123',
    }, {
      id: 'plan-growth',
      name: 'Growth DB',
      price: 275,
      base_cost: 100,
    }, new Date('2026-07-10T00:00:00.000Z'));

    expect(row).toMatchObject({
      agency_tenant_id: agencyTenantId,
      client_tenant_id: clientTenantId,
      agency_plan_id: 'plan-growth',
      source: 'stripe-webhook',
      usage_type: 'subscription',
      usage_quantity: 1,
      unit_price: 250,
      unit_cost: 100,
      currency: 'usd',
      billing_status: 'active',
      billing_period_start: '2026-07-01',
      billing_period_end: '2026-08-01',
      provider: 'stripe',
      provider_event_id: 'sub_agency_123',
      stripe_subscription_id: 'sub_agency_123',
      stripe_checkout_session_id: 'cs_agency_123',
      idempotency_key: 'stripe:agency-client-subscription:sub_agency_123:2026-08-01T00:00:00.000Z',
      metadata: {
        agencyPlanName: 'Growth',
        paymentLinkToken: 'plink_123',
        status: 'active',
        source: 'stripe-webhook',
      },
    });
  });

  it('does not record ledger rows for non-billable statuses or missing commercial values', () => {
    expect(buildAgencyUsageLedgerInsert({
      agencyTenantId,
      clientTenantId,
      status: 'past_due',
      stripeSubscriptionId: 'sub_agency_123',
    }, { price: 200, base_cost: 75 })).toBeNull();

    expect(buildAgencyUsageLedgerInsert({
      agencyTenantId,
      clientTenantId,
      status: 'active',
      stripeSubscriptionId: 'sub_agency_123',
    }, { price: 0, base_cost: 0 })).toBeNull();

    expect(buildAgencyUsageLedgerInsert({
      agencyTenantId: null,
      clientTenantId,
      status: 'active',
      stripeSubscriptionId: 'sub_agency_123',
    }, { price: 200, base_cost: 75 })).toBeNull();
  });
});
