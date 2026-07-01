export const AGENCY_CLIENT_BILLING_FLOWS = new Set([
  "agency_client_payment_link",
  "agency_client_managed_billing",
]);

export interface AgencyBillingEventRefs {
  isAgencyBilling: boolean;
  metadata: Record<string, unknown>;
  agencyTenantId: string | null;
  clientTenantId: string | null;
  paymentLinkToken: string | null;
  checkoutSessionId: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
  customerId: string | null;
}

export interface AgencyUsageLedgerParams {
  agencyTenantId?: string | null;
  clientTenantId?: string | null;
  agencyPlanId?: string | null;
  agencyPlanName?: string | null;
  monthlyPrice?: unknown;
  status?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripeSubscriptionId?: string | null;
  paymentLinkToken?: string | null;
}

export interface AgencyUsageLedgerPlan {
  id?: string | null;
  name?: string | null;
  price?: unknown;
  base_cost?: unknown;
}

export function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

export function readPositiveAmount(...values: unknown[]): number {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

export function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function readStripeObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "id" in value) {
    return String((value as { id?: unknown }).id || "") || null;
  }
  return null;
}

export function isAgencyClientBillingMetadata(metadata?: Record<string, unknown> | null) {
  if (metadata?.source !== "agency-engine") return false;
  const billingFlow = typeof metadata.billingFlow === "string" ? metadata.billingFlow : "";
  if (billingFlow && AGENCY_CLIENT_BILLING_FLOWS.has(billingFlow)) return true;
  return Boolean(metadata.agencyTenantId && (metadata.clientTenantId || metadata.tenantId));
}

export function extractAgencyBillingEventRefs(event: { data: { object: any } }): AgencyBillingEventRefs {
  const object = event.data.object as any;
  const metadata = {
    ...(object?.metadata || {}),
    ...(object?.subscription_details?.metadata || {}),
    ...(object?.lines?.data?.[0]?.metadata || {}),
  };
  const checkoutSessionId = object?.object === "checkout.session"
    ? object.id
    : readStripeObjectId(object?.checkout_session) || metadata.checkoutSessionId || metadata.checkout_session_id || null;
  const subscriptionId = object?.object === "subscription"
    ? object.id
    : readStripeObjectId(object?.subscription) || metadata.stripeSubscriptionId || metadata.subscriptionId || null;
  const invoiceId = object?.object === "invoice"
    ? object.id
    : readStripeObjectId(object?.invoice) || metadata.stripeInvoiceId || metadata.invoiceId || null;
  const customerId = readStripeObjectId(object?.customer) || metadata.stripeCustomerId || metadata.customerId || null;

  return {
    isAgencyBilling: isAgencyClientBillingMetadata(metadata),
    metadata,
    agencyTenantId: isUuid(String(metadata.agencyTenantId || "")) ? String(metadata.agencyTenantId) : null,
    clientTenantId: isUuid(String(metadata.clientTenantId || metadata.tenantId || ""))
      ? String(metadata.clientTenantId || metadata.tenantId)
      : null,
    paymentLinkToken: typeof metadata.paymentLinkToken === "string" ? metadata.paymentLinkToken : null,
    checkoutSessionId: checkoutSessionId ? String(checkoutSessionId) : null,
    subscriptionId: subscriptionId ? String(subscriptionId) : null,
    invoiceId: invoiceId ? String(invoiceId) : null,
    customerId: customerId ? String(customerId) : null,
  };
}

export function isRecordableAgencyLedgerStatus(status?: string | null) {
  return ["active", "trial", "trialing"].includes(String(status || ""));
}

export function buildAgencyUsageLedgerInsert(
  params: AgencyUsageLedgerParams,
  plan: AgencyUsageLedgerPlan | null,
  now = new Date(),
) {
  if (!params.agencyTenantId || !params.clientTenantId) return null;
  if (!isRecordableAgencyLedgerStatus(params.status)) return null;

  const unitPrice = readPositiveAmount(params.monthlyPrice, plan?.price);
  const unitCost = readPositiveAmount(plan?.base_cost);
  if (unitPrice <= 0 && unitCost <= 0) return null;

  const periodKey = params.currentPeriodEnd ||
    params.stripeSubscriptionId ||
    params.stripeCheckoutSessionId ||
    params.paymentLinkToken ||
    now.toISOString().slice(0, 10);
  const sourceKey = params.stripeSubscriptionId ||
    params.stripeCheckoutSessionId ||
    params.paymentLinkToken ||
    params.clientTenantId;
  const idempotencyKey = `stripe:agency-client-subscription:${sourceKey}:${periodKey}`;

  return {
    agency_tenant_id: params.agencyTenantId,
    client_tenant_id: params.clientTenantId,
    agency_plan_id: plan?.id || null,
    source: "stripe-webhook",
    usage_type: "subscription",
    usage_quantity: 1,
    unit_cost: unitCost,
    unit_price: unitPrice,
    currency: "usd",
    billing_status: params.status || "active",
    billing_period_start: dateOnly(params.currentPeriodStart),
    billing_period_end: dateOnly(params.currentPeriodEnd),
    provider: "stripe",
    provider_event_id: params.stripeSubscriptionId || params.stripeCheckoutSessionId || params.paymentLinkToken || null,
    stripe_subscription_id: params.stripeSubscriptionId || null,
    stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
    idempotency_key: idempotencyKey,
    metadata: {
      agencyPlanName: params.agencyPlanName || plan?.name || null,
      paymentLinkToken: params.paymentLinkToken || null,
      status: params.status || null,
      source: "stripe-webhook",
    },
  };
}
