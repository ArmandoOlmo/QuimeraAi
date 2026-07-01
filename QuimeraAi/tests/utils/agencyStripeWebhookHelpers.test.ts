import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import {
  buildAgencyBillingEventInsert,
  buildAgencyBillingEventStatusUpdate,
  buildAgencyUsageLedgerInsert,
  buildStripeWebhookStatusUpdate,
  extractAgencyBillingEventRefs,
  isAgencyClientBillingMetadata,
  isDuplicateStripeWebhookEventStatus,
  isUniqueConstraintViolation,
  normalizeAgencyClientBillingStatus,
  resolveAgencyPaymentLinkStatus,
  resolveAgencyRelationshipBillingStatus,
  resolveAgencyRelationshipOnboardingStatus,
  resolveAgencyTenantBillingStatus,
} from '../../supabase/functions/_shared/agency-stripe-billing.ts';

const agencyTenantId = '11111111-1111-4111-8111-111111111111';
const clientTenantId = '22222222-2222-4222-8222-222222222222';

describe('Agency Stripe webhook helpers', () => {
  it('verifies a signed Stripe invoice fixture before mapping it into an Agency billing event row', () => {
    const stripe = new Stripe('sk_test_agency_webhook_fixture', { apiVersion: '2023-10-16' });
    const secret = 'whsec_agency_fixture_secret';
    const payload = JSON.stringify({
      id: 'evt_signed_agency_invoice',
      object: 'event',
      api_version: '2023-10-16',
      created: 1782925000,
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: 'invoice.paid',
      data: {
        object: {
          object: 'invoice',
          id: 'in_signed_agency',
          customer: 'cus_signed_agency',
          subscription: 'sub_signed_agency',
          lines: {
            data: [{
              metadata: {
                source: 'agency-engine',
                billingFlow: 'agency_client_payment_link',
                agencyTenantId,
                clientTenantId,
                paymentLinkToken: 'plink_signed',
              },
            }],
          },
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    const row = buildAgencyBillingEventInsert(event as any, 'payment-link-row-id');

    expect(row).toMatchObject({
      provider: 'stripe',
      event_id: 'evt_signed_agency_invoice',
      provider_event_id: 'evt_signed_agency_invoice',
      idempotency_key: 'stripe:evt_signed_agency_invoice',
      event_type: 'invoice.paid',
      agency_tenant_id: agencyTenantId,
      client_tenant_id: clientTenantId,
      payment_link_id: 'payment-link-row-id',
      payment_link_token: 'plink_signed',
      stripe_customer_id: 'cus_signed_agency',
      stripe_subscription_id: 'sub_signed_agency',
      stripe_invoice_id: 'in_signed_agency',
      status: 'received',
    });
    expect(() => stripe.webhooks.constructEvent(payload, 't=1782925000,v1=bad', secret)).toThrow();
  });

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

  it('does not build Agency billing event rows for platform billing events', () => {
    expect(buildAgencyBillingEventInsert({
      id: 'evt_platform_subscription',
      type: 'customer.subscription.updated',
      data: {
        object: {
          object: 'subscription',
          id: 'sub_platform',
          customer: 'cus_platform',
          metadata: {
            source: 'platform-billing',
            tenantId: clientTenantId,
            planId: 'agency_pro',
          },
        },
      },
    })).toBeNull();
  });

  it('dedupes processed webhooks and only holds recent in-flight Stripe events', () => {
    const now = new Date('2026-07-01T15:30:00.000Z');

    expect(isDuplicateStripeWebhookEventStatus('processed')).toBe(true);
    expect(isDuplicateStripeWebhookEventStatus('ignored')).toBe(true);
    expect(isDuplicateStripeWebhookEventStatus('processing')).toBe(true);
    expect(isDuplicateStripeWebhookEventStatus('processing', '2026-07-01T15:25:00.000Z', now)).toBe(true);
    expect(isDuplicateStripeWebhookEventStatus('processing', '2026-07-01T15:19:59.000Z', now)).toBe(false);
    expect(isDuplicateStripeWebhookEventStatus('received')).toBe(false);
    expect(isDuplicateStripeWebhookEventStatus('failed')).toBe(false);
    expect(isDuplicateStripeWebhookEventStatus(null)).toBe(false);
  });

  it('classifies database uniqueness errors without swallowing unrelated failures', () => {
    expect(isUniqueConstraintViolation({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe(true);
    expect(isUniqueConstraintViolation({ code: 'PGRST204', message: 'duplicate event id' })).toBe(true);
    expect(isUniqueConstraintViolation({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isUniqueConstraintViolation(null)).toBe(false);
  });

  it('builds deterministic status update payloads for store and Agency webhook events', () => {
    const now = new Date('2026-07-01T15:30:00.000Z');

    expect(buildStripeWebhookStatusUpdate('processed', { processedAt: true }, now)).toEqual({
      status: 'processed',
      processing_error: null,
      processed_at: '2026-07-01T15:30:00.000Z',
    });

    expect(buildAgencyBillingEventStatusUpdate('failed', { processingError: 'boom' }, now)).toEqual({
      status: 'failed',
      processing_error: 'boom',
      processed_at: '2026-07-01T15:30:00.000Z',
      updated_at: '2026-07-01T15:30:00.000Z',
    });
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
      source_module: 'stripe',
      usage_type: 'subscription',
      usage_quantity: 1,
      unit_price: 250,
      client_price: 250,
      unit_cost: 100,
      agency_markup_type: 'percentage',
      agency_markup_value: 150,
      currency: 'usd',
      billing_status: 'active',
      billing_period_start: '2026-07-01',
      billing_period_end: '2026-08-01',
      provider: 'stripe',
      provider_event_id: 'sub_agency_123',
      stripe_subscription_id: 'sub_agency_123',
      stripe_checkout_session_id: 'cs_agency_123',
      idempotency_key: 'stripe:agency-client-subscription:sub_agency_123:2026-08-01T00:00:00.000Z',
      source_entity_type: 'stripe_subscription',
      source_entity_id: 'sub_agency_123',
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

  it('maps Stripe subscription failures without marking Agency payment links as completed', () => {
    expect(normalizeAgencyClientBillingStatus('trialing')).toBe('trial');
    expect(normalizeAgencyClientBillingStatus('canceled')).toBe('cancelled');
    expect(normalizeAgencyClientBillingStatus('incomplete_expired')).toBe('failed');

    expect(resolveAgencyPaymentLinkStatus('active')).toBe('completed');
    expect(resolveAgencyPaymentLinkStatus('trialing')).toBe('completed');
    expect(resolveAgencyPaymentLinkStatus('past_due')).toBe('past_due');
    expect(resolveAgencyPaymentLinkStatus('incomplete')).toBe('past_due');
    expect(resolveAgencyPaymentLinkStatus('unpaid')).toBe('past_due');
    expect(resolveAgencyPaymentLinkStatus('incomplete_expired')).toBe('failed');
    expect(resolveAgencyPaymentLinkStatus('canceled')).toBe('cancelled');

    expect(resolveAgencyRelationshipBillingStatus('past_due')).toBe('past_due');
    expect(resolveAgencyRelationshipBillingStatus('incomplete_expired')).toBe('suspended');
    expect(resolveAgencyRelationshipOnboardingStatus('past_due')).toBe('payment_pending');
    expect(resolveAgencyRelationshipOnboardingStatus('active')).toBe('paid');
    expect(resolveAgencyTenantBillingStatus('past_due')).toBe('past_due');
    expect(resolveAgencyTenantBillingStatus('incomplete_expired')).toBe('expired');
  });
});
